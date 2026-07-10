import webpush from 'web-push'
import { createAdminClient } from '@/lib/supabase/admin'

export type PushPayload = {
  title: string
  body: string
  link?: string
}

// Public anahtar gizli değil; PushToggle'daki sabitle aynı olmalı
const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
  ?? 'BONyMWd3stGuWArPetCoTxn9V7FZEtWNBXjOUJ02K6-rhn5piBBaoNIA_HkXjd88o8xGO3TVU9E84AZLWiHFzkc'

let configured = false
function ensureConfigured(): boolean {
  const publicKey = VAPID_PUBLIC_KEY
  const privateKey = process.env.VAPID_PRIVATE_KEY
  if (!publicKey || !privateKey) return false
  if (!configured) {
    webpush.setVapidDetails(process.env.VAPID_SUBJECT ?? 'mailto:z_dogan@hotmail.com', publicKey, privateKey)
    configured = true
  }
  return true
}

// Verilen kullanıcılara push gönderir. VAPID anahtarları yoksa sessizce atlar
// (in-app + e-posta bildirimleri zaten çalışmaya devam eder).
// 404/410 dönen (iptal edilmiş) abonelikler otomatik silinir.
export async function sendPushToUsers(userIds: string[], payload: PushPayload): Promise<void> {
  if (userIds.length === 0 || !ensureConfigured()) return

  const admin = createAdminClient()
  const { data: subs } = await admin
    .from('push_subscriptions')
    .select('id, endpoint, p256dh, auth')
    .in('user_id', userIds)

  if (!subs || subs.length === 0) return

  const body = JSON.stringify(payload)
  const staleIds: string[] = []

  await Promise.allSettled(
    subs.map(async (sub) => {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          body
        )
      } catch (err: unknown) {
        const status = (err as { statusCode?: number }).statusCode
        if (status === 404 || status === 410) staleIds.push(sub.id)
      }
    })
  )

  if (staleIds.length > 0) {
    await admin.from('push_subscriptions').delete().in('id', staleIds)
  }
}
