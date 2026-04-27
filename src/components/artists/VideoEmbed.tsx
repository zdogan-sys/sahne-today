'use client'

import { getVideoEmbedUrl, getYouTubeThumbnail } from '@/lib/utils'
import { useState } from 'react'
import Image from 'next/image'
import { Play } from 'lucide-react'

export function VideoEmbed({ url }: { url: string }) {
  const embedUrl = getVideoEmbedUrl(url)
  const thumbnail = getYouTubeThumbnail(url)
  const [playing, setPlaying] = useState(false)

  if (!embedUrl) return null

  if (playing) {
    return (
      <div className="relative aspect-video rounded-lg overflow-hidden">
        <iframe
          src={`${embedUrl}?autoplay=1`}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          className="absolute inset-0 w-full h-full"
        />
      </div>
    )
  }

  return (
    <button
      onClick={() => setPlaying(true)}
      className="relative aspect-video rounded-lg overflow-hidden w-full bg-surface group"
    >
      {thumbnail ? (
        <Image
          src={thumbnail}
          alt="Video"
          fill
          className="object-cover group-hover:brightness-75 transition-all"
          sizes="(max-width: 672px) 100vw, 672px"
        />
      ) : (
        <div className="absolute inset-0 bg-[rgba(228,224,216,0.04)]" />
      )}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="w-14 h-14 rounded-full bg-accent/90 flex items-center justify-center group-hover:scale-110 transition-transform">
          <Play size={24} className="text-white ml-1" />
        </div>
      </div>
    </button>
  )
}
