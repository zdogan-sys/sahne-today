import { defaultCache } from '@serwist/next/worker'
import type { PrecacheEntry, SerwistGlobalConfig } from 'serwist'
import { Serwist } from 'serwist'

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined
  }
}

declare const self: ServiceWorkerGlobalScope

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching: defaultCache,
})

serwist.addEventListeners()

// ── Web Push ───────────────────────────────────────────────────────────────
self.addEventListener('push', (event) => {
  if (!event.data) return
  let payload: { title?: string; body?: string; link?: string } = {}
  try {
    payload = event.data.json()
  } catch {
    payload = { body: event.data.text() }
  }
  event.waitUntil(
    self.registration.showNotification(payload.title ?? 'Sahne.Today', {
      body: payload.body ?? '',
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      data: { link: payload.link ?? '/' },
    })
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const link: string = event.notification.data?.link ?? '/'
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windows) => {
      // Açık sekme varsa odaklan, yoksa yeni pencere aç
      for (const win of windows) {
        if ('focus' in win) {
          win.navigate(link)
          return win.focus()
        }
      }
      return self.clients.openWindow(link)
    })
  )
})
