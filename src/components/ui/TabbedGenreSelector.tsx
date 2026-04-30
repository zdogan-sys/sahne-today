'use client'

import { useState, useEffect } from 'react'
import { cn } from '@/lib/utils'
import { MUSIC_GENRES, STAGE_GENRES } from '@/lib/constants'

export function TabbedGenreSelector({ selected, onToggle, label, onTabChange }: {
  selected: string[]; onToggle: (v: string) => void; label?: string; onTabChange?: (tab: 'music' | 'stage') => void
}) {
  const [tab, setTab] = useState<'music' | 'stage'>('music')
  
  useEffect(() => {
    if (onTabChange) onTabChange(tab)
  }, [tab, onTabChange])

  return (
    <div>
      {label && <label className="label">{label}</label>}
      <div className="flex gap-4 mb-3 border-b border-[rgba(228,224,216,0.1)]">
        <button type="button" onClick={() => setTab('music')}
          className={cn('pb-2 text-sm transition-colors border-b-2', tab === 'music' ? 'border-accent text-accent' : 'border-transparent text-text-muted hover:text-text-primary')}>
          Müzik
        </button>
        <button type="button" onClick={() => setTab('stage')}
          className={cn('pb-2 text-sm transition-colors border-b-2', tab === 'stage' ? 'border-accent text-accent' : 'border-transparent text-text-muted hover:text-text-primary')}>
          Sahne
        </button>
      </div>
      <div className="flex flex-wrap gap-2">
        {(tab === 'music' ? MUSIC_GENRES : STAGE_GENRES).map((opt) => (
          <button type="button" key={opt} onClick={() => onToggle(opt)}
            className={cn('chip border transition-colors', selected.includes(opt)
              ? 'bg-accent/10 text-accent border-accent/30'
              : 'bg-[rgba(228,224,216,0.04)] text-text-muted border-[rgba(228,224,216,0.1)] hover:text-text-primary'
            )}>
            {opt}
          </button>
        ))}
      </div>
    </div>
  )
}
