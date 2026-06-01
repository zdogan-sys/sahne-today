import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { Resend } from 'resend'
import { createAdminClient } from '@/lib/supabase/admin'

const MERCHANT_KEY = process.env.PAYTR_MERCHANT_KEY!
const MERCHANT_SALT = process.env.PAYTR_MERCHANT_SALT!
const resend = new Resend(process.env.RESEND_API_KEY)

export async function GET() { return NextResponse.json({ ok: true }) }

export async function POST(req: NextRequest) {
  let formData: FormData
  try { formData = await req.formData() } catch { return new NextResponse('OK') }

  const merchantOid = formData.get('merchant_oid') as string
  const status = formData.get('status') as string
  const totalAmount = formData.get('total_amount') as string
  const hash = formData.get('hash') as string

  const expectedHash = crypto.createHmac('sha256', MERCHANT_KEY)
    .update(merchantOid + MERCHANT_SALT + status + totalAmount).digest('base64')
  if (hash !== expectedHash) return new NextResponse('PAYTR_INVALID_HASH', { status: 400 })

  const admin = createAdminClient()
  const { data: booking } = await admin
    .from('teaching_bookings')
    .select('*, teaching_slots(instrument, day_of_week, start_time, end_time), artists(stage_name)')
    .eq('paytr_order_id', merchantOid)
    .single()

  if (!booking) return new NextResponse('OK')

  if (status === 'success') {
    await admin.from('teaching_bookings').update({ status: 'confirmed', payment_status: 'paid' } as any).eq('paytr_order_id', merchantOid)

    const slot = booking.teaching_slots as any
    const artist = booking.artists as any

    try {
      await resend.emails.send({
        from: 'Sahne.Today <noreply@sahne.today>',
        to: booking.student_email,
        subject: `Ders Rezervasyonunuz Onaylandı — ${artist?.stage_name}`,
        html: `<p>Merhaba ${booking.student_name},</p>
<p><strong>${artist?.stage_name}</strong> ile <strong>${slot?.instrument}</strong> dersiniz onaylandı.</p>
<p>Tarih: ${new Date(booking.lesson_date + 'T00:00:00').toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
<p>Saat: ${slot?.start_time?.slice(0, 5)} – ${slot?.end_time?.slice(0, 5)}</p>
<p>Ödenen tutar: ₺${booking.amount_paid}</p>`,
      })
    } catch (e) { console.error('Teaching booking email error:', e) }
  } else {
    await admin.from('teaching_bookings').update({ status: 'cancelled', payment_status: 'pending' } as any).eq('paytr_order_id', merchantOid)
  }

  return new NextResponse('OK')
}
