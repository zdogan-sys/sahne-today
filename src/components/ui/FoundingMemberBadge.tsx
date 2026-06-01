import { Star } from 'lucide-react'
import { useLocale } from 'next-intl'

interface Props {
  size?: 'sm' | 'md'
}

export function FoundingMemberBadge({ size = 'sm' }: Props) {
  const locale = useLocale()
  const label = locale === 'en' ? 'Founding Member' : 'Kurucu Üye'

  if (size === 'md') {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-400/15 border border-amber-400/30 text-amber-400 text-xs font-semibold">
        <Star size={11} className="fill-amber-400" />
        {label}
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-400/15 border border-amber-400/30 text-amber-400 text-[10px] font-semibold">
      <Star size={9} className="fill-amber-400" />
      {label}
    </span>
  )
}
