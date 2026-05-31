export const dynamic = 'force-dynamic'

import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { isAdminUser } from '@/lib/admin'
import { TicketsDashboardClient } from '@/components/tickets/TicketsDashboardClient'

export default async function VenueTicketsDashboard() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const admin = isAdminUser(user)
  const db = admin ? createAdminClient() : supabase

  let venueName = 'Tüm Mekanlar'
  let tickets: any[] = []
  let events: any[] = []

  if (admin) {
    // Admin: önce tüm biletleri çek, sonra ilgili eventleri
    const { data: allTickets } = await db
      .from('tickets')
      .select('*')
      .order('created_at', { ascending: false })
    tickets = allTickets ?? []

    const eventIds = tickets.map(t => t.event_id).filter((v, i, a) => a.indexOf(v) === i)
    if (eventIds.length > 0) {
      const { data } = await db
        .from('events')
        .select('id, title, event_date, ticket_price, ticket_count, tickets_sold, ticketing_enabled')
        .in('id', eventIds)
        .order('event_date', { ascending: false })
      events = data ?? []
    }
  } else {
    const { data: venue } = await supabase
      .from('venues')
      .select('id, name')
      .eq('owner_id', user.id)
      .single()

    if (!venue) notFound()
    venueName = venue.name

    const { data: eventsData } = await supabase
      .from('events')
      .select('id, title, event_date, ticket_price, ticket_count, tickets_sold, ticketing_enabled')
      .eq('venue_id', venue.id)
      .eq('ticketing_enabled', true)
      .order('event_date', { ascending: false })
    events = eventsData ?? []

    const eventIds = events.map(e => e.id)
    if (eventIds.length > 0) {
      const { data: ticketsData } = await supabase
        .from('tickets')
        .select('*')
        .in('event_id', eventIds)
        .order('created_at', { ascending: false })
      tickets = ticketsData ?? []
    }
  }

  return <TicketsDashboardClient events={events ?? []} tickets={tickets ?? []} venueName={venueName} />
}
