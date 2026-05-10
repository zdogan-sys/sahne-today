'use client'

import { useState, useRef } from 'react'
import Image from 'next/image'
import { Camera, Loader2, Music, Trash2 } from 'lucide-react'
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
  const [error, setError] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const supabase = createClient()

  async function handleFile(file: File) {
    if (!file.type.startsWith('image/')) return
    setUploading(true)
    setError('')
    try {
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
      if (!res.ok || !json.url) { setError(json.error ?? 'Yükleme başarısız'); return }
      setUrl(json.url)
      const { error: dbErr } = await supabase.from('venues').update({ photo_url: json.url } as any).eq('id', venueId)
      if (dbErr) setError('Kaydedilemedi: ' + dbErr.message)
    } finally {
      setUploading(false)
      // reset input so same file can be re-selected
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  async function handleRemove() {
    setUploading(true)
    setError('')
    const { error: dbErr } = await supabase.from('venues').update({ photo_url: null } as any).eq('id', venueId)
    if (dbErr) { setError('Kaldırılamadı: ' + dbErr.message); setUploading(false); return }
    setUrl('')
    setUploading(false)
  }

  return (
    <div className="absolute inset-0">
      {url ? (
        <Image src={url} alt={name} fill className="object-cover" sizes="(max-width: 1024px) 100vw, 896px" priority />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-b from-surface to-background">
          <Music size={64} className="text-[rgba(228,224,216,0.08)]" />
        </div>
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-background via-background/40 to-transparent" />

      {isOwner && (
        <div className="absolute bottom-4 right-4 z-20 flex items-center gap-2">
          {error && (
            <span className="text-xs text-red-400 bg-black/60 px-2 py-1 rounded-full">{error}</span>
          )}
          {url && (
            <button
              onClick={handleRemove}
              disabled={uploading}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-red-500/80 text-white text-xs font-medium hover:bg-red-500 transition-colors disabled:opacity-50"
            >
              {uploading ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />}
              Kaldır
            </button>
          )}
          <button
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-black/60 text-white text-xs font-medium hover:bg-black/80 transition-colors disabled:opacity-50"
          >
            {uploading ? <Loader2 size={12} className="animate-spin" /> : <Camera size={12} />}
            {url ? 'Değiştir' : 'Fotoğraf Ekle'}
          </button>
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f) }}
      />
    </div>
  )
}
