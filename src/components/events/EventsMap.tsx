'use client'

import dynamic from 'next/dynamic'
import type { MapEvent } from './EventsMapInner'

const Inner = dynamic(() => import('./EventsMapInner'), {
  ssr: false,
  loading: () => <div className="w-full h-[70vh] rounded-xl bg-[rgba(228,224,216,0.04)] animate-pulse" />,
})

export function EventsMap({ events, userLoc, radiusKm }: { events: MapEvent[]; userLoc?: { lat: number; lng: number } | null; radiusKm?: number }) {
  return <Inner events={events} userLoc={userLoc} radiusKm={radiusKm} />
}

export type { MapEvent }
