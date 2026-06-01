import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { Resend } from 'resend'
import { createAdminClient } from '@/lib/supabase/admin'

const MERCHANT_KEY = process.env.PAYTR_MERCHANT_KEY!
const MERCHANT_SALT = process.env.PAYTR_MERCHANT_SALT!
const resend = new Resend(process.env.RESEND_API_KEY)

export async function GET() {
  return NextResponse.json({ ok: true, endpoint: 'courses-paytr-callback' })
}

export async function POST(req: NextRequest) {
  let formData: FormData
  try {
    formData = await req.formData()
  } catch {
    return new NextResponse('OK')
  }

  const merchantOid = formData.get('merchant_oid') as string
  const status = formData.get('status') as string
  const totalAmount = formData.get('total_amount') as string
  const hash = formData.get('hash') as string

  const hashStr = merchantOid + MERCHANT_SALT + status + totalAmount
  const expectedHash = crypto.createHmac('sha256', MERCHANT_KEY).update(hashStr).digest('base64')
  if (hash !== expectedHash) return new NextResponse('PAYTR_INVALID_HASH', { status: 400 })

  const admin = createAdminClient()

  const { data: enrollment } = await admin
    .from('course_enrollments')
    .select('*, courses(title, price_per_session)')
    .eq('paytr_order_id', merchantOid)
    .single()

  if (!enrollment) return new NextResponse('OK')

  if (status === 'success') {
    await admin
      .from('course_enrollments')
      .update({ status: 'confirmed', payment_status: 'paid' })
      .eq('paytr_order_id', merchantOid)

    if (enrollment.session_id) {
      await admin
        .from('course_sessions')
        .update({ status: 'booked' })
        .eq('id', enrollment.session_id)
    }

    try {
      await resend.emails.send({
        from: 'Sahne.Today <noreply@sahne.today>',
        to: enrollment.student_email,
        subject: `Kurs Kaydınız Onaylandı — ${(enrollment.courses as any)?.title}`,
        html: `<p>Merhaba ${enrollment.student_name},</p>
<p><strong>${(enrollment.courses as any)?.title}</strong> kursuna kaydınız başarıyla tamamlandı.</p>
<p>Ücret: ₺${(enrollment.courses as any)?.price_per_session}</p>
<p>Sahne.Today ekibi olarak başarılar dileriz!</p>`,
      })
    } catch (e) {
      console.error('Enrollment email error:', e)
    }
  } else {
    await admin
      .from('course_enrollments')
      .update({ status: 'cancelled', payment_status: 'pending' })
      .eq('paytr_order_id', merchantOid)
  }

  return new NextResponse('OK')
}
