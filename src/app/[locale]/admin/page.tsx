export const dynamic = 'force-dynamic'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { isAdminUser } from '@/lib/admin'
import { AdminPanel } from '@/components/admin/AdminPanel'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { getListConfigs } from '@/app/actions/site'
import { adminListConversations } from '@/app/actions/messaging'

async function getAdminData() {
  const admin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  try {
    const [eventsRes, artistsRes, venuesRes, membersRes, bandsRes, pendingEventsRes, featureFlagsRes] = await Promise.all([
      admin.from('events')
        .select('id, title, event_date, start_time, status, genre, entry_type, entry_fee, venue_id, venue_name, artist_id, band_id, venues(name), artists(stage_name), bands(name)')
        .order('event_date', { ascending: false })
        .limit(50),
      admin.from('artists')
        .select('id, stage_name, city, genres, instruments, bio, is_hidden, created_at, profile_id, profiles(display_name, avatar_url)')
        .order('created_at', { ascending: false })
        .limit(50),
      admin.from('venues')
        .select('id, name, city, district, venue_type, phone, email, description, verified, is_pro_venue, created_at')
        .order('created_at', { ascending: false })
        .limit(50),
      admin.from('profiles')
        .select('id, display_name, city, role, is_premium, is_founding_member, is_moderator, created_at')
        .order('created_at', { ascending: false })
        .limit(50),
      admin.from('bands')
        .select('id, name, city, genres, bio, created_at')
        .order('created_at', { ascending: false })
        .limit(50),
      admin.from('events')
        .select('id, title, event_date, start_time, status, venues(name, city), artists(stage_name), bands(name)')
        .in('status', ['pending', 'offered'])
        .order('event_date', { ascending: true }),
      admin.from('feature_flags').select('*'),
    ])

    return {
      events: eventsRes.data ?? [],
      artists: artistsRes.data ?? [],
      venues: venuesRes.data ?? [],
      members: membersRes.data ?? [],
      bands: bandsRes.data ?? [],
      pendingEvents: pendingEventsRes.data ?? [],
      featureFlags: featureFlagsRes.data ?? [],
    }
  } catch {
    return { events: [], artists: [], venues: [], members: [], bands: [], pendingEvents: [], featureFlags: [] }
  }
}

export default async function AdminPage() {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()

  if (error || !isAdminUser(user)) redirect('/')

  const [data, listConfigs, conversations] = await Promise.all([
    getAdminData(),
    getListConfigs(),
    adminListConversations(),
  ])

  return (
    <div className="max-w-6xl mx-auto px-4 py-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-2 h-6 bg-accent rounded-full" />
        <h1 className="font-bebas text-4xl text-text-primary">Admin Paneli</h1>
      </div>
      <AdminPanel {...data} listConfigs={listConfigs} featureFlags={data.featureFlags} conversations={conversations} />
    </div>
  )
}
