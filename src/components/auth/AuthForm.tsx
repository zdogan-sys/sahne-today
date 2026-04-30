'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'

type Tab = 'signin' | 'signup'

export function AuthForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [tab, setTab] = useState<Tab>(searchParams.get('tab') === 'signup' ? 'signup' : 'signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

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
    if (!email || !password || !displayName) return

    setLoading(true)
    setError('')

    const { error: err } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { display_name: displayName, role: 'audience' } as Record<string, unknown>,
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
            onClick={() => { setTab(t); setError('') }}
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
      ) : (
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
          {error && <p className="text-red-400 text-sm">{error}</p>}
          <button onClick={handleSignUp} disabled={loading || !email || !password || !displayName || password.length < 6} className="btn-accent w-full py-3 disabled:opacity-40">
            {loading ? 'Kayıt olunuyor...' : 'Hesap Oluştur'}
          </button>
        </div>
      )}
    </div>
  )
}
