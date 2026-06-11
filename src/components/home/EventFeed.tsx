'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useTranslations, useLocale } from 'next-intl'
import { createClient } from '@/lib/supabase/client'
import type { Event } from '@/lib/supabase/types'
import { GenreChip } from '@/components/ui/GenreChip'
import { formatTime } from '@/lib/utils'
import { MapPin, Clock } from 'lucide-react'

type EventWithRelations = Event & {
  venues: { name: string; district: string; city: string } | null
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
  const tCommon = useTranslations('common')
  const locale = useLocale()

  const MUSIC_GENRES = locale === 'en'
    ? ['Acoustic', 'Metal', 'Rock', 'Blues', 'Jazz', 'Pop', 'Electronic', 'R&B', 'Rap', 'Classical', 'Ethnic', 'Fasıl', 'Folk', 'Arabesk']
    : ['Akustik', 'Metal', 'Rock', 'Blues', 'Caz', 'Pop', 'Elektronik', 'R&B', 'Rap', 'Klasik', 'Etnik', 'Fasıl', 'Türkü', 'Arabesk']

  const STAGE_GENRES = locale === 'en'
    ? ['Stand-Up', 'Improvisation', 'Theater', 'Alternative Stage']
    : ['Stand-Up', 'Doğaçlama', 'Tiyatro', 'Alternatif Sahne']

  const DANCE_GENRES = ['Salsa', 'Tango', 'Bale', 'Hip-Hop', 'Vals', 'Foxtrot', 'Zumba', 'Flamenco', 'Zeybek', 'Modern Dans', 'Bachata', 'Oryantal']

  const ALL_LABEL = t('all')
  const MUSIC_LABEL = locale === 'en' ? 'Music' : 'Müzik'
  const STAGE_LABEL = locale === 'en' ? 'Stage' : 'Sahne'
  const DANCE_LABEL = locale === 'en' ? 'Dance' : 'Dans'

  const TIME_FILTERS: { value: TimePeriod; label: string }[] = [
    { value: 'today', label: t('dateRanges.today') },
    { value: 'week', label: t('dateRanges.week') },
    { value: 'month', label: t('dateRanges.month') },
  ]

  const [events, setEvents] = useState<EventWithRelations[]>([])
  const [timePeriod, setTimePeriod] = useState<TimePeriod>('week')
  const [activeGenre, setActiveGenre] = useState<string>('all')
  const [city, setCity] = useState<string>('Tümü')
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

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
        .select(`*, venues${cityFilter ? '!inner' : ''}(name, district, city), artists(stage_name)`)
        .eq('status', 'confirmed')
        .gte('event_date', from)
        .lte('event_date', to)
        .order('event_date', { ascending: true })
        .order('start_time', { ascending: true })
        .limit(30)

      if (cityFilter) query = query.eq('venues.city', city)
      if (activeGenre !== 'all') query = query.eq('genre', activeGenre)

      const { data } = await query
      let rows = (data as EventWithRelations[]) ?? []
      // Client-side yedek filtre (sunucu gömülü filtresi tutmazsa garanti)
      if (cityFilter) rows = rows.filter(e => (e.venues?.city ?? '') === city)
      setEvents(rows)
      setLoading(false)
    }
    fetchEvents()
  }, [timePeriod, activeGenre, city])

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

      {/* Genre filter chips */}
      <div className="space-y-3 mb-5">
        {[
          { label: null, genres: [{ key: 'all', display: ALL_LABEL }] },
          { label: MUSIC_LABEL, genres: MUSIC_GENRES.map((g, i) => ({ key: g, display: g })) },
          { label: STAGE_LABEL, genres: STAGE_GENRES.map((g) => ({ key: g, display: g })) },
          { label: DANCE_LABEL, genres: DANCE_GENRES.map((g) => ({ key: g, display: g })) },
        ].map(({ label, genres }) => (
          <div key={label ?? 'all'}>
            {label && <p className="text-[10px] text-text-muted uppercase tracking-widest mb-1.5">{label}</p>}
            <div className="flex flex-wrap gap-1.5">
              {genres.map(({ key, display }) => (
                <button
                  key={key}
                  onClick={() => setActiveGenre(key)}
                  className={`flex-shrink-0 chip transition-colors border ${
                    activeGenre === key
                      ? 'bg-accent text-white border-accent'
                      : 'bg-[rgba(228,224,216,0.06)] text-text-muted border-[rgba(228,224,216,0.1)]'
                  }`}
                >
                  {display}
                </button>
              ))}
            </div>
          </div>
        ))}
        {/* En altta: Müzik Kursları → Kurslar sayfası */}
        <div>
          <p className="text-[10px] text-text-muted uppercase tracking-widest mb-1.5">{locale === 'en' ? 'Courses' : 'Kurslar'}</p>
          <Link href="/courses?category=music"
            className="inline-flex items-center gap-1 chip border bg-[#d4a820]/10 text-[#d4a820] border-[#d4a820]/30 hover:bg-[#d4a820]/20 transition-colors">
            🎵 {locale === 'en' ? 'Music Courses' : 'Müzik Kursları'}
          </Link>
        </div>
      </div>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="card p-4 animate-pulse">
              <div className="flex gap-4">
                <div className="w-14 h-14 bg-[rgba(228,224,216,0.06)] rounded-lg" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-[rgba(228,224,216,0.06)] rounded w-2/3" />
                  <div className="h-3 bg-[rgba(228,224,216,0.06)] rounded w-1/2" />
                </div>
              </div>
            </div>
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
            {activeGenre !== 'all'
              ? (locale === 'en' ? `No events in this genre.` : `"${activeGenre}" türünde etkinlik yok.`)
              : (locale === 'en' ? 'Try a different period.' : 'Farklı bir dönem seçin.')}
          </p>
          {activeGenre !== 'all' && (
            <button onClick={() => setActiveGenre('all')} className="mt-2 text-accent text-xs hover:underline">
              {locale === 'en' ? 'Show all genres' : 'Tüm türleri göster'}
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
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

  return (
    <Link href={`/events/${event.id}`} className="card p-4 flex gap-4 hover:border-accent/30 transition-colors block">
      <div className="flex-shrink-0 w-14 h-14 bg-[rgba(212,83,126,0.08)] rounded-lg flex flex-col items-center justify-center border border-accent/20">
        <span className="font-bebas text-xl text-accent leading-none">{dayNum}</span>
        <span className="text-[10px] text-accent/70 uppercase">{month}</span>
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-semibold text-text-primary text-sm leading-tight truncate">
            {event.title}
          </h3>
          {event.genre && <GenreChip genre={event.genre} />}
        </div>

        <div className="mt-1 flex items-center gap-1 text-text-muted text-xs">
          <MapPin size={11} />
          <span className="truncate">
            {event.venues?.name} · {event.venues?.district}
          </span>
        </div>

        <div className="mt-1 flex items-center gap-3 text-text-muted text-xs">
          <span className="flex items-center gap-1">
            <Clock size={11} />
            {formatTime(event.start_time)}
          </span>
          {event.entry_type === 'free' ? (
            <span className="text-success">{locale === 'en' ? 'Free' : 'Ücretsiz'}</span>
          ) : event.entry_fee ? (
            <span>{event.entry_fee}₺</span>
          ) : (
            <span>{locale === 'en' ? 'At the Door' : 'Kapıda'}</span>
          )}
        </div>
      </div>
    </Link>
  )
}
