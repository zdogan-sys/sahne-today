export const dynamic = 'force-dynamic'

import { notFound } from 'next/navigation'
import { CheckCircle, ArrowLeft, Ticket } from 'lucide-react'
import Link from 'next/link'
import { createAdminClient } from '@/lib/supabase/admin'
import { getLocale } from 'next-intl/server'
import { SuccessPoller } from './SuccessPoller'

interface Props {
  params: Promise<{ id: string }>
  searchParams: Promise<{ order_id?: string }>
}

export default async function TicketSuccessPage({ params, searchParams }: Props) {
  const { id } = await params
  const { order_id } = await searchParams
  const isEn = (await getLocale()) === 'en'

  if (!order_id) notFound()

  const supabase = createAdminClient()
  const { data: ticket } = await supabase
    .from('tickets')
    .select('*, events(title, event_date, start_time, venues(name))')
    .eq('paytr_order_id', order_id)
    .single()

  const event = (ticket?.events as any) ?? null
  const venue = event?.venues

  if (!ticket || ticket.status === 'pending' || ticket.status === 'cancelled') {
    return (
      <div className="max-w-lg mx-auto px-4 py-10 text-center">
        <div className="card p-8">
          <Ticket size={48} className="text-text-muted mx-auto mb-4 animate-pulse" />
          <h1 className="font-bebas text-2xl text-text-primary mb-2">{isEn ? 'Confirming Payment' : 'Ödeme Onaylanıyor'}</h1>
          <p className="text-text-muted text-sm mb-6">
            {isEn ? 'Your payment is being processed, awaiting confirmation. The page will refresh automatically.' : 'Ödemeniz işleme alındı, onay bekleniyor. Sayfa otomatik yenilenecek.'}
          </p>
          {/* Auto-refresh every 3s until paid */}
          <SuccessPoller orderId={order_id} eventId={id} />
          <Link href={`/events/${id}`} className="mt-4 inline-flex items-center gap-2 text-text-muted text-sm">
            <ArrowLeft size={14} /> {isEn ? 'Back to Event' : 'Etkinliğe Dön'}
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-lg mx-auto px-4 py-6">
      <div className="card p-6 text-center">
        <div className="w-16 h-16 rounded-full bg-success/10 flex items-center justify-center mx-auto mb-4">
          <CheckCircle size={36} className="text-success" />
        </div>
        <h1 className="font-bebas text-3xl text-text-primary mb-1">{isEn ? 'Your Ticket is Ready!' : 'Biletiniz Hazır!'}</h1>
        <p className="text-text-muted text-sm mb-6">
          {isEn ? <>Ticket details have been sent to <strong className="text-text-primary">{ticket.buyer_email}</strong>.</> : <>Bilet bilgileri <strong className="text-text-primary">{ticket.buyer_email}</strong> adresine gönderildi.</>}
        </p>

        <div className="bg-[rgba(228,224,216,0.04)] rounded-xl p-4 text-left mb-6">
          <p className="font-bebas text-xl text-text-primary mb-1">{event?.title}</p>
          {event?.event_date && (
            <p className="text-text-muted text-sm">
              {new Date(event.event_date).toLocaleDateString(isEn ? 'en-US' : 'tr-TR', { day: 'numeric', month: 'long', year: 'numeric' })}
              {event?.start_time && ` · ${event.start_time.slice(0, 5)}`}
            </p>
          )}
          {venue?.name && <p className="text-text-muted text-sm mt-0.5">{venue.name}</p>}
        </div>

        <div className="text-sm text-text-muted mb-6 p-3 bg-[rgba(212,83,126,0.06)] border border-[rgba(212,83,126,0.15)] rounded-lg">
          {isEn ? 'Your QR code is in your email. Show it at the door.' : 'QR kodunuz mailinizde. Kapıda gösteriniz.'}
        </div>

        <Link
          href={`/events/${id}`}
          className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-accent text-white font-semibold text-sm"
        >
          <ArrowLeft size={14} /> {isEn ? 'Back to Event' : 'Etkinliğe Dön'}
        </Link>
      </div>
    </div>
  )
}
