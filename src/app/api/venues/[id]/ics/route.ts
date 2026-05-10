import { createAdminClient } from '@/lib/supabase/admin'

function pad(n: number) { return String(n).padStart(2, '0') }
function toICSDate(dateStr: string, timeStr: string) {
  const d = new Date(`${dateStr}T${timeStr}`)
  return `${d.getUTCFullYear()}${pad(d.getUTCMonth()+1)}${pad(d.getUTCDate())}T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}00Z`
}
function escapeICS(s: string) {
  return (s ?? '').replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n')
}

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const admin = createAdminClient()

  const { data: venue } = await admin
    .from('venues')
    .select('id, name, address, district, city')
    .eq('id', id)
    .single()

  if (!venue) return new Response('Not found', { status: 404 })

  const today = new Date().toISOString().split('T')[0]
  const { data: events } = await admin
    .from('events')
    .select('id, title, event_date, start_time, end_time, description, artists(stage_name), bands(name)')
    .eq('venue_id', id)
    .eq('status', 'confirmed')
    .gte('event_date', today)
    .order('event_date', { ascending: true })

  const location = [venue.name, venue.address, venue.district, venue.city].filter(Boolean).join(', ')

  const veventBlocks = (events ?? []).map((ev: any) => {
    const performer = ev.artists?.stage_name ?? ev.bands?.name ?? ''
    const dtStart = toICSDate(ev.event_date, ev.start_time)
    const dtEnd = toICSDate(ev.event_date, ev.end_time ?? ev.start_time)
    const desc = [performer ? `Sanatçı: ${performer}` : '', ev.description].filter(Boolean).join('\n')
    return [
      'BEGIN:VEVENT',
      `UID:${ev.id}@sahne.today`,
      `DTSTART:${dtStart}`,
      `DTEND:${dtEnd}`,
      `SUMMARY:${escapeICS(ev.title)} @ ${escapeICS(venue.name)}`,
      `LOCATION:${escapeICS(location)}`,
      desc ? `DESCRIPTION:${escapeICS(desc)}` : '',
      `URL:https://sahne.today/events/${ev.id}`,
      'END:VEVENT',
    ].filter(Boolean).join('\r\n')
  })

  const ics = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Sahne.Today//TR',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    `X-WR-CALNAME:${escapeICS(venue.name)} — Sahne.Today`,
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
