'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Plus, Trash2 } from 'lucide-react'
import { ImageUpload } from '@/components/ui/ImageUpload'
import { SocialLinksEditor, type SocialLinksData } from '@/components/ui/SocialLinksEditor'
import { DAY_NAMES, VENUE_TYPE_LABELS, cn } from '@/lib/utils'

type VenueType = 'pub' | 'turku_bar' | 'live_music' | 'bookstore' | 'theater' | 'cafe' | 'other'
type FeeModel = 'free' | 'door_share' | 'guarantee' | 'negotiable'

interface SlotEntry {
  day_of_week: number
  start_time: string
  end_time: string
  recurrence: 'weekly' | 'biweekly' | 'once'
  fee_model: FeeModel
  fee_value: string
  max_performers: string
  notes: string
  event_type: string
}

const EQUIPMENT_OPTIONS = ['Ses Sistemi', 'Mikrofon', 'Klavye', 'Davul Kiti', 'Işık', 'Projeksiyon', 'Sahne']
const GENRE_OPTIONS = ['Rock', 'Stand-Up', 'Türkü', 'Caz', 'Solist', 'Pop', 'Folk', 'Elektronik']
const CITY_OPTIONS = ['İstanbul', 'Ankara', 'İzmir', 'Bursa', 'Antalya', 'Eskişehir']

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
            {s < 4 && (
              <div className={cn('flex-1 h-px w-12 md:w-24 transition-colors', s < step ? 'bg-accent' : 'bg-[rgba(228,224,216,0.1)]')} />
            )}
          </div>
        ))}
      </div>
      <div className="flex justify-between text-xs text-text-muted">
        <span>Temel Bilgiler</span>
        <span>Sahne & Kapasite</span>
        <span>Açık Slotlar</span>
        <span>Önizleme</span>
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

  const [slots, setSlots] = useState<SlotEntry[]>([{
    day_of_week: 5, start_time: '21:00', end_time: '23:00',
    recurrence: 'weekly', fee_model: 'free', fee_value: '', max_performers: '', notes: '', event_type: 'Konser'
  }])

  function addSlot() {
    setSlots([...slots, {
      day_of_week: 5, start_time: '21:00', end_time: '23:00',
      recurrence: 'weekly', fee_model: 'free', fee_value: '', max_performers: '', notes: '', event_type: 'Konser'
    }])
  }

  function removeSlot(idx: number) {
    setSlots(slots.filter((_, i) => i !== idx))
  }

  function updateSlot(idx: number, field: keyof SlotEntry, value: string | number) {
    setSlots(slots.map((s, i) => i === idx ? { ...s, [field]: value } : s))
  }

  async function handleSubmit() {
    setLoading(true)
    setError('')
    const supabase = createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/auth'); return }

    const venueInsert = {
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
    }

    const { data: venueData, error: venueErr } = await supabase
      .from('venues')
      .insert(venueInsert as any)
      .select()
      .single()

    if (venueErr || !venueData) {
      setError('Mekan kaydedilemedi.')
      setLoading(false)
      return
    }

    const venue = venueData as { id: string }

    if (slots.length > 0) {
      const slotInserts = slots.map((s) => ({
        venue_id: venue.id,
        day_of_week: s.day_of_week,
        start_time: s.start_time,
        end_time: s.end_time,
        recurrence: s.recurrence,
        fee_model: s.fee_model,
        fee_value: s.fee_value ? parseFloat(s.fee_value) : null,
        max_performers: s.max_performers ? parseInt(s.max_performers) : null,
        notes: s.notes || null,
        event_type: s.event_type || 'Konser',
        status: 'open' as const,
      }))
      await supabase.from('slots').insert(slotInserts as any)
    }

    router.push(`/venues/${venue.id}`)
  }

  return (
    <div>
      <ProgressBar step={step} />

      {step === 1 && (
        <div className="card p-6 space-y-4">
          <h2 className="font-semibold text-text-primary">Temel Bilgiler</h2>
          <div>
            <label className="label">Mekan Adı *</label>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="The Backstage" className="input-field" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Şehir *</label>
              <select value={city} onChange={(e) => setCity(e.target.value)} className="input-field">
                <option value="">Seçin</option>
                {CITY_OPTIONS.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="label">İlçe *</label>
              <input value={district} onChange={(e) => setDistrict(e.target.value)} placeholder="Kadıköy" className="input-field" />
            </div>
          </div>
          <div>
            <label className="label">Adres *</label>
            <input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Moda Cad. No:12" className="input-field" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Telefon</label>
              <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+90 212 000 00 00" className="input-field" />
            </div>
            <div>
              <label className="label">E-posta</label>
              <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" placeholder="info@mekan.com" className="input-field" />
            </div>
          </div>
          <div>
            <label className="label">Mekan Türü *</label>
            <div className="flex flex-wrap gap-2 mt-1">
              {Object.entries(VENUE_TYPE_LABELS).map(([key, label]) => (
                <button key={key} type="button" onClick={() => setVenueType(key as VenueType)}
                  className={cn('chip border transition-colors', venueType === key
                    ? 'bg-accent/10 text-accent border-accent/30'
                    : 'bg-[rgba(228,224,216,0.04)] text-text-muted border-[rgba(228,224,216,0.1)]'
                  )}>
                  {label}
                </button>
              ))}
            </div>
          </div>
          <button onClick={() => { if (name && city && district && address && venueType) setStep(2) }}
            disabled={!name || !city || !district || !address || !venueType}
            className="btn-accent w-full py-3 disabled:opacity-40">
            Devam Et →
          </button>
        </div>
      )}

      {step === 2 && (
        <div className="card p-6 space-y-5">
          <h2 className="font-semibold text-text-primary">Sahne & Kapasite</h2>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="label">Oturma Kapasitesi</label>
              <input value={capacitySeated} onChange={(e) => setCapacitySeated(e.target.value)} type="number" placeholder="80" className="input-field" />
            </div>
            <div>
              <label className="label">Ayakta Kapasite</label>
              <input value={capacityStanding} onChange={(e) => setCapacityStanding(e.target.value)} type="number" placeholder="150" className="input-field" />
            </div>
            <div>
              <label className="label">Sahne Alanı (m²)</label>
              <input value={stageArea} onChange={(e) => setStageArea(e.target.value)} type="number" placeholder="20" className="input-field" />
            </div>
          </div>
          <ChipSelector options={EQUIPMENT_OPTIONS} selected={equipment}
            onToggle={(v) => setEquipment((p) => p.includes(v) ? p.filter((x) => x !== v) : [...p, v])}
            label="Mevcut Ekipman" />
          <ChipSelector options={GENRE_OPTIONS} selected={genres}
            onToggle={(v) => setGenres((p) => p.includes(v) ? p.filter((x) => x !== v) : [...p, v])}
            label="Ağırlıklı Türler" />
          <div>
            <label className="label">Açıklama</label>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3}
              placeholder="Mekanınızı anlatan kısa bir metin..." className="input-field resize-none" />
          </div>
          <ImageUpload
            value={photoUrl}
            onChange={setPhotoUrl}
            bucket="venues"
            label="Mekan Fotoğrafı"
          />
          <SocialLinksEditor value={socialLinks} onChange={setSocialLinks} />
          <div className="flex gap-3">
            <button onClick={() => setStep(1)} className="btn-outline flex-1 py-3">← Geri</button>
            <button onClick={() => setStep(3)} className="btn-accent flex-1 py-3">Devam Et →</button>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="card p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-text-primary">Açık Slotlar</h2>
            <button type="button" onClick={addSlot} className="flex items-center gap-1 text-accent text-sm hover:text-accent/80">
              <Plus size={16} />
              Slot Ekle
            </button>
          </div>

          {slots.map((slot, idx) => (
            <div key={idx} className="p-4 rounded-lg bg-[rgba(228,224,216,0.04)] border border-[rgba(228,224,216,0.08)] space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-text-primary">Slot {idx + 1}</span>
                {slots.length > 1 && (
                  <button type="button" onClick={() => removeSlot(idx)} className="text-text-muted hover:text-red-400">
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                <div>
                  <label className="label">Gün</label>
                  <select value={slot.day_of_week} onChange={(e) => updateSlot(idx, 'day_of_week', parseInt(e.target.value))} className="input-field">
                    {DAY_NAMES.map((d, i) => <option key={i} value={i}>{d}</option>)}
                  </select>
                </div>
                <div>
                  <label className="label">Başlangıç</label>
                  <input type="time" value={slot.start_time} onChange={(e) => updateSlot(idx, 'start_time', e.target.value)} className="input-field" />
                </div>
                <div>
                  <label className="label">Bitiş</label>
                  <input type="time" value={slot.end_time} onChange={(e) => updateSlot(idx, 'end_time', e.target.value)} className="input-field" />
                </div>
                <div>
                  <label className="label">Tekrar</label>
                  <select value={slot.recurrence} onChange={(e) => updateSlot(idx, 'recurrence', e.target.value)} className="input-field">
                    <option value="weekly">Haftalık</option>
                    <option value="biweekly">2 Haftada Bir</option>
                    <option value="once">Tek Sefer</option>
                  </select>
                </div>
                <div>
                  <label className="label">Ücret Modeli</label>
                  <select value={slot.fee_model} onChange={(e) => updateSlot(idx, 'fee_model', e.target.value)} className="input-field">
                    <option value="free">Ücretsiz</option>
                    <option value="door_share">Kapı Paylaşımı</option>
                    <option value="guarantee">Garanti</option>
                    <option value="negotiable">Pazarlığa Açık</option>
                  </select>
                </div>
                <div>
                  <label className="label">Tutar (₺)</label>
                  <input type="number" value={slot.fee_value} onChange={(e) => updateSlot(idx, 'fee_value', e.target.value)} placeholder="0" className="input-field" />
                </div>
              </div>
              <div>
                <label className="label">Etkinlik Türü</label>
                <select value={slot.event_type} onChange={(e) => updateSlot(idx, 'event_type', e.target.value)} className="input-field">
                  {['Konser', 'Akustik Set', 'Canlı Müzik', 'Stand-Up', 'Türkü Gecesi', 'Jam Session', 'DJ Seti'].map(t => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label">Notlar</label>
                <input value={slot.notes} onChange={(e) => updateSlot(idx, 'notes', e.target.value)}
                  placeholder="Teknik gereksinimler, özel koşullar..." className="input-field" />
              </div>
            </div>
          ))}

          <div className="flex gap-3">
            <button onClick={() => setStep(2)} className="btn-outline flex-1 py-3">← Geri</button>
            <button onClick={() => setStep(4)} className="btn-accent flex-1 py-3">Önizleme →</button>
          </div>
        </div>
      )}

      {step === 4 && (
        <div className="space-y-4">
          <div className="card p-6">
            <h2 className="font-semibold text-text-primary mb-4">Önizleme</h2>
            <div className="space-y-3 text-sm">
              <div className="flex gap-2"><span className="text-text-muted w-28">Mekan:</span><span className="text-text-primary font-medium">{name}</span></div>
              <div className="flex gap-2"><span className="text-text-muted w-28">Konum:</span><span className="text-text-primary">{district}, {city}</span></div>
              <div className="flex gap-2"><span className="text-text-muted w-28">Tür:</span><span className="text-text-primary">{VENUE_TYPE_LABELS[venueType as VenueType]}</span></div>
              {genres.length > 0 && <div className="flex gap-2"><span className="text-text-muted w-28">Türler:</span><span className="text-text-primary">{genres.join(', ')}</span></div>}
              <div className="flex gap-2"><span className="text-text-muted w-28">Slot Sayısı:</span><span className="text-text-primary">{slots.length}</span></div>
            </div>
          </div>
          {error && <p className="text-red-400 text-sm text-center">{error}</p>}
          <div className="flex gap-3">
            <button onClick={() => setStep(3)} className="btn-outline flex-1 py-3">← Geri</button>
            <button onClick={handleSubmit} disabled={loading} className="btn-accent flex-1 py-3 disabled:opacity-50">
              {loading ? 'Kaydediliyor...' : 'Yayınla'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
