'use client'

import { useState, useEffect, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { useTranslations, useLocale } from 'next-intl'
import { MapPin, Clock, Filter, Music2, Building2, X, CalendarDays, Navigation, Loader2 } from 'lucide-react'
import { GenreChip } from '@/components/ui/GenreChip'
import { EventCalendar, type CalendarEventItem } from '@/components/ui/EventCalendar'
import { formatTime } from '@/lib/utils'
import type { Event, Venue, Artist } from '@/lib/supabase/types'
import { BottomSheet } from '@/components/ui/BottomSheet'
import { MUSIC_GENRES, STAGE_GENRES, CITY_OPTIONS } from '@/lib/constants'
import { EventsMap, type MapEvent } from '@/components/events/EventsMap'

type EventFull = Event & {
  poster_url?: string | null
  venues: Pick<Venue, 'name' | 'district' | 'city'> & { photo_url?: string | null; latitude?: number | null; longitude?: number | null } | null
  artists: Pick<Artist, 'stage_name'> & { profiles: { avatar_url: string | null } | null } | null
  bands: { name: string; photo_url?: string | null } | null
  artist_name?: string | null
}

const CITIES = CITY_OPTIONS

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

function toISO(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

function groupByDate(events: EventFull[]) {
  return events.reduce<Record<string, EventFull[]>>((acc, event) => {
    const key = event.event_date
    if (!acc[key]) acc[key] = []
    acc[key].push(event)
    return acc
  }, {})
}

export function EventsClient({ initialEvents }: { initialEvents: EventFull[] }) {
  const t = useTranslations('filters')
  const locale = useLocale()
  const router = useRouter()

  // Get locale-specific genre and stage options
  const musicGenres = locale === 'en'
    ? ['Acoustic', 'Metal', 'Rock', 'Blues', 'Jazz', 'Pop', 'Electronic', 'R&B', 'Rap', 'Classical', 'Ethnic', 'Fasıl', 'Folk', 'Arabesk']
    : ['Akustik', 'Metal', 'Rock', 'Blues', 'Caz', 'Pop', 'Elektronik', 'R&B', 'Rap', 'Klasik', 'Etnik', 'Fasıl', 'Türkü', 'Arabesk']

  const stageGenres = locale === 'en'
    ? ['Stand-Up', 'Improvisation', 'Alternative Stage']
    : ['Stand-Up', 'Doğaçlama', 'Alternatif Sahne']

  const [genre, setGenre] = useState('')
  const [city, setCity] = useState('')
  const [entryType, setEntryType] = useState('')
  const [dateRange, setDateRange] = useState<'all' | 'today' | 'week' | 'month'>('all')
  const [filterOpen, setFilterOpen] = useState(false)
  const [view, setView] = useState<'list' | 'calendar' | 'map'>('list')
  const [popupDate, setPopupDate] = useState<Date | null>(null)
  const [popupEvents, setPopupEvents] = useState<EventFull[]>([])
  const [mounted, setMounted] = useState(false)
  const [userLoc, setUserLoc] = useState<{ lat: number; lng: number } | null>(null)
  const [nearMode, setNearMode] = useState(false)
  const [locating, setLocating] = useState(false)

  useEffect(() => { setMounted(true) }, [])

  function toggleNearMe() {
    if (nearMode) { setNearMode(false); return }
    setView('list') // mesafe sıralaması liste görünümünde
    if (userLoc) { setNearMode(true); return }
    if (!('geolocation' in navigator)) { alert(locale === 'en' ? 'Location not supported' : 'Konum desteklenmiyor'); return }
    setLocating(true)
    navigator.geolocation.getCurrentPosition(
      (pos) => { setUserLoc({ lat: pos.coords.latitude, lng: pos.coords.longitude }); setNearMode(true); setLocating(false) },
      () => { setLocating(false); alert(locale === 'en' ? 'Could not get location' : 'Konum alınamadı') },
      { enableHighAccuracy: true, timeout: 10000 }
    )
  }

  function eventDist(e: EventFull): number | null {
    if (!userLoc) return null
    const lat = (e.venues as any)?.latitude
    const lng = (e.venues as any)?.longitude
    if (lat == null || lng == null) return null
    return distanceKm(userLoc, { lat, lng })
  }

  const filtered = initialEvents.filter((e) => {
    if (genre && e.genre !== genre) return false
    if (city && e.venues?.city !== city) return false
    if (entryType && e.entry_type !== entryType) return false
    if (dateRange !== 'all') {
      const todayStr = new Date().toISOString().split('T')[0]
      const weekStr = new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0]
      const monthStr = new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0]
      if (dateRange === 'today' && e.event_date !== todayStr) return false
      if (dateRange === 'week' && e.event_date > weekStr) return false
      if (dateRange === 'month' && e.event_date > monthStr) return false
    }
    return true
  })

  const grouped = groupByDate(filtered)
  const activeFilters = [genre, city, entryType, dateRange !== 'all' ? dateRange : ''].filter(Boolean).length

  // Harita görünümü: mekan koordinatı olan etkinlikler (yakınımda modunda 1 km içiyle sınırlı)
  const mapEvents: MapEvent[] = filtered
    .filter((e) => (e.venues as any)?.latitude != null && (e.venues as any)?.longitude != null)
    .filter((e) => {
      if (!(nearMode && userLoc)) return true
      const d = eventDist(e)
      return d != null && d <= RADIUS_KM
    })
    .map((e) => ({
      id: e.id,
      title: e.title,
      dateLabel: new Date(e.event_date).toLocaleDateString(locale === 'tr' ? 'tr-TR' : 'en-US', { day: 'numeric', month: 'short' }) + ' · ' + formatTime(e.start_time),
      venueName: e.venues?.name ?? '',
      lat: (e.venues as any).latitude,
      lng: (e.venues as any).longitude,
    }))

  // Yakınımda modu: etkinlikleri 1 km içiyle sınırla + mekan mesafesine göre sırala
  const nearList = nearMode && userLoc
    ? filtered.map((e) => ({ e, dist: eventDist(e) }))
        .filter((x) => x.dist != null && x.dist <= RADIUS_KM)
        .sort((a, b) => (a.dist! - b.dist!))
    : null

  const calendarEvents: CalendarEventItem[] = filtered.map(e => ({
    id: e.id,
    event_date: e.event_date,
    title: e.title,
    start_time: e.start_time,
    end_time: e.end_time ?? null,
    subtitle: e.venues?.name ?? null,
    status: 'confirmed',
  }))

  function handleDayClick(date: Date) {
    const dateStr = toISO(date)
    const dayEvents = filtered.filter(e => e.event_date === dateStr)
    if (dayEvents.length === 0) return
    if (dayEvents.length === 1) { router.push(`/events/${dayEvents[0].id}`); return }
    setPopupDate(date)
    setPopupEvents(dayEvents)
  }

  const popup = popupDate && mounted ? createPortal(
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
      onClick={(e) => { if (e.target === e.currentTarget) setPopupDate(null) }}
    >
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setPopupDate(null)} />
      <div className="relative w-full max-w-md bg-surface-alt border border-[rgba(228,224,216,0.1)] rounded-2xl overflow-hidden z-10">
        <div className="flex items-center justify-between px-5 py-4 border-b border-[rgba(228,224,216,0.08)]">
          <p className="font-bebas text-xl text-text-primary tracking-wide">
            {popupDate.toLocaleDateString(locale === 'tr' ? 'tr-TR' : 'en-US', { weekday: 'long', day: 'numeric', month: 'long' }).toUpperCase()}
          </p>
          <button onClick={() => setPopupDate(null)} className="w-7 h-7 flex items-center justify-center rounded-lg text-text-muted hover:text-text-primary transition-colors">
            <X size={16} />
          </button>
        </div>
        <div className="px-4 py-3 space-y-2 max-h-[60vh] overflow-y-auto">
          {popupEvents.map(event => (
            <Link
              key={event.id}
              href={`/events/${event.id}`}
              onClick={() => setPopupDate(null)}
              className="flex gap-3 p-3 rounded-xl hover:bg-[rgba(228,224,216,0.05)] transition-colors"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <p className="font-medium text-text-primary text-sm truncate">{event.title}</p>
                  {event.genre && <GenreChip genre={event.genre} />}
                </div>
                {event.venues?.name && (
                  <p className="text-xs text-text-muted mt-0.5 flex items-center gap-1">
                    <MapPin size={10} />
                    {event.venues.name}{event.venues.district ? ` · ${event.venues.district}` : ''}
                  </p>
                )}
                <p className="text-xs text-text-muted mt-0.5 flex items-center gap-1">
                  <Clock size={10} />
                  {formatTime(event.start_time)}
                  {event.entry_type === 'free' && <span className="text-success ml-2">Ücretsiz</span>}
                  {event.entry_fee ? <span className="ml-2">{event.entry_fee}₺</span> : null}
                </p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>,
    document.body
  ) : null

  return (
    <div className="md:flex md:gap-6">
      {/* Desktop filter sidebar */}
      <aside className="hidden md:block w-56 flex-shrink-0">
        <div className="card p-4 sticky top-20">
          <h3 className="text-sm font-semibold text-text-primary mb-4">{t('title')}</h3>
          <FilterContent
            genre={genre} setGenre={setGenre}
            city={city} setCity={setCity}
            entryType={entryType} setEntryType={setEntryType}
            musicGenres={musicGenres}
            stageGenres={stageGenres}
          />
        </div>
      </aside>

      <div className="flex-1">
        {/* Date range tabs */}
        <div className="flex gap-1 mb-4 bg-surface rounded-xl p-1 border border-[rgba(228,224,216,0.08)]">
          {([
            { value: 'all', label: t('all') },
            { value: 'today', label: t('dateRanges.today') },
            { value: 'week', label: t('dateRanges.week') },
            { value: 'month', label: t('dateRanges.month') },
          ] as const).map(({ value, label }) => (
            <button
              key={value}
              onClick={() => setDateRange(value)}
              className={`flex-1 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                dateRange === value ? 'bg-accent text-white' : 'text-text-muted hover:text-text-primary'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Top bar */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <span className="text-sm text-text-muted">{filtered.length} {locale === 'en' ? 'events' : 'etkinlik'}</span>
            <button onClick={toggleNearMe} disabled={locating}
              className={`flex items-center gap-1.5 py-1 px-2.5 rounded-lg border text-xs transition-colors disabled:opacity-60 ${
                nearMode ? 'bg-accent/10 text-accent border-accent/30' : 'text-text-muted border-[rgba(228,224,216,0.15)] hover:text-text-primary'
              }`}>
              {locating ? <Loader2 size={13} className="animate-spin" /> : <Navigation size={13} />}
              {locale === 'en' ? 'Near me' : 'Yakınımda'}
            </button>
          </div>
          <div className="flex items-center gap-2">
            {/* View toggle */}
            <div className="flex gap-0.5 bg-surface rounded-lg p-0.5 border border-[rgba(228,224,216,0.08)]">
              <button
                onClick={() => setView('list')}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${view === 'list' ? 'bg-accent text-white' : 'text-text-muted hover:text-text-primary'}`}
              >
                {locale === 'en' ? 'List' : 'Liste'}
              </button>
              <button
                onClick={() => setView('calendar')}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${view === 'calendar' ? 'bg-accent text-white' : 'text-text-muted hover:text-text-primary'}`}
              >
                {locale === 'en' ? 'Calendar' : 'Takvim'}
              </button>
              <button
                onClick={() => setView('map')}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${view === 'map' ? 'bg-accent text-white' : 'text-text-muted hover:text-text-primary'}`}
              >
                {locale === 'en' ? 'Map' : 'Harita'}
              </button>
            </div>

            {/* Mobile filter button */}
            <button
              onClick={() => setFilterOpen(true)}
              className="md:hidden flex items-center gap-2 btn-outline py-1.5 text-sm"
            >
              <Filter size={14} />
              Filtre
              {activeFilters > 0 && (
                <span className="bg-accent text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">
                  {activeFilters}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Calendar view */}
        {view === 'calendar' && (
          <div className="card p-4 mb-4">
            <EventCalendar
              events={calendarEvents}
              onDayClick={handleDayClick}
            />
          </div>
        )}

        {/* Map view */}
        {view === 'map' && (
          mapEvents.length === 0 ? (
            <div className="text-center py-16 text-text-muted text-sm">
              {nearMode && userLoc
                ? (locale === 'en' ? `No events within ${RADIUS_KM} km.` : `${RADIUS_KM} km içinde etkinlik yok.`)
                : (locale === 'en' ? 'No events with a location yet.' : 'Henüz konumu olan etkinlik yok.')}
            </div>
          ) : (
            <>
              <p className="text-xs text-text-muted mb-3">
                {nearMode && userLoc
                  ? (locale === 'en' ? `${mapEvents.length} events within ${RADIUS_KM} km` : `${RADIUS_KM} km içinde ${mapEvents.length} etkinlik`)
                  : `${mapEvents.length} ${locale === 'en' ? 'events on map' : 'etkinlik haritada'}`}
              </p>
              <EventsMap events={mapEvents} userLoc={nearMode ? userLoc : null} radiusKm={RADIUS_KM} />
            </>
          )
        )}

        {/* List view */}
        {view === 'list' && (
          filtered.length === 0 ? (
            <div className="text-center py-16">
              <CalendarDays size={40} className="mx-auto mb-3 text-text-muted opacity-20" />
              <p className="text-text-primary text-sm font-medium mb-1">Etkinlik bulunamadı</p>
              <p className="text-text-muted text-xs">
                {activeFilters > 0 ? 'Farklı filtreler deneyin.' : 'Yakında yeni etkinlikler eklenecek.'}
              </p>
              {activeFilters > 0 && (
                <button
                  onClick={() => { setGenre(''); setCity(''); setEntryType(''); setDateRange('all') }}
                  className="mt-3 text-accent text-xs hover:underline"
                >
                  {t('clearFilters')}
                </button>
              )}
            </div>
          ) : nearList ? (
            <>
              <p className="text-xs text-text-muted mb-3">{locale === 'en' ? `Events within ${RADIUS_KM} km of you` : `Konumuna ${RADIUS_KM} km mesafedeki etkinlikler`}</p>
              {nearList.length === 0 ? (
                <div className="text-center py-16 text-text-muted text-sm">{locale === 'en' ? `No events within ${RADIUS_KM} km.` : `${RADIUS_KM} km içinde etkinlik yok.`}</div>
              ) : (
                <div className="space-y-2">
                  {nearList.map(({ e, dist }) => (
                    <EventListCard key={e.id} event={e} locale={locale} distance={dist} />
                  ))}
                </div>
              )}
            </>
          ) : (
            <div className="space-y-6">
              {Object.entries(grouped).map(([date, evts]) => (
                <div key={date}>
                  <h2 className="font-bebas text-2xl text-text-primary mb-3">
                    {new Date(date).toLocaleDateString(locale === 'tr' ? 'tr-TR' : 'en-US', { weekday: 'long', day: 'numeric', month: 'long' }).toUpperCase()}
                  </h2>
                  <div className="space-y-2">
                    {evts.map((event) => (
                      <EventListCard key={event.id} event={event} locale={locale} />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )
        )}
      </div>

      {/* Mobile filter bottom sheet */}
      <BottomSheet open={filterOpen} onClose={() => setFilterOpen(false)} title={`${t('title')} Etkinlikler`}>
        <FilterContent
          genre={genre} setGenre={setGenre}
          city={city} setCity={setCity}
          entryType={entryType} setEntryType={setEntryType}
          musicGenres={musicGenres}
          stageGenres={stageGenres}
        />
        <button onClick={() => setFilterOpen(false)} className="btn-accent w-full mt-4">
          {t('title')} ({filtered.length})
        </button>
      </BottomSheet>

      {popup}
    </div>
  )
}

function FilterContent({ genre, setGenre, city, setCity, entryType, setEntryType, musicGenres, stageGenres }: {
  genre: string; setGenre: (v: string) => void
  city: string; setCity: (v: string) => void
  entryType: string; setEntryType: (v: string) => void
  musicGenres: string[]
  stageGenres: string[]
}) {
  const t = useTranslations('filters')
  const ENTRY_TYPES = [
    { value: 'free', label: t('entryTypes.free') },
    { value: 'paid', label: t('entryTypes.paid') },
    { value: 'door', label: t('entryTypes.door') },
  ]
  return (
    <div className="space-y-5">
      <FilterGroup label={t('musicGenre')} options={musicGenres} value={genre} onChange={setGenre} showAll allLabel={t('all')} />
      <FilterGroup label={t('stageType')} options={stageGenres} value={genre} onChange={setGenre} showAll allLabel={t('all')} />
      <FilterGroup label={t('city')} options={CITIES} value={city} onChange={setCity} />
      <div>
        <label className="label">{t('entry')}</label>
        <div className="space-y-1">
          {ENTRY_TYPES.map((entry) => (
            <button
              key={entry.value}
              onClick={() => setEntryType(entryType === entry.value ? '' : entry.value)}
              className={`w-full text-left px-3 py-1.5 rounded text-sm transition-colors ${
                entryType === entry.value
                  ? 'bg-accent/10 text-accent'
                  : 'text-text-muted hover:text-text-primary'
              }`}
            >
              {entry.value === 'free' ? t('free') : entry.value === 'paid' ? t('paid') : t('atDoor')}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

function FilterGroup({ label, options, value, onChange, showAll, allLabel = 'All' }: {
  label: string; options: string[]; value: string; onChange: (v: string) => void; showAll?: boolean; allLabel?: string
}) {
  return (
    <div>
      <label className="label">{label}</label>
      <div className="flex flex-wrap gap-1.5">
        {showAll && (
          <button
            onClick={() => onChange('')}
            className={`chip border transition-colors ${
              value === ''
                ? 'bg-accent/10 text-accent border-accent/30'
                : 'bg-[rgba(228,224,216,0.04)] text-text-muted border-[rgba(228,224,216,0.1)] hover:text-text-primary'
            }`}
          >
            {allLabel}
          </button>
        )}
        {options.map((opt) => (
          <button
            key={opt}
            onClick={() => onChange(value === opt ? '' : opt)}
            className={`chip border transition-colors ${
              value === opt
                ? 'bg-accent/10 text-accent border-accent/30'
                : 'bg-[rgba(228,224,216,0.04)] text-text-muted border-[rgba(228,224,216,0.1)] hover:text-text-primary'
            }`}
          >
            {opt}
          </button>
        ))}
      </div>
    </div>
  )
}

function Avatar({ src, fallback, size = 8 }: { src?: string | null; fallback: ReactNode; size?: number }) {
  const cls = `w-${size} h-${size} rounded-full flex-shrink-0 overflow-hidden bg-[rgba(228,224,216,0.08)] flex items-center justify-center`
  return src
    ? <div className={cls}><Image src={src} alt="" width={32} height={32} className="w-full h-full object-cover" /></div>
    : <div className={cls}>{fallback}</div>
}

function EventListCard({ event, locale, distance }: { event: EventFull; locale: string; distance?: number | null }) {
  const date = new Date(event.event_date)
  const dayNum = date.getDate()
  const localeStr = locale === 'tr' ? 'tr-TR' : 'en-US'
  const month = date.toLocaleDateString(localeStr, { month: 'short' })

  const performerName = event.artists?.stage_name ?? event.bands?.name ?? event.artist_name ?? null
  const performerAvatar = event.artists?.profiles?.avatar_url ?? event.bands?.photo_url ?? null
  const venueAvatar = event.venues?.photo_url ?? null

  return (
    <Link href={`/events/${event.id}`} className="card p-4 flex gap-4 hover:border-accent/30 transition-colors block">
      <div className="flex-shrink-0 w-12 h-12 bg-[rgba(212,83,126,0.08)] rounded-lg flex flex-col items-center justify-center border border-accent/20">
        <span className="font-bebas text-lg text-accent leading-none">{dayNum}</span>
        <span className="text-[9px] text-accent/70 uppercase">{month}</span>
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-medium text-text-primary text-sm truncate">{event.title}</h3>
          {event.genre && <GenreChip genre={event.genre} />}
        </div>

        {performerName && (
          <div className="flex items-center gap-1.5 mt-1">
            <Avatar src={performerAvatar} size={5} fallback={<Music2 size={10} className="text-text-muted" />} />
            <span className="text-xs text-accent truncate">{performerName}</span>
          </div>
        )}

        {event.venues?.name && (
          <div className="flex items-center gap-1.5 mt-1">
            <Avatar src={venueAvatar} size={5} fallback={<Building2 size={10} className="text-text-muted" />} />
            <span className="text-xs text-text-muted truncate">
              <MapPin size={9} className="inline mr-0.5" />
              {event.venues.name}{event.venues.district ? ` · ${event.venues.district}` : ''}
            </span>
            {distance != null && (
              <span className="flex items-center gap-0.5 text-[11px] text-accent flex-shrink-0 ml-auto">
                <Navigation size={9} /> {fmtDistance(distance)}
              </span>
            )}
          </div>
        )}

        <div className="flex items-center gap-3 mt-1 text-xs text-text-muted">
          <span className="flex items-center gap-1">
            <Clock size={10} />
            {formatTime(event.start_time)}
          </span>
          {event.entry_type === 'free' ? (
            <span className="text-success">Ücretsiz</span>
          ) : event.entry_fee ? (
            <span>{event.entry_fee}₺</span>
          ) : null}
        </div>
      </div>

      {event.poster_url && (
        <div className="flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden border border-[rgba(228,224,216,0.08)]">
          <Image src={event.poster_url} alt={event.title} width={64} height={64} className="w-full h-full object-cover" />
        </div>
      )}
    </Link>
  )
}
