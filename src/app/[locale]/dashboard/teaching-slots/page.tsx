'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Plus, X, Check, Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'

const DAY_NAMES = ['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi']

export default function TeachingSlotsPage() {
  const router = useRouter()
  const supabase = createClient()

  const [artist, setArtist] = useState<any>(null)
  const [slots, setSlots] = useState<any[]>([])
  const [bookings, setBookings] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [actingBooking, setActingBooking] = useState<string | null>(null)

  const [instrument, setInstrument] = useState('')
  const [dayOfWeek, setDayOfWeek] = useState(1)
  const [startTime, setStartTime] = useState('10:00')
  const [endTime, setEndTime] = useState('11:00')
  const [recurrence, setRecurrence] = useState('weekly')
  const [price, setPrice] = useState('')

  const load = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/auth'); return }

    const { data: artistData } = await supabase
      .from('artists')
      .select('id, stage_name, teaching_instruments, is_pro_individual:profiles(is_pro_individual)')
      .eq('profile_id', user.id)
      .single()

    if (!artistData) { router.push('/dashboard'); return }

    const profile = await supabase.from('profiles').select('is_pro_individual').eq('id', user.id).single()
    if (!profile.data?.is_pro_individual) { router.push('/dashboard'); return }

    setArtist(artistData)

    const [slotsRes, bookingsRes] = await Promise.all([
      supabase.from('teaching_slots').select('*').eq('artist_id', artistData.id).order('day_of_week').order('start_time'),
      supabase.from('teaching_bookings').select('*, teaching_slots(instrument, day_of_week, start_time, end_time)').eq('artist_id', artistData.id).in('status', ['pending', 'confirmed']).order('lesson_date'),
    ])

    setSlots(slotsRes.data ?? [])
    setBookings(bookingsRes.data ?? [])
    setLoading(false)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => { load() }, [load])

  async function addSlot() {
    if (!instrument || !price) { setError('Enstrüman ve ücret zorunludur.'); return }
    setSaving(true); setError('')

    const res = await fetch('/api/artist/set-teaching', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ artist_id: artist.id, _slot: { instrument, day_of_week: dayOfWeek, start_time: startTime + ':00', end_time: endTime + ':00', recurrence, price_per_session: parseFloat(price) } }),
    })

    if (!res.ok) {
      // Direct insert via supabase client (artist is owner, RLS allows)
      const { data, error: err } = await supabase.from('teaching_slots').insert({
        artist_id: artist.id,
        instrument,
        day_of_week: dayOfWeek,
        start_time: startTime + ':00',
        end_time: endTime + ':00',
        recurrence,
        price_per_session: parseFloat(price),
      } as any).select().single()
      if (err) { setError(err.message); setSaving(false); return }
      setSlots(prev => [...prev, data].sort((a, b) => a.day_of_week - b.day_of_week || a.start_time.localeCompare(b.start_time)))
    } else {
      await load()
    }

    setInstrument(''); setPrice(''); setShowForm(false)
    setSaving(false)
  }

  async function deleteSlot(slotId: string) {
    await supabase.from('teaching_slots').update({ is_active: false } as any).eq('id', slotId)
    setSlots(prev => prev.filter(s => s.id !== slotId))
  }

  async function handleBooking(bookingId: string, confirm: boolean) {
    setActingBooking(bookingId)
    await supabase.from('teaching_bookings').update({ status: confirm ? 'confirmed' : 'cancelled' } as any).eq('id', bookingId)
    setBookings(prev => prev.map(b => b.id === bookingId ? { ...b, status: confirm ? 'confirmed' : 'cancelled' } : b))
    setActingBooking(null)
  }

  const teachingInstruments: string[] = artist?.teaching_instruments ?? []

  if (loading) return <div className="max-w-2xl mx-auto px-4 py-12 flex justify-center"><Loader2 size={24} className="animate-spin text-accent" /></div>

  const pendingBookings = bookings.filter(b => b.status === 'pending')
  const confirmedBookings = bookings.filter(b => b.status === 'confirmed')

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-8">
      <div>
        <Link href="/dashboard" className="flex items-center gap-2 text-text-muted text-sm mb-4 hover:text-text-primary w-fit">
          <ArrowLeft size={16} /> Dashboard
        </Link>
        <h1 className="font-bebas text-4xl text-text-primary">DERS SAATLERİM</h1>
        <p className="text-text-muted text-sm mt-0.5">Öğrencilerin rezervasyon yapabileceği müsait ders saatlerini belirle</p>
      </div>

      {/* Slot listesi */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-bebas text-2xl text-text-primary">MÜSAİT SAATLER</h2>
          <button onClick={() => setShowForm(!showForm)} className="btn-accent py-1.5 px-3 text-xs flex items-center gap-1.5">
            <Plus size={12} /> {showForm ? 'İptal' : 'Saat Ekle'}
          </button>
        </div>

        {showForm && (
          <div className="card p-4 mb-4 space-y-4">
            {teachingInstruments.length > 0 ? (
              <div>
                <label className="label">Enstrüman</label>
                <div className="flex flex-wrap gap-1.5 mt-1">
                  {teachingInstruments.map(inst => (
                    <button key={inst} onClick={() => setInstrument(inst)}
                      className={cn('text-xs px-3 py-1.5 rounded border transition-colors',
                        instrument === inst ? 'bg-accent/10 text-accent border-accent/30' : 'text-text-muted border-[rgba(228,224,216,0.1)] hover:text-text-primary'
                      )}>
                      {inst}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <p className="text-yellow-400 text-xs">Önce profilinde "Kurs Veriyorum" bölümünden enstrüman seç.</p>
            )}

            <div>
              <label className="label">Gün</label>
              <div className="flex flex-wrap gap-1.5 mt-1">
                {DAY_NAMES.map((d, i) => (
                  <button key={i} onClick={() => setDayOfWeek(i)}
                    className={cn('text-xs px-2.5 py-1.5 rounded border transition-colors',
                      dayOfWeek === i ? 'bg-accent/10 text-accent border-accent/30' : 'text-text-muted border-[rgba(228,224,216,0.1)] hover:text-text-primary'
                    )}>
                    {d}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="label">Başlangıç</label>
                <input type="time" value={startTime} onChange={e => setStartTime(e.target.value)} className="input-field text-sm" />
              </div>
              <div>
                <label className="label">Bitiş</label>
                <input type="time" value={endTime} onChange={e => setEndTime(e.target.value)} className="input-field text-sm" />
              </div>
              <div>
                <label className="label">Tekrar</label>
                <select value={recurrence} onChange={e => setRecurrence(e.target.value)} className="input-field text-sm">
                  <option value="weekly">Haftalık</option>
                  <option value="biweekly">2 Haftada Bir</option>
                </select>
              </div>
            </div>

            <div>
              <label className="label">Seans Ücreti (₺)</label>
              <input type="number" value={price} onChange={e => setPrice(e.target.value)} placeholder="500" min="0" className="input-field text-sm" />
            </div>

            {error && <p className="text-red-400 text-xs">{error}</p>}

            <button onClick={addSlot} disabled={saving || !instrument || !price}
              className="btn-accent w-full py-2 text-xs disabled:opacity-50 flex items-center justify-center gap-1.5">
              {saving ? <><Loader2 size={12} className="animate-spin" /> Ekleniyor...</> : <><Plus size={12} /> Ekle</>}
            </button>
          </div>
        )}

        {slots.length === 0 && !showForm ? (
          <div className="card p-6 text-center text-text-muted text-sm">Henüz müsait saat eklenmedi.</div>
        ) : (
          <div className="space-y-2">
            {slots.map(slot => (
              <div key={slot.id} className="card p-3 flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[#d4a820] text-xs font-semibold">{slot.instrument}</span>
                    <span className="text-text-primary text-sm">
                      {DAY_NAMES[slot.day_of_week]} · {slot.start_time?.slice(0, 5)}–{slot.end_time?.slice(0, 5)}
                    </span>
                  </div>
                  <p className="text-text-muted text-xs mt-0.5">
                    {slot.recurrence === 'weekly' ? 'Haftalık' : '2 Haftada Bir'} · ₺{slot.price_per_session}
                  </p>
                </div>
                <button onClick={() => deleteSlot(slot.id)} className="p-1.5 text-text-muted hover:text-red-400 transition-colors">
                  <X size={13} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Rezervasyonlar */}
      {bookings.length > 0 && (
        <div>
          <h2 className="font-bebas text-2xl text-text-primary mb-3">
            REZERVASYONLAR
            {pendingBookings.length > 0 && (
              <span className="font-sans ml-2 text-xs font-semibold px-1.5 py-0.5 rounded-full bg-yellow-400/15 text-yellow-400 border border-yellow-400/20">
                {pendingBookings.length} bekliyor
              </span>
            )}
          </h2>
          <div className="space-y-2">
            {[...pendingBookings, ...confirmedBookings].map(b => {
              const slot = b.teaching_slots
              return (
                <div key={b.id} className="card p-3 flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-text-primary text-sm font-medium">{b.student_name}</p>
                      <span className={cn('text-[10px] px-1.5 py-0.5 rounded border',
                        b.status === 'pending' ? 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20' : 'text-success bg-success/10 border-success/20'
                      )}>
                        {b.status === 'pending' ? 'Bekliyor' : 'Onaylandı'}
                      </span>
                    </div>
                    <p className="text-text-muted text-xs mt-0.5">
                      {slot?.instrument} · {new Date(b.lesson_date + 'T00:00:00').toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' })} {slot?.start_time?.slice(0, 5)}
                    </p>
                    <p className="text-text-muted text-xs">{b.student_phone} · {b.student_email}</p>
                  </div>
                  {b.status === 'pending' && (
                    <div className="flex gap-1.5 flex-shrink-0">
                      <button onClick={() => handleBooking(b.id, true)} disabled={actingBooking === b.id}
                        className="w-7 h-7 rounded-lg bg-success/10 text-success hover:bg-success/20 flex items-center justify-center transition-colors disabled:opacity-40">
                        <Check size={11} />
                      </button>
                      <button onClick={() => handleBooking(b.id, false)} disabled={actingBooking === b.id}
                        className="w-7 h-7 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 flex items-center justify-center transition-colors disabled:opacity-40">
                        <X size={11} />
                      </button>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
