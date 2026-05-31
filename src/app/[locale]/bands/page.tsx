export const dynamic = 'force-dynamic'

import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { BandsClient } from '@/components/bands/BandsClient'
import { getTranslations } from 'next-intl/server'

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('bands')
  return { title: t('title') }
}

export default async function BandsPage() {
  const t = await getTranslations('bands')
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  const artistRes = user
    ? await supabase.from('artists').select('id').eq('profile_id', user.id).single()
    : null
  const isArtist = !!artistRes?.data

  const { data } = await supabase
    .from('bands')
    .select('id, name, genres, city, bio, photo_url, looking_for, band_members(status)')
    .order('created_at', { ascending: false })
    .limit(60)

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 pb-24">
      <h1 className="font-bebas text-5xl md:text-6xl text-text-primary mb-2">{t('title').toUpperCase()}</h1>
      <BandsClient initialBands={(data ?? []) as any[]} isArtist={isArtist} />
    </div>
  )
}
