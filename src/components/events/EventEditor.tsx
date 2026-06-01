'use client'

import { useState } from 'react'
import { createPortal } from 'react-dom'
import { useLocale } from 'next-intl'
import { Pencil, X } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { updateEvent } from '@/app/actions/event'
import { ALL_GENRES } from '@/lib/constants'

interface Props {
  eventId: string
  initial: {
    title: string
    event_date: string
    start_time: string
    end_time: string | null
    genre: string | null
    entry_type: string
    entry_fee: number | null
    description: string | null
    ticketing_enabled?: boolean
    ticket_price?: number | null
    ticket_count?: number | null
    commission_included?: boolean
  }
}

export function EventEditor({ eventId, initial }: Props) {
  const isEn = useLocale() === 'en'
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const [title, setTitle] = useState(initial.title)
  const [eventDate, setEventDate] = useState(initial.event_date)
  const [startTime, setStartTime] = useState(initial.start_time)
  const [endTime, setEndTime] = useState(initial.end_time ?? '')
  const [genre, setGenre] = useState(initial.genre ?? '')
  const [entryType, setEntryType] = useState(initial.entry_type)
  const [entryFee, setEntryFee] = useState(initial.entry_fee?.toString() ?? '')
  const [description, setDescription] = useState(initial.description ?? '')
  const [ticketingEnabled, setTicketingEnabled] = useState(initial.ticketing_enabled ?? false)
  const [ticketPrice, setTicketPrice] = useState(initial.ticket_price?.toString() ?? '')
  const [ticketCount, setTicketCount] = useState(initial.ticket_count?.toString() ?? '')
  const [commissionIncluded, setCommissionIncluded] = useState(initial.commission_included ?? true)

  function handleOpen() {
    setTitle(initial.title)
    setEventDate(initial.event_date)
    setStartTime(initial.start_time)
    setEndTime(initial.end_time ?? '')
    setGenre(initial.genre ?? '')
    setEntryType(initial.entry_type)
    setEntryFee(initial.entry_fee?.toString() ?? '')
    setDescription(initial.description ?? '')
    setTicketingEnabled(initial.ticketing_enabled ?? false)
    setTicketPrice(initial.ticket_price?.toString() ?? '')
    setTicketCount(initial.ticket_count?.toString() ?? '')
    setCommissionIncluded(initial.commission_included ?? true)
    setError('')
    setOpen(true)
  }

  async function handleSave() {
    if (!title || !eventDate || !startTime) return
    setLoading(true)
    setError('')
    const res = await updateEvent(eventId, {
      title,
      event_date: eventDate,
      start_time: startTime,
      end_time: endTime || null,
      genre: genre || null,
      entry_type: entryType,
      entry_fee: entryType !== 'free' && entryFee ? Number(entryFee) : null,
      description: description || null,
      ticketing_enabled: ticketingEnabled,
      ticket_price: ticketingEnabled && ticketPrice ? Number(ticketPrice) : null,
      ticket_count: ticketingEnabled && ticketCount ? Number(ticketCount) : null,
      commission_included: commissionIncluded,
    })
    setLoading(false)
    if (!res.success) {
      setError(res.error ?? 'Kaydedilemedi.')
    } else {
      setOpen(false)
      router.refresh()
    }
  }

  const modal = open ? createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={e => { if (e.target === e.currentTarget) setOpen(false) }}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div className="relative w-full max-w-md bg-surface rounded-2xl border border-[rgba(228,224,216,0.15)] shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b border-[rgba(228,224,216,0.08)] flex-shrink-0">
          <p className="font-semibold text-text-primary text-sm">{isEn ? 'Edit Event' : 'Etkinliği Düzenle'}</p>
          <button onClick={() => setOpen(false)} className="w-7 h-7 rounded-lg flex items-center justify-center text-text-muted hover:text-text-primary hover:bg-[rgba(228,224,216,0.08)] transition-colors">
            <X size={15} />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 px-5 py-4 space-y-4">
          <div>
            <label className="label">Etkinlik Adı *</label>
            <input value={title} onChange={e => setTitle(e.target.value)} className="input-field text-sm" placeholder="Etkinlik adı..." />
          </div>

          <div>
            <label className="label">Tarih *</label>
            <input type="date" value={eventDate} onChange={e => setEventDate(e.target.value)} className="input-field text-sm" />
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
            <label className="label">Müzik Türü</label>
            <select value={genre} onChange={e => setGenre(e.target.value)} className="input-field text-sm">
              <option value="">Seçin</option>
              {ALL_GENRES.map(g => <option key={g} value={g}>{g}</option>)}
            </select>
          </div>

          <div>
            <label className="label">Giriş</label>
            <div className="flex gap-2">
              <button
                onClick={() => setEntryType('free')}
                className={`flex-1 py-2 rounded-lg text-sm border transition-colors ${entryType === 'free' ? 'border-accent bg-accent/10 text-accent' : 'border-[rgba(228,224,216,0.1)] text-text-muted hover:border-[rgba(228,224,216,0.25)]'}`}
              >
                Ücretsiz
              </button>
              <button
                onClick={() => setEntryType('paid')}
                className={`flex-1 py-2 rounded-lg text-sm border transition-colors ${entryType === 'paid' ? 'border-accent bg-accent/10 text-accent' : 'border-[rgba(228,224,216,0.1)] text-text-muted hover:border-[rgba(228,224,216,0.25)]'}`}
              >
                Ücretli
              </button>
            </div>
            {entryType === 'paid' && (
              <input
                type="number"
                value={entryFee}
                onChange={e => setEntryFee(e.target.value)}
                className="input-field text-sm mt-2"
                placeholder="Bilet ücreti (₺)"
                min="0"
              />
            )}
          </div>

          <div>
            <label className="label">Açıklama</label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              className="input-field text-sm resize-none"
              rows={3}
              placeholder="Etkinlik açıklaması..."
            />
          </div>

          {/* Ticketing */}
          <div className="border-t border-[rgba(228,224,216,0.08)] pt-4">
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-sm text-text-primary font-medium">Online Bilet Satışı</p>
                <p className="text-xs text-text-muted">Sahne.Today üzerinden bilet sat</p>
              </div>
              <button
                type="button"
                onClick={() => setTicketingEnabled(v => !v)}
                className={`relative w-11 h-6 rounded-full transition-colors ${ticketingEnabled ? 'bg-accent' : 'bg-[rgba(228,224,216,0.15)]'}`}
              >
                <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition-transform ${ticketingEnabled ? 'translate-x-5' : 'translate-x-0'}`} />
              </button>
            </div>

            {ticketingEnabled && (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="label">Bilet Fiyatı (₺)</label>
                    <input
                      type="number"
                      value={ticketPrice}
                      onChange={e => setTicketPrice(e.target.value)}
                      className="input-field text-sm"
                      placeholder="0.00"
                      min="0"
                      step="0.01"
                    />
                  </div>
                  <div>
                    <label className="label">Kontenjan</label>
                    <input
                      type="number"
                      value={ticketCount}
                      onChange={e => setTicketCount(e.target.value)}
                      className="input-field text-sm"
                      placeholder="Kaç bilet?"
                      min="1"
                    />
                  </div>
                </div>

                <div className="rounded-lg border border-[rgba(228,224,216,0.1)] p-3 space-y-2">
                  <p className="text-xs text-text-muted font-medium uppercase tracking-wide">Komisyon Modeli</p>
                  <button
                    type="button"
                    onClick={() => setCommissionIncluded(true)}
                    className={`w-full text-left px-3 py-2.5 rounded-lg border text-sm transition-colors ${commissionIncluded ? 'border-accent bg-accent/10 text-accent' : 'border-[rgba(228,224,216,0.1)] text-text-muted hover:border-[rgba(228,224,216,0.25)]'}`}
                  >
                    <span className="font-medium">Komisyon dahil</span>
                    <span className="block text-xs opacity-70 mt-0.5">Girdiğin fiyat alıcının ödediği son fiyattır</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setCommissionIncluded(false)}
                    className={`w-full text-left px-3 py-2.5 rounded-lg border text-sm transition-colors ${!commissionIncluded ? 'border-accent bg-accent/10 text-accent' : 'border-[rgba(228,224,216,0.1)] text-text-muted hover:border-[rgba(228,224,216,0.25)]'}`}
                  >
                    <span className="font-medium">Komisyon üstüne eklenir</span>
                    <span className="block text-xs opacity-70 mt-0.5">Alıcı girdiğin fiyat + hizmet bedelini öder</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {error && <p className="text-red-400 text-xs">{error}</p>}
        </div>

        <div className="px-5 py-4 border-t border-[rgba(228,224,216,0.08)] flex-shrink-0">
          <button
            onClick={handleSave}
            disabled={loading || !title || !eventDate || !startTime}
            className="btn-accent w-full py-3 text-sm disabled:opacity-50"
          >
            {loading ? 'Kaydediliyor...' : 'Kaydet'}
          </button>
        </div>
      </div>
    </div>,
    document.body
  ) : null

  return (
    <>
      <button
        onClick={handleOpen}
        className="flex items-center gap-1.5 text-xs text-text-muted hover:text-text-primary border border-[rgba(228,224,216,0.1)] hover:border-[rgba(228,224,216,0.25)] px-3 py-1.5 rounded-full transition-colors"
      >
        <Pencil size={12} />
        {isEn ? 'Edit' : 'Düzenle'}
      </button>
      {modal}
    </>
  )
}
