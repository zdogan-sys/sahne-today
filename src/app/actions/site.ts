'use server'

import { createClient } from '@supabase/supabase-js'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { isAdminUser } from '@/lib/admin'
import { MUSIC_GENRES, STAGE_GENRES, INSTRUMENT_OPTIONS, DANCE_OPTIONS } from '@/lib/constants'

const ADMIN_EMAIL = 'z_dogan@hotmail.com'

export type ListConfigKey = 'music_genres' | 'stage_genres' | 'instruments' | 'dance_types'

function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function updateHeroPoster(url: string) {
  const supabaseAuth = await createServerClient()
  const { data: { user } } = await supabaseAuth.auth.getUser()

  if (!user || user.email !== ADMIN_EMAIL) {
    return { success: false, error: 'Yetkiniz yok.' }
  }

  const { error } = await adminClient()
    .from('site_settings')
    .upsert({ key: 'hero_poster_url', value: url })

  if (error) return { success: false, error: error.message }
  return { success: true }
}

export async function getListConfigs(): Promise<Record<ListConfigKey, string[]>> {
  const { data } = await adminClient()
    .from('site_settings')
    .select('key, value')
    .in('key', ['music_genres', 'stage_genres', 'instruments', 'dance_types'])

  const map: Record<string, string[]> = {}
  for (const row of data ?? []) {
    try { map[row.key] = JSON.parse(row.value) } catch {}
  }

  return {
    music_genres: map['music_genres'] ?? MUSIC_GENRES,
    stage_genres: map['stage_genres'] ?? STAGE_GENRES,
    instruments: map['instruments'] ?? INSTRUMENT_OPTIONS,
    dance_types: map['dance_types'] ?? DANCE_OPTIONS,
  }
}

export async function updateListConfig(key: ListConfigKey, items: string[]) {
  const supabaseAuth = await createServerClient()
  const { data: { user } } = await supabaseAuth.auth.getUser()
  if (!user || !isAdminUser(user)) return { success: false, error: 'Yetkiniz yok.' }

  const { error } = await adminClient()
    .from('site_settings')
    .upsert({ key, value: JSON.stringify(items) })

  if (error) return { success: false, error: error.message }
  return { success: true }
}
