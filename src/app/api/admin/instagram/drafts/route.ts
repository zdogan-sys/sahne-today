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

// PATCH /api/admin/instagram/drafts  { id, status: 'approved' | 'skipped' }
export async function PATCH(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!isAdminUser(user)) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })

  const { id, status } = await req.json()
  if (!id || !['approved', 'skipped'].includes(status))
    return NextResponse.json({ error: 'Invalid' }, { status: 400 })

  const { error } = await adminClient().from('event_drafts').update({ status }).eq('id', id)
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
