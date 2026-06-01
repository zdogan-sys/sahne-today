'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useLocale } from 'next-intl'
import { createClient } from '@/lib/supabase/client'
import { ImageUpload } from '@/components/ui/ImageUpload'
import { SocialLinksEditor, type SocialLinksData } from '@/components/ui/SocialLinksEditor'
import { TabbedGenreSelector } from '@/components/ui/TabbedGenreSelector'
import { cn } from '@/lib/utils'
import { CITY_OPTIONS, DISTRICTS_BY_CITY } from '@/lib/constants'

const EQUIPMENT_OPTIONS_TR = ['Ses Sistemi', 'Mikrofon', 'Klavye', 'Davul Kiti', 'Işık', 'Projeksiyon', 'Sahne']
const EQUIPMENT_OPTIONS_EN = ['Sound System', 'Microphone', 'Keyboard', 'Drum Kit', 'Lighting', 'Projector', 'Stage']

const VENUE_TYPES: { key: VenueType; tr: string; en: string }[] = [
  { key: 'pub', tr: 'Pub', en: 'Pub' },
  { key: 'turku_bar', tr: 'Türkü Bar', en: 'Turkish Folk Bar' },
  { key: 'live_music', tr: 'Canlı Müzik', en: 'Live Music Venue' },
  { key: 'bookstore', tr: 'Kitabevi', en: 'Bookstore' },
  { key: 'theater', tr: 'Tiyatro', en: 'Theater' },
  { key: 'cafe', tr: 'Kafe', en: 'Cafe' },
  { key: 'studio', tr: 'Prova / Kayıt Stüdyosu', en: 'Rehearsal / Recording Studio' },
  { key: 'dance_studio', tr: 'Dans Stüdyosu', en: 'Dance Studio' },
  { key: 'other', tr: 'Diğer', en: 'Other' },
]

type VenueType = 'pub' | 'turku_bar' | 'live_music' | 'bookstore' | 'theater' | 'cafe' | 'studio' | 'dance_studio' | 'other'

const STUDIO_TYPES: VenueType[] = ['studio', 'dance_studio']

function venueTypeLabel(key: VenueType | '', isEn: boolean): string {
  const found = VENUE_TYPES.find((v) => v.key === key)
  if (!found) return ''
  return isEn ? found.en : found.tr
}

function ProgressBar({ step }: { step: number }) {
  const isEn = useLocale() === 'en'
  return (
    <div className="mb-8">
      <div className="flex items-center justify-between mb-2">
        {[1, 2, 3].map((s) => (
          <div key={s} className="flex items-center gap-2">
            <div className={cn(
              'w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold border transition-colors',
              s < step ? 'bg-accent border-accent text-white' :
              s === step ? 'border-accent text-accent' :
              'border-[rgba(228,224,216,0.2)] text-text-muted'
            )}>
              {s < step ? '✓' : s}
            </div>
            {s < 3 && (
              <div className={cn('flex-1 h-px w-24 md:w-48 transition-colors', s < step ? 'bg-accent' : 'bg-[rgba(228,224,216,0.1)]')} />
            )}
          </div>
        ))}
      </div>
      <div className="flex justify-between text-xs text-text-muted">
        <span>{isEn ? 'Basic Info' : 'Temel Bilgiler'}</span>
        <span>{isEn ? 'Stage & Capacity' : 'Sahne & Kapasite'}</span>
        <span>{isEn ? 'Preview' : 'Önizleme'}</span>
      </div>
    </div>
  )
}

function ChipSelector({ options, selected, onToggle, label }: {
  options: string[]; selected: string[]; onToggle: (v: string) => void; label: string
}) {
  return (
    <div>
      <label className="label">{label}</label>
      <div className="flex flex-wrap gap-2">
        {options.map((opt) => (
          <button
            key={opt}
            type="button"
            onClick={() => onToggle(opt)}
            className={cn('chip border transition-colors', selected.includes(opt)
              ? 'bg-accent/10 text-accent border-accent/30'
              : 'bg-[rgba(228,224,216,0.04)] text-text-muted border-[rgba(228,224,216,0.1)] hover:text-text-primary'
            )}
          >
            {opt}
          </button>
        ))}
      </div>
    </div>
  )
}

export function VenueRegisterForm() {
  const router = useRouter()
  const isEn = useLocale() === 'en'
  const EQUIPMENT_OPTIONS = isEn ? EQUIPMENT_OPTIONS_EN : EQUIPMENT_OPTIONS_TR
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const [name, setName] = useState('')
  const [city, setCity] = useState('')
  const [district, setDistrict] = useState('')
  const [address, setAddress] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [venueType, setVenueType] = useState<VenueType | ''>('')

  const [capacitySeated, setCapacitySeated] = useState('')
  const [capacityStanding, setCapacityStanding] = useState('')
  const [stageArea, setStageArea] = useState('')
  const [equipment, setEquipment] = useState<string[]>([])
  const [genres, setGenres] = useState<string[]>([])
  const [description, setDescription] = useState('')
  const [photoUrl, setPhotoUrl] = useState('')
  const [socialLinks, setSocialLinks] = useState<SocialLinksData>({})
  const [pricePerHour, setPricePerHour] = useState('')

  async function handleSubmit() {
    setLoading(true)
    setError('')
    const supabase = createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/auth'); return }

    const { data: venueData, error: venueErr } = await supabase
      .from('venues')
      .insert({
        owner_id: user.id,
        name, city, district, address,
        phone: phone || null,
        email: email || null,
        venue_type: venueType as VenueType,
        description: description || null,
        photo_url: photoUrl || null,
        capacity_seated: capacitySeated ? parseInt(capacitySeated) : null,
        capacity_standing: capacityStanding ? parseInt(capacityStanding) : null,
        stage_area_m2: stageArea ? parseInt(stageArea) : null,
        equipment,
        genres,
        social_links: socialLinks,
        price_per_hour: pricePerHour ? parseFloat(pricePerHour) : null,
      } as any)
      .select()
      .single()

    if (venueErr || !venueData) {
      setError(isEn ? 'Could not save venue.' : 'Mekan kaydedilemedi.')
      setLoading(false)
      return
    }

    const { data: artistProfile } = await supabase
      .from('artists')
      .select('id')
      .eq('profile_id', user.id)
      .maybeSingle()

    if (!artistProfile) {
      await supabase.from('profiles').update({ role: 'venue' } as any).eq('id', user.id)
    }

    window.location.href = '/dashboard'
  }

  return (
    <div>
      <ProgressBar step={step} />

      {step === 1 && (
        <div className="card p-6 space-y-4">
          <h2 className="font-semibold text-text-primary">{isEn ? 'Basic Info' : 'Temel Bilgiler'}</h2>
          <div>
            <label className="label">{isEn ? 'Venue Name *' : 'Mekan Adı *'}</label>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="The Backstage" className="input-field" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">{isEn ? 'City *' : 'Şehir *'}</label>
              <select value={city} onChange={(e) => setCity(e.target.value)} className="input-field">
                <option value="">{isEn ? 'Select' : 'Seçin'}</option>
                {CITY_OPTIONS.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="label">{isEn ? 'District *' : 'Bölge *'}</label>
              {city && DISTRICTS_BY_CITY[city] ? (
                <select value={district} onChange={(e) => setDistrict(e.target.value)} className="input-field">
                  <option value="">{isEn ? 'Select' : 'Seçin'}</option>
                  {DISTRICTS_BY_CITY[city].map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              ) : (
                <input value={district} onChange={(e) => setDistrict(e.target.value)} placeholder={isEn ? 'District' : 'Bölge'} className="input-field" />
              )}
            </div>
          </div>
          <div>
            <label className="label">{isEn ? 'Address *' : 'Adres *'}</label>
            <input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Moda Cad. No:12" className="input-field" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">{isEn ? 'Phone' : 'Telefon'}</label>
              <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+90 212 000 00 00" className="input-field" />
            </div>
            <div>
              <label className="label">{isEn ? 'Email' : 'E-posta'}</label>
              <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" placeholder="info@venue.com" className="input-field" />
            </div>
          </div>
          <div>
            <label className="label">{isEn ? 'Venue Type *' : 'Mekan Türü *'}</label>
            <div className="flex flex-wrap gap-2 mt-1">
              {VENUE_TYPES.map(({ key, tr, en }) => (
                <button key={key} type="button" onClick={() => setVenueType(key)}
                  className={cn('chip border transition-colors', venueType === key
                    ? 'bg-accent/10 text-accent border-accent/30'
                    : 'bg-[rgba(228,224,216,0.04)] text-text-muted border-[rgba(228,224,216,0.1)]'
                  )}>
                  {isEn ? en : tr}
                </button>
              ))}
            </div>
          </div>
          <button onClick={() => { if (name && city && district && address && venueType) setStep(2) }}
            disabled={!name || !city || !district || !address || !venueType}
            className="btn-accent w-full py-3 disabled:opacity-40">
            {isEn ? 'Continue →' : 'Devam Et →'}
          </button>
        </div>
      )}

      {step === 2 && (
        <div className="card p-6 space-y-5">
          <h2 className="font-semibold text-text-primary">{isEn ? 'Stage & Capacity' : 'Sahne & Kapasite'}</h2>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="label">{isEn ? 'Seated Capacity' : 'Oturma Kapasitesi'}</label>
              <input value={capacitySeated} onChange={(e) => setCapacitySeated(e.target.value)} type="number" placeholder="80" className="input-field" />
            </div>
            <div>
              <label className="label">{isEn ? 'Standing Capacity' : 'Ayakta Kapasite'}</label>
              <input value={capacityStanding} onChange={(e) => setCapacityStanding(e.target.value)} type="number" placeholder="150" className="input-field" />
            </div>
            <div>
              <label className="label">{isEn ? 'Stage Area (m²)' : 'Sahne Alanı (m²)'}</label>
              <input value={stageArea} onChange={(e) => setStageArea(e.target.value)} type="number" placeholder="20" className="input-field" />
            </div>
          </div>
          <ChipSelector options={EQUIPMENT_OPTIONS} selected={equipment}
            onToggle={(v) => setEquipment((p) => p.includes(v) ? p.filter((x) => x !== v) : [...p, v])}
            label={isEn ? 'Available Equipment' : 'Mevcut Ekipman'} />
          <TabbedGenreSelector selected={genres}
            onToggle={(v) => setGenres((p) => p.includes(v) ? p.filter((x) => x !== v) : [...p, v])}
            label={isEn ? 'Primary Genres' : 'Ağırlıklı Türler'} />
          <div>
            <label className="label">{isEn ? 'Description' : 'Açıklama'}</label>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3}
              placeholder={isEn ? 'A short text about your venue...' : 'Mekanınızı anlatan kısa bir metin...'} className="input-field resize-none" />
          </div>
          {STUDIO_TYPES.includes(venueType as VenueType) && (
            <div>
              <label className="label">{isEn ? 'Price per Hour (₺)' : 'Saatlik Ücret (₺)'}</label>
              <input
                type="number"
                value={pricePerHour}
                onChange={(e) => setPricePerHour(e.target.value)}
                placeholder="500"
                min="0"
                className="input-field"
              />
              <p className="text-text-muted text-xs mt-1">
                {isEn ? 'Hourly rental rate for studio reservations.' : 'Stüdyo rezervasyonlarında uygulanacak saat başı ücret.'}
              </p>
            </div>
          )}
          <ImageUpload value={photoUrl} onChange={setPhotoUrl} bucket="venues" label={isEn ? 'Venue Photo' : 'Mekan Fotoğrafı'} />
          <SocialLinksEditor value={socialLinks} onChange={setSocialLinks} />
          <div className="flex gap-3">
            <button onClick={() => setStep(1)} className="btn-outline flex-1 py-3">{isEn ? '← Back' : '← Geri'}</button>
            <button onClick={() => setStep(3)} className="btn-accent flex-1 py-3">{isEn ? 'Preview →' : 'Önizleme →'}</button>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="space-y-4">
          <div className="card p-6">
            <h2 className="font-semibold text-text-primary mb-4">{isEn ? 'Preview' : 'Önizleme'}</h2>
            <div className="space-y-3 text-sm">
              <div className="flex gap-2"><span className="text-text-muted w-28">{isEn ? 'Venue:' : 'Mekan:'}</span><span className="text-text-primary font-medium">{name}</span></div>
              <div className="flex gap-2"><span className="text-text-muted w-28">{isEn ? 'Location:' : 'Konum:'}</span><span className="text-text-primary">{district}, {city}</span></div>
              <div className="flex gap-2"><span className="text-text-muted w-28">{isEn ? 'Type:' : 'Tür:'}</span><span className="text-text-primary">{venueTypeLabel(venueType, isEn)}</span></div>
              {genres.length > 0 && <div className="flex gap-2"><span className="text-text-muted w-28">{isEn ? 'Genres:' : 'Türler:'}</span><span className="text-text-primary">{genres.join(', ')}</span></div>}
            </div>
          </div>
          {error && <p className="text-red-400 text-sm text-center">{error}</p>}
          <div className="flex gap-3">
            <button onClick={() => setStep(2)} className="btn-outline flex-1 py-3">{isEn ? '← Back' : '← Geri'}</button>
            <button onClick={handleSubmit} disabled={loading} className="btn-accent flex-1 py-3 disabled:opacity-50">
              {loading ? (isEn ? 'Saving...' : 'Kaydediliyor...') : (isEn ? 'Publish' : 'Yayınla')}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
