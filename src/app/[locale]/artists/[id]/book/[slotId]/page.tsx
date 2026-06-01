'use client'

import { useState, useEffect } from 'react'
import { useParams, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Clock, Loader2, Check } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

const DAY_NAMES = ['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi']

function getNextDates(dayOfWeek: number, recurrence: string, count = 8): string[] {
  const dates: string[] = []
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const cur = new Date(today)
  const step = recurrence === 'biweekly' ? 14 : 7
  let daysUntil = (dayOfWeek - cur.getDay() + 7) % 7
  if (daysUntil === 0) daysUntil = 7
  cur.setDate(cur.getDate() + daysUntil)
  for (let i = 0; i < count; i++) {
    dates.push(cur.toISOString().split('T')[0])
    cur.setDate(cur.getDate() + step)
  }
  return dates
}

export default function BookTeachingSlotPage() {
  const { id, slotId } = useParams<{ id: string; slotId: string }>()
  const searchParams = useSearchParams()
  const hasError = searchParams.get('error') === '1'

  const [slot, setSlot] = useState<any>(null)
  const [artist, setArtist] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(hasError ? 'Ödeme başarısız. Lütfen tekrar deneyin.' : '')
  const [iframeToken, setIframeToken] = useState<string | null>(null)
  const [booked, setBooked] = useState(false)

  const [form, setForm] = useState({ student_name: '', student_email: '', student_phone: '', lesson_date: '', notes: '' })

  const supabase = createClient()

  useEffect(() => {
    async function load() {
      const { data: slotData } = await supabase
        .from('teaching_slots')
        .select('*, artists(id, stage_name, profile_id, city, profiles(avatar_url))')
        .eq('id', slotId)
        .single()

      setSlot(slotData)
      setArtist((slotData as any)?.artists)

      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data: profile } = await supabase.from('profiles').select('display_name').eq('id', user.id).single()
        setForm(prev => ({ ...prev, student_email: user.email ?? '', student_name: profile?.display_name ?? '' }))
      }
      setLoading(false)
    }
    load()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slotId])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.student_name || !form.student_email || !form.student_phone || !form.lesson_date) {
      setError('Lütfen tüm alanları doldurun.'); return
    }
    setSubmitting(true); setError('')

    const res = await fetch('/api/teaching/book', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ slot_id: slotId, ...form }),
    })
    const data = await res.json()

    if (!res.ok) {
      setError(data.error ?? 'Bir hata oluştu.')
      setSubmitting(false); return
    }

    if (data.token) {
      setIframeToken(data.token)
    } else {
      // Ödeme kapalı — sadece rezervasyon oluşturuldu
      setBooked(true)
    }
    setSubmitting(false)
  }

  if (loading) return <div className="max-w-lg mx-auto px-4 py-12 flex justify-center"><Loader2 size={24} className="animate-spin text-accent" /></div>
  if (!slot) return <div className="max-w-lg mx-auto px-4 py-12 text-center"><p className="text-text-muted">Slot bulunamadı.</p><Link href={`/artists/${id}`} className="text-accent mt-2 block">Geri dön →</Link></div>

  const availableDates = getNextDates(slot.day_of_week, slot.recurrence)

  if (booked) return (
    <div className="max-w-lg mx-auto px-4 py-16 text-center">
      <div className="w-14 h-14 rounded-full bg-success/15 flex items-center justify-center mx-auto mb-4">
        <Check size={24} className="text-success" />
      </div>
      <h1 className="font-bebas text-3xl text-text-primary mb-2">REZERVASYON ALINDI</h1>
      <p className="text-text-muted text-sm">Öğretmen rezervasyonunuzu onayladığında bildirim alacaksınız.</p>
      <Link href={`/artists/${id}`} className="text-accent mt-4 block hover:underline">Sanatçı profiline dön →</Link>
    </div>
  )

  if (iframeToken) {
    return (
      <div className="max-w-lg mx-auto px-4 py-6">
        <h2 className="font-bebas text-3xl text-text-primary mb-4">ÖDEME</h2>
        <iframe src={`https://www.paytr.com/odeme/guvenli/${iframeToken}`} style={{ width: '100%', height: '600px', border: 'none' }} allow="payment" title="PayTR" />
      </div>
    )
  }

  return (
    <div className="max-w-lg mx-auto px-4 py-6">
      <Link href={`/artists/${id}`} className="flex items-center gap-2 text-text-muted text-sm mb-6 hover:text-text-primary w-fit">
        <ArrowLeft size={16} /> {artist?.stage_name}
      </Link>

      <h1 className="font-bebas text-4xl text-text-primary mb-1">DERS REZERVASYONU</h1>

      {/* Slot bilgisi */}
      <div className="card p-4 mb-6 flex items-center justify-between">
        <div>
          <p className="text-text-primary font-semibold">{slot.instrument}</p>
          <div className="flex items-center gap-1 text-text-muted text-xs mt-0.5">
            <Clock size={10} />
            <span>{DAY_NAMES[slot.day_of_week]} · {slot.start_time?.slice(0, 5)}–{slot.end_time?.slice(0, 5)}</span>
            <span>· {slot.recurrence === 'weekly' ? 'Haftalık' : '2 Haftada Bir'}</span>
          </div>
        </div>
        <span className="font-bebas text-2xl text-accent">₺{slot.price_per_session}</span>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="label">Ders Tarihi *</label>
          <select value={form.lesson_date} onChange={e => setForm({ ...form, lesson_date: e.target.value })} className="input-field text-sm" required>
            <option value="">Tarih seçin</option>
            {availableDates.map(d => (
              <option key={d} value={d}>
                {new Date(d + 'T00:00:00').toLocaleDateString('tr-TR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">Ad Soyad *</label>
          <input value={form.student_name} onChange={e => setForm({ ...form, student_name: e.target.value })} className="input-field text-sm" required />
        </div>
        <div>
          <label className="label">E-posta *</label>
          <input type="email" value={form.student_email} onChange={e => setForm({ ...form, student_email: e.target.value })} className="input-field text-sm" required />
        </div>
        <div>
          <label className="label">Telefon *</label>
          <input type="tel" value={form.student_phone} onChange={e => setForm({ ...form, student_phone: e.target.value })} placeholder="05XX XXX XX XX" className="input-field text-sm" required />
        </div>
        <div>
          <label className="label">Notlar</label>
          <textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} rows={2} className="input-field text-sm resize-none" placeholder="Seviye, beklentiler..." />
        </div>

        <div className="card p-3 flex items-center justify-between">
          <span className="text-text-muted text-sm">Toplam</span>
          <span className="font-bebas text-2xl text-accent">₺{slot.price_per_session}</span>
        </div>

        {error && <p className="text-red-400 text-sm">{error}</p>}

        <button type="submit" disabled={submitting} className="btn-accent w-full py-3 text-sm disabled:opacity-50 flex items-center justify-center gap-2">
          {submitting ? <><Loader2 size={15} className="animate-spin" /> İşleniyor...</> : 'Ödemeye Geç'}
        </button>
      </form>
    </div>
  )
}
