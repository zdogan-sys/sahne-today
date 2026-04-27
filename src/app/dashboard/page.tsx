export const dynamic = 'force-dynamic'

import { redirect } from 'next/navigation'
import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { VenueDashboard } from '@/components/dashboard/VenueDashboard'
import { ArtistDashboard } from '@/components/dashboard/ArtistDashboard'
import { AudienceDashboard } from '@/components/dashboard/AudienceDashboard'
import type { Profile } from '@/lib/supabase/types'

export const metadata: Metadata = {
  title: 'Kontrol Paneli',
}

export default async function DashboardPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth')

  const { data } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  if (!data) redirect('/auth')
  const profile = data as unknown as Profile

  return (
    <div className="max-w-5xl mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-bebas text-4xl text-text-primary">HOŞ GELDİN, {profile.display_name.toUpperCase()}</h1>
          <p className="text-text-muted text-sm">
            {profile.role === 'venue' ? 'Mekan Paneli' : profile.role === 'artist' ? 'Sanatçı Paneli' : 'Dinleyici Paneli'}
          </p>
        </div>
      </div>

      {profile.role === 'venue' && <VenueDashboard userId={user.id} />}
      {profile.role === 'artist' && <ArtistDashboard userId={user.id} />}
      {profile.role === 'audience' && <AudienceDashboard />}
    </div>
  )
}
