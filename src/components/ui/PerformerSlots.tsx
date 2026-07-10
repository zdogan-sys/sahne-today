'use client'

import { useState, useEffect, useCallback } from 'react'
import { useLocale } from 'next-intl'
import { createClient } from '@/lib/supabase/client'
import { FEE_MODEL_LABELS, formatTime } from '@/lib/utils'
import { CalendarPlus, Trash2, Clock, Loader2, Send, Check } from 'lucide-react'
import { addVenueEvent } from '@/app/actions/event'

type PerformerSlot = {
  id: string
  slot_date: string
  start_time: string | null
  end_time: string | null
  fee_model: string
  fee_value: number | null
  notes: string | null
  status: string
}

interface Props {
  performerType: 'artist' | 'band'
  performerId: string
  performerName?: string
  isOwner: boolean
}

// Sanatçı/grup müsaitlik slotları. Görünürlük RLS ile sınırlı:
// sahibi yönetir, sadece takip eden mekan sahipleri görür (030 migration).
// Yetkisiz kullanıcıda sorgu boş döner ve bölüm hiç render olmaz.
export function PerformerSlots({ performerType, performerId, performerName, isOwner }: Props) {
  const locale = useLocale()
  const isEn = locale === 'en'
  const supabase = createClient()

  const [slots, setSlots] = useState<PerformerSlot[]>([])
  const [loaded, setLoaded] = useState(false)
  const [saving, setSaving] = useState(false)
  const [formOpen, setFormOpen] = useState(false)
  const [form, setForm] = useState({ slot_date: '', start_time: '', end_time: '', fee_model: 'negotiable', notes: '' })

  // Teklif akışı (görüntüleyen mekan sahibiyse)
  const [myVenues, setMyVenues] = useState<{ id: string; name: string }[]>([])
  const [offerSlotId, setOfferSlotId] = useState<string | null>(null)
  const [offerVenueId, setOfferVenueId] = useState('')
  const [offerTitle, setOfferTitle] = useState('')
  const [offerSending, setOfferSending] = useState(false)
  const [offerSentIds, setOfferSentIds] = useState<string[]>([])
  const [offerError, setOfferError] = useState('')

  const idColumn = performerType === 'artist' ? 'artist_id' : 'band_id'

  const load = useCallback(async () => {
    const today = new Date().toISOString().split('T')[0]
    const { data } = await supabase
      .from('performer_slots')
      .select('*')
      .eq(idColumn, performerId)
      .gte('slot_date', today)
      .order('slot_date', { ascending: true })
    setSlots((data as PerformerSlot[]) ?? [])
    setLoaded(true)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idColumn, performerId])

  useEffect(() => { load() }, [load])

  // Görüntüleyen mekan sahibiyse teklif atabileceği mekanlarını getir
  useEffect(() => {
    if (isOwner) return
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return
      const { data } = await supabase.from('venues').select('id, name').eq('owner_id', user.id)
      setMyVenues((data as { id: string; name: string }[]) ?? [])
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOwner])

  function openOffer(slot: PerformerSlot) {
    setOfferSlotId(slot.id)
    setOfferVenueId(myVenues[0]?.id ?? '')
    setOfferTitle(performerName ?? '')
    setOfferError('')
  }

  async function sendOffer(slot: PerformerSlot) {
    if (!offerVenueId || !offerTitle.trim()) return
    setOfferSending(true)
    setOfferError('')
    const res = await addVenueEvent({
      venueId: offerVenueId,
      title: offerTitle.trim(),
      eventDate: slot.slot_date,
      startTime: slot.start_time ?? '21:00',
      endTime: slot.end_time,
      artistId: performerType === 'artist' ? performerId : null,
      bandId: performerType === 'band' ? performerId : null,
      artistName: null,
    })
    setOfferSending(false)
    if (res.success) {
      setOfferSentIds(prev => [...prev, slot.id])
      setOfferSlotId(null)
    } else {
      setOfferError(res.error ?? (isEn ? 'Could not send offer' : 'Teklif gönderilemedi'))
    }
  }

  async function addSlot() {
    if (!form.slot_date) return
    setSaving(true)
    await supabase.from('performer_slots').insert({
      [idColumn]: performerId,
      slot_date: form.slot_date,
      start_time: form.start_time || null,
      end_time: form.end_time || null,
      fee_model: form.fee_model,
      notes: form.notes || null,
    })
    setForm({ slot_date: '', start_time: '', end_time: '', fee_model: 'negotiable', notes: '' })
    setFormOpen(false)
    setSaving(false)
    load()
  }

  async function removeSlot(id: string) {
    await supabase.from('performer_slots').delete().eq('id', id)
    load()
  }

  async function toggleStatus(slot: PerformerSlot) {
    await supabase.from('performer_slots')
      .update({ status: slot.status === 'open' ? 'booked' : 'open' })
      .eq('id', slot.id)
    load()
  }

  // Yetkisiz görüntüleyiciye (RLS boş döndürür) hiç görünme
  if (!isOwner && (!loaded || slots.length === 0)) return null

  const visibleSlots = isOwner ? slots : slots.filter(s => s.status === 'open')

  return (
    <div className="card p-5">
      <div className="flex items-center justify-between mb-1">
        <h3 className="label flex items-center gap-2">
          <CalendarPlus size={13} />
          {isEn ? 'Available Dates' : 'Müsait Tarihler'}
        </h3>
        {isOwner && (
          <button onClick={() => setFormOpen(!formOpen)} className="text-accent text-sm hover:underline">
            {formOpen ? (isEn ? 'Cancel' : 'Vazgeç') : (isEn ? '+ Add date' : '+ Tarih ekle')}
          </button>
        )}
      </div>
      <p className="text-text-muted text-xs mb-3">
        {isOwner
          ? (isEn
              ? 'Only venues that follow you can see these dates.'
              : 'Bu tarihleri sadece seni takip eden mekanlar görebilir.')
          : (isEn
              ? 'Dates this performer is available for a booking.'
              : 'Sahne teklifi için müsait olunan tarihler.')}
      </p>

      {isOwner && formOpen && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-4 p-3 rounded-xl border border-[rgba(228,224,216,0.1)]">
          <input type="date" value={form.slot_date}
            onChange={e => setForm({ ...form, slot_date: e.target.value })}
            className="input-field text-sm col-span-2 sm:col-span-1" />
          <input type="time" value={form.start_time}
            onChange={e => setForm({ ...form, start_time: e.target.value })}
            className="input-field text-sm" />
          <input type="time" value={form.end_time}
            onChange={e => setForm({ ...form, end_time: e.target.value })}
            className="input-field text-sm" />
          <select value={form.fee_model}
            onChange={e => setForm({ ...form, fee_model: e.target.value })}
            className="input-field text-sm col-span-2 sm:col-span-1">
            {Object.entries(FEE_MODEL_LABELS).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
          <input type="text" value={form.notes} placeholder={isEn ? 'Note (optional)' : 'Not (opsiyonel)'}
            onChange={e => setForm({ ...form, notes: e.target.value })}
            className="input-field text-sm col-span-2" />
          <button onClick={addSlot} disabled={saving || !form.slot_date}
            className="btn-accent py-2 px-4 text-sm col-span-2 sm:col-span-3 disabled:opacity-50 flex items-center justify-center gap-1.5">
            {saving && <Loader2 size={13} className="animate-spin" />}
            {isEn ? 'Save' : 'Kaydet'}
          </button>
        </div>
      )}

      {visibleSlots.length === 0 ? (
        <p className="text-text-muted text-sm">
          {isEn ? 'No upcoming available dates.' : 'Yaklaşan müsait tarih yok.'}
        </p>
      ) : (
        <div className="space-y-2">
          {visibleSlots.map(slot => {
            const d = new Date(slot.slot_date)
            const offerSent = offerSentIds.includes(slot.id)
            return (
              <div key={slot.id}
                className={`rounded-xl border border-[rgba(228,224,216,0.1)] p-3 ${slot.status !== 'open' ? 'opacity-50' : ''}`}>
              <div className="flex items-center gap-3">
                <div className="flex-shrink-0 w-11 h-11 bg-[rgba(212,83,126,0.08)] rounded-lg flex flex-col items-center justify-center border border-accent/20">
                  <span className="font-bebas text-lg text-accent leading-none">{d.getDate()}</span>
                  <span className="text-[9px] text-accent/70 uppercase">
                    {d.toLocaleDateString(isEn ? 'en-US' : 'tr-TR', { month: 'short' })}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 text-xs text-text-muted">
                    <span>{d.toLocaleDateString(isEn ? 'en-US' : 'tr-TR', { weekday: 'long' })}</span>
                    {slot.start_time && (
                      <span className="flex items-center gap-1">
                        <Clock size={9} />
                        {formatTime(slot.start_time)}{slot.end_time ? `–${formatTime(slot.end_time)}` : ''}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="chip border bg-accent/10 text-accent border-accent/30 text-[11px]">
                      {FEE_MODEL_LABELS[slot.fee_model] ?? slot.fee_model}
                    </span>
                    {slot.notes && <span className="text-xs text-text-muted truncate">{slot.notes}</span>}
                  </div>
                </div>
                {isOwner && (
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button onClick={() => toggleStatus(slot)}
                      className="text-xs text-text-muted hover:text-text-primary">
                      {slot.status === 'open' ? (isEn ? 'Mark booked' : 'Dolu işaretle') : (isEn ? 'Reopen' : 'Tekrar aç')}
                    </button>
                    <button onClick={() => removeSlot(slot.id)} className="text-red-400/70 hover:text-red-400">
                      <Trash2 size={14} />
                    </button>
                  </div>
                )}
                {!isOwner && myVenues.length > 0 && (
                  offerSent ? (
                    <span className="flex items-center gap-1 text-success text-xs flex-shrink-0">
                      <Check size={13} /> {isEn ? 'Offer sent' : 'Teklif gönderildi'}
                    </span>
                  ) : (
                    <button onClick={() => openOffer(slot)}
                      className="btn-accent py-1.5 px-3 text-xs flex items-center gap-1 flex-shrink-0">
                      <Send size={11} /> {isEn ? 'Send offer' : 'Teklif Gönder'}
                    </button>
                  )
                )}
              </div>

              {offerSlotId === slot.id && !offerSent && (
                <div className="mt-3 pt-3 border-t border-[rgba(228,224,216,0.08)] grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {myVenues.length > 1 && (
                    <select value={offerVenueId} onChange={e => setOfferVenueId(e.target.value)}
                      className="input-field text-sm">
                      {myVenues.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
                    </select>
                  )}
                  <input type="text" value={offerTitle} onChange={e => setOfferTitle(e.target.value)}
                    placeholder={isEn ? 'Event title' : 'Etkinlik başlığı'}
                    className={`input-field text-sm ${myVenues.length > 1 ? '' : 'sm:col-span-2'}`} />
                  <button onClick={() => sendOffer(slot)} disabled={offerSending || !offerTitle.trim()}
                    className="btn-accent py-2 px-4 text-sm disabled:opacity-50 flex items-center justify-center gap-1.5">
                    {offerSending ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />}
                    {isEn ? 'Send (48h valid)' : 'Gönder (48 saat geçerli)'}
                  </button>
                  {offerError && <p className="text-red-400 text-xs sm:col-span-3">{offerError}</p>}
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
