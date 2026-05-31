export const dynamic = 'force-dynamic'

import { Suspense } from 'react'
import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { EventsClient } from '@/components/events/EventsClient'
import { EventCardSkeleton } from '@/components/ui/Skeleton'
import { ErrorBoundary } from '@/components/ui/ErrorBoundary'

export const metadata: Metadata = {
  title: 'Etkinlikler',
  description: 'Türkiye\'deki canlı müzik, stand-up ve performans etkinliklerini keşfet.',
}

export default async function EventsPage() {
  const supabase = await createClient()
  const today = new Date().toISOString().split('T')[0]

  const { data: events } = await supabase
    .from('events')
    .select('*, venues(name, district, city, photo_url), artists(stage_name, profiles(avatar_url)), bands(name, photo_url)')
    .eq('status', 'confirmed')
    .gte('event_date', today)
    .order('event_date', { ascending: true })
    .order('start_time', { ascending: true })
    .limit(60)

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      <h1 className="font-bebas text-5xl md:text-6xl text-text-primary mb-6">ETKİNLİKLER</h1>
      <ErrorBoundary>
        <Suspense fallback={
          <div className="space-y-3">
            {Array.from({ length: 6 }).map((_, i) => <EventCardSkeleton key={i} />)}
          </div>
        }>
          <EventsClient initialEvents={(events ?? []) as any[]} />
        </Suspense>
      </ErrorBoundary>
    </div>
  )
}
