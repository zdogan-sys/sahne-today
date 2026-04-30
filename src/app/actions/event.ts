'use server'

import { createClient } from '@supabase/supabase-js'
import { createClient as createServerClient } from '@/lib/supabase/server'

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

  const { data: event } = await supabaseAuth
    .from('events')
    .select('id, artist_id, band_id')
    .eq('id', eventId)
    .single()

  if (!event) return { success: false, error: 'Etkinlik bulunamadı.' }

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
