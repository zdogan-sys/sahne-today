import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { GenreChip } from '@/components/ui/GenreChip'
import { VideoEmbed } from '@/components/artists/VideoEmbed'
import { formatDate } from '@/lib/utils'
import { MapPin, ArrowLeft, ChevronDown, Mail } from 'lucide-react'
import type { Artist, Profile, Event, Venue } from '@/lib/supabase/types'
import { SocialLinks } from '@/components/ui/SocialLinks'
import { LfbToggle } from '@/components/artists/LfbToggle'
import { ArtistCalendarSection } from '@/components/artists/ArtistCalendarSection'

import type { SocialLinksData } from '@/components/ui/SocialLinks'
type ArtistFull = Artist & { profiles: Profile | null; social_links?: SocialLinksData }
type EventFull = Event & { venues: Pick<Venue, 'name' | 'city'> | null; bands: { name: string } | null }

interface Props {
  params: Promise<{ id: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params
  const supabase = await createClient()
  const { data } = await supabase.from('artists').select('stage_name, bio, city').eq('id', id).single()
  const artist = data as { stage_name: string; bio: string | null; city: string | null } | null
  if (!artist) return { title: 'Sanatçı Bulunamadı' }
  return {
    title: `${artist.stage_name}${artist.city ? ` — ${artist.city}` : ''}`,
    description: artist.bio ?? undefined,
  }
}

export default async function ArtistPage({ params }: Props) {
  const { id } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()

  const [artistRes, membershipsRes] = await Promise.all([
    supabase.from('artists').select('*, profiles(*)').eq('id', id).single(),
    supabase.from('band_members').select('band_id').eq('artist_id', id).eq('status', 'accepted'),
  ])

  const bandIds = (membershipsRes.data ?? []).map((m: any) => m.band_id as string)

  const eventsRes = await (bandIds.length > 0
    ? supabase.from('events')
        .select('id, event_date, title, start_time, end_time, status, venue_name, venues(name, city), bands(name)')
        .or(`artist_id.eq.${id},band_id.in.(${bandIds.join(',')})`)
        .in('status', ['confirmed', 'pending'])
        .order('event_date', { ascending: true })
    : supabase.from('events')
        .select('id, event_date, title, start_time, end_time, status, venue_name, venues(name, city), bands(name)')
        .eq('artist_id', id)
        .in('status', ['confirmed', 'pending'])
        .order('event_date', { ascending: true })
  )

  if (!artistRes.data) notFound()
  const artist = artistRes.data as unknown as ArtistFull
  const events = (eventsRes.data ?? []) as unknown as EventFull[]
  const profile = artist.profiles
  const isOwner = user?.id === artist.profile_id

  const initials = artist.stage_name.split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase()

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <Link href="/artists" className="flex items-center gap-2 text-text-muted text-sm mb-6 hover:text-text-primary w-fit">
        <ArrowLeft size={16} />
        Sanatçılar
      </Link>

      <div className="flex items-start gap-5 mb-6">
        <div className="flex-shrink-0 w-20 h-20 rounded-full overflow-hidden bg-accent/10 flex items-center justify-center text-accent font-bold text-2xl">
          {profile?.avatar_url ? (
            <Image
              src={profile.avatar_url}
              alt={artist.stage_name}
              width={80}
              height={80}
              className="object-cover w-full h-full"
            />
          ) : initials}
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="font-bebas text-5xl text-text-primary leading-none">{artist.stage_name}</h1>
          {artist.city && (
            <div className="flex items-center gap-1 text-text-muted text-sm mt-1">
              <MapPin size={14} />
              <span>{artist.city}</span>
            </div>
          )}
          <div className="flex flex-wrap gap-1.5 mt-2">
            {artist.genres?.map((g: string) => <GenreChip key={g} genre={g} />)}
          </div>
          {isOwner && (
            <div className="mt-3">
              <LfbToggle artistId={artist.id} initialValue={(artist as any).looking_for_band ?? false} />
            </div>
          )}
        </div>
      </div>

      <div className="space-y-6">
        {artist.instruments && artist.instruments.length > 0 && (
          <div>
            <h3 className="label">Enstrümanlar</h3>
            <div className="flex flex-wrap gap-2">
              {artist.instruments.map((i: string) => (
                <span key={i} className="chip bg-[rgba(228,224,216,0.06)] text-text-muted border border-[rgba(228,224,216,0.1)]">{i}</span>
              ))}
            </div>
          </div>
        )}

        {(artist.bio || profile?.bio) && (
          <div>
            <h3 className="label">Hakkında</h3>
            <p className="text-text-primary text-sm leading-relaxed">{artist.bio || profile?.bio}</p>
          </div>
        )}

        {artist.video_urls && artist.video_urls.length > 0 && (
          <div>
            <h3 className="label mb-3">Videolar</h3>
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
              Teknik Rider
              <ChevronDown size={16} className="text-text-muted group-open:rotate-180 transition-transform" />
            </summary>
            <p className="mt-3 text-text-muted text-sm leading-relaxed whitespace-pre-wrap">{artist.technical_rider}</p>
          </details>
        )}

        {artist.past_venues && artist.past_venues.length > 0 && (
          <div>
            <h3 className="label">Daha Önce Sahne Aldığı Yerler</h3>
            <div className="flex flex-wrap gap-2">
              {artist.past_venues.map((v: string) => (
                <span key={v} className="chip bg-[rgba(228,224,216,0.06)] text-text-muted border border-[rgba(228,224,216,0.1)]">{v}</span>
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
              subtitle: (ev as any).venue_name ?? (ev as any).venues?.name ?? (ev as any).bands?.name ?? null,
              status: (ev as any).status,
            }))}
        />

        {artist.social_links && Object.keys(artist.social_links).length > 0 && (
          <div>
            <h3 className="label">Sosyal Medya</h3>
            <SocialLinks links={artist.social_links} />
          </div>
        )}

        <div className="pt-2">
          <a href={`mailto:${profile?.display_name ?? artist.stage_name}`} className="btn-accent w-full flex items-center justify-center gap-2 py-3">
            <Mail size={16} />
            İletişime Geç
          </a>
        </div>
      </div>
    </div>
  )
}
