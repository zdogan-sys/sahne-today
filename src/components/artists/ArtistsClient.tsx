'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { MapPin } from 'lucide-react'
import { GenreChip } from '@/components/ui/GenreChip'
import { cn } from '@/lib/utils'
import type { Artist, Profile } from '@/lib/supabase/types'
import { BottomSheet } from '@/components/ui/BottomSheet'
import { Filter } from 'lucide-react'

type ArtistFull = Artist & { profiles: Pick<Profile, 'display_name' | 'avatar_url' | 'city'> | null }

const GENRES = ['Rock', 'Stand-Up', 'Türkü', 'Caz', 'Solist', 'Pop', 'Folk', 'Elektronik']
const CITIES = ['İstanbul', 'Ankara', 'İzmir', 'Bursa']
const INSTRUMENTS = ['Gitar', 'Bas', 'Davul', 'Klavye', 'Keman', 'Vokal', 'Saz']

export function ArtistsClient({ initialArtists }: { initialArtists: ArtistFull[] }) {
  const [genre, setGenre] = useState('')
  const [city, setCity] = useState('')
  const [instrument, setInstrument] = useState('')
  const [filterOpen, setFilterOpen] = useState(false)

  const filtered = initialArtists.filter((a) => {
    if (genre && !a.genres.includes(genre)) return false
    if (city && a.city !== city) return false
    if (instrument && !a.instruments.includes(instrument)) return false
    return true
  })

  const activeFilters = [genre, city, instrument].filter(Boolean).length

  return (
    <div className="md:flex md:gap-6">
      <aside className="hidden md:block w-56 flex-shrink-0">
        <div className="card p-4 sticky top-20 space-y-5">
          <h3 className="text-sm font-semibold text-text-primary">Filtrele</h3>
          <FilterGroup label="Tür" options={GENRES} value={genre} onChange={setGenre} />
          <FilterGroup label="Şehir" options={CITIES} value={city} onChange={setCity} />
          <FilterGroup label="Enstrüman" options={INSTRUMENTS} value={instrument} onChange={setInstrument} />
        </div>
      </aside>

      <div className="flex-1">
        <div className="md:hidden flex items-center justify-between mb-4">
          <span className="text-sm text-text-muted">{filtered.length} sanatçı</span>
          <button onClick={() => setFilterOpen(true)} className="flex items-center gap-2 btn-outline py-1.5 text-sm">
            <Filter size={14} />
            Filtre
            {activeFilters > 0 && (
              <span className="bg-accent text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">{activeFilters}</span>
            )}
          </button>
        </div>

        {filtered.length === 0 ? (
          <div className="text-center py-16 text-text-muted text-sm">Sanatçı bulunamadı.</div>
        ) : (
          <div className="space-y-3">
            {filtered.map((artist) => <ArtistCard key={artist.id} artist={artist} />)}
          </div>
        )}
      </div>

      <BottomSheet open={filterOpen} onClose={() => setFilterOpen(false)} title="Sanatçıları Filtrele">
        <div className="space-y-5">
          <FilterGroup label="Tür" options={GENRES} value={genre} onChange={setGenre} />
          <FilterGroup label="Şehir" options={CITIES} value={city} onChange={setCity} />
          <FilterGroup label="Enstrüman" options={INSTRUMENTS} value={instrument} onChange={setInstrument} />
        </div>
        <button onClick={() => setFilterOpen(false)} className="btn-accent w-full mt-4">
          Filtrele ({filtered.length})
        </button>
      </BottomSheet>
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
          <button key={opt} onClick={() => onChange(value === opt ? '' : opt)}
            className={cn('chip border transition-colors', value === opt
              ? 'bg-accent/10 text-accent border-accent/30'
              : 'bg-[rgba(228,224,216,0.04)] text-text-muted border-[rgba(228,224,216,0.1)]'
            )}>
            {opt}
          </button>
        ))}
      </div>
    </div>
  )
}

function ArtistCard({ artist }: { artist: ArtistFull }) {
  const initials = artist.stage_name.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase()

  return (
    <Link href={`/artists/${artist.id}`} className="card p-4 flex items-center gap-4 hover:border-accent/30 transition-colors block">
      <div className="flex-shrink-0 w-14 h-14 rounded-full overflow-hidden bg-accent/10 flex items-center justify-center text-accent font-bold text-lg">
        {artist.profiles?.avatar_url ? (
          <Image
            src={artist.profiles.avatar_url}
            alt={artist.stage_name}
            width={56}
            height={56}
            className="object-cover w-full h-full"
          />
        ) : initials}
      </div>
      <div className="flex-1 min-w-0">
        <h3 className="font-semibold text-text-primary">{artist.stage_name}</h3>
        {artist.city && (
          <div className="flex items-center gap-1 text-text-muted text-xs mt-0.5">
            <MapPin size={10} />
            <span>{artist.city}</span>
          </div>
        )}
        <div className="flex flex-wrap gap-1 mt-1.5">
          {artist.genres?.slice(0, 3).map((g) => <GenreChip key={g} genre={g} />)}
          {artist.instruments?.slice(0, 2).map((i) => (
            <span key={i} className="chip bg-[rgba(228,224,216,0.06)] text-text-muted border border-[rgba(228,224,216,0.1)]">{i}</span>
          ))}
        </div>
      </div>
    </Link>
  )
}
