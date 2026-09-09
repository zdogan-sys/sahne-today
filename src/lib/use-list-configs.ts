'use client'

import { useState, useEffect } from 'react'
import { getListConfigs, type ListConfigKey } from '@/app/actions/site'
import { MUSIC_GENRES, STAGE_GENRES, INSTRUMENT_OPTIONS, DANCE_OPTIONS } from '@/lib/constants'

const DEFAULTS: Record<ListConfigKey, string[]> = {
  music_genres: MUSIC_GENRES,
  stage_genres: STAGE_GENRES,
  instruments: INSTRUMENT_OPTIONS,
  dance_types: DANCE_OPTIONS,
}

// Admin panelinde düzenlenen türler/enstrümanlar tüm istemcilerde paylaşılsın
// diye modül seviyesinde cache'lenir — sayfa başına tekrar fetch edilmez.
let cache: Record<ListConfigKey, string[]> | null = null
let inflight: Promise<Record<ListConfigKey, string[]>> | null = null

// Admin panelinde kaydedilen tür/enstrüman listelerini okur (site_settings
// tablosu). Sabit constants.ts listeleri sadece ilk render ve DB'ye
// ulaşılamama durumunda fallback olarak kullanılır.
export function useListConfigs() {
  const [configs, setConfigs] = useState<Record<ListConfigKey, string[]>>(cache ?? DEFAULTS)

  useEffect(() => {
    if (cache) { setConfigs(cache); return }
    if (!inflight) inflight = getListConfigs()
    let active = true
    inflight.then((c) => {
      cache = c
      if (active) setConfigs(c)
    })
    return () => { active = false }
  }, [])

  return {
    musicGenres: configs.music_genres,
    stageGenres: configs.stage_genres,
    instruments: configs.instruments,
    danceTypes: configs.dance_types,
    allGenres: [...configs.music_genres, ...configs.stage_genres],
  }
}
