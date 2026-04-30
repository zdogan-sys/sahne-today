import { redirect } from 'next/navigation'
import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { ArtistRegisterForm } from '@/components/artists/ArtistRegisterForm'

export const metadata: Metadata = {
  title: 'Sanatçı Ol',
  description: 'Sanatçı profilinizi oluşturun ve mekan tekliflerini kabul edin.',
}

export default async function ArtistRegisterPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    redirect('/auth')
  }

  // Eğer kullanıcının zaten sanatçı profili varsa, dashboard'a yönlendir.
  const { data: artist } = await supabase
    .from('artists')
    .select('id')
    .eq('profile_id', user.id)
    .maybeSingle()

  if (artist) {
    redirect('/dashboard')
  }

  return (
    <div className="min-h-screen py-8 px-4">
      <div className="max-w-lg mx-auto">
        <h1 className="font-bebas text-5xl text-text-primary mb-2">SANATÇI OL</h1>
        <p className="text-text-muted text-sm mb-8">Profilini oluştur, mekan tekliflerini kabul et, sahneye çık.</p>
        <ArtistRegisterForm />
      </div>
    </div>
  )
}
