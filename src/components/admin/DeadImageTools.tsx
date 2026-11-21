'use client'

import { useState } from 'react'
import { Loader2, Search, Check, ImageOff } from 'lucide-react'
import { cn } from '@/lib/utils'

type Match = { place_id: string; name: string; address: string; photo_name: string }
type DeadVenue = { id: string; name: string; city: string | null; match: Match | null; error?: string }

// Eski (silinmiş) Supabase projesine işaret eden ölü görsel linklerini onarır:
// fotoğrafı ölü mekanlara Google Places fotoğrafı önerir, kalan ölü linkleri boşaltır.
export function DeadImageTools() {
  const [loading, setLoading] = useState(false)
  const [applying, setApplying] = useState(false)
  const [counts, setCounts] = useState<Record<string, number> | null>(null)
  const [venues, setVenues] = useState<DeadVenue[]>([])
  const [sel, setSel] = useState<Set<string>>(new Set())
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  async function post(body: any) {
    const res = await fetch('/api/admin/venues/google', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
    })
    return { ok: res.ok, data: await res.json().catch(() => ({})) }
  }

  async function preview() {
    setLoading(true); setError(''); setMessage('')
    try {
      const { ok, data } = await post({ action: 'dead_images_preview' })
      if (!ok) { setError(data.error ?? 'Hata'); return }
      setCounts(data.counts ?? {})
      setVenues(data.venues ?? [])
      setSel(new Set((data.venues ?? []).filter((v: DeadVenue) => v.match).map((v: DeadVenue) => v.id)))
    } catch { setError('Önizleme sırasında hata oluştu') }
    finally { setLoading(false) }
  }

  async function apply() {
    const total = Object.values(counts ?? {}).reduce((a, b) => a + b, 0)
    if (!confirm(`${sel.size} mekana Google fotoğrafı yüklenecek, kalan ${total} ölü görsel linki boşaltılacak. Devam?`)) return
    setApplying(true); setError('')
    try {
      const photos = venues.filter(v => v.match && sel.has(v.id)).map(v => ({ id: v.id, place_id: v.match!.place_id, photo_name: v.match!.photo_name }))
      const { ok, data } = await post({ action: 'dead_images_apply', photos })
      if (!ok) { setError(data.error ?? 'Hata'); return }
      const cleared = Object.values(data.cleared ?? {}).reduce((a: number, b: any) => a + Number(b), 0)
      setMessage(`${data.photosSet ?? 0} mekana Google fotoğrafı yüklendi, ${cleared} ölü link boşaltıldı.`)
      setCounts(null); setVenues([]); setSel(new Set())
    } catch { setError('Uygulama sırasında hata oluştu') }
    finally { setApplying(false) }
  }

  const total = counts ? Object.values(counts).reduce((a, b) => a + b, 0) : 0

  return (
    <div className="card p-4 space-y-3 mb-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-bebas text-xl text-text-primary flex items-center gap-2"><ImageOff size={16} /> Kırık Görselleri Onar</h3>
          <p className="text-text-muted text-xs mt-0.5">Silinmiş eski Supabase projesine işaret eden görseller. Mekanlara Google fotoğrafı önerilir, kalanlar boşaltılır.</p>
        </div>
        <button onClick={preview} disabled={loading || applying}
          className="btn-outline py-2 px-3 text-sm flex items-center gap-1.5 disabled:opacity-50 flex-shrink-0">
          {loading ? <Loader2 size={14} className="animate-spin" /> : <Search size={14} />} Tara
        </button>
      </div>

      {counts && (
        <div className="text-xs text-text-muted flex flex-wrap gap-x-4 gap-y-1">
          {Object.entries(counts).map(([k, n]) => <span key={k}>{k}: <span className={n ? 'text-amber-400' : ''}>{n}</span></span>)}
        </div>
      )}

      {venues.length > 0 && (
        <div className="space-y-1.5">
          {venues.map(v => (
            <label key={v.id} className={cn('flex items-start gap-2 text-xs rounded px-2 py-1.5 border border-[rgba(228,224,216,0.08)]', !v.match && 'opacity-60')}>
              <input type="checkbox" disabled={!v.match} checked={sel.has(v.id)}
                onChange={() => setSel(p => { const n = new Set(p); if (n.has(v.id)) n.delete(v.id); else n.add(v.id); return n })}
                className="mt-0.5" />
              <span className="flex-1 min-w-0">
                <span className="text-text-primary">{v.name}</span>{v.city && <span className="text-text-muted"> · {v.city}</span>}
                <span className="block text-text-muted truncate">
                  {v.match ? `→ ${v.match.name} — ${v.match.address}` : (v.error ?? 'Google\'da eşleşen fotoğraf bulunamadı (fotoğraf boşaltılacak)')}
                </span>
              </span>
            </label>
          ))}
        </div>
      )}

      {counts && total > 0 && (
        <button onClick={apply} disabled={applying}
          className="btn-accent py-2 px-3 text-sm flex items-center gap-1.5 disabled:opacity-50">
          {applying ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />} Uygula ({sel.size} fotoğraf + temizlik)
        </button>
      )}
      {counts && total === 0 && <p className="text-xs text-green-400">Ölü görsel linki kalmadı.</p>}
      {message && <p className="text-sm text-accent">{message}</p>}
      {error && <p className="text-sm text-red-400">{error}</p>}
    </div>
  )
}
