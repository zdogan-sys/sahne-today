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
  const { data: ev } = await admin
    .from('events')
    .select('title, event_date, start_time, end_time, description, venues(name, address, district, city)')
    .eq('id', id)
    .single()
  if (!ev) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const venue = (ev as any).venues
  const location = venue
    ? [venue.name, venue.address, venue.district, venue.city].filter(Boolean).join(', ')
    : ''
  const dtStart = toICSDate(ev.event_date, ev.start_time)
  const endTime = (ev as any).end_time ?? ev.start_time
  const dtEnd = toICSDate(ev.event_date, endTime)
  const slug = (ev.title as string).toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 40)

  const ics = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Sahne.Today//TR',
    'CALSCALE:GREGORIAN',
    'BEGIN:VEVENT',
    `UID:${id}@sahne.today`,
    `DTSTART:${dtStart}`,
    `DTEND:${dtEnd}`,
    `SUMMARY:${escapeICS(ev.title)}`,
    location ? `LOCATION:${escapeICS(location)}` : '',
    (ev as any).description ? `DESCRIPTION:${escapeICS((ev as any).description)}` : '',
    `URL:https://sahne.today/events/${id}`,
    'END:VEVENT',
    'END:VCALENDAR',
  ].filter(Boolean).join('\r\n')

  return new Response(ics, {
    headers: {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Content-Disposition': `attachment; filename="sahne-${slug}.ics"`,
    },
  })
}
