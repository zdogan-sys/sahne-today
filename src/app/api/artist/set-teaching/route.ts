export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { isAdminUser } from '@/lib/admin'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { artist_id, is_teaching, teaching_instruments, looking_for_band } = await req.json()
  if (!artist_id) return NextResponse.json({ error: 'artist_id gerekli' }, { status: 400 })

  if (!isAdminUser(user)) {
    const { data: artist } = await supabase
      .from('artists')
      .select('profile_id')
      .eq('id', artist_id)
      .single()
    if (artist?.profile_id !== user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }
  }

  const admin = createAdminClient()
  const update: Record<string, unknown> = {}
  if (typeof is_teaching === 'boolean') update.is_teaching = is_teaching
  if (Array.isArray(teaching_instruments)) update.teaching_instruments = teaching_instruments
  if (typeof looking_for_band === 'boolean') update.looking_for_band = looking_for_band

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: 'Güncellenecek alan yok' }, { status: 400 })
  }

  const { error } = await admin.from('artists').update(update).eq('id', artist_id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ success: true })
}
