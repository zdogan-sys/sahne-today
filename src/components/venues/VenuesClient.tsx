'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useTranslations, useLocale } from 'next-intl'
import { MapPin, Filter, Music, CalendarDays, Navigation, Loader2 } from 'lucide-react'
import { GenreChip } from '@/components/ui/GenreChip'
import { VENUE_TYPE_LABELS, cn, formatTime } from '@/lib/utils'
import type { Venue, Slot } from '@/lib/supabase/types'
import { BottomSheet } from '@/components/ui/BottomSheet'
import { VenuesMap, type MapVenue } from '@/components/venues/VenuesMap'
import { useSelectedCity } from '@/lib/use-selected-city'

type VenueFull = Venue & { slots: Pick<Slot, 'id' | 'status'>[]; logo_url?: string | null }

type UpcomingEvent = {
  id: string
  venue_id: string
  title: string
  event_date: string
  start_time: string
}


// "Yakınımda" modunda gösterilecek yarıçap (km)
const RADIUS_KM = 1

// İki koordinat arası mesafe (km) — Haversine
function distanceKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const R = 6371
  const dLat = (b.lat - a.lat) * Math.PI / 180
  const dLng = (b.lng - a.lng) * Math.PI / 180
  const lat1 = a.lat * Math.PI / 180
  const lat2 = b.lat * Math.PI / 180
  const x = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(x))
}

function fmtDistance(km: number): string {
  return km < 1 ? `${Math.round(km * 1000)} m` : `${km.toFixed(1)} km`
}

export function VenuesClient({ initialVenues, upcomingEvents = [], canSeeSlots }: { initialVenues: VenueFull[]; upcomingEvents?: UpcomingEvent[]; canSeeSlots: boolean }) {
  const t = useTranslations('filters')
  const locale = useLocale()
  const VENUE_TYPES = [
    { key: 'pub', label: t('venueTypes.pub') },
    { key: 'turku_bar', label: t('venueTypes.turku_bar') },
    { key: 'live_music', label: t('venueTypes.live_music') },
    { key: 'bookstore', label: t('venueTypes.bookstore') },
    { key: 'theater', label: t('venueTypes.theater') },
    { key: 'cafe', label: t('venueTypes.cafe') },
    { key: 'studio', label: t('venueTypes.studio') },
    { key: 'dance_studio', label: t('venueTypes.dance_studio') },
    { key: 'music_school', label: t('venueTypes.music_school') },
    { key: 'other', label: t('venueTypes.other') },
  ]
  const city = useSelectedCity() // üstteki global şehir seçicisinden
  const [venueType, setVenueType] = useState('')
  const [onlyOpenSlots, setOnlyOpenSlots] = useState(false)
  const [filterOpen, setFilterOpen] = useState(false)
  const [userLoc, setUserLoc] = useState<{ lat: number; lng: number } | null>(null)
  const [nearMode, setNearMode] = useState(false)
  const [locating, setLocating] = useState(false)
  const [view, setView] = useState<'list' | 'map'>('list')

  function toggleNearMe() {
    if (nearMode) { setNearMode(false); return }
    if (userLoc) { setNearMode(true); return }
    if (!('geolocation' in navigator)) { alert(locale === 'en' ? 'Location not supported' : 'Konum desteklenmiyor'); return }
    setLocating(true)
    navigator.geolocation.getCurrentPosition(
      (pos) => { setUserLoc({ lat: pos.coords.latitude, lng: pos.coords.longitude }); setNearMode(true); setLocating(false) },
      () => { setLocating(false); alert(locale === 'en' ? 'Could not get location' : 'Konum alınamadı') },
      { enableHighAccuracy: true, timeout: 10000 }
    )
  }

  const filtered = initialVenues.filter((v) => {
    if (city && v.city !== city) return false
    if (venueType && v.venue_type !== venueType) return false
    if (onlyOpenSlots) {
      const hasOpen = v.slots?.some((s) => s.status === 'open')
      if (!hasOpen) return false
    }
    return true
  })

  // Yakınımda modu: mesafe hesapla + en yakından uzağa sırala (sınır yok, hepsi listelenir)
  const withDist = filtered.map((v) => ({
    v,
    dist: (nearMode && userLoc && (v as any).latitude != null && (v as any).longitude != null)
      ? distanceKm(userLoc, { lat: (v as any).latitude, lng: (v as any).longitude })
      : null,
  }))
  if (nearMode && userLoc) {
    withDist.sort((a, b) => {
      if (a.dist == null) return 1
      if (b.dist == null) return -1
      return a.dist - b.dist
    })
  }

  // Haritada tüm konumlu mekanlar (zoom out/kaydırınca 1 km dışı da görünür)
  const mapVenues: MapVenue[] = filtered
    .filter((v) => (v as any).latitude != null && (v as any).longitude != null)
    .map((v) => ({ id: v.id, name: v.name, lat: (v as any).latitude, lng: (v as any).longitude, district: v.district, city: v.city }))

  const activeFilters = [venueType, onlyOpenSlots].filter(Boolean).length

  return (
    <div className="md:flex md:gap-6">
      {/* Desktop sidebar */}
      <aside className="hidden md:block w-56 flex-shrink-0">
        <div className="card p-4 sticky top-20 space-y-5">
          <h3 className="text-sm font-semibold text-text-primary">{t('title')}</h3>
          <FilterContent
            venueType={venueType} setVenueType={setVenueType}
            onlyOpenSlots={onlyOpenSlots} setOnlyOpenSlots={setOnlyOpenSlots}
            canSeeSlots={canSeeSlots}
            venueTypes={VENUE_TYPES}
            locale={locale}
            t={t}
          />
        </div>
      </aside>

      <div className="flex-1">
        <div className="flex items-center justify-between mb-4 gap-2">
          <button onClick={toggleNearMe} disabled={locating}
            className={cn('flex items-center gap-1.5 py-1.5 px-3 rounded-lg border text-sm transition-colors disabled:opacity-60',
              nearMode ? 'bg-accent/10 text-accent border-accent/30' : 'text-text-muted border-[rgba(228,224,216,0.15)] hover:text-text-primary')}>
            {locating ? <Loader2 size={14} className="animate-spin" /> : <Navigation size={14} />}
            {nearMode ? (locale === 'en' ? 'Nearby' : 'Yakınımda') : (locale === 'en' ? 'Near me' : 'Yakınımdakiler')}
          </button>
          <div className="flex items-center gap-2">
            {/* Liste / Harita */}
            <div className="flex gap-0.5 bg-surface rounded-lg p-0.5 border border-[rgba(228,224,216,0.08)]">
              <button onClick={() => setView('list')}
                className={cn('px-3 py-1.5 rounded-md text-sm font-medium transition-colors', view === 'list' ? 'bg-accent text-white' : 'text-text-muted hover:text-text-primary')}>
                {locale === 'en' ? 'List' : 'Liste'}
              </button>
              <button onClick={() => setView('map')}
                className={cn('px-3 py-1.5 rounded-md text-sm font-medium transition-colors', view === 'map' ? 'bg-accent text-white' : 'text-text-muted hover:text-text-primary')}>
                {locale === 'en' ? 'Map' : 'Harita'}
              </button>
            </div>
            <button onClick={() => setFilterOpen(true)} className="md:hidden flex items-center gap-2 btn-outline py-1.5 text-sm">
              <Filter size={14} />
              Filtre
              {activeFilters > 0 && (
                <span className="bg-accent text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">{activeFilters}</span>
              )}
            </button>
          </div>
        </div>

        {view === 'map' ? (
          mapVenues.length === 0 ? (
            <div className="text-center py-16 text-text-muted text-sm">
              {locale === 'en' ? 'No venues with a location yet.' : 'Henüz konumu olan mekan yok.'}
            </div>
          ) : (
            <>
              <p className="text-xs text-text-muted mb-3">
                {mapVenues.length} {locale === 'en' ? 'venues on map' : 'mekan haritada'}
                {nearMode && userLoc && (locale === 'en' ? ` · ${RADIUS_KM} km framed` : ` · ${RADIUS_KM} km çerçevede`)}
              </p>
              <VenuesMap venues={mapVenues} userLoc={nearMode ? userLoc : null} radiusKm={RADIUS_KM} />
            </>
          )
        ) : (
          <>
            {nearMode && userLoc && (
              <p className="text-xs text-text-muted mb-3">{locale === 'en' ? 'Sorted by distance from your location' : 'Konumuna en yakından uzağa sıralandı'}</p>
            )}

            {withDist.length === 0 ? (
              <div className="text-center py-16 text-text-muted text-sm">{locale === 'en' ? 'No venues found.' : 'Mekan bulunamadı.'}</div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {withDist.map(({ v, dist }) => (
                  <VenueCard
                    key={v.id}
                    venue={v}
                    canSeeSlots={canSeeSlots}
                    nearestEvent={upcomingEvents.find(e => e.venue_id === v.id) ?? null}
                    distance={dist}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </div>

      <BottomSheet open={filterOpen} onClose={() => setFilterOpen(false)} title={locale === 'en' ? 'Filter Venues' : 'Mekanları Filtrele'}>
        <FilterContent
          venueType={venueType} setVenueType={setVenueType}
          onlyOpenSlots={onlyOpenSlots} setOnlyOpenSlots={setOnlyOpenSlots}
          canSeeSlots={canSeeSlots}
          venueTypes={VENUE_TYPES}
          locale={locale}
          t={t}
        />
        <button onClick={() => setFilterOpen(false)} className="btn-accent w-full mt-4">
          Filtrele ({filtered.length})
        </button>
      </BottomSheet>
    </div>
  )
}

function FilterContent({ venueType, setVenueType, onlyOpenSlots, setOnlyOpenSlots, canSeeSlots, venueTypes, locale, t }: {
  venueType: string; setVenueType: (v: string) => void
  onlyOpenSlots: boolean; setOnlyOpenSlots: (v: boolean) => void
  canSeeSlots: boolean
  venueTypes: Array<{ key: string; label: string }>
  locale: string
  t: (key: string) => string
}) {
  return (
    <div className="space-y-5">
      <div>
        <label className="label">{locale === 'en' ? 'Venue Type' : 'Mekan Türü'}</label>
        <div className="flex flex-col gap-2">
          {venueTypes.map(({ key, label }) => (
            <label key={key} className="flex items-center gap-2 cursor-pointer group">
              <div className={cn('w-4 h-4 rounded-full border flex items-center justify-center transition-colors', venueType === key ? 'border-accent' : 'border-[rgba(228,224,216,0.2)] group-hover:border-[rgba(228,224,216,0.4)]')}>
                {venueType === key && <div className="w-2 h-2 rounded-full bg-accent" />}
              </div>
              <span className="text-sm text-text-muted group-hover:text-text-primary transition-colors">{label}</span>
              <input type="radio" className="hidden" checked={venueType === key} onChange={() => setVenueType(venueType === key ? '' : key)} />
            </label>
          ))}
        </div>
      </div>

      {canSeeSlots && (
        <div>
          <button onClick={() => setOnlyOpenSlots(!onlyOpenSlots)}
            className={cn('flex items-center gap-2 text-sm transition-colors', onlyOpenSlots ? 'text-accent' : 'text-text-muted')}>
            <div className={cn('w-4 h-4 rounded border transition-colors flex items-center justify-center', onlyOpenSlots ? 'bg-accent border-accent' : 'border-[rgba(228,224,216,0.2)]')}>
              {onlyOpenSlots && <span className="text-white text-[10px]">✓</span>}
            </div>
            Açık Slot Olanlar
          </button>
        </div>
      )}
    </div>
  )
}

function VenueCard({ venue, canSeeSlots, nearestEvent, distance }: { venue: VenueFull; canSeeSlots: boolean; nearestEvent: UpcomingEvent | null; distance?: number | null }) {
  const openSlots = venue.slots?.filter((s) => s.status === 'open').length ?? 0

  const today = new Date().toISOString().split('T')[0]
  const eventLabel = nearestEvent
    ? nearestEvent.event_date === today
      ? `Bugün ${formatTime(nearestEvent.start_time)}`
      : new Date(nearestEvent.event_date).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' }) + ' · ' + formatTime(nearestEvent.start_time)
    : null

  return (
    <Link href={`/venues/${venue.id}`} className="card overflow-hidden hover:border-accent/30 transition-colors block">
      <div className="relative h-36 bg-[rgba(228,224,216,0.04)]">
        {venue.photo_url ? (
          <Image
            src={venue.photo_url}
            alt={venue.name}
            fill
            className="object-cover"
          />
        ) : venue.logo_url ? (
          <div className="absolute inset-0 flex items-center justify-center p-4">
            <div className="relative w-full h-full">
              <Image
                src={venue.logo_url}
                alt={venue.name}
                fill
                className="object-contain"
              />
            </div>
          </div>
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <Music size={32} className="text-[rgba(228,224,216,0.12)]" />
          </div>
        )}
        {/* Fotoğraf + logo birlikte varsa: logoyu köşede rozet olarak göster */}
        {venue.photo_url && venue.logo_url && (
          <div className="absolute bottom-2 left-2 w-11 h-11 rounded-lg bg-white/95 shadow-md overflow-hidden flex items-center justify-center p-1">
            <Image
              src={venue.logo_url}
              alt={venue.name}
              width={44}
              height={44}
              className="object-contain w-full h-full"
            />
          </div>
        )}
        {canSeeSlots && openSlots > 0 && (
          <div
            className="absolute top-2 right-2 text-xs font-bold px-2 py-0.5 rounded-full"
            style={{ backgroundColor: 'rgba(29,158,117,0.85)', color: '#fff' }}
          >
            {openSlots} açık slot
          </div>
        )}
        {distance != null && (
          <div className="absolute top-2 left-2 flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full bg-black/55 text-white backdrop-blur-sm">
            <Navigation size={9} /> {fmtDistance(distance)}
          </div>
        )}
      </div>

      <div className="p-3">
        <h3 className="font-semibold text-text-primary text-sm truncate">{venue.name}</h3>
        <div className="flex items-center gap-1 mt-0.5 text-text-muted text-xs">
          <MapPin size={10} />
          <span className="truncate">{venue.district}, {venue.city}</span>
        </div>
        <div className="mt-2 flex flex-wrap gap-1">
          <span className="chip bg-[rgba(228,224,216,0.06)] text-text-muted border border-[rgba(228,224,216,0.1)]">
            {VENUE_TYPE_LABELS[venue.venue_type] ?? venue.venue_type}
          </span>
          {venue.genres?.slice(0, 2).map((g) => (
            <GenreChip key={g} genre={g} />
          ))}
        </div>

        {eventLabel && (
          <div className="mt-2 pt-2 border-t border-[rgba(228,224,216,0.06)] flex items-center gap-1.5 text-xs text-accent">
            <CalendarDays size={11} className="flex-shrink-0" />
            <span className="truncate font-medium">{nearestEvent!.title}</span>
            <span className="text-text-muted flex-shrink-0">{eventLabel}</span>
          </div>
        )}
      </div>
    </Link>
  )
}
