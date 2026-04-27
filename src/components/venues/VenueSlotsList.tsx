'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Trash2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { DAY_NAMES, FEE_MODEL_LABELS, formatTime } from '@/lib/utils'

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

  if (slots.length === 0) return null

  return (
    <div>
      <h2 className="font-bebas text-2xl text-text-primary mb-3">AÇIK SLOTLAR</h2>
      <div className="space-y-2">
        {slots.map((slot) => (
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
                  Başvur
                </Link>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
