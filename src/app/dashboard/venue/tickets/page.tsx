export const dynamic = 'force-dynamic'

import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { isAdminUser } from '@/lib/admin'
import { formatDate } from '@/lib/utils'
import { Ticket, TrendingUp, Users } from 'lucide-react'
import Link from 'next/link'
import { TicketTableClient } from '@/components/tickets/TicketTableClient'

export default async function VenueTicketsDashboard() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const admin = isAdminUser(user)
  const db = admin ? createAdminClient() : supabase

  let venueName = 'Tüm Mekanlar'
  let eventsQuery = db
    .from('events')
    .select('id, title, event_date, ticket_price, ticket_count, tickets_sold, ticketing_enabled')
    .eq('ticketing_enabled', true)
    .order('event_date', { ascending: false })

  if (!admin) {
    const { data: venue } = await supabase
      .from('venues')
      .select('id, name')
      .eq('owner_id', user.id)
      .single()

    if (!venue) notFound()
    venueName = venue.name
    eventsQuery = eventsQuery.eq('venue_id', venue.id)
  }

  const { data: events } = await eventsQuery

  const eventIds = (events ?? []).map(e => e.id)

  const { data: tickets } = eventIds.length
    ? await supabase
        .from('tickets')
        .select('*')
        .in('event_id', eventIds)
        .order('created_at', { ascending: false })
    : { data: [] }

  const totalRevenue = (tickets ?? [])
    .filter(t => t.status === 'paid' || t.status === 'used')
    .reduce((sum, t) => sum + Number(t.total_price), 0)

  const totalSold = (tickets ?? []).filter(t => t.status === 'paid' || t.status === 'used').length

  return (
    <div className="max-w-5xl mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Ticket size={18} className="text-accent" />
            <span className="text-accent text-xs font-semibold uppercase tracking-wide">Bilet Satışları</span>
          </div>
          <h1 className="font-bebas text-3xl text-text-primary">{venueName}</h1>
        </div>
        <Link href="/scan" className="flex items-center gap-2 px-4 py-2 rounded-lg bg-accent text-white text-sm font-semibold">
          QR Tara
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <div className="card p-4 text-center">
          <div className="w-8 h-8 rounded-lg bg-success/10 flex items-center justify-center mx-auto mb-2">
            <TrendingUp size={16} className="text-success" />
          </div>
          <p className="font-bebas text-2xl text-text-primary">{totalRevenue.toFixed(0)}₺</p>
          <p className="text-text-muted text-xs">Toplam Gelir</p>
        </div>
        <div className="card p-4 text-center">
          <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center mx-auto mb-2">
            <Ticket size={16} className="text-accent" />
          </div>
          <p className="font-bebas text-2xl text-text-primary">{totalSold}</p>
          <p className="text-text-muted text-xs">Satılan Bilet</p>
        </div>
        <div className="card p-4 text-center">
          <div className="w-8 h-8 rounded-lg bg-[rgba(228,224,216,0.06)] flex items-center justify-center mx-auto mb-2">
            <Users size={16} className="text-text-muted" />
          </div>
          <p className="font-bebas text-2xl text-text-primary">{(events ?? []).length}</p>
          <p className="text-text-muted text-xs">Etkinlik</p>
        </div>
      </div>

      {/* Event breakdown */}
      <div className="space-y-4">
        {(events ?? []).map(event => {
          const eventTickets = (tickets ?? []).filter(t => t.event_id === event.id)
          const sold = eventTickets.filter(t => t.status === 'paid' || t.status === 'used').length
          const revenue = eventTickets
            .filter(t => t.status === 'paid' || t.status === 'used')
            .reduce((sum, t) => sum + Number(t.total_price), 0)

          return (
            <div key={event.id} className="card p-5">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="font-semibold text-text-primary">{event.title}</h3>
                  <p className="text-text-muted text-sm">{formatDate(event.event_date)}</p>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-text-primary">{revenue.toFixed(0)}₺</p>
                  <p className="text-text-muted text-xs">{sold} / {event.ticket_count} bilet</p>
                </div>
              </div>

              {/* Progress bar */}
              <div className="w-full bg-[rgba(228,224,216,0.08)] rounded-full h-1.5 mb-4">
                <div
                  className="bg-accent h-1.5 rounded-full transition-all"
                  style={{ width: `${event.ticket_count > 0 ? (sold / event.ticket_count) * 100 : 0}%` }}
                />
              </div>

              {eventTickets.length > 0 && (
                <TicketTableClient tickets={eventTickets} eventTitle={event.title} />
              )}
            </div>
          )
        })}

        {(events ?? []).length === 0 && (
          <div className="card p-10 text-center text-text-muted">
            Henüz bilet satışı aktif etkinlik yok.
          </div>
        )}
      </div>
    </div>
  )
}
