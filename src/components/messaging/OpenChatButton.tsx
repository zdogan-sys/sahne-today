'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { useLocale } from 'next-intl'
import { MessageSquare, Loader2 } from 'lucide-react'
import { getOrCreateBandConversation, getOrCreateEventConversation } from '@/app/actions/messaging'

interface Props {
  type: 'band' | 'event'
  contextId: string
  label?: string
}

export function OpenChatButton({ type, contextId, label }: Props) {
  const locale = useLocale()
  const isEn = locale === 'en'
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function handleClick() {
    setError(null)
    startTransition(async () => {
      const result = type === 'band'
        ? await getOrCreateBandConversation(contextId)
        : await getOrCreateEventConversation(contextId)

      if ('error' in result) {
        if (result.error === 'premium_required') {
          router.push('/messages?premium=1')
        } else {
          setError(result.error)
        }
        return
      }
      router.push(`/messages/${result.id}`)
    })
  }

  return (
    <div>
      <button
        onClick={handleClick}
        disabled={isPending}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-accent/15 text-accent border border-accent/30 text-xs font-semibold hover:bg-accent/25 transition-colors disabled:opacity-60"
      >
        {isPending ? <Loader2 size={13} className="animate-spin" /> : <MessageSquare size={13} />}
        {label ?? (isEn
          ? (type === 'band' ? 'Group Chat' : 'Event Chat')
          : (type === 'band' ? 'Grup Sohbeti' : 'Etkinlik Sohbeti'))}
      </button>
      {error && <p className="text-red-400 text-xs mt-1">{error}</p>}
    </div>
  )
}
