'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'

type Tab = 'signin' | 'signup'
type OAuthProvider = 'google' | 'facebook' | 'apple'

const OAUTH_PROVIDERS: { provider: OAuthProvider; label: string; icon: React.ReactNode }[] = [
  {
    provider: 'google',
    label: 'Google',
    icon: (
      <svg viewBox="0 0 24 24" className="w-4 h-4" xmlns="http://www.w3.org/2000/svg">
        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
      </svg>
    ),
  },
]

export function AuthForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [tab, setTab] = useState<Tab>(searchParams.get('tab') === 'signup' ? 'signup' : 'signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [loading, setLoading] = useState(false)
  const [oauthLoading, setOauthLoading] = useState<OAuthProvider | null>(null)
  const [error, setError] = useState('')

  const supabase = createClient()

  async function handleOAuth(provider: OAuthProvider) {
    setOauthLoading(provider)
    setError('')
    const { error: err } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    })
    if (err) {
      setError(err.message)
      setOauthLoading(null)
    }
  }

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

      {/* Social login buttons */}
      <div className="space-y-2 mb-5">
        {OAUTH_PROVIDERS.map(({ provider, label, icon }) => (
          <button
            key={provider}
            onClick={() => handleOAuth(provider)}
            disabled={!!oauthLoading || loading}
            className="w-full flex items-center justify-center gap-3 py-2.5 rounded-xl border border-[rgba(228,224,216,0.12)] bg-[rgba(228,224,216,0.04)] hover:bg-[rgba(228,224,216,0.08)] text-text-primary text-sm font-medium transition-colors disabled:opacity-40"
          >
            {oauthLoading === provider ? (
              <span className="w-4 h-4 rounded-full border-2 border-text-muted border-t-transparent animate-spin" />
            ) : icon}
            {label} ile devam et
          </button>
        ))}
      </div>

      {/* Divider */}
      <div className="flex items-center gap-3 mb-5">
        <div className="flex-1 h-px bg-[rgba(228,224,216,0.08)]" />
        <span className="text-xs text-text-muted">veya e-posta ile</span>
        <div className="flex-1 h-px bg-[rgba(228,224,216,0.08)]" />
      </div>

      {/* Email/password form */}
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
