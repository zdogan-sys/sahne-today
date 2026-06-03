'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, ChevronLeft, ChevronRight, Plus, X, Loader2, GripVertical } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'
import { DndContext, DragEndEvent, closestCenter } from '@dnd-kit/core'
import { useDraggable, useDroppable } from '@dnd-kit/core'

const DAY_NAMES = ['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi']
const DAY_SHORT = ['Paz', 'Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt']
const GRID_START = 8
const GRID_END = 22
const ROW_HEIGHT = 60

export default function RoomCalendarPage() {
  const router = useRouter()
  const params = useParams()
  const venueId = params.venueId as string
  const roomId = params.roomId as string
  const supabase = createClient()

  const [venue, setVenue] = useState<any>(null)
  const [room, setRoom] = useState<any>(null)
  const [instructors, setInstructors] = useState<any[]>([])
  const [templates, setTemplates] = useState<any[]>([])
  const [lessons, setLessons] = useState<any[]>([])
  const [reservations, setReservations] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  // Week navigation
  const [weekStart, setWeekStart] = useState(() => {
    const d = new Date()
    d.setDate(d.getDate() - d.getDay())
    d.setHours(0, 0, 0, 0)
    return d
  })

  // Selection & forms
  const [selectedCell, setSelectedCell] = useState<{ day: number; hour: number } | null>(null)
  const [lessonForm, setLessonForm] = useState({
    instructor_name: '',
    student_name: '',
    student_email: '',
    student_phone: '',
    template_id: '',
  })

  const load = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/auth'); return }

    const { data: venueData } = await supabase
      .from('venues')
      .select('*')
      .eq('id', venueId)
      .single()

    if (!venueData || venueData.owner_id !== user.id) {
      router.push('/dashboard')
      return
    }

    const { data: roomData } = await supabase
      .from('studio_rooms')
      .select('*')
      .eq('id', roomId)
      .eq('venue_id', venueId)
      .single()

    if (!roomData) {
      router.push(`/dashboard/venue/${venueId}`)
      return
    }

    setVenue(venueData)
    setRoom(roomData)

    const isLesson = ['dance_studio', 'music_school'].includes(venueData.venue_type)

    // Fetch data based on venue type
    if (isLesson) {
      const [instRes, templRes, lessRes] = await Promise.all([
        supabase.from('venue_instructors').select('*').eq('venue_id', venueId).eq('is_active', true),
        supabase.from('venue_lesson_templates').select('*').eq('venue_id', venueId).eq('is_active', true),
        supabase.from('teaching_slots').select('*').eq('room_id', roomId).eq('is_active', true),
      ])
      setInstructors(instRes.data ?? [])
      setTemplates(templRes.data ?? [])
      setLessons(lessRes.data ?? [])
    } else {
      const resRes = await supabase
        .from('studio_reservations')
        .select('*')
        .eq('room_id', roomId)
        .not('status', 'eq', 'cancelled')
      setReservations(resRes.data ?? [])
    }

    setLoading(false)
  }, [venueId, roomId, supabase, router])

  useEffect(() => { load() }, [load])

  const isLesson = venue && ['dance_studio', 'music_school'].includes(venue.venue_type)

  function prevWeek() {
    setWeekStart(d => {
      const n = new Date(d)
      n.setDate(n.getDate() - 7)
      return n
    })
  }

  function nextWeek() {
    setWeekStart(d => {
      const n = new Date(d)
      n.setDate(n.getDate() + 7)
      return n
    })
  }

  const weekDates = Array.from({ length: 7 }).map((_, i) => {
    const d = new Date(weekStart)
    d.setDate(d.getDate() + i)
    return d
  })

  const dateToString = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

  async function addLesson() {
    if (!lessonForm.instructor_name || !lessonForm.student_name || !lessonForm.student_email || !lessonForm.student_phone || !selectedCell) {
      setError('Tüm alanlar zorunludur')
      return
    }

    setSaving(true)
    setError('')

    const startTime = `${String(selectedCell.hour).padStart(2, '0')}:00:00`
    const endTime = `${String(selectedCell.hour + 1).padStart(2, '0')}:00:00`
    const lessonDate = dateToString(weekDates[selectedCell.day])

    // If template selected, create multiple slots for N weeks
    if (lessonForm.template_id) {
      const template = templates.find(t => t.id === lessonForm.template_id)
      if (!template) { setError('Şablon bulunamadı'); setSaving(false); return }

      const slots = []
      for (let w = 0; w < template.weeks; w++) {
        const slotDate = new Date(weekDates[selectedCell.day])
        slotDate.setDate(slotDate.getDate() + w * 7)
        slots.push({
          venue_id: venueId,
          room_id: roomId,
          instructor_name: lessonForm.instructor_name,
          instrument: template.subject || 'Ders',
          day_of_week: selectedCell.day,
          start_time: startTime,
          end_time: endTime,
          price_per_session: template.price_total / template.weeks,
          is_active: true,
          slot_type: 'lesson',
          recurrence: 'once',
          slot_date: dateToString(slotDate),
        })
      }

      const { error: slotErr } = await supabase.from('teaching_slots').insert(slots as any)
      if (slotErr) { setError(slotErr.message); setSaving(false); return }

      // Create booking for first lesson
      const firstSlot = slots[0]
      const { error: bookErr } = await supabase
        .from('teaching_bookings')
        .insert({
          slot_id: null, // Will be filled by trigger or we need to fetch and link
          student_name: lessonForm.student_name,
          student_email: lessonForm.student_email,
          student_phone: lessonForm.student_phone,
          lesson_date: firstSlot.slot_date,
          status: 'pending',
          booked_by: 'teacher',
        })

      if (bookErr) console.error('Booking error:', bookErr)
    } else {
      // Single lesson
      const { data: slot, error: slotErr } = await supabase
        .from('teaching_slots')
        .insert({
          venue_id: venueId,
          room_id: roomId,
          instructor_name: lessonForm.instructor_name,
          instrument: 'Ders',
          day_of_week: selectedCell.day,
          start_time: startTime,
          end_time: endTime,
          price_per_session: 0,
          is_active: true,
          slot_type: 'lesson',
          recurrence: 'once',
          slot_date: lessonDate,
        } as any)
        .select()
        .single()

      if (slotErr || !slot) { setError(slotErr?.message ?? 'Slot oluşturulamadı'); setSaving(false); return }

      const { error: bookErr } = await supabase
        .from('teaching_bookings')
        .insert({
          slot_id: slot.id,
          student_name: lessonForm.student_name,
          student_email: lessonForm.student_email,
          student_phone: lessonForm.student_phone,
          lesson_date: lessonDate,
          status: 'pending',
          booked_by: 'teacher',
        })

      if (bookErr) { setError(bookErr.message); setSaving(false); return }
    }

    setLessonForm({ instructor_name: '', student_name: '', student_email: '', student_phone: '', template_id: '' })
    setSelectedCell(null)
    await load()
    setSaving(false)
  }

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over) return

    const lesson = lessons.find(l => l.id === active.id)
    if (!lesson) return

    const [newDay, newHour] = (over.id as string).split('-').map(Number)
    const newDate = dateToString(weekDates[newDay])
    const startTime = `${String(newHour).padStart(2, '0')}:00:00`
    const endTime = `${String(newHour + 1).padStart(2, '0')}:00:00`

    setSaving(true)
    await supabase
      .from('teaching_slots')
      .update({
        day_of_week: newDay,
        start_time: startTime,
        end_time: endTime,
        slot_date: newDate,
      })
      .eq('id', lesson.id)

    await load()
    setSaving(false)
  }

  if (loading) return <div className="max-w-7xl mx-auto px-4 py-12 flex justify-center"><Loader2 size={24} className="animate-spin text-accent" /></div>

  if (!venue || !room) return (
    <div className="max-w-7xl mx-auto px-4 py-12 text-center">
      <p className="text-text-muted">Oda bulunamadı.</p>
      <Link href={`/dashboard/venue/${venueId}`} className="text-accent mt-2 block">Mekan Hub'a dön →</Link>
    </div>
  )

  // Grid data
  const gridLessons: Record<string, any> = {}
  const gridReservations: Record<string, any> = {}

  if (isLesson) {
    lessons.forEach(l => {
      if (l.slot_date) {
        const d = new Date(l.slot_date + 'T00:00:00')
        const dayIdx = d.getDay()
        const hour = parseInt(l.start_time.split(':')[0])
        if (weekDates[dayIdx]?.toDateString() === d.toDateString()) {
          const key = `${dayIdx}-${hour}`
          gridLessons[key] = l
        }
      }
    })
  } else {
    reservations.forEach(r => {
      const d = new Date(r.reservation_date + 'T00:00:00')
      const dayIdx = d.getDay()
      if (weekDates[dayIdx]?.toDateString() === d.toDateString()) {
        const hour = parseInt(r.start_time.split(':')[0])
        const key = `${dayIdx}-${hour}`
        gridReservations[key] = r
      }
    })
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
      {/* Header */}
      <div>
        <Link href={`/dashboard/venue/${venueId}`} className="flex items-center gap-2 text-text-muted text-sm mb-4 hover:text-text-primary w-fit">
          <ArrowLeft size={16} /> {venue.name}
        </Link>
        <h1 className="font-bebas text-4xl text-text-primary">{room.name}</h1>
      </div>

      {/* Week Navigation */}
      <div className="flex items-center justify-between card p-4">
        <button onClick={prevWeek} className="p-2 rounded-lg hover:bg-[rgba(228,224,216,0.1)]"><ChevronLeft size={18} /></button>
        <span className="font-bebas text-lg text-text-primary">
          {weekDates[0].toLocaleDateString('tr-TR', { day: 'numeric', month: 'long' })} – {weekDates[6].toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' })}
        </span>
        <button onClick={nextWeek} className="p-2 rounded-lg hover:bg-[rgba(228,224,216,0.1)]"><ChevronRight size={18} /></button>
      </div>

      {/* Grid */}
      <DndContext onDragEnd={isLesson ? handleDragEnd : undefined} collisionDetection={closestCenter}>
        <div className="card p-4 overflow-x-auto">
          <div className="grid gap-0.5" style={{ gridTemplateColumns: 'auto repeat(7, minmax(130px, 1fr))', minWidth: '1000px' }}>
            {/* Time col header */}
            <div className="font-semibold text-xs text-text-muted text-center py-2" />

            {/* Day headers */}
            {weekDates.map((d, i) => (
              <div key={`header-${i}`} className="font-semibold text-xs text-text-primary text-center py-2 border-b border-[rgba(228,224,216,0.1)]">
                <div>{DAY_SHORT[d.getDay()]}</div>
                <div className="text-[10px] text-text-muted font-normal">{d.getDate()}</div>
              </div>
            ))}

            {/* Time rows */}
            {Array.from({ length: GRID_END - GRID_START }).map((_, hourIdx) => {
              const hour = GRID_START + hourIdx
              return (
                <div key={`row-${hour}`}>
                  {/* Time label */}
                  <div className="text-[10px] text-text-muted text-center py-2 font-medium">
                    {String(hour).padStart(2, '0')}:00
                  </div>

                  {/* Cells */}
                  {weekDates.map((d, dayIdx) => {
                    const cellKey = `${dayIdx}-${hour}`
                    const hasLesson = gridLessons[cellKey]
                    const hasReservation = gridReservations[cellKey]
                    const content = hasLesson || hasReservation

                    return (
                      <GridCell key={cellKey} id={cellKey} isLesson={isLesson}>
                        {content ? (
                          <GridItem item={content} isLesson={isLesson} />
                        ) : isLesson ? (
                          <button onClick={() => setSelectedCell({ day: dayIdx, hour })} className="w-full h-full text-xs text-text-muted hover:text-accent transition-colors p-1 flex items-center justify-center opacity-0 hover:opacity-100 group">
                            <Plus size={14} />
                          </button>
                        ) : null}
                      </GridCell>
                    )
                  })}
                </div>
              )
            })}
          </div>
        </div>
      </DndContext>

      {/* Form - Add Lesson (untuk lesson venues) */}
      {isLesson && selectedCell && (
        <div className="card p-5 space-y-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bebas text-xl text-text-primary">
              {DAY_NAMES[selectedCell.day]} {String(selectedCell.hour).padStart(2, '0')}:00 - Ders Ekle
            </h3>
            <button onClick={() => setSelectedCell(null)} className="text-text-muted hover:text-text-primary"><X size={16} /></button>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label text-xs">Eğitmen *</label>
              {instructors.length > 0 ? (
                <select value={lessonForm.instructor_name} onChange={e => setLessonForm(p => ({ ...p, instructor_name: e.target.value }))} className="input-field text-sm mt-1">
                  <option value="">Seçin...</option>
                  {instructors.map(inst => (
                    <option key={inst.id} value={inst.name}>{inst.name}</option>
                  ))}
                </select>
              ) : (
                <input value={lessonForm.instructor_name} onChange={e => setLessonForm(p => ({ ...p, instructor_name: e.target.value }))} className="input-field text-sm mt-1" placeholder="Eğitmen adı" />
              )}
            </div>
            <div>
              <label className="label text-xs">Şablon (opsiyonel)</label>
              <select value={lessonForm.template_id} onChange={e => setLessonForm(p => ({ ...p, template_id: e.target.value }))} className="input-field text-sm mt-1">
                <option value="">Seçin...</option>
                {templates.map(tmpl => (
                  <option key={tmpl.id} value={tmpl.id}>{tmpl.name} ({tmpl.weeks}h)</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="label text-xs">Öğrenci Adı *</label>
            <input value={lessonForm.student_name} onChange={e => setLessonForm(p => ({ ...p, student_name: e.target.value }))} className="input-field text-sm mt-1" placeholder="Ad Soyad" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label text-xs">E-posta *</label>
              <input type="email" value={lessonForm.student_email} onChange={e => setLessonForm(p => ({ ...p, student_email: e.target.value }))} className="input-field text-sm mt-1" />
            </div>
            <div>
              <label className="label text-xs">Telefon *</label>
              <input type="tel" value={lessonForm.student_phone} onChange={e => setLessonForm(p => ({ ...p, student_phone: e.target.value }))} className="input-field text-sm mt-1" />
            </div>
          </div>

          {error && <p className="text-red-400 text-xs">{error}</p>}

          <div className="flex gap-2">
            <button onClick={addLesson} disabled={saving} className="btn-accent flex-1 py-2 text-sm disabled:opacity-50 flex items-center justify-center gap-1.5">
              {saving ? <><Loader2 size={12} className="animate-spin" /> Kaydediliyor...</> : <><Plus size={12} /> Ders Ekle</>}
            </button>
            <button onClick={() => setSelectedCell(null)} className="flex-1 py-2 text-sm rounded-lg border border-[rgba(228,224,216,0.1)] text-text-muted hover:text-text-primary">İptal</button>
          </div>
        </div>
      )}
    </div>
  )
}

function GridCell({ id, isLesson, children }: { id: string; isLesson: boolean; children: React.ReactNode }) {
  const { setNodeRef } = useDroppable({ id })
  return (
    <div ref={setNodeRef} className="relative border border-[rgba(228,224,216,0.1)] min-h-[60px] p-1 group hover:bg-[rgba(228,224,216,0.04)] transition-colors">
      {children}
    </div>
  )
}

function GridItem({ item, isLesson }: { item: any; isLesson: boolean }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: item.id })

  if (isLesson) {
    return (
      <button
        ref={setNodeRef}
        {...attributes}
        {...listeners}
        className={cn(
          'w-full text-xs rounded-lg p-1 border transition-all flex items-start gap-1',
          isDragging ? 'opacity-50' : 'bg-accent/20 border-accent/30 text-accent hover:bg-accent/30 cursor-grab active:cursor-grabbing'
        )}>
        <GripVertical size={10} className="flex-shrink-0 mt-0.5 opacity-50" />
        <div className="flex-1 text-left truncate">
          <div className="font-medium truncate">{item.instructor_name}</div>
        </div>
      </button>
    )
  } else {
    // Studio reservation
    return (
      <div className="w-full text-xs rounded-lg p-1 border bg-blue-500/20 border-blue-500/30 text-blue-300 flex items-start gap-1">
        <div className="flex-1 text-left truncate">
          <div className="font-medium truncate">{item.reserver_name}</div>
        </div>
      </div>
    )
  }
}
