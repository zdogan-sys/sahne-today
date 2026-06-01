'use client'

import { useState } from 'react'
import { useLocale } from 'next-intl'
import { Check, Send } from 'lucide-react'
import { applyToBand } from '@/app/actions/band'

interface Props {
  bandId: string
  artistId: string
  existingStatus: string | null
  existingRole?: string | null
}

export function BandApplyButton({ bandId, artistId, existingStatus, existingRole }: Props) {
  const isEn = useLocale() === 'en'
  const [loading, setLoading] = useState(false)
  const [status, setStatus] = useState<string | null>(existingStatus)
  const [role, setRole] = useState<string | null>(existingRole ?? null)
  const [errorMsg, setErrorMsg] = useState('')

  async function handleApply() {
    if (status) return
    setLoading(true)
    setErrorMsg('')

    const res = await applyToBand(bandId, artistId)

    if (!res.success) {
      console.error('Apply error:', res.error)
      setErrorMsg((isEn ? 'An error occurred: ' : 'Bir hata oluştu: ') + res.error)
    } else {
      setStatus('invited')
      setRole('Applicant')
    }
    setLoading(false)
  }

  if (status === 'accepted') {
    return (
      <button disabled className="btn-outline w-full py-3 flex items-center justify-center gap-2 text-success border-success/30 cursor-default">
        <Check size={16} />
        {isEn ? "You're a Member" : 'Grup Üyesisin'}
      </button>
    )
  }

  if (status === 'invited') {
    if (role === 'Applicant') {
      return (
        <button disabled className="btn-outline w-full py-3 flex items-center justify-center gap-2 text-text-muted border-[rgba(228,224,216,0.1)] cursor-default">
          <Check size={16} />
          {isEn ? 'Join Request Sent' : 'Katılım İsteği Gönderildi'}
        </button>
      )
    }
    return (
      <div className="card p-3 border-accent/30 bg-accent/5 text-center">
        <p className="text-sm text-text-primary mb-2">{isEn ? 'This band invited you.' : 'Bu grup seni davet etti.'}</p>
        <p className="text-xs text-text-muted">{isEn ? 'You can respond from the Band Invitations section in your dashboard.' : 'Kontrol panelindeki Grup Davetleri bölümünden yanıtlayabilirsin.'}</p>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <button
        onClick={handleApply}
        disabled={loading}
        className="btn-accent w-full py-3 flex items-center justify-center gap-2 disabled:opacity-50"
      >
        <Send size={16} />
        {loading ? (isEn ? 'Sending...' : 'Gönderiliyor...') : (isEn ? 'Join Band' : 'Gruba Katıl')}
      </button>
      {errorMsg && <p className="text-red-400 text-xs text-center">{errorMsg}</p>}
    </div>
  )
}
