'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Check, Loader2, Star } from 'lucide-react'

const PLANS = [
  {
    id: 'individual',
    title: 'Sanatçı Pro',
    price: 299,
    period: 'ay',
    features: [
      'Kurs ve özel ders yayınla',
      'Ders saatlerini yönet',
      'Ödeme alma (PayTR)',
      'Pro rozet profilinde',
      'Öncelikli listeleme',
    ],
  },
  {
    id: 'venue',
    title: 'Mekan Pro',
    price: 499,
    period: 'ay',
    features: [
      'Kurs ve ders programı oluştur',
      'Eğitmen yönetimi',
      'Studio rezervasyon sistemi',
      'Ödeme alma (PayTR)',
      'Pro rozet profilinde',
    ],
  },
]

export default function ProPage() {
  const supabase = createClient()
  const [user, setUser] = useState<any>(null)
  const [profile, setProfile] = useState<any>(null)
  const [venues, setVenues] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [buying, setBuying] = useState<string | null>(null)
  const [iframeToken, setIframeToken] = useState<string | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    load()
  }, [])

  async function load() {
    const { data: { user: u } } = await supabase.auth.getUser()
    if (!u) { setLoading(false); return }
    setUser(u)

    const [profileRes, venuesRes] = await Promise.all([
      supabase.from('profiles').select('display_name, is_pro_individual').eq('id', u.id).single(),
      supabase.from('venues').select('id, name, is_pro_venue').eq('owner_id', u.id),
    ])
    setProfile(profileRes.data)
    setVenues(venuesRes.data ?? [])
    setLoading(false)
  }

  async function handleBuy(planId: string, venueId?: string) {
    if (!user) { window.location.href = '/auth'; return }
    setBuying(planId + (venueId ?? ''))
    setError('')

    const res = await fetch('/api/pro/buy', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ plan: planId, venue_id: venueId ?? null }),
    })
    const data = await res.json()

    if (!res.ok || !data.token) {
      setError(data.error ?? 'Bir hata oluştu.')
      setBuying(null); return
    }

    setIframeToken(data.token)
    setBuying(null)
  }

  if (loading) return <div className="max-w-2xl mx-auto px-4 py-16 flex justify-center"><Loader2 size={24} className="animate-spin text-accent" /></div>

  if (iframeToken) return (
    <div className="max-w-lg mx-auto px-4 py-6">
      <h2 className="font-bebas text-3xl text-text-primary mb-4">ÖDEME</h2>
      <iframe src={`https://www.paytr.com/odeme/guvenli/${iframeToken}`} style={{ width: '100%', height: '600px', border: 'none' }} allow="payment" title="PayTR" />
    </div>
  )

  return (
    <div className="max-w-2xl mx-auto px-4 py-10 space-y-10">
      <div className="text-center">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#d4a820]/10 border border-[#d4a820]/20 text-[#d4a820] text-xs font-semibold mb-4">
          <Star size={11} fill="currentColor" /> PRO ÜYELİK
        </div>
        <h1 className="font-bebas text-5xl text-text-primary mb-2">SAHNE PRO</h1>
        <p className="text-text-muted text-sm max-w-md mx-auto">Sanatçılar ve mekanlar için profesyonel araçlar. Kurs ver, ders al, ödeme yönet.</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {PLANS.map(plan => {
          const isIndividualActive = plan.id === 'individual' && profile?.is_pro_individual
          return (
            <div key={plan.id} className={`card p-6 space-y-5 ${isIndividualActive ? 'border-[#d4a820]/40' : ''}`}>
              <div>
                <div className="flex items-center justify-between">
                  <h2 className="font-bebas text-2xl text-text-primary">{plan.title}</h2>
                  {isIndividualActive && (
                    <span className="text-[10px] px-2 py-0.5 rounded border border-[#d4a820]/30 text-[#d4a820] bg-[#d4a820]/10 font-semibold">AKTİF</span>
                  )}
                </div>
                <div className="flex items-baseline gap-1 mt-1">
                  <span className="font-bebas text-4xl text-accent">₺{plan.price}</span>
                  <span className="text-text-muted text-sm">/ {plan.period}</span>
                </div>
              </div>

              <ul className="space-y-2">
                {plan.features.map(f => (
                  <li key={f} className="flex items-start gap-2 text-sm text-text-muted">
                    <Check size={13} className="text-success mt-0.5 flex-shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>

              {plan.id === 'individual' && (
                isIndividualActive ? (
                  <p className="text-success text-sm text-center">✓ Aktif</p>
                ) : !user ? (
                  <Link href="/auth" className="btn-accent w-full py-2.5 text-sm text-center block">Giriş Yap & Satın Al</Link>
                ) : (
                  <button
                    onClick={() => handleBuy('individual')}
                    disabled={buying !== null}
                    className="btn-accent w-full py-2.5 text-sm disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {buying === 'individual' ? <><Loader2 size={13} className="animate-spin" /> İşleniyor...</> : 'Satın Al'}
                  </button>
                )
              )}

              {plan.id === 'venue' && (
                venues.length === 0 ? (
                  <Link href="/venues/register" className="btn-accent w-full py-2.5 text-sm text-center block">Önce Mekan Ekle</Link>
                ) : (
                  <div className="space-y-2">
                    {venues.map(v => (
                      v.is_pro_venue ? (
                        <div key={v.id} className="flex items-center justify-between text-sm">
                          <span className="text-text-muted truncate">{v.name}</span>
                          <span className="text-success text-xs flex-shrink-0 ml-2">✓ Pro</span>
                        </div>
                      ) : (
                        <button
                          key={v.id}
                          onClick={() => handleBuy('venue', v.id)}
                          disabled={buying !== null}
                          className="w-full flex items-center justify-between px-3 py-2 rounded-lg border border-accent/30 text-accent text-xs hover:bg-accent/10 transition-colors disabled:opacity-50"
                        >
                          <span className="truncate">{v.name}</span>
                          <span className="flex-shrink-0 ml-2 font-bebas text-sm">Satın Al →</span>
                        </button>
                      )
                    ))}
                  </div>
                )
              )}
            </div>
          )
        })}
      </div>

      {error && <p className="text-red-400 text-sm text-center">{error}</p>}

      <p className="text-center text-text-muted text-xs">
        Ödeme güvenli PayTR altyapısı ile işlenir. Sorularınız için{' '}
        <a href="mailto:destek@sahne.today" className="text-accent hover:underline">destek@sahne.today</a>
      </p>
    </div>
  )
}
