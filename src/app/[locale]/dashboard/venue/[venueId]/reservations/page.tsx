'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { Link } from '@/i18n/navigation'
import { ArrowLeft, Check, X, Loader2, Clock, Pencil, Trash2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'
import { TimeSlotPicker } from '@/components/ui/TimeSlotPicker'

const STATUS_TABS = [
  { key: 'pending', label: 'Bekleyen' },
  { key: 'confirmed', label: 'Onaylanan' },
  { key: 'cancelled', label: 'İptal' },
]

const HOURS = Array.from({ length: 14 }, (_, i) => `${String(8 + i).padStart(2, '0')}:00`)

export default function VenueReservationsPage() {
  const router = useRouter()
  const params = useParams()
  const venueId = params.venueId as string
  const supabase = createClient()

  const [venue, setVenue] = useState<any>(null)
  const [rooms, setRooms] = useState<any[]>([])
  const [reservations, setReservations] = useState<any[]>([])
  const [lessonRequests, setLessonRequests] = useState<any[]>([])
  const [instructors, setInstructors] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [mainTab, setMainTab] = useState<'studio' | 'lessons'>('studio')
  const [activeTab, setActiveTab] = useState('pending')
  const [acting, setActing] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState({ start_time: '', duration: 2, room_id: '' })
  const [saving, setSaving] = useState(false)

  // Ders talebi onay formu
  const [assignReqId, setAssignReqId] = useState<string | null>(null)
  const [assign, setAssign] = useState({ room_id: '', instructor_name: '', date: '', time: '10:00', monthly_price: '' })

  useEffect(() => { load() }, [])

  async function load() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/auth'); return }

    const [venueRes, roomsRes, resRes, reqRes, instRes] = await Promise.all([
      supabase.from('venues').select('id, name, owner_id').eq('id', venueId).single(),
      supabase.from('studio_rooms').select('id, name, price_per_hour').eq('venue_id', venueId).eq('is_active', true),
      supabase.from('studio_reservations').select('*').eq('venue_id', venueId).order('reservation_date', { ascending: false }),
      supabase.from('lesson_requests').select('*, venue_lesson_templates(name, subject, weeks, hours_per_session, price_total)').eq('venue_id', venueId).order('created_at', { ascending: false }),
      supabase.from('venue_instructors').select('id, name').eq('venue_id', venueId).eq('is_active', true),
    ])

    if (!venueRes.data || venueRes.data.owner_id !== user.id) { router.push('/dashboard'); return }

    setVenue(venueRes.data)
    setRooms(roomsRes.data ?? [])
    setReservations(resRes.data ?? [])
    setLessonRequests(reqRes.data ?? [])
    setInstructors(instRes.data ?? [])
    setLoading(false)
  }

  function startAssign(req: any) {
    setAssign({
      room_id: rooms[0]?.id ?? '',
      instructor_name: req.preferred_instructor ?? '',
      date: req.requested_date ?? new Date().toISOString().split('T')[0],
      time: req.requested_time ? req.requested_time.slice(0, 5) : '10:00',
      monthly_price: req.monthly_price ? String(req.monthly_price) : '',
    })
    setAssignReqId(req.id)
  }

  async function approveRequest(req: any) {
    if (!assign.room_id) { alert('Lütfen bir oda seçin.'); return }
    setSaving(true)

    const tmpl = req.venue_lesson_templates
    const isMonthly = (req.billing_type === 'monthly') || (tmpl?.billing_type === 'monthly')
    const subject = tmpl?.name ?? req.subject ?? 'Özel Ders'
    // Paket: seans başına ücret; Aylık: aidat ayrı takip edilir, slot fiyatı 0
    const pricePer = isMonthly ? 0 : (tmpl && tmpl.weeks > 0 ? tmpl.price_total / tmpl.weeks : (tmpl?.price_total ?? 0))
    const startHour = parseInt(assign.time.split(':')[0])
    const startTime = `${String(startHour).padStart(2, '0')}:00:00`
    const endTime = `${String(startHour + 1).padStart(2, '0')}:00:00`
    const baseDate = new Date(assign.date + 'T00:00:00')
    const seriesId = (typeof crypto !== 'undefined' && crypto.randomUUID) ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`
    const pad = (n: number) => String(n).padStart(2, '0')
    const dStr = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`

    // Tarihleri üret: aylık → ay bazlı (4/5 haftasonu otomatik), paket → hafta sayısı
    const slotDates: string[] = []
    if (isMonthly) {
      const m = req.months ?? 1
      const endD = new Date(baseDate); endD.setMonth(endD.getMonth() + m)
      const cur = new Date(baseDate)
      while (cur < endD) { slotDates.push(dStr(cur)); cur.setDate(cur.getDate() + 7) }
    } else {
      const weeks = tmpl?.weeks ?? req.weeks ?? 1
      for (let w = 0; w < weeks; w++) { const d = new Date(baseDate); d.setDate(d.getDate() + w * 7); slotDates.push(dStr(d)) }
    }

    const slotRows = slotDates.map(sd => ({
      venue_id: venueId, room_id: assign.room_id, artist_id: null,
      instructor_name: assign.instructor_name || null, instrument: subject,
      day_of_week: baseDate.getDay(), slot_date: sd,
      start_time: startTime, end_time: endTime,
      price_per_session: pricePer, is_active: true, slot_type: 'lesson', recurrence: 'weekly',
      series_id: seriesId,
    }))

    const { data: createdSlots, error: slotErr } = await supabase.from('teaching_slots').insert(slotRows as any).select()
    if (slotErr || !createdSlots) { alert(slotErr?.message ?? 'Slot oluşturulamadı'); setSaving(false); return }

    const bookingRows = createdSlots.map((s: any) => ({
      slot_id: s.id, artist_id: null, student_id: req.student_id,
      student_name: req.student_name, student_email: req.student_email, student_phone: req.student_phone,
      lesson_date: s.slot_date, status: 'confirmed', booked_by: 'teacher',
    }))
    await supabase.from('teaching_bookings').insert(bookingRows as any)

    await supabase.from('lesson_requests').update({
      status: 'approved',
      series_id: seriesId,
      monthly_price: isMonthly && assign.monthly_price ? Number(assign.monthly_price) : null,
    }).eq('id', req.id)
    setLessonRequests(prev => prev.map(r => r.id === req.id ? { ...r, status: 'approved' } : r))
    setAssignReqId(null)
    setSaving(false)
  }

  async function rejectRequest(reqId: string) {
    await supabase.from('lesson_requests').update({ status: 'rejected' }).eq('id', reqId)
    setLessonRequests(prev => prev.map(r => r.id === reqId ? { ...r, status: 'rejected' } : r))
  }

  async function handleUpdate(id: string, status: 'confirmed' | 'cancelled') {
    setActing(id)
    await supabase.from('studio_reservations').update({ status } as any).eq('id', id)
    setReservations(prev => prev.map(r => r.id === id ? { ...r, status } : r))
    setActing(null)
  }

  async function handleDelete(id: string) {
    if (!confirm('Bu rezervasyon kalıcı olarak silinecek. Emin misin?')) return
    setActing(id)
    await supabase.from('studio_reservations').delete().eq('id', id)
    setReservations(prev => prev.filter(r => r.id !== id))
    setActing(null)
  }

  function startEdit(res: any) {
    const startIdx = HOURS.findIndex(h => res.start_time?.startsWith(h))
    const endIdx = HOURS.findIndex(h => res.end_time?.startsWith(h))
    const duration = endIdx > startIdx ? endIdx - startIdx : 2
    setEditForm({
      start_time: startIdx >= 0 ? HOURS[startIdx] : '10:00',
      duration,
      room_id: res.room_id ?? '',
    })
    setEditingId(res.id)
  }

  async function saveEdit(res: any) {
    setSaving(true)
    const startIdx = HOURS.indexOf(editForm.start_time)
    const endTime = HOURS[startIdx + editForm.duration]
    if (!endTime) { setSaving(false); return }

    const selectedRoom = rooms.find(r => r.id === editForm.room_id)
    const pricePerHour = selectedRoom?.price_per_hour ?? res.price_per_hour
    const totalPrice = pricePerHour * editForm.duration

    await supabase.from('studio_reservations').update({
      start_time: editForm.start_time + ':00',
      end_time: endTime + ':00',
      duration_hours: editForm.duration,
      room_id: editForm.room_id || null,
      room_name: selectedRoom?.name ?? null,
      price_per_hour: pricePerHour,
      total_price: totalPrice,
    } as any).eq('id', res.id)

    setReservations(prev => prev.map(r => r.id === res.id ? {
      ...r,
      start_time: editForm.start_time + ':00',
      end_time: endTime + ':00',
      duration_hours: editForm.duration,
      room_id: editForm.room_id || null,
      room_name: selectedRoom?.name ?? null,
      total_price: totalPrice,
    } : r))

    setEditingId(null)
    setSaving(false)
  }

  const filtered = reservations.filter(r => r.status === activeTab)
  const pendingCount = reservations.filter(r => r.status === 'pending').length
  const pendingRequests = lessonRequests.filter(r => r.status === 'pending')
  const pendingRequestCount = pendingRequests.length

  if (loading) return (
    <div className="max-w-2xl mx-auto px-4 py-12 flex justify-center">
      <Loader2 size={24} className="animate-spin text-accent" />
    </div>
  )

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
      <div>
        <Link href={`/dashboard/venue/${venueId}`} className="flex items-center gap-2 text-text-muted text-sm mb-4 hover:text-text-primary w-fit">
          <ArrowLeft size={16} /> Mekan
        </Link>
        <h1 className="font-bebas text-4xl text-text-primary">{venue?.name}</h1>
        <p className="text-text-muted text-sm mt-0.5">Rezervasyonlar</p>
      </div>

      {/* Ana sekmeler: Stüdyo Rezervasyonları | Ders Talepleri */}
      <div className="flex gap-2 border-b border-[rgba(228,224,216,0.1)]">
        <button onClick={() => setMainTab('studio')}
          className={cn('px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors',
            mainTab === 'studio' ? 'text-accent border-accent' : 'text-text-muted border-transparent hover:text-text-primary')}>
          Stüdyo Rezervasyonları
        </button>
        <button onClick={() => setMainTab('lessons')}
          className={cn('px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors flex items-center gap-1.5',
            mainTab === 'lessons' ? 'text-accent border-accent' : 'text-text-muted border-transparent hover:text-text-primary')}>
          Ders Talepleri
          {pendingRequestCount > 0 && <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-yellow-400/20 text-yellow-400 font-bold">{pendingRequestCount}</span>}
        </button>
      </div>

      {/* === DERS TALEPLERİ === */}
      {mainTab === 'lessons' && (
        pendingRequests.length === 0 ? (
          <div className="card p-8 text-center text-text-muted text-sm">Bekleyen ders talebi yok.</div>
        ) : (
          <div className="space-y-2">
            {pendingRequests.map(req => {
              const tmpl = req.venue_lesson_templates
              const isAssigning = assignReqId === req.id
              return (
                <div key={req.id} className="card p-4 space-y-3 border-yellow-400/20">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-semibold text-text-primary">{req.student_name}</p>
                        <span className={cn('text-[10px] px-1.5 py-0.5 rounded border', req.request_type === 'private' ? 'text-accent bg-accent/10 border-accent/20' : 'text-purple-400 bg-purple-400/10 border-purple-400/20')}>
                          {req.request_type === 'private' ? 'Özel' : 'Grup (Ön Kayıt)'}
                        </span>
                      </div>
                      <p className="text-text-muted text-xs mt-0.5">
                        {tmpl?.name ?? req.subject ?? 'Özel Ders'} · {(req.billing_type === 'monthly' || tmpl?.billing_type === 'monthly') ? `Aylık · ${req.months ?? 1} ay` : `${tmpl?.weeks ?? req.weeks ?? 1} hafta`}{req.hours_per_session ? ` · ${req.hours_per_session} saat/seans` : ''}
                      </p>
                      {req.requested_date && (
                        <p className="text-text-muted text-xs mt-0.5 flex items-center gap-1">
                          <Clock size={10} /> İstenen: {new Date(req.requested_date + 'T00:00:00').toLocaleDateString('tr-TR', { day: 'numeric', month: 'long' })} · {req.requested_time?.slice(0, 5)}
                        </p>
                      )}
                      <p className="text-text-muted text-xs mt-0.5">{req.student_phone} · {req.student_email}</p>
                      {req.preferred_instructor && <p className="text-text-muted text-xs mt-0.5">Eğitmen tercihi: {req.preferred_instructor}</p>}
                      {req.notes && <p className="text-text-muted text-xs mt-1 italic">"{req.notes}"</p>}
                    </div>
                    <div className="flex gap-1.5 flex-shrink-0">
                      <button onClick={() => isAssigning ? setAssignReqId(null) : startAssign(req)}
                        className={cn('px-2.5 h-8 rounded-lg text-xs flex items-center transition-colors', isAssigning ? 'bg-accent/20 text-accent' : 'bg-success/10 text-success hover:bg-success/20')}>
                        Onayla
                      </button>
                      <button onClick={() => rejectRequest(req.id)} className="w-8 h-8 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 flex items-center justify-center"><X size={14} /></button>
                    </div>
                  </div>

                  {/* Atama formu */}
                  {isAssigning && (
                    <div className="pt-3 border-t border-[rgba(228,224,216,0.08)] space-y-3">
                      <div>
                        <label className="label text-xs">Oda *</label>
                        <select value={assign.room_id} onChange={e => setAssign(p => ({ ...p, room_id: e.target.value }))} className="input-field text-sm mt-1">
                          <option value="">Oda seçin...</option>
                          {rooms.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="label text-xs">Eğitmen <span className="text-text-muted font-normal">(opsiyonel)</span></label>
                        <select value={assign.instructor_name} onChange={e => setAssign(p => ({ ...p, instructor_name: e.target.value }))} className="input-field text-sm mt-1">
                          <option value="">Sonra atanacak</option>
                          {instructors.map(i => <option key={i.id} value={i.name}>{i.name}</option>)}
                        </select>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="label text-xs">Başlangıç Tarihi</label>
                          <input type="date" value={assign.date} onChange={e => setAssign(p => ({ ...p, date: e.target.value }))} className="input-field text-sm mt-1" />
                        </div>
                        <div>
                          <label className="label text-xs">Saat</label>
                          <select value={assign.time} onChange={e => setAssign(p => ({ ...p, time: e.target.value }))} className="input-field text-sm mt-1">
                            {HOURS.map(h => <option key={h} value={h}>{h}</option>)}
                          </select>
                        </div>
                      </div>
                      {(req.billing_type === 'monthly' || tmpl?.billing_type === 'monthly') && (
                        <div>
                          <label className="label text-xs">Aylık Ücret / Aidat (₺)</label>
                          <input type="number" min={0} value={assign.monthly_price} onChange={e => setAssign(p => ({ ...p, monthly_price: e.target.value }))} placeholder="1500" className="input-field text-sm mt-1" />
                        </div>
                      )}
                      <button onClick={() => approveRequest(req)} disabled={saving || !assign.room_id} className="btn-accent w-full py-2 text-sm disabled:opacity-50 flex items-center justify-center gap-1.5">
                        {saving ? <><Loader2 size={13} className="animate-spin" /> İşleniyor...</> : <><Check size={14} /> Onayla & Takvime İşle</>}
                      </button>
                      <p className="text-text-muted text-[10px] text-center">
                        {(req.billing_type === 'monthly' || tmpl?.billing_type === 'monthly') ? `${req.months ?? 1} aylık ders` : `${tmpl?.weeks ?? req.weeks ?? 1} haftalık ders`}, seçilen odanın takvimine işlenecek.
                      </p>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )
      )}

      {/* === STÜDYO REZERVASYONLARI === */}
      {mainTab === 'studio' && (
      <>
      {/* Tabs */}
      <div className="flex gap-1 p-1 rounded-lg bg-[rgba(228,224,216,0.05)] border border-[rgba(228,224,216,0.08)]">
        {STATUS_TABS.map(tab => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key)}
            className={cn('flex-1 py-2 text-xs font-medium rounded-md transition-colors flex items-center justify-center gap-1.5',
              activeTab === tab.key ? 'bg-surface text-text-primary shadow-sm' : 'text-text-muted hover:text-text-primary'
            )}>
            {tab.label}
            {tab.key === 'pending' && pendingCount > 0 && (
              <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-yellow-400/20 text-yellow-400 font-bold">{pendingCount}</span>
            )}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="card p-8 text-center text-text-muted text-sm">
          {activeTab === 'pending' ? 'Bekleyen rezervasyon yok.' :
           activeTab === 'confirmed' ? 'Onaylanan rezervasyon yok.' : 'İptal edilmiş rezervasyon yok.'}
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(res => {
            const dateStr = new Date(res.reservation_date + 'T00:00:00').toLocaleDateString('tr-TR', {
              weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
            })
            const isEditing = editingId === res.id

            return (
              <div key={res.id} className={cn('card p-4 space-y-3', res.status === 'pending' && 'border-yellow-400/20')}>
                {/* Bilgiler */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-text-primary">{res.reserver_name}</p>
                    <p className="text-text-muted text-xs mt-0.5 flex items-center gap-1">
                      <Clock size={10} />
                      {dateStr} · {res.start_time?.slice(0, 5)}–{res.end_time?.slice(0, 5)}
                      {res.room_name && <span className="ml-1 text-accent">· {res.room_name}</span>}
                    </p>
                    <p className="text-text-muted text-xs mt-0.5">{res.reserver_phone} · {res.reserver_email}</p>
                    {res.notes && <p className="text-text-muted text-xs mt-1 italic">"{res.notes}"</p>}
                    <div className="flex items-center gap-2 mt-1.5">
                      {res.total_price > 0 && (
                        <span className="font-bebas text-lg text-accent">₺{res.total_price}</span>
                      )}
                      <span className={cn('text-[10px] px-1.5 py-0.5 rounded border',
                        res.status === 'confirmed' ? 'text-success bg-success/10 border-success/20' :
                        res.status === 'pending' ? 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20' :
                        'text-red-400 bg-red-400/10 border-red-400/20'
                      )}>
                        {res.status === 'confirmed' ? 'Onaylandı' : res.status === 'pending' ? 'Bekliyor' : 'İptal'}
                      </span>
                    </div>
                  </div>

                  <div className="flex gap-1.5 flex-shrink-0">
                    {res.status !== 'cancelled' && (
                      <button onClick={() => isEditing ? setEditingId(null) : startEdit(res)}
                        className={cn('w-8 h-8 rounded-lg flex items-center justify-center transition-colors',
                          isEditing ? 'bg-accent/20 text-accent' : 'bg-[rgba(228,224,216,0.06)] text-text-muted hover:text-accent hover:bg-accent/10'
                        )}>
                        <Pencil size={13} />
                      </button>
                    )}
                    {res.status === 'pending' && (
                      <>
                        <button onClick={() => handleUpdate(res.id, 'confirmed')} disabled={acting === res.id}
                          className="w-8 h-8 rounded-lg bg-success/10 text-success hover:bg-success/20 flex items-center justify-center disabled:opacity-40">
                          <Check size={14} />
                        </button>
                        <button onClick={() => handleUpdate(res.id, 'cancelled')} disabled={acting === res.id}
                          className="w-8 h-8 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 flex items-center justify-center disabled:opacity-40">
                          <X size={14} />
                        </button>
                      </>
                    )}
                    {res.status === 'confirmed' && (
                      <button onClick={() => { if (confirm('Bu rezervasyon iptal edilsin mi?')) handleUpdate(res.id, 'cancelled') }} disabled={acting === res.id}
                        className="w-8 h-8 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 flex items-center justify-center disabled:opacity-40" title="İptal Et">
                        <X size={14} />
                      </button>
                    )}
                    {res.status === 'cancelled' && (
                      <button onClick={() => handleDelete(res.id)} disabled={acting === res.id}
                        className="w-8 h-8 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 flex items-center justify-center disabled:opacity-40" title="Kalıcı Olarak Sil">
                        {acting === res.id ? <Loader2 size={14} className='animate-spin' /> : <Trash2 size={14} />}
                      </button>
                    )}
                  </div>
                </div>

                {/* Düzenleme formu */}
                {isEditing && (
                  <div className="pt-3 border-t border-[rgba(228,224,216,0.08)] space-y-3">
                    {rooms.length > 0 && (
                      <div>
                        <label className="label text-xs mb-1">Oda</label>
                        <div className="flex flex-wrap gap-1.5">
                          <button type="button" onClick={() => setEditForm(p => ({ ...p, room_id: '' }))}
                            className={cn('text-xs px-2.5 py-1.5 rounded border transition-colors',
                              !editForm.room_id ? 'bg-accent/10 text-accent border-accent/30' : 'text-text-muted border-[rgba(228,224,216,0.1)]'
                            )}>
                            Fark etmez
                          </button>
                          {rooms.map(r => (
                            <button key={r.id} type="button" onClick={() => setEditForm(p => ({ ...p, room_id: r.id }))}
                              className={cn('text-xs px-2.5 py-1.5 rounded border transition-colors',
                                editForm.room_id === r.id ? 'bg-accent/10 text-accent border-accent/30' : 'text-text-muted border-[rgba(228,224,216,0.1)]'
                              )}>
                              {r.name}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    <TimeSlotPicker
                      venueId={venueId}
                      date={res.reservation_date}
                      roomId={editForm.room_id || undefined}
                      excludeReservationId={res.id}
                      selectedStart={editForm.start_time}
                      duration={editForm.duration}
                      onSelectStart={h => setEditForm(p => ({ ...p, start_time: h }))}
                      onSelectDuration={d => setEditForm(p => ({ ...p, duration: d }))}
                    />

                    <button onClick={() => saveEdit(res)} disabled={saving}
                      className="btn-accent w-full py-2 text-sm disabled:opacity-50 flex items-center justify-center gap-1.5">
                      {saving ? <><Loader2 size={13} className="animate-spin" /> Kaydediliyor...</> : 'Kaydet'}
                    </button>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
      </>
      )}
    </div>
  )
}
