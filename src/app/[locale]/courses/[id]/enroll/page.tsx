'use client'

import { useState, useEffect } from 'react'
import { useParams, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

export default function CourseEnrollPage() {
  const { id } = useParams<{ id: string }>()
  const searchParams = useSearchParams()
  const sessionId = searchParams.get('session')
  const hasError = searchParams.get('error') === '1'

  const [course, setCourse] = useState<any>(null)
  const [session, setSession] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(hasError ? 'Ödeme başarısız. Lütfen tekrar deneyin.' : '')
  const [iframeToken, setIframeToken] = useState<string | null>(null)

  const [form, setForm] = useState({
    student_name: '',
    student_email: '',
    student_phone: '',
    gender: '',
  })

  const supabase = createClient()

  useEffect(() => {
    async function load() {
      const { data: courseData } = await supabase
        .from('courses')
        .select('id, title, price_per_session, billing_type, monthly_price, course_type, max_participants, min_female, min_male, category')
        .eq('id', id)
        .single()
      setCourse(courseData)

      if (sessionId) {
        const { data: sessionData } = await supabase
          .from('course_sessions')
          .select('id, session_date, start_time, end_time')
          .eq('id', sessionId)
          .single()
        setSession(sessionData)
      }

      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('display_name')
          .eq('id', user.id)
          .single()
        setForm((prev) => ({
          ...prev,
          student_email: user.email ?? '',
          student_name: profile?.display_name ?? '',
        }))
      }
      setLoading(false)
    }
    load()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, sessionId])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.student_name || !form.student_email || !form.student_phone) {
      setError('Lütfen tüm alanları doldurun.')
      return
    }
    setSubmitting(true)
    setError('')

    const res = await fetch('/api/courses/enroll', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        course_id: id,
        session_id: sessionId,
        ...form,
      }),
    })
    const data = await res.json()

    if (!res.ok || !data.token) {
      setError(data.error ?? 'Bir hata oluştu.')
      setSubmitting(false)
      return
    }

    setIframeToken(data.token)
    setSubmitting(false)
  }

  if (loading) {
    return (
      <div className="max-w-lg mx-auto px-4 py-12 flex justify-center">
        <Loader2 size={24} className="animate-spin text-accent" />
      </div>
    )
  }

  if (!course) {
    return (
      <div className="max-w-lg mx-auto px-4 py-12 text-center">
        <p className="text-text-muted">Kurs bulunamadı.</p>
        <Link href="/courses" className="text-accent mt-2 block">Kurslara dön →</Link>
      </div>
    )
  }

  if (iframeToken) {
    return (
      <div className="max-w-lg mx-auto px-4 py-6">
        <h2 className="font-bebas text-3xl text-text-primary mb-4">ÖDEME</h2>
        <p className="text-text-muted text-sm mb-4">Güvenli ödeme sayfasına yönlendiriliyorsunuz...</p>
        <iframe
          src={`https://www.paytr.com/odeme/guvenli/${iframeToken}`}
          style={{ width: '100%', height: '600px', border: 'none' }}
          allow="payment"
          title="PayTR Ödeme"
        />
      </div>
    )
  }

  return (
    <div className="max-w-lg mx-auto px-4 py-6">
      <Link href={`/courses/${id}`} className="flex items-center gap-2 text-text-muted text-sm mb-6 hover:text-text-primary w-fit">
        <ArrowLeft size={16} /> Kursa Dön
      </Link>

      <h1 className="font-bebas text-4xl text-text-primary mb-1">KAYIT OL</h1>
      <p className="text-text-muted text-sm mb-6">{course.title}</p>

      {session && (
        <div className="card p-3 mb-6 flex items-center justify-between">
          <div>
            <p className="text-text-primary text-sm font-medium">
              {new Date(session.session_date).toLocaleDateString('tr-TR', { weekday: 'long', day: 'numeric', month: 'long' })}
            </p>
            <p className="text-text-muted text-xs">{session.start_time?.slice(0, 5)} – {session.end_time?.slice(0, 5)}</p>
          </div>
          <span className="font-bebas text-xl text-accent">₺{course.price_per_session}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="label">Ad Soyad *</label>
          <input
            value={form.student_name}
            onChange={(e) => setForm({ ...form, student_name: e.target.value })}
            className="input-field text-sm"
            placeholder="Adınız ve soyadınız"
            required
          />
        </div>
        <div>
          <label className="label">E-posta *</label>
          <input
            type="email"
            value={form.student_email}
            onChange={(e) => setForm({ ...form, student_email: e.target.value })}
            className="input-field text-sm"
            placeholder="e-posta@ornek.com"
            required
          />
        </div>
        <div>
          <label className="label">Telefon *</label>
          <input
            type="tel"
            value={form.student_phone}
            onChange={(e) => setForm({ ...form, student_phone: e.target.value })}
            className="input-field text-sm"
            placeholder="05XX XXX XX XX"
            required
          />
        </div>
        <div>
          <label className="label">Cinsiyet</label>
          <select
            value={form.gender}
            onChange={(e) => setForm({ ...form, gender: e.target.value })}
            className="input-field text-sm"
          >
            <option value="">Belirtmek istemiyorum</option>
            <option value="female">Kadın</option>
            <option value="male">Erkek</option>
            <option value="other">Diğer</option>
          </select>
          {course.course_type === 'group' && (course.min_female > 0 || course.min_male > 0) && (
            <p className="text-text-muted text-xs mt-1">
              Bu grup dersi için min. {course.min_female} kadın, {course.min_male} erkek katılımcı gereklidir.
            </p>
          )}
        </div>

        {/* Özet */}
        <div className="card p-4 space-y-2">
          <div className="flex items-center justify-between text-sm border-t border-[rgba(228,224,216,0.1)] pt-2">
            <span className="text-text-primary font-semibold">{course.billing_type === 'monthly' ? 'Aylık Ücret (Aidat)' : 'Toplam Kurs Ücreti'}</span>
            <span className="font-bebas text-xl text-accent">{course.billing_type === 'monthly' ? `₺${course.monthly_price ?? 0}/ay` : `₺${course.price_per_session}`}</span>
          </div>
          {course.billing_type === 'monthly' && (
            <p className="text-text-muted text-xs">Kayıt gününde her ay ödenir. Ödemeler mekan tarafından elden/POS ile alınır.</p>
          )}
        </div>

        {error && <p className="text-red-400 text-sm">{error}</p>}

        <button
          type="submit"
          disabled={submitting}
          className="btn-accent w-full py-3 text-sm disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {submitting ? <><Loader2 size={15} className="animate-spin" /> İşleniyor...</> : 'Ödemeye Geç'}
        </button>
      </form>
    </div>
  )
}
