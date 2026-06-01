'use client'

import { useState, useRef, useEffect } from 'react'
import { useLocale } from 'next-intl'
import { CalendarPlus, ChevronDown, Apple, Download } from 'lucide-react'

interface Props {
  eventId: string
  title: string
  eventDate: string
  startTime: string
  endTime?: string | null
  description?: string | null
  location?: string | null
}

export function CalendarExport({ eventId, title, eventDate, startTime, endTime, description, location }: Props) {
  const locale = useLocale()
  const isEn = locale === 'en'
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  function toGCal(dateStr: string, timeStr: string) {
    return dateStr.replace(/-/g, '') + 'T' + timeStr.replace(':', '') + '00'
  }

  const dtStart = toGCal(eventDate, startTime)
  const dtEnd = endTime ? toGCal(eventDate, endTime) : toGCal(eventDate, startTime)

  const googleUrl = new URL('https://calendar.google.com/calendar/render')
  googleUrl.searchParams.set('action', 'TEMPLATE')
  googleUrl.searchParams.set('text', title)
  googleUrl.searchParams.set('dates', `${dtStart}/${dtEnd}`)
  if (description) googleUrl.searchParams.set('details', description)
  if (location) googleUrl.searchParams.set('location', location)

  const icsUrl = `/api/events/${eventId}/ics`

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-accent/15 text-accent border border-accent/30 text-xs font-semibold hover:bg-accent/25 transition-colors"
      >
        <CalendarPlus size={13} />
        {isEn ? 'Add to Calendar' : 'Takvime Ekle'}
        <ChevronDown size={12} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-52 bg-surface border border-[rgba(228,224,216,0.12)] rounded-xl shadow-2xl z-50 overflow-hidden py-1">
          <a
            href={googleUrl.toString()}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => setOpen(false)}
            className="flex items-center gap-3 px-4 py-2.5 text-sm text-text-muted hover:text-text-primary hover:bg-[rgba(228,224,216,0.05)] transition-colors"
          >
            <span className="w-5 h-5 rounded flex items-center justify-center bg-[rgba(228,224,216,0.08)] text-[10px] font-bold flex-shrink-0">G</span>
            Google Calendar
          </a>
          <a
            href={icsUrl}
            onClick={() => setOpen(false)}
            className="flex items-center gap-3 px-4 py-2.5 text-sm text-text-muted hover:text-text-primary hover:bg-[rgba(228,224,216,0.05)] transition-colors"
          >
            <Apple size={16} className="flex-shrink-0" />
            Apple Calendar
          </a>
          <a
            href={icsUrl}
            download
            onClick={() => setOpen(false)}
            className="flex items-center gap-3 px-4 py-2.5 text-sm text-text-muted hover:text-text-primary hover:bg-[rgba(228,224,216,0.05)] transition-colors"
          >
            <Download size={14} className="flex-shrink-0" />
            {isEn ? 'Download .ics' : '.ics İndir'}
          </a>
        </div>
      )}
    </div>
  )
}
