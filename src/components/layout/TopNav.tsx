'use client'

import Link from 'next/link'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Menu, X, LogOut, LayoutDashboard } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

const navLinks = [
  { href: '/events', label: 'Etkinlikler' },
  { href: '/venues', label: 'Mekanlar' },
  { href: '/artists', label: 'Sanatçılar' },
  { href: '/bands', label: 'Gruplar' },
]

export function TopNav() {
  const [menuOpen, setMenuOpen] = useState(false)
  const [user, setUser] = useState<{ email?: string; display_name?: string } | null>(null)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
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
        <Link href="/" className="font-bebas text-2xl text-text-primary tracking-wider">
          SAHNE.TODAY
        </Link>

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
              <Link href="/dashboard" className="flex items-center gap-1.5 text-sm text-text-muted hover:text-text-primary transition-colors">
                <LayoutDashboard size={14} />
                {displayName}
              </Link>
              <button onClick={handleLogout} className="flex items-center gap-1.5 btn-outline text-sm py-1.5">
                <LogOut size={13} />
                Çıkış
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
