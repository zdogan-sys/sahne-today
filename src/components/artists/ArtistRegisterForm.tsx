'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Plus, X, Search } from 'lucide-react'
import { ImageUpload } from '@/components/ui/ImageUpload'
import { SocialLinksEditor, type SocialLinksData } from '@/components/ui/SocialLinksEditor'
import { cn } from '@/lib/utils'

const GENRE_OPTIONS = ['Rock', 'Stand-Up', 'Türkü', 'Caz', 'Solist', 'Pop', 'Folk', 'Elektronik', 'R&B', 'Rap']
const INSTRUMENT_OPTIONS = ['Gitar', 'Bas', 'Davul', 'Klavye', 'Keman', 'Vokal', 'Saz', 'Flüt', 'Trompet', 'Ud']
const CITY_OPTIONS = ['İstanbul', 'Ankara', 'İzmir', 'Bursa', 'Antalya', 'Eskişehir', 'Adana', 'Kayseri']

function ProgressBar({ step }: { step: number }) {
  return (
    <div className="mb-8">
      <div className="flex items-center justify-between mb-2">
        {[1, 2, 3, 4].map((s) => (
          <div key={s} className="flex items-center gap-2">
            <div className={cn(
              'w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold border transition-colors',
              s < step ? 'bg-accent border-accent text-white' :
              s === step ? 'border-accent text-accent' :
              'border-[rgba(228,224,216,0.2)] text-text-muted'
            )}>
              {s < step ? '✓' : s}
            </div>
            {s < 4 && <div className={cn('flex-1 h-px w-12 md:w-20 transition-colors', s < step ? 'bg-accent' : 'bg-[rgba(228,224,216,0.1)]')} />}
          </div>
        ))}
      </div>
      <div className="flex justify-between text-[10px] text-text-muted">
        <span>Kimlik</span>
        <span>Deneyim</span>
        <span>Medya</span>
        <span>Önizleme</span>
      </div>
    </div>
  )
}

function ChipToggle({ options, selected, onToggle, label }: {
  options: string[]; selected: string[]; onToggle: (v: string) => void; label: string
}) {
  return (
    <div>
      <label className="label">{label}</label>
      <div className="flex flex-wrap gap-2">
        {options.map((opt) => (
          <button type="button" key={opt} onClick={() => onToggle(opt)}
            className={cn('chip border transition-colors', selected.includes(opt)
              ? 'bg-accent/10 text-accent border-accent/30'
              : 'bg-[rgba(228,224,216,0.04)] text-text-muted border-[rgba(228,224,216,0.1)]'
            )}>
            {opt}
          </button>
        ))}
      </div>
    </div>
  )
}

// Venue picker: kayıtlı mekanlardan seç + manuel giriş
function PastVenuePicker({ selected, onChange }: {
  selected: string[]
  onChange: (venues: string[]) => void
}) {
  const [query, setQuery] = useState('')
  const [suggestions, setSuggestions] = useState<{ id: string; name: string; district: string; city: string }[]>([])
  const [manualInput, setManualInput] = useState('')
  const [showDropdown, setShowDropdown] = useState(false)
  const supabase = createClient()
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  useEffect(() => {
    if (query.length < 2) { setSuggestions([]); return }
    const timeout = setTimeout(async () => {
      const { data } = await supabase
        .from('venues')
        .select('id, name, district, city')
        .ilike('name', `%${query}%`)
        .limit(6)
      setSuggestions((data as any[]) ?? [])
      setShowDropdown(true)
    }, 250)
    return () => clearTimeout(timeout)
  }, [query])

  function addVenue(name: string) {
    if (!selected.includes(name)) onChange([...selected, name])
    setQuery('')
    setSuggestions([])
    setShowDropdown(false)
  }

  function addManual() {
    const trimmed = manualInput.trim()
    if (trimmed && !selected.includes(trimmed)) onChange([...selected, trimmed])
    setManualInput('')
  }

  function remove(name: string) {
    onChange(selected.filter((v) => v !== name))
  }

  return (
    <div>
      <label className="label">Daha Önce Sahne Aldığınız Yerler</label>

      {/* Seçilenler */}
      {selected.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-2">
          {selected.map((v) => (
            <span key={v} className="flex items-center gap-1 chip bg-accent/10 text-accent border border-accent/20">
              {v}
              <button type="button" onClick={() => remove(v)} className="hover:text-white ml-0.5">
                <X size={10} />
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Kayıtlı mekan arama */}
      <div className="relative mb-2" ref={dropdownRef}>
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
          <input
            value={query}
            onChange={(e) => { setQuery(e.target.value); setShowDropdown(true) }}
            onFocus={() => query.length >= 2 && setShowDropdown(true)}
            placeholder="Kayıtlı mekanlardan ara..."
            className="input-field pl-8"
          />
        </div>
        {showDropdown && suggestions.length > 0 && (
          <div className="absolute z-10 top-full left-0 right-0 mt-1 bg-surface border border-[rgba(228,224,216,0.15)] rounded-lg overflow-hidden shadow-xl">
            {suggestions.map((v) => (
              <button
                key={v.id}
                type="button"
                onClick={() => addVenue(v.name)}
                className="w-full text-left px-3 py-2.5 hover:bg-[rgba(228,224,216,0.06)] transition-colors flex items-center justify-between"
              >
                <span className="text-text-primary text-sm">{v.name}</span>
                <span className="text-text-muted text-xs">{v.district}, {v.city}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Manuel giriş */}
      <div className="flex gap-2">
        <input
          value={manualInput}
          onChange={(e) => setManualInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addManual())}
          placeholder="Listede yoksa manuel yaz (Enter)"
          className="input-field flex-1"
        />
        <button
          type="button"
          onClick={addManual}
          disabled={!manualInput.trim()}
          className="btn-outline px-3 disabled:opacity-40"
        >
          <Plus size={16} />
        </button>
      </div>
    </div>
  )
}

export function ArtistRegisterForm() {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Step 1
  const [stageName, setStageName] = useState('')
  const [genres, setGenres] = useState<string[]>([])
  const [instruments, setInstruments] = useState<string[]>([])
  const [city, setCity] = useState('')

  // Step 2
  const [bio, setBio] = useState('')
  const [pastVenues, setPastVenues] = useState<string[]>([])
  const [technicalRider, setTechnicalRider] = useState('')

  // Step 3
  const [videoUrls, setVideoUrls] = useState<string[]>([''])
  const [avatarUrl, setAvatarUrl] = useState('')
  const [socialLinks, setSocialLinks] = useState<SocialLinksData>({})

  function toggleItem(arr: string[], setArr: (v: string[]) => void, item: string) {
    setArr(arr.includes(item) ? arr.filter((x) => x !== item) : [...arr, item])
  }

  async function handleSubmit() {
    setLoading(true)
    setError('')
    const supabase = createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/auth'); return }

    const validVideos = videoUrls.filter((u) => u.trim())

    const { data: artistData, error: err } = await supabase.from('artists').insert({
      profile_id: user.id,
      stage_name: stageName,
      genres,
      instruments,
      city: city || null,
      bio: bio || null,
      video_urls: validVideos,
      technical_rider: technicalRider || null,
      past_venues: pastVenues,
      social_links: socialLinks,
    } as any).select().single()
    const artist = artistData as { id: string } | null

    if (err || !artist) {
      setError('Profil oluşturulamadı.')
      setLoading(false)
      return
    }

    if (avatarUrl) {
      await supabase.from('profiles').update({ avatar_url: avatarUrl } as any).eq('id', user.id)
    }

    await supabase.from('profiles').update({ role: 'artist' } as any).eq('id', user.id)
    router.push(`/artists/${artist.id}`)
  }

  return (
    <div>
      <ProgressBar step={step} />

      {step === 1 && (
        <div className="card p-6 space-y-5">
          <h2 className="font-semibold text-text-primary">Sahne Kimliğin</h2>
          <div>
            <label className="label">Sahne Adı *</label>
            <input value={stageName} onChange={(e) => setStageName(e.target.value)} placeholder="Murat Boz" className="input-field" />
          </div>
          <ChipToggle options={GENRE_OPTIONS} selected={genres} onToggle={(v) => toggleItem(genres, setGenres, v)} label="Müzik Türleri *" />
          <ChipToggle options={INSTRUMENT_OPTIONS} selected={instruments} onToggle={(v) => toggleItem(instruments, setInstruments, v)} label="Enstrümanlar" />
          <div>
            <label className="label">Şehir</label>
            <select value={city} onChange={(e) => setCity(e.target.value)} className="input-field">
              <option value="">Seçin</option>
              {CITY_OPTIONS.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <button onClick={() => { if (stageName && genres.length) setStep(2) }}
            disabled={!stageName || !genres.length}
            className="btn-accent w-full py-3 disabled:opacity-40">
            Devam Et →
          </button>
        </div>
      )}

      {step === 2 && (
        <div className="card p-6 space-y-5">
          <h2 className="font-semibold text-text-primary">Deneyim & Rider</h2>
          <div>
            <label className="label">Biyografi</label>
            <textarea value={bio} onChange={(e) => setBio(e.target.value)} rows={4} placeholder="Kendinizi anlatan kısa bir metin..." className="input-field resize-none" />
          </div>
          <PastVenuePicker selected={pastVenues} onChange={setPastVenues} />
          <div>
            <label className="label">Teknik Rider</label>
            <textarea value={technicalRider} onChange={(e) => setTechnicalRider(e.target.value)} rows={3} placeholder="Ses ekipmanı, sahne düzeni, özel istekler..." className="input-field resize-none" />
          </div>
          <div className="flex gap-3">
            <button onClick={() => setStep(1)} className="btn-outline flex-1 py-3">← Geri</button>
            <button onClick={() => setStep(3)} className="btn-accent flex-1 py-3">Devam Et →</button>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="card p-6 space-y-5">
          <h2 className="font-semibold text-text-primary">Medya</h2>
          <div>
            <label className="label">Video Linkleri <span className="text-text-muted normal-case">(YouTube / Vimeo)</span></label>
            <div className="space-y-2">
              {videoUrls.map((url, idx) => (
                <div key={idx} className="flex gap-2">
                  <input
                    value={url}
                    onChange={(e) => setVideoUrls(videoUrls.map((u, i) => i === idx ? e.target.value : u))}
                    placeholder="https://youtube.com/watch?v=..."
                    className="input-field flex-1"
                  />
                  {videoUrls.length > 1 && (
                    <button type="button" onClick={() => setVideoUrls(videoUrls.filter((_, i) => i !== idx))} className="text-text-muted hover:text-red-400 px-2">
                      <X size={16} />
                    </button>
                  )}
                </div>
              ))}
              <button type="button" onClick={() => setVideoUrls([...videoUrls, ''])} className="flex items-center gap-1 text-accent text-sm hover:text-accent/80">
                <Plus size={14} />
                Video Ekle
              </button>
            </div>
          </div>
          <ImageUpload
            value={avatarUrl}
            onChange={setAvatarUrl}
            bucket="avatars"
            label="Profil Fotoğrafı"
          />
          <SocialLinksEditor value={socialLinks} onChange={setSocialLinks} />
          <div className="flex gap-3">
            <button onClick={() => setStep(2)} className="btn-outline flex-1 py-3">← Geri</button>
            <button onClick={() => setStep(4)} className="btn-accent flex-1 py-3">Önizleme →</button>
          </div>
        </div>
      )}

      {step === 4 && (
        <div className="space-y-4">
          <div className="card p-6">
            <h2 className="font-semibold text-text-primary mb-4">Profil Önizlemesi</h2>
            <div className="space-y-3 text-sm">
              <div className="flex gap-2"><span className="text-text-muted w-28">Sahne Adı:</span><span className="text-text-primary font-medium">{stageName}</span></div>
              <div className="flex gap-2"><span className="text-text-muted w-28">Şehir:</span><span className="text-text-primary">{city || '—'}</span></div>
              <div className="flex gap-2"><span className="text-text-muted w-28">Türler:</span><span className="text-text-primary">{genres.join(', ')}</span></div>
              {instruments.length > 0 && <div className="flex gap-2"><span className="text-text-muted w-28">Enstrümanlar:</span><span className="text-text-primary">{instruments.join(', ')}</span></div>}
              {pastVenues.length > 0 && <div className="flex gap-2"><span className="text-text-muted w-28">Geçmiş Mekanlar:</span><span className="text-text-primary">{pastVenues.join(', ')}</span></div>}
              <div className="flex gap-2"><span className="text-text-muted w-28">Video Sayısı:</span><span className="text-text-primary">{videoUrls.filter((u) => u.trim()).length}</span></div>
            </div>
          </div>
          {error && <p className="text-red-400 text-sm text-center">{error}</p>}
          <div className="flex gap-3">
            <button onClick={() => setStep(3)} className="btn-outline flex-1 py-3">← Geri</button>
            <button onClick={handleSubmit} disabled={loading} className="btn-accent flex-1 py-3 disabled:opacity-50">
              {loading ? 'Oluşturuluyor...' : 'Profili Yayınla'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
