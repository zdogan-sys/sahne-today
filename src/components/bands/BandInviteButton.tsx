'use client'

import { useState } from 'react'
import { UserPlus } from 'lucide-react'
import { BottomSheet } from '@/components/ui/BottomSheet'
import { BandInviteSearch } from './BandInviteSearch'

interface Props {
  bandId: string
  existingMembers: { artist_id: string; status: string; role: string | null }[]
}

export function BandInviteButton({ bandId, existingMembers }: Props) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="btn-outline w-full py-3 flex items-center justify-center gap-2"
      >
        <UserPlus size={16} />
        Yeni Üye Davet Et
      </button>

      <BottomSheet open={open} onClose={() => setOpen(false)} title="Yeni Üye Davet Et">
        <BandInviteSearch
          bandId={bandId}
          existingMembers={existingMembers}
        />
      </BottomSheet>
    </>
  )
}
