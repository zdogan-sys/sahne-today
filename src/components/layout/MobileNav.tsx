'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, Calendar, MapPin, Users, User } from 'lucide-react'
import { cn } from '@/lib/utils'

const items = [
  { href: '/', label: 'Ana Sayfa', icon: Home },
  { href: '/events', label: 'Takvim', icon: Calendar },
  { href: '/venues', label: 'Sahne Bul', icon: MapPin },
  { href: '/bands', label: 'Gruplar', icon: Users },
  { href: '/dashboard', label: 'Profil', icon: User },
]

export function MobileNav() {
  const pathname = usePathname()

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden bg-surface/95 backdrop-blur-sm border-t border-[rgba(228,224,216,0.08)]">
      <div className="flex">
        {items.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || (href !== '/' && pathname.startsWith(href))
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex-1 flex flex-col items-center justify-center py-2 gap-0.5 min-h-[56px]',
                active ? 'text-accent' : 'text-text-muted'
              )}
            >
              <Icon size={20} />
              <span className="text-[10px] font-medium">{label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
