'use client'

import { useState, useRef } from 'react'
import Image from 'next/image'
import { Edit2, Camera, X, Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { BottomSheet } from '@/components/ui/BottomSheet'
import { TabbedGenreSelector } from '@/components/ui/TabbedGenreSelector'
import { VENUE_TYPE_LABELS } from '@/lib/utils'
import { CITY_OPTIONS } from '@/lib/constants'
import { cn } from '@/lib/utils'

const EQUIPMENT_OPTIONS = ['Ses Sistemi', 'Mikrofon', 'Klavye', 'Davul Kiti', 'Işık', 'Projeksiyon', 'Sahne']

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
    capacity_seated: number | null
    capacity_standing: number | null
    stage_area_m2: number | null
    equipment: string[]
    genres: string[]
    description: string | null
    photo_url: string | null
    logo_url: string | null
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
            {!uploading && <span className="text-xs">{isCover ? 'Fotoğraf Ekle' : 'Logo Ekle'}</span>}
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
  const [capacitySeated, setCapacitySeated] = useState(initialData.capacity_seated?.toString() || '')
  const [capacityStanding, setCapacityStanding] = useState(initialData.capacity_standing?.toString() || '')
  const [stageArea, setStageArea] = useState(initialData.stage_area_m2?.toString() || '')
  const [equipment, setEquipment] = useState<string[]>(initialData.equipment || [])
  const [genres, setGenres] = useState<string[]>(initialData.genres || [])
  const [description, setDescription] = useState(initialData.description || '')
  const [photoUrl, setPhotoUrl] = useState<string | null>(initialData.photo_url)
  const [logoUrl, setLogoUrl] = useState<string | null>(initialData.logo_url)

  async function handleSave() {
    if (!name.trim() || !city || !district || !address || !venueType) {
      setError('Lütfen zorunlu alanları doldurun.')
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
        venue_type: venueType,
        capacity_seated: capacitySeated ? parseInt(capacitySeated) : null,
        capacity_standing: capacityStanding ? parseInt(capacityStanding) : null,
        stage_area_m2: stageArea ? parseInt(stageArea) : null,
        equipment,
        genres,
        description: description || null,
        photo_url: photoUrl,
        logo_url: logoUrl,
      } as any)
      .eq('id', venueId)

    if (err) {
      setError('Bir hata oluştu: ' + err.message)
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
        Profili Düzenle
      </button>

      <BottomSheet open={open} onClose={() => setOpen(false)} title="Mekan Profilini Düzenle">
        <div className="space-y-4">

          {/* Images */}
          <div className="flex gap-3 items-end">
            <ImageUploadField label="Logo" url={logoUrl} onUrl={setLogoUrl} aspect="logo" />
            <div className="flex-1">
              <ImageUploadField label="Kapak Fotoğrafı" url={photoUrl} onUrl={setPhotoUrl} aspect="cover" />
            </div>
          </div>

          <div>
            <label className="label">Mekan Adı *</label>
            <input value={name} onChange={(e) => setName(e.target.value)} className="input-field text-sm" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Şehir *</label>
              <select value={city} onChange={(e) => setCity(e.target.value)} className="input-field text-sm">
                <option value="">Şehir Seçin</option>
                {CITY_OPTIONS.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">İlçe *</label>
              <input value={district} onChange={(e) => setDistrict(e.target.value)} className="input-field text-sm" />
            </div>
          </div>

          <div>
            <label className="label">Adres *</label>
            <input value={address} onChange={(e) => setAddress(e.target.value)} className="input-field text-sm" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Telefon</label>
              <input value={phone} onChange={(e) => setPhone(e.target.value)} className="input-field text-sm" />
            </div>
            <div>
              <label className="label">E-posta</label>
              <input value={email} onChange={(e) => setEmail(e.target.value)} className="input-field text-sm" />
            </div>
          </div>

          <div>
            <label className="label">Mekan Türü *</label>
            <select value={venueType} onChange={(e) => setVenueType(e.target.value)} className="input-field text-sm">
              {Object.entries(VENUE_TYPE_LABELS).map(([key, label]) => (
                <option key={key} value={key}>{label}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="label text-[10px]">Oturma</label>
              <input value={capacitySeated} onChange={(e) => setCapacitySeated(e.target.value)} type="number" className="input-field text-sm px-2" />
            </div>
            <div>
              <label className="label text-[10px]">Ayakta</label>
              <input value={capacityStanding} onChange={(e) => setCapacityStanding(e.target.value)} type="number" className="input-field text-sm px-2" />
            </div>
            <div>
              <label className="label text-[10px]">Sahne (m²)</label>
              <input value={stageArea} onChange={(e) => setStageArea(e.target.value)} type="number" className="input-field text-sm px-2" />
            </div>
          </div>

          <div>
            <label className="label">Mevcut Ekipman</label>
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
            label="Ağırlıklı Türler"
            selected={genres}
            onToggle={(g) => setGenres(genres.includes(g) ? genres.filter((x) => x !== g) : [...genres, g])}
          />

          <div>
            <label className="label">Açıklama</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="input-field text-sm resize-none"
            />
          </div>

          {error && <p className="text-red-400 text-xs">{error}</p>}

          <button
            onClick={handleSave}
            disabled={loading || !name.trim() || !city || !district || !address || !venueType}
            className="btn-accent w-full py-3 text-sm disabled:opacity-50 mt-4"
          >
            {loading ? 'Kaydediliyor...' : 'Değişiklikleri Kaydet'}
          </button>
        </div>
      </BottomSheet>
    </>
  )
}
