'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, ChevronLeft, ChevronRight, Plus, X, Loader2, Trash2, GraduationCap, User } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { DndContext, DragEndEvent, useDraggable, useDroppable, useSensor, useSensors, PointerSensor, pointerWithin } from '@dnd-kit/core'

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
  const supabase = createClient()

  // Aktif oda — sekme tıklamasıyla client-side değişir (tam sayfa yönlendirme yok)
  const [activeRoomId, setActiveRoomId] = useState(params.roomId as string)

  // URL'i sessizce güncelle (yenileme/paylaşım için)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const seg = window.location.pathname.split('/')
      seg[seg.length - 1] = activeRoomId
      window.history.replaceState(null, '', seg.join('/'))
    }
  }, [activeRoomId])

  // Oda değişince açık modalları kapat
  useEffect(() => { setDetailItem(null); setAddCell(null); setPendingMove(null); setPendingRoomMove(null); setError('') }, [activeRoomId])

  const [venue, setVenue] = useState<any>(null)
  const [room, setRoom] = useState<any>(null)
  const [rooms, setRooms] = useState<any[]>([])
  const [instructors, setInstructors] = useState<any[]>([])
  const [templates, setTemplates] = useState<any[]>([])
  const [members, setMembers] = useState<any[]>([])
  const [lessons, setLessons] = useState<any[]>([])
  const [reservations, setReservations] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [memberQuery, setMemberQuery] = useState('')
  const [memberFocused, setMemberFocused] = useState(false)

  const [weekStart, setWeekStart] = useState(() => getMonday(new Date()))

  // Modals
  const [addCell, setAddCell] = useState<{ col: number; hour: number } | null>(null)
  const [detailItem, setDetailItem] = useState<any>(null)
  const [pendingMove, setPendingMove] = useState<{ slot: any; newCol: number; newHour: number; seriesCount: number } | null>(null)
  const [pendingRoomMove, setPendingRoomMove] = useState<{ slot: any; targetRoomId: string; targetRoomName: string; seriesCount: number } | null>(null)

  const [form, setForm] = useState({
    student_name: '', student_email: '', student_phone: '', student_id: null as string | null,
    instructor_name: '', lesson_type: 'single' as 'single' | 'package', template_id: '',
  })

  // Detay modalında öğrenci ekleme
  const [showAddStudent, setShowAddStudent] = useState(false)
  const [stuForm, setStuForm] = useState({ student_name: '', student_email: '', student_phone: '', student_id: null as string | null })
  const [stuMemberQuery, setStuMemberQuery] = useState('')
  const [stuMemberFocused, setStuMemberFocused] = useState(false)

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }))

  const isLesson = venue && ['dance_studio', 'music_school'].includes(venue.venue_type)

  const load = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/auth'); return }

    const { data: venueData } = await supabase.from('venues').select('*').eq('id', venueId).single()
    if (!venueData || venueData.owner_id !== user.id) { router.push('/dashboard'); return }

    const { data: allRooms } = await supabase.from('studio_rooms').select('*').eq('venue_id', venueId).eq('is_active', true).order('created_at')
    const roomData = (allRooms ?? []).find((r: any) => r.id === activeRoomId)
    if (!roomData) { router.push(`/dashboard/venue/${venueId}`); return }

    setVenue(venueData)
    setRoom(roomData)
    setRooms(allRooms ?? [])

    const lessonModule = ['dance_studio', 'music_school'].includes(venueData.venue_type)

    if (lessonModule) {
      const [instRes, templRes, lessRes, memRes] = await Promise.all([
        supabase.from('venue_instructors').select('*').eq('venue_id', venueId).eq('is_active', true),
        supabase.from('venue_lesson_templates').select('*').eq('venue_id', venueId).eq('is_active', true),
        supabase.from('teaching_slots').select('*, teaching_bookings(id, student_id, student_name, student_email, student_phone, status)').eq('room_id', activeRoomId).eq('is_active', true),
        supabase.from('profiles').select('id, display_name').not('display_name', 'is', null).order('display_name').limit(500),
      ])
      const slotsData = lessRes.data ?? []

      // Backfill: series_id'si olmayan eski kursları gün/saat/eğitmen/ders eşleşmesiyle grupla ve kalıcı series_id ata
      const missing = slotsData.filter((s: any) => !s.series_id)
      if (missing.length > 0) {
        const groupKey = new Map<string, string>()
        const updates: { id: string; series_id: string }[] = []
        for (const s of missing) {
          const key = `${s.instrument}|${s.instructor_name}|${s.start_time}|${s.day_of_week}`
          let sid = groupKey.get(key)
          if (!sid) { sid = (typeof crypto !== 'undefined' && crypto.randomUUID) ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`; groupKey.set(key, sid) }
          s.series_id = sid
          updates.push({ id: s.id, series_id: sid })
        }
        await Promise.all(updates.map(u => supabase.from('teaching_slots').update({ series_id: u.series_id }).eq('id', u.id)))
      }

      setInstructors(instRes.data ?? [])
      setTemplates(templRes.data ?? [])
      setLessons(slotsData)
      setMembers(memRes.data ?? [])
    } else {
      const resRes = await supabase.from('studio_reservations').select('*').eq('room_id', activeRoomId).not('status', 'eq', 'cancelled')
      setReservations(resRes.data ?? [])
    }

    setLoading(false)
  }, [venueId, activeRoomId, supabase, router])

  useEffect(() => { load() }, [load])

  // Açık detay modalını taze veriyle senkronize tut (öğrenci eklenince güncellensin)
  useEffect(() => {
    if (detailItem && detailItem.slot_date) {
      const fresh = lessons.find(l => l.id === detailItem.id)
      if (fresh && fresh !== detailItem) setDetailItem(fresh)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lessons])

  const weekDates = Array.from({ length: 7 }).map((_, i) => {
    const d = new Date(weekStart)
    d.setDate(d.getDate() + i)
    return d
  })

  function prevWeek() { setWeekStart(d => { const n = new Date(d); n.setDate(n.getDate() - 7); return n }) }
  function nextWeek() { setWeekStart(d => { const n = new Date(d); n.setDate(n.getDate() + 7); return n }) }
  function thisWeek() { setWeekStart(getMonday(new Date())) }

  // Grid map: key = `${col}-${hour}` → item listesi (çakışma olursa üst üste gösterilir)
  const grid: Record<string, any[]> = {}
  if (isLesson) {
    lessons.forEach(l => {
      if (!l.slot_date) return
      const col = weekDates.findIndex(wd => dateStr(wd) === l.slot_date)
      if (col === -1) return
      const hour = parseInt(l.start_time.split(':')[0])
      const key = `${col}-${hour}`
      ;(grid[key] = grid[key] || []).push(l)
    })
  } else {
    reservations.forEach(r => {
      const col = weekDates.findIndex(wd => dateStr(wd) === r.reservation_date)
      if (col === -1) return
      const hour = parseInt(r.start_time.split(':')[0])
      const key = `${col}-${hour}`
      ;(grid[key] = grid[key] || []).push(r)
    })
  }

  function openAdd(col: number, hour: number) {
    setError('')
    setMemberQuery('')
    setForm({ student_name: '', student_email: '', student_phone: '', student_id: null, instructor_name: '', lesson_type: 'single', template_id: '' })
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

    // Seri kimliği — aynı kursun tüm haftaları ortak series_id taşır
    const seriesId = (typeof crypto !== 'undefined' && crypto.randomUUID) ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`

    // N haftalık slotlar oluştur
    const slotRows = []
    for (let w = 0; w < weeks; w++) {
      const d = new Date(baseDate)
      d.setDate(d.getDate() + w * 7)
      slotRows.push({
        venue_id: venueId, room_id: activeRoomId, artist_id: null,
        instructor_name: form.instructor_name, instrument: subject,
        day_of_week: colDayOfWeek, slot_date: dateStr(d),
        start_time: startTime, end_time: endTime,
        price_per_session: pricePer, is_active: true, slot_type: 'lesson', recurrence: 'weekly',
        series_id: seriesId,
      })
    }

    const { data: createdSlots, error: slotErr } = await supabase.from('teaching_slots').insert(slotRows as any).select()
    if (slotErr || !createdSlots) { setError(slotErr?.message ?? 'Slot oluşturulamadı'); setSaving(false); return }

    // Her slot için booking
    const bookingRows = createdSlots.map((s: any) => ({
      slot_id: s.id, artist_id: null, student_id: form.student_id,
      student_name: form.student_name,
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

  async function addStudentToLesson() {
    if (!detailItem || !stuForm.student_name) { setError('Öğrenci adı zorunludur'); return }
    setSaving(true)
    setError('')

    // Kursun tüm haftalarını bul: series_id varsa onunla, yoksa eşleşen özelliklerle
    const targetSlots = detailItem.series_id
      ? lessons.filter(l => l.series_id && l.series_id === detailItem.series_id)
      : lessons.filter(l =>
          l.instrument === detailItem.instrument &&
          l.instructor_name === detailItem.instructor_name &&
          l.start_time === detailItem.start_time &&
          l.day_of_week === detailItem.day_of_week
        )

    // Zaten ekli olanları atla (mükerrer önleme)
    const rows = targetSlots
      .filter(s => {
        const bookings = (s.teaching_bookings ?? []).filter((b: any) => b.status !== 'cancelled')
        return !bookings.some((b: any) =>
          stuForm.student_id ? b.student_id === stuForm.student_id
            : b.student_name?.toLowerCase().trim() === stuForm.student_name.toLowerCase().trim()
        )
      })
      .map(s => ({
        slot_id: s.id, artist_id: null, student_id: stuForm.student_id,
        student_name: stuForm.student_name,
        student_email: stuForm.student_email || 'belirtilmedi@sahne.today',
        student_phone: stuForm.student_phone || '-',
        lesson_date: s.slot_date, status: 'confirmed', booked_by: 'teacher',
      }))

    if (rows.length === 0) { setError('Bu öğrenci tüm haftalara zaten ekli'); setSaving(false); return }

    const { error: err } = await supabase.from('teaching_bookings').insert(rows as any)
    if (err) { setError(err.message); setSaving(false); return }

    setStuForm({ student_name: '', student_email: '', student_phone: '', student_id: null })
    setStuMemberQuery('')
    setShowAddStudent(false)
    await load()
    setSaving(false)
  }

  async function removeStudent(bookingId: string) {
    setSaving(true)
    await supabase.from('teaching_bookings').update({ status: 'cancelled' }).eq('id', bookingId)
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

    const overId = over.id as string
    setError('')
    const seriesCount = lesson.series_id ? lessons.filter(l => l.series_id === lesson.series_id).length : 1

    // Oda sekmesine bırakıldı → başka odaya taşı
    if (overId.startsWith('room-')) {
      const targetRoomId = overId.slice(5)
      if (targetRoomId === activeRoomId) return
      const target = rooms.find(r => r.id === targetRoomId)
      if (!target) return
      if (seriesCount > 1) {
        setPendingRoomMove({ slot: lesson, targetRoomId, targetRoomName: target.name, seriesCount })
      } else {
        await applyRoomMove(lesson, targetRoomId, false)
      }
      return
    }

    // Hücreye bırakıldı → gün/saat taşı
    const [newCol, newHour] = overId.split('-').map(Number)
    const newDate = dateStr(weekDates[newCol])
    if (newDate === lesson.slot_date && newHour === parseInt(lesson.start_time.split(':')[0])) return

    // Seride birden fazla ders varsa: tüm haftalara mı diye sor
    if (seriesCount > 1) {
      setPendingMove({ slot: lesson, newCol, newHour, seriesCount })
      return
    }

    // Tek ders → doğrudan taşı (hedef hücre doluysa engelle)
    await applyMove(lesson, newCol, newHour, false)
  }

  // newCol: 0=Pzt..6=Paz, hedef saat newHour. allWeeks=true ise serinin tüm slotları taşınır.
  async function applyMove(slot: any, newCol: number, newHour: number, allWeeks: boolean) {
    const newDayOfWeek = weekDates[newCol].getDay()
    const startTime = `${pad(newHour)}:00:00`
    const endTime = `${pad(newHour + 1)}:00:00`

    const seriesSlots = allWeeks && slot.series_id
      ? lessons.filter(l => l.series_id === slot.series_id)
      : [slot]
    const movingIds = new Set(seriesSlots.map(s => s.id))

    // Her slot için yeni tarihi hesapla (kendi haftasındaki yeni gün)
    const updates = seriesSlots.map(s => {
      const mon = getMonday(new Date(s.slot_date + 'T00:00:00'))
      const nd = new Date(mon)
      nd.setDate(mon.getDate() + newCol) // newCol zaten Pzt=0 tabanlı
      return { id: s.id, slot_date: dateStr(nd) }
    })

    // Çakışma kontrolü: hedef tarih+saatte (aynı oda) başka bir ders var mı?
    for (const u of updates) {
      const conflict = lessons.find(l =>
        !movingIds.has(l.id) &&
        l.slot_date === u.slot_date &&
        parseInt(l.start_time.split(':')[0]) === newHour
      )
      if (conflict) {
        setError(`Çakışma: ${new Date(u.slot_date + 'T00:00:00').toLocaleDateString('tr-TR', { day: 'numeric', month: 'long' })} ${pad(newHour)}:00'da "${conflict.instrument}" dersi var. Taşıma iptal edildi.`)
        return
      }
    }

    setSaving(true)
    await Promise.all(updates.map(u =>
      supabase.from('teaching_slots').update({
        day_of_week: newDayOfWeek, slot_date: u.slot_date, start_time: startTime, end_time: endTime,
      }).eq('id', u.id)
    ))
    setPendingMove(null)
    await load()
    setSaving(false)
  }

  // Dersi başka odaya taşı. allWeeks=true ise serinin tüm slotları taşınır.
  // Not: Hedef odada aynı saatte ders olsa bile taşımaya izin verilir; aynı hücrede
  // üst üste gösterilir, kullanıcı sürükleyerek boş saate ayırabilir.
  async function applyRoomMove(slot: any, targetRoomId: string, allWeeks: boolean) {
    const seriesSlots = allWeeks && slot.series_id
      ? lessons.filter(l => l.series_id === slot.series_id)
      : [slot]

    setSaving(true)
    await Promise.all(seriesSlots.map(s =>
      supabase.from('teaching_slots').update({ room_id: targetRoomId }).eq('id', s.id)
    ))
    setPendingRoomMove(null)
    setDetailItem(null)
    setSaving(false)
    // Hedef odayı aç — kullanıcı istediği gün/saate yerleştirebilsin (load activeRoomId değişince tetiklenir)
    setActiveRoomId(targetRoomId)
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

      <DndContext sensors={sensors} collisionDetection={pointerWithin} onDragEnd={handleDragEnd}>
        {/* Oda sekmeleri — dersi sürükleyip başka oda sekmesine bırakabilirsin */}
        {rooms.length > 1 && (
          <div className="flex gap-2 flex-wrap items-center mb-5">
            {rooms.map(r => (
              <RoomTab key={r.id} room={r} isCurrent={r.id === activeRoomId} onSelect={() => setActiveRoomId(r.id)} />
            ))}
            <span className="text-text-muted text-[10px] ml-1">← dersi başka oda sekmesine sürükleyerek taşı</span>
          </div>
        )}

        {/* Genel hata (sürükle-bırak çakışması vb.) */}
        {error && !addCell && !detailItem && !pendingMove && !pendingRoomMove && (
          <div className="rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm px-3 py-2 flex items-center justify-between mb-5">
            <span>{error}</span>
            <button onClick={() => setError('')} className="text-red-400 hover:text-red-300"><X size={14} /></button>
          </div>
        )}

        {/* Takvim — açık tema */}
        <div className="overflow-x-auto rounded-2xl p-3" style={{ background: 'transparent' }}>
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
                  const items = grid[key] ?? []
                  return (
                    <Cell key={key} id={key} hasItem={items.length > 0} dayLight={DAY_LIGHT[col]} isLesson={isLesson} onAdd={() => openAdd(col, hour)}>
                      {items.length > 0 && (
                        <div className="flex flex-col gap-0.5 h-full">
                          {items.map((item: any) => (
                            isLesson
                              ? <LessonChip key={item.id} lesson={item} color={DAY_COLORS[col]} light={DAY_LIGHT[col]} onClick={() => { setDetailItem(item); setShowAddStudent(false); setStuMemberQuery('') }} />
                              : <ReservationChip key={item.id} res={item} onClick={() => setDetailItem(item)} />
                          ))}
                        </div>
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

            {/* Üye havuzundan seç */}
            <div className="relative">
              <label className="label text-xs">Üye havuzundan seç</label>
              <input
                value={memberQuery}
                onChange={e => setMemberQuery(e.target.value)}
                onFocus={() => setMemberFocused(true)}
                onBlur={() => setTimeout(() => setMemberFocused(false), 150)}
                placeholder="Tıkla veya isim/e-posta yaz..."
                className="input-field text-sm mt-1"
              />
              {memberFocused && (
                <div className="absolute z-10 top-full left-0 right-0 bg-surface border border-[rgba(228,224,216,0.15)] rounded-lg shadow-lg max-h-44 overflow-y-auto mt-1">
                  {(() => {
                    const q = memberQuery.toLowerCase()
                    const filtered = members.filter(m =>
                      !q || m.display_name?.toLowerCase().includes(q)
                    ).slice(0, 20)
                    if (filtered.length === 0) return <p className="px-3 py-2 text-xs text-text-muted">Üye bulunamadı</p>
                    return filtered.map(m => (
                      <button key={m.id} type="button"
                        onMouseDown={() => {
                          setForm(p => ({ ...p, student_name: m.display_name ?? '', student_id: m.id }))
                          setMemberQuery(''); setMemberFocused(false)
                        }}
                        className="w-full text-left px-3 py-2 text-sm text-text-muted hover:bg-[rgba(228,224,216,0.06)] hover:text-text-primary transition-colors">
                        {m.display_name}
                      </button>
                    ))
                  })()}
                </div>
              )}
            </div>

            <div>
              <label className="label text-xs">Öğrenci Adı *</label>
              <input value={form.student_name} onChange={e => setForm(p => ({ ...p, student_name: e.target.value, student_id: null }))} className="input-field text-sm mt-1" placeholder="Ad Soyad" />
              {form.student_id && <p className="text-accent text-[10px] mt-1">✓ Kayıtlı üye seçildi</p>}
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
              {/* Öğrenci listesi */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="label text-xs">
                    Öğrenciler ({(detailItem.teaching_bookings ?? []).filter((b: any) => b.status !== 'cancelled').length})
                  </label>
                  <button onClick={() => { setShowAddStudent(!showAddStudent); setError(''); setStuForm({ student_name: '', student_email: '', student_phone: '', student_id: null }); setStuMemberQuery('') }}
                    className="text-[11px] px-2 py-1 rounded-lg border border-accent/30 text-accent hover:bg-accent/10 transition-colors flex items-center gap-1">
                    <Plus size={11} /> Öğrenci Ekle
                  </button>
                </div>
                <div className="space-y-1">
                  {(detailItem.teaching_bookings ?? []).filter((b: any) => b.status !== 'cancelled').map((b: any) => (
                    <div key={b.id} className="text-sm text-text-primary bg-[rgba(228,224,216,0.05)] rounded px-2 py-1.5 flex items-center justify-between gap-2">
                      <span className="truncate">{b.student_name}{b.student_phone && b.student_phone !== '-' ? ` · ${b.student_phone}` : ''}</span>
                      <button onClick={() => removeStudent(b.id)} disabled={saving} className="text-text-muted hover:text-red-400 flex-shrink-0"><X size={13} /></button>
                    </div>
                  ))}
                  {(detailItem.teaching_bookings ?? []).filter((b: any) => b.status !== 'cancelled').length === 0 && (
                    <p className="text-text-muted text-xs">Henüz öğrenci yok.</p>
                  )}
                </div>
              </div>

              {/* Öğrenci ekleme formu */}
              {showAddStudent && (
                <div className="rounded-lg border border-accent/20 bg-accent/5 p-3 space-y-2">
                  <p className="text-accent text-[11px]">Öğrenci, aynı gün/saatteki tüm hafta derslerine eklenir.</p>
                  {/* Üye havuzundan seç */}
                  <div className="relative">
                    <input
                      value={stuMemberQuery}
                      onChange={e => setStuMemberQuery(e.target.value)}
                      onFocus={() => setStuMemberFocused(true)}
                      onBlur={() => setTimeout(() => setStuMemberFocused(false), 150)}
                      placeholder="Üye havuzundan seç..."
                      className="input-field text-xs"
                    />
                    {stuMemberFocused && (
                      <div className="absolute z-20 top-full left-0 right-0 bg-surface border border-[rgba(228,224,216,0.15)] rounded-lg shadow-lg max-h-40 overflow-y-auto mt-1">
                        {(() => {
                          const q = stuMemberQuery.toLowerCase()
                          const filtered = members.filter(m => !q || m.display_name?.toLowerCase().includes(q)).slice(0, 20)
                          if (filtered.length === 0) return <p className="px-3 py-2 text-xs text-text-muted">Üye bulunamadı</p>
                          return filtered.map(m => (
                            <button key={m.id} type="button"
                              onMouseDown={() => { setStuForm({ student_name: m.display_name ?? '', student_email: '', student_phone: '', student_id: m.id }); setStuMemberQuery(''); setStuMemberFocused(false) }}
                              className="w-full text-left px-3 py-2 text-xs text-text-muted hover:bg-[rgba(228,224,216,0.06)] hover:text-text-primary transition-colors">
                              {m.display_name}
                            </button>
                          ))
                        })()}
                      </div>
                    )}
                  </div>
                  <input value={stuForm.student_name} onChange={e => setStuForm(p => ({ ...p, student_name: e.target.value, student_id: null }))} placeholder="Öğrenci adı *" className="input-field text-xs" />
                  <div className="grid grid-cols-2 gap-2">
                    <input type="email" value={stuForm.student_email} onChange={e => setStuForm(p => ({ ...p, student_email: e.target.value }))} placeholder="E-posta" className="input-field text-xs" />
                    <input type="tel" value={stuForm.student_phone} onChange={e => setStuForm(p => ({ ...p, student_phone: e.target.value }))} placeholder="Telefon" className="input-field text-xs" />
                  </div>
                  <button onClick={addStudentToLesson} disabled={saving || !stuForm.student_name} className="btn-accent w-full py-2 text-xs disabled:opacity-50 flex items-center justify-center gap-1.5">
                    {saving ? <Loader2 size={11} className="animate-spin" /> : <Plus size={11} />} Ekle
                  </button>
                </div>
              )}

              {detailItem.price_per_session > 0 && <DetailRow label="Ücret" value={`₺${detailItem.price_per_session}`} />}

              {/* Başka odaya taşı */}
              {rooms.length > 1 && (
                <div>
                  <label className="label text-xs">Başka Odaya Taşı</label>
                  <select value="" onChange={e => {
                    const target = rooms.find(r => r.id === e.target.value)
                    if (!target) return
                    setError('')
                    const seriesCount = detailItem.series_id ? lessons.filter(l => l.series_id === detailItem.series_id).length : 1
                    if (seriesCount > 1) {
                      setPendingRoomMove({ slot: detailItem, targetRoomId: target.id, targetRoomName: target.name, seriesCount })
                    } else {
                      applyRoomMove(detailItem, target.id, false)
                    }
                  }} className="input-field text-sm mt-1">
                    <option value="">Oda seçin...</option>
                    {rooms.filter(r => r.id !== activeRoomId).map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                  </select>
                </div>
              )}

              {error && <p className="text-red-400 text-xs">{error}</p>}

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

      {/* === TAŞIMA ONAY MODALI === */}
      {pendingMove && (
        <Modal onClose={() => setPendingMove(null)} title="Dersi Taşı">
          <div className="space-y-4">
            <p className="text-text-primary text-sm">
              <strong>{pendingMove.slot.instrument}</strong> dersi{' '}
              <strong>{DAYS_TR[pendingMove.newCol]} {pad(pendingMove.newHour)}:00</strong>'a taşınıyor.
            </p>
            <p className="text-text-muted text-sm">
              Bu kurs <strong>{pendingMove.seriesCount} haftalık</strong>. Değişiklik tüm haftalara mı uygulansın?
            </p>

            {error && <p className="text-red-400 text-xs">{error}</p>}

            <div className="space-y-2">
              <button onClick={() => applyMove(pendingMove.slot, pendingMove.newCol, pendingMove.newHour, true)} disabled={saving}
                className="btn-accent w-full py-2.5 text-sm disabled:opacity-50 flex items-center justify-center gap-1.5">
                {saving ? <Loader2 size={13} className="animate-spin" /> : null} Tüm Haftalara Uygula
              </button>
              <button onClick={() => applyMove(pendingMove.slot, pendingMove.newCol, pendingMove.newHour, false)} disabled={saving}
                className="w-full py-2.5 text-sm rounded-lg border border-[rgba(228,224,216,0.15)] text-text-primary hover:bg-[rgba(228,224,216,0.04)] disabled:opacity-50">
                Sadece Bu Hafta
              </button>
              <button onClick={() => { setPendingMove(null); setError('') }} disabled={saving}
                className="w-full py-2 text-xs text-text-muted hover:text-text-primary">
                Vazgeç
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* === ODAYA TAŞIMA ONAY MODALI === */}
      {pendingRoomMove && (
        <Modal onClose={() => { setPendingRoomMove(null); setError('') }} title="Başka Odaya Taşı">
          <div className="space-y-4">
            <p className="text-text-primary text-sm">
              <strong>{pendingRoomMove.slot.instrument}</strong> dersi{' '}
              <strong>{pendingRoomMove.targetRoomName}</strong> odasına taşınıyor.
            </p>
            <p className="text-text-muted text-sm">
              Bu kurs <strong>{pendingRoomMove.seriesCount} haftalık</strong>. Tüm haftalar mı taşınsın?
            </p>

            {error && <p className="text-red-400 text-xs">{error}</p>}

            <div className="space-y-2">
              <button onClick={() => applyRoomMove(pendingRoomMove.slot, pendingRoomMove.targetRoomId, true)} disabled={saving}
                className="btn-accent w-full py-2.5 text-sm disabled:opacity-50 flex items-center justify-center gap-1.5">
                {saving ? <Loader2 size={13} className="animate-spin" /> : null} Tüm Haftaları Taşı
              </button>
              <button onClick={() => applyRoomMove(pendingRoomMove.slot, pendingRoomMove.targetRoomId, false)} disabled={saving}
                className="w-full py-2.5 text-sm rounded-lg border border-[rgba(228,224,216,0.15)] text-text-primary hover:bg-[rgba(228,224,216,0.04)] disabled:opacity-50">
                Sadece Bu Hafta
              </button>
              <button onClick={() => { setPendingRoomMove(null); setError('') }} disabled={saving}
                className="w-full py-2 text-xs text-text-muted hover:text-text-primary">
                Vazgeç
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}

function RoomTab({ room, isCurrent, onSelect }: { room: any; isCurrent: boolean; onSelect: () => void }) {
  const { setNodeRef, isOver } = useDroppable({ id: `room-${room.id}`, disabled: isCurrent })
  return (
    <button ref={setNodeRef} onClick={onSelect}
      className={`px-3 py-1.5 rounded-lg text-sm border transition-colors ${
        isCurrent
          ? 'bg-accent/10 text-accent border-accent/30 font-medium'
          : isOver
            ? 'bg-accent/20 text-accent border-accent/50 ring-2 ring-accent'
            : 'text-text-muted border-[rgba(228,224,216,0.12)] hover:text-text-primary hover:border-[rgba(228,224,216,0.25)]'
      }`}>
      {room.name}
    </button>
  )
}

function Cell({ id, hasItem, dayLight, isLesson, onAdd, children }: { id: string; hasItem: boolean; dayLight: string; isLesson: boolean; onAdd: () => void; children: React.ReactNode }) {
  const { setNodeRef, isOver } = useDroppable({ id })
  return (
    <div ref={setNodeRef}
      className="rounded-xl transition-colors relative group"
      style={{
        minHeight: '56px',
        background: hasItem ? 'transparent' : (isOver ? dayLight : 'rgba(228,224,216,0.05)'),
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
