import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { getTranslations } from 'next-intl/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { GenreChip } from '@/components/ui/GenreChip'
import { VideoEmbed } from '@/components/artists/VideoEmbed'
import { formatDate } from '@/lib/utils'
import { MapPin, ArrowLeft, ChevronDown, Mail, Building2 } from 'lucide-react'
import type { Artist, Profile, Event, Venue } from '@/lib/supabase/types'
import { SocialLinks } from '@/components/ui/SocialLinks'
import { VENUE_TYPE_LABELS, translateInstrument } from '@/lib/utils'
import { isAdminUser } from '@/lib/admin'
import { LfbToggle } from '@/components/artists/LfbToggle'
import { ArtistCalendarSection } from '@/components/artists/ArtistCalendarSection'
import { ArtistProfileEditor } from '@/components/artists/ArtistProfileEditor'
import { ArtistAvatarEditor } from '@/components/artists/ArtistAvatarEditor'
import { ClaimProfileButton } from '@/components/artists/ClaimProfileButton'
import { FollowButton } from '@/components/ui/FollowButton'
import { FoundingMemberBadge } from '@/components/ui/FoundingMemberBadge'
import type { SocialLinksData } from '@/components/ui/SocialLinks'
type ArtistFull = Artist & { profiles: Profile | null; social_links?: SocialLinksData }
type EventFull = Event & { venues: Pick<Venue, 'name' | 'city'> | null; bands: { name: string } | null }

interface Props {
  params: Promise<{ id: string; locale: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params
  const supabase = await createClient()
  const { data } = await supabase.from('artists').select('stage_name, bio, city, profiles(avatar_url)').eq('id', id).single()
  const artist = data as any | null
  if (!artist) return { title: 'Sanatçı Bulunamadı' }
  const title = `${artist.stage_name}${artist.city ? ` — ${artist.city}` : ''}`
  const description = artist.bio ?? undefined
  const image = artist.profiles?.avatar_url ?? 'https://sahne.today/icon-512.png'
  return {
    title,
    description,
    openGraph: { title, description, images: [{ url: image }] },
    twitter: { card: 'summary_large_image', title, description, images: [image] },
  }
}

export default async function ArtistPage({ params }: Props) {
  const { id, locale } = await params
  const isEn = locale === 'en'
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()

  const [artistRes, membershipsRes] = await Promise.all([
    supabase.from('artists').select('*, profiles(*)').eq('id', id).single(),
    supabase.from('band_members').select('band_id, role, bands(id, name, photo_url, genres, city)').eq('artist_id', id).eq('status', 'accepted'),
  ])

  if (!artistRes.data) notFound()
  const artistProfileId = (artistRes.data as any).profile_id
  const venueRes = await supabase
    .from('venues')
    .select('id, name, city, district, venue_type, photo_url')
    .eq('owner_id', artistProfileId)
    .maybeSingle()

  const bandIds = (membershipsRes.data ?? []).map((m: any) => m.band_id as string)
  const bands = (membershipsRes.data ?? []).map((m: any) => ({ ...(m.bands as any), role: m.role })).filter(Boolean)

  const isOwnerEarly = user?.id === artistProfileId || isAdminUser(user)
  const eventsDb = isOwnerEarly ? createAdminClient() : supabase
  const statusFilter = isOwnerEarly ? ['confirmed', 'pending', 'offered'] : ['confirmed', 'pending']

  const eventsRes = await (bandIds.length > 0
    ? eventsDb.from('events')
        .select('id, event_date, title, start_time, end_time, status, venue_name, venues(name, city), bands(name)')
        .or(`artist_id.eq.${id},band_id.in.(${bandIds.join(',')})`)
        .in('status', statusFilter)
        .order('event_date', { ascending: true })
    : eventsDb.from('events')
        .select('id, event_date, title, start_time, end_time, status, venue_name, venues(name, city), bands(name)')
        .eq('artist_id', id)
        .in('status', statusFilter)
        .order('event_date', { ascending: true })
  )

  const artist = artistRes.data as unknown as ArtistFull
  const events = (eventsRes.data ?? []) as unknown as EventFull[]
  const profile = artist.profiles
  const isOwner = user?.id === artist.profile_id || isAdminUser(user)
  const ownedVenue = venueRes.data as any

  const { data: followData } = user
    ? await supabase.from('follows').select('id').eq('user_id', user.id).eq('target_type', 'artist').eq('target_id', id).maybeSingle()
    : { data: null }
  const isFollowing = !!followData

  const initials = artist.stage_name.split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase()
  const avatarUrl = artist.avatar_url ?? profile?.avatar_url ?? null

  const socialLinks = (artist as any).social_links ?? {}
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'MusicGroup',
    name: artist.stage_name,
    description: (artist as any).bio ?? undefined,
    url: `https://sahne.today/artists/${id}`,
    image: avatarUrl ?? 'https://sahne.today/icon-512.png',
    genre: (artist as any).genres ?? undefined,
    foundingLocation: artist.city ? { '@type': 'Place', name: artist.city } : undefined,
    sameAs: [
      socialLinks.instagram ? `https://instagram.com/${socialLinks.instagram.replace('@', '')}` : null,
      socialLinks.spotify ?? null,
      socialLinks.youtube ?? null,
    ].filter(Boolean),
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <Link href="/artists" className="flex items-center gap-2 text-text-muted text-sm mb-6 hover:text-text-primary w-fit">
        <ArrowLeft size={16} />
        {isEn ? 'Artists' : 'Sanatçılar'}
      </Link>

      <div className="flex items-start gap-5 mb-6">
        {isOwner ? (
          <ArtistAvatarEditor
            artistId={artist.id}
            avatarUrl={avatarUrl}
            initials={initials}
          />
        ) : (
          <div className="flex-shrink-0 w-20 h-20 rounded-full overflow-hidden bg-accent/10 flex items-center justify-center text-accent font-bold text-2xl">
            {avatarUrl ? (
              <Image
                src={avatarUrl}
                alt={artist.stage_name}
                width={80}
                height={80}
                className="object-cover w-full h-full"
              />
            ) : initials}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="font-bebas text-5xl text-text-primary leading-none">{artist.stage_name}</h1>
            {(profile as any)?.is_founding_member && <FoundingMemberBadge size="md" />}
            {user?.id !== artist.profile_id && (
              <FollowButton targetType="artist" targetId={artist.id} initialFollowing={isFollowing} userId={user?.id ?? null} />
            )}
          </div>
          {(artist.city || ((artist as any).active_cities?.length > 0)) && (
            <div className="flex items-center gap-1 text-text-muted text-sm mt-1 flex-wrap">
              <MapPin size={14} className="flex-shrink-0" />
              <span>{artist.city}</span>
              {(artist as any).active_cities?.filter((c: string) => c !== artist.city).map((c: string) => (
                <span key={c} className="text-text-muted/60">· {c}</span>
              ))}
            </div>
          )}
          <div className="flex flex-wrap gap-1.5 mt-2">
            {artist.genres?.map((g: string) => <GenreChip key={g} genre={g} />)}
          </div>
          {!artist.profile_id && user && !isOwner && (
            <div className="mt-1">
              <ClaimProfileButton artistId={artist.id} />
            </div>
          )}
          {isOwner && (
            <div className="mt-3 flex items-center gap-3">
              <LfbToggle artistId={artist.id} initialValue={(artist as any).looking_for_band ?? false} />
              <ArtistProfileEditor
                artistId={artist.id}
                initialData={{
                  stage_name: artist.stage_name,
                  city: artist.city ?? null,
                  active_cities: (artist as any).active_cities ?? [],
                  genres: artist.genres ?? [],
                  instruments: artist.instruments ?? [],
                  bio: artist.bio ?? null,
                  social_links: artist.social_links ?? null,
                  is_hidden: (artist as any).is_hidden ?? false,
                  avatar_url: profile?.avatar_url ?? null,
                }}
              />
            </div>
          )}
        </div>
      </div>

      <div className="space-y-6">
        {artist.instruments && artist.instruments.length > 0 && (
          <div>
            <h3 className="label">{isEn ? 'Instruments' : 'Enstrümanlar'}</h3>
            <div className="flex flex-wrap gap-2">
              {artist.instruments.map((i: string) => (
                <span key={i} className="chip bg-[rgba(228,224,216,0.06)] text-text-muted border border-[rgba(228,224,216,0.1)]">{translateInstrument(i, locale)}</span>
              ))}
            </div>
          </div>
        )}

        {(artist.bio || profile?.bio) && (
          <div>
            <h3 className="label">{isEn ? 'About' : 'Hakkında'}</h3>
            <p className="text-text-primary text-sm leading-relaxed">{artist.bio || profile?.bio}</p>
          </div>
        )}

        {artist.video_urls && artist.video_urls.length > 0 && (
          <div>
            <h3 className="label mb-3">{isEn ? 'Videos' : 'Videolar'}</h3>
            <div className="space-y-3">
              {artist.video_urls.map((url: string, i: number) => (
                <VideoEmbed key={i} url={url} />
              ))}
            </div>
          </div>
        )}

        {artist.technical_rider && (
          <details className="card p-4 group">
            <summary className="flex items-center justify-between cursor-pointer text-sm font-medium text-text-primary list-none">
              {isEn ? 'Technical Rider' : 'Teknik Rider'}
              <ChevronDown size={16} className="text-text-muted group-open:rotate-180 transition-transform" />
            </summary>
            <p className="mt-3 text-text-muted text-sm leading-relaxed whitespace-pre-wrap">{artist.technical_rider}</p>
          </details>
        )}

        {artist.past_venues && artist.past_venues.length > 0 && (
          <div>
            <h3 className="label">{isEn ? 'Past Venues' : 'Daha Önce Sahne Aldığı Yerler'}</h3>
            <div className="flex flex-wrap gap-2">
              {artist.past_venues.map((v: string) => (
                <span key={v} className="chip bg-[rgba(228,224,216,0.06)] text-text-muted border border-[rgba(228,224,216,0.1)]">{v}</span>
              ))}
            </div>
          </div>
        )}

        {bands.length > 0 && (
          <div>
            <h3 className="label">{isEn ? 'Bands' : 'Gruplar'}</h3>
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
              {bands.map((band: any) => (
                <Link
                  key={band.id}
                  href={`/bands/${band.id}`}
                  className="group flex flex-col items-center gap-2 p-3 rounded-xl bg-[rgba(228,224,216,0.04)] hover:bg-[rgba(228,224,216,0.08)] transition-colors text-center"
                >
                  {band.photo_url ? (
                    <div className="w-16 h-16 rounded-full overflow-hidden flex-shrink-0 relative">
                      <Image src={band.photo_url} alt={band.name} width={64} height={64} className="object-cover w-full h-full" />
                    </div>
                  ) : (
                    <div className="w-16 h-16 rounded-full bg-accent/10 flex items-center justify-center text-accent font-bold text-xl flex-shrink-0">
                      {band.name?.[0]}
                    </div>
                  )}
                  <div className="min-w-0 w-full">
                    <p className="font-medium text-text-primary text-xs truncate">{band.name}</p>
                    {band.city && <p className="text-text-muted text-xs truncate">{band.city}</p>}
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        <ArtistCalendarSection
          artistId={artist.id}
          isOwner={isOwner}
          initialEvents={events
            .filter((ev) => isOwner || (ev as any).status === 'confirmed')
            .map((ev) => ({
              id: ev.id,
              event_date: ev.event_date,
              title: ev.title,
              start_time: ev.start_time,
              end_time: (ev as any).end_time ?? null,
              subtitle: (ev as any).venues?.name ?? (ev as any).venue_name ?? (ev as any).bands?.name ?? null,
              status: (ev as any).status,
            }))}
        />

        {ownedVenue && (
          <div>
            <h3 className="label">{isEn ? 'Venue' : 'Mekan'}</h3>
            <Link
              href={`/venues/${ownedVenue.id}`}
              className="card p-4 flex items-center gap-4 hover:border-accent/30 transition-colors"
            >
              <div className="flex-shrink-0 w-12 h-12 rounded-lg overflow-hidden bg-accent/10 flex items-center justify-center">
                {ownedVenue.photo_url ? (
                  <Image src={ownedVenue.photo_url} alt={ownedVenue.name} width={48} height={48} className="object-cover w-full h-full" />
                ) : (
                  <Building2 size={20} className="text-accent/50" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-medium text-text-primary text-sm">{ownedVenue.name}</p>
                <div className="flex items-center gap-1 text-text-muted text-xs mt-0.5">
                  <MapPin size={11} />
                  <span>{ownedVenue.district ? `${ownedVenue.district}, ` : ''}{ownedVenue.city}</span>
                </div>
                {ownedVenue.venue_type && (
                  <span className="text-xs text-text-muted mt-0.5 block">
                    {VENUE_TYPE_LABELS[ownedVenue.venue_type] ?? ownedVenue.venue_type}
                  </span>
                )}
              </div>
              <span className="text-accent text-xs flex-shrink-0">→</span>
            </Link>
          </div>
        )}

        {artist.social_links && Object.keys(artist.social_links).length > 0 && (
          <div>
            <h3 className="label">{isEn ? 'Social Media' : 'Sosyal Medya'}</h3>
            <SocialLinks links={artist.social_links} />
          </div>
        )}

        <div className="pt-2">
          <a href={`mailto:${profile?.display_name ?? artist.stage_name}`} className="btn-accent w-full flex items-center justify-center gap-2 py-3">
            <Mail size={16} />
            {isEn ? 'Contact' : 'İletişime Geç'}
          </a>
        </div>
      </div>
    </div>
  )
}
