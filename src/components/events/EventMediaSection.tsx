'use client'

import { useRef, useState } from 'react'
import Image from 'next/image'
import { Camera, Loader2, X, Plus, ImageIcon } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { updateEventPoster, addEventPhoto, removeEventPhoto } from '@/app/actions/event'

async function uploadImage(file: File): Promise<string | null> {
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
  return res.ok && json.url ? json.url : null
}

interface PosterProps {
  eventId: string
  initialPoster: string | null
  isParty: boolean
}

export function EventPosterSection({ eventId, initialPoster, isParty }: PosterProps) {
  const [poster, setPoster] = useState(initialPoster)
  const [uploading, setUploading] = useState(false)
  const ref = useRef<HTMLInputElement>(null)

  async function handleFile(file: File) {
    setUploading(true)
    const url = await uploadImage(file)
    if (url) {
      const res = await updateEventPoster(eventId, url)
      if (res.success) setPoster(url)
    }
    setUploading(false)
  }

  if (poster) {
    return (
      <div className="relative w-full h-full min-h-[320px] sm:min-h-full overflow-hidden group">
        <Image src={poster} alt="Etkinlik Afişi" fill className="object-cover" sizes="50vw" quality={90} />
        {isParty && (
          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
            <button
              onClick={() => ref.current?.click()}
              disabled={uploading}
              className="flex flex-col items-center gap-1.5 text-white"
            >
              {uploading ? <Loader2 size={22} className="animate-spin" /> : <Camera size={22} />}
              <span className="text-xs font-medium">{uploading ? 'Yükleniyor...' : 'Değiştir'}</span>
            </button>
          </div>
        )}
        <input ref={ref} type="file" accept="image/*" className="hidden"
          onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f) }} />
      </div>
    )
  }

  if (isParty) {
    return (
      <button
        onClick={() => ref.current?.click()}
        disabled={uploading}
        className="w-full h-full min-h-[320px] sm:min-h-full border-r border-dashed border-[rgba(228,224,216,0.15)] bg-[rgba(228,224,216,0.02)] hover:bg-[rgba(228,224,216,0.05)] transition-colors flex flex-col items-center justify-center gap-2 text-text-muted hover:text-text-primary"
      >
        {uploading ? <Loader2 size={24} className="animate-spin" /> : <ImageIcon size={24} />}
        <span className="text-sm font-medium">{uploading ? 'Yükleniyor...' : 'Afiş Ekle'}</span>
        <input ref={ref} type="file" accept="image/*" className="hidden"
          onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f) }} />
      </button>
    )
  }

  return null
}

interface PhotosProps {
  eventId: string
  initialPhotos: string[]
  isParty: boolean
}

export function EventPhotosSection({ eventId, initialPhotos, isParty }: PhotosProps) {
  const [photos, setPhotos] = useState(initialPhotos)
  const [uploading, setUploading] = useState(false)
  const [removing, setRemoving] = useState<string | null>(null)
  const [lightbox, setLightbox] = useState<string | null>(null)
  const ref = useRef<HTMLInputElement>(null)
  const cameraRef = useRef<HTMLInputElement>(null)

  async function handleFile(file: File) {
    setUploading(true)
    const url = await uploadImage(file)
    if (url) {
      const res = await addEventPhoto(eventId, url)
      if (res.success) setPhotos(prev => [...prev, url])
    }
    setUploading(false)
  }

  async function handleRemove(url: string) {
    setRemoving(url)
    const res = await removeEventPhoto(eventId, url)
    if (res.success) setPhotos(prev => prev.filter(p => p !== url))
    setRemoving(null)
  }

  if (photos.length === 0 && !isParty) return null

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h3 className="label">Etkinlik Fotoğrafları</h3>
        {isParty && !uploading && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => cameraRef.current?.click()}
              className="flex items-center gap-1 text-xs text-accent border border-accent/30 rounded-lg px-2.5 py-1 hover:bg-accent/10 transition-colors"
            >
              <Camera size={11} /> Kamera
            </button>
            <button
              onClick={() => ref.current?.click()}
              className="flex items-center gap-1 text-xs text-text-muted border border-[rgba(228,224,216,0.15)] rounded-lg px-2.5 py-1 hover:border-accent/40 hover:text-accent transition-colors"
            >
              <Plus size={11} /> Galeri
            </button>
          </div>
        )}
        {isParty && uploading && (
          <span className="flex items-center gap-1 text-xs text-text-muted">
            <Loader2 size={11} className="animate-spin" /> Yükleniyor...
          </span>
        )}
      </div>

      {photos.length === 0 ? (
        <div className="w-full py-8 rounded-xl border border-dashed border-[rgba(228,224,216,0.2)] bg-[rgba(228,224,216,0.03)] flex flex-col items-center gap-3 text-text-muted">
          <Camera size={20} />
          <span className="text-sm">Etkinlik fotoğrafı ekle</span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => cameraRef.current?.click()}
              className="flex items-center gap-1.5 text-xs text-accent border border-accent/30 rounded-lg px-3 py-1.5 hover:bg-accent/10 transition-colors font-medium"
            >
              <Camera size={12} /> Kamera ile Çek
            </button>
            <button
              onClick={() => ref.current?.click()}
              className="flex items-center gap-1.5 text-xs text-text-muted border border-[rgba(228,224,216,0.15)] rounded-lg px-3 py-1.5 hover:border-accent/40 hover:text-accent transition-colors"
            >
              <Plus size={12} /> Galeriden Seç
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {photos.map((url, i) => (
            <div key={i} className="relative aspect-square rounded-xl overflow-hidden group cursor-pointer"
              onClick={() => setLightbox(url)}>
              <Image src={url} alt={`Fotoğraf ${i + 1}`} fill className="object-cover" sizes="200px" />
              {isParty && (
                <button
                  onClick={e => { e.stopPropagation(); handleRemove(url) }}
                  disabled={removing === url}
                  className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-black/60 text-white flex items-center justify-center opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity hover:bg-red-500/80 z-10"
                >
                  {removing === url ? <Loader2 size={11} className="animate-spin" /> : <X size={11} />}
                </button>
              )}
            </div>
          ))}
          {isParty && (
            <div className="aspect-square rounded-xl border border-dashed border-[rgba(228,224,216,0.2)] bg-[rgba(228,224,216,0.03)] flex flex-col items-center justify-center gap-2">
              {uploading ? (
                <Loader2 size={18} className="animate-spin text-text-muted" />
              ) : (
                <>
                  <button
                    onClick={() => cameraRef.current?.click()}
                    className="flex items-center gap-1 text-xs text-accent hover:underline"
                  >
                    <Camera size={12} /> Kamera
                  </button>
                  <button
                    onClick={() => ref.current?.click()}
                    className="flex items-center gap-1 text-xs text-text-muted hover:text-accent"
                  >
                    <Plus size={12} /> Galeri
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      )}

      <input ref={ref} type="file" accept="image/*" className="hidden"
        onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f) }} />
      <input ref={cameraRef} type="file" accept="image/*" capture="environment" className="hidden"
        onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f) }} />

      {lightbox && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
          onClick={() => setLightbox(null)}
        >
          <button className="absolute top-4 right-4 w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors">
            <X size={18} />
          </button>
          <div className="relative max-w-2xl max-h-[90vh] w-full h-full">
            <Image src={lightbox} alt="Fotoğraf" fill className="object-contain" sizes="100vw" />
          </div>
        </div>
      )}
    </div>
  )
}
