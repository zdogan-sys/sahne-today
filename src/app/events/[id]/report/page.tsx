export const dynamic = 'force-dynamic'

import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { isAdminUser } from '@/lib/admin'
import { formatDate } from '@/lib/utils'
import { ArrowLeft, Ticket, TrendingUp, Users, QrCode } from 'lucide-react'
import Link from 'next/link'
import { TicketTableClient } from '@/components/tickets/TicketTableClient'

interface Props {
  params: Promise<{ id: string }>
}

export default async function EventReportPage({ params }: Props) {
  const { id } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: event } = await supabase
    .from('events')
    .select('id, title, event_date, ticket_price, ticket_count, tickets_sold, ticketing_enabled, venues(owner_id), artists(profile_id), bands(creator_id)')
    .eq('id', id)
    .single()

  if (!event) notFound()

  const venue = event.venues as any
  const artist = event.artists as any
  const band = event.bands as any

  const isParty = isAdminUser(user)
    || venue?.owner_id === user.id
    || artist?.profile_id === user.id
    || band?.creator_id === user.id

  if (!isParty) redirect('/events/' + id)

  const { data: tickets } = await supabase
    .from('tickets')
    .select('*')
    .eq('event_id', id)
    .order('created_at', { ascending: false })

  const allTickets = tickets ?? []
  const paidTickets = allTickets.filter(t => t.status === 'paid' || t.status === 'used')
  const usedTickets = allTickets.filter(t => t.status === 'used')
  const revenue = paidTickets.reduce((sum, t) => sum + Number(t.total_price), 0)
  const remaining = (event.ticket_count ?? 0) - (event.tickets_sold ?? 0)

  return (
    <div className="max-w-3xl mx-auto px-4 py-6">
      <Link
        href={`/events/${id}`}
        className="flex items-center gap-2 text-text-muted text-sm mb-6 hover:text-text-primary transition-colors w-fit"
      >
        <ArrowLeft size={16} />
        Etkinliğe Dön
      </Link>

      <div className="flex items-start justify-between mb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Ticket size={16} className="text-accent" />
            <span className="text-accent text-xs font-semibold uppercase tracking-wide">Bilet Raporu</span>
          </div>
          <h1 className="font-bebas text-3xl text-text-primary leading-tight">{event.title}</h1>
          <p className="text-text-muted text-sm mt-0.5">{formatDate(event.event_date)}</p>
        </div>
        <Link
          href="/scan"
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-accent text-white text-sm font-semibold hover:bg-accent/90 transition-colors flex-shrink-0"
        >
          <QrCode size={15} />
          QR Tara
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-3 mb-6">
        <div className="card p-4 text-center">
          <TrendingUp size={16} className="text-success mx-auto mb-2" />
          <p className="font-bebas text-2xl text-text-primary">{revenue.toFixed(0)}₺</p>
          <p className="text-text-muted text-xs">Gelir</p>
        </div>
        <div className="card p-4 text-center">
          <Ticket size={16} className="text-accent mx-auto mb-2" />
          <p className="font-bebas text-2xl text-text-primary">{paidTickets.length}</p>
          <p className="text-text-muted text-xs">Satılan</p>
        </div>
        <div className="card p-4 text-center">
          <Users size={16} className="text-text-muted mx-auto mb-2" />
          <p className="font-bebas text-2xl text-text-primary">{usedTickets.length}</p>
          <p className="text-text-muted text-xs">Giriş Yaptı</p>
        </div>
        <div className="card p-4 text-center">
          <div className="w-4 h-4 mx-auto mb-2" />
          <p className="font-bebas text-2xl text-text-primary">{remaining}</p>
          <p className="text-text-muted text-xs">Kalan</p>
        </div>
      </div>

      {/* Progress */}
      {event.ticket_count > 0 && (
        <div className="card p-4 mb-6">
          <div className="flex items-center justify-between text-sm mb-2">
            <span className="text-text-muted">Doluluk</span>
            <span className="text-text-primary font-medium">
              {paidTickets.length} / {event.ticket_count}
            </span>
          </div>
          <div className="w-full bg-[rgba(228,224,216,0.08)] rounded-full h-2">
            <div
              className="bg-accent h-2 rounded-full transition-all"
              style={{ width: `${event.ticket_count > 0 ? Math.min((paidTickets.length / event.ticket_count) * 100, 100) : 0}%` }}
            />
          </div>
        </div>
      )}

      {/* Ticket table */}
      {allTickets.length > 0 ? (
        <div className="card p-5">
          <TicketTableClient tickets={allTickets} eventTitle={event.title} />
        </div>
      ) : (
        <div className="card p-10 text-center text-text-muted text-sm">
          Henüz bilet satışı yok.
        </div>
      )}
    </div>
  )
}
