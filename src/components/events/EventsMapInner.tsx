'use client'

import { useEffect, useRef } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

export type MapEvent = {
  id: string
  title: string
  dateLabel: string
  venueName: string
  lat: number
  lng: number
}

const PIN_HTML = `<div style="transform:translate(-50%,-100%)">
  <svg width="28" height="37" viewBox="0 0 32 42" xmlns="http://www.w3.org/2000/svg">
    <path d="M16 0C7.2 0 0 7.2 0 16c0 11 16 26 16 26s16-15 16-26C32 7.2 24.8 0 16 0z" fill="#e86042"/>
    <circle cx="16" cy="16" r="6" fill="#fff"/>
  </svg></div>`

function esc(s: string) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

export default function EventsMapInner({ events, userLoc, radiusKm = 1 }: { events: MapEvent[]; userLoc?: { lat: number; lng: number } | null; radiusKm?: number }) {
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

    // Aynı mekandaki (aynı koordinat) etkinlikleri tek pin'de grupla
    const groups = new Map<string, MapEvent[]>()
    for (const e of events) {
      const key = `${e.lat.toFixed(5)},${e.lng.toFixed(5)}`
      groups.set(key, [...(groups.get(key) ?? []), e])
    }

    for (const list of Array.from(groups.values())) {
      const first = list[0]
      const m = L.marker([first.lat, first.lng], { icon }).addTo(map)
      const rows = list.map((e: MapEvent) =>
        `<a href="/events/${e.id}" style="display:block;color:#111;text-decoration:none;padding:3px 0;border-top:1px solid #eee">
          <span style="font-weight:600">${esc(e.title)}</span>
          <span style="font-size:11px;color:#666;display:block">${esc(e.dateLabel)}</span>
        </a>`
      ).join('')
      m.bindPopup(
        `<div style="min-width:170px">
          <div style="font-size:11px;color:#666;margin-bottom:2px">${esc(first.venueName)}</div>
          ${rows}
        </div>`
      )
      pts.push([first.lat, first.lng])
    }

    if (userLoc) {
      L.circleMarker([userLoc.lat, userLoc.lng], { radius: 7, color: '#2563eb', fillColor: '#2563eb', fillOpacity: 0.9, weight: 2 })
        .addTo(map).bindPopup('Buradasın')
      const circle = L.circle([userLoc.lat, userLoc.lng], { radius: radiusKm * 1000, color: '#2563eb', fillColor: '#2563eb', fillOpacity: 0.07, weight: 1 }).addTo(map)
      map.fitBounds(circle.getBounds(), { padding: [20, 20] })
    } else if (pts.length === 1) {
      map.setView(pts[0], 14)
    } else if (pts.length > 1) {
      map.fitBounds(L.latLngBounds(pts), { padding: [40, 40] })
    }

    return () => { map.remove(); mapRef.current = null }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [events, userLoc, radiusKm])

  return <div ref={ref} className="w-full h-[70vh] rounded-xl overflow-hidden border border-[rgba(228,224,216,0.1)] z-0" />
}
