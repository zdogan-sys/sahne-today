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
  photo_name: string | null
  latitude: number | null
  longitude: number | null
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
      'X-Goog-FieldMask': 'places.id,places.displayName,places.formattedAddress,places.internationalPhoneNumber,places.nationalPhoneNumber,places.websiteUri,places.types,places.rating,places.addressComponents,places.photos,places.location',
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
    photo_name: p.photos?.[0]?.name ?? null,
    latitude: typeof p.location?.latitude === 'number' ? p.location.latitude : null,
    longitude: typeof p.location?.longitude === 'number' ? p.location.longitude : null,
  }))
}

// Google Places fotoğrafını indirip venues bucket'ına yükler, public URL döner
async function fetchAndStorePhoto(photoName: string, placeId: string, admin: ReturnType<typeof adminClient>): Promise<string | null> {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY
  if (!apiKey || !photoName) return null
  try {
    const mediaUrl = `https://places.googleapis.com/v1/${photoName}/media?maxWidthPx=1200&key=${apiKey}`
    const imgRes = await fetch(mediaUrl, { signal: AbortSignal.timeout(15000) })
    if (!imgRes.ok) return null
    const contentType = imgRes.headers.get('content-type') ?? 'image/jpeg'
    const ext = contentType.includes('png') ? 'png' : 'jpg'
    const buffer = Buffer.from(await imgRes.arrayBuffer())
    const path = `imported/${placeId}.${ext}`

    const { error } = await admin.storage.from('venues').upload(path, buffer, {
      contentType,
      upsert: true,
    })
    if (error) return null

    const { data } = admin.storage.from('venues').getPublicUrl(path)
    return data.publicUrl ?? null
  } catch {
    return null
  }
}

// Web sitesi domain'inden logo çeker (Clearbit), venues bucket'ına yükler
async function fetchAndStoreLogo(website: string, placeId: string, admin: ReturnType<typeof adminClient>): Promise<string | null> {
  try {
    const host = new URL(website).hostname.replace(/^www\./, '')
    if (!host) return null
    const logoUrl = `https://logo.clearbit.com/${host}?size=256`
    const imgRes = await fetch(logoUrl, { signal: AbortSignal.timeout(10000) })
    if (!imgRes.ok) return null
    const contentType = imgRes.headers.get('content-type') ?? 'image/png'
    if (!contentType.startsWith('image/')) return null
    const ext = contentType.includes('png') ? 'png' : contentType.includes('svg') ? 'svg' : 'jpg'
    const buffer = Buffer.from(await imgRes.arrayBuffer())
    if (buffer.length < 200) return null // boş/placeholder logo
    const path = `imported/logo-${placeId}.${ext}`

    const { error } = await admin.storage.from('venues').upload(path, buffer, { contentType, upsert: true })
    if (error) return null
    const { data } = admin.storage.from('venues').getPublicUrl(path)
    return data.publicUrl ?? null
  } catch {
    return null
  }
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
    const genres: string[] = Array.isArray(body.genres) ? body.genres : []
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

      const photo_url = v.photo_name ? await fetchAndStorePhoto(v.photo_name, v.place_id, admin) : null
      const logo_url = v.website ? await fetchAndStoreLogo(v.website, v.place_id, admin) : null

      const { error } = await admin.from('venues').insert({
        name: v.name,
        city,
        district: v.district || null,
        address: v.address || '',
        venue_type: venueType,
        genres,
        phone: v.phone || null,
        social_links,
        photo_url,
        logo_url,
        latitude: v.latitude,
        longitude: v.longitude,
        verified: false,
      })
      if (error) errors.push(`${v.name}: ${error.message}`)
      else imported++
    }

    return NextResponse.json({ imported, skipped: venues.length - imported - errors.length, errors })
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
}
