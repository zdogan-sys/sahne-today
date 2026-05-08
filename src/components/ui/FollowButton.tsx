'use client'

import { useState } from 'react'
import { Bell, BellOff } from 'lucide-react'
import { toggleFollow } from '@/app/actions/follow'
import { useRouter } from 'next/navigation'

interface Props {
  targetType: 'artist' | 'band' | 'venue'
  targetId: string
  initialFollowing: boolean
  userId: string | null
}

export function FollowButton({ targetType, targetId, initialFollowing, userId }: Props) {
  const [following, setFollowing] = useState(initialFollowing)
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function handleClick() {
    if (!userId) { router.push('/auth'); return }
    setLoading(true)
    const res = await toggleFollow(targetType, targetId)
    if (res.error) { setLoading(false); return }
    setFollowing(res.following)
    setLoading(false)
  }

  return (
    <button
      onClick={handleClick}
      disabled={loading}
      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all disabled:opacity-50 ${
        following
          ? 'bg-accent/15 text-accent border border-accent/30 hover:bg-red-400/10 hover:text-red-400 hover:border-red-400/30'
          : 'bg-accent text-white hover:bg-accent/80'
      }`}
      title={following ? 'Takibi bırak' : 'Takip et — yeni etkinliklerde bildirim al'}
    >
      {following ? <BellOff size={12} /> : <Bell size={12} />}
      {following ? 'Takip Ediliyor' : 'Takip Et'}
    </button>
  )
}
