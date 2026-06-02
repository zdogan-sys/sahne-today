export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import Image from 'next/image'
import { MapPin, Music } from 'lucide-react'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Stüdyolar' }

const TYPE_LABELS: Record<string, string> = {
  studio: 'Prova / Kayıt',
  dance_studio: 'Dans Stüdyosu',
  music_school: 'Müzik Dersanesi',
}

interface Props {
  searchParams: Promise<{ type?: string; city?: string }>
}

export default async function StudiosPage({ searchParams }: Props) {
  const sp = await searchParams
  const supabase = await createClient()

  let query = supabase
    .from('venues')
    .select('id, name, city, district, photo_url, logo_url, venue_type, price_per_hour, equipment')
    .in('venue_type', ['studio', 'dance_studio', 'music_school'])
    .eq('is_hidden', false)
    .order('created_at', { ascending: false })

  if (sp.type) query = query.eq('venue_type', sp.type)
  if (sp.city) query = query.eq('city', sp.city)

  const { data: studios } = await query

  const types = ['studio', 'dance_studio', 'music_school']
  const cities = ['İstanbul', 'Ankara', 'İzmir', 'Bursa', 'Antalya']

  function buildUrl(params: Record<string, string | undefined>) {
    const p = new URLSearchParams()
    Object.entries(params).forEach(([k, v]) => { if (v) p.set(k, v) })
    const s = p.toString()
    return `/studios${s ? `?${s}` : ''}`
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <h1 className="font-bebas text-5xl text-text-primary mb-2">STÜDYOLAR</h1>
      <p className="text-text-muted text-sm mb-6">Prova, kayıt, dans ve müzik dersaneleri</p>

      {/* Filtreler */}
      <div className="space-y-3 mb-6">
        <div className="flex flex-wrap gap-2">
          <Link href="/studios" className={`chip border text-xs transition-colors ${!sp.type ? 'bg-accent/10 text-accent border-accent/30' : 'text-text-muted border-[rgba(228,224,216,0.1)] hover:text-text-primary'}`}>
            Tümü
          </Link>
          {types.map(t => (
            <Link key={t} href={buildUrl({ type: sp.type === t ? undefined : t, city: sp.city })}
              className={`chip border text-xs transition-colors ${sp.type === t ? 'bg-accent/10 text-accent border-accent/30' : 'text-text-muted border-[rgba(228,224,216,0.1)] hover:text-text-primary'}`}>
              {TYPE_LABELS[t]}
            </Link>
          ))}
        </div>
        <div className="flex flex-wrap gap-2">
          <span className="text-text-muted text-xs self-center mr-1">Şehir:</span>
          {cities.map(c => (
            <Link key={c} href={buildUrl({ type: sp.type, city: sp.city === c ? undefined : c })}
              className={`chip border text-xs transition-colors ${sp.city === c ? 'bg-accent/10 text-accent border-accent/30' : 'text-text-muted border-[rgba(228,224,216,0.1)] hover:text-text-primary'}`}>
              {c}
            </Link>
          ))}
        </div>
      </div>

      {(!studios || studios.length === 0) ? (
        <div className="text-center py-16 text-text-muted text-sm">Bu kriterlere uygun stüdyo bulunamadı.</div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {studios.map((s: any) => (
            <Link key={s.id} href={`/studios/${s.id}`} className="card overflow-hidden hover:border-accent/30 transition-colors block">
              <div className="relative h-36 bg-[rgba(228,224,216,0.04)]">
                {s.logo_url ? (
                  <div className="absolute inset-0 flex items-center justify-center p-4">
                    <Image src={s.logo_url} alt={s.name} fill className="object-contain" />
                  </div>
                ) : s.photo_url ? (
                  <Image src={s.photo_url} alt={s.name} fill className="object-cover" />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Music size={32} className="text-[rgba(228,224,216,0.12)]" />
                  </div>
                )}
                {s.price_per_hour && (
                  <div className="absolute bottom-2 right-2 bg-background/80 backdrop-blur-sm px-2 py-0.5 rounded text-accent font-bebas text-sm">
                    ₺{s.price_per_hour}/sa
                  </div>
                )}
              </div>
              <div className="p-3">
                <h3 className="font-semibold text-text-primary text-sm truncate">{s.name}</h3>
                <div className="flex items-center gap-1 mt-0.5 text-text-muted text-xs">
                  <MapPin size={10} />
                  <span className="truncate">{s.district ? `${s.district}, ` : ''}{s.city}</span>
                </div>
                <div className="mt-2">
                  <span className="chip bg-[rgba(228,224,216,0.06)] text-text-muted border border-[rgba(228,224,216,0.1)] text-[10px]">
                    {TYPE_LABELS[s.venue_type] ?? s.venue_type}
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
