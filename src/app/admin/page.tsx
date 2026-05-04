export const dynamic = 'force-dynamic'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { isAdminUser } from '@/lib/admin'
import { AdminPanel } from '@/components/admin/AdminPanel'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { getListConfigs } from '@/app/actions/site'

async function getAdminData() {
  const admin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  try {
    const [eventsRes, artistsRes, venuesRes, membersRes] = await Promise.all([
      admin.from('events')
        .select('id, title, event_date, start_time, status, genre, entry_type, entry_fee, venue_id, venue_name, artist_id, band_id, venues(name), artists(stage_name), bands(name)')
        .order('event_date', { ascending: false })
        .limit(50),
      admin.from('artists')
        .select('id, stage_name, city, genres, instruments, bio, is_hidden, created_at, profiles(display_name, avatar_url)')
        .order('created_at', { ascending: false })
        .limit(50),
      admin.from('venues')
        .select('id, name, city, district, venue_type, phone, email, description, verified, created_at')
        .order('created_at', { ascending: false })
        .limit(50),
      admin.from('profiles')
        .select('id, display_name, city, role, created_at')
        .order('created_at', { ascending: false })
        .limit(50),
    ])

    return {
      events: eventsRes.data ?? [],
      artists: artistsRes.data ?? [],
      venues: venuesRes.data ?? [],
      members: membersRes.data ?? [],
    }
  } catch {
    return { events: [], artists: [], venues: [], members: [] }
  }
}

export default async function AdminPage() {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()

  if (error || !isAdminUser(user)) redirect('/')

  const [data, listConfigs] = await Promise.all([getAdminData(), getListConfigs()])

  return (
    <div className="max-w-6xl mx-auto px-4 py-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-2 h-6 bg-accent rounded-full" />
        <h1 className="font-bebas text-4xl text-text-primary">Admin Paneli</h1>
      </div>
      <AdminPanel {...data} listConfigs={listConfigs} />
    </div>
  )
}
