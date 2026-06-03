import { createAdminClient } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'

function pad(n: number) { return String(n).padStart(2, '0') }
function toICSDate(dateStr: string, timeStr: string) {
  const d = new Date(`${dateStr}T${timeStr}`)
  return `${d.getUTCFullYear()}${pad(d.getUTCMonth()+1)}${pad(d.getUTCDate())}T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}00Z`
}
function escapeICS(s: string) {
  return (s ?? '').replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n')
}

export async function GET(_req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const admin = createAdminClient()

  const { data: profile } = await admin
    .from('profiles')
    .select('id, display_name')
    .eq('calendar_token', token)
    .single()

  if (!profile) return new Response('Not found', { status: 404 })

  const today = new Date().toISOString().split('T')[0]
  const userId = (profile as any).id

  const [ticketsRes, attendanceRes, studioRes, bookingsRes] = await Promise.all([
    admin.from('tickets')
      .select('id, events(id, title, event_date, start_time, end_time, venues(name, address, city))')
      .eq('buyer_email', (await admin.from('profiles').select('id').eq('id', userId).single()).data?.id ?? '')
      .not('status', 'eq', 'cancelled')
      .gte('events.event_date', today),
    admin.from('event_attendance')
      .select('id, status, events(id, title, event_date, start_time, end_time, venues(name, address, city))')
      .eq('user_id', userId)
      .gte('events.event_date' as any, today),
    admin.from('studio_reservations')
      .select('id, reservation_date, start_time, end_time, venues(name, address, city)')
      .eq('reserver_id', userId)
      .not('status', 'eq', 'cancelled')
      .gte('reservation_date', today),
    admin.from('teaching_bookings')
      .select('id, lesson_date, status, teaching_slots(instrument, start_time, end_time, venues(name), artists(stage_name))')
      .eq('student_id', userId)
      .not('status', 'eq', 'cancelled')
      .gte('lesson_date', today),
  ])

  const vevents: string[] = []

  // Biletler
  for (const t of ticketsRes.data ?? []) {
    const ev = (t as any).events
    if (!ev?.event_date) continue
    const loc = ev.venues ? [ev.venues.name, ev.venues.address, ev.venues.city].filter(Boolean).join(', ') : ''
    vevents.push([
      'BEGIN:VEVENT',
      `UID:ticket-${t.id}@sahne.today`,
      `DTSTART:${toICSDate(ev.event_date, ev.start_time ?? '20:00:00')}`,
      `DTEND:${toICSDate(ev.event_date, ev.end_time ?? ev.start_time ?? '22:00:00')}`,
      `SUMMARY:🎫 ${escapeICS(ev.title)}`,
      loc ? `LOCATION:${escapeICS(loc)}` : '',
      `URL:https://sahne.today/events/${ev.id}`,
      'END:VEVENT',
    ].filter(Boolean).join('\r\n'))
  }

  // Gidiyorum / İlgileniyor
  for (const a of attendanceRes.data ?? []) {
    const ev = (a as any).events
    if (!ev?.event_date) continue
    const loc = ev.venues ? [ev.venues.name, ev.venues.city].filter(Boolean).join(', ') : ''
    const icon = (a as any).status === 'going' ? '✅' : '👀'
    vevents.push([
      'BEGIN:VEVENT',
      `UID:attend-${a.id}@sahne.today`,
      `DTSTART:${toICSDate(ev.event_date, ev.start_time ?? '20:00:00')}`,
      `DTEND:${toICSDate(ev.event_date, ev.end_time ?? ev.start_time ?? '22:00:00')}`,
      `SUMMARY:${icon} ${escapeICS(ev.title)}`,
      loc ? `LOCATION:${escapeICS(loc)}` : '',
      `URL:https://sahne.today/events/${ev.id}`,
      'END:VEVENT',
    ].filter(Boolean).join('\r\n'))
  }

  // Stüdyo rezervasyonları
  for (const r of studioRes.data ?? []) {
    const venue = (r as any).venues
    const loc = venue ? [venue.name, venue.address, venue.city].filter(Boolean).join(', ') : ''
    vevents.push([
      'BEGIN:VEVENT',
      `UID:studio-${r.id}@sahne.today`,
      `DTSTART:${toICSDate(r.reservation_date, r.start_time)}`,
      `DTEND:${toICSDate(r.reservation_date, r.end_time)}`,
      `SUMMARY:🎸 Stüdyo — ${escapeICS(venue?.name ?? 'Rezervasyon')}`,
      loc ? `LOCATION:${escapeICS(loc)}` : '',
      'END:VEVENT',
    ].filter(Boolean).join('\r\n'))
  }

  // Özel dersler (öğrenci olarak)
  for (const b of bookingsRes.data ?? []) {
    const slot = (b as any).teaching_slots
    if (!b.lesson_date || !slot) continue
    const instructor = slot.artists?.stage_name ?? slot.venues?.name ?? 'Eğitmen'
    const loc = slot.venues?.name ?? ''
    vevents.push([
      'BEGIN:VEVENT',
      `UID:lesson-${b.id}@sahne.today`,
      `DTSTART:${toICSDate(b.lesson_date, slot.start_time)}`,
      `DTEND:${toICSDate(b.lesson_date, slot.end_time)}`,
      `SUMMARY:🎓 ${escapeICS(slot.instrument ?? 'Ders')} — ${escapeICS(instructor)}`,
      loc ? `LOCATION:${escapeICS(loc)}` : '',
      'END:VEVENT',
    ].filter(Boolean).join('\r\n'))
  }

  // Eğitmen olarak verdiğim dersler (venue_instructors → artist profili bu kullanıcı)
  const { data: myArtists } = await admin.from('artists').select('id').eq('profile_id', userId)
  const artistIds = (myArtists ?? []).map((a: any) => a.id)
  if (artistIds.length > 0) {
    const { data: vi } = await admin.from('venue_instructors').select('name, venue_id').in('artist_id', artistIds).eq('is_active', true)
    const names = Array.from(new Set((vi ?? []).map((v: any) => v.name)))
    const venueIds = Array.from(new Set((vi ?? []).map((v: any) => v.venue_id)))
    if (names.length > 0 && venueIds.length > 0) {
      const { data: teachSlots } = await admin
        .from('teaching_slots')
        .select('id, instrument, slot_date, start_time, end_time, venues(name, city), studio_rooms(name), teaching_bookings(student_name, status)')
        .in('venue_id', venueIds)
        .in('instructor_name', names)
        .eq('is_active', true)
        .not('slot_date', 'is', null)
        .gte('slot_date', today)
      for (const l of teachSlots ?? []) {
        const loc = [(l as any).venues?.name, (l as any).studio_rooms?.name].filter(Boolean).join(' · ')
        const students = ((l as any).teaching_bookings ?? []).filter((b: any) => b.status !== 'cancelled').map((b: any) => b.student_name)
        vevents.push([
          'BEGIN:VEVENT',
          `UID:teach-${(l as any).id}@sahne.today`,
          `DTSTART:${toICSDate((l as any).slot_date, (l as any).start_time)}`,
          `DTEND:${toICSDate((l as any).slot_date, (l as any).end_time)}`,
          `SUMMARY:👨‍🏫 ${escapeICS((l as any).instrument ?? 'Ders')} (eğitmen)`,
          loc ? `LOCATION:${escapeICS(loc)}` : '',
          students.length ? `DESCRIPTION:${escapeICS('Öğrenci: ' + students.join(', '))}` : '',
          'END:VEVENT',
        ].filter(Boolean).join('\r\n'))
      }
    }
  }

  const displayName = (profile as any).display_name ?? 'Kişisel'
  const ics = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Sahne.Today//TR',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    `X-WR-CALNAME:${escapeICS(displayName)} — Kişisel Takvim`,
    'REFRESH-INTERVAL;VALUE=DURATION:PT1H',
    ...vevents,
    'END:VCALENDAR',
  ].join('\r\n')

  return new Response(ics, {
    headers: {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Cache-Control': 'no-cache',
    },
  })
}
