'use server'

import { createClient } from '@supabase/supabase-js'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { ADMIN_EMAIL } from '@/lib/admin'
import { notifyFollowers } from '@/app/actions/follow'

async function getAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

async function notify(admin: any, userId: string, type: string, title: string, body: string, data: object = {}) {
  await admin.from('notifications').insert({ user_id: userId, type, title, body, data })
}

export async function respondToVenueOffer(eventId: string, accept: boolean) {
  const supabaseAuth = await createServerClient()
  const { data: { user } } = await supabaseAuth.auth.getUser()
  if (!user) return { success: false, error: 'Oturum açmanız gerekiyor.' }

  const admin = await getAdminClient()

  const { data: ev } = await admin
    .from('events')
    .select('*, artists(profile_id, stage_name), bands(creator_id, name), venues(owner_id, name)')
    .eq('id', eventId)
    .single()

  if (!ev) return { success: false, error: 'Etkinlik bulunamadı.' }
  if (ev.status !== 'offered') return { success: false, error: 'Bu teklif artık geçerli değil.' }

  const artistProfileId = (ev.artists as any)?.profile_id
  const bandCreatorId = (ev.bands as any)?.creator_id
  const isPerformer = artistProfileId === user.id || bandCreatorId === user.id || user.email === ADMIN_EMAIL
  if (!isPerformer) return { success: false, error: 'Yetkiniz yok.' }

  const venueOwnerId = (ev.venues as any)?.owner_id
  const venueName = (ev.venues as any)?.name ?? 'Mekan'
  const performerName = (ev.artists as any)?.stage_name ?? (ev.bands as any)?.name ?? 'Sanatçı'

  if (accept) {
    await admin.from('events').update({ status: 'confirmed', expires_at: null } as any).eq('id', eventId)

    // Auto-reject competing offers for same artist + date
    const competingFilter = ev.artist_id
      ? admin.from('events').select('id, venues(owner_id, name)').eq('artist_id', ev.artist_id).eq('event_date', ev.event_date).eq('status', 'offered').neq('id', eventId)
      : ev.band_id
      ? admin.from('events').select('id, venues(owner_id, name)').eq('band_id', ev.band_id).eq('event_date', ev.event_date).eq('status', 'offered').neq('id', eventId)
      : null

    if (competingFilter) {
      const { data: competing } = await competingFilter
      if (competing && competing.length > 0) {
        await admin.from('events').update({ status: 'rejected' } as any).in('id', competing.map((c: any) => c.id))
        for (const comp of competing) {
          const ownerProfileId = (comp.venues as any)?.owner_id
          if (ownerProfileId) {
            await notify(admin, ownerProfileId, 'competing_offer_rejected',
              'Teklifiniz Yanıtsız Kaldı',
              `${performerName}, ${ev.event_date} tarihi için başka bir teklifi kabul etti. Takviminizi doldurmak için diğer sanatçıları keşfedin.`,
              { event_date: ev.event_date, performer_name: performerName }
            )
          }
        }
      }
    }

    if (venueOwnerId) {
      await notify(admin, venueOwnerId, 'offer_accepted',
        '🎉 Teklif Kabul Edildi',
        `${performerName}, ${ev.event_date} tarihli teklifinizi kabul etti!`,
        { event_id: eventId, event_date: ev.event_date }
      )
    }
    notifyFollowers(eventId).catch(() => {})
  } else {
    await admin.from('events').update({ status: 'rejected' } as any).eq('id', eventId)
    if (venueOwnerId) {
      await notify(admin, venueOwnerId, 'offer_rejected',
        'Teklif Reddedildi',
        `${performerName}, ${ev.event_date} tarihli teklifinizi reddetti.`,
        { event_id: eventId, event_date: ev.event_date }
      )
    }
  }

  return { success: true }
}

export async function withdrawVenueOffer(eventId: string) {
  const supabaseAuth = await createServerClient()
  const { data: { user } } = await supabaseAuth.auth.getUser()
  if (!user) return { success: false, error: 'Oturum açmanız gerekiyor.' }

  const admin = await getAdminClient()

  const { data: ev } = await admin
    .from('events')
    .select('status, venues(owner_id), artists(profile_id), bands(creator_id)')
    .eq('id', eventId)
    .single()

  if (!ev) return { success: false, error: 'Bulunamadı.' }
  if (ev.status !== 'offered') return { success: false, error: 'Bu teklif geri çekilemez.' }
  if ((ev.venues as any)?.owner_id !== user.id && user.email !== ADMIN_EMAIL) return { success: false, error: 'Yetkiniz yok.' }

  await admin.from('events').update({ status: 'withdrawn' } as any).eq('id', eventId)

  const performerProfileId = (ev.artists as any)?.profile_id ?? (ev.bands as any)?.creator_id
  if (performerProfileId) {
    await notify(admin, performerProfileId, 'offer_withdrawn',
      'Teklif Geri Çekildi',
      'Size gönderilen sahne teklifi mekan tarafından geri çekildi.',
      { event_id: eventId }
    )
  }
  return { success: true }
}

export async function markNotificationsRead(ids: string[]) {
  const supabaseAuth = await createServerClient()
  const { data: { user } } = await supabaseAuth.auth.getUser()
  if (!user) return { success: false }
  await supabaseAuth.from('notifications').update({ read: true } as any).in('id', ids)
  return { success: true }
}
