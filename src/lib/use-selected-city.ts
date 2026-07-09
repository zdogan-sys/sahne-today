'use client'

import { useState, useEffect } from 'react'
import { cityFromSlug } from '@/lib/cities'

// Global şehir seçimini okur ve değişimini dinler.
// Öncelik URL'deki ?city= parametresinde, yoksa TopNav'ın localStorage değeri.
// 'Tümü' / boş → '' döner (tüm şehirler). Diğer durumda şehir adını döner.
export function useSelectedCity(): string {
  const [city, setCity] = useState('')
  useEffect(() => {
    const read = () => {
      const urlSlug = new URLSearchParams(window.location.search).get('city')
      const urlCity = urlSlug ? cityFromSlug(urlSlug) : null
      const c = urlCity ?? localStorage.getItem('sahne_city')
      setCity(c && c !== 'Tümü' ? c : '')
    }
    read()
    window.addEventListener('city_changed', read)
    return () => window.removeEventListener('city_changed', read)
  }, [])
  return city
}
