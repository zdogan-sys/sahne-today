'use client'

import { useState } from 'react'
import { Edit2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { BottomSheet } from '@/components/ui/BottomSheet'
import { CITY_OPTIONS } from '@/lib/constants'
import { ImageUpload } from '@/components/ui/ImageUpload'

interface Props {
  userId: string
  initialData: {
    display_name: string
    email: string | undefined
    city: string | null
    bio: string | null
    avatar_url: string | null
  }
}

export function UserProfileEditor({ userId, initialData }: Props) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const [displayName, setDisplayName] = useState(initialData.display_name)
  const [email, setEmail] = useState(initialData.email || '')
  const [city, setCity] = useState(initialData.city || '')
  const [bio, setBio] = useState(initialData.bio || '')
  const [avatarUrl, setAvatarUrl] = useState(initialData.avatar_url || '')

  async function handleSave() {
    if (!displayName.trim() || !email.trim()) {
      setError('Ad ve E-posta alanları zorunludur.')
      return
    }

    setLoading(true)
    setError('')
    setSuccess('')
    const supabase = createClient()

    // Email update logic (requires auth update)
    if (email !== initialData.email) {
      const { error: authErr } = await supabase.auth.updateUser({ email })
      if (authErr) {
        setError('E-posta güncellenirken hata: ' + authErr.message)
        setLoading(false)
        return
      }
      setSuccess('E-posta adresi değiştirildi. Lütfen gelen onay mailini kontrol edin.')
    }

    const { error: dbErr } = await supabase
      .from('profiles')
      .update({
        display_name: displayName.trim(),
        city: city || null,
        bio: bio || null,
        avatar_url: avatarUrl || null
      } as any)
      .eq('id', userId)

    if (dbErr) {
      setError('Profil güncellenirken hata: ' + dbErr.message)
      setLoading(false)
    } else {
      if (!success) {
        window.location.reload()
      } else {
        setLoading(false)
      }
    }
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 text-xs text-accent hover:underline px-3 py-1.5 bg-accent/10 rounded-lg transition-colors mt-2"
      >
        <Edit2 size={13} />
        Hesap Bilgilerini Düzenle
      </button>

      <BottomSheet open={open} onClose={() => setOpen(false)} title="Hesap Bilgilerini Düzenle">
        <div className="space-y-4 pb-4">
          
          <ImageUpload
            value={avatarUrl}
            onChange={setAvatarUrl}
            bucket="avatars"
            label="Profil Fotoğrafı"
          />

          <div>
            <label className="label">Ad Soyad *</label>
            <input
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="input-field text-sm"
            />
          </div>

          <div>
            <label className="label">E-posta Adresi *</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="input-field text-sm"
            />
            <p className="text-[10px] text-text-muted mt-1">
              E-posta adresinizi değiştirdiğinizde, yeni adresinize bir doğrulama maili gönderilecektir.
            </p>
          </div>

          <div>
            <label className="label">Şehir</label>
            <select
              value={city}
              onChange={(e) => setCity(e.target.value)}
              className="input-field text-sm"
            >
              <option value="">Seçin</option>
              {CITY_OPTIONS.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="label">Hakkında (Opsiyonel)</label>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              rows={3}
              className="input-field text-sm resize-none"
              placeholder="Kısaca kendinizden bahsedin..."
            />
          </div>

          {error && <p className="text-red-400 text-xs">{error}</p>}
          {success && <p className="text-success text-xs">{success}</p>}

          <button
            onClick={handleSave}
            disabled={loading || !displayName.trim() || !email.trim()}
            className="btn-accent w-full py-3 text-sm disabled:opacity-50 mt-4"
          >
            {loading ? 'Kaydediliyor...' : 'Değişiklikleri Kaydet'}
          </button>
        </div>
      </BottomSheet>
    </>
  )
}
