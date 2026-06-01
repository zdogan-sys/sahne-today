import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { Resend } from 'resend'
import { createAdminClient } from '@/lib/supabase/admin'

const MERCHANT_KEY = process.env.PAYTR_MERCHANT_KEY!
const MERCHANT_SALT = process.env.PAYTR_MERCHANT_SALT!
const resend = new Resend(process.env.RESEND_API_KEY)

export async function GET() {
  return NextResponse.json({ ok: true, endpoint: 'studios-paytr-callback' })
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

  const { data: reservation } = await admin
    .from('studio_reservations')
    .select('*, venues(name)')
    .eq('paytr_order_id', merchantOid)
    .single()

  if (!reservation) return new NextResponse('OK')

  if (status === 'success') {
    await admin
      .from('studio_reservations')
      .update({ status: 'confirmed' })
      .eq('paytr_order_id', merchantOid)

    try {
      await resend.emails.send({
        from: 'Sahne.Today <noreply@sahne.today>',
        to: reservation.reserver_email,
        subject: `Stüdyo Rezervasyonunuz Onaylandı — ${(reservation.venues as any)?.name}`,
        html: `<p>Merhaba ${reservation.reserver_name},</p>
<p><strong>${(reservation.venues as any)?.name}</strong> için rezervasyonunuz onaylandı.</p>
<p>Tarih: ${reservation.reservation_date} ${reservation.start_time} - ${reservation.end_time}</p>
<p>Toplam: ₺${reservation.total_price}</p>`,
      })
    } catch (e) {
      console.error('Studio reservation email error:', e)
    }
  } else {
    await admin
      .from('studio_reservations')
      .update({ status: 'cancelled' })
      .eq('paytr_order_id', merchantOid)
  }

  return new NextResponse('OK')
}
