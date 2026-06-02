import Link from 'next/link'
import { Check, BookOpen, GraduationCap } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'

export default async function ProSuccessPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const hasArtist = user
    ? !!(await supabase.from('artists').select('id').eq('profile_id', user.id).maybeSingle()).data
    : false

  const venues = user
    ? (await supabase.from('venues').select('id, name').eq('owner_id', user.id)).data ?? []
    : []

  return (
    <div className="max-w-md mx-auto px-4 py-16 text-center space-y-8">
      <div>
        <div className="w-16 h-16 rounded-full bg-success/15 flex items-center justify-center mx-auto mb-4">
          <Check size={28} className="text-success" />
        </div>
        <h1 className="font-bebas text-4xl text-text-primary mb-2">HOŞ GELDİN, PRO!</h1>
        <p className="text-text-muted text-sm">Ödemen onaylandı. Pro özellikler hesabında aktif edildi.</p>
      </div>

      <div className="space-y-3 text-left">
        <p className="text-text-muted text-xs uppercase tracking-wider font-medium">Şimdi ne yapabilirsin?</p>

        {hasArtist && (
          <>
            <Link href="/dashboard/teaching-slots" className="card p-4 flex items-center gap-3 hover:border-accent/30 transition-colors">
              <div className="w-9 h-9 rounded-lg bg-accent/10 flex items-center justify-center flex-shrink-0">
                <GraduationCap size={16} className="text-accent" />
              </div>
              <div>
                <p className="text-text-primary text-sm font-medium">Ders Saatlerini Ayarla</p>
                <p className="text-text-muted text-xs mt-0.5">Özel ders slotları oluştur ve öğrenci al</p>
              </div>
              <span className="ml-auto text-accent text-sm">→</span>
            </Link>
            <Link href="/dashboard/courses/new" className="card p-4 flex items-center gap-3 hover:border-accent/30 transition-colors">
              <div className="w-9 h-9 rounded-lg bg-accent/10 flex items-center justify-center flex-shrink-0">
                <BookOpen size={16} className="text-accent" />
              </div>
              <div>
                <p className="text-text-primary text-sm font-medium">Kurs Oluştur</p>
                <p className="text-text-muted text-xs mt-0.5">Grup kursu programla, kayıtları al</p>
              </div>
              <span className="ml-auto text-accent text-sm">→</span>
            </Link>
          </>
        )}

        {venues.map((v: any) => (
          <Link key={v.id} href={`/dashboard/venue/${v.id}/teaching-slots`} className="card p-4 flex items-center gap-3 hover:border-accent/30 transition-colors">
            <div className="w-9 h-9 rounded-lg bg-accent/10 flex items-center justify-center flex-shrink-0">
              <GraduationCap size={16} className="text-accent" />
            </div>
            <div>
              <p className="text-text-primary text-sm font-medium">{v.name} — Ders Saatleri</p>
              <p className="text-text-muted text-xs mt-0.5">Mekan için özel ders slotları oluştur</p>
            </div>
            <span className="ml-auto text-accent text-sm">→</span>
          </Link>
        ))}
      </div>

      <Link href="/dashboard" className="text-text-muted text-sm hover:text-text-primary block">
        Dashboard'a dön →
      </Link>
    </div>
  )
}
