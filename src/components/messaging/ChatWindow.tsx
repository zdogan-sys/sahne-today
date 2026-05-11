'use client'

import { useState, useEffect, useRef, useTransition } from 'react'
import Image from 'next/image'
import { Send, ArrowLeft, ShieldAlert, Lock, Unlock, Trash2 } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { sendMessage, markConversationRead, adminBlockConversation, adminUnblockConversation, adminDeleteConversation } from '@/app/actions/messaging'

interface Message {
  id: string
  body: string
  created_at: string
  sender_id: string
  profiles: { display_name: string; avatar_url: string | null } | null
}

interface Props {
  conversationId: string
  initialMessages: Message[]
  currentUserId: string
  currentUserName: string
  contextName: string
  contextHref: string
  isBlocked?: boolean
  blockedReason?: string | null
  isAdmin?: boolean
}

export function ChatWindow({
  conversationId,
  initialMessages,
  currentUserId,
  currentUserName,
  contextName,
  contextHref,
  isBlocked = false,
  blockedReason,
  isAdmin = false,
}: Props) {
  const [messages, setMessages] = useState<Message[]>(initialMessages)
  const [draft, setDraft] = useState('')
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [blocked, setBlocked] = useState(isBlocked)
  const [blockReason, setBlockReason] = useState('')
  const [adminActing, setAdminActing] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    markConversationRead(conversationId)

    const channel = supabase
      .channel(`conv-${conversationId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages', filter: `conversation_id=eq.${conversationId}` },
        (payload) => {
          const msg = payload.new as Message
          setMessages(prev => {
            if (prev.some(m => m.id === msg.id)) return prev
            if (msg.sender_id === currentUserId) {
              const senderName = isAdmin ? 'Admin' : currentUserName
              return [...prev, { ...msg, profiles: { display_name: senderName, avatar_url: null } }]
            }
            supabase
              .from('profiles')
              .select('display_name, avatar_url')
              .eq('id', msg.sender_id)
              .single()
              .then(({ data }) => {
                setMessages(prev2 => prev2.map(m =>
                  m.id === msg.id ? { ...m, profiles: data ?? null } : m
                ))
              })
            return [...prev, { ...msg, profiles: null }]
          })
          markConversationRead(conversationId)
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversationId])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  function handleSend() {
    const body = draft.trim()
    if (!body || isPending) return
    setDraft('')
    setError(null)
    startTransition(async () => {
      const result = await sendMessage(conversationId, body)
      if (!result.success) {
        setError(result.error ?? 'Mesaj gönderilemedi.')
        return
      }
      if (result.message) {
        const m = result.message
        const senderName = isAdmin ? 'Admin' : currentUserName
        setMessages(prev =>
          prev.some(x => x.id === m.id)
            ? prev
            : [...prev, { ...m, profiles: { display_name: senderName, avatar_url: null } }]
        )
      }
    })
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  // Group messages by date
  const grouped: { date: string; messages: Message[] }[] = []
  for (const msg of messages) {
    const date = new Date(msg.created_at).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' })
    const last = grouped[grouped.length - 1]
    if (last && last.date === date) last.messages.push(msg)
    else grouped.push({ date, messages: [msg] })
  }

  return (
    <div className="max-w-2xl mx-auto flex flex-col">

      {/* Header — sticky below TopNav */}
      <div className="sticky top-14 z-20 border-b border-[rgba(228,224,216,0.08)] bg-background/95 backdrop-blur-sm">
        <div className="flex items-center gap-3 px-4 py-3">
          <Link href="/messages" className="text-text-muted hover:text-text-primary">
            <ArrowLeft size={18} />
          </Link>
          <div className="flex-1 min-w-0">
            <p className="text-text-primary text-sm font-semibold truncate">{contextName}</p>
            <Link href={contextHref} className="text-text-muted text-xs hover:text-accent transition-colors">
              Profil →
            </Link>
          </div>
          {isAdmin && (
            <div className="flex items-center gap-1.5 flex-shrink-0">
              {blocked ? (
                <button
                  onClick={async () => {
                    setAdminActing(true)
                    await adminUnblockConversation(conversationId)
                    setBlocked(false)
                    setAdminActing(false)
                  }}
                  disabled={adminActing}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium border border-green-500/30 text-green-400 bg-green-500/10 hover:bg-green-500/20 transition-colors disabled:opacity-40"
                >
                  <Unlock size={11} /> Kilidi Aç
                </button>
              ) : (
                <button
                  onClick={async () => {
                    setAdminActing(true)
                    await adminBlockConversation(conversationId, blockReason)
                    setBlocked(true)
                    setBlockReason('')
                    setAdminActing(false)
                  }}
                  disabled={adminActing}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium border border-orange-500/30 text-orange-400 bg-orange-500/10 hover:bg-orange-500/20 transition-colors disabled:opacity-40"
                >
                  <Lock size={11} /> Kilitle
                </button>
              )}
              <button
                onClick={async () => {
                  if (!confirm(`"${contextName}" sohbetini ve tüm mesajlarını silmek istediğinizden emin misiniz?`)) return
                  setAdminActing(true)
                  await adminDeleteConversation(conversationId)
                  router.push('/messages')
                }}
                disabled={adminActing}
                className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium border border-red-500/30 text-red-400 bg-red-500/10 hover:bg-red-500/20 transition-colors disabled:opacity-40"
              >
                <Trash2 size={11} /> Sil
              </button>
            </div>
          )}
        </div>
        {isAdmin && !blocked && (
          <div className="px-4 pb-2">
            <input
              type="text"
              value={blockReason}
              onChange={e => setBlockReason(e.target.value)}
              placeholder="Kilitleme nedeni (isteğe bağlı)"
              className="w-full bg-surface border border-[rgba(228,224,216,0.1)] rounded-lg px-3 py-1.5 text-xs text-text-primary placeholder:text-text-muted focus:outline-none focus:border-orange-500/30"
            />
          </div>
        )}
      </div>

      {/* Messages — natural height, window scrolls */}
      <div className="px-4 pt-4 pb-4 space-y-4 min-h-[40vh]">
        {messages.length === 0 && (
          <p className="text-center text-text-muted text-sm py-8">
            Henüz mesaj yok. İlk mesajı sen gönder!
          </p>
        )}
        {grouped.map((group) => (
          <div key={group.date}>
            <div className="flex items-center gap-3 my-4">
              <div className="flex-1 h-px bg-[rgba(228,224,216,0.08)]" />
              <span className="text-[10px] text-text-muted">{group.date}</span>
              <div className="flex-1 h-px bg-[rgba(228,224,216,0.08)]" />
            </div>
            {group.messages.map((msg, i) => {
              const isMine = msg.sender_id === currentUserId
              const name = msg.profiles?.display_name ?? (isMine ? currentUserName : null) ?? null
              const initials = name?.split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase() ?? '?'
              return (
                <div key={msg.id} className={`flex gap-2 ${isMine ? 'flex-row-reverse' : 'flex-row'} items-end mb-1`}>
                  {!isMine && (
                    <div className="w-7 h-7 rounded-full overflow-hidden bg-accent/10 flex items-center justify-center text-accent text-[10px] font-bold flex-shrink-0 self-start mt-4">
                      {msg.profiles?.avatar_url
                        ? <Image src={msg.profiles.avatar_url} alt="" width={28} height={28} className="object-cover w-full h-full" />
                        : initials}
                    </div>
                  )}
                  <div className={`max-w-[75%] ${isMine ? 'items-end' : 'items-start'} flex flex-col`}>
                    <div className={`px-3 py-2 rounded-2xl text-sm leading-relaxed ${
                      isMine
                        ? 'bg-accent text-white rounded-br-sm'
                        : 'bg-surface text-text-primary rounded-bl-sm'
                    }`}>
                      <p className={`text-[11px] font-semibold mb-1 ${isMine ? 'text-white/70' : 'text-accent'}`}>
                        {name ?? '…'}
                      </p>
                      {msg.body}
                    </div>
                    <span className="text-[9px] text-text-muted mt-0.5 mx-1">
                      {new Date(msg.created_at).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Input — sticky above MobileNav */}
      <div className="sticky bottom-14 md:bottom-0 z-20 border-t border-[rgba(228,224,216,0.08)] p-3 bg-background">
        {blocked && !isAdmin ? (
          <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-red-500/10 border border-red-500/20">
            <ShieldAlert size={15} className="text-red-400 flex-shrink-0" />
            <p className="text-red-400 text-xs leading-snug">
              {blockedReason ?? 'Bu sohbet yönetici tarafından kilitlenmiştir.'}
            </p>
          </div>
        ) : (
          <>
            {blocked && isAdmin && (
              <div className="flex items-center gap-1.5 mb-2 px-1">
                <ShieldAlert size={12} className="text-orange-400" />
                <p className="text-orange-400 text-xs">Kilitli sohbet — admin olarak mesaj gönderiyorsunuz</p>
              </div>
            )}
            {error && <p className="text-red-400 text-xs mb-2 px-1">{error}</p>}
            <div className="flex items-end gap-2">
              <textarea
                value={draft}
                onChange={e => setDraft(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Mesaj yaz… (Enter ile gönder)"
                rows={1}
                className="flex-1 resize-none bg-surface border border-[rgba(228,224,216,0.12)] rounded-xl px-3 py-2.5 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent/40 transition-colors max-h-32"
                style={{ scrollbarWidth: 'none' }}
              />
              <button
                onClick={handleSend}
                disabled={!draft.trim() || isPending}
                className="w-10 h-10 flex-shrink-0 flex items-center justify-center rounded-xl bg-accent text-white disabled:opacity-40 hover:bg-accent/90 transition-colors"
              >
                <Send size={16} />
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
