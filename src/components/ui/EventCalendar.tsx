'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { formatTime, cn } from '@/lib/utils'

export interface CalendarEventItem {
  id: string
  event_date: string
  title: string
  start_time: string
  end_time?: string | null
  subtitle?: string | null
  status?: 'confirmed' | 'pending' | 'offered' | 'cancelled' | 'withdrawn' | 'expired' | 'rejected'
}

interface Props {
  events: CalendarEventItem[]
  /** When provided, every day becomes clickable and the internal panel is suppressed. */
  onDayClick?: (date: Date, dayEvents: CalendarEventItem[]) => void
  selectedDate?: Date | null
}

const MONTH_NAMES = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık']
const DAY_HEADERS = ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz']

function jsToGrid(d: number) { return d === 0 ? 6 : d - 1 }
function toISO(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

export function EventCalendar({ events, onDayClick, selectedDate: externalSelected }: Props) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const router = useRouter()
  const [year, setYear] = useState(today.getFullYear())
  const [month, setMonth] = useState(today.getMonth())
  const [internalSelected, setInternalSelected] = useState<Date | null>(null)
  const [internalDayEvents, setInternalDayEvents] = useState<CalendarEventItem[]>([])

  const selectedDate = externalSelected !== undefined ? externalSelected : internalSelected

  const byDate = new Map<string, CalendarEventItem[]>()
  for (const ev of events) {
    if (['cancelled', 'withdrawn', 'expired', 'rejected'].includes(ev.status ?? '')) continue
    const arr = byDate.get(ev.event_date) ?? []
    arr.push(ev)
    byDate.set(ev.event_date, arr)
  }

  function prevMonth() {
    if (month === 0) { setYear(y => y - 1); setMonth(11) } else setMonth(m => m - 1)
    setInternalSelected(null)
  }
  function nextMonth() {
    if (month === 11) { setYear(y => y + 1); setMonth(0) } else setMonth(m => m + 1)
    setInternalSelected(null)
  }

  function handleDayClick(date: Date) {
    const dayEvents = byDate.get(toISO(date)) ?? []
    if (onDayClick) {
      onDayClick(date, dayEvents)
    } else {
      if (dayEvents.length === 0) return
      if (dayEvents.length === 1) {
        router.push(`/events/${dayEvents[0].id}`)
        return
      }
      setInternalSelected(date)
      setInternalDayEvents(dayEvents)
    }
  }

  const firstDay = new Date(year, month, 1)
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const cells: (Date | null)[] = [
    ...Array(jsToGrid(firstDay.getDay())).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => new Date(year, month, i + 1)),
  ]

  const interactive = !!onDayClick

  return (
    <div>
      <div className="max-w-[500px]">
      {/* Navigation */}
      <div className="flex items-center justify-between mb-4">
        <button onClick={prevMonth} className="w-8 h-8 rounded-lg bg-surface flex items-center justify-center text-text-muted hover:text-text-primary transition-colors">
          <ChevronLeft size={16} />
        </button>
        <span className="font-bebas text-xl text-text-primary tracking-wide">
          {MONTH_NAMES[month]} {year}
        </span>
        <button onClick={nextMonth} className="w-8 h-8 rounded-lg bg-surface flex items-center justify-center text-text-muted hover:text-text-primary transition-colors">
          <ChevronRight size={16} />
        </button>
      </div>

      {/* Day headers */}
      <div className="grid grid-cols-7 mb-1">
        {DAY_HEADERS.map(d => (
          <div key={d} className="text-center text-xs text-white/50 py-1 font-medium">{d}</div>
        ))}
      </div>

      {/* Grid */}
      <div className="grid grid-cols-7 gap-0.5">
        {cells.map((date, i) => {
          if (!date) return <div key={`e-${i}`} className="h-16" />
          const dateStr = toISO(date)
          const dayEvents = byDate.get(dateStr) ?? []
          const hasEvent = dayEvents.length > 0
          const hasPending = dayEvents.some(e => e.status === 'pending' || e.status === 'offered')
          const hasConfirmed = dayEvents.some(e => e.status === 'confirmed')
          const isToday = date.getTime() === today.getTime()
          const isSelected = selectedDate?.getTime() === date.getTime()

          const labelColor = hasPending ? 'text-yellow-400' : 'text-success'
          const eventLabel = dayEvents.length === 1
            ? dayEvents[0].title
            : dayEvents.length > 1
            ? `${dayEvents.length} etkinlik`
            : null

          const firstEvent = dayEvents[0]
          const venueLabel = firstEvent?.subtitle ?? null

          return (
            <button
              key={dateStr}
              onClick={() => handleDayClick(date)}
              className={cn(
                'relative h-16 rounded-lg flex flex-col items-center justify-center gap-0.5 px-0.5 text-sm transition-colors overflow-hidden',
                isSelected
                  ? hasPending ? 'bg-yellow-400/30 text-white ring-1 ring-yellow-400/50' : 'bg-success/30 text-white ring-1 ring-success/50'
                  : hasEvent
                  ? hasPending
                    ? 'bg-yellow-400/15 text-white hover:bg-yellow-400/25 cursor-pointer'
                    : 'bg-success/20 text-white hover:bg-success/30 cursor-pointer'
                  : interactive
                  ? 'text-white/55 hover:bg-white/5 cursor-pointer'
                  : 'text-white/55 cursor-default',
                isToday && !isSelected ? 'ring-1 ring-accent/50' : '',
              )}
            >
              <span className="font-medium leading-none text-sm">{date.getDate()}</span>
              {eventLabel && (
                <span className={cn('text-[8px] leading-tight w-full text-center truncate', labelColor)}>
                  {eventLabel}
                </span>
              )}
              {venueLabel && !isSelected && (
                <span className="text-[7px] leading-tight w-full text-center truncate text-white/50">
                  {venueLabel}
                </span>
              )}
            </button>
          )
        })}
      </div>
      </div>{/* end max-w-[500px] */}

      {/* Internal detail panel (only when onDayClick is NOT provided) */}
      {!onDayClick && internalSelected && internalDayEvents.length > 0 && (
        <div className="mt-4 rounded-xl border border-success/20 bg-success/5 overflow-hidden">
          <div className="px-4 py-3 border-b border-success/10">
            <p className="font-semibold text-text-primary text-sm">
              {internalSelected.toLocaleDateString('tr-TR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
            </p>
          </div>
          <div className="px-4 py-3 space-y-3">
            {internalDayEvents.map(ev => (
              <div key={ev.id} className="flex items-start gap-3">
                <span className={`w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0 ${ev.status === 'pending' ? 'bg-yellow-400' : 'bg-success'}`} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-text-primary text-sm font-medium">{ev.title}</p>
                    {ev.status === 'pending' && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-yellow-400/15 text-yellow-400 border border-yellow-400/20">
                        Onay Bekliyor
                      </span>
                    )}
                  </div>
                  <p className="text-text-muted text-xs mt-0.5">
                    {formatTime(ev.start_time)}{ev.end_time ? ` – ${formatTime(ev.end_time)}` : ''}
                    {ev.subtitle ? ` · ${ev.subtitle}` : ''}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
