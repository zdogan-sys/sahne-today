'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Plus, X, Check, Loader2, Clock, Zap, GripVertical } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'
import { DndContext, DragEndEvent, closestCenter } from '@dnd-kit/core'
import { useDraggable, useDroppable } from '@dnd-kit/core'

const DAY_NAMES = ['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi']
const DAY_SHORT = ['Paz', 'Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt']
const GRID_START = 9
const GRID_END = 21
const ROW_HEIGHT = 64

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
  const [activeTab, setActiveTab] = useState<'weekly' | 'onetime' | 'bookings'>('weekly')
  const [selectedSlotId, setSelectedSlotId] = useState<string | null>(null)
  const [showSlotForm, setShowSlotForm] = useState(false)
  const [addMode, setAddMode] = useState<'template' | 'manual' | 'closed'>('template')
  const [togglingPayment, setTogglingPayment] = useState<string | null>(null)

  // Template form state
  const [templateIdx, setTemplateIdx] = useState(0)
  const [selectedDays, setSelectedDays] = useState<number[]>([])
  const [instructorName, setInstructorName] = useState('')
  const [subject, setSubject] = useState('')
  const [price, setPrice] = useState('')
  const [isOnline, setIsOnline] = useState(false)
  const [lessonType, setLessonType] = useState<'individual' | 'group'>('individual')
  const [maxParticipants, setMaxParticipants] = useState(1)
  const [artistQuery, setArtistQuery] = useState('')
  const [artists, setArtists] = useState<any[]>([])

  // Manual form state
  const [manualSubject, setManualSubject] = useState('')
  const [manualInstructor, setManualInstructor] = useState('')
  const [manualDayOfWeek, setManualDayOfWeek] = useState(1)
  const [manualStartTime, setManualStartTime] = useState('10:00')
  const [manualEndTime, setManualEndTime] = useState('11:00')
  const [manualRecurrence, setManualRecurrence] = useState('weekly')
  const [manualPrice, setManualPrice] = useState('')
  const [manualSlotDate, setManualSlotDate] = useState('')
  const [artistQueryManual, setArtistQueryManual] = useState('')

  // Closed block form state
  const [closedDay, setClosedDay] = useState(1)
  const [closedStartTime, setClosedStartTime] = useState('12:00')
  const [closedEndTime, setClosedEndTime] = useState('13:00')
  const [closedNote, setClosedNote] = useState('')

  // Booking form state
  const [bookForm, setBookForm] = useState({ student_name: '', student_email: '', student_phone: '', lesson_date: '' })

  // Detail panel state
  const [detailSlot, setDetailSlot] = useState<any>(null)
  const [editingTime, setEditingTime] = useState(false)

  const load = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/auth'); return }

    const [{ data: venueData }, { data: membership }] = await Promise.all([
      supabase.from('venues').select('id, name, venue_type').eq('id', venueId).single(),
      supabase.from('venue_members').select('id').eq('venue_id', venueId).eq('user_id', user.id).maybeSingle(),
    ])

    if (!venueData || !membership) {
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
      supabase.from('teaching_slots').select('*').eq('venue_id', venueId).eq('is_active', true),
      supabase.from('teaching_bookings').select('*, teaching_slots(instructor_name, start_time, end_time)').eq('teaching_slots.venue_id', venueId as any).in('status', ['pending', 'awaiting_student', 'confirmed']),
      supabase.from('artists').select('id, stage_name').order('stage_name').limit(200),
    ])

    setInstructors(instRes.data ?? [])
    setSlots(slotsRes.data ?? [])
    setBookings(bookingsRes.data ?? [])
    setArtists(artistsRes.data ?? [])
    setLoading(false)
  }, [venueId, supabase, router])

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
      slot_type: 'lesson',
    }))

    const { error: err } = await supabase.from('teaching_slots').insert(rows as any)
    if (err) { setError(err.message); setSaving(false); return }

    await load()
    setInstructorName('')
    setPrice('')
    setSelectedDays([])
    setShowSlotForm(false)
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
      slot_type: 'lesson',
    }

    const { error: err } = await supabase.from('teaching_slots').insert(row as any)
    if (err) { setError(err.message); setSaving(false); return }

    await load()
    setManualInstructor('')
    setManualPrice('')
    setManualStartTime('10:00')
    setManualEndTime('11:00')
    setManualSlotDate('')
    setShowSlotForm(false)
    setSaving(false)
  }

  async function addClosedBlock() {
    if (!closedNote) {
      setError('Kapalı blok adı zorunludur.')
      return
    }

    setSaving(true)
    setError('')

    const row = {
      venue_id: venueId,
      artist_id: null,
      instructor_name: closedNote,
      instrument: closedNote,
      day_of_week: closedDay,
      slot_date: null,
      start_time: closedStartTime + ':00',
      end_time: closedEndTime + ':00',
      price_per_session: 0,
      is_active: true,
      slot_type: 'closed',
      recurrence: 'weekly',
    }

    const { error: err } = await supabase.from('teaching_slots').insert(row as any)
    if (err) { setError(err.message); setSaving(false); return }

    await load()
    setClosedNote('')
    setClosedDay(1)
    setClosedStartTime('12:00')
    setClosedEndTime('13:00')
    setShowSlotForm(false)
    setSaving(false)
  }

  async function deleteSlot(slotId: string) {
    await supabase.from('teaching_slots').update({ is_active: false } as any).eq('id', slotId)
    await load()
  }

  async function updateSlot(slotId: string, updates: any) {
    await supabase.from('teaching_slots').update(updates).eq('id', slotId)
    await load()
    setDetailSlot(null)
  }

  async function togglePayment(slotId: string, current: boolean) {
    setTogglingPayment(slotId)
    await supabase.from('teaching_slots').update({ payment_enabled: !current } as any).eq('id', slotId)
    await load()
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
    setBookForm({ student_name: '', student_email: '', student_phone: '', lesson_date: '' })
    await load()
    setSaving(false)
  }

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over) return

    const slot = slots.find(s => s.id === active.id)
    if (!slot) return

    const parts = (over.id as string).split('-')
    const newDay = parseInt(parts[0])
    const newHour = parseInt(parts[1])

    const startHour = parseInt(slot.start_time.split(':')[0])
    const endHour = parseInt(slot.end_time.split(':')[0])
    const duration = endHour - startHour

    setSaving(true)
    await updateSlot(slot.id, {
      day_of_week: newDay,
      start_time: `${String(newHour).padStart(2, '0')}:00:00`,
      end_time: `${String(newHour + duration).padStart(2, '0')}:00:00`,
    })
    setSaving(false)
  }

  const recurringSlots = slots.filter(s => !s.slot_date)
  const onetimeSlots = slots.filter(s => !!s.slot_date).sort((a, b) => a.slot_date.localeCompare(b.slot_date))
  const pendingBookings = bookings.filter(b => b.status === 'pending' || b.status === 'awaiting_student')
  const confirmedBookings = bookings.filter(b => b.status === 'confirmed')
  const today = new Date().toISOString().split('T')[0]

  if (loading) return <div className="max-w-full mx-auto px-4 py-12 flex justify-center"><Loader2 size={24} className="animate-spin text-accent" /></div>

  if (!venue) return (
    <div className="max-w-full mx-auto px-4 py-12 text-center">
      <p className="text-text-muted">Mekan bulunamadı.</p>
      <Link href="/dashboard" className="text-accent mt-2 block">Dashboard'a dön →</Link>
    </div>
  )

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
      <div>
        <Link href={`/dashboard/venue/${venueId}`} className="flex items-center gap-2 text-text-muted text-sm mb-4 hover:text-text-primary w-fit">
          <ArrowLeft size={16} /> Mekan
        </Link>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-bebas text-4xl text-text-primary">DERS SAATLERİ</h1>
            <p className="text-text-muted text-sm mt-0.5">{venue.name}</p>
          </div>
          <div className="flex gap-2">
            {activeTab === 'weekly' && (
              <button onClick={() => setShowSlotForm(!showSlotForm)} className="btn-accent py-2 px-4 text-sm flex items-center gap-1.5">
                <Plus size={14} /> {showSlotForm ? 'İptal' : 'Slot Ekle'}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Sekmeler */}
      <div className="flex gap-2 border-b border-[rgba(228,224,216,0.1)]">
        {['weekly', 'onetime', 'bookings'].map(tab => (
          <button key={tab}
            onClick={() => setActiveTab(tab as any)}
            className={cn('px-4 py-2 text-sm font-medium border-b-2 transition-colors -mb-px',
              activeTab === tab ? 'text-accent border-accent' : 'text-text-muted border-transparent hover:text-text-primary'
            )}>
            {tab === 'weekly' ? 'Haftalık Program' : tab === 'onetime' ? 'Tek Seferlik' : 'Rezervasyonlar'}
          </button>
        ))}
      </div>

      {/* Slot Form Modal */}
      {showSlotForm && activeTab === 'weekly' && (
        <div className="card p-5 space-y-5">
          <div className="flex gap-2">
            {(['template', 'manual', 'closed'] as const).map(m => (
              <button key={m} onClick={() => setAddMode(m)}
                className={cn('flex-1 py-2 text-xs font-medium rounded-lg border transition-colors',
                  addMode === m ? 'bg-accent/10 text-accent border-accent/30' : 'text-text-muted border-[rgba(228,224,216,0.1)]'
                )}>
                {m === 'template' ? 'Şablon' : m === 'manual' ? 'Manuel' : 'Kapalı Blok'}
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
                    <button onClick={() => quickSelect([1, 2, 3, 4, 5])} className="text-[10px] px-2 py-0.5 rounded border text-text-muted border-[rgba(228,224,216,0.1)] hover:text-accent transition-colors">Haftaiçi</button>
                    <button onClick={() => quickSelect([0, 6])} className="text-[10px] px-2 py-0.5 rounded border text-text-muted border-[rgba(228,224,216,0.1)] hover:text-accent transition-colors">Haftasonu</button>
                  </div>
                </div>
                <div className="flex gap-1.5">
                  {DAY_SHORT.map((d, i) => (
                    <button key={i} onClick={() => toggleDay(i)}
                      className={cn('flex-1 py-2 text-xs rounded border transition-colors',
                        selectedDays.includes(i) ? 'bg-accent/10 text-accent border-accent/30' : 'text-text-muted border-[rgba(228,224,216,0.1)]'
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
              </div>

              {error && <p className="text-red-400 text-xs">{error}</p>}

              <button onClick={addTemplateSlots} disabled={saving || !instructorName || !price || selectedDays.length === 0}
                className="btn-accent w-full py-2 text-sm disabled:opacity-50 flex items-center justify-center gap-2">
                {saving ? <><Loader2 size={12} className="animate-spin" /> Oluşturuluyor...</> : <Plus size={12} />}
                Şablon Uygula
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

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Gün</label>
                  <select value={manualDayOfWeek} onChange={e => setManualDayOfWeek(Number(e.target.value))} className="input-field text-sm">
                    {DAY_NAMES.map((d, i) => <option key={i} value={i}>{d}</option>)}
                  </select>
                </div>
                <div>
                  <label className="label">Seans Ücreti (₺)</label>
                  <input type="number" min={0} value={manualPrice} onChange={e => setManualPrice(e.target.value)} placeholder="500" className="input-field text-sm" />
                </div>
              </div>

              {error && <p className="text-red-400 text-xs">{error}</p>}

              <button onClick={addManualSlot} disabled={saving || !manualInstructor || !manualPrice}
                className="btn-accent w-full py-2 text-sm disabled:opacity-50 flex items-center justify-center gap-2">
                {saving ? <><Loader2 size={12} className="animate-spin" /></> : <Plus size={12} />}
                Slot Ekle
              </button>
            </div>
          )}

          {addMode === 'closed' && (
            <div className="space-y-4">
              <div>
                <label className="label">Adı (Öğle Arası, İzin, vs.)</label>
                <input value={closedNote} onChange={e => setClosedNote(e.target.value)} className="input-field text-sm" placeholder="Öğle Arası" />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Gün</label>
                  <select value={closedDay} onChange={e => setClosedDay(Number(e.target.value))} className="input-field text-sm">
                    {DAY_NAMES.map((d, i) => <option key={i} value={i}>{d}</option>)}
                  </select>
                </div>
                <div />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Başlangıç</label>
                  <input type="time" value={closedStartTime} onChange={e => setClosedStartTime(e.target.value)} className="input-field text-sm" />
                </div>
                <div>
                  <label className="label">Bitiş</label>
                  <input type="time" value={closedEndTime} onChange={e => setClosedEndTime(e.target.value)} className="input-field text-sm" />
                </div>
              </div>

              {error && <p className="text-red-400 text-xs">{error}</p>}

              <button onClick={addClosedBlock} disabled={saving || !closedNote}
                className="btn-accent w-full py-2 text-sm disabled:opacity-50 flex items-center justify-center gap-2">
                {saving ? <><Loader2 size={12} className="animate-spin" /></> : <Plus size={12} />}
                Blok Ekle
              </button>
            </div>
          )}
        </div>
      )}

      {/* İçerik */}
      {activeTab === 'weekly' && (
        <WeeklyGrid slots={recurringSlots} bookings={bookings} onSelectSlot={setSelectedSlotId} selectedSlotId={selectedSlotId} onDragEnd={handleDragEnd} saving={saving} />
      )}

      {activeTab === 'onetime' && onetimeSlots.length > 0 && (
        <div className="space-y-2">
          {onetimeSlots.map(slot => (
            <div key={slot.id} className="card p-3 flex items-center justify-between">
              <div className="flex-1">
                <p className="text-text-primary text-sm font-medium">{slot.instructor_name}</p>
                <p className="text-text-muted text-xs">{new Date(slot.slot_date + 'T00:00:00').toLocaleDateString('tr-TR')} · {slot.start_time?.slice(0,5)}–{slot.end_time?.slice(0,5)}</p>
              </div>
              <button onClick={() => deleteSlot(slot.id)} className="p-1 text-text-muted hover:text-red-400"><X size={14} /></button>
            </div>
          ))}
        </div>
      )}

      {activeTab === 'bookings' && bookings.length > 0 && (
        <div className="space-y-2">
          {[...pendingBookings, ...confirmedBookings].map(b => {
            const slot = b.teaching_slots
            const dateStr = b.lesson_date ? new Date(b.lesson_date + 'T00:00:00').toLocaleDateString('tr-TR', { day: 'numeric', month: 'long' }) : '—'
            return (
              <div key={b.id} className="card p-3 flex items-center gap-3">
                <div className="flex-1">
                  <p className="text-text-primary text-sm">{b.student_name}</p>
                  <p className="text-text-muted text-xs">{slot?.instructor_name} · {dateStr} · {slot?.start_time?.slice(0,5)}</p>
                </div>
                <span className={cn('text-[10px] px-1.5 py-0.5 rounded border', b.status === 'pending' ? 'text-yellow-400 bg-yellow-400/10' : 'text-success bg-success/10')}>
                  {b.status === 'pending' ? 'Onay Bekleniyor' : 'Onaylandı'}
                </span>
              </div>
            )
          })}
        </div>
      )}

      {/* Detail Panel */}
      {selectedSlotId && (
        <SlotDetailPanel
          slot={slots.find(s => s.id === selectedSlotId)!}
          onClose={() => setSelectedSlotId(null)}
          onDelete={deleteSlot}
          onUpdate={updateSlot}
          onTogglePayment={togglePayment}
          togglingPayment={togglingPayment}
          bookForm={bookForm}
          setBookForm={setBookForm}
          onSubmitBooking={addBookingForStudent}
          saving={saving}
          instructors={instructors}
          bookings={bookings}
        />
      )}
    </div>
  )
}

function WeeklyGrid({ slots, bookings, onSelectSlot, selectedSlotId, onDragEnd, saving }: {
  slots: any[]
  bookings: any[]
  onSelectSlot: (id: string) => void
  selectedSlotId: string | null
  onDragEnd: (event: any) => void
  saving: boolean
}) {
  return (
    <DndContext onDragEnd={onDragEnd} collisionDetection={closestCenter}>
      <div className="card p-4 overflow-x-auto">
        <div className="grid gap-0.5" style={{ gridTemplateColumns: 'repeat(7, minmax(140px, 1fr))', minWidth: '980px' }}>
          {/* Header */}
          {DAY_SHORT.map((day, i) => (
            <div key={`header-${i}`} className="font-semibold text-xs text-text-primary text-center py-2 border-b border-[rgba(228,224,216,0.1)]">
              {day}
            </div>
          ))}

          {/* Grid */}
          {Array.from({ length: GRID_END - GRID_START }).map((_, hourIdx) => {
            const hour = GRID_START + hourIdx
            return Array.from({ length: 7 }).map((_, dayIdx) => {
              const droppableId = `${dayIdx}-${hour}`
              return (
                <GridCell key={droppableId} id={droppableId} hour={hour}>
                  {slots
                    .filter(s => s.day_of_week === dayIdx && !s.slot_date && parseInt(s.start_time.split(':')[0]) === hour)
                    .map(slot => (
                      <GridSlot
                        key={slot.id}
                        slot={slot}
                        onSelect={() => onSelectSlot(slot.id)}
                        isSelected={selectedSlotId === slot.id}
                        bookingCount={bookings.filter(b => b.slot_id === slot.id && b.status !== 'cancelled').length}
                      />
                    ))}
                </GridCell>
              )
            })
          })}
        </div>
      </div>
    </DndContext>
  )
}

function GridCell({ id, hour, children }: { id: string; hour: number; children: React.ReactNode }) {
  const { setNodeRef } = useDroppable({ id })
  return (
    <div ref={setNodeRef} className="relative border border-[rgba(228,224,216,0.1)] min-h-[64px] p-1">
      {children}
    </div>
  )
}

function GridSlot({ slot, onSelect, isSelected, bookingCount }: { slot: any; onSelect: () => void; isSelected: boolean; bookingCount: number }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: slot.id })
  const duration = parseInt(slot.end_time.split(':')[0]) - parseInt(slot.start_time.split(':')[0])
  const isClosedBlock = slot.slot_type === 'closed'

  return (
    <button
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      onClick={onSelect}
      className={cn(
        'w-full p-1.5 text-xs rounded-lg border transition-all cursor-grab active:cursor-grabbing',
        isClosedBlock ? 'bg-red-500/20 border-red-500/30 text-red-300' :
        isSelected ? 'bg-accent/20 border-accent/40 text-accent' :
        isDragging ? 'opacity-50' :
        'bg-[rgba(228,224,216,0.08)] border-[rgba(228,224,216,0.15)] text-text-primary hover:bg-accent/10 hover:border-accent/30'
      )}
      style={{ gridRow: `span ${duration || 1}` }}>
      <div className="flex items-start gap-1">
        <GripVertical size={10} className="flex-shrink-0 mt-0.5 opacity-50" />
        <div className="flex-1 text-left">
          <div className="font-medium truncate">{slot.instructor_name}</div>
          {!isClosedBlock && bookingCount > 0 && (
            <div className="text-[9px] opacity-70">{bookingCount} öğrenci</div>
          )}
        </div>
      </div>
    </button>
  )
}

function SlotDetailPanel({ slot, onClose, onDelete, onUpdate, onTogglePayment, togglingPayment, bookForm, setBookForm, onSubmitBooking, saving, instructors, bookings }: any) {
  const [editingTime, setEditingTime] = useState(false)
  const [newStartTime, setNewStartTime] = useState(slot.start_time?.slice(0, 5))
  const [newEndTime, setNewEndTime] = useState(slot.end_time?.slice(0, 5))
  const [newInstructor, setNewInstructor] = useState(slot.instructor_name)

  const nextDates = getNextDates(slot.day_of_week, slot.recurrence)
  const slotBookings = bookings.filter((b: any) => b.slot_id === slot.id && b.status !== 'cancelled')

  const handleSaveTime = async () => {
    await onUpdate(slot.id, {
      start_time: newStartTime + ':00',
      end_time: newEndTime + ':00',
    })
    setEditingTime(false)
  }

  const handleSaveInstructor = async () => {
    if (newInstructor !== slot.instructor_name) {
      await onUpdate(slot.id, { instructor_name: newInstructor })
    }
  }

  return (
    <div className="fixed inset-0 z-40 bg-black/50" onClick={onClose}>
      <div className="absolute right-0 top-0 h-full w-96 bg-surface border-l border-[rgba(228,224,216,0.1)] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="p-4 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-bebas text-2xl text-text-primary">Ders Detayı</h2>
            <button onClick={onClose} className="p-1 hover:bg-[rgba(228,224,216,0.1)] rounded"><X size={16} /></button>
          </div>

          {slot.slot_type === 'closed' ? (
            <>
              <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3">
                <p className="text-red-300 text-sm">Kapalı Blok: {slot.instructor_name}</p>
              </div>
            </>
          ) : (
            <>
              {/* Eğitmen */}
              <div>
                <label className="label text-xs">Eğitmen</label>
                {editingTime ? (
                  <input value={newInstructor} onChange={e => setNewInstructor(e.target.value)} className="input-field text-sm" />
                ) : (
                  <p className="text-text-primary font-medium">{slot.instructor_name}</p>
                )}
              </div>

              {/* Saat */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="label text-xs">Saat</label>
                  {!editingTime && <button onClick={() => setEditingTime(true)} className="text-[10px] text-accent hover:underline">Düzenle</button>}
                </div>
                {editingTime ? (
                  <div className="space-y-2">
                    <div className="grid grid-cols-2 gap-2">
                      <input type="time" value={newStartTime} onChange={e => setNewStartTime(e.target.value)} className="input-field text-sm" />
                      <input type="time" value={newEndTime} onChange={e => setNewEndTime(e.target.value)} className="input-field text-sm" />
                    </div>
                    <div className="flex gap-2">
                      <button onClick={handleSaveTime} className="btn-accent flex-1 py-1.5 text-xs">Kaydet</button>
                      <button onClick={() => setEditingTime(false)} className="flex-1 py-1.5 text-xs rounded-lg border border-[rgba(228,224,216,0.1)] text-text-muted hover:text-text-primary">İptal</button>
                    </div>
                  </div>
                ) : (
                  <p className="text-text-primary">{slot.start_time?.slice(0,5)} – {slot.end_time?.slice(0,5)}</p>
                )}
              </div>

              {/* Fiyat */}
              <div className="flex items-center justify-between bg-[rgba(228,224,216,0.04)] p-2 rounded-lg">
                <span className="text-text-muted text-xs">Ücret</span>
                <span className="font-bebas text-lg text-accent">₺{slot.price_per_session}</span>
              </div>

              {/* Ödeme */}
              <button
                onClick={() => onTogglePayment(slot.id, slot.payment_enabled)}
                disabled={togglingPayment === slot.id}
                className={cn('w-full py-2 text-xs rounded-lg border transition-colors',
                  slot.payment_enabled ? 'bg-accent/10 text-accent border-accent/30' : 'text-text-muted border-[rgba(228,224,216,0.1)]'
                )}>
                {slot.payment_enabled ? '₺ Ödeme Açık' : '₺ Ödeme Kapalı'}
              </button>

              {/* Öğrenci Ekle */}
              <div className="space-y-2">
                <h3 className="label text-xs">Öğrenci Ekle</h3>
                <div className="space-y-2">
                  <input value={bookForm.student_name} onChange={e => setBookForm((p: any) => ({ ...p, student_name: e.target.value }))} placeholder="Ad Soyad" className="input-field text-xs" />
                  <input type="email" value={bookForm.student_email} onChange={e => setBookForm((p: any) => ({ ...p, student_email: e.target.value }))} placeholder="E-posta" className="input-field text-xs" />
                  <input type="tel" value={bookForm.student_phone} onChange={e => setBookForm((p: any) => ({ ...p, student_phone: e.target.value }))} placeholder="Telefon" className="input-field text-xs" />
                  <select value={bookForm.lesson_date} onChange={e => setBookForm((p: any) => ({ ...p, lesson_date: e.target.value }))} className="input-field text-xs">
                    <option value="">Tarih Seçin</option>
                    {nextDates.map(d => <option key={d} value={d}>{new Date(d + 'T00:00:00').toLocaleDateString('tr-TR', { weekday: 'short', day: 'numeric', month: 'short' })}</option>)}
                  </select>
                  <button
                    onClick={() => onSubmitBooking(slot.id)}
                    disabled={saving || !bookForm.student_name || !bookForm.student_email || !bookForm.student_phone || !bookForm.lesson_date}
                    className="btn-accent w-full py-1.5 text-xs disabled:opacity-50 flex items-center justify-center gap-1">
                    {saving ? <Loader2 size={11} className="animate-spin" /> : <Plus size={11} />}
                    Ekle
                  </button>
                </div>
              </div>

              {/* Mevcut Kayıtlar */}
              {slotBookings.length > 0 && (
                <div className="space-y-2">
                  <h3 className="label text-xs">Kayıtlı Öğrenciler</h3>
                  <div className="space-y-1 max-h-40 overflow-y-auto">
                    {slotBookings.map((b: any) => (
                      <div key={b.id} className="text-xs p-1.5 bg-[rgba(228,224,216,0.04)] rounded">
                        <div className="text-text-primary font-medium">{b.student_name}</div>
                        <div className="text-text-muted text-[9px]">{b.student_email}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}

          {/* Sil */}
          <button onClick={() => { onDelete(slot.id); onClose(); }} className="w-full py-2 text-xs rounded-lg border border-red-500/30 text-red-400 hover:bg-red-500/10 transition-colors">
            <X size={12} className="inline mr-1" /> Sil
          </button>
        </div>
      </div>
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
