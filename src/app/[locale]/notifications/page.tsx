'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect } from 'react'
import { Bell, ArrowLeft, Check } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { Link } from '@/i18n/navigation'
import { createClient } from '@/lib/supabase/client'
import { markNotificationsRead } from '@/app/actions/offer'
import { formatDate } from '@/lib/utils'

interface Notification {
  id: string
  type: string
  title: string
  body: string | null
  link: string | null
  read: boolean
  created_at: string
}

export default function NotificationsPage() {
  const t = useTranslations('notifications')
  const tNav = useTranslations('nav')
  const [items, setItems] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from('notifications')
        .select('id, type, title, body, link, read, created_at')
        .order('created_at', { ascending: false })
        .limit(50)
      const notifs = (data ?? []) as Notification[]
      setItems(notifs)
      setLoading(false)

      const unread = notifs.filter(n => !n.read).map(n => n.id)
      if (unread.length > 0) {
        setItems(prev => prev.map(n => ({ ...n, read: true })))
        await markNotificationsRead(unread)
      }
    }
    load()

    const channel = supabase
      .channel('notifs-page')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications' }, () => load())
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/dashboard" className="text-text-muted hover:text-text-primary transition-colors">
          <ArrowLeft size={18} />
        </Link>
        <h1 className="font-bebas text-3xl text-text-primary tracking-wide">{tNav('notifications').toUpperCase()}</h1>
      </div>

      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="card p-4 animate-pulse">
              <div className="h-4 bg-[rgba(228,224,216,0.08)] rounded w-2/3 mb-2" />
              <div className="h-3 bg-[rgba(228,224,216,0.06)] rounded w-full mb-1" />
              <div className="h-3 bg-[rgba(228,224,216,0.05)] rounded w-1/4" />
            </div>
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="text-center py-20">
          <Bell size={40} className="mx-auto mb-4 text-text-muted opacity-20" />
          <p className="text-text-primary text-sm font-medium mb-1">{t('noNotifications')}</p>
          <p className="text-text-muted text-xs">{t('desc')}</p>
        </div>
      ) : (
        <div className="space-y-1.5">
          {items.map(n => {
            const content = (
              <div className={`card p-4 transition-colors ${!n.read ? 'border-accent/20 bg-accent/5' : ''}`}>
                <div className="flex items-start gap-3">
                  <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${!n.read ? 'bg-accent' : 'bg-transparent'}`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-text-primary text-sm font-medium leading-snug">{n.title}</p>
                    {n.body && <p className="text-text-muted text-xs mt-1 leading-relaxed">{n.body}</p>}
                    <p className="text-text-muted text-[10px] mt-1.5">{formatDate(n.created_at)}</p>
                  </div>
                  {n.link && <span className="text-accent text-xs flex-shrink-0 mt-0.5">→</span>}
                </div>
              </div>
            )
            return n.link ? (
              <Link key={n.id} href={n.link}>{content}</Link>
            ) : (
              <div key={n.id}>{content}</div>
            )
          })}
        </div>
      )}
    </div>
  )
}
