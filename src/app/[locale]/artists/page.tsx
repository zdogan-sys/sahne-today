export const dynamic = 'force-dynamic'

import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { ArtistsClient } from '@/components/artists/ArtistsClient'
import { ErrorBoundary } from '@/components/ui/ErrorBoundary'
import { getTranslations } from 'next-intl/server'

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('artists')
  return { title: t('title') }
}

export default async function ArtistsPage() {
  const t = await getTranslations('artists')
  const supabase = await createClient()

  const { data: artists } = await supabase
    .from('artists')
    .select('*, profiles(display_name, avatar_url, city)')
    .eq('is_hidden', false)
    .order('created_at', { ascending: false })
    .limit(60)

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      <h1 className="font-bebas text-5xl md:text-6xl text-text-primary mb-6">{t('title').toUpperCase()}</h1>
      <ErrorBoundary>
        <ArtistsClient initialArtists={(artists ?? []) as any[]} />
      </ErrorBoundary>
    </div>
  )
}
