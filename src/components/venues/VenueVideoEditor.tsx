'use client'

import { useState } from 'react'
import { Plus, X } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { VideoEmbed } from '@/components/artists/VideoEmbed'

interface Props {
  venueId: string
  initialUrls: string[]
  readOnly?: boolean
}

export function VenueVideoEditor({ venueId, initialUrls, readOnly = false }: Props) {
  const [urls, setUrls] = useState<string[]>(initialUrls)
  const [input, setInput] = useState('')
  const supabase = createClient()

  async function save(next: string[]) {
    await supabase.from('venues').update({ video_urls: next } as any).eq('id', venueId)
  }

  async function add() {
    const val = input.trim()
    if (!val || urls.includes(val)) return
    const next = [...urls, val]
    setUrls(next)
    setInput('')
    await save(next)
  }

  async function remove(url: string) {
    const next = urls.filter((u) => u !== url)
    setUrls(next)
    await save(next)
  }

  if (readOnly) {
    if (urls.length === 0) return null
    return (
      <div>
        <h2 className="font-bebas text-2xl text-text-primary mb-3">VİDEOLAR</h2>
        <div className="space-y-3">
          {urls.map((url, i) => <VideoEmbed key={i} url={url} />)}
        </div>
      </div>
    )
  }

  return (
    <div>
      <h2 className="font-bebas text-2xl text-text-primary mb-3">VİDEOLAR <span className="text-base font-sans font-normal text-text-muted normal-case">(YouTube / Vimeo)</span></h2>

      {urls.length > 0 && (
        <div className="space-y-3 mb-3">
          {urls.map((url, i) => (
            <div key={i} className="relative">
              <VideoEmbed url={url} />
              <button type="button" onClick={() => remove(url)}
                className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/60 flex items-center justify-center text-white hover:bg-red-500/80 transition-colors">
                <X size={13} />
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="flex gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), add())}
          placeholder="https://youtube.com/watch?v=..."
          className="input-field flex-1 text-sm"
        />
        <button type="button" onClick={add} disabled={!input.trim()}
          className="btn-outline px-3 disabled:opacity-40 flex items-center gap-1">
          <Plus size={14} />
          Ekle
        </button>
      </div>
    </div>
  )
}
