'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@supabase/supabase-js'
import { Plus, Trash2, RefreshCw, Check, X, Loader2, Instagram, ExternalLink, Ticket } from 'lucide-react'
import { cn } from '@/lib/utils'
import { CITY_OPTIONS } from '@/lib/constants'
import { VenueInstagramTools } from '@/components/admin/VenueInstagramTools'

function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

type Source = {
  id: string
  username: string
  instagram_url: string
  city: string | null
  is_active: boolean
  last_checked_at: string | null
  last_error: string | null
}

type Draft = {
  id: string
  source_username: string
  post_url: string
  caption: string | null
  extracted: {
    title?: string
    performer?: string
    date?: string | null
    time?: string | null
    description?: string
    image?: string | null
  } | null
  status: 'pending' | 'approved' | 'skipped'
  created_at: string
}

// Bir haftagününün (0=Paz..6=Cmt) önümüzdeki en yakın tarihini ISO döner
function nextDateOfWeekday(wd: number): string {
  const base = new Date()
  const diff = (wd - base.getDay() + 7) % 7
  const d = new Date(base); d.setDate(base.getDate() + diff)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

// JS getDay() değerleri: 0=Pazar .. 6=Cumartesi
const WEEKDAYS = [
  { v: 1, l: 'Her Pazartesi' },
  { v: 2, l: 'Her Salı' },
  { v: 3, l: 'Her Çarşamba' },
  { v: 4, l: 'Her Perşembe' },
  { v: 5, l: 'Her Cuma' },
  { v: 6, l: 'Her Cumartesi' },
  { v: 0, l: 'Her Pazar' },
]

export function InstagramScanner() {
  const [sources, setSources] = useState<Source[]>([])
  const [drafts, setDrafts] = useState<Draft[]>([])
  const [loading, setLoading] = useState(true)
  const [scanning, setScanning] = useState(false)
  const [scanResult, setScanResult] = useState<string | null>(null)
  const [newUrl, setNewUrl] = useState('')
  const [newCity, setNewCity] = useState('Ankara')
  const [adding, setAdding] = useState(false)
  const [showAdd, setShowAdd] = useState(false)
  const [processingId, setProcessingId] = useState<string | null>(null)
  const [edits, setEdits] = useState<Record<string, { date?: string; time?: string; weekday?: number | null }>>({})

  // Bir taslağın geçerli tarih/saat/tekrar değerleri.
  // Varsayılan TEK SEFERLİK (AI tekrar tahmini otomatik uygulanmaz — çoğu yanlış pozitif).
  // AI sadece bir gün verdiyse (tarih yoksa) tek seferlik için o günün en yakın tarihini öneririz.
  function effOf(d?: Draft) {
    const e = d ? edits[d.id] : undefined
    const ex: any = d?.extracted ?? {}
    const suggestedDate = ex.date || (typeof ex.weekday === 'number' ? nextDateOfWeekday(ex.weekday) : '')
    return {
      date: e?.date ?? suggestedDate,
      time: e?.time ?? ex.time ?? '',
      weekday: e && 'weekday' in e ? (e.weekday ?? null) : null,
    }
  }

  const load = useCallback(async () => {
    const admin = adminClient()
    const [srcRes, draftRes] = await Promise.all([
      admin.from('instagram_sources').select('*').order('city').order('username'),
      admin.from('event_drafts').select('*').eq('status', 'pending').order('created_at', { ascending: false }).limit(50),
    ])
    setSources((srcRes.data ?? []) as Source[])
    setDrafts((draftRes.data ?? []) as Draft[])
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  async function scanAll() {
    setScanning(true)
    setScanResult(null)
    try {
      const res = await fetch('/api/admin/instagram/scan', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({}) })
      const data = await res.json().catch(() => null)
      if (!res.ok || !data) {
        setScanResult(`Tarama hatası (${res.status}). Çok kaynak varsa parça parça tarayın.`)
      } else {
        const more = data.remaining > 0 ? ` ${data.remaining} kaynak kaldı — tekrar "Şimdi Tara" deyin.` : ''
        setScanResult(`${data.scanned} kaynak tarandı, ${data.drafts} yeni taslak.${more}`)
      }
      await load()
    } catch {
      setScanResult('Tarama sırasında hata oluştu (zaman aşımı olabilir).')
    }
    setScanning(false)
  }

  async function scanOne(sourceId: string) {
    setScanning(true)
    setScanResult(null)
    try {
      const res = await fetch('/api/admin/instagram/scan', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ source_id: sourceId }) })
      const data = await res.json()
      setScanResult(`${data.drafts} yeni taslak oluşturuldu.`)
      await load()
    } catch {
      setScanResult('Tarama hatası.')
    }
    setScanning(false)
  }

  async function addSource() {
    if (!newUrl.trim()) return
    setAdding(true)
    await fetch('/api/admin/instagram/drafts', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'add', url: newUrl.trim(), city: newCity || null }) })
    setNewUrl('')
    setShowAdd(false)
    setAdding(false)
    await load()
  }

  // Tek seferlik: önceden 'free' kaydedilmiş taranan etkinlikleri 'Kapıda Öde' yap
  async function fixEntryTypes() {
    if (!confirm('Taranan (performer\'lı) ücretsiz etkinlikler "Kapıda Öde" olarak güncellenecek. Devam?')) return
    setScanning(true); setScanResult(null)
    try {
      const res = await fetch('/api/admin/instagram/drafts', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'fix_entry_types' }) })
      const data = await res.json().catch(() => ({}))
      setScanResult(res.ok ? `${data.updated ?? 0} etkinlik "Kapıda Öde" yapıldı.` : (data.error ?? 'Hata'))
    } catch { setScanResult('Güncelleme sırasında hata oluştu.') }
    setScanning(false)
  }

  async function toggleSource(id: string, current: boolean) {
    await fetch('/api/admin/instagram/drafts', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'toggle', id, is_active: !current }) })
    await load()
  }

  async function deleteSource(id: string) {
    if (!confirm('Bu kaynağı silmek istediğinizden emin misiniz?')) return
    await fetch('/api/admin/instagram/drafts', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'delete', id }) })
    await load()
  }

  async function updateDraft(id: string, status: 'approved' | 'skipped') {
    if (processingId) return
    setProcessingId(id); setScanResult(null)
    const eff = effOf(drafts.find(x => x.id === id))
    try {
      const res = await fetch('/api/admin/instagram/drafts', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, status, date: eff.date || undefined, time: eff.time || undefined, weekday: eff.weekday ?? undefined }) })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) { setScanResult(data.error ?? 'İşlem başarısız oldu.'); return }
      setDrafts(prev => prev.filter(d => d.id !== id))
      if (status === 'approved') setScanResult(`${data.created ?? 1} etkinlik oluşturuldu ✓`)
    } catch {
      setScanResult('Bağlantı hatası — tekrar deneyin.')
    } finally {
      setProcessingId(null)
    }
  }

  if (loading) return <div className="flex justify-center py-12"><Loader2 size={20} className="animate-spin text-accent" /></div>

  const byCity = sources.reduce<Record<string, Source[]>>((acc, s) => {
    const c = s.city ?? 'Diğer'
    acc[c] = [...(acc[c] ?? []), s]
    return acc
  }, {})

  return (
    <div className="space-y-8">
      {/* Mekan Instagram linklerini doldurma araçları */}
      <VenueInstagramTools />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-bebas text-2xl text-text-primary">Instagram Tarayıcı</h2>
          <p className="text-text-muted text-xs mt-0.5">Takip edilen hesaplar otomatik taranır, etkinlikler sana gelir</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setShowAdd(!showAdd)} className="btn-outline py-2 px-3 text-sm flex items-center gap-1.5">
            <Plus size={14} /> Hesap Ekle
          </button>
          <button onClick={fixEntryTypes} disabled={scanning} className="btn-outline py-2 px-3 text-sm flex items-center gap-1.5 disabled:opacity-50" title="Taranan ücretsiz etkinlikleri Kapıda Öde yap (tek seferlik)">
            <Ticket size={14} /> Ücretleri Düzelt
          </button>
          <button onClick={scanAll} disabled={scanning} className="btn-accent py-2 px-3 text-sm flex items-center gap-1.5 disabled:opacity-50">
            {scanning ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
            Şimdi Tara
          </button>
        </div>
      </div>

      {scanResult && (
        <div className="text-sm text-accent bg-accent/10 border border-accent/20 rounded-lg px-4 py-2">{scanResult}</div>
      )}

      {/* Add form */}
      {showAdd && (
        <div className="card p-4 space-y-3">
          <p className="text-sm text-text-primary font-medium">Yeni hesap ekle</p>
          <div className="flex gap-2">
            <input
              value={newUrl}
              onChange={e => setNewUrl(e.target.value)}
              placeholder="https://www.instagram.com/hesap/"
              className="input-field flex-1 text-sm"
            />
            <select value={newCity} onChange={e => setNewCity(e.target.value)} className="input-field text-sm w-36">
              <option value="">Şehir seç</option>
              {CITY_OPTIONS.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <button onClick={addSource} disabled={adding || !newUrl.trim()} className="btn-accent px-4 text-sm disabled:opacity-50">
              {adding ? <Loader2 size={14} className="animate-spin" /> : 'Ekle'}
            </button>
          </div>
        </div>
      )}

      {/* Sources */}
      <div className="space-y-4">
        {Object.entries(byCity).map(([city, citySources]) => (
          <div key={city}>
            <p className="text-xs text-text-muted font-medium mb-2 uppercase tracking-wide">{city}</p>
            <div className="space-y-1.5">
              {citySources.map(src => (
                <div key={src.id} className={cn('card px-4 py-3 flex items-center gap-3', !src.is_active && 'opacity-50')}>
                  <Instagram size={14} className="text-pink-400 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <a href={src.instagram_url} target="_blank" rel="noopener noreferrer"
                        className="text-sm text-text-primary hover:text-accent transition-colors flex items-center gap-1">
                        @{src.username} <ExternalLink size={10} />
                      </a>
                    </div>
                    {src.last_error && <p className="text-[10px] text-red-400 mt-0.5 truncate">{src.last_error}</p>}
                    {src.last_checked_at && !src.last_error && (
                      <p className="text-[10px] text-text-muted mt-0.5">
                        Son tarama: {new Date(src.last_checked_at).toLocaleString('tr-TR')}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <button onClick={() => scanOne(src.id)} disabled={scanning} title="Bu hesabı tara"
                      className="p-1.5 text-text-muted hover:text-accent transition-colors disabled:opacity-40">
                      <RefreshCw size={13} />
                    </button>
                    <button onClick={() => toggleSource(src.id, src.is_active)}
                      className={cn('text-xs px-2 py-1 rounded border transition-colors', src.is_active
                        ? 'text-accent border-accent/30 hover:bg-accent/10'
                        : 'text-text-muted border-[rgba(228,224,216,0.1)] hover:text-text-primary')}>
                      {src.is_active ? 'Aktif' : 'Pasif'}
                    </button>
                    <button onClick={() => deleteSource(src.id)}
                      className="p-1.5 text-text-muted hover:text-red-400 transition-colors">
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Drafts */}
      <div>
        <h3 className="font-bebas text-xl text-text-primary mb-3">
          Onay Bekleyen Taslaklar
          {drafts.length > 0 && <span className="text-accent ml-2">{drafts.length}</span>}
        </h3>

        {drafts.length === 0 ? (
          <div className="card p-8 text-center text-text-muted text-sm">
            Bekleyen taslak yok. "Şimdi Tara" ile yeni etkinlikleri kontrol edebilirsin.
          </div>
        ) : (
          <div className="space-y-3">
            {drafts.map(draft => (
              <div key={draft.id} className="card p-4">
                <div className="flex items-start justify-between gap-3">
                  {draft.extracted?.image && (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img src={draft.extracted.image} alt="" referrerPolicy="no-referrer" className="w-16 h-16 rounded-lg object-cover flex-shrink-0 border border-[rgba(228,224,216,0.1)]" />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs text-text-muted">@{draft.source_username}</span>
                      <span className="text-[10px] text-text-muted">·</span>
                      <span className="text-[10px] text-text-muted">{new Date(draft.created_at).toLocaleDateString('tr-TR')}</span>
                    </div>
                    {draft.extracted && (
                      <div className="space-y-0.5">
                        {draft.extracted.title && (
                          <p className="text-sm font-medium text-text-primary">{draft.extracted.title}</p>
                        )}
                        {draft.extracted.performer && (
                          <p className="text-xs text-accent">{draft.extracted.performer}</p>
                        )}
                        {(() => {
                          const ef = effOf(draft)
                          const inputCls = 'bg-surface border border-[rgba(228,224,216,0.15)] rounded px-2 py-1 text-xs text-text-primary'
                          return (
                            <div className="flex flex-wrap items-center gap-2 mt-1">
                              <select value={ef.weekday === null ? '' : String(ef.weekday)}
                                onChange={(ev) => setEdits(p => ({ ...p, [draft.id]: { ...p[draft.id], weekday: ev.target.value === '' ? null : Number(ev.target.value) } }))}
                                className={inputCls}>
                                <option value="">Tek seferlik</option>
                                {WEEKDAYS.map(w => <option key={w.v} value={w.v}>{w.l}</option>)}
                              </select>
                              {ef.weekday === null && (
                                <input type="date" value={ef.date}
                                  onChange={(ev) => setEdits(p => ({ ...p, [draft.id]: { ...p[draft.id], date: ev.target.value } }))}
                                  className={inputCls} />
                              )}
                              <input type="time" value={ef.time}
                                onChange={(ev) => setEdits(p => ({ ...p, [draft.id]: { ...p[draft.id], time: ev.target.value } }))}
                                className={inputCls} />
                              {ef.weekday === null && !ef.date && <span className="text-[10px] text-amber-400">tarih gir →</span>}
                              {ef.weekday !== null && <span className="text-[10px] text-accent">önümüzdeki 4 hafta oluşturulur</span>}
                            </div>
                          )
                        })()}
                        {draft.extracted.description && (
                          <p className="text-xs text-text-muted mt-1">{draft.extracted.description}</p>
                        )}
                      </div>
                    )}
                    {draft.caption && (
                      <details className="mt-2">
                        <summary className="text-[10px] text-text-muted cursor-pointer hover:text-text-primary">Ham içerik gör</summary>
                        <p className="text-[10px] text-text-muted mt-1 whitespace-pre-wrap">{draft.caption}</p>
                      </details>
                    )}
                    <a href={draft.post_url} target="_blank" rel="noopener noreferrer"
                      className="text-[10px] text-accent hover:underline flex items-center gap-0.5 mt-1">
                      Instagram'da gör <ExternalLink size={9} />
                    </a>
                  </div>
                  <div className="flex gap-2 flex-shrink-0">
                    <button onClick={() => updateDraft(draft.id, 'approved')} disabled={processingId !== null}
                      className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg bg-green-500/10 text-green-400 border border-green-500/20 hover:bg-green-500/20 transition-colors disabled:opacity-40">
                      {processingId === draft.id ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />} Kaydet
                    </button>
                    <button onClick={() => updateDraft(draft.id, 'skipped')} disabled={processingId !== null}
                      className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg bg-[rgba(228,224,216,0.04)] text-text-muted border border-[rgba(228,224,216,0.1)] hover:text-red-400 transition-colors disabled:opacity-40">
                      <X size={12} /> Atla
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
