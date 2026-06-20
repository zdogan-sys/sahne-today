import type { SupabaseClient } from '@supabase/supabase-js'

export async function canManageVenue(
  supabase: SupabaseClient,
  venueId: string,
  userId: string
): Promise<boolean> {
  const { data } = await supabase
    .from('venue_members')
    .select('id')
    .eq('venue_id', venueId)
    .eq('user_id', userId)
    .maybeSingle()
  return !!data
}

export async function getVenueMemberRole(
  supabase: SupabaseClient,
  venueId: string,
  userId: string
): Promise<'owner' | 'manager' | null> {
  const { data } = await supabase
    .from('venue_members')
    .select('role')
    .eq('venue_id', venueId)
    .eq('user_id', userId)
    .maybeSingle()
  return (data?.role as 'owner' | 'manager') ?? null
}

export async function getMyVenueIds(
  supabase: SupabaseClient,
  userId: string
): Promise<string[]> {
  const { data } = await supabase
    .from('venue_members')
    .select('venue_id')
    .eq('user_id', userId)
  return data?.map((d: any) => d.venue_id) ?? []
}
