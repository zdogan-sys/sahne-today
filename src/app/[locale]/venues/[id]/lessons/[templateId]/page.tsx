'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Loader2, Check, Users, User, CalendarDays } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

const HOURS = Array.from({ length: 14 }, (_, i) => `${String(8 + i).padStart(2, '0')}:00`)

export default function LessonRequestPage() {
  const { id, templateId } = useParams<{ id: string; templateId: string }>()
  const supabase = createClient()

  const [venue, setVenue] = useState<any>(null)
  const [template, setTemplate] = useState<any>(null)
  const [instructors, setInstructors] = useState<any[]>([])
  const [openCourses, setOpenCourses] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)

  const [mode, setMode] = useState<'group' | 'private'>('private')
  const [form, setForm] = useState({
    student_name: '', student_email: '', student_phone: '',
    requested_date: '', requested_time: '10:00', preferred_instructor: '', notes: '',
  })

  useEffect(() => {
    async function load() {
      const [venueRes, tmplRes, instRes] = await Promise.all([
        supabase.from('venues').select('id, name, city, district, photo_url').eq('id', id).single(),
        supabase.from('venue_lesson_templates').select('*').eq('id', templateId).single(),
        supabase.from('venue_instructors').select('id, name').eq('venue_id', id).eq('is_active', true),
      ])
      setVenue(venueRes.data)
      setTemplate(tmplRes.data)
      setInstructors(instRes.data ?? [])

      // Açık kurslar (kontenjanı kalan)
      const { data: courses } = await supabase
        .from('courses')
        .select('id, title, max_participants, course_enrollments(id, status), course_sessions(session_date)')
        .eq('venue_id', id)
        .eq('status', 'active')
      const withCapacity = (courses ?? []).map((c: any) => {
        const confirmed = (c.course_enrollments ?? []).filter((e: any) => e.status === 'confirmed').length
        const dates = (c.course_sessions ?? []).map((s: any) => s.session_date).filter(Boolean).sort()
        return { ...c, remaining: (c.max_participants ?? 0) - confirmed, startDate: dates[0] ?? null }
      }).filter((c: any) => c.remaining > 0)
      withCapacity.sort((a: any, b: any) => (b.startDate ?? '').localeCompare(a.startDate ?? ''))
      setOpenCourses(withCapacity)

      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data: profile } = await supabase.from('profiles').select('display_name').eq('id', user.id).single()
        setForm(prev => ({ ...prev, student_email: user.email ?? '', student_name: profile?.display_name ?? '' }))
      }
      setLoading(false)
    }
    load()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, templateId])

  async function submit() {
    if (!form.student_name || !form.student_email || !form.student_phone) {
      setError('Lütfen ad, e-posta ve telefon girin.')
      return
    }
    if (mode === 'private' && !form.requested_date) {
      setError('Lütfen bir tarih seçin.')
      return
    }
    setSubmitting(true)
    setError('')

    const res = await fetch('/api/lessons/request', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        venue_id: id,
        template_id: templateId,
        request_type: mode,
        requested_date: mode === 'private' ? form.requested_date : null,
        requested_time: mode === 'private' ? form.requested_time : null,
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

  if (!template || !venue) return (
    <div className="max-w-lg mx-auto px-4 py-12 text-center">
      <p className="text-text-muted">Ders bulunamadı.</p>
      <Link href={`/venues/${id}`} className="text-accent mt-2 block">Mekana dön →</Link>
    </div>
  )

  if (done) return (
    <div className="max-w-lg mx-auto px-4 py-20 text-center">
      <div className="w-14 h-14 rounded-full bg-success/15 flex items-center justify-center mx-auto mb-4">
        <Check className="text-success" size={26} />
      </div>
      <h1 className="font-bebas text-3xl text-text-primary mb-2">TALEBİN ALINDI</h1>
      <p className="text-text-muted text-sm">
        {mode === 'private'
          ? 'Mekan talebini değerlendirip oda ve eğitmen atayarak onayladığında bilgilendirileceksin.'
          : 'Ön kayıt talebin alındı. Kurs açıldığında bilgilendirileceksin.'}
      </p>
      <Link href={`/venues/${id}`} className="text-accent mt-4 block hover:underline">Mekana dön →</Link>
    </div>
  )

  return (
    <div className="max-w-lg mx-auto px-4 py-6">
      <Link href={`/venues/${id}`} className="flex items-center gap-2 text-text-muted text-sm mb-6 hover:text-text-primary w-fit">
        <ArrowLeft size={16} /> {venue.name}
      </Link>

      <h1 className="font-bebas text-4xl text-text-primary mb-1">{template.name}</h1>
      <p className="text-text-muted text-sm mb-1">
        {template.subject && `${template.subject} · `}{template.weeks} hafta · {template.hours_per_session} saat/seans
      </p>
      {template.price_total > 0 && <p className="font-bebas text-2xl text-accent mb-4">₺{template.price_total}</p>}
      {template.description && <p className="text-text-muted text-sm mb-6">{template.description}</p>}

      {/* Grup / Özel seçimi */}
      <div className="flex gap-2 mb-5">
        <button onClick={() => setMode('private')}
          className={`flex-1 py-3 text-sm rounded-lg border transition-colors flex items-center justify-center gap-1.5 ${mode === 'private' ? 'bg-accent/10 text-accent border-accent/30' : 'text-text-muted border-[rgba(228,224,216,0.15)]'}`}>
          <User size={15} /> Özel Ders
        </button>
        <button onClick={() => setMode('group')}
          className={`flex-1 py-3 text-sm rounded-lg border transition-colors flex items-center justify-center gap-1.5 ${mode === 'group' ? 'bg-accent/10 text-accent border-accent/30' : 'text-text-muted border-[rgba(228,224,216,0.15)]'}`}>
          <Users size={15} /> Grup Dersi
        </button>
      </div>

      {/* GRUP: açık kurslar */}
      {mode === 'group' && openCourses.length > 0 && (
        <div className="mb-5">
          <p className="label text-xs mb-2">Açık Kurslar — hemen kayıt olabilirsin</p>
          <div className="space-y-2">
            {openCourses.map(c => (
              <Link key={c.id} href={`/courses/${c.id}/enroll`} className="card p-3 flex items-center justify-between hover:border-accent/30 transition-colors">
                <div>
                  <p className="text-text-primary text-sm font-medium">{c.title}</p>
                  <p className="text-text-muted text-xs mt-0.5">
                    {c.startDate && <>{new Date(c.startDate + 'T00:00:00').toLocaleDateString('tr-TR', { day: 'numeric', month: 'long' })} · </>}
                    {c.remaining} kontenjan
                  </p>
                </div>
                <span className="text-accent text-sm">Kayıt Ol →</span>
              </Link>
            ))}
          </div>
          <p className="text-text-muted text-xs mt-3">Uygun kurs yoksa aşağıdan ön kayıt oluşturabilirsin.</p>
        </div>
      )}

      <div className="card p-5 space-y-4">
        <h2 className="font-bebas text-xl text-text-primary">
          {mode === 'private' ? 'Özel Ders Talebi' : 'Ön Kayıt'}
        </h2>

        {/* Özel: tarih + saat */}
        {mode === 'private' && (
          <>
            <div>
              <label className="label">Tercih Ettiğin Tarih *</label>
              <div className="relative">
                <input type="date" min={new Date().toISOString().split('T')[0]} value={form.requested_date}
                  onChange={e => setForm(p => ({ ...p, requested_date: e.target.value }))}
                  className="input-field text-sm pr-9" />
                <CalendarDays size={15} className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none" />
              </div>
            </div>
            <div>
              <label className="label">Tercih Ettiğin Saat *</label>
              <select value={form.requested_time} onChange={e => setForm(p => ({ ...p, requested_time: e.target.value }))} className="input-field text-sm">
                {HOURS.map(h => <option key={h} value={h}>{h}</option>)}
              </select>
            </div>
          </>
        )}

        {/* Eğitmen (opsiyonel) */}
        {instructors.length > 0 && (
          <div>
            <label className="label">Eğitmen Tercihi <span className="text-text-muted font-normal">(opsiyonel)</span></label>
            <select value={form.preferred_instructor} onChange={e => setForm(p => ({ ...p, preferred_instructor: e.target.value }))} className="input-field text-sm">
              <option value="">Fark etmez — mekan atasın</option>
              {instructors.map(i => <option key={i.id} value={i.name}>{i.name}</option>)}
            </select>
          </div>
        )}

        <div>
          <label className="label">Ad Soyad *</label>
          <input value={form.student_name} onChange={e => setForm(p => ({ ...p, student_name: e.target.value }))} className="input-field text-sm" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">E-posta *</label>
            <input type="email" value={form.student_email} onChange={e => setForm(p => ({ ...p, student_email: e.target.value }))} className="input-field text-sm" />
          </div>
          <div>
            <label className="label">Telefon *</label>
            <input type="tel" value={form.student_phone} onChange={e => setForm(p => ({ ...p, student_phone: e.target.value }))} className="input-field text-sm" placeholder="05XX XXX XX XX" />
          </div>
        </div>
        <div>
          <label className="label">Not <span className="text-text-muted font-normal">(opsiyonel)</span></label>
          <textarea value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} rows={2} className="input-field text-sm resize-none" placeholder="Seviye, beklenti..." />
        </div>

        {error && <p className="text-red-400 text-sm">{error}</p>}

        <button onClick={submit} disabled={submitting} className="btn-accent w-full py-3 text-sm disabled:opacity-50 flex items-center justify-center gap-2">
          {submitting ? <><Loader2 size={15} className="animate-spin" /> Gönderiliyor...</> : mode === 'private' ? 'Talebi Gönder' : 'Ön Kayıt Oluştur'}
        </button>
        <p className="text-text-muted text-[11px] text-center">Talebin mekan tarafından onaylandığında bilgilendirileceksin. Oda ve eğitmen mekan tarafından atanır.</p>
      </div>
    </div>
  )
}
