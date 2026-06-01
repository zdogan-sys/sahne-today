'use client'

import { useState } from 'react'
import { Search } from 'lucide-react'
import { cn } from '@/lib/utils'

export function LfbToggle({ artistId, initialValue }: { artistId: string; initialValue: boolean }) {
  const [active, setActive] = useState(initialValue)
  const [loading, setLoading] = useState(false)

  async function toggle() {
    setLoading(true)
    const next = !active
    const res = await fetch('/api/artist/set-teaching', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ artist_id: artistId, looking_for_band: next }),
    })
    if (res.ok) setActive(next)
    setLoading(false)
  }

  return (
    <button
      onClick={toggle}
      disabled={loading}
      className={cn(
        'flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-md border transition-colors disabled:opacity-60',
        active
          ? 'bg-accent/10 text-accent border-accent/30'
          : 'bg-transparent text-text-muted border-[rgba(228,224,216,0.12)] hover:text-text-primary'
      )}
    >
      <Search size={11} />
      {active ? 'Grup arıyorum · Aktif' : 'Grup arıyorum'}
    </button>
  )
}
