export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase/server'
import { getTranslations } from 'next-intl/server'
import Link from 'next/link'
import Image from 'next/image'
import { ArrowRight, BookOpen } from 'lucide-react'
import type { Metadata } from 'next'

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('courses')
  return { title: t('title') }
}

const CATEGORY_LABELS: Record<string, string> = {
  music: 'Müzik',
  dance: 'Dans',
  theater: 'Tiyatro',
  other: 'Diğer',
}

const LEVEL_LABELS: Record<string, string> = {
  beginner: 'Başlangıç',
  intermediate: 'Orta',
  advanced: 'İleri',
  all: 'Hepsi',
}

const TYPE_LABELS: Record<string, string> = {
  individual: 'Bireysel',
  group: 'Grup',
  package: 'Paket',
}

interface Props {
  params: Promise<{ locale: string }>
  searchParams: Promise<{ category?: string; level?: string; online?: string; instructor?: string; subcategory?: string }>
}

export default async function CoursesPage({ searchParams }: Props) {
  const sp = await searchParams
  const supabase = await createClient()

  let query = supabase
    .from('courses')
    .select('id, title, category, subcategory, course_type, level, price_per_session, currency, is_online, location, max_participants, min_female, min_male, instructor_id, profiles(display_name, avatar_url), course_sessions(id)')
    .eq('status', 'active')
    .order('created_at', { ascending: false })

  if (sp.category) query = query.eq('category', sp.category)
  if (sp.level) query = query.eq('level', sp.level)
  if (sp.online === '1') query = query.eq('is_online', true)
  if (sp.online === '0') query = query.eq('is_online', false)
  if (sp.instructor) query = query.eq('instructor_id', sp.instructor)
  if (sp.subcategory) query = query.ilike('subcategory', sp.subcategory)

  const { data: courses } = await query

  const categories = ['music', 'dance', 'theater', 'other']
  const levels = ['beginner', 'intermediate', 'advanced', 'all']

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="font-bebas text-5xl text-text-primary">KURSLAR</h1>
        <p className="text-text-muted text-sm mt-1">
          {sp.subcategory ? `${sp.subcategory} dersleri` : 'Müzik, dans ve tiyatro dersleri'}
        </p>
      </div>

      {/* Filtreler */}
      <div className="flex flex-wrap gap-2 mb-6">
        <Link
          href="/courses"
          className={`chip border text-xs transition-colors ${!sp.category && !sp.level && !sp.online ? 'bg-accent/10 text-accent border-accent/30' : 'text-text-muted border-[rgba(228,224,216,0.1)] hover:text-text-primary'}`}
        >
          Tümü
        </Link>
        {categories.map((cat) => (
          <Link
            key={cat}
            href={`/courses?category=${cat}${sp.level ? `&level=${sp.level}` : ''}`}
            className={`chip border text-xs transition-colors ${sp.category === cat ? 'bg-accent/10 text-accent border-accent/30' : 'text-text-muted border-[rgba(228,224,216,0.1)] hover:text-text-primary'}`}
          >
            {CATEGORY_LABELS[cat]}
          </Link>
        ))}
        <div className="w-px h-5 bg-[rgba(228,224,216,0.1)] self-center mx-1" />
        {levels.map((lvl) => (
          <Link
            key={lvl}
            href={`/courses?level=${lvl}${sp.category ? `&category=${sp.category}` : ''}`}
            className={`chip border text-xs transition-colors ${sp.level === lvl ? 'bg-accent/10 text-accent border-accent/30' : 'text-text-muted border-[rgba(228,224,216,0.1)] hover:text-text-primary'}`}
          >
            {LEVEL_LABELS[lvl]}
          </Link>
        ))}
        <div className="w-px h-5 bg-[rgba(228,224,216,0.1)] self-center mx-1" />
        <Link
          href={`/courses?${sp.category ? `category=${sp.category}&` : ''}online=1`}
          className={`chip border text-xs transition-colors ${sp.online === '1' ? 'bg-accent/10 text-accent border-accent/30' : 'text-text-muted border-[rgba(228,224,216,0.1)] hover:text-text-primary'}`}
        >
          Online
        </Link>
        <Link
          href={`/courses?${sp.category ? `category=${sp.category}&` : ''}online=0`}
          className={`chip border text-xs transition-colors ${sp.online === '0' ? 'bg-accent/10 text-accent border-accent/30' : 'text-text-muted border-[rgba(228,224,216,0.1)] hover:text-text-primary'}`}
        >
          Yüz Yüze
        </Link>
      </div>

      {/* Kurs listesi */}
      {(!courses || courses.length === 0) ? (
        <div className="text-center py-16">
          <BookOpen size={40} className="text-text-muted mx-auto mb-4 opacity-40" />
          <p className="text-text-muted">Bu kriterlere uygun kurs bulunamadı.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {courses.map((course: any) => {
            const instructor = course.profiles
            const sessionCount = course.course_sessions?.length ?? 0
            return (
              <Link
                key={course.id}
                href={`/courses/${course.id}`}
                className="card p-4 hover:border-accent/30 transition-colors flex flex-col gap-3"
              >
                {/* Instructor */}
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-accent/10 flex-shrink-0 overflow-hidden flex items-center justify-center text-accent font-bold text-xs">
                    {instructor?.avatar_url ? (
                      <Image src={instructor.avatar_url} alt={instructor.display_name} width={32} height={32} className="object-cover w-full h-full" />
                    ) : (
                      instructor?.display_name?.[0]?.toUpperCase() ?? '?'
                    )}
                  </div>
                  <span className="text-text-muted text-xs truncate">{instructor?.display_name ?? '—'}</span>
                </div>

                <div>
                  <h3 className="font-semibold text-text-primary text-sm leading-snug">{course.title}</h3>
                  {course.subcategory && (
                    <p className="text-text-muted text-xs mt-0.5">{course.subcategory}</p>
                  )}
                </div>

                <div className="flex flex-wrap gap-1.5">
                  <span className="chip bg-accent/10 text-accent border border-accent/20 text-[10px]">
                    {CATEGORY_LABELS[course.category] ?? course.category}
                  </span>
                  <span className="chip bg-[rgba(228,224,216,0.06)] text-text-muted border border-[rgba(228,224,216,0.1)] text-[10px]">
                    {TYPE_LABELS[course.course_type] ?? course.course_type}
                  </span>
                  {course.level && (
                    <span className="chip bg-[rgba(228,224,216,0.06)] text-text-muted border border-[rgba(228,224,216,0.1)] text-[10px]">
                      {LEVEL_LABELS[course.level] ?? course.level}
                    </span>
                  )}
                  {course.is_online && (
                    <span className="chip bg-success/10 text-success border border-success/20 text-[10px]">Online</span>
                  )}
                </div>

                <div className="flex items-center justify-between mt-auto pt-2 border-t border-[rgba(228,224,216,0.08)]">
                  <div>
                    <span className="font-bebas text-xl text-accent">₺{course.price_per_session}</span>
                    <span className="text-text-muted text-xs ml-1">seans başı</span>
                  </div>
                  <div className="flex items-center gap-1 text-text-muted text-xs">
                    <span>{sessionCount} seans</span>
                    <ArrowRight size={12} className="text-accent" />
                  </div>
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
