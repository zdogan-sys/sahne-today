'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import type { Event } from '@/lib/supabase/types'
import { GenreChip } from '@/components/ui/GenreChip'
import { formatTime } from '@/lib/utils'
import { MapPin, Clock } from 'lucide-react'
import { MUSIC_GENRES, STAGE_GENRES } from '@/lib/constants'

const TIME_FILTERS = ['Bugün', 'Bu Hafta', 'Bu Ay'] as const
type TimeFilter = typeof TIME_FILTERS[number]

type EventWithRelations = Event & {
  venues: { name: string; district: string; city: string } | null
  artists: { stage_name: string } | null
}

function getDateRange(period: TimeFilter): { from: string; to: string } {
  const now = new Date()
  // Gece yarısı - 04:00 arası önceki günün devamı sayılır
  const effective = now.getHours() < 4 ? new Date(now.getTime() - 86400000) : now
  const from = effective.toISOString().split('T')[0]

  if (period === 'Bugün') {
    return { from, to: from }
  } else if (period === 'Bu Hafta') {
    const to = new Date(now.getTime() + 7 * 86400000).toISOString().split('T')[0]
    return { from, to }
  } else {
    const to = new Date(now.getTime() + 29 * 86400000).toISOString().split('T')[0]
    return { from, to }
  }
}

export function EventFeed() {
  const [events, setEvents] = useState<EventWithRelations[]>([])
  const [timePeriod, setTimePeriod] = useState<TimeFilter>('Bu Hafta')
  const [activeGenre, setActiveGenre] = useState<string>('Tümü')
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    async function fetchEvents() {
      setLoading(true)
      const { from, to } = getDateRange(timePeriod)

      let query = supabase
        .from('events')
        .select('*, venues(name, district, city), artists(stage_name)')
        .eq('status', 'confirmed')
        .gte('event_date', from)
        .lte('event_date', to)
        .order('event_date', { ascending: true })
        .order('start_time', { ascending: true })
        .limit(30)

      if (activeGenre !== 'Tümü') {
        query = query.eq('genre', activeGenre)
      }

      const { data } = await query
      setEvents((data as EventWithRelations[]) ?? [])
      setLoading(false)
    }
    fetchEvents()
  }, [timePeriod, activeGenre])

  return (
    <div>
      {/* Time period tabs */}
      <div className="flex gap-1 mb-5 bg-surface rounded-xl p-1 border border-[rgba(228,224,216,0.08)]">
        {TIME_FILTERS.map((period) => (
          <button
            key={period}
            onClick={() => setTimePeriod(period)}
            className={`flex-1 py-2 text-sm font-medium rounded-lg transition-colors ${
              timePeriod === period
                ? 'bg-accent text-white'
                : 'text-text-muted hover:text-text-primary'
            }`}
          >
            {period}
          </button>
        ))}
      </div>

      {/* Genre filter chips */}
      <div className="space-y-3 mb-5">
        {[
          { label: null, genres: ['Tümü'] },
          { label: 'Müzik', genres: MUSIC_GENRES },
          { label: 'Sahne', genres: STAGE_GENRES },
        ].map(({ label, genres }) => (
          <div key={label ?? 'all'}>
            {label && <p className="text-[10px] text-text-muted uppercase tracking-widest mb-1.5">{label}</p>}
            <div className="flex flex-wrap gap-1.5">
              {genres.map((g) => (
                <button
                  key={g}
                  onClick={() => setActiveGenre(g)}
                  className={`flex-shrink-0 chip transition-colors border ${
                    activeGenre === g
                      ? 'bg-accent text-white border-accent'
                      : 'bg-[rgba(228,224,216,0.06)] text-text-muted border-[rgba(228,224,216,0.1)]'
                  }`}
                >
                  {g}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="card p-4 animate-pulse">
              <div className="flex gap-4">
                <div className="w-14 h-14 bg-[rgba(228,224,216,0.06)] rounded-lg" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-[rgba(228,224,216,0.06)] rounded w-2/3" />
                  <div className="h-3 bg-[rgba(228,224,216,0.06)] rounded w-1/2" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : events.length === 0 ? (
        <div className="text-center py-16 text-text-muted">
          <p className="text-sm">Bu filtre için etkinlik bulunamadı.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {events.map((event) => (
            <EventCard key={event.id} event={event} />
          ))}
        </div>
      )}
    </div>
  )
}

function EventCard({ event }: { event: EventWithRelations }) {
  const date = new Date(event.event_date)
  const dayNum = date.getDate()
  const month = date.toLocaleDateString('tr-TR', { month: 'short' })

  return (
    <Link href={`/events/${event.id}`} className="card p-4 flex gap-4 hover:border-accent/30 transition-colors block">
      <div className="flex-shrink-0 w-14 h-14 bg-[rgba(212,83,126,0.08)] rounded-lg flex flex-col items-center justify-center border border-accent/20">
        <span className="font-bebas text-xl text-accent leading-none">{dayNum}</span>
        <span className="text-[10px] text-accent/70 uppercase">{month}</span>
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-semibold text-text-primary text-sm leading-tight truncate">
            {event.title}
          </h3>
          {event.genre && <GenreChip genre={event.genre} />}
        </div>

        <div className="mt-1 flex items-center gap-1 text-text-muted text-xs">
          <MapPin size={11} />
          <span className="truncate">
            {event.venues?.name} · {event.venues?.district}
          </span>
        </div>

        <div className="mt-1 flex items-center gap-3 text-text-muted text-xs">
          <span className="flex items-center gap-1">
            <Clock size={11} />
            {formatTime(event.start_time)}
          </span>
          {event.entry_type === 'free' ? (
            <span className="text-success">Ücretsiz</span>
          ) : event.entry_fee ? (
            <span>{event.entry_fee}₺</span>
          ) : (
            <span>Kapıda</span>
          )}
        </div>
      </div>
    </Link>
  )
}
