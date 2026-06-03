export const dynamic = 'force-dynamic'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { PersonalCalendar } from '@/components/dashboard/PersonalCalendar'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

export default async function PersonalCalendarPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth')

  const { data: profile } = await supabase
    .from('profiles')
    .select('display_name, calendar_token')
    .eq('id', user.id)
    .single()

  const today = new Date().toISOString().split('T')[0]

  const [ticketsRes, attendanceRes, studioRes, bookingsRes, enrollmentsRes] = await Promise.all([
    supabase
      .from('tickets')
      .select('id, status, quantity, events(id, title, event_date, start_time, end_time, venues(name, city))')
      .eq('buyer_email', user.email ?? '')
      .not('status', 'eq', 'cancelled'),
    supabase
      .from('event_attendance')
      .select('id, status, events(id, title, event_date, start_time, end_time, venues(name, city))')
      .eq('user_id', user.id),
    supabase
      .from('studio_reservations')
      .select('id, reservation_date, start_time, end_time, status, room_name, venues(id, name)')
      .eq('reserver_id', user.id)
      .not('status', 'eq', 'cancelled'),
    supabase
      .from('teaching_bookings')
      .select('id, lesson_date, status, teaching_slots(instrument, instructor_name, start_time, end_time, artists(stage_name), venues(name))')
      .eq('student_id', user.id)
      .not('status', 'eq', 'cancelled'),
    supabase
      .from('course_enrollments')
      .select('id, status, courses(id, title, course_sessions(session_date, start_time, end_time))')
      .eq('student_email', user.email ?? '')
      .not('status', 'eq', 'cancelled'),
  ])

  // Tüm etkinlikleri tek bir listeye topla
  const entries: any[] = []

  for (const t of ticketsRes.data ?? []) {
    const ev = (t as any).events
    if (!ev?.event_date) continue
    entries.push({ type: 'ticket', date: ev.event_date, title: ev.title, start_time: ev.start_time, end_time: ev.end_time, subtitle: ev.venues?.name, color: 'accent', id: ev.id, linkTo: `/events/${ev.id}` })
  }

  for (const a of attendanceRes.data ?? []) {
    const ev = (a as any).events
    if (!ev?.event_date) continue
    if (entries.find(e => e.linkTo === `/events/${ev.id}`)) continue // bilet varsa tekrar ekleme
    entries.push({ type: 'attendance', date: ev.event_date, title: ev.title, start_time: ev.start_time, subtitle: ev.venues?.name, color: (a as any).status === 'going' ? 'success' : 'muted', status: (a as any).status, id: ev.id, linkTo: `/events/${ev.id}` })
  }

  for (const r of studioRes.data ?? []) {
    entries.push({ type: 'studio', date: r.reservation_date, title: (r as any).venues?.name ?? 'Stüdyo', start_time: r.start_time, end_time: r.end_time, subtitle: r.room_name, color: 'blue', status: r.status, id: r.id, linkTo: `/venues/${(r as any).venues?.id}` })
  }

  for (const b of bookingsRes.data ?? []) {
    const slot = (b as any).teaching_slots
    if (!b.lesson_date || !slot) continue
    entries.push({ type: 'lesson', date: b.lesson_date, title: `${slot.instrument ?? 'Ders'} — ${slot.instructor_name ?? slot.artists?.stage_name ?? ''}`, start_time: slot.start_time, end_time: slot.end_time, subtitle: slot.venues?.name, color: 'purple', status: b.status, id: b.id })
  }

  for (const e of enrollmentsRes.data ?? []) {
    const course = (e as any).courses
    if (!course) continue
    for (const s of course.course_sessions ?? []) {
      entries.push({ type: 'course', date: s.session_date, title: course.title, start_time: s.start_time, end_time: s.end_time, color: 'orange', id: course.id, linkTo: `/courses/${course.id}` })
    }
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      <Link href="/dashboard" className="flex items-center gap-2 text-text-muted text-sm mb-4 hover:text-text-primary w-fit">
        <ArrowLeft size={16} /> Dashboard
      </Link>
      <PersonalCalendar
        entries={entries}
        calendarToken={(profile as any)?.calendar_token ?? null}
        showTitle={true}
      />
    </div>
  )
}
