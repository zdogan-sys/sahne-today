'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { GenreChip } from '@/components/ui/GenreChip'
import { formatDate } from '@/lib/utils'
import { cn } from '@/lib/utils'
import { addVenueEvent, cancelEvent, deleteEvent, updateEventDetails } from '@/app/actions/event'
import { createClient } from '@/lib/supabase/client'
import { Pencil, X, Trash2, Check, Loader2, Music2, Users, Ban, Plus } from 'lucide-react'

interface EventItem {
  id: string
  title: string
  event_date: string
  start_time: string
  end_time: string | null
  genre: string | null
  description: string | null
  status?: string | null
  artists?: { stage_name: string } | null
  bands?: { name: string } | null
}

interface Props {
  upcoming: EventItem[]
  past: EventItem[]
  isOwner?: boolean
  venueId?: string
  venueCity?: string
}

type Tab = 'upcoming' | 'past' | 'add'

function EventRow({ event, isOwner, onUpdated, onRemoved }: {
  event: EventItem
  isOwner: boolean
  onUpdated: (updated: EventItem) => void
  onRemoved: (id: string) => void
}) {
  const [editing, setEditing] = useState(false)
  const [confirmCancel, setConfirmCancel] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [actionLoading, setActionLoading] = useState<'cancel' | 'delete' | null>(null)

  const [editTitle, setEditTitle] = useState(event.title)
  const [editDate, setEditDate] = useState(event.event_date)
  const [editStart, setEditStart] = useState(event.start_time?.slice(0, 5) ?? '')
  const [editEnd, setEditEnd] = useState(event.end_time?.slice(0, 5) ?? '')
  const [editDesc, setEditDesc] = useState(event.description ?? '')
  const [editLoading, setEditLoading] = useState(false)
  const [editError, setEditError] = useState('')

  async function handleCancel() {
    setActionLoading('cancel')
    await cancelEvent(event.id)
    onRemoved(event.id)
    setActionLoading(null)
  }

  async function handleDelete() {
    setActionLoading('delete')
    await deleteEvent(event.id)
    onRemoved(event.id)
    setActionLoading(null)
  }

  async function handleSaveEdit() {
    if (!editTitle.trim() || !editStart) return
    setEditLoading(true)
    setEditError('')
    const res = await updateEventDetails(event.id, {
      title: editTitle.trim(),
      event_date: editDate,
      start_time: editStart,
      end_time: editEnd || null,
      description: editDesc.trim() || null,
    })
    if (res.success) {
      onUpdated({ ...event, title: editTitle.trim(), event_date: editDate, start_time: editStart, end_time: editEnd || null, description: editDesc.trim() || null })
      setEditing(false)
    } else {
      setEditError(res.error ?? 'Güncellenemedi.')
    }
    setEditLoading(false)
  }

  return (
    <div className="card overflow-hidden">
      <div className="p-3 flex items-center gap-2">
        <Link href={`/events/${event.id}`} className="flex-1 min-w-0 group">
          <p className="text-text-primary text-sm font-medium group-hover:text-accent transition-colors truncate">{event.title}</p>
          <p className="text-text-muted text-xs mt-0.5">
            {formatDate(event.event_date)}
            {event.artists?.stage_name ? ` · ${event.artists.stage_name}` : ''}
            {event.bands?.name ? ` · ${event.bands.name}` : ''}
          </p>
        </Link>
        {event.genre && <GenreChip genre={event.genre} />}
        {isOwner && event.status && event.status !== 'confirmed' && (
          <span className={cn('text-[10px] px-1.5 py-0.5 rounded-full border flex-shrink-0',
            event.status === 'offered' ? 'text-yellow-400 border-yellow-400/30 bg-yellow-400/10' : 'text-text-muted border-[rgba(228,224,216,0.15)]'
          )}>
            {event.status === 'offered' ? 'Teklif' : event.status}
          </span>
        )}
        {isOwner && (
          <div className="flex items-center gap-1 flex-shrink-0">
            <button
              onClick={() => { setEditing(e => !e); setConfirmCancel(false); setConfirmDelete(false) }}
              className="w-7 h-7 rounded flex items-center justify-center text-text-muted hover:text-accent hover:bg-accent/10 transition-colors"
              title="Düzenle"
            >
              <Pencil size={13} />
            </button>

            {confirmCancel ? (
              <>
                <button
                  onClick={handleCancel}
                  disabled={!!actionLoading}
                  className="px-2 py-1 rounded text-xs bg-yellow-500/20 text-yellow-400 hover:bg-yellow-500/30 transition-colors"
                >
                  {actionLoading === 'cancel' ? <Loader2 size={11} className="animate-spin" /> : 'İptal Et'}
                </button>
                <button onClick={() => setConfirmCancel(false)} className="w-6 h-6 rounded flex items-center justify-center text-text-muted hover:text-text-primary">
                  <X size={11} />
                </button>
              </>
            ) : (
              <button
                onClick={() => { setConfirmCancel(true); setConfirmDelete(false) }}
                className="w-7 h-7 rounded flex items-center justify-center text-text-muted hover:text-yellow-400 hover:bg-yellow-400/10 transition-colors"
                title="İptal Et"
              >
                <Ban size={13} />
              </button>
            )}

            {confirmDelete ? (
              <>
                <button
                  onClick={handleDelete}
                  disabled={!!actionLoading}
                  className="px-2 py-1 rounded text-xs bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-colors"
                >
                  {actionLoading === 'delete' ? <Loader2 size={11} className="animate-spin" /> : 'Sil'}
                </button>
                <button onClick={() => setConfirmDelete(false)} className="w-6 h-6 rounded flex items-center justify-center text-text-muted hover:text-text-primary">
                  <X size={11} />
                </button>
              </>
            ) : (
              <button
                onClick={() => { setConfirmDelete(true); setConfirmCancel(false) }}
                className="w-7 h-7 rounded flex items-center justify-center text-text-muted hover:text-red-400 hover:bg-red-400/10 transition-colors"
                title="Sil"
              >
                <Trash2 size={13} />
              </button>
            )}
          </div>
        )}
      </div>

      {editing && isOwner && (
        <div className="border-t border-[rgba(228,224,216,0.08)] p-3 space-y-2 bg-[rgba(228,224,216,0.02)]">
          <div className="grid grid-cols-2 gap-2">
            <div className="col-span-2">
              <label className="label">Başlık</label>
              <input value={editTitle} onChange={e => setEditTitle(e.target.value)} className="input-field text-sm" />
            </div>
            <div>
              <label className="label">Tarih</label>
              <input type="date" value={editDate} onChange={e => setEditDate(e.target.value)} className="input-field text-sm" />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="label">Başlangıç</label>
                <input type="time" value={editStart} onChange={e => setEditStart(e.target.value)} className="input-field text-sm" />
              </div>
              <div>
                <label className="label">Bitiş</label>
                <input type="time" value={editEnd} onChange={e => setEditEnd(e.target.value)} className="input-field text-sm" />
              </div>
            </div>
          </div>
          <div>
            <label className="label">Açıklama</label>
            <textarea value={editDesc} onChange={e => setEditDesc(e.target.value)} rows={2} className="input-field text-sm resize-none w-full" />
          </div>
          {editError && <p className="text-red-400 text-xs">{editError}</p>}
          <div className="flex gap-2">
            <button
              onClick={handleSaveEdit}
              disabled={editLoading}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-accent text-white text-xs font-semibold hover:bg-accent/80 disabled:opacity-50 transition-colors"
            >
              <Check size={11} />
              {editLoading ? 'Kaydediliyor…' : 'Kaydet'}
            </button>
            <button
              onClick={() => setEditing(false)}
              className="px-3 py-1.5 rounded-lg border border-[rgba(228,224,216,0.1)] text-text-muted text-xs hover:text-text-primary transition-colors"
            >
              İptal
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export function VenueEventTabs({ upcoming: initialUpcoming, past: initialPast, isOwner, venueId, venueCity }: Props) {
  const today = new Date().toISOString().split('T')[0]
  const [tab, setTab] = useState<Tab>('upcoming')
  const [upcomingList, setUpcomingList] = useState<EventItem[]>(initialUpcoming)
  const [pastList, setPastList] = useState<EventItem[]>(initialPast)

  // Add form
  const [addDate, setAddDate] = useState(today)
  const [addTitle, setAddTitle] = useState('')
  const [addStartTime, setAddStartTime] = useState('20:00')
  const [addEndTime, setAddEndTime] = useState('')
  const [addDescription, setAddDescription] = useState('')
  const [addLoading, setAddLoading] = useState(false)
  const [addError, setAddError] = useState('')
  const [addSuccess, setAddSuccess] = useState(false)

  // Performer search
  const [performerTab, setPerformerTab] = useState<'artist' | 'band'>('artist')
  const [performerQuery, setPerformerQuery] = useState('')
  const [allArtists, setAllArtists] = useState<{ id: string; stage_name: string; city: string | null }[]>([])
  const [allBands, setAllBands] = useState<{ id: string; name: string; city: string | null }[]>([])
  const [selectedPerformer, setSelectedPerformer] = useState<{ id: string; name: string; type: 'artist' | 'band' } | null>(null)
  const [offerTtl, setOfferTtl] = useState<24 | 48>(48)

  const supabase = createClient()

  useEffect(() => {
    if (tab !== 'add' || !isOwner) return
    if (allArtists.length === 0) {
      supabase.from('artists').select('id, stage_name, city').order('stage_name')
        .then(({ data }) => { if (data) setAllArtists(data as any[]) })
    }
    if (allBands.length === 0) {
      supabase.from('bands').select('id, name, city').order('name')
        .then(({ data }) => { if (data) setAllBands(data as any[]) })
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, isOwner])

  const city = venueCity?.toLowerCase()
  const filteredPerformers = (() => {
    const q = performerQuery.trim().toLowerCase()
    const source = performerTab === 'artist'
      ? allArtists
          .filter(a => !q || a.stage_name.toLowerCase().includes(q))
          .map(a => ({ id: a.id, name: a.stage_name, type: 'artist' as const, city: a.city?.toLowerCase() ?? null }))
      : allBands
          .filter(b => !q || b.name.toLowerCase().includes(q))
          .map(b => ({ id: b.id, name: b.name, type: 'band' as const, city: b.city?.toLowerCase() ?? null }))
    if (!city) return source
    return [...source.filter(p => p.city === city), ...source.filter(p => p.city !== city)]
  })()

  function handleUpdated(updated: EventItem) {
    setUpcomingList(prev => prev.map(e => e.id === updated.id ? updated : e))
    setPastList(prev => prev.map(e => e.id === updated.id ? updated : e))
  }

  function handleRemoved(id: string) {
    setUpcomingList(prev => prev.filter(e => e.id !== id))
    setPastList(prev => prev.filter(e => e.id !== id))
  }

  function resetAddForm() {
    setAddTitle('')
    setAddDate(today)
    setAddStartTime('20:00')
    setAddEndTime('')
    setAddDescription('')
    setPerformerQuery('')
    setSelectedPerformer(null)
    setAddError('')
    setAddSuccess(false)
  }

  async function handleAdd() {
    if (!venueId || !addTitle.trim() || !addDate || !addStartTime) return
    setAddLoading(true)
    setAddError('')

    const freeTextName = !selectedPerformer && performerQuery.trim() ? performerQuery.trim() : null

    const res = await addVenueEvent({
      venueId,
      title: addTitle.trim(),
      eventDate: addDate,
      startTime: addStartTime,
      endTime: addEndTime || null,
      artistId: selectedPerformer?.type === 'artist' ? selectedPerformer.id : null,
      bandId: selectedPerformer?.type === 'band' ? selectedPerformer.id : null,
      artistName: freeTextName,
      description: addDescription.trim() || null,
      ttlHours: selectedPerformer ? offerTtl : undefined,
    })

    if (!res.success || !res.data) {
      setAddError(res.error ?? 'Etkinlik eklenemedi.')
    } else {
      const d = res.data
      const newEvent: EventItem = {
        id: d.id,
        title: d.title,
        event_date: d.event_date,
        start_time: d.start_time,
        end_time: d.end_time ?? null,
        genre: null,
        description: addDescription.trim() || null,
        artists: selectedPerformer?.type === 'artist'
          ? { stage_name: selectedPerformer.name }
          : freeTextName ? { stage_name: freeTextName } : null,
        bands: selectedPerformer?.type === 'band' ? { name: selectedPerformer.name } : null,
      }
      if (addDate >= today) {
        setUpcomingList(prev => [...prev, newEvent].sort((a, b) => a.event_date.localeCompare(b.event_date)))
      } else {
        setPastList(prev => [newEvent, ...prev])
      }
      setAddSuccess(true)
    }
    setAddLoading(false)
  }

  if (upcomingList.length === 0 && pastList.length === 0 && !isOwner) return null

  const events = tab === 'upcoming' ? upcomingList : pastList

  return (
    <div>
      <div className="flex gap-1 mb-4 bg-surface rounded-xl p-1 border border-[rgba(228,224,216,0.08)]">
        <button
          onClick={() => setTab('upcoming')}
          className={cn('flex-1 py-2 text-sm font-medium rounded-lg transition-colors',
            tab === 'upcoming' ? 'bg-accent text-white' : 'text-text-muted hover:text-text-primary')}
        >
          Yaklaşan
          {upcomingList.length > 0 && (
            <span className={cn('ml-1.5 text-xs', tab === 'upcoming' ? 'opacity-70' : 'text-text-muted')}>
              ({upcomingList.length})
            </span>
          )}
        </button>
        <button
          onClick={() => setTab('past')}
          className={cn('flex-1 py-2 text-sm font-medium rounded-lg transition-colors',
            tab === 'past' ? 'bg-accent text-white' : 'text-text-muted hover:text-text-primary')}
        >
          Geçmiş
          {pastList.length > 0 && (
            <span className={cn('ml-1.5 text-xs', tab === 'past' ? 'opacity-70' : 'text-text-muted')}>
              ({pastList.length})
            </span>
          )}
        </button>
        {isOwner && (
          <button
            onClick={() => { setTab('add'); resetAddForm() }}
            className={cn('flex-1 py-2 text-sm font-medium rounded-lg transition-colors flex items-center justify-center gap-1.5',
              tab === 'add' ? 'bg-accent text-white' : 'text-text-muted hover:text-text-primary')}
          >
            <Plus size={14} />
            Ekle
          </button>
        )}
      </div>

      {tab === 'add' && isOwner ? (
        addSuccess ? (
          <div className="text-center py-8 space-y-3">
            <p className="text-success text-2xl">✓</p>
            <p className="text-text-primary text-sm font-medium">Etkinlik eklendi</p>
            <div className="flex gap-2 justify-center">
              <button
                onClick={resetAddForm}
                className="px-4 py-2 rounded-lg bg-accent text-white text-xs font-semibold hover:bg-accent/80 transition-colors"
              >
                Yeni Ekle
              </button>
              <button
                onClick={() => { setTab('upcoming'); resetAddForm() }}
                className="px-4 py-2 rounded-lg border border-[rgba(228,224,216,0.15)] text-text-muted text-xs hover:text-text-primary transition-colors"
              >
                Listeye Dön
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <label className="label">Etkinlik Adı *</label>
              <input
                value={addTitle}
                onChange={e => setAddTitle(e.target.value)}
                placeholder="Konser adı..."
                className="input-field text-sm"
                autoFocus
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className="label">Tarih *</label>
                <input type="date" value={addDate} onChange={e => setAddDate(e.target.value)} className="input-field text-sm" />
              </div>
              <div>
                <label className="label">Başlangıç *</label>
                <input type="time" value={addStartTime} onChange={e => setAddStartTime(e.target.value)} className="input-field text-sm" />
              </div>
              <div>
                <label className="label">Bitiş</label>
                <input type="time" value={addEndTime} onChange={e => setAddEndTime(e.target.value)} className="input-field text-sm" />
              </div>
            </div>

            <div>
              <label className="label">Sanatçı / Grup</label>
              {selectedPerformer ? (
                <div className="flex items-center gap-2 px-3 py-2 rounded-lg border border-accent/30 bg-accent/5">
                  {selectedPerformer.type === 'artist'
                    ? <Music2 size={13} className="text-accent flex-shrink-0" />
                    : <Users size={13} className="text-accent flex-shrink-0" />
                  }
                  <span className="text-text-primary text-sm flex-1">{selectedPerformer.name}</span>
                  <span className="text-text-muted text-xs">{selectedPerformer.type === 'artist' ? 'Sanatçı' : 'Grup'}</span>
                  <button type="button" onClick={() => { setSelectedPerformer(null); setPerformerQuery('') }} className="text-text-muted hover:text-text-primary ml-1">
                    <X size={13} />
                  </button>
                </div>
              ) : (
                <>
                  <div className="flex rounded-lg overflow-hidden border border-[rgba(228,224,216,0.15)] mb-2">
                    <button type="button"
                      onClick={() => { setPerformerTab('artist'); setPerformerQuery('') }}
                      className={cn('flex-1 py-1.5 text-xs font-medium flex items-center justify-center gap-1 transition-colors',
                        performerTab === 'artist' ? 'bg-accent/20 text-accent' : 'text-text-muted hover:text-text-primary')}
                    >
                      <Music2 size={11} /> Sanatçı
                    </button>
                    <button type="button"
                      onClick={() => { setPerformerTab('band'); setPerformerQuery('') }}
                      className={cn('flex-1 py-1.5 text-xs font-medium flex items-center justify-center gap-1 transition-colors border-l border-[rgba(228,224,216,0.15)]',
                        performerTab === 'band' ? 'bg-accent/20 text-accent' : 'text-text-muted hover:text-text-primary')}
                    >
                      <Users size={11} /> Grup
                    </button>
                  </div>
                  <input
                    value={performerQuery}
                    onChange={e => setPerformerQuery(e.target.value)}
                    placeholder={performerTab === 'artist' ? 'İsimle ara...' : 'Grup adıyla ara...'}
                    className="input-field text-sm"
                    autoComplete="off"
                  />
                  {filteredPerformers.length > 0 && (
                    <div className="mt-1 border border-[rgba(228,224,216,0.15)] rounded-lg overflow-hidden max-h-44 overflow-y-auto">
                      {filteredPerformers.map(p => (
                        <button
                          key={`${p.type}-${p.id}`}
                          type="button"
                          onClick={() => { setSelectedPerformer(p); setPerformerQuery(p.name) }}
                          className="w-full flex items-center gap-2 px-3 py-2.5 text-left hover:bg-[rgba(228,224,216,0.06)] transition-colors border-b border-[rgba(228,224,216,0.06)] last:border-b-0"
                        >
                          <span className="text-text-primary text-sm flex-1 truncate">{p.name}</span>
                          <span className="text-text-muted text-xs flex-shrink-0">{p.type === 'artist' ? 'Sanatçı' : 'Grup'}</span>
                        </button>
                      ))}
                    </div>
                  )}
                  {performerQuery.trim() && filteredPerformers.length === 0 && (
                    <p className="text-text-muted text-xs mt-1.5 px-1">
                      {performerTab === 'artist' ? 'Kayıtlı sanatçı bulunamadı' : 'Kayıtlı grup bulunamadı'} — ad olarak kaydedilecek
                    </p>
                  )}
                </>
              )}
            </div>

            {selectedPerformer && (
              <div>
                <label className="label">Teklif Geçerlilik Süresi</label>
                <div className="flex rounded-lg overflow-hidden border border-[rgba(228,224,216,0.15)]">
                  {([24, 48] as const).map(h => (
                    <button key={h} type="button" onClick={() => setOfferTtl(h)}
                      className={cn('flex-1 py-1.5 text-xs font-medium transition-colors border-l border-[rgba(228,224,216,0.15)] first:border-l-0',
                        offerTtl === h ? 'bg-accent/20 text-accent' : 'text-text-muted hover:text-text-primary')}>
                      {h} saat
                    </button>
                  ))}
                </div>
                <p className="text-text-muted text-xs mt-1">Sanatçı bu süre içinde yanıt vermezse teklif otomatik sona erer.</p>
              </div>
            )}

            <div>
              <label className="label">Açıklama</label>
              <textarea
                value={addDescription}
                onChange={e => setAddDescription(e.target.value)}
                rows={2}
                placeholder="Etkinlik hakkında kısa bir not..."
                className="input-field text-sm resize-none w-full"
              />
            </div>

            {addError && <p className="text-red-400 text-xs">{addError}</p>}

            <button
              onClick={handleAdd}
              disabled={addLoading || !addTitle.trim() || !addDate || !addStartTime}
              className="btn-accent w-full py-3 text-sm disabled:opacity-50"
            >
              {addLoading ? 'Ekleniyor...' : selectedPerformer ? `Teklif Gönder (${offerTtl}sa)` : 'Takvime Ekle'}
            </button>
          </div>
        )
      ) : events.length === 0 ? (
        <p className="text-center py-8 text-text-muted text-sm">
          {tab === 'upcoming' ? 'Yaklaşan etkinlik yok.' : 'Geçmiş etkinlik yok.'}
        </p>
      ) : (
        <div className="space-y-2">
          {events.map(event => (
            <EventRow
              key={event.id}
              event={event}
              isOwner={!!isOwner}
              onUpdated={handleUpdated}
              onRemoved={handleRemoved}
            />
          ))}
        </div>
      )}
    </div>
  )
}
