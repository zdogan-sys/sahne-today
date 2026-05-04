import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

const MERCHANT_ID = process.env.PAYTR_MERCHANT_ID!
const MERCHANT_KEY = process.env.PAYTR_MERCHANT_KEY!
const MERCHANT_SALT = process.env.PAYTR_MERCHANT_SALT!
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL!

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { event_id, buyer_name, buyer_surname, buyer_email, buyer_phone, quantity } = body

    if (!event_id || !buyer_name || !buyer_surname || !buyer_email || !buyer_phone || !quantity) {
      return NextResponse.json({ error: 'Eksik alan' }, { status: 400 })
    }

    const supabase = await createClient()

    const { data: event } = await supabase
      .from('events')
      .select('id, title, ticket_price, ticket_count, tickets_sold, ticketing_enabled, venues(commission_rate)')
      .eq('id', event_id)
      .single()

    if (!event || !event.ticketing_enabled) {
      return NextResponse.json({ error: 'Etkinlik bulunamadı veya bilet satışı kapalı' }, { status: 404 })
    }

    const remaining = (event.ticket_count ?? 0) - (event.tickets_sold ?? 0)
    if (remaining < quantity) {
      return NextResponse.json({ error: 'Yeterli bilet yok' }, { status: 400 })
    }

    const venue = event.venues as any
    const commissionRate = venue?.commission_rate ?? 8
    const unitPrice = Number(event.ticket_price)
    const unitPriceWithCommission = Math.round(unitPrice * (1 + commissionRate / 100) * 100) / 100
    const totalPrice = Math.round(unitPriceWithCommission * quantity * 100) / 100

    const merchantOid = `ST${Date.now()}${Math.random().toString(36).slice(2, 8).toUpperCase()}`

    const adminClient = createAdminClient()
    const { data: ticket, error: ticketError } = await adminClient
      .from('tickets')
      .insert({
        event_id,
        buyer_name,
        buyer_surname,
        buyer_email,
        buyer_phone,
        quantity,
        unit_price: unitPriceWithCommission,
        total_price: totalPrice,
        status: 'pending',
        paytr_order_id: merchantOid,
      })
      .select()
      .single()

    if (ticketError || !ticket) {
      console.error('Ticket insert error:', ticketError)
      return NextResponse.json({ error: 'Bilet oluşturulamadı' }, { status: 500 })
    }

    const userIp = req.headers.get('x-forwarded-for')?.split(',')[0].trim() ?? '127.0.0.1'
    const paymentAmount = Math.round(totalPrice * 100)
    const userBasket = Buffer.from(
      JSON.stringify([[event.title, unitPriceWithCommission.toFixed(2), quantity]])
    ).toString('base64')

    const noInstallment = 0
    const maxInstallment = 0
    const currency = 'TL'
    const testMode = 1

    const hashStr = `${MERCHANT_ID}${userIp}${merchantOid}${buyer_email}${paymentAmount}${userBasket}${noInstallment}${maxInstallment}${currency}${testMode}`
    const paytrToken = crypto.createHmac('sha256', MERCHANT_SALT).update(hashStr + MERCHANT_SALT).digest('base64')

    const params = new URLSearchParams({
      merchant_id: MERCHANT_ID,
      user_ip: userIp,
      merchant_oid: merchantOid,
      email: buyer_email,
      payment_amount: String(paymentAmount),
      paytr_token: paytrToken,
      user_basket: userBasket,
      debug_on: '1',
      no_installment: String(noInstallment),
      max_installment: String(maxInstallment),
      user_name: `${buyer_name} ${buyer_surname}`,
      user_address: 'Türkiye',
      user_phone: buyer_phone,
      merchant_ok_url: `${SITE_URL}/events/${event_id}/tickets/success?order_id=${merchantOid}`,
      merchant_fail_url: `${SITE_URL}/events/${event_id}/tickets?error=1`,
      timeout_limit: '30',
      currency,
      test_mode: String(testMode),
    })

    const paytrRes = await fetch('https://www.paytr.com/odeme/api/get-token', {
      method: 'POST',
      body: params,
    })
    const paytrData = await paytrRes.json()

    if (paytrData.status !== 'success') {
      return NextResponse.json({ error: paytrData.reason ?? 'PayTR hatası' }, { status: 500 })
    }

    return NextResponse.json({ token: paytrData.token, merchant_oid: merchantOid })
  } catch (err) {
    console.error('tickets/create error:', err)
    return NextResponse.json({ error: 'Sunucu hatası' }, { status: 500 })
  }
}
