import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'
import { createAdminClient } from '@/lib/supabase/admin'

const resend = new Resend(process.env.RESEND_API_KEY)

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const admin = createAdminClient()
  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  const tomorrowStr = tomorrow.toISOString().split('T')[0]

  // Yarın dersi olan ve henüz reminder gönderilmemiş bookings
  const { data: bookings } = await admin
    .from('teaching_bookings')
    .select('id, student_name, student_email, lesson_date, teaching_slots(instrument, start_time, end_time, instructor_name, artists(stage_name), venues(name))')
    .eq('lesson_date', tomorrowStr)
    .eq('status', 'confirmed')
    .is('reminder_sent_at', null)

  if (!bookings || bookings.length === 0) {
    return NextResponse.json({ sent: 0 })
  }

  let sent = 0
  for (const b of bookings) {
    const slot = (b as any).teaching_slots
    const instructorName = slot?.instructor_name ?? slot?.artists?.stage_name ?? slot?.venues?.name ?? 'Eğitmeniniz'
    const dateStr = new Date(b.lesson_date + 'T00:00:00').toLocaleDateString('tr-TR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })

    try {
      await resend.emails.send({
        from: 'Sahne.Today <noreply@sahne.today>',
        to: b.student_email,
        subject: `Yarın ${slot?.instrument} dersiniz var! 🎵`,
        html: `<p>Merhaba ${b.student_name},</p>
<p>Yarın <strong>${instructorName}</strong> ile <strong>${slot?.instrument}</strong> dersiniz bulunuyor.</p>
<p><strong>Tarih:</strong> ${dateStr}</p>
<p><strong>Saat:</strong> ${slot?.start_time?.slice(0, 5)} – ${slot?.end_time?.slice(0, 5)}</p>
<p>Bol keyifli dersler!</p>
<p style="color:#888;font-size:12px">— Sahne.Today</p>`,
      })

      await admin
        .from('teaching_bookings')
        .update({ reminder_sent_at: new Date().toISOString() } as any)
        .eq('id', b.id)

      sent++
    } catch (e) {
      console.error(`Reminder email failed for booking ${b.id}:`, e)
    }
  }

  return NextResponse.json({ sent })
}
