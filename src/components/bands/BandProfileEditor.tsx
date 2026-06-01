'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useLocale } from 'next-intl'
import { Edit2 } from 'lucide-react'
import { BottomSheet } from '@/components/ui/BottomSheet'
import { TabbedGenreSelector } from '@/components/ui/TabbedGenreSelector'
import { CITY_OPTIONS } from '@/lib/constants'
import { updateBandProfile, deleteBand } from '@/app/actions/band'

interface Props {
  bandId: string
  initialData: {
    name: string
    city: string | null
    genres: string[]
    bio: string | null
  }
}

export function BandProfileEditor({ bandId, initialData }: Props) {
  const router = useRouter()
  const isEn = useLocale() === 'en'
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const [name, setName] = useState(initialData.name)
  const [city, setCity] = useState(initialData.city || '')
  const [genres, setGenres] = useState<string[]>(initialData.genres || [])
  const [bio, setBio] = useState(initialData.bio || '')

  const [confirmDelete, setConfirmDelete] = useState(false)

  async function handleSave() {
    if (!name.trim()) {
      setError(isEn ? 'Band name is required.' : 'Grup adı zorunludur.')
      return
    }

    setLoading(true)
    setError('')

    const result = await updateBandProfile(bandId, {
      name: name.trim(),
      city: city || null,
      genres,
      bio: bio || null,
    })

    if (!result.success) {
      setError((isEn ? 'An error occurred: ' : 'Bir hata oluştu: ') + result.error)
      setLoading(false)
    } else {
      setOpen(false)
      router.refresh()
    }
  }

  async function handleDelete() {
    setLoading(true)
    setError('')
    const result = await deleteBand(bandId)
    if (!result.success) {
      setError((isEn ? 'Error deleting band: ' : 'Grup silinirken hata oluştu: ') + result.error)
      setLoading(false)
      setConfirmDelete(false)
    } else {
      window.location.href = '/dashboard'
    }
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 text-xs text-accent hover:underline px-2 py-1 bg-accent/10 rounded-md transition-colors"
      >
        <Edit2 size={12} />
        {isEn ? 'Edit Profile' : 'Profili Düzenle'}
      </button>

      <BottomSheet open={open} onClose={() => setOpen(false)} title={isEn ? 'Edit Profile' : 'Profili Düzenle'}>
        <div className="space-y-4">
          <div>
            <label className="label">{isEn ? 'Band Name *' : 'Grup Adı *'}</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="input-field text-sm"
              placeholder={isEn ? 'Band Name' : 'Grup Adı'}
            />
          </div>

          <div>
            <label className="label">{isEn ? 'City' : 'Şehir'}</label>
            <select
              value={city}
              onChange={(e) => setCity(e.target.value)}
              className="input-field text-sm"
            >
              <option value="">{isEn ? 'Select City' : 'Şehir Seçin'}</option>
              {CITY_OPTIONS.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          <TabbedGenreSelector
            label={isEn ? 'Genres' : 'Türler'}
            selected={genres}
            onToggle={(g) => setGenres(genres.includes(g) ? genres.filter((x) => x !== g) : [...genres, g])}
          />

          <div>
            <label className="label">{isEn ? 'About' : 'Hakkında'}</label>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              rows={4}
              className="input-field text-sm resize-none"
              placeholder={isEn ? 'A short description about the band...' : 'Grup hakkında kısa bir açıklama...'}
            />
          </div>

          {error && <p className="text-red-400 text-xs">{error}</p>}

          <div className="pt-4 border-t border-[rgba(228,224,216,0.1)] flex flex-col gap-2">
            <button
              onClick={handleSave}
              disabled={loading || !name.trim()}
              className="btn-accent w-full py-3 text-sm disabled:opacity-50"
            >
              {loading && !confirmDelete ? (isEn ? 'Saving...' : 'Kaydediliyor...') : (isEn ? 'Save Changes' : 'Değişiklikleri Kaydet')}
            </button>

            {confirmDelete ? (
              <div className="flex gap-2 mt-2">
                <button
                  onClick={() => setConfirmDelete(false)}
                  disabled={loading}
                  className="btn-outline flex-1 py-3 text-sm text-text-muted"
                >
                  {isEn ? 'Cancel' : 'İptal'}
                </button>
                <button
                  onClick={handleDelete}
                  disabled={loading}
                  className="bg-red-500 hover:bg-red-600 text-white rounded-xl font-medium transition-colors flex-1 py-3 text-sm disabled:opacity-50"
                >
                  {loading ? (isEn ? 'Deleting...' : 'Siliniyor...') : (isEn ? 'Yes, Delete Band' : 'Evet, Grubu Sil')}
                </button>
              </div>
            ) : (
              <button
                onClick={() => setConfirmDelete(true)}
                disabled={loading}
                className="w-full py-3 text-sm text-red-400 hover:bg-red-400/10 rounded-xl transition-colors mt-2 disabled:opacity-50"
              >
                {isEn ? 'Delete Band' : 'Grubu Sil'}
              </button>
            )}
          </div>
        </div>
      </BottomSheet>
    </>
  )
}
