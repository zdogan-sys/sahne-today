'use client'

import { useState } from 'react'
import { useLocale } from 'next-intl'
import { Edit2, Eye, EyeOff, KeyRound } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { BottomSheet } from '@/components/ui/BottomSheet'
import { CITY_OPTIONS, ALL_GENRES, getGenreColor } from '@/lib/constants'
import { ImageUpload } from '@/components/ui/ImageUpload'

interface Props {
  userId: string
  initialData: {
    display_name: string
    email: string | undefined
    city: string | null
    bio: string | null
    avatar_url: string | null
    preferred_genres: string[] | null
  }
}

export function UserProfileEditor({ userId, initialData }: Props) {
  const locale = useLocale()
  const isEn = locale === 'en'
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const [displayName, setDisplayName] = useState(initialData.display_name)
  const [email, setEmail] = useState(initialData.email || '')
  const [city, setCity] = useState(initialData.city || '')
  const [bio, setBio] = useState(initialData.bio || '')
  const [preferredGenres, setPreferredGenres] = useState<string[]>(initialData.preferred_genres ?? [])

  function toggleGenre(genre: string) {
    setPreferredGenres(prev =>
      prev.includes(genre) ? prev.filter(g => g !== genre) : [...prev, genre]
    )
  }
  const [avatarUrl, setAvatarUrl] = useState(initialData.avatar_url || '')

  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [passwordLoading, setPasswordLoading] = useState(false)
  const [passwordError, setPasswordError] = useState('')
  const [passwordSuccess, setPasswordSuccess] = useState('')

  async function handleSave() {
    if (!displayName.trim() || !email.trim()) {
      setError('Ad ve E-posta alanları zorunludur.')
      return
    }

    setLoading(true)
    setError('')
    setSuccess('')
    const supabase = createClient()

    if (email !== initialData.email) {
      const { error: authErr } = await supabase.auth.updateUser({ email })
      if (authErr) {
        setError('E-posta güncellenirken hata: ' + authErr.message)
        setLoading(false)
        return
      }
      setSuccess('E-posta adresi değiştirildi. Lütfen gelen onay mailini kontrol edin.')
    }

    await supabase.auth.updateUser({ data: { display_name: displayName.trim() } })

    const { error: dbErr } = await supabase
      .from('profiles')
      .update({
        display_name: displayName.trim(),
        city: city || null,
        bio: bio || null,
        avatar_url: avatarUrl || null,
        preferred_genres: preferredGenres.length > 0 ? preferredGenres : null,
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

  async function handlePasswordChange() {
    setPasswordError('')
    setPasswordSuccess('')
    if (password.length < 6) {
      setPasswordError('Şifre en az 6 karakter olmalı.')
      return
    }
    if (password !== confirmPassword) {
      setPasswordError('Şifreler eşleşmiyor.')
      return
    }
    setPasswordLoading(true)
    const supabase = createClient()
    const { error: err } = await supabase.auth.updateUser({ password })
    setPasswordLoading(false)
    if (err) {
      setPasswordError('Şifre güncellenemedi: ' + err.message)
    } else {
      setPassword('')
      setConfirmPassword('')
      setPasswordSuccess('Şifreniz güncellendi.')
    }
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 text-xs text-accent hover:underline px-3 py-1.5 bg-accent/10 rounded-lg transition-colors mt-2"
      >
        <Edit2 size={13} />
        {isEn ? 'Edit Account' : 'Hesap Bilgilerini Düzenle'}
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
              Değiştirirseniz yeni adresinize doğrulama maili gönderilir.
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
            <label className="label">İlgilendiğiniz Etkinlik Türleri</label>
            <p className="text-[10px] text-text-muted mb-2">Haftalık etkinlik özetinizi bu tercihlere göre kişiselleştiririz.</p>
            <div className="flex flex-wrap gap-2">
              {ALL_GENRES.map((genre) => {
                const selected = preferredGenres.includes(genre)
                const color = getGenreColor(genre)
                return (
                  <button
                    key={genre}
                    type="button"
                    onClick={() => toggleGenre(genre)}
                    className="px-3 py-1 rounded-full text-xs font-medium transition-all border"
                    style={selected ? {
                      background: `${color}22`,
                      color,
                      borderColor: `${color}66`,
                    } : {
                      background: 'transparent',
                      color: 'rgba(228,224,216,0.4)',
                      borderColor: 'rgba(228,224,216,0.12)',
                    }}
                  >
                    {genre}
                  </button>
                )
              })}
            </div>
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

          {/* Şifre Değiştir */}
          <div className="border-t border-[rgba(228,224,216,0.1)] pt-4 space-y-3">
            <div className="flex items-center gap-2 text-sm text-text-muted mb-1">
              <KeyRound size={13} />
              <span>Şifre Değiştir</span>
            </div>

            <div>
              <label className="label">Yeni Şifre</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="input-field text-sm pr-10"
                  placeholder="En az 6 karakter"
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary"
                >
                  {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            {password.length > 0 && (
              <div>
                <label className="label">Şifre Tekrar</label>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="input-field text-sm"
                  placeholder="Şifreyi tekrar girin"
                  autoComplete="new-password"
                />
              </div>
            )}

            {passwordError && <p className="text-red-400 text-xs">{passwordError}</p>}
            {passwordSuccess && <p className="text-green-400 text-xs">{passwordSuccess}</p>}

            <button
              type="button"
              onClick={handlePasswordChange}
              disabled={passwordLoading || !password}
              className="btn-outline w-full py-2.5 text-sm disabled:opacity-50"
            >
              {passwordLoading ? 'Güncelleniyor...' : 'Şifreyi Güncelle'}
            </button>
          </div>

        </div>
      </BottomSheet>
    </>
  )
}
