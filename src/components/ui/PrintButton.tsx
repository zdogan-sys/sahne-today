'use client'

import { Printer } from 'lucide-react'

export function PrintButton() {
  return (
    <button
      onClick={() => window.print()}
      className="flex items-center gap-2 px-4 py-2 rounded-lg border border-[rgba(228,224,216,0.15)] text-text-muted text-sm font-semibold hover:text-text-primary hover:border-[rgba(228,224,216,0.3)] transition-colors"
    >
      <Printer size={15} />
      Yazdır
    </button>
  )
}
