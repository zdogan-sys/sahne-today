'use client'

import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import Link from 'next/link'
import { ChevronLeft, ChevronRight, X, Music2, Users, Plus } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { formatTime, cn } from '@/lib/utils'
import { MUSIC_GENRES, STAGE_GENRES } from '@/lib/constants'
import { addVenueEvent } from '@/app/actions/event'

interface SlotEntry {
  id: string
  day_of_week: number
  start_time: string
  end_time: string
  fee_model: string
  fee_value: number | null
  notes: string | null
  event_type: string | null
}

interface CalendarEvent {
  id: string
  event_date: string
  title: string
  start_time: string
  end_time: string
  artists?: { stage_name: string } | null
  bands?: { name: string } | null
}

interface BandOption {
  id: string
  name: string
}

interface Performer {
  id: string
  name: string
  type: 'artist' | 'band'
}

interface Props {
  slots: SlotEntry[]
  events: CalendarEvent[]
  venueId: string
  venueCity?: string
  artistId: string | null
  artistBands: BandOption[]
  isOwner?: boolean
}

const MONTH_NAMES = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık']
const DAY_HEADERS = ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz']

function jsToGrid(jsDay: number): number {
  return jsDay === 0 ? 6 : jsDay - 1
}

function toISO(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

export function VenueCalendar({ slots, events: initialEvents, venueId, venueCity, artistId, artistBands, isOwner }: Props) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const [events, setEvents] = useState<CalendarEvent[]>(initialEvents)
  const [year, setYear] = useState(today.getFullYear())
  const [month, setMonth] = useState(today.getMonth())
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [selectedSlot, setSelectedSlot] = useState<SlotEntry | null>(null)
  const [selectedDayEvents, setSelectedDayEvents] = useState<CalendarEvent[]>([])
  const [message, setMessage] = useState('')
  const [applyAs, setApplyAs] = useState<'self' | 'band'>('self')
  const [bandId, setBandId] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')
  const [mounted, setMounted] = useState(false)

  // Owner add form state
  const [ownerAddType, setOwnerAddType] = useState<'event' | 'slot'>('event')
  
  // Event form
  const [ownerTitle, setOwnerTitle] = useState('')
  const [ownerStartTime, setOwnerStartTime] = useState('20:00')
  const [ownerEndTime, setOwnerEndTime] = useState('')
  const [ownerLoading, setOwnerLoading] = useState(false)
  const [ownerSuccess, setOwnerSuccess] = useState(false)
  const [ownerError, setOwnerError] = useState('')

  // Slot form
  const [slotRecurrence, setSlotRecurrence] = useState('weekly')
  const [slotStartTime, setSlotStartTime] = useState('21:00')
  const [slotEndTime, setSlotEndTime] = useState('23:00')
  const [slotFeeModel, setSlotFeeModel] = useState('free')
  const [slotFeeValue, setSlotFeeValue] = useState('')
  const [slotNotes, setSlotNotes] = useState('')
  const [slotEventType, setSlotEventType] = useState('')

  const [offerTtl, setOfferTtl] = useState<24 | 48>(48)

  // Performer search
  const [performerTab, setPerformerTab] = useState<'artist' | 'band'>('artist')
  const [performerQuery, setPerformerQuery] = useState('')
  const [allArtists, setAllArtists] = useState<{ id: string; stage_name: string; city: string | null }[]>([])
  const [allBands, setAllBands] = useState<{ id: string; name: string; city: string | null }[]>([])
  const [selectedPerformer, setSelectedPerformer] = useState<Performer | null>(null)
  const [showPerformerList, setShowPerformerList] = useState(false)

  const supabase = createClient()

  useEffect(() => { setMounted(true) }, [])

  useEffect(() => {
    if (!isOwner) return
    supabase.from('artists').select('id, stage_name, city').order('stage_name')
      .then(({ data }) => { if (data) setAllArtists(data as any[]) })
    supabase.from('bands').select('id, name, city').order('name')
      .then(({ data }) => { if (data) setAllBands(data as any[]) })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOwner])

  const filteredPerformers: Performer[] = (() => {
    const q = performerQuery.trim().toLowerCase()
    const city = venueCity?.toLowerCase()
    const source = performerTab === 'artist'
      ? allArtists
          .filter(a => !q || a.stage_name.toLowerCase().includes(q))
          .map(a => ({ id: a.id, name: a.stage_name, type: 'artist' as const, city: a.city?.toLowerCase() ?? null }))
      : allBands
          .filter(b => !q || b.name.toLowerCase().includes(q))
          .map(b => ({ id: b.id, name: b.name, type: 'band' as const, city: b.city?.toLowerCase() ?? null }))
    if (!city) return source
    return [
      ...source.filter(p => p.city === city),
      ...source.filter(p => p.city !== city),
    ]
  })()

  const eventsByDate = new Map<string, CalendarEvent[]>()
  for (const ev of events) {
    const arr = eventsByDate.get(ev.event_date) ?? []
    arr.push(ev)
    eventsByDate.set(ev.event_date, arr)
  }

  function getSlotsForDate(date: Date): SlotEntry[] {
    return slots.filter(s => s.day_of_week === date.getDay())
  }

  function prevMonth() {
    if (month === 0) { setYear(y => y - 1); setMonth(11) } else setMonth(m => m - 1)
    setSelectedDate(null)
  }

  function nextMonth() {
    if (month === 11) { setYear(y => y + 1); setMonth(0) } else setMonth(m => m + 1)
    setSelectedDate(null)
  }

  function resetOwnerForm() {
    setOwnerAddType('event')
    setOwnerTitle('')
    setOwnerStartTime('20:00')
    setOwnerEndTime('')
    setOwnerSuccess(false)
    setOwnerError('')
    setPerformerTab('artist')
    setPerformerQuery('')
    setSelectedPerformer(null)
    setShowPerformerList(false)
    
    setSlotRecurrence('weekly')
    setSlotStartTime('21:00')
    setSlotEndTime('23:00')
    setSlotFeeModel('free')
    setSlotFeeValue('')
    setSlotNotes('')
    setSlotEventType('')
  }

  function handleDayClick(date: Date) {
    const dateStr = toISO(date)
    const dayEvents = eventsByDate.get(dateStr) ?? []
    const daySlots = getSlotsForDate(date)
    const hasClickableSlot = daySlots.length > 0 && date >= today && artistId

    if (!isOwner && dayEvents.length === 0 && !hasClickableSlot) {
      alert("Bu güne tıklama yetkiniz yok veya gün boş.")
      return
    }

    const slot = hasClickableSlot ? daySlots[0] : daySlots[0] ?? null

    setSelectedDate(date)
    setSelectedDayEvents(dayEvents)
    setSelectedSlot(slot)
    setMessage('')
    setApplyAs('self')
    setBandId('')
    setSuccess(false)
    setError('')

    if (isOwner) {
      resetOwnerForm()
      setOwnerStartTime(slot?.start_time?.slice(0, 5) ?? '20:00')
      setOwnerEndTime(slot?.end_time?.slice(0, 5) ?? '')
    }
  }

  function closeOwnerPanel() {
    setSelectedDate(null)
    setSelectedDayEvents([])
    setSelectedSlot(null)
    resetOwnerForm()
  }

  async function handleApply() {
    if (!selectedDate || !selectedSlot || !artistId) return
    setLoading(true)
    setError('')
    const { error: err } = await supabase.from('applications').insert({
      slot_id: selectedSlot.id,
      artist_id: artistId,
      event_date: toISO(selectedDate),
      band_id: applyAs === 'band' && bandId ? bandId : null,
      message: message || null,
      status: 'pending',
    } as any)
    if (err) {
      setError(err.code === '23505' ? 'Bu tarih için zaten talepte bulundunuz.' : 'İstek gönderilemedi. Tekrar deneyin.')
    } else {
      setSuccess(true)
    }
    setLoading(false)
  }

  async function handleOwnerAddSlot() {
    if (!selectedDate) return
    setOwnerLoading(true)
    setOwnerError('')

    const slotInsert = {
      venue_id: venueId,
      day_of_week: selectedDate.getDay(),
      start_time: slotStartTime,
      end_time: slotEndTime,
      recurrence: slotRecurrence,
      fee_model: slotFeeModel,
      fee_value: slotFeeValue ? parseFloat(slotFeeValue) : null,
      notes: slotNotes || null,
      event_type: slotEventType,
      status: 'open',
    }

    const { error: err } = await supabase.from('slots').insert(slotInsert as any)

    if (err) {
      setOwnerError('Slot eklenemedi.')
    } else {
      setOwnerSuccess(true)
      // Note: Ideally we'd update the local slots state here, but `slots` is passed as a prop.
      // A page reload or router refresh would be needed to see it in the list if they go back.
    }
    setOwnerLoading(false)
  }

  async function handleOwnerAdd() {
    if (!selectedDate || !ownerTitle || !ownerStartTime) return
    setOwnerLoading(true)
    setOwnerError('')

    const freeTextName = !selectedPerformer && performerQuery.trim() ? performerQuery.trim() : null

    const res = await addVenueEvent({
      venueId,
      title: ownerTitle,
      eventDate: toISO(selectedDate),
      startTime: ownerStartTime,
      endTime: ownerEndTime || null,
      artistId: selectedPerformer?.type === 'artist' ? selectedPerformer.id : null,
      bandId: selectedPerformer?.type === 'band' ? selectedPerformer.id : null,
      artistName: freeTextName,
      ttlHours: selectedPerformer ? offerTtl : undefined,
    })

    if (!res.success || !res.data) {
      setOwnerError(res.error ?? 'Etkinlik eklenemedi.')
    } else {
      const d = res.data
      const newEvent: CalendarEvent = {
        id: d.id,
        event_date: d.event_date,
        title: d.title,
        start_time: d.start_time,
        end_time: d.end_time ?? '',
        artists: selectedPerformer?.type === 'artist'
          ? { stage_name: selectedPerformer.name }
          : freeTextName ? { stage_name: freeTextName } : null,
        bands: selectedPerformer?.type === 'band' ? { name: selectedPerformer.name } : null,
      }
      setEvents(prev => [...prev, newEvent])
      setSelectedDayEvents(prev => [...prev, newEvent])
      setOwnerSuccess(true)
      setOwnerTitle('')
      setPerformerQuery('')
      setSelectedPerformer(null)
    }
    setOwnerLoading(false)
  }

  const firstDay = new Date(year, month, 1)
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const startOffset = jsToGrid(firstDay.getDay())
  const cells: (Date | null)[] = [
    ...Array(startOffset).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => new Date(year, month, i + 1)),
  ]

  const dateLabel = selectedDate?.toLocaleDateString('tr-TR', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
  })

  const ownerPopup = isOwner && selectedDate && mounted ? createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={(e) => { if (e.target === e.currentTarget) closeOwnerPanel() }}
    >
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div className="relative w-full max-w-md bg-surface rounded-2xl border border-[rgba(228,224,216,0.15)] shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[rgba(228,224,216,0.08)] flex-shrink-0">
          <p className="font-semibold text-text-primary text-sm">{dateLabel}</p>
          <button onClick={closeOwnerPanel} className="w-7 h-7 rounded-lg flex items-center justify-center text-text-muted hover:text-text-primary hover:bg-[rgba(228,224,216,0.08)] transition-colors">
            <X size={15} />
          </button>
        </div>

        <div className="overflow-y-auto flex-1">
          {/* Existing events */}
          {selectedDayEvents.length > 0 && (
            <div className="px-5 py-4 space-y-2 border-b border-[rgba(228,224,216,0.08)]">
              {selectedDayEvents.map(ev => (
                <div key={ev.id} className="flex items-start gap-3">
                  <span className="w-1.5 h-1.5 rounded-full bg-success mt-1.5 flex-shrink-0" />
                  <div>
                    <p className="text-text-primary text-sm font-medium">{ev.title}</p>
                    <p className="text-text-muted text-xs mt-0.5">
                      {formatTime(ev.start_time)}{ev.end_time ? ` – ${formatTime(ev.end_time)}` : ''}
                      {ev.artists?.stage_name ? ` · ${ev.artists.stage_name}` : ''}
                      {ev.bands?.name ? ` · ${ev.bands.name}` : ''}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Add form */}
          {ownerSuccess ? (
            <div className="px-5 py-8 text-center">
              <p className="text-success text-2xl mb-2">✓</p>
              <p className="text-text-primary text-sm font-medium">{ownerAddType === 'event' ? 'Etkinlik' : 'Açık Slot'} eklendi</p>
              <button onClick={() => { setOwnerSuccess(false); window.location.reload() }} className="text-text-muted text-xs mt-2 hover:text-text-primary underline">
                Kapat ve Yenile
              </button>
            </div>
          ) : (
            <div className="px-5 py-4 space-y-4">
              <div className="flex rounded-lg overflow-hidden border border-[rgba(228,224,216,0.15)] mb-2">
                <button
                  type="button"
                  onClick={() => setOwnerAddType('event')}
                  className={cn('flex-1 py-2 text-xs font-medium transition-colors', ownerAddType === 'event' ? 'bg-accent text-white' : 'text-text-muted hover:text-text-primary')}
                >
                  Etkinlik
                </button>
                <button
                  type="button"
                  onClick={() => setOwnerAddType('slot')}
                  className={cn('flex-1 py-2 text-xs font-medium transition-colors border-l border-[rgba(228,224,216,0.15)]', ownerAddType === 'slot' ? 'bg-accent text-white' : 'text-text-muted hover:text-text-primary')}
                >
                  Açık Slot
                </button>
              </div>

              {ownerAddType === 'event' ? (
                <>
              {selectedSlot && (
                <div className="text-xs text-text-muted bg-accent/5 border border-accent/15 rounded-lg px-3 py-2">
                  Boş sahne: {selectedSlot.event_type ?? 'Belirtilmemiş'} · {formatTime(selectedSlot.start_time)} – {formatTime(selectedSlot.end_time)}
                </div>
              )}

                  <div>
                    <label className="label">Etkinlik Adı *</label>
                    <input
                      value={ownerTitle}
                      onChange={e => setOwnerTitle(e.target.value)}
                      placeholder="Konser adı..."
                      className="input-field text-sm"
                      autoFocus
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="label">Başlangıç *</label>
                      <input type="time" value={ownerStartTime} onChange={e => setOwnerStartTime(e.target.value)} className="input-field text-sm" />
                    </div>
                    <div>
                      <label className="label">Bitiş</label>
                      <input type="time" value={ownerEndTime} onChange={e => setOwnerEndTime(e.target.value)} className="input-field text-sm" />
                    </div>
                  </div>

                  {/* Performer search */}
                  <div>
                    <label className="label">Sanatçı / Grup</label>
                    {!selectedPerformer && (
                      <div className="flex rounded-lg overflow-hidden border border-[rgba(228,224,216,0.15)] mb-2">
                        <button
                          type="button"
                          onClick={() => { setPerformerTab('artist'); setPerformerQuery('') }}
                          className={cn('flex-1 py-1.5 text-xs font-medium flex items-center justify-center gap-1 transition-colors',
                            performerTab === 'artist' ? 'bg-accent/20 text-accent' : 'text-text-muted hover:text-text-primary')}
                        >
                          <Music2 size={11} /> Sanatçı ({allArtists.length})
                        </button>
                        <button
                          type="button"
                          onClick={() => { setPerformerTab('band'); setPerformerQuery('') }}
                          className={cn('flex-1 py-1.5 text-xs font-medium flex items-center justify-center gap-1 transition-colors border-l border-[rgba(228,224,216,0.15)]',
                            performerTab === 'band' ? 'bg-accent/20 text-accent' : 'text-text-muted hover:text-text-primary')}
                        >
                          <Users size={11} /> Grup ({allBands.length})
                        </button>
                      </div>
                    )}
                    {selectedPerformer ? (
                      <div className="flex items-center gap-2 px-3 py-2 rounded-lg border border-accent/30 bg-accent/5">
                        {selectedPerformer.type === 'artist'
                          ? <Music2 size={13} className="text-accent flex-shrink-0" />
                          : <Users size={13} className="text-accent flex-shrink-0" />
                        }
                        <span className="text-text-primary text-sm flex-1">{selectedPerformer.name}</span>
                        <span className="text-text-muted text-xs">{selectedPerformer.type === 'artist' ? 'Sanatçı' : 'Grup'}</span>
                        <button
                          type="button"
                          onClick={() => { setSelectedPerformer(null); setPerformerQuery(''); setShowPerformerList(false) }}
                          className="text-text-muted hover:text-text-primary ml-1"
                        >
                          <X size={13} />
                        </button>
                      </div>
                    ) : (
                      <div className="relative">
                        <input
                          value={performerQuery}
                          onChange={e => { setPerformerQuery(e.target.value); setShowPerformerList(true) }}
                          onFocus={() => setShowPerformerList(true)}
                          onBlur={() => setTimeout(() => setShowPerformerList(false), 150)}
                          placeholder={performerTab === 'artist' ? 'Sanatçı adı yazın...' : 'Grup adı yazın...'}
                          className="input-field text-sm"
                          autoComplete="off"
                        />
                        {showPerformerList && filteredPerformers.length > 0 && (
                          <div className="absolute z-10 top-full mt-1 left-0 right-0 bg-surface border border-[rgba(228,224,216,0.15)] rounded-lg overflow-hidden shadow-xl max-h-56 overflow-y-auto">
                            {filteredPerformers.map(p => (
                              <button
                                key={`${p.type}-${p.id}`}
                                type="button"
                                onMouseDown={e => { e.preventDefault(); setSelectedPerformer(p); setPerformerQuery(p.name); setShowPerformerList(false) }}
                                className="w-full flex items-center gap-2 px-3 py-2.5 text-left hover:bg-[rgba(228,224,216,0.06)] transition-colors"
                              >
                                <span className="text-text-primary text-sm flex-1 truncate">{p.name}</span>
                                <span className="text-text-muted text-xs flex-shrink-0">{p.type === 'artist' ? 'Sanatçı' : 'Grup'}</span>
                              </button>
                            ))}
                          </div>
                        )}
                        {showPerformerList && performerQuery.trim() && filteredPerformers.length === 0 && (
                          <div className="absolute z-10 top-full mt-1 left-0 right-0 bg-surface border border-[rgba(228,224,216,0.15)] rounded-lg px-3 py-2.5 shadow-xl">
                            <p className="text-text-muted text-xs">
                              {performerTab === 'artist' ? 'Kayıtlı sanatçı bulunamadı' : 'Kayıtlı grup bulunamadı'} – ad olarak kaydedilecek
                            </p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="label">Etkinlik Türü</label>
                      <select value={slotEventType} onChange={(e) => setSlotEventType(e.target.value)} className="input-field text-sm">
                        <option value="">Seçin</option>
                        <optgroup label="Müzik">
                          {MUSIC_GENRES.map(t => (
                            <option key={t} value={t}>{t}</option>
                          ))}
                        </optgroup>
                        <optgroup label="Sahne">
                          {STAGE_GENRES.map(t => (
                            <option key={t} value={t}>{t}</option>
                          ))}
                        </optgroup>
                      </select>
                    </div>
                    <div>
                      <label className="label">Tekrar</label>
                      <select value={slotRecurrence} onChange={(e) => setSlotRecurrence(e.target.value)} className="input-field text-sm">
                        <option value="weekly">Haftalık</option>
                        <option value="biweekly">2 Haftada Bir</option>
                        <option value="once">Tek Sefer</option>
                      </select>
                    </div>
                    <div>
                      <label className="label">Başlangıç</label>
                      <input type="time" value={slotStartTime} onChange={e => setSlotStartTime(e.target.value)} className="input-field text-sm" />
                    </div>
                    <div>
                      <label className="label">Bitiş</label>
                      <input type="time" value={slotEndTime} onChange={e => setSlotEndTime(e.target.value)} className="input-field text-sm" />
                    </div>
                    <div>
                      <label className="label">Ücret Modeli</label>
                      <select value={slotFeeModel} onChange={(e) => setSlotFeeModel(e.target.value)} className="input-field text-sm">
                        <option value="free">Ücretsiz</option>
                        <option value="door_share">Kapı Paylaşımı</option>
                        <option value="guarantee">Garanti</option>
                        <option value="negotiable">Pazarlığa Açık</option>
                      </select>
                    </div>
                    <div>
                      <label className="label">Tutar (₺)</label>
                      <input type="number" value={slotFeeValue} onChange={(e) => setSlotFeeValue(e.target.value)} placeholder="0" className="input-field text-sm" />
                    </div>
                  </div>
                  <div>
                    <label className="label">Notlar</label>
                    <input value={slotNotes} onChange={(e) => setSlotNotes(e.target.value)} placeholder="Özel koşullar..." className="input-field text-sm" />
                  </div>
                </>
              )}

              {selectedPerformer && (
                <div>
                  <label className="label">Teklif Geçerlilik Süresi</label>
                  <div className="flex rounded-lg overflow-hidden border border-[rgba(228,224,216,0.15)]">
                    {([24, 48] as const).map(h => (
                      <button
                        key={h}
                        type="button"
                        onClick={() => setOfferTtl(h)}
                        className={cn('flex-1 py-1.5 text-xs font-medium transition-colors border-l border-[rgba(228,224,216,0.15)] first:border-l-0',
                          offerTtl === h ? 'bg-accent/20 text-accent' : 'text-text-muted hover:text-text-primary')}
                      >
                        {h} saat
                      </button>
                    ))}
                  </div>
                  <p className="text-text-muted text-xs mt-1">Sanatçı bu süre içinde yanıt vermezse teklif otomatik sona erer.</p>
                </div>
              )}

              {ownerError && <p className="text-red-400 text-xs">{ownerError}</p>}
            </div>
          )}
        </div>

        {!ownerSuccess && (
          <div className="px-5 py-4 border-t border-[rgba(228,224,216,0.08)] flex-shrink-0">
            <button
              onClick={ownerAddType === 'event' ? handleOwnerAdd : handleOwnerAddSlot}
              disabled={ownerLoading || (ownerAddType === 'event' && (!ownerTitle || !ownerStartTime))}
              className="btn-accent w-full py-3 text-sm disabled:opacity-50"
            >
              {ownerLoading ? 'Ekleniyor...' : selectedPerformer ? `Teklif Gönder (${offerTtl}sa)` : 'Takvime Ekle'}
            </button>
          </div>
        )}
      </div>
    </div>,
    document.body
  ) : null

  return (
    <div>
      {/* Calendar grid constrained to keep cells small and square */}
      <div className="max-w-[500px]">
      {/* Navigation */}
      <div className="flex items-center justify-between mb-4">
        <button onClick={prevMonth} className="w-8 h-8 rounded-lg bg-surface flex items-center justify-center text-text-muted hover:text-text-primary transition-colors">
          <ChevronLeft size={16} />
        </button>
        <span className="font-bebas text-xl text-text-primary tracking-wide">
          {MONTH_NAMES[month]} {year}
        </span>
        <button onClick={nextMonth} className="w-8 h-8 rounded-lg bg-surface flex items-center justify-center text-text-muted hover:text-text-primary transition-colors">
          <ChevronRight size={16} />
        </button>
      </div>

      {/* Day headers */}
      <div className="grid grid-cols-7 mb-1">
        {DAY_HEADERS.map(d => (
          <div key={d} className="text-center text-xs text-white/50 py-1 font-medium">{d}</div>
        ))}
      </div>

      {/* Grid */}
      <div className="grid grid-cols-7 gap-0.5">
        {cells.map((date, i) => {
          if (!date) return <div key={`e-${i}`} className="aspect-square" />
          const dateStr = toISO(date)
          const daySlots = getSlotsForDate(date)
          const dayEvents = eventsByDate.get(dateStr) ?? []
          const hasOpenSlot = daySlots.length > 0 && date >= today && (!!artistId || !!isOwner)
          const hasEvent = dayEvents.length > 0
          const isPast = date < today
          const isToday = date.getTime() === today.getTime()
          const isSelected = selectedDate?.getTime() === date.getTime()

          const isEmptyFuture = isOwner && !isPast && !hasEvent && !hasOpenSlot && !isSelected

          return (
            <button
              key={dateStr}
              onClick={() => handleDayClick(date)}
              className={cn(
                'group relative aspect-square rounded-lg flex flex-col items-center justify-center text-sm transition-colors',
                isSelected
                  ? 'bg-accent text-white'
                  : hasOpenSlot
                  ? 'bg-accent/10 text-accent hover:bg-accent/20'
                  : hasEvent
                  ? 'text-white hover:bg-success/15 cursor-pointer'
                  : isOwner
                  ? isPast
                    ? 'text-white/30 hover:bg-white/5 cursor-pointer'
                    : 'text-white/50 hover:bg-accent/10 hover:text-accent/80 cursor-pointer'
                  : isPast
                  ? 'text-white/35 cursor-default'
                  : 'text-white/55 cursor-default',
                isToday && !isSelected ? 'ring-1 ring-accent/60' : '',
              )}
            >
              <span className="font-medium leading-none">{date.getDate()}</span>
              {hasOpenSlot && !isSelected && (
                <span className="absolute bottom-1 w-1 h-1 rounded-full bg-accent opacity-70" />
              )}
              {hasEvent && (
                <span className="absolute top-1 right-1.5 w-1.5 h-1.5 rounded-full bg-success" />
              )}
              {isEmptyFuture && (
                <Plus
                  size={13}
                  className="absolute bottom-0.5 right-0.5 opacity-0 group-hover:opacity-60 transition-opacity text-accent"
                />
              )}
            </button>
          )
        })}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-4 mt-3 text-xs text-text-muted">
        {(artistId || isOwner) && (
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded bg-accent/15 border border-accent/20" />
            <span>Boş Sahne</span>
          </div>
        )}
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full bg-success" />
          <span>Etkinlik Planlandı</span>
        </div>
      </div>
      </div>{/* end max-w-[500px] */}

      {/* Owner popup */}
      {ownerPopup}

      {/* Detail panel for artist/audience (non-owner) */}
      {!isOwner && selectedDate && (selectedDayEvents.length > 0 || selectedSlot) && (
        <div className="mt-5 rounded-xl border border-[rgba(228,224,216,0.15)] bg-surface overflow-hidden">
          <div className="px-4 py-3 border-b border-[rgba(228,224,216,0.08)]">
            <p className="font-semibold text-text-primary text-sm">
              {selectedDate.toLocaleDateString('tr-TR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
            </p>
          </div>

          {selectedDayEvents.length > 0 && (
            <div className="px-4 py-3 space-y-2">
              {selectedDayEvents.map(ev => (
                <Link key={ev.id} href={`/events/${ev.id}`} className="flex items-start gap-3 hover:bg-[rgba(228,224,216,0.06)] -mx-2 px-2 py-1.5 rounded-lg transition-colors group">
                  <span className="w-1.5 h-1.5 rounded-full bg-success mt-1.5 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-text-primary text-sm font-medium group-hover:text-accent transition-colors">{ev.title}</p>
                    <p className="text-text-muted text-xs mt-0.5">
                      {formatTime(ev.start_time)}{ev.end_time ? ` – ${formatTime(ev.end_time)}` : ''}
                      {ev.artists?.stage_name ? ` · ${ev.artists.stage_name}` : ''}
                      {ev.bands?.name ? ` · ${ev.bands.name}` : ''}
                    </p>
                  </div>
                  <span className="text-text-muted text-xs opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 mt-0.5">→</span>
                </Link>
              ))}
            </div>
          )}

          {selectedSlot && artistId && (
            <div className={cn('px-4 py-3 space-y-3', selectedDayEvents.length > 0 && 'border-t border-[rgba(228,224,216,0.08)]')}>
              <div>
                <p className="text-text-muted text-xs font-medium uppercase tracking-wide mb-1">Boş Sahne</p>
                <p className="text-text-muted text-xs">
                  {selectedSlot.event_type ?? 'Belirtilmemiş'} · {formatTime(selectedSlot.start_time)} – {formatTime(selectedSlot.end_time)}
                  {selectedSlot.fee_value ? ` · ${selectedSlot.fee_value}₺` : ''}
                  {selectedSlot.notes ? ` · ${selectedSlot.notes}` : ''}
                </p>
              </div>

              {success ? (
                <div className="text-center py-2">
                  <p className="text-success text-sm font-medium">✓ Talebiniz alındı!</p>
                  <p className="text-text-muted text-xs mt-0.5">Mekan sahibi en kısa sürede dönüş yapacak.</p>
                </div>
              ) : (
                <>
                  <div>
                    <label className="label">Başvuru Türü</label>
                    <div className="flex rounded-lg overflow-hidden border border-[rgba(228,224,216,0.15)]">
                      <button
                        type="button"
                        onClick={() => { setApplyAs('self'); setBandId('') }}
                        className={cn(
                          'flex-1 py-2 text-sm transition-colors',
                          applyAs === 'self' ? 'bg-accent text-white' : 'text-text-muted hover:text-text-primary'
                        )}
                      >
                        Kendi Adıma
                      </button>
                      <button
                        type="button"
                        onClick={() => setApplyAs('band')}
                        disabled={artistBands.length === 0}
                        className={cn(
                          'flex-1 py-2 text-sm transition-colors border-l border-[rgba(228,224,216,0.15)] disabled:opacity-30',
                          applyAs === 'band' ? 'bg-accent text-white' : 'text-text-muted hover:text-text-primary'
                        )}
                      >
                        Grup Adına
                      </button>
                    </div>
                    {applyAs === 'band' && artistBands.length > 0 && (
                      <select value={bandId} onChange={e => setBandId(e.target.value)} className="input-field text-sm mt-2">
                        <option value="">Grup seçin...</option>
                        {artistBands.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                      </select>
                    )}
                  </div>
                  <div>
                    <label className="label">Mesaj (isteğe bağlı)</label>
                    <textarea
                      value={message}
                      onChange={e => setMessage(e.target.value)}
                      rows={2}
                      placeholder="Kendinizi tanıtın, repertuarınızdan bahsedin..."
                      className="input-field resize-none text-sm"
                    />
                  </div>
                  {error && <p className="text-red-400 text-xs">{error}</p>}
                  <button
                    onClick={handleApply}
                    disabled={loading}
                    className="btn-accent w-full py-2.5 text-sm disabled:opacity-50"
                  >
                    {loading ? 'Gönderiliyor...' : 'Sahne Al'}
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
