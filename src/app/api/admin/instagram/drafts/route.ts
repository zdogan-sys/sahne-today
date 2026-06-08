export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createSupabase } from '@supabase/supabase-js'
import { isAdminUser } from '@/lib/admin'

function adminClient() {
  return createSupabase(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  )
}

// IG handle'ından mekanı bulur (venue.social_links.instagram ile eşleştirir).
// ilike ile aday çeker, sonra handle'ı tam eşleştirip yanlış-pozitifi (zula ⊂ zulabar) eler.
async function findVenueByIgHandle(admin: ReturnType<typeof adminClient>, handle: string) {
  if (!handle) return null
  const { data } = await admin
    .from('venues')
    .select('id, name, social_links')
    .ilike('social_links->>instagram', `%${handle}%`)
    .limit(10)
  for (const v of (data ?? []) as any[]) {
    const m = (v.social_links?.instagram ?? '').match(/instagram\.com\/([A-Za-z0-9_.]+)/i)
    if (m && m[1].toLowerCase() === handle.toLowerCase()) return v
  }
  return null
}

// PATCH /api/admin/instagram/drafts  { id, status: 'approved' | 'skipped' }
// 'approved' → taslaktan gerçek (confirmed) etkinlik oluşturur, sonra taslağı approved işaretler.
export async function PATCH(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!isAdminUser(user)) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })

  const { id, status } = await req.json()
  if (!id || !['approved', 'skipped'].includes(status))
    return NextResponse.json({ error: 'Invalid' }, { status: 400 })

  const admin = adminClient()

  if (status === 'approved') {
    const { data: draft } = await admin.from('event_drafts').select('*').eq('id', id).single()
    if (!draft) return NextResponse.json({ error: 'Taslak bulunamadı' }, { status: 404 })

    const ex = (draft as any).extracted ?? {}
    if (!ex.date) {
      return NextResponse.json({ error: 'Taslakta tarih yok — etkinlik oluşturulamadı. Tarih netleşince elle ekleyin.' }, { status: 400 })
    }

    const handle = String((draft as any).source_username ?? '').replace(/^@/, '').trim().toLowerCase()
    const venue = await findVenueByIgHandle(admin, handle)
    if (!venue) {
      return NextResponse.json({ error: `@${handle} bir mekanla eşleşmiyor — etkinlik oluşturulamadı.` }, { status: 400 })
    }

    // Aynı mekan + tarih + benzer başlıkta etkinlik varsa tekrar oluşturma
    const titleKey = String(ex.title ?? '').slice(0, 20)
    const { data: dup } = await admin.from('events')
      .select('id').eq('venue_id', venue.id).eq('event_date', ex.date)
      .ilike('title', `%${titleKey}%`).limit(1)

    if (!dup?.length) {
      const { error: evErr } = await admin.from('events').insert({
        venue_id: venue.id,
        venue_name: venue.name,
        title: ex.title || 'Canlı Müzik',
        event_date: ex.date,
        start_time: ex.time || '21:00',
        end_time: null,
        artist_name: ex.performer || null,
        description: ex.description || null,
        entry_type: 'free',
        status: 'confirmed',
      } as any)
      if (evErr) return NextResponse.json({ error: 'Etkinlik oluşturulamadı: ' + evErr.message }, { status: 500 })
    }
  }

  const { error } = await admin.from('event_drafts').update({ status }).eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}

// POST /api/admin/instagram/drafts/sources  { action, ...payload }
export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!isAdminUser(user)) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })

  const admin = adminClient()
  const body = await req.json()

  if (body.action === 'add') {
    const url: string = body.url?.trim()
    if (!url) return NextResponse.json({ error: 'URL gerekli' }, { status: 400 })
    const username = url.replace(/\/$/, '').split('/').pop() ?? url
    const { error } = await admin.from('instagram_sources').insert({
      username,
      instagram_url: url.startsWith('http') ? url : `https://www.instagram.com/${url}/`,
      city: body.city ?? null,
    })
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ success: true })
  }

  if (body.action === 'toggle') {
    const { error } = await admin.from('instagram_sources')
      .update({ is_active: body.is_active })
      .eq('id', body.id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ success: true })
  }

  if (body.action === 'delete') {
    const { error } = await admin.from('instagram_sources').delete().eq('id', body.id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ success: true })
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
}
