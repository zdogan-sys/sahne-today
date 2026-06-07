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

// Instagram sayfasından metin içeriği çeker — önce Jina.ai reader, sonra doğrudan
async function fetchInstagramContent(url: string): Promise<string> {
  // Önce Jina.ai reader dene (JavaScript render eder, Instagram engeline karşı daha dayanıklı)
  try {
    const jinaRes = await fetch(`https://r.jina.ai/${url}`, {
      headers: {
        'Accept': 'text/plain',
        'X-Return-Format': 'text',
      },
      signal: AbortSignal.timeout(20000),
    })
    if (jinaRes.ok) {
      const text = await jinaRes.text()
      if (text.length > 100) return text.slice(0, 4000)
    }
  } catch { /* Jina başarısız, doğrudan dene */ }

  // Doğrudan fetch (yedek)
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'tr-TR,tr;q=0.9',
      },
      signal: AbortSignal.timeout(12000),
    })
    if (!res.ok) return ''
    const html = await res.text()
    const pick = (re: RegExp) => html.match(re)?.[1]?.replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, '&') ?? ''
    const parts = [
      pick(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']{1,300})["']/i),
      pick(/<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']{1,1500})["']/i),
    ].filter(Boolean)
    return parts.join('\n\n').slice(0, 3000)
  } catch {
    return ''
  }
}

const SYSTEM_PROMPT = `Sen bir etkinlik tespit asistanısın. Türk bar, pub ve mekan Instagram sayfalarından alınan içeriklerde yaklaşan canlı müzik etkinlikleri, konserler veya özel geceleri tespit ediyorsun.

Yanıtını MUTLAKA şu JSON formatında ver, başka hiçbir şey yazma:

Etkinlik varsa:
{"has_event": true, "events": [{"title": "etkinlik adı", "performer": "sanatçı/grup", "date": "YYYY-MM-DD veya null", "time": "HH:MM veya null", "description": "kısa açıklama"}]}

Etkinlik yoksa:
{"has_event": false, "events": []}`

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!isAdminUser(user)) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })

  const admin = adminClient()
  const body = await req.json().catch(() => ({}))
  const sourceId: string | undefined = body.source_id

  let query = admin.from('instagram_sources').select('*').eq('is_active', true)
  if (sourceId) query = (query as any).eq('id', sourceId)

  const { data: sources, error: srcError } = await query
  if (srcError) return NextResponse.json({ error: srcError.message, scanned: 0, drafts: 0 })
  if (!sources?.length) return NextResponse.json({ scanned: 0, drafts: 0, debug: 'no active sources found' })

  let totalDrafts = 0

  for (const source of sources) {
    try {
      const content = await fetchInstagramContent(source.instagram_url)

      if (!content.trim()) {
        await admin.from('instagram_sources').update({
          last_checked_at: new Date().toISOString(),
          last_error: 'İçerik alınamadı (Instagram erişim engeli olabilir)',
        }).eq('id', source.id)
        continue
      }

      const response = await anthropic.messages.create({
        model: 'claude-haiku-4-5',
        max_tokens: 1024,
        system: SYSTEM_PROMPT,
        messages: [{
          role: 'user',
          content: `Kaynak: ${source.instagram_url} (${source.city ?? ''})
---
${content}`,
        }],
      })

      const text = response.content.find(b => b.type === 'text')?.text ?? ''

      let parsed: { has_event: boolean; events: any[] } | null = null
      try {
        const m = text.match(/\{[\s\S]*\}/)
        if (m) parsed = JSON.parse(m[0])
      } catch { /* ignore */ }

      if (parsed?.has_event && parsed.events?.length) {
        for (const event of parsed.events) {
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
              caption: content.slice(0, 600),
              extracted: event,
              status: 'pending',
            })
            totalDrafts++
          }
        }
      }

      await admin.from('instagram_sources').update({
        last_checked_at: new Date().toISOString(),
        last_error: null,
      }).eq('id', source.id)

    } catch (err: any) {
      await admin.from('instagram_sources').update({
        last_checked_at: new Date().toISOString(),
        last_error: err?.message ?? 'Bilinmeyen hata',
      }).eq('id', source.id)
    }
  }

  return NextResponse.json({ scanned: sources.length, drafts: totalDrafts })
}
