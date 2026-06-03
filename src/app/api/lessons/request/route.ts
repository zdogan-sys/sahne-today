import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

const resend = new Resend(process.env.RESEND_API_KEY)

export async function POST(req: NextRequest) {
  try {
    const {
      venue_id, template_id, request_type,
      requested_date, requested_time, preferred_instructor,
      subject, weeks, hours_per_session,
      student_name, student_email, student_phone, notes,
    } = await req.json()

    if (!venue_id || !request_type || !student_name || !student_email || !student_phone) {
      return NextResponse.json({ error: 'Eksik alan' }, { status: 400 })
    }
    if (!['private', 'group'].includes(request_type)) {
      return NextResponse.json({ error: 'Geçersiz tip' }, { status: 400 })
    }
    if (request_type === 'private' && (!requested_date || !requested_time)) {
      return NextResponse.json({ error: 'Özel ders için tarih ve saat zorunlu' }, { status: 400 })
    }

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    const admin = createAdminClient()

    const { data: request, error } = await admin
      .from('lesson_requests')
      .insert({
        venue_id,
        template_id: template_id || null,
        request_type,
        requested_date: request_type === 'private' ? requested_date : null,
        requested_time: request_type === 'private' ? requested_time + ':00' : null,
        preferred_instructor: preferred_instructor || null,
        subject: subject || null,
        weeks: weeks ? Number(weeks) : null,
        hours_per_session: hours_per_session ? Number(hours_per_session) : null,
        student_id: user?.id ?? null,
        student_name,
        student_email,
        student_phone,
        notes: notes || null,
        status: 'pending',
      } as any)
      .select()
      .single()

    if (error || !request) {
      return NextResponse.json({ error: error?.message ?? 'Talep oluşturulamadı' }, { status: 500 })
    }

    // Venue sahibine bildirim
    try {
      const { data: venue } = await admin
        .from('venues')
        .select('name, profiles:owner_id(email)')
        .eq('id', venue_id)
        .single()
      const ownerEmail = (venue as any)?.profiles?.email
      if (ownerEmail) {
        const typeLabel = request_type === 'private' ? 'Özel Ders' : 'Grup Dersi (Ön Kayıt)'
        await resend.emails.send({
          from: 'Sahne.Today <noreply@sahne.today>',
          to: ownerEmail,
          subject: `Yeni Ders Talebi — ${(venue as any).name}`,
          html: `<p>Yeni bir ders talebi aldınız.</p>
<p><strong>Tip:</strong> ${typeLabel}</p>
<p><strong>Öğrenci:</strong> ${student_name} · ${student_phone} · ${student_email}</p>
${request_type === 'private' ? `<p><strong>İstenen:</strong> ${requested_date} ${requested_time}</p>` : ''}
<p>Rezervasyonlar sayfasından oda ve eğitmen atayarak onaylayabilirsiniz.</p>`,
        })
      }
    } catch (e) { console.error('lesson request notify error:', e) }

    return NextResponse.json({ success: true, request_id: (request as any).id })
  } catch (err) {
    console.error('lessons/request error:', err)
    return NextResponse.json({ error: 'Sunucu hatası' }, { status: 500 })
  }
}
