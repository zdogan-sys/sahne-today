'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useLocale } from 'next-intl'
import { createClient } from '@/lib/supabase/client'
import { getDayNames, formatTime, formatDate } from '@/lib/utils'
import { MapPin, Check, X, Clock, CalendarX, SendHorizonal } from 'lucide-react'
import { cn } from '@/lib/utils'
import { withdrawVenueOffer } from '@/app/actions/offer'
import { respondToSlotApplication } from '@/app/actions/venue'
import { OfferCountdown } from '@/components/ui/OfferCountdown'
import { CalendarSubscribe } from '@/components/ui/CalendarSubscribe'

export function VenueDashboard({ userId, calendarToken }: { userId: string; calendarToken: string | null }) {
  const locale = useLocale()
  const isEn = locale === 'en'
  const dayNames = getDayNames(locale)
  const [venues, setVenues] = useState<any[]>([])
  const [studioReservations, setStudioReservations] = useState<any[]>([])
  const [applications, setApplications] = useState<any[]>([])
  const [eventRequests, setEventRequests] = useState<any[]>([])
  const [confirmedEvents, setConfirmedEvents] = useState<any[]>([])
  const [offeredEvents, setOfferedEvents] = useState<any[]>([])
  const [coursesAtVenues, setCoursesAtVenues] = useState<any[]>([])
  const [teachingSlotsAtVenues, setTeachingSlotsAtVenues] = useState<any[]>([])
  const [withdrawConfirm, setWithdrawConfirm] = useState<string | null>(null)
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
      .select('id, name, city, district, venue_type, venue_subtype, is_pro_venue, photo_url, slots(*, applications(*))')

    const slotIds = venueData?.flatMap((v: any) => v.slots?.map((s: any) => s.id) ?? []) ?? []
    const venueIds = venueData?.map((v: any) => v.id) ?? []

    const [appRes, eventReqRes, confirmedRes, offeredRes, coursesRes, slotsRes] = await Promise.all([
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
      venueIds.length > 0
        ? supabase
            .from('events')
            .select('id, title, event_date, start_time, expires_at, artists(id, stage_name), bands(id, name)')
            .eq('status', 'offered')
            .in('venue_id', venueIds)
            .order('expires_at', { ascending: true })
        : Promise.resolve({ data: [] }),
      venueIds.length > 0
        ? supabase
            .from('courses')
            .select('id, title, category, level, venues(name)')
            .in('venue_id', venueIds)
            .eq('status', 'active')
            .order('created_at', { ascending: false })
        : Promise.resolve({ data: [] }),
      venueIds.length > 0
        ? supabase
            .from('teaching_slots')
            .select('id, instrument, day_of_week, start_time, end_time, venues(name)')
            .in('venue_id', venueIds)
            .eq('is_active', true)
        : Promise.resolve({ data: [] }),
    ])

    setVenues(venueData ?? [])
    setApplications(appRes.data ?? [])
    setEventRequests(eventReqRes.data ?? [])
    setConfirmedEvents(confirmedRes.data ?? [])
    setOfferedEvents(offeredRes.data ?? [])
    setCoursesAtVenues(coursesRes.data ?? [])
    setTeachingSlotsAtVenues(slotsRes.data ?? [])

    const studioVenueIds = (venueData ?? [])
      .filter((v: any) => v.venue_subtype === 'studio' || v.venue_subtype === 'dance_studio')
      .map((v: any) => v.id)

    if (studioVenueIds.length > 0) {
      const { data: reservations } = await supabase
        .from('studio_reservations')
        .select('id, venue_id, reserver_name, reserver_email, reserver_phone, reservation_date, start_time, end_time, total_price, status, created_at, venues(name)')
        .in('venue_id', studioVenueIds)
        .in('status', ['pending', 'confirmed'])
        .order('reservation_date', { ascending: true })
      setStudioReservations(reservations ?? [])
    }

    setLoading(false)
  }

  async function handleApplication(appId: string, status: 'accepted' | 'rejected') {
    await respondToSlotApplication(appId, status)
    setApplications((prev) => prev.filter((a) => a.id !== appId))
  }

  async function handleEventRequest(eventId: string, approve: boolean) {
    await supabase
      .from('events')
      .update({ status: approve ? 'confirmed' : 'cancelled' } as any)
      .eq('id', eventId)
    setEventRequests(prev => prev.filter(e => e.id !== eventId))
    if (approve) {
      fetch('/api/internal/notify-followers', { method: 'POST', body: JSON.stringify({ eventId }), headers: { 'Content-Type': 'application/json' } }).catch(() => {})
    }
  }

  async function handleWithdraw(eventId: string) {
    const res = await withdrawVenueOffer(eventId)
    if (res.success) {
      setOfferedEvents(prev => prev.filter(e => e.id !== eventId))
    }
    setWithdrawConfirm(null)
  }

  async function requestCancel(eventId: string) {
    await supabase.from('events').update({ cancel_requested: true } as any).eq('id', eventId)
    setConfirmedEvents(prev => prev.map(e => e.id === eventId ? { ...e, cancel_requested: true } : e))
    setCancelConfirm(null)
  }

  if (loading) return <div className="text-text-muted text-sm">{isEn ? 'Loading...' : 'Yükleniyor...'}</div>

  return (
    <div className="space-y-8">
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-bebas text-2xl text-text-primary">{isEn ? 'MY VENUES' : 'MEKANLARIM'}</h2>
          <Link href="/venues/register" className="btn-accent text-sm py-1.5">{isEn ? '+ Add Venue' : '+ Mekan Ekle'}</Link>
        </div>
        {calendarToken && (
          <div className="mb-4">
            <CalendarSubscribe token={calendarToken} type="venue" />
          </div>
        )}
        {venues.length === 0 ? (
          <div className="card p-6 text-center text-text-muted text-sm">
            <p>{isEn ? "You don't have a venue yet." : 'Henüz mekanınız yok.'}</p>
            <Link href="/venues/register" className="text-accent mt-2 block hover:underline">{isEn ? 'Add venue →' : 'Mekan ekle →'}</Link>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {venues.map((venue: any) => {
              const openSlots    = venue.slots?.filter((s: any) => s.status === 'open').length ?? 0
              const pendingSlots = venue.slots?.filter((s: any) => s.status === 'pending').length ?? 0
              const bookedSlots  = venue.slots?.filter((s: any) => s.status === 'booked').length ?? 0
              const totalSlots   = openSlots + pendingSlots + bookedSlots
              const occupancyRate = totalSlots > 0 ? Math.round((bookedSlots / totalSlots) * 100) : null
              return (
                <Link key={venue.id} href={`/venues/${venue.id}`} className="card p-4 hover:border-accent/30 transition-colors block">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="font-semibold text-text-primary">{venue.name}</h3>
                      <div className="flex items-center gap-1 text-text-muted text-xs mt-0.5">
                        <MapPin size={10} />
                        {venue.district}, {venue.city}
                      </div>
                    </div>
                    {occupancyRate !== null && (
                      <div className="text-right flex-shrink-0">
                        <p className="font-bebas text-2xl text-accent leading-none">%{occupancyRate}</p>
                        <p className="text-[9px] text-text-muted uppercase tracking-wide">{isEn ? 'Full' : 'Dolu'}</p>
                      </div>
                    )}
                  </div>
                  {totalSlots > 0 && (
                    <div className="mt-3 h-1.5 rounded-full bg-[rgba(228,224,216,0.08)] overflow-hidden">
                      <div
                        className="h-full rounded-full bg-accent transition-all"
                        style={{ width: `${occupancyRate ?? 0}%` }}
                      />
                    </div>
                  )}
                  <div className="flex gap-3 mt-3 flex-wrap">
                    {openSlots > 0 && (
                      <span style={{ backgroundColor: 'rgba(29,158,117,0.15)', color: '#1D9E75', fontSize: '10px', padding: '3px 9px', borderRadius: '3px', fontWeight: 500, textTransform: 'uppercase' }}>
                        {openSlots} {isEn ? 'Open' : 'Açık'}
                      </span>
                    )}
                    {pendingSlots > 0 && (
                      <span style={{ backgroundColor: 'rgba(212,168,32,0.15)', color: '#d4a820', fontSize: '10px', padding: '3px 9px', borderRadius: '3px', fontWeight: 500, textTransform: 'uppercase' }}>
                        {pendingSlots} Bekliyor
                      </span>
                    )}
                    {bookedSlots > 0 && (
                      <span style={{ backgroundColor: 'rgba(143,136,212,0.15)', color: '#8f88d4', fontSize: '10px', padding: '3px 9px', borderRadius: '3px', fontWeight: 500, textTransform: 'uppercase' }}>
                        {bookedSlots} Dolu
                      </span>
                    )}
                    {openSlots === 0 && pendingSlots === 0 && bookedSlots === 0 && (
                      <span className="text-text-muted text-xs">{isEn ? 'No slots' : 'Slot yok'}</span>
                    )}
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </div>

      {offeredEvents.length > 0 && (
        <div>
          <h2 className="font-bebas text-2xl text-text-primary mb-1">{isEn ? 'SENT OFFERS' : 'GÖNDERİLEN TEKLİFLER'}</h2>
          <p className="text-text-muted text-xs mb-3 -mt-2">{isEn ? "Waiting for the artist's response." : 'Sanatçının yanıtını bekliyorsunuz.'}</p>
          <div className="space-y-3">
            {offeredEvents.map((ev: any) => (
              <div key={ev.id} className="card p-4 border-accent/20">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-text-primary text-sm">{ev.title}</p>
                    <p className="text-text-muted text-xs mt-0.5">
                      {ev.artists?.stage_name ?? ev.bands?.name} · {formatDate(ev.event_date, locale)} {formatTime(ev.start_time)}
                    </p>
                    <div className="flex items-center gap-3 mt-1.5">
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-accent/15 text-accent border border-accent/20 flex items-center gap-1">
                        <SendHorizonal size={9} /> {isEn ? 'Awaiting Response' : 'Yanıt Bekleniyor'}
                      </span>
                      {ev.expires_at && <OfferCountdown expiresAt={ev.expires_at} />}
                    </div>
                  </div>
                  <div className="flex-shrink-0">
                    {withdrawConfirm === ev.id ? (
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-text-muted">{isEn ? 'Withdraw?' : 'Geri çekilsin mi?'}</span>
                        <button onClick={() => handleWithdraw(ev.id)} className="text-xs text-red-400 hover:text-red-300 font-medium">Evet</button>
                        <button onClick={() => setWithdrawConfirm(null)} className="text-xs text-text-muted hover:text-text-primary">{isEn ? 'Never mind' : 'Vazgeç'}</button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setWithdrawConfirm(ev.id)}
                        className="text-xs text-text-muted hover:text-red-400 transition-colors flex items-center gap-1"
                      >
                        <X size={12} /> {isEn ? 'Withdraw' : 'Geri Çek'}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {eventRequests.length > 0 && (
        <div>
          <h2 className="font-bebas text-2xl text-text-primary mb-4">{isEn ? 'EVENT REQUESTS' : 'ETKİNLİK TALEPLERİ'}</h2>
          <p className="text-text-muted text-xs mb-3 -mt-2">{isEn ? 'Events manually added by artists — they selected your venue and are awaiting your approval.' : 'Sanatçıların manuel olarak eklediği etkinlikler — mekanınızı seçmişler, onayınızı bekliyorlar.'}</p>
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
                      {formatDate(ev.created_at, locale)}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleEventRequest(ev.id, true)}
                      className="w-8 h-8 rounded-lg bg-success/10 text-success hover:bg-success/20 flex items-center justify-center transition-colors"
                      title={isEn ? 'Approve' : 'Onayla'}
                    >
                      <Check size={14} />
                    </button>
                    <button
                      onClick={() => handleEventRequest(ev.id, false)}
                      className="w-8 h-8 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 flex items-center justify-center transition-colors"
                      title={isEn ? 'Reject' : 'Reddet'}
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
          <h2 className="font-bebas text-2xl text-text-primary mb-4">{isEn ? 'CONFIRMED EVENTS' : 'ONAYLANAN ETKİNLİKLER'}</h2>
          <div className="space-y-3">
            {confirmedEvents.map((ev: any) => (
              <div key={ev.id} className={`card p-4 ${ev.cancel_requested ? 'border-yellow-400/30' : ''}`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-text-primary text-sm truncate">{ev.title}</p>
                    <p className="text-text-muted text-xs mt-0.5">
                      {ev.artists?.stage_name ?? ev.bands?.name} · {formatDate(ev.event_date, locale)} {formatTime(ev.start_time)}
                    </p>
                    {ev.cancel_requested && (
                      <span className="inline-block mt-1 text-[10px] px-1.5 py-0.5 rounded bg-yellow-400/15 text-yellow-400 border border-yellow-400/20">
                        {isEn ? 'Awaiting cancellation approval' : 'İptal onayı bekleniyor'}
                      </span>
                    )}
                  </div>
                  {!ev.cancel_requested && (
                    cancelConfirm === ev.id ? (
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span className="text-xs text-text-muted">{isEn ? 'Send cancellation request?' : 'İptal talebi gönderilsin mi?'}</span>
                        <button onClick={() => requestCancel(ev.id)} className="text-xs text-red-400 hover:text-red-300 font-medium">{isEn ? 'Yes' : 'Evet'}</button>
                        <button onClick={() => setCancelConfirm(null)} className="text-xs text-text-muted hover:text-text-primary">{isEn ? 'Never mind' : 'Vazgeç'}</button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setCancelConfirm(ev.id)}
                        className="flex-shrink-0 flex items-center gap-1.5 text-xs text-text-muted hover:text-red-400 transition-colors"
                      >
                        <CalendarX size={13} />
                        {isEn ? 'Cancel Request' : 'İptal Talebi'}
                      </button>
                    )
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Kurslar & Dersler */}
      {(coursesAtVenues.length > 0 || teachingSlotsAtVenues.length > 0) && (
        <div>
          <h2 className="font-bebas text-2xl text-text-primary mb-4">{isEn ? 'COURSES & LESSONS' : 'KURSLAR & DERSLER'}</h2>
          <div className="grid gap-4 md:grid-cols-2">
            {venues.map(v => {
              const venueCourses = coursesAtVenues.filter(c => c.venues?.name === v.name)
              const venueSlots = teachingSlotsAtVenues.filter(s => s.venues?.name === v.name)
              if (venueCourses.length === 0 && venueSlots.length === 0) return null
              return (
                <Link key={v.id} href={`/dashboard/venue/${v.id}/courses`} className="card p-4 hover:border-accent/30 transition-colors block">
                  <p className="font-semibold text-text-primary text-sm">{v.name}</p>
                  <div className="flex gap-3 mt-2.5">
                    {venueCourses.length > 0 && (
                      <Link href={`/dashboard/venue/${v.id}/courses`} className="flex-1 text-center py-2 rounded-lg bg-accent/10 text-accent text-xs font-medium hover:bg-accent/20 transition-colors">
                        {venueCourses.length} {isEn ? 'Courses' : 'Kurs'}
                      </Link>
                    )}
                    {venueSlots.length > 0 && (
                      <Link href={`/dashboard/venue/${v.id}/teaching-slots`} className="flex-1 text-center py-2 rounded-lg bg-accent/10 text-accent text-xs font-medium hover:bg-accent/20 transition-colors">
                        {venueSlots.length} {isEn ? 'Lessons' : 'Ders'}
                      </Link>
                    )}
                  </div>
                </Link>
              )
            })}
          </div>
        </div>
      )}

      {/* Stüdyo rezervasyonları */}
      {studioReservations.length > 0 && (
        <div>
          <h2 className="font-bebas text-2xl text-text-primary mb-1">{isEn ? 'STUDIO RESERVATIONS' : 'STÜDYO REZERVASYONLARI'}</h2>
          <p className="text-text-muted text-xs mb-3 -mt-2">
            {isEn ? 'Manage incoming studio booking requests.' : 'Gelen stüdyo rezervasyon taleplerini yönetin.'}
          </p>
          <div className="space-y-3">
            {studioReservations.map((res: any) => (
              <StudioReservationCard key={res.id} reservation={res} isEn={isEn} onUpdate={(id, status) => {
                setStudioReservations(prev => prev.map(r => r.id === id ? { ...r, status } : r))
                supabase.from('studio_reservations').update({ status } as any).eq('id', id).then(() => {})
              }} />
            ))}
          </div>
        </div>
      )}

      {applications.length > 0 && (
        <div>
          <h2 className="font-bebas text-2xl text-text-primary mb-4">{isEn ? 'PENDING APPLICATIONS' : 'BEKLEYEN BAŞVURULAR'}</h2>
          <div className="space-y-3">
            {applications.map((app: any) => (
              <div key={app.id} className="card p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <p className="font-medium text-text-primary text-sm">{app.artists?.stage_name}</p>
                    <p className="text-text-muted text-xs mt-0.5">
                      {app.slots?.venues?.name} — {
                        (app as any).event_date
                          ? formatDate((app as any).event_date, locale)
                          : dayNames[app.slots?.day_of_week]
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
                      {formatDate(app.created_at, locale)}
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

function StudioReservationCard({
  reservation, isEn, onUpdate,
}: {
  reservation: any
  isEn: boolean
  onUpdate: (id: string, status: string) => void
}) {
  const [acting, setActing] = useState(false)

  async function handle(status: 'confirmed' | 'cancelled') {
    setActing(true)
    onUpdate(reservation.id, status)
    setActing(false)
  }

  const statusColor = reservation.status === 'confirmed'
    ? 'text-success bg-success/10 border-success/20'
    : 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20'

  return (
    <div className="card p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <p className="font-medium text-text-primary text-sm">{reservation.reserver_name}</p>
          <p className="text-text-muted text-xs mt-0.5">
            {reservation.reservation_date} · {reservation.start_time?.slice(0, 5)}–{reservation.end_time?.slice(0, 5)}
          </p>
          <p className="text-text-muted text-xs mt-0.5">
            {reservation.reserver_email} · {reservation.reserver_phone}
          </p>
          <div className="flex items-center gap-2 mt-1.5">
            <span className={cn('text-[10px] px-1.5 py-0.5 rounded border', statusColor)}>
              {reservation.status === 'confirmed' ? (isEn ? 'Confirmed' : 'Onaylandı') : (isEn ? 'Pending' : 'Bekliyor')}
            </span>
            <span className="font-bebas text-base text-accent">₺{reservation.total_price}</span>
          </div>
        </div>
        {reservation.status === 'pending' && (
          <div className="flex gap-2 flex-shrink-0">
            <button
              onClick={() => handle('confirmed')}
              disabled={acting}
              className="w-8 h-8 rounded-lg bg-success/10 text-success hover:bg-success/20 flex items-center justify-center transition-colors disabled:opacity-50"
              title={isEn ? 'Confirm' : 'Onayla'}
            >
              <Check size={14} />
            </button>
            <button
              onClick={() => handle('cancelled')}
              disabled={acting}
              className="w-8 h-8 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 flex items-center justify-center transition-colors disabled:opacity-50"
              title={isEn ? 'Reject' : 'Reddet'}
            >
              <X size={14} />
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
