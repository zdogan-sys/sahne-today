'use server'

import { createClient } from '@supabase/supabase-js'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { Resend } from 'resend'
import { ADMIN_EMAIL, isPrivilegedUser } from '@/lib/admin'
import { notifyFollowers } from '@/app/actions/follow'

async function getAdminClient() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
}

export async function claimVenue(venueId: string) {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Giriş yapmanız gerekiyor.' }

  const { data: venue } = await supabase
    .from('venues').select('id, owner_id').eq('id', venueId).single()
  if (!venue) return { success: false, error: 'Mekan bulunamadı.' }
  if (venue.owner_id) return { success: false, error: 'Bu mekan zaten bir hesaba bağlı.' }

  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
  const { error } = await admin
    .from('venues').update({ owner_id: user.id }).eq('id', venueId).is('owner_id', null)
  if (error) return { success: false, error: error.message }

  revalidatePath(`/venues/${venueId}`)
  return { success: true }
}

export async function respondToSlotApplication(appId: string, status: 'accepted' | 'rejected') {
  const supabaseAuth = await createServerClient()
  const { data: { user } } = await supabaseAuth.auth.getUser()
  if (!user) return { success: false, error: 'Oturum açmanız gerekiyor.' }

  const admin = await getAdminClient()

  // Verify venue ownership
  const { data: app } = await admin
    .from('applications')
    .select('*, artists(stage_name, profile_id, profiles:profile_id(email)), slots(start_time, end_time, event_type, venues(id, name, owner_id))')
    .eq('id', appId)
    .single()

  if (!app) return { success: false, error: 'Başvuru bulunamadı.' }
  const venue = (app as any).slots?.venues
  if (!venue || (venue.owner_id !== user.id && !await isPrivilegedUser(user))) {
    return { success: false, error: 'Yetkiniz yok.' }
  }

  // If accepting, create the event
  if (status === 'accepted') {
    const slot = (app as any).slots
    const artist = (app as any).artists
    const { data: newEvent } = await admin.from('events').insert({
      venue_id: venue.id,
      artist_id: (app as any).artist_id,
      slot_id: (app as any).slot_id,
      band_id: (app as any).band_id ?? null,
      title: `${slot?.event_type ?? 'Konser'} — ${artist?.stage_name ?? ''}`,
      event_date: (app as any).event_date ?? new Date().toISOString().slice(0, 10),
      start_time: slot?.start_time,
      end_time: slot?.end_time,
      genre: null,
      entry_type: 'free',
      status: 'confirmed',
    } as any).select('id').single()
    if (newEvent) notifyFollowers((newEvent as any).id).catch(() => {})
  }

  // Update application status (DB trigger will create in-app notification)
  const { error } = await admin.from('applications').update({ status } as any).eq('id', appId)
  if (error) return { success: false, error: error.message }

  // Send email
  const artistEmail = (app as any).artists?.profiles?.email
  const artistName = (app as any).artists?.stage_name ?? ''
  const venueName = venue?.name ?? ''

  if (artistEmail) {
    try {
      const resend = new Resend(process.env.RESEND_API_KEY)
      await resend.emails.send({
        from: 'Sahne.Today <bildirim@sahne.today>',
        to: artistEmail,
        subject: status === 'accepted'
          ? `Başvurunuz Onaylandı — ${venueName}`
          : `Başvurunuz Hakkında — ${venueName}`,
        html: applicationEmailHtml({ artistName, venueName, status }),
      })
    } catch {
      // Email failure is non-critical
    }
  }

  return { success: true }
}

function applicationEmailHtml({ artistName, venueName, status }: {
  artistName: string; venueName: string; status: 'accepted' | 'rejected'
}) {
  const accepted = status === 'accepted'
  return `<!DOCTYPE html><html lang="tr"><head><meta charset="UTF-8"/></head>
<body style="margin:0;padding:0;background:#0f0f0f;font-family:sans-serif">
<div style="max-width:480px;margin:0 auto;padding:40px 20px">
  <p style="color:#E4E0D8;font-size:28px;font-weight:900;letter-spacing:2px;margin:0 0 32px">SAHNE.TODAY</p>
  <div style="background:#1a1a1a;border-radius:16px;padding:32px">
    <p style="color:${accepted ? '#4ade80' : '#f87171'};font-size:12px;font-weight:600;letter-spacing:1px;margin:0 0 8px">
      ${accepted ? 'BAŞVURU ONAYLANDI' : 'BAŞVURU REDDEDİLDİ'}
    </p>
    <h2 style="color:#E4E0D8;font-size:20px;margin:0 0 16px">${venueName}</h2>
    <p style="color:#9a9a8e;font-size:14px;margin:0 0 24px">
      Merhaba ${artistName}, ${venueName} mekanına yaptığınız başvuru ${accepted ? 'onaylandı' : 'reddedildi'}.
      ${accepted ? 'Etkinlik takviminize eklendi.' : ''}
    </p>
    <a href="https://sahne.today/dashboard" style="display:inline-block;background:#D4537E;color:#fff;padding:12px 28px;border-radius:10px;text-decoration:none;font-weight:600;font-size:14px">Panelime Git</a>
  </div>
  <p style="color:#555;font-size:12px;text-align:center;margin-top:24px">sahne.today</p>
</div>
</body></html>`
}
