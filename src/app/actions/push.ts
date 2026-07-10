'use server'

import { createClient } from '@/lib/supabase/server'

// Tarayıcının PushSubscription.toJSON() çıktısını kaydeder.
// RLS: kullanıcı yalnızca kendi aboneliğini yazabilir.
export async function savePushSubscription(sub: {
  endpoint: string
  keys: { p256dh: string; auth: string }
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Oturum gerekli.' }

  const { error } = await supabase.from('push_subscriptions').upsert(
    {
      user_id: user.id,
      endpoint: sub.endpoint,
      p256dh: sub.keys.p256dh,
      auth: sub.keys.auth,
    },
    { onConflict: 'endpoint' }
  )

  if (error) return { success: false, error: error.message }
  return { success: true }
}

export async function removePushSubscription(endpoint: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Oturum gerekli.' }

  await supabase.from('push_subscriptions').delete().eq('endpoint', endpoint)
  return { success: true }
}
