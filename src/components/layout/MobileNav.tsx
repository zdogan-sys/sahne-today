'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState, useEffect, useRef } from 'react'
import { Home, Calendar, MapPin, Bell, User } from 'lucide-react'
import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'

export function MobileNav() {
  const pathname = usePathname()
  const [unread, setUnread] = useState(0)
  const channelRef = useRef<any>(null)
  const supabase = createClient()

  useEffect(() => {
    let mounted = true

    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user || !mounted) return

      supabase
        .from('notifications')
        .select('id', { count: 'exact', head: true })
        .eq('read', false)
        .then(({ count }) => { if (mounted) setUnread(count ?? 0) })

      const channel = supabase
        .channel(`mobile-notifs-${user.id}`)
        .on('postgres_changes', {
          event: 'INSERT', schema: 'public', table: 'notifications',
          filter: `user_id=eq.${user.id}`,
        }, () => { if (mounted) setUnread(prev => prev + 1) })
        .subscribe()

      channelRef.current = channel
    })

    return () => {
      mounted = false
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current)
        channelRef.current = null
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (pathname === '/notifications') setUnread(0)
  }, [pathname])

  const items = [
    { href: '/', label: 'Ana Sayfa', icon: Home },
    { href: '/events', label: 'Etkinlikler', icon: Calendar },
    { href: '/venues', label: 'Sahne Bul', icon: MapPin },
    { href: '/notifications', label: 'Bildirimler', icon: Bell, badge: unread },
    { href: '/dashboard', label: 'Profil', icon: User },
  ]

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden bg-surface/95 backdrop-blur-sm border-t border-[rgba(228,224,216,0.08)]">
      <div className="flex">
        {items.map(({ href, label, icon: Icon, badge }) => {
          const active = pathname === href || (href !== '/' && pathname.startsWith(href))
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex-1 flex flex-col items-center justify-center py-2 gap-0.5 min-h-[56px] relative',
                active ? 'text-accent' : 'text-text-muted'
              )}
            >
              <div className="relative">
                <Icon size={20} />
                {badge != null && badge > 0 && (
                  <span className="absolute -top-1 -right-1.5 w-4 h-4 bg-accent rounded-full flex items-center justify-center text-[9px] font-bold text-white">
                    {badge > 9 ? '9+' : badge}
                  </span>
                )}
              </div>
              <span className="text-[10px] font-medium">{label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
