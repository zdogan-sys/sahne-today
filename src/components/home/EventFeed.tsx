'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useTranslations, useLocale } from 'next-intl'
import { createClient } from '@/lib/supabase/client'
import type { Event } from '@/lib/supabase/types'
import { GenreChip } from '@/components/ui/GenreChip'
import { formatTime } from '@/lib/utils'
import { MapPin, Clock, ChevronDown } from 'lucide-react'
import Image from 'next/image'
import { getListConfigs } from '@/app/actions/site'

type EventWithRelations = Event & {
  poster_url?: string | null
  venues: { name: string; district: string; city: string; photo_url?: string | null } | null
  artists: { stage_name: string } | null
}

type TimePeriod = 'today' | 'week' | 'month'

function getDateRange(period: TimePeriod): { from: string; to: string } {
  const now = new Date()
  const effective = now.getHours() < 4 ? new Date(now.getTime() - 86400000) : now
  const from = effective.toISOString().split('T')[0]

  if (period === 'today') {
    return { from, to: from }
  } else if (period === 'week') {
    const to = new Date(now.getTime() + 7 * 86400000).toISOString().split('T')[0]
    return { from, to }
  } else {
    const to = new Date(now.getTime() + 29 * 86400000).toISOString().split('T')[0]
    return { from, to }
  }
}

export function EventFeed() {
  const t = useTranslations('filters')
  const locale = useLocale()

  const [MUSIC_GENRES, setMusicGenres] = useState<string[]>([])
  const [STAGE_GENRES, setStageGenres] = useState<string[]>([])
  const [DANCE_GENRES, setDanceGenres] = useState<string[]>([])

  const TIME_FILTERS: { value: TimePeriod; label: string }[] = [
    { value: 'today', label: t('dateRanges.today') },
    { value: 'week', label: t('dateRanges.week') },
    { value: 'month', label: t('dateRanges.month') },
  ]

  const [events, setEvents] = useState<EventWithRelations[]>([])
  const [timePeriod, setTimePeriod] = useState<TimePeriod>('week')
  const [activeCategory, setActiveCategory] = useState<string>('')
  const [activeSubGenre, setActiveSubGenre] = useState<string>('')
  const [city, setCity] = useState<string>('Tümü')
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    getListConfigs().then(g => {
      setMusicGenres(g.music_genres)
      setStageGenres(g.stage_genres)
      setDanceGenres(g.dance_types)
    })
  }, [])

  // Üstteki şehir seçicisini dinle (localStorage + 'city_changed' event'i)
  useEffect(() => {
    const read = () => setCity(localStorage.getItem('sahne_city') || 'Tümü')
    read()
    window.addEventListener('city_changed', read)
    return () => window.removeEventListener('city_changed', read)
  }, [])

  useEffect(() => {
    async function fetchEvents() {
      setLoading(true)
      const { from, to } = getDateRange(timePeriod)

      const cityFilter = city && city !== 'Tümü'
      let query = supabase
        .from('events')
        .select(`*, venues${cityFilter ? '!inner' : ''}(name, district, city, photo_url), artists(stage_name)`)
        .eq('status', 'confirmed')
        .gte('event_date', from)
        .lte('event_date', to)
        .order('event_date', { ascending: true })
        .order('start_time', { ascending: true })
        .limit(30)

      if (cityFilter) query = query.eq('venues.city', city)
      const effectiveGenre = activeSubGenre || activeCategory
      if (effectiveGenre === 'cat:music') query = query.in('genre', MUSIC_GENRES)
      else if (effectiveGenre === 'cat:stage') query = query.in('genre', STAGE_GENRES)
      else if (effectiveGenre === 'cat:dance') query = query.in('genre', DANCE_GENRES)
      else if (effectiveGenre) query = query.eq('genre', effectiveGenre)

      const { data } = await query
      let rows = (data as EventWithRelations[]) ?? []
      // Client-side yedek filtre (sunucu gömülü filtresi tutmazsa garanti)
      if (cityFilter) rows = rows.filter(e => (e.venues?.city ?? '') === city)
      setEvents(rows)
      setLoading(false)
    }
    fetchEvents()
  }, [timePeriod, activeCategory, activeSubGenre, city])

  return (
    <div>
      {/* Time period tabs */}
      <div className="flex gap-1 mb-5 bg-surface rounded-xl p-1 border border-[rgba(228,224,216,0.08)]">
        {TIME_FILTERS.map(({ value, label }) => (
          <button
            key={value}
            onClick={() => setTimePeriod(value)}
            className={`flex-1 py-2 text-sm font-medium rounded-lg transition-colors ${
              timePeriod === value
                ? 'bg-accent text-white'
                : 'text-text-muted hover:text-text-primary'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Genre dropdowns */}
      <div className="flex gap-2 mb-4">
        <div className="relative flex-1">
          <select
            value={activeCategory}
            onChange={e => { setActiveCategory(e.target.value); setActiveSubGenre('') }}
            className="w-full bg-surface border border-[rgba(228,224,216,0.15)] text-text-primary rounded-lg px-3 py-2 text-sm appearance-none cursor-pointer focus:outline-none focus:border-accent/40"
          >
            <option value="">{locale === 'en' ? 'All Genres' : 'Tüm Türler'}</option>
            <option value="cat:music">{locale === 'en' ? '🎵 Music' : '🎵 Müzik'}</option>
            <option value="cat:stage">{locale === 'en' ? '🎭 Stage' : '🎭 Sahne'}</option>
            <option value="cat:dance">{locale === 'en' ? '💃 Dance' : '💃 Dans'}</option>
          </select>
          <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none" />
        </div>
        {activeCategory && (
          <div className="relative flex-1">
            <select
              value={activeSubGenre}
              onChange={e => setActiveSubGenre(e.target.value)}
              className="w-full bg-surface border border-[rgba(228,224,216,0.15)] text-text-primary rounded-lg px-3 py-2 text-sm appearance-none cursor-pointer focus:outline-none focus:border-accent/40"
            >
              <option value="">{locale === 'en' ? 'All' : 'Tümü'}</option>
              {(activeCategory === 'cat:music' ? MUSIC_GENRES : activeCategory === 'cat:stage' ? STAGE_GENRES : DANCE_GENRES).map(g => (
                <option key={g} value={g}>{g}</option>
              ))}
            </select>
            <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none" />
          </div>
        )}
      </div>

      {/* Kurslar & Stüdyolar quick links */}
      <div className="flex flex-wrap gap-1.5 mb-5">
        <Link href="/courses" className="inline-flex items-center gap-1 chip border bg-[#d4a820]/10 text-[#d4a820] border-[#d4a820]/30 hover:bg-[#d4a820]/20 transition-colors">
          🎵 {locale === 'en' ? 'Courses' : 'Kurslar'}
        </Link>
        <Link href="/studios" className="inline-flex items-center gap-1 chip border bg-[#5ba4cf]/10 text-[#5ba4cf] border-[#5ba4cf]/30 hover:bg-[#5ba4cf]/20 transition-colors">
          🎚️ {locale === 'en' ? 'Studios' : 'Stüdyolar'}
        </Link>
      </div>

      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="aspect-square rounded-xl bg-[rgba(228,224,216,0.06)] animate-pulse" />
          ))}
        </div>
      ) : events.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-4xl mb-3 opacity-30">🎵</div>
          <p className="text-text-primary text-sm font-medium mb-1">
            {locale === 'en'
              ? timePeriod === 'today' ? 'No events today' : `No events found for this period`
              : timePeriod === 'today' ? 'Bugün etkinlik yok' : `Bu dönem için etkinlik bulunamadı`}
          </p>
          <p className="text-text-muted text-xs">
            {activeSubGenre || activeCategory
              ? (locale === 'en' ? 'No events in this genre.' : 'Bu türde etkinlik yok.')
              : (locale === 'en' ? 'Try a different period.' : 'Farklı bir dönem seçin.')}
          </p>
          {(activeSubGenre || activeCategory) && (
            <button onClick={() => { setActiveCategory(''); setActiveSubGenre('') }} className="mt-2 text-accent text-xs hover:underline">
              {locale === 'en' ? 'Show all genres' : 'Tüm türleri göster'}
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {events.map((event) => (
            <EventCard key={event.id} event={event} locale={locale} />
          ))}
        </div>
      )}
    </div>
  )
}

function EventCard({ event, locale }: { event: EventWithRelations; locale: string }) {
  const date = new Date(event.event_date)
  const dayNum = date.getDate()
  const month = date.toLocaleDateString(locale === 'en' ? 'en-US' : 'tr-TR', { month: 'short' })
  const performerName = event.artists?.stage_name ?? null
  const bgImage = event.poster_url ?? event.venues?.photo_url ?? null

  return (
    <Link href={`/events/${event.id}`} className="block aspect-square relative rounded-xl overflow-hidden border border-[rgba(228,224,216,0.1)] hover:border-accent/40 transition-colors">
      {bgImage ? (
        <Image src={bgImage} alt={event.title} fill className="object-cover" sizes="33vw" />
      ) : (
        <div className="absolute inset-0 bg-surface-alt" />
      )}

      <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-black/10" />

      <div className="absolute top-2 left-2 bg-accent rounded-lg px-2 py-1 flex flex-col items-center min-w-[28px]">
        <span className="font-bebas text-base text-white leading-none">{dayNum}</span>
        <span className="text-[8px] text-white/80 uppercase leading-none mt-0.5">{month}</span>
      </div>

      {event.genre && (
        <div className="absolute top-2 right-2">
          <GenreChip genre={event.genre} />
        </div>
      )}

      <div className="absolute bottom-0 left-0 right-0 p-2.5">
        <h3 className="font-semibold text-white text-sm leading-tight line-clamp-2 mb-0.5">{event.title}</h3>
        {performerName && <p className="text-xs text-accent/90 truncate">{performerName}</p>}
        <div className="flex items-center justify-between mt-1 gap-1">
          <span className="text-[10px] text-white/55 truncate flex items-center gap-0.5">
            <MapPin size={8} className="flex-shrink-0" />
            {event.venues?.name ?? ''}
          </span>
          <span className="text-[10px] text-white/55 flex-shrink-0 flex items-center gap-0.5">
            <Clock size={8} />{formatTime(event.start_time)}
          </span>
        </div>
        {event.entry_type === 'free' && (
          <span className="text-[9px] text-success font-medium">{locale === 'en' ? 'Free' : 'Ücretsiz'}</span>
        )}
        {event.entry_type !== 'free' && event.entry_fee ? (
          <span className="text-[9px] text-white/60">{event.entry_fee}₺</span>
        ) : null}
      </div>
    </Link>
  )
}
