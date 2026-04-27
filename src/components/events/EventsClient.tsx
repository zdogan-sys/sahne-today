'use client'

import { useState, type ReactNode } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { MapPin, Clock, Filter, Music2, Building2 } from 'lucide-react'
import { GenreChip } from '@/components/ui/GenreChip'
import { formatTime } from '@/lib/utils'
import type { Event, Venue, Artist } from '@/lib/supabase/types'
import { BottomSheet } from '@/components/ui/BottomSheet'

type EventFull = Event & {
  venues: Pick<Venue, 'name' | 'district' | 'city'> & { photo_url?: string | null } | null
  artists: Pick<Artist, 'stage_name'> & { profiles: { avatar_url: string | null } | null } | null
  bands: { name: string; photo_url?: string | null } | null
  artist_name?: string | null
}

const GENRES = ['Rock', 'Stand-Up', 'Türkü', 'Caz', 'Solist', 'Pop', 'Jazz', 'Folk']
const CITIES = ['İstanbul', 'Ankara', 'İzmir', 'Bursa']
const ENTRY_TYPES = [
  { value: 'free', label: 'Ücretsiz' },
  { value: 'paid', label: 'Ücretli' },
  { value: 'door', label: 'Kapıda' },
]

function groupByDate(events: EventFull[]) {
  return events.reduce<Record<string, EventFull[]>>((acc, event) => {
    const key = event.event_date
    if (!acc[key]) acc[key] = []
    acc[key].push(event)
    return acc
  }, {})
}

export function EventsClient({ initialEvents }: { initialEvents: EventFull[] }) {
  const [genre, setGenre] = useState('')
  const [city, setCity] = useState('')
  const [entryType, setEntryType] = useState('')
  const [filterOpen, setFilterOpen] = useState(false)

  const filtered = initialEvents.filter((e) => {
    if (genre && e.genre !== genre) return false
    if (city && e.venues?.city !== city) return false
    if (entryType && e.entry_type !== entryType) return false
    return true
  })

  const grouped = groupByDate(filtered)
  const activeFilters = [genre, city, entryType].filter(Boolean).length

  return (
    <div className="md:flex md:gap-6">
      {/* Desktop filter sidebar */}
      <aside className="hidden md:block w-56 flex-shrink-0">
        <div className="card p-4 sticky top-20">
          <h3 className="text-sm font-semibold text-text-primary mb-4">Filtrele</h3>
          <FilterContent
            genre={genre} setGenre={setGenre}
            city={city} setCity={setCity}
            entryType={entryType} setEntryType={setEntryType}
          />
        </div>
      </aside>

      <div className="flex-1">
        {/* Mobile filter button */}
        <div className="md:hidden flex items-center justify-between mb-4">
          <span className="text-sm text-text-muted">{filtered.length} etkinlik</span>
          <button
            onClick={() => setFilterOpen(true)}
            className="flex items-center gap-2 btn-outline py-1.5 text-sm"
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

        {/* Events list grouped by date */}
        {Object.keys(grouped).length === 0 ? (
          <div className="text-center py-16 text-text-muted">
            <p>Etkinlik bulunamadı.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {Object.entries(grouped).map(([date, evts]) => (
              <div key={date}>
                <h2 className="font-bebas text-2xl text-text-primary mb-3">
                  {new Date(date).toLocaleDateString('tr-TR', { weekday: 'long', day: 'numeric', month: 'long' }).toUpperCase()}
                </h2>
                <div className="space-y-2">
                  {evts.map((event) => (
                    <EventListCard key={event.id} event={event} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Mobile filter bottom sheet */}
      <BottomSheet open={filterOpen} onClose={() => setFilterOpen(false)} title="Etkinlikleri Filtrele">
        <FilterContent
          genre={genre} setGenre={setGenre}
          city={city} setCity={setCity}
          entryType={entryType} setEntryType={setEntryType}
        />
        <button onClick={() => setFilterOpen(false)} className="btn-accent w-full mt-4">
          Filtrele ({filtered.length})
        </button>
      </BottomSheet>
    </div>
  )
}

function FilterContent({ genre, setGenre, city, setCity, entryType, setEntryType }: {
  genre: string; setGenre: (v: string) => void
  city: string; setCity: (v: string) => void
  entryType: string; setEntryType: (v: string) => void
}) {
  return (
    <div className="space-y-5">
      <FilterGroup label="Tür" options={GENRES} value={genre} onChange={setGenre} />
      <FilterGroup label="Şehir" options={CITIES} value={city} onChange={setCity} />
      <div>
        <label className="label">Giriş</label>
        <div className="space-y-1">
          {ENTRY_TYPES.map((t) => (
            <button
              key={t.value}
              onClick={() => setEntryType(entryType === t.value ? '' : t.value)}
              className={`w-full text-left px-3 py-1.5 rounded text-sm transition-colors ${
                entryType === t.value
                  ? 'bg-accent/10 text-accent'
                  : 'text-text-muted hover:text-text-primary'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

function FilterGroup({ label, options, value, onChange }: {
  label: string; options: string[]; value: string; onChange: (v: string) => void
}) {
  return (
    <div>
      <label className="label">{label}</label>
      <div className="flex flex-wrap gap-1.5">
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

function EventListCard({ event }: { event: EventFull }) {
  const date = new Date(event.event_date)
  const dayNum = date.getDate()
  const month = date.toLocaleDateString('tr-TR', { month: 'short' })

  const performerName = event.artists?.stage_name ?? event.bands?.name ?? event.artist_name ?? null
  const performerAvatar = event.artists?.profiles?.avatar_url ?? event.bands?.photo_url ?? null
  const venueAvatar = event.venues?.photo_url ?? null

  return (
    <Link href={`/events/${event.id}`} className="card p-4 flex gap-4 hover:border-accent/30 transition-colors block">
      {/* Date badge */}
      <div className="flex-shrink-0 w-12 h-12 bg-[rgba(212,83,126,0.08)] rounded-lg flex flex-col items-center justify-center border border-accent/20">
        <span className="font-bebas text-lg text-accent leading-none">{dayNum}</span>
        <span className="text-[9px] text-accent/70 uppercase">{month}</span>
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-medium text-text-primary text-sm truncate">{event.title}</h3>
          {event.genre && <GenreChip genre={event.genre} />}
        </div>

        {/* Performer row */}
        {performerName && (
          <div className="flex items-center gap-1.5 mt-1">
            <Avatar src={performerAvatar} size={5} fallback={<Music2 size={10} className="text-text-muted" />} />
            <span className="text-xs text-accent truncate">{performerName}</span>
          </div>
        )}

        {/* Venue row */}
        {event.venues?.name && (
          <div className="flex items-center gap-1.5 mt-1">
            <Avatar src={venueAvatar} size={5} fallback={<Building2 size={10} className="text-text-muted" />} />
            <span className="text-xs text-text-muted truncate">
              <MapPin size={9} className="inline mr-0.5" />
              {event.venues.name}{event.venues.district ? ` · ${event.venues.district}` : ''}
            </span>
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
    </Link>
  )
}
