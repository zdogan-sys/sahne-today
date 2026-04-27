'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { DAY_NAMES, formatTime, formatDate } from '@/lib/utils'
import { Clock, Check, X, Search } from 'lucide-react'
import { cn } from '@/lib/utils'
import { BandSection } from '@/components/bands/BandSection'

export function ArtistDashboard({ userId }: { userId: string }) {
  const [artist, setArtist] = useState<any>(null)
  const [applications, setApplications] = useState<any[]>([])
  const [pendingInvites, setPendingInvites] = useState<any[]>([])
  const [upcomingEvents, setUpcomingEvents] = useState<any[]>([])
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
      const today = new Date().toISOString().slice(0, 10)
      const [appRes, inviteRes, eventRes] = await Promise.all([
        supabase
          .from('applications')
          .select('*, slots(*, venues(name, city, district))')
          .eq('artist_id', artistData.id)
          .order('created_at', { ascending: false }),
        supabase
          .from('band_members')
          .select('id, invited_at, bands(id, name, genres, city)')
          .eq('artist_id', artistData.id)
          .eq('status', 'invited'),
        supabase
          .from('events')
          .select('id, title, event_date, start_time, venues(name, city)')
          .eq('artist_id', artistData.id)
          .eq('status', 'confirmed')
          .gte('event_date', today)
          .order('event_date', { ascending: true })
          .limit(5),
      ])
      setApplications(appRes.data ?? [])
      setPendingInvites(inviteRes.data ?? [])
      setUpcomingEvents(eventRes.data ?? [])
    }
    setLoading(false)
  }

  async function toggleLfb() {
    const next = !artist.looking_for_band
    await supabase.from('artists').update({ looking_for_band: next } as any).eq('id', artist.id)
    setArtist((prev: any) => ({ ...prev, looking_for_band: next }))
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
          <Link href={`/artists/${artist.id}`} className="text-accent text-sm hover:underline">Profili Gör →</Link>
        </div>
        <div className="card p-4">
          <h3 className="font-semibold text-text-primary">{artist.stage_name}</h3>
          <p className="text-text-muted text-xs mt-0.5">{artist.city}</p>
          <div className="flex flex-wrap gap-1.5 mt-2">
            {artist.genres?.map((g: string) => (
              <span key={g} className="chip bg-accent/10 text-accent border border-accent/20">{g}</span>
            ))}
          </div>
          <button
            onClick={toggleLfb}
            className={cn(
              'mt-3 flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-md border transition-colors',
              artist.looking_for_band
                ? 'bg-accent/10 text-accent border-accent/30'
                : 'bg-transparent text-text-muted border-[rgba(228,224,216,0.12)] hover:text-text-primary'
            )}
          >
            <Search size={11} />
            {artist.looking_for_band ? 'Grup arıyorum · Aktif' : 'Grup arıyorum'}
          </button>
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

      {/* Upcoming events */}
      {upcomingEvents.length > 0 && (
        <div>
          <h2 className="font-bebas text-2xl text-text-primary mb-4">YAKLAŞAN ETKİNLİKLER</h2>
          <div className="space-y-2">
            {upcomingEvents.map((ev: any) => (
              <Link key={ev.id} href={`/events/${ev.id}`} className="card p-4 flex items-center justify-between gap-3 hover:border-accent/30 transition-colors block">
                <div>
                  <p className="font-medium text-text-primary text-sm">{ev.title}</p>
                  <p className="text-text-muted text-xs mt-0.5">
                    {ev.venues?.name} · {formatDate(ev.event_date)} {formatTime(ev.start_time)}
                  </p>
                </div>
                <span className="chip bg-success/10 text-success border-success/20 flex-shrink-0">Onaylandı</span>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Bands */}
      <BandSection userId={userId} artistId={artist.id} />

      {/* Slot applications */}
      <div>
        <h2 className="font-bebas text-2xl text-text-primary mb-4">BAŞVURULARIM</h2>
        {applications.length === 0 ? (
          <div className="card p-6 text-center text-text-muted text-sm">
            <p>Henüz başvurunuz yok.</p>
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
