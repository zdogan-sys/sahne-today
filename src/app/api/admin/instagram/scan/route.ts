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

  // imginn.com üzerinden Jina.ai ile çek (instagram içeriğini oturum açmadan gösteriyor)
  const viewerUrls = [
    `https://imginn.com/${username}/`,
    `https://picuki.com/profile/${username}`,
  ]

  for (const viewerUrl of viewerUrls) {
    try {
      const res = await fetch(`https://r.jina.ai/${viewerUrl}`, {
        headers: { 'Accept': 'text/plain', 'X-Return-Format': 'text' },
        signal: AbortSignal.timeout(25000),
      })
      if (!res.ok) continue
      const text = await res.text()
      // Login/hata sayfası değil gerçek içerik mi?
      if (text.length > 500 && !text.toLowerCase().includes('sign in') && !text.toLowerCase().includes('giriş')) {
        return text.slice(0, 5000)
      }
    } catch { /* sonraki kaynağa geç */ }
  }

  return ''
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
