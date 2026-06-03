'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, ChevronLeft, ChevronRight, Plus, X, Loader2, Trash2, GraduationCap, User } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { DndContext, DragEndEvent, useDraggable, useDroppable, useSensor, useSensors, PointerSensor } from '@dnd-kit/core'

// Pazartesi → Pazar
const DAYS_TR = ['Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi', 'Pazar']
const DAYS_SHORT = ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz']
const DAY_COLORS = ['#3b82f6', '#f97316', '#eab308', '#22c55e', '#ec4899', '#a855f7', '#ef4444']
const DAY_LIGHT = ['#dbeafe', '#ffedd5', '#fef9c3', '#dcfce7', '#fce7f3', '#f3e8ff', '#fee2e2']
const HOURS = Array.from({ length: 14 }, (_, i) => i + 8) // 08:00 - 21:00

const pad = (n: number) => String(n).padStart(2, '0')
const dateStr = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`

function getMonday(d: Date) {
  const x = new Date(d)
  const day = x.getDay()
  const diff = (day + 6) % 7 // Pazartesi = 0
  x.setDate(x.getDate() - diff)
  x.setHours(0, 0, 0, 0)
  return x
}

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

  const [weekStart, setWeekStart] = useState(() => getMonday(new Date()))

  // Modals
  const [addCell, setAddCell] = useState<{ col: number; hour: number } | null>(null)
  const [detailItem, setDetailItem] = useState<any>(null)

  const [form, setForm] = useState({
    student_name: '', student_email: '', student_phone: '',
    instructor_name: '', lesson_type: 'single' as 'single' | 'package', template_id: '',
  })

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }))

  const isLesson = venue && ['dance_studio', 'music_school'].includes(venue.venue_type)

  const load = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/auth'); return }

    const { data: venueData } = await supabase.from('venues').select('*').eq('id', venueId).single()
    if (!venueData || venueData.owner_id !== user.id) { router.push('/dashboard'); return }

    const { data: roomData } = await supabase.from('studio_rooms').select('*').eq('id', roomId).eq('venue_id', venueId).single()
    if (!roomData) { router.push(`/dashboard/venue/${venueId}`); return }

    setVenue(venueData)
    setRoom(roomData)

    const lessonModule = ['dance_studio', 'music_school'].includes(venueData.venue_type)

    if (lessonModule) {
      const [instRes, templRes, lessRes] = await Promise.all([
        supabase.from('venue_instructors').select('*').eq('venue_id', venueId).eq('is_active', true),
        supabase.from('venue_lesson_templates').select('*').eq('venue_id', venueId).eq('is_active', true),
        supabase.from('teaching_slots').select('*, teaching_bookings(id, student_name, student_email, student_phone, status)').eq('room_id', roomId).eq('is_active', true),
      ])
      setInstructors(instRes.data ?? [])
      setTemplates(templRes.data ?? [])
      setLessons(lessRes.data ?? [])
    } else {
      const resRes = await supabase.from('studio_reservations').select('*').eq('room_id', roomId).not('status', 'eq', 'cancelled')
      setReservations(resRes.data ?? [])
    }

    setLoading(false)
  }, [venueId, roomId, supabase, router])

  useEffect(() => { load() }, [load])

  const weekDates = Array.from({ length: 7 }).map((_, i) => {
    const d = new Date(weekStart)
    d.setDate(d.getDate() + i)
    return d
  })

  function prevWeek() { setWeekStart(d => { const n = new Date(d); n.setDate(n.getDate() - 7); return n }) }
  function nextWeek() { setWeekStart(d => { const n = new Date(d); n.setDate(n.getDate() + 7); return n }) }
  function thisWeek() { setWeekStart(getMonday(new Date())) }

  // Grid map: key = `${col}-${hour}` → item
  const grid: Record<string, any> = {}
  if (isLesson) {
    lessons.forEach(l => {
      if (!l.slot_date) return
      const col = weekDates.findIndex(wd => dateStr(wd) === l.slot_date)
      if (col === -1) return
      const hour = parseInt(l.start_time.split(':')[0])
      grid[`${col}-${hour}`] = l
    })
  } else {
    reservations.forEach(r => {
      const col = weekDates.findIndex(wd => dateStr(wd) === r.reservation_date)
      if (col === -1) return
      const hour = parseInt(r.start_time.split(':')[0])
      grid[`${col}-${hour}`] = r
    })
  }

  function openAdd(col: number, hour: number) {
    setError('')
    setForm({ student_name: '', student_email: '', student_phone: '', instructor_name: '', lesson_type: 'single', template_id: '' })
    setAddCell({ col, hour })
  }

  async function saveLesson() {
    if (!addCell) return
    if (!form.student_name || !form.instructor_name) { setError('Öğrenci ve eğitmen zorunludur'); return }
    if (form.lesson_type === 'package' && !form.template_id) { setError('Kurs paketi seçin'); return }

    setSaving(true)
    setError('')

    const startTime = `${pad(addCell.hour)}:00:00`
    const endTime = `${pad(addCell.hour + 1)}:00:00`
    const baseDate = weekDates[addCell.col]
    const colDayOfWeek = baseDate.getDay()

    let weeks = 1
    let subject = 'Özel Ders'
    let pricePer = 0
    if (form.lesson_type === 'package') {
      const tmpl = templates.find(t => t.id === form.template_id)
      if (!tmpl) { setError('Şablon bulunamadı'); setSaving(false); return }
      weeks = tmpl.weeks
      subject = tmpl.name
      pricePer = tmpl.weeks > 0 ? tmpl.price_total / tmpl.weeks : tmpl.price_total
    }

    // N haftalık slotlar oluştur
    const slotRows = []
    for (let w = 0; w < weeks; w++) {
      const d = new Date(baseDate)
      d.setDate(d.getDate() + w * 7)
      slotRows.push({
        venue_id: venueId, room_id: roomId, artist_id: null,
        instructor_name: form.instructor_name, instrument: subject,
        day_of_week: colDayOfWeek, slot_date: dateStr(d),
        start_time: startTime, end_time: endTime,
        price_per_session: pricePer, is_active: true, slot_type: 'lesson', recurrence: 'once',
      })
    }

    const { data: createdSlots, error: slotErr } = await supabase.from('teaching_slots').insert(slotRows as any).select()
    if (slotErr || !createdSlots) { setError(slotErr?.message ?? 'Slot oluşturulamadı'); setSaving(false); return }

    // Her slot için booking
    const bookingRows = createdSlots.map((s: any) => ({
      slot_id: s.id, artist_id: null, student_name: form.student_name,
      student_email: form.student_email || 'belirtilmedi@sahne.today', student_phone: form.student_phone || '-',
      lesson_date: s.slot_date, status: 'confirmed', booked_by: 'teacher',
    }))
    const { error: bookErr } = await supabase.from('teaching_bookings').insert(bookingRows as any)
    if (bookErr) { setError(bookErr.message); setSaving(false); return }

    setAddCell(null)
    await load()
    setSaving(false)
  }

  async function deleteLesson(slotId: string) {
    setSaving(true)
    await supabase.from('teaching_slots').update({ is_active: false }).eq('id', slotId)
    setDetailItem(null)
    await load()
    setSaving(false)
  }

  async function updateInstructor(slotId: string, name: string) {
    setSaving(true)
    await supabase.from('teaching_slots').update({ instructor_name: name }).eq('id', slotId)
    await load()
    setSaving(false)
  }

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || !isLesson) return
    const lesson = lessons.find(l => l.id === active.id)
    if (!lesson) return

    const [newCol, newHour] = (over.id as string).split('-').map(Number)
    const newDate = dateStr(weekDates[newCol])
    if (newDate === lesson.slot_date && newHour === parseInt(lesson.start_time.split(':')[0])) return

    setSaving(true)
    await supabase.from('teaching_slots').update({
      day_of_week: weekDates[newCol].getDay(),
      slot_date: newDate,
      start_time: `${pad(newHour)}:00:00`,
      end_time: `${pad(newHour + 1)}:00:00`,
    }).eq('id', lesson.id)
    await load()
    setSaving(false)
  }

  if (loading) return <div className="max-w-7xl mx-auto px-4 py-12 flex justify-center"><Loader2 size={24} className="animate-spin text-accent" /></div>
  if (!venue || !room) return (
    <div className="max-w-7xl mx-auto px-4 py-12 text-center">
      <p className="text-text-muted">Oda bulunamadı.</p>
      <Link href={`/dashboard/venue/${venueId}`} className="text-accent mt-2 block">Mekana dön →</Link>
    </div>
  )

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-5">
      {/* Header */}
      <div>
        <Link href={`/dashboard/venue/${venueId}`} className="flex items-center gap-2 text-text-muted text-sm mb-4 hover:text-text-primary w-fit">
          <ArrowLeft size={16} /> {venue.name}
        </Link>
        <div className="flex items-center justify-between flex-wrap gap-3">
          <h1 className="font-bebas text-4xl text-text-primary">{room.name}</h1>
          <div className="flex items-center gap-2">
            <button onClick={prevWeek} className="w-9 h-9 rounded-lg bg-surface border border-[rgba(228,224,216,0.1)] flex items-center justify-center text-text-muted hover:text-text-primary"><ChevronLeft size={18} /></button>
            <button onClick={thisWeek} className="px-3 h-9 rounded-lg bg-surface border border-[rgba(228,224,216,0.1)] text-text-primary text-sm font-medium min-w-[180px]">
              {weekDates[0].toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' })} – {weekDates[6].toLocaleDateString('tr-TR', { day: 'numeric', month: 'short', year: 'numeric' })}
            </button>
            <button onClick={nextWeek} className="w-9 h-9 rounded-lg bg-surface border border-[rgba(228,224,216,0.1)] flex items-center justify-center text-text-muted hover:text-text-primary"><ChevronRight size={18} /></button>
          </div>
        </div>
      </div>

      {/* Takvim — açık tema */}
      <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
        <div className="overflow-x-auto rounded-2xl p-3" style={{ background: '#f8f9fb' }}>
          <div className="grid gap-1.5" style={{ gridTemplateColumns: '64px repeat(7, minmax(120px, 1fr))', minWidth: '900px' }}>
            {/* Köşe boş */}
            <div />
            {/* Gün başlıkları */}
            {weekDates.map((d, col) => (
              <div key={`h-${col}`} className="rounded-xl px-2 py-2 text-center text-white font-semibold" style={{ background: DAY_COLORS[col] }}>
                <div className="text-xs uppercase tracking-wide leading-none">{DAYS_SHORT[col]}</div>
                <div className="text-[10px] opacity-90 mt-0.5 font-normal">{d.getDate()} {d.toLocaleDateString('tr-TR', { month: 'short' })}</div>
              </div>
            ))}

            {/* Saat satırları */}
            {HOURS.map(hour => (
              <div key={`row-${hour}`} className="contents">
                {/* Saat etiketi — koyu mavi pill */}
                <div className="flex items-center justify-center rounded-xl text-white text-xs font-semibold" style={{ background: '#1e3a5f', minHeight: '56px' }}>
                  {pad(hour)}:00
                </div>

                {/* Hücreler */}
                {weekDates.map((_, col) => {
                  const key = `${col}-${hour}`
                  const item = grid[key]
                  return (
                    <Cell key={key} id={key} hasItem={!!item} dayLight={DAY_LIGHT[col]} isLesson={isLesson} onAdd={() => openAdd(col, hour)}>
                      {item && (
                        isLesson
                          ? <LessonChip lesson={item} color={DAY_COLORS[col]} light={DAY_LIGHT[col]} onClick={() => setDetailItem(item)} />
                          : <ReservationChip res={item} onClick={() => setDetailItem(item)} />
                      )}
                    </Cell>
                  )
                })}
              </div>
            ))}
          </div>
        </div>
      </DndContext>

      {!isLesson && (
        <p className="text-text-muted text-xs text-center">Kayıt stüdyosu — rezervasyonlar gösteriliyor. Rezervasyonlar müşteri tarafından yapılır.</p>
      )}

      {/* === ADD MODAL === */}
      {addCell && isLesson && (
        <Modal onClose={() => setAddCell(null)} title={`${DAYS_TR[addCell.col]} ${pad(addCell.hour)}:00 — Ders Ekle`}>
          <div className="space-y-3">
            {/* Ders tipi seçimi */}
            <div className="flex gap-2">
              <button onClick={() => setForm(p => ({ ...p, lesson_type: 'single' }))}
                className={`flex-1 py-2 text-sm rounded-lg border transition-colors ${form.lesson_type === 'single' ? 'bg-accent/10 text-accent border-accent/30' : 'text-text-muted border-[rgba(228,224,216,0.15)]'}`}>
                <User size={14} className="inline mr-1" /> Tek Ders
              </button>
              <button onClick={() => setForm(p => ({ ...p, lesson_type: 'package' }))}
                className={`flex-1 py-2 text-sm rounded-lg border transition-colors ${form.lesson_type === 'package' ? 'bg-accent/10 text-accent border-accent/30' : 'text-text-muted border-[rgba(228,224,216,0.15)]'}`}>
                <GraduationCap size={14} className="inline mr-1" /> Kurs Paketi
              </button>
            </div>

            {form.lesson_type === 'package' && (
              <div>
                <label className="label text-xs">Kurs Paketi *</label>
                {templates.length > 0 ? (
                  <select value={form.template_id} onChange={e => setForm(p => ({ ...p, template_id: e.target.value }))} className="input-field text-sm mt-1">
                    <option value="">Seçin...</option>
                    {templates.map(t => <option key={t.id} value={t.id}>{t.name} — {t.weeks} hafta</option>)}
                  </select>
                ) : (
                  <p className="text-text-muted text-xs mt-1">Henüz kurs şablonu yok. Mekan sayfasından ekleyin.</p>
                )}
                {form.template_id && (() => {
                  const t = templates.find(x => x.id === form.template_id)
                  return t ? <p className="text-accent text-xs mt-1.5">→ {t.weeks} hafta boyunca her {DAYS_TR[addCell.col]} {pad(addCell.hour)}:00'da ders işlenecek</p> : null
                })()}
              </div>
            )}

            <div>
              <label className="label text-xs">Eğitmen *</label>
              {instructors.length > 0 ? (
                <select value={form.instructor_name} onChange={e => setForm(p => ({ ...p, instructor_name: e.target.value }))} className="input-field text-sm mt-1">
                  <option value="">Seçin...</option>
                  {instructors.map(i => <option key={i.id} value={i.name}>{i.name}</option>)}
                </select>
              ) : (
                <input value={form.instructor_name} onChange={e => setForm(p => ({ ...p, instructor_name: e.target.value }))} className="input-field text-sm mt-1" placeholder="Eğitmen adı" />
              )}
            </div>

            <div>
              <label className="label text-xs">Öğrenci Adı *</label>
              <input value={form.student_name} onChange={e => setForm(p => ({ ...p, student_name: e.target.value }))} className="input-field text-sm mt-1" placeholder="Ad Soyad" />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="label text-xs">E-posta</label>
                <input type="email" value={form.student_email} onChange={e => setForm(p => ({ ...p, student_email: e.target.value }))} className="input-field text-sm mt-1" />
              </div>
              <div>
                <label className="label text-xs">Telefon</label>
                <input type="tel" value={form.student_phone} onChange={e => setForm(p => ({ ...p, student_phone: e.target.value }))} className="input-field text-sm mt-1" />
              </div>
            </div>

            {error && <p className="text-red-400 text-xs">{error}</p>}

            <div className="flex gap-2 pt-1">
              <button onClick={saveLesson} disabled={saving} className="btn-accent flex-1 py-2.5 text-sm disabled:opacity-50 flex items-center justify-center gap-1.5">
                {saving ? <><Loader2 size={13} className="animate-spin" /> Kaydediliyor...</> : <><Plus size={13} /> {form.lesson_type === 'package' ? 'Kursu İşle' : 'Ders Ekle'}</>}
              </button>
              <button onClick={() => setAddCell(null)} className="px-4 py-2.5 text-sm rounded-lg border border-[rgba(228,224,216,0.15)] text-text-muted hover:text-text-primary">İptal</button>
            </div>
          </div>
        </Modal>
      )}

      {/* === DETAIL MODAL === */}
      {detailItem && (
        <Modal onClose={() => setDetailItem(null)} title={isLesson ? 'Ders Detayı' : 'Rezervasyon Detayı'}>
          {isLesson ? (
            <div className="space-y-3">
              <DetailRow label="Kurs / Ders" value={detailItem.instrument} />
              <div>
                <label className="label text-xs">Eğitmen</label>
                {instructors.length > 0 ? (
                  <select defaultValue={detailItem.instructor_name} onChange={e => updateInstructor(detailItem.id, e.target.value)} className="input-field text-sm mt-1">
                    {instructors.map(i => <option key={i.id} value={i.name}>{i.name}</option>)}
                    {!instructors.find(i => i.name === detailItem.instructor_name) && <option value={detailItem.instructor_name}>{detailItem.instructor_name}</option>}
                  </select>
                ) : (
                  <p className="text-text-primary text-sm mt-1">{detailItem.instructor_name}</p>
                )}
              </div>
              <DetailRow label="Tarih" value={new Date(detailItem.slot_date + 'T00:00:00').toLocaleDateString('tr-TR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })} />
              <DetailRow label="Saat" value={`${detailItem.start_time?.slice(0, 5)} – ${detailItem.end_time?.slice(0, 5)}`} />
              {detailItem.teaching_bookings?.length > 0 && (
                <div>
                  <label className="label text-xs">Öğrenci(ler)</label>
                  <div className="space-y-1 mt-1">
                    {detailItem.teaching_bookings.map((b: any) => (
                      <div key={b.id} className="text-sm text-text-primary bg-[rgba(228,224,216,0.05)] rounded px-2 py-1">
                        {b.student_name}{b.student_phone && b.student_phone !== '-' ? ` · ${b.student_phone}` : ''}
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {detailItem.price_per_session > 0 && <DetailRow label="Ücret" value={`₺${detailItem.price_per_session}`} />}

              <div className="pt-2">
                <button onClick={() => deleteLesson(detailItem.id)} disabled={saving} className="w-full py-2.5 text-sm rounded-lg border border-red-500/30 text-red-400 hover:bg-red-500/10 transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50">
                  <Trash2 size={14} /> Bu Dersi Sil
                </button>
                <p className="text-text-muted text-[10px] text-center mt-2">İpucu: Dersi başka güne/saate taşımak için tabloda sürükle-bırak yapın.</p>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <DetailRow label="Müşteri" value={detailItem.reserver_name} />
              <DetailRow label="Tarih" value={new Date(detailItem.reservation_date + 'T00:00:00').toLocaleDateString('tr-TR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })} />
              <DetailRow label="Saat" value={`${detailItem.start_time?.slice(0, 5)} – ${detailItem.end_time?.slice(0, 5)}`} />
              {detailItem.reserver_phone && <DetailRow label="Telefon" value={detailItem.reserver_phone} />}
              {detailItem.total_price > 0 && <DetailRow label="Tutar" value={`₺${detailItem.total_price}`} />}
              <span className={`inline-block text-xs px-2 py-1 rounded-full ${detailItem.status === 'confirmed' ? 'bg-success/10 text-success' : 'bg-yellow-400/10 text-yellow-400'}`}>
                {detailItem.status === 'confirmed' ? 'Onaylandı' : 'Onay Bekliyor'}
              </span>
            </div>
          )}
        </Modal>
      )}
    </div>
  )
}

function Cell({ id, hasItem, dayLight, isLesson, onAdd, children }: { id: string; hasItem: boolean; dayLight: string; isLesson: boolean; onAdd: () => void; children: React.ReactNode }) {
  const { setNodeRef, isOver } = useDroppable({ id })
  return (
    <div ref={setNodeRef}
      className="rounded-xl transition-colors relative group"
      style={{
        minHeight: '56px',
        background: hasItem ? 'transparent' : (isOver ? dayLight : '#eef0f4'),
        outline: isOver ? `2px dashed ${dayLight}` : 'none',
      }}>
      {children}
      {!hasItem && isLesson && (
        <button onClick={onAdd} className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity" style={{ color: '#94a3b8' }}>
          <Plus size={16} />
        </button>
      )}
    </div>
  )
}

function LessonChip({ lesson, color, light, onClick }: { lesson: any; color: string; light: string; onClick: () => void }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: lesson.id })
  const student = lesson.teaching_bookings?.[0]?.student_name
  return (
    <button ref={setNodeRef} {...attributes} {...listeners} onClick={onClick}
      className="w-full h-full rounded-xl p-1.5 text-left cursor-grab active:cursor-grabbing transition-opacity overflow-hidden"
      style={{ background: light, borderLeft: `3px solid ${color}`, opacity: isDragging ? 0.4 : 1, minHeight: '56px' }}>
      <div className="text-[11px] font-semibold leading-tight truncate" style={{ color: '#1f2937' }}>{lesson.instrument}</div>
      {student && <div className="text-[10px] leading-tight truncate" style={{ color: '#4b5563' }}>{student}</div>}
      {lesson.instructor_name && <div className="text-[9px] leading-tight truncate" style={{ color: color }}>{lesson.instructor_name}</div>}
    </button>
  )
}

function ReservationChip({ res, onClick }: { res: any; onClick: () => void }) {
  return (
    <button onClick={onClick} className="w-full h-full rounded-xl p-1.5 text-left transition-opacity overflow-hidden"
      style={{ background: '#dbeafe', borderLeft: '3px solid #3b82f6', minHeight: '56px' }}>
      <div className="text-[11px] font-semibold leading-tight truncate" style={{ color: '#1f2937' }}>{res.reserver_name}</div>
      <div className="text-[9px] leading-tight" style={{ color: '#3b82f6' }}>{res.start_time?.slice(0, 5)}–{res.end_time?.slice(0, 5)}</div>
    </button>
  )
}

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-surface border border-[rgba(228,224,216,0.12)] rounded-2xl w-full max-w-md max-h-[85vh] overflow-y-auto shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-4 border-b border-[rgba(228,224,216,0.08)]">
          <h3 className="font-bebas text-xl text-text-primary">{title}</h3>
          <button onClick={onClose} className="p-1 text-text-muted hover:text-text-primary"><X size={18} /></button>
        </div>
        <div className="p-4">{children}</div>
      </div>
    </div>
  )
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <label className="label text-xs">{label}</label>
      <p className="text-text-primary text-sm mt-0.5">{value}</p>
    </div>
  )
}
