export const dynamic = 'force-dynamic'

import { Suspense } from 'react'
import { createClient } from '@/lib/supabase/server'
import { HeroSection } from '@/components/home/HeroSection'
import { StatsBar } from '@/components/home/StatsBar'
import { EventFeed } from '@/components/home/EventFeed'
import { EventCardSkeleton } from '@/components/ui/Skeleton'
import { ErrorBoundary } from '@/components/ui/ErrorBoundary'

export default async function HomePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  return (
    <div className="min-h-screen">
      <HeroSection isLoggedIn={!!user} />
      <Suspense fallback={<StatsSkeleton />}>
        <StatsBarServer />
      </Suspense>
      <section className="max-w-7xl mx-auto px-4 py-6">
        <ErrorBoundary>
          <Suspense fallback={
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <EventCardSkeleton key={i} />
              ))}
            </div>
          }>
            <EventFeed />
          </Suspense>
        </ErrorBoundary>
      </section>
    </div>
  )
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
