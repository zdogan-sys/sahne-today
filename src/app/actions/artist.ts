'use server'

import { createClient } from '@supabase/supabase-js'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { isAdminUser } from '@/lib/admin'
import { revalidatePath } from 'next/cache'
import type { SocialLinksData } from '@/components/ui/SocialLinks'

export async function claimArtistProfile(artistId: string) {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Giriş yapmanız gerekiyor.' }

  const { data: artist } = await supabase
    .from('artists').select('id, profile_id').eq('id', artistId).single()
  if (!artist) return { success: false, error: 'Profil bulunamadı.' }
  if (artist.profile_id) return { success: false, error: 'Bu profil zaten bir hesaba bağlı.' }

  const { data: existing } = await supabase
    .from('artists').select('id').eq('profile_id', user.id).maybeSingle()
  if (existing) return { success: false, error: 'Zaten bir sanatçı profiliniz var.' }

  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
  const { error } = await admin
    .from('artists').update({ profile_id: user.id }).eq('id', artistId).is('profile_id', null)
  if (error) return { success: false, error: error.message }

  revalidatePath(`/artists/${artistId}`)
  return { success: true }
}

export async function updateArtistProfile(
  artistId: string,
  payload: {
    stage_name: string
    city: string | null
    active_cities?: string[]
    genres: string[]
    instruments: string[]
    bio: string | null
    social_links: SocialLinksData
    is_hidden: boolean
    avatar_url?: string | null
  }
) {
  const supabaseAuth = await createServerClient()
  const { data: { user } } = await supabaseAuth.auth.getUser()

  if (!user) return { success: false, error: 'Oturum açmanız gerekiyor.' }

  const admin = isAdminUser(user)

  const { data: artist } = await supabaseAuth.from('artists').select('profile_id').eq('id', artistId).single()

  if (!admin) {
    if (!artist || artist.profile_id !== user.id) {
      return { success: false, error: 'Yetkiniz yok.' }
    }
  }

  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // Re-fetch via admin client to guarantee profile_id is always available
  // (supabaseAuth may return null for profile_id due to RLS when admin edits another user's profile)
  const { data: artistAdmin } = await supabaseAdmin
    .from('artists')
    .select('profile_id')
    .eq('id', artistId)
    .single()

  const { error } = await supabaseAdmin
    .from('artists')
    .update({
      stage_name: payload.stage_name,
      city: payload.city,
      active_cities: payload.active_cities ?? [],
      genres: payload.genres,
      instruments: payload.instruments,
      bio: payload.bio,
      social_links: payload.social_links,
      is_hidden: payload.is_hidden,
    } as any)
    .eq('id', artistId)

  if (error) return { success: false, error: error.message }

  if (payload.avatar_url !== undefined && artistAdmin?.profile_id) {
    await supabaseAdmin
      .from('profiles')
      .update({ avatar_url: payload.avatar_url } as any)
      .eq('id', artistAdmin.profile_id)
  }

  revalidatePath(`/artists/${artistId}`)
  return { success: true }
}
