'use client'

import { Lock } from 'lucide-react'

export function PremiumGate() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[40vh] px-6 text-center gap-4">
      <div className="w-14 h-14 rounded-full bg-accent/10 flex items-center justify-center">
        <Lock size={24} className="text-accent" />
      </div>
      <div>
        <h2 className="font-bebas text-2xl text-text-primary mb-1">Premium Özellik</h2>
        <p className="text-text-muted text-sm leading-relaxed max-w-xs">
          Mesajlaşma özelliği şu an premium üyelere özeldir.
          Daha fazla bilgi için bizimle iletişime geçin.
        </p>
      </div>
    </div>
  )
}
