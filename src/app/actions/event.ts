'use server'

import { createClient } from '@supabase/supabase-js'
import { createClient as createServerClient } from '@/lib/supabase/server'

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
    .select('venue_id, venues(owner_id)')
    .eq('id', slotId)
    .single()

  const ownerCheck = (slot as any)?.venues?.owner_id
  if (!slot || ownerCheck !== user.id) return { success: false, error: 'Yetkiniz yok.' }

  const { error } = await supabaseAdmin
    .from('slots')
    .update({ status: 'closed' })
    .eq('id', slotId)

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
