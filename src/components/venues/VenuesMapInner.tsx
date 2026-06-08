'use client'

import { useEffect, useRef } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

export type MapVenue = { id: string; name: string; lat: number; lng: number; district?: string | null; city?: string | null }

const PIN_HTML = `<div style="transform:translate(-50%,-100%)">
  <svg width="28" height="37" viewBox="0 0 32 42" xmlns="http://www.w3.org/2000/svg">
    <path d="M16 0C7.2 0 0 7.2 0 16c0 11 16 26 16 26s16-15 16-26C32 7.2 24.8 0 16 0z" fill="#e86042"/>
    <circle cx="16" cy="16" r="6" fill="#fff"/>
  </svg></div>`

function esc(s: string) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

export default function VenuesMapInner({ venues }: { venues: MapVenue[] }) {
  const ref = useRef<HTMLDivElement>(null)
  const mapRef = useRef<L.Map | null>(null)

  useEffect(() => {
    if (!ref.current || mapRef.current) return

    const map = L.map(ref.current, { center: [39.0, 35.0], zoom: 6, scrollWheelZoom: true })
    mapRef.current = map

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap', maxZoom: 19,
    }).addTo(map)

    const icon = L.divIcon({ className: '', html: PIN_HTML, iconSize: [0, 0], iconAnchor: [0, 0] })
    const pts: [number, number][] = []

    for (const v of venues) {
      const m = L.marker([v.lat, v.lng], { icon }).addTo(map)
      const loc = [v.district, v.city].filter(Boolean).join(', ')
      m.bindPopup(
        `<div style="min-width:140px">
          <a href="/venues/${v.id}" style="font-weight:600;color:#111;text-decoration:none">${esc(v.name)}</a>
          ${loc ? `<div style="font-size:11px;color:#666;margin-top:2px">${esc(loc)}</div>` : ''}
          <a href="/venues/${v.id}" style="font-size:11px;color:#e86042;display:inline-block;margin-top:4px">Profili gör →</a>
        </div>`
      )
      pts.push([v.lat, v.lng])
    }

    if (pts.length === 1) map.setView(pts[0], 14)
    else if (pts.length > 1) map.fitBounds(L.latLngBounds(pts), { padding: [40, 40] })

    return () => { map.remove(); mapRef.current = null }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [venues])

  return <div ref={ref} className="w-full h-[70vh] rounded-xl overflow-hidden border border-[rgba(228,224,216,0.1)] z-0" />
}
