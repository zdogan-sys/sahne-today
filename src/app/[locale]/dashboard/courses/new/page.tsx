'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
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

export default function NewCoursePage() {
  const router = useRouter()
  const supabase = createClient()

  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  // Temel bilgiler
  const [title, setTitle] = useState('')
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

  // Fiyat
  const [pricePerSession, setPricePerSession] = useState('')

  function toggleDay(d: number) {
    setSelectedDays(prev => prev.includes(d) ? prev.filter(x => x !== d) : [...prev, d])
  }

  const generatedSessions = useMemo(
    () => generateSessions(startDate, selectedDays, weeks, startTime, endTime),
    [startDate, selectedDays, weeks, startTime, endTime]
  )

  const totalPrice = pricePerSession && generatedSessions.length
    ? (parseFloat(pricePerSession) * generatedSessions.length).toFixed(0)
    : null

  async function handleSave() {
    if (!title) { setError('Kurs adı zorunludur.'); return }
    if (!pricePerSession) { setError('Seans ücreti zorunludur.'); return }
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
        title,
        category,
        subcategory: subcategory || null,
        course_type: 'group',
        level,
        duration_minutes: durationMinutes,
        price_per_session: Number(pricePerSession),
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

    router.push('/dashboard/courses')
  }

  const subcats = SUBCATEGORIES[category] ?? []
  const today = new Date().toISOString().split('T')[0]

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <Link href="/dashboard/courses" className="flex items-center gap-2 text-text-muted text-sm mb-6 hover:text-text-primary w-fit">
        <ArrowLeft size={16} /> Kurslarım
      </Link>

      <h1 className="font-bebas text-4xl text-text-primary mb-1">YENİ KURS OLUŞTUR</h1>
      <p className="text-text-muted text-sm mb-6">Grup dersleri ve paket programlar için</p>

      <div className="space-y-6">
        {/* Temel bilgiler */}
        <div className="card p-4 space-y-4">
          <p className="text-xs font-semibold text-text-muted uppercase tracking-wide">Kurs Bilgileri</p>
          <div>
            <label className="label">Kurs Adı *</label>
            <input value={title} onChange={e => setTitle(e.target.value)} className="input-field text-sm"
              placeholder="Örn: 4 Haftalık Başlangıç Tango Kursu" />
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
              <label className="label">Alt Kategori</label>
              {subcats.length > 0 ? (
                <select value={subcategory} onChange={e => setSubcategory(e.target.value)} className="input-field text-sm">
                  <option value="">Seçin</option>
                  {subcats.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              ) : (
                <input value={subcategory} onChange={e => setSubcategory(e.target.value)} className="input-field text-sm" placeholder="Opsiyonel" />
              )}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Seviye</label>
              <select value={level} onChange={e => setLevel(e.target.value)} className="input-field text-sm">
                <option value="beginner">Başlangıç</option>
                <option value="intermediate">Orta</option>
                <option value="advanced">İleri</option>
                <option value="all">Hepsi</option>
              </select>
            </div>
            <div>
              <label className="label">Seans Süresi</label>
              <select value={durationMinutes} onChange={e => setDurationMinutes(Number(e.target.value))} className="input-field text-sm">
                {[30, 45, 60, 90, 120].map(d => <option key={d} value={d}>{d} dk</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="label">Açıklama</label>
            <textarea value={description} onChange={e => setDescription(e.target.value)} rows={2}
              className="input-field text-sm resize-none"
              placeholder="Kursun içeriği, hedef kitle, neler öğrenileceği..." />
          </div>
        </div>

        {/* Kurs Programı */}
        <div className="card p-4 space-y-4">
          <p className="text-xs font-semibold text-text-muted uppercase tracking-wide">Kurs Programı</p>

          <div>
            <label className="label">Kurs Süresi</label>
            <div className="flex gap-1.5 mt-1 flex-wrap">
              {DURATIONS.map(w => (
                <button key={w} onClick={() => setWeeks(w)}
                  className={cn('px-3 py-1.5 text-xs rounded border transition-colors',
                    weeks === w ? 'bg-accent/10 text-accent border-accent/30' : 'text-text-muted border-[rgba(228,224,216,0.1)] hover:text-text-primary'
                  )}>
                  {w} Hafta
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="label">Başlangıç Tarihi</label>
            <input type="date" min={today} value={startDate} onChange={e => setStartDate(e.target.value)} className="input-field text-sm" />
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="label">Ders Günleri</label>
              <div className="flex gap-1.5">
                <button onClick={() => setSelectedDays([1, 2, 3, 4, 5])} className="text-[10px] px-2 py-0.5 rounded border text-text-muted border-[rgba(228,224,216,0.1)] hover:text-accent hover:border-accent/30 transition-colors">Haftaiçi</button>
                <button onClick={() => setSelectedDays([0, 6])} className="text-[10px] px-2 py-0.5 rounded border text-text-muted border-[rgba(228,224,216,0.1)] hover:text-accent hover:border-accent/30 transition-colors">Haftasonu</button>
              </div>
            </div>
            <div className="flex gap-1.5">
              {DAY_SHORT.map((d, i) => (
                <button key={i} onClick={() => toggleDay(i)}
                  className={cn('flex-1 py-2 text-xs rounded border transition-colors',
                    selectedDays.includes(i) ? 'bg-accent/10 text-accent border-accent/30' : 'text-text-muted border-[rgba(228,224,216,0.1)] hover:text-text-primary'
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

          {/* Seans önizlemesi */}
          {generatedSessions.length > 0 && (
            <div className="rounded-lg bg-accent/5 border border-accent/15 p-3">
              <p className="text-accent text-sm font-medium">{generatedSessions.length} seans oluşturulacak</p>
              <p className="text-text-muted text-xs mt-0.5">
                {new Date(generatedSessions[0] + 'T00:00:00').toLocaleDateString('tr-TR', { day: 'numeric', month: 'long' })}
                {' → '}
                {new Date(generatedSessions[generatedSessions.length - 1] + 'T00:00:00').toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' })}
              </p>
            </div>
          )}
        </div>

        {/* Grup Ayarları */}
        <div className="card p-4 space-y-3">
          <p className="text-xs font-semibold text-text-muted uppercase tracking-wide">Grup Ayarları</p>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="label">Maks. Kişi</label>
              <input type="number" min={2} max={50} value={maxParticipants} onChange={e => setMaxParticipants(Number(e.target.value))} className="input-field text-sm" />
            </div>
            <div>
              <label className="label">Min. Kadın</label>
              <input type="number" min={0} value={minFemale} onChange={e => setMinFemale(Number(e.target.value))} className="input-field text-sm" />
            </div>
            <div>
              <label className="label">Min. Erkek</label>
              <input type="number" min={0} value={minMale} onChange={e => setMinMale(Number(e.target.value))} className="input-field text-sm" />
            </div>
          </div>
        </div>

        {/* Yer & Fiyat */}
        <div className="card p-4 space-y-4">
          <p className="text-xs font-semibold text-text-muted uppercase tracking-wide">Yer & Fiyat</p>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-text-primary">Online</p>
              <p className="text-text-muted text-xs">Video konferans ile</p>
            </div>
            <button onClick={() => setIsOnline(!isOnline)}
              className={cn('relative w-11 h-6 rounded-full transition-colors', isOnline ? 'bg-accent' : 'bg-[rgba(228,224,216,0.15)]')}>
              <span className={cn('absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition-transform', isOnline ? 'translate-x-5' : 'translate-x-0')} />
            </button>
          </div>
          {!isOnline && (
            <div>
              <label className="label">Konum</label>
              <input value={location} onChange={e => setLocation(e.target.value)} className="input-field text-sm" placeholder="Adres veya mekan adı" />
            </div>
          )}
          <div>
            <label className="label">Seans Başı Ücret (₺) *</label>
            <input type="number" min={0} value={pricePerSession} onChange={e => setPricePerSession(e.target.value)} className="input-field text-sm" placeholder="500" />
          </div>
          {totalPrice && (
            <div className="flex items-center justify-between py-2 border-t border-[rgba(228,224,216,0.1)]">
              <span className="text-text-muted text-sm">{generatedSessions.length} seans × ₺{pricePerSession}</span>
              <span className="font-bebas text-2xl text-accent">₺{totalPrice}</span>
            </div>
          )}
        </div>

        {error && <p className="text-red-400 text-sm">{error}</p>}

        <button onClick={handleSave} disabled={saving} className="btn-accent w-full py-3 text-sm disabled:opacity-50">
          {saving ? 'Oluşturuluyor...' : `Kursu Oluştur${generatedSessions.length > 0 ? ` (${generatedSessions.length} Seans)` : ''}`}
        </button>
      </div>
    </div>
  )
}
