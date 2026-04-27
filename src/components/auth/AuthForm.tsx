'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'

type Role = 'artist' | 'venue' | 'audience'
type Tab = 'signin' | 'signup'

const ROLE_OPTIONS: { value: Role; label: string; desc: string }[] = [
  { value: 'artist', label: 'Sanatçı', desc: 'Sahne başvurularım ve takvimim' },
  { value: 'venue', label: 'Mekan', desc: 'Açık sahne slotlarımı yönet' },
  { value: 'audience', label: 'Dinleyici', desc: 'Etkinlikleri keşfet' },
]

export function AuthForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [tab, setTab] = useState<Tab>(searchParams.get('tab') === 'signup' ? 'signup' : 'signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [role, setRole] = useState<Role>('audience')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [signupStep, setSignupStep] = useState(1)

  const supabase = createClient()

  async function handleSignIn() {
    setLoading(true)
    setError('')
    const { error: err } = await supabase.auth.signInWithPassword({ email, password })
    if (err) {
      setError('E-posta veya şifre hatalı.')
    } else {
      router.push('/dashboard')
      router.refresh()
    }
    setLoading(false)
  }

  async function handleSignUp() {
    if (signupStep === 1) {
      if (!email || !password || !displayName) return
      setSignupStep(2)
      return
    }

    setLoading(true)
    setError('')

    const { error: err } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { display_name: displayName, role } as Record<string, unknown>,
      },
    })

    if (err) {
      setError(err.message)
    } else {
      router.push('/dashboard')
      router.refresh()
    }
    setLoading(false)
  }

  return (
    <div className="card p-6">
      {/* Tab toggle */}
      <div className="flex bg-[rgba(228,224,216,0.04)] rounded-lg p-1 mb-6">
        {(['signin', 'signup'] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => { setTab(t); setSignupStep(1); setError('') }}
            className={cn(
              'flex-1 py-2 text-sm font-medium rounded-md transition-colors',
              tab === t ? 'bg-surface text-text-primary' : 'text-text-muted hover:text-text-primary'
            )}
          >
            {t === 'signin' ? 'Giriş Yap' : 'Kayıt Ol'}
          </button>
        ))}
      </div>

      {tab === 'signin' ? (
        <div className="space-y-4">
          <div>
            <label className="label">E-posta</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="sen@mail.com" className="input-field" />
          </div>
          <div>
            <label className="label">Şifre</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" className="input-field" />
          </div>
          {error && <p className="text-red-400 text-sm">{error}</p>}
          <button onClick={handleSignIn} disabled={loading || !email || !password} className="btn-accent w-full py-3 disabled:opacity-40">
            {loading ? 'Giriş yapılıyor...' : 'Giriş Yap'}
          </button>
        </div>
      ) : signupStep === 1 ? (
        <div className="space-y-4">
          <div>
            <label className="label">Görünen Ad</label>
            <input value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="Adınız" className="input-field" />
          </div>
          <div>
            <label className="label">E-posta</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="sen@mail.com" className="input-field" />
          </div>
          <div>
            <label className="label">Şifre</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="En az 6 karakter" className="input-field" />
          </div>
          <button onClick={handleSignUp} disabled={!email || !password || !displayName || password.length < 6} className="btn-accent w-full py-3 disabled:opacity-40">
            Devam Et →
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          <div>
            <label className="label">Rolünüz</label>
            <div className="space-y-2">
              {ROLE_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setRole(opt.value)}
                  className={cn(
                    'w-full text-left p-3 rounded-lg border transition-colors',
                    role === opt.value
                      ? 'border-accent/40 bg-accent/10'
                      : 'border-[rgba(228,224,216,0.1)] hover:border-[rgba(228,224,216,0.2)]'
                  )}
                >
                  <p className={cn('font-medium text-sm', role === opt.value ? 'text-accent' : 'text-text-primary')}>
                    {opt.label}
                  </p>
                  <p className="text-text-muted text-xs mt-0.5">{opt.desc}</p>
                </button>
              ))}
            </div>
          </div>
          {error && <p className="text-red-400 text-sm">{error}</p>}
          <div className="flex gap-3">
            <button onClick={() => setSignupStep(1)} className="btn-outline flex-1 py-3">← Geri</button>
            <button onClick={handleSignUp} disabled={loading} className="btn-accent flex-1 py-3 disabled:opacity-40">
              {loading ? 'Kayıt olunuyor...' : 'Hesap Oluştur'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
