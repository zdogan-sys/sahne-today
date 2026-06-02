import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Giriş gerekli' }, { status: 401 })

    const { artist_id, venue_id, course_id, rating, comment } = await req.json()

    if (!rating || rating < 1 || rating > 5) {
      return NextResponse.json({ error: 'Puan 1-5 arasında olmalı' }, { status: 400 })
    }
    if (!artist_id && !venue_id && !course_id) {
      return NextResponse.json({ error: 'Hedef belirtilmeli' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('reviews')
      .upsert({
        reviewer_id: user.id,
        artist_id: artist_id ?? null,
        venue_id: venue_id ?? null,
        course_id: course_id ?? null,
        rating,
        comment: comment || null,
      } as any, {
        onConflict: artist_id
          ? 'reviewer_id,artist_id'
          : venue_id
          ? 'reviewer_id,venue_id'
          : 'reviewer_id,course_id',
      })
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ review: data })
  } catch (err) {
    console.error('reviews POST error:', err)
    return NextResponse.json({ error: 'Sunucu hatası' }, { status: 500 })
  }
}
