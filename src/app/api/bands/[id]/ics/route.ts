import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'

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
  const today = new Date().toISOString().split('T')[0]

  const [bandRes, eventsRes] = await Promise.all([
    admin.from('bands').select('name').eq('id', id).single(),
    admin.from('events')
      .select('id, title, event_date, start_time, end_time, description, venues(name, address, district, city)')
      .eq('band_id', id)
      .eq('status', 'confirmed')
      .gte('event_date', today)
      .order('event_date', { ascending: true }),
  ])

  if (!bandRes.data) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  const bandName = (bandRes.data as any).name as string
  const events = eventsRes.data ?? []

  const veventBlocks = events.map((ev: any) => {
    const venue = ev.venues
    const location = venue ? [venue.name, venue.address, venue.district, venue.city].filter(Boolean).join(', ') : ''
    const dtStart = toICSDate(ev.event_date, ev.start_time)
    const dtEnd = toICSDate(ev.event_date, ev.end_time ?? ev.start_time)
    return [
      'BEGIN:VEVENT',
      `UID:${ev.id}@sahne.today`,
      `DTSTART:${dtStart}`,
      `DTEND:${dtEnd}`,
      `SUMMARY:${escapeICS(ev.title)}`,
      location ? `LOCATION:${escapeICS(location)}` : '',
      ev.description ? `DESCRIPTION:${escapeICS(ev.description)}` : '',
      `URL:https://sahne.today/events/${ev.id}`,
      'END:VEVENT',
    ].filter(Boolean).join('\r\n')
  })

  const ics = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Sahne.Today//TR',
    'CALSCALE:GREGORIAN',
    `X-WR-CALNAME:${escapeICS(bandName)}`,
    ...veventBlocks,
    'END:VCALENDAR',
  ].join('\r\n')

  const slug = bandName.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 40)
  return new Response(ics, {
    headers: {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Content-Disposition': `attachment; filename="sahne-${slug}.ics"`,
    },
  })
}
