export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import Image from 'next/image'
import { MapPin, Music, ArrowRight } from 'lucide-react'
import type { Metadata } from 'next'

export async function generateMetadata(): Promise<Metadata> {
  return { title: 'Stüdyolar' }
}

interface Props {
  searchParams: Promise<{ city?: string; type?: string }>
}

const SUBTYPE_LABELS: Record<string, string> = {
  studio: 'Müzik Stüdyosu',
  dance_studio: 'Dans Stüdyosu',
}

export default async function StudiosPage({ searchParams }: Props) {
  const sp = await searchParams
  const supabase = await createClient()

  let query = supabase
    .from('venues')
    .select('id, name, city, district, photo_url, description, equipment, venue_subtype')
    .in('venue_subtype', ['studio', 'dance_studio'])
    .eq('is_pro_venue', true)
    .order('created_at', { ascending: false })

  if (sp.city) query = query.eq('city', sp.city)
  if (sp.type) query = query.eq('venue_subtype', sp.type)

  const { data: studios } = await query

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="font-bebas text-5xl text-text-primary">STÜDYOLAR</h1>
        <p className="text-text-muted text-sm mt-1">Prova ve kayıt stüdyoları</p>
      </div>

      {/* Filtreler */}
      <div className="flex flex-wrap gap-2 mb-6">
        <Link
          href="/studios"
          className={`chip border text-xs transition-colors ${!sp.type ? 'bg-accent/10 text-accent border-accent/30' : 'text-text-muted border-[rgba(228,224,216,0.1)] hover:text-text-primary'}`}
        >
          Tümü
        </Link>
        <Link
          href="/studios?type=studio"
          className={`chip border text-xs transition-colors ${sp.type === 'studio' ? 'bg-accent/10 text-accent border-accent/30' : 'text-text-muted border-[rgba(228,224,216,0.1)] hover:text-text-primary'}`}
        >
          Müzik Stüdyosu
        </Link>
        <Link
          href="/studios?type=dance_studio"
          className={`chip border text-xs transition-colors ${sp.type === 'dance_studio' ? 'bg-accent/10 text-accent border-accent/30' : 'text-text-muted border-[rgba(228,224,216,0.1)] hover:text-text-primary'}`}
        >
          Dans Stüdyosu
        </Link>
      </div>

      {(!studios || studios.length === 0) ? (
        <div className="text-center py-16">
          <Music size={40} className="text-text-muted mx-auto mb-4 opacity-40" />
          <p className="text-text-muted">Henüz stüdyo bulunamadı.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {(studios ?? []).map((studio: any) => (
            <Link
              key={studio.id}
              href={`/studios/${studio.id}`}
              className="card overflow-hidden hover:border-accent/30 transition-colors flex flex-col"
            >
              <div className="h-40 bg-accent/5 flex-shrink-0 relative">
                {studio.photo_url ? (
                  <Image src={studio.photo_url} alt={studio.name} fill className="object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Music size={32} className="text-accent/20" />
                  </div>
                )}
              </div>
              <div className="p-4 flex flex-col gap-2 flex-1">
                <div>
                  <h3 className="font-semibold text-text-primary">{studio.name}</h3>
                  <div className="flex items-center gap-1 text-text-muted text-xs mt-0.5">
                    <MapPin size={11} />
                    <span>{studio.district ? `${studio.district}, ` : ''}{studio.city}</span>
                  </div>
                </div>

                {studio.venue_subtype && (
                  <span className="chip bg-accent/10 text-accent border border-accent/20 text-[10px] w-fit">
                    {SUBTYPE_LABELS[studio.venue_subtype] ?? studio.venue_subtype}
                  </span>
                )}

                {studio.equipment && studio.equipment.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {studio.equipment.slice(0, 3).map((eq: string) => (
                      <span key={eq} className="chip bg-[rgba(228,224,216,0.06)] text-text-muted border border-[rgba(228,224,216,0.1)] text-[10px]">{eq}</span>
                    ))}
                    {studio.equipment.length > 3 && (
                      <span className="text-text-muted text-[10px]">+{studio.equipment.length - 3}</span>
                    )}
                  </div>
                )}

                <div className="mt-auto pt-2 border-t border-[rgba(228,224,216,0.08)] flex items-center justify-between">
                  <span className="text-text-muted text-xs">Rezervasyon için tıkla</span>
                  <ArrowRight size={14} className="text-accent" />
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
