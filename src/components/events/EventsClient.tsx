'use client'

import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { useTranslations, useLocale } from 'next-intl'
import { MapPin, Clock, Filter, X, CalendarDays, Navigation, Loader2 } from 'lucide-react'
import { GenreChip } from '@/components/ui/GenreChip'
import { EventCalendar, type CalendarEventItem } from '@/components/ui/EventCalendar'
import { formatTime } from '@/lib/utils'
import type { Event, Venue, Artist } from '@/lib/supabase/types'
import { BottomSheet } from '@/components/ui/BottomSheet'
import { EventsMap, type MapEvent } from '@/components/events/EventsMap'
import { useSelectedCity } from '@/lib/use-selected-city'

type EventFull = Event & {
  poster_url?: string | null
  venues: Pick<Venue, 'name' | 'district' | 'city'> & { photo_url?: string | null; latitude?: number | null; longitude?: number | null } | null
  artists: Pick<Artist, 'stage_name'> & { profiles: { avatar_url: string | null } | null } | null
  bands: { name: string; photo_url?: string | null } | null
  artist_name?: string | null
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

export function EventsClient({
  initialEvents,
  musicGenres,
  stageGenres,
  danceGenres,
}: {
  initialEvents: EventFull[]
  musicGenres: string[]
  stageGenres: string[]
  danceGenres: string[]
}) {
  const t = useTranslations('filters')
  const locale = useLocale()
  const router = useRouter()

  const [genre, setGenre] = useState('')
  const city = useSelectedCity() // üstteki global şehir seçicisinden
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
    if (genre) {
      const g = e.genre ?? ''
      if (genre === 'cat:music') { if (!musicGenres.includes(g)) return false }
      else if (genre === 'cat:stage') { if (!stageGenres.includes(g)) return false }
      else if (genre === 'cat:dance') { if (!danceGenres.includes(g)) return false }
      else if (g !== genre) return false
    }
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
  const activeFilters = [genre, entryType, dateRange !== 'all' ? dateRange : ''].filter(Boolean).length

  // Harita görünümü: mekan koordinatı olan tüm etkinlikler (zoom out/kaydırınca 1 km dışı da görünür)
  const mapEvents: MapEvent[] = filtered
    .filter((e) => (e.venues as any)?.latitude != null && (e.venues as any)?.longitude != null)
    .map((e) => ({
      id: e.id,
      title: e.title,
      dateLabel: new Date(e.event_date).toLocaleDateString(locale === 'tr' ? 'tr-TR' : 'en-US', { day: 'numeric', month: 'short' }) + ' · ' + formatTime(e.start_time),
      venueName: e.venues?.name ?? '',
      lat: (e.venues as any).latitude,
      lng: (e.venues as any).longitude,
    }))

  // Yakınımda modu: etkinlikleri mekan mesafesine göre en yakından uzağa sırala (sınır yok)
  const nearList = nearMode && userLoc
    ? filtered.map((e) => ({ e, dist: eventDist(e) })).sort((a, b) => {
        if (a.dist == null) return 1
        if (b.dist == null) return -1
        return a.dist - b.dist
      })
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
            entryType={entryType} setEntryType={setEntryType}
            musicGenres={musicGenres}
            stageGenres={stageGenres}
            danceGenres={danceGenres}
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
              {locale === 'en' ? 'No events with a location yet.' : 'Henüz konumu olan etkinlik yok.'}
            </div>
          ) : (
            <>
              <p className="text-xs text-text-muted mb-3">
                {mapEvents.length} {locale === 'en' ? 'events on map' : 'etkinlik haritada'}
                {nearMode && userLoc && (locale === 'en' ? ` · ${RADIUS_KM} km framed` : ` · ${RADIUS_KM} km çerçevede`)}
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
                  onClick={() => { setGenre(''); setEntryType(''); setDateRange('all') }}
                  className="mt-3 text-accent text-xs hover:underline"
                >
                  {t('clearFilters')}
                </button>
              )}
            </div>
          ) : nearList ? (
            <>
              <p className="text-xs text-text-muted mb-3">{locale === 'en' ? 'Sorted by distance from your location' : 'Konumuna en yakından uzağa sıralandı'}</p>
              <div className="grid grid-cols-2 gap-3">
                {nearList.map(({ e, dist }) => (
                  <EventListCard key={e.id} event={e} locale={locale} distance={dist} />
                ))}
              </div>
            </>
          ) : (
            <div className="space-y-6">
              {Object.entries(grouped).map(([date, evts]) => (
                <div key={date}>
                  <h2 className="font-bebas text-2xl text-text-primary mb-3">
                    {new Date(date).toLocaleDateString(locale === 'tr' ? 'tr-TR' : 'en-US', { weekday: 'long', day: 'numeric', month: 'long' }).toUpperCase()}
                  </h2>
                  <div className="grid grid-cols-2 gap-3">
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
          entryType={entryType} setEntryType={setEntryType}
          musicGenres={musicGenres}
          stageGenres={stageGenres}
          danceGenres={danceGenres}
        />
        <button onClick={() => setFilterOpen(false)} className="btn-accent w-full mt-4">
          {t('title')} ({filtered.length})
        </button>
      </BottomSheet>

      {popup}
    </div>
  )
}

function FilterContent({ genre, setGenre, entryType, setEntryType, musicGenres, stageGenres, danceGenres }: {
  genre: string; setGenre: (v: string) => void
  entryType: string; setEntryType: (v: string) => void
  musicGenres: string[]
  stageGenres: string[]
  danceGenres: string[]
}) {
  const t = useTranslations('filters')
  const ENTRY_TYPES = [
    { value: 'free', label: t('entryTypes.free') },
    { value: 'paid', label: t('entryTypes.paid') },
    { value: 'door', label: t('entryTypes.door') },
  ]
  return (
    <div className="space-y-5">
      {/* Genel Hepsi — tüm kategoriler */}
      <button onClick={() => setGenre('')}
        className={`chip border transition-colors ${genre === '' ? 'bg-accent text-white border-accent' : 'bg-[rgba(228,224,216,0.04)] text-text-muted border-[rgba(228,224,216,0.1)] hover:text-text-primary'}`}>
        {t('all')}
      </button>
      <FilterGroup label={t('musicGenre')} options={musicGenres} value={genre} onChange={setGenre} showAll allValue="cat:music" allLabel={t('all')} />
      <FilterGroup label={t('stageType')} options={stageGenres} value={genre} onChange={setGenre} showAll allValue="cat:stage" allLabel={t('all')} />
      <FilterGroup label="Dans" options={danceGenres} value={genre} onChange={setGenre} showAll allValue="cat:dance" allLabel={t('all')} />
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

function FilterGroup({ label, options, value, onChange, showAll, allLabel = 'All', allValue = '' }: {
  label: string; options: string[]; value: string; onChange: (v: string) => void; showAll?: boolean; allLabel?: string; allValue?: string
}) {
  return (
    <div>
      <label className="label">{label}</label>
      <div className="flex flex-wrap gap-1.5">
        {showAll && (
          <button
            onClick={() => onChange(allValue)}
            className={`chip border transition-colors ${
              value === allValue
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


function EventListCard({ event, locale, distance }: { event: EventFull; locale: string; distance?: number | null }) {
  const date = new Date(event.event_date)
  const dayNum = date.getDate()
  const localeStr = locale === 'tr' ? 'tr-TR' : 'en-US'
  const month = date.toLocaleDateString(localeStr, { month: 'short' })

  const performerName = event.artists?.stage_name ?? event.bands?.name ?? event.artist_name ?? null
  const bgImage = event.poster_url ?? event.venues?.photo_url ?? null

  return (
    <Link href={`/events/${event.id}`} className="block aspect-square relative rounded-xl overflow-hidden border border-[rgba(228,224,216,0.1)] hover:border-accent/40 transition-colors">
      {bgImage ? (
        <Image src={bgImage} alt={event.title} fill className="object-cover" sizes="(max-width: 768px) 50vw, 33vw" />
      ) : (
        <div className="absolute inset-0 bg-surface-alt" />
      )}

      {/* Koyu gradient — içerik okunabilirliği için */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-black/10" />

      {/* Tarih — sol üst */}
      <div className="absolute top-2 left-2 bg-accent rounded-lg px-2 py-1 flex flex-col items-center min-w-[28px]">
        <span className="font-bebas text-base text-white leading-none">{dayNum}</span>
        <span className="text-[8px] text-white/80 uppercase leading-none mt-0.5">{month}</span>
      </div>

      {/* Tür etiketi — sağ üst */}
      {event.genre && (
        <div className="absolute top-2 right-2">
          <GenreChip genre={event.genre} />
        </div>
      )}

      {/* İçerik — alt */}
      <div className="absolute bottom-0 left-0 right-0 p-2.5">
        <h3 className="font-semibold text-white text-sm leading-tight line-clamp-2 mb-0.5">{event.title}</h3>

        {performerName && (
          <p className="text-xs text-accent/90 truncate">{performerName}</p>
        )}

        <div className="flex items-center justify-between mt-1 gap-1">
          <span className="text-[10px] text-white/55 truncate flex items-center gap-0.5">
            <MapPin size={8} className="flex-shrink-0" />
            {event.venues?.name ?? ''}
          </span>
          <span className="text-[10px] text-white/55 flex-shrink-0 flex items-center gap-0.5">
            {distance != null
              ? <><Navigation size={8} />{fmtDistance(distance)}</>
              : <><Clock size={8} />{formatTime(event.start_time)}</>
            }
          </span>
        </div>

        {event.entry_type === 'free' && (
          <span className="text-[9px] text-success font-medium">Ücretsiz</span>
        )}
        {event.entry_type !== 'free' && event.entry_fee ? (
          <span className="text-[9px] text-white/60">{event.entry_fee}₺</span>
        ) : null}
      </div>
    </Link>
  )
}
