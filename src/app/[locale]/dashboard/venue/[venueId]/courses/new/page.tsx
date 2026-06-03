'use client'

import { useState, useMemo, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'

const SUBCATEGORIES: Record<string, string[]> = {
  music: ['Gitar', 'Piyano', 'Keman', 'Saksafon', 'Davul', 'Bas Gitar', 'Vokal', 'Flüt', 'Klarnet', 'Trompet', 'Ud', 'Bağlama'],
  dance: ['Salsa', 'Tango', 'Bale', 'Hip-Hop', 'Vals', 'Foxtrot', 'Zumba', 'Flamenco', 'Zeybek', 'Modern Dans'],
  theater: ['Temel Oyunculuk', 'İmprovizasyon', 'Senaryo Yazarlığı', 'Sahne Performansı', 'Ses Eğitimi'],
  other: [],
}
const DAY_SHORT = ['Paz', 'Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt']
const DURATIONS = [2, 4, 6, 8, 10, 12]

function generateSessions(startDate: string, days: number[], weeks: number, startTime: string, endTime: string): string[] {
  if (!startDate || days.length === 0 || weeks === 0) return []
  const dates: string[] = []
  const start = new Date(startDate + 'T00:00:00')
  const end = new Date(start)
  end.setDate(end.getDate() + weeks * 7)
  const cur = new Date(start)
  while (cur < end) {
    if (days.includes(cur.getDay())) {
      dates.push(cur.toISOString().split('T')[0])
    }
    cur.setDate(cur.getDate() + 1)
  }
  return dates
}

export default function VenueNewCoursePage() {
  const router = useRouter()
  const params = useParams()
  const venueId = params.venueId as string
  const supabase = createClient()

  const [venue, setVenue] = useState<any>(null)
  const [templates, setTemplates] = useState<any[]>([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.from('venues').select('id, name, owner_id').eq('id', venueId).single().then(({ data }) => {
      if (!data) { router.push('/dashboard'); return }
      supabase.auth.getUser().then(({ data: { user } }) => {
        if (user?.id !== data.owner_id) { router.push('/dashboard'); return }
        setVenue(data)
        supabase.from('venue_lesson_templates').select('*').eq('venue_id', venueId).eq('is_active', true).order('created_at')
          .then(({ data: t }) => setTemplates(t ?? []))
        setLoading(false)
      })
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Temel bilgiler
  const [title, setTitle] = useState('')
  const [templateId, setTemplateId] = useState('')
  const [category, setCategory] = useState('music')
  const [subcategory, setSubcategory] = useState('')
  const [level, setLevel] = useState('beginner')
  const [durationMinutes, setDurationMinutes] = useState(60)
  const [description, setDescription] = useState('')
  const [isOnline, setIsOnline] = useState(false)
  const [location, setLocation] = useState('')

  // Program (takvim)
  const [weeks, setWeeks] = useState(4)
  const [startDate, setStartDate] = useState('')
  const [selectedDays, setSelectedDays] = useState<number[]>([])
  const [startTime, setStartTime] = useState('19:00')
  const [endTime, setEndTime] = useState('20:00')

  // Grup ayarları
  const [maxParticipants, setMaxParticipants] = useState(8)
  const [minFemale, setMinFemale] = useState(0)
  const [minMale, setMinMale] = useState(0)

  // Fiyat — toplam kurs ücreti
  const [coursePrice, setCoursePrice] = useState('')

  function toggleDay(d: number) {
    setSelectedDays(prev => prev.includes(d) ? prev.filter(x => x !== d) : [...prev, d])
  }

  const generatedSessions = useMemo(
    () => generateSessions(startDate, selectedDays, weeks, startTime, endTime),
    [startDate, selectedDays, weeks, startTime, endTime]
  )

  // Toplam fiyat girilince, seans başına düşen tutarı bilgi olarak göster
  const perSessionInfo = coursePrice && generatedSessions.length
    ? (parseFloat(coursePrice) / generatedSessions.length).toFixed(0)
    : null

  async function handleSave() {
    if (!title) { setError('Kurs adı zorunludur.'); return }
    if (!coursePrice) { setError('Kurs ücreti zorunludur.'); return }
    if (!startDate) { setError('Başlangıç tarihi seçin.'); return }
    if (selectedDays.length === 0) { setError('En az bir gün seçin.'); return }
    if (generatedSessions.length === 0) { setError('Geçerli seans bulunamadı.'); return }

    setSaving(true); setError('')

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setError('Giriş yapmalısınız.'); setSaving(false); return }

    const { data: course, error: courseError } = await supabase
      .from('courses')
      .insert({
        instructor_id: user.id,
        venue_id: venueId,
        title,
        category,
        subcategory: subcategory || null,
        course_type: 'group',
        level,
        duration_minutes: durationMinutes,
        price_per_session: Number(coursePrice),
        max_participants: maxParticipants,
        min_female: minFemale,
        min_male: minMale,
        is_online: isOnline,
        location: !isOnline ? location || null : null,
        description: description || null,
        status: 'active',
      } as any)
      .select('id')
      .single()

    if (courseError || !course) {
      setError(courseError?.message ?? 'Kurs oluşturulamadı.')
      setSaving(false); return
    }

    await supabase.from('course_sessions').insert(
      generatedSessions.map(date => ({
        course_id: course.id,
        session_date: date,
        start_time: startTime + ':00',
        end_time: endTime + ':00',
        status: 'available',
      })) as any
    )

    router.push(`/dashboard`)
  }

  const subcats = SUBCATEGORIES[category] ?? []
  const today = new Date().toISOString().split('T')[0]

  if (loading) return <div className="max-w-2xl mx-auto px-4 py-6 text-text-muted">Yükleniyor...</div>
  if (!venue) return <div className="max-w-2xl mx-auto px-4 py-6 text-text-muted">Mekan bulunamadı.</div>

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <Link href="/dashboard" className="flex items-center gap-2 text-text-muted text-sm mb-6 hover:text-text-primary w-fit">
        <ArrowLeft size={16} /> Dashboard
      </Link>

      <h1 className="font-bebas text-4xl text-text-primary mb-1">YENİ KURS</h1>
      <p className="text-text-muted text-sm mb-6">{venue.name}</p>

      <div className="space-y-6">
        {/* Temel Bilgiler */}
        <div className="card p-5 space-y-4">
          <h2 className="font-bebas text-xl text-text-primary">Temel Bilgiler</h2>

          {/* Derslerimiz'den seç → ad/hafta/ücret otomatik dolar */}
          {templates.length > 0 && (
            <div>
              <label className="label">Derslerimiz'den Seç <span className="text-text-muted font-normal">(opsiyonel)</span></label>
              <select
                value={templateId}
                onChange={e => {
                  const t = templates.find(x => x.id === e.target.value)
                  setTemplateId(e.target.value)
                  if (t) {
                    setTitle(t.name)
                    if (t.subject) setSubcategory(t.subject)
                    if (t.weeks) setWeeks(t.weeks)
                    if (t.price_total) setCoursePrice(String(t.price_total))
                  }
                }}
                className="input-field text-sm">
                <option value="">Sıfırdan oluştur...</option>
                {templates.map(t => <option key={t.id} value={t.id}>{t.name} — {t.weeks} hafta · ₺{t.price_total}</option>)}
              </select>
              <p className="text-text-muted text-xs mt-1">Bir ders seçersen ad, hafta ve ücret otomatik dolar; düzenleyebilirsin.</p>
            </div>
          )}

          <div>
            <label className="label">Kurs Adı *</label>
            <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Kurs adı" className="input-field mt-1" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Kategori</label>
              <select value={category} onChange={e => { setCategory(e.target.value); setSubcategory('') }} className="input-field text-sm">
                <option value="music">Müzik</option>
                <option value="dance">Dans</option>
                <option value="theater">Tiyatro</option>
                <option value="other">Diğer</option>
              </select>
            </div>
            <div>
              <label className="label">Seviye</label>
              <select value={level} onChange={e => setLevel(e.target.value)} className="input-field text-sm">
                <option value="beginner">Başlangıç</option>
                <option value="intermediate">Orta</option>
                <option value="advanced">İleri</option>
                <option value="all">Tüm Seviyeler</option>
              </select>
            </div>
          </div>

          {subcats.length > 0 && (
            <div>
              <label className="label mb-2">Altkaregori</label>
              <div className="flex flex-wrap gap-1.5">
                {subcats.map(sc => (
                  <button key={sc} onClick={() => setSubcategory(sc)}
                    className={cn('text-xs px-3 py-1.5 rounded border transition-colors',
                      subcategory === sc ? 'bg-accent/10 text-accent border-accent/30' : 'text-text-muted border-[rgba(228,224,216,0.1)]'
                    )}>
                    {sc}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Seans Süresi (dk)</label>
              <select value={durationMinutes} onChange={e => setDurationMinutes(Number(e.target.value))} className="input-field text-sm">
                <option value="30">30 dk</option>
                <option value="60">60 dk</option>
                <option value="90">90 dk</option>
                <option value="120">120 dk</option>
              </select>
            </div>
            <div className="flex items-end">
              <label className="flex items-center gap-2 cursor-pointer text-sm">
                <input type="checkbox" checked={isOnline} onChange={e => setIsOnline(e.target.checked)} />
                <span>Online</span>
              </label>
            </div>
          </div>

          {!isOnline && (
            <input value={location} onChange={e => setLocation(e.target.value)} placeholder="Yer (opsiyonel)" className="input-field" />
          )}

          <textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Açıklama (opsiyonel)" className="input-field" rows={3} />
        </div>

        {/* Program */}
        <div className="card p-5 space-y-4">
          <h2 className="font-bebas text-xl text-text-primary">Program</h2>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Hafta Sayısı</label>
              <div className="flex gap-1">
                {DURATIONS.map(d => (
                  <button key={d} onClick={() => setWeeks(d)}
                    className={cn('flex-1 py-2 text-xs rounded border transition-colors',
                      weeks === d ? 'bg-accent/10 text-accent border-accent/30' : 'text-text-muted border-[rgba(228,224,216,0.1)]'
                    )}>
                    {d}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="label">Başlangıç Tarihi</label>
              <input type="date" min={today} value={startDate} onChange={e => setStartDate(e.target.value)} className="input-field text-sm" />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="label">Günler</label>
              <button onClick={() => setSelectedDays([1, 2, 3, 4, 5])} className="text-[10px] px-2 py-0.5 rounded border text-text-muted hover:text-accent border-[rgba(228,224,216,0.1)] hover:border-accent/30 transition-colors">Haftaiçi</button>
            </div>
            <div className="flex gap-1.5">
              {DAY_SHORT.map((d, i) => (
                <button key={i} onClick={() => toggleDay(i)}
                  className={cn('flex-1 py-2 text-xs rounded border transition-colors',
                    selectedDays.includes(i) ? 'bg-accent/10 text-accent border-accent/30' : 'text-text-muted border-[rgba(228,224,216,0.1)]'
                  )}>
                  {d}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Başlangıç Saati</label>
              <input type="time" value={startTime} onChange={e => setStartTime(e.target.value)} className="input-field text-sm" />
            </div>
            <div>
              <label className="label">Bitiş Saati</label>
              <input type="time" value={endTime} onChange={e => setEndTime(e.target.value)} className="input-field text-sm" />
            </div>
          </div>

          {generatedSessions.length > 0 && (
            <div className="rounded-lg bg-accent/5 border border-accent/15 p-3">
              <p className="text-accent text-sm font-medium">{generatedSessions.length} seans</p>
              <p className="text-text-muted text-xs mt-0.5">{generatedSessions[0]} – {generatedSessions[generatedSessions.length - 1]}</p>
            </div>
          )}
        </div>

        {/* Grup Ayarları */}
        <div className="card p-5 space-y-4">
          <h2 className="font-bebas text-xl text-text-primary">Grup Ayarları</h2>

          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="label">Maks Katılımcı</label>
              <input type="number" min={1} value={maxParticipants} onChange={e => setMaxParticipants(Number(e.target.value))} className="input-field text-sm" />
            </div>
            <div>
              <label className="label">Min Kadın</label>
              <input type="number" min={0} value={minFemale} onChange={e => setMinFemale(Number(e.target.value))} className="input-field text-sm" />
            </div>
            <div>
              <label className="label">Min Erkek</label>
              <input type="number" min={0} value={minMale} onChange={e => setMinMale(Number(e.target.value))} className="input-field text-sm" />
            </div>
          </div>
        </div>

        {/* Fiyat */}
        <div className="card p-5 space-y-4">
          <h2 className="font-bebas text-xl text-text-primary">Fiyatlandırma</h2>

          <div>
            <label className="label">Toplam Kurs Ücreti (₺) *</label>
            <input type="number" min={0} step={50} value={coursePrice} onChange={e => setCoursePrice(e.target.value)} placeholder="2000" className="input-field" />
            <p className="text-text-muted text-xs mt-1">Kursun tamamı için öğrencinin ödeyeceği toplam tutar.</p>
          </div>

          {perSessionInfo && generatedSessions.length > 0 && (
            <div className="rounded-lg bg-accent/5 border border-accent/15 p-3">
              <p className="text-text-muted text-xs">{generatedSessions.length} seans · seans başına ≈ ₺{perSessionInfo}</p>
              <p className="font-bebas text-accent text-2xl">Toplam ₺{coursePrice}</p>
            </div>
          )}

          {error && <p className="text-red-400 text-xs">{error}</p>}

          <button onClick={handleSave} disabled={saving} className="btn-accent w-full py-3 disabled:opacity-50">
            {saving ? 'Kaydediliyor...' : 'Kursu Oluştur'}
          </button>
        </div>
      </div>
    </div>
  )
}
