'use client'

import { useEffect, useRef } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

export default function VenueMapInner({ lat, lng, name }: { lat: number; lng: number; name: string }) {
  const ref = useRef<HTMLDivElement>(null)
  const mapRef = useRef<L.Map | null>(null)

  useEffect(() => {
    if (!ref.current || mapRef.current) return

    const map = L.map(ref.current, {
      center: [lat, lng],
      zoom: 15,
      scrollWheelZoom: false,
      attributionControl: true,
    })
    mapRef.current = map

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap',
      maxZoom: 19,
    }).addTo(map)

    // Accent renkli teardrop pin (görsel asset gerektirmez)
    const icon = L.divIcon({
      className: '',
      html: `<div style="transform:translate(-50%,-100%)">
        <svg width="32" height="42" viewBox="0 0 32 42" xmlns="http://www.w3.org/2000/svg">
          <path d="M16 0C7.2 0 0 7.2 0 16c0 11 16 26 16 26s16-15 16-26C32 7.2 24.8 0 16 0z" fill="#e86042"/>
          <circle cx="16" cy="16" r="6" fill="#fff"/>
        </svg></div>`,
      iconSize: [0, 0],
      iconAnchor: [0, 0],
    })
    L.marker([lat, lng], { icon }).addTo(map).bindPopup(name)

    return () => { map.remove(); mapRef.current = null }
  }, [lat, lng, name])

  return <div ref={ref} className="w-full h-64 rounded-xl overflow-hidden border border-[rgba(228,224,216,0.1)] z-0" />
}
