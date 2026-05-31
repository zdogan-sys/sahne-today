'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export function SuccessPoller({ orderId, eventId }: { orderId: string; eventId: string }) {
  const router = useRouter()

  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/tickets/status?order_id=${orderId}`)
        const data = await res.json()
        if (data.status === 'paid' || data.status === 'used') {
          router.refresh()
        }
      } catch {}
    }, 3000)

    return () => clearInterval(interval)
  }, [orderId, eventId, router])

  return null
}
