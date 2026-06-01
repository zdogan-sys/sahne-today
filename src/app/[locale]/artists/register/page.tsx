import { redirect } from 'next/navigation'
import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { ArtistRegisterForm } from '@/components/artists/ArtistRegisterForm'
import { isAdminUser } from '@/lib/admin'

export const metadata: Metadata = {
  title: 'Sanatçı Ol',
  description: 'Sanatçı profilinizi oluşturun ve mekan tekliflerini kabul edin.',
}

export default async function ArtistRegisterPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  const isEn = locale === 'en'
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

  if (artist && !isAdminUser(user)) {
    redirect('/dashboard')
  }

  return (
    <div className="min-h-screen py-8 px-4">
      <div className="max-w-lg mx-auto">
        <h1 className="font-bebas text-5xl text-text-primary mb-2">{isEn ? 'BECOME AN ARTIST' : 'SANATÇI OL'}</h1>
        <p className="text-text-muted text-sm mb-8">{isEn ? 'Create your profile, accept venue offers, and get on stage.' : 'Profilini oluştur, mekan tekliflerini kabul et, sahneye çık.'}</p>
        <ArtistRegisterForm />
      </div>
    </div>
  )
}
