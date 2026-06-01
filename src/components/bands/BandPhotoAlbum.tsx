'use client'

import { useState, useRef } from 'react'
import Image from 'next/image'
import { useLocale } from 'next-intl'
import { Plus, X, Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

interface Props {
  bandId: string
  initialPhotos: string[]
  isCreator: boolean
}

export function BandPhotoAlbum({ bandId, initialPhotos, isCreator }: Props) {
  const isEn = useLocale() === 'en'
  const [photos, setPhotos] = useState<string[]>(initialPhotos)
  const [uploading, setUploading] = useState(false)
  const [lightbox, setLightbox] = useState<string | null>(null)
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
      const next = [...photos, json.url]
      setPhotos(next)
      await supabase.from('bands').update({ photos: next } as any).eq('id', bandId)
    }
    setUploading(false)
  }

  async function remove(url: string) {
    const next = photos.filter((p) => p !== url)
    setPhotos(next)
    await supabase.from('bands').update({ photos: next } as any).eq('id', bandId)
  }

  return (
    <div>
      {photos.length === 0 && !isCreator ? (
        <p className="text-text-muted text-sm py-8 text-center">{isEn ? 'No photos added yet.' : 'Henüz fotoğraf eklenmemiş.'}</p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {photos.map((url) => (
            <div key={url} className="relative aspect-square rounded-lg overflow-hidden bg-surface group cursor-pointer"
              onClick={() => setLightbox(url)}>
              <Image src={url} alt="" fill className="object-cover" sizes="(max-width: 640px) 50vw, 33vw" />
              {isCreator && (
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); remove(url) }}
                  className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-black/60 flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500/80"
                >
                  <X size={12} />
                </button>
              )}
            </div>
          ))}

          {isCreator && (
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              disabled={uploading}
              className="aspect-square rounded-lg border-2 border-dashed border-[rgba(228,224,216,0.15)] flex flex-col items-center justify-center gap-1.5 text-text-muted hover:border-accent/40 hover:text-accent transition-colors disabled:opacity-50"
            >
              {uploading
                ? <Loader2 size={20} className="animate-spin" />
                : <><Plus size={20} /><span className="text-xs">{isEn ? 'Add Photo' : 'Fotoğraf Ekle'}</span></>
              }
            </button>
          )}
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f) }}
      />

      {/* Lightbox */}
      {lightbox && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
          onClick={() => setLightbox(null)}
        >
          <button className="absolute top-4 right-4 text-white/70 hover:text-white" onClick={() => setLightbox(null)}>
            <X size={24} />
          </button>
          <div className="relative max-w-3xl max-h-[90vh] w-full h-full">
            <Image src={lightbox} alt="" fill className="object-contain" sizes="100vw" />
          </div>
        </div>
      )}
    </div>
  )
}
