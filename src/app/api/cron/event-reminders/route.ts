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

  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  const tomorrowStr = tomorrow.toISOString().split('T')[0]

  const { data: events } = await admin
    .from('events')
    .select(`
      id, title, event_date, start_time,
      venues(name, city, owner_id, profiles:owner_id(email, display_name)),
      artists(stage_name, profile_id, profiles:profile_id(email, display_name)),
      bands(name, creator_id, profiles:creator_id(email, display_name))
    `)
    .eq('event_date', tomorrowStr)
    .eq('status', 'confirmed')

  if (!events || events.length === 0) {
    return NextResponse.json({ sent: 0 })
  }

  const notifications: any[] = []
  const emails: Promise<any>[] = []

  for (const ev of events) {
    const venue = (ev as any).venues
    const artist = (ev as any).artists
    const band = (ev as any).bands

    const eventTitle = ev.title
    const eventDate = ev.event_date
    const venueName = venue?.name ?? ''
    const notifBody = `${venueName ? venueName + ' · ' : ''}${eventDate} saat ${ev.start_time}`
    const link = `/events/${ev.id}`

    // Notify artist
    if (artist?.profile_id) {
      notifications.push({
        user_id: artist.profile_id,
        type: 'event_reminder_24h',
        title: `Yarın Sahnedesin: ${eventTitle}`,
        body: notifBody,
        link,
      })
      const artistEmail = (artist as any).profiles?.email
      if (artistEmail) {
        emails.push(resend.emails.send({
          from: 'Sahne.Today <bildirim@sahne.today>',
          to: artistEmail,
          subject: `Yarın Sahnedesin — ${eventTitle}`,
          html: reminderEmailHtml({ name: artist.stage_name, eventTitle, eventDate, venueName, link }),
        }))
      }
    }

    // Notify band creator
    if (band?.creator_id) {
      notifications.push({
        user_id: band.creator_id,
        type: 'event_reminder_24h',
        title: `Yarın Sahnedesiniz: ${eventTitle}`,
        body: notifBody,
        link,
      })
      const bandEmail = (band as any).profiles?.email
      if (bandEmail) {
        emails.push(resend.emails.send({
          from: 'Sahne.Today <bildirim@sahne.today>',
          to: bandEmail,
          subject: `Yarın Sahnedesiniz — ${eventTitle}`,
          html: reminderEmailHtml({ name: band.name, eventTitle, eventDate, venueName, link }),
        }))
      }
    }

    // Notify venue owner
    if (venue?.owner_id) {
      notifications.push({
        user_id: venue.owner_id,
        type: 'event_reminder_24h',
        title: `Yarın Etkinlik Var: ${eventTitle}`,
        body: notifBody,
        link,
      })
      const venueEmail = (venue as any).profiles?.email
      if (venueEmail) {
        emails.push(resend.emails.send({
          from: 'Sahne.Today <bildirim@sahne.today>',
          to: venueEmail,
          subject: `Yarın Etkinlik Var — ${eventTitle}`,
          html: reminderEmailHtml({ name: venue.name, eventTitle, eventDate, venueName, link }),
        }))
      }
    }
  }

  if (notifications.length > 0) {
    await admin.from('notifications').insert(notifications)
  }
  await Promise.allSettled(emails)

  return NextResponse.json({ sent: notifications.length })
}

function reminderEmailHtml({ name, eventTitle, eventDate, venueName, link }: {
  name: string; eventTitle: string; eventDate: string; venueName: string; link: string
}) {
  const url = `https://sahne.today${link}`
  return `<!DOCTYPE html><html lang="tr"><head><meta charset="UTF-8"/></head>
<body style="margin:0;padding:0;background:#0f0f0f;font-family:sans-serif">
<div style="max-width:480px;margin:0 auto;padding:40px 20px">
  <p style="color:#E4E0D8;font-size:28px;font-weight:900;letter-spacing:2px;margin:0 0 32px">SAHNE.TODAY</p>
  <div style="background:#1a1a1a;border-radius:16px;padding:32px">
    <p style="color:#D4537E;font-size:12px;font-weight:600;letter-spacing:1px;margin:0 0 8px">HATIRLATMA</p>
    <h2 style="color:#E4E0D8;font-size:20px;margin:0 0 8px">${eventTitle}</h2>
    <p style="color:#9a9a8e;font-size:14px;margin:0 0 4px">Merhaba ${name},</p>
    <p style="color:#9a9a8e;font-size:14px;margin:0 0 24px">Yarın bir etkinliğiniz var. ${venueName ? venueName + ' · ' : ''}${eventDate}</p>
    <a href="${url}" style="display:inline-block;background:#D4537E;color:#fff;padding:12px 28px;border-radius:10px;text-decoration:none;font-weight:600;font-size:14px">Etkinliğe Git</a>
  </div>
  <p style="color:#555;font-size:12px;text-align:center;margin-top:24px">sahne.today</p>
</div>
</body></html>`
}
