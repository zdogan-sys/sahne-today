'use client'

import { useState, useRef } from 'react'
import Image from 'next/image'
import { useLocale } from 'next-intl'
import { Edit2, Camera, X, Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { BottomSheet } from '@/components/ui/BottomSheet'
import { TabbedGenreSelector } from '@/components/ui/TabbedGenreSelector'
import { translateVenueType } from '@/lib/utils'
import { CITY_OPTIONS, DISTRICTS_BY_CITY, VENUE_TYPES } from '@/lib/constants'
import { cn } from '@/lib/utils'
import { LocationPicker } from '@/components/ui/LocationPicker'

const EQUIPMENT_OPTIONS_TR = ['Ses Sistemi', 'Mikrofon', 'Klavye', 'Davul Kiti', 'Işık', 'Projeksiyon', 'Sahne']
const EQUIPMENT_OPTIONS_EN = ['Sound System', 'Microphone', 'Keyboard', 'Drum Kit', 'Lighting', 'Projector', 'Stage']

interface Props {
  venueId: string
  initialData: {
    name: string
    city: string
    district: string
    address: string
    phone: string | null
    email: string | null
    venue_type: string
  venue_types?: string[]
    capacity_seated: number | null
    capacity_standing: number | null
    stage_area_m2: number | null
    equipment: string[]
    genres: string[]
    description: string | null
    photo_url: string | null
    logo_url: string | null
    is_hidden?: boolean
    price_per_hour?: number | null
    latitude?: number | null
    longitude?: number | null
  }
}

function ImageUploadField({
  label,
  url,
  onUrl,
  aspect = 'cover',
}: {
  label: string
  url: string | null
  onUrl: (v: string | null) => void
  aspect?: 'cover' | 'logo'
}) {
  const isEn = useLocale() === 'en'
  const [uploading, setUploading] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const supabase = createClient()

  async function handleFile(file: File) {
    if (!file.type.startsWith('image/')) return
    setUploading(true)
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
    if (res.ok && json.url) onUrl(json.url)
    setUploading(false)
  }

  const isCover = aspect === 'cover'

  return (
    <div>
      <label className="label">{label}</label>
      <div className={`relative overflow-hidden rounded-xl border border-[rgba(228,224,216,0.1)] bg-[rgba(228,224,216,0.04)] flex items-center justify-center ${isCover ? 'h-28' : 'h-20 w-20'}`}>
        {url ? (
          <>
            <Image src={url} alt={label} fill className="object-cover" sizes={isCover ? '600px' : '80px'} />
            <div className="absolute inset-0 bg-black/40 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
              <button
                type="button"
                onClick={() => inputRef.current?.click()}
                className="w-8 h-8 rounded-lg bg-white/20 hover:bg-white/30 flex items-center justify-center transition-colors"
              >
                <Camera size={14} className="text-white" />
              </button>
              <button
                type="button"
                onClick={() => onUrl(null)}
                className="w-8 h-8 rounded-lg bg-red-500/70 hover:bg-red-500/90 flex items-center justify-center transition-colors"
              >
                <X size={14} className="text-white" />
              </button>
            </div>
          </>
        ) : (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
            className="flex flex-col items-center gap-1 text-text-muted hover:text-text-primary transition-colors"
          >
            {uploading
              ? <Loader2 size={18} className="animate-spin" />
              : <Camera size={18} />
            }
            {!uploading && <span className="text-xs">{isCover ? (isEn ? 'Add Photo' : 'Fotoğraf Ekle') : (isEn ? 'Add Logo' : 'Logo Ekle')}</span>}
          </button>
        )}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f) }}
      />
    </div>
  )
}

export function VenueProfileEditor({ venueId, initialData }: Props) {
  const isEn = useLocale() === 'en'
  const EQUIPMENT_OPTIONS = isEn ? EQUIPMENT_OPTIONS_EN : EQUIPMENT_OPTIONS_TR
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const [name, setName] = useState(initialData.name)
  const [city, setCity] = useState(initialData.city)
  const [district, setDistrict] = useState(initialData.district)
  const [address, setAddress] = useState(initialData.address)
  const [phone, setPhone] = useState(initialData.phone || '')
  const [email, setEmail] = useState(initialData.email || '')
  const [venueType, setVenueType] = useState(initialData.venue_type)
  const [venueTypes, setVenueTypes] = useState<string[]>(
    initialData.venue_types?.length ? initialData.venue_types : [initialData.venue_type]
  )
  const [capacitySeated, setCapacitySeated] = useState(initialData.capacity_seated?.toString() || '')
  const [capacityStanding, setCapacityStanding] = useState(initialData.capacity_standing?.toString() || '')
  const [stageArea, setStageArea] = useState(initialData.stage_area_m2?.toString() || '')
  const [equipment, setEquipment] = useState<string[]>(initialData.equipment || [])
  const [genres, setGenres] = useState<string[]>(initialData.genres || [])
  const [description, setDescription] = useState(initialData.description || '')
  const [photoUrl, setPhotoUrl] = useState<string | null>(initialData.photo_url)
  const [logoUrl, setLogoUrl] = useState<string | null>(initialData.logo_url)
  const [isHidden, setIsHidden] = useState(initialData.is_hidden ?? false)
  const [pricePerHour, setPricePerHour] = useState(initialData.price_per_hour?.toString() || '')
  const [latitude, setLatitude] = useState<number | null>(initialData.latitude ?? null)
  const [longitude, setLongitude] = useState<number | null>(initialData.longitude ?? null)
  const isStudio = venueTypes.some(t => ['studio', 'dance_studio', 'music_school'].includes(t))

  async function handleSave() {
    if (!name.trim() || !city || venueTypes.length === 0) {
      setError(isEn ? 'Please fill in the required fields.' : 'Lütfen zorunlu alanları doldurun.')
      return
    }

    setLoading(true)
    setError('')

    const supabase = createClient()
    const { error: err } = await supabase
      .from('venues')
      .update({
        name: name.trim(),
        city,
        district,
        address,
        phone: phone || null,
        email: email || null,
        venue_type: venueTypes[0] ?? venueType,
        venue_types: venueTypes,
        capacity_seated: capacitySeated ? parseInt(capacitySeated) : null,
        capacity_standing: capacityStanding ? parseInt(capacityStanding) : null,
        stage_area_m2: stageArea ? parseInt(stageArea) : null,
        equipment,
        genres,
        description: description || null,
        photo_url: photoUrl,
        logo_url: logoUrl,
        is_hidden: isHidden,
        price_per_hour: pricePerHour ? parseFloat(pricePerHour) : null,
        latitude,
        longitude,
      } as any)
      .eq('id', venueId)

    if (err) {
      setError((isEn ? 'An error occurred: ' : 'Bir hata oluştu: ') + err.message)
      setLoading(false)
    } else {
      window.location.reload()
    }
  }

  function toggleEquipment(v: string) {
    setEquipment(equipment.includes(v) ? equipment.filter(x => x !== v) : [...equipment, v])
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="pointer-events-auto flex items-center gap-1.5 text-xs text-black bg-white hover:bg-gray-200 px-3 py-1.5 rounded-full transition-colors absolute top-4 right-4 z-30 font-medium"
      >
        <Edit2 size={12} />
        {isEn ? 'Edit Profile' : 'Profili Düzenle'}
      </button>

      <BottomSheet open={open} onClose={() => setOpen(false)} title={isEn ? 'Edit Venue Profile' : 'Mekan Profilini Düzenle'}>
        <div className="space-y-4">

          {/* Images */}
          <div className="flex gap-3 items-end">
            <ImageUploadField label="Logo" url={logoUrl} onUrl={setLogoUrl} aspect="logo" />
            <div className="flex-1">
              <ImageUploadField label={isEn ? 'Cover Photo' : 'Kapak Fotoğrafı'} url={photoUrl} onUrl={setPhotoUrl} aspect="cover" />
            </div>
          </div>

          <div>
            <label className="label">{isEn ? 'Venue Name *' : 'Mekan Adı *'}</label>
            <input value={name} onChange={(e) => setName(e.target.value)} className="input-field text-sm" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">{isEn ? 'City *' : 'Şehir *'}</label>
              <select value={city} onChange={(e) => setCity(e.target.value)} className="input-field text-sm">
                <option value="">{isEn ? 'Select City' : 'Şehir Seçin'}</option>
                {CITY_OPTIONS.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">{isEn ? 'District *' : 'Bölge *'}</label>
              {city && DISTRICTS_BY_CITY[city] ? (
                <select value={district} onChange={(e) => setDistrict(e.target.value)} className="input-field text-sm">
                  <option value="">{isEn ? 'Select' : 'Seçin'}</option>
                  {DISTRICTS_BY_CITY[city].map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              ) : (
                <input value={district} onChange={(e) => setDistrict(e.target.value)} className="input-field text-sm" />
              )}
            </div>
          </div>

          <div>
            <label className="label">{isEn ? 'Address *' : 'Adres *'}</label>
            <input value={address} onChange={(e) => setAddress(e.target.value)} className="input-field text-sm" />
          </div>

          <LocationPicker
            lat={latitude}
            lng={longitude}
            address={[address, district, city].filter(Boolean).join(', ')}
            onChange={(la, ln) => { setLatitude(la); setLongitude(ln) }}
          />

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">{isEn ? 'Phone' : 'Telefon'}</label>
              <input value={phone} onChange={(e) => setPhone(e.target.value)} className="input-field text-sm" />
            </div>
            <div>
              <label className="label">{isEn ? 'Email' : 'E-posta'}</label>
              <input value={email} onChange={(e) => setEmail(e.target.value)} className="input-field text-sm" />
            </div>
          </div>

          <div>
            <label className="label">{isEn ? 'Venue Type * (multiple allowed)' : 'Mekan Türü * (birden fazla seçilebilir)'}</label>
            <div className="flex flex-wrap gap-1.5 mt-1">
              {VENUE_TYPES.map(({ key, tr, en }) => (
                <button key={key} type="button"
                  onClick={() => setVenueTypes(p => p.includes(key) ? p.filter(x => x !== key) : [...p, key])}
                  className={cn('chip border transition-colors text-xs', venueTypes.includes(key)
                    ? 'bg-accent/10 text-accent border-accent/30'
                    : 'bg-[rgba(228,224,216,0.04)] text-text-muted border-[rgba(228,224,216,0.1)] hover:text-text-primary'
                  )}>
                  {isEn ? en : tr}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="label text-[10px]">{isEn ? 'Seated' : 'Oturma'}</label>
              <input value={capacitySeated} onChange={(e) => setCapacitySeated(e.target.value)} type="number" className="input-field text-sm px-2" />
            </div>
            <div>
              <label className="label text-[10px]">{isEn ? 'Standing' : 'Ayakta'}</label>
              <input value={capacityStanding} onChange={(e) => setCapacityStanding(e.target.value)} type="number" className="input-field text-sm px-2" />
            </div>
            <div>
              <label className="label text-[10px]">{isEn ? 'Stage (m²)' : 'Sahne (m²)'}</label>
              <input value={stageArea} onChange={(e) => setStageArea(e.target.value)} type="number" className="input-field text-sm px-2" />
            </div>
          </div>

          {isStudio && (
            <div>
              <label className="label">{isEn ? 'Price per Hour (₺)' : 'Saatlik Ücret (₺)'}</label>
              <input
                value={pricePerHour}
                onChange={(e) => setPricePerHour(e.target.value)}
                type="number"
                min="0"
                placeholder="500"
                className="input-field text-sm"
              />
            </div>
          )}

          <div>
            <label className="label">{isEn ? 'Available Equipment' : 'Mevcut Ekipman'}</label>
            <div className="flex flex-wrap gap-1.5">
              {EQUIPMENT_OPTIONS.map((eq) => (
                <button
                  key={eq}
                  type="button"
                  onClick={() => toggleEquipment(eq)}
                  className={cn('chip border transition-colors', equipment.includes(eq)
                    ? 'bg-accent/10 text-accent border-accent/30'
                    : 'bg-[rgba(228,224,216,0.04)] text-text-muted border-[rgba(228,224,216,0.1)] hover:text-text-primary'
                  )}
                >
                  {eq}
                </button>
              ))}
            </div>
          </div>

          <TabbedGenreSelector
            label={isEn ? 'Primary Genres' : 'Ağırlıklı Türler'}
            selected={genres}
            onToggle={(g) => setGenres(genres.includes(g) ? genres.filter((x) => x !== g) : [...genres, g])}
          />

          <div>
            <label className="label">{isEn ? 'Description' : 'Açıklama'}</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="input-field text-sm resize-none"
            />
          </div>

          <div className="flex items-center justify-between py-2 border-t border-[rgba(228,224,216,0.1)]">
            <div>
              <p className="text-sm text-text-primary">{isEn ? 'Hide Profile' : 'Profili Gizle'}</p>
              <p className="text-xs text-text-muted">{isEn ? 'Will not appear in the venue list' : 'Mekan listesinde görünmez'}</p>
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
            disabled={loading || !name.trim() || !city || venueTypes.length === 0}
            className="btn-accent w-full py-3 text-sm disabled:opacity-50 mt-4"
          >
            {loading ? (isEn ? 'Saving...' : 'Kaydediliyor...') : (isEn ? 'Save Changes' : 'Değişiklikleri Kaydet')}
          </button>

        </div>
      </BottomSheet>
    </>
  )
}
