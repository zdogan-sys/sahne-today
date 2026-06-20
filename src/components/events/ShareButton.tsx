'use client'

import { useState } from 'react'
import { Share2, Check } from 'lucide-react'

interface Props {
  title: string
  url: string
  isEn?: boolean
}

export function ShareButton({ title, url, isEn }: Props) {
  const [copied, setCopied] = useState(false)

  async function handleShare() {
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({ title, url })
        return
      } catch {
        // iptal veya hata — fallback'e geç
      }
    }
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // clipboard da çalışmadıysa sessizce geç
    }
  }

  return (
    <button
      onClick={handleShare}
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-accent/15 text-accent border border-accent/30 text-xs font-semibold hover:bg-accent/25 transition-colors"
    >
      {copied ? <Check size={13} /> : <Share2 size={13} />}
      {copied ? (isEn ? 'Copied!' : 'Kopyalandı!') : (isEn ? 'Share' : 'Paylaş')}
    </button>
  )
}
