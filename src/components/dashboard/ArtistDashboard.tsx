'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useLocale } from 'next-intl'
import { createClient } from '@/lib/supabase/client'
import { getDayNames, formatTime, formatDate, translateVenueType } from '@/lib/utils'
import { Clock, Check, X, MapPin, Building2 } from 'lucide-react'

import Image from 'next/image'
import { cn } from '@/lib/utils'
import { respondToCancelRequest } from '@/app/actions/event'
import { ProBadge } from '@/components/ui/ProBadge'
import { TeachingToggle } from '@/components/artists/TeachingToggle'
import { ExternalLink, GraduationCap } from 'lucide-react'
import { respondToVenueOffer } from '@/app/actions/offer'
import { OfferCountdown } from '@/components/ui/OfferCountdown'
import { BandSection } from '@/components/bands/BandSection'
import { ArtistProfileEditor } from '@/components/artists/ArtistProfileEditor'
import { ArtistCalendarSection } from '@/components/artists/ArtistCalendarSection'
import { CalendarSubscribe } from '@/components/ui/CalendarSubscribe'

export function ArtistDashboard({ userId, calendarToken }: { userId: string; calendarToken: string | null }) {
  const locale = useLocale()
  const isEn = locale === 'en'
  const dayNames = getDayNames(locale)
  const [artist, setArtist] = useState<any>(null)
  const [venue, setVenue] = useState<any>(null)
  const [isProIndividual, setIsProIndividual] = useState(false)
  const [applications, setApplications] = useState<any[]>([])
  const [pendingInvites, setPendingInvites] = useState<any[]>([])
  const [events, setEvents] = useState<any[]>([])
  const [incomingOffers, setIncomingOffers] = useState<any[]>([])
  const [respondingOffer, setRespondingOffer] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    load()

    const channel = supabase
      .channel('artist-dashboard')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'applications' }, () => load())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'band_members' }, () => load())
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function load() {
    const [{ data: artistData }, { data: venueData }, { data: profileData }] = await Promise.all([
      supabase.from('artists').select('*').eq('profile_id', userId).single(),
      supabase.from('venues').select('id, name, city, district, venue_type, photo_url').eq('owner_id', userId).maybeSingle(),
      supabase.from('profiles').select('is_pro_individual').eq('id', userId).single(),
    ])

    setArtist(artistData)
    setVenue(venueData)
    setIsProIndividual(!!(profileData as any)?.is_pro_individual)

    if (artistData) {
      const [appRes, inviteRes, membershipRes] = await Promise.all([
        supabase
          .from('applications')
          .select('*, slots(*, venues(name, city, district))')
          .eq('artist_id', artistData.id)
          .order('created_at', { ascending: false }),
        supabase
          .from('band_members')
          .select('id, invited_at, role, bands(id, name, genres, city)')
          .eq('artist_id', artistData.id)
          .eq('status', 'invited'),
        supabase
          .from('band_members')
          .select('band_id')
          .eq('artist_id', artistData.id)
          .eq('status', 'accepted'),
      ])

      const bandIds = (membershipRes.data ?? []).map((m: any) => m.band_id as string)

      // Teklifler: artist_id veya band_id eşleşenler
      const offersFilter = bandIds.length > 0
        ? `artist_id.eq.${artistData.id},band_id.in.(${bandIds.join(',')})`
        : `artist_id.eq.${artistData.id}`

      let eventsQ = supabase
        .from('events')
        .select('id, event_date, title, start_time, end_time, status, cancel_requested, venue_name, venues(name, city), bands(name)')
        .in('status', ['confirmed', 'pending'])
        .order('event_date', { ascending: true })

      if (bandIds.length > 0) {
        eventsQ = eventsQ.or(`artist_id.eq.${artistData.id},band_id.in.(${bandIds.join(',')})`)
      } else {
        eventsQ = eventsQ.eq('artist_id', artistData.id)
      }

      const [offersRes, evData] = await Promise.all([
        supabase
          .from('events')
          .select('id, title, event_date, start_time, end_time, expires_at, venues(id, name, city, district), bands(name)')
          .or(offersFilter)
          .eq('status', 'offered')
          .order('expires_at', { ascending: true }),
        eventsQ,
      ])

      setApplications(appRes.data ?? [])
      setIncomingOffers(offersRes.data ?? [])
      const realInvites = (inviteRes.data ?? []).filter((inv: any) => inv.role !== 'Applicant')
      setPendingInvites(realInvites)
      setEvents(evData.data ?? [])
    }
    setLoading(false)
  }

  async function toggleLfb() {
    const next = !artist.looking_for_band
    await supabase.from('artists').update({ looking_for_band: next } as any).eq('id', artist.id)
    setArtist((prev: any) => ({ ...prev, looking_for_band: next }))
  }

  async function handleOfferResponse(eventId: string, accept: boolean) {
    setRespondingOffer(eventId)
    await respondToVenueOffer(eventId, accept)
    setRespondingOffer(null)
    await load()
  }

  async function handleCancelRequest(eventId: string, approve: boolean) {
    await respondToCancelRequest(eventId, approve)
    await load()
  }

  async function respondInvite(memberId: string, accept: boolean) {
    await supabase
      .from('band_members')
      .update({
        status: accept ? 'accepted' : 'declined',
        ...(accept ? { joined_at: new Date().toISOString() } : {}),
      } as any)
      .eq('id', memberId)
    await load()
  }

  if (loading) return <div className="text-text-muted text-sm">{isEn ? 'Loading...' : 'Yükleniyor...'}</div>

  if (!artist) {
    return (
      <div className="card p-6 text-center">
        <p className="text-text-muted text-sm mb-4">{isEn ? "You don't have an artist profile yet." : 'Henüz sanatçı profiliniz yok.'}</p>
        <Link href="/artists/register" className="btn-accent">{isEn ? 'Create Profile' : 'Profil Oluştur'}</Link>
      </div>
    )
  }

  const statusColors: Record<string, string> = {
    pending: 'text-yellow-400 bg-yellow-400/10',
    accepted: 'text-success bg-success/10',
    rejected: 'text-red-400 bg-red-400/10',
  }
  const statusLabels: Record<string, string> = isEn ? {
    pending: 'Pending',
    accepted: 'Accepted',
    rejected: 'Rejected',
  } : {
    pending: 'Beklemede',
    accepted: 'Kabul Edildi',
    rejected: 'Reddedildi',
  }

  const today = new Date().toISOString().split('T')[0]
  const pastConfirmed = events.filter(e => e.status === 'confirmed' && e.event_date < today).length
  const upcomingConfirmed = events.filter(e => e.status === 'confirmed' && e.event_date >= today).length
  const uniqueVenues = new Set(events.map((e: any) => e.venues?.name ?? e.venue_name).filter(Boolean)).size

  return (
    <div className="space-y-8">
      {/* Stats row */}
      {(pastConfirmed > 0 || upcomingConfirmed > 0) && (
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: isEn ? 'Past Shows' : 'Geçmiş Sahne', value: pastConfirmed },
            { label: isEn ? 'Upcoming' : 'Yaklaşan', value: upcomingConfirmed },
            { label: isEn ? 'Venues' : 'Farklı Mekan', value: uniqueVenues },
          ].map(({ label, value }) => (
            <div key={label} className="card p-3 text-center">
              <p className="font-bebas text-3xl text-accent leading-none">{value}</p>
              <p className="text-text-muted text-[10px] mt-1 uppercase tracking-wide">{label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Profile summary */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-bebas text-2xl text-text-primary">{isEn ? 'MY PROFILE' : 'PROFİLİM'}</h2>
          <div className="flex items-center gap-2">
            <Link
              href={`/artists/${artist.id}`}
              target="_blank"
              className="flex items-center gap-1.5 text-xs text-text-muted hover:text-accent transition-colors border border-[rgba(228,224,216,0.12)] hover:border-accent/30 px-2.5 py-1.5 rounded-md"
            >
              <ExternalLink size={11} />
              {isEn ? 'View Profile' : 'Profil Sayfam'}
            </Link>
            <ArtistProfileEditor
              artistId={artist.id}
              initialData={{
                stage_name: artist.stage_name,
                city: artist.city,
                genres: artist.genres,
                instruments: artist.instruments,
                bio: artist.bio,
                social_links: artist.social_links,
                is_hidden: artist.is_hidden,
              }}
            />
          </div>
        </div>
        <div className="card p-4 space-y-4">
          <div>
            <h3 className="font-semibold text-text-primary text-xl">{artist.stage_name}</h3>
            {artist.city && <p className="text-text-muted text-sm mt-0.5">{artist.city}</p>}
            <div className="flex flex-wrap gap-1.5 mt-2">
              {artist.genres?.map((g: string) => (
                <span key={g} className="chip bg-accent/10 text-accent border border-accent/20">{g}</span>
              ))}
            </div>
          </div>

          {artist.bio && (
            <div className="pt-4 border-t border-[rgba(228,224,216,0.1)]">
              <h4 className="text-xs font-medium text-text-muted mb-2 uppercase tracking-wider">{isEn ? 'About' : 'Hakkında'}</h4>
              <p className="text-sm text-text-primary leading-relaxed">{artist.bio}</p>
            </div>
          )}

          {artist.instruments && artist.instruments.length > 0 && (
            <div className="pt-4 border-t border-[rgba(228,224,216,0.1)]">
              <h4 className="text-xs font-medium text-text-muted mb-2 uppercase tracking-wider">{isEn ? 'Instruments' : 'Enstrümanlar'}</h4>
              <div className="flex flex-wrap gap-1.5">
                {artist.instruments.map((i: string) => (
                  <span key={i} className="chip bg-[rgba(228,224,216,0.06)] text-text-muted border border-[rgba(228,224,216,0.1)]">{i}</span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Venue owned by this artist */}
      {venue && (
        <div>
          <h2 className="font-bebas text-2xl text-text-primary mb-4">{isEn ? 'MY VENUE' : 'MEKANIM'}</h2>
          <Link href={`/venues/${venue.id}`} className="card p-4 flex items-center gap-4 hover:border-accent/30 transition-colors block">
            <div className="flex-shrink-0 w-14 h-14 rounded-lg overflow-hidden bg-accent/10 flex items-center justify-center">
              {venue.photo_url ? (
                <Image src={venue.photo_url} alt={venue.name} width={56} height={56} className="object-cover w-full h-full" />
              ) : (
                <Building2 size={22} className="text-accent/50" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-text-primary">{venue.name}</p>
              <div className="flex items-center gap-1 text-text-muted text-xs mt-0.5">
                <MapPin size={11} />
                <span>{venue.district ? `${venue.district}, ` : ''}{venue.city}</span>
              </div>
              {venue.venue_type && (
                <span className="chip bg-[rgba(228,224,216,0.06)] text-text-muted border border-[rgba(228,224,216,0.1)] mt-1.5 inline-block">
                  {translateVenueType(venue.venue_type, locale)}
                </span>
              )}
            </div>
            <span className="text-accent text-xs flex-shrink-0">{isEn ? 'View →' : 'Görüntüle →'}</span>
          </Link>
        </div>
      )}

      {/* Incoming venue offers */}
      {incomingOffers.length > 0 && (
        <div>
          <h2 className="font-bebas text-2xl text-text-primary mb-1">{isEn ? 'INCOMING OFFERS' : 'GELEN TEKLİFLER'}</h2>
          <p className="text-text-muted text-xs mb-3 -mt-2">{isEn ? 'Venues are inviting you to their stages. Respond before the offer expires.' : 'Mekanlar sizi sahnelerine davet ediyor. Süre dolmadan yanıt verin.'}</p>
          <div className="space-y-3">
            {incomingOffers.map((ev: any) => (
              <div key={ev.id} className="card p-4 border-accent/25">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-text-primary text-sm">{ev.title}</p>
                    <p className="text-text-muted text-xs mt-0.5">
                      {ev.venues?.name} · {ev.venues?.district ? `${ev.venues.district}, ` : ''}{ev.venues?.city}
                    </p>
                    <p className="text-text-muted text-xs mt-0.5">
                      {formatDate(ev.event_date, locale)} · {formatTime(ev.start_time)}{ev.end_time ? ` – ${formatTime(ev.end_time)}` : ''}
                    </p>
                    {ev.expires_at && <div className="mt-1.5"><OfferCountdown expiresAt={ev.expires_at} /></div>}
                  </div>
                  <div className="flex gap-2 flex-shrink-0">
                    <button
                      onClick={() => handleOfferResponse(ev.id, false)}
                      disabled={respondingOffer === ev.id}
                      title={isEn ? 'Reject' : 'Reddet'}
                      className="w-8 h-8 rounded-md bg-red-400/10 text-red-400 flex items-center justify-center hover:bg-red-400/20 transition-colors disabled:opacity-50"
                    >
                      <X size={14} />
                    </button>
                    <button
                      onClick={() => handleOfferResponse(ev.id, true)}
                      disabled={respondingOffer === ev.id}
                      title={isEn ? 'Accept' : 'Kabul Et'}
                      className="w-8 h-8 rounded-md bg-success/10 text-success flex items-center justify-center hover:bg-success/20 transition-colors disabled:opacity-50"
                    >
                      <Check size={14} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Pending band invitations */}
      {pendingInvites.length > 0 && (
        <div>
          <h2 className="font-bebas text-2xl text-text-primary mb-4">{isEn ? 'BAND INVITATIONS' : 'GRUP DAVETLERİ'}</h2>
          <div className="space-y-2">
            {pendingInvites.map((invite: any) => {
              const band = invite.bands
              return (
                <div key={invite.id} className="card p-4 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-medium text-text-primary text-sm">{band?.name}</p>
                    <p className="text-text-muted text-xs mt-0.5">
                      {band?.genres?.slice(0, 2).join(', ')}{band?.city ? ` · ${band.city}` : ''}
                    </p>
                    <p className="text-text-muted text-xs mt-1 flex items-center gap-1">
                      <Clock size={10} />
                      {formatDate(invite.invited_at, locale)}
                    </p>
                  </div>
                  <div className="flex gap-2 flex-shrink-0">
                    <button
                      onClick={() => respondInvite(invite.id, false)}
                      title={isEn ? 'Reject' : 'Reddet'}
                      className="w-8 h-8 rounded-md bg-red-400/10 text-red-400 flex items-center justify-center hover:bg-red-400/20 transition-colors"
                    >
                      <X size={14} />
                    </button>
                    <button
                      onClick={() => respondInvite(invite.id, true)}
                      title={isEn ? 'Accept' : 'Kabul Et'}
                      className="w-8 h-8 rounded-md bg-success/10 text-success flex items-center justify-center hover:bg-success/20 transition-colors"
                    >
                      <Check size={14} />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Cancel requests from venues */}
      {events.filter((e: any) => e.cancel_requested).length > 0 && (
        <div>
          <h2 className="font-bebas text-2xl text-text-primary mb-1">{isEn ? 'CANCELLATION REQUESTS' : 'İPTAL TALEPLERİ'}</h2>
          <p className="text-text-muted text-xs mb-3">{isEn ? 'The venue owner wants to cancel the events below.' : 'Mekan sahibi aşağıdaki etkinlikleri iptal etmek istiyor.'}</p>
          <div className="space-y-3">
            {events.filter((e: any) => e.cancel_requested).map((ev: any) => (
              <div key={ev.id} className="card p-4 border-yellow-400/30">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-text-primary text-sm truncate">{ev.title}</p>
                    <p className="text-text-muted text-xs mt-0.5">
                      {ev.venues?.name ?? ev.venue_name} · {formatDate(ev.event_date, locale)} {formatTime(ev.start_time)}
                    </p>
                  </div>
                  <div className="flex gap-2 flex-shrink-0">
                    <button
                      onClick={() => handleCancelRequest(ev.id, false)}
                      className="px-3 py-1.5 rounded-md bg-success/10 text-success text-xs font-medium hover:bg-success/20 transition-colors"
                    >
                      {isEn ? "Don't Cancel" : 'İptal Etme'}
                    </button>
                    <button
                      onClick={() => handleCancelRequest(ev.id, true)}
                      className="px-3 py-1.5 rounded-md bg-red-400/10 text-red-400 text-xs font-medium hover:bg-red-400/20 transition-colors"
                    >
                      {isEn ? 'Cancel' : 'İptal Et'}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Özel Dersler */}
      <div>
        <h2 className="font-bebas text-2xl text-text-primary mb-3 flex items-center gap-2">
          {isEn ? 'PRIVATE LESSONS' : 'ÖZEL DERSLER'}
          {isProIndividual && <ProBadge />}
        </h2>
        {isProIndividual ? (
          <div className="space-y-3">
            <div className="card p-4">
              <p className="text-text-muted text-xs mb-2 uppercase tracking-wide">{isEn ? 'Lesson Status' : 'Ders Durumu'}</p>
              <TeachingToggle
                artistId={artist.id}
                initialIsTeaching={artist.is_teaching ?? false}
                initialTeachingInstruments={artist.teaching_instruments ?? []}
                instruments={artist.instruments ?? []}
                isProIndividual={true}
              />
            </div>
            <div className="card p-4 flex items-center justify-between">
              <div>
                <p className="text-text-primary text-sm font-medium flex items-center gap-1.5">
                  <GraduationCap size={13} className="text-[#d4a820]" />
                  {isEn ? 'Available Times' : 'Ders Saatlerim'}
                </p>
                <p className="text-text-muted text-xs mt-0.5">{isEn ? 'Set times, students book directly' : 'Müsait saatlerini belirle, öğrenciler rezervasyon yapsın'}</p>
              </div>
              <Link href={`/dashboard/teaching-slots?artist=${artist.id}`} className="btn-accent py-1.5 px-3 text-xs">
                {isEn ? 'Manage →' : 'Yönet →'}
              </Link>
            </div>
          </div>
        ) : (
          <div className="card p-4 flex items-center gap-3">
            <div className="flex-1">
              <p className="text-text-primary text-sm font-medium">{isEn ? 'Give Private Lessons' : 'Özel Ders Ver'}</p>
              <p className="text-text-muted text-xs mt-0.5">{isEn ? 'Pro membership required' : 'Pro üyelik gereklidir'}</p>
            </div>
            <span className="text-[10px] text-[#d4a820] bg-[rgba(212,168,32,0.12)] border border-[rgba(212,168,32,0.3)] rounded px-2 py-1 font-bold uppercase tracking-wider flex-shrink-0">PRO</span>
          </div>
        )}
      </div>

      {/* Kurslar */}
      <div>
        <h2 className="font-bebas text-2xl text-text-primary mb-3 flex items-center gap-2">
          {isEn ? 'GROUP COURSES' : 'KURSLAR'}
          {isProIndividual && <ProBadge />}
        </h2>
        {isProIndividual ? (
          <div className="card p-4 flex items-center justify-between">
            <div>
              <p className="text-text-primary text-sm font-medium">{isEn ? 'Course Management' : 'Kurs Yönetimi'}</p>
              <p className="text-text-muted text-xs mt-0.5">{isEn ? 'Group courses with fixed program & schedule' : 'Haftalık programa sahip grup dersleri'}</p>
            </div>
            <Link href="/dashboard/courses" className="btn-accent py-1.5 px-3 text-xs">
              {isEn ? 'Manage →' : 'Yönet →'}
            </Link>
          </div>
        ) : (
          <div className="card p-4 flex items-center gap-3">
            <div className="flex-1">
              <p className="text-text-primary text-sm font-medium">{isEn ? 'Group Courses' : 'Grup Kursu Oluştur'}</p>
              <p className="text-text-muted text-xs mt-0.5">{isEn ? 'Pro membership required' : 'Pro üyelik gereklidir'}</p>
            </div>
            <span className="text-[10px] text-[#d4a820] bg-[rgba(212,168,32,0.12)] border border-[rgba(212,168,32,0.3)] rounded px-2 py-1 font-bold uppercase tracking-wider flex-shrink-0">PRO</span>
          </div>
        )}
      </div>

      {/* Bands */}
      <BandSection
        userId={userId} 
        artistId={artist.id} 
        lookingForBand={artist.looking_for_band}
        onToggleLfb={toggleLfb}
      />

      <div className="mt-8">
        {calendarToken && (
          <div className="mb-4">
            <CalendarSubscribe token={calendarToken} type="artist" />
          </div>
        )}
        <ArtistCalendarSection
          artistId={artist.id}
          isOwner={true}
          initialEvents={events.map((ev) => ({
            id: ev.id,
            event_date: ev.event_date,
            title: ev.title,
            start_time: ev.start_time,
            end_time: ev.end_time ?? null,
            subtitle: ev.venues?.name ?? ev.venue_name ?? ev.bands?.name ?? null,
            status: ev.status,
          }))}
        />
      </div>

      {/* Slot applications */}
      <div>
        <h2 className="font-bebas text-2xl text-text-primary mb-4">{isEn ? 'MY STAGE REQUESTS' : 'SAHNE TALEPLERİM'}</h2>
        {applications.length === 0 ? (
          <div className="card p-6 text-center text-text-muted text-sm">
            <p>{isEn ? 'You have no stage requests yet.' : 'Henüz sahne talebiniz yok.'}</p>
            <Link href="/venues" className="text-accent mt-2 block hover:underline">Mekan ara →</Link>
          </div>
        ) : (
          <div className="space-y-3">
            {applications.map((app: any) => {
              const slot = app.slots
              const venue = slot?.venues
              return (
                <div key={app.id} className="card p-4 flex items-start justify-between gap-3">
                  <div>
                    <p className="font-medium text-text-primary text-sm">{venue?.name}</p>
                    <p className="text-text-muted text-xs mt-0.5">
                      {venue?.district}, {venue?.city} — {dayNames[slot?.day_of_week]} {formatTime(slot?.start_time)}
                    </p>
                    <p className="text-text-muted text-xs mt-1 flex items-center gap-1">
                      <Clock size={10} />
                      {formatDate(app.created_at, locale)}
                    </p>
                  </div>
                  <span className={`chip ${statusColors[app.status] ?? ''} flex-shrink-0`}>
                    {statusLabels[app.status] ?? app.status}
                  </span>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
