export const dynamic = 'force-dynamic'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Plus, BookOpen, Users, ArrowLeft } from 'lucide-react'

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  active: { label: 'Aktif', color: 'text-success bg-success/10 border-success/20' },
  paused: { label: 'Durduruldu', color: 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20' },
  full: { label: 'Dolu', color: 'text-text-muted bg-[rgba(228,224,216,0.06)] border-[rgba(228,224,216,0.1)]' },
  cancelled: { label: 'İptal', color: 'text-red-400 bg-red-400/10 border-red-400/20' },
}

const CATEGORY_LABELS: Record<string, string> = {
  music: 'Müzik', dance: 'Dans', theater: 'Tiyatro', other: 'Diğer',
}

export default async function DashboardCoursesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth')

  const { data: profile } = await supabase
    .from('profiles')
    .select('is_pro_individual')
    .eq('id', user.id)
    .single()

  if (!(profile as any)?.is_pro_individual) redirect('/dashboard')

  const { data: courses } = await supabase
    .from('courses')
    .select('id, title, category, course_type, level, price_per_session, status, max_participants, created_at, course_sessions(id, status), course_enrollments(id, status)')
    .eq('instructor_id', user.id)
    .order('created_at', { ascending: false })

  return (
    <div className="max-w-3xl mx-auto px-4 py-6">
      <Link href="/dashboard" className="flex items-center gap-2 text-text-muted text-sm mb-6 hover:text-text-primary w-fit">
        <ArrowLeft size={16} /> Dashboard
      </Link>

      <div className="flex items-center justify-between mb-6">
        <h1 className="font-bebas text-4xl text-text-primary">KURSLARIM</h1>
        <Link href="/dashboard/courses/new" className="btn-accent py-2 px-4 text-sm flex items-center gap-2">
          <Plus size={14} /> Yeni Kurs
        </Link>
      </div>

      {(!courses || courses.length === 0) ? (
        <div className="card p-8 text-center">
          <BookOpen size={36} className="text-text-muted mx-auto mb-3 opacity-40" />
          <p className="text-text-muted text-sm">Henüz kurs oluşturmadınız.</p>
          <Link href="/dashboard/courses/new" className="text-accent mt-2 block hover:underline">
            İlk kursunu oluştur →
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {(courses ?? []).map((course: any) => {
            const sessions: any[] = course.course_sessions ?? []
            const enrollments: any[] = course.course_enrollments ?? []
            const confirmedEnrollments = enrollments.filter((e: any) => e.status === 'confirmed').length
            const pendingEnrollments = enrollments.filter((e: any) => e.status === 'pending').length
            const availableSessions = sessions.filter((s: any) => s.status === 'available').length
            const statusCfg = STATUS_LABELS[course.status] ?? STATUS_LABELS.active

            return (
              <div key={course.id} className="card p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <h3 className="font-semibold text-text-primary">{course.title}</h3>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded border ${statusCfg.color}`}>
                        {statusCfg.label}
                      </span>
                    </div>
                    <p className="text-text-muted text-xs">
                      {CATEGORY_LABELS[course.category] ?? course.category}
                      {course.level ? ` · ${course.level}` : ''}
                      {' · '}₺{course.price_per_session} / seans
                    </p>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <Link
                      href={`/dashboard/courses/${course.id}`}
                      className="text-xs text-accent hover:underline"
                    >
                      Seanslar →
                    </Link>
                    <Link
                      href={`/courses/${course.id}`}
                      className="text-xs text-text-muted hover:underline"
                      target="_blank"
                    >
                      Görüntüle
                    </Link>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3 mt-3 pt-3 border-t border-[rgba(228,224,216,0.08)]">
                  <div className="text-center">
                    <p className="font-bebas text-2xl text-accent">{availableSessions}</p>
                    <p className="text-text-muted text-[10px] uppercase tracking-wide">Müsait Seans</p>
                  </div>
                  <div className="text-center">
                    <p className="font-bebas text-2xl text-accent">{confirmedEnrollments}</p>
                    <p className="text-text-muted text-[10px] uppercase tracking-wide">Kayıtlı</p>
                  </div>
                  <div className="text-center">
                    <p className={`font-bebas text-2xl ${pendingEnrollments > 0 ? 'text-yellow-400' : 'text-text-muted'}`}>
                      {pendingEnrollments}
                    </p>
                    <p className="text-text-muted text-[10px] uppercase tracking-wide">Bekleyen</p>
                  </div>
                </div>

                {pendingEnrollments > 0 && (
                  <div className="mt-3 pt-3 border-t border-[rgba(228,224,216,0.08)]">
                    <PendingEnrollments courseId={course.id} count={pendingEnrollments} />
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

function PendingEnrollments({ courseId, count }: { courseId: string; count: number }) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-1.5 text-yellow-400 text-xs">
        <Users size={12} />
        <span>{count} bekleyen kayıt isteği</span>
      </div>
      <Link
        href={`/dashboard/courses/${courseId}/enrollments`}
        className="text-xs text-accent hover:underline"
      >
        İncele →
      </Link>
    </div>
  )
}
