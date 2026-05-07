'use client'

import { useState, useRef, useEffect } from 'react'
import { CalendarPlus, ChevronDown } from 'lucide-react'

export function BandCalendarSubscribe({ bandId, bandName }: { bandId: string; bandName: string }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  const origin = typeof window !== 'undefined' ? window.location.origin : 'https://sahne.today'
  const feedUrl = `${origin}/api/bands/${bandId}/ics`
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
        className="card w-full p-4 flex items-center justify-between hover:border-accent/30 transition-colors"
      >
        <div className="flex items-center gap-3">
          <CalendarPlus size={18} className="text-text-muted" />
          <div className="text-left">
            <span className="text-text-primary text-sm font-medium">Etkinlikleri Takvime Ekle</span>
            <p className="text-text-muted text-xs mt-0.5">Google, Apple veya .ics olarak abone ol</p>
          </div>
        </div>
        <ChevronDown size={14} className={`text-text-muted transition-transform flex-shrink-0 ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute left-0 right-0 top-full mt-1 bg-surface border border-[rgba(228,224,216,0.12)] rounded-xl shadow-2xl z-50 overflow-hidden">
          <a
            href={webcalUrl}
            className="flex items-center gap-3 px-4 py-3 hover:bg-[rgba(228,224,216,0.04)] transition-colors"
            onClick={() => setOpen(false)}
          >
            <span className="text-xl leading-none">🍎</span>
            <div>
              <p className="text-sm text-text-primary font-medium">Apple Takvim</p>
              <p className="text-[10px] text-text-muted">Her 6 saatte otomatik güncellenir</p>
            </div>
          </a>
          <a
            href={`https://calendar.google.com/calendar/r?cid=${encodeURIComponent(webcalUrl)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 px-4 py-3 hover:bg-[rgba(228,224,216,0.04)] transition-colors border-t border-[rgba(228,224,216,0.06)]"
            onClick={() => setOpen(false)}
          >
            <span className="text-xl leading-none">📅</span>
            <div>
              <p className="text-sm text-text-primary font-medium">Google Takvim</p>
              <p className="text-[10px] text-text-muted">Her 6 saatte otomatik güncellenir</p>
            </div>
          </a>
          <a
            href={feedUrl}
            download={`${bandName}-takvim.ics`}
            className="flex items-center gap-3 px-4 py-3 hover:bg-[rgba(228,224,216,0.04)] transition-colors border-t border-[rgba(228,224,216,0.06)]"
            onClick={() => setOpen(false)}
          >
            <span className="text-xl leading-none">📥</span>
            <div>
              <p className="text-sm text-text-primary font-medium">.ics İndir</p>
              <p className="text-[10px] text-text-muted">Manuel ekleme için</p>
            </div>
          </a>
        </div>
      )}
    </div>
  )
}
