import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const adminClient = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
)

export async function POST(req: NextRequest) {
  const formData = await req.formData()
  const file = formData.get('file') as File | null
  const bucket = (formData.get('bucket') as string) || 'avatars'

  if (!file) return NextResponse.json({ error: 'Dosya bulunamadı' }, { status: 400 })

  const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
  if (!allowed.includes(file.type)) {
    return NextResponse.json({ error: 'Geçersiz dosya türü' }, { status: 400 })
  }
  if (file.size > 10 * 1024 * 1024) {
    return NextResponse.json({ error: 'Dosya 10MB\'dan küçük olmalı' }, { status: 400 })
  }

  const ext = file.name.split('.').pop() ?? 'jpg'
  const path = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
  const buffer = Buffer.from(await file.arrayBuffer())

  const { error } = await adminClient.storage.from(bucket).upload(path, buffer, {
    contentType: file.type,
    upsert: true,
  })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const { data } = adminClient.storage.from(bucket).getPublicUrl(path)
  return NextResponse.json({ url: data.publicUrl })
}
