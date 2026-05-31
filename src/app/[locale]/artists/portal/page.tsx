import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export default async function ArtistPortal() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    redirect('/auth')
  }

  const { data: artist } = await supabase
    .from('artists')
    .select('id')
    .eq('profile_id', user.id)
    .maybeSingle()

  if (artist) {
    redirect('/dashboard')
  } else {
    redirect('/artists/register')
  }
}
