'use client'

import { useState } from 'react'
import { GraduationCap } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'

interface Props {
  artistId: string
  initialIsTeaching: boolean
  initialTeachingInstruments: string[]
  instruments: string[]
  isProIndividual: boolean
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
  const supabase = createClient()

  async function toggle() {
    setLoading(true)
    const next = !isTeaching
    const { error } = await supabase
      .from('artists')
      .update({ is_teaching: next } as any)
      .eq('id', artistId)
    if (!error) setIsTeaching(next)
    setLoading(false)
  }

  async function toggleInstrument(instrument: string) {
    const next = teachingInstruments.includes(instrument)
      ? teachingInstruments.filter((i) => i !== instrument)
      : [...teachingInstruments, instrument]
    setTeachingInstruments(next)
    await supabase
      .from('artists')
      .update({ teaching_instruments: next } as any)
      .eq('id', artistId)
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

      {isTeaching && instruments.length > 0 && (
        <div className="flex flex-wrap gap-1.5 pl-0.5">
          {instruments.map((instrument) => (
            <button
              key={instrument}
              onClick={() => toggleInstrument(instrument)}
              className={cn(
                'text-[10px] px-2 py-1 rounded border transition-colors',
                teachingInstruments.includes(instrument)
                  ? 'bg-[#d4a820]/10 text-[#d4a820] border-[#d4a820]/30'
                  : 'text-text-muted border-[rgba(228,224,216,0.1)] hover:text-text-primary'
              )}
            >
              {instrument}
            </button>
          ))}
          {instruments.length === 0 && (
            <p className="text-text-muted text-[10px]">
              Önce profiline enstrüman ekle.
            </p>
          )}
        </div>
      )}
    </div>
  )
}
