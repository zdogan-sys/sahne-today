'use client'

import { useState } from 'react'
import Image from 'next/image'
import { Search, UserPlus, Check, SlidersHorizontal } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'

const CITY_OPTIONS = ['İstanbul', 'Ankara', 'İzmir', 'Bursa', 'Antalya', 'Eskişehir', 'Adana', 'Kayseri']
const INSTRUMENT_OPTIONS = ['Gitar', 'Bas', 'Davul', 'Klavye', 'Keman', 'Vokal', 'Saz', 'Flüt', 'Trompet', 'Ud']

interface ArtistResult {
  id: string
  stage_name: string
  instruments: string[]
  city: string | null
  profiles: { avatar_url: string | null } | null
}

interface Props {
  bandId: string
  existingArtistIds: string[]
  onInvited: () => void
}

export function BandInviteSearch({ bandId, existingArtistIds, onInvited }: Props) {
  const [query, setQuery] = useState('')
  const [city, setCity] = useState('')
  const [instrument, setInstrument] = useState('')
  const [lfbOnly, setLfbOnly] = useState(false)
  const [results, setResults] = useState<ArtistResult[]>([])
  const [searched, setSearched] = useState(false)
  const [inviting, setInviting] = useState<string | null>(null)
  const [justInvited, setJustInvited] = useState<string[]>([])
  const supabase = createClient()

  async function search() {
    let q = supabase
      .from('artists')
      .select('id, stage_name, instruments, city, profiles(avatar_url)')
      .limit(10)

    if (query.trim().length >= 2) q = q.ilike('stage_name', `%${query.trim()}%`)
    if (city) q = q.eq('city', city)
    if (instrument) q = q.contains('instruments', [instrument])
    if (lfbOnly) q = q.eq('looking_for_band', true)

    const { data } = await q
    setResults((data as any[]) ?? [])
    setSearched(true)
  }

  async function invite(artist: ArtistResult) {
    setInviting(artist.id)
    const { error } = await supabase.from('band_members').insert({
      band_id: bandId,
      artist_id: artist.id,
      status: 'invited',
    } as any)
    if (!error) {
      setJustInvited((prev) => [...prev, artist.id])
      onInvited()
    }
    setInviting(null)
  }

  const isAlready = (id: string) => existingArtistIds.includes(id) || justInvited.includes(id)

  return (
    <div className="mt-3 pt-3 border-t border-[rgba(228,224,216,0.08)] space-y-2.5">
      {/* Name search */}
      <div className="relative">
        <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && search()}
          placeholder="Sanatçı adı (opsiyonel)"
          className="input-field pl-8 text-sm"
        />
      </div>

      {/* Filters row */}
      <div className="flex gap-2">
        <select
          value={city}
          onChange={(e) => setCity(e.target.value)}
          className="input-field text-sm flex-1"
        >
          <option value="">Tüm şehirler</option>
          {CITY_OPTIONS.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <select
          value={instrument}
          onChange={(e) => setInstrument(e.target.value)}
          className="input-field text-sm flex-1"
        >
          <option value="">Tüm enstrümanlar</option>
          {INSTRUMENT_OPTIONS.map((i) => <option key={i} value={i}>{i}</option>)}
        </select>
      </div>

      {/* LFB toggle */}
      <label className="flex items-center gap-2 cursor-pointer select-none">
        <div
          onClick={() => setLfbOnly(!lfbOnly)}
          className={cn(
            'w-9 h-5 rounded-full relative transition-colors flex-shrink-0',
            lfbOnly ? 'bg-accent' : 'bg-[rgba(228,224,216,0.15)]'
          )}
        >
          <span className={cn(
            'absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform',
            lfbOnly ? 'translate-x-4' : 'translate-x-0.5'
          )} />
        </div>
        <span className="text-xs text-text-muted">Sadece grup arayanları göster</span>
      </label>

      <button
        type="button"
        onClick={search}
        className="btn-outline w-full text-sm py-2 flex items-center justify-center gap-2"
      >
        <SlidersHorizontal size={13} />
        Filtrele
      </button>

      {/* Results */}
      {searched && results.length === 0 && (
        <p className="text-text-muted text-xs text-center py-2">Sonuç bulunamadı.</p>
      )}
      {results.length > 0 && (
        <div className="space-y-1.5">
          {results.map((artist) => {
            const already = isAlready(artist.id)
            const loading = inviting === artist.id
            return (
              <div key={artist.id} className="flex items-center justify-between gap-2 p-2.5 bg-[rgba(228,224,216,0.04)] rounded-lg">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-8 h-8 rounded-full overflow-hidden bg-accent/10 flex items-center justify-center flex-shrink-0 text-accent text-xs font-bold">
                    {artist.profiles?.avatar_url ? (
                      <Image src={artist.profiles.avatar_url} alt={artist.stage_name} width={32} height={32} className="object-cover w-full h-full" />
                    ) : artist.stage_name[0]}
                  </div>
                  <div className="min-w-0">
                    <p className="text-text-primary text-sm font-medium truncate">{artist.stage_name}</p>
                    <p className="text-text-muted text-xs truncate">
                      {artist.instruments?.slice(0, 3).join(', ')}{artist.city ? ` · ${artist.city}` : ''}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => !already && !loading && invite(artist)}
                  disabled={already || loading}
                  className={cn(
                    'flex items-center gap-1 text-xs px-2.5 py-1 rounded-md transition-colors flex-shrink-0 disabled:cursor-default',
                    already ? 'text-success bg-success/10' : 'text-accent bg-accent/10 hover:bg-accent/20'
                  )}
                >
                  {already ? (
                    <><Check size={11} />Gönderildi</>
                  ) : loading ? (
                    'Gönderiliyor...'
                  ) : (
                    <><UserPlus size={11} />Davet Et</>
                  )}
                </button>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
