import { useState, useEffect } from 'react'
import Image from 'next/image'
import { Search, UserPlus, Check } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'
import { inviteToBand } from '@/app/actions/band'
import { CITY_OPTIONS, INSTRUMENT_OPTIONS } from '@/lib/constants'

interface ArtistResult {
  id: string
  stage_name: string
  instruments: string[]
  city: string | null
  profiles: { avatar_url: string | null } | null
}

interface Props {
  bandId: string
  existingMembers?: { artist_id: string; status: string; role: string | null }[]
  onInvited?: () => void
}

export function BandInviteSearch({ bandId, existingMembers = [], onInvited }: Props) {
  const [query, setQuery] = useState('')
  const [city, setCity] = useState('')
  const [instrument, setInstrument] = useState('')
  const [lfbOnly, setLfbOnly] = useState(true)
  const [results, setResults] = useState<ArtistResult[]>([])
  const [searched, setSearched] = useState(false)
  const [loading, setLoading] = useState(false)
  const [inviting, setInviting] = useState<string | null>(null)
  const [justInvited, setJustInvited] = useState<string[]>([])
  const supabase = createClient()

  useEffect(() => {
    const timer = setTimeout(() => {
      search()
    }, 300)
    return () => clearTimeout(timer)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, city, instrument, lfbOnly])

  async function search() {
    setLoading(true)
    let q = supabase
      .from('artists')
      .select('id, stage_name, instruments, city, profiles(avatar_url)')
      .limit(10)

    if (query.trim().length >= 2) {
      q = q.ilike('stage_name', `%${query.trim()}%`)
    } else if (query.trim().length === 1) {
      setLoading(false)
      setResults([])
      setSearched(true)
      return
    }

    if (city) q = q.eq('city', city)
    if (instrument) q = q.contains('instruments', [instrument])
    if (lfbOnly) q = q.eq('looking_for_band', true)

    const { data } = await q
    setResults((data as any[]) ?? [])
    setSearched(true)
    setLoading(false)
  }

  async function invite(artist: ArtistResult) {
    setInviting(artist.id)
    const res = await inviteToBand(bandId, artist.id)
    
    if (res.success) {
      setJustInvited((prev) => [...prev, artist.id])
      if (onInvited) onInvited()
    } else {
      console.error('Invite error:', res.error)
      alert('Davet gönderilirken bir hata oluştu: ' + res.error)
    }
    setInviting(null)
  }

  function getArtistState(id: string) {
    if (justInvited.includes(id)) return { text: 'Davet Edildi', color: 'text-success bg-success/10' }
    
    const mem = existingMembers.find(m => m.artist_id === id)
    if (!mem) return null

    if (mem.status === 'accepted') return { text: 'Grup Üyesi', color: 'text-success bg-success/10' }
    if (mem.status === 'invited') {
      if (mem.role === 'Applicant') return { text: 'Başvurdu', color: 'text-yellow-400 bg-yellow-400/10' }
      return { text: 'Davet Edildi', color: 'text-success bg-success/10' }
    }
    if (mem.status === 'declined') return { text: 'Reddedildi', color: 'text-red-400 bg-red-400/10' }
    
    return null
  }

  return (
    <div className="space-y-2.5">
      <div className="relative">
        <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Sanatçı adı (opsiyonel)"
          className="input-field pl-8 text-sm"
        />
      </div>

      <div className="flex gap-2">
        <select value={city} onChange={(e) => setCity(e.target.value)} className="input-field text-sm flex-1">
          <option value="">Tüm şehirler</option>
          {CITY_OPTIONS.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <select value={instrument} onChange={(e) => setInstrument(e.target.value)} className="input-field text-sm flex-1">
          <option value="">Tüm enstrümanlar</option>
          {INSTRUMENT_OPTIONS.map((i) => <option key={i} value={i}>{i}</option>)}
        </select>
      </div>

      <label className="flex items-center gap-2 cursor-pointer select-none">
        <div onClick={() => setLfbOnly(!lfbOnly)} className={cn('w-9 h-5 rounded-full relative transition-colors flex-shrink-0', lfbOnly ? 'bg-accent' : 'bg-[rgba(228,224,216,0.15)]')}>
          <span className={cn('absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform', lfbOnly ? 'translate-x-4' : 'translate-x-0.5')} />
        </div>
        <span className="text-xs text-text-muted">Sadece grup arayanları göster</span>
      </label>

      {loading && <p className="text-text-muted text-xs text-center py-2">Aranıyor...</p>}
      {!loading && searched && results.length === 0 && <p className="text-text-muted text-xs text-center py-2">Sonuç bulunamadı.</p>}
      
      {results.length > 0 && (
        <div className="space-y-1.5">
          {results.map((artist) => {
            const state = getArtistState(artist.id)
            const isLoading = inviting === artist.id
            const disabled = (state && state.text !== 'Reddedildi') || isLoading

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
                  onClick={() => !disabled && invite(artist)}
                  disabled={disabled}
                  className={cn(
                    'flex items-center gap-1 text-xs px-2.5 py-1 rounded-md transition-colors flex-shrink-0 disabled:cursor-default',
                    state ? state.color : 'text-accent bg-accent/10 hover:bg-accent/20',
                    state && state.text === 'Reddedildi' ? 'hover:bg-red-400/20 cursor-pointer' : ''
                  )}
                >
                  {state ? (
                    state.text === 'Reddedildi' ? <><UserPlus size={11} />Tekrar Davet Et</> : <><Check size={11} />{state.text}</>
                  ) : isLoading ? (
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
