'use server'

import { createClient } from '@supabase/supabase-js'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { ADMIN_EMAIL } from '@/lib/admin'

async function getAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

async function isEventParty(userId: string, userEmail: string | undefined, eventId: string): Promise<boolean> {
  if (userEmail === ADMIN_EMAIL) return true
  const admin = await getAdminClient()
  const { data: ev } = await admin
    .from('events')
    .select('artist_id, band_id, venue_id, artists(profile_id), bands(creator_id), venues(owner_id)')
    .eq('id', eventId)
    .single()
  if (!ev) return false
  const a = ev.artists as any
  const b = ev.bands as any
  const v = ev.venues as any
  return (
    a?.profile_id === userId ||
    b?.creator_id === userId ||
    v?.owner_id === userId
  )
}

export async function updateEventPoster(eventId: string, url: string) {
  const supabaseAuth = await createServerClient()
  const { data: { user } } = await supabaseAuth.auth.getUser()
  if (!user) return { success: false, error: 'Oturum açmanız gerekiyor.' }
  if (!(await isEventParty(user.id, user.email ?? undefined, eventId))) return { success: false, error: 'Yetkiniz yok.' }
  const admin = await getAdminClient()
  const { error } = await admin.from('events').update({ poster_url: url } as any).eq('id', eventId)
  if (error) return { success: false, error: error.message }
  return { success: true }
}

export async function addEventPhoto(eventId: string, url: string) {
  const supabaseAuth = await createServerClient()
  const { data: { user } } = await supabaseAuth.auth.getUser()
  if (!user) return { success: false, error: 'Oturum açmanız gerekiyor.' }
  if (!(await isEventParty(user.id, user.email ?? undefined, eventId))) return { success: false, error: 'Yetkiniz yok.' }
  const admin = await getAdminClient()
  const { data: ev } = await admin.from('events').select('photos').eq('id', eventId).single()
  const current: string[] = (ev as any)?.photos ?? []
  const { error } = await admin.from('events').update({ photos: [...current, url] } as any).eq('id', eventId)
  if (error) return { success: false, error: error.message }
  return { success: true }
}

export async function removeEventPhoto(eventId: string, url: string) {
  const supabaseAuth = await createServerClient()
  const { data: { user } } = await supabaseAuth.auth.getUser()
  if (!user) return { success: false, error: 'Oturum açmanız gerekiyor.' }
  if (!(await isEventParty(user.id, user.email ?? undefined, eventId))) return { success: false, error: 'Yetkiniz yok.' }
  const admin = await getAdminClient()
  const { data: ev } = await admin.from('events').select('photos').eq('id', eventId).single()
  const current: string[] = (ev as any)?.photos ?? []
  const { error } = await admin.from('events').update({ photos: current.filter(p => p !== url) } as any).eq('id', eventId)
  if (error) return { success: false, error: error.message }
  return { success: true }
}

export async function closeSlot(slotId: string) {
  const supabaseAuth = await createServerClient()
  const { data: { user } } = await supabaseAuth.auth.getUser()
  if (!user) return { success: false, error: 'Oturum açmanız gerekiyor.' }

  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { data: slot } = await supabaseAdmin
    .from('slots')
    .select('venue_id')
    .eq('id', slotId)
    .single()

  if (!slot) return { success: false, error: 'Slot bulunamadı.' }

  const { data: venue } = await supabaseAdmin
    .from('venues')
    .select('owner_id')
    .eq('id', slot.venue_id)
    .single()

  if (!venue || (venue.owner_id !== user.id && user.email !== ADMIN_EMAIL)) return { success: false, error: 'Yetkiniz yok.' }

  const { error } = await supabaseAdmin
    .from('slots')
    .delete()
    .eq('id', slotId)

  if (error) return { success: false, error: error.message }
  return { success: true }
}

export async function addBandEvent(payload: {
  bandId: string
  title: string
  eventDate: string
  startTime: string
  endTime: string | null
  venueId: string | null
  venueName: string | null
  genre: string | null
}) {
  const supabaseAuth = await createServerClient()
  const { data: { user } } = await supabaseAuth.auth.getUser()
  if (!user) return { success: false, error: 'Oturum açmanız gerekiyor.' }

  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { data: band } = await supabaseAdmin
    .from('bands')
    .select('creator_id')
    .eq('id', payload.bandId)
    .single()

  if (!band || (band.creator_id !== user.id && user.email !== ADMIN_EMAIL)) return { success: false, error: 'Yetkiniz yok.' }

  const status = payload.venueId ? 'pending' : 'confirmed'

  const { data, error } = await supabaseAdmin
    .from('events')
    .insert({
      band_id: payload.bandId,
      title: payload.title,
      event_date: payload.eventDate,
      start_time: payload.startTime,
      end_time: payload.endTime,
      venue_id: payload.venueId,
      venue_name: payload.venueName,
      genre: payload.genre,
      entry_type: 'free',
      status,
    })
    .select('id, event_date, title, start_time, end_time')
    .single()

  if (error || !data) return { success: false, error: error?.message ?? 'Eklenemedi.' }
  return { success: true, data: { ...(data as any), status } }
}

export async function cancelBandEvent(eventId: string) {
  const supabaseAuth = await createServerClient()
  const { data: { user } } = await supabaseAuth.auth.getUser()
  if (!user) return { success: false, error: 'Oturum açmanız gerekiyor.' }

  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { data: event } = await supabaseAdmin
    .from('events')
    .select('bands(creator_id)')
    .eq('id', eventId)
    .single()

  const creatorId = (event as any)?.bands?.creator_id
  if (!creatorId || (creatorId !== user.id && user.email !== ADMIN_EMAIL)) return { success: false, error: 'Yetkiniz yok.' }

  const { error } = await supabaseAdmin
    .from('events')
    .update({ status: 'cancelled' })
    .eq('id', eventId)

  if (error) return { success: false, error: error.message }
  return { success: true }
}

export async function respondToCancelRequest(eventId: string, approve: boolean) {
  const supabaseAuth = await createServerClient()
  const { data: { user } } = await supabaseAuth.auth.getUser()

  if (!user) return { success: false, error: 'Oturum açmanız gerekiyor.' }

  const { data: artist } = await supabaseAuth
    .from('artists')
    .select('id')
    .eq('profile_id', user.id)
    .single()

  if (!artist) return { success: false, error: 'Sanatçı profili bulunamadı.' }

  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { error } = await supabaseAdmin
    .from('events')
    .update({
      ...(approve ? { status: 'cancelled' } : {}),
      cancel_requested: false,
    })
    .eq('id', eventId)

  if (error) return { success: false, error: error.message }
  return { success: true }
}
