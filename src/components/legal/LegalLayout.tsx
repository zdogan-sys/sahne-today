import { Link } from '@/i18n/navigation'
import { ArrowLeft } from 'lucide-react'

export function LegalLayout({
  title,
  englishNotice,
  children,
}: {
  title: string
  englishNotice?: string
  children: React.ReactNode
}) {
  return (
    <div className="max-w-2xl mx-auto px-4 py-10">
      <Link href="/" className="inline-flex items-center gap-1.5 text-text-muted text-sm hover:text-accent transition-colors mb-6">
        <ArrowLeft size={16} />
        Ana Sayfa
      </Link>
      <h1 className="font-bebas text-4xl text-accent mb-6">{title}</h1>
      {englishNotice && (
        <p className="text-text-muted text-sm border border-[rgba(228,224,216,0.15)] rounded-lg px-4 py-3 mb-8">
          {englishNotice}
        </p>
      )}
      <div className="space-y-6 text-text-primary text-sm leading-relaxed [&_h2]:font-bebas [&_h2]:text-xl [&_h2]:text-text-primary [&_h2]:mt-8 [&_h2]:mb-2 [&_p]:text-text-muted [&_li]:text-text-muted [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:space-y-1">
        {children}
      </div>
    </div>
  )
}
