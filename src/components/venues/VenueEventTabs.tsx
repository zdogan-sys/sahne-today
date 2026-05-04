'use client'

import { useState } from 'react'
import Link from 'next/link'
import { GenreChip } from '@/components/ui/GenreChip'
import { formatDate } from '@/lib/utils'

interface EventItem {
  id: string
  title: string
  event_date: string
  genre: string | null
  artists?: { stage_name: string } | null
}

interface Props {
  upcoming: EventItem[]
  past: EventItem[]
}

export function VenueEventTabs({ upcoming, past }: Props) {
  const [tab, setTab] = useState<'upcoming' | 'past'>('upcoming')

  if (upcoming.length === 0 && past.length === 0) return null

  const events = tab === 'upcoming' ? upcoming : past

  return (
    <div>
      <div className="flex gap-1 mb-4 bg-surface rounded-xl p-1 border border-[rgba(228,224,216,0.08)]">
        <button
          onClick={() => setTab('upcoming')}
          className={`flex-1 py-2 text-sm font-medium rounded-lg transition-colors ${
            tab === 'upcoming' ? 'bg-accent text-white' : 'text-text-muted hover:text-text-primary'
          }`}
        >
          Yaklaşan
          {upcoming.length > 0 && (
            <span className={`ml-1.5 text-xs ${tab === 'upcoming' ? 'opacity-70' : 'text-text-muted'}`}>
              ({upcoming.length})
            </span>
          )}
        </button>
        <button
          onClick={() => setTab('past')}
          className={`flex-1 py-2 text-sm font-medium rounded-lg transition-colors ${
            tab === 'past' ? 'bg-accent text-white' : 'text-text-muted hover:text-text-primary'
          }`}
        >
          Geçmiş
          {past.length > 0 && (
            <span className={`ml-1.5 text-xs ${tab === 'past' ? 'opacity-70' : 'text-text-muted'}`}>
              ({past.length})
            </span>
          )}
        </button>
      </div>

      {events.length === 0 ? (
        <p className="text-center py-8 text-text-muted text-sm">
          {tab === 'upcoming' ? 'Yaklaşan etkinlik yok.' : 'Geçmiş etkinlik yok.'}
        </p>
      ) : (
        <div className="space-y-2">
          {events.map((event) => (
            <Link
              key={event.id}
              href={`/events/${event.id}`}
              className="card p-3 flex items-center justify-between hover:border-accent/30 transition-colors block"
            >
              <div>
                <p className="text-text-primary text-sm font-medium">{event.title}</p>
                <p className="text-text-muted text-xs mt-0.5">
                  {formatDate(event.event_date)}
                  {event.artists?.stage_name ? ` · ${event.artists.stage_name}` : ''}
                </p>
              </div>
              {event.genre && <GenreChip genre={event.genre} />}
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
