'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useLocale } from 'next-intl'
import { createClient } from '@/lib/supabase/client'
import { Navigation, Loader2, MapPin, Clock } from 'lucide-react'
import { GenreChip } from '@/components/ui/GenreChip'
import { formatTime } from '@/lib/utils'

type Row = {
  id: string
  title: string
  event_date: string
  start_time: string
  genre: string | null
  venues: { name: string; district: string | null; city: string | null; latitude: number | null; longitude: number | null } | null
}

function distanceKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const R = 6371
  const dLat = (b.lat - a.lat) * Math.PI / 180
  const dLng = (b.lng - a.lng) * Math.PI / 180
  const lat1 = a.lat * Math.PI / 180
  const lat2 = b.lat * Math.PI / 180
  const x = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(x))
}
function fmtDistance(km: number) { return km < 1 ? `${Math.round(km * 1000)} m` : `${km.toFixed(1)} km` }

export function NearbyEvents() {
  const locale = useLocale()
  const isEn = locale === 'en'
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)
  const [items, setItems] = useState<{ row: Row; dist: number }[]>([])
  const [error, setError] = useState('')

  async function findNearby() {
    if (!('geolocation' in navigator)) { setError(isEn ? 'Location not supported' : 'Konum desteklenmiyor'); return }
    setLoading(true); setError('')
    navigator.geolocation.getCurrentPosition(async (pos) => {
      const user = { lat: pos.coords.latitude, lng: pos.coords.longitude }
      const supabase = createClient()
      const today = new Date().toISOString().split('T')[0]
      const { data } = await supabase
        .from('events')
        .select('id, title, event_date, start_time, genre, venues(name, district, city, latitude, longitude)')
        .eq('status', 'confirmed')
        .gte('event_date', today)
        .order('event_date', { ascending: true })
        .limit(200)

      const rows = (data ?? []) as any as Row[]
      const withDist = rows
        .filter(r => r.venues?.latitude != null && r.venues?.longitude != null)
        .map(r => ({ row: r, dist: distanceKm(user, { lat: r.venues!.latitude!, lng: r.venues!.longitude! }) }))
        .sort((a, b) => a.dist - b.dist)
        .slice(0, 6)

      setItems(withDist)
      setDone(true)
      setLoading(false)
    }, () => {
      setError(isEn ? 'Could not get location' : 'Konum alınamadı')
      setLoading(false)
    }, { enableHighAccuracy: true, timeout: 10000 })
  }

  return (
    <div className="card p-5">
      <div className="flex items-center justify-between gap-3 mb-1">
        <div className="flex items-center gap-2">
          <Navigation size={18} className="text-accent" />
          <h2 className="font-bebas text-2xl text-text-primary">{isEn ? 'EVENTS NEAR YOU' : 'YAKININDAKİ ETKİNLİKLER'}</h2>
        </div>
        {!done && (
          <button onClick={findNearby} disabled={loading}
            className="btn-accent py-2 px-4 text-sm flex items-center gap-1.5 disabled:opacity-50 flex-shrink-0">
            {loading ? <Loader2 size={14} className="animate-spin" /> : <Navigation size={14} />}
            {isEn ? 'Use my location' : 'Konumumu kullan'}
          </button>
        )}
      </div>

      {error && <p className="text-red-400 text-xs mt-2">{error}</p>}

      {!done && !error && (
        <p className="text-text-muted text-sm">{isEn ? 'See the closest upcoming events to where you are.' : 'Bulunduğun yere en yakın yaklaşan etkinlikleri gör.'}</p>
      )}

      {done && items.length === 0 && (
        <p className="text-text-muted text-sm mt-2">{isEn ? 'No upcoming events with a location nearby.' : 'Yakında konumu belirli yaklaşan etkinlik bulunamadı.'}</p>
      )}

      {items.length > 0 && (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 mt-3">
          {items.map(({ row, dist }) => {
            const d = new Date(row.event_date)
            return (
              <Link key={row.id} href={`/events/${row.id}`}
                className="rounded-xl border border-[rgba(228,224,216,0.1)] p-3 hover:border-accent/30 transition-colors flex gap-3">
                <div className="flex-shrink-0 w-12 h-12 bg-[rgba(212,83,126,0.08)] rounded-lg flex flex-col items-center justify-center border border-accent/20">
                  <span className="font-bebas text-lg text-accent leading-none">{d.getDate()}</span>
                  <span className="text-[9px] text-accent/70 uppercase">{d.toLocaleDateString(isEn ? 'en-US' : 'tr-TR', { month: 'short' })}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-1.5">
                    <h3 className="font-medium text-text-primary text-sm truncate">{row.title}</h3>
                    {row.genre && <GenreChip genre={row.genre} />}
                  </div>
                  {row.venues?.name && (
                    <p className="text-xs text-text-muted truncate mt-0.5 flex items-center gap-1">
                      <MapPin size={9} /> {row.venues.name}
                    </p>
                  )}
                  <div className="flex items-center gap-2 mt-0.5 text-xs text-text-muted">
                    <span className="flex items-center gap-1"><Clock size={9} />{formatTime(row.start_time)}</span>
                    <span className="flex items-center gap-0.5 text-accent ml-auto"><Navigation size={9} />{fmtDistance(dist)}</span>
                  </div>
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
