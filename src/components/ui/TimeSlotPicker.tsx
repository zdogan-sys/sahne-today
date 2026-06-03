'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'

const HOURS = Array.from({ length: 14 }, (_, i) => `${String(8 + i).padStart(2, '0')}:00`)

interface Reservation { start_time: string; end_time: string; status: string }
interface AvailRule { start_time: string; end_time: string; type: 'open' | 'closed' }

type HourStatus = 'open_slot' | 'default_open' | 'reserved' | 'pending' | 'closed'

function getStatus(hour: string, reservations: Reservation[], rules: AvailRule[]): HourStatus {
  // Onaylanan rezervasyon var mı?
  for (const r of reservations) {
    const rs = r.start_time.slice(0, 5)
    const re = r.end_time.slice(0, 5)
    if (rs <= hour && re > hour) {
      return r.status === 'confirmed' ? 'reserved' : 'pending'
    }
  }
  // Kapalı kural var mı?
  for (const r of rules) {
    if (r.type === 'closed') {
      const rs = r.start_time.slice(0, 5)
      const re = r.end_time.slice(0, 5)
      if (rs <= hour && re > hour) return 'closed'
    }
  }
  // Açık slot var mı?
  for (const r of rules) {
    if (r.type === 'open') {
      const rs = r.start_time.slice(0, 5)
      const re = r.end_time.slice(0, 5)
      if (rs <= hour && re > hour) return 'open_slot'
    }
  }
  return 'default_open'
}

const STATUS_STYLE: Record<HourStatus, string> = {
  open_slot:    'bg-success/10 text-success border-success/25 hover:bg-success/20',
  default_open: 'bg-blue-500/10 text-blue-400 border-blue-500/20 hover:bg-blue-500/20',
  reserved:     'bg-orange-500/15 text-orange-400 border-orange-500/20 cursor-not-allowed',
  pending:      'bg-yellow-400/15 text-yellow-400 border-yellow-400/20 cursor-not-allowed',
  closed:       'bg-red-500/15 text-red-400 border-red-500/20 cursor-not-allowed line-through',
}

const SELECTED_STYLE = 'bg-accent text-white border-accent'

interface Props {
  venueId: string
  date: string
  roomId?: string
  excludeReservationId?: string
  selectedStart: string
  duration: number
  onSelectStart: (h: string) => void
  onSelectDuration: (d: number) => void
}

export function TimeSlotPicker({ venueId, date, roomId, excludeReservationId, selectedStart, duration, onSelectStart, onSelectDuration }: Props) {
  const supabase = createClient()
  const [statuses, setStatuses] = useState<Record<string, HourStatus>>({})
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!date) return
    setLoading(true)

    const dayOfWeek = new Date(date + 'T00:00:00').getDay()

    let resQuery = supabase
      .from('studio_reservations')
      .select('start_time, end_time, status')
      .eq('venue_id', venueId)
      .eq('reservation_date', date)
      .in('status', ['confirmed', 'pending'])

    if (roomId) resQuery = (resQuery as any).eq('room_id', roomId)
    if (excludeReservationId) resQuery = (resQuery as any).neq('id', excludeReservationId)

    let availQuery = supabase
      .from('studio_availability')
      .select('start_time, end_time, type')
      .eq('venue_id', venueId)
      .eq('day_of_week', dayOfWeek)
      .eq('is_active', true)

    if (roomId) {
      availQuery = (availQuery as any).or(`room_id.eq.${roomId},room_id.is.null`)
    }

    Promise.all([resQuery, availQuery]).then(([resRes, availRes]) => {
      const reservations: Reservation[] = resRes.data ?? []
      const rules: AvailRule[] = availRes.data ?? []
      const map: Record<string, HourStatus> = {}
      for (const h of HOURS) map[h] = getStatus(h, reservations, rules)
      setStatuses(map)
      setLoading(false)
    })
  }, [date, roomId, excludeReservationId])

  function isRangeBookable(start: string, dur: number): boolean {
    const si = HOURS.indexOf(start)
    for (let i = si; i < si + dur; i++) {
      if (i >= HOURS.length) return false
      const s = statuses[HOURS[i]]
      if (s === 'reserved' || s === 'pending' || s === 'closed') return false
    }
    return true
  }

  const startIdx = HOURS.indexOf(selectedStart)

  return (
    <div className="space-y-3">
      {/* Başlangıç saati */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <label className="label text-xs">Başlangıç Saati</label>
          {loading && <span className="text-text-muted text-[10px]">Yükleniyor...</span>}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {HOURS.map(h => {
            const status = statuses[h] ?? 'default_open'
            const isSelected = h === selectedStart
            const disabled = status === 'reserved' || status === 'pending' || status === 'closed'
            return (
              <button key={h} type="button" disabled={disabled}
                onClick={() => onSelectStart(h)}
                className={cn(
                  'py-1.5 text-[10px] rounded border transition-colors font-medium',
                  isSelected ? SELECTED_STYLE : STATUS_STYLE[status]
                )}>
                {h.slice(0, 5)}
              </button>
            )
          })}
        </div>

        {/* Legend */}
        <div className="flex flex-wrap gap-3 mt-2 text-[10px] text-text-muted">
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-success/60 inline-block" /> Açık slot</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-400/60 inline-block" /> Müsait</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-yellow-400/60 inline-block" /> Onay bekliyor</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-orange-400/60 inline-block" /> Onaylandı</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500/60 inline-block" /> Kapalı</span>
        </div>
      </div>

      {/* Süre */}
      <div>
        <label className="label text-xs mb-1.5">Süre</label>
        <div className="flex gap-1">
          {[1, 2, 3, 4, 5, 6, 8].map(h => {
            const bookable = isRangeBookable(selectedStart, h)
            return (
              <button key={h} type="button"
                disabled={!bookable && duration !== h}
                onClick={() => onSelectDuration(h)}
                className={cn(
                  'flex-1 py-1.5 text-xs rounded border transition-colors',
                  duration === h ? 'bg-accent text-white border-accent'
                    : bookable ? 'text-text-muted border-[rgba(228,224,216,0.1)] hover:text-text-primary'
                    : 'text-red-400/50 border-red-500/10 line-through opacity-50'
                )}>
                {h}sa
              </button>
            )
          })}
        </div>
      </div>

      {/* Özet */}
      {selectedStart && HOURS[startIdx + duration] && (
        <div className={cn('text-xs px-3 py-2 rounded-lg border', isRangeBookable(selectedStart, duration)
          ? 'bg-success/10 text-success border-success/20'
          : 'bg-red-500/10 text-red-400 border-red-500/20'
        )}>
          {selectedStart} – {HOURS[startIdx + duration]} · {duration} saat
          {!isRangeBookable(selectedStart, duration) && ' · Bu saatte çakışma var'}
        </div>
      )}
    </div>
  )
}
