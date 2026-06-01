'use client'

import { useState } from 'react'
import { useLocale } from 'next-intl'
import { Users, Star } from 'lucide-react'
import { toggleRSVP } from '@/app/actions/rsvp'

interface Props {
  eventId: string
  initialStatus: 'going' | 'interested' | null
  goingCount: number
  interestedCount: number
  hasUser: boolean
}

export function RSVPButton({ eventId, initialStatus, goingCount, interestedCount, hasUser }: Props) {
  const locale = useLocale()
  const isEn = locale === 'en'
  const [status, setStatus] = useState<'going' | 'interested' | null>(initialStatus)
  const [going, setGoing] = useState(goingCount)
  const [interested, setInterested] = useState(interestedCount)
  const [loading, setLoading] = useState(false)

  async function handle(newStatus: 'going' | 'interested') {
    if (!hasUser) { window.location.href = '/auth'; return }
    setLoading(true)
    const res = await toggleRSVP(eventId, newStatus)
    if (res.success) {
      const wasGoing = status === 'going'
      const wasInterested = status === 'interested'
      if (res.action === 'removed') {
        setStatus(null)
        if (newStatus === 'going') setGoing(g => Math.max(0, g - 1))
        else setInterested(i => Math.max(0, i - 1))
      } else if (res.action === 'added') {
        setStatus(newStatus)
        if (newStatus === 'going') {
          setGoing(g => g + 1)
          if (wasInterested) setInterested(i => Math.max(0, i - 1))
        } else {
          setInterested(i => i + 1)
          if (wasGoing) setGoing(g => Math.max(0, g - 1))
        }
      } else {
        setStatus(newStatus)
        if (newStatus === 'going') { setGoing(g => g + 1); setInterested(i => Math.max(0, i - 1)) }
        else { setInterested(i => i + 1); setGoing(g => Math.max(0, g - 1)) }
      }
    }
    setLoading(false)
  }

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <button
        onClick={() => handle('going')}
        disabled={loading}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors disabled:opacity-50 ${
          status === 'going'
            ? 'bg-accent text-white border-accent'
            : 'bg-transparent text-text-muted border-[rgba(228,224,216,0.15)] hover:border-accent/40 hover:text-accent'
        }`}
      >
        <Users size={12} />
        {isEn ? 'Going' : 'Gidiyorum'}{going > 0 ? ` · ${going}` : ''}
      </button>
      <button
        onClick={() => handle('interested')}
        disabled={loading}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors disabled:opacity-50 ${
          status === 'interested'
            ? 'bg-[rgba(212,83,126,0.2)] text-accent border-accent/40'
            : 'bg-transparent text-text-muted border-[rgba(228,224,216,0.15)] hover:border-accent/40 hover:text-accent'
        }`}
      >
        <Star size={12} />
        {isEn ? 'Interested' : 'İlgileniyorum'}{interested > 0 ? ` · ${interested}` : ''}
      </button>
    </div>
  )
}
