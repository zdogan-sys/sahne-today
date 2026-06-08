'use client'

import dynamic from 'next/dynamic'
import type { MapVenue } from './VenuesMapInner'

const Inner = dynamic(() => import('./VenuesMapInner'), {
  ssr: false,
  loading: () => <div className="w-full h-[70vh] rounded-xl bg-[rgba(228,224,216,0.04)] animate-pulse" />,
})

export function VenuesMap({ venues }: { venues: MapVenue[] }) {
  return <Inner venues={venues} />
}

export type { MapVenue }
