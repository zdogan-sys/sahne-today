export const dynamic = 'force-dynamic'

import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getMessagesForConversation } from '@/app/actions/messaging'
import { ChatWindow } from '@/components/messaging/ChatWindow'

interface Props {
  params: Promise<{ id: string }>
}

export default async function ConversationPage({ params }: Props) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth')

  const result = await getMessagesForConversation(id)
  if (!result) notFound()

  return (
    <ChatWindow
      conversationId={id}
      initialMessages={result.messages}
      currentUserId={result.currentUserId}
      currentUserName={result.currentUserName}
      contextName={result.conversation.contextName}
      contextHref={result.conversation.contextHref}
      isBlocked={result.conversation.is_blocked ?? false}
      blockedReason={result.conversation.blocked_reason ?? null}
      isAdmin={result.isAdmin}
    />
  )
}
