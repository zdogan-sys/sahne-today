'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Trash2, Plus } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { DAY_NAMES, FEE_MODEL_LABELS, formatTime } from '@/lib/utils'
import { BottomSheet } from '@/components/ui/BottomSheet'
import { MUSIC_GENRES, STAGE_GENRES } from '@/lib/constants'

interface SlotEntry {
  id: string
  day_of_week: number
  start_time: string
  end_time: string
  fee_model: string
  fee_value: number | null
  recurrence: string
  notes: string | null
}

interface Props {
  slots: SlotEntry[]
  venueId: string
  isOwner: boolean
  hasUser: boolean
}

export function VenueSlotsList({ slots: initialSlots, venueId, isOwner, hasUser }: Props) {
  const [slots, setSlots] = useState(initialSlots)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [showAdd, setShowAdd] = useState(false)
  const [adding, setAdding] = useState(false)
  const [error, setError] = useState('')

  const [newSlot, setNewSlot] = useState({
    day_of_week: 5,
    start_time: '21:00',
    end_time: '23:00',
    recurrence: 'weekly',
    fee_model: 'free',
    fee_value: '',
    notes: '',
    event_type: ''
  })
  
  const supabase = createClient()

  async function handleDelete(slotId: string) {
    setDeleting(slotId)
    const { error } = await supabase
      .from('slots')
      .update({ status: 'closed' })
      .eq('id', slotId)
    if (!error) {
      setSlots(prev => prev.filter(s => s.id !== slotId))
    }
    setDeleting(null)
  }

  async function handleAddSlot() {
    setAdding(true)
    setError('')

    const slotInsert = {
      venue_id: venueId,
      day_of_week: newSlot.day_of_week,
      start_time: newSlot.start_time,
      end_time: newSlot.end_time,
      recurrence: newSlot.recurrence,
      fee_model: newSlot.fee_model,
      fee_value: newSlot.fee_value ? parseFloat(newSlot.fee_value) : null,
      notes: newSlot.notes || null,
      event_type: newSlot.event_type,
      status: 'open',
    }

    const { data, error: err } = await supabase.from('slots').insert(slotInsert as any).select().single()

    if (err || !data) {
      setError('Slot eklenirken bir hata oluştu.')
    } else {
      setSlots(prev => [...prev, data as SlotEntry])
      setShowAdd(false)
      setNewSlot({
        day_of_week: 5, start_time: '21:00', end_time: '23:00',
        recurrence: 'weekly', fee_model: 'free', fee_value: '', notes: '', event_type: ''
      })
    }
    setAdding(false)
  }

  if (slots.length === 0 && !isOwner) return null

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-bebas text-2xl text-text-primary">AÇIK SLOTLAR</h2>
        {isOwner && (
          <button
            onClick={() => setShowAdd(true)}
            className="flex items-center gap-1 text-xs text-accent hover:underline px-2 py-1 bg-accent/10 rounded-md transition-colors"
          >
            <Plus size={12} />
            Yeni Slot Ekle
          </button>
        )}
      </div>

      <div className="space-y-2">
        {slots.length === 0 ? (
          <p className="text-text-muted text-sm italic">Henüz açık slot bulunmuyor.</p>
        ) : slots.map((slot) => (
          <div key={slot.id} className="card p-4 flex items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-medium text-text-primary text-sm">{DAY_NAMES[slot.day_of_week]}</span>
                <span className="text-text-muted text-sm">{formatTime(slot.start_time)} – {formatTime(slot.end_time)}</span>
                <span className="chip bg-[rgba(228,224,216,0.06)] text-text-muted border border-[rgba(228,224,216,0.1)]">
                  {slot.recurrence === 'weekly' ? 'Haftalık' : slot.recurrence === 'biweekly' ? '2 Haftada Bir' : 'Tek Sefer'}
                </span>
              </div>
              <div className="mt-1 text-xs text-text-muted">
                {FEE_MODEL_LABELS[slot.fee_model]}
                {slot.fee_value ? ` · ${slot.fee_value}₺` : ''}
                {slot.notes ? ` · ${slot.notes}` : ''}
              </div>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              {isOwner && (
                <button
                  onClick={() => handleDelete(slot.id)}
                  disabled={deleting === slot.id}
                  className="w-8 h-8 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 flex items-center justify-center transition-colors disabled:opacity-50"
                  title="Slotu kapat"
                >
                  <Trash2 size={14} />
                </button>
              )}
              {!isOwner && hasUser && (
                <Link href={`/venues/${venueId}/calendar`} className="btn-accent py-1.5 px-4 text-sm">
                  Sahne Al
                </Link>
              )}
            </div>
          </div>
        ))}
      </div>

      <BottomSheet open={showAdd} onClose={() => setShowAdd(false)} title="Yeni Slot Ekle">
        <div className="space-y-4 pb-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Gün</label>
              <select value={newSlot.day_of_week} onChange={(e) => setNewSlot({ ...newSlot, day_of_week: parseInt(e.target.value) })} className="input-field text-sm">
                {DAY_NAMES.map((d, i) => <option key={i} value={i}>{d}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Tekrar</label>
              <select value={newSlot.recurrence} onChange={(e) => setNewSlot({ ...newSlot, recurrence: e.target.value })} className="input-field text-sm">
                <option value="weekly">Haftalık</option>
                <option value="biweekly">2 Haftada Bir</option>
                <option value="once">Tek Sefer</option>
              </select>
            </div>
            <div>
              <label className="label">Başlangıç</label>
              <input type="time" value={newSlot.start_time} onChange={(e) => setNewSlot({ ...newSlot, start_time: e.target.value })} className="input-field text-sm" />
            </div>
            <div>
              <label className="label">Bitiş</label>
              <input type="time" value={newSlot.end_time} onChange={(e) => setNewSlot({ ...newSlot, end_time: e.target.value })} className="input-field text-sm" />
            </div>
            <div>
              <label className="label">Ücret Modeli</label>
              <select value={newSlot.fee_model} onChange={(e) => setNewSlot({ ...newSlot, fee_model: e.target.value })} className="input-field text-sm">
                <option value="free">Ücretsiz</option>
                <option value="door_share">Kapı Paylaşımı</option>
                <option value="guarantee">Garanti</option>
                <option value="negotiable">Pazarlığa Açık</option>
              </select>
            </div>
            <div>
              <label className="label">Tutar (₺)</label>
              <input type="number" value={newSlot.fee_value} onChange={(e) => setNewSlot({ ...newSlot, fee_value: e.target.value })} placeholder="0" className="input-field text-sm" />
            </div>
          </div>
          <div>
            <label className="label">Etkinlik Türü</label>
            <select value={newSlot.event_type} onChange={(e) => setNewSlot({ ...newSlot, event_type: e.target.value })} className="input-field text-sm">
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
            <label className="label">Notlar</label>
            <input value={newSlot.notes} onChange={(e) => setNewSlot({ ...newSlot, notes: e.target.value })} placeholder="Özel koşullar..." className="input-field text-sm" />
          </div>

          {error && <p className="text-red-400 text-xs">{error}</p>}
          
          <button
            onClick={handleAddSlot}
            disabled={adding}
            className="btn-accent w-full py-3 text-sm disabled:opacity-50 mt-2"
          >
            {adding ? 'Ekleniyor...' : 'Slotu Ekle'}
          </button>
        </div>
      </BottomSheet>
    </div>
  )
}
