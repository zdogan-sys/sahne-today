'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Plus, X, Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { getListConfigs } from '@/app/actions/site'
import { DANCE_OPTIONS, INSTRUMENT_OPTIONS } from '@/lib/constants'

export default function VenueInstructorsPage() {
  const router = useRouter()
  const params = useParams()
  const venueId = params.venueId as string
  const supabase = createClient()

  const [venue, setVenue] = useState<any>(null)
  const [instructors, setInstructors] = useState<any[]>([])
  const [instrumentOptions, setInstrumentOptions] = useState<string[]>(INSTRUMENT_OPTIONS)
  const [artists, setArtists] = useState<any[]>([])
  const [artistQuery, setArtistQuery] = useState('')
  const [artistFocused, setArtistFocused] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [error, setError] = useState('')

  const [formData, setFormData] = useState({
    name: '',
    instruments: [] as string[],
    bio: '',
    artist_id: null as string | null,
  })

  useEffect(() => {
    load()
  }, [])

  async function load() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/auth'); return }

    const [venueRes, membershipRes, instRes, artistsRes] = await Promise.all([
      supabase.from('venues').select('id, name, venue_type').eq('id', venueId).single(),
      supabase.from('venue_members').select('id').eq('venue_id', venueId).eq('user_id', user.id).maybeSingle(),
      supabase.from('venue_instructors').select('*').eq('venue_id', venueId).eq('is_active', true),
      supabase.from('artists').select('id, stage_name, teaching_instruments, instruments').order('stage_name').limit(300),
    ])

    if (!venueRes.data || !membershipRes.data) {
      router.push('/dashboard')
      return
    }

    setVenue(venueRes.data)
    setInstructors(instRes.data ?? [])
    setArtists(artistsRes.data ?? [])

    // Venue type'a göre doğru fallback
    const isDance = venueRes.data.venue_type === 'dance_studio'
    setInstrumentOptions(isDance ? DANCE_OPTIONS : INSTRUMENT_OPTIONS)

    // Admin panelden yönetilen liste varsa üzerine yaz
    try {
      const configs = await getListConfigs()
      const list = isDance ? configs?.dance_types : configs?.instruments
      if (list?.length) setInstrumentOptions(list)
    } catch { /* fallback kullanılır */ }

    setLoading(false)
  }

  function toggleInstrument(inst: string) {
    setFormData(prev => ({
      ...prev,
      instruments: prev.instruments.includes(inst)
        ? prev.instruments.filter(i => i !== inst)
        : [...prev.instruments, inst]
    }))
  }

  async function addInstructor() {
    if (!formData.name || formData.instruments.length === 0) {
      setError('İsim ve en az bir enstrüman zorunludur.')
      return
    }

    setSaving(true)
    setError('')

    const { error: err } = await supabase
      .from('venue_instructors')
      .insert({
        venue_id: venueId,
        name: formData.name,
        instruments: formData.instruments,
        bio: formData.bio || null,
        artist_id: formData.artist_id,
        is_active: true,
      })

    if (err) {
      setError(err.message)
      setSaving(false)
      return
    }

    setFormData({ name: '', instruments: [], bio: '', artist_id: null })
    setArtistQuery('')
    setShowForm(false)
    setSaving(false)
    router.push(`/dashboard/venue/${venueId}`)
  }

  async function deleteInstructor(id: string) {
    await supabase.from('venue_instructors').update({ is_active: false } as any).eq('id', id)
    setInstructors(prev => prev.filter(i => i.id !== id))
  }

  if (loading) return (
    <div className="max-w-2xl mx-auto px-4 py-12 flex justify-center">
      <Loader2 size={24} className="animate-spin text-accent" />
    </div>
  )

  if (!venue) return (
    <div className="max-w-2xl mx-auto px-4 py-12 text-center">
      <p className="text-text-muted">Mekan bulunamadı.</p>
      <Link href="/dashboard" className="text-accent mt-2 block">Dashboard'a dön →</Link>
    </div>
  )

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
      <div>
        <Link href={`/dashboard/venue/${venueId}`} className="flex items-center gap-2 text-text-muted text-sm mb-4 hover:text-text-primary w-fit">
          <ArrowLeft size={16} /> {venue?.name ?? 'Mekan'}
        </Link>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-bebas text-4xl text-text-primary">{venue.name}</h1>
            <p className="text-text-muted text-sm mt-0.5">Eğitmenler</p>
          </div>
          <button onClick={() => setShowForm(!showForm)} className="btn-accent py-2 px-4 text-sm flex items-center gap-1.5">
            <Plus size={14} /> {showForm ? 'İptal' : 'Eğitmen Ekle'}
          </button>
        </div>
      </div>

      {showForm && (
        <div className="card p-5 space-y-4">
          {/* 1. Enstrüman seçimi (önce) */}
          <div>
            <label className="label mb-2">{venue?.venue_type === 'dance_studio' ? 'Dans Türleri *' : 'Enstrümanlar *'}</label>
            <div className="flex flex-wrap gap-1.5">
              {instrumentOptions.map(inst => (
                <button
                  key={inst}
                  onClick={() => toggleInstrument(inst)}
                  className={`text-xs px-3 py-1.5 rounded border transition-colors ${
                    formData.instruments.includes(inst)
                      ? 'bg-accent/10 text-accent border-accent/30'
                      : 'text-text-muted border-[rgba(228,224,216,0.1)] hover:text-text-primary'
                  }`}
                >
                  {inst}
                </button>
              ))}
            </div>
          </div>

          {/* 2. Eğitmen adı */}
          <div>
            <label className="label text-xs mb-1 block">Eğitmen Adı *</label>
            <input
              value={formData.name}
              onChange={e => setFormData(prev => ({ ...prev, name: e.target.value, artist_id: null }))}
              placeholder="Eğitmen adını yazın"
              className="input-field text-sm"
            />
          </div>

          {/* 3. Sanatçı havuzundan seç (seçili enstrümana göre filtreli) */}
          <div className="relative">
            <label className="label text-xs mb-1 block">
              ya da platform sanatçı havuzundan seç
              {formData.instruments.length > 0 && <span className="text-accent ml-1">({formData.instruments.join(', ')} eğitmenleri)</span>}
            </label>
            {formData.instruments.length === 0 ? (
              <p className="text-text-muted text-xs italic">Önce yukarıdan enstrüman seçin — o enstrümanı öğreten sanatçılar listelenir.</p>
            ) : (
              <>
                <input
                  value={artistQuery}
                  onChange={e => setArtistQuery(e.target.value)}
                  onFocus={() => setArtistFocused(true)}
                  onBlur={() => setTimeout(() => setArtistFocused(false), 150)}
                  placeholder="Tıkla veya isim yaz..."
                  className="input-field text-sm"
                />
                {artistFocused && (
                  <div className="absolute z-10 top-full left-0 right-0 bg-surface border border-[rgba(228,224,216,0.15)] rounded-lg shadow-lg max-h-44 overflow-y-auto mt-1">
                    {(() => {
                      const filtered = artists.filter(a => {
                        if (artistQuery && !a.stage_name.toLowerCase().includes(artistQuery.toLowerCase())) return false
                        const skills = [...(a.teaching_instruments ?? []), ...(a.instruments ?? [])]
                        return skills.some((ti: string) => formData.instruments.includes(ti))
                      }).slice(0, 20)
                      if (filtered.length === 0) return <p className="px-3 py-2 text-xs text-text-muted">{venue?.venue_type === 'dance_studio' ? 'Bu dans türünü yapan sanatçı bulunamadı' : 'Bu enstrümanı öğreten sanatçı bulunamadı'}</p>
                      return filtered.map(a => (
                        <button key={a.id} type="button"
                          onMouseDown={() => { setFormData(prev => ({ ...prev, name: a.stage_name, artist_id: a.id })); setArtistQuery(''); setArtistFocused(false) }}
                          className="w-full text-left px-3 py-2 text-sm text-text-muted hover:bg-[rgba(228,224,216,0.06)] hover:text-text-primary transition-colors flex items-center justify-between">
                          <span>{a.stage_name}</span>
                          <span className="text-[10px] text-text-muted">{Array.from(new Set([...(a.teaching_instruments ?? []), ...(a.instruments ?? [])])).filter((ti: string) => formData.instruments.includes(ti)).join(', ')}</span>
                        </button>
                      ))
                    })()}
                  </div>
                )}
              </>
            )}
            {formData.artist_id && (
              <p className="text-accent text-xs mt-1.5">✓ Platform sanatçısı seçildi: <strong>{formData.name}</strong></p>
            )}
          </div>

          <textarea
            value={formData.bio}
            onChange={e => setFormData(prev => ({ ...prev, bio: e.target.value }))}
            placeholder="Biografi (opsiyonel)"
            className="input-field text-sm"
            rows={3}
          />

          {error && <p className="text-red-400 text-xs">{error}</p>}

          <button
            onClick={addInstructor}
            disabled={saving || !formData.name || formData.instruments.length === 0}
            className="btn-accent w-full py-3 text-sm disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {saving ? <><Loader2 size={14} className="animate-spin" /> Ekleniyor...</> : <><Plus size={14} /> Eğitmen Ekle</>}
          </button>
        </div>
      )}

      {instructors.length > 0 ? (
        <div className="space-y-2">
          {instructors.map(inst => (
            <div key={inst.id} className="card p-4 flex items-start justify-between gap-3">
              <Link href={`/dashboard/venue/${venueId}/instructors/${inst.id}`} className="flex-1 min-w-0 group">
                <p className="font-medium text-text-primary group-hover:text-accent transition-colors">{inst.name} <span className="text-accent text-xs font-normal">· programı gör →</span></p>
                {inst.instruments && inst.instruments.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-1.5">
                    {inst.instruments.map((i: string) => (
                      <span key={i} className="text-[10px] px-2 py-0.5 rounded bg-accent/10 text-accent border border-accent/20">
                        {i}
                      </span>
                    ))}
                  </div>
                )}
                {inst.bio && <p className="text-text-muted text-xs mt-1.5">{inst.bio}</p>}
              </Link>
              <button onClick={() => deleteInstructor(inst.id)} className="p-1 text-text-muted hover:text-red-400 transition-colors flex-shrink-0">
                <X size={13} />
              </button>
            </div>
          ))}
        </div>
      ) : !showForm && (
        <div className="card p-8 text-center text-text-muted text-sm">
          Henüz eğitmen eklenmedi. "Eğitmen Ekle" butonuyla başla.
        </div>
      )}
    </div>
  )
}
