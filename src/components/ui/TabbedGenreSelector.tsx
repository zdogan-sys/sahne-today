'use client'

import { useState, useEffect } from 'react'
import { useLocale } from 'next-intl'
import { cn, translateGenre } from '@/lib/utils'
import { MUSIC_GENRES, STAGE_GENRES, DANCE_OPTIONS } from '@/lib/constants'

type TabKey = 'music' | 'stage' | 'dance'

export function TabbedGenreSelector({ selected, onToggle, label, onTabChange, danceSelected, onDanceToggle }: {
  selected: string[]; onToggle: (v: string) => void; label?: string; onTabChange?: (tab: TabKey) => void
  danceSelected?: string[]; onDanceToggle?: (v: string) => void
}) {
  const locale = useLocale()
  const isEn = locale === 'en'
  const [tab, setTab] = useState<TabKey>('music')
  const hasDance = !!onDanceToggle

  useEffect(() => {
    if (onTabChange) onTabChange(tab)
  }, [tab, onTabChange])

  const isDance = tab === 'dance'
  const options = isDance ? DANCE_OPTIONS : (tab === 'music' ? MUSIC_GENRES : STAGE_GENRES)
  const sel = isDance ? (danceSelected ?? []) : selected
  const toggle = isDance ? (onDanceToggle ?? (() => {})) : onToggle

  return (
    <div>
      {label && <label className="label">{label}</label>}
      <div className="flex gap-4 mb-3 border-b border-[rgba(228,224,216,0.1)]">
        <button type="button" onClick={() => setTab('music')}
          className={cn('pb-2 text-sm transition-colors border-b-2', tab === 'music' ? 'border-accent text-accent' : 'border-transparent text-text-muted hover:text-text-primary')}>
          {isEn ? 'Music' : 'Müzik'}
        </button>
        <button type="button" onClick={() => setTab('stage')}
          className={cn('pb-2 text-sm transition-colors border-b-2', tab === 'stage' ? 'border-accent text-accent' : 'border-transparent text-text-muted hover:text-text-primary')}>
          {isEn ? 'Stage' : 'Sahne'}
        </button>
        {hasDance && (
          <button type="button" onClick={() => setTab('dance')}
            className={cn('pb-2 text-sm transition-colors border-b-2', tab === 'dance' ? 'border-accent text-accent' : 'border-transparent text-text-muted hover:text-text-primary')}>
            {isEn ? 'Dance' : 'Dans'}
          </button>
        )}
      </div>
      <div className="flex flex-wrap gap-2">
        {options.map((opt) => (
          <button type="button" key={opt} onClick={() => toggle(opt)}
            className={cn('chip border transition-colors', sel.includes(opt)
              ? 'bg-accent/10 text-accent border-accent/30'
              : 'bg-[rgba(228,224,216,0.04)] text-text-muted border-[rgba(228,224,216,0.1)] hover:text-text-primary'
            )}>
            {isDance ? opt : translateGenre(opt, locale)}
          </button>
        ))}
      </div>
    </div>
  )
}
