'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { MapPin, Filter, Music } from 'lucide-react'
import { GenreChip } from '@/components/ui/GenreChip'
import { VENUE_TYPE_LABELS, cn } from '@/lib/utils'
import type { Venue, Slot } from '@/lib/supabase/types'
import { BottomSheet } from '@/components/ui/BottomSheet'

type VenueFull = Venue & { slots: Pick<Slot, 'id' | 'status'>[]; logo_url?: string | null }

const CITIES = ['İstanbul', 'Ankara', 'İzmir', 'Bursa']
  const VENUE_TYPES = Object.entries(VENUE_TYPE_LABELS)

export function VenuesClient({ initialVenues, canSeeSlots }: { initialVenues: VenueFull[]; canSeeSlots: boolean }) {
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
          <h3 className="text-sm font-semibold text-text-primary">Filtrele</h3>
          <FilterContent
            city={city} setCity={setCity}
            venueType={venueType} setVenueType={setVenueType}
            onlyOpenSlots={onlyOpenSlots} setOnlyOpenSlots={setOnlyOpenSlots}
            canSeeSlots={canSeeSlots}
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
            {filtered.map((venue) => <VenueCard key={venue.id} venue={venue} canSeeSlots={canSeeSlots} />)}
          </div>
        )}
      </div>

      <BottomSheet open={filterOpen} onClose={() => setFilterOpen(false)} title="Mekanları Filtrele">
        <FilterContent
          city={city} setCity={setCity}
          venueType={venueType} setVenueType={setVenueType}
          onlyOpenSlots={onlyOpenSlots} setOnlyOpenSlots={setOnlyOpenSlots}
          canSeeSlots={canSeeSlots}
        />
        <button onClick={() => setFilterOpen(false)} className="btn-accent w-full mt-4">
          Filtrele ({filtered.length})
        </button>
      </BottomSheet>
    </div>
  )
}

function FilterContent({ city, setCity, venueType, setVenueType, onlyOpenSlots, setOnlyOpenSlots, canSeeSlots }: {
  city: string; setCity: (v: string) => void
  venueType: string; setVenueType: (v: string) => void
  onlyOpenSlots: boolean; setOnlyOpenSlots: (v: boolean) => void
  canSeeSlots: boolean
}) {
  return (
    <div className="space-y-5">
      <div>
        <label className="label">Şehir</label>
        <div className="flex flex-wrap gap-1.5">
          {CITIES.map((c) => (
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
        <label className="label">Mekan Türü</label>
        <div className="flex flex-col gap-2">
          {VENUE_TYPES.map(([key, label]) => (
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

function VenueCard({ venue, canSeeSlots }: { venue: VenueFull; canSeeSlots: boolean }) {
  const openSlots = venue.slots?.filter((s) => s.status === 'open').length ?? 0

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
          <div className="absolute top-2 right-2 bg-accent text-white text-xs font-bold px-2 py-0.5 rounded-full">
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
      </div>
    </Link>
  )
}
