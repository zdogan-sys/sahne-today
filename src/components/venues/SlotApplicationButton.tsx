'use client'

import { useState } from 'react'
import { useLocale } from 'next-intl'
import { BottomSheet } from '@/components/ui/BottomSheet'
import { createClient } from '@/lib/supabase/client'

interface Props {
  slotId: string
  venueName: string
}

export function SlotApplicationButton({ slotId, venueName }: Props) {
  const isEn = useLocale() === 'en'
  const [open, setOpen] = useState(false)
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')

  async function handleApply() {
    setLoading(true)
    setError('')
    const supabase = createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      window.location.href = '/auth'
      return
    }

    const { data: artistData } = await supabase
      .from('artists')
      .select('id')
      .eq('profile_id', user.id)
      .single()

    const { error: err } = await supabase.from('applications').insert({
      slot_id: slotId,
      artist_id: artistData?.id,
      message,
      status: 'pending' as const,
    } as any)

    if (err) {
      if (err.code === '23505') {
        setError(isEn ? 'You have already applied for this slot.' : 'Bu slot için zaten talepte bulundunuz.')
      } else {
        setError(isEn ? 'Could not send request. Try again.' : 'İstek gönderilemedi. Tekrar deneyin.')
      }
    } else {
      setSuccess(true)
    }
    setLoading(false)
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="btn-accent py-1.5 px-4 text-sm flex-shrink-0"
      >
        {isEn ? 'Apply for Stage' : 'Sahne Al'}
      </button>

      <BottomSheet open={open} onClose={() => { setOpen(false); setSuccess(false); setError('') }} title={`${isEn ? 'Apply for Stage' : 'Sahne Al'}: ${venueName}`}>
        {success ? (
          <div className="py-6 text-center">
            <div className="text-success text-4xl mb-3">✓</div>
            <p className="text-text-primary font-medium">{isEn ? 'Your request was received!' : 'Talebiniz alındı!'}</p>
            <p className="text-text-muted text-sm mt-1">{isEn ? 'The venue owner will get back to you shortly.' : 'Mekan sahibi en kısa sürede dönüş yapacak.'}</p>
            <button onClick={() => setOpen(false)} className="btn-outline mt-4">{isEn ? 'Close' : 'Kapat'}</button>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <label className="label">{isEn ? 'Your Message (optional)' : 'Mesajınız (isteğe bağlı)'}</label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder={isEn ? 'Introduce yourself, tell us about your repertoire...' : 'Kendinizi tanıtın, repertuarınızdan bahsedin...'}
                rows={4}
                className="input-field resize-none"
              />
            </div>
            {error && <p className="text-red-400 text-sm">{error}</p>}
            <button
              onClick={handleApply}
              disabled={loading}
              className="btn-accent w-full py-3 disabled:opacity-50"
            >
              {loading ? (isEn ? 'Sending...' : 'Gönderiliyor...') : (isEn ? 'Apply for Stage' : 'Sahne Al')}
            </button>
          </div>
        )}
      </BottomSheet>
    </>
  )
}
