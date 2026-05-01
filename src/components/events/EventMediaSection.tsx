'use client'

import { useRef, useState } from 'react'
import Image from 'next/image'
import { Camera, Loader2, X, Plus, ImageIcon } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { updateEventPoster, addEventPhoto, removeEventPhoto } from '@/app/actions/event'

interface Props {
  eventId: string
  initialPoster: string | null
  initialPhotos: string[]
  isParty: boolean
}

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

export function EventMediaSection({ eventId, initialPoster, initialPhotos, isParty }: Props) {
  const [poster, setPoster] = useState(initialPoster)
  const [photos, setPhotos] = useState(initialPhotos)
  const [uploadingPoster, setUploadingPoster] = useState(false)
  const [uploadingPhoto, setUploadingPhoto] = useState(false)
  const [removing, setRemoving] = useState<string | null>(null)
  const [lightbox, setLightbox] = useState<string | null>(null)

  const posterRef = useRef<HTMLInputElement>(null)
  const photoRef = useRef<HTMLInputElement>(null)

  async function handlePosterFile(file: File) {
    setUploadingPoster(true)
    const url = await uploadImage(file)
    if (url) {
      const res = await updateEventPoster(eventId, url)
      if (res.success) setPoster(url)
    }
    setUploadingPoster(false)
  }

  async function handlePhotoFile(file: File) {
    setUploadingPhoto(true)
    const url = await uploadImage(file)
    if (url) {
      const res = await addEventPhoto(eventId, url)
      if (res.success) setPhotos(prev => [...prev, url])
    }
    setUploadingPhoto(false)
  }

  async function handleRemovePhoto(url: string) {
    setRemoving(url)
    const res = await removeEventPhoto(eventId, url)
    if (res.success) setPhotos(prev => prev.filter(p => p !== url))
    setRemoving(null)
  }

  return (
    <div className="space-y-6">
      {/* Poster */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <h3 className="label">Etkinlik Afişi</h3>
          {isParty && poster && (
            <button
              onClick={() => posterRef.current?.click()}
              disabled={uploadingPoster}
              className="text-xs text-accent hover:underline flex items-center gap-1"
            >
              <Camera size={11} /> Değiştir
            </button>
          )}
        </div>

        {poster ? (
          <div className="relative w-full aspect-[3/4] max-w-xs rounded-2xl overflow-hidden shadow-xl group">
            <Image src={poster} alt="Etkinlik Afişi" fill className="object-cover" sizes="320px" quality={90} />
            {isParty && (
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <button
                  onClick={() => posterRef.current?.click()}
                  disabled={uploadingPoster}
                  className="flex flex-col items-center gap-1.5 text-white"
                >
                  {uploadingPoster ? <Loader2 size={22} className="animate-spin" /> : <Camera size={22} />}
                  <span className="text-xs font-medium">{uploadingPoster ? 'Yükleniyor...' : 'Afişi Değiştir'}</span>
                </button>
              </div>
            )}
          </div>
        ) : isParty ? (
          <button
            onClick={() => posterRef.current?.click()}
            disabled={uploadingPoster}
            className="w-full max-w-xs aspect-[3/4] rounded-2xl border border-dashed border-[rgba(228,224,216,0.2)] bg-[rgba(228,224,216,0.03)] hover:bg-[rgba(228,224,216,0.06)] transition-colors flex flex-col items-center justify-center gap-2 text-text-muted hover:text-text-primary"
          >
            {uploadingPoster ? <Loader2 size={24} className="animate-spin" /> : <ImageIcon size={24} />}
            <span className="text-sm font-medium">{uploadingPoster ? 'Yükleniyor...' : 'Afiş Ekle'}</span>
            <span className="text-xs opacity-60">Etkinlik afişini yükle</span>
          </button>
        ) : null}

        <input ref={posterRef} type="file" accept="image/*" className="hidden"
          onChange={e => { const f = e.target.files?.[0]; if (f) handlePosterFile(f) }} />
      </div>

      {/* Photos */}
      {(photos.length > 0 || isParty) && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="label">Etkinlik Fotoğrafları</h3>
            {isParty && (
              <button
                onClick={() => photoRef.current?.click()}
                disabled={uploadingPhoto}
                className="flex items-center gap-1 text-xs text-accent hover:underline disabled:opacity-50"
              >
                {uploadingPhoto ? <Loader2 size={11} className="animate-spin" /> : <Plus size={11} />}
                {uploadingPhoto ? 'Yükleniyor...' : 'Fotoğraf Ekle'}
              </button>
            )}
          </div>

          {photos.length === 0 ? (
            <button
              onClick={() => photoRef.current?.click()}
              className="w-full py-8 rounded-xl border border-dashed border-[rgba(228,224,216,0.2)] bg-[rgba(228,224,216,0.03)] hover:bg-[rgba(228,224,216,0.06)] transition-colors flex flex-col items-center gap-2 text-text-muted hover:text-text-primary"
            >
              <Camera size={20} />
              <span className="text-sm">Fotoğraf ekle</span>
              <span className="text-xs opacity-60">Etkinlik sırası veya sonrasında çekilen fotoğrafları paylaş</span>
            </button>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {photos.map((url, i) => (
                <div key={i} className="relative aspect-square rounded-xl overflow-hidden group cursor-pointer"
                  onClick={() => setLightbox(url)}>
                  <Image src={url} alt={`Fotoğraf ${i + 1}`} fill className="object-cover" sizes="200px" />
                  {isParty && (
                    <button
                      onClick={e => { e.stopPropagation(); handleRemovePhoto(url) }}
                      disabled={removing === url}
                      className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-black/60 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500/80 z-10"
                    >
                      {removing === url ? <Loader2 size={11} className="animate-spin" /> : <X size={11} />}
                    </button>
                  )}
                </div>
              ))}
              {isParty && (
                <button
                  onClick={() => photoRef.current?.click()}
                  disabled={uploadingPhoto}
                  className="aspect-square rounded-xl border border-dashed border-[rgba(228,224,216,0.2)] bg-[rgba(228,224,216,0.03)] hover:bg-[rgba(228,224,216,0.06)] transition-colors flex flex-col items-center justify-center gap-1.5 text-text-muted hover:text-text-primary disabled:opacity-50"
                >
                  {uploadingPhoto ? <Loader2 size={18} className="animate-spin" /> : <Plus size={18} />}
                  <span className="text-xs">{uploadingPhoto ? 'Yükleniyor...' : 'Ekle'}</span>
                </button>
              )}
            </div>
          )}

          <input ref={photoRef} type="file" accept="image/*" className="hidden"
            onChange={e => { const f = e.target.files?.[0]; if (f) handlePhotoFile(f) }} />
        </div>
      )}

      {/* Lightbox */}
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
