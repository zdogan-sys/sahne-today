'use client'

import { useEffect, useRef } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

const PIN_HTML = `<div style="transform:translate(-50%,-100%)">
  <svg width="30" height="40" viewBox="0 0 32 42" xmlns="http://www.w3.org/2000/svg">
    <path d="M16 0C7.2 0 0 7.2 0 16c0 11 16 26 16 26s16-15 16-26C32 7.2 24.8 0 16 0z" fill="#e86042"/>
    <circle cx="16" cy="16" r="6" fill="#fff"/>
  </svg></div>`

export default function LocationPickerInner({ lat, lng, onChange }: {
  lat: number | null
  lng: number | null
  onChange: (lat: number, lng: number) => void
}) {
  const ref = useRef<HTMLDivElement>(null)
  const mapRef = useRef<L.Map | null>(null)
  const markerRef = useRef<L.Marker | null>(null)

  // Harita kurulumu (bir kez)
  useEffect(() => {
    if (!ref.current || mapRef.current) return
    const start: [number, number] = (lat != null && lng != null) ? [lat, lng] : [39.925, 32.866] // Ankara varsayılan
    const map = L.map(ref.current, { center: start, zoom: lat != null ? 15 : 11, scrollWheelZoom: false })
    mapRef.current = map

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap', maxZoom: 19,
    }).addTo(map)

    const icon = L.divIcon({ className: '', html: PIN_HTML, iconSize: [0, 0], iconAnchor: [0, 0] })

    if (lat != null && lng != null) {
      markerRef.current = L.marker([lat, lng], { icon, draggable: true }).addTo(map)
      markerRef.current.on('dragend', () => {
        const p = markerRef.current!.getLatLng()
        onChange(p.lat, p.lng)
      })
    }

    // Haritaya tıklayınca pin koy/taşı
    map.on('click', (e: L.LeafletMouseEvent) => {
      const { lat: la, lng: ln } = e.latlng
      if (markerRef.current) {
        markerRef.current.setLatLng([la, ln])
      } else {
        markerRef.current = L.marker([la, ln], { icon, draggable: true }).addTo(map)
        markerRef.current.on('dragend', () => {
          const p = markerRef.current!.getLatLng()
          onChange(p.lat, p.lng)
        })
      }
      onChange(la, ln)
    })

    return () => { map.remove(); mapRef.current = null; markerRef.current = null }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Dışarıdan lat/lng değişince (örn. "Adresten Bul") pin'i taşı
  useEffect(() => {
    const map = mapRef.current
    if (!map || lat == null || lng == null) return
    const icon = L.divIcon({ className: '', html: PIN_HTML, iconSize: [0, 0], iconAnchor: [0, 0] })
    if (markerRef.current) {
      markerRef.current.setLatLng([lat, lng])
    } else {
      markerRef.current = L.marker([lat, lng], { icon, draggable: true }).addTo(map)
      markerRef.current.on('dragend', () => {
        const p = markerRef.current!.getLatLng()
        onChange(p.lat, p.lng)
      })
    }
    map.setView([lat, lng], 16)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lat, lng])

  return <div ref={ref} className="w-full h-56 rounded-lg overflow-hidden border border-[rgba(228,224,216,0.1)] z-0" />
}
