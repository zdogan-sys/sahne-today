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

// Instagram handle'ları için geçersiz yollar (post/reel/explore vb. handle değil)
const IG_NON_HANDLE = new Set(['p', 'reel', 'reels', 'explore', 'tv', 'stories', 'accounts', 'about', 'directory'])

function normalizeIg(handle: string): string | null {
  const h = handle.replace(/\/$/, '').split('/')[0].split('?')[0].trim()
  if (!h || IG_NON_HANDLE.has(h.toLowerCase()) || h.length < 2) return null
  return `https://www.instagram.com/${h}/`
}

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'

function extractIg(html: string): string | null {
  const m = html.match(/instagram\.com(?:%2F|\/)([A-Za-z0-9_.]+)/i)
  if (!m) return null
  try { return normalizeIg(decodeURIComponent(m[1])) } catch { return normalizeIg(m[1]) }
}

// Bing sonuç linkleri base64 ile gizli (u=a1<base64>) — çözüp instagram ara
function extractIgFromBing(html: string): string | null {
  // Önce düz dene
  const plain = extractIg(html)
  if (plain) return plain
  const matches = Array.from(html.matchAll(/u=a1([A-Za-z0-9_\-]+)/g))
  for (const m of matches) {
    try {
      const b64 = m[1].replace(/-/g, '+').replace(/_/g, '/')
      const decoded = Buffer.from(b64, 'base64').toString('utf8')
      if (/instagram\.com/i.test(decoded)) {
        const ig = extractIg(decoded)
        if (ig) return ig
      }
    } catch { /* sonraki */ }
  }
  return null
}

// İsimden Instagram tahmini — Bing (redirect linklerini base64 çözerek)
async function guessInstagramByName(name: string, city: string): Promise<string | null> {
  const query = `${name} ${city} instagram`
  try {
    const res = await fetch(`https://www.bing.com/search?q=${encodeURIComponent(query)}&setlang=tr&count=10`, {
      headers: { 'User-Agent': UA, 'Accept-Language': 'tr-TR,tr;q=0.9' }, signal: AbortSignal.timeout(8000),
    })
    if (res.ok) return extractIgFromBing(await res.text())
  } catch { /* bitti */ }
  return null
}

// Tanı: motorların gerçekte ne döndürdüğünü gösterir
async function probeEngines(name: string, city: string) {
  const query = `${name} ${city} instagram`
  const out: any[] = []
  try {
    const res = await fetch('https://lite.duckduckgo.com/lite/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'User-Agent': UA },
      body: `q=${encodeURIComponent(query)}`, signal: AbortSignal.timeout(6000),
    })
    const html = await res.text()
    out.push({ engine: 'ddg-lite', status: res.status, len: html.length, hasIg: /instagram\.com/i.test(html) })
  } catch (e: any) { out.push({ engine: 'ddg-lite', error: e?.name ?? 'err' }) }
  try {
    const res = await fetch(`https://www.bing.com/search?q=${encodeURIComponent(query)}&setlang=tr`, {
      headers: { 'User-Agent': UA, 'Accept-Language': 'tr-TR,tr;q=0.9' }, signal: AbortSignal.timeout(6000),
    })
    const html = await res.text()
    out.push({ engine: 'bing', status: res.status, len: html.length, decoded: extractIgFromBing(html) })
  } catch (e: any) { out.push({ engine: 'bing', error: e?.name ?? 'err' }) }
  return { query, results: out }
}

// Sınırlı eşzamanlılıkla map (wall-clock süreyi kısaltır)
async function mapPool<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const results: R[] = new Array(items.length)
  let idx = 0
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (idx < items.length) {
      const i = idx++
      results[i] = await fn(items[i])
    }
  })
  await Promise.all(workers)
  return results
}

// Website'ten Instagram linkini bulur: website zaten IG ise onu, değilse site içindeki IG linkini
async function deriveInstagram(website: string): Promise<string | null> {
  try {
    const url = new URL(website)
    // 1) Website doğrudan Instagram ise
    if (url.hostname.replace(/^www\./, '').toLowerCase() === 'instagram.com') {
      return normalizeIg(url.pathname.replace(/^\//, ''))
    }
    // 2) Siteyi aç, içindeki ilk instagram.com/<handle> linkini bul
    const res = await fetch(website, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; SahneBot/1.0)' },
      signal: AbortSignal.timeout(8000),
    })
    if (!res.ok) return null
    const html = await res.text()
    const m = html.match(/instagram\.com\/([A-Za-z0-9_.]+)/i)
    if (m) return normalizeIg(m[1])
    return null
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
      if (v.website) {
        const ig = await deriveInstagram(v.website)
        if (ig) social_links.instagram = ig
        // Website Instagram değilse website olarak da sakla
        if (!ig || !/instagram\.com/i.test(v.website)) social_links.website = v.website
      }

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

  // ── INSTAGRAM BACKFILL ── (websitesi olup IG'si olmayan mevcut mekanlar)
  if (body.action === 'backfill_instagram') {
    const admin = adminClient()
    const { data } = await admin.from('venues').select('id, social_links').limit(1000)
    let updated = 0
    let checked = 0
    for (const v of (data ?? []) as any[]) {
      const sl = v.social_links ?? {}
      if (sl.instagram || !sl.website) continue
      checked++
      const ig = await deriveInstagram(sl.website)
      if (ig) {
        await admin.from('venues').update({ social_links: { ...sl, instagram: ig } }).eq('id', v.id)
        updated++
      }
    }
    return NextResponse.json({ updated, checked })
  }

  // ── INSTAGRAM TAHMİN (isimden) ── onay için aday liste döner
  if (body.action === 'guess_instagram') {
    const admin = adminClient()
    const cityFilter: string = body.city ?? ''
    let q = admin.from('venues').select('id, name, city, social_links').limit(400)
    if (cityFilter) q = (q as any).eq('city', cityFilter)
    const { data } = await q

    // IG'si olmayanları al, parti başına en fazla 18 mekan tara
    const todo = ((data ?? []) as any[]).filter(v => !v.social_links?.instagram).slice(0, 18)

    // 6'lı paralel havuzla tara
    const results = await mapPool(todo, 6, async (v) => {
      const ig = await guessInstagramByName(v.name, v.city ?? '')
      return ig ? { id: v.id, name: v.name, city: v.city, instagram: ig } : null
    })
    const candidates = results.filter(Boolean) as { id: string; name: string; city: string; instagram: string }[]

    // Hiç aday yoksa ilk mekanda tanı çalıştır
    let debug: any = undefined
    if (candidates.length === 0 && todo.length > 0) {
      debug = await probeEngines(todo[0].name, todo[0].city ?? '')
    }

    return NextResponse.json({ candidates, scanned: todo.length, debug })
  }

  // ── INSTAGRAM TAHMİN ONAYLA ── seçilenleri kaydet
  if (body.action === 'apply_instagram') {
    const admin = adminClient()
    const items: { id: string; instagram: string }[] = body.items ?? []
    let updated = 0
    for (const it of items) {
      const { data: v } = await admin.from('venues').select('social_links').eq('id', it.id).single()
      const sl = (v as any)?.social_links ?? {}
      const { error } = await admin.from('venues').update({ social_links: { ...sl, instagram: it.instagram } }).eq('id', it.id)
      if (!error) updated++
    }
    return NextResponse.json({ updated })
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
}
