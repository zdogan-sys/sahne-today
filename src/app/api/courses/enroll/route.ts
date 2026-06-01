import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { createAdminClient } from '@/lib/supabase/admin'

const MERCHANT_ID = process.env.PAYTR_MERCHANT_ID!
const MERCHANT_KEY = process.env.PAYTR_MERCHANT_KEY!
const MERCHANT_SALT = process.env.PAYTR_MERCHANT_SALT!
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL!

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { course_id, session_id, student_name, student_email, student_phone, gender } = body

    if (!course_id || !student_name || !student_email || !student_phone) {
      return NextResponse.json({ error: 'Eksik alan' }, { status: 400 })
    }

    const admin = createAdminClient()

    const { data: course } = await admin
      .from('courses')
      .select('id, title, price_per_session, currency, max_participants, min_female, min_male, course_type')
      .eq('id', course_id)
      .eq('status', 'active')
      .single()

    if (!course) return NextResponse.json({ error: 'Kurs bulunamadı' }, { status: 404 })

    if (session_id) {
      const { data: session } = await admin
        .from('course_sessions')
        .select('status')
        .eq('id', session_id)
        .single()
      if (!session || session.status !== 'available') {
        return NextResponse.json({ error: 'Seans müsait değil' }, { status: 400 })
      }
    }

    const merchantOid = `CR${Date.now()}${Math.random().toString(36).slice(2, 8).toUpperCase()}`
    const totalPrice = Number(course.price_per_session)

    const { error: enrollError } = await admin.from('course_enrollments').insert({
      course_id,
      session_id: session_id || null,
      student_name,
      student_email,
      student_phone,
      gender: gender || null,
      status: 'pending',
      payment_status: 'pending',
      paytr_order_id: merchantOid,
      amount_paid: totalPrice,
    })

    if (enrollError) return NextResponse.json({ error: enrollError.message }, { status: 500 })

    const userIp = req.headers.get('x-forwarded-for')?.split(',')[0].trim() ?? '127.0.0.1'
    const paymentAmount = Math.round(totalPrice * 100)
    const userBasket = Buffer.from(
      JSON.stringify([[course.title, totalPrice.toFixed(2), 1]])
    ).toString('base64')

    const noInstallment = 0
    const maxInstallment = 0
    const currency = 'TL'
    const testMode = 1

    const hashStr = `${MERCHANT_ID}${userIp}${merchantOid}${student_email}${paymentAmount}${userBasket}${noInstallment}${maxInstallment}${currency}${testMode}`
    const paytrToken = crypto.createHmac('sha256', MERCHANT_KEY).update(hashStr + MERCHANT_SALT).digest('base64')

    const params = new URLSearchParams({
      merchant_id: MERCHANT_ID,
      user_ip: userIp,
      merchant_oid: merchantOid,
      email: student_email,
      payment_amount: String(paymentAmount),
      paytr_token: paytrToken,
      user_basket: userBasket,
      debug_on: '1',
      no_installment: String(noInstallment),
      max_installment: String(maxInstallment),
      user_name: student_name,
      user_address: 'Türkiye',
      user_phone: student_phone,
      merchant_ok_url: `${SITE_URL}/courses/${course_id}/enroll/success?order_id=${merchantOid}`,
      merchant_fail_url: `${SITE_URL}/courses/${course_id}/enroll?error=1`,
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
    console.error('courses/enroll error:', err)
    return NextResponse.json({ error: 'Sunucu hatası' }, { status: 500 })
  }
}
