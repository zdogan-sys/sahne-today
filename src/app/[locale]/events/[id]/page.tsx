export const dynamic = 'force-dynamic'

import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { getLocale } from 'next-intl/server'
import { GenreChip } from '@/components/ui/GenreChip'
import { formatTime, formatDate } from '@/lib/utils'
import { MapPin, Clock, Ticket, Music2, Users, ShoppingCart, QrCode, BarChart2, ImageIcon } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { BackButton } from '@/components/ui/BackButton'
import { EventDescription } from '@/components/events/EventDescription'
import { isAdminUser } from '@/lib/admin'
import { EventPosterSection, EventPhotosSection } from '@/components/events/EventMediaSection'
import { EventEditor } from '@/components/events/EventEditor'
import { CalendarExport } from '@/components/events/CalendarExport'
import { RSVPButton } from '@/components/events/RSVPButton'
import { OpenChatButton } from '@/components/messaging/OpenChatButton'

interface Props {
  params: Promise<{ id: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params
  const locale = await getLocale()
  const supabase = await createClient()
  const { data } = await supabase
    .from('events')
    .select('title, description, poster_url, event_date, entry_type, entry_fee, venues(name, city)')
    .eq('id', id)
    .single()
  const event = data as any | null
  if (!event) return { title: 'Etkinlik Bulunamadı' }
  const title = event.title
  const venue = event.venues
  const dateStr = event.event_date ? formatDate(event.event_date, locale) : null
  const locationStr = venue ? `${venue.name}, ${venue.city}` : null
  const description = event.description
    ?? [dateStr, locationStr].filter(Boolean).join(' · ')
    ?? undefined
  const image = event.poster_url ?? 'https://sahne.today/icon-512.png'
  return {
    title,
    description,
    openGraph: { title, description, images: [{ url: image }], type: 'website' },
    twitter: { card: 'summary_large_image', title, description, images: [image] },
  }
}

export default async function EventPage({ params }: Props) {
  const { id } = await params
  const locale = await getLocale()
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()

  const { data } = await supabase
    .from('events')
    .select(`
      *,
      venues(*),
      artists(id, stage_name, bio, genres, instruments, city, profile_id, profiles(avatar_url)),
      bands(id, name, creator_id, bio, photo_url, genres, city,
        band_members(id, role, status, artists(id, stage_name, instruments, profiles(avatar_url))))
    `)
    .eq('id', id)
    .single()


  if (!data) notFound()
  const event = data as any

  const { data: performersData } = await supabase
    .from('event_performers')
    .select('id, role, artists(id, stage_name, genres, profiles(avatar_url)), bands(id, name, photo_url, genres)')
    .eq('event_id', id)
  const venue = event.venues
  const artist = event.artists
  const band = event.bands

  const posterUrl: string | null = event.poster_url ?? null
  const photos: string[] = event.photos ?? []

  const [{ count: goingCount }, { count: interestedCount }] = await Promise.all([
    supabase.from('event_attendance' as any).select('*', { count: 'exact', head: true }).eq('event_id', id).eq('status', 'going'),
    supabase.from('event_attendance' as any).select('*', { count: 'exact', head: true }).eq('event_id', id).eq('status', 'interested'),
  ])
  let userAttendance: 'going' | 'interested' | null = null
  if (user) {
    const { data: att } = await supabase.from('event_attendance' as any).select('status').eq('event_id', id).eq('user_id', user.id).single()
    userAttendance = (att as any)?.status ?? null
  }

  let isParty = isAdminUser(user)
  if (!isParty && user) {
    isParty = venue?.owner_id === user.id || band?.creator_id === user.id || artist?.profile_id === user.id
  }

  const acceptedMembers = band ? (band.band_members ?? []).filter((m: any) => m.status === 'accepted') : []
  const performers: any[] = performersData ?? []

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Event',
    name: event.title,
    startDate: event.event_date && event.start_time
      ? `${event.event_date}T${event.start_time}`
      : event.event_date,
    endDate: event.event_date && event.end_time
      ? `${event.event_date}T${event.end_time}`
      : undefined,
    eventStatus: event.status === 'cancelled'
      ? 'https://schema.org/EventCancelled'
      : 'https://schema.org/EventScheduled',
    eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
    description: event.description ?? undefined,
    image: event.poster_url ?? 'https://sahne.today/icon-512.png',
    url: `https://sahne.today/events/${id}`,
    location: venue ? {
      '@type': 'Place',
      name: venue.name,
      address: {
        '@type': 'PostalAddress',
        streetAddress: [venue.address, venue.district].filter(Boolean).join(', ') || undefined,
        addressLocality: venue.city,
        addressCountry: 'TR',
      },
    } : undefined,
    organizer: {
      '@type': 'Organization',
      name: 'Sahne.Today',
      url: 'https://sahne.today',
    },
    offers: event.ticketing_enabled ? {
      '@type': 'Offer',
      price: event.ticket_price ?? 0,
      priceCurrency: 'TRY',
      availability: (event.ticket_count ?? 0) - (event.tickets_sold ?? 0) > 0
        ? 'https://schema.org/InStock'
        : 'https://schema.org/SoldOut',
      url: `https://sahne.today/events/${id}/tickets`,
    } : event.entry_type === 'free' ? {
      '@type': 'Offer',
      price: 0,
      priceCurrency: 'TRY',
      availability: 'https://schema.org/InStock',
    } : undefined,
    performer: artist ? {
      '@type': 'MusicGroup',
      name: artist.stage_name,
      url: `https://sahne.today/artists/${artist.id}`,
    } : band ? {
      '@type': 'MusicGroup',
      name: band.name,
      url: `https://sahne.today/bands/${band.id}`,
    } : undefined,
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-6">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <BackButton fallbackHref="/events" fallbackLabel="Etkinlikler" />

      {event.status === 'cancelled' && (
        <div className="mb-4 p-3 rounded-lg border border-red-500/30 bg-red-500/10 text-red-400 text-sm text-center">
          Bu etkinlik iptal edilmiştir.
        </div>
      )}

      {event.status === 'confirmed' && (
        <div className="mb-4">
          <RSVPButton
            eventId={id}
            initialStatus={userAttendance}
            goingCount={goingCount ?? 0}
            interestedCount={interestedCount ?? 0}
            hasUser={!!user}
          />
        </div>
      )}

      {(event.status === 'confirmed' || isParty) && event.status !== 'cancelled' && (
        <div className="mb-4 flex items-center gap-2 flex-wrap">
          <CalendarExport
            eventId={id}
            title={event.title}
            eventDate={event.event_date}
            startTime={event.start_time}
            endTime={event.end_time ?? null}
            description={event.description ?? null}
            location={venue ? [venue.name, venue.address, venue.district, venue.city].filter(Boolean).join(', ') : event.venue_name ?? null}
          />
          <Link
            href={`/events/${id}/poster`}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-accent/15 text-accent border border-accent/30 text-xs font-semibold hover:bg-accent/25 transition-colors"
          >
            <ImageIcon size={13} />
            Afiş
          </Link>
          <OpenChatButton type="event" contextId={id} />
        </div>
      )}

      <div className="card overflow-hidden">
        {/* Poster + Info side by side */}
        <div className="flex flex-col sm:flex-row">
          {/* Poster */}
          <div className="sm:w-1/2 flex-shrink-0">
            <EventPosterSection eventId={id} initialPoster={posterUrl} isParty={isParty} />
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0 p-5 space-y-5">
            {/* Title + genre */}
            <div>
              <div className="flex items-start justify-between gap-3 mb-2">
                <h1 className="font-bebas text-4xl text-text-primary leading-tight">{event.title}</h1>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {event.genre && <GenreChip genre={event.genre} />}
                  {isParty && (
                    <EventEditor
                      eventId={id}
                      initial={{
                        title: event.title,
                        event_date: event.event_date,
                        start_time: event.start_time,
                        end_time: event.end_time ?? null,
                        genre: event.genre ?? null,
                        entry_type: event.entry_type,
                        entry_fee: event.entry_fee ?? null,
                        description: event.description ?? null,
                        ticketing_enabled: event.ticketing_enabled ?? false,
                        ticket_price: event.ticket_price ?? null,
                        ticket_count: event.ticket_count ?? null,
                        commission_included: (event as any).commission_included ?? true,
                      }}
                    />
                  )}
                </div>
              </div>
              <div className="flex flex-wrap gap-3 text-sm text-text-muted">
                <span className="flex items-center gap-1.5">
                  <Clock size={13} />
                  {formatDate(event.event_date, locale)} · {formatTime(event.start_time)}{event.end_time ? ` – ${formatTime(event.end_time)}` : ''}
                </span>
                <span className="flex items-center gap-1.5">
                  <Ticket size={13} />
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

            {/* Owner/admin tools */}
            {isParty && event.ticketing_enabled && (
              <div className="flex gap-2 flex-wrap">
                <Link
                  href="/scan"
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-accent/30 text-accent text-xs font-semibold hover:bg-accent/10 transition-colors"
                >
                  <QrCode size={13} />
                  QR Tara
                </Link>
                <Link
                  href="/dashboard/venue/tickets"
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-[rgba(228,224,216,0.15)] text-text-muted text-xs font-semibold hover:text-text-primary hover:border-[rgba(228,224,216,0.3)] transition-colors"
                >
                  <BarChart2 size={13} />
                  Satış Raporu
                </Link>
              </div>
            )}

            {/* Ticketing */}
            {event.ticketing_enabled && (
              <div>
                {(() => {
                  const remaining = (event.ticket_count ?? 0) - (event.tickets_sold ?? 0)
                  const soldOut = remaining <= 0
                  return (
                    <div className="flex items-center gap-3">
                      {soldOut ? (
                        <button disabled className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[rgba(228,224,216,0.06)] text-text-muted text-sm font-semibold cursor-not-allowed">
                          <Ticket size={15} /> Tükendi
                        </button>
                      ) : (
                        <Link href={`/events/${id}/tickets`} className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-accent text-white text-sm font-semibold hover:bg-accent/90 transition-colors">
                          <ShoppingCart size={15} /> Bilet Al
                        </Link>
                      )}
                      {!soldOut && (
                        <span className="text-text-muted text-xs">
                          {remaining} bilet kaldı · {Number(event.ticket_price).toFixed(0)}₺
                        </span>
                      )}
                    </div>
                  )
                })()}
              </div>
            )}

            <EventDescription
              eventId={id}
              initialDescription={event.description ?? null}
              isParty={isParty}
            />

            {/* Artist */}
            {artist ? (
              <div>
                <p className="text-text-muted text-xs font-medium uppercase tracking-wide mb-2">Sanatçı</p>
                <Link href={`/artists/${artist.id}`} className="flex items-center gap-3 p-2.5 rounded-lg bg-[rgba(228,224,216,0.04)] hover:bg-[rgba(228,224,216,0.08)] transition-colors">
                  {artist.profiles?.avatar_url ? (
                    <div className="w-10 h-10 rounded-full overflow-hidden flex-shrink-0 relative">
                      <Image src={artist.profiles.avatar_url} alt={artist.stage_name} fill className="object-cover" sizes="40px" />
                    </div>
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-accent/10 flex items-center justify-center text-accent font-bold text-sm flex-shrink-0">
                      {artist.stage_name?.[0]}
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="font-medium text-text-primary text-sm">{artist.stage_name}</p>
                    {artist.city && <p className="text-text-muted text-xs">{artist.city}</p>}
                    {artist.instruments?.length > 0 && (
                      <p className="text-text-muted text-xs flex items-center gap-1">
                        <Music2 size={10} className="flex-shrink-0" />
                        {artist.instruments.join(', ')}
                      </p>
                    )}
                    <div className="flex gap-1 flex-wrap mt-0.5">
                      {artist.genres?.slice(0, 3).map((g: string) => <GenreChip key={g} genre={g} />)}
                    </div>
                  </div>
                </Link>
                {artist.bio && <p className="text-text-muted text-xs leading-relaxed mt-2">{artist.bio}</p>}
              </div>
            ) : event.artist_name ? (
              <div>
                <p className="text-text-muted text-xs font-medium uppercase tracking-wide mb-2">Sanatçı</p>
                <div className="flex items-center gap-3 p-2.5 rounded-lg bg-[rgba(228,224,216,0.04)]">
                  <div className="w-10 h-10 rounded-full bg-accent/10 flex items-center justify-center text-accent font-bold text-sm flex-shrink-0">
                    {event.artist_name[0]}
                  </div>
                  <p className="font-medium text-text-primary text-sm">{event.artist_name}</p>
                </div>
              </div>
            ) : null}

            {/* Band */}
            {band && (
              <div>
                <p className="text-text-muted text-xs font-medium uppercase tracking-wide mb-2">Grup</p>
                <Link href={`/bands/${band.id}`} className="flex items-center gap-3 p-2.5 rounded-lg bg-[rgba(228,224,216,0.04)] hover:bg-[rgba(228,224,216,0.08)] transition-colors">
                  {band.photo_url ? (
                    <div className="w-10 h-10 rounded-full overflow-hidden flex-shrink-0 relative">
                      <Image src={band.photo_url} alt={band.name} fill className="object-cover" sizes="40px" />
                    </div>
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-accent/10 flex items-center justify-center text-accent font-bold text-sm flex-shrink-0">
                      {band.name?.[0]}
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="font-medium text-text-primary text-sm">{band.name}</p>
                    {band.city && <p className="text-text-muted text-xs">{band.city}</p>}
                    <div className="flex gap-1 flex-wrap mt-0.5">
                      {band.genres?.slice(0, 3).map((g: string) => <GenreChip key={g} genre={g} />)}
                    </div>
                  </div>
                </Link>
                {band.bio && <p className="text-text-muted text-xs leading-relaxed mt-2">{band.bio}</p>}

                {acceptedMembers.length > 0 && (
                  <div className="mt-3">
                    <p className="text-text-muted text-xs font-medium uppercase tracking-wide flex items-center gap-1.5 mb-2">
                      <Users size={10} /> Üyeler
                    </p>
                    <div className="space-y-1.5">
                      {acceptedMembers.map((m: any) => (
                        <Link key={m.id} href={`/artists/${m.artists?.id}`} className="flex items-center gap-2.5 p-2 rounded-lg hover:bg-[rgba(228,224,216,0.04)] transition-colors">
                          {m.artists?.profiles?.avatar_url ? (
                            <div className="w-8 h-8 rounded-full overflow-hidden flex-shrink-0 relative">
                              <Image src={m.artists.profiles.avatar_url} alt={m.artists.stage_name} fill className="object-cover" sizes="32px" />
                            </div>
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-[rgba(228,224,216,0.08)] flex items-center justify-center text-text-muted text-xs font-bold flex-shrink-0">
                              {m.artists?.stage_name?.[0]}
                            </div>
                          )}
                          <div className="min-w-0">
                            <p className="text-text-primary text-sm">{m.artists?.stage_name}</p>
                            {m.artists?.instruments?.[0] && (
                              <p className="text-text-muted text-xs">{m.artists.instruments[0]}</p>
                            )}
                          </div>
                        </Link>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Extra performers */}
            {performers.length > 0 && (
              <div>
                <p className="text-text-muted text-xs font-medium uppercase tracking-wide mb-2">Birlikte Sahne</p>
                <div className="space-y-1.5">
                  {performers.map((p: any) => {
                    const pa = p.artists
                    const pb = p.bands
                    if (pa) return (
                      <Link key={p.id} href={`/artists/${pa.id}`} className="flex items-center gap-3 p-2.5 rounded-lg bg-[rgba(228,224,216,0.04)] hover:bg-[rgba(228,224,216,0.08)] transition-colors">
                        {pa.profiles?.avatar_url ? (
                          <div className="w-9 h-9 rounded-full overflow-hidden flex-shrink-0 relative">
                            <Image src={pa.profiles.avatar_url} alt={pa.stage_name} fill className="object-cover" sizes="36px" />
                          </div>
                        ) : (
                          <div className="w-9 h-9 rounded-full bg-accent/10 flex items-center justify-center text-accent font-bold text-sm flex-shrink-0">
                            {pa.stage_name?.[0]}
                          </div>
                        )}
                        <div className="min-w-0 flex-1">
                          <p className="font-medium text-text-primary text-sm">{pa.stage_name}</p>
                          {p.role && <p className="text-text-muted text-xs">{p.role}</p>}
                        </div>
                      </Link>
                    )
                    if (pb) return (
                      <Link key={p.id} href={`/bands/${pb.id}`} className="flex items-center gap-3 p-2.5 rounded-lg bg-[rgba(228,224,216,0.04)] hover:bg-[rgba(228,224,216,0.08)] transition-colors">
                        {pb.photo_url ? (
                          <div className="w-9 h-9 rounded-full overflow-hidden flex-shrink-0 relative">
                            <Image src={pb.photo_url} alt={pb.name} fill className="object-cover" sizes="36px" />
                          </div>
                        ) : (
                          <div className="w-9 h-9 rounded-full bg-accent/10 flex items-center justify-center text-accent font-bold text-sm flex-shrink-0">
                            {pb.name?.[0]}
                          </div>
                        )}
                        <div className="min-w-0 flex-1">
                          <p className="font-medium text-text-primary text-sm">{pb.name}</p>
                          {p.role && <p className="text-text-muted text-xs">{p.role}</p>}
                        </div>
                      </Link>
                    )
                    return null
                  })}
                </div>
              </div>
            )}

            {/* Venue */}
            {venue ? (
              <div>
                <p className="text-text-muted text-xs font-medium uppercase tracking-wide mb-2">Mekan</p>
                <Link href={`/venues/${venue.id}`} className="flex items-start gap-3 p-2.5 rounded-lg bg-[rgba(228,224,216,0.04)] hover:bg-[rgba(228,224,216,0.08)] transition-colors">
                  <MapPin size={15} className="text-accent mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-medium text-text-primary text-sm">{venue.name}</p>
                    {venue.address && <p className="text-text-muted text-xs mt-0.5">{venue.address}</p>}
                    <p className="text-text-muted text-xs">{venue.district}, {venue.city}</p>
                  </div>
                </Link>
              </div>
            ) : event.venue_name ? (
              <div>
                <p className="text-text-muted text-xs font-medium uppercase tracking-wide mb-2">Mekan</p>
                <div className="flex items-center gap-3 p-2.5 rounded-lg bg-[rgba(228,224,216,0.04)]">
                  <MapPin size={15} className="text-accent flex-shrink-0" />
                  <p className="font-medium text-text-primary text-sm">{event.venue_name}</p>
                </div>
              </div>
            ) : null}
          </div>
        </div>

        {/* Photos — full width below */}
        {(photos.length > 0 || isParty) && (
          <div className="border-t border-[rgba(228,224,216,0.08)] p-5">
            <EventPhotosSection eventId={id} initialPhotos={photos} isParty={isParty} />
          </div>
        )}
      </div>
    </div>
  )
}
