'use client'

import { useState, useMemo } from 'react'
import { useLocale } from 'next-intl'
import { Ticket, TrendingUp, Users } from 'lucide-react'
import { formatDate } from '@/lib/utils'
import { TicketTableClient } from './TicketTableClient'
import { PrintButton } from '@/components/ui/PrintButton'
import Link from 'next/link'

interface Event {
  id: string
  title: string
  event_date: string
  ticket_price: number | null
  ticket_count: number | null
  tickets_sold: number | null
  ticketing_enabled: boolean
}

interface TicketRow {
  id: string
  event_id: string
  buyer_name: string
  buyer_surname: string
  buyer_email: string
  buyer_phone: string
  quantity: number
  total_price: number
  status: string
  created_at: string
}

interface Props {
  events: Event[]
  tickets: TicketRow[]
  venueName: string
}

export function TicketsDashboardClient({ events, tickets, venueName }: Props) {
  const locale = useLocale()
  const isEn = locale === 'en'
  const [selectedEventId, setSelectedEventId] = useState<string>('all')

  const filteredEvents = useMemo(
    () => selectedEventId === 'all' ? events : events.filter(e => e.id === selectedEventId),
    [events, selectedEventId]
  )

  const filteredTickets = useMemo(
    () => selectedEventId === 'all' ? tickets : tickets.filter(t => t.event_id === selectedEventId),
    [tickets, selectedEventId]
  )

  const totalRevenue = filteredTickets
    .filter(t => t.status === 'paid' || t.status === 'used')
    .reduce((sum, t) => sum + Number(t.total_price), 0)

  const totalSold = filteredTickets.filter(t => t.status === 'paid' || t.status === 'used').length

  return (
    <div className="max-w-5xl mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Ticket size={18} className="text-accent" />
            <span className="text-accent text-xs font-semibold uppercase tracking-wide">{isEn ? 'Ticket Sales' : 'Bilet Satışları'}</span>
          </div>
          <h1 className="font-bebas text-3xl text-text-primary">{venueName}</h1>
        </div>
        <div className="flex items-center gap-2 print:hidden">
          <PrintButton />
          <Link href="/scan" className="flex items-center gap-2 px-4 py-2 rounded-lg bg-accent text-white text-sm font-semibold">
            QR Tara
          </Link>
        </div>
      </div>

      {/* Event filter */}
      {events.length > 1 && (
        <div className="mb-5 print:hidden">
          <select
            value={selectedEventId}
            onChange={e => setSelectedEventId(e.target.value)}
            className="w-full sm:w-72 px-3 py-2 rounded-lg border border-[rgba(228,224,216,0.12)] bg-[rgba(228,224,216,0.04)] text-text-primary text-sm focus:outline-none focus:border-accent/50"
          >
            <option value="all">{isEn ? 'All Events' : 'Tüm Etkinlikler'}</option>
            {events.map(event => (
              <option key={event.id} value={event.id}>
                {event.title} — {formatDate(event.event_date, locale)}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <div className="card p-4 text-center">
          <div className="w-8 h-8 rounded-lg bg-success/10 flex items-center justify-center mx-auto mb-2">
            <TrendingUp size={16} className="text-success" />
          </div>
          <p className="font-bebas text-2xl text-text-primary">{totalRevenue.toFixed(0)}₺</p>
          <p className="text-text-muted text-xs">{isEn ? 'Total Revenue' : 'Toplam Gelir'}</p>
        </div>
        <div className="card p-4 text-center">
          <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center mx-auto mb-2">
            <Ticket size={16} className="text-accent" />
          </div>
          <p className="font-bebas text-2xl text-text-primary">{totalSold}</p>
          <p className="text-text-muted text-xs">{isEn ? 'Tickets Sold' : 'Satılan Bilet'}</p>
        </div>
        <div className="card p-4 text-center">
          <div className="w-8 h-8 rounded-lg bg-[rgba(228,224,216,0.06)] flex items-center justify-center mx-auto mb-2">
            <Users size={16} className="text-text-muted" />
          </div>
          <p className="font-bebas text-2xl text-text-primary">{filteredEvents.length}</p>
          <p className="text-text-muted text-xs">{isEn ? 'Events' : 'Etkinlik'}</p>
        </div>
      </div>

      {/* Event breakdown */}
      <div className="space-y-4">
        {filteredEvents.map(event => {
          const eventTickets = filteredTickets.filter(t => t.event_id === event.id)
          const sold = eventTickets.filter(t => t.status === 'paid' || t.status === 'used').length
          const revenue = eventTickets
            .filter(t => t.status === 'paid' || t.status === 'used')
            .reduce((sum, t) => sum + Number(t.total_price), 0)

          return (
            <div key={event.id} className="card p-5">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="font-semibold text-text-primary">{event.title}</h3>
                  <p className="text-text-muted text-sm">{formatDate(event.event_date, locale)}</p>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-text-primary">{revenue.toFixed(0)}₺</p>
                  <p className="text-text-muted text-xs">{sold} / {event.ticket_count} bilet</p>
                </div>
              </div>

              <div className="w-full bg-[rgba(228,224,216,0.08)] rounded-full h-1.5 mb-4">
                <div
                  className="bg-accent h-1.5 rounded-full transition-all"
                  style={{ width: `${event.ticket_count && event.ticket_count > 0 ? (sold / event.ticket_count) * 100 : 0}%` }}
                />
              </div>

              {eventTickets.length > 0 && (
                <TicketTableClient tickets={eventTickets} eventTitle={event.title} />
              )}
            </div>
          )
        })}

        {filteredEvents.length === 0 && (
          <div className="card p-10 text-center text-text-muted">
            {isEn ? 'No events with active ticket sales yet.' : 'Henüz bilet satışı aktif etkinlik yok.'}
          </div>
        )}
      </div>
    </div>
  )
}
