import Link from 'next/link'
import { getLocale } from 'next-intl/server'
import { createClient } from '@/lib/supabase/server'
import { FEE_MODEL_LABELS, formatTime } from '@/lib/utils'
import { MapPin, Clock, Mic2 } from 'lucide-react'

type SlotRow = {
  id: string
  day_of_week: number
  start_time: string
  end_time: string
  fee_model: string
  fee_value: number | null
  recurrence: string
  venues: { id: string; name: string; city: string | null; district: string | null } | null
}

const DAYS_TR = ['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi']
const DAYS_EN = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

// Sanatçılar için açık sahne vitrini: mekan ↔ sanatçı tarafını ana sayfada buluşturur
export async function OpenSlotsShowcase({ city }: { city: string | null }) {
  const locale = await getLocale()
  const isEn = locale === 'en'
  const supabase = await createClient()

  let query = supabase
    .from('slots')
    .select('id, day_of_week, start_time, end_time, fee_model, fee_value, recurrence, venues!inner(id, name, city, district)')
    .eq('status', 'open')
    .order('created_at', { ascending: false })
    .limit(6)

  if (city) query = query.eq('venues.city', city)
  const { data } = await query
  const slots = (data as unknown as SlotRow[]) ?? []

  if (slots.length === 0) return null

  const days = isEn ? DAYS_EN : DAYS_TR

  return (
    <section className="max-w-7xl mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2">
          <Mic2 size={18} className="text-accent" />
          <h2 className="font-bebas text-2xl text-text-primary">
            {isEn ? 'OPEN STAGES' : 'AÇIK SAHNELER'}
          </h2>
        </div>
        <Link href="/venues" className="text-accent text-sm hover:underline">
          {isEn ? 'All venues →' : 'Tüm mekanlar →'}
        </Link>
      </div>
      <p className="text-text-muted text-sm mb-4">
        {isEn
          ? 'Are you a performer? Apply for an open slot and get on stage.'
          : 'Sanatçı mısın? Açık sahnelere başvur, sahneye çık.'}
      </p>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {slots.map((slot) => (
          <Link
            key={slot.id}
            href={`/venues/${slot.venues?.id}`}
            className="rounded-xl border border-[rgba(228,224,216,0.1)] p-3 hover:border-accent/30 transition-colors"
          >
            <p className="font-medium text-text-primary text-sm truncate">{slot.venues?.name}</p>
            <p className="text-xs text-text-muted truncate mt-0.5 flex items-center gap-1">
              <MapPin size={9} />
              {[slot.venues?.district, slot.venues?.city].filter(Boolean).join(', ')}
            </p>
            <p className="text-xs text-text-muted mt-1 flex items-center gap-1">
              <Clock size={9} />
              {days[slot.day_of_week]} · {formatTime(slot.start_time)}–{formatTime(slot.end_time)}
            </p>
            <span className="inline-block mt-2 chip border bg-accent/10 text-accent border-accent/30 text-[11px]">
              {FEE_MODEL_LABELS[slot.fee_model] ?? slot.fee_model}
              {slot.fee_model === 'guarantee' && slot.fee_value ? ` · ${slot.fee_value}₺` : ''}
            </span>
          </Link>
        ))}
      </div>
    </section>
  )
}
