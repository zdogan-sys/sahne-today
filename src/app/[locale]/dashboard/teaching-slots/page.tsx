'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Plus, X, Check, Loader2, Calendar, Clock, Zap } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'

const DAY_NAMES = ['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi']
const DAY_SHORT = ['Paz', 'Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt']

const TIME_TEMPLATES = [
  { label: '09:00 - 18:00', start: '09:00', end: '18:00' },
  { label: '10:00 - 20:00', start: '10:00', end: '20:00' },
  { label: '09:00 - 21:00', start: '09:00', end: '21:00' },
  { label: '17:00 - 22:00', start: '17:00', end: '22:00' },
  { label: 'Özel saat', start: '', end: '' },
]

const ADMIN_EMAIL = 'z_dogan@hotmail.com'

export default function TeachingSlotsPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const artistParam = searchParams.get('artist')
  const supabase = createClient()

  const [artist, setArtist] = useState<any>(null)
  const [slots, setSlots] = useState<any[]>([])
  const [bookings, setBookings] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [addMode, setAddMode] = useState<'template' | 'manual'>('template')
  const [actingBooking, setActingBooking] = useState<string | null>(null)
  const [togglingPayment, setTogglingPayment] = useState<string | null>(null)
  const [addBookingSlot, setAddBookingSlot] = useState<string | null>(null)
  const [bookForm, setBookForm] = useState({ student_name: '', student_email: '', student_phone: '', lesson_date: '' })

  // Template form
  const [templateIdx, setTemplateIdx] = useState(0)
  const [selectedDays, setSelectedDays] = useState<number[]>([])
  const [instrument, setInstrument] = useState('')
  const [price, setPrice] = useState('')
  const [isOnline, setIsOnline] = useState(false)
  const [lessonType, setLessonType] = useState<'individual' | 'group'>('individual')
  const [maxParticipants, setMaxParticipants] = useState(1)

  // Manual form
  const [manualInstrument, setManualInstrument] = useState('')
  const [manualDayOfWeek, setManualDayOfWeek] = useState(1)
  const [manualStartTime, setManualStartTime] = useState('10:00')
  const [manualEndTime, setManualEndTime] = useState('11:00')
  const [manualRecurrence, setManualRecurrence] = useState('weekly')
  const [manualPrice, setManualPrice] = useState('')
  const [manualSlotDate, setManualSlotDate] = useState('')

  const load = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/auth'); return }

    const isAdmin = user.email === ADMIN_EMAIL
    let artistData: any = null

    if (isAdmin && artistParam) {
      const { data } = await supabase
        .from('artists')
        .select('id, stage_name, teaching_instruments, profile_id')
        .eq('id', artistParam)
        .single()
      artistData = data
    } else {
      const { data } = await supabase
        .from('artists')
        .select('id, stage_name, teaching_instruments, profile_id')
        .eq('profile_id', user.id)
        .maybeSingle()
      artistData = data
    }

    if (!artistData && !isAdmin) { router.push('/dashboard'); return }
    if (!isAdmin) {
      const { data: profile } = await supabase.from('profiles').select('is_pro_individual').eq('id', user.id).single()
      if (!profile?.is_pro_individual) { router.push('/dashboard'); return }
    }

    setArtist(artistData)
    if (artistData) {
      const [slotsRes, bookingsRes] = await Promise.all([
        supabase.from('teaching_slots').select('*').eq('artist_id', artistData.id).eq('is_active', true).order('day_of_week').order('start_time'),
        supabase.from('teaching_bookings').select('*, teaching_slots(instrument, day_of_week, slot_date, start_time, end_time)').eq('artist_id', artistData.id).in('status', ['pending', 'awaiting_student', 'confirmed']).order('lesson_date'),
      ])
      setSlots(slotsRes.data ?? [])
      setBookings(bookingsRes.data ?? [])
    }
    setLoading(false)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => { load() }, [load])

  function toggleDay(d: number) {
    setSelectedDays(prev => prev.includes(d) ? prev.filter(x => x !== d) : [...prev, d])
  }
  function quickSelect(days: number[]) { setSelectedDays(days) }

  async function addTemplateSlots() {
    if (!instrument || !price || selectedDays.length === 0) {
      setError('Enstrüman, ücret ve en az bir gün seçin.')
      return
    }

    const template = TIME_TEMPLATES[templateIdx]
    if (!template.start || !template.end) {
      setError('Özel saat seçtiyseniz, saatleri manuel formdan ekleyin.')
      return
    }

    setSaving(true)
    setError('')

    const rows = selectedDays.map(d => ({
      artist_id: artist.id,
      instrument,
      day_of_week: d,
      slot_date: null,
      start_time: template.start + ':00',
      end_time: template.end + ':00',
      price_per_session: parseFloat(price),
      is_online: isOnline,
      lesson_type: lessonType,
      max_participants: lessonType === 'group' ? maxParticipants : 1,
      recurrence: 'weekly',
      is_active: true,
    }))

    const { data, error: err } = await supabase.from('teaching_slots').insert(rows as any).select()
    if (err) { setError(err.message); setSaving(false); return }

    setSlots(prev => [...prev, ...(data ?? [])].sort((a, b) =>
      (a.day_of_week ?? 0) - (b.day_of_week ?? 0) || a.start_time.localeCompare(b.start_time)
    ))

    setInstrument('')
    setPrice('')
    setSelectedDays([])
    setTemplateIdx(0)
    setShowForm(false)
    setSaving(false)
  }

  async function addManualSlot() {
    if (!manualInstrument || !manualPrice) {
      setError('Enstrüman ve ücret zorunludur.')
      return
    }

    setSaving(true)
    setError('')

    const row = {
      artist_id: artist.id,
      instrument: manualInstrument,
      day_of_week: manualSlotDate ? null : manualDayOfWeek,
      slot_date: manualSlotDate || null,
      start_time: manualStartTime + ':00',
      end_time: manualEndTime + ':00',
      price_per_session: parseFloat(manualPrice),
      is_online: isOnline,
      lesson_type: lessonType,
      max_participants: lessonType === 'group' ? maxParticipants : 1,
      recurrence: manualSlotDate ? 'once' : manualRecurrence,
      is_active: true,
    }

    const { data, error: err } = await supabase.from('teaching_slots').insert(row as any).select().single()
    if (err) { setError(err.message); setSaving(false); return }

    setSlots(prev => [...prev, data].sort((a, b) => {
      if (a.slot_date && b.slot_date) return a.slot_date.localeCompare(b.slot_date)
      if (a.slot_date) return 1
      if (b.slot_date) return -1
      return (a.day_of_week ?? 0) - (b.day_of_week ?? 0) || a.start_time.localeCompare(b.start_time)
    }))

    setManualInstrument('')
    setManualPrice('')
    setManualStartTime('10:00')
    setManualEndTime('11:00')
    setManualSlotDate('')
    setSaving(false)
  }

  async function deleteSlot(slotId: string) {
    await supabase.from('teaching_slots').update({ is_active: false } as any).eq('id', slotId)
    setSlots(prev => prev.filter(s => s.id !== slotId))
  }

  async function togglePayment(slotId: string, current: boolean) {
    setTogglingPayment(slotId)
    await supabase.from('teaching_slots').update({ payment_enabled: !current } as any).eq('id', slotId)
    setSlots(prev => prev.map(s => s.id === slotId ? { ...s, payment_enabled: !current } : s))
    setTogglingPayment(null)
  }

  async function addBookingForStudent(slotId: string) {
    if (!bookForm.student_name || !bookForm.student_email || !bookForm.student_phone || !bookForm.lesson_date) return
    setSaving(true)
    await fetch('/api/teaching/book', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ slot_id: slotId, ...bookForm, booked_by: 'teacher' }),
    })
    setAddBookingSlot(null)
    setBookForm({ student_name: '', student_email: '', student_phone: '', lesson_date: '' })
    await load()
    setSaving(false)
  }

  async function handleBooking(bookingId: string, confirm: boolean) {
    setActingBooking(bookingId)
    await supabase.from('teaching_bookings').update({ status: confirm ? 'confirmed' : 'cancelled' } as any).eq('id', bookingId)
    setBookings(prev => prev.map(b => b.id === bookingId ? { ...b, status: confirm ? 'confirmed' : 'cancelled' } : b))
    setActingBooking(null)
  }

  const teachingInstruments: string[] = artist?.teaching_instruments ?? []
  const today = new Date().toISOString().split('T')[0]
  const recurringSlots = slots.filter(s => !s.slot_date)
  const onetimeSlots = slots.filter(s => !!s.slot_date).sort((a, b) => a.slot_date.localeCompare(b.slot_date))
  const pendingBookings = bookings.filter(b => b.status === 'pending' || b.status === 'awaiting_student')
  const confirmedBookings = bookings.filter(b => b.status === 'confirmed')

  if (loading) return <div className="max-w-2xl mx-auto px-4 py-12 flex justify-center"><Loader2 size={24} className="animate-spin text-accent" /></div>

  if (!artist) return (
    <div className="max-w-2xl mx-auto px-4 py-12 text-center">
      <p className="text-text-muted">Sanatçı profili bulunamadı.</p>
      <Link href="/dashboard" className="text-accent mt-2 block">Dashboard'a dön →</Link>
    </div>
  )

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-8">
      <div>
        <Link href="/dashboard" className="flex items-center gap-2 text-text-muted text-sm mb-4 hover:text-text-primary w-fit">
          <ArrowLeft size={16} /> Dashboard
        </Link>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-bebas text-4xl text-text-primary">DERS SAATLERİM</h1>
            <p className="text-text-muted text-sm mt-0.5">Şablon veya manuel slot ekle</p>
          </div>
          <button onClick={() => setShowForm(!showForm)} className="btn-accent py-2 px-4 text-sm flex items-center gap-1.5">
            <Plus size={14} /> {showForm ? 'İptal' : 'Slot Ekle'}
          </button>
        </div>
      </div>

      {showForm && (
        <div className="card p-5 space-y-5">
          {/* Mod seçimi */}
          <div className="flex gap-2">
            {(['template', 'manual'] as const).map(m => (
              <button key={m} onClick={() => setAddMode(m)}
                className={cn('flex-1 py-2 text-xs font-medium rounded-lg border flex items-center justify-center gap-1.5 transition-colors',
                  addMode === m ? 'bg-accent/10 text-accent border-accent/30' : 'text-text-muted border-[rgba(228,224,216,0.1)] hover:text-text-primary'
                )}>
                {m === 'template' ? <><Zap size={11} /> Şablon Kullan</> : <><Clock size={11} /> Manuel Ekle</>}
              </button>
            ))}
          </div>

          {/* Template Mode */}
          {addMode === 'template' && (
            <div className="space-y-4">
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
                <p className="text-yellow-400 text-xs">Önce profilinde enstrüman seç.</p>
              )}

              <div>
                <label className="label">Saat Şablonu</label>
                <select value={templateIdx} onChange={e => setTemplateIdx(Number(e.target.value))} className="input-field text-sm mt-1">
                  {TIME_TEMPLATES.map((t, i) => <option key={i} value={i}>{t.label}</option>)}
                </select>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="label">Günler</label>
                  <div className="flex gap-1.5">
                    <button onClick={() => quickSelect([1, 2, 3, 4, 5])} className="text-[10px] px-2 py-0.5 rounded border text-text-muted border-[rgba(228,224,216,0.1)] hover:text-accent hover:border-accent/30 transition-colors">Haftaiçi</button>
                    <button onClick={() => quickSelect([0, 6])} className="text-[10px] px-2 py-0.5 rounded border text-text-muted border-[rgba(228,224,216,0.1)] hover:text-accent hover:border-accent/30 transition-colors">Haftasonu</button>
                  </div>
                </div>
                <div className="flex gap-1.5">
                  {DAY_SHORT.map((d, i) => (
                    <button key={i} onClick={() => toggleDay(i)}
                      className={cn('flex-1 py-2 text-xs rounded border transition-colors',
                        selectedDays.includes(i) ? 'bg-accent/10 text-accent border-accent/30' : 'text-text-muted border-[rgba(228,224,216,0.1)] hover:text-text-primary'
                      )}>
                      {d}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Seans Ücreti (₺)</label>
                  <input type="number" min={0} value={price} onChange={e => setPrice(e.target.value)} placeholder="500" className="input-field text-sm" />
                </div>
                <div>
                  <label className="label">Ders Türü</label>
                  <select value={lessonType} onChange={e => setLessonType(e.target.value as any)} className="input-field text-sm">
                    <option value="individual">Bireysel</option>
                    <option value="group">Grup</option>
                  </select>
                </div>
              </div>

              {selectedDays.length > 0 && price && (
                <div className="rounded-lg bg-accent/5 border border-accent/15 p-3">
                  <p className="text-accent text-sm font-medium">{selectedDays.length} gün × {TIME_TEMPLATES[templateIdx].label}</p>
                  <p className="text-text-muted text-xs mt-0.5">{selectedDays.length} slot oluşturulacak</p>
                </div>
              )}

              {error && <p className="text-red-400 text-xs">{error}</p>}

              <button onClick={addTemplateSlots} disabled={saving || !instrument || !price || selectedDays.length === 0}
                className="btn-accent w-full py-3 text-sm disabled:opacity-50 flex items-center justify-center gap-2">
                {saving ? <><Loader2 size={14} className="animate-spin" /> Oluşturuluyor...</> : <><Plus size={14} /> Şablon Uygula</>}
              </button>
            </div>
          )}

          {/* Manual Mode */}
          {addMode === 'manual' && (
            <div className="space-y-4">
              <div>
                <label className="label">Enstrüman</label>
                <input value={manualInstrument} onChange={e => setManualInstrument(e.target.value)} className="input-field text-sm" placeholder="Enstrüman adı" />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Başlangıç Saati</label>
                  <input type="time" value={manualStartTime} onChange={e => setManualStartTime(e.target.value)} className="input-field text-sm" />
                </div>
                <div>
                  <label className="label">Bitiş Saati</label>
                  <input type="time" value={manualEndTime} onChange={e => setManualEndTime(e.target.value)} className="input-field text-sm" />
                </div>
              </div>

              <div>
                <label className="label mb-2 block">Tip</label>
                <div className="flex gap-2">
                  <button onClick={() => setManualSlotDate('')}
                    className={cn('flex-1 py-2 text-xs rounded border transition-colors',
                      !manualSlotDate ? 'bg-accent/10 text-accent border-accent/30' : 'text-text-muted border-[rgba(228,224,216,0.1)]'
                    )}>Tekrarlayan</button>
                  <button onClick={() => { setManualSlotDate(today); setManualDayOfWeek(1); }}
                    className={cn('flex-1 py-2 text-xs rounded border transition-colors',
                      manualSlotDate ? 'bg-accent/10 text-accent border-accent/30' : 'text-text-muted border-[rgba(228,224,216,0.1)]'
                    )}>Tek Seferlik</button>
                </div>
              </div>

              {!manualSlotDate ? (
                <div className="space-y-2">
                  <label className="label">Gün</label>
                  <div className="flex gap-1.5">
                    {DAY_SHORT.map((d, i) => (
                      <button key={i} onClick={() => setManualDayOfWeek(i)}
                        className={cn('flex-1 py-2 text-xs rounded border transition-colors',
                          manualDayOfWeek === i ? 'bg-accent/10 text-accent border-accent/30' : 'text-text-muted border-[rgba(228,224,216,0.1)]'
                        )}>
                        {d}
                      </button>
                    ))}
                  </div>
                  <label className="label">Tekrar</label>
                  <select value={manualRecurrence} onChange={e => setManualRecurrence(e.target.value)} className="input-field text-sm">
                    <option value="weekly">Haftalık</option>
                    <option value="biweekly">2 Haftada Bir</option>
                  </select>
                </div>
              ) : (
                <div>
                  <label className="label">Tarih</label>
                  <input type="date" min={today} value={manualSlotDate} onChange={e => setManualSlotDate(e.target.value)} className="input-field text-sm" />
                </div>
              )}

              <div>
                <label className="label">Seans Ücreti (₺)</label>
                <input type="number" min={0} value={manualPrice} onChange={e => setManualPrice(e.target.value)} placeholder="500" className="input-field text-sm" />
              </div>

              {error && <p className="text-red-400 text-xs">{error}</p>}

              <button onClick={addManualSlot} disabled={saving || !manualInstrument || !manualPrice}
                className="btn-accent w-full py-3 text-sm disabled:opacity-50 flex items-center justify-center gap-2">
                {saving ? <><Loader2 size={14} className="animate-spin" /> Ekleniyor...</> : <><Plus size={14} /> Slot Ekle</>}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Slots List */}
      {(recurringSlots.length > 0 || onetimeSlots.length > 0) ? (
        <div className="space-y-6">
          {recurringSlots.length > 0 && (
            <div>
              <h2 className="font-bebas text-xl text-text-primary mb-3">TEKRARLAYAN SLOTLAR</h2>
              <div className="space-y-2">
                {recurringSlots.map(slot => (
                  <SlotCard key={slot.id} slot={slot} onDelete={deleteSlot} onTogglePayment={togglePayment} togglingPayment={togglingPayment} onAddBooking={(id) => { setAddBookingSlot(addBookingSlot === id ? null : id); setBookForm({ student_name: '', student_email: '', student_phone: '', lesson_date: '' }) }} addBookingSlot={addBookingSlot} bookForm={bookForm} setBookForm={setBookForm} onSubmitBooking={addBookingForStudent} saving={saving} />
                ))}
              </div>
            </div>
          )}

          {onetimeSlots.length > 0 && (
            <div>
              <h2 className="font-bebas text-xl text-text-primary mb-3">TEK SEFERLİK SLOTLAR</h2>
              <div className="space-y-2">
                {onetimeSlots.map(slot => (
                  <SlotCard key={slot.id} slot={slot} onDelete={deleteSlot} onTogglePayment={togglePayment} togglingPayment={togglingPayment} onAddBooking={(id) => { setAddBookingSlot(addBookingSlot === id ? null : id); setBookForm({ student_name: '', student_email: '', student_phone: '', lesson_date: '' }) }} addBookingSlot={addBookingSlot} bookForm={bookForm} setBookForm={setBookForm} onSubmitBooking={addBookingForStudent} saving={saving} />
                ))}
              </div>
            </div>
          )}
        </div>
      ) : !showForm && (
        <div className="card p-8 text-center text-text-muted text-sm">
          Henüz slot eklenmedi. "Slot Ekle" butonuyla başla.
        </div>
      )}

      {/* Bookings */}
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
              const dateStr = b.lesson_date ? new Date(b.lesson_date + 'T00:00:00').toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' }) : '—'
              return (
                <div key={b.id} className="card p-3 flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-text-primary text-sm font-medium">{b.student_name}</p>
                      <span className={cn('text-[10px] px-1.5 py-0.5 rounded border', b.status === 'pending' ? 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20' : 'text-success bg-success/10 border-success/20')}>
                        {b.status === 'pending' ? 'Hoca Onayı' : 'Onaylandı'}
                      </span>
                    </div>
                    <p className="text-text-muted text-xs mt-0.5">{slot?.instrument} · {dateStr} · {slot?.start_time?.slice(0, 5)}</p>
                    <p className="text-text-muted text-xs">{b.student_phone} · {b.student_email}</p>
                  </div>
                  {b.status === 'pending' && (
                    <div className="flex gap-1.5 flex-shrink-0">
                      <button onClick={() => handleBooking(b.id, true)} disabled={actingBooking === b.id} className="w-7 h-7 rounded-lg bg-success/10 text-success hover:bg-success/20 flex items-center justify-center disabled:opacity-40"><Check size={11} /></button>
                      <button onClick={() => handleBooking(b.id, false)} disabled={actingBooking === b.id} className="w-7 h-7 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 flex items-center justify-center disabled:opacity-40"><X size={11} /></button>
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

function SlotCard({ slot, onDelete, onTogglePayment, togglingPayment, onAddBooking, addBookingSlot, bookForm, setBookForm, onSubmitBooking, saving }: {
  slot: any; onDelete: (id: string) => void; onTogglePayment: (id: string, current: boolean) => void; togglingPayment: string | null; onAddBooking: (id: string) => void; addBookingSlot: string | null; bookForm: any; setBookForm: (f: any) => void; onSubmitBooking: (id: string) => void; saving: boolean
}) {
  const isOnetime = !!slot.slot_date
  const dayLabel = isOnetime
    ? new Date(slot.slot_date + 'T00:00:00').toLocaleDateString('tr-TR', { weekday: 'long', day: 'numeric', month: 'long' })
    : `${['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi'][slot.day_of_week]} · ${slot.recurrence === 'biweekly' ? '2 haftada bir' : 'haftalık'}`

  const nextDates = isOnetime ? [slot.slot_date] : getNextDates(slot.day_of_week, slot.recurrence)

  return (
    <div className="card p-3 space-y-3">
      <div className="flex items-center gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[#d4a820] text-xs font-semibold">{slot.instrument}</span>
            <span className="text-text-primary text-sm">{dayLabel}</span>
            <span className="text-text-muted text-xs flex items-center gap-0.5"><Clock size={9} />{slot.start_time?.slice(0, 5)}–{slot.end_time?.slice(0, 5)}</span>
          </div>
          <p className="text-text-muted text-xs mt-0.5">₺{slot.price_per_session}</p>
        </div>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <button onClick={() => onTogglePayment(slot.id, slot.payment_enabled)} disabled={togglingPayment === slot.id}
            className={cn('text-[10px] px-2 py-1 rounded border transition-colors disabled:opacity-40',
              slot.payment_enabled ? 'bg-accent/10 text-accent border-accent/30' : 'text-text-muted border-[rgba(228,224,216,0.1)]'
            )}>
            {slot.payment_enabled ? '₺ Açık' : '₺ Kapalı'}
          </button>
          <button onClick={() => onAddBooking(slot.id)} className="text-[10px] px-2 py-1 rounded border text-text-muted border-[rgba(228,224,216,0.1)] hover:text-accent hover:border-accent/30 transition-colors">+ Öğrenci</button>
          <button onClick={() => onDelete(slot.id)} className="p-1 text-text-muted hover:text-red-400 transition-colors"><X size={13} /></button>
        </div>
      </div>

      {addBookingSlot === slot.id && (
        <div className="pt-3 border-t border-[rgba(228,224,216,0.08)] space-y-2">
          <p className="text-text-muted text-xs">Öğrenciye onay maili gönderilecek</p>
          <div className="grid grid-cols-2 gap-2">
            <input value={bookForm.student_name} onChange={e => setBookForm((p: any) => ({ ...p, student_name: e.target.value }))} placeholder="Ad Soyad *" className="input-field text-xs" />
            <input type="tel" value={bookForm.student_phone} onChange={e => setBookForm((p: any) => ({ ...p, student_phone: e.target.value }))} placeholder="Telefon *" className="input-field text-xs" />
            <input type="email" value={bookForm.student_email} onChange={e => setBookForm((p: any) => ({ ...p, student_email: e.target.value }))} placeholder="E-posta *" className="input-field text-xs col-span-2" />
            <select value={bookForm.lesson_date} onChange={e => setBookForm((p: any) => ({ ...p, lesson_date: e.target.value }))} className="input-field text-xs col-span-2">
              <option value="">Tarih Seçin *</option>
              {nextDates.map(d => <option key={d} value={d}>{new Date(d + 'T00:00:00').toLocaleDateString('tr-TR', { weekday: 'long', day: 'numeric', month: 'long' })}</option>)}
            </select>
          </div>
          <button onClick={() => onSubmitBooking(slot.id)} disabled={saving || !bookForm.student_name || !bookForm.student_email || !bookForm.student_phone || !bookForm.lesson_date}
            className="btn-accent w-full py-2 text-xs disabled:opacity-50 flex items-center justify-center gap-1.5">
            {saving ? <><Loader2 size={11} className="animate-spin" /> Gönderiliyor...</> : 'Rezervasyon Oluştur & Mail Gönder'}
          </button>
        </div>
      )}
    </div>
  )
}

function getNextDates(dayOfWeek: number, recurrence: string, count = 8): string[] {
  const dates: string[] = []
  const today = new Date(); today.setHours(0, 0, 0, 0)
  const cur = new Date(today)
  const step = recurrence === 'biweekly' ? 14 : 7
  let daysUntil = (dayOfWeek - cur.getDay() + 7) % 7
  if (daysUntil === 0) daysUntil = 7
  cur.setDate(cur.getDate() + daysUntil)
  for (let i = 0; i < count; i++) {
    dates.push(cur.toISOString().split('T')[0])
    cur.setDate(cur.getDate() + step)
  }
  return dates
}
