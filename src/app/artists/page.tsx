export const dynamic = 'force-dynamic'

import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { ArtistsClient } from '@/components/artists/ArtistsClient'
import { ErrorBoundary } from '@/components/ui/ErrorBoundary'

export const metadata: Metadata = {
  title: 'Sanatçılar',
  description: 'Türkiye\'nin bağımsız müzisyenlerini ve komedyenlerini keşfet.',
}

export default async function ArtistsPage() {
  const supabase = await createClient()

  const { data: artists } = await supabase
    .from('artists')
    .select('*, profiles(display_name, avatar_url, city)')
    .order('created_at', { ascending: false })
    .limit(60)

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      <h1 className="font-bebas text-5xl md:text-6xl text-text-primary mb-6">SANATÇILAR</h1>
      <ErrorBoundary>
        <ArtistsClient initialArtists={(artists ?? []) as any[]} />
      </ErrorBoundary>
    </div>
  )
}
