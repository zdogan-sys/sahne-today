import type { SupabaseClient } from '@supabase/supabase-js'
import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic()
const APIFY_BASE = 'https://api.apify.com/v2'
// Bir Apify Instagram Scraper run'ı gerçekte ~100-120s sürüyor. Cloudflare origin
// timeout'u ~100s olduğu için admin isteği bunu senkron bekleyemez (524 alınıyor).
// Bu yüzden akış ikiye bölündü: "start" run'ı başlatıp hemen döner, "finalize"
// tamamlanan run'ları toplayıp taslak oluşturur (admin butonu veya cron ile).
const STALE_RUN_MINUTES = 10

// İki Apify hesabı arasında otomatik geçiş (Ağustos 2026): ücretsiz plan $5/ay
// sert limitine takılınca run başlatma 403 dönüyor. Her çağrı önce birincil
// token'ı dener, olmazsa ikinciye düşer. run/dataset ID'leri hesaba özel
// olduğu için "yanlış hesaba sorma" durumu güvenle bir sonraki token'a düşer —
// ayrıca DB'de hangi token'ın kullanıldığını saklamaya gerek yok.
const APIFY_TOKENS = [process.env.APIFY_API_TOKEN, process.env.APIFY_API_TOKEN_2].filter(
  (t): t is string => !!t
)

export type AdminClient = SupabaseClient

// Eşsiz (lone) surrogate karakterleri temizler — bozuk emoji vb. JSON'u geçersiz kılıp
// Anthropic API'sine 400 ("no low surrogate") attırıyordu. Geçerli çiftler korunur.
export function stripBadChars(s: string): string {
  return s.replace(/[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/g, '')
}

export type IgPost = { image: string | null; caption: string }

// Apify actor'ünü ASENKRON başlatır — runId hemen döner, scraping arka planda sürer.
// resultsLimit bilinçli düşük (6) — ücretsiz Apify planı $5/ay, yüksek post
// sayısı maliyeti hızla aşırıyordu (bkz. scan/route.ts'teki BATCH notu).
export async function startApifyRun(username: string): Promise<string | null> {
  for (const token of APIFY_TOKENS) {
    try {
      const res = await fetch(`${APIFY_BASE}/acts/apify~instagram-scraper/runs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          resultsType: 'posts',
          directUrls: [`https://www.instagram.com/${username}/`],
          resultsLimit: 6,
        }),
        signal: AbortSignal.timeout(15000),
      })
      if (!res.ok) continue // bu token'ın limiti dolmuş olabilir — sıradaki token'ı dene
      const data = await res.json()
      const runId = data?.data?.id
      if (runId) return runId
    } catch { /* sıradaki token'ı dene */ }
  }
  return null
}

export async function getApifyRunStatus(runId: string): Promise<{ status: string; datasetId: string | null } | null> {
  for (const token of APIFY_TOKENS) {
    try {
      const res = await fetch(`${APIFY_BASE}/actor-runs/${runId}`, {
        headers: { Authorization: `Bearer ${token}` },
        signal: AbortSignal.timeout(15000),
      })
      if (!res.ok) continue // bu run bu hesaba ait değil (yanlış token) olabilir — sıradakini dene
      const data = await res.json()
      return { status: data?.data?.status ?? 'UNKNOWN', datasetId: data?.data?.defaultDatasetId ?? null }
    } catch { /* sıradaki token'ı dene */ }
  }
  return null
}

export async function getApifyDatasetPosts(datasetId: string): Promise<IgPost[]> {
  for (const token of APIFY_TOKENS) {
    try {
      const res = await fetch(`${APIFY_BASE}/datasets/${datasetId}/items`, {
        headers: { Authorization: `Bearer ${token}` },
        signal: AbortSignal.timeout(20000),
      })
      if (!res.ok) continue
      const items = await res.json()
      if (!Array.isArray(items)) continue
      return items
        .filter((it: any) => typeof it?.caption === 'string' && it.caption.trim().length >= 8)
        .slice(0, 12)
        .map((it: any) => ({
          image: it.displayUrl ?? null,
          caption: stripBadChars(String(it.caption)).replace(/\s+/g, ' ').trim().slice(0, 600),
        }))
    } catch { /* sıradaki token'ı dene */ }
  }
  return []
}

export const SYSTEM_PROMPT = `Sen bir etkinlik tespit asistanısın. Mekan Instagram sayfalarından alınan içeriklerde yaklaşan etkinlikleri tespit ediyorsun.

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

// Bir kaynağın çekilmiş gönderilerini Claude ile etkinliğe çevirip event_drafts'a yazar.
export async function extractAndSaveDrafts(admin: AdminClient, source: any, posts: IgPost[]): Promise<number> {
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
  return drafts
}

// Bekleyen run'ları kontrol edip biteni taslağa çevirir. Cron ve admin butonu ortak kullanır.
export async function finalizePendingRuns(admin: AdminClient): Promise<{ checked: number; finalized: number; stillRunning: number; drafts: number }> {
  const { data: pending } = await admin
    .from('instagram_sources')
    .select('*')
    .not('pending_apify_run_id', 'is', null)
    .limit(30)

  if (!pending?.length) return { checked: 0, finalized: 0, stillRunning: 0, drafts: 0 }

  let finalized = 0, stillRunning = 0, totalDrafts = 0
  const staleBefore = Date.now() - STALE_RUN_MINUTES * 60 * 1000

  async function handleOne(source: any) {
    const status = await getApifyRunStatus(source.pending_apify_run_id)
    const isStale = source.pending_since && new Date(source.pending_since).getTime() < staleBefore

    if (!status) {
      if (isStale) {
        await admin.from('instagram_sources').update({
          pending_apify_run_id: null, pending_since: null,
          last_checked_at: new Date().toISOString(), last_error: 'Apify durumu alınamadı (zaman aşımı)',
        }).eq('id', source.id)
        finalized++
      } else {
        stillRunning++
      }
      return
    }

    if (status.status === 'SUCCEEDED') {
      const posts = status.datasetId ? await getApifyDatasetPosts(status.datasetId) : []
      let drafts = 0
      let err: string | null = null
      if (posts.length) {
        try { drafts = await extractAndSaveDrafts(admin, source, posts) }
        catch (e: any) { err = e?.message ?? 'Claude hatası' }
      } else {
        err = 'Gönderi bulunamadı'
      }
      await admin.from('instagram_sources').update({
        pending_apify_run_id: null, pending_since: null,
        last_checked_at: new Date().toISOString(), last_error: err,
      }).eq('id', source.id)
      totalDrafts += drafts
      finalized++
    } else if (status.status === 'RUNNING' || status.status === 'READY') {
      if (isStale) {
        await admin.from('instagram_sources').update({
          pending_apify_run_id: null, pending_since: null,
          last_checked_at: new Date().toISOString(), last_error: 'Zaman aşımı (Apify çalışması çok uzun sürdü)',
        }).eq('id', source.id)
        finalized++
      } else {
        stillRunning++
      }
    } else {
      // FAILED, ABORTED, TIMED-OUT, vb.
      await admin.from('instagram_sources').update({
        pending_apify_run_id: null, pending_since: null,
        last_checked_at: new Date().toISOString(), last_error: `Apify hatası: ${status.status}`,
      }).eq('id', source.id)
      finalized++
    }
  }

  let idx = 0
  await Promise.all(Array.from({ length: Math.min(4, pending.length) }, async () => {
    while (idx < pending.length) {
      await handleOne(pending[idx++])
    }
  }))

  return { checked: pending.length, finalized, stillRunning, drafts: totalDrafts }
}
