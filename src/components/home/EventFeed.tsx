'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import type { Event } from '@/lib/supabase/types'
import { GenreChip } from '@/components/ui/GenreChip'
import { formatTime, formatDate } from '@/lib/utils'
import { MapPin, Clock } from 'lucide-react'

const GENRES = ['Tümü', 'Rock', 'Stand-Up', 'Türkü', 'Caz', 'Solist', 'İstanbul', 'Ankara']

type EventWithRelations = Event & {
  venues: { name: string; district: string; city: string } | null
  artists: { stage_name: string } | null
}

export function EventFeed() {
  const [events, setEvents] = useState<EventWithRelations[]>([])
  const [activeFilter, setActiveFilter] = useState('Tümü')
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    async function fetchEvents() {
      setLoading(true)
      const today = new Date().toISOString().split('T')[0]

      let query = supabase
        .from('events')
        .select('*, venues(name, district, city), artists(stage_name)')
        .eq('status', 'confirmed')
        .gte('event_date', today)
        .order('event_date', { ascending: true })
        .order('start_time', { ascending: true })
        .limit(20)

      if (activeFilter !== 'Tümü' && !['İstanbul', 'Ankara'].includes(activeFilter)) {
        query = query.eq('genre', activeFilter)
      } else if (activeFilter === 'İstanbul') {
        // filter by city via venue
      } else if (activeFilter === 'Ankara') {
        // filter by city via venue
      }

      const { data } = await query
      setEvents((data as EventWithRelations[]) ?? [])
      setLoading(false)
    }
    fetchEvents()
  }, [activeFilter])

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-bebas text-3xl text-text-primary">BUGÜN VE YAKIN GÜNLER</h2>
      </div>

      {/* Genre filter chips */}
      <div className="flex gap-2 overflow-x-auto scrollbar-none pb-3 -mx-4 px-4 mb-5">
        {GENRES.map((g) => (
          <button
            key={g}
            onClick={() => setActiveFilter(g)}
            className={`flex-shrink-0 chip transition-colors ${
              activeFilter === g
                ? 'bg-accent text-white border-accent'
                : 'bg-[rgba(228,224,216,0.06)] text-text-muted border-[rgba(228,224,216,0.1)]'
            } border`}
          >
            {g}
          </button>
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
      {/* Date badge */}
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
