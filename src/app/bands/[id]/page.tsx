import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { GenreChip } from '@/components/ui/GenreChip'
import { SocialLinks } from '@/components/ui/SocialLinks'
import { LookingForEditor } from '@/components/bands/LookingForEditor'
import { BandLogoEditor } from '@/components/bands/BandLogoEditor'
import { BandVideoEditor } from '@/components/bands/BandVideoEditor'
import { BandSocialEditor } from '@/components/bands/BandSocialEditor'
import { BandInviteButton } from '@/components/bands/BandInviteButton'
import { BandApplyButton } from '@/components/bands/BandApplyButton'
import { BandProfileEditor } from '@/components/bands/BandProfileEditor'
import type { SocialLinksData } from '@/components/ui/SocialLinks'
import { MapPin, ArrowLeft, Users, Images } from 'lucide-react'
import { BandCalendarSection } from '@/components/bands/BandCalendarSection'

export const dynamic = 'force-dynamic'

interface Props {
  params: Promise<{ id: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params
  const supabase = await createClient()
  const { data } = await supabase.from('bands').select('name, bio, city').eq('id', id).single()
  if (!data) return { title: 'Grup Bulunamadı' }
  return {
    title: `${(data as any).name}${(data as any).city ? ` — ${(data as any).city}` : ''}`,
    description: (data as any).bio ?? undefined,
  }
}

export default async function BandPage({ params }: Props) {
  const { id } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()

  const [bandRes, artistRes, eventsRes] = await Promise.all([
    supabase
      .from('bands')
      .select('*, band_members(id, artist_id, role, status, artists(id, stage_name, instruments, city, profiles(avatar_url)))')
      .eq('id', id)
      .single(),
    user
      ? supabase.from('artists').select('id').eq('profile_id', user.id).single()
      : Promise.resolve({ data: null }),
    supabase
      .from('events')
      .select('id, event_date, title, start_time, end_time, venues(name)')
      .eq('band_id', id)
      .eq('status', 'confirmed')
      .order('event_date', { ascending: true }),
  ])

  if (!bandRes.data) notFound()

  const b = bandRes.data as any
  const isCreator = user?.id === b.creator_id
  const isArtist = !!artistRes.data
  const currentArtistId = artistRes.data?.id
  const bandEvents = (eventsRes.data ?? []) as any[]
  const members = (b.band_members ?? []).filter((m: any) => m.status === 'accepted')
  const lookingFor: string[] = b.looking_for ?? []
  
  let currentArtistStatus: string | null = null
  let currentArtistRole: string | null = null
  if (currentArtistId) {
    const mem = (b.band_members ?? []).find((m: any) => m.artists?.id === currentArtistId)
    if (mem) {
      currentArtistStatus = mem.status
      currentArtistRole = mem.role
    }
  }
  const videoUrls: string[] = b.video_urls ?? []
  const socialLinks = (b.social_links ?? {}) as SocialLinksData

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <Link href="/bands" className="flex items-center gap-2 text-text-muted text-sm mb-6 hover:text-text-primary w-fit">
        <ArrowLeft size={16} />
        Gruplar
      </Link>

      <div className="flex items-start gap-5 mb-6">
        <BandLogoEditor
          bandId={b.id}
          initialUrl={b.photo_url ?? ''}
          name={b.name}
          isCreator={isCreator}
        />
        <div className="flex-1 min-w-0">
          <h1 className="font-bebas text-5xl text-text-primary leading-none">{b.name}</h1>
          {b.city && (
            <div className="flex items-center gap-1 text-text-muted text-sm mt-1">
              <MapPin size={14} />
              <span>{b.city}</span>
            </div>
          )}
          <div className="flex flex-wrap gap-1.5 mt-2">
            {(b.genres ?? []).map((g: string) => <GenreChip key={g} genre={g} />)}
          </div>
          {isCreator && (
            <div className="mt-3">
              <BandProfileEditor 
                bandId={b.id} 
                initialData={{ name: b.name, city: b.city, genres: b.genres, bio: b.bio }} 
              />
            </div>
          )}
        </div>
      </div>

      <div className="space-y-6">
        {b.bio && (
          <div>
            <h3 className="label">Hakkında</h3>
            <p className="text-text-primary text-sm leading-relaxed">{b.bio}</p>
          </div>
        )}

        {isCreator ? (
          <LookingForEditor bandId={b.id} initialValue={lookingFor} />
        ) : isArtist && lookingFor.length > 0 ? (
          <div>
            <h3 className="label">Aranan Enstrümanlar</h3>
            <div className="flex flex-wrap gap-1.5 mb-4">
              {lookingFor.map((item: string) => (
                <span key={item} className="chip bg-yellow-400/10 text-yellow-400 border border-yellow-400/20">{item}</span>
              ))}
            </div>
            {currentArtistId && (
              <BandApplyButton
                bandId={b.id}
                artistId={currentArtistId}
                existingStatus={currentArtistStatus}
                existingRole={currentArtistRole}
              />
            )}
          </div>
        ) : null}

        <div>
          <h3 className="label flex items-center gap-2">
            <Users size={13} />
            Üyeler
            <span className="font-normal text-text-muted">({members.length})</span>
          </h3>
          {members.length === 0 ? (
            <p className="text-text-muted text-sm">Henüz üye yok.</p>
          ) : (
            <div className="space-y-2">
              {members.map((m: any) => {
                const artist = m.artists
                const initials = artist?.stage_name?.split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase()
                return (
                  <Link
                    key={m.id}
                    href={`/artists/${artist?.id}`}
                    className="card p-3 flex items-center gap-3 hover:border-accent/30 transition-colors"
                  >
                    <div className="w-9 h-9 rounded-full overflow-hidden bg-accent/10 flex items-center justify-center text-accent text-sm font-bold flex-shrink-0">
                      {artist?.profiles?.avatar_url ? (
                        <Image src={artist.profiles.avatar_url} alt={artist.stage_name} width={36} height={36} className="object-cover w-full h-full" />
                      ) : initials}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-text-primary text-sm font-medium">{artist?.stage_name}</p>
                        {m.role && <span className="text-[10px] text-accent bg-accent/10 px-1.5 py-0.5 rounded">{m.role}</span>}
                      </div>
                      {artist?.instruments && artist.instruments.length > 0 && (
                        <p className="text-text-muted text-xs truncate mt-0.5">
                          {artist.instruments.join(', ')}
                        </p>
                      )}
                    </div>
                    {artist?.city && <span className="text-text-muted text-xs flex-shrink-0">{artist.city}</span>}
                  </Link>
                )
              })}
            </div>
          )}
          {isCreator && (
            <div className="mt-4 border-t border-[rgba(228,224,216,0.1)] pt-4">
              <BandInviteButton 
                bandId={b.id} 
                existingMembers={(b.band_members ?? []).map((m: any) => ({
                  artist_id: m.artist_id,
                  status: m.status,
                  role: m.role
                }))} 
              />
            </div>
          )}
        </div>

        {/* Videos */}
        <BandVideoEditor bandId={b.id} initialUrls={videoUrls} readOnly={!isCreator} />

        {/* Social links */}
        {isCreator ? (
          <div>
            <h3 className="label">Sosyal Medya</h3>
            <BandSocialEditor bandId={b.id} initialLinks={socialLinks} />
          </div>
        ) : Object.keys(socialLinks).length > 0 ? (
          <div>
            <h3 className="label">Sosyal Medya</h3>
            <SocialLinks links={socialLinks} />
          </div>
        ) : null}

        <BandCalendarSection
          bandId={b.id}
          isCreator={isCreator}
          initialEvents={bandEvents.map((ev: any) => ({
            id: ev.id,
            event_date: ev.event_date,
            title: ev.title,
            start_time: ev.start_time,
            end_time: ev.end_time ?? null,
            subtitle: ev.venues?.name ?? null,
            status: ev.status,
          }))}
        />

        <Link
          href={`/bands/${b.id}/photos`}
          className="card p-4 flex items-center justify-between hover:border-accent/30 transition-colors"
        >
          <div className="flex items-center gap-3">
            <Images size={18} className="text-text-muted" />
            <span className="text-text-primary text-sm font-medium">Fotoğraf Albümü</span>
          </div>
          <span className="text-text-muted text-xs">{(b.photos ?? []).length} fotoğraf →</span>
        </Link>
      </div>
    </div>
  )
}
