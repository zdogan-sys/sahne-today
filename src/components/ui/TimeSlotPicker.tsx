'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'

const HOURS = Array.from({ length: 14 }, (_, i) => `${String(8 + i).padStart(2, '0')}:00`)

interface Reservation {
  start_time: string
  end_time: string
}

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

function getOccupiedSet(reservations: Reservation[]): Set<string> {
  const occupied = new Set<string>()
  for (const r of reservations) {
    const si = HOURS.findIndex(h => r.start_time.startsWith(h))
    const ei = HOURS.findIndex(h => r.end_time.startsWith(h))
    if (si >= 0 && ei > si) {
      for (let i = si; i < ei; i++) occupied.add(HOURS[i])
    }
  }
  return occupied
}

export function TimeSlotPicker({ venueId, date, roomId, excludeReservationId, selectedStart, duration, onSelectStart, onSelectDuration }: Props) {
  const supabase = createClient()
  const [occupied, setOccupied] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!date) return
    setLoading(true)
    let query = supabase
      .from('studio_reservations')
      .select('start_time, end_time')
      .eq('venue_id', venueId)
      .eq('reservation_date', date)
      .in('status', ['confirmed', 'pending'])

    if (roomId) query = (query as any).eq('room_id', roomId)
    if (excludeReservationId) query = (query as any).neq('id', excludeReservationId)

    query.then(({ data }) => {
      setOccupied(getOccupiedSet(data ?? []))
      setLoading(false)
    })
  }, [date, roomId, excludeReservationId])

  const startIdx = HOURS.indexOf(selectedStart)
  const endIdx = startIdx + duration

  // Seçilen süre tamamen boş mu
  function isRangeAvailable(start: string, dur: number): boolean {
    const si = HOURS.indexOf(start)
    for (let i = si; i < si + dur; i++) {
      if (i >= HOURS.length) return false
      if (occupied.has(HOURS[i])) return false
    }
    return true
  }

  return (
    <div className="space-y-3">
      {/* Başlangıç saati grid */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <label className="label text-xs">Başlangıç Saati</label>
          {loading && <span className="text-text-muted text-[10px]">Yükleniyor...</span>}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {HOURS.map(h => {
            const isOccupied = occupied.has(h)
            const isSelected = h === selectedStart
            const wouldFit = !isOccupied && isRangeAvailable(h, duration)
            return (
              <button
                key={h}
                type="button"
                disabled={isOccupied}
                onClick={() => onSelectStart(h)}
                className={cn(
                  'py-1.5 text-[10px] rounded border transition-colors font-medium',
                  isSelected
                    ? 'bg-accent text-white border-accent'
                    : isOccupied
                    ? 'bg-red-500/15 text-red-400 border-red-500/20 cursor-not-allowed line-through'
                    : wouldFit
                    ? 'bg-success/10 text-success border-success/20 hover:bg-success/20'
                    : 'bg-yellow-400/10 text-yellow-400 border-yellow-400/20 hover:bg-yellow-400/20'
                )}
              >
                {h.slice(0, 5)}
              </button>
            )
          })}
        </div>
        <div className="flex gap-3 mt-1.5 text-[10px] text-text-muted">
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-success/40 inline-block" /> Uygun</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-yellow-400/40 inline-block" /> Süre yetmez</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500/40 inline-block" /> Dolu</span>
        </div>
      </div>

      {/* Süre */}
      <div>
        <label className="label text-xs mb-1.5">Süre</label>
        <div className="flex gap-1">
          {[1, 2, 3, 4, 5, 6, 8].map(h => {
            const available = isRangeAvailable(selectedStart, h)
            return (
              <button
                key={h}
                type="button"
                onClick={() => onSelectDuration(h)}
                className={cn(
                  'flex-1 py-1.5 text-xs rounded border transition-colors',
                  duration === h
                    ? 'bg-accent text-white border-accent'
                    : available
                    ? 'text-text-muted border-[rgba(228,224,216,0.1)] hover:text-text-primary'
                    : 'text-red-400/60 border-red-500/10 line-through cursor-not-allowed'
                )}
                disabled={!available && duration !== h}
              >
                {h}sa
              </button>
            )
          })}
        </div>
      </div>

      {/* Özet */}
      {selectedStart && (
        <div className={cn('text-xs px-3 py-2 rounded-lg border', isRangeAvailable(selectedStart, duration)
          ? 'bg-success/10 text-success border-success/20'
          : 'bg-red-500/10 text-red-400 border-red-500/20'
        )}>
          {selectedStart} – {HOURS[startIdx + duration] ?? '?'} · {duration} saat
          {!isRangeAvailable(selectedStart, duration) && ' · Bu saatte çakışma var'}
        </div>
      )}
    </div>
  )
}
