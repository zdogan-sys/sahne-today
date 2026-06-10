'use client'

import { useState } from 'react'
import { Search, Loader2, MapPin, Star, Check, Download } from 'lucide-react'
import { cn } from '@/lib/utils'
import { CITY_OPTIONS, ALL_GENRES } from '@/lib/constants'
import { VENUE_TYPE_LABELS } from '@/lib/utils'

type Result = {
  place_id: string
  name: string
  address: string
  district: string | null
  phone: string | null
  website: string | null
  rating: number | null
  types: string[]
  already_exists: boolean
}

// Hazır arama terimleri — tıklayınca arama terimi + uygun mekan türü birlikte ayarlanır
const PRESET_QUERIES: { q: string; type: string }[] = [
  { q: 'canlı müzik', type: 'live_music' },
  { q: 'rock bar', type: 'live_music' },
  { q: 'jazz bar', type: 'live_music' },
  { q: 'pub', type: 'pub' },
  { q: 'türkü bar', type: 'turku_bar' },
  { q: 'konser mekanı', type: 'live_music' },
  { q: 'sahne', type: 'live_music' },
  { q: 'dans stüdyosu', type: 'dance_studio' },
  { q: 'prova stüdyosu', type: 'studio' },
  { q: 'kayıt stüdyosu', type: 'studio' },
  { q: 'müzik kursu', type: 'music_school' },
]

export function VenueImport() {
  const [city, setCity] = useState('Ankara')
  const [query, setQuery] = useState('canlı müzik')
  const [venueType, setVenueType] = useState('live_music')
  const [genres, setGenres] = useState<string[]>([])
  const [results, setResults] = useState<Result[]>([])
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [searching, setSearching] = useState(false)
  const [importing, setImporting] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  async function search() {
    if (!query.trim()) return
    setSearching(true); setError(''); setMessage(''); setResults([]); setSelected(new Set())
    try {
      const res = await fetch('/api/admin/venues/google', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'search', query: query.trim(), city }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? 'Arama hatası'); setSearching(false); return }
      setResults(data.results ?? [])
      // Sistemde olmayanları otomatik seç
      setSelected(new Set((data.results ?? []).filter((r: Result) => !r.already_exists).map((r: Result) => r.place_id)))
    } catch {
      setError('Arama sırasında hata oluştu')
    }
    setSearching(false)
  }

  function toggle(id: string) {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id); else next.add(id)
      return next
    })
  }

  async function importSelected() {
    const toImport = results.filter(r => selected.has(r.place_id))
    if (!toImport.length) return
    setImporting(true); setError(''); setMessage('')
    try {
      const res = await fetch('/api/admin/venues/google', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'import', venues: toImport, city, venue_type: venueType, genres }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? 'İçe aktarma hatası'); setImporting(false); return }
      setMessage(`${data.imported} yeni mekan eklendi${data.updated ? `, ${data.updated} mevcut mekan güncellendi` : ''}${data.skipped ? `, ${data.skipped} atlandı` : ''}.`)
      if (data.errors?.length) setError(data.errors.join(' · '))
      // Eklenenleri "zaten var" işaretle
      setResults(prev => prev.map(r => selected.has(r.place_id) ? { ...r, already_exists: true } : r))
      setSelected(new Set())
    } catch {
      setError('İçe aktarma sırasında hata oluştu')
    }
    setImporting(false)
  }

  const selectableCount = results.filter(r => !r.already_exists).length

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-bebas text-2xl text-text-primary">Mekan İçe Aktar</h2>
        <p className="text-text-muted text-xs mt-0.5">Google Haritalar'dan mekan ara, seç, veritabanına ekle</p>
      </div>

      {/* Arama formu */}
      <div className="card p-4 space-y-3">
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="label text-xs">Şehir</label>
            <select value={city} onChange={e => setCity(e.target.value)} className="input-field text-sm mt-1">
              {CITY_OPTIONS.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div className="col-span-2">
            <label className="label text-xs">Arama Terimi</label>
            <div className="flex gap-2 mt-1">
              <input value={query} onChange={e => setQuery(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && search()}
                placeholder="canlı müzik, rock bar..." className="input-field text-sm flex-1" />
              <button onClick={search} disabled={searching} className="btn-accent px-4 text-sm disabled:opacity-50 flex items-center gap-1.5">
                {searching ? <Loader2 size={14} className="animate-spin" /> : <Search size={14} />} Ara
              </button>
            </div>
          </div>
        </div>

        {/* Hazır arama terimleri */}
        <div className="flex flex-wrap gap-1.5">
          {PRESET_QUERIES.map(({ q, type }) => (
            <button key={q} onClick={() => { setQuery(q); setVenueType(type) }}
              className={cn('text-[11px] px-2.5 py-1 rounded-full border transition-colors',
                query === q ? 'bg-accent/10 text-accent border-accent/30' : 'text-text-muted border-[rgba(228,224,216,0.1)] hover:text-text-primary')}>
              {q}
            </button>
          ))}
        </div>

        {/* Eklenecek mekan türü */}
        <div className="flex items-center gap-2">
          <label className="label text-xs whitespace-nowrap">Mekan türü:</label>
          <select value={venueType} onChange={e => setVenueType(e.target.value)} className="input-field text-sm w-48">
            {Object.entries(VENUE_TYPE_LABELS).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
          </select>
          <span className="text-text-muted text-[11px]">(hepsi bu türle eklenir, sonra düzenlenebilir)</span>
        </div>

        {/* Müzik türleri (çoklu seçim) */}
        <div>
          <label className="label text-xs mb-1 block">
            Etkinlik Türü <span className="text-text-muted font-normal">(opsiyonel, birkaç seçebilirsin)</span>
            {genres.length > 0 && <span className="text-accent ml-1">· {genres.join(', ')}</span>}
          </label>
          <div className="flex flex-wrap gap-1.5">
            {ALL_GENRES.map(g => (
              <button key={g} type="button"
                onClick={() => setGenres(prev => prev.includes(g) ? prev.filter(x => x !== g) : [...prev, g])}
                className={cn('text-[11px] px-2.5 py-1 rounded-full border transition-colors',
                  genres.includes(g) ? 'bg-accent/10 text-accent border-accent/30' : 'text-text-muted border-[rgba(228,224,216,0.1)] hover:text-text-primary')}>
                {g}
              </button>
            ))}
          </div>
        </div>
      </div>

      {error && <div className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-2">{error}</div>}
      {message && <div className="text-sm text-accent bg-accent/10 border border-accent/20 rounded-lg px-4 py-2">{message}</div>}

      {/* Sonuçlar */}
      {results.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm text-text-muted">
              {results.length} sonuç · <span className="text-accent">{selected.size} seçili</span>
              {selectableCount > 0 && (
                <button onClick={() => setSelected(new Set(results.filter(r => !r.already_exists).map(r => r.place_id)))}
                  className="ml-2 text-accent text-xs hover:underline">tümünü seç</button>
              )}
              {selected.size > 0 && (
                <button onClick={() => setSelected(new Set())} className="ml-2 text-text-muted text-xs hover:underline">temizle</button>
              )}
            </p>
            <button onClick={importSelected} disabled={importing || selected.size === 0}
              className="btn-accent py-2 px-4 text-sm disabled:opacity-50 flex items-center gap-1.5">
              {importing ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
              {selected.size} Mekanı Ekle
            </button>
          </div>

          <div className="space-y-1.5">
            {results.map(r => (
              <button key={r.place_id} type="button"
                onClick={() => !r.already_exists && toggle(r.place_id)}
                disabled={r.already_exists}
                className={cn('w-full text-left card px-4 py-3 flex items-center gap-3 transition-colors',
                  r.already_exists ? 'opacity-40 cursor-default' :
                  selected.has(r.place_id) ? 'border-accent/40 bg-accent/5' : 'hover:border-accent/20'
                )}>
                <div className={cn('w-5 h-5 rounded border flex items-center justify-center flex-shrink-0',
                  selected.has(r.place_id) ? 'bg-accent border-accent' : 'border-[rgba(228,224,216,0.2)]')}>
                  {selected.has(r.place_id) && <Check size={13} className="text-white" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-text-primary text-sm font-medium truncate">{r.name}</p>
                    {r.rating && (
                      <span className="text-[10px] text-yellow-400 flex items-center gap-0.5 flex-shrink-0">
                        <Star size={9} fill="currentColor" /> {r.rating}
                      </span>
                    )}
                    {r.already_exists && <span className="text-[10px] text-green-400 flex-shrink-0">✓ sistemde var</span>}
                  </div>
                  <p className="text-text-muted text-xs truncate flex items-center gap-1 mt-0.5">
                    <MapPin size={10} /> {r.district ? `${r.district} · ` : ''}{r.address}
                  </p>
                  {r.phone && <p className="text-text-muted text-[11px] mt-0.5">{r.phone}</p>}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {results.length === 0 && !searching && (
        <div className="card p-8 text-center text-text-muted text-sm">
          Bir şehir ve arama terimi seç, "Ara"ya bas. Çıkan mekanlardan istediklerini seçip ekle.
        </div>
      )}
    </div>
  )
}
