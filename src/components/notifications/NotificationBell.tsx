'use client'

import { useState, useEffect, useRef } from 'react'
import { Bell, X } from 'lucide-react'
import Link from 'next/link'
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

export function NotificationBell({ userId }: { userId: string }) {
  const [open, setOpen] = useState(false)
  const [items, setItems] = useState<Notification[]>([])
  const ref = useRef<HTMLDivElement>(null)
  const supabase = createClient()

  useEffect(() => {
    fetch()

    const channel = supabase
      .channel(`notifs-${userId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${userId}` }, fetch)
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId])

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  async function fetch() {
    const { data } = await supabase
      .from('notifications')
      .select('id, type, title, body, link, read, created_at')
      .order('created_at', { ascending: false })
      .limit(20)
    setItems((data ?? []) as Notification[])
  }

  async function handleOpen() {
    setOpen(o => !o)
    const unread = items.filter(n => !n.read).map(n => n.id)
    if (unread.length > 0) {
      setItems(prev => prev.map(n => ({ ...n, read: true })))
      await markNotificationsRead(unread)
    }
  }

  const unreadCount = items.filter(n => !n.read).length

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={handleOpen}
        className="relative w-8 h-8 flex items-center justify-center rounded-full text-text-muted hover:text-text-primary hover:bg-[rgba(228,224,216,0.08)] transition-colors"
        title="Bildirimler"
      >
        <Bell size={16} />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-accent rounded-full flex items-center justify-center text-[9px] font-bold text-white">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 bg-surface border border-[rgba(228,224,216,0.12)] rounded-xl shadow-2xl z-50 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-[rgba(228,224,216,0.08)]">
            <span className="text-sm font-semibold text-text-primary">Bildirimler</span>
            <button onClick={() => setOpen(false)} className="text-text-muted hover:text-text-primary">
              <X size={14} />
            </button>
          </div>

          {items.length === 0 ? (
            <p className="text-text-muted text-sm text-center py-8">Bildirim yok</p>
          ) : (
            <div className="max-h-96 overflow-y-auto divide-y divide-[rgba(228,224,216,0.06)]">
              {items.map(n => {
                const inner = (
                  <>
                    <p className="text-text-primary text-sm font-medium leading-snug">{n.title}</p>
                    {n.body && <p className="text-text-muted text-xs mt-0.5 leading-relaxed">{n.body}</p>}
                    <p className="text-text-muted text-[10px] mt-1">{formatDate(n.created_at)}</p>
                  </>
                )
                return n.link ? (
                  <Link
                    key={n.id}
                    href={n.link}
                    onClick={() => setOpen(false)}
                    className={`block px-4 py-3 hover:bg-[rgba(228,224,216,0.04)] transition-colors ${n.read ? '' : 'bg-accent/5'}`}
                  >
                    {inner}
                  </Link>
                ) : (
                  <div key={n.id} className={`px-4 py-3 ${n.read ? '' : 'bg-accent/5'}`}>
                    {inner}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
