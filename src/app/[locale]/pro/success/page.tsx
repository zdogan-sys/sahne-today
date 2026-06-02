import Link from 'next/link'
import { Check } from 'lucide-react'

export default function ProSuccessPage() {
  return (
    <div className="max-w-md mx-auto px-4 py-20 text-center">
      <div className="w-16 h-16 rounded-full bg-success/15 flex items-center justify-center mx-auto mb-6">
        <Check size={28} className="text-success" />
      </div>
      <h1 className="font-bebas text-4xl text-text-primary mb-2">HOŞ GELDİN, PRO!</h1>
      <p className="text-text-muted text-sm mb-6">Ödemen onaylandı. Pro özellikler hesabında aktif edildi.</p>
      <Link href="/dashboard" className="btn-accent py-3 px-8 text-sm inline-block">Dashboard'a Git →</Link>
    </div>
  )
}
