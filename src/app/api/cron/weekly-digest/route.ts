import { createAdminClient } from '@/lib/supabase/admin'
import { Resend } from 'resend'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  const authHeader = req.headers.get('Authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const admin = createAdminClient()
  const resend = new Resend(process.env.RESEND_API_KEY)

  const today = new Date()
  const weekEnd = new Date(today)
  weekEnd.setDate(today.getDate() + 7)
  const todayStr = today.toISOString().split('T')[0]
  const weekEndStr = weekEnd.toISOString().split('T')[0]

  // Bu haftanın onaylı etkinlikleri
  const { data: events } = await admin
    .from('events')
    .select('id, title, event_date, start_time, entry_type, entry_fee, genre, venues(name, city), artists(stage_name), bands(name)')
    .eq('status', 'confirmed')
    .gte('event_date', todayStr)
    .lte('event_date', weekEndStr)
    .order('event_date', { ascending: true })
    .limit(200)

  if (!events || events.length === 0) {
    return NextResponse.json({ sent: 0, reason: 'no events this week' })
  }

  // Tüm kullanıcılar (e-postası olanlar)
  const { data: profiles } = await admin
    .from('profiles')
    .select('id, email, display_name, city')
    .not('email', 'is', null)
    .limit(2000)

  if (!profiles || profiles.length === 0) {
    return NextResponse.json({ sent: 0, reason: 'no users' })
  }

  const emailsSent: Promise<any>[] = []

  for (const profile of profiles) {
    const userCity = (profile as any).city as string | null
    const userEvents = userCity
      ? events.filter((e: any) => e.venues?.city?.toLowerCase() === userCity.toLowerCase())
      : events

    if (userEvents.length === 0) continue

    const email = (profile as any).email as string
    const name = (profile as any).display_name ?? 'Merhaba'

    emailsSent.push(
      resend.emails.send({
        from: 'Sahne.Today <bildirim@sahne.today>',
        to: email,
        subject: `Bu Hafta Sahne.Today'de ${userEvents.length} Etkinlik`,
        html: digestEmailHtml({ name, events: userEvents, city: userCity }),
      }).catch(() => {})
    )
  }

  await Promise.allSettled(emailsSent)

  return NextResponse.json({ sent: emailsSent.length })
}

function formatEventDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('tr-TR', { weekday: 'long', day: 'numeric', month: 'long' })
}

function entryLabel(ev: any) {
  if (ev.entry_type === 'free') return 'Ücretsiz'
  if (ev.entry_type === 'paid' && ev.entry_fee) return `${ev.entry_fee}₺`
  return 'Kapıda'
}

function digestEmailHtml({ name, events, city }: { name: string; events: any[]; city: string | null }) {
  const cityLabel = city ? `${city}'deki` : 'Bu Haftaki'

  const eventRows = events.slice(0, 10).map((ev: any) => {
    const venue = ev.venues
    const performer = ev.artists?.stage_name ?? ev.bands?.name ?? ''
    const location = venue ? `${venue.name}, ${venue.city}` : ''
    const date = formatEventDate(ev.event_date)
    const time = ev.start_time ? ev.start_time.slice(0, 5) : ''
    const entry = entryLabel(ev)
    const url = `https://sahne.today/events/${ev.id}`

    return `
    <div style="border-bottom:1px solid #2a2a2a;padding:16px 0">
      <a href="${url}" style="text-decoration:none">
        <p style="color:#E4E0D8;font-size:15px;font-weight:600;margin:0 0 4px">${ev.title}</p>
      </a>
      ${performer ? `<p style="color:#D4537E;font-size:12px;margin:0 0 4px">${performer}</p>` : ''}
      <p style="color:#9a9a8e;font-size:13px;margin:0 0 2px">${date}${time ? ` · ${time}` : ''}</p>
      ${location ? `<p style="color:#9a9a8e;font-size:13px;margin:0 0 4px">📍 ${location}</p>` : ''}
      <span style="background:#1e1e1e;color:#a09a8e;font-size:11px;padding:2px 8px;border-radius:4px">${entry}</span>
    </div>`
  }).join('')

  const moreCount = events.length > 10 ? events.length - 10 : 0

  return `<!DOCTYPE html><html lang="tr"><head><meta charset="UTF-8"/></head>
<body style="margin:0;padding:0;background:#0f0f0f;font-family:sans-serif">
<div style="max-width:520px;margin:0 auto;padding:40px 20px">
  <p style="color:#E4E0D8;font-size:26px;font-weight:900;letter-spacing:2px;margin:0 0 8px">SAHNE.TODAY</p>
  <p style="color:#9a9a8e;font-size:13px;margin:0 0 32px">Canlı müzik ve performans ekosistemi</p>

  <div style="background:#1a1a1a;border-radius:16px;padding:28px">
    <p style="color:#D4537E;font-size:11px;font-weight:700;letter-spacing:1.5px;margin:0 0 6px">HAFTALIK BÜLTEN</p>
    <h2 style="color:#E4E0D8;font-size:20px;margin:0 0 4px">${cityLabel} Etkinlikler</h2>
    <p style="color:#9a9a8e;font-size:13px;margin:0 0 20px">Merhaba ${name}, bu hafta ${events.length} etkinlik var.</p>

    ${eventRows}

    ${moreCount > 0 ? `
    <p style="color:#9a9a8e;font-size:13px;text-align:center;margin:16px 0 0">
      ve ${moreCount} etkinlik daha...
    </p>` : ''}

    <div style="text-align:center;margin-top:24px">
      <a href="https://sahne.today/events" style="display:inline-block;background:#D4537E;color:#fff;padding:12px 32px;border-radius:10px;text-decoration:none;font-weight:600;font-size:14px">
        Tüm Etkinlikleri Gör
      </a>
    </div>
  </div>

  <p style="color:#444;font-size:11px;text-align:center;margin-top:24px">
    Takip ettiğiniz için bu e-postayı aldınız.
    <a href="https://sahne.today/dashboard" style="color:#666">Bildirimleri yönet</a>
  </p>
</div>
</body></html>`
}
