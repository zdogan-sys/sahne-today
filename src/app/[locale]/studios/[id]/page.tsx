'use client'

import { useState, useEffect, useRef } from 'react'
import { useParams, useSearchParams } from 'next/navigation'
import { Link } from '@/i18n/navigation'
import Image from 'next/image'
import { ArrowLeft, MapPin, Clock, Loader2, CalendarDays } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

const HOURS = Array.from({ length: 14 }, (_, i) => {
  const h = 8 + i
  return `${String(h).padStart(2, '0')}:00`
})

export default function StudioDetailPage() {
  const { id } = useParams<{ id: string }>()
  const searchParams = useSearchParams()
  const hasError = searchParams.get('error') === '1'

  const [studio, setStudio] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(hasError ? 'Ödeme başarısız. Lütfen tekrar deneyin.' : '')
  const [iframeToken, setIframeToken] = useState<string | null>(null)
  const [booked, setBooked] = useState(false)

  const [form, setForm] = useState({
    reserver_name: '',
    reserver_email: '',
    reserver_phone: '',
    reservation_date: '',
    start_time: '10:00',
    duration: 2,
    notes: '',
  })

  const dateRef = useRef<HTMLInputElement>(null)
  const supabase = createClient()

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from('venues')
        .select('id, name, city, district, photo_url, description, equipment, price_per_hour, venue_type, studio_payment_enabled')
        .eq('id', id)
        .single()
      setStudio(data)

      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('display_name')
          .eq('id', user.id)
          .single()
        setForm((prev) => ({
          ...prev,
          reserver_email: user.email ?? '',
          reserver_name: profile?.display_name ?? '',
        }))
      }
      setLoading(false)
    }
    load()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  const startHourIndex = HOURS.indexOf(form.start_time)
  const endTime = startHourIndex >= 0 && startHourIndex + form.duration < HOURS.length
    ? HOURS[startHourIndex + form.duration]
    : null
  const totalPrice = studio ? Number(studio.price_per_hour ?? 0) * form.duration : 0

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.reserver_name || !form.reserver_email || !form.reserver_phone || !form.reservation_date) {
      setError('Lütfen tüm alanları doldurun.')
      return
    }
    if (!endTime) {
      setError('Geçersiz saat seçimi.')
      return
    }

    setSubmitting(true)
    setError('')

    const res = await fetch('/api/studios/reserve', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        venue_id: id,
        reserver_name: form.reserver_name,
        reserver_email: form.reserver_email,
        reserver_phone: form.reserver_phone,
        reservation_date: form.reservation_date,
        start_time: form.start_time + ':00',
        end_time: endTime + ':00',
        duration_hours: form.duration,
        price_per_hour: studio.price_per_hour ?? 0,
        notes: form.notes,
      }),
    })

    const data = await res.json()
    if (!res.ok) {
      setError(data.error ?? 'Bir hata oluştu.')
      setSubmitting(false)
      return
    }

    if (!data.payment_required) {
      setBooked(true)
    } else {
      setIframeToken(data.token)
    }
    setSubmitting(false)
  }

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-12 flex justify-center">
        <Loader2 size={24} className="animate-spin text-accent" />
      </div>
    )
  }

  if (!studio) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-12 text-center">
        <p className="text-text-muted">Stüdyo bulunamadı.</p>
        <Link href="/studios" className="text-accent mt-2 block">Stüdyolara dön →</Link>
      </div>
    )
  }

  if (booked) return (
    <div className="max-w-lg mx-auto px-4 py-20 text-center">
      <div className="w-14 h-14 rounded-full bg-success/15 flex items-center justify-center mx-auto mb-4">
        <span className="text-success text-2xl">✓</span>
      </div>
      <h1 className="font-bebas text-3xl text-text-primary mb-2">REZERVASYON ALINDI</h1>
      <p className="text-text-muted text-sm">Mekan onayladığında bildirim alacaksınız. Ödeme çalışma sonunda yapılır.</p>
      <Link href={`/studios/${id}`} className="text-accent mt-4 block hover:underline">Stüdyoya dön →</Link>
    </div>
  )

  if (iframeToken) return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <h2 className="font-bebas text-3xl text-text-primary mb-4">ÖDEME</h2>
      <iframe
        src={`https://www.paytr.com/odeme/guvenli/${iframeToken}`}
        style={{ width: '100%', height: '600px', border: 'none' }}
        allow="payment"
        title="PayTR Ödeme"
      />
    </div>
  )

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <Link href="/studios" className="flex items-center gap-2 text-text-muted text-sm mb-6 hover:text-text-primary w-fit">
        <ArrowLeft size={16} /> Stüdyolar
      </Link>

      {/* Hero */}
      <div className="relative h-56 rounded-xl overflow-hidden bg-accent/5 mb-6">
        {studio.photo_url ? (
          <Image src={studio.photo_url} alt={studio.name} fill className="object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-accent/20 text-6xl font-bold">
            {studio.name?.[0]}
          </div>
        )}
      </div>

      <h1 className="font-bebas text-4xl text-text-primary mb-1">{studio.name}</h1>
      <div className="flex items-center gap-1 text-text-muted text-sm mb-4">
        <MapPin size={14} />
        <span>{studio.district ? `${studio.district}, ` : ''}{studio.city}</span>
      </div>

      {studio.price_per_hour && (
        <div className="flex items-center gap-2 mb-4">
          <span className="font-bebas text-3xl text-accent">₺{studio.price_per_hour}</span>
          <span className="text-text-muted text-sm">saat başı</span>
        </div>
      )}

      {studio.description && (
        <p className="text-text-muted text-sm leading-relaxed mb-4">{studio.description}</p>
      )}

      {studio.equipment && studio.equipment.length > 0 && (
        <div className="mb-6">
          <p className="label mb-2">Ekipman</p>
          <div className="flex flex-wrap gap-1.5">
            {studio.equipment.map((eq: string) => (
              <span key={eq} className="chip bg-[rgba(228,224,216,0.06)] text-text-muted border border-[rgba(228,224,216,0.1)]">{eq}</span>
            ))}
          </div>
        </div>
      )}

      {/* Rezervasyon formu */}
      <div className="card p-5">
        <h2 className="font-bebas text-2xl text-text-primary mb-4">REZERVASYON YAP</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Tarih *</label>
              <div className="relative">
                <input
                  ref={dateRef}
                  type="date"
                  min={new Date().toISOString().split('T')[0]}
                  value={form.reservation_date}
                  onChange={(e) => setForm({ ...form, reservation_date: e.target.value })}
                  className="input-field text-sm pr-9 cursor-pointer"
                  required
                  onClick={() => dateRef.current?.showPicker?.()}
                />
                <CalendarDays
                  size={15}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none"
                />
              </div>
            </div>
            <div>
              <label className="label">Başlangıç Saati</label>
              <select
                value={form.start_time}
                onChange={(e) => setForm({ ...form, start_time: e.target.value })}
                className="input-field text-sm"
              >
                {HOURS.map((h) => <option key={h} value={h}>{h}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className="label">Süre (saat)</label>
            <select
              value={form.duration}
              onChange={(e) => setForm({ ...form, duration: Number(e.target.value) })}
              className="input-field text-sm"
            >
              {[1, 2, 3, 4, 5, 6, 8].map((h) => (
                <option key={h} value={h}>{h} saat</option>
              ))}
            </select>
            {endTime && (
              <p className="text-text-muted text-xs mt-1 flex items-center gap-1">
                <Clock size={10} /> {form.start_time} – {endTime}
              </p>
            )}
          </div>

          <div>
            <label className="label">Ad Soyad *</label>
            <input
              value={form.reserver_name}
              onChange={(e) => setForm({ ...form, reserver_name: e.target.value })}
              className="input-field text-sm"
              required
            />
          </div>
          <div>
            <label className="label">E-posta *</label>
            <input
              type="email"
              value={form.reserver_email}
              onChange={(e) => setForm({ ...form, reserver_email: e.target.value })}
              className="input-field text-sm"
              required
            />
          </div>
          <div>
            <label className="label">Telefon *</label>
            <input
              type="tel"
              value={form.reserver_phone}
              onChange={(e) => setForm({ ...form, reserver_phone: e.target.value })}
              className="input-field text-sm"
              placeholder="05XX XXX XX XX"
              required
            />
          </div>
          <div>
            <label className="label">Notlar</label>
            <textarea
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              rows={2}
              className="input-field text-sm resize-none"
              placeholder="Özel isteğiniz varsa belirtin..."
            />
          </div>

          {studio.price_per_hour && (
            <div className="card p-3 flex items-center justify-between">
              <span className="text-text-muted text-sm">{form.duration} saat × ₺{studio.price_per_hour}</span>
              <span className="font-bebas text-2xl text-accent">₺{totalPrice}</span>
            </div>
          )}

          {error && <p className="text-red-400 text-sm">{error}</p>}

          <button
            type="submit"
            disabled={submitting}
            className="btn-accent w-full py-3 text-sm disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {submitting ? <><Loader2 size={15} className="animate-spin" /> İşleniyor...</> : studio?.studio_payment_enabled ? 'Ödemeye Geç' : 'Rezervasyon Yap'}
          </button>
        </form>
      </div>
    </div>
  )
}
