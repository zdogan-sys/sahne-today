'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useTranslations, useLocale } from 'next-intl'
import { MapPin, GraduationCap } from 'lucide-react'
import { GenreChip } from '@/components/ui/GenreChip'
import { cn } from '@/lib/utils'
import type { Artist, Profile } from '@/lib/supabase/types'
import { BottomSheet } from '@/components/ui/BottomSheet'
import { Filter } from 'lucide-react'
import { CITY_OPTIONS } from '@/lib/constants'

type ArtistFull = Artist & { profiles: Pick<Profile, 'display_name' | 'avatar_url' | 'city'> | null }

export function ArtistsClient({ initialArtists }: { initialArtists: ArtistFull[] }) {
  const t = useTranslations('filters')
  const locale = useLocale()

  const MUSIC_GENRES = locale === 'en'
    ? ['Acoustic', 'Metal', 'Rock', 'Blues', 'Jazz', 'Pop', 'Electronic', 'R&B', 'Rap', 'Classical', 'Ethnic', 'Fasıl', 'Folk', 'Arabesk']
    : ['Akustik', 'Metal', 'Rock', 'Blues', 'Caz', 'Pop', 'Elektronik', 'R&B', 'Rap', 'Klasik', 'Etnik', 'Fasıl', 'Türkü', 'Arabesk']

  const STAGE_GENRES = locale === 'en'
    ? ['Stand-Up', 'Improvisation', 'Alternative Stage']
    : ['Stand-Up', 'Doğaçlama', 'Alternatif Sahne']

  const CITIES = locale === 'en'
    ? ['Istanbul', 'Ankara', 'Izmir', 'Bursa', 'Antalya', 'Eskişehir', 'Adana', 'Kayseri']
    : CITY_OPTIONS

  const INSTRUMENTS = locale === 'en'
    ? ['Guitar', 'Bass', 'Drums', 'Keyboard', 'Violin', 'Vocals', 'Saz', 'Flute', 'Trumpet', 'Oud']
    : ['Gitar', 'Bas', 'Davul', 'Klavye', 'Keman', 'Vokal', 'Saz', 'Flüt', 'Trompet', 'Ud']

  const artistsLabel = locale === 'en' ? 'Artists' : 'Sanatçılar'
  const instrumentLabel = locale === 'en' ? 'Instrument' : 'Enstrüman'
  const noArtistsLabel = locale === 'en' ? 'No artists found.' : 'Sanatçı bulunamadı.'

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
          <h3 className="text-sm font-semibold text-text-primary">{t('title')}</h3>
          <FilterGroup label={t('musicGenre')} options={MUSIC_GENRES} value={genre} onChange={setGenre} />
          <FilterGroup label={t('stageType')} options={STAGE_GENRES} value={genre} onChange={setGenre} />
          <FilterGroup label={t('city')} options={CITIES} value={city} onChange={setCity} />
          <FilterGroup label={instrumentLabel} options={INSTRUMENTS} value={instrument} onChange={setInstrument} />
        </div>
      </aside>

      <div className="flex-1">
        <div className="md:hidden flex items-center justify-between mb-4">
          <span className="text-sm text-text-muted">{filtered.length} {artistsLabel}</span>
          <button onClick={() => setFilterOpen(true)} className="flex items-center gap-2 btn-outline py-1.5 text-sm">
            <Filter size={14} />
            {t('title')}
            {activeFilters > 0 && (
              <span className="bg-accent text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">{activeFilters}</span>
            )}
          </button>
        </div>

        {filtered.length === 0 ? (
          <div className="text-center py-16 text-text-muted text-sm">{noArtistsLabel}</div>
        ) : (
          <div className="space-y-3">
            {filtered.map((artist) => <ArtistCard key={artist.id} artist={artist} />)}
          </div>
        )}
      </div>

      <BottomSheet open={filterOpen} onClose={() => setFilterOpen(false)} title={`${t('title')} ${artistsLabel}`}>
        <div className="space-y-5">
          <FilterGroup label={t('musicGenre')} options={MUSIC_GENRES} value={genre} onChange={setGenre} />
          <FilterGroup label={t('stageType')} options={STAGE_GENRES} value={genre} onChange={setGenre} />
          <FilterGroup label={t('city')} options={CITIES} value={city} onChange={setCity} />
          <FilterGroup label={instrumentLabel} options={INSTRUMENTS} value={instrument} onChange={setInstrument} />
        </div>
        <button onClick={() => setFilterOpen(false)} className="btn-accent w-full mt-4">
          {t('title')} ({filtered.length})
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
          {(artist as any).is_teaching && (artist as any).teaching_instruments?.length > 0 && (
            <span className="chip flex items-center gap-1 bg-[#d4a820]/10 text-[#d4a820] border border-[#d4a820]/30">
              <GraduationCap size={9} />
              Ders Veriyor
            </span>
          )}
        </div>
      </div>
    </Link>
  )
}
