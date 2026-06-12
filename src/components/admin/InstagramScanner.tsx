'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@supabase/supabase-js'
import { RefreshCw, Check, X, Loader2, Instagram, ExternalLink, Ticket, Bug } from 'lucide-react'
import { cn } from '@/lib/utils'
import { MUSIC_GENRES, STAGE_GENRES, DANCE_OPTIONS } from '@/lib/constants'
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
  { v: 1, s: 'Pzt' },
  { v: 2, s: 'Sal' },
  { v: 3, s: 'Çar' },
  { v: 4, s: 'Per' },
  { v: 5, s: 'Cum' },
  { v: 6, s: 'Cmt' },
  { v: 0, s: 'Paz' },
]

export function InstagramScanner() {
  const [sources, setSources] = useState<Source[]>([])
  const [drafts, setDrafts] = useState<Draft[]>([])
  const [loading, setLoading] = useState(true)
  const [scanning, setScanning] = useState(false)
  const [scanResult, setScanResult] = useState<string | null>(null)
  const [processingId, setProcessingId] = useState<string | null>(null)
  const [edits, setEdits] = useState<Record<string, { date?: string; time?: string; weekdays?: number[]; performer?: string; genre?: string }>>({})
  const [tab, setTab] = useState<'sources' | 'drafts'>('sources')
  const [errorById, setErrorById] = useState<Record<string, string>>({})
  const [debugResult, setDebugResult] = useState<{ id: string; data: any } | null>(null)

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
      weekdays: e && 'weekdays' in e ? (e.weekdays ?? []) : [],
      performer: e?.performer ?? ex.performer ?? '',
      genre: e?.genre ?? ex.genre ?? '',
    }
  }

  const load = useCallback(async () => {
    const admin = adminClient()
    const [srcRes, draftRes] = await Promise.all([
      admin.from('instagram_sources').select('*').order('city').order('username'),
      admin.from('event_drafts').select('*').eq('status', 'pending').order('created_at', { ascending: false }).limit(2000),
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

  async function debugOne(sourceId: string) {
    setScanning(true); setScanResult(null); setDebugResult(null)
    try {
      const res = await fetch('/api/admin/instagram/scan', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ source_id: sourceId, debug: true }) })
      const data = await res.json()
      setDebugResult({ id: sourceId, data })
    } catch {
      setScanResult('Debug hatası.')
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

  async function updateDraft(id: string, status: 'approved' | 'skipped') {
    if (processingId) return
    setProcessingId(id)
    setErrorById(p => { const n = { ...p }; delete n[id]; return n })
    const eff = effOf(drafts.find(x => x.id === id))
    try {
      const res = await fetch('/api/admin/instagram/drafts', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, status, date: eff.date || undefined, time: eff.time || undefined, weekdays: eff.weekdays.length ? eff.weekdays : undefined, performer: eff.performer || undefined, genre: eff.genre || undefined }) })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) { setErrorById(p => ({ ...p, [id]: data.error ?? 'İşlem başarısız oldu.' })); return }
      setDrafts(prev => prev.filter(d => d.id !== id))
    } catch {
      setErrorById(p => ({ ...p, [id]: 'Bağlantı hatası — tekrar deneyin.' }))
    } finally {
      setProcessingId(null)
    }
  }

  if (loading) return <div className="flex justify-center py-12"><Loader2 size={20} className="animate-spin text-accent" /></div>

  // Sadece aktif (taranacak) hesapları göster — liste profillerden otomatik yönetiliyor
  const byCity = sources.filter(s => s.is_active).reduce<Record<string, Source[]>>((acc, s) => {
    const c = s.city ?? 'Diğer'
    acc[c] = [...(acc[c] ?? []), s]
    return acc
  }, {})

  return (
    <div className="space-y-6">
      {/* Mekan Instagram linklerini doldurma araçları — en üstte */}
      <VenueInstagramTools />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-bebas text-2xl text-text-primary">Instagram Tarayıcı</h2>
          <p className="text-text-muted text-xs mt-0.5">Mekan profillerindeki Instagram'lar otomatik taranır, etkinlikler sana gelir</p>
        </div>
        <div className="flex gap-2">
          <button onClick={fixEntryTypes} disabled={scanning} className="btn-outline py-2 px-3 text-sm flex items-center gap-1.5 disabled:opacity-50" title="Taranan ücretsiz etkinlikleri Kapıda Öde yap (tek seferlik)">
            <Ticket size={14} /> Ücretleri Düzelt
          </button>
          <button onClick={scanAll} disabled={scanning} className="btn-accent py-2 px-3 text-sm flex items-center gap-1.5 disabled:opacity-50">
            {scanning ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
            Şimdi Tara
          </button>
        </div>
      </div>

      {/* Sekmeler */}
      <div className="flex gap-0.5 bg-surface rounded-lg p-0.5 border border-[rgba(228,224,216,0.08)] w-fit">
        <button onClick={() => setTab('sources')}
          className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${tab === 'sources' ? 'bg-accent text-white' : 'text-text-muted hover:text-text-primary'}`}>
          Taranan Hesaplar
        </button>
        <button onClick={() => setTab('drafts')}
          className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${tab === 'drafts' ? 'bg-accent text-white' : 'text-text-muted hover:text-text-primary'}`}>
          Onay Bekleyen Taslaklar{drafts.length > 0 ? ` (${drafts.length})` : ''}
        </button>
      </div>

      {scanResult && (
        <div className="text-sm text-accent bg-accent/10 border border-accent/20 rounded-lg px-4 py-2">{scanResult}</div>
      )}

      {debugResult && (
        <div className="bg-[rgba(228,224,216,0.04)] border border-amber-500/20 rounded-lg p-4 space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-amber-400">Debug Sonucu</p>
            <button onClick={() => setDebugResult(null)} className="text-text-muted hover:text-text-primary"><X size={14} /></button>
          </div>
          <div className="text-xs space-y-1">
            <p><span className="text-text-muted">İçerik uzunluğu:</span> <span className={debugResult.data.contentLength > 0 ? 'text-green-400' : 'text-red-400'}>{debugResult.data.contentLength ?? 0} karakter</span></p>
            <p><span className="text-text-muted">Bulunan post:</span> <span className={debugResult.data.postsFound > 0 ? 'text-green-400' : 'text-red-400'}>{debugResult.data.postsFound ?? 0}</span></p>
            {debugResult.data.postsFound > 0 && (
              <div className="mt-2 space-y-1">
                <p className="text-text-muted">Post başlıkları:</p>
                {debugResult.data.posts?.map((p: any, i: number) => (
                  <p key={i} className="text-text-primary pl-2 border-l border-accent/30">{p.caption.slice(0, 120)}</p>
                ))}
              </div>
            )}
            {debugResult.data.claudeParsed && (
              <div className="mt-2 space-y-1">
                <p className="text-text-muted">Claude yanıtı — has_event: <span className={debugResult.data.claudeParsed.has_event ? 'text-green-400' : 'text-red-400'}>{String(debugResult.data.claudeParsed.has_event)}</span></p>
                {debugResult.data.claudeParsed.events?.map((e: any, i: number) => (
                  <div key={i} className="pl-2 border-l border-accent/30 space-y-0.5">
                    <p className="text-text-primary">{e.title}</p>
                    <p className="text-text-muted">tarih: {e.date ?? 'null'} · saat: {e.time ?? 'null'} · weekday: {e.weekday ?? 'null'}</p>
                  </div>
                ))}
              </div>
            )}
            {debugResult.data.claudeRaw && (
              <details className="mt-2">
                <summary className="text-text-muted cursor-pointer hover:text-text-primary">Claude ham yanıt</summary>
                <pre className="text-[10px] text-text-muted mt-1 whitespace-pre-wrap break-all">{debugResult.data.claudeRaw.slice(0, 800)}</pre>
              </details>
            )}
          </div>
        </div>
      )}

      {tab === 'sources' && (
      <div className="space-y-6">
        {/* Sources */}
        <div className="space-y-4">
        {Object.entries(byCity).map(([city, citySources]) => (
          <div key={city}>
            <p className="text-xs text-text-muted font-medium mb-2 uppercase tracking-wide">{city}</p>
            <div className="space-y-1.5">
              {citySources.map(src => (
                <div key={src.id} className="card px-4 py-3 flex items-center gap-3">
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
                    <button onClick={() => debugOne(src.id)} disabled={scanning} title="İçeriği debug et"
                      className="p-1.5 text-text-muted hover:text-amber-400 transition-colors disabled:opacity-40">
                      <Bug size={13} />
                    </button>
                    <button onClick={() => scanOne(src.id)} disabled={scanning} title="Bu hesabı tara"
                      className="p-1.5 text-text-muted hover:text-accent transition-colors disabled:opacity-40">
                      <RefreshCw size={13} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
        </div>
      </div>
      )}

      {tab === 'drafts' && (
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
                        <input
                          value={edits[draft.id]?.performer ?? draft.extracted.performer ?? ''}
                          onChange={(ev) => setEdits(p => ({ ...p, [draft.id]: { ...p[draft.id], performer: ev.target.value } }))}
                          placeholder="Sanatçı / grup adı"
                          className="bg-surface border border-[rgba(228,224,216,0.15)] rounded px-2 py-1 text-xs text-accent w-full max-w-[240px]" />
                        <p className="text-[10px] text-text-muted">Kayıtlı grup/sanatçıyla aynı isimse otomatik bağlanır</p>
                        <select
                          value={edits[draft.id]?.genre ?? (draft.extracted as any).genre ?? ''}
                          onChange={(ev) => setEdits(p => ({ ...p, [draft.id]: { ...p[draft.id], genre: ev.target.value } }))}
                          className="bg-surface border border-[rgba(228,224,216,0.15)] rounded px-2 py-1 text-xs text-text-primary mt-1 max-w-[240px]">
                          <option value="">Tür seç (opsiyonel)</option>
                          <optgroup label="Müzik">{MUSIC_GENRES.map(g => <option key={g} value={g}>{g}</option>)}</optgroup>
                          <optgroup label="Sahne">{STAGE_GENRES.map(g => <option key={g} value={g}>{g}</option>)}</optgroup>
                          <optgroup label="Dans">{DANCE_OPTIONS.map(g => <option key={g} value={g}>{g}</option>)}</optgroup>
                        </select>
                        {(() => {
                          const ef = effOf(draft)
                          const inputCls = 'bg-surface border border-[rgba(228,224,216,0.15)] rounded px-2 py-1 text-xs text-text-primary'
                          const recurring = ef.weekdays.length > 0
                          return (
                            <div className="space-y-1.5 mt-1">
                              <div className="flex flex-wrap items-center gap-1">
                                <span className="text-[10px] text-text-muted mr-1">Her hafta:</span>
                                {WEEKDAYS.map(w => {
                                  const on = ef.weekdays.includes(w.v)
                                  return (
                                    <button key={w.v} type="button"
                                      onClick={() => setEdits(p => {
                                        const cur = (p[draft.id] && 'weekdays' in p[draft.id]! ? p[draft.id]!.weekdays! : ef.weekdays)
                                        const next = cur.includes(w.v) ? cur.filter(x => x !== w.v) : [...cur, w.v]
                                        return { ...p, [draft.id]: { ...p[draft.id], weekdays: next } }
                                      })}
                                      className={cn('text-[11px] w-9 py-1 rounded border transition-colors',
                                        on ? 'bg-accent text-white border-accent' : 'text-text-muted border-[rgba(228,224,216,0.15)] hover:text-text-primary')}>
                                      {w.s}
                                    </button>
                                  )
                                })}
                              </div>
                              <div className="flex flex-wrap items-center gap-2">
                                {!recurring && (
                                  <input type="date" value={ef.date}
                                    onChange={(ev) => setEdits(p => ({ ...p, [draft.id]: { ...p[draft.id], date: ev.target.value } }))}
                                    className={inputCls} />
                                )}
                                <input type="time" value={ef.time}
                                  onChange={(ev) => setEdits(p => ({ ...p, [draft.id]: { ...p[draft.id], time: ev.target.value } }))}
                                  className={inputCls} />
                                {!recurring && !ef.date && <span className="text-[10px] text-amber-400">tarih gir →</span>}
                                {recurring && <span className="text-[10px] text-accent">seçili günlerde 4 hafta oluşturulur</span>}
                              </div>
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
                {errorById[draft.id] && (
                  <p className="text-xs text-red-400 mt-2 bg-red-500/10 border border-red-500/20 rounded px-2 py-1">{errorById[draft.id]}</p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
      )}
    </div>
  )
}
