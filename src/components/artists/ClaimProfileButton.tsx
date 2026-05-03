'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { UserCheck } from 'lucide-react'
import { claimArtistProfile } from '@/app/actions/artist'

export function ClaimProfileButton({ artistId }: { artistId: string }) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)
  const router = useRouter()

  async function handleClaim() {
    if (!confirm('Bu profili hesabınıza bağlamak istediğinizden emin misiniz?')) return
    setLoading(true)
    setError('')
    const res = await claimArtistProfile(artistId)
    setLoading(false)
    if (!res.success) {
      setError(res.error ?? 'Bir hata oluştu.')
    } else {
      setDone(true)
      router.refresh()
    }
  }

  if (done) return (
    <p className="text-success text-xs flex items-center gap-1.5">
      <UserCheck size={13} /> Profil hesabınıza bağlandı
    </p>
  )

  return (
    <div>
      <button
        onClick={handleClaim}
        disabled={loading}
        className="flex items-center gap-1.5 text-xs text-text-muted border border-[rgba(228,224,216,0.15)] rounded-lg px-3 py-1.5 hover:border-accent hover:text-accent transition-colors disabled:opacity-50"
      >
        <UserCheck size={13} />
        {loading ? 'Bağlanıyor...' : 'Bu benim profilim'}
      </button>
      {error && <p className="text-red-400 text-xs mt-1">{error}</p>}
    </div>
  )
}
