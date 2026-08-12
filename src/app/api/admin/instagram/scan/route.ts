export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createSupabase } from '@supabase/supabase-js'
import { isAdminUser } from '@/lib/admin'
import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic()

function adminClient() {
  return createSupabase(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  )
}

// Eşsiz (lone) surrogate karakterleri temizler — bozuk emoji vb. JSON'u geçersiz kılıp
// Anthropic API'sine 400 ("no low surrogate") attırıyordu. Geçerli çiftler korunur.
function stripBadChars(s: string): string {
  return s.replace(/[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/g, '')
}

type IgPost = { image: string | null; caption: string }

// Instagram gönderilerini Apify'ın "Instagram Scraper" actor'ü üzerinden çeker.
// Ücretsiz viewer siteleri (imginn/picuki → picnob/pixwox) sırayla Cloudflare tarafından
// bloklandığı için (Ağustos 2026) terk edildi, yerine ücretli/stabil bir API kullanılıyor.
async function fetchInstagramPosts(username: string): Promise<IgPost[]> {
  const token = process.env.APIFY_API_TOKEN
  if (!token) return []

  try {
    const res = await fetch(
      'https://api.apify.com/v2/actors/apify~instagram-scraper/run-sync-get-dataset-items',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          resultsType: 'posts',
          directUrls: [`https://www.instagram.com/${username}/`],
          resultsLimit: 12,
        }),
        signal: AbortSignal.timeout(60000),
      }
    )
    if (!res.ok) return []
    const items = await res.json()
    if (!Array.isArray(items)) return []

    return items
      .filter((it: any) => typeof it?.caption === 'string' && it.caption.trim().length >= 8)
      .slice(0, 12)
      .map((it: any) => ({
        image: it.displayUrl ?? null,
        caption: stripBadChars(String(it.caption)).replace(/\s+/g, ' ').trim().slice(0, 600),
      }))
  } catch {
    return []
  }
}

const SYSTEM_PROMPT = `Sen bir etkinlik tespit asistanısın. Mekan Instagram sayfalarından alınan içeriklerde yaklaşan etkinlikleri tespit ediyorsun.

ETKİNLİK TÜRÜ KAPSAMI — şunların hepsini yakala:
- Canlı müzik, konser, DJ gecesi
- Tiyatro oyunu, müzikal, gösteri, performans
- Stand-up, doğaçlama, söyleşi, şiir gecesi
- Dans gösterisi, dans gecesi
- Özel gece, kutlama, festival

Sana mekanın son gönderileri "[1]", "[2]" gibi numaralarla verilir. Her etkinlik için onu hangi numaralı gönderide bulduğunu "post" alanında belirt.

Yanıtını MUTLAKA şu JSON formatında ver, başka hiçbir şey yazma:

Etkinlik varsa:
{"has_event": true, "events": [{"title": "etkinlik adı", "performer": "sanatçı/grup/yazar veya null", "date": "YYYY-MM-DD veya null", "time": "HH:MM veya null", "description": "kısa açıklama", "post": <gönderi numarası, örn. 1>, "free": <giriş AÇIKÇA ücretsiz/serbest deniyorsa true, aksi halde false>, "weekday": <her hafta TEKRARLAYAN bir etkinlikse o günün numarası, yoksa null>}]}

Notlar:
- Metinde açık bir tarih (gün+ay veya YYYY-MM-DD) varsa ve o tarih bugünden ÖNCE değilse (bugün dahil sonrası) o etkinliği MUTLAKA ekle.
- "Sezon finali", "son oyun", "son temsil", "sezon sonu" gibi ifadeler etkinliğin geçmişte olduğu anlamına GELMEZ — yalnızca tarihe bak.
- Tarihi geçmiş olan etkinlikleri (yani tarihi bugünden kesinlikle önce olanları) dahil etme.
- "free": yalnızca metinde net "giriş ücretsiz/serbest/bedava" varsa true. Telefon/rezervasyon numaralarını ücret sanma. Emin değilsen false.
- "weekday": SADECE açıkça SÜREKLİ HAFTALIK tekrarı belirten ifadelerde doldur — "HER perşembe", "her hafta cumartesi", "perşembe GECELERİ/akşamları" (süreklilik). Gün no: 0=Pazar,1=Pazartesi,2=Salı,3=Çarşamba,4=Perşembe,5=Cuma,6=Cumartesi.
- "Bu perşembe", "bu cumartesi", "önümüzdeki cuma" gibi TEK bir yaklaşan günü kastediyorsa → weekday=null; bunun yerine "date"i bugünden hesaplayıp o günün GERÇEK tarihini (YYYY-MM-DD) ver. Şüphedeysen weekday=null (tek seferlik varsay).

Etkinlik yoksa:
{"has_event": false, "events": []}`

// Tarama kaynaklarını mekan profillerindeki IG'lerle EŞİTLER (profil = tek doğru kaynak).
// Profilde IG olan mekanı aktif kaynak yapar; profilde artık olmayan eski adresleri pasifleştirir
// (örn. mekanın IG'si değişince eski hesap bir daha taranmaz). Manuel/eşleşmeyen hesaplar da pasifleşir.
async function syncSourcesFromVenues(admin: ReturnType<typeof adminClient>) {
  const { data: venues } = await admin.from('venues').select('social_links, city').limit(5000)
  const venueHandles = new Map<string, string | null>()
  for (const v of (venues ?? []) as any[]) {
    const ig = v.social_links?.instagram
    if (!ig) continue
    const m = String(ig).match(/instagram\.com\/([A-Za-z0-9_.]+)/i)
    if (m) venueHandles.set(m[1].toLowerCase(), v.city ?? null)
  }
  const { data: sources } = await admin.from('instagram_sources').select('id, username, is_active')
  const existing = new Map<string, { id: string; is_active: boolean }>()
  for (const s of (sources ?? []) as any[]) existing.set(String(s.username).toLowerCase(), { id: s.id, is_active: s.is_active })

  const toInsert: any[] = []
  const toActivate: string[] = []
  venueHandles.forEach((city, h) => {
    const e = existing.get(h)
    if (!e) toInsert.push({ username: h, instagram_url: `https://www.instagram.com/${h}/`, city, is_active: true })
    else if (!e.is_active) toActivate.push(e.id)
  })
  const toDeactivate: string[] = []
  existing.forEach((e, h) => { if (!venueHandles.has(h) && e.is_active) toDeactivate.push(e.id) })

  if (toInsert.length) await admin.from('instagram_sources').insert(toInsert)
  if (toActivate.length) await admin.from('instagram_sources').update({ is_active: true }).in('id', toActivate)
  if (toDeactivate.length) await admin.from('instagram_sources').update({ is_active: false }).in('id', toDeactivate)
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!isAdminUser(user)) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })

  const admin = adminClient()
  const body = await req.json().catch(() => ({}))
  const sourceId: string | undefined = body.source_id
  const debugMode: boolean = !!body.debug

  // Tek kaynakta: sadece onu tara. Toplu taramada: önce profillerle eşitle, sonra timeout
  // olmaması için en eski taranan BATCH kadar kaynağı tara (rotasyon).
  const BATCH = 10
  let query = admin.from('instagram_sources').select('*').eq('is_active', true)
  if (sourceId) {
    query = (query as any).eq('id', sourceId)
  } else {
    await syncSourcesFromVenues(admin)
    query = (query as any).order('last_checked_at', { ascending: true, nullsFirst: true }).limit(BATCH)
  }

  const { data: sources, error: srcError } = await query
  if (srcError) return NextResponse.json({ error: srcError.message, scanned: 0, drafts: 0 })
  if (!sources?.length) return NextResponse.json({ scanned: 0, drafts: 0, debug: 'no active sources found' })

  // Debug modu: içeriği, postları ve Claude yanıtını döner, taslak oluşturmaz
  if (debugMode && sources.length === 1) {
    const source = sources[0]
    const posts = await fetchInstagramPosts(source.username)
    const today = new Date().toISOString().slice(0, 10)
    const promptBody = posts.map((p, i) => `[${i + 1}] ${p.caption}`).join('\n\n')
    let claudeRaw = ''
    let claudeParsed: any = null
    try {
      const response = await anthropic.messages.create({
        model: 'claude-sonnet-4-6',
        max_tokens: 1024,
        system: SYSTEM_PROMPT,
        messages: [{ role: 'user', content: `Kaynak: ${source.instagram_url} (${source.city ?? ''}). Bugün: ${today}.\n---\n${promptBody}` }],
      })
      claudeRaw = response.content.find(b => b.type === 'text')?.text ?? ''
      const mDebug = stripBadChars(claudeRaw).match(/\{[\s\S]*\}/)
      if (mDebug) claudeParsed = JSON.parse(mDebug[0])
    } catch (e: any) {
      claudeRaw = `HATA: ${e?.message}`
    }
    return NextResponse.json({
      debug: true,
      username: source.username,
      contentLength: promptBody.length,
      postsFound: posts.length,
      posts: posts.map(p => ({ caption: p.caption.slice(0, 200) })),
      claudeRaw,
      claudeParsed,
      today,
    })
  }

  // Tek bir kaynağı tarar, oluşan taslak sayısını döner
  async function scanSource(source: any): Promise<number> {
    try {
      const posts = await fetchInstagramPosts(source.username)

      if (!posts.length) {
        await admin.from('instagram_sources').update({
          last_checked_at: new Date().toISOString(),
          last_error: 'İçerik alınamadı (Apify sonuç döndürmedi — kota/token kontrol edilmeli)',
        }).eq('id', source.id)
        return 0
      }

      // Claude'a numaralı caption'ları ver
      const promptBody = posts.map((p, i) => `[${i + 1}] ${p.caption}`).join('\n\n')
      const today = new Date().toISOString().slice(0, 10)

      const response = await anthropic.messages.create({
        model: 'claude-sonnet-4-6',
        max_tokens: 1024,
        system: SYSTEM_PROMPT,
        messages: [{
          role: 'user',
          content: `Kaynak: ${source.instagram_url} (${source.city ?? ''}). Bugün: ${today}. Tarihleri buna göre çöz (örn. "Bu Cuma").
---
${promptBody}`,
        }],
      })

      const text = response.content.find(b => b.type === 'text')?.text ?? ''

      let parsed: { has_event: boolean; events: any[] } | null = null
      try {
        const m = stripBadChars(text).match(/\{[\s\S]*\}/)
        if (m) parsed = JSON.parse(m[0])
      } catch { /* ignore */ }

      let drafts = 0
      if (parsed?.has_event && parsed.events?.length) {
        for (const event of parsed.events) {
          // Güvenlik filtresi: geçmiş tarihli (bugünden önce) tekil etkinlikleri atla.
          // Tekrarlayan (weekday dolu) ya da tarihsiz olanlar elenmez.
          if (typeof event.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(event.date) && event.date < today && event.weekday == null) continue

          // Gönderi numarasından görseli eşleştir; numarayı sakla, ham 'post' alanını çıkar
          const pIdx = typeof event.post === 'number' ? event.post - 1 : -1
          const post = pIdx >= 0 ? posts[pIdx] : undefined
          delete event.post
          event.image = post?.image ?? null
          const caption = post?.caption ?? posts[0]?.caption ?? ''

          const titleSnippet = String(event.title ?? '').slice(0, 30)
          // Mükerrer kontrolü TÜM durumlara bakar (pending/approved/skipped) — onaylanan/atlanan
          // etkinlik yeni taramada tekrar taslak olmasın. Aynı başlık + (varsa) aynı tarih = dup.
          let dupQ = admin
            .from('event_drafts')
            .select('id')
            .eq('source_id', source.id)
            .ilike('extracted->>title', `%${titleSnippet}%`)
          if (typeof event.date === 'string' && event.date) dupQ = dupQ.eq('extracted->>date', event.date)
          const { data: existing } = await dupQ.limit(1)

          if (!existing?.length) {
            await admin.from('event_drafts').insert({
              source_id: source.id,
              source_username: source.username,
              post_url: source.instagram_url,
              caption,
              extracted: event,
              status: 'pending',
            })
            drafts++
          }
        }
      }

      await admin.from('instagram_sources').update({
        last_checked_at: new Date().toISOString(),
        last_error: null,
      }).eq('id', source.id)
      return drafts

    } catch (err: any) {
      await admin.from('instagram_sources').update({
        last_checked_at: new Date().toISOString(),
        last_error: err?.message ?? 'Bilinmeyen hata',
      }).eq('id', source.id)
      return 0
    }
  }

  // 4'lü paralel havuzla tara (wall-clock süreyi kısaltır, timeout'u önler)
  let idx = 0
  let totalDrafts = 0
  await Promise.all(Array.from({ length: Math.min(4, sources.length) }, async () => {
    while (idx < sources.length) {
      const s = sources[idx++]
      totalDrafts += await scanSource(s)
    }
  }))

  // Kalan = son 12 saatte taranmamış (henüz sıraya gelmemiş) aktif hesap sayısı.
  // Şimdi taradıklarımız "taze" olduğu için sayılmaz → her tıkta düşer, hepsi bitince 0 olur.
  let remaining = 0
  if (!sourceId) {
    const staleBefore = new Date(Date.now() - 12 * 3600 * 1000).toISOString()
    const { count } = await admin.from('instagram_sources')
      .select('id', { count: 'exact', head: true })
      .eq('is_active', true)
      .or(`last_checked_at.is.null,last_checked_at.lt.${staleBefore}`)
    remaining = count ?? 0
  }

  return NextResponse.json({ scanned: sources.length, drafts: totalDrafts, remaining })
}
