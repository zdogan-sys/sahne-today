'use client'

import { useState, useEffect } from 'react'
import { X, Download } from 'lucide-react'

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

export function PWAInstallBanner() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [dismissed, setDismissed] = useState(false)
  const [isInstalled, setIsInstalled] = useState(false)

  useEffect(() => {
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true)
      return
    }
    if (localStorage.getItem('pwa-banner-dismissed') === '1') {
      setDismissed(true)
      return
    }
    const handler = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)
    }
    window.addEventListener('beforeinstallprompt', handler)
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  const handleInstall = async () => {
    if (!deferredPrompt) return
    await deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice
    if (outcome === 'accepted') setDeferredPrompt(null)
  }

  const handleDismiss = () => {
    setDismissed(true)
    localStorage.setItem('pwa-banner-dismissed', '1')
  }

  if (dismissed || isInstalled || !deferredPrompt) return null

  return (
    <div className="fixed bottom-16 left-0 right-0 z-50 px-4 pb-2 md:hidden">
      <div className="bg-[#1A1A1A] border border-[rgba(212,83,126,0.35)] rounded-2xl p-4 flex items-center gap-3 shadow-2xl">
        <div className="w-10 h-10 rounded-xl bg-[rgba(212,83,126,0.15)] flex items-center justify-center flex-shrink-0">
          <Download size={18} className="text-[#D4537E]" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[#E4E0D8] text-sm font-semibold leading-none">Ana Ekrana Ekle</p>
          <p className="text-[#8A8680] text-xs mt-1">Sahne.Today'i uygulama olarak kullan</p>
        </div>
        <button
          onClick={handleInstall}
          className="flex-shrink-0 px-3 py-1.5 rounded-lg bg-[#D4537E] text-white text-xs font-semibold active:opacity-80"
        >
          Ekle
        </button>
        <button
          onClick={handleDismiss}
          className="flex-shrink-0 text-[#8A8680] hover:text-[#E4E0D8] transition-colors"
          aria-label="Kapat"
        >
          <X size={16} />
        </button>
      </div>
    </div>
  )
}
