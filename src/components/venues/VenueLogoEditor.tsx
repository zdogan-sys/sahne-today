'use client'

import { useState, useRef } from 'react'
import Image from 'next/image'
import { Camera, Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

interface Props {
  venueId: string
  initialUrl: string | null
  name: string
  isOwner: boolean
}

export function VenueLogoEditor({ venueId, initialUrl, name, isOwner }: Props) {
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
      await supabase.from('venues').update({ logo_url: json.url } as any).eq('id', venueId)
    }
    setUploading(false)
  }

  const initials = name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()

  return (
    <div className="relative flex-shrink-0">
      <div
        className={`w-20 h-20 rounded-2xl overflow-hidden border-2 border-background bg-surface flex items-center justify-center ${isOwner ? 'cursor-pointer group' : ''}`}
        onClick={() => isOwner && inputRef.current?.click()}
      >
        {url ? (
          <Image src={url} alt={name} fill className="object-cover" sizes="80px" />
        ) : (
          <span className="font-bebas text-2xl text-accent">{initials}</span>
        )}

        {isOwner && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity rounded-2xl">
            {uploading
              ? <Loader2 size={18} className="text-white animate-spin" />
              : <Camera size={18} className="text-white" />
            }
          </div>
        )}
      </div>

      {isOwner && (
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
