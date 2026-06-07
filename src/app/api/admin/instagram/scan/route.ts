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

// Instagram sayfasından metin içeriği çekmeye çalışır
async function fetchInstagramContent(url: string): Promise<string> {
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'tr-TR,tr;q=0.9,en;q=0.7',
        'Cache-Control': 'no-cache',
      },
      signal: AbortSignal.timeout(12000),
    })

    if (!res.ok) return ''
    const html = await res.text()

    // Meta etiketlerinden içerik çıkar
    const pick = (re: RegExp) => html.match(re)?.[1]?.replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>') ?? ''

    const title = pick(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']{1,300})["']/i)
    const desc  = pick(/<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']{1,800})["']/i)
    const tDesc = pick(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']{1,800})["']/i)

    const parts = [title, desc, tDesc].filter(Boolean)
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

  const { data: sources } = await query
  if (!sources?.length) return NextResponse.json({ scanned: 0, drafts: 0 })

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
        model: 'claude-opus-4-8',
        max_tokens: 1024,
        thinking: { type: 'adaptive' },
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
