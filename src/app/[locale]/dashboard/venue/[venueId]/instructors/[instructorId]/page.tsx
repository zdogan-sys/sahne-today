'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

const DAYS_SHORT = ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz']
const DAY_COLORS = ['#3b82f6', '#f97316', '#eab308', '#22c55e', '#ec4899', '#a855f7', '#ef4444']
const DAY_LIGHT = ['#dbeafe', '#ffedd5', '#fef9c3', '#dcfce7', '#fce7f3', '#f3e8ff', '#fee2e2']
const HOURS = Array.from({ length: 14 }, (_, i) => i + 8)

const pad = (n: number) => String(n).padStart(2, '0')
const dateStr = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
function getMonday(d: Date) {
  const x = new Date(d); const day = x.getDay(); const diff = (day + 6) % 7
  x.setDate(x.getDate() - diff); x.setHours(0, 0, 0, 0); return x
}

export default function InstructorSchedulePage() {
  const router = useRouter()
  const params = useParams()
  const venueId = params.venueId as string
  const instructorId = params.instructorId as string
  const supabase = createClient()

  const [venue, setVenue] = useState<any>(null)
  const [instructor, setInstructor] = useState<any>(null)
  const [lessons, setLessons] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [weekStart, setWeekStart] = useState(() => getMonday(new Date()))

  const load = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/auth'); return }

    const { data: venueData } = await supabase.from('venues').select('id, name, owner_id').eq('id', venueId).single()
    if (!venueData || venueData.owner_id !== user.id) { router.push('/dashboard'); return }
    setVenue(venueData)

    const { data: inst } = await supabase.from('venue_instructors').select('id, name').eq('id', instructorId).single()
    if (!inst) { router.push(`/dashboard/venue/${venueId}/instructors`); return }
    setInstructor(inst)

    const { data: slots } = await supabase
      .from('teaching_slots')
      .select('*, studio_rooms(name), teaching_bookings(student_name, status)')
      .eq('venue_id', venueId)
      .eq('instructor_name', (inst as any).name)
      .eq('is_active', true)
      .not('slot_date', 'is', null)
    setLessons(slots ?? [])
    setLoading(false)
  }, [venueId, instructorId, supabase, router])

  useEffect(() => { load() }, [load])

  const weekDates = Array.from({ length: 7 }).map((_, i) => { const d = new Date(weekStart); d.setDate(d.getDate() + i); return d })
  function prevWeek() { setWeekStart(d => { const n = new Date(d); n.setDate(n.getDate() - 7); return n }) }
  function nextWeek() { setWeekStart(d => { const n = new Date(d); n.setDate(n.getDate() + 7); return n }) }
  function thisWeek() { setWeekStart(getMonday(new Date())) }

  const grid: Record<string, any[]> = {}
  lessons.forEach(l => {
    if (!l.slot_date) return
    const col = weekDates.findIndex(wd => dateStr(wd) === l.slot_date)
    if (col === -1) return
    const hour = parseInt(l.start_time.split(':')[0])
    const key = `${col}-${hour}`
    ;(grid[key] = grid[key] || []).push(l)
  })

  if (loading) return <div className="max-w-7xl mx-auto px-4 py-12 flex justify-center"><Loader2 size={24} className="animate-spin text-accent" /></div>
  if (!instructor) return null

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-5">
      <div>
        <Link href={`/dashboard/venue/${venueId}/instructors`} className="flex items-center gap-2 text-text-muted text-sm mb-4 hover:text-text-primary w-fit">
          <ArrowLeft size={16} /> Eğitmenler
        </Link>
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="font-bebas text-4xl text-text-primary">{instructor.name}</h1>
            <p className="text-text-muted text-sm">Haftalık ders programı · {venue?.name}</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={prevWeek} className="w-9 h-9 rounded-lg bg-surface border border-[rgba(228,224,216,0.1)] flex items-center justify-center text-text-muted hover:text-text-primary"><ChevronLeft size={18} /></button>
            <button onClick={thisWeek} className="px-3 h-9 rounded-lg bg-surface border border-[rgba(228,224,216,0.1)] text-text-primary text-sm font-medium min-w-[180px]">
              {weekDates[0].toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' })} – {weekDates[6].toLocaleDateString('tr-TR', { day: 'numeric', month: 'short', year: 'numeric' })}
            </button>
            <button onClick={nextWeek} className="w-9 h-9 rounded-lg bg-surface border border-[rgba(228,224,216,0.1)] flex items-center justify-center text-text-muted hover:text-text-primary"><ChevronRight size={18} /></button>
          </div>
        </div>
      </div>

      <div className="overflow-x-auto rounded-2xl p-3">
        <div className="grid gap-1.5" style={{ gridTemplateColumns: '64px repeat(7, minmax(120px, 1fr))', minWidth: '900px' }}>
          <div />
          {weekDates.map((d, col) => (
            <div key={`h-${col}`} className="rounded-xl px-2 py-2 text-center text-white font-semibold" style={{ background: DAY_COLORS[col] }}>
              <div className="text-xs uppercase tracking-wide leading-none">{DAYS_SHORT[col]}</div>
              <div className="text-[10px] opacity-90 mt-0.5 font-normal">{d.getDate()} {d.toLocaleDateString('tr-TR', { month: 'short' })}</div>
            </div>
          ))}

          {HOURS.map(hour => (
            <div key={`row-${hour}`} className="contents">
              <div className="flex items-center justify-center rounded-xl text-white text-xs font-semibold" style={{ background: '#1e3a5f', minHeight: '56px' }}>{pad(hour)}:00</div>
              {weekDates.map((_, col) => {
                const items = grid[`${col}-${hour}`] ?? []
                return (
                  <div key={`${col}-${hour}`} className="rounded-xl p-1" style={{ minHeight: '56px', background: items.length ? 'transparent' : 'rgba(228,224,216,0.05)' }}>
                    {items.map((l: any) => {
                      const student = l.teaching_bookings?.find((b: any) => b.status !== 'cancelled')?.student_name
                      return (
                        <div key={l.id} className="rounded-xl p-1.5 mb-0.5 overflow-hidden" style={{ background: DAY_LIGHT[col], borderLeft: `3px solid ${DAY_COLORS[col]}` }}>
                          <div className="text-[11px] font-semibold leading-tight truncate" style={{ color: '#1f2937' }}>{l.instrument}</div>
                          {l.studio_rooms?.name && <div className="text-[9px] leading-tight truncate" style={{ color: DAY_COLORS[col] }}>{l.studio_rooms.name}</div>}
                          {student && <div className="text-[10px] leading-tight truncate" style={{ color: '#4b5563' }}>{student}</div>}
                        </div>
                      )
                    })}
                  </div>
                )
              })}
            </div>
          ))}
        </div>
      </div>

      {lessons.length === 0 && <p className="text-text-muted text-sm text-center">Bu eğitmene atanmış ders yok.</p>}
    </div>
  )
}
