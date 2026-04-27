export const dynamic = 'force-dynamic'

import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { BandsClient } from '@/components/bands/BandsClient'

export const metadata: Metadata = {
  title: 'Gruplar',
  description: 'Sahne.today\'deki müzik gruplarını keşfet.',
}

export default async function BandsPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  const artistRes = user
    ? await supabase.from('artists').select('id').eq('profile_id', user.id).single()
    : null
  const isArtist = !!artistRes?.data

  const { data } = await supabase
    .from('bands')
    .select('id, name, genres, city, bio, photo_url, looking_for, band_members(status)')
    .order('created_at', { ascending: false })
    .limit(60)

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 pb-24">
      <h1 className="font-bebas text-5xl md:text-6xl text-text-primary mb-2">GRUPLAR</h1>
      <p className="text-text-muted text-sm mb-6">Sahne.today'deki müzik gruplarını keşfet.</p>
      <BandsClient initialBands={(data ?? []) as any[]} isArtist={isArtist} />
    </div>
  )
}
