'use client'

import { useState, useEffect } from 'react'
import { useLocale } from 'next-intl'
import { BellRing, BellOff, Loader2 } from 'lucide-react'
import { savePushSubscription, removePushSubscription } from '@/app/actions/push'

// VAPID public anahtarı gizli değildir (tarayıcıya zaten açık gider);
// build-time env sorunlarından etkilenmemek için sabit gömülü.
const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
  ?? 'BONyMWd3stGuWArPetCoTxn9V7FZEtWNBXjOUJ02K6-rhn5piBBaoNIA_HkXjd88o8xGO3TVU9E84AZLWiHFzkc'

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
  const [error, setError] = useState('')

  useEffect(() => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return
    setSupported(true)
    swReady()
      .then((reg) => reg.pushManager.getSubscription())
      .then((sub) => setEnabled(!!sub))
      .catch(() => {})
  }, [])

  // serviceWorker.ready SW hiç kayıtlı değilse sonsuza dek bekler; 6 sn'de kes
  function swReady(): Promise<ServiceWorkerRegistration> {
    return Promise.race([
      navigator.serviceWorker.ready,
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error(isEn ? 'Service worker not ready' : 'Service worker hazır değil (sayfayı yenileyip tekrar dene)')), 6000)
      ),
    ])
  }

  async function toggle() {
    setBusy(true)
    setError('')
    try {
      const reg = await swReady()
      const existing = await reg.pushManager.getSubscription()

      if (existing) {
        await removePushSubscription(existing.endpoint)
        await existing.unsubscribe()
        setEnabled(false)
      } else {
        const permission = await Notification.requestPermission()
        if (permission === 'denied') {
          setError(isEn
            ? 'Notifications blocked in browser settings'
            : 'Tarayıcı bildirimi engellemiş — adres çubuğundaki kilit ikonundan izin ver')
          return
        }
        if (permission !== 'granted') return
        const sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
        })
        const json = sub.toJSON() as { endpoint: string; keys: { p256dh: string; auth: string } }
        const res = await savePushSubscription(json)
        if (res.success) setEnabled(true)
        else {
          await sub.unsubscribe()
          setError(res.error ?? (isEn ? 'Could not save' : 'Kaydedilemedi'))
        }
      }
    } catch (e) {
      console.error('[push]', e)
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(false)
    }
  }

  if (!supported) return null

  return (
    <span className="flex items-center gap-2 min-w-0">
    {error && <span className="text-red-400 text-[10px] leading-tight max-w-40 truncate" title={error}>{error}</span>}
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
    </span>
  )
}
