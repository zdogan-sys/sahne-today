'use client'

import { useState } from 'react'
import { Pencil, Check, X } from 'lucide-react'
import { updateEvent } from '@/app/actions/event'
import { useRouter } from 'next/navigation'

interface Props {
  eventId: string
  initialDescription: string | null
  isParty: boolean
}

export function EventDescription({ eventId, initialDescription, isParty }: Props) {
  const [editing, setEditing] = useState(false)
  const [value, setValue] = useState(initialDescription ?? '')
  const [saved, setSaved] = useState(initialDescription ?? '')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function handleSave() {
    setLoading(true)
    const res = await updateEvent(eventId, { description: value.trim() || null } as any)
    setLoading(false)
    if (res.success) {
      setSaved(value.trim())
      setEditing(false)
      router.refresh()
    }
  }

  function handleCancel() {
    setValue(saved)
    setEditing(false)
  }

  if (!isParty && !saved) return null

  return (
    <div>
      <div className="flex items-center gap-2 mb-1">
        <p className="text-text-muted text-xs font-medium uppercase tracking-wide">Açıklama</p>
        {isParty && !editing && (
          <button
            onClick={() => setEditing(true)}
            className="text-text-muted hover:text-accent transition-colors"
          >
            <Pencil size={11} />
          </button>
        )}
      </div>

      {editing ? (
        <div className="space-y-2">
          <textarea
            value={value}
            onChange={e => setValue(e.target.value)}
            rows={4}
            autoFocus
            placeholder="Etkinlik hakkında birkaç satır yaz…"
            className="input-field text-sm resize-none w-full"
          />
          <div className="flex gap-2">
            <button
              onClick={handleSave}
              disabled={loading}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-accent text-white text-xs font-semibold hover:bg-accent/80 transition-colors disabled:opacity-50"
            >
              <Check size={12} />
              {loading ? 'Kaydediliyor…' : 'Kaydet'}
            </button>
            <button
              onClick={handleCancel}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-[rgba(228,224,216,0.1)] text-text-muted text-xs hover:text-text-primary transition-colors"
            >
              <X size={12} />
              İptal
            </button>
          </div>
        </div>
      ) : saved ? (
        <p
          className={`text-text-primary text-sm leading-relaxed ${isParty ? 'cursor-pointer hover:text-text-primary/80' : ''}`}
          onClick={isParty ? () => setEditing(true) : undefined}
        >
          {saved}
        </p>
      ) : (
        <button
          onClick={() => setEditing(true)}
          className="text-text-muted text-sm hover:text-accent transition-colors"
        >
          + Açıklama ekle
        </button>
      )}
    </div>
  )
}
