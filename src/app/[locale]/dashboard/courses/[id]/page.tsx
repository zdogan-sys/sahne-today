'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Plus, X, CalendarDays, Users, Check, Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'

const DAY_NAMES = ['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi']

const STATUS_COLORS: Record<string, string> = {
  available: 'text-success bg-success/10 border-success/20',
  booked: 'text-accent bg-accent/10 border-accent/20',
  cancelled: 'text-red-400 bg-red-400/10 border-red-400/20',
}
const STATUS_LABELS: Record<string, string> = {
  available: 'Müsait',
  booked: 'Dolu',
  cancelled: 'İptal',
}

type AddMode = 'single' | 'recurring'

export default function CourseSessionsPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const supabase = createClient()

  const [course, setCourse] = useState<any>(null)
  const [sessions, setSessions] = useState<any[]>([])
  const [enrollments, setEnrollments] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [showAddForm, setShowAddForm] = useState(false)
  const [addMode, setAddMode] = useState<AddMode>('single')
  const [cancelling, setCancelling] = useState<string | null>(null)
  const [acceptingEnrollment, setAcceptingEnrollment] = useState<string | null>(null)

  // Tek seans formu
  const [singleDate, setSingleDate] = useState('')
  const [singleStart, setSingleStart] = useState('10:00')
  const [singleEnd, setSingleEnd] = useState('')

  // Tekrarlayan seans formu
  const [recurDay, setRecurDay] = useState(1) // 1=Pazartesi
  const [recurStart, setRecurStart] = useState('10:00')
  const [recurEnd, setRecurEnd] = useState('')
  const [recurFrom, setRecurFrom] = useState('')
  const [recurTo, setRecurTo] = useState('')

  // Ders süresi değişince bitiş saatini otomatik hesapla
  useEffect(() => {
    if (!course) return
    const dur = course.duration_minutes ?? 60
    function calcEnd(start: string) {
      if (!start) return ''
      const [h, m] = start.split(':').map(Number)
      const total = h * 60 + m + dur
      return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`
    }
    setSingleEnd(calcEnd(singleStart))
    setRecurEnd(calcEnd(recurStart))
  }, [course, singleStart, recurStart])

  const load = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/auth'); return }

    const [courseRes, sessionsRes, enrollmentsRes] = await Promise.all([
      supabase.from('courses').select('*').eq('id', id).eq('instructor_id', user.id).single(),
      supabase.from('course_sessions').select('*').eq('course_id', id).order('session_date').order('start_time'),
      supabase.from('course_enrollments').select('id, student_name, student_email, student_phone, gender, status, payment_status, session_id, created_at').eq('course_id', id).order('created_at', { ascending: false }),
    ])

    if (!courseRes.data) { router.push('/dashboard/courses'); return }

    setCourse(courseRes.data)
    setSessions(sessionsRes.data ?? [])
    setEnrollments(enrollmentsRes.data ?? [])
    setLoading(false)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  useEffect(() => { load() }, [load])

  // --- Tek seans ekle ---
  async function addSingleSession() {
    if (!singleDate || !singleStart || !singleEnd) { setError('Tarih ve saat gerekli.'); return }
    setSaving(true); setError('')
    const { data, error: err } = await supabase
      .from('course_sessions')
      .insert({ course_id: id, session_date: singleDate, start_time: singleStart + ':00', end_time: singleEnd + ':00', status: 'available' } as any)
      .select()
    if (err) { setError(err.message); setSaving(false); return }
    setSessions(prev => [...prev, ...(data ?? [])].sort((a, b) => a.session_date.localeCompare(b.session_date) || a.start_time.localeCompare(b.start_time)))
    setSingleDate('')
    setSaving(false)
  }

  // --- Tekrarlayan seans ekle ---
  async function addRecurringSessions() {
    if (!recurFrom || !recurTo || !recurStart || !recurEnd) { setError('Tüm alanları doldurun.'); return }
    const from = new Date(recurFrom)
    const to = new Date(recurTo)
    if (from > to) { setError('Başlangıç tarihi bitiş tarihinden önce olmalı.'); return }

    // Seçilen haftanın gününe denk gelen tüm tarihleri üret
    const dates: string[] = []
    const cur = new Date(from)
    while (cur <= to) {
      if (cur.getDay() === recurDay) {
        dates.push(cur.toISOString().split('T')[0])
      }
      cur.setDate(cur.getDate() + 1)
    }

    if (dates.length === 0) { setError('Bu tarih aralığında seçilen güne denk gelen tarih yok.'); return }
    if (dates.length > 52) { setError('En fazla 52 seans oluşturulabilir.'); return }

    setSaving(true); setError('')
    const rows = dates.map(d => ({
      course_id: id,
      session_date: d,
      start_time: recurStart + ':00',
      end_time: recurEnd + ':00',
      status: 'available',
    }))

    const { data, error: err } = await supabase.from('course_sessions').insert(rows as any).select()
    if (err) { setError(err.message); setSaving(false); return }
    setSessions(prev => [...prev, ...(data ?? [])].sort((a, b) => a.session_date.localeCompare(b.session_date) || a.start_time.localeCompare(b.start_time)))
    setRecurFrom(''); setRecurTo('')
    setSaving(false)
    setShowAddForm(false)
  }

  // --- Seans iptal et ---
  async function cancelSession(sessionId: string) {
    setCancelling(sessionId)
    await supabase.from('course_sessions').update({ status: 'cancelled' } as any).eq('id', sessionId)
    setSessions(prev => prev.map(s => s.id === sessionId ? { ...s, status: 'cancelled' } : s))
    setCancelling(null)
  }

  // --- Kayıt onayla/reddet ---
  async function handleEnrollment(enrollmentId: string, accept: boolean) {
    setAcceptingEnrollment(enrollmentId)
    await supabase.from('course_enrollments')
      .update({ status: accept ? 'confirmed' : 'cancelled' } as any)
      .eq('id', enrollmentId)
    setEnrollments(prev => prev.map(e => e.id === enrollmentId ? { ...e, status: accept ? 'confirmed' : 'cancelled' } : e))
    setAcceptingEnrollment(null)
  }

  if (loading) return (
    <div className="max-w-2xl mx-auto px-4 py-12 flex justify-center">
      <Loader2 size={24} className="animate-spin text-accent" />
    </div>
  )

  const today = new Date().toISOString().split('T')[0]
  const upcomingSessions = sessions.filter(s => s.session_date >= today)
  const pastSessions = sessions.filter(s => s.session_date < today)
  const pendingEnrollments = enrollments.filter(e => e.status === 'pending')
  const confirmedEnrollments = enrollments.filter(e => e.status === 'confirmed')

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-8">
      <div>
        <Link href="/dashboard/courses" className="flex items-center gap-2 text-text-muted text-sm mb-4 hover:text-text-primary w-fit">
          <ArrowLeft size={16} /> Kurslarım
        </Link>
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="font-bebas text-4xl text-text-primary">{course.title}</h1>
            <p className="text-text-muted text-sm mt-0.5">
              {course.duration_minutes} dk · ₺{course.price_per_session} / seans
            </p>
          </div>
          <Link href={`/courses/${id}`} target="_blank" className="text-xs text-accent hover:underline flex-shrink-0 mt-1">
            Sayfayı gör →
          </Link>
        </div>
      </div>

      {/* --- SEANSLAR --- */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-bebas text-2xl text-text-primary flex items-center gap-2">
            <CalendarDays size={18} /> SEANSLAR
          </h2>
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="btn-accent py-1.5 px-3 text-xs flex items-center gap-1.5"
          >
            <Plus size={12} /> {showAddForm ? 'İptal' : 'Seans Ekle'}
          </button>
        </div>

        {/* Seans ekleme formu */}
        {showAddForm && (
          <div className="card p-4 mb-4 space-y-4">
            {/* Mod seçimi */}
            <div className="flex gap-2">
              {(['single', 'recurring'] as AddMode[]).map(mode => (
                <button
                  key={mode}
                  onClick={() => setAddMode(mode)}
                  className={cn(
                    'flex-1 py-2 text-xs font-medium rounded-lg transition-colors border',
                    addMode === mode
                      ? 'bg-accent/10 text-accent border-accent/30'
                      : 'text-text-muted border-[rgba(228,224,216,0.1)] hover:text-text-primary'
                  )}
                >
                  {mode === 'single' ? 'Tek Seans' : 'Tekrarlayan'}
                </button>
              ))}
            </div>

            {addMode === 'single' && (
              <div className="space-y-3">
                <div className="grid grid-cols-3 gap-2">
                  <div className="col-span-1">
                    <label className="label">Tarih</label>
                    <input
                      type="date"
                      min={today}
                      value={singleDate}
                      onChange={e => setSingleDate(e.target.value)}
                      className="input-field text-sm"
                    />
                  </div>
                  <div>
                    <label className="label">Başlangıç</label>
                    <input type="time" value={singleStart} onChange={e => setSingleStart(e.target.value)} className="input-field text-sm" />
                  </div>
                  <div>
                    <label className="label">Bitiş</label>
                    <input type="time" value={singleEnd} onChange={e => setSingleEnd(e.target.value)} className="input-field text-sm" />
                  </div>
                </div>
                {error && <p className="text-red-400 text-xs">{error}</p>}
                <button onClick={addSingleSession} disabled={saving || !singleDate} className="btn-accent w-full py-2 text-xs disabled:opacity-50 flex items-center justify-center gap-1.5">
                  {saving ? <><Loader2 size={12} className="animate-spin" /> Ekleniyor...</> : <><Plus size={12} /> Seans Ekle</>}
                </button>
              </div>
            )}

            {addMode === 'recurring' && (
              <div className="space-y-3">
                <div>
                  <label className="label">Haftanın Günü</label>
                  <div className="flex flex-wrap gap-1.5 mt-1">
                    {DAY_NAMES.map((d, i) => (
                      <button
                        key={i}
                        onClick={() => setRecurDay(i)}
                        className={cn(
                          'text-xs px-2.5 py-1.5 rounded border transition-colors',
                          recurDay === i
                            ? 'bg-accent/10 text-accent border-accent/30'
                            : 'text-text-muted border-[rgba(228,224,216,0.1)] hover:text-text-primary'
                        )}
                      >
                        {d}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="label">Başlangıç Saati</label>
                    <input type="time" value={recurStart} onChange={e => setRecurStart(e.target.value)} className="input-field text-sm" />
                  </div>
                  <div>
                    <label className="label">Bitiş Saati</label>
                    <input type="time" value={recurEnd} onChange={e => setRecurEnd(e.target.value)} className="input-field text-sm" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="label">İlk Tarih</label>
                    <input type="date" min={today} value={recurFrom} onChange={e => setRecurFrom(e.target.value)} className="input-field text-sm" />
                  </div>
                  <div>
                    <label className="label">Son Tarih</label>
                    <input type="date" min={recurFrom || today} value={recurTo} onChange={e => setRecurTo(e.target.value)} className="input-field text-sm" />
                  </div>
                </div>
                {recurFrom && recurTo && recurFrom <= recurTo && (
                  <p className="text-text-muted text-xs">
                    Tahminen {countDays(recurFrom, recurTo, recurDay)} seans oluşturulacak.
                  </p>
                )}
                {error && <p className="text-red-400 text-xs">{error}</p>}
                <button onClick={addRecurringSessions} disabled={saving} className="btn-accent w-full py-2 text-xs disabled:opacity-50 flex items-center justify-center gap-1.5">
                  {saving ? <><Loader2 size={12} className="animate-spin" /> Oluşturuluyor...</> : <><CalendarDays size={12} /> Seansları Oluştur</>}
                </button>
              </div>
            )}
          </div>
        )}

        {/* Yaklaşan seanslar */}
        {upcomingSessions.length === 0 && !showAddForm ? (
          <div className="card p-6 text-center text-text-muted text-sm">
            Henüz seans eklenmemiş.
          </div>
        ) : (
          <div className="space-y-2">
            {upcomingSessions.map(s => (
              <SessionRow
                key={s.id}
                session={s}
                enrollments={enrollments.filter(e => e.session_id === s.id && e.status === 'confirmed')}
                maxParticipants={course.max_participants ?? 1}
                onCancel={s.status === 'available' ? () => cancelSession(s.id) : undefined}
                cancelling={cancelling === s.id}
              />
            ))}
          </div>
        )}

        {/* Geçmiş seanslar */}
        {pastSessions.length > 0 && (
          <details className="mt-4">
            <summary className="text-text-muted text-xs cursor-pointer hover:text-text-primary select-none">
              Geçmiş seanslar ({pastSessions.length})
            </summary>
            <div className="space-y-2 mt-2">
              {pastSessions.map(s => (
                <SessionRow key={s.id} session={s} enrollments={[]} maxParticipants={course.max_participants ?? 1} />
              ))}
            </div>
          </details>
        )}
      </div>

      {/* --- KAYITLAR --- */}
      <div>
        <h2 className="font-bebas text-2xl text-text-primary mb-3 flex items-center gap-2">
          <Users size={18} /> KAYITLAR
          {pendingEnrollments.length > 0 && (
            <span className="font-sans text-xs font-semibold px-1.5 py-0.5 rounded-full bg-yellow-400/15 text-yellow-400 border border-yellow-400/20">
              {pendingEnrollments.length} bekliyor
            </span>
          )}
        </h2>

        {enrollments.length === 0 ? (
          <div className="card p-4 text-center text-text-muted text-sm">Henüz kayıt yok.</div>
        ) : (
          <div className="space-y-2">
            {/* Önce bekleyenler */}
            {pendingEnrollments.map(e => (
              <EnrollmentRow
                key={e.id}
                enrollment={e}
                sessions={sessions}
                onAccept={() => handleEnrollment(e.id, true)}
                onReject={() => handleEnrollment(e.id, false)}
                acting={acceptingEnrollment === e.id}
              />
            ))}
            {/* Sonra onaylananlar */}
            {confirmedEnrollments.map(e => (
              <EnrollmentRow key={e.id} enrollment={e} sessions={sessions} />
            ))}
            {/* İptal edilenler */}
            {enrollments.filter(e => e.status === 'cancelled').map(e => (
              <EnrollmentRow key={e.id} enrollment={e} sessions={sessions} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function SessionRow({
  session, enrollments, maxParticipants, onCancel, cancelling,
}: {
  session: any
  enrollments: any[]
  maxParticipants: number
  onCancel?: () => void
  cancelling?: boolean
}) {
  const date = new Date(session.session_date + 'T00:00:00')
  const dayName = DAY_NAMES[date.getDay()]
  const dateStr = date.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long' })
  const isFull = enrollments.length >= maxParticipants

  return (
    <div className={cn('card p-3 flex items-center gap-3', session.status === 'cancelled' && 'opacity-50')}>
      <div className="flex-shrink-0 text-center w-12">
        <p className="text-accent font-bold text-sm">{date.getDate()}</p>
        <p className="text-text-muted text-[10px]">{date.toLocaleDateString('tr-TR', { month: 'short' })}</p>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-text-primary text-sm">{dayName}, {dateStr}</p>
        <p className="text-text-muted text-xs">
          {session.start_time?.slice(0, 5)} – {session.end_time?.slice(0, 5)}
          {maxParticipants > 1 && ` · ${enrollments.length}/${maxParticipants} kişi`}
        </p>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        <span className={cn('text-[10px] px-1.5 py-0.5 rounded border', STATUS_COLORS[isFull ? 'booked' : session.status] ?? STATUS_COLORS.available)}>
          {isFull ? 'Dolu' : STATUS_LABELS[session.status] ?? session.status}
        </span>
        {onCancel && (
          <button
            onClick={onCancel}
            disabled={cancelling}
            className="p-1 text-text-muted hover:text-red-400 transition-colors disabled:opacity-40"
            title="İptal Et"
          >
            {cancelling ? <Loader2 size={12} className="animate-spin" /> : <X size={12} />}
          </button>
        )}
      </div>
    </div>
  )
}

function EnrollmentRow({
  enrollment, sessions, onAccept, onReject, acting,
}: {
  enrollment: any
  sessions: any[]
  onAccept?: () => void
  onReject?: () => void
  acting?: boolean
}) {
  const session = sessions.find(s => s.id === enrollment.session_id)
  const statusColor: Record<string, string> = {
    pending: 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20',
    confirmed: 'text-success bg-success/10 border-success/20',
    cancelled: 'text-red-400 bg-red-400/10 border-red-400/20',
    waitlist: 'text-text-muted bg-[rgba(228,224,216,0.06)] border-[rgba(228,224,216,0.1)]',
  }
  const statusLabel: Record<string, string> = {
    pending: 'Bekliyor',
    confirmed: 'Onaylandı',
    cancelled: 'İptal',
    waitlist: 'Bekleme',
  }

  return (
    <div className="card p-3 flex items-center gap-3">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="text-text-primary text-sm font-medium">{enrollment.student_name}</p>
          <span className={cn('text-[10px] px-1.5 py-0.5 rounded border', statusColor[enrollment.status] ?? '')}>
            {statusLabel[enrollment.status] ?? enrollment.status}
          </span>
          {enrollment.gender && (
            <span className="text-[10px] text-text-muted">{enrollment.gender === 'female' ? '♀' : enrollment.gender === 'male' ? '♂' : '⚥'}</span>
          )}
        </div>
        <p className="text-text-muted text-xs mt-0.5">
          {enrollment.student_phone} · {enrollment.student_email}
        </p>
        {session && (
          <p className="text-text-muted text-xs mt-0.5">
            {new Date(session.session_date + 'T00:00:00').toLocaleDateString('tr-TR', { day: 'numeric', month: 'long' })} {session.start_time?.slice(0, 5)}
          </p>
        )}
      </div>
      {enrollment.status === 'pending' && onAccept && onReject && (
        <div className="flex gap-1.5 flex-shrink-0">
          <button
            onClick={onAccept}
            disabled={acting}
            className="w-7 h-7 rounded-lg bg-success/10 text-success hover:bg-success/20 flex items-center justify-center transition-colors disabled:opacity-40"
          >
            {acting ? <Loader2 size={11} className="animate-spin" /> : <Check size={11} />}
          </button>
          <button
            onClick={onReject}
            disabled={acting}
            className="w-7 h-7 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 flex items-center justify-center transition-colors disabled:opacity-40"
          >
            <X size={11} />
          </button>
        </div>
      )}
    </div>
  )
}

function countDays(from: string, to: string, dayOfWeek: number): number {
  let count = 0
  const cur = new Date(from)
  const end = new Date(to)
  while (cur <= end) {
    if (cur.getDay() === dayOfWeek) count++
    cur.setDate(cur.getDate() + 1)
  }
  return count
}
