export const dynamic = 'force-dynamic'

import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { VenuePhotoAlbum } from '@/components/venues/VenuePhotoAlbum'

interface Props {
  params: Promise<{ id: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params
  const supabase = await createClient()
  const { data } = await supabase.from('venues').select('name').eq('id', id).single()
  return { title: data ? `${(data as any).name} · Fotoğraflar` : 'Fotoğraflar' }
}

export default async function VenuePhotosPage({ params }: Props) {
  const { id } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  const { data: venue } = await supabase
    .from('venues')
    .select('id, name, owner_id, photos')
    .eq('id', id)
    .single()

  if (!venue) notFound()

  const v = venue as any
  const isOwner = user?.id === v.owner_id

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 pb-24">
      <Link href={`/venues/${id}`} className="flex items-center gap-2 text-text-muted text-sm mb-6 hover:text-text-primary w-fit">
        <ArrowLeft size={16} />
        {v.name}
      </Link>

      <div className="flex items-center justify-between mb-5">
        <h1 className="font-bebas text-4xl text-text-primary">FOTOĞRAFLAR</h1>
        <span className="text-text-muted text-sm">{(v.photos ?? []).length} fotoğraf</span>
      </div>

      <VenuePhotoAlbum venueId={v.id} initialPhotos={v.photos ?? []} isOwner={isOwner} />
    </div>
  )
}
