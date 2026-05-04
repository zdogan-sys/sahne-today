'use client'

import { useState, useEffect, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, Ticket, User, Mail, Phone, Users, AlertCircle } from 'lucide-react'
import Link from 'next/link'

interface EventInfo {
  id: string
  title: string
  event_date: string
  start_time: string
  ticket_price: number
  ticket_count: number
  tickets_sold: number
  ticketing_enabled: boolean
  venues: { name: string; address?: string; commission_rate: number } | null
}

export default function TicketPurchasePage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()

  const [event, setEvent] = useState<EventInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const iframeRef = useRef<HTMLDivElement>(null)

  const [form, setForm] = useState({
    buyer_name: '',
    buyer_surname: '',
    buyer_email: '',
    buyer_phone: '',
    quantity: 1,
  })

  useEffect(() => {
    fetch(`/api/events/${id}/info`)
      .then(r => r.json())
      .then(setEvent)
      .catch(() => setError('Etkinlik yüklenemedi'))
      .finally(() => setLoading(false))
  }, [id])

  const commissionRate = event?.venues?.commission_rate ?? 8
  const unitWithCommission = event ? Math.round(event.ticket_price * (1 + commissionRate / 100) * 100) / 100 : 0
  const total = Math.round(unitWithCommission * form.quantity * 100) / 100
  const remaining = event ? event.ticket_count - event.tickets_sold : 0

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setError('')
    try {
      const res = await fetch('/api/tickets/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ event_id: id, ...form }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? 'Bir hata oluştu'); return }

      const script = document.createElement('script')
      script.src = 'https://www.paytr.com/js/iframeResizer.contentWindow.min.js'
      document.body.appendChild(script)

      const iframe = document.createElement('iframe')
      iframe.src = `https://www.paytr.com/odeme/guvenli/${data.token}`
      iframe.setAttribute('frameborder', '0')
      iframe.setAttribute('scrolling', 'no')
      iframe.style.width = '100%'
      iframe.style.minHeight = '600px'
      if (iframeRef.current) {
        iframeRef.current.innerHTML = ''
        iframeRef.current.appendChild(iframe)
        iframeRef.current.scrollIntoView({ behavior: 'smooth' })
      }
    } catch {
      setError('Bağlantı hatası')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) return (
    <div className="max-w-lg mx-auto px-4 py-10 text-center text-text-muted">Yükleniyor...</div>
  )

  if (!event || !event.ticketing_enabled) return (
    <div className="max-w-lg mx-auto px-4 py-10 text-center">
      <p className="text-text-muted">Bu etkinlik için bilet satışı mevcut değil.</p>
      <Link href={`/events/${id}`} className="mt-4 inline-flex items-center gap-2 text-accent text-sm">
        <ArrowLeft size={14} /> Etkinliğe dön
      </Link>
    </div>
  )

  return (
    <div className="max-w-lg mx-auto px-4 py-6">
      <Link href={`/events/${id}`} className="flex items-center gap-2 text-text-muted text-sm mb-6 hover:text-text-primary transition-colors">
        <ArrowLeft size={16} /> Etkinliğe Dön
      </Link>

      <div className="card p-5 mb-4">
        <div className="flex items-center gap-2 mb-1">
          <Ticket size={16} className="text-accent" />
          <span className="text-accent text-xs font-semibold uppercase tracking-wide">Bilet Al</span>
        </div>
        <h1 className="font-bebas text-3xl text-text-primary leading-tight mb-3">{event.title}</h1>
        <div className="text-sm text-text-muted space-y-1">
          <p>{new Date(event.event_date).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' })} · {event.start_time.slice(0, 5)}</p>
          {event.venues && <p>{event.venues.name}</p>}
        </div>
        {remaining <= 10 && remaining > 0 && (
          <p className="mt-3 text-xs text-yellow-400 font-medium flex items-center gap-1">
            <AlertCircle size={12} /> Son {remaining} bilet!
          </p>
        )}
        {remaining === 0 && (
          <p className="mt-3 text-xs text-red-400 font-medium">Biletler tükendi</p>
        )}
      </div>

      {remaining > 0 && (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="card p-5 space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-text-muted mb-1.5 font-medium">Ad</label>
                <div className="relative">
                  <User size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none" />
                  <input
                    required
                    value={form.buyer_name}
                    onChange={e => setForm(f => ({ ...f, buyer_name: e.target.value }))}
                    className="w-full bg-[rgba(228,224,216,0.06)] border border-[rgba(228,224,216,0.12)] rounded-lg pl-9 pr-3 py-2.5 text-sm text-text-primary outline-none focus:border-accent/50"
                    placeholder="Ad"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs text-text-muted mb-1.5 font-medium">Soyad</label>
                <input
                  required
                  value={form.buyer_surname}
                  onChange={e => setForm(f => ({ ...f, buyer_surname: e.target.value }))}
                  className="w-full bg-[rgba(228,224,216,0.06)] border border-[rgba(228,224,216,0.12)] rounded-lg px-3 py-2.5 text-sm text-text-primary outline-none focus:border-accent/50"
                  placeholder="Soyad"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs text-text-muted mb-1.5 font-medium">E-posta</label>
              <div className="relative">
                <Mail size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none" />
                <input
                  required type="email"
                  value={form.buyer_email}
                  onChange={e => setForm(f => ({ ...f, buyer_email: e.target.value }))}
                  className="w-full bg-[rgba(228,224,216,0.06)] border border-[rgba(228,224,216,0.12)] rounded-lg pl-9 pr-3 py-2.5 text-sm text-text-primary outline-none focus:border-accent/50"
                  placeholder="ornek@email.com"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs text-text-muted mb-1.5 font-medium">Telefon</label>
              <div className="relative">
                <Phone size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none" />
                <input
                  required type="tel"
                  value={form.buyer_phone}
                  onChange={e => setForm(f => ({ ...f, buyer_phone: e.target.value }))}
                  className="w-full bg-[rgba(228,224,216,0.06)] border border-[rgba(228,224,216,0.12)] rounded-lg pl-9 pr-3 py-2.5 text-sm text-text-primary outline-none focus:border-accent/50"
                  placeholder="05xx xxx xx xx"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs text-text-muted mb-1.5 font-medium">Kişi Sayısı</label>
              <div className="relative">
                <Users size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none" />
                <select
                  value={form.quantity}
                  onChange={e => setForm(f => ({ ...f, quantity: Number(e.target.value) }))}
                  className="w-full bg-[rgba(228,224,216,0.06)] border border-[rgba(228,224,216,0.12)] rounded-lg pl-9 pr-3 py-2.5 text-sm text-text-primary outline-none focus:border-accent/50 appearance-none"
                >
                  {Array.from({ length: Math.min(10, remaining) }, (_, i) => i + 1).map(n => (
                    <option key={n} value={n}>{n} kişi</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Price summary */}
          <div className="card p-5">
            <div className="space-y-2 text-sm">
              <div className="flex justify-between text-text-muted">
                <span>Bilet fiyatı</span>
                <span>{event.ticket_price.toFixed(2)}₺</span>
              </div>
              <div className="flex justify-between text-text-muted">
                <span>Hizmet bedeli (%{commissionRate})</span>
                <span>{(unitWithCommission - event.ticket_price).toFixed(2)}₺</span>
              </div>
              {form.quantity > 1 && (
                <div className="flex justify-between text-text-muted">
                  <span>Kişi sayısı</span>
                  <span>× {form.quantity}</span>
                </div>
              )}
              <div className="pt-2 border-t border-[rgba(228,224,216,0.08)] flex justify-between font-semibold text-text-primary">
                <span>Toplam</span>
                <span className="text-accent text-lg">{total.toFixed(2)}₺</span>
              </div>
            </div>
          </div>

          {error && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
              <AlertCircle size={14} />
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-3.5 rounded-xl bg-accent text-white font-semibold text-base disabled:opacity-50 active:scale-[0.98] transition-transform"
          >
            {submitting ? 'Yönlendiriliyor...' : `Ödemeye Geç · ${total.toFixed(2)}₺`}
          </button>
        </form>
      )}

      <div ref={iframeRef} className="mt-4" />
    </div>
  )
}
