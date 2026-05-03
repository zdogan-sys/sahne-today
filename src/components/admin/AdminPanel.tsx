'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { BottomSheet } from '@/components/ui/BottomSheet'
import { cn } from '@/lib/utils'
import { Trash2, Pencil, Plus, ExternalLink } from 'lucide-react'
import Link from 'next/link'
import {
  adminCreateEvent, adminUpdateEvent, adminDeleteEvent,
  adminCreateArtist, adminUpdateArtist, adminDeleteArtist,
  adminCreateVenue, adminUpdateVenue, adminDeleteVenue,
  adminDeleteMember,
} from '@/app/actions/admin'
import { ALL_GENRES, CITY_OPTIONS, INSTRUMENT_OPTIONS } from '@/lib/constants'
import { VENUE_TYPE_LABELS } from '@/lib/utils'

type Tab = 'events' | 'artists' | 'venues' | 'members'

const TABS: { key: Tab; label: string }[] = [
  { key: 'events', label: 'Etkinlikler' },
  { key: 'artists', label: 'Sanatçılar' },
  { key: 'venues', label: 'Mekanlar' },
  { key: 'members', label: 'Üyeler' },
]

const VENUE_TYPES = Object.entries(VENUE_TYPE_LABELS)
const EVENT_STATUSES = ['confirmed', 'pending', 'cancelled']
const ENTRY_TYPES = ['free', 'paid', 'door']

interface Props {
  events: any[]
  artists: any[]
  venues: any[]
  members: any[]
}

export function AdminPanel({ events, artists, venues, members }: Props) {
  const [tab, setTab] = useState<Tab>('events')
  const router = useRouter()

  function refresh() { router.refresh() }

  return (
    <div>
      {/* Stats */}
      <div className="grid grid-cols-4 gap-3 mb-6">
        {[
          { label: 'Etkinlik', count: events.length },
          { label: 'Sanatçı', count: artists.length },
          { label: 'Mekan', count: venues.length },
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

      {tab === 'events' && <EventsTab events={events} venues={venues} artists={artists} onRefresh={refresh} />}
      {tab === 'artists' && <ArtistsTab artists={artists} onRefresh={refresh} />}
      {tab === 'venues' && <VenuesTab venues={venues} onRefresh={refresh} />}
      {tab === 'members' && <MembersTab members={members} onRefresh={refresh} />}
    </div>
  )
}

// ─── EVENTS TAB ────────────────────────────────────────────────────────────

function EventsTab({ events, venues, artists, onRefresh }: { events: any[]; venues: any[]; artists: any[]; onRefresh: () => void }) {
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<any>(null)
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
        <button onClick={() => { setEditing(null); setFormOpen(true) }}
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
        open={formOpen}
        onClose={() => setFormOpen(false)}
        initial={editing}
        venues={venues}
        artists={artists}
        onSaved={() => { setFormOpen(false); onRefresh() }}
      />
    </div>
  )
}

function EventForm({ open, onClose, initial, venues, artists, onSaved }: any) {
  const [title, setTitle] = useState(initial?.title ?? '')
  const [venueId, setVenueId] = useState(initial?.venue_id ?? '')
  const [venueName, setVenueName] = useState(initial?.venue_name ?? '')
  const [artistId, setArtistId] = useState(initial?.artist_id ?? '')
  const [eventDate, setEventDate] = useState(initial?.event_date ?? '')
  const [startTime, setStartTime] = useState(initial?.start_time?.substring(0, 5) ?? '')
  const [genre, setGenre] = useState(initial?.genre ?? '')
  const [entryType, setEntryType] = useState(initial?.entry_type ?? 'free')
  const [entryFee, setEntryFee] = useState(initial?.entry_fee?.toString() ?? '')
  const [status, setStatus] = useState(initial?.status ?? 'confirmed')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // reset when opening for new
  useState(() => {
    if (open) {
      setTitle(initial?.title ?? '')
      setVenueId(initial?.venue_id ?? '')
      setVenueName(initial?.venue_name ?? '')
      setArtistId(initial?.artist_id ?? '')
      setEventDate(initial?.event_date ?? '')
      setStartTime(initial?.start_time?.substring(0, 5) ?? '')
      setGenre(initial?.genre ?? '')
      setEntryType(initial?.entry_type ?? 'free')
      setEntryFee(initial?.entry_fee?.toString() ?? '')
      setStatus(initial?.status ?? 'confirmed')
      setError('')
    }
  })

  async function handleSave() {
    if (!title || !eventDate) { setError('Başlık ve tarih zorunludur.'); return }
    setLoading(true); setError('')
    const data = {
      title,
      venue_id: venueId || null,
      venue_name: venueName || null,
      artist_id: artistId || null,
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
        <div>
          <label className="label">Mekan</label>
          <select value={venueId} onChange={(e) => setVenueId(e.target.value)} className="input-field text-sm">
            <option value="">Seç veya aşağıya yaz</option>
            {venues.map((v: any) => <option key={v.id} value={v.id}>{v.name} — {v.city}</option>)}
          </select>
        </div>
        <div>
          <label className="label">Mekan Adı (serbest)</label>
          <input value={venueName} onChange={(e) => setVenueName(e.target.value)} className="input-field text-sm" placeholder="Mekan listede yoksa buraya yaz" />
        </div>
        <div>
          <label className="label">Sanatçı</label>
          <select value={artistId} onChange={(e) => setArtistId(e.target.value)} className="input-field text-sm">
            <option value="">Seç (opsiyonel)</option>
            {artists.map((a: any) => <option key={a.id} value={a.id}>{a.stage_name}</option>)}
          </select>
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
      </div>
    </BottomSheet>
  )
}

// ─── ARTISTS TAB ───────────────────────────────────────────────────────────

function ArtistsTab({ artists, onRefresh }: { artists: any[]; onRefresh: () => void }) {
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<any>(null)
  const [deleting, setDeleting] = useState<string | null>(null)

  async function handleDelete(id: string) {
    if (!confirm('Bu sanatçıyı silmek istediğinizden emin misiniz?')) return
    setDeleting(id)
    await adminDeleteArtist(id)
    onRefresh()
    setDeleting(null)
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="text-text-muted text-sm">{artists.length} sanatçı</p>
        <button onClick={() => { setEditing(null); setFormOpen(true) }}
          className="btn-accent py-2 px-4 text-sm flex items-center gap-2">
          <Plus size={14} /> Sanatçı Ekle
        </button>
      </div>
      <div className="space-y-2">
        {artists.map((a) => (
          <div key={a.id} className="card p-3 flex items-center gap-3">
            <div className="flex-1 min-w-0">
              <p className="text-text-primary text-sm font-medium truncate">{a.stage_name}</p>
              <p className="text-text-muted text-xs truncate">
                {a.city ?? '—'} · {a.genres?.slice(0, 2).join(', ') || '—'}
                {a.is_hidden ? ' · 🙈 Gizli' : ''}
              </p>
            </div>
            <div className="flex items-center gap-1 flex-shrink-0">
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
        ))}
      </div>
      <ArtistForm open={formOpen} onClose={() => setFormOpen(false)} initial={editing} onSaved={() => { setFormOpen(false); onRefresh() }} />
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
  const [deleting, setDeleting] = useState<string | null>(null)

  async function handleDelete(id: string) {
    if (!confirm('Bu mekanı silmek istediğinizden emin misiniz?')) return
    setDeleting(id)
    await adminDeleteVenue(id)
    onRefresh()
    setDeleting(null)
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="text-text-muted text-sm">{venues.length} mekan</p>
        <button onClick={() => { setEditing(null); setFormOpen(true) }}
          className="btn-accent py-2 px-4 text-sm flex items-center gap-2">
          <Plus size={14} /> Mekan Ekle
        </button>
      </div>
      <div className="space-y-2">
        {venues.map((v) => (
          <div key={v.id} className="card p-3 flex items-center gap-3">
            <div className="flex-1 min-w-0">
              <p className="text-text-primary text-sm font-medium truncate">{v.name}</p>
              <p className="text-text-muted text-xs truncate">
                {v.district ? `${v.district}, ` : ''}{v.city} · {VENUE_TYPE_LABELS[v.venue_type] ?? v.venue_type}
                {v.verified ? ' · ✓ Onaylı' : ''}
              </p>
            </div>
            <div className="flex items-center gap-1 flex-shrink-0">
              <Link href={`/venues/${v.id}`} target="_blank" className="p-1.5 text-text-muted hover:text-text-primary">
                <ExternalLink size={13} />
              </Link>
              <button onClick={() => { setEditing(v); setFormOpen(true) }} className="p-1.5 text-text-muted hover:text-accent">
                <Pencil size={13} />
              </button>
              <button onClick={() => handleDelete(v.id)} disabled={deleting === v.id} className="p-1.5 text-text-muted hover:text-red-400 disabled:opacity-40">
                <Trash2 size={13} />
              </button>
            </div>
          </div>
        ))}
      </div>
      <VenueForm open={formOpen} onClose={() => setFormOpen(false)} initial={editing} onSaved={() => { setFormOpen(false); onRefresh() }} />
    </div>
  )
}

function VenueForm({ open, onClose, initial, onSaved }: any) {
  const [name, setName] = useState(initial?.name ?? '')
  const [city, setCity] = useState(initial?.city ?? '')
  const [district, setDistrict] = useState(initial?.district ?? '')
  const [venueType, setVenueType] = useState(initial?.venue_type ?? 'pub')
  const [description, setDescription] = useState(initial?.description ?? '')
  const [phone, setPhone] = useState(initial?.phone ?? '')
  const [email, setEmail] = useState(initial?.email ?? '')
  const [verified, setVerified] = useState(initial?.verified ?? false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSave() {
    if (!name || !city) { setError('Ad ve şehir zorunludur.'); return }
    setLoading(true); setError('')
    const data = {
      name, city, district: district || null, venue_type: venueType,
      description: description || null, phone: phone || null,
      email: email || null, verified,
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
            <label className="label">İlçe</label>
            <input value={district} onChange={(e) => setDistrict(e.target.value)} className="input-field text-sm" />
          </div>
        </div>
        <div>
          <label className="label">Mekan Türü</label>
          <select value={venueType} onChange={(e) => setVenueType(e.target.value)} className="input-field text-sm">
            {VENUE_TYPES.map(([key, label]) => <option key={key} value={key}>{label}</option>)}
          </select>
        </div>
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
              <p className="text-text-primary text-sm font-medium truncate">{m.display_name || '—'}</p>
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
