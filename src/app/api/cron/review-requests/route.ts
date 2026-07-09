import { createAdminClient } from '@/lib/supabase/admin'
import { Resend } from 'resend'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

// Dünkü etkinliklerin bilet alıcılarına "nasıldı, değerlendir" maili gönderir.
// Günde bir kez çağrılmalı (Coolify scheduled task / harici cron).
export async function GET(req: Request) {
  const authHeader = req.headers.get('Authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const admin = createAdminClient()
  const resend = new Resend(process.env.RESEND_API_KEY)

  const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0]

  const { data: events } = await admin
    .from('events')
    .select('id, title, venues(id, name, city), artists(id, stage_name)')
    .eq('event_date', yesterday)
    .eq('status', 'confirmed')

  if (!events || events.length === 0) {
    return NextResponse.json({ sent: 0, reason: 'no events yesterday' })
  }

  const eventIds = events.map((e) => e.id)
  const { data: tickets } = await admin
    .from('tickets')
    .select('event_id, buyer_name, buyer_email, status')
    .in('event_id', eventIds)
    .in('status', ['paid', 'used'])

  if (!tickets || tickets.length === 0) {
    return NextResponse.json({ sent: 0, reason: 'no ticket buyers' })
  }

  const eventMap = new Map(events.map((e) => [e.id, e]))
  // Aynı etkinliğe birden fazla bilet alan kişiye tek mail
  const seen = new Set<string>()
  const emails: Promise<unknown>[] = []

  for (const ticket of tickets) {
    const key = `${ticket.event_id}:${ticket.buyer_email.toLowerCase()}`
    if (seen.has(key)) continue
    seen.add(key)

    const ev = eventMap.get(ticket.event_id) as any
    if (!ev) continue

    emails.push(
      resend.emails.send({
        from: 'Sahne.Today <bildirim@sahne.today>',
        to: ticket.buyer_email,
        subject: `${ev.title} nasıldı? Değerlendir`,
        html: reviewRequestHtml({ name: ticket.buyer_name, event: ev }),
      }).catch(() => {})
    )
  }

  await Promise.allSettled(emails)
  return NextResponse.json({ sent: emails.length })
}

function reviewRequestHtml({ name, event }: { name: string; event: any }) {
  const venue = event.venues
  const artist = event.artists

  const links: string[] = []
  if (venue?.id) {
    links.push(`
    <a href="https://sahne.today/venues/${venue.id}" style="display:inline-block;background:#D4537E;color:#fff;padding:12px 24px;border-radius:10px;text-decoration:none;font-weight:600;font-size:14px;margin:4px">
      ${venue.name} mekanını değerlendir
    </a>`)
  }
  if (artist?.id) {
    links.push(`
    <a href="https://sahne.today/artists/${artist.id}" style="display:inline-block;background:#1e1e1e;color:#E4E0D8;border:1px solid #D4537E;padding:12px 24px;border-radius:10px;text-decoration:none;font-weight:600;font-size:14px;margin:4px">
      ${artist.stage_name} sanatçısını değerlendir
    </a>`)
  }

  return `<!DOCTYPE html><html lang="tr"><head><meta charset="UTF-8"/></head>
<body style="margin:0;padding:0;background:#0f0f0f;font-family:sans-serif">
<div style="max-width:520px;margin:0 auto;padding:40px 20px">
  <p style="color:#E4E0D8;font-size:26px;font-weight:900;letter-spacing:2px;margin:0 0 8px">SAHNE.TODAY</p>
  <p style="color:#9a9a8e;font-size:13px;margin:0 0 32px">Canlı müzik ve performans ekosistemi</p>

  <div style="background:#1a1a1a;border-radius:16px;padding:28px;text-align:center">
    <p style="color:#D4537E;font-size:11px;font-weight:700;letter-spacing:1.5px;margin:0 0 6px">DÜN GECEYİ DEĞERLENDİR</p>
    <h2 style="color:#E4E0D8;font-size:20px;margin:0 0 8px">${event.title} nasıldı?</h2>
    <p style="color:#9a9a8e;font-size:13px;margin:0 0 24px">
      Merhaba ${name}, dünkü etkinlikten keyif aldıysan (veya almadıysan!)
      birkaç saniyeni ayırıp değerlendirmen hem sahnedekilere hem diğer izleyicilere yol gösterir.
    </p>
    ${links.join('')}
  </div>

  <p style="color:#444;font-size:11px;text-align:center;margin-top:24px">
    Bu e-postayı bu etkinliğe bilet aldığınız için aldınız.
  </p>
</div>
</body></html>`
}
