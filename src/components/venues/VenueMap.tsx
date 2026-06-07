'use client'

import dynamic from 'next/dynamic'

// Leaflet sadece tarayıcıda çalışır → SSR kapalı
const VenueMapInner = dynamic(() => import('./VenueMapInner'), {
  ssr: false,
  loading: () => <div className="w-full h-64 rounded-xl bg-[rgba(228,224,216,0.04)] animate-pulse" />,
})

export function VenueMap({ lat, lng, name }: { lat: number; lng: number; name: string }) {
  return <VenueMapInner lat={lat} lng={lng} name={name} />
}
