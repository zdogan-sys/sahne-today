export const dynamic = 'force-dynamic'

import { Suspense } from 'react'
import { createClient } from '@/lib/supabase/server'
import { HeroSection } from '@/components/home/HeroSection'
import { LandingFeatures } from '@/components/home/LandingFeatures'
import { StatsBar } from '@/components/home/StatsBar'
import { EventFeed, type EventWithRelations } from '@/components/home/EventFeed'
import { NearbyEvents } from '@/components/home/NearbyEvents'
import { OpenSlotsShowcase } from '@/components/home/OpenSlotsShowcase'
import { EventCardSkeleton } from '@/components/ui/Skeleton'
import { ErrorBoundary } from '@/components/ui/ErrorBoundary'
import { cityFromSlug } from '@/lib/cities'

const ADMIN_EMAIL = 'z_dogan@hotmail.com'

interface HomeProps {
  searchParams: Promise<{ city?: string }>
}

export default async function HomePage({ searchParams }: HomeProps) {
  const { city: citySlug } = await searchParams
  const selectedCity = citySlug ? cityFromSlug(citySlug) : null
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const today = new Date().toISOString().split('T')[0]
  const weekEnd = new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0]

  const [{ data: posterSetting }, todayRes, weekRes] = await Promise.all([
    supabase.from('site_settings').select('value').eq('key', 'hero_poster_url').single(),
    supabase.from('events').select('id', { count: 'exact', head: true })
      .eq('event_date', today).eq('status', 'confirmed'),
    supabase.from('events').select('id', { count: 'exact', head: true })
      .gte('event_date', today).lte('event_date', weekEnd).eq('status', 'confirmed'),
  ])

  const posterUrl = posterSetting?.value ?? null
  const isAdmin = user?.email === ADMIN_EMAIL

  return (
    <div className="min-h-screen">
      <HeroSection
        isLoggedIn={!!user}
        isAdmin={isAdmin}
        posterUrl={posterUrl}
        todayCount={todayRes.count ?? 0}
        weekCount={weekRes.count ?? 0}
      />
      {!user && <LandingFeatures />}
      <Suspense fallback={<StatsSkeleton />}>
        <StatsBarServer />
      </Suspense>
      <section className="max-w-7xl mx-auto px-4 pt-6">
        <NearbyEvents />
      </section>
      <section className="max-w-7xl mx-auto px-4 py-6">
        <ErrorBoundary>
          <Suspense fallback={
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <EventCardSkeleton key={i} />
              ))}
            </div>
          }>
            <EventFeedServer city={selectedCity} />
          </Suspense>
        </ErrorBoundary>
      </section>
      <ErrorBoundary>
        <Suspense fallback={null}>
          <OpenSlotsShowcase city={selectedCity} />
        </Suspense>
      </ErrorBoundary>
    </div>
  )
}

// İlk yükleme sunucuda render edilir (SEO + hız); filtre değişince client devralır
async function EventFeedServer({ city }: { city: string | null }) {
  const supabase = await createClient()
  const from = new Date().toISOString().split('T')[0]
  const to = new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0]

  let query = supabase
    .from('events')
    .select(`*, venues${city ? '!inner' : ''}(name, district, city, photo_url), artists(stage_name)`)
    .eq('status', 'confirmed')
    .gte('event_date', from)
    .lte('event_date', to)
    .order('event_date', { ascending: true })
    .order('start_time', { ascending: true })
    .limit(30)

  if (city) query = query.eq('venues.city', city)
  const { data } = await query

  return <EventFeed initialEvents={(data as EventWithRelations[]) ?? []} initialCity={city ?? undefined} />
}

async function StatsBarServer() {
  const supabase = await createClient()

  const today = new Date().toISOString().split('T')[0]
  const weekEnd = new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0]

  const [eventsRes, venuesRes, artistsRes, slotsRes] = await Promise.all([
    supabase.from('events').select('id', { count: 'exact', head: true })
      .gte('event_date', today).lte('event_date', weekEnd).eq('status', 'confirmed'),
    supabase.from('venues').select('id', { count: 'exact', head: true }),
    supabase.from('artists').select('id', { count: 'exact', head: true }),
    supabase.from('slots').select('id', { count: 'exact', head: true }).eq('status', 'open'),
  ])

  return (
    <StatsBar
      weekEvents={eventsRes.count ?? 0}
      activeVenues={venuesRes.count ?? 0}
      artists={artistsRes.count ?? 0}
      openSlots={slotsRes.count ?? 0}
    />
  )
}

function StatsSkeleton() {
  return (
    <div className="bg-surface border-y border-[rgba(228,224,216,0.08)] py-3 px-4">
      <div className="max-w-7xl mx-auto flex gap-6 overflow-x-auto scrollbar-none">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex-shrink-0 animate-pulse">
            <div className="h-6 w-8 bg-[rgba(228,224,216,0.08)] rounded mb-1" />
            <div className="h-3 w-20 bg-[rgba(228,224,216,0.06)] rounded" />
          </div>
        ))}
      </div>
    </div>
  )
}
