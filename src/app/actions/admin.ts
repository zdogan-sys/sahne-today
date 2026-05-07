'use server'

import { createClient } from '@supabase/supabase-js'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { ADMIN_EMAIL } from '@/lib/admin'
import { revalidatePath } from 'next/cache'

async function getAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

async function assertAdmin() {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (user?.email !== ADMIN_EMAIL) throw new Error('Yetkisiz erişim')
  return user
}

// ─── EVENTS ───────────────────────────────────────────────────────────────

export async function adminCreateEvent(data: Record<string, any>) {
  await assertAdmin()
  const admin = await getAdmin()
  const { error } = await admin.from('events').insert(data)
  if (error) return { success: false, error: error.message }
  revalidatePath('/admin')
  return { success: true }
}

export async function adminUpdateEvent(id: string, data: Record<string, any>) {
  await assertAdmin()
  const admin = await getAdmin()
  const { error } = await admin.from('events').update(data).eq('id', id)
  if (error) return { success: false, error: error.message }
  revalidatePath('/admin')
  return { success: true }
}

export async function adminDeleteEvent(id: string) {
  await assertAdmin()
  const admin = await getAdmin()
  const { error } = await admin.from('events').delete().eq('id', id)
  if (error) return { success: false, error: error.message }
  revalidatePath('/admin')
  return { success: true }
}

// ─── ARTISTS ──────────────────────────────────────────────────────────────

export async function adminCreateArtist(data: Record<string, any>) {
  await assertAdmin()
  const admin = await getAdmin()
  const { data: created, error } = await admin.from('artists').insert(data).select('id, stage_name, city, genres, instruments').single()
  if (error) return { success: false, error: error.message }
  revalidatePath('/admin')
  return { success: true, item: created }
}

export async function adminUpdateArtist(id: string, data: Record<string, any>) {
  await assertAdmin()
  const admin = await getAdmin()
  const { error } = await admin.from('artists').update(data).eq('id', id)
  if (error) return { success: false, error: error.message }
  revalidatePath('/admin')
  return { success: true }
}

export async function adminDeleteArtist(id: string) {
  await assertAdmin()
  const admin = await getAdmin()
  const { error } = await admin.from('artists').delete().eq('id', id)
  if (error) return { success: false, error: error.message }
  revalidatePath('/admin')
  return { success: true }
}

// ─── VENUES ───────────────────────────────────────────────────────────────

export async function adminCreateVenue(data: Record<string, any>) {
  await assertAdmin()
  const admin = await getAdmin()
  const { data: created, error } = await admin.from('venues').insert(data).select('id, name, city, district, venue_type').single()
  if (error) return { success: false, error: error.message }
  revalidatePath('/admin')
  return { success: true, item: created }
}

export async function adminUpdateVenue(id: string, data: Record<string, any>) {
  await assertAdmin()
  const admin = await getAdmin()
  const { error } = await admin.from('venues').update(data).eq('id', id)
  if (error) return { success: false, error: error.message }
  revalidatePath('/admin')
  return { success: true }
}

export async function adminDeleteVenue(id: string) {
  await assertAdmin()
  const admin = await getAdmin()
  const { error } = await admin.from('venues').delete().eq('id', id)
  if (error) return { success: false, error: error.message }
  revalidatePath('/admin')
  return { success: true }
}

// ─── EVENT PERFORMERS ─────────────────────────────────────────────────────

export async function adminAddPerformer(eventId: string, data: { artist_id?: string | null; band_id?: string | null; role?: string | null }) {
  await assertAdmin()
  const admin = await getAdmin()
  const { error } = await admin.from('event_performers').insert({ event_id: eventId, ...data })
  if (error) return { success: false, error: error.message }
  revalidatePath('/admin')
  return { success: true }
}

export async function adminRemovePerformer(id: string) {
  await assertAdmin()
  const admin = await getAdmin()
  const { error } = await admin.from('event_performers').delete().eq('id', id)
  if (error) return { success: false, error: error.message }
  revalidatePath('/admin')
  return { success: true }
}

// ─── BANDS ────────────────────────────────────────────────────────────────

export async function adminCreateBand(data: Record<string, any>) {
  const user = await assertAdmin()
  const admin = await getAdmin()
  const { data: created, error } = await admin.from('bands').insert({ ...data, creator_id: user.id }).select('id, name, city, genres').single()
  if (error) return { success: false, error: error.message }
  revalidatePath('/admin')
  return { success: true, item: created }
}

export async function adminUpdateBand(id: string, data: Record<string, any>) {
  await assertAdmin()
  const admin = await getAdmin()
  const { error } = await admin.from('bands').update(data).eq('id', id)
  if (error) return { success: false, error: error.message }
  revalidatePath('/admin')
  return { success: true }
}

export async function adminDeleteBand(id: string) {
  await assertAdmin()
  const admin = await getAdmin()
  const { error } = await admin.from('bands').delete().eq('id', id)
  if (error) return { success: false, error: error.message }
  revalidatePath('/admin')
  return { success: true }
}

// ─── MEMBERS ──────────────────────────────────────────────────────────────

export async function adminDeleteMember(id: string) {
  await assertAdmin()
  const admin = await getAdmin()
  const { error } = await admin.from('profiles').delete().eq('id', id)
  if (error) return { success: false, error: error.message }
  revalidatePath('/admin')
  return { success: true }
}
