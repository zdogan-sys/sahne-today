'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { BookOpen, GraduationCap, Clock, Building2 } from 'lucide-react'
import { cn } from '@/lib/utils'

const STATUS_LABEL: Record<string, { label: string; color: string }> = {
  pending:          { label: 'Onay Bekleniyor', color: 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20' },
  awaiting_student: { label: 'Onay Bekleniyor', color: 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20' },
  confirmed:        { label: 'Onaylandı',        color: 'text-success bg-success/10 border-success/20' },
  cancelled:        { label: 'İptal',            color: 'text-red-400 bg-red-400/10 border-red-400/20' },
}

export function StudentDashboard({ userId }: { userId: string }) {
  const supabase = createClient()
  const [bookings, setBookings] = useState<any[]>([])
  const [enrollments, setEnrollments] = useState<any[]>([])
  const [studioReservations, setStudioReservations] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const [bookingsRes, enrollmentsRes, studioRes] = await Promise.all([
        supabase
          .from('teaching_bookings')
          .select('id, lesson_date, status, teaching_slots(instrument, instructor_name, start_time, end_time, artists(stage_name), venues(name))')
          .eq('student_email', user.email ?? '')
          .not('status', 'eq', 'cancelled')
          .order('lesson_date', { ascending: true })
          .limit(10),
        supabase
          .from('course_enrollments')
          .select('id, status, created_at, courses(id, title, category, price_per_session, venues(name), profiles(display_name))')
          .eq('student_email', user.email ?? '')
          .not('status', 'eq', 'cancelled')
          .order('created_at', { ascending: false })
          .limit(10),
        supabase
          .from('studio_reservations')
          .select('id, reservation_date, start_time, end_time, status, room_name, total_price, venues(id, name)')
          .eq('reserver_id', user.id)
          .not('status', 'eq', 'cancelled')
          .order('reservation_date', { ascending: true })
          .limit(10),
      ])

      setBookings(bookingsRes.data ?? [])
      setEnrollments(enrollmentsRes.data ?? [])
      setStudioReservations(studioRes.data ?? [])
      setLoading(false)
    }
    load()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId])

  if (loading) return null
  if (bookings.length === 0 && enrollments.length === 0 && studioReservations.length === 0) return null

  return (
    <div className="space-y-6">
      <h2 className="font-bebas text-2xl text-text-primary">DERSLERİM, KURSLARIM & REZERVASYONLARlM</h2>

      {studioReservations.length > 0 && (
        <div>
          <h3 className="text-text-muted text-xs uppercase tracking-wider mb-3 flex items-center gap-1.5">
            <Building2 size={12} /> Stüdyo Rezervasyonları
          </h3>
          <div className="space-y-2">
            {studioReservations.map(r => {
              const s = STATUS_LABEL[r.status] ?? STATUS_LABEL.pending
              const dateStr = new Date(r.reservation_date + 'T00:00:00').toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' })
              return (
                <Link key={r.id} href={`/venues/${r.venues?.id}`} className="card p-3 flex items-center gap-3 hover:border-accent/30 transition-colors">
                  <div className="flex-1 min-w-0">
                    <p className="text-text-primary text-sm font-medium">{r.venues?.name}</p>
                    <p className="text-text-muted text-xs mt-0.5 flex items-center gap-1">
                      <Clock size={9} /> {dateStr} · {r.start_time?.slice(0, 5)}–{r.end_time?.slice(0, 5)}
                      {r.room_name && <span className="ml-1">· {r.room_name}</span>}
                      {r.total_price > 0 && <span className="ml-1 text-accent font-bebas">₺{r.total_price}</span>}
                    </p>
                  </div>
                  <span className={cn('text-[10px] px-1.5 py-0.5 rounded border flex-shrink-0', s.color)}>
                    {s.label}
                  </span>
                </Link>
              )
            })}
          </div>
        </div>
      )}

      {bookings.length > 0 && (
        <div>
          <h3 className="text-text-muted text-xs uppercase tracking-wider mb-3 flex items-center gap-1.5">
            <GraduationCap size={12} /> Özel Dersler
          </h3>
          <div className="space-y-2">
            {bookings.map(b => {
              const slot = b.teaching_slots
              const instructorName = slot?.instructor_name ?? slot?.artists?.stage_name ?? '—'
              const source = slot?.venues?.name ?? slot?.artists?.stage_name
              const dateStr = b.lesson_date
                ? new Date(b.lesson_date + 'T00:00:00').toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' })
                : '—'
              const s = STATUS_LABEL[b.status] ?? STATUS_LABEL.pending
              return (
                <div key={b.id} className="card p-3 flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-text-primary text-sm font-medium">{slot?.instrument} — {instructorName}</p>
                    <p className="text-text-muted text-xs mt-0.5 flex items-center gap-1">
                      <Clock size={9} /> {dateStr} · {slot?.start_time?.slice(0, 5)}
                      {source && <span className="ml-1">· {source}</span>}
                    </p>
                  </div>
                  <span className={cn('text-[10px] px-1.5 py-0.5 rounded border flex-shrink-0', s.color)}>
                    {s.label}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {enrollments.length > 0 && (
        <div>
          <h3 className="text-text-muted text-xs uppercase tracking-wider mb-3 flex items-center gap-1.5">
            <BookOpen size={12} /> Kurs Kayıtları
          </h3>
          <div className="space-y-2">
            {enrollments.map(e => {
              const course = e.courses
              const s = STATUS_LABEL[e.status] ?? STATUS_LABEL.pending
              const instructorName = course?.profiles?.display_name
              const venueName = course?.venues?.name
              return (
                <Link key={e.id} href={`/courses/${course?.id}`} className="card p-3 flex items-center gap-3 hover:border-accent/30 transition-colors">
                  <div className="flex-1 min-w-0">
                    <p className="text-text-primary text-sm font-medium">{course?.title}</p>
                    <p className="text-text-muted text-xs mt-0.5">
                      {instructorName && <span>{instructorName}</span>}
                      {venueName && <span>{instructorName ? ' · ' : ''}{venueName}</span>}
                    </p>
                  </div>
                  <span className={cn('text-[10px] px-1.5 py-0.5 rounded border flex-shrink-0', s.color)}>
                    {s.label}
                  </span>
                </Link>
              )
            })}
          </div>
        </div>
      )}

      <Link href="/courses" className="text-accent text-xs hover:underline block">
        Tüm kurslara göz at →
      </Link>
    </div>
  )
}
