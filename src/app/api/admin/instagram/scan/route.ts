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

// Instagram kullanıcı adını URL'den çıkar
function extractUsername(url: string): string {
  return url.replace(/\/$/, '').split('/').pop() ?? ''
}

// Instagram içeriği çeker — viewer siteler üzerinden (oturum açmadan erişim)
async function fetchInstagramContent(instagramUrl: string): Promise<string> {
  const username = extractUsername(instagramUrl)
  if (!username) return ''

  // Instagram içeriğini oturum açmadan gösteren viewer'lar üzerinden Jina.ai ile çek.
  // (imginn/picuki öldü/engellendi; picnob + aynası pixwox şu an çalışıyor.)
  const viewerUrls = [
    `https://www.picnob.com/profile/${username}/`,
    `https://www.pixwox.com/profile/${username}/`,
  ]

  for (const viewerUrl of viewerUrls) {
    try {
      // Markdown formatı (X-Return-Format yok) → görseller ![](url) olarak gelir, postlarla eşleştirebiliriz
      const res = await fetch(`https://r.jina.ai/${viewerUrl}`, {
        headers: { 'Accept': 'text/plain' },
        signal: AbortSignal.timeout(12000),
      })
      if (!res.ok) continue
      const text = await res.text()
      // Engel/login/hata sayfası değil, gerçek içerik mi? (block sayfaları ~250-660 karakter)
      const head = text.slice(0, 600).toLowerCase()
      const blocked = /sign in|log in|giriş|you have been blocked|security verification|captcha|cloudflare|404 not found/.test(head)
      if (text.length > 800 && !blocked) {
        return text.slice(0, 14000)
      }
    } catch { /* sonraki kaynağa geç */ }
  }

  return ''
}

type IgPost = { image: string | null; caption: string }

// picnob markdown'ını gönderilere ayırır: her post = [ ![](görsel) ](post-linki) + caption.
// En fazla 12 gönderi döner; caption'ı boş olanları atlar.
function parsePosts(md: string): IgPost[] {
  const posts: IgPost[] = []
  const re = /!\[[^\]]*\]\((https:\/\/sp\d+\.picnob\.com\/[^)]+)\)\s*\]\([^)]+\)\s*([\s\S]*?)(?=\n\s*\d+\s+\d+\s*\n|\n\s*\[\s*\n!\[|$)/g
  let m: RegExpExecArray | null
  while ((m = re.exec(md)) !== null && posts.length < 12) {
    const caption = m[2].replace(/\s+/g, ' ').trim()
    if (caption.length >= 8) posts.push({ image: m[1], caption: caption.slice(0, 600) })
  }
  return posts
}

const SYSTEM_PROMPT = `Sen bir etkinlik tespit asistanısın. Türk bar, pub ve mekan Instagram sayfalarından alınan içeriklerde yaklaşan canlı müzik etkinlikleri, konserler veya özel geceleri tespit ediyorsun.

Sana mekanın son gönderileri "[1]", "[2]" gibi numaralarla verilir. Her etkinlik için onu hangi numaralı gönderide bulduğunu "post" alanında belirt.

Yanıtını MUTLAKA şu JSON formatında ver, başka hiçbir şey yazma:

Etkinlik varsa:
{"has_event": true, "events": [{"title": "etkinlik adı", "performer": "sanatçı/grup", "date": "YYYY-MM-DD veya null", "time": "HH:MM veya null", "description": "kısa açıklama", "post": <gönderi numarası, örn. 1>}]}

Etkinlik yoksa:
{"has_event": false, "events": []}`

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!isAdminUser(user)) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })

  const admin = adminClient()
  const body = await req.json().catch(() => ({}))
  const sourceId: string | undefined = body.source_id

  // Tek kaynakta: sadece onu tara. Toplu taramada: timeout olmaması için her çağrıda
  // en eski taranan BATCH kadar kaynağı tara (rotasyon) — tekrar tıkça hepsi sırayla taranır.
  const BATCH = 10
  let query = admin.from('instagram_sources').select('*').eq('is_active', true)
  if (sourceId) {
    query = (query as any).eq('id', sourceId)
  } else {
    query = (query as any).order('last_checked_at', { ascending: true, nullsFirst: true }).limit(BATCH)
  }

  const { data: sources, error: srcError } = await query
  if (srcError) return NextResponse.json({ error: srcError.message, scanned: 0, drafts: 0 })
  if (!sources?.length) return NextResponse.json({ scanned: 0, drafts: 0, debug: 'no active sources found' })

  // Tek bir kaynağı tarar, oluşan taslak sayısını döner
  async function scanSource(source: any): Promise<number> {
    try {
      const content = await fetchInstagramContent(source.instagram_url)

      if (!content.trim()) {
        await admin.from('instagram_sources').update({
          last_checked_at: new Date().toISOString(),
          last_error: 'İçerik alınamadı (Instagram erişim engeli olabilir)',
        }).eq('id', source.id)
        return 0
      }

      // Gönderileri {görsel, caption} olarak ayrıştır; Claude'a numaralı caption'ları ver (uzun URL'leri değil)
      const posts = parsePosts(content)
      const promptBody = posts.length
        ? posts.map((p, i) => `[${i + 1}] ${p.caption}`).join('\n\n')
        : content.slice(0, 5000)
      const today = new Date().toISOString().slice(0, 10)

      const response = await anthropic.messages.create({
        model: 'claude-haiku-4-5',
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
        const m = text.match(/\{[\s\S]*\}/)
        if (m) parsed = JSON.parse(m[0])
      } catch { /* ignore */ }

      let drafts = 0
      if (parsed?.has_event && parsed.events?.length) {
        for (const event of parsed.events) {
          // Gönderi numarasından görseli eşleştir; numarayı sakla, ham 'post' alanını çıkar
          const pIdx = typeof event.post === 'number' ? event.post - 1 : -1
          const post = pIdx >= 0 ? posts[pIdx] : undefined
          delete event.post
          event.image = post?.image ?? null
          const caption = post?.caption ?? content.slice(0, 600)

          const titleSnippet = String(event.title ?? '').slice(0, 30)
          const { data: existing } = await admin
            .from('event_drafts')
            .select('id')
            .eq('source_id', source.id)
            .eq('status', 'pending')
            .ilike('extracted->>title', `%${titleSnippet}%`)
            .limit(1)

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

  // Kaç aktif kaynak kaldığını bildir (toplu taramada rotasyon için)
  let remaining = 0
  if (!sourceId) {
    const { count } = await admin.from('instagram_sources').select('id', { count: 'exact', head: true }).eq('is_active', true)
    remaining = Math.max(0, (count ?? 0) - sources.length)
  }

  return NextResponse.json({ scanned: sources.length, drafts: totalDrafts, remaining })
}
