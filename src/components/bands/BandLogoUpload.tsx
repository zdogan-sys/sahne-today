'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { ImageUpload } from '@/components/ui/ImageUpload'

export function BandLogoUpload({ bandId, initialUrl }: { bandId: string; initialUrl: string }) {
  const [url, setUrl] = useState(initialUrl)
  const [saving, setSaving] = useState(false)
  const supabase = createClient()

  async function handleChange(newUrl: string) {
    setUrl(newUrl)
    setSaving(true)
    await supabase.from('bands').update({ photo_url: newUrl || null } as any).eq('id', bandId)
    setSaving(false)
  }

  return (
    <div>
      <ImageUpload
        value={url}
        onChange={handleChange}
        bucket="avatars"
        label={`Grup Logosu${saving ? ' · Kaydediliyor...' : ''}`}
      />
    </div>
  )
}
