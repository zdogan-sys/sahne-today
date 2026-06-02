'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { BookOpen, GraduationCap, Clock } from 'lucide-react'
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
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const [bookingsRes, enrollmentsRes] = await Promise.all([
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
      ])

      setBookings(bookingsRes.data ?? [])
      setEnrollments(enrollmentsRes.data ?? [])
      setLoading(false)
    }
    load()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId])

  if (loading) return null
  if (bookings.length === 0 && enrollments.length === 0) return null

  return (
    <div className="space-y-6">
      <h2 className="font-bebas text-2xl text-text-primary">DERSLERİM & KURSLARIM</h2>

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
