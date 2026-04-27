import Link from 'next/link'
import { Calendar, Music, Users } from 'lucide-react'

export function AudienceDashboard() {
  return (
    <div className="space-y-6">
      <p className="text-text-muted text-sm">Etkinlikleri keşfet, sanatçıları takip et, mekanlara gideceklerini işaretle.</p>

      <div className="grid gap-4 md:grid-cols-3">
        <Link href="/events" className="card p-5 hover:border-accent/30 transition-colors flex items-start gap-4">
          <Calendar size={20} className="text-accent flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-semibold text-text-primary text-sm">Etkinlikler</h3>
            <p className="text-text-muted text-xs mt-1">Bu haftanın performanslarını gör</p>
          </div>
        </Link>

        <Link href="/venues" className="card p-5 hover:border-accent/30 transition-colors flex items-start gap-4">
          <Music size={20} className="text-accent flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-semibold text-text-primary text-sm">Mekanlar</h3>
            <p className="text-text-muted text-xs mt-1">Yakınındaki mekanları keşfet</p>
          </div>
        </Link>

        <Link href="/artists" className="card p-5 hover:border-accent/30 transition-colors flex items-start gap-4">
          <Users size={20} className="text-accent flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-semibold text-text-primary text-sm">Sanatçılar</h3>
            <p className="text-text-muted text-xs mt-1">Bağımsız sanatçıları keşfet</p>
          </div>
        </Link>
      </div>

      <div className="card p-6 text-center">
        <p className="text-text-muted text-sm mb-4">
          Sanatçı veya mekan mı olacaksınız?
        </p>
        <div className="flex gap-3 justify-center">
          <Link href="/artists/register" className="btn-accent text-sm py-2 px-4">Sanatçı Ol</Link>
          <Link href="/venues/register" className="btn-outline text-sm py-2 px-4">Mekan Ekle</Link>
        </div>
      </div>
    </div>
  )
}
