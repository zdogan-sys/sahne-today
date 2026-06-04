import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

const resend = new Resend(process.env.RESEND_API_KEY)
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL!

export async function POST(req: NextRequest) {
  try {
    const { email, name, context } = await req.json()
    if (!email) return NextResponse.json({ error: 'E-posta zorunlu' }, { status: 400 })

    // Yetki: giriş yapmış olmalı (mekan sahibi)
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Yetkisiz' }, { status: 401 })

    const admin = createAdminClient()

    // Davet linki üret (kullanıcı yoksa oluşturur)
    const { data: linkData, error: linkErr } = await admin.auth.admin.generateLink({
      type: 'invite',
      email,
      options: {
        data: { display_name: name || email.split('@')[0] },
        redirectTo: `${SITE_URL}/auth/set-password`,
      },
    } as any)

    // Kullanıcı zaten varsa → mevcut id'yi bul ve dön (yeni davet gönderme)
    if (linkErr) {
      const msg = (linkErr.message || '').toLowerCase()
      if (msg.includes('already') || msg.includes('registered') || msg.includes('exist')) {
        const { data: list } = await admin.auth.admin.listUsers({ perPage: 1000 })
        const existing = list?.users?.find((u: any) => u.email?.toLowerCase() === email.toLowerCase())
        if (existing) return NextResponse.json({ success: true, user_id: existing.id, existed: true })
      }
      return NextResponse.json({ error: linkErr.message }, { status: 500 })
    }

    const newUser = (linkData as any)?.user
    const actionLink = (linkData as any)?.properties?.action_link

    // Daveti Resend ile gönder
    if (actionLink) {
      try {
        await resend.emails.send({
          from: 'Sahne.Today <noreply@sahne.today>',
          to: email,
          subject: context ? `${context} — Üyeliğini Tamamla` : 'Sahne.Today — Üyeliğini Tamamla',
          html: `<p>Merhaba ${name || ''},</p>
<p>${context ? `<strong>${context}</strong> için ` : ''}adına bir üyelik oluşturuldu.</p>
<p>Aşağıdaki bağlantıya tıklayıp şifreni belirleyerek profilini sahiplenebilirsin:</p>
<p><a href="${actionLink}" style="display:inline-block;background:#1D9E75;color:white;padding:10px 20px;border-radius:6px;text-decoration:none;font-weight:bold;">Üyeliği Tamamla</a></p>
<p>Bağlantı bir süre sonra geçersiz olur.</p>`,
        })
      } catch (e) { console.error('invite email error:', e) }
    }

    return NextResponse.json({ success: true, user_id: newUser?.id ?? null })
  } catch (err) {
    console.error('members/invite error:', err)
    return NextResponse.json({ error: 'Sunucu hatası' }, { status: 500 })
  }
}
