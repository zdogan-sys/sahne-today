'use server'

import { createClient } from '@/lib/supabase/server'

export async function toggleRSVP(eventId: string, status: 'going' | 'interested') {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Giriş yapmalısınız.' }

  const { data: existing } = await supabase
    .from('event_attendance' as any)
    .select('id, status')
    .eq('event_id', eventId)
    .eq('user_id', user.id)
    .single()

  if (existing) {
    if ((existing as any).status === status) {
      await supabase.from('event_attendance' as any).delete().eq('id', (existing as any).id)
      return { success: true, action: 'removed' as const }
    } else {
      await supabase.from('event_attendance' as any).update({ status } as any).eq('id', (existing as any).id)
      return { success: true, action: 'updated' as const, status }
    }
  } else {
    await supabase.from('event_attendance' as any).insert({ event_id: eventId, user_id: user.id, status } as any)
    return { success: true, action: 'added' as const, status }
  }
}
