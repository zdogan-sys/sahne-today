'use client'

import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import Link from 'next/link'
import { X, MapPin, Trash2, Plus } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { formatTime } from '@/lib/utils'
import { EventCalendar, type CalendarEventItem } from '@/components/ui/EventCalendar'
import { ALL_GENRES } from '@/lib/constants'
import { addArtistEvent, cancelEvent } from '@/app/actions/event'

interface VenueOption { id: string; name: string; city: string; district: string }

interface Props {
  artistId: string
  initialEvents: CalendarEventItem[]
  isOwner: boolean
}

export function ArtistCalendarSection({ artistId, initialEvents, isOwner }: Props) {
  const [events, setEvents] = useState<CalendarEventItem[]>(initialEvents)
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [dayEvents, setDayEvents] = useState<CalendarEventItem[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [cancelConfirm, setCancelConfirm] = useState<string | null>(null)
  const [cancelling, setCancelling] = useState(false)
  const [showAddForm, setShowAddForm] = useState(false)

  const [title, setTitle] = useState('')
  const [startTime, setStartTime] = useState('20:00')
  const [endTime, setEndTime] = useState('')
  const [genre, setGenre] = useState('')

  const [venueQuery, setVenueQuery] = useState('')
  const [allVenues, setAllVenues] = useState<VenueOption[]>([])
  const [venuesLoaded, setVenuesLoaded] = useState(false)
  const [selectedVenue, setSelectedVenue] = useState<VenueOption | null>(null)
  const [venueNameFree, setVenueNameFree] = useState('')
  const [showVenueList, setShowVenueList] = useState(false)
  const venueInputRef = useRef<HTMLInputElement>(null)

  const supabase = createClient()

  useEffect(() => { setMounted(true) }, [])

  useEffect(() => {
    if (!isOwner || venuesLoaded) return
    supabase.from('venues').select('id, name, city, district').order('name').then(({ data }) => {
      setAllVenues((data ?? []) as VenueOption[])
      setVenuesLoaded(true)
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOwner, venuesLoaded])

  const filteredVenues = venueQuery.trim()
    ? allVenues.filter(v => v.name.toLowerCase().includes(venueQuery.toLowerCase()))
    : allVenues

  function resetForm() {
    setTitle(''); setStartTime('20:00'); setEndTime(''); setGenre('')
    setVenueQuery(''); setSelectedVenue(null)
    setVenueNameFree(''); setError(''); setSuccess(false); setShowVenueList(false)
  }

  function handleDayClick(date: Date, evs: CalendarEventItem[]) {
    if (!isOwner && evs.length === 0) return
    setSelectedDate(date)
    setDayEvents(evs)
    setShowAddForm(evs.length === 0 && isOwner)
    resetForm()
  }

  function closePanel() {
    setSelectedDate(null)
    setDayEvents([])
    setCancelConfirm(null)
    setShowAddForm(false)
    resetForm()
  }

  async function handleCancel(eventId: string) {
    setCancelling(true)
    const res = await cancelEvent(eventId)
    if (res.success) {
      setEvents(prev => prev.filter(e => e.id !== eventId))
      setDayEvents(prev => prev.filter(e => e.id !== eventId))
    }
    setCancelConfirm(null)
    setCancelling(false)
  }

  function selectVenue(v: VenueOption) {
    setSelectedVenue(v)
    setVenueQuery(v.name)
    setShowVenueList(false)
  }

  function toISO(date: Date) {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
  }

  async function handleAdd() {
    if (!selectedDate || !title || !startTime) return
    setLoading(true)
    setError('')

    const res = await addArtistEvent({
      artistId,
      title,
      eventDate: toISO(selectedDate),
      startTime,
      endTime: endTime || null,
      venueId: selectedVenue?.id ?? null,
      venueName: !selectedVenue && venueNameFree ? venueNameFree : null,
      genre: genre || null,
    })

    if (!res.success || !res.data) {
      setError(res.error ?? 'Etkinlik eklenemedi.')
    } else {
      const d = res.data
      const newItem: CalendarEventItem = {
        id: d.id,
        event_date: d.event_date,
        title: d.title,
        start_time: d.start_time,
        end_time: d.end_time ?? null,
        subtitle: selectedVenue?.name ?? (venueNameFree || null),
        status: d.status,
      }
      setEvents(prev => [...prev, newItem])
      setDayEvents(prev => [...prev, newItem])
      setSuccess(true)
      setTitle(''); setStartTime('20:00'); setEndTime(''); setGenre('')
      setVenueQuery(''); setSelectedVenue(null); setVenueNameFree(''); setShowVenueList(false)
    }
    setLoading(false)
  }

  const dateLabel = selectedDate?.toLocaleDateString('tr-TR', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
  })

  const popup = selectedDate && mounted ? createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={(e) => { if (e.target === e.currentTarget) closePanel() }}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

      {/* Modal */}
      <div className="relative w-full max-w-md bg-surface rounded-2xl border border-[rgba(228,224,216,0.15)] shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[rgba(228,224,216,0.08)] flex-shrink-0">
          <p className="font-semibold text-text-primary text-sm">{dateLabel}</p>
          <button onClick={closePanel} className="w-7 h-7 rounded-lg flex items-center justify-center text-text-muted hover:text-text-primary hover:bg-[rgba(228,224,216,0.08)] transition-colors">
            <X size={15} />
          </button>
        </div>

        <div className="overflow-y-auto flex-1">
          {/* Existing events */}
          {dayEvents.length > 0 && (
            <div className="px-5 py-4 space-y-2 border-b border-[rgba(228,224,216,0.08)]">
              {dayEvents.map(ev => (
                <div key={ev.id} className="flex items-start gap-3">
                  <span className={`w-1.5 h-1.5 rounded-full mt-2 flex-shrink-0 ${ev.status === 'pending' ? 'bg-yellow-400' : 'bg-success'}`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Link href={`/events/${ev.id}`} className="text-text-primary text-sm font-medium hover:text-accent transition-colors">{ev.title}</Link>
                      {ev.status === 'pending' && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-yellow-400/15 text-yellow-400 border border-yellow-400/20">
                          Onay Bekliyor
                        </span>
                      )}
                    </div>
                    <p className="text-text-muted text-xs mt-0.5">
                      {formatTime(ev.start_time)}{ev.end_time ? ` – ${formatTime(ev.end_time)}` : ''}
                      {ev.subtitle ? ` · ${ev.subtitle}` : ''}
                    </p>
                    {isOwner && cancelConfirm === ev.id ? (
                      <div className="flex items-center gap-2 mt-1.5">
                        <span className="text-xs text-text-muted">İptal edilsin mi?</span>
                        <button
                          onClick={() => handleCancel(ev.id)}
                          disabled={cancelling}
                          className="text-xs text-red-400 hover:text-red-300 font-medium disabled:opacity-50"
                        >
                          {cancelling ? 'İptal ediliyor...' : 'Evet, iptal et'}
                        </button>
                        <button
                          onClick={() => setCancelConfirm(null)}
                          className="text-xs text-text-muted hover:text-text-primary"
                        >
                          Vazgeç
                        </button>
                      </div>
                    ) : null}
                  </div>
                  {isOwner && cancelConfirm !== ev.id && (
                    <button
                      onClick={() => setCancelConfirm(ev.id)}
                      className="flex-shrink-0 w-6 h-6 flex items-center justify-center rounded text-text-muted hover:text-red-400 hover:bg-red-400/10 transition-colors mt-0.5"
                      title="Etkinliği iptal et"
                    >
                      <Trash2 size={13} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Add form — owner only, toggled */}
          {isOwner && !showAddForm && !success && (
            <div className="px-5 py-3 border-t border-[rgba(228,224,216,0.08)]">
              <button
                onClick={() => setShowAddForm(true)}
                className="flex items-center gap-1.5 text-xs text-text-muted hover:text-accent transition-colors"
              >
                <Plus size={13} /> Etkinlik Ekle
              </button>
            </div>
          )}

          {isOwner && success ? (
            <div className="px-5 py-8 text-center">
              <p className="text-success text-2xl mb-2">✓</p>
              <p className="text-text-primary text-sm font-medium">Etkinlik eklendi</p>
              <button onClick={() => setSuccess(false)} className="text-text-muted text-xs mt-2 hover:text-text-primary underline">
                Başka etkinlik ekle
              </button>
            </div>
          ) : isOwner && showAddForm ? (
            <div className="px-5 py-4 space-y-4">
              {dayEvents.length > 0 && (
                <p className="text-text-muted text-xs font-medium uppercase tracking-wide">Etkinlik Ekle</p>
              )}

              <div>
                <label className="label">Etkinlik Adı *</label>
                <input
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  placeholder="Konser adı..."
                  className="input-field text-sm"
                  autoFocus
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Başlangıç *</label>
                  <input type="time" value={startTime} onChange={e => setStartTime(e.target.value)} className="input-field text-sm" />
                </div>
                <div>
                  <label className="label">Bitiş</label>
                  <input type="time" value={endTime} onChange={e => setEndTime(e.target.value)} className="input-field text-sm" />
                </div>
              </div>

              <div>
                <label className="label">Tür</label>
                <select value={genre} onChange={e => setGenre(e.target.value)} className="input-field text-sm">
                  <option value="">Seçin</option>
                  {ALL_GENRES.map(g => <option key={g} value={g}>{g}</option>)}
                </select>
              </div>

              {/* Venue search */}
              <div>
                <label className="label">Mekan</label>
                {selectedVenue ? (
                  <div className="flex items-center gap-2 px-3 py-2 rounded-lg border border-accent/30 bg-accent/5">
                    <MapPin size={13} className="text-accent flex-shrink-0" />
                    <span className="text-text-primary text-sm flex-1">{selectedVenue.name}</span>
                    <span className="text-text-muted text-xs">{selectedVenue.district}, {selectedVenue.city}</span>
                    <button type="button" onClick={() => { setSelectedVenue(null); setVenueQuery(''); setShowVenueList(false) }} className="text-text-muted hover:text-text-primary ml-1">
                      <X size={13} />
                    </button>
                  </div>
                ) : (
                  <div className="relative">
                    <input
                      ref={venueInputRef}
                      value={venueQuery}
                      onChange={e => { setVenueQuery(e.target.value); setShowVenueList(true) }}
                      onFocus={() => setShowVenueList(true)}
                      placeholder="Mekan adı yazın..."
                      className="input-field text-sm"
                      autoComplete="off"
                    />
                    {showVenueList && filteredVenues.length > 0 && (
                      <div className="absolute z-10 top-full mt-1 left-0 right-0 bg-surface border border-[rgba(228,224,216,0.15)] rounded-lg overflow-hidden shadow-xl max-h-40 overflow-y-auto">
                        {filteredVenues.map(v => (
                          <button
                            key={v.id}
                            type="button"
                            onMouseDown={e => { e.preventDefault(); selectVenue(v) }}
                            className="w-full flex items-center gap-2 px-3 py-2.5 text-left hover:bg-[rgba(228,224,216,0.06)] transition-colors"
                          >
                            <MapPin size={12} className="text-text-muted flex-shrink-0" />
                            <span className="text-text-primary text-sm flex-1 truncate">{v.name}</span>
                            <span className="text-text-muted text-xs flex-shrink-0">{v.district}, {v.city}</span>
                          </button>
                        ))}
                      </div>
                    )}
                    {showVenueList && venueQuery.trim() && filteredVenues.length === 0 && (
                      <div className="absolute z-10 top-full mt-1 left-0 right-0 bg-surface border border-[rgba(228,224,216,0.15)] rounded-lg px-3 py-2.5 shadow-xl">
                        <p className="text-text-muted text-xs">Kayıtlı mekan bulunamadı</p>
                      </div>
                    )}
                  </div>
                )}
                {!selectedVenue && (
                  <input
                    value={venueNameFree}
                    onChange={e => setVenueNameFree(e.target.value)}
                    onFocus={() => setShowVenueList(false)}
                    placeholder="Kayıtlı değilse mekan adını buraya yaz..."
                    className="input-field text-sm mt-2"
                  />
                )}
                {selectedVenue && (
                  <p className="text-yellow-400 text-xs mt-1.5">⚠ Mekan yöneticisi onaylayana kadar sarı görünür.</p>
                )}
              </div>

              {error && <p className="text-red-400 text-xs">{error}</p>}
            </div>
          ) : null}
        </div>

        {/* Footer */}
        {isOwner && showAddForm && !success && (
          <div className="px-5 py-4 border-t border-[rgba(228,224,216,0.08)] flex-shrink-0">
            <button
              onClick={handleAdd}
              disabled={loading || !title || !startTime}
              className="btn-accent w-full py-3 text-sm disabled:opacity-50"
            >
              {loading ? 'Ekleniyor...' : 'Takvime Ekle'}
            </button>
          </div>
        )}
      </div>
    </div>,
    document.body
  ) : null

  return (
    <div>
      <h3 className="label mb-4">Etkinlik Takvimi</h3>
      <EventCalendar
        events={events}
        onDayClick={handleDayClick}
        selectedDate={selectedDate}
      />
      {popup}
    </div>
  )
}
