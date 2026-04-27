'use client'

import { useState, useRef } from 'react'
import Image from 'next/image'
import { Camera, Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

interface Props {
  bandId: string
  initialUrl: string
  name: string
  isCreator: boolean
}

export function BandLogoEditor({ bandId, initialUrl, name, isCreator }: Props) {
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
    form.append('bucket', 'avatars')

    const res = await fetch('/api/upload', {
      method: 'POST',
      headers: session?.access_token ? { authorization: `Bearer ${session.access_token}` } : {},
      body: form,
    })
    const json = await res.json()

    if (res.ok && json.url) {
      setUrl(json.url)
      await supabase.from('bands').update({ photo_url: json.url } as any).eq('id', bandId)
    }
    setUploading(false)
  }

  return (
    <div
      className={`relative w-20 h-20 rounded-xl overflow-hidden bg-accent/10 flex items-center justify-center text-accent font-bold text-3xl flex-shrink-0 ${isCreator ? 'cursor-pointer group' : ''}`}
      onClick={() => isCreator && inputRef.current?.click()}
    >
      {url ? (
        <Image src={url} alt={name} width={80} height={80} className="object-cover w-full h-full" />
      ) : (
        <span>{name[0].toUpperCase()}</span>
      )}

      {isCreator && (
        <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
          {uploading
            ? <Loader2 size={20} className="text-white animate-spin" />
            : <Camera size={20} className="text-white" />
          }
          {!uploading && <span className="text-white text-[10px] mt-1">Değiştir</span>}
        </div>
      )}

      {isCreator && (
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f) }}
        />
      )}
    </div>
  )
}
