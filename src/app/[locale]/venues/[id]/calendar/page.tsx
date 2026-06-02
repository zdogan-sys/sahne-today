export const dynamic = 'force-dynamic'

import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { getLocale } from 'next-intl/server'
import { isAdminUser } from '@/lib/admin'
import { VenueCalendar } from '@/components/venues/VenueCalendar'
import { VenueCalendarSubscribe } from '@/components/venues/VenueCalendarSubscribe'
import { getDayNames, formatTime, formatDate } from '@/lib/utils'

interface Props {
  params: Promise<{ id: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params
  const supabase = await createClient()
  const { data } = await supabase.from('venues').select('name').eq('id', id).single()
  return { title: data ? `${(data as any).name} · Takvim` : 'Takvim' }
}

export default async function VenueCalendarPage({ params }: Props) {
  const { id } = await params
  const locale = await getLocale()
  const isEn = locale === 'en'
  const dayNames = getDayNames(locale)
  const supabase = await createClient()

  const { data: venue } = await supabase
    .from('venues')
    .select('id, name, owner_id, city')
    .eq('id', id)
    .single()

  if (!venue) notFound()
  const v = venue as any

  const { data: { user } } = await supabase.auth.getUser()

  const artistRes = user
    ? await supabase.from('artists').select('id').eq('profile_id', user.id).single()
    : null
  const artistId = artistRes?.data?.id ?? null
  const isOwner = user?.id === v.owner_id || isAdminUser(user)

  const canApply = !!artistId
  const canSeeSlots = canApply || isOwner

  const today = new Date().toISOString().split('T')[0]

  const isStudioType = ['studio', 'dance_studio', 'music_school'].includes((venue as any).venue_type ?? '')

  const [slotsRes, eventsRes, bandsRes, allArtistsRes, allBandsRes, roomsRes] = await Promise.all([
    canSeeSlots
      ? supabase
          .from('slots')
          .select('id, day_of_week, start_time, end_time, fee_model, fee_value, notes, event_type')
          .eq('venue_id', id)
          .eq('status', 'open')
      : Promise.resolve({ data: [] }),
    isOwner
      ? supabase
          .from('events')
          .select('id, event_date, title, start_time, end_time, status, artists(stage_name), bands(name)')
          .eq('venue_id', id)
          .in('status', ['confirmed', 'offered'])
          .order('event_date', { ascending: true })
      : supabase
          .from('events')
          .select('id, event_date, title, start_time, end_time, status, artists(stage_name), bands(name)')
          .eq('venue_id', id)
          .eq('status', 'confirmed')
          .order('event_date', { ascending: true }),
    canApply
      ? supabase
          .from('band_members')
          .select('bands(id, name)')
          .eq('artist_id', artistId!)
          .eq('status', 'accepted')
      : Promise.resolve({ data: [] }),
    isOwner
      ? supabase.from('artists').select('id, stage_name, city').order('stage_name')
      : Promise.resolve({ data: [] }),
    isOwner
      ? supabase.from('bands').select('id, name, city').order('name')
      : Promise.resolve({ data: [] }),
    supabase.from('studio_rooms').select('id, name, price_per_hour').eq('venue_id', id).eq('is_active', true),
  ])

  const slots = (slotsRes.data ?? []) as any[]
  const events = (eventsRes.data ?? []) as any[]
  const artistBands = (bandsRes.data ?? [])
    .map((m: any) => m.bands)
    .filter(Boolean) as { id: string; name: string }[]
  const allArtists = (allArtistsRes.data ?? []) as { id: string; stage_name: string; city: string | null }[]
  const allBands = (allBandsRes.data ?? []) as { id: string; name: string; city: string | null }[]
  const studioRooms = (roomsRes.data ?? []) as { id: string; name: string; price_per_hour: number | null }[]

  const upcomingEvents = events.filter((e: any) => e.event_date >= today)
  const sortedSlots = [...slots].sort((a, b) => {
    const aDay = a.day_of_week === 0 ? 7 : a.day_of_week
    const bDay = b.day_of_week === 0 ? 7 : b.day_of_week
    return aDay - bDay
  })

  return (
    <div className="max-w-6xl mx-auto px-4 py-6">
      <Link
        href={`/venues/${id}`}
        className="flex items-center gap-2 text-text-muted text-sm mb-6 hover:text-text-primary w-fit"
      >
        <ArrowLeft size={16} />
        {v.name}
      </Link>

      <div className="flex items-center justify-between mb-6">
        <h1 className="font-bebas text-3xl text-text-primary">{isStudioType ? 'TAKVİM' : (isEn ? 'STAGE CALENDAR' : 'SAHNE TAKVİMİ')}</h1>
        <VenueCalendarSubscribe venueId={id} venueName={v.name} />
      </div>

      {events.length === 0 && slots.length === 0 && !isOwner ? (
        <div className="card p-8 text-center text-text-muted text-sm">
          <p>{isEn ? 'No calendar data for this venue yet.' : 'Bu mekanda henüz takvim verisi bulunmuyor.'}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-[280px,1fr] gap-8 items-start">
          {/* Left panel */}
          <div className="space-y-6">
            {sortedSlots.length > 0 && (
              <div>
                <h2 className="font-bebas text-xl text-text-primary mb-3">{isEn ? 'OPEN STAGES' : 'AÇIK SAHNELER'}</h2>
                <div className="space-y-2">
                  {sortedSlots.map((slot: any) => (
                    <div key={slot.id} className="card p-3">
                      <p className="text-text-primary text-sm font-medium">
                        {dayNames[slot.day_of_week]}
                      </p>
                      <p className="text-text-muted text-xs mt-0.5">
                        {formatTime(slot.start_time)}–{formatTime(slot.end_time)}
                        {slot.event_type ? ` · ${slot.event_type}` : ''}
                      </p>
                      {slot.fee_model && slot.fee_model !== 'free' && (
                        <p className="text-text-muted text-xs mt-0.5">
                          {slot.fee_model === 'guarantee' && slot.fee_value ? `${slot.fee_value}₺ Garanti` : ''}
                          {slot.fee_model === 'door_share' ? (isEn ? 'Door Share' : 'Kapı Paylaşımı') : ''}
                          {slot.fee_model === 'negotiable' ? (isEn ? 'Negotiable' : 'Pazarlığa Açık') : ''}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {upcomingEvents.length > 0 && (
              <div>
                <h2 className="font-bebas text-xl text-text-primary mb-3">{isEn ? 'EVENTS' : 'ETKİNLİKLER'}</h2>
                <div className="space-y-2">
                  {upcomingEvents.map((ev: any) => (
                    <div key={ev.id} className="card p-3">
                      <p className="text-text-primary text-sm font-medium">{ev.title}</p>
                      <p className="text-text-muted text-xs mt-0.5">
                        {formatDate(ev.event_date, locale)} · {formatTime(ev.start_time)}
                      </p>
                      {(ev.artists?.stage_name || ev.bands?.name) && (
                        <p className="text-text-muted text-xs mt-0.5">
                          {ev.artists?.stage_name ?? ev.bands?.name}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {sortedSlots.length === 0 && upcomingEvents.length === 0 && (
              <p className="text-text-muted text-sm">{isEn ? 'No data yet.' : 'Henüz veri yok.'}</p>
            )}
          </div>

          {/* Right: Calendar */}
          <div>
            <VenueCalendar
              slots={slots}
              events={events}
              venueId={id}
              venueCity={v.city}
              artistId={artistId}
              artistBands={artistBands}
              isOwner={isOwner}
              initialArtists={allArtists}
              initialBands={allBands}
              isStudioType={isStudioType}
              studioRooms={studioRooms}
              pricePerHour={(venue as any).price_per_hour ?? null}
            />
          </div>
        </div>
      )}
    </div>
  )
}
