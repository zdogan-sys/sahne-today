'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useLocale } from 'next-intl'
import { Users } from 'lucide-react'
import { claimBand } from '@/app/actions/band'

export function ClaimBandButton({ bandId }: { bandId: string }) {
  const isEn = useLocale() === 'en'
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)
  const router = useRouter()

  async function handleClaim() {
    if (!confirm(isEn ? 'Link this band to your account?' : 'Bu grubu hesabınıza bağlamak istediğinizden emin misiniz?')) return
    setLoading(true)
    setError('')
    const res = await claimBand(bandId)
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
      <Users size={13} /> {isEn ? 'Band linked to your account' : 'Grup hesabınıza bağlandı'}
    </p>
  )

  return (
    <div>
      <button
        onClick={handleClaim}
        disabled={loading}
        className="flex items-center gap-1.5 text-xs text-accent border border-accent/40 rounded-lg px-3 py-1.5 hover:bg-accent/10 transition-colors disabled:opacity-50 font-medium"
      >
        <Users size={13} />
        {loading ? (isEn ? 'Connecting...' : 'Bağlanıyor...') : (isEn ? 'This is my band' : 'Bu benim grubum')}
      </button>
      {error && <p className="text-red-400 text-xs mt-1">{error}</p>}
    </div>
  )
}
