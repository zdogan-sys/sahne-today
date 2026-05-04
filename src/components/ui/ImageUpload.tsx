'use client'

import { useRef, useState } from 'react'
import Image from 'next/image'
import { Upload, Link, X, Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'

interface ImageUploadProps {
  value: string
  onChange: (url: string) => void
  bucket?: string
  label?: string
}

export function ImageUpload({ value, onChange, bucket = 'avatars', label = 'Fotoğraf' }: ImageUploadProps) {
  const [mode, setMode] = useState<'upload' | 'url'>('upload')
  const [urlInput, setUrlInput] = useState(value)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  async function handleFile(file: File) {
    if (!file.type.startsWith('image/')) { setError('Sadece resim dosyası yüklenebilir.'); return }
    if (file.size > 10 * 1024 * 1024) { setError('Dosya 10MB\'dan küçük olmalı.'); return }

    setUploading(true)
    setError('')

    const supabase = createClient()
    const { data: { session } } = await supabase.auth.getSession()
    const token = session?.access_token

    const form = new FormData()
    form.append('file', file)
    form.append('bucket', bucket)

    const res = await fetch('/api/upload', {
      method: 'POST',
      headers: token ? { authorization: `Bearer ${token}` } : {},
      body: form,
    })
    const json = await res.json()

    if (!res.ok) {
      setError(json.error ?? 'Yükleme başarısız.')
      setUploading(false)
      return
    }

    onChange(json.url)
    setUploading(false)
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <label className="label mb-0">{label}</label>
        <div className="flex gap-1">
          <button type="button" onClick={() => setMode('upload')}
            className={cn('text-xs px-2 py-0.5 rounded transition-colors', mode === 'upload' ? 'bg-accent/10 text-accent' : 'text-text-muted hover:text-text-primary')}>
            <Upload size={11} className="inline mr-1" />Yükle
          </button>
          <button type="button" onClick={() => setMode('url')}
            className={cn('text-xs px-2 py-0.5 rounded transition-colors', mode === 'url' ? 'bg-accent/10 text-accent' : 'text-text-muted hover:text-text-primary')}>
            <Link size={11} className="inline mr-1" />URL
          </button>
        </div>
      </div>

      {value ? (
        <div className="flex items-center gap-4 mb-3">
          <div className="relative w-20 h-20 rounded-full overflow-hidden border-2 border-accent/30 flex-shrink-0">
            <Image src={value} alt="Profil fotoğrafı" fill className="object-cover" sizes="80px" />
          </div>
          <div className="flex flex-col gap-1.5">
            <p className="text-xs text-text-muted">Mevcut fotoğraf</p>
            <button
              type="button"
              onClick={() => { onChange(''); setUrlInput('') }}
              className="flex items-center gap-1.5 text-xs text-red-400 hover:text-red-300 transition-colors"
            >
              <X size={12} />
              Fotoğrafı kaldır
            </button>
          </div>
        </div>
      ) : null}

      {mode === 'upload' ? (
        <div
          onClick={() => inputRef.current?.click()}
          onDrop={handleDrop}
          onDragOver={(e) => e.preventDefault()}
          className={cn(
            'border border-dashed border-[rgba(228,224,216,0.2)] rounded-lg p-6 text-center cursor-pointer transition-colors',
            uploading ? 'opacity-60 pointer-events-none' : 'hover:border-accent/40 hover:bg-accent/5'
          )}
        >
          {uploading ? (
            <div className="flex flex-col items-center gap-2 text-text-muted">
              <Loader2 size={20} className="animate-spin" />
              <span className="text-xs">Yükleniyor...</span>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2 text-text-muted">
              <Upload size={20} />
              <span className="text-xs">Tıkla veya sürükle · JPG, PNG, WEBP · max 5MB</span>
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
      ) : (
        <div className="flex gap-2">
          <input
            value={urlInput}
            onChange={(e) => setUrlInput(e.target.value)}
            placeholder="https://..."
            className="input-field flex-1"
          />
          <button
            type="button"
            onClick={() => { if (urlInput.trim()) onChange(urlInput.trim()) }}
            disabled={!urlInput.trim()}
            className="btn-outline px-3 disabled:opacity-40 text-sm"
          >
            Uygula
          </button>
        </div>
      )}

      {error && <p className="text-red-400 text-xs mt-1">{error}</p>}
    </div>
  )
}
