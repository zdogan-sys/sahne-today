'use client'

import { useState, useEffect } from 'react'
import { useLocale } from 'next-intl'
import { BellRing, BellOff, Loader2 } from 'lucide-react'
import { savePushSubscription, removePushSubscription } from '@/app/actions/push'

function urlBase64ToUint8Array(base64: string): Uint8Array<ArrayBuffer> {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4)
  const raw = atob((base64 + padding).replace(/-/g, '+').replace(/_/g, '/'))
  const arr = new Uint8Array(new ArrayBuffer(raw.length))
  for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i)
  return arr
}

// Cihaz push aboneliği aç/kapa. Push desteklenmiyorsa (iOS Safari eski
// sürümleri, http) hiç render olmaz.
export function PushToggle() {
  const locale = useLocale()
  const isEn = locale === 'en'
  const [supported, setSupported] = useState(false)
  const [enabled, setEnabled] = useState(false)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return
    if (!process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY) return
    setSupported(true)
    navigator.serviceWorker.ready
      .then((reg) => reg.pushManager.getSubscription())
      .then((sub) => setEnabled(!!sub))
      .catch(() => {})
  }, [])

  async function toggle() {
    setBusy(true)
    try {
      const reg = await navigator.serviceWorker.ready
      const existing = await reg.pushManager.getSubscription()

      if (existing) {
        await removePushSubscription(existing.endpoint)
        await existing.unsubscribe()
        setEnabled(false)
      } else {
        const permission = await Notification.requestPermission()
        if (permission !== 'granted') return
        const sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!),
        })
        const json = sub.toJSON() as { endpoint: string; keys: { p256dh: string; auth: string } }
        const res = await savePushSubscription(json)
        if (res.success) setEnabled(true)
        else await sub.unsubscribe()
      }
    } catch {
      // sessizce geç — kullanıcı tekrar deneyebilir
    } finally {
      setBusy(false)
    }
  }

  if (!supported) return null

  return (
    <button
      onClick={toggle}
      disabled={busy}
      className="flex items-center gap-1.5 text-xs text-text-muted hover:text-text-primary transition-colors disabled:opacity-50"
      title={enabled
        ? (isEn ? 'Disable device notifications' : 'Cihaz bildirimlerini kapat')
        : (isEn ? 'Enable device notifications' : 'Cihaz bildirimlerini aç')}
    >
      {busy ? <Loader2 size={13} className="animate-spin" /> : enabled ? <BellRing size={13} className="text-accent" /> : <BellOff size={13} />}
      {enabled ? (isEn ? 'Push on' : 'Push açık') : (isEn ? 'Push off' : 'Push kapalı')}
    </button>
  )
}
