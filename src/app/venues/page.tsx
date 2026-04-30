export const dynamic = 'force-dynamic'

import { Suspense } from 'react'
import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { VenuesClient } from '@/components/venues/VenuesClient'
import { VenueCardSkeleton } from '@/components/ui/Skeleton'
import { ErrorBoundary } from '@/components/ui/ErrorBoundary'

export const metadata: Metadata = {
  title: 'Mekanlar',
  description: 'Türkiye\'deki canlı performans mekanlarını keşfet.',
}

export default async function VenuesPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  const artistRes = user ? await supabase.from('artists').select('id').eq('profile_id', user.id).maybeSingle() : null
  const venueRes = user ? await supabase.from('venues').select('id').eq('owner_id', user.id).limit(1).maybeSingle() : null
  
  const isArtist = !!artistRes?.data
  const isVenueOwner = !!venueRes?.data
  const canSeeSlots = isArtist || isVenueOwner

  const today = new Date().toISOString().split('T')[0]

  const [venuesRes, eventsRes] = await Promise.all([
    supabase.from('venues').select('*, slots(id, status)').order('created_at', { ascending: false }),
    supabase.from('events')
      .select('id, venue_id, title, event_date, start_time')
      .eq('status', 'confirmed')
      .gte('event_date', today)
      .order('event_date', { ascending: true })
      .order('start_time', { ascending: true }),
  ])

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      <h1 className="font-bebas text-5xl md:text-6xl text-text-primary mb-6">MEKANLAR</h1>
      <ErrorBoundary>
        <Suspense fallback={
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => <VenueCardSkeleton key={i} />)}
          </div>
        }>
          <VenuesClient
            initialVenues={(venuesRes.data ?? []) as any[]}
            upcomingEvents={(eventsRes.data ?? []) as any[]}
            canSeeSlots={canSeeSlots}
          />
        </Suspense>
      </ErrorBoundary>
    </div>
  )
}
