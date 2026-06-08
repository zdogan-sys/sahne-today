'use client'

import { useState } from 'react'
import { Loader2, Search, Check } from 'lucide-react'
import { cn } from '@/lib/utils'
import { CITY_OPTIONS } from '@/lib/constants'

type Cand = { id: string; name: string; city: string; instagram: string }

export function VenueInstagramTools() {
  const [city, setCity] = useState('Ankara')
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [backfilling, setBackfilling] = useState(false)
  const [guessing, setGuessing] = useState(false)
  const [cands, setCands] = useState<Cand[]>([])
  const [sel, setSel] = useState<Set<string>>(new Set())
  const [applying, setApplying] = useState(false)

  async function post(body: any) {
    const res = await fetch('/api/admin/venues/google', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
    })
    return { ok: res.ok, data: await res.json() }
  }

  async function backfill() {
    if (!confirm('Websitesi olup Instagram\'ı olmayan mekanlar taranıp Instagram linkleri doldurulacak. Devam?')) return
    setBackfilling(true); setError(''); setMessage('')
    try {
      const { ok, data } = await post({ action: 'backfill_instagram' })
      if (!ok) { setError(data.error ?? 'Hata'); setBackfilling(false); return }
      setMessage(`${data.checked} mekan kontrol edildi, ${data.updated} tanesine Instagram eklendi.`)
    } catch { setError('Backfill sırasında hata oluştu') }
    setBackfilling(false)
  }

  async function guess() {
    setGuessing(true); setError(''); setMessage(''); setCands([]); setSel(new Set())
    try {
      const { ok, data } = await post({ action: 'guess_instagram', city })
      if (!ok) { setError(data.error ?? 'Hata'); setGuessing(false); return }
      setCands(data.candidates ?? [])
      setSel(new Set((data.candidates ?? []).map((c: Cand) => c.id)))
      if (!data.candidates?.length) {
        setMessage(`${data.scanned} mekan tarandı, tahmin bulunamadı.` + (data.debug ? ' Tanı: ' + JSON.stringify(data.debug) : ''))
      }
    } catch { setError('Tahmin sırasında hata oluştu') }
    setGuessing(false)
  }

  async function apply() {
    const items = cands.filter(c => sel.has(c.id)).map(c => ({ id: c.id, instagram: c.instagram }))
    if (!items.length) return
    setApplying(true); setError('')
    try {
      const { ok, data } = await post({ action: 'apply_instagram', items })
      if (!ok) { setError(data.error ?? 'Hata'); setApplying(false); return }
      setMessage(`${data.updated} mekana Instagram eklendi.`)
      setCands([]); setSel(new Set())
    } catch { setError('Kaydetme sırasında hata oluştu') }
    setApplying(false)
  }

  return (
    <div className="card p-4 space-y-3 mb-6">
      <div>
        <h3 className="font-bebas text-xl text-text-primary">Mekan Instagram Linklerini Doldur</h3>
        <p className="text-text-muted text-xs mt-0.5">Tarayıcının düzgün çalışması için mekanların Instagram adresleri gerekir</p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <select value={city} onChange={e => setCity(e.target.value)} className="input-field text-sm w-36">
          {CITY_OPTIONS.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <button onClick={guess} disabled={guessing}
          className="btn-accent py-2 px-3 text-sm flex items-center gap-1.5 disabled:opacity-50">
          {guessing ? <Loader2 size={14} className="animate-spin" /> : <Search size={14} />} İsimden IG Tahmin Et
        </button>
        <button onClick={backfill} disabled={backfilling}
          className="btn-outline py-2 px-3 text-sm flex items-center gap-1.5 disabled:opacity-50">
          {backfilling ? <Loader2 size={14} className="animate-spin" /> : <Search size={14} />} Website'ten IG Doldur
        </button>
      </div>

      {error && <p className="text-red-400 text-xs break-all">{error}</p>}
      {message && <p className="text-accent text-xs break-all">{message}</p>}

      {cands.length > 0 && (
        <div className="border border-accent/20 rounded-lg p-3 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm text-text-primary font-medium">{cands.length} tahmin · {sel.size} seçili</p>
            <button onClick={apply} disabled={applying || sel.size === 0}
              className="btn-accent py-1.5 px-3 text-sm disabled:opacity-50 flex items-center gap-1.5">
              {applying ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />} {sel.size} Kaydet
            </button>
          </div>
          <p className="text-[11px] text-text-muted">Her linke tıklayıp doğru hesap mı kontrol et, yanlışların işaretini kaldır.</p>
          <div className="space-y-1.5">
            {cands.map(c => (
              <div key={c.id} className="flex items-center gap-3 py-1">
                <button type="button" onClick={() => setSel(prev => { const n = new Set(prev); n.has(c.id) ? n.delete(c.id) : n.add(c.id); return n })}
                  className={cn('w-5 h-5 rounded border flex items-center justify-center flex-shrink-0',
                    sel.has(c.id) ? 'bg-accent border-accent' : 'border-[rgba(228,224,216,0.2)]')}>
                  {sel.has(c.id) && <Check size={13} className="text-white" />}
                </button>
                <span className="text-sm text-text-primary flex-1 min-w-0 truncate">{c.name}</span>
                <a href={c.instagram} target="_blank" rel="noopener noreferrer"
                  className="text-xs text-accent hover:underline truncate max-w-[45%]">
                  {c.instagram.replace('https://www.instagram.com/', '@').replace(/\/$/, '')}
                </a>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
