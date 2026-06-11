'use client'

import { useState, useEffect } from 'react'
import { Menu, X, LogOut, LayoutDashboard, Mic2, Store, MapPin, ChevronDown, Search, MessageSquare, Star } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { NotificationBell } from '@/components/notifications/NotificationBell'
import { useTranslations, useLocale } from 'next-intl'
import { Link, useRouter } from '@/i18n/navigation'

const cities = ['Tümü', 'İstanbul', 'Ankara', 'İzmir', 'Antalya', 'Bursa', 'Eskişehir']

export function TopNav() {
  const t = useTranslations()
  const locale = useLocale()
  const [menuOpen, setMenuOpen] = useState(false)
  const [cityOpen, setCityOpen] = useState(false)
  const [selectedCity, setSelectedCity] = useState<string>('Tümü')
  const [user, setUser] = useState<{ id?: string; email?: string; display_name?: string; is_pro?: boolean } | null>(null)
  const router = useRouter()
  const supabase = createClient()

  const navLinks = [
    { href: '/events' as const, label: t('nav.events') },
    { href: '/venues' as const, label: t('nav.venues') },
    { href: '/artists' as const, label: t('nav.artists') },
    { href: '/courses' as const, label: locale === 'en' ? 'Courses' : 'Kurslar' },
    { href: '/bands' as const, label: t('nav.bands') },
  ]

  const logoText = locale === 'tr' ? 'SAHNE.TODAY' : 'THE STAGE'

  useEffect(() => {
    const savedCity = localStorage.getItem('sahne_city')
    if (savedCity && cities.includes(savedCity)) {
      setSelectedCity(savedCity)
    }

    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (user) {
        const { data: profile } = await supabase.from('profiles').select('is_pro_individual').eq('id', user.id).single()
        setUser({ id: user.id, email: user.email, display_name: user.user_metadata?.display_name, is_pro: !!(profile as any)?.is_pro_individual })
      }
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setUser({ id: session.user.id, email: session.user.email, display_name: session.user.user_metadata?.display_name })
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
            {logoText}
          </Link>

          {/* Desktop City Selector */}
          <div className="relative hidden sm:block">
            <button 
              onClick={() => setCityOpen(!cityOpen)}
              className="flex items-center gap-1.5 text-sm text-text-muted hover:text-text-primary transition-colors bg-[rgba(228,224,216,0.05)] px-3 py-1.5 rounded-full"
            >
              <MapPin size={14} />
              {selectedCity === 'Tümü' ? t('common.city') : selectedCity}
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
          <Link href="/search" className="text-text-muted hover:text-text-primary transition-colors" aria-label="Ara">
            <Search size={16} />
          </Link>
        </nav>

        {/* Desktop auth */}
        <div className="hidden md:flex items-center gap-3">
          {user ? (
            <>
              <Link href="/artists/portal" className="flex items-center gap-1.5 text-sm text-text-muted hover:text-accent transition-colors border border-[rgba(228,224,216,0.1)] px-3 py-1.5 rounded-full hover:border-accent/40">
                <Mic2 size={14} />
                {t('artists.portal')}
              </Link>
              <Link href="/venues/portal" className="flex items-center gap-1.5 text-sm text-text-muted hover:text-accent transition-colors border border-[rgba(228,224,216,0.1)] px-3 py-1.5 rounded-full hover:border-accent/40">
                <Store size={14} />
                {t('venues.portal')}
              </Link>
              {!user.is_pro && (
                <Link href="/pro" className="flex items-center gap-1 text-xs font-semibold px-2.5 py-1.5 rounded-full border border-[#d4a820]/40 text-[#d4a820] hover:bg-[#d4a820]/10 transition-colors">
                  <Star size={11} fill="currentColor" /> PRO
                </Link>
              )}
              <div className="w-px h-4 bg-[rgba(228,224,216,0.1)] mx-1"></div>
              {user.id && <NotificationBell userId={user.id} />}
              <Link href="/messages" className="w-8 h-8 flex items-center justify-center rounded-full text-text-muted hover:text-text-primary hover:bg-[rgba(228,224,216,0.08)] transition-colors" title="Mesajlar">
                <MessageSquare size={16} />
              </Link>
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
                {t('auth.signin')}
              </Link>
              <Link href="/auth?tab=signup" className="btn-accent text-sm py-1.5">
                {t('auth.signup')}
              </Link>
            </>
          )}
        </div>

        {/* Mobile search + hamburger */}
        <div className="md:hidden flex items-center gap-1">
          <Link href="/search" className="p-2 text-text-muted hover:text-text-primary" aria-label="Ara">
            <Search size={18} />
          </Link>
          <button className="p-2 text-text-muted" onClick={() => setMenuOpen(!menuOpen)} aria-label="Menü">
            {menuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
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
                  {t('artists.portal')}
                </Link>
                <Link href="/venues/portal" onClick={() => setMenuOpen(false)}
                  className="flex items-center gap-2 py-2.5 text-sm text-text-muted hover:text-accent">
                  <Store size={14} />
                  {t('venues.portal')}
                </Link>
                <div className="my-1 border-t border-[rgba(228,224,216,0.08)]"></div>
                {!user.is_pro && (
                  <Link href="/pro" onClick={() => setMenuOpen(false)}
                    className="flex items-center gap-2 py-2.5 text-sm text-[#d4a820] font-medium">
                    <Star size={14} fill="currentColor" /> Pro Ol
                  </Link>
                )}
                <Link href="/messages" onClick={() => setMenuOpen(false)}
                  className="flex items-center gap-2 py-2.5 text-sm text-text-muted hover:text-accent">
                  <MessageSquare size={14} />
                  {t('messages.title')}
                </Link>
                <Link href="/dashboard" onClick={() => setMenuOpen(false)}
                  className="flex items-center gap-2 py-2.5 text-sm text-text-muted hover:text-text-primary">
                  <LayoutDashboard size={14} />
                  {t('nav.dashboard')} ({displayName})
                </Link>
                <button onClick={handleLogout}
                  className="flex items-center gap-2 py-2.5 text-sm text-red-400 hover:text-red-300 w-full">
                  <LogOut size={14} />
                  {t('nav.logout')}
                </button>
              </div>
            ) : (
              <div className="flex gap-3">
                <Link href="/auth" className="flex-1 text-center btn-outline text-sm py-2" onClick={() => setMenuOpen(false)}>
                  {t('auth.signin')}
                </Link>
                <Link href="/auth?tab=signup" className="flex-1 text-center btn-accent text-sm py-2" onClick={() => setMenuOpen(false)}>
                  {t('auth.signup')}
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  )
}
