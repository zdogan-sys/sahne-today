import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'
import { createAdminClient } from '@/lib/supabase/admin'

const resend = new Resend(process.env.RESEND_API_KEY)

export async function POST(req: NextRequest) {
  const { token, action } = await req.json()
  if (!token || !['confirm', 'cancel'].includes(action)) {
    return NextResponse.json({ error: 'Geçersiz istek' }, { status: 400 })
  }

  const admin = createAdminClient()

  const { data: booking } = await admin
    .from('teaching_bookings')
    .select('*, teaching_slots(instrument, start_time, end_time, artists(stage_name))')
    .eq('confirmation_token', token)
    .single()

  if (!booking) return NextResponse.json({ error: 'Rezervasyon bulunamadı' }, { status: 404 })
  if (booking.status !== 'awaiting_student' && booking.status !== 'pending') {
    return NextResponse.json({ error: 'Bu rezervasyon zaten işleme alındı' }, { status: 409 })
  }

  const newStatus = action === 'confirm' ? 'confirmed' : 'cancelled'
  await admin.from('teaching_bookings').update({ status: newStatus } as any).eq('confirmation_token', token)

  const slot = booking.teaching_slots as any
  const artistName = slot?.artists?.stage_name ?? ''

  if (action === 'confirm') {
    try {
      await resend.emails.send({
        from: 'Sahne.Today <noreply@sahne.today>',
        to: booking.student_email,
        subject: `Ders Rezervasyonunuz Onaylandı — ${artistName}`,
        html: `<p>Merhaba ${booking.student_name}, rezervasyonunuz onaylandı.</p>
<p>${slot?.instrument} · ${new Date(booking.lesson_date + 'T00:00:00').toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' })} · ${slot?.start_time?.slice(0, 5)}</p>`,
      })
    } catch (e) { console.error(e) }
  }

  return NextResponse.json({ success: true, status: newStatus })
}
