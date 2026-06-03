'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { Link } from '@/i18n/navigation'
import { ArrowLeft, Check, X, Loader2, Clock } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'

const STATUS_TABS = [
  { key: 'pending', label: 'Bekleyen' },
  { key: 'confirmed', label: 'Onaylanan' },
  { key: 'cancelled', label: 'İptal' },
]

export default function VenueReservationsPage() {
  const router = useRouter()
  const params = useParams()
  const venueId = params.venueId as string
  const supabase = createClient()

  const [venue, setVenue] = useState<any>(null)
  const [reservations, setReservations] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('pending')
  const [acting, setActing] = useState<string | null>(null)

  useEffect(() => { load() }, [])

  async function load() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/auth'); return }

    const { data: venueData } = await supabase
      .from('venues')
      .select('id, name, owner_id')
      .eq('id', venueId)
      .single()

    if (!venueData || venueData.owner_id !== user.id) { router.push('/dashboard'); return }

    setVenue(venueData)

    const { data } = await supabase
      .from('studio_reservations')
      .select('*')
      .eq('venue_id', venueId)
      .order('reservation_date', { ascending: false })

    setReservations(data ?? [])
    setLoading(false)
  }

  async function handleUpdate(id: string, status: 'confirmed' | 'cancelled') {
    setActing(id)
    await supabase.from('studio_reservations').update({ status } as any).eq('id', id)
    setReservations(prev => prev.map(r => r.id === id ? { ...r, status } : r))
    setActing(null)
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
            return (
              <div key={res.id} className={cn('card p-4', res.status === 'pending' && 'border-yellow-400/20')}>
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
                  {res.status === 'pending' && (
                    <div className="flex gap-2 flex-shrink-0">
                      <button onClick={() => handleUpdate(res.id, 'confirmed')} disabled={acting === res.id}
                        className="w-8 h-8 rounded-lg bg-success/10 text-success hover:bg-success/20 flex items-center justify-center disabled:opacity-40">
                        <Check size={14} />
                      </button>
                      <button onClick={() => handleUpdate(res.id, 'cancelled')} disabled={acting === res.id}
                        className="w-8 h-8 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 flex items-center justify-center disabled:opacity-40">
                        <X size={14} />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
