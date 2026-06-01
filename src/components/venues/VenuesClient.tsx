'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useTranslations, useLocale } from 'next-intl'
import { MapPin, Filter, Music, CalendarDays } from 'lucide-react'
import { GenreChip } from '@/components/ui/GenreChip'
import { cn, formatTime } from '@/lib/utils'
import type { Venue, Slot } from '@/lib/supabase/types'
import { BottomSheet } from '@/components/ui/BottomSheet'

type VenueFull = Venue & { slots: Pick<Slot, 'id' | 'status'>[]; logo_url?: string | null }

type UpcomingEvent = {
  id: string
  venue_id: string
  title: string
  event_date: string
  start_time: string
}

const CITIES_TR = ['İstanbul', 'Ankara', 'İzmir', 'Bursa']
const CITIES_EN = ['Istanbul', 'Ankara', 'Izmir', 'Bursa']

export function VenuesClient({ initialVenues, upcomingEvents = [], canSeeSlots }: { initialVenues: VenueFull[]; upcomingEvents?: UpcomingEvent[]; canSeeSlots: boolean }) {
  const t = useTranslations('filters')
  const locale = useLocale()
  const CITIES = locale === 'en' ? CITIES_EN : CITIES_TR
  const VENUE_TYPES = [
    { key: 'pub', label: t('venueTypes.pub') },
    { key: 'turku_bar', label: t('venueTypes.turku_bar') },
    { key: 'live_music', label: t('venueTypes.live_music') },
    { key: 'bookstore', label: t('venueTypes.bookstore') },
    { key: 'theater', label: t('venueTypes.theater') },
    { key: 'cafe', label: t('venueTypes.cafe') },
    { key: 'other', label: t('venueTypes.other') },
  ]
  const [city, setCity] = useState('')
  const [venueType, setVenueType] = useState('')
  const [onlyOpenSlots, setOnlyOpenSlots] = useState(false)
  const [filterOpen, setFilterOpen] = useState(false)

  const filtered = initialVenues.filter((v) => {
    if (city && v.city !== city) return false
    if (venueType && v.venue_type !== venueType) return false
    if (onlyOpenSlots) {
      const hasOpen = v.slots?.some((s) => s.status === 'open')
      if (!hasOpen) return false
    }
    return true
  })

  const activeFilters = [city, venueType, onlyOpenSlots].filter(Boolean).length

  return (
    <div className="md:flex md:gap-6">
      {/* Desktop sidebar */}
      <aside className="hidden md:block w-56 flex-shrink-0">
        <div className="card p-4 sticky top-20 space-y-5">
          <h3 className="text-sm font-semibold text-text-primary">{t('title')}</h3>
          <FilterContent
            city={city} setCity={setCity}
            venueType={venueType} setVenueType={setVenueType}
            onlyOpenSlots={onlyOpenSlots} setOnlyOpenSlots={setOnlyOpenSlots}
            canSeeSlots={canSeeSlots}
            cities={CITIES}
            venueTypes={VENUE_TYPES}
            locale={locale}
            t={t}
          />
        </div>
      </aside>

      <div className="flex-1">
        <div className="md:hidden flex items-center justify-between mb-4">
          <span className="text-sm text-text-muted">{filtered.length} mekan</span>
          <button onClick={() => setFilterOpen(true)} className="flex items-center gap-2 btn-outline py-1.5 text-sm">
            <Filter size={14} />
            Filtre
            {activeFilters > 0 && (
              <span className="bg-accent text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">{activeFilters}</span>
            )}
          </button>
        </div>

        {filtered.length === 0 ? (
          <div className="text-center py-16 text-text-muted text-sm">Mekan bulunamadı.</div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {filtered.map((venue) => (
              <VenueCard
                key={venue.id}
                venue={venue}
                canSeeSlots={canSeeSlots}
                nearestEvent={upcomingEvents.find(e => e.venue_id === venue.id) ?? null}
              />
            ))}
          </div>
        )}
      </div>

      <BottomSheet open={filterOpen} onClose={() => setFilterOpen(false)} title={locale === 'en' ? 'Filter Venues' : 'Mekanları Filtrele'}>
        <FilterContent
          city={city} setCity={setCity}
          venueType={venueType} setVenueType={setVenueType}
          onlyOpenSlots={onlyOpenSlots} setOnlyOpenSlots={setOnlyOpenSlots}
          canSeeSlots={canSeeSlots}
          cities={CITIES}
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

function FilterContent({ city, setCity, venueType, setVenueType, onlyOpenSlots, setOnlyOpenSlots, canSeeSlots, cities, venueTypes, locale, t }: {
  city: string; setCity: (v: string) => void
  venueType: string; setVenueType: (v: string) => void
  onlyOpenSlots: boolean; setOnlyOpenSlots: (v: boolean) => void
  canSeeSlots: boolean
  cities: string[]
  venueTypes: Array<{ key: string; label: string }>
  locale: string
  t: (key: string) => string
}) {
  return (
    <div className="space-y-5">
      <div>
        <label className="label">Şehir</label>
        <div className="flex flex-wrap gap-1.5">
          {cities.map((c: string) => (
            <button key={c} onClick={() => setCity(city === c ? '' : c)}
              className={cn('chip border transition-colors', city === c
                ? 'bg-accent/10 text-accent border-accent/30'
                : 'bg-[rgba(228,224,216,0.04)] text-text-muted border-[rgba(228,224,216,0.1)] hover:text-text-primary'
              )}>
              {c}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="label">{locale === 'en' ? 'Venue Type' : 'Mekan Türü'}</label>
        <div className="flex flex-col gap-2">
          {VENUE_TYPES.map(({ key, label }) => (
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

function VenueCard({ venue, canSeeSlots, nearestEvent }: { venue: VenueFull; canSeeSlots: boolean; nearestEvent: UpcomingEvent | null }) {
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
        {venue.logo_url ? (
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
        ) : venue.photo_url ? (
          <Image
            src={venue.photo_url}
            alt={venue.name}
            fill
            className="object-cover"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <Music size={32} className="text-[rgba(228,224,216,0.12)]" />
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
