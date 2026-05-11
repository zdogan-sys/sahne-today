'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { isAdminUser } from '@/lib/admin'

async function isMessagingPremiumGated(): Promise<boolean> {
  const admin = createAdminClient()
  const { data } = await admin
    .from('feature_flags')
    .select('enabled')
    .eq('key', 'messaging_premium_required')
    .single()
  return (data as any)?.enabled ?? false
}

async function checkUserCanMessage(userId: string): Promise<boolean> {
  const gated = await isMessagingPremiumGated()
  if (!gated) return true
  const admin = createAdminClient()
  const { data } = await admin.from('profiles').select('is_premium').eq('id', userId).single()
  return (data as any)?.is_premium ?? false
}

// Gelecekteki DM özelliği için premium kapısı — grup/etkinlik sohbetleri her zaman açık
export async function getMessagingStatus(): Promise<{ available: boolean; premiumRequired: boolean }> {
  return { available: true, premiumRequired: false }
}

export async function getOrCreateBandConversation(bandId: string): Promise<{ id: string } | { error: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Oturum açmanız gerekiyor.' }

  const admin = createAdminClient()

  // Site admini her sohbete erişebilir
  if (!isAdminUser(user)) {
    // Grup kurucusu doğrudan erişebilir
    const { data: band } = await admin
      .from('bands').select('creator_id').eq('id', bandId).single()
    const isCreator = (band as any)?.creator_id === user.id

    if (!isCreator) {
      // Kabul edilmiş üye kontrolü
      const { data: artist } = await supabase
        .from('artists').select('id').eq('profile_id', user.id).single()
      if (!artist) return { error: 'Bu gruba erişim yetkiniz yok.' }

      const { data: membership } = await supabase
        .from('band_members')
        .select('id')
        .eq('band_id', bandId)
        .eq('artist_id', (artist as any).id)
        .eq('status', 'accepted')
        .single()
      if (!membership) return { error: 'Bu grubun kabul edilmiş üyesi değilsiniz.' }
    }
  }

  const { data: existing } = await admin
    .from('conversations').select('id').eq('type', 'band').eq('context_id', bandId).single()
  if (existing) return { id: (existing as any).id }

  const { data: created, error } = await admin
    .from('conversations')
    .insert({ type: 'band', context_id: bandId })
    .select('id').single()
  if (error) return { error: error.message }
  return { id: (created as any).id }
}

export async function getOrCreateEventConversation(eventId: string): Promise<{ id: string } | { error: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Oturum açmanız gerekiyor.' }

  const { data: eventData } = await supabase
    .from('events')
    .select('id, venues(owner_id)')
    .eq('id', eventId)
    .single()

  // Site admini her etkinlik sohbetine katılabilir
  if (!isAdminUser(user)) {
    const venueOwnerId = (eventData as any)?.venues?.owner_id
    let isParticipant = venueOwnerId === user.id

    if (!isParticipant) {
      const { data: artist } = await supabase
        .from('artists').select('id').eq('profile_id', user.id).single()
      if (artist) {
        const artistId = (artist as any).id
        const { data: directPerf } = await supabase
          .from('event_performers').select('id').eq('event_id', eventId).eq('artist_id', artistId).single()
        if (directPerf) isParticipant = true

        if (!isParticipant) {
          const { data: myBands } = await supabase
            .from('band_members').select('band_id').eq('artist_id', artistId).eq('status', 'accepted')
          if (myBands && myBands.length > 0) {
            const bandIds = myBands.map((b: any) => b.band_id)
            const { data: bandPerf } = await supabase
              .from('event_performers').select('id').eq('event_id', eventId).in('band_id', bandIds).limit(1)
            if (bandPerf && bandPerf.length > 0) isParticipant = true
          }
        }
      }
    }

    if (!isParticipant) return { error: 'Bu etkinliğin katılımcısı değilsiniz.' }
  }

  const admin = createAdminClient()
  const { data: existing } = await admin
    .from('conversations').select('id').eq('type', 'event').eq('context_id', eventId).single()
  if (existing) return { id: (existing as any).id }

  const { data: created, error } = await admin
    .from('conversations')
    .insert({ type: 'event', context_id: eventId })
    .select('id').single()
  if (error) return { error: error.message }
  return { id: (created as any).id }
}

export async function sendMessage(conversationId: string, body: string): Promise<{ success: boolean; error?: string; message?: { id: string; body: string; created_at: string; sender_id: string } }> {
  const trimmed = body.trim()
  if (!trimmed || trimmed.length > 2000) return { success: false, error: 'Geçersiz mesaj.' }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Oturum açmanız gerekiyor.' }

  const isAdmin = isAdminUser(user)
  const admin = createAdminClient()

  // Admin: servis rolü ile doğrula; normal kullanıcı: RLS ile doğrula
  const verifyClient = isAdmin ? admin : supabase
  const { data: conv } = await verifyClient
    .from('conversations').select('id, is_blocked').eq('id', conversationId).single()
  if (!conv) return { success: false, error: 'Konuşmaya erişim yetkiniz yok.' }
  if ((conv as any).is_blocked && !isAdmin) return { success: false, error: 'Bu sohbet yönetici tarafından kilitlenmiştir.' }

  const { data: inserted, error } = await admin.from('messages').insert({
    conversation_id: conversationId,
    sender_id: user.id,
    body: trimmed,
  }).select('id, body, created_at, sender_id').single()
  if (error) return { success: false, error: error.message }

  await admin
    .from('conversations')
    .update({ last_message_at: new Date().toISOString() })
    .eq('id', conversationId)

  // Gönderen adını bul, bildirim gönder (fire-and-forget)
  const getSenderName = async () => {
    if (isAdmin) return 'Admin'
    const { data: p } = await admin.from('profiles').select('display_name').eq('id', user.id).single()
    return (p as any)?.display_name ?? ''
  }
  getSenderName().then(name =>
    notifyParticipants(admin, conversationId, user.id, name, trimmed).catch(() => {})
  )

  return { success: true, message: inserted as any }
}

async function notifyParticipants(
  admin: ReturnType<typeof createAdminClient>,
  conversationId: string,
  senderId: string,
  senderNameOverride: string,
  messageBody: string,
) {
  const { data: conv } = await admin
    .from('conversations')
    .select('type, context_id')
    .eq('id', conversationId)
    .single()
  if (!conv) return

  const c = conv as any
  let contextName = ''
  let participantIds: string[] = []

  if (c.type === 'band') {
    const { data: band } = await admin.from('bands').select('name, creator_id').eq('id', c.context_id).single()
    contextName = (band as any)?.name ?? 'Grup Sohbeti'
    if ((band as any)?.creator_id) participantIds.push((band as any).creator_id)
    const { data: mems } = await admin
      .from('band_members')
      .select('artists(profile_id)')
      .eq('band_id', c.context_id)
      .eq('status', 'accepted')
    for (const m of mems ?? []) {
      const pid = (m as any).artists?.profile_id
      if (pid) participantIds.push(pid)
    }
  } else {
    const { data: ev } = await admin.from('events').select('title, venues(owner_id)').eq('id', c.context_id).single()
    contextName = (ev as any)?.title ?? 'Etkinlik Sohbeti'
    const ownerId = (ev as any)?.venues?.owner_id
    if (ownerId) participantIds.push(ownerId)
    const { data: perfs } = await admin
      .from('event_performers')
      .select('artists(profile_id), band_id')
      .eq('event_id', c.context_id)
    for (const p of perfs ?? []) {
      const pid = (p as any).artists?.profile_id
      if (pid) participantIds.push(pid)
      const bandId = (p as any).band_id
      if (bandId) {
        const { data: bMems } = await admin
          .from('band_members')
          .select('artists(profile_id)')
          .eq('band_id', bandId)
          .eq('status', 'accepted')
        for (const bm of bMems ?? []) {
          const bpid = (bm as any).artists?.profile_id
          if (bpid) participantIds.push(bpid)
        }
      }
    }
  }

  participantIds = Array.from(new Set(participantIds)).filter(id => id !== senderId)
  if (participantIds.length === 0) return

  const senderName = senderNameOverride

  const preview = messageBody.length > 60 ? messageBody.slice(0, 60) + '…' : messageBody
  const notifBody = senderName ? `${senderName}: ${preview}` : preview

  await admin.from('notifications').insert(
    participantIds.map(uid => ({
      user_id: uid,
      type: 'new_message',
      title: `Yeni mesaj — ${contextName}`,
      body: notifBody,
      link: `/messages/${conversationId}`,
    }))
  )
}

export async function markConversationRead(conversationId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return
  const admin = createAdminClient()
  await admin.from('conversation_reads').upsert(
    { conversation_id: conversationId, profile_id: user.id, last_read_at: new Date().toISOString() },
    { onConflict: 'conversation_id,profile_id' }
  )
}

export async function getConversations() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const admin = createAdminClient()

  const { data: artist } = await supabase.from('artists').select('id').eq('profile_id', user.id).single()
  const artistId: string | null = (artist as any)?.id ?? null

  let bandIds: string[] = []
  if (artistId) {
    const { data: mems } = await admin
      .from('band_members').select('band_id').eq('artist_id', artistId).eq('status', 'accepted')
    bandIds = (mems ?? []).map((m: any) => m.band_id)
  }

  let eventIds: string[] = []
  const { data: myVenues } = await admin.from('venues').select('id').eq('owner_id', user.id)
  const venueIds = (myVenues ?? []).map((v: any) => v.id)
  if (venueIds.length > 0) {
    const { data: vEvs } = await admin.from('events').select('id').in('venue_id', venueIds)
    eventIds.push(...(vEvs ?? []).map((e: any) => e.id))
  }
  if (artistId) {
    const { data: aPerf } = await admin.from('event_performers').select('event_id').eq('artist_id', artistId)
    eventIds.push(...(aPerf ?? []).map((e: any) => e.event_id))
    if (bandIds.length > 0) {
      const { data: bPerf } = await admin.from('event_performers').select('event_id').in('band_id', bandIds)
      eventIds.push(...(bPerf ?? []).map((e: any) => e.event_id))
    }
  }
  eventIds = Array.from(new Set(eventIds))

  const allConvs: any[] = []
  if (bandIds.length > 0) {
    const { data } = await admin.from('conversations').select('*').eq('type', 'band').in('context_id', bandIds)
    allConvs.push(...(data ?? []))
  }
  if (eventIds.length > 0) {
    const { data } = await admin.from('conversations').select('*').eq('type', 'event').in('context_id', eventIds)
    allConvs.push(...(data ?? []))
  }

  allConvs.sort((a, b) => new Date(b.last_message_at).getTime() - new Date(a.last_message_at).getTime())

  const enriched = await Promise.all(allConvs.map(async (conv) => {
    let contextName = ''
    if (conv.type === 'band') {
      const { data: b } = await admin.from('bands').select('name').eq('id', conv.context_id).single()
      contextName = (b as any)?.name ?? 'Grup'
    } else {
      const { data: e } = await admin.from('events').select('title').eq('id', conv.context_id).single()
      contextName = (e as any)?.title ?? 'Etkinlik'
    }

    const { data: lastMsg } = await admin
      .from('messages')
      .select('body, sender_id, profiles(display_name)')
      .eq('conversation_id', conv.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    const { data: readData } = await admin
      .from('conversation_reads')
      .select('last_read_at')
      .eq('conversation_id', conv.id)
      .eq('profile_id', user.id)
      .single()
    const lastReadAt = (readData as any)?.last_read_at ?? '1970-01-01'

    const { count: unreadCount } = await admin
      .from('messages')
      .select('id', { count: 'exact', head: true })
      .eq('conversation_id', conv.id)
      .gt('created_at', lastReadAt)
      .neq('sender_id', user.id)

    return { ...conv, contextName, lastMessage: lastMsg ?? null, unreadCount: unreadCount ?? 0 }
  }))

  return enriched
}

export async function getMessagesForConversation(conversationId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const admin = createAdminClient()
  const userIsAdmin = isAdminUser(user)

  // Admin: service role bypass; normal kullanıcı: RLS ile doğrula
  const verifyClient = userIsAdmin ? admin : supabase
  const { data: conv } = await verifyClient
    .from('conversations').select('id, type, context_id, is_blocked, blocked_reason').eq('id', conversationId).single()
  if (!conv) return null

  const { data: msgs } = await admin
    .from('messages')
    .select('id, body, created_at, sender_id')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true })
    .limit(200)

  const senderIds = Array.from(new Set([user.id, ...(msgs ?? []).map((m: any) => m.sender_id)]))
  const { data: profileRows } = await admin.from('profiles').select('id, display_name, avatar_url').in('id', senderIds)
  const profileMap = Object.fromEntries((profileRows ?? []).map((p: any) => [p.id, p]))
  const msgsWithProfiles = (msgs ?? []).map((m: any) => {
    const profile = profileMap[m.sender_id] ?? null
    if (userIsAdmin && m.sender_id === user.id && profile) {
      return { ...m, profiles: { ...profile, display_name: 'Admin' } }
    }
    return { ...m, profiles: profile }
  })
  const currentUserName: string = userIsAdmin ? 'Admin' : (profileMap[user.id]?.display_name ?? '')

  const c = conv as any
  let contextName = ''
  let contextHref = ''
  let isCreator = false
  if (c.type === 'band') {
    const { data: b } = await admin.from('bands').select('name, creator_id').eq('id', c.context_id).single()
    contextName = (b as any)?.name ?? 'Grup'
    contextHref = `/bands/${c.context_id}`
    isCreator = (b as any)?.creator_id === user.id
  } else {
    const { data: e } = await admin.from('events').select('title').eq('id', c.context_id).single()
    contextName = (e as any)?.title ?? 'Etkinlik'
    contextHref = `/events/${c.context_id}`
  }

  return {
    conversation: { ...c, contextName, contextHref },
    messages: msgsWithProfiles as any[],
    currentUserId: user.id,
    currentUserName,
    isAdmin: userIsAdmin,
    isCreator,
  }
}

export async function deleteMyConversation(conversationId: string): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Oturum açmanız gerekiyor.' }

  const admin = createAdminClient()
  const { data: conv } = await admin
    .from('conversations').select('type, context_id').eq('id', conversationId).single()
  if (!conv) return { success: false, error: 'Sohbet bulunamadı.' }

  if ((conv as any).type !== 'band') return { success: false, error: 'Yalnızca grup kurucuları silebilir.' }

  const { data: band } = await admin
    .from('bands').select('creator_id').eq('id', (conv as any).context_id).single()
  if ((band as any)?.creator_id !== user.id) return { success: false, error: 'Yalnızca grup kurucusu bu sohbeti silebilir.' }

  const { error } = await admin.from('conversations').delete().eq('id', conversationId)
  return { success: !error, error: error?.message }
}

// ── Admin actions ─────────────────────────────────────────────────────────────

export async function toggleFeatureFlag(key: string, enabled: boolean) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || !isAdminUser(user)) return { success: false }
  const admin = createAdminClient()
  const { error } = await admin
    .from('feature_flags')
    .upsert({ key, enabled }, { onConflict: 'key' })
  return { success: !error }
}

export async function toggleUserPremium(profileId: string, isPremium: boolean) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || !isAdminUser(user)) return { success: false }
  const admin = createAdminClient()
  const { error } = await admin.from('profiles').update({ is_premium: isPremium } as any).eq('id', profileId)
  return { success: !error }
}

// ── Admin: sohbet yönetimi ───────────────────────────────────────────────────

export async function adminListConversations() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || !isAdminUser(user)) return []

  const admin = createAdminClient()
  const { data: convs } = await admin
    .from('conversations')
    .select('id, type, context_id, is_blocked, blocked_reason, created_at, last_message_at')
    .order('last_message_at', { ascending: false })
    .limit(100)

  if (!convs || convs.length === 0) return []

  return await Promise.all((convs as any[]).map(async (conv) => {
    let contextName = ''
    if (conv.type === 'band') {
      const { data: b } = await admin.from('bands').select('name').eq('id', conv.context_id).single()
      contextName = (b as any)?.name ?? 'Grup'
    } else {
      const { data: e } = await admin.from('events').select('title').eq('id', conv.context_id).single()
      contextName = (e as any)?.title ?? 'Etkinlik'
    }
    const { count: msgCount } = await admin
      .from('messages').select('id', { count: 'exact', head: true }).eq('conversation_id', conv.id)
    return { ...conv, contextName, msgCount: msgCount ?? 0 }
  }))
}

export async function adminBlockConversation(conversationId: string, reason: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || !isAdminUser(user)) return { success: false }
  const admin = createAdminClient()
  const { error } = await admin
    .from('conversations')
    .update({ is_blocked: true, blocked_reason: reason || 'Yönetici kararıyla kilitlendi.' })
    .eq('id', conversationId)
  return { success: !error }
}

export async function adminUnblockConversation(conversationId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || !isAdminUser(user)) return { success: false }
  const admin = createAdminClient()
  const { error } = await admin
    .from('conversations')
    .update({ is_blocked: false, blocked_reason: null })
    .eq('id', conversationId)
  return { success: !error }
}

export async function adminDeleteConversation(conversationId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || !isAdminUser(user)) return { success: false }
  const admin = createAdminClient()
  const { error } = await admin.from('conversations').delete().eq('id', conversationId)
  return { success: !error }
}

export async function toggleFoundingMember(profileId: string, isFoundingMember: boolean) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || !isAdminUser(user)) return { success: false }
  const admin = createAdminClient()
  // Trigger handles is_premium=true when is_founding_member is set
  const updatePayload: any = { is_founding_member: isFoundingMember }
  if (isFoundingMember) updatePayload.is_premium = true
  const { error } = await admin.from('profiles').update(updatePayload).eq('id', profileId)
  return { success: !error }
}
