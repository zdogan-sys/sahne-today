'use client'

import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { useLocale } from 'next-intl'
import { Camera, Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { saveArtistAvatar } from '@/app/actions/artist'

interface Props {
  artistId: string
  avatarUrl: string | null
  initials: string
}

export function ArtistAvatarEditor({ artistId, avatarUrl, initials }: Props) {
  const router = useRouter()
  const isEn = useLocale() === 'en'
  const inputRef = useRef<HTMLInputElement>(null)
  const [preview, setPreview] = useState(avatarUrl)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')

  async function handleFile(file: File) {
    if (!file.type.startsWith('image/')) { setError(isEn ? 'Only image files can be uploaded.' : 'Sadece resim dosyası yüklenebilir.'); return }
    if (file.size > 10 * 1024 * 1024) { setError(isEn ? 'File must be smaller than 10MB.' : 'Dosya 10MB\'dan küçük olmalı.'); return }

    setUploading(true)
    setError('')

    try {
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.access_token

      const form = new FormData()
      form.append('file', file)
      form.append('bucket', 'avatars')

      const res = await fetch('/api/upload', {
        method: 'POST',
        headers: token ? { authorization: `Bearer ${token}` } : {},
        body: form,
      })
      const json = await res.json()

      if (!res.ok) {
        setError(json.error ?? (isEn ? 'Upload failed.' : 'Yükleme başarısız.'))
        return
      }

      const url: string = json.url
      const result = await saveArtistAvatar(artistId, url)

      if (!result.success) {
        setError(result.error ?? (isEn ? 'Save failed.' : 'Kayıt başarısız.'))
        return
      }

      setPreview(url)
      router.refresh()
    } catch {
      setError(isEn ? 'An error occurred.' : 'Bir hata oluştu.')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="flex-shrink-0">
      <button
        type="button"
        onClick={() => !uploading && inputRef.current?.click()}
        className="group relative w-20 h-20 rounded-full overflow-hidden bg-accent/10 flex items-center justify-center text-accent font-bold text-2xl focus:outline-none"
        title={isEn ? 'Change profile photo' : 'Profil fotoğrafını değiştir'}
      >
        {preview ? (
          <Image src={preview} alt="Profil fotoğrafı" fill className="object-cover" sizes="80px" />
        ) : (
          <span>{initials}</span>
        )}

        <span className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity rounded-full">
          {uploading
            ? <Loader2 size={20} className="text-white animate-spin" />
            : <Camera size={20} className="text-white" />
          }
        </span>
      </button>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f) }}
      />

      {error && <p className="text-red-400 text-xs mt-1 text-center max-w-[80px]">{error}</p>}
    </div>
  )
}
