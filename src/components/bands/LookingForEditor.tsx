'use client'

import { useState } from 'react'
import { useLocale } from 'next-intl'
import { Plus, X } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { translateInstrument } from '@/lib/utils'

const INSTRUMENT_OPTIONS = ['Gitar', 'Bas', 'Davul', 'Klavye', 'Keman', 'Vokal', 'Saz', 'Flüt', 'Trompet', 'Ud']

export function LookingForEditor({ bandId, initialValue }: { bandId: string; initialValue: string[] }) {
  const locale = useLocale()
  const isEn = locale === 'en'
  const [items, setItems] = useState<string[]>(initialValue)
  const [selected, setSelected] = useState('')
  const [saving, setSaving] = useState(false)
  const supabase = createClient()

  async function save(next: string[]) {
    setSaving(true)
    await supabase.from('bands').update({ looking_for: next } as any).eq('id', bandId)
    setSaving(false)
  }

  async function add() {
    if (!selected || items.includes(selected)) return
    const next = [...items, selected]
    setItems(next)
    setSelected('')
    await save(next)
  }

  async function remove(item: string) {
    const next = items.filter((i) => i !== item)
    setItems(next)
    await save(next)
  }

  const available = INSTRUMENT_OPTIONS.filter((o) => !items.includes(o))

  return (
    <div>
      <h3 className="label">{isEn ? 'Instruments We Need' : 'Aradığımız Enstrümanlar'}</h3>

      {items.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-3">
          {items.map((item) => (
            <span key={item} className="flex items-center gap-1 chip bg-accent/10 text-accent border border-accent/20">
              {translateInstrument(item, locale)}
              <button
                type="button"
                onClick={() => remove(item)}
                className="hover:text-white ml-0.5 transition-colors"
              >
                <X size={10} />
              </button>
            </span>
          ))}
        </div>
      )}

      {available.length > 0 && (
        <div className="flex gap-2">
          <select
            value={selected}
            onChange={(e) => setSelected(e.target.value)}
            className="input-field text-sm flex-1"
          >
            <option value="">{isEn ? 'Select instrument...' : 'Enstrüman seç...'}</option>
            {available.map((o) => <option key={o} value={o}>{translateInstrument(o, locale)}</option>)}
          </select>
          <button
            type="button"
            onClick={add}
            disabled={!selected || saving}
            className="btn-outline px-3 disabled:opacity-40 flex items-center gap-1"
          >
            <Plus size={14} />
            {isEn ? 'Add' : 'Ekle'}
          </button>
        </div>
      )}

      {saving && <p className="text-text-muted text-xs mt-1">{isEn ? 'Saving...' : 'Kaydediliyor...'}</p>}
    </div>
  )
}
