'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Plus, X, Check, Loader2, Clock, Zap } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'

const DAY_NAMES = ['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi']
const DAY_SHORT = ['Paz', 'Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt']

const TIME_TEMPLATES = [
  { label: '09:00 - 18:00', start: '09:00', end: '18:00' },
  { label: '10:00 - 20:00', start: '10:00', end: '20:00' },
  { label: '09:00 - 21:00', start: '09:00', end: '21:00' },
  { label: '17:00 - 22:00', start: '17:00', end: '22:00' },
]

export default function VenueTeachingSlotsPage() {
  const router = useRouter()
  const params = useParams()
  const venueId = params.venueId as string
  const supabase = createClient()

  const [venue, setVenue] = useState<any>(null)
  const [instructors, setInstructors] = useState<any[]>([])
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

  // Artist search
  const [artists, setArtists] = useState<any[]>([])
  const [artistQuery, setArtistQuery] = useState('')
  const [artistQueryManual, setArtistQueryManual] = useState('')

  // Template form
  const [templateIdx, setTemplateIdx] = useState(0)
  const [selectedDays, setSelectedDays] = useState<number[]>([])
  const [instructorName, setInstructorName] = useState('')
  const [subject, setSubject] = useState('')
  const [price, setPrice] = useState('')
  const [isOnline, setIsOnline] = useState(false)
  const [lessonType, setLessonType] = useState<'individual' | 'group'>('individual')
  const [maxParticipants, setMaxParticipants] = useState(1)

  // Manual form
  const [manualSubject, setManualSubject] = useState('')
  const [manualInstructor, setManualInstructor] = useState('')
  const [manualDayOfWeek, setManualDayOfWeek] = useState(1)
  const [manualStartTime, setManualStartTime] = useState('10:00')
  const [manualEndTime, setManualEndTime] = useState('11:00')
  const [manualRecurrence, setManualRecurrence] = useState('weekly')
  const [manualPrice, setManualPrice] = useState('')
  const [manualSlotDate, setManualSlotDate] = useState('')

  const load = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/auth'); return }

    const { data: venueData } = await supabase
      .from('venues')
      .select('id, name, owner_id, venue_type')
      .eq('id', venueId)
      .single()

    if (!venueData || venueData.owner_id !== user.id) {
      router.push('/dashboard')
      return
    }

    if (!['dance_studio', 'music_school'].includes(venueData.venue_type)) {
      router.push('/dashboard')
      return
    }

    setVenue(venueData)

    const [instRes, slotsRes, bookingsRes, artistsRes] = await Promise.all([
      supabase.from('venue_instructors').select('*').eq('venue_id', venueId).eq('is_active', true),
      supabase.from('teaching_slots').select('*').eq('venue_id', venueId).eq('is_active', true).order('day_of_week').order('start_time'),
      supabase.from('teaching_bookings').select('*, teaching_slots(instructor_name, day_of_week, slot_date, start_time, end_time)').eq('artist_id', null).eq('teaching_slots.venue_id', venueId as any).in('status', ['pending', 'awaiting_student', 'confirmed']).order('lesson_date'),
      supabase.from('artists').select('id, stage_name').order('stage_name').limit(200),
    ])

    setInstructors(instRes.data ?? [])
    setSlots(slotsRes.data ?? [])
    setBookings(bookingsRes.data ?? [])
    setArtists(artistsRes.data ?? [])
    setLoading(false)
  }, [venueId])

  useEffect(() => { load() }, [load])

  function toggleDay(d: number) {
    setSelectedDays(prev => prev.includes(d) ? prev.filter(x => x !== d) : [...prev, d])
  }
  function quickSelect(days: number[]) { setSelectedDays(days) }

  async function addTemplateSlots() {
    if (!instructorName || !price || selectedDays.length === 0) {
      setError('Eğitmen, ücret ve en az bir gün seçin.')
      return
    }

    const template = TIME_TEMPLATES[templateIdx]

    setSaving(true)
    setError('')

    const rows = selectedDays.map(d => ({
      venue_id: venueId,
      artist_id: null,
      instructor_name: instructorName,
      instrument: subject || instructorName || 'Ders',
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

    setInstructorName('')
    setPrice('')
    setSelectedDays([])
    setTemplateIdx(0)
    setShowForm(false)
    setSaving(false)
  }

  async function addManualSlot() {
    if (!manualInstructor || !manualPrice) {
      setError('Eğitmen ve ücret zorunludur.')
      return
    }

    setSaving(true)
    setError('')

    const row = {
      venue_id: venueId,
      artist_id: null,
      instructor_name: manualInstructor,
      instrument: manualSubject || manualInstructor || 'Ders',
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

    setManualInstructor('')
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

  const today = new Date().toISOString().split('T')[0]
  const recurringSlots = slots.filter(s => !s.slot_date)
  const onetimeSlots = slots.filter(s => !!s.slot_date).sort((a, b) => a.slot_date.localeCompare(b.slot_date))
  const pendingBookings = bookings.filter(b => b.status === 'pending' || b.status === 'awaiting_student')
  const confirmedBookings = bookings.filter(b => b.status === 'confirmed')

  if (loading) return <div className="max-w-2xl mx-auto px-4 py-12 flex justify-center"><Loader2 size={24} className="animate-spin text-accent" /></div>

  if (!venue) return (
    <div className="max-w-2xl mx-auto px-4 py-12 text-center">
      <p className="text-text-muted">Mekan bulunamadı.</p>
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
            <h1 className="font-bebas text-4xl text-text-primary">DERS SAATLERİ</h1>
            <p className="text-text-muted text-sm mt-0.5">{venue.name}</p>
          </div>
          <button onClick={() => setShowForm(!showForm)} className="btn-accent py-2 px-4 text-sm flex items-center gap-1.5">
            <Plus size={14} /> {showForm ? 'İptal' : 'Slot Ekle'}
          </button>
        </div>
      </div>

      {showForm && (
        <div className="card p-5 space-y-5">
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

          {addMode === 'template' && (
            <div className="space-y-4">
              <div>
                <label className="label">Eğitmen</label>
                {instructors.length > 0 ? (
                  <select value={instructorName} onChange={e => setInstructorName(e.target.value)} className="input-field text-sm mt-1">
                    <option value="">Seçin...</option>
                    {instructors.map(inst => (
                      <option key={inst.id} value={inst.name}>{inst.name}</option>
                    ))}
                  </select>
                ) : (
                  <input value={instructorName} onChange={e => setInstructorName(e.target.value)} className="input-field text-sm mt-1" placeholder="Eğitmen adı" />
                )}
                <p className="text-text-muted text-xs mt-1">ya da platformdan sanatçı seç:</p>
                <div className="relative mt-1">
                  <input
                    value={artistQuery}
                    onChange={e => setArtistQuery(e.target.value)}
                    placeholder="Sanatçı ara..."
                    className="input-field text-sm"
                  />
                  {artistQuery && (
                    <div className="absolute z-10 top-full left-0 right-0 bg-surface border border-[rgba(228,224,216,0.15)] rounded-lg shadow-lg max-h-40 overflow-y-auto mt-1">
                      {artists.filter(a => a.stage_name.toLowerCase().includes(artistQuery.toLowerCase())).slice(0, 8).map(a => (
                        <button key={a.id} type="button" onClick={() => { setInstructorName(a.stage_name); setArtistQuery('') }}
                          className="w-full text-left px-3 py-2 text-sm text-text-muted hover:bg-[rgba(228,224,216,0.06)] hover:text-text-primary transition-colors">
                          {a.stage_name}
                        </button>
                      ))}
                      {artists.filter(a => a.stage_name.toLowerCase().includes(artistQuery.toLowerCase())).length === 0 && (
                        <p className="px-3 py-2 text-xs text-text-muted">Sonuç yok</p>
                      )}
                    </div>
                  )}
                </div>
              </div>

              <div>
                <label className="label">Ders Konusu <span className="text-text-muted font-normal">(opsiyonel)</span></label>
                <input value={subject} onChange={e => setSubject(e.target.value)} className="input-field text-sm mt-1" placeholder="Gitar, Piyano, Tango..." />
              </div>

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

              {error && <p className="text-red-400 text-xs">{error}</p>}

              <button onClick={addTemplateSlots} disabled={saving || !instructorName || !price || selectedDays.length === 0}
                className="btn-accent w-full py-3 text-sm disabled:opacity-50 flex items-center justify-center gap-2">
                {saving ? <><Loader2 size={14} className="animate-spin" /> Oluşturuluyor...</> : <><Plus size={14} /> Şablon Uygula</>}
              </button>
            </div>
          )}

          {addMode === 'manual' && (
            <div className="space-y-4">
              <div>
                <label className="label">Eğitmen</label>
                {instructors.length > 0 ? (
                  <select value={manualInstructor} onChange={e => setManualInstructor(e.target.value)} className="input-field text-sm mt-1">
                    <option value="">Seçin...</option>
                    {instructors.map(inst => (
                      <option key={inst.id} value={inst.name}>{inst.name}</option>
                    ))}
                  </select>
                ) : (
                  <input value={manualInstructor} onChange={e => setManualInstructor(e.target.value)} className="input-field text-sm mt-1" placeholder="Eğitmen adı" />
                )}
                <p className="text-text-muted text-xs mt-1">ya da platformdan sanatçı seç:</p>
                <div className="relative mt-1">
                  <input
                    value={artistQueryManual}
                    onChange={e => setArtistQueryManual(e.target.value)}
                    placeholder="Sanatçı ara..."
                    className="input-field text-sm"
                  />
                  {artistQueryManual && (
                    <div className="absolute z-10 top-full left-0 right-0 bg-surface border border-[rgba(228,224,216,0.15)] rounded-lg shadow-lg max-h-40 overflow-y-auto mt-1">
                      {artists.filter(a => a.stage_name.toLowerCase().includes(artistQueryManual.toLowerCase())).slice(0, 8).map(a => (
                        <button key={a.id} type="button" onClick={() => { setManualInstructor(a.stage_name); setArtistQueryManual('') }}
                          className="w-full text-left px-3 py-2 text-sm text-text-muted hover:bg-[rgba(228,224,216,0.06)] hover:text-text-primary transition-colors">
                          {a.stage_name}
                        </button>
                      ))}
                      {artists.filter(a => a.stage_name.toLowerCase().includes(artistQueryManual.toLowerCase())).length === 0 && (
                        <p className="px-3 py-2 text-xs text-text-muted">Sonuç yok</p>
                      )}
                    </div>
                  )}
                </div>
              </div>

              <div>
                <label className="label">Ders Konusu <span className="text-text-muted font-normal">(opsiyonel)</span></label>
                <input value={manualSubject} onChange={e => setManualSubject(e.target.value)} className="input-field text-sm" placeholder="Gitar, Piyano, Tango..." />
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

              <button onClick={addManualSlot} disabled={saving || !manualInstructor || !manualPrice}
                className="btn-accent w-full py-3 text-sm disabled:opacity-50 flex items-center justify-center gap-2">
                {saving ? <><Loader2 size={14} className="animate-spin" /> Ekleniyor...</> : <><Plus size={14} /> Slot Ekle</>}
              </button>
            </div>
          )}
        </div>
      )}

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
                    <p className="text-text-muted text-xs mt-0.5">{slot?.instructor_name} · {dateStr} · {slot?.start_time?.slice(0, 5)}</p>
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
    <div className="card p-4 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0 space-y-2">
          {/* Başlık satırı: Eğitmen, Gün, Saat */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[#d4a820] font-semibold text-sm">{slot.instructor_name}</span>
            <span className="text-text-muted text-xs">·</span>
            <span className="text-text-primary text-sm">{dayLabel}</span>
            <span className="text-text-muted text-xs">·</span>
            <span className="text-text-muted text-xs flex items-center gap-0.5"><Clock size={10} />{slot.start_time?.slice(0, 5)}–{slot.end_time?.slice(0, 5)}</span>
          </div>
          {/* Fiyat */}
          <div className="text-sm font-bebas text-accent">₺{slot.price_per_session}/seans</div>
        </div>

        {/* Butonlar: Ödeme, Öğrenci, Sil */}
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <button onClick={() => onTogglePayment(slot.id, slot.payment_enabled)} disabled={togglingPayment === slot.id}
            className={cn('text-[10px] px-2.5 py-1.5 rounded-lg border transition-colors disabled:opacity-40 font-medium',
              slot.payment_enabled ? 'bg-accent/10 text-accent border-accent/30' : 'text-text-muted border-[rgba(228,224,216,0.1)] hover:border-accent/30'
            )}>
            {slot.payment_enabled ? '₺' : '₺'}
          </button>
          <button onClick={() => onAddBooking(slot.id)} className="text-[10px] px-3 py-1.5 rounded-lg border bg-[rgba(228,224,216,0.06)] text-text-muted border-[rgba(228,224,216,0.15)] hover:bg-accent/10 hover:text-accent hover:border-accent/30 transition-colors font-medium">+ Ders</button>
          <button onClick={() => onDelete(slot.id)} className="p-1.5 text-text-muted hover:text-red-400 hover:bg-red-400/5 rounded-lg transition-colors"><X size={14} /></button>
        </div>
      </div>

      {addBookingSlot === slot.id && (
        <div className="pt-3 border-t border-[rgba(228,224,216,0.08)] space-y-3">
          <div className="bg-[rgba(228,224,216,0.04)] p-2.5 rounded-lg border border-[rgba(228,224,216,0.08)]">
            <p className="text-text-muted text-[10px] uppercase tracking-wide mb-1">Ders Detayları</p>
            <div className="flex items-center gap-2 text-sm">
              <span className="text-text-primary font-medium">{slot.start_time?.slice(0, 5)} – {slot.end_time?.slice(0, 5)}</span>
              {bookForm.lesson_date && (
                <span className="text-text-muted text-xs">
                  · {new Date(bookForm.lesson_date + 'T00:00:00').toLocaleDateString('tr-TR', { weekday: 'short', day: 'numeric', month: 'short' })}
                </span>
              )}
            </div>
          </div>

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
