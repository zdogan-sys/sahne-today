export const dynamic = 'force-dynamic'

import { Suspense } from 'react'
import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { buildAlternates, localeBase } from '@/lib/seo'
import { getCityBySlug, slugifyCity } from '@/lib/cities'
import { EventCardSkeleton } from '@/components/ui/Skeleton'
import { ErrorBoundary } from '@/components/ui/ErrorBoundary'
import { EventsClient } from '@/components/events/EventsClient'
import { getListConfigs } from '@/app/actions/site'

interface Props { params: Promise<{ locale: string; city: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, city: slug } = await params
  const supabase = await createClient()
  const city = await getCityBySlug(supabase, slug)
  if (!city) return {}

  const isEn = locale === 'en'
  const title = isEn ? `${city} Live Events` : `${city} Etkinlikleri`
  const description = isEn
    ? `Upcoming live music, theatre, stand-up and stage events in ${city}. Tickets and venue info on TheStage.Today.`
    : `${city}'daki yaklaşan canlı müzik, tiyatro, stand-up ve sahne etkinlikleri. Biletler ve mekan bilgileri Sahne.Today'de.`
  const image = `${localeBase(locale)}/icon-512.png`
  return {
    title,
    description,
    alternates: buildAlternates(locale, `/${slug}`),
    openGraph: { title, description, images: [{ url: image }], type: 'website' },
    twitter: { card: 'summary_large_image', title, description, images: [image] },
  }
}

export default async function CityPage({ params }: Props) {
  const { locale, city: slug } = await params
  const isEn = locale === 'en'
  const supabase = await createClient()

  const city = await getCityBySlug(supabase, slug)
  if (!city) notFound()

  const today = new Date().toISOString().split('T')[0]

  const [{ data: events }, genres] = await Promise.all([
    supabase
      .from('events')
      .select('*, venues!inner(name, district, city, photo_url, latitude, longitude), artists(stage_name, profiles(avatar_url)), bands(name, photo_url)')
      .eq('status', 'confirmed')
      .eq('venues.city', city)
      .gte('event_date', today)
      .order('event_date', { ascending: true })
      .order('start_time', { ascending: true })
      .limit(60),
    getListConfigs(),
  ])

  const base = 'https://sahne.today'
  const pageName = isEn ? `${city} Live Events` : `${city} Etkinlikleri`
  const breadcrumbLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Sahne.Today', item: base },
      { '@type': 'ListItem', position: 2, name: pageName, item: `${base}/${slugifyCity(city)}` },
    ],
  }

  const itemListLd = (events ?? []).length > 0 ? {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: pageName,
    itemListElement: (events ?? []).slice(0, 10).map((ev: any, i: number) => ({
      '@type': 'ListItem',
      position: i + 1,
      url: `${base}/events/${ev.id}`,
      name: ev.title,
    })),
  } : null

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }} />
      {itemListLd && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListLd) }} />}

      <div className="mb-2 text-sm text-text-muted">
        <Link href="/" className="hover:text-text-primary">Sahne.Today</Link>
        <span className="mx-1.5">›</span>
        <span>{city}</span>
      </div>

      <h1 className="font-bebas text-5xl md:text-6xl text-text-primary mb-2 uppercase">
        {pageName}
      </h1>
      <p className="text-text-muted text-sm mb-6">
        {isEn
          ? `Upcoming live music, theatre and stage events in ${city}.`
          : `${city}'daki yaklaşan canlı müzik, tiyatro ve sahne etkinlikleri.`}
      </p>

      <ErrorBoundary>
        <Suspense fallback={
          <div className="space-y-3">
            {Array.from({ length: 6 }).map((_, i) => <EventCardSkeleton key={i} />)}
          </div>
        }>
          {(events ?? []).length > 0 ? (
            <EventsClient
                initialEvents={(events ?? []) as any[]}
                musicGenres={genres.music_genres}
                stageGenres={genres.stage_genres}
                danceGenres={genres.dance_types}
              />
          ) : (
            <p className="text-text-muted text-sm py-12 text-center">
              {isEn ? `No upcoming events in ${city}.` : `${city}'da yaklaşan etkinlik bulunamadı.`}
            </p>
          )}
        </Suspense>
      </ErrorBoundary>
    </div>
  )
}
