'use server'

import { createClient } from '@supabase/supabase-js'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { ADMIN_EMAIL, isPrivilegedUser } from '@/lib/admin'

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

  if (!band || (band.creator_id !== user.id && !await isPrivilegedUser(user))) return { success: false, error: 'Yetkiniz yok.' }

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

  if (!band || (band.creator_id !== user.id && !await isPrivilegedUser(user))) return { success: false, error: 'Yetkiniz yok.' }

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

  const isAdmin = await isPrivilegedUser(user)
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
  if (!band || (band.creator_id !== user.id && !await isPrivilegedUser(user))) return { success: false, error: 'Yetkiniz yok.' }

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
  if (!band || (band.creator_id !== user.id && !await isPrivilegedUser(user))) return { success: false, error: 'Yetkiniz yok.' }

  const { error } = await supabaseAdmin.from('bands').update({
    name: payload.name,
    city: payload.city,
    genres: payload.genres,
    bio: payload.bio,
  } as any).eq('id', bandId)

  if (error) return { success: false, error: error.message }
  return { success: true }
}

// Instagram taramasından admin onayıyla açılan gruplar sahipsiz (creator_id NULL) başlar.
// İlk sahiplenen kullanıcı grubun yöneticisi olur; sanatçı profili varsa "Kurucu" üyesi de eklenir.
export async function claimBand(bandId: string) {
  const supabaseAuth = await createServerClient()
  const { data: { user } } = await supabaseAuth.auth.getUser()
  if (!user) return { success: false, error: 'Giriş yapmanız gerekiyor.' }

  const supabaseAdmin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
  const { data: claimed, error } = await supabaseAdmin
    .from('bands').update({ creator_id: user.id }).eq('id', bandId).is('creator_id', null)
    .select('id')
  if (error) return { success: false, error: error.message }
  if (!claimed?.length) return { success: false, error: 'Bu grup zaten bir hesaba bağlı.' }

  const { data: artist } = await supabaseAdmin.from('artists').select('id').eq('profile_id', user.id).maybeSingle()
  if (artist) {
    const { data: mem } = await supabaseAdmin.from('band_members')
      .select('id').eq('band_id', bandId).eq('artist_id', (artist as any).id).maybeSingle()
    if (mem) {
      await supabaseAdmin.from('band_members')
        .update({ status: 'accepted', joined_at: new Date().toISOString() }).eq('id', (mem as any).id)
    } else {
      await supabaseAdmin.from('band_members').insert({
        band_id: bandId,
        artist_id: (artist as any).id,
        role: 'Kurucu',
        status: 'accepted',
        joined_at: new Date().toISOString(),
      })
    }
  }

  revalidatePath(`/bands/${bandId}`)
  return { success: true }
}
