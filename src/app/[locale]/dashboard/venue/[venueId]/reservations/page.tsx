'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { Link } from '@/i18n/navigation'
import { ArrowLeft, Check, X, Loader2, Clock, Pencil } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'
import { TimeSlotPicker } from '@/components/ui/TimeSlotPicker'

const STATUS_TABS = [
  { key: 'pending', label: 'Bekleyen' },
  { key: 'confirmed', label: 'Onaylanan' },
  { key: 'cancelled', label: 'İptal' },
]

const HOURS = Array.from({ length: 14 }, (_, i) => `${String(8 + i).padStart(2, '0')}:00`)

export default function VenueReservationsPage() {
  const router = useRouter()
  const params = useParams()
  const venueId = params.venueId as string
  const supabase = createClient()

  const [venue, setVenue] = useState<any>(null)
  const [rooms, setRooms] = useState<any[]>([])
  const [reservations, setReservations] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('pending')
  const [acting, setActing] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState({ start_time: '', duration: 2, room_id: '' })
  const [saving, setSaving] = useState(false)

  useEffect(() => { load() }, [])

  async function load() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/auth'); return }

    const [venueRes, roomsRes, resRes] = await Promise.all([
      supabase.from('venues').select('id, name, owner_id').eq('id', venueId).single(),
      supabase.from('studio_rooms').select('id, name, price_per_hour').eq('venue_id', venueId).eq('is_active', true),
      supabase.from('studio_reservations').select('*').eq('venue_id', venueId).order('reservation_date', { ascending: false }),
    ])

    if (!venueRes.data || venueRes.data.owner_id !== user.id) { router.push('/dashboard'); return }

    setVenue(venueRes.data)
    setRooms(roomsRes.data ?? [])
    setReservations(resRes.data ?? [])
    setLoading(false)
  }

  async function handleUpdate(id: string, status: 'confirmed' | 'cancelled') {
    setActing(id)
    await supabase.from('studio_reservations').update({ status } as any).eq('id', id)
    setReservations(prev => prev.map(r => r.id === id ? { ...r, status } : r))
    setActing(null)
  }

  function startEdit(res: any) {
    const startIdx = HOURS.findIndex(h => res.start_time?.startsWith(h))
    const endIdx = HOURS.findIndex(h => res.end_time?.startsWith(h))
    const duration = endIdx > startIdx ? endIdx - startIdx : 2
    setEditForm({
      start_time: startIdx >= 0 ? HOURS[startIdx] : '10:00',
      duration,
      room_id: res.room_id ?? '',
    })
    setEditingId(res.id)
  }

  async function saveEdit(res: any) {
    setSaving(true)
    const startIdx = HOURS.indexOf(editForm.start_time)
    const endTime = HOURS[startIdx + editForm.duration]
    if (!endTime) { setSaving(false); return }

    const selectedRoom = rooms.find(r => r.id === editForm.room_id)
    const pricePerHour = selectedRoom?.price_per_hour ?? res.price_per_hour
    const totalPrice = pricePerHour * editForm.duration

    await supabase.from('studio_reservations').update({
      start_time: editForm.start_time + ':00',
      end_time: endTime + ':00',
      duration_hours: editForm.duration,
      room_id: editForm.room_id || null,
      room_name: selectedRoom?.name ?? null,
      price_per_hour: pricePerHour,
      total_price: totalPrice,
    } as any).eq('id', res.id)

    setReservations(prev => prev.map(r => r.id === res.id ? {
      ...r,
      start_time: editForm.start_time + ':00',
      end_time: endTime + ':00',
      duration_hours: editForm.duration,
      room_id: editForm.room_id || null,
      room_name: selectedRoom?.name ?? null,
      total_price: totalPrice,
    } : r))

    setEditingId(null)
    setSaving(false)
  }

  const filtered = reservations.filter(r => r.status === activeTab)
  const pendingCount = reservations.filter(r => r.status === 'pending').length

  if (loading) return (
    <div className="max-w-2xl mx-auto px-4 py-12 flex justify-center">
      <Loader2 size={24} className="animate-spin text-accent" />
    </div>
  )

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
      <div>
        <Link href="/dashboard" className="flex items-center gap-2 text-text-muted text-sm mb-4 hover:text-text-primary w-fit">
          <ArrowLeft size={16} /> Dashboard
        </Link>
        <h1 className="font-bebas text-4xl text-text-primary">{venue?.name}</h1>
        <p className="text-text-muted text-sm mt-0.5">Rezervasyonlar</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 rounded-lg bg-[rgba(228,224,216,0.05)] border border-[rgba(228,224,216,0.08)]">
        {STATUS_TABS.map(tab => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key)}
            className={cn('flex-1 py-2 text-xs font-medium rounded-md transition-colors flex items-center justify-center gap-1.5',
              activeTab === tab.key ? 'bg-surface text-text-primary shadow-sm' : 'text-text-muted hover:text-text-primary'
            )}>
            {tab.label}
            {tab.key === 'pending' && pendingCount > 0 && (
              <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-yellow-400/20 text-yellow-400 font-bold">{pendingCount}</span>
            )}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="card p-8 text-center text-text-muted text-sm">
          {activeTab === 'pending' ? 'Bekleyen rezervasyon yok.' :
           activeTab === 'confirmed' ? 'Onaylanan rezervasyon yok.' : 'İptal edilmiş rezervasyon yok.'}
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(res => {
            const dateStr = new Date(res.reservation_date + 'T00:00:00').toLocaleDateString('tr-TR', {
              weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
            })
            const isEditing = editingId === res.id

            return (
              <div key={res.id} className={cn('card p-4 space-y-3', res.status === 'pending' && 'border-yellow-400/20')}>
                {/* Bilgiler */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-text-primary">{res.reserver_name}</p>
                    <p className="text-text-muted text-xs mt-0.5 flex items-center gap-1">
                      <Clock size={10} />
                      {dateStr} · {res.start_time?.slice(0, 5)}–{res.end_time?.slice(0, 5)}
                      {res.room_name && <span className="ml-1 text-accent">· {res.room_name}</span>}
                    </p>
                    <p className="text-text-muted text-xs mt-0.5">{res.reserver_phone} · {res.reserver_email}</p>
                    {res.notes && <p className="text-text-muted text-xs mt-1 italic">"{res.notes}"</p>}
                    <div className="flex items-center gap-2 mt-1.5">
                      {res.total_price > 0 && (
                        <span className="font-bebas text-lg text-accent">₺{res.total_price}</span>
                      )}
                      <span className={cn('text-[10px] px-1.5 py-0.5 rounded border',
                        res.status === 'confirmed' ? 'text-success bg-success/10 border-success/20' :
                        res.status === 'pending' ? 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20' :
                        'text-red-400 bg-red-400/10 border-red-400/20'
                      )}>
                        {res.status === 'confirmed' ? 'Onaylandı' : res.status === 'pending' ? 'Bekliyor' : 'İptal'}
                      </span>
                    </div>
                  </div>

                  <div className="flex gap-1.5 flex-shrink-0">
                    {res.status !== 'cancelled' && (
                      <button onClick={() => isEditing ? setEditingId(null) : startEdit(res)}
                        className={cn('w-8 h-8 rounded-lg flex items-center justify-center transition-colors',
                          isEditing ? 'bg-accent/20 text-accent' : 'bg-[rgba(228,224,216,0.06)] text-text-muted hover:text-accent hover:bg-accent/10'
                        )}>
                        <Pencil size={13} />
                      </button>
                    )}
                    {res.status === 'pending' && (
                      <>
                        <button onClick={() => handleUpdate(res.id, 'confirmed')} disabled={acting === res.id}
                          className="w-8 h-8 rounded-lg bg-success/10 text-success hover:bg-success/20 flex items-center justify-center disabled:opacity-40">
                          <Check size={14} />
                        </button>
                        <button onClick={() => handleUpdate(res.id, 'cancelled')} disabled={acting === res.id}
                          className="w-8 h-8 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 flex items-center justify-center disabled:opacity-40">
                          <X size={14} />
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {/* Düzenleme formu */}
                {isEditing && (
                  <div className="pt-3 border-t border-[rgba(228,224,216,0.08)] space-y-3">
                    {rooms.length > 0 && (
                      <div>
                        <label className="label text-xs mb-1">Oda</label>
                        <div className="flex flex-wrap gap-1.5">
                          <button type="button" onClick={() => setEditForm(p => ({ ...p, room_id: '' }))}
                            className={cn('text-xs px-2.5 py-1.5 rounded border transition-colors',
                              !editForm.room_id ? 'bg-accent/10 text-accent border-accent/30' : 'text-text-muted border-[rgba(228,224,216,0.1)]'
                            )}>
                            Fark etmez
                          </button>
                          {rooms.map(r => (
                            <button key={r.id} type="button" onClick={() => setEditForm(p => ({ ...p, room_id: r.id }))}
                              className={cn('text-xs px-2.5 py-1.5 rounded border transition-colors',
                                editForm.room_id === r.id ? 'bg-accent/10 text-accent border-accent/30' : 'text-text-muted border-[rgba(228,224,216,0.1)]'
                              )}>
                              {r.name}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    <TimeSlotPicker
                      venueId={venueId}
                      date={res.reservation_date}
                      roomId={editForm.room_id || undefined}
                      excludeReservationId={res.id}
                      selectedStart={editForm.start_time}
                      duration={editForm.duration}
                      onSelectStart={h => setEditForm(p => ({ ...p, start_time: h }))}
                      onSelectDuration={d => setEditForm(p => ({ ...p, duration: d }))}
                    />

                    <button onClick={() => saveEdit(res)} disabled={saving}
                      className="btn-accent w-full py-2 text-sm disabled:opacity-50 flex items-center justify-center gap-1.5">
                      {saving ? <><Loader2 size={13} className="animate-spin" /> Kaydediliyor...</> : 'Kaydet'}
                    </button>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
