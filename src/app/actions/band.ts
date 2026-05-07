'use server'

import { createClient } from '@supabase/supabase-js'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { ADMIN_EMAIL } from '@/lib/admin'

export async function applyToBand(bandId: string, artistId: string) {
  const supabaseAuth = await createServerClient()
  const { data: { user } } = await supabaseAuth.auth.getUser()

  if (!user) {
    return { success: false, error: 'Oturum açmanız gerekiyor.' }
  }

  const { data: artist } = await supabaseAuth.from('artists').select('id').eq('profile_id', user.id).single()

  if (!artist || artist.id !== artistId) {
    return { success: false, error: 'Yetkiniz yok.' }
  }

  const supabaseAdmin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

  const { error } = await supabaseAdmin.from('band_members').insert({
    band_id: bandId,
    artist_id: artistId,
    status: 'invited',
    role: 'Applicant',
  })

  if (error) return { success: false, error: error.message }
  return { success: true }
}

export async function respondToApplication(membershipId: string, bandId: string, accept: boolean) {
  const supabaseAuth = await createServerClient()
  const { data: { user } } = await supabaseAuth.auth.getUser()

  if (!user) return { success: false, error: 'Oturum açmanız gerekiyor.' }

  const { data: band } = await supabaseAuth.from('bands').select('creator_id').eq('id', bandId).single()

  if (!band || (band.creator_id !== user.id && user.email !== ADMIN_EMAIL)) return { success: false, error: 'Yetkiniz yok.' }

  const supabaseAdmin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

  const updateData: any = { status: accept ? 'accepted' : 'declined' }
  if (accept) {
    updateData.role = null
    updateData.joined_at = new Date().toISOString()
  }

  const { error } = await supabaseAdmin.from('band_members').update(updateData).eq('id', membershipId)

  if (error) return { success: false, error: error.message }
  return { success: true }
}

export async function inviteToBand(bandId: string, artistId: string) {
  const supabaseAuth = await createServerClient()
  const { data: { user } } = await supabaseAuth.auth.getUser()

  if (!user) return { success: false, error: 'Oturum açmanız gerekiyor.' }

  const { data: band } = await supabaseAuth.from('bands').select('creator_id').eq('id', bandId).single()

  if (!band || (band.creator_id !== user.id && user.email !== ADMIN_EMAIL)) return { success: false, error: 'Yetkiniz yok.' }

  const supabaseAdmin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

  // Check if they are already in the table
  const { data: existing } = await supabaseAdmin
    .from('band_members')
    .select('id, status')
    .eq('band_id', bandId)
    .eq('artist_id', artistId)
    .single()

  if (existing) {
    if (existing.status === 'declined') {
      // Re-invite them
      const { error: updErr } = await supabaseAdmin
        .from('band_members')
        .update({ status: 'invited', role: null })
        .eq('id', existing.id)
        
      if (updErr) return { success: false, error: updErr.message }
      return { success: true }
    } else {
      return { success: false, error: 'Bu kişi zaten grupta, davet edilmiş veya başvurmuş.' }
    }
  }

  const isAdmin = user.email === ADMIN_EMAIL
  const status = isAdmin ? 'accepted' : 'invited'
  const extra = isAdmin ? { joined_at: new Date().toISOString() } : {}

  const { error } = await supabaseAdmin.from('band_members').insert({
    band_id: bandId,
    artist_id: artistId,
    status,
    ...extra,
  })

  if (error) return { success: false, error: error.message }
  return { success: true }
}

export async function deleteBand(bandId: string) {
  const supabaseAuth = await createServerClient()
  const { data: { user } } = await supabaseAuth.auth.getUser()
  if (!user) return { success: false, error: 'Oturum açmanız gerekiyor.' }

  const supabaseAdmin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
  const { data: band } = await supabaseAdmin.from('bands').select('creator_id').eq('id', bandId).single()
  if (!band || (band.creator_id !== user.id && user.email !== ADMIN_EMAIL)) return { success: false, error: 'Yetkiniz yok.' }

  const { error } = await supabaseAdmin.from('bands').delete().eq('id', bandId)
  if (error) return { success: false, error: error.message }
  return { success: true }
}

export async function updateBandProfile(bandId: string, payload: {
  name: string
  city: string | null
  genres: string[]
  bio: string | null
}) {
  const supabaseAuth = await createServerClient()
  const { data: { user } } = await supabaseAuth.auth.getUser()
  if (!user) return { success: false, error: 'Oturum açmanız gerekiyor.' }

  const supabaseAdmin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
  const { data: band } = await supabaseAdmin.from('bands').select('creator_id').eq('id', bandId).single()
  if (!band || (band.creator_id !== user.id && user.email !== ADMIN_EMAIL)) return { success: false, error: 'Yetkiniz yok.' }

  const { error } = await supabaseAdmin.from('bands').update({
    name: payload.name,
    city: payload.city,
    genres: payload.genres,
    bio: payload.bio,
  } as any).eq('id', bandId)

  if (error) return { success: false, error: error.message }
  return { success: true }
}
