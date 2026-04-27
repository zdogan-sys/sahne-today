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

  const { data: venues } = await supabase
    .from('venues')
    .select('*, slots!inner(id)')
    .order('created_at', { ascending: false })

  const { data: allVenues } = await supabase
    .from('venues')
    .select('*, slots(id, status)')
    .order('created_at', { ascending: false })

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      <h1 className="font-bebas text-5xl md:text-6xl text-text-primary mb-6">MEKANLAR</h1>
      <ErrorBoundary>
        <Suspense fallback={
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => <VenueCardSkeleton key={i} />)}
          </div>
        }>
          <VenuesClient initialVenues={(allVenues ?? []) as any[]} />
        </Suspense>
      </ErrorBoundary>
    </div>
  )
}
