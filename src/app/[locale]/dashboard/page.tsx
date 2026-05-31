export const dynamic = 'force-dynamic'

import { redirect } from 'next/navigation'
import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { VenueDashboard } from '@/components/dashboard/VenueDashboard'
import { ArtistDashboard } from '@/components/dashboard/ArtistDashboard'
import { AudienceDashboard } from '@/components/dashboard/AudienceDashboard'
import { UserProfileEditor } from '@/components/dashboard/UserProfileEditor'
import { FoundingMemberBadge } from '@/components/ui/FoundingMemberBadge'
import type { Profile } from '@/lib/supabase/types'

export const metadata: Metadata = {
  title: 'Kontrol Paneli',
}

export default async function DashboardPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth')

  const { data: profileData } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  if (!profileData) redirect('/auth')
  const profile = profileData as unknown as Profile

  // Check if they have artist or venue profiles
  const { data: artist } = await supabase
    .from('artists')
    .select('id')
    .eq('profile_id', user.id)
    .maybeSingle()

  const { data: venues } = await supabase
    .from('venues')
    .select('id')
    .eq('owner_id', user.id)

  const hasArtist = !!artist
  const hasVenues = venues && venues.length > 0

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 space-y-12">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="font-bebas text-4xl text-text-primary">HOŞ GELDİN, {profile.display_name.toUpperCase()}</h1>
            {profile.is_founding_member && <FoundingMemberBadge size="md" />}
          </div>
          <p className="text-text-muted text-sm">
            Tüm etkinlikleriniz ve profilleriniz burada.
          </p>
          <UserProfileEditor
            userId={user.id}
            initialData={{
              display_name: profile.display_name,
              email: user.email,
              city: (profile as any).city ?? null,
              bio: (profile as any).bio ?? null,
              avatar_url: profile.avatar_url ?? null,
              preferred_genres: (profile as any).preferred_genres ?? null,
            }}
          />
        </div>
      </div>

      {/* Dinleyici Paneli sadece sanatçı veya mekan profili yoksa görünür */}
      {(!hasArtist && !hasVenues) && (
        <section>
          <AudienceDashboard />
        </section>
      )}

      {/* Eğer sanatçı profili varsa Sanatçı Panelini göster */}
      {hasArtist && (
        <section className="pt-8 border-t border-[rgba(228,224,216,0.1)]">
          <ArtistDashboard userId={user.id} calendarToken={(profileData as any).calendar_token ?? null} />
        </section>
      )}

      {/* Eğer mekanları varsa Mekan Panelini göster */}
      {hasVenues && (
        <section className="pt-8 border-t border-[rgba(228,224,216,0.1)]">
          <VenueDashboard userId={user.id} calendarToken={(profileData as any).calendar_token ?? null} />
        </section>
      )}
    </div>
  )
}
