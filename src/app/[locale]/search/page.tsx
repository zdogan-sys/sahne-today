'use client'

import { useState, useEffect, useCallback } from 'react'
import { Search, X, Calendar, MapPin, Music2, BookOpen } from 'lucide-react'
import { useTranslations, useLocale } from 'next-intl'
import { Link } from '@/i18n/navigation'
import { createClient } from '@/lib/supabase/client'
import { formatDate } from '@/lib/utils'
import { GenreChip } from '@/components/ui/GenreChip'

type Tab = 'events' | 'artists' | 'venues' | 'courses'

export default function SearchPage() {
  const t = useTranslations('search')
  const locale = useLocale()
  const [query, setQuery] = useState('')
  const [tab, setTab] = useState<Tab>('events')
  const [results, setResults] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const supabase = createClient()

  const runSearch = useCallback(async (q: string, t: Tab) => {
    if (!q.trim()) { setResults([]); return }
    setLoading(true)
    const today = new Date().toISOString().split('T')[0]

    if (t === 'events') {
      const { data } = await supabase
        .from('events')
        .select('id, title, event_date, genre, venues(name, city)')
        .eq('status', 'confirmed')
        .ilike('title', `%${q}%`)
        .gte('event_date', today)
        .order('event_date')
        .limit(20)
      setResults(data ?? [])
    } else if (t === 'artists') {
      const { data } = await supabase
        .from('artists')
        .select('id, stage_name, city, genres, profiles(avatar_url)')
        .ilike('stage_name', `%${q}%`)
        .eq('is_hidden', false)
        .limit(20)
      setResults(data ?? [])
    } else if (t === 'courses') {
      const { data } = await supabase
        .from('courses')
        .select('id, title, category, subcategory, profiles(display_name)')
        .in('status', ['active', 'full'])
        .or(`title.ilike.%${q}%,subcategory.ilike.%${q}%`)
        .limit(20)
      setResults(data ?? [])
    } else {
      const { data } = await supabase
        .from('venues')
        .select('id, name, city, district, venue_type')
        .ilike('name', `%${q}%`)
        .limit(20)
      setResults(data ?? [])
    }
    setLoading(false)
  }, [supabase])

  useEffect(() => {
    const t = setTimeout(() => runSearch(query, tab), 280)
    return () => clearTimeout(t)
  }, [query, tab, runSearch])

  const tabs: { key: Tab; label: string; icon: React.ElementType }[] = [
    { key: 'events', label: t('events'), icon: Calendar },
    { key: 'artists', label: t('artists'), icon: Music2 },
    { key: 'venues', label: t('venues'), icon: MapPin },
    { key: 'courses', label: locale === 'en' ? 'Courses' : 'Kurslar', icon: BookOpen },
  ]

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <div className="relative mb-4">
        <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted" />
        <input
          autoFocus
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder={t('placeholder')}
          className="input-field pl-10 pr-9 text-base"
        />
        {query && (
          <button onClick={() => setQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary">
            <X size={15} />
          </button>
        )}
      </div>

      <div className="flex gap-1 mb-4 bg-surface rounded-xl p-1 border border-[rgba(228,224,216,0.08)]">
        {tabs.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-sm font-medium rounded-lg transition-colors ${
              tab === key ? 'bg-accent text-white' : 'text-text-muted hover:text-text-primary'
            }`}
          >
            <Icon size={13} />
            {label}
          </button>
        ))}
      </div>

      {!query.trim() ? (
        <div className="text-center py-16 text-text-muted text-sm">
          {t('emptyState')}
        </div>
      ) : loading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="card p-4 animate-pulse h-16" />
          ))}
        </div>
      ) : results.length === 0 ? (
        <div className="text-center py-16 text-text-muted text-sm">
          {t('noResults', { query })}
        </div>
      ) : (
        <div className="space-y-2">
          {tab === 'events' && results.map((e: any) => (
            <Link key={e.id} href={`/events/${e.id}`} className="card p-4 flex items-center gap-3 hover:border-accent/30 transition-colors block">
              <div className="w-9 h-9 bg-accent/10 rounded-lg flex items-center justify-center flex-shrink-0">
                <Calendar size={15} className="text-accent" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-text-primary text-sm truncate">{e.title}</p>
                <p className="text-text-muted text-xs">{formatDate(e.event_date, locale)}{e.venues?.name ? ` · ${e.venues.name}` : ''}</p>
              </div>
              {e.genre && <GenreChip genre={e.genre} />}
            </Link>
          ))}
          {tab === 'artists' && results.map((a: any) => (
            <Link key={a.id} href={`/artists/${a.id}`} className="card p-4 flex items-center gap-3 hover:border-accent/30 transition-colors block">
              <div className="w-9 h-9 rounded-full bg-accent/10 flex items-center justify-center text-accent font-bold text-sm flex-shrink-0">
                {a.stage_name?.[0]}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-text-primary text-sm">{a.stage_name}</p>
                {a.city && <p className="text-text-muted text-xs">{a.city}</p>}
              </div>
              <div className="flex gap-1 flex-shrink-0 flex-wrap justify-end">
                {a.genres?.slice(0, 2).map((g: string) => <GenreChip key={g} genre={g} />)}
              </div>
            </Link>
          ))}
          {tab === 'courses' && results.map((c: any) => (
            <Link key={c.id} href={`/courses/${c.id}`} className="card p-4 flex items-center gap-3 hover:border-accent/30 transition-colors block">
              <div className="w-9 h-9 bg-accent/10 rounded-lg flex items-center justify-center flex-shrink-0">
                <BookOpen size={15} className="text-accent" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-text-primary text-sm truncate">{c.title}</p>
                <p className="text-text-muted text-xs truncate">{[c.subcategory, c.profiles?.display_name].filter(Boolean).join(' · ')}</p>
              </div>
            </Link>
          ))}
          {tab === 'venues' && results.map((v: any) => (
            <Link key={v.id} href={`/venues/${v.id}`} className="card p-4 flex items-center gap-3 hover:border-accent/30 transition-colors block">
              <div className="w-9 h-9 bg-accent/10 rounded-lg flex items-center justify-center flex-shrink-0">
                <MapPin size={15} className="text-accent" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-text-primary text-sm">{v.name}</p>
                <p className="text-text-muted text-xs">{v.district ? `${v.district}, ` : ''}{v.city}</p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
