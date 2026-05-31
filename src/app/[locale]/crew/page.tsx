export const dynamic = 'force-dynamic'

import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { CrewClient } from '@/components/crew/CrewClient'
import { ErrorBoundary } from '@/components/ui/ErrorBoundary'
import { getTranslations } from 'next-intl/server'

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('crew')
  return { title: t('title') }
}

export default async function CrewPage() {
  const t = await getTranslations('crew')
  const supabase = await createClient()

  const { data: listings } = await supabase
    .from('crew_listings')
    .select('*, profiles(display_name, city)')
    .eq('status', 'open')
    .order('created_at', { ascending: false })
    .limit(40)

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 pb-24">
      <h1 className="font-bebas text-5xl md:text-6xl text-text-primary mb-2">{t('title').toUpperCase()}</h1>
      <p className="text-text-muted text-sm mb-6">{t('lookingForBand')}</p>
      <ErrorBoundary>
        <CrewClient initialListings={(listings ?? []) as any[]} />
      </ErrorBoundary>
    </div>
  )
}
