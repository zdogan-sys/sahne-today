export const dynamic = 'force-dynamic'

import { redirect } from 'next/navigation'
import Link from 'next/link'
import { MessageSquare } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { getConversations } from '@/app/actions/messaging'

export const metadata = { title: 'Mesajlar' }

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'az önce'
  if (mins < 60) return `${mins}dk önce`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}sa önce`
  return `${Math.floor(hours / 24)}g önce`
}

export default async function MessagesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth')

  const conversations = await getConversations()

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <h1 className="font-bebas text-4xl mb-6">MESAJLAR</h1>

      {conversations.length === 0 ? (
        <div className="card p-8 text-center">
          <MessageSquare size={32} className="text-text-muted mx-auto mb-3" />
          <p className="text-text-muted text-sm">
            Henüz mesajlaşma konuşmanız yok.
          </p>
          <p className="text-text-muted text-xs mt-2">
            Üyesi olduğunuz bir grubun sayfasından veya katılımcısı olduğunuz bir etkinlikten sohbet başlatabilirsiniz.
          </p>
        </div>
      ) : (
        <div className="space-y-1">
          {conversations.map((conv: any) => (
            <Link
              key={conv.id}
              href={`/messages/${conv.id}`}
              className="card p-4 flex items-center gap-3 hover:border-accent/30 transition-colors"
            >
              <div className="w-10 h-10 rounded-full bg-accent/10 flex items-center justify-center text-accent font-bold text-sm flex-shrink-0">
                {conv.type === 'band' ? '🎸' : '🎤'}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-text-primary text-sm font-semibold truncate">{conv.contextName}</p>
                  <span className="text-text-muted text-[10px] flex-shrink-0">
                    {timeAgo(conv.last_message_at)}
                  </span>
                </div>
                {conv.lastMessage ? (
                  <p className="text-text-muted text-xs truncate mt-0.5">
                    {(conv.lastMessage as any).profiles?.display_name
                      ? `${(conv.lastMessage as any).profiles.display_name}: `
                      : ''}
                    {(conv.lastMessage as any).body}
                  </p>
                ) : (
                  <p className="text-text-muted text-xs mt-0.5 italic">Henüz mesaj yok</p>
                )}
              </div>
              {conv.unreadCount > 0 && (
                <span className="w-5 h-5 bg-accent rounded-full flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0">
                  {conv.unreadCount > 9 ? '9+' : conv.unreadCount}
                </span>
              )}
            </Link>
          ))}
        </div>
      )}

    </div>
  )
}
