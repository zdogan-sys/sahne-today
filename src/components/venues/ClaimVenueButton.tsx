'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Building2 } from 'lucide-react'
import { claimVenue } from '@/app/actions/venue'

export function ClaimVenueButton({ venueId }: { venueId: string }) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)
  const router = useRouter()

  async function handleClaim() {
    if (!confirm('Bu mekanı hesabınıza bağlamak istediğinizden emin misiniz?')) return
    setLoading(true)
    setError('')
    const res = await claimVenue(venueId)
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
      <Building2 size={13} /> Mekan hesabınıza bağlandı
    </p>
  )

  return (
    <div>
      <button
        onClick={handleClaim}
        disabled={loading}
        className="flex items-center gap-1.5 text-xs text-text-muted border border-[rgba(228,224,216,0.15)] rounded-lg px-3 py-1.5 hover:border-accent hover:text-accent transition-colors disabled:opacity-50"
      >
        <Building2 size={13} />
        {loading ? 'Bağlanıyor...' : 'Bu benim mekanım'}
      </button>
      {error && <p className="text-red-400 text-xs mt-1">{error}</p>}
    </div>
  )
}
