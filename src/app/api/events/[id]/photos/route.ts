import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createAdminClient } from '@/lib/supabase/admin'
import { ADMIN_EMAIL } from '@/lib/admin'

async function getUser(req: NextRequest) {
  const auth = req.headers.get('authorization')
  if (!auth?.startsWith('Bearer ')) return null
  const token = auth.slice(7)
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { global: { headers: { Authorization: `Bearer ${token}` } }, auth: { autoRefreshToken: false, persistSession: false } }
  )
  const { data: { user } } = await supabase.auth.getUser()
  return user
}

async function isParty(userId: string, userEmail: string | undefined, eventId: string): Promise<boolean> {
  if (userEmail === ADMIN_EMAIL) return true
  const admin = createAdminClient()
  const { data: ev } = await admin
    .from('events')
    .select('artists(profile_id), bands(creator_id), venues(owner_id)')
    .eq('id', eventId)
    .single()
  if (!ev) return false
  const a = (ev as any).artists
  const b = (ev as any).bands
  const v = (ev as any).venues
  return a?.profile_id === userId || b?.creator_id === userId || v?.owner_id === userId
}

// POST: add photo
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const user = await getUser(req)
  if (!user) return NextResponse.json({ error: 'Yetkisiz' }, { status: 401 })
  if (!(await isParty(user.id, user.email ?? undefined, id))) return NextResponse.json({ error: 'Yetki yok' }, { status: 403 })

  const { url } = await req.json()
  if (!url) return NextResponse.json({ error: 'url gerekli' }, { status: 400 })

  const admin = createAdminClient()
  const { data: ev } = await admin.from('events').select('photos').eq('id', id).single()
  const current: string[] = (ev as any)?.photos ?? []
  const { error } = await admin.from('events').update({ photos: [...current, url] } as any).eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}

// DELETE: remove photo
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const user = await getUser(req)
  if (!user) return NextResponse.json({ error: 'Yetkisiz' }, { status: 401 })
  if (!(await isParty(user.id, user.email ?? undefined, id))) return NextResponse.json({ error: 'Yetki yok' }, { status: 403 })

  const { url } = await req.json()
  if (!url) return NextResponse.json({ error: 'url gerekli' }, { status: 400 })

  const admin = createAdminClient()
  const { data: ev } = await admin.from('events').select('photos').eq('id', id).single()
  const current: string[] = (ev as any)?.photos ?? []
  const { error } = await admin.from('events').update({ photos: current.filter((p: string) => p !== url) } as any).eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
