import { createAdminClient } from '@/lib/supabase/admin'

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

  const { data: venues } = await admin
    .from('venues')
    .select('id, name')
    .eq('owner_id', profile.id)

  if (!venues || venues.length === 0) return new Response('Not found', { status: 404 })

  const venueIds = venues.map((v: any) => v.id)

  const today = new Date().toISOString().split('T')[0]
  const { data: events } = await admin
    .from('events')
    .select('id, title, event_date, start_time, end_time, description, venues(name, address, district, city), artists(stage_name), bands(name)')
    .in('venue_id', venueIds)
    .eq('status', 'confirmed')
    .gte('event_date', today)
    .order('event_date', { ascending: true })

  const veventBlocks = (events ?? []).map((ev: any) => {
    const venue = ev.venues
    const location = venue ? [venue.name, venue.address, venue.district, venue.city].filter(Boolean).join(', ') : ''
    const performer = ev.artists?.stage_name ?? ev.bands?.name ?? ''
    const dtStart = toICSDate(ev.event_date, ev.start_time)
    const dtEnd = toICSDate(ev.event_date, ev.end_time ?? ev.start_time)
    const desc = [performer ? `Sanatçı: ${performer}` : '', ev.description].filter(Boolean).join('\n')
    return [
      'BEGIN:VEVENT',
      `UID:${ev.id}@sahne.today`,
      `DTSTART:${dtStart}`,
      `DTEND:${dtEnd}`,
      `SUMMARY:${escapeICS(ev.title)}`,
      location ? `LOCATION:${escapeICS(location)}` : '',
      desc ? `DESCRIPTION:${escapeICS(desc)}` : '',
      `URL:https://sahne.today/events/${ev.id}`,
      'END:VEVENT',
    ].filter(Boolean).join('\r\n')
  })

  const calName = (profile as any).display_name ?? 'Mekan'
  const ics = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Sahne.Today//TR',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    `X-WR-CALNAME:${escapeICS(calName)} — Sahne.Today`,
    'REFRESH-INTERVAL;VALUE=DURATION:PT6H',
    ...veventBlocks,
    'END:VCALENDAR',
  ].join('\r\n')

  return new Response(ics, {
    headers: {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Cache-Control': 'no-cache',
    },
  })
}
