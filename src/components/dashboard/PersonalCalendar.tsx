'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ChevronLeft, ChevronRight, CalendarPlus } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Entry {
  type: string
  date: string
  title: string
  start_time?: string
  end_time?: string
  subtitle?: string
  color: string
  status?: string
  id: string
  linkTo?: string
}

const MONTH_TR = ['Ocak','Şubat','Mart','Nisan','Mayıs','Haziran','Temmuz','Ağustos','Eylül','Ekim','Kasım','Aralık']
const DAY_HEADERS = ['Pzt','Sal','Çar','Per','Cum','Cmt','Paz']

const COLOR_MAP: Record<string, string> = {
  accent:  'bg-accent/20 text-accent border-accent/30',
  success: 'bg-success/20 text-success border-success/30',
  blue:    'bg-blue-500/20 text-blue-400 border-blue-500/30',
  purple:  'bg-purple-500/20 text-purple-400 border-purple-500/30',
  orange:  'bg-orange-500/20 text-orange-400 border-orange-500/30',
  muted:   'bg-[rgba(228,224,216,0.08)] text-text-muted border-[rgba(228,224,216,0.12)]',
}

const TYPE_ICON: Record<string, string> = {
  ticket: '🎫', attendance: '⭐', studio: '🎸', lesson: '🎓', course: '📚',
}

const TYPE_LABEL: Record<string, string> = {
  ticket: 'Bilet', attendance: 'Etkinlik', studio: 'Stüdyo', lesson: 'Ders', course: 'Kurs',
}

function toISO(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
}

export function PersonalCalendar({ entries, calendarToken }: { entries: Entry[]; calendarToken: string | null }) {
  const today = new Date(); today.setHours(0,0,0,0)
  const [year, setYear] = useState(today.getFullYear())
  const [month, setMonth] = useState(today.getMonth())
  const [selected, setSelected] = useState<string | null>(null)
  const [showSubscribe, setShowSubscribe] = useState(false)

  function prevMonth() { if (month === 0) { setYear(y => y-1); setMonth(11) } else setMonth(m => m-1); setSelected(null) }
  function nextMonth() { if (month === 11) { setYear(y => y+1); setMonth(0) } else setMonth(m => m+1); setSelected(null) }

  // Grid hücreleri
  const firstDay = new Date(year, month, 1)
  const lastDay = new Date(year, month+1, 0)
  const startOffset = (firstDay.getDay() + 6) % 7 // Pazartesi = 0
  const cells: (Date | null)[] = Array(startOffset).fill(null)
  for (let d = 1; d <= lastDay.getDate(); d++) cells.push(new Date(year, month, d))
  while (cells.length % 7 !== 0) cells.push(null)

  // Tarihe göre entry map
  const byDate = new Map<string, Entry[]>()
  for (const e of entries) {
    const arr = byDate.get(e.date) ?? []
    arr.push(e)
    byDate.set(e.date, arr)
  }

  const selectedEntries = selected ? (byDate.get(selected) ?? []) : []

  const siteUrl = typeof window !== 'undefined' ? window.location.origin : 'https://sahne.today'
  const feedUrl = calendarToken ? `${siteUrl}/api/feed/personal/${calendarToken}/ics` : null
  const webcalUrl = feedUrl?.replace(/^https?:/, 'webcal:')

  return (
    <div className="space-y-6">
      {/* Legend + Subscribe */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex flex-wrap gap-3 text-xs text-text-muted">
          {Object.entries(TYPE_ICON).map(([type, icon]) => (
            <span key={type} className="flex items-center gap-1">{icon} {TYPE_LABEL[type]}</span>
          ))}
        </div>
        {calendarToken && (
          <div className="relative">
            <button onClick={() => setShowSubscribe(o => !o)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-accent/15 text-accent border border-accent/30 text-xs font-semibold hover:bg-accent/25 transition-colors">
              <CalendarPlus size={13} /> Takvime Ekle
            </button>
            {showSubscribe && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowSubscribe(false)} />
                <div className="absolute right-0 top-full mt-2 w-60 bg-surface border border-[rgba(228,224,216,0.12)] rounded-xl shadow-2xl z-50 overflow-hidden">
                  <p className="px-4 pt-3 pb-1 text-[10px] text-text-muted uppercase tracking-wider">Otomatik Senkronizasyon</p>
                  <a href={`https://calendar.google.com/calendar/r?cid=${encodeURIComponent(webcalUrl!)}`}
                    target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-3 px-4 py-3 hover:bg-[rgba(228,224,216,0.04)]"
                    onClick={() => setShowSubscribe(false)}>
                    <span className="text-2xl">📅</span>
                    <div><p className="text-sm text-text-primary font-medium">Google Takvim</p><p className="text-[10px] text-text-muted">Otomatik güncellenir</p></div>
                  </a>
                  <a href={webcalUrl!}
                    className="flex items-center gap-3 px-4 py-3 hover:bg-[rgba(228,224,216,0.04)]"
                    onClick={() => setShowSubscribe(false)}>
                    <span className="text-2xl">🍎</span>
                    <div><p className="text-sm text-text-primary font-medium">Apple Takvim</p><p className="text-[10px] text-text-muted">Otomatik güncellenir</p></div>
                  </a>
                  <div className="border-t border-[rgba(228,224,216,0.08)] px-4 pt-2 pb-3">
                    <a href={feedUrl!} download="kisisel-takvim.ics" className="text-xs text-accent hover:underline" onClick={() => setShowSubscribe(false)}>
                      .ics dosyası indir →
                    </a>
                  </div>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr,300px] gap-6 items-start">
        {/* Takvim */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <button onClick={prevMonth} className="w-8 h-8 rounded-lg bg-surface flex items-center justify-center text-text-muted hover:text-text-primary">
              <ChevronLeft size={16} />
            </button>
            <span className="font-bebas text-xl text-text-primary">{MONTH_TR[month]} {year}</span>
            <button onClick={nextMonth} className="w-8 h-8 rounded-lg bg-surface flex items-center justify-center text-text-muted hover:text-text-primary">
              <ChevronRight size={16} />
            </button>
          </div>

          <div className="grid grid-cols-7 mb-1">
            {DAY_HEADERS.map(d => <div key={d} className="text-center text-xs text-text-muted py-1 font-medium">{d}</div>)}
          </div>

          <div className="grid grid-cols-7 gap-0.5">
            {cells.map((date, i) => {
              if (!date) return <div key={`e-${i}`} className="h-14 sm:h-16" />
              const dateStr = toISO(date)
              const dayEntries = byDate.get(dateStr) ?? []
              const isToday = date.getTime() === today.getTime()
              const isPast = date < today
              const isSelected = dateStr === selected

              return (
                <button key={dateStr} onClick={() => setSelected(isSelected ? null : dateStr)}
                  className={cn(
                    'h-14 sm:h-16 rounded-lg flex flex-col items-center pt-1.5 gap-0.5 text-sm transition-colors relative overflow-hidden',
                    isSelected ? 'bg-accent text-white' :
                    dayEntries.length > 0 ? 'bg-surface hover:bg-accent/10 cursor-pointer' :
                    isPast ? 'text-white/30' : 'text-white/55 hover:bg-[rgba(228,224,216,0.05)]'
                  )}>
                  <span className={cn('font-medium text-xs leading-none', isToday && !isSelected && 'text-accent font-bold')}>{date.getDate()}</span>
                  {isToday && !isSelected && <span className="absolute top-0.5 right-0.5 w-1 h-1 rounded-full bg-accent" />}
                  <div className="flex gap-0.5 flex-wrap justify-center px-0.5">
                    {dayEntries.slice(0, 3).map((e, j) => (
                      <span key={j} className={cn('text-[8px] px-0.5 rounded', isSelected ? 'bg-white/20' : COLOR_MAP[e.color].split(' ')[0])}>
                        {TYPE_ICON[e.type]}
                      </span>
                    ))}
                    {dayEntries.length > 3 && <span className="text-[8px] text-text-muted">+{dayEntries.length-3}</span>}
                  </div>
                </button>
              )
            })}
          </div>
        </div>

        {/* Seçili günün detayı */}
        <div>
          {selected ? (
            <div className="card p-4 space-y-3">
              <p className="font-semibold text-text-primary">
                {new Date(selected + 'T00:00:00').toLocaleDateString('tr-TR', { weekday: 'long', day: 'numeric', month: 'long' })}
              </p>
              {selectedEntries.length === 0 ? (
                <p className="text-text-muted text-sm">Bu günde etkinlik yok.</p>
              ) : (
                <div className="space-y-2">
                  {selectedEntries.sort((a, b) => (a.start_time ?? '').localeCompare(b.start_time ?? '')).map((e, i) => {
                    const content = (
                      <div className={cn('p-3 rounded-lg border', COLOR_MAP[e.color])}>
                        <div className="flex items-start gap-2">
                          <span className="text-base leading-none flex-shrink-0">{TYPE_ICON[e.type]}</span>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium leading-tight">{e.title}</p>
                            {e.subtitle && <p className="text-xs opacity-70 mt-0.5">{e.subtitle}</p>}
                            {e.start_time && (
                              <p className="text-xs opacity-60 mt-0.5">
                                {e.start_time.slice(0,5)}{e.end_time ? ` – ${e.end_time.slice(0,5)}` : ''}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    )
                    return e.linkTo ? (
                      <Link key={i} href={e.linkTo}>{content}</Link>
                    ) : (
                      <div key={i}>{content}</div>
                    )
                  })}
                </div>
              )}
            </div>
          ) : (
            <div className="card p-6 text-center text-text-muted text-sm">
              Gün seçerek detayları görebilirsin.
            </div>
          )}

          {/* Yaklaşan etkinlikler özeti */}
          <div className="mt-4 space-y-2">
            <p className="text-text-muted text-xs uppercase tracking-wider">Yaklaşan</p>
            {entries
              .filter(e => e.date >= toISO(today))
              .sort((a, b) => a.date.localeCompare(b.date) || (a.start_time ?? '').localeCompare(b.start_time ?? ''))
              .slice(0, 5)
              .map((e, i) => {
                const dateStr = new Date(e.date + 'T00:00:00').toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' })
                const content = (
                  <div className="flex items-center gap-2 p-2.5 rounded-lg hover:bg-[rgba(228,224,216,0.04)] transition-colors">
                    <span className="text-sm">{TYPE_ICON[e.type]}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-text-primary text-xs font-medium truncate">{e.title}</p>
                      <p className="text-text-muted text-[10px]">{dateStr}{e.start_time ? ` · ${e.start_time.slice(0,5)}` : ''}</p>
                    </div>
                  </div>
                )
                return e.linkTo ? <Link key={i} href={e.linkTo}>{content}</Link> : <div key={i}>{content}</div>
              })}
            {entries.filter(e => e.date >= toISO(today)).length === 0 && (
              <p className="text-text-muted text-xs">Yaklaşan etkinlik yok.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
