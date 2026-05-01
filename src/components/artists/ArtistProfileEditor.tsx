'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { BottomSheet } from '@/components/ui/BottomSheet'
import { TabbedGenreSelector } from '@/components/ui/TabbedGenreSelector'
import { SocialLinksEditor, type SocialLinksData } from '@/components/ui/SocialLinksEditor'
import { CITY_OPTIONS, INSTRUMENT_OPTIONS } from '@/lib/constants'
import { cn } from '@/lib/utils'

interface Props {
  artistId: string
  initialData: {
    stage_name: string
    city: string | null
    genres: string[]
    instruments: string[]
    bio: string | null
    social_links?: SocialLinksData | null
    is_hidden?: boolean
  }
}

export function ArtistProfileEditor({ artistId, initialData }: Props) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const [stageName, setStageName] = useState(initialData.stage_name)
  const [city, setCity] = useState(initialData.city || '')
  const [genres, setGenres] = useState<string[]>(initialData.genres || [])
  const [instruments, setInstruments] = useState<string[]>(initialData.instruments || [])
  const [bio, setBio] = useState(initialData.bio || '')
  const [socialLinks, setSocialLinks] = useState<SocialLinksData>(initialData.social_links ?? {})
  const [isHidden, setIsHidden] = useState(initialData.is_hidden ?? false)
  const [activeTab, setActiveTab] = useState<'music' | 'stage'>('music')

  async function handleSave() {
    if (!stageName.trim()) {
      setError('Sahne adı zorunludur.')
      return
    }

    setLoading(true)
    setError('')

    const supabase = createClient()
    const { error: err } = await supabase
      .from('artists')
      .update({
        stage_name: stageName.trim(),
        city: city || null,
        genres,
        instruments: activeTab === 'music' ? instruments : [],
        bio: bio || null,
        social_links: socialLinks,
        is_hidden: isHidden,
      } as any)
      .eq('id', artistId)

    if (err) {
      setError('Bir hata oluştu: ' + err.message)
      setLoading(false)
    } else {
      window.location.reload()
    }
  }

  function toggleInstrument(v: string) {
    setInstruments(instruments.includes(v) ? instruments.filter((x) => x !== v) : [...instruments, v])
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="text-accent text-sm hover:underline flex items-center gap-1"
      >
        Düzenle
      </button>

      <BottomSheet open={open} onClose={() => setOpen(false)} title="Profili Düzenle">
        <div className="space-y-4">
          <div>
            <label className="label">Sahne Adı *</label>
            <input
              value={stageName}
              onChange={(e) => setStageName(e.target.value)}
              className="input-field text-sm"
              placeholder="Sahne Adı"
            />
          </div>

          <div>
            <label className="label">Şehir</label>
            <select
              value={city}
              onChange={(e) => setCity(e.target.value)}
              className="input-field text-sm"
            >
              <option value="">Şehir Seçin</option>
              {CITY_OPTIONS.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          <TabbedGenreSelector
            label="Türler"
            selected={genres}
            onToggle={(g) => setGenres(genres.includes(g) ? genres.filter((x) => x !== g) : [...genres, g])}
            onTabChange={setActiveTab}
          />

          {activeTab === 'music' && (
            <div>
              <label className="label">Enstrümanlar</label>
              <div className="flex flex-wrap gap-1.5">
                {INSTRUMENT_OPTIONS.map((opt) => (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => toggleInstrument(opt)}
                    className={cn('chip border transition-colors', instruments.includes(opt)
                      ? 'bg-accent/10 text-accent border-accent/30'
                      : 'bg-[rgba(228,224,216,0.04)] text-text-muted border-[rgba(228,224,216,0.1)] hover:text-text-primary'
                    )}
                  >
                    {opt}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div>
            <label className="label">Hakkında</label>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              rows={4}
              className="input-field text-sm resize-none"
              placeholder="Kendinizi anlatan kısa bir açıklama..."
            />
          </div>

          <SocialLinksEditor value={socialLinks} onChange={setSocialLinks} />

          <div className="flex items-center justify-between py-2 border-t border-[rgba(228,224,216,0.1)]">
            <div>
              <p className="text-sm text-text-primary">Profili Gizle</p>
              <p className="text-xs text-text-muted">Profilin sanatçı listesinde görünmez</p>
            </div>
            <button
              type="button"
              onClick={() => setIsHidden(!isHidden)}
              className={cn(
                'relative w-11 h-6 rounded-full transition-colors',
                isHidden ? 'bg-red-500/70' : 'bg-[rgba(228,224,216,0.15)]'
              )}
            >
              <span className={cn(
                'absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition-transform',
                isHidden ? 'translate-x-5' : 'translate-x-0'
              )} />
            </button>
          </div>

          {error && <p className="text-red-400 text-xs">{error}</p>}

          <button
            onClick={handleSave}
            disabled={loading || !stageName.trim()}
            className="btn-accent w-full py-3 text-sm disabled:opacity-50 mt-4"
          >
            {loading ? 'Kaydediliyor...' : 'Kaydet'}
          </button>
        </div>
      </BottomSheet>
    </>
  )
}
