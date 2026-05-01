'use server'

import { createClient } from '@supabase/supabase-js'
import { createClient as createServerClient } from '@/lib/supabase/server'

const ADMIN_EMAIL = 'z_dogan@hotmail.com'

export async function updateHeroPoster(url: string) {
  const supabaseAuth = await createServerClient()
  const { data: { user } } = await supabaseAuth.auth.getUser()

  if (!user || user.email !== ADMIN_EMAIL) {
    return { success: false, error: 'Yetkiniz yok.' }
  }

  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { error } = await supabaseAdmin
    .from('site_settings')
    .upsert({ key: 'hero_poster_url', value: url })

  if (error) return { success: false, error: error.message }
  return { success: true }
}
