export const dynamic = 'force-dynamic'

import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { isAdminUser } from '@/lib/admin'
import { BandPhotoAlbum } from '@/components/bands/BandPhotoAlbum'

interface Props {
  params: Promise<{ id: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params
  const supabase = await createClient()
  const { data } = await supabase.from('bands').select('name').eq('id', id).single()
  return { title: data ? `${(data as any).name} · Fotoğraflar` : 'Fotoğraflar' }
}

export default async function BandPhotosPage({ params }: Props) {
  const { id } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  const { data: band } = await supabase
    .from('bands')
    .select('id, name, creator_id, photos')
    .eq('id', id)
    .single()

  if (!band) notFound()

  const b = band as any
  const isCreator = user?.id === b.creator_id || isAdminUser(user)

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 pb-24">
      <Link href={`/bands/${id}`} className="flex items-center gap-2 text-text-muted text-sm mb-6 hover:text-text-primary w-fit">
        <ArrowLeft size={16} />
        {b.name}
      </Link>

      <div className="flex items-center justify-between mb-5">
        <h1 className="font-bebas text-4xl text-text-primary">FOTOĞRAFLAR</h1>
        <span className="text-text-muted text-sm">{(b.photos ?? []).length} fotoğraf</span>
      </div>

      <BandPhotoAlbum
        bandId={b.id}
        initialPhotos={b.photos ?? []}
        isCreator={isCreator}
      />
    </div>
  )
}
