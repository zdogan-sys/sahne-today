'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useLocale } from 'next-intl'
import { MapPin, Users, UserPlus } from 'lucide-react'
import { GenreChip } from '@/components/ui/GenreChip'
import { cn } from '@/lib/utils'
import { CITY_OPTIONS } from '@/lib/constants'

interface Band {
  id: string
  name: string
  genres: string[]
  city: string | null
  bio: string | null
  photo_url: string | null
  looking_for: string[]
  band_members: { status: string }[]
}

export function BandsClient({ initialBands, isArtist }: { initialBands: Band[]; isArtist: boolean }) {
  const locale = useLocale()
  const isEn = locale === 'en'

  const ALL_GENRES = isEn
    ? ['Acoustic', 'Metal', 'Rock', 'Blues', 'Jazz', 'Pop', 'Electronic', 'R&B', 'Rap', 'Classical', 'Ethnic', 'Fasıl', 'Folk', 'Arabesk', 'Stand-Up', 'Improvisation', 'Alternative Stage']
    : ['Akustik', 'Metal', 'Rock', 'Blues', 'Caz', 'Pop', 'Elektronik', 'R&B', 'Rap', 'Klasik', 'Etnik', 'Fasıl', 'Türkü', 'Arabesk', 'Stand-Up', 'Doğaçlama', 'Alternatif Sahne']

  const CITIES = isEn
    ? ['Istanbul', 'Ankara', 'Izmir', 'Bursa', 'Antalya', 'Eskişehir', 'Adana', 'Kayseri']
    : CITY_OPTIONS

  const [city, setCity] = useState('')
  const [genre, setGenre] = useState('')
  const [hiringOnly, setHiringOnly] = useState(false)

  const filtered = useMemo(() => initialBands.filter((b) => {
    if (city && b.city !== city) return false
    if (genre && !b.genres.includes(genre)) return false
    if (hiringOnly && !(b.looking_for?.length > 0)) return false
    return true
  }), [initialBands, city, genre, hiringOnly])

  return (
    <div>
      <div className="space-y-3 mb-5">
        <div className="flex gap-2 flex-wrap items-center">
          <select value={city} onChange={(e) => setCity(e.target.value)} className="input-field text-sm w-auto">
            <option value="">{isEn ? 'All cities' : 'Tüm şehirler'}</option>
            {CITIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>

          {isArtist && (
            <label className="flex items-center gap-2 cursor-pointer select-none ml-auto">
              <div
                onClick={() => setHiringOnly(!hiringOnly)}
                className={cn('w-9 h-5 rounded-full relative transition-colors flex-shrink-0', hiringOnly ? 'bg-yellow-400' : 'bg-[rgba(228,224,216,0.15)]')}
              >
                <span className={cn('absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform', hiringOnly ? 'translate-x-4' : 'translate-x-0.5')} />
              </div>
              <span className="text-xs text-text-muted whitespace-nowrap">{isEn ? 'Hiring only' : 'Üye arayanlar'}</span>
            </label>
          )}
        </div>

        <div className="flex gap-1.5 flex-wrap">
          {ALL_GENRES.map((g) => (
            <button key={g} onClick={() => setGenre(genre === g ? '' : g)}
              className={cn('chip border text-xs transition-colors', genre === g
                ? 'bg-accent/10 text-accent border-accent/30'
                : 'bg-transparent text-text-muted border-[rgba(228,224,216,0.1)] hover:text-text-primary'
              )}>
              {g}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-16 text-text-muted text-sm">
          <Users size={32} className="mx-auto mb-3 opacity-30" />
          <p>{isEn ? 'No bands found matching these criteria.' : 'Bu kriterlere uyan grup bulunamadı.'}</p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {filtered.map((band) => {
            const memberCount = band.band_members.filter((m) => m.status === 'accepted').length
            const isHiring = isArtist && band.looking_for?.length > 0
            return (
              <Link key={band.id} href={`/bands/${band.id}`}
                className={cn('card p-4 hover:border-accent/30 transition-colors flex gap-4', isHiring && 'border-yellow-400/20')}>
                <div className="relative flex-shrink-0">
                  <div className="w-12 h-12 rounded-xl overflow-hidden bg-accent/10 flex items-center justify-center text-accent font-bold text-xl">
                    {band.photo_url
                      ? <Image src={band.photo_url} alt={band.name} width={48} height={48} className="object-cover w-full h-full" />
                      : band.name[0].toUpperCase()}
                  </div>
                  {isHiring && (
                    <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-yellow-400 flex items-center justify-center">
                      <UserPlus size={9} className="text-black" />
                    </div>
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-text-primary truncate">{band.name}</p>
                  <div className="flex items-center gap-3 text-xs text-text-muted mt-0.5">
                    {band.city && <span className="flex items-center gap-1"><MapPin size={10} />{band.city}</span>}
                    <span className="flex items-center gap-1"><Users size={10} />{memberCount} {isEn ? 'members' : 'üye'}</span>
                  </div>
                  <div className="flex flex-wrap gap-1 mt-2">
                    {band.genres.slice(0, 3).map((g) => <GenreChip key={g} genre={g} />)}
                  </div>
                  {isHiring && (
                    <div className="flex flex-wrap items-center gap-1 mt-2">
                      <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-md bg-yellow-400/10 text-yellow-400 border border-yellow-400/20">
                        {isEn ? 'Hiring' : 'Üye aranıyor'}
                      </span>
                      {band.looking_for.map((item) => (
                        <span key={item} className="text-[10px] px-1.5 py-0.5 rounded bg-yellow-400/10 text-yellow-400 border border-yellow-400/20">{item}</span>
                      ))}
                    </div>
                  )}
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
