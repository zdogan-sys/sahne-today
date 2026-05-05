import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(req: NextRequest) {
  const auth = req.headers.get('authorization')
  if (!auth?.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'Yetkisiz' }, { status: 401 })
  }
  const token = auth.slice(7)

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { global: { headers: { Authorization: `Bearer ${token}` } }, auth: { autoRefreshToken: false, persistSession: false } }
  )
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Geçersiz token' }, { status: 401 })

  const { venue_id } = await req.json()
  if (!venue_id) return NextResponse.json({ error: 'venue_id gerekli' }, { status: 400 })

  const admin = createAdminClient()
  const { data: venue } = await admin.from('venues').select('id, owner_id').eq('id', venue_id).single()
  if (!venue) return NextResponse.json({ error: 'Mekan bulunamadı' }, { status: 404 })
  if (venue.owner_id) return NextResponse.json({ error: 'Bu mekan zaten bir hesaba bağlı.' }, { status: 409 })

  const { error } = await admin.from('venues').update({ owner_id: user.id }).eq('id', venue_id).is('owner_id', null)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ success: true })
}
