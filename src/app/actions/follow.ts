'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function toggleFollow(
  targetType: 'artist' | 'band' | 'venue',
  targetId: string
): Promise<{ following: boolean; error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { following: false, error: 'Giriş yapmanız gerekiyor.' }

  const { data: existing } = await supabase
    .from('follows')
    .select('id')
    .eq('user_id', user.id)
    .eq('target_type', targetType)
    .eq('target_id', targetId)
    .maybeSingle()

  if (existing) {
    await supabase.from('follows').delete().eq('id', existing.id)
    return { following: false }
  }

  await supabase.from('follows').insert({ user_id: user.id, target_type: targetType, target_id: targetId } as any)
  return { following: true }
}

export async function notifyFollowers(eventId: string, locale: 'tr' | 'en' = 'tr') {
  const admin = createAdminClient()

  const { data: ev } = await admin
    .from('events')
    .select('id, title, event_date, start_time, artist_id, band_id, venue_id, venues(name, city), artists(stage_name), bands(name)')
    .eq('id', eventId)
    .single()

  if (!ev) return

  const targetIds: { type: 'artist' | 'band' | 'venue'; id: string }[] = []
  if ((ev as any).artist_id) targetIds.push({ type: 'artist', id: (ev as any).artist_id })
  if ((ev as any).band_id) targetIds.push({ type: 'band', id: (ev as any).band_id })
  if ((ev as any).venue_id) targetIds.push({ type: 'venue', id: (ev as any).venue_id })

  if (targetIds.length === 0) return

  const followerSets = await Promise.all(
    targetIds.map(t =>
      admin
        .from('follows')
        .select('user_id, profiles(email, display_name)')
        .eq('target_type', t.type)
        .eq('target_id', t.id)
    )
  )

  const seen = new Set<string>()
  const followers: { userId: string; email: string; name: string }[] = []

  for (const res of followerSets) {
    for (const row of res.data ?? []) {
      const r = row as any
      const email = r.profiles?.email
      const userId = r.user_id
      if (!email || seen.has(userId)) continue
      seen.add(userId)
      followers.push({ userId, email, name: r.profiles?.display_name ?? '' })
    }
  }

  if (followers.length === 0) return

  const venue = (ev as any).venues
  const performer = (ev as any).artists?.stage_name ?? (ev as any).bands?.name ?? ''
  const location = venue ? `${venue.name}, ${venue.city}` : ''
  const dateOptions: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'long', year: 'numeric' }
  const eventDate = new Date((ev as any).event_date).toLocaleDateString(locale === 'en' ? 'en-US' : 'tr-TR', dateOptions)
  const notificationTitle = locale === 'en'
    ? `New Event: ${(ev as any).title}`
    : `Yeni Etkinlik: ${(ev as any).title}`
  const viewButtonText = locale === 'en' ? 'View Event →' : 'Etkinliği Gör →'

  // In-app notifications
  await admin.from('notifications').insert(
    followers.map(f => ({
      user_id: f.userId,
      type: 'event_confirmed',
      title: notificationTitle,
      body: `${performer}${location ? ` · ${location}` : ''} · ${eventDate}`,
      link: `/events/${eventId}`,
    }))
  )

  // Emails
  try {
    const { Resend } = await import('resend')
    const resend = new Resend(process.env.RESEND_API_KEY)
    await Promise.all(
      followers.map(f =>
        resend.emails.send({
          from: locale === 'en' ? 'The Stage.Today <notifications@thestage.today>' : 'Sahne.Today <bildirim@sahne.today>',
          to: f.email,
          subject: notificationTitle,
          html: followEventEmailHtml({
            name: f.name,
            eventTitle: (ev as any).title,
            performer,
            location,
            eventDate,
            eventId,
            locale,
            viewButtonText,
          }),
        }).catch(() => {})
      )
    )
  } catch {}
}

function followEventEmailHtml(p: {
  name: string
  eventTitle: string
  performer: string
  location: string
  eventDate: string
  eventId: string
  locale: 'tr' | 'en'
  viewButtonText: string
}) {
  const domain = p.locale === 'en' ? 'thestage.today' : 'sahne.today'
  const disclaimer = p.locale === 'en'
    ? `You received this email because you follow this account. <a href="https://${domain}/dashboard" style="color:#a09a8e">Manage your follows</a>`
    : `Takip ettiğiniz için bu e-postayı aldınız. <a href="https://${domain}/dashboard" style="color:#a09a8e">Takiplerimi yönet</a>`

  return `
    <div style="font-family:sans-serif;max-width:520px;margin:0 auto;background:#111;color:#e4e0d8;padding:32px;border-radius:12px">
      <h2 style="font-size:22px;margin:0 0 8px">🎵 ${p.eventTitle}</h2>
      ${p.performer ? `<p style="color:#a09a8e;margin:0 0 4px">${p.performer}</p>` : ''}
      ${p.location ? `<p style="color:#a09a8e;margin:0 0 4px">📍 ${p.location}</p>` : ''}
      <p style="color:#a09a8e;margin:0 0 24px">📅 ${p.eventDate}</p>
      <a href="https://${domain}/events/${p.eventId}"
         style="background:#e8622a;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600">
        ${p.viewButtonText}
      </a>
      <p style="color:#666;font-size:12px;margin-top:32px">
        ${disclaimer}
      </p>
    </div>
  `
}
