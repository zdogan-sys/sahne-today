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
    const {
      venue_id, reserver_name, reserver_email, reserver_phone,
      reservation_date, start_time, end_time, duration_hours,
      price_per_hour, notes,
    } = body

    if (!venue_id || !reserver_name || !reserver_email || !reserver_phone ||
        !reservation_date || !start_time || !end_time || !duration_hours || !price_per_hour) {
      return NextResponse.json({ error: 'Eksik alan' }, { status: 400 })
    }

    const admin = createAdminClient()

    // Çakışma kontrolü
    const { data: conflicts } = await admin
      .from('studio_reservations')
      .select('id')
      .eq('venue_id', venue_id)
      .eq('reservation_date', reservation_date)
      .eq('status', 'confirmed')
      .or(`start_time.lt.${end_time},end_time.gt.${start_time}`)

    if (conflicts && conflicts.length > 0) {
      return NextResponse.json({ error: 'Seçilen saatte başka bir rezervasyon var' }, { status: 409 })
    }

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    const totalPrice = Number(duration_hours) * Number(price_per_hour)
    const merchantOid = `SR${Date.now()}${Math.random().toString(36).slice(2, 8).toUpperCase()}`

    const { data: venue } = await admin.from('venues').select('name').eq('id', venue_id).single()

    const { error: resError } = await admin.from('studio_reservations').insert({
      venue_id,
      reserver_id: user?.id ?? null,
      reserver_name,
      reserver_email,
      reserver_phone,
      reservation_date,
      start_time,
      end_time,
      duration_hours: Number(duration_hours),
      price_per_hour: Number(price_per_hour),
      total_price: totalPrice,
      status: 'pending',
      paytr_order_id: merchantOid,
      notes: notes || null,
    })

    if (resError) return NextResponse.json({ error: resError.message }, { status: 500 })

    const userIp = req.headers.get('x-forwarded-for')?.split(',')[0].trim() ?? '127.0.0.1'
    const paymentAmount = Math.round(totalPrice * 100)
    const itemName = `${venue?.name ?? 'Stüdyo'} — ${reservation_date} ${start_time}`
    const userBasket = Buffer.from(
      JSON.stringify([[itemName, totalPrice.toFixed(2), 1]])
    ).toString('base64')

    const noInstallment = 0
    const maxInstallment = 0
    const currency = 'TL'
    const testMode = 1

    const hashStr = `${MERCHANT_ID}${userIp}${merchantOid}${reserver_email}${paymentAmount}${userBasket}${noInstallment}${maxInstallment}${currency}${testMode}`
    const paytrToken = crypto.createHmac('sha256', MERCHANT_KEY).update(hashStr + MERCHANT_SALT).digest('base64')

    const params = new URLSearchParams({
      merchant_id: MERCHANT_ID,
      user_ip: userIp,
      merchant_oid: merchantOid,
      email: reserver_email,
      payment_amount: String(paymentAmount),
      paytr_token: paytrToken,
      user_basket: userBasket,
      debug_on: '1',
      no_installment: String(noInstallment),
      max_installment: String(maxInstallment),
      user_name: reserver_name,
      user_address: 'Türkiye',
      user_phone: reserver_phone,
      merchant_ok_url: `${SITE_URL}/studios/${venue_id}/reserve/success?order_id=${merchantOid}`,
      merchant_fail_url: `${SITE_URL}/studios/${venue_id}?error=1`,
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
    console.error('studios/reserve error:', err)
    return NextResponse.json({ error: 'Sunucu hatası' }, { status: 500 })
  }
}
