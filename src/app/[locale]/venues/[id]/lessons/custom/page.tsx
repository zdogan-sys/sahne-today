'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Loader2, Check, CalendarDays } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { getListConfigs } from '@/app/actions/site'

const HOURS = Array.from({ length: 14 }, (_, i) => `${String(8 + i).padStart(2, '0')}:00`)
const FALLBACK_INSTRUMENTS = ['Gitar', 'Piyano', 'Davul', 'Bas', 'Keman', 'Vokal', 'Saz', 'Flüt', 'Trompet', 'Ud']

export default function CustomLessonRequestPage() {
  const { id } = useParams<{ id: string }>()
  const supabase = createClient()

  const [venue, setVenue] = useState<any>(null)
  const [instructors, setInstructors] = useState<any[]>([])
  const [instrumentOptions, setInstrumentOptions] = useState<string[]>(FALLBACK_INSTRUMENTS)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)

  const [billingType, setBillingType] = useState<'package' | 'monthly'>('package')
  const [form, setForm] = useState({
    subject: '', weeks: 4, hours_per_session: 1, months: 1,
    requested_date: '', requested_time: '10:00', preferred_instructor: '',
    student_name: '', student_email: '', student_phone: '', notes: '',
  })

  useEffect(() => {
    async function load() {
      const [venueRes, instRes] = await Promise.all([
        supabase.from('venues').select('id, name, city, district').eq('id', id).single(),
        supabase.from('venue_instructors').select('id, name, instruments').eq('venue_id', id).eq('is_active', true),
      ])
      setVenue(venueRes.data)
      setInstructors(instRes.data ?? [])

      try {
        const configs = await getListConfigs()
        if (configs?.instruments?.length) setInstrumentOptions(configs.instruments)
      } catch { /* fallback */ }

      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data: profile } = await supabase.from('profiles').select('display_name').eq('id', user.id).single()
        setForm(prev => ({ ...prev, student_email: user.email ?? '', student_name: profile?.display_name ?? '' }))
      }
      setLoading(false)
    }
    load()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  // Seçili enstrümana göre eğitmen filtre
  const matchingInstructors = instructors.filter(i => !form.subject || (i.instruments ?? []).includes(form.subject))

  async function submit() {
    if (!form.subject) { setError('Lütfen bir enstrüman seçin.'); return }
    if (!form.requested_date) { setError('Lütfen bir tarih seçin.'); return }
    if (!form.student_name || !form.student_email || !form.student_phone) {
      setError('Lütfen ad, e-posta ve telefon girin.'); return
    }
    setSubmitting(true)
    setError('')

    const res = await fetch('/api/lessons/request', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        venue_id: id,
        template_id: null,
        request_type: 'private',
        billing_type: billingType,
        subject: form.subject,
        weeks: billingType === 'package' ? form.weeks : null,
        months: billingType === 'monthly' ? form.months : null,
        hours_per_session: form.hours_per_session,
        requested_date: form.requested_date,
        requested_time: form.requested_time,
        preferred_instructor: form.preferred_instructor || null,
        student_name: form.student_name,
        student_email: form.student_email,
        student_phone: form.student_phone,
        notes: form.notes,
      }),
    })
    const data = await res.json()
    if (!res.ok) { setError(data.error ?? 'Bir hata oluştu.'); setSubmitting(false); return }
    setDone(true)
    setSubmitting(false)
  }

  if (loading) return <div className="max-w-lg mx-auto px-4 py-12 flex justify-center"><Loader2 size={24} className="animate-spin text-accent" /></div>

  if (!venue) return (
    <div className="max-w-lg mx-auto px-4 py-12 text-center">
      <p className="text-text-muted">Mekan bulunamadı.</p>
      <Link href={`/venues/${id}`} className="text-accent mt-2 block">Mekana dön →</Link>
    </div>
  )

  if (done) return (
    <div className="max-w-lg mx-auto px-4 py-20 text-center">
      <div className="w-14 h-14 rounded-full bg-success/15 flex items-center justify-center mx-auto mb-4">
        <Check className="text-success" size={26} />
      </div>
      <h1 className="font-bebas text-3xl text-text-primary mb-2">TALEBİN ALINDI</h1>
      <p className="text-text-muted text-sm">Mekan talebini değerlendirip oda ve eğitmen atayarak onayladığında bilgilendirileceksin.</p>
      <Link href={`/venues/${id}`} className="text-accent mt-4 block hover:underline">Mekana dön →</Link>
    </div>
  )

  return (
    <div className="max-w-lg mx-auto px-4 py-6">
      <Link href={`/venues/${id}`} className="flex items-center gap-2 text-text-muted text-sm mb-6 hover:text-text-primary w-fit">
        <ArrowLeft size={16} /> {venue.name}
      </Link>

      <h1 className="font-bebas text-4xl text-text-primary mb-1">ÖZEL DERS TALEBİ</h1>
      <p className="text-text-muted text-sm mb-6">Ne öğrenmek istediğini, kaç hafta ve hangi zamanda almak istediğini sen belirle.</p>

      <div className="card p-5 space-y-4">
        {/* Enstrüman */}
        <div>
          <label className="label">Enstrüman / Konu *</label>
          <select value={form.subject} onChange={e => setForm(p => ({ ...p, subject: e.target.value, preferred_instructor: '' }))} className="input-field text-sm mt-1">
            <option value="">Seçin...</option>
            {instrumentOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
          </select>
        </div>

        {/* Süre tipi */}
        <div>
          <label className="label">Süre Tipi</label>
          <div className="flex gap-2 mt-1">
            <button type="button" onClick={() => setBillingType('package')}
              className={`flex-1 py-2 text-xs rounded-lg border transition-colors ${billingType === 'package' ? 'bg-accent/10 text-accent border-accent/30' : 'text-text-muted border-[rgba(228,224,216,0.15)]'}`}>
              Haftalık paket
            </button>
            <button type="button" onClick={() => setBillingType('monthly')}
              className={`flex-1 py-2 text-xs rounded-lg border transition-colors ${billingType === 'monthly' ? 'bg-accent/10 text-accent border-accent/30' : 'text-text-muted border-[rgba(228,224,216,0.15)]'}`}>
              Aylık (aidat)
            </button>
          </div>
        </div>

        {/* Süre + saat */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">{billingType === 'monthly' ? 'Kaç Ay' : 'Kaç Hafta'}</label>
            {billingType === 'monthly' ? (
              <input type="number" min={1} value={form.months} onChange={e => setForm(p => ({ ...p, months: parseInt(e.target.value) || 1 }))} className="input-field text-sm mt-1" />
            ) : (
              <input type="number" min={1} value={form.weeks} onChange={e => setForm(p => ({ ...p, weeks: parseInt(e.target.value) || 1 }))} className="input-field text-sm mt-1" />
            )}
          </div>
          <div>
            <label className="label">Haftada Kaç Saat</label>
            <input type="number" min={0.5} step={0.5} value={form.hours_per_session} onChange={e => setForm(p => ({ ...p, hours_per_session: parseFloat(e.target.value) || 1 }))} className="input-field text-sm mt-1" />
          </div>
        </div>
        {billingType === 'monthly' && (
          <p className="text-text-muted text-xs -mt-2">Aylık aidat ile ödersin; ücret mekan onayında belirlenir.</p>
        )}

        {/* Tarih + saat */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Başlangıç Tarihi *</label>
            <div className="relative">
              <input type="date" min={new Date().toISOString().split('T')[0]} value={form.requested_date}
                onChange={e => setForm(p => ({ ...p, requested_date: e.target.value }))}
                className="input-field text-sm pr-9 mt-1" />
              <CalendarDays size={15} className="absolute right-3 top-1/2 translate-y-0.5 text-text-muted pointer-events-none" />
            </div>
          </div>
          <div>
            <label className="label">Saat *</label>
            <select value={form.requested_time} onChange={e => setForm(p => ({ ...p, requested_time: e.target.value }))} className="input-field text-sm mt-1">
              {HOURS.map(h => <option key={h} value={h}>{h}</option>)}
            </select>
          </div>
        </div>

        {/* Eğitmen tercihi (opsiyonel, enstrümana göre) */}
        {form.subject && matchingInstructors.length > 0 && (
          <div>
            <label className="label">Eğitmen Tercihi <span className="text-text-muted font-normal">(opsiyonel)</span></label>
            <select value={form.preferred_instructor} onChange={e => setForm(p => ({ ...p, preferred_instructor: e.target.value }))} className="input-field text-sm mt-1">
              <option value="">Fark etmez — mekan atasın</option>
              {matchingInstructors.map(i => <option key={i.id} value={i.name}>{i.name}</option>)}
            </select>
          </div>
        )}

        {/* Öğrenci bilgileri */}
        <div>
          <label className="label">Ad Soyad *</label>
          <input value={form.student_name} onChange={e => setForm(p => ({ ...p, student_name: e.target.value }))} className="input-field text-sm mt-1" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">E-posta *</label>
            <input type="email" value={form.student_email} onChange={e => setForm(p => ({ ...p, student_email: e.target.value }))} className="input-field text-sm mt-1" />
          </div>
          <div>
            <label className="label">Telefon *</label>
            <input type="tel" value={form.student_phone} onChange={e => setForm(p => ({ ...p, student_phone: e.target.value }))} className="input-field text-sm mt-1" placeholder="05XX XXX XX XX" />
          </div>
        </div>
        <div>
          <label className="label">Not <span className="text-text-muted font-normal">(opsiyonel)</span></label>
          <textarea value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} rows={2} className="input-field text-sm resize-none mt-1" placeholder="Seviye, beklenti, hedef..." />
        </div>

        {error && <p className="text-red-400 text-sm">{error}</p>}

        <button onClick={submit} disabled={submitting} className="btn-accent w-full py-3 text-sm disabled:opacity-50 flex items-center justify-center gap-2">
          {submitting ? <><Loader2 size={15} className="animate-spin" /> Gönderiliyor...</> : 'Özel Ders Talebi Gönder'}
        </button>
        <p className="text-text-muted text-[11px] text-center">Talebin mekan tarafından onaylandığında oda ve eğitmen atanır, bilgilendirileceksin.</p>
      </div>
    </div>
  )
}
