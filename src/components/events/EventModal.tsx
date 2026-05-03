'use client'

import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { X, Clock, MapPin, Ticket, Music2, ArrowUpRight } from 'lucide-react'
import { GenreChip } from '@/components/ui/GenreChip'
import { formatTime, formatDate } from '@/lib/utils'

export function EventModal({ event }: { event: any }) {
  const router = useRouter()

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') router.back() }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [router])

  const artist = event.artists
  const band = event.bands
  const venue = event.venues

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => router.back()} />
      <div className="relative w-full sm:max-w-lg bg-surface rounded-t-2xl sm:rounded-2xl border border-[rgba(228,224,216,0.15)] shadow-2xl overflow-hidden max-h-[92vh] flex flex-col z-10">

        {/* Header */}
        <div className="flex items-start justify-between px-5 py-4 border-b border-[rgba(228,224,216,0.08)] flex-shrink-0">
          <h2 className="font-bebas text-2xl text-text-primary leading-tight pr-4">{event.title}</h2>
          <div className="flex items-center gap-1 flex-shrink-0 mt-0.5">
            <Link
              href={`/events/${event.id}`}
              className="p-1.5 text-text-muted hover:text-accent transition-colors"
              title="Tam sayfada aç"
            >
              <ArrowUpRight size={16} />
            </Link>
            <button
              onClick={() => router.back()}
              className="p-1.5 text-text-muted hover:text-text-primary transition-colors"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        <div className="overflow-y-auto flex-1 p-5 space-y-4">
          {/* Poster */}
          {event.poster_url && (
            <div className="relative w-full aspect-video rounded-xl overflow-hidden">
              <Image src={event.poster_url} alt={event.title} fill className="object-cover" sizes="512px" />
            </div>
          )}

          {/* Date / time / entry */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm text-text-muted">
              <Clock size={13} />
              <span>
                {formatDate(event.event_date)} · {formatTime(event.start_time)}
                {event.end_time ? ` – ${formatTime(event.end_time)}` : ''}
              </span>
            </div>
            <div className="flex items-center gap-2 text-sm text-text-muted">
              <Ticket size={13} />
              {event.entry_type === 'free'
                ? <span className="text-success font-medium">Ücretsiz</span>
                : event.entry_fee
                  ? <span>{event.entry_fee}₺</span>
                  : <span>Kapıda Öde</span>}
            </div>
            {event.genre && <GenreChip genre={event.genre} />}
          </div>

          {/* Artist */}
          {artist && (
            <Link href={`/artists/${artist.id}`} className="flex items-center gap-3 p-3 rounded-xl bg-[rgba(228,224,216,0.04)] hover:bg-[rgba(228,224,216,0.08)] transition-colors">
              {artist.profiles?.avatar_url ? (
                <div className="w-9 h-9 rounded-full overflow-hidden flex-shrink-0 relative">
                  <Image src={artist.profiles.avatar_url} alt={artist.stage_name} fill className="object-cover" sizes="36px" />
                </div>
              ) : (
                <div className="w-9 h-9 rounded-full bg-accent/10 flex items-center justify-center text-accent font-bold text-sm flex-shrink-0">
                  {artist.stage_name?.[0]}
                </div>
              )}
              <div className="min-w-0">
                <p className="text-text-primary text-sm font-medium">{artist.stage_name}</p>
                {artist.instruments?.length > 0 && (
                  <p className="text-text-muted text-xs flex items-center gap-1 mt-0.5">
                    <Music2 size={10} className="flex-shrink-0" />
                    {artist.instruments.join(', ')}
                  </p>
                )}
              </div>
            </Link>
          )}

          {/* Band */}
          {band && (
            <Link href={`/bands/${band.id}`} className="flex items-center gap-3 p-3 rounded-xl bg-[rgba(228,224,216,0.04)] hover:bg-[rgba(228,224,216,0.08)] transition-colors">
              {band.photo_url ? (
                <div className="w-9 h-9 rounded-full overflow-hidden flex-shrink-0 relative">
                  <Image src={band.photo_url} alt={band.name} fill className="object-cover" sizes="36px" />
                </div>
              ) : (
                <div className="w-9 h-9 rounded-full bg-accent/10 flex items-center justify-center text-accent font-bold text-sm flex-shrink-0">
                  {band.name?.[0]}
                </div>
              )}
              <div className="min-w-0">
                <p className="text-text-primary text-sm font-medium">{band.name}</p>
                {band.genres?.length > 0 && (
                  <div className="flex gap-1 flex-wrap mt-0.5">
                    {band.genres.slice(0, 2).map((g: string) => <GenreChip key={g} genre={g} />)}
                  </div>
                )}
              </div>
            </Link>
          )}

          {/* Free-text artist name */}
          {!artist && event.artist_name && (
            <div className="flex items-center gap-3 p-3 rounded-xl bg-[rgba(228,224,216,0.04)]">
              <div className="w-9 h-9 rounded-full bg-accent/10 flex items-center justify-center text-accent font-bold text-sm flex-shrink-0">
                {event.artist_name[0]}
              </div>
              <p className="text-text-primary text-sm font-medium">{event.artist_name}</p>
            </div>
          )}

          {/* Venue */}
          {venue ? (
            <Link href={`/venues/${venue.id}`} className="flex items-center gap-3 p-3 rounded-xl bg-[rgba(228,224,216,0.04)] hover:bg-[rgba(228,224,216,0.08)] transition-colors">
              <MapPin size={15} className="text-accent flex-shrink-0" />
              <div>
                <p className="text-text-primary text-sm font-medium">{venue.name}</p>
                <p className="text-text-muted text-xs">{venue.district}, {venue.city}</p>
              </div>
            </Link>
          ) : event.venue_name ? (
            <div className="flex items-center gap-3 p-3 rounded-xl bg-[rgba(228,224,216,0.04)]">
              <MapPin size={15} className="text-accent flex-shrink-0" />
              <p className="text-text-primary text-sm font-medium">{event.venue_name}</p>
            </div>
          ) : null}

          {/* Description */}
          {event.description && (
            <p className="text-text-muted text-sm leading-relaxed">{event.description}</p>
          )}
        </div>
      </div>
    </div>
  )
}
