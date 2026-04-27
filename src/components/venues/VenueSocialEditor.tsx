'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { SocialLinksEditor, type SocialLinksData } from '@/components/ui/SocialLinksEditor'

interface Props {
  venueId: string
  initialLinks: SocialLinksData
}

export function VenueSocialEditor({ venueId, initialLinks }: Props) {
  const [links, setLinks] = useState<SocialLinksData>(initialLinks)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const supabase = createClient()

  async function handleSave() {
    setSaving(true)
    await supabase.from('venues').update({ social_links: links } as any).eq('id', venueId)
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div className="space-y-3">
      <SocialLinksEditor value={links} onChange={setLinks} />
      <button onClick={handleSave} disabled={saving}
        className="btn-outline text-sm py-2 px-4 disabled:opacity-40">
        {saving ? 'Kaydediliyor...' : saved ? '✓ Kaydedildi' : 'Kaydet'}
      </button>
    </div>
  )
}
