'use client'

import { useState, useRef } from 'react'
import Image from 'next/image'
import { Camera, Loader2, Music } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

interface Props {
  venueId: string
  initialUrl: string
  name: string
  isOwner: boolean
}

export function VenueCoverEditor({ venueId, initialUrl, name, isOwner }: Props) {
  const [url, setUrl] = useState(initialUrl)
  const [uploading, setUploading] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const supabase = createClient()

  async function handleFile(file: File) {
    if (!file.type.startsWith('image/')) return
    setUploading(true)
    const { data: { session } } = await supabase.auth.getSession()
    const form = new FormData()
    form.append('file', file)
    form.append('bucket', 'venues')
    const res = await fetch('/api/upload', {
      method: 'POST',
      headers: session?.access_token ? { authorization: `Bearer ${session.access_token}` } : {},
      body: form,
    })
    const json = await res.json()
    if (res.ok && json.url) {
      setUrl(json.url)
      await supabase.from('venues').update({ photo_url: json.url } as any).eq('id', venueId)
    }
    setUploading(false)
  }

  return (
    <div
      className={`absolute inset-0 ${isOwner ? 'cursor-pointer group' : ''}`}
      onClick={() => isOwner && inputRef.current?.click()}
    >
      {url ? (
        <Image src={url} alt={name} fill className="object-cover" sizes="(max-width: 1024px) 100vw, 896px" priority />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-b from-surface to-background">
          <Music size={64} className="text-[rgba(228,224,216,0.08)]" />
        </div>
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-background via-background/40 to-transparent" />

      {isOwner && (
        <div className="absolute inset-0 bg-black/40 flex flex-col items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity z-10">
          {uploading
            ? <Loader2 size={28} className="text-white animate-spin" />
            : <><Camera size={28} className="text-white" /><span className="text-white text-sm font-medium">Kapak Fotoğrafını Değiştir</span></>
          }
        </div>
      )}

      {isOwner && (
        <input ref={inputRef} type="file" accept="image/*" className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f) }} />
      )}
    </div>
  )
}
