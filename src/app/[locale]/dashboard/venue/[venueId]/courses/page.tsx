'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Plus, Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

export default function VenueCoursesPage() {
  const router = useRouter()
  const params = useParams()
  const venueId = params.venueId as string
  const supabase = createClient()

  const [venue, setVenue] = useState<any>(null)
  const [courses, setCourses] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    load()
  }, [])

  async function load() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/auth'); return }

    const { data: venueData } = await supabase
      .from('venues')
      .select('id, name, owner_id')
      .eq('id', venueId)
      .single()

    if (!venueData || venueData.owner_id !== user.id) {
      router.push('/dashboard')
      return
    }

    setVenue(venueData)

    const { data: coursesData } = await supabase
      .from('courses')
      .select('id, title, category, level, price_per_session, max_participants, status, created_at, course_sessions(session_date)')
      .eq('venue_id', venueId)
      .order('created_at', { ascending: false })

    // Başlangıç tarihini hesapla, en yeni tarihliyi en üste al (sondan geriye)
    const withDates = (coursesData ?? []).map((c: any) => {
      const dates = (c.course_sessions ?? []).map((s: any) => s.session_date).filter(Boolean).sort()
      return { ...c, startDate: dates[0] ?? null, endDate: dates[dates.length - 1] ?? null }
    })
    withDates.sort((a: any, b: any) => {
      const av = a.startDate ?? a.created_at ?? ''
      const bv = b.startDate ?? b.created_at ?? ''
      return bv.localeCompare(av)
    })

    setCourses(withDates)
    setLoading(false)
  }

  function fmtDate(d: string | null) {
    if (!d) return null
    return new Date(d + 'T00:00:00').toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' })
  }

  if (loading) return (
    <div className="max-w-2xl mx-auto px-4 py-12 flex justify-center">
      <Loader2 size={24} className="animate-spin text-accent" />
    </div>
  )

  if (!venue) return (
    <div className="max-w-2xl mx-auto px-4 py-12 text-center">
      <p className="text-text-muted">Mekan bulunamadı.</p>
      <Link href="/dashboard" className="text-accent mt-2 block">Dashboard'a dön →</Link>
    </div>
  )

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
      <div>
        <Link href="/dashboard" className="flex items-center gap-2 text-text-muted text-sm mb-4 hover:text-text-primary w-fit">
          <ArrowLeft size={16} /> Dashboard
        </Link>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-bebas text-4xl text-text-primary">{venue.name}</h1>
            <p className="text-text-muted text-sm mt-0.5">Kurslar</p>
          </div>
          <Link href={`/dashboard/venue/${venueId}/courses/new`} className="btn-accent py-2 px-4 text-sm flex items-center gap-1.5">
            <Plus size={14} /> Yeni Kurs
          </Link>
        </div>
      </div>

      {courses.length > 0 ? (
        <div className="space-y-2">
          {courses.map(course => (
            <Link key={course.id} href={`/courses/${course.id}`} className="card p-4 hover:border-accent/30 transition-colors block">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  {course.startDate && (
                    <p className="text-accent text-xs font-medium mb-1">
                      {fmtDate(course.startDate)}{course.endDate && course.endDate !== course.startDate ? ` – ${fmtDate(course.endDate)}` : ''}
                    </p>
                  )}
                  <p className="font-semibold text-text-primary">{course.title}</p>
                  <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                    <span className="text-[10px] px-2 py-0.5 rounded border border-[rgba(228,224,216,0.15)] text-text-muted">
                      {course.category}
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded border border-accent/20 text-accent bg-accent/5">
                      {course.level}
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded border border-[rgba(228,224,216,0.15)] text-text-muted">
                      Maks {course.max_participants}
                    </span>
                  </div>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="font-bebas text-accent text-lg">₺{course.price_per_session}</p>
                  <p className="text-text-muted text-xs">toplam</p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="card p-8 text-center text-text-muted text-sm">
          <p>Henüz kurs eklenmedi.</p>
          <Link href={`/dashboard/venue/${venueId}/courses/new`} className="text-accent mt-2 block hover:underline">Yeni kurs ekle →</Link>
        </div>
      )}
    </div>
  )
}
