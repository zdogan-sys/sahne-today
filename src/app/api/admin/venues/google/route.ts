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

// Google key'i: hangi isimle tanımlıysa onu al (esnek)
function googleKey(): string {
  return process.env.GOOGLE_MAPS_API_KEY || process.env.GOOGLE_API_KEY || process.env.GOOGLE_CSE_KEY || ''
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

// Google Places'ten mekanın web sitesini bulur — çalışan Places API kullanır, arama motoru gerekmez.
async function placeWebsite(name: string, city: string): Promise<string | null> {
  const apiKey = googleKey()
  if (!apiKey) return null
  try {
    const res = await fetch('https://places.googleapis.com/v1/places:searchText', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': apiKey,
        'X-Goog-FieldMask': 'places.websiteUri',
      },
      body: JSON.stringify({ textQuery: city ? `${name} ${city}` : name, languageCode: 'tr', regionCode: 'TR', maxResultCount: 1 }),
      signal: AbortSignal.timeout(10000),
    })
    if (!res.ok) return null
    const data = await res.json()
    return data.places?.[0]?.websiteUri ?? null
  } catch {
    return null
  }
}

async function searchPlaces(query: string, city: string): Promise<PlaceResult[]> {
  const apiKey = googleKey()
  if (!apiKey) throw new Error('Google API key tanımlı değil')

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
  const apiKey = googleKey()
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

function extractIg(html: string): string | null {
  const m = html.match(/instagram\.com(?:%2F|\/)([A-Za-z0-9_.]+)/i)
  if (!m) return null
  try { return normalizeIg(decodeURIComponent(m[1])) } catch { return normalizeIg(m[1]) }
}

// Bir arama sonucu linki DİREKT bir IG profili mi? (post /p/, reel, explore değil) → handle döner.
// instagram.com/<handle> ya da /<handle>/ ya da /<handle>?... biçimini kabul eder, alt yolları reddeder.
function profileHandleFromUrl(u: string): string | null {
  const m = u.match(/^https?:\/\/(?:www\.)?instagram\.com\/([A-Za-z0-9_.]+)\/?(?:\?|$)/i)
  if (!m) return null
  const h = m[1].toLowerCase()
  if (IG_NON_HANDLE.has(h) || h.length < 2) return null
  return h
}

// Google Custom Search API — resmi, JSON, instagram linklerini direkt verir
async function googleCseInstagram(name: string, city: string): Promise<string | null> {
  const key = googleKey()
  const cx = process.env.GOOGLE_CSE_ID
  if (!key || !cx) return null
  try {
    const q = encodeURIComponent(`site:instagram.com ${name} ${city}`)
    const url = `https://www.googleapis.com/customsearch/v1?key=${key}&cx=${cx}&q=${q}&num=5`
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) })
    if (!res.ok) return null
    const data = await res.json()
    for (const item of data.items ?? []) {
      const ig = extractIg(item.link ?? '')
      if (ig) return ig
    }
    return null
  } catch {
    return null
  }
}

// Serper.dev (Google sonuçları) — sitesiz mekanlar için. Gerçek API, rate-limit/429 yok.
// Yüksek isabet: ilk 3 organik sonuçtaki İLK direkt-profil linkini alır; profil yoksa null
// döner (alakasız bir handle önermez). SERPER_API_KEY tanımlı değilse pas geçer.
async function serperInstagram(name: string, city: string): Promise<string | null> {
  const key = process.env.SERPER_API_KEY
  if (!key) return null
  try {
    const res = await fetch('https://google.serper.dev/search', {
      method: 'POST',
      headers: { 'X-API-KEY': key, 'Content-Type': 'application/json' },
      body: JSON.stringify({ q: `${name} ${city} instagram`, gl: 'tr', hl: 'tr', num: 10 }),
      signal: AbortSignal.timeout(8000),
    })
    if (!res.ok) return null
    const data = await res.json()
    const links: string[] = (data.organic ?? []).map((o: any) => o.link).filter(Boolean)
    for (const l of links.slice(0, 3)) {
      const h = profileHandleFromUrl(l)
      if (h) return `https://www.instagram.com/${h}/`
    }
    return null
  } catch {
    return null
  }
}

// İsimden Instagram tahmini. Sıra: ucuzdan/güvenilirden pahalıya.
// 1) Google Places (çalışıyor, ücretsiz) → mekanın web sitesi → siteden IG linki. Rate-limit yok.
// 2) Serper/Google (sitesiz mekanlar için) — sorgu başına 1 kredi, yüksek isabetli.
// 3) Google CSE — env tanımlı ve projede erişim varsa otomatik devreye girer.
async function guessInstagramByName(name: string, city: string): Promise<string | null> {
  const site = await placeWebsite(name, city)
  if (site) {
    const ig = await deriveInstagram(site)
    if (ig) return ig
  }

  const serper = await serperInstagram(name, city)
  if (serper) return serper

  const cse = await googleCseInstagram(name, city)
  if (cse) return cse

  return null
}

// Tanı: motorların gerçekte ne döndürdüğünü gösterir
async function probeEngines(name: string, city: string) {
  const query = `${name} ${city} instagram`
  const out: any[] = []
  // Runtime'ın gördüğü GOOGLE/CSE değişken isimleri (değer değil, sadece ad)
  const envKeys = Object.keys(process.env).filter(k => /google|cse/i.test(k))
  out.push({ engine: '_env', googleKeys: envKeys, cseIdSet: !!process.env.GOOGLE_CSE_ID, cseKeySet: !!process.env.GOOGLE_CSE_KEY, mapsKeySet: !!process.env.GOOGLE_MAPS_API_KEY })
  // Asıl kaynak: Google Places → web sitesi → siteden IG
  try {
    const site = await placeWebsite(name, city)
    const ig = site ? await deriveInstagram(site) : null
    out.push({ engine: 'places-derive', website: site, ig })
  } catch (e: any) { out.push({ engine: 'places-derive', error: e?.name ?? 'err' }) }
  // Google CSE durumu
  {
    const key = googleKey()
    const cx = process.env.GOOGLE_CSE_ID
    if (!cx) {
      out.push({ engine: 'google-cse', note: 'GOOGLE_CSE_ID tanımlı değil' })
    } else {
      try {
        const q = encodeURIComponent(`site:instagram.com ${name} ${city}`)
        const res = await fetch(`https://www.googleapis.com/customsearch/v1?key=${key}&cx=${cx}&q=${q}&num=5`, { signal: AbortSignal.timeout(8000) })
        const data = await res.json().catch(() => ({}))
        out.push({ engine: 'google-cse', status: res.status, items: (data.items ?? []).length, firstLink: data.items?.[0]?.link ?? null, apiError: data.error?.message ?? null })
      } catch (e: any) { out.push({ engine: 'google-cse', error: e?.name ?? 'err' }) }
    }
  }
  // Sitesiz mekanlar için kaynak: Serper (Google)
  {
    const key = process.env.SERPER_API_KEY
    if (!key) {
      out.push({ engine: 'serper', note: 'SERPER_API_KEY tanımlı değil' })
    } else {
      try {
        const res = await fetch('https://google.serper.dev/search', {
          method: 'POST',
          headers: { 'X-API-KEY': key, 'Content-Type': 'application/json' },
          body: JSON.stringify({ q: query, gl: 'tr', hl: 'tr', num: 10 }), signal: AbortSignal.timeout(6000),
        })
        const data = await res.json().catch(() => ({}))
        const links: string[] = (data.organic ?? []).map((o: any) => o.link).filter(Boolean)
        let pick: string | null = null
        for (const l of links.slice(0, 3)) { const h = profileHandleFromUrl(l); if (h) { pick = h; break } }
        out.push({ engine: 'serper', status: res.status, topLinks: links.slice(0, 3), pick, credits: data.credits, apiError: data.message ?? null })
      } catch (e: any) { out.push({ engine: 'serper', error: e?.name ?? 'err' }) }
    }
  }
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

// Mekan IG'sini etkinlik tarayıcısının kaynak listesine (instagram_sources) aktif olarak ekler.
// Aynı username zaten varsa atlar (tekrar kayıt önlenir). Eklendiyse true döner.
async function addInstagramSource(admin: ReturnType<typeof adminClient>, igUrl: string, city: string | null): Promise<boolean> {
  const username = igUrl.replace(/\/$/, '').split('/').pop() ?? ''
  if (!username) return false
  const { data: existing } = await admin.from('instagram_sources').select('id').eq('username', username).limit(1)
  if (existing?.length) return false
  const { error } = await admin.from('instagram_sources').insert({
    username,
    instagram_url: igUrl.startsWith('http') ? igUrl : `https://www.instagram.com/${username}/`,
    city: city ?? null,
  })
  return !error
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

  // ── INSTAGRAM TAHMİN ONAYLA ── seçilenleri kaydet + etkinlik tarayıcısına kaynak olarak ekle
  if (body.action === 'apply_instagram') {
    const admin = adminClient()
    const items: { id: string; instagram: string }[] = body.items ?? []
    let updated = 0
    let sourcesAdded = 0
    for (const it of items) {
      const { data: v } = await admin.from('venues').select('social_links, city').eq('id', it.id).single()
      const sl = (v as any)?.social_links ?? {}
      const { error } = await admin.from('venues').update({ social_links: { ...sl, instagram: it.instagram } }).eq('id', it.id)
      if (!error) {
        updated++
        if (await addInstagramSource(admin, it.instagram, (v as any)?.city ?? null)) sourcesAdded++
      }
    }
    return NextResponse.json({ updated, sourcesAdded })
  }

  // ── MEKAN IG'LERİNİ TARAMA KAYNAĞINA AKTAR ── (tek seferlik: IG'si olup kaynak olmayan mekanlar)
  if (body.action === 'sync_instagram_sources') {
    const admin = adminClient()
    const { data } = await admin.from('venues').select('social_links, city').limit(2000)
    let total = 0
    let added = 0
    for (const v of (data ?? []) as any[]) {
      const ig = v.social_links?.instagram
      if (!ig) continue
      total++
      if (await addInstagramSource(admin, ig, v.city ?? null)) added++
    }
    return NextResponse.json({ total, added })
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
}
