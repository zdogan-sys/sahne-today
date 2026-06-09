'use client'

import dynamic from 'next/dynamic'
import type { MapVenue } from './VenuesMapInner'

const Inner = dynamic(() => import('./VenuesMapInner'), {
  ssr: false,
  loading: () => <div className="w-full h-[70vh] rounded-xl bg-[rgba(228,224,216,0.04)] animate-pulse" />,
})

export function VenuesMap({ venues, userLoc, radiusKm }: { venues: MapVenue[]; userLoc?: { lat: number; lng: number } | null; radiusKm?: number }) {
  return <Inner venues={venues} userLoc={userLoc} radiusKm={radiusKm} />
}

export type { MapVenue }
