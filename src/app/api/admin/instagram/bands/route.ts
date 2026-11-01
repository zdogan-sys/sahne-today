export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createSupabase } from '@supabase/supabase-js'
import { isAdminUser } from '@/lib/admin'
import { cleanIgHandle, serperInstagram } from '@/lib/instagram-search'

function adminClient() {
  return createSupabase(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  )
}

async function requireAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  return isAdminUser(user)
}

// GET /api/admin/instagram/bands → onay bekleyen grup önerileri
export async function GET() {
  if (!await requireAdmin()) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  const { data, error } = await adminClient()
    .from('band_drafts').select('*').eq('status', 'pending')
    .order('created_at', { ascending: false }).limit(500)
  if (error) return NextResponse.json({ error: error.message, drafts: [] })
  return NextResponse.json({ drafts: data ?? [] })
}

// POST /api/admin/instagram/bands { action: 'find_ig', id, name?, city? } → Serper ile IG tahmini
export async function POST(req: NextRequest) {
  if (!await requireAdmin()) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  const body = await req.json().catch(() => ({}))
  if (body.action !== 'find_ig' || !body.id) return NextResponse.json({ error: 'Invalid' }, { status: 400 })

  const admin = adminClient()
  const { data: draft } = await admin.from('band_drafts').select('*').eq('id', body.id).single()
  if (!draft) return NextResponse.json({ error: 'Öneri bulunamadı' }, { status: 404 })
  const name = (typeof body.name === 'string' && body.name.trim()) || (draft as any).name
  const city = (typeof body.city === 'string' ? body.city : (draft as any).city) ?? ''

  const url = await serperInstagram(name, city)
  const handle = url ? cleanIgHandle(url) : null
  if (!handle) return NextResponse.json({ handle: null, message: 'Instagram profili bulunamadı.' })
  await admin.from('band_drafts').update({ instagram_handle: handle }).eq('id', body.id)
  return NextResponse.json({ handle })
}

// PATCH /api/admin/instagram/bands { id, status: 'approved' | 'skipped', name?, instagram?, city?, genres? }
// 'approved' → ÜYESİZ ve SAHİPSİZ (creator_id NULL) grup oluşturur; üyeler sonradan sahiplenir.
export async function PATCH(req: NextRequest) {
  if (!await requireAdmin()) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  const { id, status, name: bodyName, instagram, city: bodyCity, genres: bodyGenres } = await req.json().catch(() => ({}))
  if (!id || !['approved', 'skipped'].includes(status))
    return NextResponse.json({ error: 'Invalid' }, { status: 400 })

  const admin = adminClient()

  if (status === 'skipped') {
    const { error } = await admin.from('band_drafts').update({ status }).eq('id', id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ success: true })
  }

  const { data: draft } = await admin.from('band_drafts').select('*').eq('id', id).single()
  if (!draft) return NextResponse.json({ error: 'Öneri bulunamadı' }, { status: 404 })
  const d = draft as any

  const name = (typeof bodyName === 'string' && bodyName.trim() ? bodyName : d.name).replace(/\s+/g, ' ').trim()
  const city = typeof bodyCity === 'string' ? (bodyCity.trim() || null) : d.city
  const genres: string[] = Array.isArray(bodyGenres) ? bodyGenres.filter((g: any) => typeof g === 'string' && g) : (d.genres ?? [])
  // instagram alanı gönderildiyse (boş dahil) onu kullan, yoksa taslaktakini
  const handle = typeof instagram === 'string' ? cleanIgHandle(instagram) : d.instagram_handle
  if (typeof instagram === 'string' && instagram.trim() && !handle)
    return NextResponse.json({ error: 'Instagram hesabı geçersiz.' }, { status: 400 })

  // Bu arada aynı isimle elle eklenmiş olabilir — varsa ona bağla, yenisini açma
  let bandId: string | null = null
  const { data: existing } = await admin.from('bands').select('id').ilike('name', name).limit(1)
  if (existing?.length) {
    bandId = (existing[0] as any).id
  } else {
    const { data: created, error } = await admin.from('bands').insert({
      name,
      city,
      genres,
      creator_id: null,
      social_links: handle ? { instagram: `https://www.instagram.com/${handle}/` } : {},
    } as any).select('id').single()
    if (error || !created) return NextResponse.json({ error: error?.message ?? 'Grup oluşturulamadı' }, { status: 500 })
    bandId = (created as any).id
  }

  // Bu isimle daha önce kaydedilmiş, performer'ı bağlanmamış etkinlikleri gruba bağla
  const { data: linked } = await admin.from('events')
    .update({ band_id: bandId } as any)
    .ilike('artist_name', name)
    .is('band_id', null)
    .is('artist_id', null)
    .select('id')

  const { error: dErr } = await admin.from('band_drafts')
    .update({ status, band_id: bandId, name, instagram_handle: handle, city, genres })
    .eq('id', id)
  if (dErr) return NextResponse.json({ error: dErr.message }, { status: 500 })
  return NextResponse.json({ success: true, band_id: bandId, linked_events: (linked ?? []).length, existed: !!existing?.length })
}
