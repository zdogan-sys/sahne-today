'use client'

import { useState, useEffect } from 'react'
import { Clock } from 'lucide-react'

export function OfferCountdown({ expiresAt }: { expiresAt: string }) {
  const [label, setLabel] = useState('')

  useEffect(() => {
    function tick() {
      const diff = new Date(expiresAt).getTime() - Date.now()
      if (diff <= 0) { setLabel('Süresi doldu'); return }
      const h = Math.floor(diff / 3600000)
      const m = Math.floor((diff % 3600000) / 60000)
      setLabel(h > 0 ? `${h}sa ${m}dk kaldı` : `${m}dk kaldı`)
    }
    tick()
    const id = setInterval(tick, 60000)
    return () => clearInterval(id)
  }, [expiresAt])

  const urgent = new Date(expiresAt).getTime() - Date.now() < 6 * 3600000

  return (
    <span className={`inline-flex items-center gap-1 text-xs ${urgent ? 'text-red-400' : 'text-text-muted'}`}>
      <Clock size={10} />
      {label}
    </span>
  )
}
