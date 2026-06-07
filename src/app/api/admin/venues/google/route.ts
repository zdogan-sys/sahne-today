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

type PlaceResult = {
  place_id: string
  name: string
  address: string
  district: string | null
  phone: string | null
  website: string | null
  rating: number | null
  types: string[]
}

// Adres bileşenlerinden ilçe (administrative_area_level_2) çıkar
function extractDistrict(components: any[]): string | null {
  if (!Array.isArray(components)) return null
  const lvl2 = components.find(c => c.types?.includes('administrative_area_level_2'))
  if (lvl2) return lvl2.longText ?? lvl2.shortText ?? null
  const sub = components.find(c => c.types?.includes('sublocality') || c.types?.includes('locality'))
  return sub?.longText ?? null
}

async function searchPlaces(query: string, city: string): Promise<PlaceResult[]> {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY
  if (!apiKey) throw new Error('GOOGLE_MAPS_API_KEY tanımlı değil')

  const textQuery = city ? `${query} ${city}` : query

  const res = await fetch('https://places.googleapis.com/v1/places:searchText', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': apiKey,
      'X-Goog-FieldMask': 'places.id,places.displayName,places.formattedAddress,places.internationalPhoneNumber,places.nationalPhoneNumber,places.websiteUri,places.types,places.rating,places.addressComponents',
    },
    body: JSON.stringify({
      textQuery,
      languageCode: 'tr',
      regionCode: 'TR',
      maxResultCount: 20,
    }),
    signal: AbortSignal.timeout(15000),
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Google Places hatası (${res.status}): ${err.slice(0, 200)}`)
  }

  const data = await res.json()
  const places = data.places ?? []

  return places.map((p: any): PlaceResult => ({
    place_id: p.id,
    name: p.displayName?.text ?? '',
    address: p.formattedAddress ?? '',
    district: extractDistrict(p.addressComponents),
    phone: p.nationalPhoneNumber ?? p.internationalPhoneNumber ?? null,
    website: p.websiteUri ?? null,
    rating: typeof p.rating === 'number' ? p.rating : null,
    types: p.types ?? [],
  }))
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!isAdminUser(user)) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })

  const body = await req.json()

  // ── ARAMA ──
  if (body.action === 'search') {
    try {
      const results = await searchPlaces(body.query ?? '', body.city ?? '')

      // Sistemde zaten kayıtlı olanları işaretle (isim + şehir ile)
      const admin = adminClient()
      const names = results.map(r => r.name)
      const { data: existing } = await admin
        .from('venues')
        .select('name')
        .in('name', names)
      const existingNames = new Set((existing ?? []).map((v: any) => v.name))

      return NextResponse.json({
        results: results.map(r => ({ ...r, already_exists: existingNames.has(r.name) })),
      })
    } catch (err: any) {
      return NextResponse.json({ error: err?.message ?? 'Arama hatası' }, { status: 500 })
    }
  }

  // ── İÇE AKTAR ──
  if (body.action === 'import') {
    const venues: PlaceResult[] = body.venues ?? []
    const city: string = body.city ?? ''
    const venueType: string = body.venue_type ?? 'live_music'
    if (!venues.length) return NextResponse.json({ error: 'Seçili mekan yok' }, { status: 400 })

    const admin = adminClient()
    let imported = 0
    const errors: string[] = []

    for (const v of venues) {
      // Duplicate kontrolü
      const { data: dup } = await admin
        .from('venues')
        .select('id')
        .eq('name', v.name)
        .eq('city', city)
        .limit(1)
      if (dup?.length) continue

      const social_links: Record<string, string> = {}
      if (v.website) social_links.website = v.website

      const { error } = await admin.from('venues').insert({
        name: v.name,
        city,
        district: v.district || null,
        address: v.address || '',
        venue_type: venueType,
        genres: [],
        phone: v.phone || null,
        social_links,
        verified: false,
      })
      if (error) errors.push(`${v.name}: ${error.message}`)
      else imported++
    }

    return NextResponse.json({ imported, skipped: venues.length - imported - errors.length, errors })
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
}
