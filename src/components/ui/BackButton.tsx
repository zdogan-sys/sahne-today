'use client'

import { useRouter } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'

interface Props {
  fallbackHref?: string
  fallbackLabel?: string
}

export function BackButton({ fallbackHref = '/events', fallbackLabel = 'Geri' }: Props) {
  const router = useRouter()

  function handleClick() {
    if (window.history.length > 1) {
      router.back()
    } else {
      router.push(fallbackHref)
    }
  }

  return (
    <button
      onClick={handleClick}
      className="flex items-center gap-2 text-text-muted text-sm mb-6 hover:text-text-primary transition-colors"
    >
      <ArrowLeft size={16} />
      {fallbackLabel}
    </button>
  )
}
