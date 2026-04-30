'use client'

import Link from 'next/link'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Menu, X, LogOut, LayoutDashboard, Mic2, Store, MapPin, ChevronDown } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

const navLinks = [
  { href: '/events', label: 'Etkinlikler' },
  { href: '/venues', label: 'Mekanlar' },
  { href: '/artists', label: 'Sanatçılar' },
  { href: '/bands', label: 'Gruplar' },
]

const cities = ['Tümü', 'İstanbul', 'Ankara', 'İzmir', 'Antalya', 'Bursa', 'Eskişehir']

export function TopNav() {
  const [menuOpen, setMenuOpen] = useState(false)
  const [cityOpen, setCityOpen] = useState(false)
  const [selectedCity, setSelectedCity] = useState<string>('Tümü')
  const [user, setUser] = useState<{ email?: string; display_name?: string } | null>(null)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    const savedCity = localStorage.getItem('sahne_city')
    if (savedCity && cities.includes(savedCity)) {
      setSelectedCity(savedCity)
    }

    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) setUser({ email: user.email, display_name: user.user_metadata?.display_name })
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setUser({ email: session.user.email, display_name: session.user.user_metadata?.display_name })
      } else {
        setUser(null)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  const handleCitySelect = (city: string) => {
    setSelectedCity(city)
    localStorage.setItem('sahne_city', city)
    setCityOpen(false)
    window.dispatchEvent(new Event('city_changed'))
  }

  async function handleLogout() {
    await supabase.auth.signOut()
    setMenuOpen(false)
    router.push('/')
    router.refresh()
  }

  const displayName = user?.display_name || user?.email?.split('@')[0] || ''

  return (
    <header className="sticky top-0 z-50 bg-background/90 backdrop-blur-sm border-b border-[rgba(228,224,216,0.08)]">
      <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <Link href="/" className="font-bebas text-2xl text-text-primary tracking-wider">
            SAHNE.TODAY
          </Link>

          {/* Desktop City Selector */}
          <div className="relative hidden sm:block">
            <button 
              onClick={() => setCityOpen(!cityOpen)}
              className="flex items-center gap-1.5 text-sm text-text-muted hover:text-text-primary transition-colors bg-[rgba(228,224,216,0.05)] px-3 py-1.5 rounded-full"
            >
              <MapPin size={14} />
              {selectedCity === 'Tümü' ? 'Şehir Seç' : selectedCity}
              <ChevronDown size={14} />
            </button>
            {cityOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setCityOpen(false)} />
                <div className="absolute top-full left-0 mt-2 w-48 bg-surface border border-[rgba(228,224,216,0.08)] rounded-xl shadow-lg z-50 py-2 overflow-hidden">
                  {cities.map(city => (
                    <button
                      key={city}
                      onClick={() => handleCitySelect(city)}
                      className={`w-full text-left px-4 py-2 text-sm hover:bg-[rgba(228,224,216,0.05)] transition-colors ${selectedCity === city ? 'text-accent font-medium bg-[rgba(228,224,216,0.03)]' : 'text-text-muted'}`}
                    >
                      {city === 'Tümü' ? 'Tüm Şehirler' : city}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-6">
          {navLinks.map((l) => (
            <Link key={l.href} href={l.href} className="text-sm text-text-muted hover:text-text-primary transition-colors">
              {l.label}
            </Link>
          ))}
        </nav>

        {/* Desktop auth */}
        <div className="hidden md:flex items-center gap-3">
          {user ? (
            <>
              <Link href="/artists/portal" className="flex items-center gap-1.5 text-sm text-text-muted hover:text-accent transition-colors border border-[rgba(228,224,216,0.1)] px-3 py-1.5 rounded-full hover:border-accent/40">
                <Mic2 size={14} />
                Sanatçı Girişi
              </Link>
              <Link href="/venues/portal" className="flex items-center gap-1.5 text-sm text-text-muted hover:text-accent transition-colors border border-[rgba(228,224,216,0.1)] px-3 py-1.5 rounded-full hover:border-accent/40">
                <Store size={14} />
                Mekan Girişi
              </Link>
              <div className="w-px h-4 bg-[rgba(228,224,216,0.1)] mx-1"></div>
              <Link href="/dashboard" className="flex items-center gap-1.5 text-sm text-text-muted hover:text-text-primary transition-colors">
                <LayoutDashboard size={14} />
                {displayName}
              </Link>
              <button onClick={handleLogout} className="flex items-center gap-1.5 text-sm text-red-400 py-1.5 ml-2 hover:text-red-300">
                <LogOut size={13} />
              </button>
            </>
          ) : (
            <>
              <Link href="/auth" className="text-sm text-text-muted hover:text-text-primary transition-colors">
                Giriş
              </Link>
              <Link href="/auth?tab=signup" className="btn-accent text-sm py-1.5">
                Kayıt Ol
              </Link>
            </>
          )}
        </div>

        {/* Mobile hamburger */}
        <button className="md:hidden p-2 text-text-muted" onClick={() => setMenuOpen(!menuOpen)} aria-label="Menü">
          {menuOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="md:hidden bg-surface border-b border-[rgba(228,224,216,0.08)] px-4 py-3 space-y-1">
          {navLinks.map((l) => (
            <Link key={l.href} href={l.href}
              className="block py-2.5 text-sm text-text-muted hover:text-text-primary"
              onClick={() => setMenuOpen(false)}>
              {l.label}
            </Link>
          ))}

          <div className="pt-2 border-t border-[rgba(228,224,216,0.08)]">
            {user ? (
              <div className="space-y-1">
                <Link href="/artists/portal" onClick={() => setMenuOpen(false)}
                  className="flex items-center gap-2 py-2.5 text-sm text-text-muted hover:text-accent">
                  <Mic2 size={14} />
                  Sanatçı Girişi
                </Link>
                <Link href="/venues/portal" onClick={() => setMenuOpen(false)}
                  className="flex items-center gap-2 py-2.5 text-sm text-text-muted hover:text-accent">
                  <Store size={14} />
                  Mekan Girişi
                </Link>
                <div className="my-1 border-t border-[rgba(228,224,216,0.08)]"></div>
                <Link href="/dashboard" onClick={() => setMenuOpen(false)}
                  className="flex items-center gap-2 py-2.5 text-sm text-text-muted hover:text-text-primary">
                  <LayoutDashboard size={14} />
                  Panelim ({displayName})
                </Link>
                <button onClick={handleLogout}
                  className="flex items-center gap-2 py-2.5 text-sm text-red-400 hover:text-red-300 w-full">
                  <LogOut size={14} />
                  Çıkış Yap
                </button>
              </div>
            ) : (
              <div className="flex gap-3">
                <Link href="/auth" className="flex-1 text-center btn-outline text-sm py-2" onClick={() => setMenuOpen(false)}>
                  Giriş
                </Link>
                <Link href="/auth?tab=signup" className="flex-1 text-center btn-accent text-sm py-2" onClick={() => setMenuOpen(false)}>
                  Kayıt Ol
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  )
}
