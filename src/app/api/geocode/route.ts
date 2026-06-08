export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// Adresten koordinat bulur — zaten açık olan Places API (New) text search'i kullanır
export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const apiKey = process.env.GOOGLE_MAPS_API_KEY
  if (!apiKey) return NextResponse.json({ error: 'GOOGLE_MAPS_API_KEY tanımlı değil' }, { status: 500 })

  const { address } = await req.json()
  if (!address || !String(address).trim()) return NextResponse.json({ error: 'Adres gerekli' }, { status: 400 })

  try {
    const res = await fetch('https://places.googleapis.com/v1/places:searchText', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': apiKey,
        'X-Goog-FieldMask': 'places.location,places.formattedAddress',
      },
      body: JSON.stringify({ textQuery: String(address), languageCode: 'tr', regionCode: 'TR', maxResultCount: 1 }),
      signal: AbortSignal.timeout(12000),
    })
    if (!res.ok) {
      const err = await res.text()
      return NextResponse.json({ error: `Geocode hatası (${res.status}): ${err.slice(0, 150)}` }, { status: 500 })
    }
    const data = await res.json()
    const place = data.places?.[0]
    if (!place?.location) return NextResponse.json({ error: 'Konum bulunamadı' }, { status: 404 })

    return NextResponse.json({
      lat: place.location.latitude,
      lng: place.location.longitude,
      formatted: place.formattedAddress ?? null,
    })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? 'Geocode hatası' }, { status: 500 })
  }
}
