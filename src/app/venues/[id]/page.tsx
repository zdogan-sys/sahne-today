export const dynamic = 'force-dynamic'

import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { GenreChip } from '@/components/ui/GenreChip'
import { VENUE_TYPE_LABELS, formatDate } from '@/lib/utils'
import { MapPin, Phone, Mail, Users, Zap, ArrowLeft, Music, Images, CalendarDays } from 'lucide-react'
import { isAdminUser } from '@/lib/admin'
import { SocialLinks } from '@/components/ui/SocialLinks'
import { VenueCoverEditor } from '@/components/venues/VenueCoverEditor'
import { VenueLogoEditor } from '@/components/venues/VenueLogoEditor'
import { VenueVideoEditor } from '@/components/venues/VenueVideoEditor'
import { VenueSocialEditor } from '@/components/venues/VenueSocialEditor'
import { VenueProfileEditor } from '@/components/venues/VenueProfileEditor'
import { VenueSlotsList } from '@/components/venues/VenueSlotsList'
import { VenueCalendarSubscribe } from '@/components/venues/VenueCalendarSubscribe'
import { FollowButton } from '@/components/ui/FollowButton'
import { VenueEventTabs } from '@/components/venues/VenueEventTabs'
import { ClaimVenueButton } from '@/components/venues/ClaimVenueButton'
import type { SocialLinksData } from '@/components/ui/SocialLinks'
import type { Venue, Slot, Event } from '@/lib/supabase/types'

interface Props {
  params: Promise<{ id: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params
  const supabase = await createClient()
  const { data } = await supabase.from('venues').select('name, description, city').eq('id', id).single()
  const venue = data as { name: string; description: string | null; city: string } | null
  if (!venue) return { title: 'Mekan Bulunamadı' }
  return {
    title: `${venue.name} — ${venue.city}`,
    description: venue.description ?? undefined,
  }
}

export default async function VenuePage({ params }: Props) {
  const { id } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()

  const artistRes = user ? await supabase.from('artists').select('id').eq('profile_id', user.id).maybeSingle() : null
  const isArtist = !!artistRes?.data

  const today = new Date().toISOString().split('T')[0]

  const isOwnerCheck = async () => {
    const { data: v } = await supabase.from('venues').select('owner_id').eq('id', id).single()
    return v?.owner_id === user?.id || isAdminUser(user)
  }
  const ownerCheck = await isOwnerCheck()

  const [venueRes, slotsRes, upcomingEventsRes, pastEventsRes, followData] = await Promise.all([
    supabase.from('venues').select('*').eq('id', id).single(),
    ownerCheck
      ? supabase.from('slots').select('*').eq('venue_id', id).order('day_of_week')
      : supabase.from('slots').select('*').eq('venue_id', id).eq('status', 'open').order('day_of_week'),
    supabase.from('events')
      .select('id, title, event_date, genre, artists(stage_name)')
      .eq('venue_id', id)
      .eq('status', 'confirmed')
      .gte('event_date', today)
      .order('event_date', { ascending: true })
      .limit(30),
    supabase.from('events')
      .select('id, title, event_date, genre, artists(stage_name)')
      .eq('venue_id', id)
      .eq('status', 'confirmed')
      .lt('event_date', today)
      .order('event_date', { ascending: false })
      .limit(20),
    user
      ? supabase.from('follows').select('id').eq('user_id', user.id).eq('target_type', 'venue').eq('target_id', id).maybeSingle()
      : Promise.resolve({ data: null }),
  ])

  if (!venueRes.data) notFound()
  const venue = venueRes.data as unknown as Venue
  const slots = (slotsRes.data ?? []) as unknown as Slot[]
  const upcomingEvents = (upcomingEventsRes.data ?? []) as any[]
  const pastEvents = (pastEventsRes.data ?? []) as any[]
  const isOwner = user?.id === venue.owner_id || isAdminUser(user)
  const canSeeSlots = isOwner || isArtist
  const isFollowing = !!(followData as any)?.data?.id
  const photos: string[] = (venue as any).photos ?? []
  const videoUrls: string[] = (venue as any).video_urls ?? []
  const socialLinks = ((venue as any).social_links ?? {}) as SocialLinksData

  return (
    <div className="max-w-4xl mx-auto">
      {/* Hero / cover */}
      <div className="relative h-64 md:h-96 bg-surface">
        {isOwner && (
          <VenueProfileEditor
            venueId={venue.id}
            initialData={{
              name: venue.name,
              city: venue.city,
              district: venue.district,
              address: venue.address,
              phone: venue.phone,
              email: venue.email,
              venue_type: venue.venue_type,
              capacity_seated: venue.capacity_seated,
              capacity_standing: venue.capacity_standing,
              stage_area_m2: venue.stage_area_m2,
              equipment: venue.equipment ?? [],
              genres: venue.genres ?? [],
              description: venue.description,
              photo_url: venue.photo_url ?? null,
              logo_url: venue.logo_url ?? null,
              is_hidden: (venue as any).is_hidden ?? false,
            }}
          />
        )}
        <VenueCoverEditor
          venueId={venue.id}
          initialUrl={venue.photo_url ?? ''}
          name={venue.name}
          isOwner={isOwner}
        />
        {/* Overlay content — sits above the editor's camera overlay via z-index */}
        <div className="absolute bottom-4 left-4 right-4 z-20 pointer-events-none">
          <Link
            href="/venues"
            className="pointer-events-auto flex items-center gap-1 text-text-muted text-sm mb-3 hover:text-text-primary w-fit"
          >
            <ArrowLeft size={14} />
            Mekanlar
          </Link>
          <div className="flex items-end gap-3">
            <div className="pointer-events-auto">
              <VenueLogoEditor
                venueId={venue.id}
                initialUrl={venue.logo_url ?? null}
                name={venue.name}
                isOwner={isOwner}
              />
            </div>
            <div>
              <h1 className="font-bebas text-5xl md:text-6xl text-text-primary drop-shadow-lg">{venue.name}</h1>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                <span className="chip bg-[rgba(228,224,216,0.1)] text-text-muted border-[rgba(228,224,216,0.15)]">
                  {VENUE_TYPE_LABELS[venue.venue_type]}
                </span>
                {venue.verified && (
                  <span className="chip bg-success/10 text-success border-success/20">Doğrulandı</span>
                )}
                {!isOwner && (
                  <span className="pointer-events-auto">
                    <FollowButton targetType="venue" targetId={venue.id} initialFollowing={isFollowing} userId={user?.id ?? null} />
                  </span>
                )}
                {!(venue as any).owner_id && user && (venue as any).owner_id !== user?.id && (
                  <span className="pointer-events-auto">
                    <ClaimVenueButton venueId={venue.id} />
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="px-4 py-6 space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-3">
            <div className="flex items-start gap-2 text-sm text-text-muted">
              <MapPin size={16} className="mt-0.5 text-accent flex-shrink-0" />
              <div>
                <p className="text-text-primary">{venue.address}</p>
                <p>{venue.district}, {venue.city}</p>
              </div>
            </div>
            {venue.phone && (
              <div className="flex items-center gap-2 text-sm text-text-muted">
                <Phone size={16} className="text-accent" />
                <a href={`tel:${venue.phone}`} className="hover:text-text-primary">{venue.phone}</a>
              </div>
            )}
            {venue.email && (
              <div className="flex items-center gap-2 text-sm text-text-muted">
                <Mail size={16} className="text-accent" />
                <a href={`mailto:${venue.email}`} className="hover:text-text-primary">{venue.email}</a>
              </div>
            )}
          </div>

          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm text-text-muted">
              <Users size={16} className="text-accent" />
              <span>
                {venue.capacity_standing ? `${venue.capacity_standing} ayakta` : ''}
                {venue.capacity_seated ? ` · ${venue.capacity_seated} oturarak` : ''}
                {venue.stage_area_m2 ? ` · Sahne ${venue.stage_area_m2}m²` : ''}
              </span>
            </div>

            {venue.equipment && venue.equipment.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-2 text-sm text-text-muted">
                  <Zap size={16} className="text-accent" />
                  <span>Ekipman</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {venue.equipment.map((eq) => (
                    <span key={eq} className="chip bg-[rgba(228,224,216,0.06)] text-text-muted border border-[rgba(228,224,216,0.1)]">{eq}</span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {venue.genres && venue.genres.length > 0 && (
          <div>
            <h2 className="font-bebas text-2xl text-text-primary mb-3">MÜZİK TÜRLERİ</h2>
            <div className="flex flex-wrap gap-2">
              {venue.genres.map((g) => <GenreChip key={g} genre={g} />)}
            </div>
          </div>
        )}

        {venue.description && (
          <div>
            <h2 className="font-bebas text-2xl text-text-primary mb-2">HAKKINDA</h2>
            <p className="text-text-muted text-sm leading-relaxed">{venue.description}</p>
          </div>
        )}

        {/* Videos */}
        <VenueVideoEditor venueId={venue.id} initialUrls={videoUrls} readOnly={!isOwner} />

        {/* Social links */}
        {isOwner ? (
          <div>
            <h2 className="font-bebas text-2xl text-text-primary mb-3">SOSYAL MEDYA</h2>
            <VenueSocialEditor venueId={venue.id} initialLinks={socialLinks} />
          </div>
        ) : Object.keys(socialLinks).length > 0 ? (
          <div>
            <h2 className="font-bebas text-2xl text-text-primary mb-3">SOSYAL MEDYA</h2>
            <SocialLinks links={socialLinks} />
          </div>
        ) : null}

        {/* Calendar link */}
        <Link
          href={`/venues/${venue.id}/calendar`}
          className="card p-4 flex items-center justify-between hover:border-accent/30 transition-colors"
        >
          <div className="flex items-center gap-3">
            <CalendarDays size={18} className="text-accent" />
            <div>
              <span className="text-text-primary text-sm font-medium">Sahne Takvimi</span>
              <p className="text-text-muted text-xs mt-0.5">Etkinlikler ve açık sahneler</p>
            </div>
          </div>
          <span className="text-text-muted text-xs">→</span>
        </Link>

        {/* Calendar subscription — public, no token needed */}
        <VenueCalendarSubscribe venueId={venue.id} venueName={venue.name} />

        {/* Photo album link */}
        <Link
          href={`/venues/${venue.id}/photos`}
          className="card p-4 flex items-center justify-between hover:border-accent/30 transition-colors"
        >
          <div className="flex items-center gap-3">
            <Images size={18} className="text-text-muted" />
            <span className="text-text-primary text-sm font-medium">Fotoğraf Albümü</span>
          </div>
          <span className="text-text-muted text-xs">{photos.length} fotoğraf →</span>
        </Link>

        {canSeeSlots && (
          <VenueSlotsList
            slots={slots as any[]}
            venueId={venue.id}
            isOwner={isOwner}
            hasUser={!!user}
          />
        )}

        {(upcomingEvents.length > 0 || pastEvents.length > 0) && (
          <div>
            <h2 className="font-bebas text-2xl text-text-primary mb-3">ETKİNLİKLER</h2>
            <VenueEventTabs upcoming={upcomingEvents} past={pastEvents} />
          </div>
        )}
      </div>
    </div>
  )
}
