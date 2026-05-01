export const dynamic = 'force-dynamic'

import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { GenreChip } from '@/components/ui/GenreChip'
import { formatTime, formatDate } from '@/lib/utils'
import { MapPin, Clock, Ticket, ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { isAdminUser } from '@/lib/admin'
import { EventMediaSection } from '@/components/events/EventMediaSection'

interface Props {
  params: Promise<{ id: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params
  const supabase = await createClient()
  const { data } = await supabase.from('events').select('title, description').eq('id', id).single()
  const event = data as { title: string; description: string | null } | null
  if (!event) return { title: 'Etkinlik Bulunamadı' }
  return {
    title: event.title,
    description: event.description ?? undefined,
  }
}

export default async function EventPage({ params }: Props) {
  const { id } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()

  const { data } = await supabase
    .from('events')
    .select('*, venues(*), artists(*), bands(id, name, creator_id)')
    .eq('id', id)
    .single()

  if (!data) notFound()
  const event = data as any
  const venue = event.venues
  const artist = event.artists
  const band = event.bands

  const posterUrl: string | null = event.poster_url ?? null
  const photos: string[] = event.photos ?? []

  // Check if current user is a party to this event
  let isParty = isAdminUser(user)
  if (!isParty && user) {
    const isVenueOwner = venue?.owner_id === user.id
    const isBandCreator = band?.creator_id === user.id
    const isArtistOwner = artist?.profile_id === user.id
    isParty = isVenueOwner || isBandCreator || isArtistOwner
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <Link href="/events" className="flex items-center gap-2 text-text-muted text-sm mb-6 hover:text-text-primary transition-colors">
        <ArrowLeft size={16} />
        Etkinlikler
      </Link>

      <div className="card overflow-hidden">
        <div className="bg-gradient-to-b from-accent/10 to-transparent p-6 border-b border-[rgba(228,224,216,0.08)]">
          <div className="flex items-start justify-between gap-3 mb-3">
            <h1 className="font-bebas text-4xl text-text-primary leading-tight">{event.title}</h1>
            {event.genre && <GenreChip genre={event.genre} />}
          </div>
          <div className="flex flex-wrap gap-4 text-sm text-text-muted">
            <span className="flex items-center gap-1.5">
              <Clock size={14} />
              {formatDate(event.event_date)} · {formatTime(event.start_time)}{event.end_time ? ` – ${formatTime(event.end_time)}` : ''}
            </span>
            <span className="flex items-center gap-1.5">
              <Ticket size={14} />
              {event.entry_type === 'free' ? (
                <span className="text-success font-medium">Ücretsiz</span>
              ) : event.entry_fee ? (
                <span>{event.entry_fee}₺</span>
              ) : (
                <span>Kapıda Öde</span>
              )}
            </span>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {event.description && (
            <div>
              <h3 className="label">Açıklama</h3>
              <p className="text-text-primary text-sm leading-relaxed">{event.description}</p>
            </div>
          )}

          {artist && (
            <div>
              <h3 className="label">Sanatçı</h3>
              <Link href={`/artists/${artist.id}`} className="flex items-center gap-3 p-3 rounded-lg bg-[rgba(228,224,216,0.04)] hover:bg-[rgba(228,224,216,0.08)] transition-colors">
                <div className="w-10 h-10 rounded-full bg-accent/10 flex items-center justify-center text-accent font-bold text-sm">
                  {artist.stage_name?.[0]}
                </div>
                <div>
                  <p className="font-medium text-text-primary text-sm">{artist.stage_name}</p>
                  <div className="flex gap-1 flex-wrap mt-0.5">
                    {artist.genres?.slice(0, 2).map((g: string) => (
                      <GenreChip key={g} genre={g} />
                    ))}
                  </div>
                </div>
              </Link>
            </div>
          )}

          {band && (
            <div>
              <h3 className="label">Grup</h3>
              <Link href={`/bands/${band.id}`} className="flex items-center gap-3 p-3 rounded-lg bg-[rgba(228,224,216,0.04)] hover:bg-[rgba(228,224,216,0.08)] transition-colors">
                <div className="w-10 h-10 rounded-full bg-accent/10 flex items-center justify-center text-accent font-bold text-sm">
                  {band.name?.[0]}
                </div>
                <p className="font-medium text-text-primary text-sm">{band.name}</p>
              </Link>
            </div>
          )}

          {venue && (
            <div>
              <h3 className="label">Mekan</h3>
              <Link href={`/venues/${venue.id}`} className="flex items-start gap-3 p-3 rounded-lg bg-[rgba(228,224,216,0.04)] hover:bg-[rgba(228,224,216,0.08)] transition-colors">
                <MapPin size={16} className="text-accent mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-medium text-text-primary text-sm">{venue.name}</p>
                  <p className="text-text-muted text-xs mt-0.5">{venue.address}</p>
                  <p className="text-text-muted text-xs">{venue.district}, {venue.city}</p>
                </div>
              </Link>
            </div>
          )}

          <EventMediaSection
            eventId={id}
            initialPoster={posterUrl}
            initialPhotos={photos}
            isParty={isParty}
          />
        </div>
      </div>

      {event.status === 'cancelled' && (
        <div className="mt-4 p-3 rounded-lg border border-red-500/30 bg-red-500/10 text-red-400 text-sm text-center">
          Bu etkinlik iptal edilmiştir.
        </div>
      )}
    </div>
  )
}
