import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export { GENRE_COLORS, getGenreColor } from '@/lib/constants'

export const INSTRUMENT_LABELS_EN: Record<string, string> = {
  'Gitar': 'Guitar',
  'Bas': 'Bass',
  'Davul': 'Drums',
  'Klavye': 'Keyboard',
  'Keman': 'Violin',
  'Vokal': 'Vocals',
  'Saz': 'Saz',
  'Flüt': 'Flute',
  'Trompet': 'Trumpet',
  'Ud': 'Oud',
}

export function translateInstrument(instrument: string, locale: string): string {
  if (locale !== 'en') return instrument
  return INSTRUMENT_LABELS_EN[instrument] ?? instrument
}

// Genre değerleri DB'de Türkçe saklanır; sadece görünüm İngilizce'ye çevrilir.
export const GENRE_LABELS_EN: Record<string, string> = {
  'Akustik': 'Acoustic',
  'Caz': 'Jazz',
  'Elektronik': 'Electronic',
  'Klasik': 'Classical',
  'Etnik': 'Ethnic',
  'Türkü': 'Folk',
  'Doğaçlama': 'Improvisation',
  'Alternatif Sahne': 'Alternative Stage',
}

export function translateGenre(genre: string, locale: string): string {
  if (locale !== 'en') return genre
  return GENRE_LABELS_EN[genre] ?? genre
}

export const VENUE_TYPE_LABELS: Record<string, string> = {
  pub: 'Pub',
  turku_bar: 'Türkü Bar',
  live_music: 'Canlı Müzik',
  bookstore: 'Kitabevi',
  theater: 'Tiyatro',
  cafe: 'Kafe',
  studio: 'Prova / Kayıt Stüdyosu',
  dance_studio: 'Dans Stüdyosu',
  music_school: 'Müzik Dersanesi',
  other: 'Diğer',
}

export const VENUE_TYPE_LABELS_EN: Record<string, string> = {
  pub: 'Pub',
  turku_bar: 'Turkish Folk Bar',
  live_music: 'Live Music Venue',
  bookstore: 'Bookstore',
  theater: 'Theater',
  cafe: 'Cafe',
  studio: 'Rehearsal / Recording Studio',
  dance_studio: 'Dance Studio',
  music_school: 'Music School',
  other: 'Other',
}

export function translateVenueType(key: string, locale: string): string {
  const map = locale === 'en' ? VENUE_TYPE_LABELS_EN : VENUE_TYPE_LABELS
  return map[key] ?? key
}

export const DAY_NAMES_TR = ['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi']
export const DAY_NAMES_EN = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

export function getDayNames(locale: string): string[] {
  return locale === 'tr' ? DAY_NAMES_TR : DAY_NAMES_EN
}

export const FEE_MODEL_LABELS: Record<string, string> = {
  free: 'Ücretsiz',
  door_share: 'Kapı Paylaşımı',
  guarantee: 'Garanti',
  negotiable: 'Pazarlığa Açık',
}

export function formatTime(time: string): string {
  return time.substring(0, 5)
}

export function formatDate(dateStr: string, locale: string = 'en'): string {
  const date = new Date(dateStr)
  const localeStr = locale === 'tr' ? 'tr-TR' : 'en-US'
  return date.toLocaleDateString(localeStr, { day: 'numeric', month: 'long', year: 'numeric' })
}

export function getYouTubeThumbnail(url: string): string | null {
  const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\s]+)/)
  if (match) return `https://img.youtube.com/vi/${match[1]}/hqdefault.jpg`
  return null
}

export function getVideoEmbedUrl(url: string): string | null {
  const ytMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\s]+)/)
  if (ytMatch) return `https://www.youtube.com/embed/${ytMatch[1]}`

  const vimeoMatch = url.match(/vimeo\.com\/(\d+)/)
  if (vimeoMatch) return `https://player.vimeo.com/video/${vimeoMatch[1]}`

  return null
}
