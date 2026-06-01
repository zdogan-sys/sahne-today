'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Plus, X } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'

const SUBCATEGORIES: Record<string, string[]> = {
  music: ['Gitar', 'Piyano', 'Keman', 'Saksafon', 'Davul', 'Bas Gitar', 'Vokal', 'Flüt', 'Klarnet', 'Trompet', 'Ud', 'Bağlama'],
  dance: ['Salsa', 'Tango', 'Bale', 'Hip-Hop', 'Vals', 'Foxtrot', 'Zumba', 'Flamenco', 'Zeybek', 'Modern Dans'],
  theater: ['Temel Oyunculuk', 'İmprovizasyon', 'Senaryo Yazarlığı', 'Sahne Performansı', 'Ses Eğitimi'],
  other: [],
}

interface Session {
  session_date: string
  start_time: string
  end_time: string
}

export default function NewCoursePage() {
  const router = useRouter()
  const supabase = createClient()

  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const [title, setTitle] = useState('')
  const [category, setCategory] = useState('music')
  const [subcategory, setSubcategory] = useState('')
  const [courseType, setCourseType] = useState('individual')
  const [level, setLevel] = useState('all')
  const [durationMinutes, setDurationMinutes] = useState(60)
  const [pricePerSession, setPricePerSession] = useState('')
  const [maxParticipants, setMaxParticipants] = useState(1)
  const [minFemale, setMinFemale] = useState(0)
  const [minMale, setMinMale] = useState(0)
  const [isOnline, setIsOnline] = useState(false)
  const [location, setLocation] = useState('')
  const [description, setDescription] = useState('')
  const [sessions, setSessions] = useState<Session[]>([])
  const [newSession, setNewSession] = useState<Session>({ session_date: '', start_time: '10:00', end_time: '11:00' })

  function addSession() {
    if (!newSession.session_date || !newSession.start_time || !newSession.end_time) return
    setSessions([...sessions, { ...newSession }])
    setNewSession({ session_date: '', start_time: '10:00', end_time: '11:00' })
  }

  function removeSession(i: number) {
    setSessions(sessions.filter((_, idx) => idx !== i))
  }

  async function handleSave() {
    if (!title || !pricePerSession) {
      setError('Kurs adı ve seans ücreti zorunludur.')
      return
    }

    setSaving(true)
    setError('')

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setError('Giriş yapmalısınız.'); setSaving(false); return }

    const { data: course, error: courseError } = await supabase
      .from('courses')
      .insert({
        instructor_id: user.id,
        title,
        category,
        subcategory: subcategory || null,
        course_type: courseType,
        level,
        duration_minutes: durationMinutes,
        price_per_session: Number(pricePerSession),
        max_participants: courseType === 'group' ? maxParticipants : 1,
        min_female: courseType === 'group' ? minFemale : 0,
        min_male: courseType === 'group' ? minMale : 0,
        is_online: isOnline,
        location: !isOnline ? location || null : null,
        description: description || null,
        status: 'active',
      } as any)
      .select('id')
      .single()

    if (courseError || !course) {
      setError(courseError?.message ?? 'Kurs oluşturulamadı.')
      setSaving(false)
      return
    }

    if (sessions.length > 0) {
      await supabase.from('course_sessions').insert(
        sessions.map((s) => ({
          course_id: course.id,
          session_date: s.session_date,
          start_time: s.start_time + ':00',
          end_time: s.end_time + ':00',
          status: 'available',
        })) as any
      )
    }

    router.push('/dashboard/courses')
  }

  const subcats = SUBCATEGORIES[category] ?? []

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <Link href="/dashboard/courses" className="flex items-center gap-2 text-text-muted text-sm mb-6 hover:text-text-primary w-fit">
        <ArrowLeft size={16} /> Kurslarım
      </Link>

      <h1 className="font-bebas text-4xl text-text-primary mb-6">YENİ KURS OLUŞTUR</h1>

      <div className="space-y-5">
        {/* Temel bilgiler */}
        <div>
          <label className="label">Kurs Adı *</label>
          <input value={title} onChange={(e) => setTitle(e.target.value)} className="input-field text-sm" placeholder="Örn: Başlangıç Gitar Dersi" />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Kategori</label>
            <select value={category} onChange={(e) => { setCategory(e.target.value); setSubcategory('') }} className="input-field text-sm">
              <option value="music">Müzik</option>
              <option value="dance">Dans</option>
              <option value="theater">Tiyatro</option>
              <option value="other">Diğer</option>
            </select>
          </div>
          <div>
            <label className="label">Alt Kategori</label>
            {subcats.length > 0 ? (
              <select value={subcategory} onChange={(e) => setSubcategory(e.target.value)} className="input-field text-sm">
                <option value="">Seçin</option>
                {subcats.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            ) : (
              <input value={subcategory} onChange={(e) => setSubcategory(e.target.value)} className="input-field text-sm" placeholder="Opsiyonel" />
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Ders Türü</label>
            <select value={courseType} onChange={(e) => setCourseType(e.target.value)} className="input-field text-sm">
              <option value="individual">Bireysel</option>
              <option value="group">Grup</option>
              <option value="package">Paket</option>
            </select>
          </div>
          <div>
            <label className="label">Seviye</label>
            <select value={level} onChange={(e) => setLevel(e.target.value)} className="input-field text-sm">
              <option value="all">Hepsi</option>
              <option value="beginner">Başlangıç</option>
              <option value="intermediate">Orta</option>
              <option value="advanced">İleri</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Ders Süresi (dk)</label>
            <select value={durationMinutes} onChange={(e) => setDurationMinutes(Number(e.target.value))} className="input-field text-sm">
              {[30, 45, 60, 90, 120].map((d) => <option key={d} value={d}>{d} dk</option>)}
            </select>
          </div>
          <div>
            <label className="label">Seans Ücreti (₺) *</label>
            <input type="number" value={pricePerSession} onChange={(e) => setPricePerSession(e.target.value)} className="input-field text-sm" placeholder="0" min="0" />
          </div>
        </div>

        {/* Grup dersi ayarları */}
        {courseType === 'group' && (
          <div className="card p-4 space-y-3">
            <p className="text-xs font-semibold text-text-muted uppercase tracking-wide">Grup Ayarları</p>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="label">Maks. Katılımcı</label>
                <input type="number" value={maxParticipants} onChange={(e) => setMaxParticipants(Number(e.target.value))} className="input-field text-sm" min="2" />
              </div>
              <div>
                <label className="label">Min. Kadın</label>
                <input type="number" value={minFemale} onChange={(e) => setMinFemale(Number(e.target.value))} className="input-field text-sm" min="0" />
              </div>
              <div>
                <label className="label">Min. Erkek</label>
                <input type="number" value={minMale} onChange={(e) => setMinMale(Number(e.target.value))} className="input-field text-sm" min="0" />
              </div>
            </div>
          </div>
        )}

        {/* Online / Yüz yüze */}
        <div className="flex items-center justify-between py-3 border-t border-b border-[rgba(228,224,216,0.1)]">
          <div>
            <p className="text-sm text-text-primary">Online Ders</p>
            <p className="text-text-muted text-xs">Video konferans ile verilir</p>
          </div>
          <button type="button" onClick={() => setIsOnline(!isOnline)}
            className={cn('relative w-11 h-6 rounded-full transition-colors', isOnline ? 'bg-accent' : 'bg-[rgba(228,224,216,0.15)]')}>
            <span className={cn('absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition-transform', isOnline ? 'translate-x-5' : 'translate-x-0')} />
          </button>
        </div>

        {!isOnline && (
          <div>
            <label className="label">Konum</label>
            <input value={location} onChange={(e) => setLocation(e.target.value)} className="input-field text-sm" placeholder="Adres veya mekan adı" />
          </div>
        )}

        <div>
          <label className="label">Açıklama</label>
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} className="input-field text-sm resize-none" placeholder="Kurs hakkında kısa bilgi..." />
        </div>

        {/* Seans ekleme */}
        <div>
          <p className="label mb-3">Ders Saatleri</p>
          {sessions.length > 0 && (
            <div className="space-y-2 mb-3">
              {sessions.map((s, i) => (
                <div key={i} className="flex items-center gap-2 p-2.5 rounded-lg bg-[rgba(228,224,216,0.04)] border border-[rgba(228,224,216,0.08)]">
                  <span className="flex-1 text-text-primary text-sm">
                    {new Date(s.session_date).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long' })} — {s.start_time}–{s.end_time}
                  </span>
                  <button onClick={() => removeSession(i)} className="text-text-muted hover:text-red-400 transition-colors">
                    <X size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}
          <div className="card p-3 space-y-2">
            <div className="grid grid-cols-3 gap-2">
              <input type="date" value={newSession.session_date}
                min={new Date().toISOString().split('T')[0]}
                onChange={(e) => setNewSession({ ...newSession, session_date: e.target.value })}
                className="input-field text-xs col-span-1" />
              <input type="time" value={newSession.start_time}
                onChange={(e) => setNewSession({ ...newSession, start_time: e.target.value })}
                className="input-field text-xs" />
              <input type="time" value={newSession.end_time}
                onChange={(e) => setNewSession({ ...newSession, end_time: e.target.value })}
                className="input-field text-xs" />
            </div>
            <button onClick={addSession} disabled={!newSession.session_date}
              className="btn-accent w-full py-2 text-xs flex items-center justify-center gap-1.5 disabled:opacity-40">
              <Plus size={12} /> Seans Ekle
            </button>
          </div>
        </div>

        {error && <p className="text-red-400 text-sm">{error}</p>}

        <button onClick={handleSave} disabled={saving} className="btn-accent w-full py-3 text-sm disabled:opacity-50">
          {saving ? 'Kaydediliyor...' : 'Kursu Oluştur'}
        </button>
      </div>
    </div>
  )
}
