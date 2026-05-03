export const dynamic = 'force-dynamic'

import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { EventModal } from '@/components/events/EventModal'

interface Props {
  params: Promise<{ id: string }>
}

export default async function EventModalPage({ params }: Props) {
  const { id } = await params
  const supabase = await createClient()

  const { data } = await supabase
    .from('events')
    .select(`
      *,
      venues(id, name, city, district),
      artists(id, stage_name, instruments, genres, profiles(avatar_url)),
      bands(id, name, photo_url, genres)
    `)
    .eq('id', id)
    .single()

  if (!data) notFound()

  return <EventModal event={data as any} />
}
