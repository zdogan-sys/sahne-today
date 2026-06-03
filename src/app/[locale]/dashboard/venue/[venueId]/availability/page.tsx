'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { Link } from '@/i18n/navigation'
import { ArrowLeft, Plus, X, Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'

const DAY_NAMES = ['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi']
const DAY_SHORT = ['Paz', 'Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt']
const HOURS = Array.from({ length: 17 }, (_, i) => `${String(6 + i).padStart(2, '0')}:00`)

export default function VenueAvailabilityPage() {
  const router = useRouter()
  const params = useParams()
  const venueId = params.venueId as string
  const supabase = createClient()

  const [venue, setVenue] = useState<any>(null)
  const [rooms, setRooms] = useState<any[]>([])
  const [rules, setRules] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const [form, setForm] = useState({
    day_of_week: [] as number[],
    start_time: '09:00',
    end_time: '22:00',
    type: 'open' as 'open' | 'closed',
    room_id: '',
  })

  useEffect(() => { load() }, [])

  async function load() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/auth'); return }

    const [venueRes, roomsRes, rulesRes] = await Promise.all([
      supabase.from('venues').select('id, name, owner_id').eq('id', venueId).single(),
      supabase.from('studio_rooms').select('id, name').eq('venue_id', venueId).eq('is_active', true),
      supabase.from('studio_availability').select('*').eq('venue_id', venueId).eq('is_active', true).order('day_of_week').order('start_time'),
    ])

    if (!venueRes.data || venueRes.data.owner_id !== user.id) { router.push('/dashboard'); return }
    setVenue(venueRes.data)
    setRooms(roomsRes.data ?? [])
    setRules(rulesRes.data ?? [])
    setLoading(false)
  }

  function toggleDay(d: number) {
    setForm(p => ({
      ...p,
      day_of_week: p.day_of_week.includes(d) ? p.day_of_week.filter(x => x !== d) : [...p.day_of_week, d]
    }))
  }

  async function addRule() {
    if (form.day_of_week.length === 0) { setError('En az bir gün seçin.'); return }
    if (form.start_time >= form.end_time) { setError('Bitiş saati başlangıçtan büyük olmalı.'); return }
    setSaving(true); setError('')

    const rows = form.day_of_week.map(d => ({
      venue_id: venueId,
      room_id: form.room_id || null,
      day_of_week: d,
      start_time: form.start_time + ':00',
      end_time: form.end_time + ':00',
      type: form.type,
      is_active: true,
    }))

    const { data, error: err } = await supabase.from('studio_availability').insert(rows as any).select()
    if (err) { setError(err.message); setSaving(false); return }
    setRules(prev => [...prev, ...(data ?? [])].sort((a, b) => (a.day_of_week - b.day_of_week) || a.start_time.localeCompare(b.start_time)))
    setForm(p => ({ ...p, day_of_week: [] }))
    setSaving(false)
  }

  async function deleteRule(id: string) {
    await supabase.from('studio_availability').update({ is_active: false } as any).eq('id', id)
    setRules(prev => prev.filter(r => r.id !== id))
  }

  const openRules = rules.filter(r => r.type === 'open')
  const closedRules = rules.filter(r => r.type === 'closed')

  if (loading) return <div className="max-w-2xl mx-auto px-4 py-12 flex justify-center"><Loader2 size={24} className="animate-spin text-accent" /></div>

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
      <div>
        <Link href="/dashboard" className="flex items-center gap-2 text-text-muted text-sm mb-4 hover:text-text-primary w-fit">
          <ArrowLeft size={16} /> Dashboard
        </Link>
        <h1 className="font-bebas text-4xl text-text-primary">{venue?.name}</h1>
        <p className="text-text-muted text-sm mt-0.5">Çalışma Saatleri & Kapalı Bloklar</p>
      </div>

      {/* Renk açıklaması */}
      <div className="card p-4 space-y-1.5 text-xs">
        <p className="text-text-muted font-medium mb-2">Renk Kodları:</p>
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-blue-400/50 flex-shrink-0" /><span className="text-text-muted">Mavi — Slot tanımsız, rezervasyon alınabilir</span></div>
          <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-success/50 flex-shrink-0" /><span className="text-text-muted">Yeşil — Açık slot tanımlanmış, boş</span></div>
          <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-yellow-400/50 flex-shrink-0" /><span className="text-text-muted">Sarı — Onay bekleyen rezervasyon</span></div>
          <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-orange-400/50 flex-shrink-0" /><span className="text-text-muted">Turuncu — Onaylanan rezervasyon</span></div>
          <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-red-500/50 flex-shrink-0" /><span className="text-text-muted">Kırmızı — Kapalı, rezervasyon alınmaz</span></div>
        </div>
      </div>

      {/* Form */}
      <div className="card p-5 space-y-4">
        <h2 className="font-bebas text-xl text-text-primary">Kural Ekle</h2>

        {/* Tür */}
        <div className="flex gap-2">
          {(['open', 'closed'] as const).map(t => (
            <button key={t} onClick={() => setForm(p => ({ ...p, type: t }))}
              className={cn('flex-1 py-2 text-xs font-medium rounded-lg border transition-colors',
                form.type === t
                  ? t === 'open' ? 'bg-success/10 text-success border-success/30' : 'bg-red-500/10 text-red-400 border-red-500/30'
                  : 'text-text-muted border-[rgba(228,224,216,0.1)]'
              )}>
              {t === 'open' ? '🟢 Açık Slot' : '🔴 Kapalı Blok'}
            </button>
          ))}
        </div>

        {/* Oda */}
        {rooms.length > 0 && (
          <div>
            <label className="label">Oda (opsiyonel — boş = tüm odalar)</label>
            <select value={form.room_id} onChange={e => setForm(p => ({ ...p, room_id: e.target.value }))} className="input-field text-sm mt-1">
              <option value="">Tüm Odalar</option>
              {rooms.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
            </select>
          </div>
        )}

        {/* Günler */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="label">Günler</label>
            <div className="flex gap-1.5">
              <button onClick={() => setForm(p => ({ ...p, day_of_week: [1,2,3,4,5] }))} className="text-[10px] px-2 py-0.5 rounded border text-text-muted border-[rgba(228,224,216,0.1)] hover:text-accent">Haftaiçi</button>
              <button onClick={() => setForm(p => ({ ...p, day_of_week: [0,6] }))} className="text-[10px] px-2 py-0.5 rounded border text-text-muted border-[rgba(228,224,216,0.1)] hover:text-accent">Haftasonu</button>
              <button onClick={() => setForm(p => ({ ...p, day_of_week: [0,1,2,3,4,5,6] }))} className="text-[10px] px-2 py-0.5 rounded border text-text-muted border-[rgba(228,224,216,0.1)] hover:text-accent">Hepsi</button>
            </div>
          </div>
          <div className="flex gap-1.5">
            {DAY_SHORT.map((d, i) => (
              <button key={i} onClick={() => toggleDay(i)}
                className={cn('flex-1 py-2 text-xs rounded border transition-colors',
                  form.day_of_week.includes(i) ? 'bg-accent/10 text-accent border-accent/30' : 'text-text-muted border-[rgba(228,224,216,0.1)]'
                )}>
                {d}
              </button>
            ))}
          </div>
        </div>

        {/* Saatler */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Başlangıç</label>
            <select value={form.start_time} onChange={e => setForm(p => ({ ...p, start_time: e.target.value }))} className="input-field text-sm">
              {HOURS.map(h => <option key={h} value={h}>{h}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Bitiş</label>
            <select value={form.end_time} onChange={e => setForm(p => ({ ...p, end_time: e.target.value }))} className="input-field text-sm">
              {HOURS.filter(h => h > form.start_time).map(h => <option key={h} value={h}>{h}</option>)}
            </select>
          </div>
        </div>

        {error && <p className="text-red-400 text-xs">{error}</p>}

        <button onClick={addRule} disabled={saving || form.day_of_week.length === 0}
          className="btn-accent w-full py-3 text-sm disabled:opacity-50 flex items-center justify-center gap-2">
          {saving ? <><Loader2 size={14} className="animate-spin" /> Ekleniyor...</> : <><Plus size={14} /> Ekle</>}
        </button>
      </div>

      {/* Kurallar listesi */}
      {openRules.length > 0 && (
        <div>
          <h3 className="font-bebas text-xl text-success mb-2">AÇIK SLOTLAR</h3>
          <div className="space-y-1.5">
            {openRules.map(r => (
              <div key={r.id} className="card p-3 flex items-center justify-between gap-3 border-success/20">
                <div>
                  <span className="text-success text-sm font-medium">{DAY_NAMES[r.day_of_week]}</span>
                  <span className="text-text-muted text-xs ml-2">{r.start_time?.slice(0,5)} – {r.end_time?.slice(0,5)}</span>
                  {r.room_id && <span className="text-accent text-xs ml-2">· {rooms.find(x => x.id === r.room_id)?.name}</span>}
                </div>
                <button onClick={() => deleteRule(r.id)} className="p-1 text-text-muted hover:text-red-400"><X size={13} /></button>
              </div>
            ))}
          </div>
        </div>
      )}

      {closedRules.length > 0 && (
        <div>
          <h3 className="font-bebas text-xl text-red-400 mb-2">KAPALI BLOKLAR</h3>
          <div className="space-y-1.5">
            {closedRules.map(r => (
              <div key={r.id} className="card p-3 flex items-center justify-between gap-3 border-red-500/20">
                <div>
                  <span className="text-red-400 text-sm font-medium">{DAY_NAMES[r.day_of_week]}</span>
                  <span className="text-text-muted text-xs ml-2">{r.start_time?.slice(0,5)} – {r.end_time?.slice(0,5)}</span>
                  {r.room_id && <span className="text-accent text-xs ml-2">· {rooms.find(x => x.id === r.room_id)?.name}</span>}
                </div>
                <button onClick={() => deleteRule(r.id)} className="p-1 text-text-muted hover:text-red-400"><X size={13} /></button>
              </div>
            ))}
          </div>
        </div>
      )}

      {rules.length === 0 && (
        <div className="card p-8 text-center text-text-muted text-sm">
          Henüz kural eklenmedi. Kural olmadan tüm saatler mavi (rezervasyon alınabilir) görünür.
        </div>
      )}
    </div>
  )
}
