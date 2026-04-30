'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { DAY_NAMES, formatTime, formatDate } from '@/lib/utils'
import { MapPin, Check, X, Clock, CalendarX } from 'lucide-react'

export function VenueDashboard({ userId }: { userId: string }) {
  const [venues, setVenues] = useState<any[]>([])
  const [applications, setApplications] = useState<any[]>([])
  const [eventRequests, setEventRequests] = useState<any[]>([])
  const [confirmedEvents, setConfirmedEvents] = useState<any[]>([])
  const [cancelConfirm, setCancelConfirm] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    loadData()

    const channel = supabase
      .channel('venue-applications')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'applications' }, () => {
        loadData()
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function loadData() {
    const { data: venueData } = await supabase
      .from('venues')
      .select('*, slots(*, applications(*))')
      .eq('owner_id', userId)

    const slotIds = venueData?.flatMap((v: any) => v.slots?.map((s: any) => s.id) ?? []) ?? []
    const venueIds = venueData?.map((v: any) => v.id) ?? []

    const [appRes, eventReqRes, confirmedRes] = await Promise.all([
      slotIds.length > 0
        ? supabase
            .from('applications')
            .select('*, artists(*, profiles(*)), slots(*, venues(*)), bands(name)')
            .eq('status', 'pending')
            .in('slot_id', slotIds)
            .order('created_at', { ascending: false })
        : Promise.resolve({ data: [] }),
      venueIds.length > 0
        ? supabase
            .from('events')
            .select('id, title, event_date, start_time, end_time, created_at, artists(id, stage_name), bands(name)')
            .eq('status', 'pending')
            .in('venue_id', venueIds)
            .order('created_at', { ascending: false })
        : Promise.resolve({ data: [] }),
      venueIds.length > 0
        ? supabase
            .from('events')
            .select('id, title, event_date, start_time, end_time, cancel_requested, artists(stage_name), bands(name), venues(name)')
            .eq('status', 'confirmed')
            .in('venue_id', venueIds)
            .gte('event_date', new Date().toISOString().split('T')[0])
            .order('event_date', { ascending: true })
        : Promise.resolve({ data: [] }),
    ])

    setVenues(venueData ?? [])
    setApplications(appRes.data ?? [])
    setEventRequests(eventReqRes.data ?? [])
    setConfirmedEvents(confirmedRes.data ?? [])
    setLoading(false)
  }

  async function handleApplication(appId: string, status: 'accepted' | 'rejected') {
    if (status === 'accepted') {
      const app = applications.find((a) => a.id === appId)
      if (app?.slots) {
        const slot = app.slots
        const artist = app.artists
        await supabase.from('events').insert({
          venue_id: slot.venues?.id,
          artist_id: app.artist_id,
          slot_id: app.slot_id,
          band_id: app.band_id ?? null,
          title: `${(slot as any).event_type ?? 'Konser'} — ${artist?.stage_name ?? ''}`,
          event_date: (app as any).event_date ?? new Date().toISOString().slice(0, 10),
          start_time: slot.start_time,
          end_time: slot.end_time,
          genre: artist?.genres?.[0] ?? null,
          entry_type: 'free' as const,
          status: 'confirmed' as const,
        } as any)
      }
    }
    await supabase.from('applications').update({ status } as any).eq('id', appId)
    setApplications((prev) => prev.filter((a) => a.id !== appId))
  }

  async function handleEventRequest(eventId: string, approve: boolean) {
    await supabase
      .from('events')
      .update({ status: approve ? 'confirmed' : 'cancelled' } as any)
      .eq('id', eventId)
    setEventRequests(prev => prev.filter(e => e.id !== eventId))
  }

  async function requestCancel(eventId: string) {
    await supabase.from('events').update({ cancel_requested: true } as any).eq('id', eventId)
    setConfirmedEvents(prev => prev.map(e => e.id === eventId ? { ...e, cancel_requested: true } : e))
    setCancelConfirm(null)
  }

  if (loading) return <div className="text-text-muted text-sm">Yükleniyor...</div>

  return (
    <div className="space-y-8">
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-bebas text-2xl text-text-primary">MEKANLARIM</h2>
          <Link href="/venues/register" className="btn-accent text-sm py-1.5">+ Mekan Ekle</Link>
        </div>
        {venues.length === 0 ? (
          <div className="card p-6 text-center text-text-muted text-sm">
            <p>Henüz mekanınız yok.</p>
            <Link href="/venues/register" className="text-accent mt-2 block hover:underline">Mekan ekle →</Link>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {venues.map((venue: any) => {
              const openSlots = venue.slots?.filter((s: any) => s.status === 'open').length ?? 0
              const totalApps = venue.slots?.reduce((sum: number, s: any) => sum + (s.applications?.length ?? 0), 0) ?? 0
              return (
                <Link key={venue.id} href={`/venues/${venue.id}`} className="card p-4 hover:border-accent/30 transition-colors block">
                  <h3 className="font-semibold text-text-primary">{venue.name}</h3>
                  <div className="flex items-center gap-1 text-text-muted text-xs mt-0.5">
                    <MapPin size={10} />
                    {venue.district}, {venue.city}
                  </div>
                  <div className="flex gap-4 mt-3 text-xs">
                    <div><span className="font-bebas text-lg text-accent">{openSlots}</span><span className="text-text-muted ml-1">açık slot</span></div>
                    <div><span className="font-bebas text-lg text-text-primary">{totalApps}</span><span className="text-text-muted ml-1">başvuru</span></div>
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </div>

      {eventRequests.length > 0 && (
        <div>
          <h2 className="font-bebas text-2xl text-text-primary mb-4">ETKİNLİK TALEPLERİ</h2>
          <p className="text-text-muted text-xs mb-3 -mt-2">Sanatçıların manuel olarak eklediği etkinlikler — mekanınızı seçmişler, onayınızı bekliyorlar.</p>
          <div className="space-y-3">
            {eventRequests.map((ev: any) => (
              <div key={ev.id} className="card p-4 border-yellow-400/20">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <p className="font-medium text-text-primary text-sm">{ev.title}</p>
                    <p className="text-text-muted text-xs mt-0.5">
                      {ev.artists?.stage_name} · {formatDate(ev.event_date)} {formatTime(ev.start_time)}
                      {ev.end_time ? ` – ${formatTime(ev.end_time)}` : ''}
                    </p>
                    <p className="text-text-muted text-xs mt-1 flex items-center gap-1">
                      <Clock size={10} />
                      {formatDate(ev.created_at)}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleEventRequest(ev.id, true)}
                      className="w-8 h-8 rounded-lg bg-success/10 text-success hover:bg-success/20 flex items-center justify-center transition-colors"
                      title="Onayla"
                    >
                      <Check size={14} />
                    </button>
                    <button
                      onClick={() => handleEventRequest(ev.id, false)}
                      className="w-8 h-8 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 flex items-center justify-center transition-colors"
                      title="Reddet"
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

      {confirmedEvents.length > 0 && (
        <div>
          <h2 className="font-bebas text-2xl text-text-primary mb-4">ONAYLANAN ETKİNLİKLER</h2>
          <div className="space-y-3">
            {confirmedEvents.map((ev: any) => (
              <div key={ev.id} className={`card p-4 ${ev.cancel_requested ? 'border-yellow-400/30' : ''}`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-text-primary text-sm truncate">{ev.title}</p>
                    <p className="text-text-muted text-xs mt-0.5">
                      {ev.artists?.stage_name ?? ev.bands?.name} · {formatDate(ev.event_date)} {formatTime(ev.start_time)}
                    </p>
                    {ev.cancel_requested && (
                      <span className="inline-block mt-1 text-[10px] px-1.5 py-0.5 rounded bg-yellow-400/15 text-yellow-400 border border-yellow-400/20">
                        İptal onayı bekleniyor
                      </span>
                    )}
                  </div>
                  {!ev.cancel_requested && (
                    cancelConfirm === ev.id ? (
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span className="text-xs text-text-muted">İptal talebi gönderilsin mi?</span>
                        <button onClick={() => requestCancel(ev.id)} className="text-xs text-red-400 hover:text-red-300 font-medium">Evet</button>
                        <button onClick={() => setCancelConfirm(null)} className="text-xs text-text-muted hover:text-text-primary">Vazgeç</button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setCancelConfirm(ev.id)}
                        className="flex-shrink-0 flex items-center gap-1.5 text-xs text-text-muted hover:text-red-400 transition-colors"
                      >
                        <CalendarX size={13} />
                        İptal Talebi
                      </button>
                    )
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {applications.length > 0 && (
        <div>
          <h2 className="font-bebas text-2xl text-text-primary mb-4">BEKLEYEN BAŞVURULAR</h2>
          <div className="space-y-3">
            {applications.map((app: any) => (
              <div key={app.id} className="card p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <p className="font-medium text-text-primary text-sm">{app.artists?.stage_name}</p>
                    <p className="text-text-muted text-xs mt-0.5">
                      {app.slots?.venues?.name} — {
                        (app as any).event_date
                          ? formatDate((app as any).event_date)
                          : DAY_NAMES[app.slots?.day_of_week]
                      } {formatTime(app.slots?.start_time)}
                    </p>
                    {(app as any).bands?.name && (
                      <p className="text-text-muted text-xs mt-0.5">Grup: {(app as any).bands.name}</p>
                    )}
                    {app.message && (
                      <p className="text-text-muted text-xs mt-2 italic">&ldquo;{app.message}&rdquo;</p>
                    )}
                    <p className="text-text-muted text-xs mt-1 flex items-center gap-1">
                      <Clock size={10} />
                      {formatDate(app.created_at)}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleApplication(app.id, 'accepted')}
                      className="w-8 h-8 rounded-lg bg-success/10 text-success hover:bg-success/20 flex items-center justify-center transition-colors"
                    >
                      <Check size={14} />
                    </button>
                    <button
                      onClick={() => handleApplication(app.id, 'rejected')}
                      className="w-8 h-8 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 flex items-center justify-center transition-colors"
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
    </div>
  )
}
