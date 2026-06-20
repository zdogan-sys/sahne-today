import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export default async function VenuePortal() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    redirect('/auth')
  }

  const { data: membership } = await supabase
    .from('venue_members')
    .select('venue_id')
    .eq('user_id', user.id)
    .limit(1)
    .maybeSingle()

  if (membership) {
    redirect('/dashboard')
  } else {
    redirect('/venues/register')
  }
}
