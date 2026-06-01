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
    const { slot_id, student_name, student_email, student_phone, lesson_date, notes } = await req.json()

    if (!slot_id || !student_name || !student_email || !student_phone || !lesson_date) {
      return NextResponse.json({ error: 'Eksik alan' }, { status: 400 })
    }

    const admin = createAdminClient()

    const { data: slot } = await admin
      .from('teaching_slots')
      .select('*, artists(id, stage_name, profile_id)')
      .eq('id', slot_id)
      .eq('is_active', true)
      .single()

    if (!slot) return NextResponse.json({ error: 'Slot bulunamadı' }, { status: 404 })

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    const merchantOid = `TB${Date.now()}${Math.random().toString(36).slice(2, 8).toUpperCase()}`
    const totalPrice = Number(slot.price_per_session)
    const artist = slot.artists as any

    const { error: bookErr } = await admin.from('teaching_bookings').insert({
      slot_id,
      artist_id: artist.id,
      student_id: user?.id ?? null,
      student_name,
      student_email,
      student_phone,
      lesson_date,
      status: 'pending',
      payment_status: 'pending',
      paytr_order_id: merchantOid,
      amount_paid: totalPrice,
      notes: notes || null,
    } as any)

    if (bookErr) return NextResponse.json({ error: bookErr.message }, { status: 500 })

    const userIp = req.headers.get('x-forwarded-for')?.split(',')[0].trim() ?? '127.0.0.1'
    const paymentAmount = Math.round(totalPrice * 100)
    const itemName = `${artist.stage_name} — ${slot.instrument} Dersi`
    const userBasket = Buffer.from(JSON.stringify([[itemName, totalPrice.toFixed(2), 1]])).toString('base64')

    const noInstallment = 0; const maxInstallment = 0; const currency = 'TL'; const testMode = 1
    const hashStr = `${MERCHANT_ID}${userIp}${merchantOid}${student_email}${paymentAmount}${userBasket}${noInstallment}${maxInstallment}${currency}${testMode}`
    const paytrToken = crypto.createHmac('sha256', MERCHANT_KEY).update(hashStr + MERCHANT_SALT).digest('base64')

    const params = new URLSearchParams({
      merchant_id: MERCHANT_ID, user_ip: userIp, merchant_oid: merchantOid,
      email: student_email, payment_amount: String(paymentAmount), paytr_token: paytrToken,
      user_basket: userBasket, debug_on: '1', no_installment: String(noInstallment),
      max_installment: String(maxInstallment), user_name: student_name,
      user_address: 'Türkiye', user_phone: student_phone,
      merchant_ok_url: `${SITE_URL}/artists/${artist.profile_id}/book/${slot_id}/success?order_id=${merchantOid}`,
      merchant_fail_url: `${SITE_URL}/artists/${artist.id}/book/${slot_id}?error=1`,
      timeout_limit: '30', currency, test_mode: String(testMode),
    })

    const paytrRes = await fetch('https://www.paytr.com/odeme/api/get-token', { method: 'POST', body: params })
    const paytrData = await paytrRes.json()

    if (paytrData.status !== 'success') {
      return NextResponse.json({ error: paytrData.reason ?? 'PayTR hatası' }, { status: 500 })
    }

    return NextResponse.json({ token: paytrData.token, merchant_oid: merchantOid })
  } catch (err) {
    console.error('teaching/book error:', err)
    return NextResponse.json({ error: 'Sunucu hatası' }, { status: 500 })
  }
}
