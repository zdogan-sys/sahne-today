'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, Check } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

export default function SetPasswordPage() {
  const router = useRouter()
  const supabase = createClient()

  const [checking, setChecking] = useState(true)
  const [hasSession, setHasSession] = useState(false)
  const [password, setPassword] = useState('')
  const [password2, setPassword2] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)

  useEffect(() => {
    // Davet/recovery linki oturumu URL'den yükler (detectSessionInUrl)
    async function check() {
      const { data } = await supabase.auth.getSession()
      setHasSession(!!data.session)
      setChecking(false)
    }
    // Kısa gecikme — supabase client URL'deki token'ı işlesin
    const t = setTimeout(check, 600)
    return () => clearTimeout(t)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function save() {
    if (password.length < 6) { setError('Şifre en az 6 karakter olmalı.'); return }
    if (password !== password2) { setError('Şifreler eşleşmiyor.'); return }
    setSaving(true); setError('')
    const { error: err } = await supabase.auth.updateUser({ password })
    if (err) { setError(err.message); setSaving(false); return }
    setDone(true)
    setSaving(false)
    setTimeout(() => router.push('/dashboard'), 1500)
  }

  if (checking) return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <Loader2 size={24} className="animate-spin text-accent" />
    </div>
  )

  if (done) return (
    <div className="max-w-sm mx-auto px-4 py-20 text-center">
      <div className="w-14 h-14 rounded-full bg-success/15 flex items-center justify-center mx-auto mb-4">
        <Check className="text-success" size={26} />
      </div>
      <h1 className="font-bebas text-3xl text-text-primary mb-2">PROFİLİN HAZIR</h1>
      <p className="text-text-muted text-sm">Şifren belirlendi. Yönlendiriliyorsun...</p>
    </div>
  )

  if (!hasSession) return (
    <div className="max-w-sm mx-auto px-4 py-20 text-center">
      <h1 className="font-bebas text-3xl text-text-primary mb-2">BAĞLANTI GEÇERSİZ</h1>
      <p className="text-text-muted text-sm">Davet bağlantısı geçersiz veya süresi dolmuş. Yeni bir davet isteyin ya da normal kayıt olun.</p>
      <button onClick={() => router.push('/auth')} className="text-accent mt-4 block mx-auto hover:underline">Giriş / Kayıt →</button>
    </div>
  )

  return (
    <div className="max-w-sm mx-auto px-4 py-16">
      <h1 className="font-bebas text-4xl text-text-primary mb-1">ŞİFRE BELİRLE</h1>
      <p className="text-text-muted text-sm mb-6">Profilini sahiplenmek için bir şifre belirle.</p>

      <div className="card p-5 space-y-4">
        <div>
          <label className="label">Şifre</label>
          <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="En az 6 karakter" className="input-field" />
        </div>
        <div>
          <label className="label">Şifre (Tekrar)</label>
          <input type="password" value={password2} onChange={e => setPassword2(e.target.value)} placeholder="••••••••" className="input-field" />
        </div>
        {error && <p className="text-red-400 text-sm">{error}</p>}
        <button onClick={save} disabled={saving || !password || !password2} className="btn-accent w-full py-3 text-sm disabled:opacity-50 flex items-center justify-center gap-2">
          {saving ? <><Loader2 size={15} className="animate-spin" /> Kaydediliyor...</> : 'Şifreyi Belirle & Profili Sahiplen'}
        </button>
      </div>
    </div>
  )
}
