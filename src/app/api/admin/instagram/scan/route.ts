export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createSupabase } from '@supabase/supabase-js'
import { isAdminUser } from '@/lib/admin'
import Anthropic from '@anthropic-ai/sdk'
import {
  type AdminClient,
  stripBadChars,
  startApifyRun,
  getApifyRunStatus,
  getApifyDatasetPosts,
  SYSTEM_PROMPT,
  finalizePendingRuns,
} from '@/lib/instagram-scan'

const anthropic = new Anthropic()

function adminClient(): AdminClient {
  return createSupabase(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  )
}

// Tarama kaynaklarını mekan profillerindeki IG'lerle EŞİTLER (profil = tek doğru kaynak).
// Profilde IG olan mekanı aktif kaynak yapar; profilde artık olmayan eski adresleri pasifleştirir
// (örn. mekanın IG'si değişince eski hesap bir daha taranmaz). Manuel/eşleşmeyen hesaplar da pasifleşir.
async function syncSourcesFromVenues(admin: AdminClient) {
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
  const action: string = body.action ?? 'start'
  const sourceId: string | undefined = body.source_id

  // finalize: bekleyen run'ları kontrol et, biteni taslağa çevir. Hızlı döner (run başlatmaz).
  if (action === 'finalize') {
    const result = await finalizePendingRuns(admin)
    return NextResponse.json(result)
  }

  // debug_start: tek kaynak için run başlatır, runId döner (bekletmeden).
  if (action === 'debug_start') {
    if (!sourceId) return NextResponse.json({ error: 'source_id gerekli' }, { status: 400 })
    const { data: source } = await admin.from('instagram_sources').select('*').eq('id', sourceId).single()
    if (!source) return NextResponse.json({ error: 'Kaynak bulunamadı' }, { status: 404 })
    const runId = await startApifyRun((source as any).username)
    if (!runId) return NextResponse.json({ error: 'Apify run başlatılamadı (token/kota kontrol edilmeli)' }, { status: 502 })
    return NextResponse.json({ runId })
  }

  // debug_check: bir run'ın durumunu kontrol eder; bittiyse Claude'a sorar ama KAYDETMEZ (dry-run).
  if (action === 'debug_check') {
    const runId: string | undefined = body.run_id
    if (!sourceId || !runId) return NextResponse.json({ error: 'source_id ve run_id gerekli' }, { status: 400 })
    const { data: source } = await admin.from('instagram_sources').select('*').eq('id', sourceId).single() as any
    if (!source) return NextResponse.json({ error: 'Kaynak bulunamadı' }, { status: 404 })

    const status = await getApifyRunStatus(runId)
    if (!status) return NextResponse.json({ done: false, status: 'UNKNOWN' })
    if (status.status === 'RUNNING' || status.status === 'READY') return NextResponse.json({ done: false, status: status.status })
    if (status.status !== 'SUCCEEDED') return NextResponse.json({ done: true, status: status.status, error: `Apify hatası: ${status.status}` })

    const posts = status.datasetId ? await getApifyDatasetPosts(status.datasetId) : []
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
      done: true, status: 'SUCCEEDED',
      username: source.username,
      contentLength: promptBody.length,
      postsFound: posts.length,
      posts: posts.map((p: any) => ({ caption: p.caption.slice(0, 200) })),
      claudeRaw, claudeParsed, today,
    })
  }

  // start (varsayılan): run'ları başlatır, HEMEN döner (sonucu beklemez).
  // BATCH ve resultsLimit (bkz. instagram-scan.ts) bilinçli düşük tutuluyor —
  // Apify ücretsiz plan sınırı $5/ay, önceki ayarlarla (BATCH 10, resultsLimit 12)
  // bu sınır tek bir "Şimdi Tara" turunda aşılabiliyordu (Ağustos 2026).
  const BATCH = 5
  let query = admin.from('instagram_sources').select('*').eq('is_active', true).is('pending_apify_run_id', null)
  if (sourceId) {
    query = (query as any).eq('id', sourceId)
  } else {
    await syncSourcesFromVenues(admin)
    query = (query as any).order('last_checked_at', { ascending: true, nullsFirst: true }).limit(BATCH)
  }

  const { data: sources, error: srcError } = await query
  if (srcError) return NextResponse.json({ error: srcError.message, started: 0 })
  if (!sources?.length) return NextResponse.json({ started: 0, message: 'Taranacak (boşta) kaynak yok — hepsi zaten sürüyor olabilir.' })

  let started = 0
  await Promise.all((sources as any[]).map(async (source) => {
    const runId = await startApifyRun(source.username)
    if (runId) {
      await admin.from('instagram_sources').update({
        pending_apify_run_id: runId, pending_since: new Date().toISOString(), last_error: null,
      }).eq('id', source.id)
      started++
    } else {
      await admin.from('instagram_sources').update({
        last_checked_at: new Date().toISOString(), last_error: 'Apify run başlatılamadı (token/kota kontrol edilmeli)',
      }).eq('id', source.id)
    }
  }))

  let remaining = 0
  if (!sourceId) {
    const staleBefore = new Date(Date.now() - 12 * 3600 * 1000).toISOString()
    const { count } = await admin.from('instagram_sources')
      .select('id', { count: 'exact', head: true })
      .eq('is_active', true)
      .is('pending_apify_run_id', null)
      .or(`last_checked_at.is.null,last_checked_at.lt.${staleBefore}`)
    remaining = count ?? 0
  }

  return NextResponse.json({ started, remaining })
}
