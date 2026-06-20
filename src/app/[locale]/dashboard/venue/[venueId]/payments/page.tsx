'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Loader2, Check, Wallet, ChevronDown, ChevronRight } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'

type Row = {
  key: string                // `${ref_type}-${ref_id}-${period}`
  ref_type: 'course' | 'lesson'
  ref_id: string
  student_name: string
  student_email: string
  label: string
  period: string             // 'YYYY-MM'
  amount: number
  paid: boolean
  method: string | null
}

const MONTH_TR = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık']
function periodLabel(p: string) {
  const [y, m] = p.split('-')
  return `${MONTH_TR[parseInt(m) - 1]} ${y}`
}
function monthKey(dateStr: string) {
  return dateStr.slice(0, 7) // YYYY-MM
}

export default function VenuePaymentsPage() {
  const router = useRouter()
  const params = useParams()
  const venueId = params.venueId as string
  const supabase = createClient()

  const [venue, setVenue] = useState<any>(null)
  const [rows, setRows] = useState<Row[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState<string | null>(null)

  // Filtreler
  const [search, setSearch] = useState('')
  const [showPast, setShowPast] = useState(false)
  const [expanded, setExpanded] = useState<string | null>(null)

  const load = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/auth'); return }

    const [{ data: venueData }, { data: membership }] = await Promise.all([
      supabase.from('venues').select('id, name, venue_type').eq('id', venueId).single(),
      supabase.from('venue_members').select('id').eq('venue_id', venueId).eq('user_id', user.id).maybeSingle(),
    ])
    if (!venueData || !membership) { router.push('/dashboard'); return }
    setVenue(venueData)

    // Aylık kurslar + kayıtlar + seanslar
    const { data: courses } = await supabase
      .from('courses')
      .select('id, title, monthly_price, billing_type, course_enrollments(id, student_name, student_email, status, created_at), course_sessions(session_date)')
      .eq('venue_id', venueId)
      .eq('billing_type', 'monthly')

    // Aylık özel dersler (onaylı) + seri slotları
    const { data: requests } = await supabase
      .from('lesson_requests')
      .select('id, subject, monthly_price, series_id, student_name, student_email, created_at, requested_date')
      .eq('venue_id', venueId)
      .eq('billing_type', 'monthly')
      .eq('status', 'approved')

    const seriesIds = (requests ?? []).map((r: any) => r.series_id).filter(Boolean)
    let slotsBySeries: Record<string, string[]> = {}
    if (seriesIds.length > 0) {
      const { data: slots } = await supabase
        .from('teaching_slots')
        .select('series_id, slot_date')
        .in('series_id', seriesIds)
        .eq('is_active', true)
      for (const s of slots ?? []) {
        const sid = (s as any).series_id
        if (!sid || !(s as any).slot_date) continue
        ;(slotsBySeries[sid] = slotsBySeries[sid] || []).push((s as any).slot_date)
      }
    }

    // Mevcut ödeme kayıtları
    const { data: payments } = await supabase.from('aidat_payments').select('*').eq('venue_id', venueId)
    const payMap = new Map<string, any>()
    for (const p of payments ?? []) payMap.set(`${p.ref_type}-${p.ref_id}-${p.period}`, p)

    const built: Row[] = []

    function buildSubscription(refType: 'course' | 'lesson', refId: string, studentName: string, studentEmail: string, label: string, monthlyPrice: number, startDate: string, sessionDates: string[]) {
      const dates = (sessionDates ?? []).filter(Boolean).sort()
      if (dates.length === 0) return
      const start = startDate?.slice(0, 10) || dates[0]
      // Dönemler: başlangıç ayından son seans ayına kadar
      const firstPeriod = monthKey(start < dates[0] ? dates[0] : start)
      const lastPeriod = monthKey(dates[dates.length - 1])
      const periods: string[] = []
      let [py, pm] = firstPeriod.split('-').map(Number)
      const [ly, lm] = lastPeriod.split('-').map(Number)
      while (py < ly || (py === ly && pm <= lm)) {
        periods.push(`${py}-${String(pm).padStart(2, '0')}`)
        pm++; if (pm > 12) { pm = 1; py++ }
      }
      periods.forEach((period, idx) => {
        const monthDates = dates.filter(d => monthKey(d) === period)
        let amount = monthlyPrice
        if (idx === 0) {
          // İlk ay oranlı: başlangıç tarihinden sonraki dersler / o ayki toplam dersler
          const remaining = monthDates.filter(d => d >= start).length
          const total = monthDates.length
          if (total > 0) amount = Math.round(monthlyPrice * remaining / total)
        }
        const key = `${refType}-${refId}-${period}`
        const existing = payMap.get(key)
        built.push({
          key, ref_type: refType, ref_id: refId,
          student_name: studentName, student_email: studentEmail, label,
          period,
          amount: existing?.amount != null ? Number(existing.amount) : amount,
          paid: existing?.paid ?? false,
          method: existing?.method ?? null,
        })
      })
    }

    for (const c of courses ?? []) {
      const sessions = ((c as any).course_sessions ?? []).map((s: any) => s.session_date)
      for (const e of (c as any).course_enrollments ?? []) {
        if (e.status === 'cancelled') continue
        buildSubscription('course', e.id, e.student_name, e.student_email, (c as any).title, Number((c as any).monthly_price ?? 0), e.created_at, sessions)
      }
    }

    for (const r of requests ?? []) {
      const sessions = slotsBySeries[(r as any).series_id] ?? []
      const start = (r as any).requested_date ?? (r as any).created_at
      buildSubscription('lesson', (r as any).id, (r as any).student_name, (r as any).student_email, (r as any).subject ?? 'Özel Ders', Number((r as any).monthly_price ?? 0), start, sessions)
    }

    built.sort((a, b) => b.period.localeCompare(a.period) || a.student_name.localeCompare(b.student_name))
    setRows(built)
    setLoading(false)
  }, [venueId, supabase, router])

  useEffect(() => { load() }, [load])

  async function togglePaid(row: Row, method?: string) {
    setSaving(row.key)
    const newPaid = !row.paid
    await supabase.from('aidat_payments').upsert({
      venue_id: venueId,
      ref_type: row.ref_type,
      ref_id: row.ref_id,
      student_name: row.student_name,
      student_email: row.student_email,
      label: row.label,
      period: row.period,
      amount: row.amount,
      paid: newPaid,
      paid_at: newPaid ? new Date().toISOString() : null,
      method: newPaid ? (method ?? row.method ?? 'cash') : null,
    } as any, { onConflict: 'ref_type,ref_id,period' })
    setRows(prev => prev.map(r => r.key === row.key ? { ...r, paid: newPaid, method: newPaid ? (method ?? r.method ?? 'cash') : null } : r))
    setSaving(null)
  }

  const nowPeriod = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`

  // Kursiyerlere göre grupla
  type Student = { key: string; name: string; email: string; rows: Row[]; offerings: string[]; pending: number; active: boolean }
  const studentMap = new Map<string, Student>()
  for (const r of rows) {
    const key = (r.student_email || r.student_name || '').toLowerCase() + '|' + r.student_name.toLowerCase()
    if (!studentMap.has(key)) studentMap.set(key, { key, name: r.student_name, email: r.student_email, rows: [], offerings: [], pending: 0, active: false })
    const s = studentMap.get(key)!
    s.rows.push(r)
    if (!s.offerings.includes(r.label)) s.offerings.push(r.label)
    if (!r.paid) s.pending += r.amount
    if (r.period >= nowPeriod) s.active = true
  }
  const allStudents = Array.from(studentMap.values()).sort((a, b) => a.name.localeCompare(b.name))

  const students = allStudents.filter(s =>
    (showPast || s.active) &&
    (!search || s.name.toLowerCase().includes(search.toLowerCase()))
  )

  const collected = rows.filter(r => r.paid).reduce((s, r) => s + r.amount, 0)
  const pending = rows.filter(r => !r.paid).reduce((s, r) => s + r.amount, 0)

  if (loading) return <div className="max-w-3xl mx-auto px-4 py-12 flex justify-center"><Loader2 size={24} className="animate-spin text-accent" /></div>

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
      <div>
        <Link href={`/dashboard/venue/${venueId}`} className="flex items-center gap-2 text-text-muted text-sm mb-4 hover:text-text-primary w-fit">
          <ArrowLeft size={16} /> {venue?.name}
        </Link>
        <h1 className="font-bebas text-4xl text-text-primary flex items-center gap-2"><Wallet size={28} className="text-accent" /> KURSİYERLER</h1>
      </div>

      {/* Özet */}
      <div className="grid grid-cols-2 gap-3">
        <div className="card p-4">
          <p className="text-text-muted text-xs">Tahsil Edilen</p>
          <p className="font-bebas text-2xl text-success">₺{collected}</p>
        </div>
        <div className="card p-4">
          <p className="text-text-muted text-xs">Bekleyen</p>
          <p className="font-bebas text-2xl text-yellow-400">₺{pending}</p>
        </div>
      </div>

      {/* Arama + geçmiş */}
      <div className="flex gap-2 items-center">
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Kursiyer ara..." className="input-field text-sm flex-1" />
        <label className="flex items-center gap-1.5 text-xs text-text-muted cursor-pointer whitespace-nowrap">
          <input type="checkbox" checked={showPast} onChange={e => setShowPast(e.target.checked)} />
          Geçmiş kursiyerler
        </label>
      </div>

      {/* Kursiyer listesi */}
      {students.length === 0 ? (
        <div className="card p-8 text-center text-text-muted text-sm">
          {allStudents.length === 0 ? 'Henüz kursiyer yok. Aylık kurs/ders açıp öğrenci kaydedildiğinde burada görünür.' : 'Aktif kursiyer yok. "Geçmiş kursiyerler" ile tümünü görebilirsin.'}
        </div>
      ) : (
        <div className="space-y-2">
          {students.map(stu => {
            const isOpen = expanded === stu.key
            return (
              <div key={stu.key} className="card overflow-hidden">
                {/* Kursiyer başlığı — tıklayınca açılır */}
                <button onClick={() => setExpanded(isOpen ? null : stu.key)} className="w-full p-3 flex items-center gap-3 text-left hover:bg-[rgba(228,224,216,0.03)] transition-colors">
                  <div className="flex-1 min-w-0">
                    <p className="text-text-primary text-sm font-medium truncate">{stu.name}</p>
                    <p className="text-text-muted text-xs mt-0.5">{stu.offerings.join(', ')}</p>
                  </div>
                  {stu.pending > 0 && <span className="text-yellow-400 text-xs font-medium flex-shrink-0">₺{stu.pending} bekliyor</span>}
                  {isOpen ? <ChevronDown size={16} className="text-text-muted flex-shrink-0" /> : <ChevronRight size={16} className="text-text-muted flex-shrink-0" />}
                </button>

                {/* Detay: kurslar + aidat dönemleri */}
                {isOpen && (
                  <div className="border-t border-[rgba(228,224,216,0.08)] p-3 space-y-3">
                    {stu.email && <p className="text-text-muted text-[11px]">{stu.email}</p>}
                    {stu.offerings.map(label => {
                      const offRows = stu.rows.filter(r => r.label === label).sort((a, b) => a.period.localeCompare(b.period))
                      return (
                        <div key={label}>
                          <p className="text-text-primary text-xs font-semibold mb-1.5">{label}</p>
                          <div className="space-y-1">
                            {offRows.map(row => (
                              <div key={row.key} className="flex items-center gap-2 text-xs">
                                <span className="text-text-muted flex-1">{periodLabel(row.period)}</span>
                                <span className="text-accent font-bebas">₺{row.amount}</span>
                                <button onClick={() => togglePaid(row)} disabled={saving === row.key}
                                  className={cn('px-2.5 py-1 rounded-lg border transition-colors flex items-center gap-1 disabled:opacity-40',
                                    row.paid ? 'bg-success/10 text-success border-success/30' : 'text-text-muted border-[rgba(228,224,216,0.15)] hover:border-accent/30 hover:text-accent'
                                  )}>
                                  {saving === row.key ? <Loader2 size={11} className="animate-spin" /> : row.paid ? <><Check size={11} /> Ödendi</> : 'Ödenmedi'}
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
