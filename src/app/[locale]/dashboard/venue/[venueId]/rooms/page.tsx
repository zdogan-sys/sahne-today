'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { Link } from '@/i18n/navigation'
import { ArrowLeft, Plus, X, Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'

const COMMON_EQUIPMENT_TR = ['Davul Kiti', 'Gitar Ampli', 'Bass Ampli', 'Klavye', 'PA Sistemi', 'Mikrofon', 'Kayıt Kabini', 'Analog Mikser', 'Dijital Mikser', 'Akustik İzolasyon', 'Kulaklık Sistemi', 'Klima']

export default function VenueRoomsPage() {
  const router = useRouter()
  const params = useParams()
  const venueId = params.venueId as string
  const supabase = createClient()

  const [venue, setVenue] = useState<any>(null)
  const [rooms, setRooms] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [error, setError] = useState('')

  const [form, setForm] = useState({
    name: '',
    description: '',
    price_per_hour: '',
    capacity: '1',
    equipment: [] as string[],
  })

  useEffect(() => { load() }, [])

  async function load() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/auth'); return }

    const [venueRes, roomsRes] = await Promise.all([
      supabase.from('venues').select('id, name, owner_id').eq('id', venueId).single(),
      supabase.from('studio_rooms').select('*').eq('venue_id', venueId).eq('is_active', true).order('created_at'),
    ])

    if (!venueRes.data || venueRes.data.owner_id !== user.id) { router.push('/dashboard'); return }
    setVenue(venueRes.data)
    setRooms(roomsRes.data ?? [])
    setLoading(false)
  }

  function toggleEquipment(eq: string) {
    setForm(prev => ({
      ...prev,
      equipment: prev.equipment.includes(eq) ? prev.equipment.filter(e => e !== eq) : [...prev.equipment, eq],
    }))
  }

  async function addRoom() {
    if (!form.name) { setError('Oda adı zorunludur.'); return }
    setSaving(true); setError('')

    const { data, error: err } = await supabase.from('studio_rooms').insert({
      venue_id: venueId,
      name: form.name,
      description: form.description || null,
      price_per_hour: form.price_per_hour ? parseFloat(form.price_per_hour) : null,
      capacity: parseInt(form.capacity) || 1,
      equipment: form.equipment,
      is_active: true,
    } as any).select().single()

    if (err) { setError(err.message); setSaving(false); return }

    setRooms(prev => [...prev, data])
    setForm({ name: '', description: '', price_per_hour: '', capacity: '1', equipment: [] })
    setShowForm(false)
    setSaving(false)
  }

  async function deleteRoom(id: string) {
    await supabase.from('studio_rooms').update({ is_active: false } as any).eq('id', id)
    setRooms(prev => prev.filter(r => r.id !== id))
  }

  if (loading) return <div className="max-w-2xl mx-auto px-4 py-12 flex justify-center"><Loader2 size={24} className="animate-spin text-accent" /></div>

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
      <div>
        <Link href="/dashboard" className="flex items-center gap-2 text-text-muted text-sm mb-4 hover:text-text-primary w-fit">
          <ArrowLeft size={16} /> Dashboard
        </Link>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-bebas text-4xl text-text-primary">{venue?.name}</h1>
            <p className="text-text-muted text-sm mt-0.5">Odalar / Salonlar</p>
          </div>
          <button onClick={() => setShowForm(!showForm)} className="btn-accent py-2 px-4 text-sm flex items-center gap-1.5">
            <Plus size={14} /> {showForm ? 'İptal' : 'Oda Ekle'}
          </button>
        </div>
      </div>

      {showForm && (
        <div className="card p-5 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="label">Oda Adı *</label>
              <input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="A Odası, Kayıt Stüdyosu..." className="input-field text-sm" />
            </div>
            <div>
              <label className="label">Saatlik Ücret (₺)</label>
              <input type="number" min={0} value={form.price_per_hour} onChange={e => setForm(p => ({ ...p, price_per_hour: e.target.value }))} placeholder="500" className="input-field text-sm" />
            </div>
            <div>
              <label className="label">Kapasite (kişi)</label>
              <input type="number" min={1} value={form.capacity} onChange={e => setForm(p => ({ ...p, capacity: e.target.value }))} className="input-field text-sm" />
            </div>
            <div className="col-span-2">
              <label className="label">Açıklama</label>
              <textarea value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} rows={2} className="input-field text-sm resize-none" placeholder="Odanın özellikleri..." />
            </div>
          </div>

          <div>
            <label className="label mb-2">Ekipman</label>
            <div className="flex flex-wrap gap-1.5">
              {COMMON_EQUIPMENT_TR.map(eq => (
                <button key={eq} onClick={() => toggleEquipment(eq)}
                  className={cn('text-xs px-3 py-1.5 rounded border transition-colors',
                    form.equipment.includes(eq) ? 'bg-accent/10 text-accent border-accent/30' : 'text-text-muted border-[rgba(228,224,216,0.1)] hover:text-text-primary'
                  )}>
                  {eq}
                </button>
              ))}
            </div>
          </div>

          {error && <p className="text-red-400 text-xs">{error}</p>}

          <button onClick={addRoom} disabled={saving || !form.name}
            className="btn-accent w-full py-3 text-sm disabled:opacity-50 flex items-center justify-center gap-2">
            {saving ? <><Loader2 size={14} className="animate-spin" /> Ekleniyor...</> : <><Plus size={14} /> Oda Ekle</>}
          </button>
        </div>
      )}

      {rooms.length > 0 ? (
        <div className="space-y-2">
          {rooms.map(room => (
            <div key={room.id} className="card p-4 flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-semibold text-text-primary">{room.name}</p>
                  {room.price_per_hour && (
                    <span className="font-bebas text-accent text-lg">₺{room.price_per_hour}/sa</span>
                  )}
                  {room.capacity > 1 && (
                    <span className="text-text-muted text-xs">{room.capacity} kişi</span>
                  )}
                </div>
                {room.description && <p className="text-text-muted text-xs mt-1">{room.description}</p>}
                {room.equipment?.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-1.5">
                    {room.equipment.map((eq: string) => (
                      <span key={eq} className="text-[9px] px-1.5 py-0.5 rounded bg-[rgba(228,224,216,0.06)] text-text-muted border border-[rgba(228,224,216,0.1)]">{eq}</span>
                    ))}
                  </div>
                )}
              </div>
              <button onClick={() => deleteRoom(room.id)} className="p-1 text-text-muted hover:text-red-400 transition-colors flex-shrink-0">
                <X size={13} />
              </button>
            </div>
          ))}
        </div>
      ) : !showForm && (
        <div className="card p-8 text-center text-text-muted text-sm">
          Henüz oda eklenmedi. "Oda Ekle" ile başla.
        </div>
      )}
    </div>
  )
}
