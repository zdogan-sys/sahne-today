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
      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors disabled:opacity-50 ${
        following
          ? 'bg-accent/15 text-accent border border-accent/30 hover:bg-red-400/10 hover:text-red-400 hover:border-red-400/30'
          : 'bg-[rgba(228,224,216,0.06)] text-text-muted border border-[rgba(228,224,216,0.15)] hover:bg-accent/10 hover:text-accent hover:border-accent/30'
      }`}
      title={following ? 'Takibi bırak' : 'Takip et — yeni etkinliklerde bildirim al'}
    >
      {following ? <BellOff size={13} /> : <Bell size={13} />}
      {following ? 'Takip Ediliyor' : 'Takip Et'}
    </button>
  )
}
