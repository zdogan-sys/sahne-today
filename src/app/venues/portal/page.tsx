import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export default async function VenuePortal() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    redirect('/auth')
  }

  const { data: venues } = await supabase
    .from('venues')
    .select('id')
    .eq('owner_id', user.id)
    .limit(1)

  if (venues && venues.length > 0) {
    redirect('/dashboard')
  } else {
    redirect('/venues/register')
  }
}
