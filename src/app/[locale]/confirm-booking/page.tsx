'use client'

import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Check, X, Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

const DAY_NAMES = ['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi']

export default function ConfirmBookingPage() {
  const searchParams = useSearchParams()
  const token = searchParams.get('token')

  const [booking, setBooking] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [acting, setActing] = useState(false)
  const [result, setResult] = useState<'confirmed' | 'cancelled' | null>(null)
  const [error, setError] = useState('')

  const supabase = createClient()

  useEffect(() => {
    if (!token) { setLoading(false); return }
    supabase
      .from('teaching_bookings')
      .select('*, teaching_slots(instrument, day_of_week, start_time, end_time, price_per_session, artists(stage_name, city))')
      .eq('confirmation_token', token)
      .single()
      .then(({ data }) => { setBooking(data); setLoading(false) })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token])

  async function handle(action: 'confirm' | 'cancel') {
    setActing(true)
    const res = await fetch('/api/teaching/confirm', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, action }),
    })
    const data = await res.json()
    if (res.ok) setResult(data.status === 'confirmed' ? 'confirmed' : 'cancelled')
    else setError(data.error ?? 'Bir hata oluştu.')
    setActing(false)
  }

  if (loading) return <div className="max-w-lg mx-auto px-4 py-16 flex justify-center"><Loader2 size={24} className="animate-spin text-accent" /></div>

  if (!token || !booking) return (
    <div className="max-w-lg mx-auto px-4 py-16 text-center">
      <p className="text-text-muted">Rezervasyon bulunamadı veya bağlantı geçersiz.</p>
      <Link href="/" className="text-accent mt-3 block">Ana sayfaya dön →</Link>
    </div>
  )

  const slot = booking.teaching_slots
  const artist = slot?.artists

  if (result === 'confirmed') return (
    <div className="max-w-lg mx-auto px-4 py-16 text-center">
      <div className="w-16 h-16 rounded-full bg-success/15 flex items-center justify-center mx-auto mb-4">
        <Check size={28} className="text-success" />
      </div>
      <h1 className="font-bebas text-3xl text-text-primary mb-2">REZERVASYON ONAYLANDI</h1>
      <p className="text-text-muted text-sm">{slot?.instrument} dersi için rezervasyonunuz onaylandı. Onay maili gönderildi.</p>
      <Link href="/" className="text-accent mt-4 block hover:underline">Ana sayfaya dön →</Link>
    </div>
  )

  if (result === 'cancelled') return (
    <div className="max-w-lg mx-auto px-4 py-16 text-center">
      <div className="w-16 h-16 rounded-full bg-red-500/15 flex items-center justify-center mx-auto mb-4">
        <X size={28} className="text-red-400" />
      </div>
      <h1 className="font-bebas text-3xl text-text-primary mb-2">REZERVASYON İPTAL EDİLDİ</h1>
      <p className="text-text-muted text-sm">Rezervasyonunuz iptal edildi.</p>
      <Link href="/" className="text-accent mt-4 block hover:underline">Ana sayfaya dön →</Link>
    </div>
  )

  const alreadyProcessed = booking.status === 'confirmed' || booking.status === 'cancelled'

  return (
    <div className="max-w-lg mx-auto px-4 py-12">
      <h1 className="font-bebas text-4xl text-text-primary mb-6">DERS REZERVASYONU</h1>

      <div className="card p-5 space-y-4 mb-6">
        <div>
          <p className="text-text-muted text-xs uppercase tracking-wide mb-0.5">Eğitmen</p>
          <p className="text-text-primary font-semibold">{artist?.stage_name}</p>
          {artist?.city && <p className="text-text-muted text-xs">{artist.city}</p>}
        </div>
        <div className="grid grid-cols-2 gap-4 pt-3 border-t border-[rgba(228,224,216,0.1)]">
          <div>
            <p className="text-text-muted text-xs uppercase tracking-wide mb-0.5">Enstrüman</p>
            <p className="text-text-primary text-sm font-medium">{slot?.instrument}</p>
          </div>
          <div>
            <p className="text-text-muted text-xs uppercase tracking-wide mb-0.5">Tarih</p>
            <p className="text-text-primary text-sm">{new Date(booking.lesson_date + 'T00:00:00').toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
          </div>
          <div>
            <p className="text-text-muted text-xs uppercase tracking-wide mb-0.5">Saat</p>
            <p className="text-text-primary text-sm">{slot?.start_time?.slice(0, 5)} – {slot?.end_time?.slice(0, 5)}</p>
          </div>
          <div>
            <p className="text-text-muted text-xs uppercase tracking-wide mb-0.5">Ücret</p>
            <p className="font-bebas text-xl text-accent">₺{slot?.price_per_session}</p>
          </div>
        </div>
        <div className="pt-3 border-t border-[rgba(228,224,216,0.1)]">
          <p className="text-text-muted text-xs uppercase tracking-wide mb-0.5">Öğrenci</p>
          <p className="text-text-primary text-sm">{booking.student_name}</p>
          <p className="text-text-muted text-xs">{booking.student_phone}</p>
        </div>
      </div>

      {alreadyProcessed ? (
        <div className="card p-4 text-center text-text-muted text-sm">
          Bu rezervasyon zaten {booking.status === 'confirmed' ? 'onaylandı' : 'iptal edildi'}.
        </div>
      ) : (
        <>
          {error && <p className="text-red-400 text-sm mb-3">{error}</p>}
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => handle('cancel')}
              disabled={acting}
              className="py-3 rounded-xl border border-red-500/30 text-red-400 bg-red-500/10 hover:bg-red-500/20 transition-colors text-sm font-medium disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <X size={15} /> Reddet
            </button>
            <button
              onClick={() => handle('confirm')}
              disabled={acting}
              className="btn-accent py-3 text-sm disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {acting ? <Loader2 size={15} className="animate-spin" /> : <Check size={15} />}
              Onayla
            </button>
          </div>
        </>
      )}
    </div>
  )
}
