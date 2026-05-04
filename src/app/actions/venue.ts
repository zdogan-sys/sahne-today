'use server'

import { createClient } from '@supabase/supabase-js'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function claimVenue(venueId: string) {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Giriş yapmanız gerekiyor.' }

  const { data: venue } = await supabase
    .from('venues').select('id, owner_id').eq('id', venueId).single()
  if (!venue) return { success: false, error: 'Mekan bulunamadı.' }
  if (venue.owner_id) return { success: false, error: 'Bu mekan zaten bir hesaba bağlı.' }

  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
  const { error } = await admin
    .from('venues').update({ owner_id: user.id }).eq('id', venueId).is('owner_id', null)
  if (error) return { success: false, error: error.message }

  revalidatePath(`/venues/${venueId}`)
  return { success: true }
}
