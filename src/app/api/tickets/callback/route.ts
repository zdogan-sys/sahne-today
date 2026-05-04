import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function GET() {
  return NextResponse.json({ ok: true, endpoint: 'paytr-callback' })
}
import crypto from 'crypto'
import QRCode from 'qrcode'
import { Resend } from 'resend'
import { createAdminClient } from '@/lib/supabase/admin'
import { ticketEmailHtml } from '@/lib/email-templates/ticket'
import { formatDate, formatTime } from '@/lib/utils'

const MERCHANT_KEY = process.env.PAYTR_MERCHANT_KEY!
const MERCHANT_SALT = process.env.PAYTR_MERCHANT_SALT!
const resend = new Resend(process.env.RESEND_API_KEY)

export async function POST(req: NextRequest) {
  const formData = await req.formData()
  const merchantOid = formData.get('merchant_oid') as string
  const status = formData.get('status') as string
  const totalAmount = formData.get('total_amount') as string
  const hash = formData.get('hash') as string

  const hashStr = MERCHANT_KEY + merchantOid + MERCHANT_SALT + status + totalAmount
  const expectedHash = crypto.createHmac('sha256', MERCHANT_SALT).update(hashStr).digest('base64')

  if (hash !== expectedHash) {
    return new NextResponse('PAYTR_INVALID_HASH', { status: 400 })
  }

  const supabase = createAdminClient()

  const { data: ticket } = await supabase
    .from('tickets')
    .select('*, events(title, event_date, start_time, venues(name, address, city))')
    .eq('paytr_order_id', merchantOid)
    .single()

  if (!ticket) return new NextResponse('OK')

  await supabase.from('ticket_payments').insert({
    ticket_id: ticket.id,
    paytr_order_id: merchantOid,
    amount: Number(totalAmount) / 100,
    status: status === 'success' ? 'success' : 'failed',
    paytr_response: Object.fromEntries(formData.entries()),
  })

  if (status !== 'success') return new NextResponse('OK')

  const qrCode = crypto.randomUUID()

  await supabase.from('tickets').update({ status: 'paid', qr_code: qrCode }).eq('id', ticket.id)

  const event = ticket.events as any
  const venue = event?.venues as any

  await supabase
    .from('events')
    .update({ tickets_sold: (event?.tickets_sold ?? 0) + ticket.quantity })
    .eq('id', ticket.event_id)

  try {
    const qrBuffer = await QRCode.toBuffer(qrCode, { width: 300, margin: 2 })
    const qrBase64 = qrBuffer.toString('base64')

    await resend.emails.send({
      from: 'Sahne.Today <onboarding@resend.dev>',
      to: ticket.buyer_email,
      subject: `Biletiniz Hazır: ${event?.title ?? 'Etkinlik'}`,
      html: ticketEmailHtml({
        buyerName: ticket.buyer_name,
        eventTitle: event?.title ?? '',
        eventDate: event?.event_date ? formatDate(event.event_date) : '',
        eventTime: event?.start_time ? formatTime(event.start_time) : '',
        venueName: venue?.name ?? '',
        venueAddress: venue?.address ?? '',
        quantity: ticket.quantity,
        totalPrice: ticket.total_price,
        qrCodeBase64: qrBase64,
      }),
    })
  } catch (err) {
    console.error('Email send error:', err)
  }

  return new NextResponse('OK')
}
