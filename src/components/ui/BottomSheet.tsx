'use client'

import { useEffect } from 'react'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'

interface BottomSheetProps {
  open: boolean
  onClose: () => void
  title?: string
  children: React.ReactNode
  className?: string
}

export function BottomSheet({ open, onClose, title, children, className }: BottomSheetProps) {
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [open])

  if (!open) return null

  return (
    <>
      <div
        className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      <div
        className={cn(
          'fixed bottom-0 left-0 right-0 z-50 bg-surface rounded-t-2xl border-t border-[rgba(228,224,216,0.1)] p-4 pb-safe-area-inset-bottom',
          'max-h-[90vh] overflow-y-auto',
          className
        )}
      >
        <div className="flex items-center justify-between mb-4">
          {title && <h3 className="font-semibold text-text-primary">{title}</h3>}
          <button
            onClick={onClose}
            className="ml-auto p-1 text-text-muted hover:text-text-primary"
          >
            <X size={18} />
          </button>
        </div>
        {children}
      </div>
    </>
  )
}
