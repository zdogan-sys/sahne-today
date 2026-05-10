'use client'

import { useState, useRef, useEffect } from 'react'
import { CalendarPlus, ChevronDown } from 'lucide-react'

interface Props {
  token: string
  type: 'artist' | 'venue'
}

export function CalendarSubscribe({ token, type }: Props) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  const feedUrl = `${typeof window !== 'undefined' ? window.location.origin : 'https://sahne.today'}/api/feed/${type}/${token}/ics`
  const webcalUrl = feedUrl.replace(/^https?:/, 'webcal:')

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-accent/15 text-accent border border-accent/30 text-xs font-semibold hover:bg-accent/25 transition-colors"
      >
        <CalendarPlus size={15} />
        Takvime Abone Ol
        <ChevronDown size={13} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute left-0 top-full mt-2 w-64 bg-surface border border-[rgba(228,224,216,0.12)] rounded-xl shadow-2xl z-50 overflow-hidden">
          <p className="px-4 pt-3 pb-1 text-[10px] text-text-muted uppercase tracking-wider">Otomatik Senkronizasyon</p>

          <a
            href={webcalUrl}
            className="flex items-center gap-3 px-4 py-3 hover:bg-[rgba(228,224,216,0.04)] transition-colors"
            onClick={() => setOpen(false)}
          >
            <span className="text-2xl leading-none">🍎</span>
            <div>
              <p className="text-sm text-text-primary font-medium">Apple Takvim</p>
              <p className="text-[10px] text-text-muted">Her 6 saatte otomatik güncellenir</p>
            </div>
          </a>

          <a
            href={`https://calendar.google.com/calendar/r?cid=${encodeURIComponent(webcalUrl)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 px-4 py-3 hover:bg-[rgba(228,224,216,0.04)] transition-colors"
            onClick={() => setOpen(false)}
          >
            <span className="text-2xl leading-none">📅</span>
            <div>
              <p className="text-sm text-text-primary font-medium">Google Takvim</p>
              <p className="text-[10px] text-text-muted">Her 6 saatte otomatik güncellenir</p>
            </div>
          </a>

          <div className="border-t border-[rgba(228,224,216,0.08)] px-4 pt-2 pb-3">
            <p className="text-[10px] text-text-muted mb-2">Manuel indirme</p>
            <a
              href={feedUrl}
              download="sahne-takvim.ics"
              className="text-xs text-accent hover:underline"
              onClick={() => setOpen(false)}
            >
              .ics dosyası indir →
            </a>
          </div>
        </div>
      )}
    </div>
  )
}
