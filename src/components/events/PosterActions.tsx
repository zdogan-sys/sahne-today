'use client'

import { useState } from 'react'
import { Printer, Download, Loader2, Share2 } from 'lucide-react'

async function capturePoster(pixelRatio = 3): Promise<Blob> {
  const el = document.getElementById('poster')
  if (!el) throw new Error('Poster bulunamadı')
  const { toPng } = await import('html-to-image')
  const dataUrl = await toPng(el, { pixelRatio, cacheBust: true })
  const res = await fetch(dataUrl)
  return res.blob()
}

async function fetchRemoteBlob(url: string): Promise<Blob | null> {
  try {
    const res = await fetch(url)
    if (!res.ok) return null
    return res.blob()
  } catch {
    return null
  }
}

export function PosterActions({ eventTitle, posterUrl }: { eventTitle?: string; posterUrl?: string | null }) {
  const [loading, setLoading] = useState<'download' | 'share' | null>(null)
  const name = `${eventTitle ?? 'afis'}.png`

  async function handleDownload() {
    setLoading('download')
    try {
      const blob = await capturePoster(3)
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = name
      a.click()
      URL.revokeObjectURL(url)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(null)
    }
  }

  async function handleShare() {
    setLoading('share')
    try {
      let blob: Blob | null = null

      // Try capturing the rendered poster first
      try {
        blob = await capturePoster(2)
        // Sanity-check: a blank/failed capture is usually very small
        if (blob.size < 5000) blob = null
      } catch {
        blob = null
      }

      // Fallback: use the uploaded poster_url directly
      if (!blob && posterUrl) {
        blob = await fetchRemoteBlob(posterUrl)
      }

      if (blob) {
        const file = new File([blob], name, { type: blob.type || 'image/png' })
        if (navigator.canShare?.({ files: [file] })) {
          await navigator.share({ files: [file], title: eventTitle ?? 'Etkinlik' })
          return
        }
      }

      // Final fallback: download whatever we have, or share the page URL
      if (blob) {
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = name
        a.click()
        URL.revokeObjectURL(url)
      } else if (navigator.share) {
        await navigator.share({ title: eventTitle ?? 'Etkinlik', url: window.location.href })
      }
    } catch (e: any) {
      if (e?.name !== 'AbortError') console.error(e)
    } finally {
      setLoading(null)
    }
  }

  const busy = loading !== null

  return (
    <div className="flex items-center gap-2 flex-wrap justify-center">
      <button
        onClick={handleShare}
        disabled={busy}
        className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-accent text-white text-sm font-semibold hover:bg-accent/80 transition-colors disabled:opacity-50"
      >
        {loading === 'share' ? <Loader2 size={14} className="animate-spin" /> : <Share2 size={14} />}
        {loading === 'share' ? 'Hazırlanıyor…' : 'Paylaş'}
      </button>
      <button
        onClick={handleDownload}
        disabled={busy}
        className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-white/10 text-white text-sm font-medium hover:bg-white/20 transition-colors disabled:opacity-50"
      >
        {loading === 'download' ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
        {loading === 'download' ? 'Hazırlanıyor…' : 'PNG İndir'}
      </button>
      <button
        onClick={() => window.print()}
        disabled={busy}
        className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-white/10 text-white text-sm font-medium hover:bg-white/20 transition-colors disabled:opacity-50"
      >
        <Printer size={14} />
        Yazdır
      </button>
    </div>
  )
}
