'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { BookOpen, GraduationCap, Clock, Building2, Ticket, Star, CalendarPlus } from 'lucide-react'
import { cn } from '@/lib/utils'

const STATUS_LABEL: Record<string, { label: string; color: string }> = {
  pending:          { label: 'Onay Bekleniyor', color: 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20' },
  awaiting_student: { label: 'Onay Bekleniyor', color: 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20' },
  confirmed:        { label: 'Onaylandı',        color: 'text-success bg-success/10 border-success/20' },
  cancelled:        { label: 'İptal',            color: 'text-red-400 bg-red-400/10 border-red-400/20' },
}

export function StudentDashboard({ userId, calendarToken }: { userId: string; calendarToken?: string | null }) {
  const supabase = createClient()
  const [bookings, setBookings] = useState<any[]>([])
  const [enrollments, setEnrollments] = useState<any[]>([])
  const [studioReservations, setStudioReservations] = useState<any[]>([])
  const [tickets, setTickets] = useState<any[]>([])
  const [interested, setInterested] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const today = new Date().toISOString().split('T')[0]

      const [bookingsRes, enrollmentsRes, studioRes, ticketsRes, interestedRes] = await Promise.all([
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
        supabase
          .from('tickets')
          .select('id, status, quantity, total_price, created_at, events(id, title, event_date, start_time, venues(name))')
          .eq('buyer_email', user.email ?? '')
          .not('status', 'eq', 'cancelled')
          .order('created_at', { ascending: false })
          .limit(10),
        supabase
          .from('event_attendance')
          .select('id, status, events(id, title, event_date, start_time, venues(name))')
          .eq('user_id', user.id)
          .gte('events.event_date', today)
          .order('created_at', { ascending: false })
          .limit(10),
      ])

      setBookings(bookingsRes.data ?? [])
      setEnrollments(enrollmentsRes.data ?? [])
      setStudioReservations(studioRes.data ?? [])
      setTickets(ticketsRes.data ?? [])
      setInterested((interestedRes.data ?? []).filter((a: any) => a.events))
      setLoading(false)
    }
    load()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId])

  if (loading) return null
  if (bookings.length === 0 && enrollments.length === 0 && studioReservations.length === 0 && tickets.length === 0 && interested.length === 0) return null

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-bebas text-2xl text-text-primary mb-3">ETKİNLİKLERİM & REZERVASYONLARIM</h2>
        {calendarToken && <PersonalCalendarSubscribe token={calendarToken} />}
      </div>

      {tickets.length > 0 && (
        <div>
          <h3 className="text-text-muted text-xs uppercase tracking-wider mb-3 flex items-center gap-1.5">
            <Ticket size={12} /> Biletlerim
          </h3>
          <div className="space-y-2">
            {tickets.map(t => {
              const ev = t.events
              const dateStr = ev?.event_date
                ? new Date(ev.event_date + 'T00:00:00').toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' })
                : '—'
              const statusColor = t.status === 'confirmed' || t.status === 'used'
                ? 'text-success bg-success/10 border-success/20'
                : 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20'
              const statusLabel = t.status === 'used' ? 'Kullanıldı' : t.status === 'confirmed' ? 'Onaylandı' : 'Bekliyor'
              return (
                <Link key={t.id} href={`/events/${ev?.id}`} className="card p-3 flex items-center gap-3 hover:border-accent/30 transition-colors">
                  <div className="flex-1 min-w-0">
                    <p className="text-text-primary text-sm font-medium">{ev?.title}</p>
                    <p className="text-text-muted text-xs mt-0.5 flex items-center gap-1">
                      <Clock size={9} /> {dateStr} · {ev?.start_time?.slice(0, 5)}
                      {ev?.venues?.name && <span className="ml-1">· {ev.venues.name}</span>}
                      {t.quantity > 1 && <span className="ml-1">· {t.quantity} bilet</span>}
                      {t.total_price > 0 && <span className="ml-1 text-accent font-bebas">₺{t.total_price}</span>}
                    </p>
                  </div>
                  <span className={cn('text-[10px] px-1.5 py-0.5 rounded border flex-shrink-0', statusColor)}>
                    {statusLabel}
                  </span>
                </Link>
              )
            })}
          </div>
        </div>
      )}

      {interested.length > 0 && (
        <div>
          <h3 className="text-text-muted text-xs uppercase tracking-wider mb-3 flex items-center gap-1.5">
            <Star size={12} /> Gitmeyi Düşündüklerim
          </h3>
          <div className="space-y-2">
            {interested.map(a => {
              const ev = a.events
              const dateStr = ev?.event_date
                ? new Date(ev.event_date + 'T00:00:00').toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' })
                : '—'
              return (
                <Link key={a.id} href={`/events/${ev?.id}`} className="card p-3 flex items-center gap-3 hover:border-accent/30 transition-colors">
                  <div className="flex-1 min-w-0">
                    <p className="text-text-primary text-sm font-medium">{ev?.title}</p>
                    <p className="text-text-muted text-xs mt-0.5 flex items-center gap-1">
                      <Clock size={9} /> {dateStr} · {ev?.start_time?.slice(0, 5)}
                      {ev?.venues?.name && <span className="ml-1">· {ev.venues.name}</span>}
                    </p>
                  </div>
                  <span className={cn('text-[10px] px-1.5 py-0.5 rounded border flex-shrink-0',
                    a.status === 'going' ? 'text-accent bg-accent/10 border-accent/20' : 'text-text-muted bg-[rgba(228,224,216,0.06)] border-[rgba(228,224,216,0.1)]'
                  )}>
                    {a.status === 'going' ? 'Gidiyorum' : 'İlgileniyor'}
                  </span>
                </Link>
              )
            })}
          </div>
        </div>
      )}

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

function PersonalCalendarSubscribe({ token }: { token: string }) {
  const [open, setOpen] = useState(false)
  const siteUrl = typeof window !== 'undefined' ? window.location.origin : 'https://sahne.today'
  const feedUrl = `${siteUrl}/api/feed/personal/${token}/ics`
  const webcalUrl = feedUrl.replace(/^https?:/, 'webcal:')

  return (
    <div className="relative">
      <button onClick={() => setOpen(o => !o)}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-accent/15 text-accent border border-accent/30 text-xs font-semibold hover:bg-accent/25 transition-colors">
        <CalendarPlus size={13} /> Takvime Ekle
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-2 w-60 bg-surface border border-[rgba(228,224,216,0.12)] rounded-xl shadow-2xl z-50 overflow-hidden">
            <p className="px-4 pt-3 pb-1 text-[10px] text-text-muted uppercase tracking-wider">Otomatik Senkronizasyon</p>
            <a href={`https://calendar.google.com/calendar/r?cid=${encodeURIComponent(webcalUrl)}`}
              target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-3 px-4 py-3 hover:bg-[rgba(228,224,216,0.04)] transition-colors"
              onClick={() => setOpen(false)}>
              <span className="text-2xl leading-none">📅</span>
              <div>
                <p className="text-sm text-text-primary font-medium">Google Takvim</p>
                <p className="text-[10px] text-text-muted">Her 1 saatte güncellenir</p>
              </div>
            </a>
            <a href={webcalUrl}
              className="flex items-center gap-3 px-4 py-3 hover:bg-[rgba(228,224,216,0.04)] transition-colors"
              onClick={() => setOpen(false)}>
              <span className="text-2xl leading-none">🍎</span>
              <div>
                <p className="text-sm text-text-primary font-medium">Apple Takvim</p>
                <p className="text-[10px] text-text-muted">Her 1 saatte güncellenir</p>
              </div>
            </a>
            <div className="border-t border-[rgba(228,224,216,0.08)] px-4 pt-2 pb-3">
              <a href={feedUrl} download="kisisel-takvim.ics"
                className="text-xs text-accent hover:underline"
                onClick={() => setOpen(false)}>
                .ics dosyası indir →
              </a>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
