'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { DAY_NAMES, formatTime, formatDate } from '@/lib/utils'
import { Clock, Check, X, Search } from 'lucide-react'
import { cn } from '@/lib/utils'
import { BandSection } from '@/components/bands/BandSection'
import { ArtistProfileEditor } from '@/components/artists/ArtistProfileEditor'
import { ArtistCalendarSection } from '@/components/artists/ArtistCalendarSection'

export function ArtistDashboard({ userId }: { userId: string }) {
  const [artist, setArtist] = useState<any>(null)
  const [applications, setApplications] = useState<any[]>([])
  const [pendingInvites, setPendingInvites] = useState<any[]>([])
  const [events, setEvents] = useState<any[]>([])
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
    const { data: artistData } = await supabase
      .from('artists')
      .select('*')
      .eq('profile_id', userId)
      .single()

    setArtist(artistData)

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
          .eq('status', 'accepted')
      ])

      const bandIds = (membershipRes.data ?? []).map((m: any) => m.band_id as string)

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

      const { data: evData } = await eventsQ

      setApplications(appRes.data ?? [])
      
      const realInvites = (inviteRes.data ?? []).filter((inv: any) => inv.role !== 'Applicant')
      setPendingInvites(realInvites)
      setEvents(evData ?? [])
    }
    setLoading(false)
  }

  async function toggleLfb() {
    const next = !artist.looking_for_band
    await supabase.from('artists').update({ looking_for_band: next } as any).eq('id', artist.id)
    setArtist((prev: any) => ({ ...prev, looking_for_band: next }))
  }

  async function handleCancelRequest(eventId: string, approve: boolean) {
    await supabase.from('events').update({
      ...(approve ? { status: 'cancelled' } : {}),
      cancel_requested: false,
    } as any).eq('id', eventId)
    setEvents(prev => approve
      ? prev.filter(e => e.id !== eventId)
      : prev.map(e => e.id === eventId ? { ...e, cancel_requested: false } : e)
    )
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

  if (loading) return <div className="text-text-muted text-sm">Yükleniyor...</div>

  if (!artist) {
    return (
      <div className="card p-6 text-center">
        <p className="text-text-muted text-sm mb-4">Henüz sanatçı profiliniz yok.</p>
        <Link href="/artists/register" className="btn-accent">Profil Oluştur</Link>
      </div>
    )
  }

  const statusColors: Record<string, string> = {
    pending: 'text-yellow-400 bg-yellow-400/10',
    accepted: 'text-success bg-success/10',
    rejected: 'text-red-400 bg-red-400/10',
  }
  const statusLabels: Record<string, string> = {
    pending: 'Beklemede',
    accepted: 'Kabul Edildi',
    rejected: 'Reddedildi',
  }

  return (
    <div className="space-y-8">
      {/* Profile summary */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-bebas text-2xl text-text-primary">PROFİLİM</h2>
          <ArtistProfileEditor
            artistId={artist.id}
            initialData={{
              stage_name: artist.stage_name,
              city: artist.city,
              genres: artist.genres,
              instruments: artist.instruments,
              bio: artist.bio,
              social_links: artist.social_links,
            }}
          />
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
              <h4 className="text-xs font-medium text-text-muted mb-2 uppercase tracking-wider">Hakkında</h4>
              <p className="text-sm text-text-primary leading-relaxed">{artist.bio}</p>
            </div>
          )}

          {artist.instruments && artist.instruments.length > 0 && (
            <div className="pt-4 border-t border-[rgba(228,224,216,0.1)]">
              <h4 className="text-xs font-medium text-text-muted mb-2 uppercase tracking-wider">Enstrümanlar</h4>
              <div className="flex flex-wrap gap-1.5">
                {artist.instruments.map((i: string) => (
                  <span key={i} className="chip bg-[rgba(228,224,216,0.06)] text-text-muted border border-[rgba(228,224,216,0.1)]">{i}</span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Pending band invitations */}
      {pendingInvites.length > 0 && (
        <div>
          <h2 className="font-bebas text-2xl text-text-primary mb-4">GRUP DAVETLERİ</h2>
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
                      {formatDate(invite.invited_at)}
                    </p>
                  </div>
                  <div className="flex gap-2 flex-shrink-0">
                    <button
                      onClick={() => respondInvite(invite.id, false)}
                      title="Reddet"
                      className="w-8 h-8 rounded-md bg-red-400/10 text-red-400 flex items-center justify-center hover:bg-red-400/20 transition-colors"
                    >
                      <X size={14} />
                    </button>
                    <button
                      onClick={() => respondInvite(invite.id, true)}
                      title="Kabul Et"
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
          <h2 className="font-bebas text-2xl text-text-primary mb-1">İPTAL TALEPLERİ</h2>
          <p className="text-text-muted text-xs mb-3">Mekan sahibi aşağıdaki etkinlikleri iptal etmek istiyor.</p>
          <div className="space-y-3">
            {events.filter((e: any) => e.cancel_requested).map((ev: any) => (
              <div key={ev.id} className="card p-4 border-yellow-400/30">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-text-primary text-sm truncate">{ev.title}</p>
                    <p className="text-text-muted text-xs mt-0.5">
                      {ev.venues?.name ?? ev.venue_name} · {formatDate(ev.event_date)} {formatTime(ev.start_time)}
                    </p>
                  </div>
                  <div className="flex gap-2 flex-shrink-0">
                    <button
                      onClick={() => handleCancelRequest(ev.id, false)}
                      title="Reddet"
                      className="w-8 h-8 rounded-md bg-success/10 text-success flex items-center justify-center hover:bg-success/20 transition-colors"
                    >
                      <Check size={14} />
                    </button>
                    <button
                      onClick={() => handleCancelRequest(ev.id, true)}
                      title="Onayla — etkinlik iptal edilir"
                      className="w-8 h-8 rounded-md bg-red-400/10 text-red-400 flex items-center justify-center hover:bg-red-400/20 transition-colors"
                    >
                      <X size={14} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Bands */}
      <BandSection
        userId={userId} 
        artistId={artist.id} 
        lookingForBand={artist.looking_for_band}
        onToggleLfb={toggleLfb}
      />

      <div className="mt-8">
        <ArtistCalendarSection
          artistId={artist.id}
          isOwner={true}
          initialEvents={events.map((ev) => ({
            id: ev.id,
            event_date: ev.event_date,
            title: ev.title,
            start_time: ev.start_time,
            end_time: ev.end_time ?? null,
            subtitle: ev.venue_name ?? ev.venues?.name ?? ev.bands?.name ?? null,
            status: ev.status,
          }))}
        />
      </div>

      {/* Slot applications */}
      <div>
        <h2 className="font-bebas text-2xl text-text-primary mb-4">SAHNE TALEPLERİM</h2>
        {applications.length === 0 ? (
          <div className="card p-6 text-center text-text-muted text-sm">
            <p>Henüz sahne talebiniz yok.</p>
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
                      {venue?.district}, {venue?.city} — {DAY_NAMES[slot?.day_of_week]} {formatTime(slot?.start_time)}
                    </p>
                    <p className="text-text-muted text-xs mt-1 flex items-center gap-1">
                      <Clock size={10} />
                      {formatDate(app.created_at)}
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
