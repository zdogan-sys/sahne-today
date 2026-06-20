export const dynamic = 'force-dynamic'

import { Suspense } from 'react'
import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { EventsClient } from '@/components/events/EventsClient'
import { getListConfigs } from '@/app/actions/site'
import { EventCardSkeleton } from '@/components/ui/Skeleton'
import { ErrorBoundary } from '@/components/ui/ErrorBoundary'
import { getTranslations } from 'next-intl/server'
import { buildAlternates, localeBase } from '@/lib/seo'

interface MetaProps { params: Promise<{ locale: string }> }

export async function generateMetadata({ params }: MetaProps): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations('events')
  const title = t('title')
  const description = t('description')
  const image = `${localeBase(locale)}/icon-512.png`
  return {
    title,
    description,
    alternates: buildAlternates(locale, '/events'),
    openGraph: { title, description, images: [{ url: image }], type: 'website' },
    twitter: { card: 'summary_large_image', title, description, images: [image] },
  }
}

export default async function EventsPage() {
  const t = await getTranslations('events')
  const supabase = await createClient()
  const today = new Date().toISOString().split('T')[0]

  const [{ data: events }, genres] = await Promise.all([
    supabase
      .from('events')
      .select('*, venues(name, district, city, photo_url, latitude, longitude), artists(stage_name, profiles(avatar_url)), bands(name, photo_url)')
      .eq('status', 'confirmed')
      .gte('event_date', today)
      .order('event_date', { ascending: true })
      .order('start_time', { ascending: true })
      .limit(60),
    getListConfigs(),
  ])

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      <h1 className="font-bebas text-5xl md:text-6xl text-text-primary mb-6">{t('title').toUpperCase()}</h1>
      <ErrorBoundary>
        <Suspense fallback={
          <div className="space-y-3">
            {Array.from({ length: 6 }).map((_, i) => <EventCardSkeleton key={i} />)}
          </div>
        }>
          <EventsClient
            initialEvents={(events ?? []) as any[]}
            musicGenres={genres.music_genres}
            stageGenres={genres.stage_genres}
            danceGenres={genres.dance_types}
          />
        </Suspense>
      </ErrorBoundary>
    </div>
  )
}
