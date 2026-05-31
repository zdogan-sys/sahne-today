'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useLocale } from 'next-intl'
import { Trash2, Plus, Pencil } from 'lucide-react'
import { getDayNames, FEE_MODEL_LABELS, formatTime } from '@/lib/utils'
import { closeSlot, createSlot, updateSlot } from '@/app/actions/event'
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
  status: string
  event_type?: string | null
}

const STATUS_CONFIG: Record<string, { border: string; bg: string; color: string; label: string }> = {
  open:    { border: '#1D9E75', bg: 'rgba(29,158,117,0.15)',  color: '#1D9E75', label: 'Açık' },
  pending: { border: '#d4a820', bg: 'rgba(212,168,32,0.15)',  color: '#d4a820', label: 'Bekliyor' },
  booked:  { border: '#8f88d4', bg: 'rgba(143,136,212,0.15)', color: '#8f88d4', label: 'Dolu' },
}

const EMPTY_FORM = {
  day_of_week: 5,
  start_time: '21:00',
  end_time: '23:00',
  recurrence: 'weekly',
  fee_model: 'free',
  fee_value: '',
  notes: '',
  event_type: '',
}

interface Props {
  slots: SlotEntry[]
  venueId: string
  isOwner: boolean
  hasUser: boolean
}

export function VenueSlotsList({ slots: initialSlots, venueId, isOwner, hasUser }: Props) {
  const locale = useLocale()
  const dayNames = getDayNames(locale)
  const [slots, setSlots] = useState(initialSlots)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [showAdd, setShowAdd] = useState(false)
  const [editingSlot, setEditingSlot] = useState<SlotEntry | null>(null)
  const [adding, setAdding] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const [newSlot, setNewSlot] = useState(EMPTY_FORM)
  const [editForm, setEditForm] = useState(EMPTY_FORM)

  function openEdit(slot: SlotEntry) {
    setEditingSlot(slot)
    setEditForm({
      day_of_week: slot.day_of_week,
      start_time: slot.start_time?.slice(0, 5) ?? '21:00',
      end_time: slot.end_time?.slice(0, 5) ?? '23:00',
      recurrence: slot.recurrence,
      fee_model: slot.fee_model,
      fee_value: slot.fee_value != null ? String(slot.fee_value) : '',
      notes: slot.notes ?? '',
      event_type: slot.event_type ?? '',
    })
    setError('')
  }

  async function handleDelete(slotId: string) {
    setDeleting(slotId)
    const res = await closeSlot(slotId)
    if (res.success) {
      setSlots(prev => prev.filter(s => s.id !== slotId))
      setError('')
    } else {
      setError(res.error ?? 'Slot silinemedi.')
    }
    setDeleting(null)
  }

  async function handleAddSlot() {
    setAdding(true)
    setError('')
    const res = await createSlot(venueId, {
      day_of_week: newSlot.day_of_week,
      start_time: newSlot.start_time,
      end_time: newSlot.end_time,
      recurrence: newSlot.recurrence,
      fee_model: newSlot.fee_model,
      fee_value: newSlot.fee_value ? parseFloat(newSlot.fee_value) : null,
      notes: newSlot.notes || null,
      event_type: newSlot.event_type || null,
    })
    if (!res.success) {
      setError(res.error ?? 'Slot eklenirken bir hata oluştu.')
    } else {
      setShowAdd(false)
      setNewSlot(EMPTY_FORM)
      window.location.reload()
    }
    setAdding(false)
  }

  async function handleSaveEdit() {
    if (!editingSlot) return
    setSaving(true)
    setError('')
    const res = await updateSlot(editingSlot.id, {
      day_of_week: editForm.day_of_week,
      start_time: editForm.start_time,
      end_time: editForm.end_time,
      recurrence: editForm.recurrence,
      fee_model: editForm.fee_model,
      fee_value: editForm.fee_value ? parseFloat(editForm.fee_value) : null,
      notes: editForm.notes || null,
      event_type: editForm.event_type || null,
    })
    if (!res.success) {
      setError(res.error ?? 'Güncellenemedi.')
    } else {
      setSlots(prev => prev.map(s => s.id === editingSlot.id ? {
        ...s,
        day_of_week: editForm.day_of_week,
        start_time: editForm.start_time,
        end_time: editForm.end_time,
        recurrence: editForm.recurrence,
        fee_model: editForm.fee_model,
        fee_value: editForm.fee_value ? parseFloat(editForm.fee_value) : null,
        notes: editForm.notes || null,
        event_type: editForm.event_type || null,
      } : s))
      setEditingSlot(null)
    }
    setSaving(false)
  }

  if (slots.length === 0 && !isOwner) return null

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-bebas text-2xl text-text-primary">{isOwner ? 'SLOTLAR' : 'AÇIK SLOTLAR'}</h2>
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

      {error && <p className="text-red-400 text-xs mb-2">{error}</p>}

      {slots.length === 0 ? (
        <div className="text-center py-8 border border-dashed border-[rgba(228,224,216,0.12)] rounded-xl">
          <p className="text-text-muted text-sm mb-2">Henüz açık slot yok.</p>
          {isOwner && (
            <button onClick={() => setShowAdd(true)} className="text-accent text-xs hover:underline">
              İlk slotu ekle →
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {slots.map((slot) => {
            const cfg = STATUS_CONFIG[slot.status] ?? STATUS_CONFIG.open
            return (
              <div
                key={slot.id}
                className="card p-4 flex items-center justify-between gap-4"
                style={{ borderLeft: `3px solid ${cfg.border}` }}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-text-primary text-sm">{dayNames[slot.day_of_week]}</span>
                    <span className="text-text-muted text-sm">{formatTime(slot.start_time)} – {formatTime(slot.end_time)}</span>
                    <span className="chip bg-[rgba(228,224,216,0.06)] text-text-muted border border-[rgba(228,224,216,0.1)]">
                      {slot.recurrence === 'weekly' ? 'Haftalık' : slot.recurrence === 'biweekly' ? '2 Haftada Bir' : 'Tek Sefer'}
                    </span>
                    <span style={{ backgroundColor: cfg.bg, color: cfg.color, fontSize: '10px', padding: '3px 9px', borderRadius: '3px', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.02em' }}>
                      {cfg.label}
                    </span>
                  </div>
                  <div className="mt-1 text-xs text-text-muted">
                    {FEE_MODEL_LABELS[slot.fee_model]}
                    {slot.fee_value ? ` · ${slot.fee_value}₺` : ''}
                    {slot.notes ? ` · ${slot.notes}` : ''}
                    {(slot as any).event_type ? ` · ${(slot as any).event_type}` : ''}
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {isOwner && (
                    <>
                      <button
                        onClick={() => openEdit(slot)}
                        className="w-8 h-8 rounded-lg bg-[rgba(228,224,216,0.06)] text-text-muted hover:text-accent hover:bg-accent/10 flex items-center justify-center transition-colors"
                        title="Düzenle"
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        onClick={() => handleDelete(slot.id)}
                        disabled={deleting === slot.id}
                        className="w-8 h-8 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 flex items-center justify-center transition-colors disabled:opacity-50"
                        title="Slotu kapat"
                      >
                        <Trash2 size={14} />
                      </button>
                    </>
                  )}
                  {!isOwner && hasUser && slot.status === 'open' && (
                    <Link href={`/venues/${venueId}/calendar`} className="btn-accent py-1.5 px-4 text-sm">
                      Sahne Al
                    </Link>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Add BottomSheet */}
      <BottomSheet open={showAdd} onClose={() => setShowAdd(false)} title="Yeni Slot Ekle">
        <SlotForm form={newSlot} setForm={setNewSlot} error={error} />
        <button onClick={handleAddSlot} disabled={adding} className="btn-accent w-full py-3 text-sm disabled:opacity-50 mt-2">
          {adding ? 'Ekleniyor...' : 'Slotu Ekle'}
        </button>
      </BottomSheet>

      {/* Edit BottomSheet */}
      <BottomSheet open={!!editingSlot} onClose={() => setEditingSlot(null)} title="Slotu Düzenle">
        <SlotForm form={editForm} setForm={setEditForm} error={error} />
        <button onClick={handleSaveEdit} disabled={saving} className="btn-accent w-full py-3 text-sm disabled:opacity-50 mt-2">
          {saving ? 'Kaydediliyor...' : 'Kaydet'}
        </button>
      </BottomSheet>
    </div>
  )
}

function SlotForm({ form, setForm, error }: {
  form: typeof EMPTY_FORM
  setForm: (f: typeof EMPTY_FORM) => void
  error: string
}) {
  return (
    <div className="space-y-4 pb-4">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label">Gün</label>
          <select value={form.day_of_week} onChange={e => setForm({ ...form, day_of_week: parseInt(e.target.value) })} className="input-field text-sm">
            {DAY_NAMES.map((d, i) => <option key={i} value={i}>{d}</option>)}
          </select>
        </div>
        <div>
          <label className="label">Tekrar</label>
          <select value={form.recurrence} onChange={e => setForm({ ...form, recurrence: e.target.value })} className="input-field text-sm">
            <option value="weekly">Haftalık</option>
            <option value="biweekly">2 Haftada Bir</option>
            <option value="once">Tek Sefer</option>
          </select>
        </div>
        <div>
          <label className="label">Başlangıç</label>
          <input type="time" value={form.start_time} onChange={e => setForm({ ...form, start_time: e.target.value })} className="input-field text-sm" />
        </div>
        <div>
          <label className="label">Bitiş</label>
          <input type="time" value={form.end_time} onChange={e => setForm({ ...form, end_time: e.target.value })} className="input-field text-sm" />
        </div>
        <div>
          <label className="label">Ücret Modeli</label>
          <select value={form.fee_model} onChange={e => setForm({ ...form, fee_model: e.target.value })} className="input-field text-sm">
            <option value="free">Ücretsiz</option>
            <option value="door_share">Kapı Paylaşımı</option>
            <option value="guarantee">Garanti</option>
            <option value="negotiable">Pazarlığa Açık</option>
          </select>
        </div>
        <div>
          <label className="label">Tutar (₺)</label>
          <input type="number" value={form.fee_value} onChange={e => setForm({ ...form, fee_value: e.target.value })} placeholder="0" className="input-field text-sm" />
        </div>
      </div>
      <div>
        <label className="label">Etkinlik Türü</label>
        <select value={form.event_type} onChange={e => setForm({ ...form, event_type: e.target.value })} className="input-field text-sm">
          <option value="">Seçin</option>
          <optgroup label="Müzik">
            {MUSIC_GENRES.map(t => <option key={t} value={t}>{t}</option>)}
          </optgroup>
          <optgroup label="Sahne">
            {STAGE_GENRES.map(t => <option key={t} value={t}>{t}</option>)}
          </optgroup>
        </select>
      </div>
      <div>
        <label className="label">Notlar</label>
        <input value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} placeholder="Özel koşullar..." className="input-field text-sm" />
      </div>
      {error && <p className="text-red-400 text-xs">{error}</p>}
    </div>
  )
}
