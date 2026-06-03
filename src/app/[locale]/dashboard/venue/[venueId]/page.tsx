'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Plus, X, Edit2, Loader2, Eye } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'

export default function VenueHubPage() {
  const router = useRouter()
  const params = useParams()
  const venueId = params.venueId as string
  const supabase = createClient()

  const [venue, setVenue] = useState<any>(null)
  const [rooms, setRooms] = useState<any[]>([])
  const [templates, setTemplates] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  // Edit mode
  const [editingVenue, setEditingVenue] = useState(false)
  const [venueForm, setVenueForm] = useState({ name: '', city: '', district: '', description: '' })

  // Room form
  const [showRoomForm, setShowRoomForm] = useState(false)
  const [roomForm, setRoomForm] = useState({ name: '', capacity: 1, price_per_hour: 0 })
  const [editingRoomId, setEditingRoomId] = useState<string | null>(null)

  // Template form
  const [showTemplateForm, setShowTemplateForm] = useState(false)
  const [templateForm, setTemplateForm] = useState({ name: '', subject: '', weeks: 4, hours_per_session: 1, price_total: 0 })
  const [editingTemplateId, setEditingTemplateId] = useState<string | null>(null)

  const load = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/auth'); return }

    const { data: venueData } = await supabase
      .from('venues')
      .select('*')
      .eq('id', venueId)
      .single()

    if (!venueData || venueData.owner_id !== user.id) {
      router.push('/dashboard')
      return
    }

    setVenue(venueData)
    setVenueForm({ name: venueData.name, city: venueData.city, district: venueData.district || '', description: venueData.description || '' })

    const [roomsRes, templatesRes] = await Promise.all([
      supabase.from('studio_rooms').select('*').eq('venue_id', venueId).eq('is_active', true).order('created_at'),
      supabase.from('venue_lesson_templates').select('*').eq('venue_id', venueId).eq('is_active', true).order('created_at'),
    ])

    setRooms(roomsRes.data ?? [])
    setTemplates(templatesRes.data ?? [])
    setLoading(false)
  }, [venueId, supabase, router])

  useEffect(() => { load() }, [load])

  const isLesson = venue && ['dance_studio', 'music_school'].includes(venue.venue_type)

  async function saveVenue() {
    setSaving(true)
    setError('')
    const { error: err } = await supabase
      .from('venues')
      .update(venueForm)
      .eq('id', venueId)
    if (err) { setError(err.message); setSaving(false); return }
    setEditingVenue(false)
    await load()
    setSaving(false)
  }

  async function saveRoom() {
    if (!roomForm.name) { setError('Oda adı zorunludur'); return }
    setSaving(true)
    setError('')

    if (editingRoomId) {
      const { error: err } = await supabase
        .from('studio_rooms')
        .update(roomForm)
        .eq('id', editingRoomId)
      if (err) { setError(err.message); setSaving(false); return }
    } else {
      const { error: err } = await supabase
        .from('studio_rooms')
        .insert({ ...roomForm, venue_id: venueId })
      if (err) { setError(err.message); setSaving(false); return }
    }

    setRoomForm({ name: '', capacity: 1, price_per_hour: 0 })
    setEditingRoomId(null)
    setShowRoomForm(false)
    await load()
    setSaving(false)
  }

  async function deleteRoom(roomId: string) {
    setSaving(true)
    await supabase.from('studio_rooms').update({ is_active: false }).eq('id', roomId)
    await load()
    setSaving(false)
  }

  async function saveTemplate() {
    if (!templateForm.name) { setError('Şablon adı zorunludur'); return }
    setSaving(true)
    setError('')

    if (editingTemplateId) {
      const { error: err } = await supabase
        .from('venue_lesson_templates')
        .update(templateForm)
        .eq('id', editingTemplateId)
      if (err) { setError(err.message); setSaving(false); return }
    } else {
      const { error: err } = await supabase
        .from('venue_lesson_templates')
        .insert({ ...templateForm, venue_id: venueId })
      if (err) { setError(err.message); setSaving(false); return }
    }

    setTemplateForm({ name: '', subject: '', weeks: 4, hours_per_session: 1, price_total: 0 })
    setEditingTemplateId(null)
    setShowTemplateForm(false)
    await load()
    setSaving(false)
  }

  async function deleteTemplate(templateId: string) {
    setSaving(true)
    await supabase.from('venue_lesson_templates').update({ is_active: false }).eq('id', templateId)
    await load()
    setSaving(false)
  }

  if (loading) return <div className="max-w-4xl mx-auto px-4 py-12 flex justify-center"><Loader2 size={24} className="animate-spin text-accent" /></div>

  if (!venue) return (
    <div className="max-w-4xl mx-auto px-4 py-12 text-center">
      <p className="text-text-muted">Mekan bulunamadı.</p>
      <Link href="/dashboard" className="text-accent mt-2 block">Dashboard'a dön →</Link>
    </div>
  )

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-8">
      {/* Header */}
      <div>
        <Link href="/dashboard" className="flex items-center gap-2 text-text-muted text-sm mb-4 hover:text-text-primary w-fit">
          <ArrowLeft size={16} /> Dashboard
        </Link>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-bebas text-4xl text-text-primary">{venue.name}</h1>
            <p className="text-text-muted text-sm mt-0.5">{venue.district ? `${venue.district}, ` : ''}{venue.city}</p>
          </div>
          <button onClick={() => setEditingVenue(!editingVenue)} className="p-2 rounded-lg bg-[rgba(228,224,216,0.1)] hover:bg-accent/10 text-text-muted hover:text-accent transition-colors">
            <Edit2 size={16} />
          </button>
        </div>
      </div>

      {/* Venue Edit Form */}
      {editingVenue && (
        <div className="card p-5 space-y-4">
          <input value={venueForm.name} onChange={e => setVenueForm(p => ({ ...p, name: e.target.value }))} placeholder="Mekan Adı" className="input-field text-sm w-full" />
          <div className="grid grid-cols-2 gap-3">
            <input value={venueForm.city} onChange={e => setVenueForm(p => ({ ...p, city: e.target.value }))} placeholder="Şehir" className="input-field text-sm" />
            <input value={venueForm.district} onChange={e => setVenueForm(p => ({ ...p, district: e.target.value }))} placeholder="İlçe" className="input-field text-sm" />
          </div>
          <textarea value={venueForm.description} onChange={e => setVenueForm(p => ({ ...p, description: e.target.value }))} placeholder="Açıklama" rows={3} className="input-field text-sm w-full resize-none" />
          {error && <p className="text-red-400 text-xs">{error}</p>}
          <div className="flex gap-2">
            <button onClick={saveVenue} disabled={saving} className="btn-accent flex-1 py-2 text-sm disabled:opacity-50">Kaydet</button>
            <button onClick={() => setEditingVenue(false)} className="flex-1 py-2 text-sm rounded-lg border border-[rgba(228,224,216,0.1)] hover:text-text-primary text-text-muted">İptal</button>
          </div>
        </div>
      )}

      {/* Ders Şablonları — mekan geneli, odalardan bağımsız */}
      {isLesson && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-bebas text-2xl text-text-primary">DERS ŞABLONLARı</h2>
              <p className="text-text-muted text-xs">Mekan geneli — tüm odalarda kullanılabilir</p>
            </div>
            <button onClick={() => { setShowTemplateForm(!showTemplateForm); setEditingTemplateId(null); setTemplateForm({ name: '', subject: '', weeks: 4, hours_per_session: 1, price_total: 0 }) }} className="btn-accent py-2 px-4 text-sm flex items-center gap-1.5">
              <Plus size={14} /> {showTemplateForm ? 'İptal' : 'Şablon Ekle'}
            </button>
          </div>

          {showTemplateForm && (
            <div className="card p-4 space-y-3">
              <div>
                <label className="label text-xs">Şablon Adı *</label>
                <input value={templateForm.name} onChange={e => setTemplateForm(p => ({ ...p, name: e.target.value }))} placeholder="Klasik Gitar Kursu" className="input-field text-sm w-full mt-1" />
              </div>
              <div>
                <label className="label text-xs">Ders Konusu</label>
                <input value={templateForm.subject} onChange={e => setTemplateForm(p => ({ ...p, subject: e.target.value }))} placeholder="Gitar" className="input-field text-sm w-full mt-1" />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="label text-xs">Hafta Sayısı</label>
                  <input type="number" min={1} value={templateForm.weeks} onChange={e => setTemplateForm(p => ({ ...p, weeks: parseInt(e.target.value) }))} className="input-field text-sm mt-1" />
                </div>
                <div>
                  <label className="label text-xs">Saat / Seans</label>
                  <input type="number" min={0.5} step={0.5} value={templateForm.hours_per_session} onChange={e => setTemplateForm(p => ({ ...p, hours_per_session: parseFloat(e.target.value) }))} className="input-field text-sm mt-1" />
                </div>
                <div>
                  <label className="label text-xs">Toplam Ücret (₺)</label>
                  <input type="number" min={0} value={templateForm.price_total} onChange={e => setTemplateForm(p => ({ ...p, price_total: parseFloat(e.target.value) }))} className="input-field text-sm mt-1" />
                </div>
              </div>
              {error && <p className="text-red-400 text-xs">{error}</p>}
              <button onClick={saveTemplate} disabled={saving} className="btn-accent w-full py-2 text-sm disabled:opacity-50">
                {editingTemplateId ? 'Güncelle' : 'Şablon Ekle'}
              </button>
            </div>
          )}

          {!showTemplateForm && (templates.length > 0 ? (
            <div className="space-y-2">
              {templates.map(tmpl => (
                <div key={tmpl.id} className="card p-3 flex items-center justify-between">
                  <div className="flex-1">
                    <p className="text-text-primary font-medium text-sm">{tmpl.name}</p>
                    <p className="text-text-muted text-xs mt-0.5">{tmpl.weeks} hafta · {tmpl.hours_per_session}h/seans {tmpl.subject && `· ${tmpl.subject}`}</p>
                  </div>
                  <div className="text-accent font-bebas text-lg">₺{tmpl.price_total}</div>
                  <div className="flex gap-1 ml-3">
                    <button onClick={() => { setEditingTemplateId(tmpl.id); setTemplateForm(tmpl); setShowTemplateForm(true) }} className="p-1 text-text-muted hover:text-accent"><Edit2 size={13} /></button>
                    <button onClick={() => deleteTemplate(tmpl.id)} className="p-1 text-text-muted hover:text-red-400"><X size={13} /></button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="card p-6 text-center text-text-muted text-sm">Henüz şablon eklenmedi.</div>
          ))}
        </div>
      )}

      {/* Form açıkken sadece şablon ekleme görünür; odalar/linkler gizlenir */}
      {!showTemplateForm && (
      <>
      {/* Odalar */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-bebas text-2xl text-text-primary">ODALAR</h2>
          <button onClick={() => { setShowRoomForm(!showRoomForm); setEditingRoomId(null); setRoomForm({ name: '', capacity: 1, price_per_hour: 0 }) }} className="btn-accent py-2 px-4 text-sm flex items-center gap-1.5">
            <Plus size={14} /> {showRoomForm ? 'İptal' : 'Oda Ekle'}
          </button>
        </div>

        {showRoomForm && (
          <div className="card p-4 space-y-3">
            <input value={roomForm.name} onChange={e => setRoomForm(p => ({ ...p, name: e.target.value }))} placeholder="Oda Adı *" className="input-field text-sm w-full" />
            <div className="grid grid-cols-2 gap-3">
              <input type="number" min={1} value={roomForm.capacity} onChange={e => setRoomForm(p => ({ ...p, capacity: parseInt(e.target.value) }))} placeholder="Kapasite" className="input-field text-sm" />
              <input type="number" min={0} value={roomForm.price_per_hour} onChange={e => setRoomForm(p => ({ ...p, price_per_hour: parseFloat(e.target.value) }))} placeholder="Saat Ücreti (₺)" className="input-field text-sm" />
            </div>
            {error && <p className="text-red-400 text-xs">{error}</p>}
            <button onClick={saveRoom} disabled={saving} className="btn-accent w-full py-2 text-sm disabled:opacity-50">
              {editingRoomId ? 'Güncelle' : 'Oda Ekle'}
            </button>
          </div>
        )}

        {rooms.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {rooms.map(room => (
              <Link key={room.id} href={`/dashboard/venue/${venueId}/rooms/${room.id}`}>
                <div className="card p-4 hover:border-accent/30 transition-colors cursor-pointer group">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-text-primary group-hover:text-accent transition-colors">{room.name}</p>
                      <p className="text-text-muted text-xs mt-0.5">{room.capacity} kişi</p>
                    </div>
                    <div className="flex gap-1 flex-shrink-0">
                      <button onClick={(e) => { e.preventDefault(); setEditingRoomId(room.id); setRoomForm(room); setShowRoomForm(true) }} className="p-1 text-text-muted hover:text-accent"><Edit2 size={13} /></button>
                      <button onClick={(e) => { e.preventDefault(); deleteRoom(room.id) }} className="p-1 text-text-muted hover:text-red-400"><X size={13} /></button>
                    </div>
                  </div>
                  {room.price_per_hour > 0 && <p className="text-accent text-sm font-bebas">₺{room.price_per_hour}/saat</p>}
                  <div className="mt-3 pt-3 border-t border-[rgba(228,224,216,0.1)] flex items-center gap-1 text-[10px] text-text-muted group-hover:text-accent transition-colors">
                    <Eye size={12} /> Programı Gör
                  </div>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="card p-6 text-center text-text-muted text-sm">Henüz oda eklenmedi.</div>
        )}
      </div>

      {/* Eğitmenler */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-bebas text-2xl text-text-primary">EĞİTMENLER</h2>
          <Link href={`/dashboard/venue/${venueId}/instructors`} className="btn-accent py-2 px-4 text-sm flex items-center gap-1.5">
            <Plus size={14} /> Eğitmen Ekle
          </Link>
        </div>
        <Link href={`/dashboard/venue/${venueId}/instructors`} className="card p-4 flex items-center justify-between hover:border-accent/30 transition-colors">
          <span className="text-text-muted text-sm">Eğitmenleri görüntüle ve yönet</span>
          <span className="text-accent">→</span>
        </Link>
      </div>

      {/* Kurslar (sadece dans/müzik okulu) */}
      {isLesson && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-bebas text-2xl text-text-primary">KURSLAR</h2>
            <Link href={`/dashboard/venue/${venueId}/courses/new`} className="btn-accent py-2 px-4 text-sm flex items-center gap-1.5">
              <Plus size={14} /> Yeni Kurs
            </Link>
          </div>
          <Link href={`/dashboard/venue/${venueId}/courses`} className="card p-4 flex items-center justify-between hover:border-accent/30 transition-colors">
            <span className="text-text-muted text-sm">Kursları görüntüle ve yönet</span>
            <span className="text-accent">→</span>
          </Link>
        </div>
      )}

      {/* Rezervasyonlar */}
      <div className="space-y-4">
        <h2 className="font-bebas text-2xl text-text-primary">REZERVASYONLAR</h2>
        <Link href={`/dashboard/venue/${venueId}/reservations`} className="card p-4 flex items-center justify-between hover:border-accent/30 transition-colors">
          <span className="text-text-muted text-sm">Rezervasyonları görüntüle ve yönet</span>
          <span className="text-accent">→</span>
        </Link>
        {!isLesson && (
          <Link href={`/dashboard/venue/${venueId}/availability`} className="card p-4 flex items-center justify-between hover:border-accent/30 transition-colors">
            <span className="text-text-muted text-sm">Çalışma Saatleri</span>
            <span className="text-accent">→</span>
          </Link>
        )}
      </div>
      </>
      )}
    </div>
  )
}
