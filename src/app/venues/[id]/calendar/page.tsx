export const dynamic = 'force-dynamic'

import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowLeft, CalendarDays } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { VenueCalendar } from '@/components/venues/VenueCalendar'

interface Props {
  params: Promise<{ id: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params
  const supabase = await createClient()
  const { data } = await supabase.from('venues').select('name').eq('id', id).single()
  return { title: data ? `${(data as any).name} · Sahne Takvimi` : 'Takvim' }
}

export default async function VenueCalendarPage({ params }: Props) {
  const { id } = await params
  const supabase = await createClient()

  const { data: venue } = await supabase
    .from('venues')
    .select('id, name, owner_id, city')
    .eq('id', id)
    .single()

  if (!venue) notFound()
  const v = venue as any

  const { data: { user } } = await supabase.auth.getUser()

  // Check if viewer is an artist
  const artistRes = user
    ? await supabase.from('artists').select('id').eq('profile_id', user.id).single()
    : null
  const artistId = artistRes?.data?.id ?? null
  const isOwner = user?.id === v.owner_id

  // Slots visible only to artists and venue owner
  const canApply = !!artistId
  const canSeeSlots = canApply || isOwner

  const [slotsRes, eventsRes, bandsRes] = await Promise.all([
    canSeeSlots
      ? supabase
          .from('slots')
          .select('id, day_of_week, start_time, end_time, fee_model, fee_value, notes, event_type')
          .eq('venue_id', id)
          .eq('status', 'open')
      : Promise.resolve({ data: [] }),
    supabase
      .from('events')
      .select('id, event_date, title, start_time, end_time, artists(stage_name), bands(name)')
      .eq('venue_id', id)
      .eq('status', 'confirmed'),
    canApply
      ? supabase
          .from('band_members')
          .select('bands(id, name)')
          .eq('artist_id', artistId!)
          .eq('status', 'accepted')
      : Promise.resolve({ data: [] }),
  ])

  const slots = (slotsRes.data ?? []) as any[]
  const events = (eventsRes.data ?? []) as any[]
  const artistBands = (bandsRes.data ?? [])
    .map((m: any) => m.bands)
    .filter(Boolean) as { id: string; name: string }[]

  return (
    <div className="max-w-lg mx-auto px-4 py-6">
      <Link
        href={`/venues/${id}`}
        className="flex items-center gap-2 text-text-muted text-sm mb-6 hover:text-text-primary w-fit"
      >
        <ArrowLeft size={16} />
        {v.name}
      </Link>

      <div className="flex items-center gap-3 mb-6">
        <CalendarDays size={20} className="text-accent" />
        <h1 className="font-bebas text-3xl text-text-primary">SAHNE TAKVİMİ</h1>
      </div>

      {events.length === 0 && slots.length === 0 && !isOwner ? (
        <div className="card p-8 text-center text-text-muted text-sm">
          <p>Bu mekanda henüz takvim verisi bulunmuyor.</p>
        </div>
      ) : (
        <VenueCalendar
          slots={slots}
          events={events}
          venueId={id}
          venueCity={v.city}
          artistId={artistId}
          artistBands={artistBands}
          isOwner={isOwner}
        />
      )}
    </div>
  )
}
