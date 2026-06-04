'use client'

import { useState } from 'react'
import { GraduationCap } from 'lucide-react'
import { cn } from '@/lib/utils'
import { DANCE_OPTIONS } from '@/lib/constants'

interface Props {
  artistId: string
  initialIsTeaching: boolean
  initialTeachingInstruments: string[]
  instruments: string[]
  isProIndividual: boolean
}

async function updateTeaching(artistId: string, patch: { is_teaching?: boolean; teaching_instruments?: string[] }) {
  const res = await fetch('/api/artist/set-teaching', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ artist_id: artistId, ...patch }),
  })
  return res.ok
}

export function TeachingToggle({
  artistId,
  initialIsTeaching,
  initialTeachingInstruments,
  instruments,
  isProIndividual,
}: Props) {
  const [isTeaching, setIsTeaching] = useState(initialIsTeaching)
  const [teachingInstruments, setTeachingInstruments] = useState<string[]>(initialTeachingInstruments)
  const [loading, setLoading] = useState(false)

  async function toggle() {
    setLoading(true)
    const next = !isTeaching
    const ok = await updateTeaching(artistId, { is_teaching: next })
    if (ok) setIsTeaching(next)
    setLoading(false)
  }

  async function toggleInstrument(instrument: string) {
    const next = teachingInstruments.includes(instrument)
      ? teachingInstruments.filter((i) => i !== instrument)
      : [...teachingInstruments, instrument]
    setTeachingInstruments(next)
    await updateTeaching(artistId, { teaching_instruments: next })
  }

  if (!isProIndividual) return null

  return (
    <div className="flex flex-col gap-2">
      <button
        onClick={toggle}
        disabled={loading}
        className={cn(
          'flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-md border transition-colors disabled:opacity-60',
          isTeaching
            ? 'bg-[#d4a820]/10 text-[#d4a820] border-[#d4a820]/30'
            : 'bg-transparent text-text-muted border-[rgba(228,224,216,0.12)] hover:text-text-primary'
        )}
      >
        <GraduationCap size={11} />
        {isTeaching ? 'Kurs veriyorum · Aktif' : 'Kurs veriyorum'}
      </button>

      {isTeaching && (() => {
        // Sanatçının enstrümanları + dans stilleri (dans hocaları için) + seçili olanlar
        const options = Array.from(new Set([...instruments, ...DANCE_OPTIONS, ...teachingInstruments]))
        return (
          <div className="flex flex-wrap gap-1.5 pl-0.5">
            {options.map((opt) => (
              <button
                key={opt}
                onClick={() => toggleInstrument(opt)}
                className={cn(
                  'text-[10px] px-2 py-1 rounded border transition-colors',
                  teachingInstruments.includes(opt)
                    ? 'bg-[#d4a820]/10 text-[#d4a820] border-[#d4a820]/30'
                    : 'text-text-muted border-[rgba(228,224,216,0.1)] hover:text-text-primary'
                )}
              >
                {opt}
              </button>
            ))}
          </div>
        )
      })()}
    </div>
  )
}
