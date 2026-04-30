'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { Users, Search, UserPlus } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'

export function HiringBandsSearch() {
  const [bands, setBands] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')
  const supabase = createClient()

  useEffect(() => {
    async function load() {
      setLoading(true)
      let q = supabase
        .from('bands')
        .select('id, name, city, photo_url, looking_for')
        .not('looking_for', 'is', null)
        .neq('looking_for', '{}')
        .limit(10)

      if (query.trim().length >= 2) {
        q = q.ilike('name', `%${query.trim()}%`)
      }

      const { data } = await q
      setBands((data as any[]) ?? [])
      setLoading(false)
    }

    const timer = setTimeout(load, 300)
    return () => clearTimeout(timer)
  }, [query, supabase])

  return (
    <div className="card p-4 mb-4 space-y-3 bg-[rgba(228,224,216,0.02)]">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-medium text-text-primary">Eleman Arayan Gruplar</h3>
        <Link href="/bands" className="text-xs text-accent hover:underline">Tümünü gör →</Link>
      </div>
      
      <div className="relative">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Grup adı ara..."
          className="input-field pl-8 text-sm"
        />
      </div>

      {loading ? (
        <p className="text-xs text-text-muted text-center py-4">Aranıyor...</p>
      ) : bands.length === 0 ? (
        <p className="text-xs text-text-muted text-center py-4">Eleman arayan grup bulunamadı.</p>
      ) : (
        <div className="space-y-2 mt-2 max-h-60 overflow-y-auto pr-1">
          {bands.map((band) => (
            <Link
              key={band.id}
              href={`/bands/${band.id}`}
              className="flex items-center gap-3 p-2.5 bg-[rgba(228,224,216,0.04)] rounded-lg hover:bg-[rgba(228,224,216,0.08)] transition-colors"
            >
              <div className="w-10 h-10 rounded-lg overflow-hidden bg-accent/10 flex items-center justify-center flex-shrink-0 text-accent font-bold">
                {band.photo_url ? (
                  <Image src={band.photo_url} alt={band.name} width={40} height={40} className="object-cover w-full h-full" />
                ) : band.name[0].toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-text-primary truncate">{band.name}</p>
                <p className="text-xs text-text-muted truncate">
                  {band.city ? `${band.city} · ` : ''}Arayış: {band.looking_for.join(', ')}
                </p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
