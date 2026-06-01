'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useLocale } from 'next-intl'
import { BottomSheet } from '@/components/ui/BottomSheet'
import { cn } from '@/lib/utils'
import { Trash2, Pencil, Plus, ExternalLink, Users, X, CalendarPlus, Check, Lock, Unlock, Star } from 'lucide-react'
import { ProBadge } from '@/components/ui/ProBadge'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import {
  adminCreateEvent, adminUpdateEvent, adminDeleteEvent,
  adminCreateArtist, adminUpdateArtist, adminDeleteArtist,
  adminCreateVenue, adminUpdateVenue, adminDeleteVenue,
  adminCreateBand, adminUpdateBand, adminDeleteBand,
  adminConfirmEvent, adminRejectEvent,
  adminDeleteMember, adminAddPerformer, adminRemovePerformer, adminToggleModerator,
} from '@/app/actions/admin'
import { toggleFeatureFlag, toggleUserPremium, toggleFoundingMember, adminBlockConversation, adminUnblockConversation, adminDeleteConversation } from '@/app/actions/messaging'
import { createSlot } from '@/app/actions/event'
import { updateListConfig, type ListConfigKey } from '@/app/actions/site'
import { TabbedGenreSelector } from '@/components/ui/TabbedGenreSelector'
import {
  DndContext, closestCenter, PointerSensor, useSensor, useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext, horizontalListSortingStrategy,
  useSortable, arrayMove,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { ALL_GENRES, CITY_OPTIONS, INSTRUMENT_OPTIONS, MUSIC_GENRES, STAGE_GENRES } from '@/lib/constants'
import { getDayNames, FEE_MODEL_LABELS } from '@/lib/utils'
import { VENUE_TYPE_LABELS } from '@/lib/utils'

type Tab = 'pending' | 'events' | 'artists' | 'venues' | 'bands' | 'members' | 'lists' | 'premium' | 'conversations' | 'permissions'

const TABS: { key: Tab; label: string }[] = [
  { key: 'pending', label: 'Bekleyenler' },
  { key: 'events', label: 'Etkinlikler' },
  { key: 'artists', label: 'Sanatçılar' },
  { key: 'bands', label: 'Gruplar' },
  { key: 'venues', label: 'Mekanlar' },
  { key: 'members', label: 'Üyeler' },
  { key: 'lists', label: 'Türler' },
  { key: 'premium', label: 'Premium' },
  { key: 'conversations', label: 'Sohbetler' },
  { key: 'permissions', label: 'Yetkiler' },
]

const VENUE_TYPES = Object.entries(VENUE_TYPE_LABELS)
const EVENT_STATUSES = ['confirmed', 'pending', 'cancelled']
const ENTRY_TYPES = ['free', 'paid', 'door']

interface ListConfigs {
  music_genres: string[]
  stage_genres: string[]
  instruments: string[]
}

interface Props {
  events: any[]
  artists: any[]
  venues: any[]
  bands: any[]
  members: any[]
  pendingEvents: any[]
  listConfigs: ListConfigs
  featureFlags: any[]
  conversations: any[]
}

export function AdminPanel({ events, artists, venues, bands, members, pendingEvents, listConfigs, featureFlags, conversations }: Props) {
  const [tab, setTab] = useState<Tab>(pendingEvents.length > 0 ? 'pending' : 'events')
  const router = useRouter()
  const locale = useLocale()
  const dayNames = getDayNames(locale)

  function refresh() { router.refresh() }

  return (
    <div>
      {/* Stats */}
      <div className="grid grid-cols-5 gap-3 mb-6">
        {[
          { label: 'Etkinlik', count: events.length },
          { label: 'Sanatçı', count: artists.length },
          { label: 'Mekan', count: venues.length },
          { label: 'Grup', count: bands.length },
          { label: 'Üye', count: members.length },
        ].map((s) => (
          <div key={s.label} className="card p-4 text-center">
            <p className="font-bebas text-3xl text-accent">{s.count}</p>
            <p className="text-text-muted text-xs mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-5 bg-surface rounded-xl p-1 border border-[rgba(228,224,216,0.08)]">
        {TABS.map((t) => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={cn('flex-1 py-2 text-sm font-medium rounded-lg transition-colors',
              tab === t.key ? 'bg-accent text-white' : 'text-text-muted hover:text-text-primary'
            )}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'pending' && <PendingTab pendingEvents={pendingEvents} onRefresh={refresh} />}
      {tab === 'events' && <EventsTab events={events} venues={venues} artists={artists} bands={bands} onRefresh={refresh} />}
      {tab === 'artists' && <ArtistsTab artists={artists} onRefresh={refresh} />}
      {tab === 'venues' && <VenuesTab venues={venues} onRefresh={refresh} />}
      {tab === 'bands' && <BandsTab bands={bands} onRefresh={refresh} />}
      {tab === 'members' && <MembersTab members={members} onRefresh={refresh} />}
      {tab === 'lists' && <ListsTab configs={listConfigs} />}
      {tab === 'premium' && <PremiumTab featureFlags={featureFlags} members={members} onRefresh={refresh} />}
      {tab === 'conversations' && <ConversationsTab conversations={conversations} onRefresh={refresh} />}
      {tab === 'permissions' && <PermissionsTab members={members} onRefresh={refresh} />}
    </div>
  )
}

// ─── PENDING TAB ───────────────────────────────────────────────────────────

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  pending: { label: 'Mekan Onayı Bekliyor', color: 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20' },
  offered: { label: 'Sanatçı Onayı Bekliyor', color: 'text-accent bg-accent/10 border-accent/20' },
}

function PendingTab({ pendingEvents, onRefresh }: { pendingEvents: any[]; onRefresh: () => void }) {
  const [acting, setActing] = useState<string | null>(null)

  async function handleConfirm(id: string) {
    setActing(id)
    await adminConfirmEvent(id)
    onRefresh()
    setActing(null)
  }

  async function handleReject(id: string) {
    if (!confirm('Bu etkinliği iptal etmek istediğinizden emin misiniz?')) return
    setActing(id)
    await adminRejectEvent(id)
    onRefresh()
    setActing(null)
  }

  return (
    <div>
      <p className="text-text-muted text-sm mb-4">{pendingEvents.length} bekleyen etkinlik</p>
      {pendingEvents.length === 0 ? (
        <div className="text-center py-10 text-text-muted text-sm">Bekleyen etkinlik yok.</div>
      ) : (
        <div className="space-y-2">
          {pendingEvents.map((ev) => {
            const cfg = STATUS_LABELS[ev.status] ?? STATUS_LABELS.pending
            const performer = ev.artists?.stage_name ?? ev.bands?.name ?? '—'
            const venue = ev.venues?.name ? `${ev.venues.name}${ev.venues.city ? `, ${ev.venues.city}` : ''}` : '—'
            return (
              <div key={ev.id} className="card p-3 flex items-center gap-3">
                <div className="flex-shrink-0 text-center w-10">
                  <p className="text-accent font-bold text-sm">{new Date(ev.event_date).getDate()}</p>
                  <p className="text-text-muted text-[10px]">{new Date(ev.event_date).toLocaleDateString('tr-TR', { month: 'short' })}</p>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-text-primary text-sm font-medium truncate">{ev.title}</p>
                  <p className="text-text-muted text-xs truncate">{performer} · {venue}</p>
                  <span className={cn('inline-block mt-1 text-[10px] px-1.5 py-0.5 rounded border', cfg.color)}>
                    {cfg.label}
                  </span>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <Link href={`/events/${ev.id}`} target="_blank" className="p-1.5 text-text-muted hover:text-text-primary">
                    <ExternalLink size={13} />
                  </Link>
                  <button
                    onClick={() => handleConfirm(ev.id)}
                    disabled={acting === ev.id}
                    className="w-8 h-8 rounded-lg bg-success/10 text-success hover:bg-success/20 flex items-center justify-center transition-colors disabled:opacity-40"
                    title="Onayla"
                  >
                    <Check size={14} />
                  </button>
                  <button
                    onClick={() => handleReject(ev.id)}
                    disabled={acting === ev.id}
                    className="w-8 h-8 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 flex items-center justify-center transition-colors disabled:opacity-40"
                    title="Reddet / İptal"
                  >
                    <X size={14} />
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ─── EVENTS TAB ────────────────────────────────────────────────────────────

function EventsTab({ events, venues, artists, bands, onRefresh }: { events: any[]; venues: any[]; artists: any[]; bands: any[]; onRefresh: () => void }) {
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<any>(null)
  const [newKey, setNewKey] = useState(0)
  const [deleting, setDeleting] = useState<string | null>(null)

  async function handleDelete(id: string) {
    if (!confirm('Bu etkinliği silmek istediğinizden emin misiniz?')) return
    setDeleting(id)
    await adminDeleteEvent(id)
    onRefresh()
    setDeleting(null)
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="text-text-muted text-sm">{events.length} etkinlik</p>
        <button onClick={() => { setEditing(null); setNewKey(k => k + 1); setFormOpen(true) }}
          className="btn-accent py-2 px-4 text-sm flex items-center gap-2">
          <Plus size={14} /> Etkinlik Ekle
        </button>
      </div>

      <div className="space-y-2">
        {events.map((ev) => (
          <div key={ev.id} className="card p-3 flex items-center gap-3">
            <div className="flex-shrink-0 text-center w-10">
              <p className="text-accent font-bold text-sm">{new Date(ev.event_date).getDate()}</p>
              <p className="text-text-muted text-[10px]">{new Date(ev.event_date).toLocaleDateString('tr-TR', { month: 'short' })}</p>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-text-primary text-sm font-medium truncate">{ev.title}</p>
              <p className="text-text-muted text-xs truncate">
                {(ev.venues as any)?.name ?? ev.venue_name ?? '—'} · {ev.status}
                {ev.genre ? ` · ${ev.genre}` : ''}
              </p>
            </div>
            <div className="flex items-center gap-1 flex-shrink-0">
              <Link href={`/events/${ev.id}`} target="_blank" className="p-1.5 text-text-muted hover:text-text-primary">
                <ExternalLink size={13} />
              </Link>
              <button onClick={() => { setEditing(ev); setFormOpen(true) }} className="p-1.5 text-text-muted hover:text-accent">
                <Pencil size={13} />
              </button>
              <button onClick={() => handleDelete(ev.id)} disabled={deleting === ev.id} className="p-1.5 text-text-muted hover:text-red-400 disabled:opacity-40">
                <Trash2 size={13} />
              </button>
            </div>
          </div>
        ))}
      </div>

      <EventForm
        key={editing?.id ?? `new-${newKey}`}
        open={formOpen}
        onClose={() => setFormOpen(false)}
        initial={editing}
        venues={venues}
        artists={artists}
        bands={bands}
        onSaved={() => { setFormOpen(false); onRefresh() }}
      />
    </div>
  )
}

function EventForm({ open, onClose, initial, venues: initialVenues, artists: initialArtists, bands: initialBands, onSaved }: any) {
  const [title, setTitle] = useState(initial?.title ?? '')
  const [venueId, setVenueId] = useState(initial?.venue_id ?? '')
  const [venueName, setVenueName] = useState(initial?.venue_name ?? '')
  const [artistId, setArtistId] = useState(initial?.artist_id ?? '')
  const [bandId, setBandId] = useState(initial?.band_id ?? '')
  const [eventDate, setEventDate] = useState(initial?.event_date ?? '')
  const [startTime, setStartTime] = useState(initial?.start_time?.substring(0, 5) ?? '')
  const [genre, setGenre] = useState(initial?.genre ?? '')
  const [entryType, setEntryType] = useState(initial?.entry_type ?? 'free')
  const [entryFee, setEntryFee] = useState(initial?.entry_fee?.toString() ?? '')
  const [status, setStatus] = useState(initial?.status ?? 'confirmed')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Performers (extra collaborators)
  const [performers, setPerformers] = useState<any[]>([])
  const [perfLoading, setPerfLoading] = useState(false)
  const [showAddPerf, setShowAddPerf] = useState(false)
  const [perfArtistId, setPerfArtistId] = useState('')
  const [perfBandId, setPerfBandId] = useState('')
  const [perfRole, setPerfRole] = useState('')
  const [perfSaving, setPerfSaving] = useState(false)
  const [bands, setBands] = useState<any[]>(initialBands ?? [])

  const supabase = createClient()

  useEffect(() => {
    if (!open || !initial?.id) return
    setPerfLoading(true)
    supabase
      .from('event_performers')
      .select('id, role, artists(id, stage_name), bands(id, name)')
      .eq('event_id', initial.id)
      .then(({ data }) => { setPerformers(data ?? []); setPerfLoading(false) })
    supabase.from('bands').select('id, name').order('name').then(({ data }) => setBands(data ?? []))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, initial?.id])

  async function addPerformer() {
    if (!perfArtistId && !perfBandId) return
    setPerfSaving(true)
    const res = await adminAddPerformer(initial.id, {
      artist_id: perfArtistId || null,
      band_id: perfBandId || null,
      role: perfRole || null,
    })
    if (res.success) {
      const { data } = await supabase
        .from('event_performers')
        .select('id, role, artists(id, stage_name), bands(id, name)')
        .eq('event_id', initial.id)
      setPerformers(data ?? [])
      setPerfArtistId(''); setPerfBandId(''); setPerfRole(''); setShowAddPerf(false)
    }
    setPerfSaving(false)
  }

  async function removePerformer(id: string) {
    await adminRemovePerformer(id)
    setPerformers(prev => prev.filter(p => p.id !== id))
  }

  // Local copies so inline-added items appear immediately
  const [venues, setVenues] = useState<any[]>(initialVenues)
  const [artists, setArtists] = useState<any[]>(initialArtists)

  // Inline quick-add state
  const [showVenueAdd, setShowVenueAdd] = useState(false)
  const [showArtistAdd, setShowArtistAdd] = useState(false)
  const [showBandAdd, setShowBandAdd] = useState(false)
  const [newVenueName, setNewVenueName] = useState('')
  const [newVenueCity, setNewVenueCity] = useState('')
  const [newVenueType, setNewVenueType] = useState('pub')
  const [newArtistName, setNewArtistName] = useState('')
  const [newArtistCity, setNewArtistCity] = useState('')
  const [newBandName, setNewBandName] = useState('')
  const [newBandCity, setNewBandCity] = useState('')
  const [quickLoading, setQuickLoading] = useState(false)
  const [quickError, setQuickError] = useState('')

  async function quickAddVenue() {
    if (!newVenueName || !newVenueCity) { setQuickError('Ad ve şehir zorunludur.'); return }
    setQuickLoading(true); setQuickError('')
    const res = await adminCreateVenue({ name: newVenueName, city: newVenueCity, venue_type: newVenueType, address: '' })
    setQuickLoading(false)
    if (!res.success) { setQuickError(res.error ?? 'Hata'); return }
    const item = (res as any).item
    setVenues([...venues, item])
    setVenueId(item.id)
    setShowVenueAdd(false)
    setNewVenueName(''); setNewVenueCity('')
  }

  async function quickAddArtist() {
    if (!newArtistName) { setQuickError('Sahne adı zorunludur.'); return }
    setQuickLoading(true); setQuickError('')
    const res = await adminCreateArtist({ stage_name: newArtistName, city: newArtistCity || null, genres: [], instruments: [] })
    setQuickLoading(false)
    if (!res.success) { setQuickError(res.error ?? 'Hata'); return }
    const item = (res as any).item
    setArtists([...artists, item])
    setArtistId(item.id)
    setShowArtistAdd(false)
    setNewArtistName(''); setNewArtistCity('')
  }

  async function quickAddBand() {
    if (!newBandName) { setQuickError('Grup adı zorunludur.'); return }
    setQuickLoading(true); setQuickError('')
    const res = await adminCreateBand({ name: newBandName, city: newBandCity || null, genres: [] })
    setQuickLoading(false)
    if (!res.success) { setQuickError(res.error ?? 'Hata'); return }
    const item = (res as any).item
    setBands([...bands, item])
    setBandId(item.id)
    setShowBandAdd(false)
    setNewBandName(''); setNewBandCity('')
  }

  async function handleSave() {
    if (!title || !eventDate) { setError('Başlık ve tarih zorunludur.'); return }
    setLoading(true); setError('')
    const data = {
      title,
      venue_id: venueId || null,
      venue_name: venueName || null,
      artist_id: artistId || null,
      band_id: bandId || null,
      event_date: eventDate,
      start_time: startTime || null,
      genre: genre || null,
      entry_type: entryType,
      entry_fee: entryFee ? Number(entryFee) : null,
      status,
    }
    const res = initial?.id
      ? await adminUpdateEvent(initial.id, data)
      : await adminCreateEvent(data)
    setLoading(false)
    if (!res.success) { setError(res.error ?? 'Hata'); return }
    onSaved()
  }

  return (
    <BottomSheet open={open} onClose={onClose} title={initial?.id ? 'Etkinlik Düzenle' : 'Etkinlik Ekle'}>
      <div className="space-y-3">
        <div>
          <label className="label">Başlık *</label>
          <input value={title} onChange={(e) => setTitle(e.target.value)} className="input-field text-sm" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Tarih *</label>
            <input type="date" value={eventDate} onChange={(e) => setEventDate(e.target.value)} className="input-field text-sm" />
          </div>
          <div>
            <label className="label">Saat</label>
            <input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} className="input-field text-sm" />
          </div>
        </div>

        {/* Venue select + quick add */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="label">Mekan</label>
            <button type="button" onClick={() => { setShowVenueAdd(!showVenueAdd); setQuickError('') }}
              className="text-xs text-accent hover:underline flex items-center gap-1">
              <Plus size={12} /> {showVenueAdd ? 'İptal' : 'Yeni Mekan Ekle'}
            </button>
          </div>
          <select value={venueId} onChange={(e) => setVenueId(e.target.value)} className="input-field text-sm">
            <option value="">Seç veya aşağıya yaz</option>
            {venues.map((v: any) => <option key={v.id} value={v.id}>{v.name} — {v.city}</option>)}
          </select>
          {showVenueAdd && (
            <div className="mt-2 p-3 rounded-lg border border-accent/20 bg-accent/5 space-y-2">
              <p className="text-xs text-accent font-medium">Hızlı Mekan Ekle</p>
              <input value={newVenueName} onChange={(e) => setNewVenueName(e.target.value)} placeholder="Mekan adı *" className="input-field text-sm" />
              <div className="grid grid-cols-2 gap-2">
                <select value={newVenueCity} onChange={(e) => setNewVenueCity(e.target.value)} className="input-field text-sm">
                  <option value="">Şehir *</option>
                  {CITY_OPTIONS.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
                <select value={newVenueType} onChange={(e) => setNewVenueType(e.target.value)} className="input-field text-sm">
                  {VENUE_TYPES.map(([k, l]) => <option key={k} value={k}>{l}</option>)}
                </select>
              </div>
              {quickError && <p className="text-red-400 text-xs">{quickError}</p>}
              <button onClick={quickAddVenue} disabled={quickLoading} className="btn-accent w-full py-2 text-xs disabled:opacity-50">
                {quickLoading ? 'Ekleniyor...' : 'Ekle ve Seç'}
              </button>
            </div>
          )}
        </div>

        <div>
          <label className="label">Mekan Adı (serbest)</label>
          <input value={venueName} onChange={(e) => setVenueName(e.target.value)} className="input-field text-sm" placeholder="Mekan listede yoksa buraya yaz" />
        </div>

        {/* Artist select + quick add */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="label">Sanatçı</label>
            <button type="button" onClick={() => { setShowArtistAdd(!showArtistAdd); setQuickError('') }}
              className="text-xs text-accent hover:underline flex items-center gap-1">
              <Plus size={12} /> {showArtistAdd ? 'İptal' : 'Yeni Sanatçı Ekle'}
            </button>
          </div>
          <select value={artistId} onChange={(e) => setArtistId(e.target.value)} className="input-field text-sm">
            <option value="">Seç (opsiyonel)</option>
            {artists.map((a: any) => <option key={a.id} value={a.id}>{a.stage_name}</option>)}
          </select>
          {showArtistAdd && (
            <div className="mt-2 p-3 rounded-lg border border-accent/20 bg-accent/5 space-y-2">
              <p className="text-xs text-accent font-medium">Hızlı Sanatçı Ekle</p>
              <input value={newArtistName} onChange={(e) => setNewArtistName(e.target.value)} placeholder="Sahne adı *" className="input-field text-sm" />
              <select value={newArtistCity} onChange={(e) => setNewArtistCity(e.target.value)} className="input-field text-sm">
                <option value="">Şehir (opsiyonel)</option>
                {CITY_OPTIONS.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
              {quickError && <p className="text-red-400 text-xs">{quickError}</p>}
              <button onClick={quickAddArtist} disabled={quickLoading} className="btn-accent w-full py-2 text-xs disabled:opacity-50">
                {quickLoading ? 'Ekleniyor...' : 'Ekle ve Seç'}
              </button>
            </div>
          )}
        </div>

        {/* Band select + quick add */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="label">Grup</label>
            <button type="button" onClick={() => { setShowBandAdd(!showBandAdd); setQuickError('') }}
              className="text-xs text-accent hover:underline flex items-center gap-1">
              <Plus size={12} /> {showBandAdd ? 'İptal' : 'Yeni Grup Ekle'}
            </button>
          </div>
          <select value={bandId} onChange={(e) => setBandId(e.target.value)} className="input-field text-sm">
            <option value="">Seç (opsiyonel)</option>
            {bands.map((b: any) => <option key={b.id} value={b.id}>{b.name}{b.city ? ` — ${b.city}` : ''}</option>)}
          </select>
          {showBandAdd && (
            <div className="mt-2 p-3 rounded-lg border border-accent/20 bg-accent/5 space-y-2">
              <p className="text-xs text-accent font-medium">Hızlı Grup Ekle</p>
              <input value={newBandName} onChange={(e) => setNewBandName(e.target.value)} placeholder="Grup adı *" className="input-field text-sm" />
              <select value={newBandCity} onChange={(e) => setNewBandCity(e.target.value)} className="input-field text-sm">
                <option value="">Şehir (opsiyonel)</option>
                {CITY_OPTIONS.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
              {quickError && <p className="text-red-400 text-xs">{quickError}</p>}
              <button onClick={quickAddBand} disabled={quickLoading} className="btn-accent w-full py-2 text-xs disabled:opacity-50">
                {quickLoading ? 'Ekleniyor...' : 'Ekle ve Seç'}
              </button>
            </div>
          )}
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Tür</label>
            <select value={genre} onChange={(e) => setGenre(e.target.value)} className="input-field text-sm">
              <option value="">Seç</option>
              {ALL_GENRES.map((g) => <option key={g} value={g}>{g}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Durum</label>
            <select value={status} onChange={(e) => setStatus(e.target.value)} className="input-field text-sm">
              {EVENT_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Giriş</label>
            <select value={entryType} onChange={(e) => setEntryType(e.target.value)} className="input-field text-sm">
              {ENTRY_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Ücret (₺)</label>
            <input type="number" value={entryFee} onChange={(e) => setEntryFee(e.target.value)} className="input-field text-sm" placeholder="0" />
          </div>
        </div>
        {error && <p className="text-red-400 text-xs">{error}</p>}
        <button onClick={handleSave} disabled={loading} className="btn-accent w-full py-3 text-sm disabled:opacity-50">
          {loading ? 'Kaydediliyor...' : 'Kaydet'}
        </button>

        {/* Performers — only for existing events */}
        {initial?.id && (
          <div className="pt-3 border-t border-[rgba(228,224,216,0.1)]">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-medium text-text-muted uppercase tracking-wide flex items-center gap-1.5">
                <Users size={11} /> Birlikte Sahne
              </p>
              <button type="button" onClick={() => setShowAddPerf(!showAddPerf)}
                className="text-xs text-accent hover:underline flex items-center gap-1">
                <Plus size={12} /> {showAddPerf ? 'İptal' : 'Ekle'}
              </button>
            </div>

            {perfLoading ? (
              <p className="text-text-muted text-xs">Yükleniyor...</p>
            ) : (
              <div className="space-y-1.5 mb-2">
                {performers.map((p: any) => {
                  const label = p.artists?.stage_name ?? p.bands?.name ?? '?'
                  return (
                    <div key={p.id} className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-[rgba(228,224,216,0.04)]">
                      <span className="flex-1 text-text-primary text-xs">{label}</span>
                      {p.role && <span className="text-text-muted text-xs">{p.role}</span>}
                      <button onClick={() => removePerformer(p.id)} className="text-text-muted hover:text-red-400 transition-colors ml-1">
                        <Trash2 size={11} />
                      </button>
                    </div>
                  )
                })}
                {performers.length === 0 && !showAddPerf && (
                  <p className="text-text-muted text-xs">Henüz ek katılımcı yok.</p>
                )}
              </div>
            )}

            {showAddPerf && (
              <div className="p-3 rounded-lg border border-accent/20 bg-accent/5 space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="label">Sanatçı</label>
                    <select value={perfArtistId} onChange={e => { setPerfArtistId(e.target.value); if (e.target.value) setPerfBandId('') }} className="input-field text-xs">
                      <option value="">Seç</option>
                      {artists.map((a: any) => <option key={a.id} value={a.id}>{a.stage_name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="label">Grup</label>
                    <select value={perfBandId} onChange={e => { setPerfBandId(e.target.value); if (e.target.value) setPerfArtistId('') }} className="input-field text-xs">
                      <option value="">Seç</option>
                      {bands.map((b: any) => <option key={b.id} value={b.id}>{b.name}</option>)}
                    </select>
                  </div>
                </div>
                <input value={perfRole} onChange={e => setPerfRole(e.target.value)} placeholder="Rol (opsiyonel: solist, eşlik...)" className="input-field text-xs" />
                <button onClick={addPerformer} disabled={perfSaving || (!perfArtistId && !perfBandId)} className="btn-accent w-full py-2 text-xs disabled:opacity-50">
                  {perfSaving ? 'Ekleniyor...' : 'Ekle'}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </BottomSheet>
  )
}

// ─── ARTISTS TAB ───────────────────────────────────────────────────────────

function ArtistsTab({ artists, onRefresh }: { artists: any[]; onRefresh: () => void }) {
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<any>(null)
  const [newKey, setNewKey] = useState(0)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [localArtists, setLocalArtists] = useState<any[]>(artists)
  const [togglingPro, setTogglingPro] = useState<string | null>(null)

  async function handleDelete(id: string) {
    if (!confirm('Bu sanatçıyı silmek istediğinizden emin misiniz?')) return
    setDeleting(id)
    await adminDeleteArtist(id)
    onRefresh()
    setDeleting(null)
  }

  async function handleTogglePro(profileId: string, currentPro: boolean) {
    setTogglingPro(profileId)
    const res = await fetch('/api/admin/set-pro', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'individual', id: profileId, is_pro: !currentPro }),
    })
    if (res.ok) {
      setLocalArtists(prev => prev.map(a =>
        a.profile_id === profileId
          ? { ...a, profiles: { ...a.profiles, is_pro_individual: !currentPro } }
          : a
      ))
    }
    setTogglingPro(null)
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="text-text-muted text-sm">{localArtists.length} sanatçı</p>
        <button onClick={() => { setEditing(null); setNewKey(k => k + 1); setFormOpen(true) }}
          className="btn-accent py-2 px-4 text-sm flex items-center gap-2">
          <Plus size={14} /> Sanatçı Ekle
        </button>
      </div>
      <div className="space-y-2">
        {localArtists.map((a) => {
          const isPro = a.profiles?.is_pro_individual ?? false
          return (
            <div key={a.id} className="card p-3 flex items-center gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-text-primary text-sm font-medium truncate">{a.stage_name}</p>
                  {isPro && <ProBadge />}
                </div>
                <p className="text-text-muted text-xs truncate">
                  {a.city ?? '—'} · {a.genres?.slice(0, 2).join(', ') || '—'}
                  {a.is_hidden ? ' · 🙈 Gizli' : ''}
                </p>
              </div>
              <div className="flex items-center gap-1 flex-shrink-0">
                {a.profile_id && (
                  <button
                    onClick={() => handleTogglePro(a.profile_id, isPro)}
                    disabled={togglingPro === a.profile_id}
                    className={cn(
                      'text-xs px-2.5 py-1 rounded font-medium transition-colors disabled:opacity-40',
                      isPro
                        ? 'bg-red-500/10 text-red-400 hover:bg-red-500/20'
                        : 'bg-[#1D9E75]/10 text-[#1D9E75] hover:bg-[#1D9E75]/20'
                    )}
                  >
                    {togglingPro === a.profile_id ? '...' : isPro ? "Pro'yu Kaldır" : 'Pro Yap'}
                  </button>
                )}
                <Link href={`/artists/${a.id}`} target="_blank" className="p-1.5 text-text-muted hover:text-text-primary">
                  <ExternalLink size={13} />
                </Link>
                <button onClick={() => { setEditing(a); setFormOpen(true) }} className="p-1.5 text-text-muted hover:text-accent">
                  <Pencil size={13} />
                </button>
                <button onClick={() => handleDelete(a.id)} disabled={deleting === a.id} className="p-1.5 text-text-muted hover:text-red-400 disabled:opacity-40">
                  <Trash2 size={13} />
                </button>
              </div>
            </div>
          )
        })}
      </div>
      <ArtistForm key={editing?.id ?? `new-${newKey}`} open={formOpen} onClose={() => setFormOpen(false)} initial={editing} onSaved={() => { setFormOpen(false); onRefresh() }} />
    </div>
  )
}

function ArtistForm({ open, onClose, initial, onSaved }: any) {
  const [stageName, setStageName] = useState(initial?.stage_name ?? '')
  const [city, setCity] = useState(initial?.city ?? '')
  const [bio, setBio] = useState(initial?.bio ?? '')
  const [genres, setGenres] = useState<string[]>(initial?.genres ?? [])
  const [instruments, setInstruments] = useState<string[]>(initial?.instruments ?? [])
  const [isHidden, setIsHidden] = useState(initial?.is_hidden ?? false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  function toggleGenre(g: string) { setGenres(genres.includes(g) ? genres.filter(x => x !== g) : [...genres, g]) }
  function toggleInstrument(i: string) { setInstruments(instruments.includes(i) ? instruments.filter(x => x !== i) : [...instruments, i]) }

  async function handleSave() {
    if (!stageName) { setError('Sahne adı zorunludur.'); return }
    setLoading(true); setError('')
    const data = { stage_name: stageName, city: city || null, bio: bio || null, genres, instruments, is_hidden: isHidden }
    const res = initial?.id
      ? await adminUpdateArtist(initial.id, data)
      : await adminCreateArtist(data)
    setLoading(false)
    if (!res.success) { setError(res.error ?? 'Hata'); return }
    onSaved()
  }

  return (
    <BottomSheet open={open} onClose={onClose} title={initial?.id ? 'Sanatçı Düzenle' : 'Sanatçı Ekle'}>
      <div className="space-y-3">
        <div>
          <label className="label">Sahne Adı *</label>
          <input value={stageName} onChange={(e) => setStageName(e.target.value)} className="input-field text-sm" />
        </div>
        <div>
          <label className="label">Şehir</label>
          <select value={city} onChange={(e) => setCity(e.target.value)} className="input-field text-sm">
            <option value="">Seç</option>
            {CITY_OPTIONS.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div>
          <label className="label">Bio</label>
          <textarea value={bio} onChange={(e) => setBio(e.target.value)} rows={3} className="input-field text-sm resize-none" />
        </div>
        <div>
          <label className="label mb-2 block">Türler</label>
          <div className="flex flex-wrap gap-1.5">
            {ALL_GENRES.map((g) => (
              <button key={g} type="button" onClick={() => toggleGenre(g)}
                className={cn('chip border text-xs transition-colors', genres.includes(g) ? 'bg-accent/10 text-accent border-accent/30' : 'bg-[rgba(228,224,216,0.04)] text-text-muted border-[rgba(228,224,216,0.1)]')}>
                {g}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className="label mb-2 block">Enstrümanlar</label>
          <div className="flex flex-wrap gap-1.5">
            {INSTRUMENT_OPTIONS.map((i) => (
              <button key={i} type="button" onClick={() => toggleInstrument(i)}
                className={cn('chip border text-xs transition-colors', instruments.includes(i) ? 'bg-accent/10 text-accent border-accent/30' : 'bg-[rgba(228,224,216,0.04)] text-text-muted border-[rgba(228,224,216,0.1)]')}>
                {i}
              </button>
            ))}
          </div>
        </div>
        <div className="flex items-center justify-between py-2 border-t border-[rgba(228,224,216,0.1)]">
          <p className="text-sm text-text-muted">Gizle</p>
          <button type="button" onClick={() => setIsHidden(!isHidden)}
            className={cn('relative w-11 h-6 rounded-full transition-colors', isHidden ? 'bg-red-500/70' : 'bg-[rgba(228,224,216,0.15)]')}>
            <span className={cn('absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition-transform', isHidden ? 'translate-x-5' : 'translate-x-0')} />
          </button>
        </div>
        {error && <p className="text-red-400 text-xs">{error}</p>}
        <button onClick={handleSave} disabled={loading} className="btn-accent w-full py-3 text-sm disabled:opacity-50">
          {loading ? 'Kaydediliyor...' : 'Kaydet'}
        </button>
      </div>
    </BottomSheet>
  )
}

// ─── VENUES TAB ────────────────────────────────────────────────────────────

function VenuesTab({ venues, onRefresh }: { venues: any[]; onRefresh: () => void }) {
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<any>(null)
  const [newKey, setNewKey] = useState(0)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [slotVenue, setSlotVenue] = useState<any>(null)
  const [localVenues, setLocalVenues] = useState<any[]>(venues)
  const [togglingPro, setTogglingPro] = useState<string | null>(null)

  async function handleDelete(id: string) {
    if (!confirm('Bu mekanı silmek istediğinizden emin misiniz?')) return
    setDeleting(id)
    await adminDeleteVenue(id)
    onRefresh()
    setDeleting(null)
  }

  async function handleTogglePro(venueId: string, currentPro: boolean) {
    setTogglingPro(venueId)
    const res = await fetch('/api/admin/set-pro', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'venue', id: venueId, is_pro: !currentPro }),
    })
    if (res.ok) {
      setLocalVenues(prev => prev.map(v =>
        v.id === venueId ? { ...v, is_pro_venue: !currentPro } : v
      ))
    }
    setTogglingPro(null)
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="text-text-muted text-sm">{localVenues.length} mekan</p>
        <button onClick={() => { setEditing(null); setNewKey(k => k + 1); setFormOpen(true) }}
          className="btn-accent py-2 px-4 text-sm flex items-center gap-2">
          <Plus size={14} /> Mekan Ekle
        </button>
      </div>
      <div className="space-y-2">
        {localVenues.map((v) => {
          const isPro = v.is_pro_venue ?? false
          return (
            <div key={v.id} className="card p-3 flex items-center gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-text-primary text-sm font-medium truncate">{v.name}</p>
                  {isPro && <ProBadge />}
                </div>
                <p className="text-text-muted text-xs truncate">
                  {v.district ? `${v.district}, ` : ''}{v.city} · {VENUE_TYPE_LABELS[v.venue_type] ?? v.venue_type}
                  {v.verified ? ' · ✓ Onaylı' : ''}
                </p>
              </div>
              <div className="flex items-center gap-1 flex-shrink-0">
                <button
                  onClick={() => handleTogglePro(v.id, isPro)}
                  disabled={togglingPro === v.id}
                  className={cn(
                    'text-xs px-2.5 py-1 rounded font-medium transition-colors disabled:opacity-40',
                    isPro
                      ? 'bg-red-500/10 text-red-400 hover:bg-red-500/20'
                      : 'bg-[#1D9E75]/10 text-[#1D9E75] hover:bg-[#1D9E75]/20'
                  )}
                >
                  {togglingPro === v.id ? '...' : isPro ? "Pro'yu Kaldır" : 'Pro Yap'}
                </button>
                <Link href={`/venues/${v.id}`} target="_blank" className="p-1.5 text-text-muted hover:text-text-primary">
                  <ExternalLink size={13} />
                </Link>
                <button onClick={() => setSlotVenue(v)} className="p-1.5 text-text-muted hover:text-accent" title="Slot Ekle">
                  <CalendarPlus size={13} />
                </button>
                <button onClick={() => { setEditing(v); setFormOpen(true) }} className="p-1.5 text-text-muted hover:text-accent">
                  <Pencil size={13} />
                </button>
                <button onClick={() => handleDelete(v.id)} disabled={deleting === v.id} className="p-1.5 text-text-muted hover:text-red-400 disabled:opacity-40">
                  <Trash2 size={13} />
                </button>
              </div>
            </div>
          )
        })}
      </div>
      <VenueForm key={editing?.id ?? `new-${newKey}`} open={formOpen} onClose={() => setFormOpen(false)} initial={editing} onSaved={() => { setFormOpen(false); onRefresh() }} />
      <SlotForm venueId={slotVenue?.id ?? null} venueName={slotVenue?.name ?? ''} onClose={() => setSlotVenue(null)} />
    </div>
  )
}

function VenueForm({ open, onClose, initial, onSaved }: any) {
  const [name, setName] = useState(initial?.name ?? '')
  const [city, setCity] = useState(initial?.city ?? '')
  const [district, setDistrict] = useState(initial?.district ?? '')
  const [address, setAddress] = useState(initial?.address ?? '')
  const [venueType, setVenueType] = useState(initial?.venue_type ?? 'pub')
  const [genres, setGenres] = useState<string[]>(initial?.genres ?? [])
  const [description, setDescription] = useState(initial?.description ?? '')
  const [phone, setPhone] = useState(initial?.phone ?? '')
  const [email, setEmail] = useState(initial?.email ?? '')
  const [verified, setVerified] = useState(initial?.verified ?? false)
  const [pricePerHour, setPricePerHour] = useState(initial?.price_per_hour?.toString() ?? '')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const isStudio = venueType === 'studio' || venueType === 'dance_studio'

  async function handleSave() {
    if (!name || !city) { setError('Ad ve şehir zorunludur.'); return }
    setLoading(true); setError('')
    const data = {
      name, city, district: district || null, address: address || '',
      venue_type: venueType, genres,
      description: description || null,
      phone: phone || null, email: email || null, verified,
      price_per_hour: pricePerHour ? parseFloat(pricePerHour) : null,
    }
    const res = initial?.id
      ? await adminUpdateVenue(initial.id, data)
      : await adminCreateVenue(data)
    setLoading(false)
    if (!res.success) { setError(res.error ?? 'Hata'); return }
    onSaved()
  }

  return (
    <BottomSheet open={open} onClose={onClose} title={initial?.id ? 'Mekan Düzenle' : 'Mekan Ekle'}>
      <div className="space-y-3">
        <div>
          <label className="label">Ad *</label>
          <input value={name} onChange={(e) => setName(e.target.value)} className="input-field text-sm" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Şehir *</label>
            <select value={city} onChange={(e) => setCity(e.target.value)} className="input-field text-sm">
              <option value="">Seç</option>
              {CITY_OPTIONS.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Bölge</label>
            <input value={district} onChange={(e) => setDistrict(e.target.value)} className="input-field text-sm" />
          </div>
        </div>
        <div>
          <label className="label">Adres</label>
          <input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Sokak, bina no..." className="input-field text-sm" />
        </div>
        <div>
          <label className="label">Mekan Türü</label>
          <select value={venueType} onChange={(e) => setVenueType(e.target.value)} className="input-field text-sm">
            {VENUE_TYPES.map(([key, label]) => <option key={key} value={key}>{label}</option>)}
          </select>
        </div>
        <TabbedGenreSelector
          label="Müzik Türleri"
          selected={genres}
          onToggle={(g) => setGenres(genres.includes(g) ? genres.filter(x => x !== g) : [...genres, g])}
        />
        <div>
          <label className="label">Açıklama</label>
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} className="input-field text-sm resize-none" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Telefon</label>
            <input value={phone} onChange={(e) => setPhone(e.target.value)} className="input-field text-sm" />
          </div>
          <div>
            <label className="label">E-posta</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="input-field text-sm" />
          </div>
        </div>
        {isStudio && (
          <div>
            <label className="label">Saatlik Ücret (₺)</label>
            <input type="number" value={pricePerHour} onChange={(e) => setPricePerHour(e.target.value)} placeholder="500" min="0" className="input-field text-sm" />
          </div>
        )}
        <div className="flex items-center justify-between py-2 border-t border-[rgba(228,224,216,0.1)]">
          <p className="text-sm text-text-muted">Onaylı Mekan</p>
          <button type="button" onClick={() => setVerified(!verified)}
            className={cn('relative w-11 h-6 rounded-full transition-colors', verified ? 'bg-accent' : 'bg-[rgba(228,224,216,0.15)]')}>
            <span className={cn('absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition-transform', verified ? 'translate-x-5' : 'translate-x-0')} />
          </button>
        </div>
        {error && <p className="text-red-400 text-xs">{error}</p>}
        <button onClick={handleSave} disabled={loading} className="btn-accent w-full py-3 text-sm disabled:opacity-50">
          {loading ? 'Kaydediliyor...' : 'Kaydet'}
        </button>
      </div>
    </BottomSheet>
  )
}

function SlotForm({ venueId, venueName, onClose }: { venueId: string | null; venueName: string; onClose: () => void }) {
  const locale = useLocale()
  const dayNames = getDayNames(locale)
  const [slot, setSlot] = useState({
    day_of_week: 5,
    start_time: '21:00',
    end_time: '23:00',
    recurrence: 'weekly',
    fee_model: 'free',
    fee_value: '',
    notes: '',
    event_type: '',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSave() {
    if (!venueId) return
    setLoading(true); setError('')
    try {
      const res = await createSlot(venueId, {
        day_of_week: slot.day_of_week,
        start_time: slot.start_time + ':00',
        end_time: slot.end_time + ':00',
        recurrence: slot.recurrence,
        fee_model: slot.fee_model,
        fee_value: slot.fee_value ? parseFloat(slot.fee_value) : null,
        notes: slot.notes || null,
        event_type: slot.event_type || null,
      })
      if (!res.success) { setError(res.error ?? 'Hata'); return }
      setSlot({ day_of_week: 5, start_time: '21:00', end_time: '23:00', recurrence: 'weekly', fee_model: 'free', fee_value: '', notes: '', event_type: '' })
      onClose()
    } catch (e: any) {
      setError(e?.message ?? 'Beklenmeyen hata')
    } finally {
      setLoading(false)
    }
  }

  return (
    <BottomSheet open={!!venueId} onClose={onClose} title={`Slot Ekle — ${venueName}`}>
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Gün</label>
            <select value={slot.day_of_week} onChange={(e) => setSlot({ ...slot, day_of_week: parseInt(e.target.value) })} className="input-field text-sm">
              {dayNames.map((d, i) => <option key={i} value={i}>{d}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Tekrar</label>
            <select value={slot.recurrence} onChange={(e) => setSlot({ ...slot, recurrence: e.target.value })} className="input-field text-sm">
              <option value="weekly">Haftalık</option>
              <option value="biweekly">2 Haftada Bir</option>
              <option value="once">Tek Sefer</option>
            </select>
          </div>
          <div>
            <label className="label">Başlangıç</label>
            <input type="time" value={slot.start_time} onChange={(e) => setSlot({ ...slot, start_time: e.target.value })} className="input-field text-sm" />
          </div>
          <div>
            <label className="label">Bitiş</label>
            <input type="time" value={slot.end_time} onChange={(e) => setSlot({ ...slot, end_time: e.target.value })} className="input-field text-sm" />
          </div>
          <div>
            <label className="label">Ücret Modeli</label>
            <select value={slot.fee_model} onChange={(e) => setSlot({ ...slot, fee_model: e.target.value })} className="input-field text-sm">
              <option value="free">Ücretsiz</option>
              <option value="door_share">Kapı Paylaşımı</option>
              <option value="guarantee">Garanti</option>
              <option value="negotiable">Pazarlığa Açık</option>
            </select>
          </div>
          <div>
            <label className="label">Tutar (₺)</label>
            <input type="number" value={slot.fee_value} onChange={(e) => setSlot({ ...slot, fee_value: e.target.value })} placeholder="0" className="input-field text-sm" />
          </div>
        </div>
        <div>
          <label className="label">Etkinlik Türü</label>
          <select value={slot.event_type} onChange={(e) => setSlot({ ...slot, event_type: e.target.value })} className="input-field text-sm">
            <option value="">Seçin</option>
            <optgroup label="Müzik">{MUSIC_GENRES.map(t => <option key={t} value={t}>{t}</option>)}</optgroup>
            <optgroup label="Sahne">{STAGE_GENRES.map(t => <option key={t} value={t}>{t}</option>)}</optgroup>
          </select>
        </div>
        <div>
          <label className="label">Notlar</label>
          <input value={slot.notes} onChange={(e) => setSlot({ ...slot, notes: e.target.value })} placeholder="Özel koşullar..." className="input-field text-sm" />
        </div>
        {error && <p className="text-red-400 text-xs">{error}</p>}
        <button onClick={handleSave} disabled={loading} className="btn-accent w-full py-3 text-sm disabled:opacity-50">
          {loading ? 'Ekleniyor...' : 'Slot Ekle'}
        </button>
      </div>
    </BottomSheet>
  )
}

// ─── BANDS TAB ─────────────────────────────────────────────────────────────

function BandsTab({ bands, onRefresh }: { bands: any[]; onRefresh: () => void }) {
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<any>(null)
  const [newKey, setNewKey] = useState(0)
  const [deleting, setDeleting] = useState<string | null>(null)

  async function handleDelete(id: string) {
    if (!confirm('Bu grubu silmek istediğinizden emin misiniz?')) return
    setDeleting(id)
    await adminDeleteBand(id)
    onRefresh()
    setDeleting(null)
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="text-text-muted text-sm">{bands.length} grup</p>
        <button onClick={() => { setEditing(null); setNewKey(k => k + 1); setFormOpen(true) }}
          className="btn-accent py-2 px-4 text-sm flex items-center gap-2">
          <Plus size={14} /> Grup Ekle
        </button>
      </div>
      <div className="space-y-2">
        {bands.map((b) => (
          <div key={b.id} className="card p-3 flex items-center gap-3">
            <div className="flex-1 min-w-0">
              <p className="text-text-primary text-sm font-medium truncate">{b.name}</p>
              <p className="text-text-muted text-xs truncate">
                {b.city ?? '—'} · {b.genres?.slice(0, 2).join(', ') || '—'}
              </p>
            </div>
            <div className="flex items-center gap-1 flex-shrink-0">
              <Link href={`/bands/${b.id}`} target="_blank" className="p-1.5 text-text-muted hover:text-text-primary">
                <ExternalLink size={13} />
              </Link>
              <button onClick={() => { setEditing(b); setFormOpen(true) }} className="p-1.5 text-text-muted hover:text-accent">
                <Pencil size={13} />
              </button>
              <button onClick={() => handleDelete(b.id)} disabled={deleting === b.id} className="p-1.5 text-text-muted hover:text-red-400 disabled:opacity-40">
                <Trash2 size={13} />
              </button>
            </div>
          </div>
        ))}
      </div>
      <BandForm key={editing?.id ?? `new-${newKey}`} open={formOpen} onClose={() => setFormOpen(false)} initial={editing} onSaved={() => { setFormOpen(false); onRefresh() }} />
    </div>
  )
}

function BandForm({ open, onClose, initial, onSaved }: any) {
  const [name, setName] = useState(initial?.name ?? '')
  const [city, setCity] = useState(initial?.city ?? '')
  const [bio, setBio] = useState(initial?.bio ?? '')
  const [genres, setGenres] = useState<string[]>(initial?.genres ?? [])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSave() {
    if (!name) { setError('Grup adı zorunludur.'); return }
    setLoading(true); setError('')
    const data = { name, city: city || null, bio: bio || null, genres }
    const res = initial?.id
      ? await adminUpdateBand(initial.id, data)
      : await adminCreateBand(data)
    setLoading(false)
    if (!res.success) { setError(res.error ?? 'Hata'); return }
    onSaved()
  }

  return (
    <BottomSheet open={open} onClose={onClose} title={initial?.id ? 'Grup Düzenle' : 'Grup Ekle'}>
      <div className="space-y-3">
        <div>
          <label className="label">Grup Adı *</label>
          <input value={name} onChange={(e) => setName(e.target.value)} className="input-field text-sm" />
        </div>
        <div>
          <label className="label">Şehir</label>
          <select value={city} onChange={(e) => setCity(e.target.value)} className="input-field text-sm">
            <option value="">Seç</option>
            {CITY_OPTIONS.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div>
          <label className="label">Bio</label>
          <textarea value={bio} onChange={(e) => setBio(e.target.value)} rows={3} className="input-field text-sm resize-none" />
        </div>
        <TabbedGenreSelector
          label="Müzik Türleri"
          selected={genres}
          onToggle={(g) => setGenres(genres.includes(g) ? genres.filter(x => x !== g) : [...genres, g])}
        />
        {error && <p className="text-red-400 text-xs">{error}</p>}
        <button onClick={handleSave} disabled={loading} className="btn-accent w-full py-3 text-sm disabled:opacity-50">
          {loading ? 'Kaydediliyor...' : 'Kaydet'}
        </button>
      </div>
    </BottomSheet>
  )
}

// ─── MEMBERS TAB ───────────────────────────────────────────────────────────

function MembersTab({ members, onRefresh }: { members: any[]; onRefresh: () => void }) {
  const [deleting, setDeleting] = useState<string | null>(null)

  async function handleDelete(id: string) {
    if (!confirm('Bu üyeyi silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.')) return
    setDeleting(id)
    await adminDeleteMember(id)
    onRefresh()
    setDeleting(null)
  }

  return (
    <div>
      <p className="text-text-muted text-sm mb-4">{members.length} üye</p>
      <div className="space-y-2">
        {members.map((m) => (
          <div key={m.id} className="card p-3 flex items-center gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="text-text-primary text-sm font-medium truncate">{m.display_name || '—'}</p>
                {m.is_moderator && (
                  <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-accent/20 text-accent flex-shrink-0">MOD</span>
                )}
              </div>
              <p className="text-text-muted text-xs truncate">
                {m.role} · {m.city ?? '—'} · {new Date(m.created_at).toLocaleDateString('tr-TR')}
              </p>
            </div>
            <button onClick={() => handleDelete(m.id)} disabled={deleting === m.id}
              className="p-1.5 text-text-muted hover:text-red-400 disabled:opacity-40 flex-shrink-0">
              <Trash2 size={13} />
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}

function PermissionsTab({ members, onRefresh }: { members: any[]; onRefresh: () => void }) {
  const [search, setSearch] = useState('')
  const [toggling, setToggling] = useState<string | null>(null)
  const [localMembers, setLocalMembers] = useState<any[]>(members)

  const moderators = localMembers.filter(m => m.is_moderator)
  const filtered = search.trim().length > 1
    ? localMembers.filter(m =>
        !m.is_moderator &&
        (m.display_name?.toLowerCase().includes(search.toLowerCase()) ||
         m.city?.toLowerCase().includes(search.toLowerCase()))
      )
    : []

  async function handleToggle(id: string, current: boolean) {
    setToggling(id)
    await adminToggleModerator(id, !current)
    setLocalMembers(prev => prev.map(m => m.id === id ? { ...m, is_moderator: !current } : m))
    setToggling(null)
  }

  return (
    <div className="space-y-6">
      {/* Mevcut moderatörler */}
      <div>
        <h3 className="text-sm font-semibold text-text-primary mb-3">
          Moderatörler ({moderators.length})
        </h3>
        {moderators.length === 0 ? (
          <p className="text-text-muted text-sm">Henüz moderatör yok.</p>
        ) : (
          <div className="space-y-2">
            {moderators.map(m => (
              <div key={m.id} className="card p-3 flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-text-primary text-sm font-medium">{m.display_name || '—'}</p>
                    <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-accent/20 text-accent">MOD</span>
                  </div>
                  <p className="text-text-muted text-xs">{m.city ?? '—'}</p>
                </div>
                <button
                  onClick={() => handleToggle(m.id, true)}
                  disabled={toggling === m.id}
                  className="text-xs px-3 py-1.5 rounded font-medium bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors disabled:opacity-40"
                >
                  {toggling === m.id ? '...' : 'Yetkiyi Kaldır'}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Kullanıcı ara & moderatör yap */}
      <div>
        <h3 className="text-sm font-semibold text-text-primary mb-3">Moderatör Ekle</h3>
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="İsim veya şehir ile ara..."
          className="input-field text-sm mb-3"
        />
        {search.trim().length > 1 && filtered.length === 0 && (
          <p className="text-text-muted text-sm">Sonuç bulunamadı.</p>
        )}
        <div className="space-y-2">
          {filtered.map(m => (
            <div key={m.id} className="card p-3 flex items-center gap-3">
              <div className="flex-1 min-w-0">
                <p className="text-text-primary text-sm font-medium">{m.display_name || '—'}</p>
                <p className="text-text-muted text-xs">{m.city ?? '—'} · {new Date(m.created_at).toLocaleDateString('tr-TR')}</p>
              </div>
              <button
                onClick={() => handleToggle(m.id, false)}
                disabled={toggling === m.id}
                className="text-xs px-3 py-1.5 rounded font-medium bg-accent/10 text-accent hover:bg-accent/20 transition-colors disabled:opacity-40"
              >
                {toggling === m.id ? '...' : 'Moderatör Yap'}
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ── Türler & Enstrümanlar ─────────────────────────────────────────────────────

function ListsTab({ configs }: { configs: { music_genres: string[]; stage_genres: string[]; instruments: string[] } }) {
  return (
    <div className="space-y-8">
      <ListEditor title="Müzik Türleri"  configKey="music_genres"  initialItems={configs.music_genres} />
      <ListEditor title="Sahne Türleri"  configKey="stage_genres"  initialItems={configs.stage_genres} />
      <ListEditor title="Enstrümanlar"   configKey="instruments"   initialItems={configs.instruments} />
    </div>
  )
}

function SortableChip({
  id,
  onRemove,
}: {
  id: string
  onRemove: () => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 50 : undefined,
  }

  return (
    <span
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-1.5 pl-2 pr-1.5 py-1 rounded-lg bg-[rgba(228,224,216,0.07)] border border-[rgba(228,224,216,0.12)] text-text-primary text-sm select-none"
    >
      {/* drag handle */}
      <span
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing text-text-muted hover:text-text-primary touch-none px-0.5"
        title="Sürükle"
      >
        ⠿
      </span>
      {id}
      <button
        onClick={onRemove}
        className="w-5 h-5 rounded flex items-center justify-center text-text-muted hover:text-red-400 hover:bg-red-400/10 transition-colors"
      >
        <X size={12} />
      </button>
    </span>
  )
}

function ListEditor({
  title,
  configKey,
  initialItems,
}: {
  title: string
  configKey: ListConfigKey
  initialItems: string[]
}) {
  const [items, setItems] = useState(initialItems)
  const [input, setInput] = useState('')
  const [saving, setSaving] = useState(false)
  const [savedMsg, setSavedMsg] = useState('')
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  )

  async function save(next: string[]) {
    setSaving(true)
    setSavedMsg('')
    if (saveTimer.current) clearTimeout(saveTimer.current)
    const res = await updateListConfig(configKey, next)
    setSaving(false)
    setSavedMsg(res.success ? '✓ Kaydedildi' : (res.error ?? 'Hata'))
    saveTimer.current = setTimeout(() => setSavedMsg(''), 2500)
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const oldIndex = items.indexOf(active.id as string)
    const newIndex = items.indexOf(over.id as string)
    const next = arrayMove(items, oldIndex, newIndex)
    setItems(next)
    save(next)
  }

  async function add() {
    const val = input.trim()
    if (!val || items.includes(val)) return
    const next = [...items, val]
    setItems(next)
    setInput('')
    await save(next)
  }

  async function remove(item: string) {
    const next = items.filter(i => i !== item)
    setItems(next)
    await save(next)
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-text-primary">{title}</h3>
        <span className={cn(
          'text-xs transition-colors',
          saving ? 'text-text-muted' : savedMsg.startsWith('✓') ? 'text-success' : savedMsg ? 'text-red-400' : '',
        )}>
          {saving ? 'Kaydediliyor...' : savedMsg}
        </span>
      </div>

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={items} strategy={horizontalListSortingStrategy}>
          <div className="flex flex-wrap gap-2 mb-3 min-h-[2.5rem]">
            {items.map(item => (
              <SortableChip key={item} id={item} onRemove={() => remove(item)} />
            ))}
          </div>
        </SortableContext>
      </DndContext>

      <div className="flex gap-2">
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); add() } }}
          placeholder="Yeni ekle..."
          className="input-field text-sm flex-1"
        />
        <button
          onClick={add}
          disabled={!input.trim() || items.includes(input.trim())}
          className="btn-accent px-4 py-2 text-sm disabled:opacity-40 flex items-center gap-1.5"
        >
          <Plus size={14} />
          Ekle
        </button>
      </div>
      {input.trim() && items.includes(input.trim()) && (
        <p className="text-xs text-text-muted mt-1">Bu değer zaten listede mevcut.</p>
      )}
    </div>
  )
}

// ─── PREMIUM TAB ──────────────────────────────────────────────────────────────

function PremiumTab({ featureFlags, members, onRefresh }: { featureFlags: any[]; members: any[]; onRefresh: () => void }) {
  const [acting, setActing] = useState<string | null>(null)
  const [flags, setFlags] = useState<any[]>(featureFlags)
  const [localMembers, setLocalMembers] = useState<any[]>(members)

  async function handleToggleFlag(key: string, current: boolean) {
    setActing(key)
    const result = await toggleFeatureFlag(key, !current)
    if (result.success) {
      setFlags(prev => prev.map(f => f.key === key ? { ...f, enabled: !current } : f))
    }
    setActing(null)
  }

  async function handleTogglePremium(profileId: string, current: boolean) {
    setActing(profileId + '_premium')
    await toggleUserPremium(profileId, !current)
    setLocalMembers(prev => prev.map(m =>
      m.id === profileId ? { ...m, is_premium: !current } : m
    ))
    setActing(null)
  }

  async function handleToggleFounding(profileId: string, current: boolean) {
    setActing(profileId + '_founding')
    await toggleFoundingMember(profileId, !current)
    setLocalMembers(prev => prev.map(m =>
      m.id === profileId
        ? { ...m, is_founding_member: !current, is_premium: !current ? true : m.is_premium }
        : m
    ))
    setActing(null)
  }

  const FLAG_LABELS: Record<string, string> = {
    messaging_premium_required: 'Mesajlaşma — sadece premium üyeler',
  }

  return (
    <div className="space-y-6">
      {/* Feature flags */}
      <div>
        <h3 className="label mb-3">Özellik Bayrakları</h3>
        <div className="space-y-2">
          {flags.length === 0 && <p className="text-text-muted text-sm">Bayrak bulunamadı.</p>}
          {flags.map((flag) => (
            <div key={flag.key} className="card p-4 flex items-center justify-between gap-3">
              <div>
                <p className="text-text-primary text-sm font-medium">{FLAG_LABELS[flag.key] ?? flag.key}</p>
                {flag.description && <p className="text-text-muted text-xs mt-0.5">{flag.description}</p>}
              </div>
              <button
                onClick={() => handleToggleFlag(flag.key, flag.enabled)}
                disabled={acting === flag.key}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors',
                  flag.enabled
                    ? 'bg-accent/15 text-accent border-accent/30 hover:bg-accent/25'
                    : 'bg-[rgba(228,224,216,0.06)] text-text-muted border-[rgba(228,224,216,0.12)] hover:text-text-primary'
                )}
              >
                {flag.enabled ? <Lock size={12} /> : <Unlock size={12} />}
                {flag.enabled ? 'Aktif' : 'Pasif'}
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Member premium & founding status */}
      <div>
        <h3 className="label mb-1">Üye Durumu</h3>
        <p className="text-text-muted text-xs mb-3">
          Kurucu üye rozeti verilince premium otomatik aktif olur.
        </p>
        <div className="space-y-1">
          {localMembers.map((m: any) => (
            <div key={m.id} className="card p-3 flex items-center gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-text-primary text-sm">{m.display_name}</p>
                  {m.is_founding_member && (
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-amber-400/15 border border-amber-400/30 text-amber-400 text-[10px] font-semibold">
                      <Star size={8} className="fill-amber-400" />
                      Kurucu
                    </span>
                  )}
                  {m.is_premium && !m.is_founding_member && (
                    <span className="text-[10px] text-yellow-400 bg-yellow-400/10 border border-yellow-400/20 px-1.5 py-0.5 rounded-full">
                      Premium
                    </span>
                  )}
                </div>
                <p className="text-text-muted text-xs">{m.role} · {m.city ?? '—'}</p>
              </div>

              <div className="flex items-center gap-1.5 flex-shrink-0">
                {/* Founding member toggle */}
                <button
                  onClick={() => handleToggleFounding(m.id, m.is_founding_member ?? false)}
                  disabled={acting === m.id + '_founding'}
                  title={m.is_founding_member ? 'Kurucu üyeliği kaldır' : 'Kurucu üye yap'}
                  className={cn(
                    'flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold border transition-colors',
                    m.is_founding_member
                      ? 'bg-amber-400/15 text-amber-400 border-amber-400/30 hover:bg-amber-400/25'
                      : 'bg-[rgba(228,224,216,0.06)] text-text-muted border-[rgba(228,224,216,0.1)] hover:border-amber-400/30 hover:text-amber-400'
                  )}
                >
                  <Star size={10} className={m.is_founding_member ? 'fill-amber-400' : ''} />
                  Kurucu
                </button>

                {/* Premium-only toggle */}
                <button
                  onClick={() => handleTogglePremium(m.id, m.is_premium ?? false)}
                  disabled={acting === m.id + '_premium' || m.is_founding_member}
                  title={m.is_founding_member ? 'Kurucu üyeler zaten premium' : (m.is_premium ? 'Premiumu kaldır' : 'Premium yap')}
                  className={cn(
                    'flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium border transition-colors',
                    m.is_premium
                      ? 'bg-yellow-400/10 text-yellow-400 border-yellow-400/20 hover:bg-yellow-400/20'
                      : 'bg-[rgba(228,224,216,0.06)] text-text-muted border-[rgba(228,224,216,0.1)] hover:text-text-primary',
                    m.is_founding_member && 'opacity-50 cursor-not-allowed'
                  )}
                >
                  {m.is_premium ? '★' : '○'} Premium
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ─── CONVERSATIONS TAB ────────────────────────────────────────────────────────

function ConversationsTab({ conversations, onRefresh }: { conversations: any[]; onRefresh: () => void }) {
  const [acting, setActing] = useState<string | null>(null)
  const [blockReason, setBlockReason] = useState<Record<string, string>>({})
  const [localConvs, setLocalConvs] = useState<any[]>(conversations)

  async function handleBlock(id: string) {
    const reason = blockReason[id] ?? ''
    setActing(id)
    const result = await adminBlockConversation(id, reason)
    if (result.success) {
      setLocalConvs(prev => prev.map(c =>
        c.id === id ? { ...c, is_blocked: true, blocked_reason: reason || 'Yönetici kararıyla kilitlendi.' } : c
      ))
      setBlockReason(prev => ({ ...prev, [id]: '' }))
    }
    setActing(null)
  }

  async function handleUnblock(id: string) {
    setActing(id)
    const result = await adminUnblockConversation(id)
    if (result.success) {
      setLocalConvs(prev => prev.map(c =>
        c.id === id ? { ...c, is_blocked: false, blocked_reason: null } : c
      ))
    }
    setActing(null)
  }

  async function handleDelete(id: string, name: string) {
    if (!confirm(`"${name}" sohbetini ve tüm mesajlarını silmek istediğinizden emin misiniz?`)) return
    setActing(id)
    const result = await adminDeleteConversation(id)
    if (result.success) {
      setLocalConvs(prev => prev.filter(c => c.id !== id))
    }
    setActing(null)
  }

  const TYPE_LABEL: Record<string, string> = { band: 'Grup', event: 'Etkinlik' }

  return (
    <div className="space-y-2">
      {localConvs.length === 0 && (
        <p className="text-text-muted text-sm text-center py-8">Henüz sohbet yok.</p>
      )}
      {localConvs.map((conv) => (
        <div key={conv.id} className={cn('card p-4 space-y-3', conv.is_blocked && 'border-red-500/20 bg-red-500/5')}>
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[10px] text-text-muted bg-surface px-1.5 py-0.5 rounded border border-[rgba(228,224,216,0.12)]">
                  {TYPE_LABEL[conv.type] ?? conv.type}
                </span>
                <p className="text-text-primary text-sm font-medium truncate">{conv.contextName}</p>
                {conv.is_blocked && (
                  <span className="text-[10px] text-red-400 bg-red-500/10 border border-red-500/20 px-1.5 py-0.5 rounded-full font-semibold">
                    Kilitli
                  </span>
                )}
              </div>
              <p className="text-text-muted text-xs mt-0.5">
                {conv.msgCount} mesaj · Son: {new Date(conv.last_message_at).toLocaleDateString('tr-TR')}
              </p>
              {conv.is_blocked && conv.blocked_reason && (
                <p className="text-red-400/80 text-xs mt-1 italic">"{conv.blocked_reason}"</p>
              )}
            </div>

            <div className="flex items-center gap-1.5 flex-shrink-0">
              {/* Katıl */}
              <a
                href={`/messages/${conv.id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium border border-[rgba(228,224,216,0.12)] text-text-muted hover:text-text-primary hover:border-accent/30 transition-colors"
              >
                <ExternalLink size={10} />
                Katıl
              </a>

              {/* Blokla / Aç */}
              {conv.is_blocked ? (
                <button
                  onClick={() => handleUnblock(conv.id)}
                  disabled={acting === conv.id}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium border border-green-500/30 text-green-400 bg-green-500/10 hover:bg-green-500/20 transition-colors"
                >
                  <Unlock size={10} />
                  Kilidi Aç
                </button>
              ) : (
                <button
                  onClick={() => handleBlock(conv.id)}
                  disabled={acting === conv.id}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium border border-orange-500/30 text-orange-400 bg-orange-500/10 hover:bg-orange-500/20 transition-colors"
                >
                  <Lock size={10} />
                  Kilitle
                </button>
              )}

              {/* Sil */}
              <button
                onClick={() => handleDelete(conv.id, conv.contextName)}
                disabled={acting === conv.id}
                className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium border border-red-500/30 text-red-400 bg-red-500/10 hover:bg-red-500/20 transition-colors"
              >
                <Trash2 size={10} />
                Sil
              </button>
            </div>
          </div>

          {/* Kilitleme neden kutusu */}
          {!conv.is_blocked && (
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={blockReason[conv.id] ?? ''}
                onChange={e => setBlockReason(prev => ({ ...prev, [conv.id]: e.target.value }))}
                placeholder="Kilitleme nedeni (isteğe bağlı)"
                className="flex-1 bg-surface border border-[rgba(228,224,216,0.1)] rounded-lg px-3 py-1.5 text-xs text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent/30"
              />
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
