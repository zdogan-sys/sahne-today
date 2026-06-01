import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { Resend } from 'resend'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { isAdminUser } from '@/lib/admin'

const MERCHANT_ID = process.env.PAYTR_MERCHANT_ID!
const MERCHANT_KEY = process.env.PAYTR_MERCHANT_KEY!
const MERCHANT_SALT = process.env.PAYTR_MERCHANT_SALT!
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL!
const resend = new Resend(process.env.RESEND_API_KEY)

export async function POST(req: NextRequest) {
  try {
    const { slot_id, student_name, student_email, student_phone, lesson_date, notes, booked_by = 'student' } = await req.json()

    if (!slot_id || !student_name || !student_email || !student_phone || !lesson_date) {
      return NextResponse.json({ error: 'Eksik alan' }, { status: 400 })
    }

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    const admin = createAdminClient()

    const { data: slot } = await admin
      .from('teaching_slots')
      .select('*, artists(id, stage_name, profile_id)')
      .eq('id', slot_id)
      .eq('is_active', true)
      .single()

    if (!slot) return NextResponse.json({ error: 'Slot bulunamadı' }, { status: 404 })

    const artist = slot.artists as any

    // Hoca adına rezervasyon: sadece hoca veya admin yapabilir
    if (booked_by === 'teacher') {
      const isOwner = user?.id === artist.profile_id
      if (!isOwner && !isAdminUser(user)) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
      }
    }

    const totalPrice = Number(slot.price_per_session)
    const needsPayment = slot.payment_enabled && booked_by === 'student'

    // Rezervasyonu oluştur
    const { data: booking, error: bookErr } = await admin
      .from('teaching_bookings')
      .insert({
        slot_id,
        artist_id: artist.id,
        student_id: user?.id ?? null,
        student_name,
        student_email,
        student_phone,
        lesson_date,
        // Öğrenci yaptıysa hoca onaylayacak (pending), hoca yaptıysa öğrenci onaylayacak (awaiting_student)
        status: booked_by === 'teacher' ? 'awaiting_student' : 'pending',
        payment_status: 'pending',
        amount_paid: totalPrice,
        notes: notes || null,
        booked_by,
      } as any)
      .select()
      .single()

    if (bookErr || !booking) return NextResponse.json({ error: bookErr?.message ?? 'Rezervasyon oluşturulamadı' }, { status: 500 })

    // Hoca öğrenci için rezervasyon yaptıysa → öğrenciye onay emaili gönder
    if (booked_by === 'teacher') {
      const confirmUrl = `${SITE_URL}/confirm-booking?token=${(booking as any).confirmation_token}`
      try {
        await resend.emails.send({
          from: 'Sahne.Today <noreply@sahne.today>',
          to: student_email,
          subject: `Ders Rezervasyonu — ${artist.stage_name}`,
          html: `<p>Merhaba ${student_name},</p>
<p><strong>${artist.stage_name}</strong> sizi <strong>${slot.instrument}</strong> dersi için rezerve etti.</p>
<p>Tarih: ${new Date(lesson_date + 'T00:00:00').toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
<p>Saat: ${slot.start_time?.slice(0, 5)} – ${slot.end_time?.slice(0, 5)}</p>
<p>Ücret: ₺${totalPrice}</p>
<p><a href="${confirmUrl}" style="display:inline-block;background:#1D9E75;color:white;padding:10px 20px;border-radius:6px;text-decoration:none;font-weight:bold;">Rezervasyonu Onayla</a></p>
<p>Onaylamazsanız rezervasyon 48 saat içinde otomatik iptal olur.</p>`,
        })
      } catch (e) { console.error('Teacher booking email error:', e) }

      return NextResponse.json({ success: true, booking_id: (booking as any).id })
    }

    // Öğrenci yaptıysa ve ödeme kapalıysa → hocaya bildirim emaili
    if (!needsPayment) {
      try {
        await resend.emails.send({
          from: 'Sahne.Today <noreply@sahne.today>',
          to: student_email,
          subject: 'Rezervasyonunuz Alındı',
          html: `<p>Merhaba ${student_name}, rezervasyonunuz alındı. Öğretmen onayladığında bildirim alacaksınız.</p>`,
        })
      } catch (e) { console.error('Booking confirmation email error:', e) }

      return NextResponse.json({ success: true, booking_id: (booking as any).id })
    }

    // Ödeme aktifse PayTR token üret
    const merchantOid = `TB${Date.now()}${Math.random().toString(36).slice(2, 8).toUpperCase()}`

    // merchantOid'i booking'e kaydet
    await admin.from('teaching_bookings').update({ paytr_order_id: merchantOid } as any).eq('id', (booking as any).id)

    const userIp = req.headers.get('x-forwarded-for')?.split(',')[0].trim() ?? '127.0.0.1'
    const paymentAmount = Math.round(totalPrice * 100)
    const userBasket = Buffer.from(JSON.stringify([[`${artist.stage_name} — ${slot.instrument} Dersi`, totalPrice.toFixed(2), 1]])).toString('base64')
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
