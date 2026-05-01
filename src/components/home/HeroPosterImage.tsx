'use client'

import { useRef, useState } from 'react'
import Image from 'next/image'
import { Camera, Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { updateHeroPoster } from '@/app/actions/site'

interface Props {
  url: string | null
  isAdmin: boolean
}

export function HeroPosterImage({ url: initialUrl, isAdmin }: Props) {
  const [url, setUrl] = useState(initialUrl)
  const [uploading, setUploading] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  async function handleFile(file: File) {
    if (!file.type.startsWith('image/')) return
    setUploading(true)
    const supabase = createClient()
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
      await updateHeroPoster(json.url)
      setUrl(json.url)
    }
    setUploading(false)
  }

  return (
    <div className="relative group w-full h-full">
      <div className="w-full h-full rounded-2xl overflow-hidden shadow-2xl">
        {url ? (
          <Image
            src={url}
            alt="Afiş"
            fill
            className="object-cover"
            sizes="(min-width: 1024px) 320px, 0px"
            quality={90}
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-[rgba(212,83,126,0.15)] via-[rgba(228,224,216,0.04)] to-[rgba(212,83,126,0.08)] flex flex-col items-center justify-center gap-3">
            <div className="w-16 h-0.5 bg-accent/30 rounded" />
            <div className="w-10 h-0.5 bg-accent/20 rounded" />
            <div className="w-14 h-0.5 bg-accent/25 rounded mt-4" />
            <div className="w-10 h-0.5 bg-accent/15 rounded" />
            <div className="w-12 h-0.5 bg-accent/20 rounded" />
          </div>
        )}

        {/* Edge fade overlays */}
        <div className="absolute inset-0 pointer-events-none rounded-2xl"
          style={{ background: 'linear-gradient(to right, #0a0a0b 0%, transparent 25%, transparent 75%, #0a0a0b 100%)' }}
        />
        <div className="absolute inset-0 pointer-events-none rounded-2xl"
          style={{ background: 'linear-gradient(to bottom, #0a0a0b 0%, transparent 20%, transparent 75%, #0a0a0b 100%)' }}
        />

        {/* Admin upload overlay */}
        {isAdmin && (
          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-2xl">
            <button
              onClick={() => inputRef.current?.click()}
              disabled={uploading}
              className="flex flex-col items-center gap-2 text-white"
            >
              {uploading
                ? <Loader2 size={24} className="animate-spin" />
                : <Camera size={24} />
              }
              <span className="text-xs font-medium">
                {uploading ? 'Yükleniyor...' : 'Afiş Değiştir'}
              </span>
            </button>
          </div>
        )}
      </div>

      {/* Decorative glow */}
      <div className="absolute -inset-4 bg-accent/10 rounded-3xl blur-2xl -z-10 opacity-60 pointer-events-none" />

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f) }}
      />
    </div>
  )
}
