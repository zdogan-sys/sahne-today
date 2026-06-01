'use client'

import { useLocale } from 'next-intl'
import { SOCIAL_PLATFORMS, type SocialLinksData } from './SocialLinks'

export type { SocialLinksData }

interface Props {
  value: SocialLinksData
  onChange: (v: SocialLinksData) => void
}

export function SocialLinksEditor({ value, onChange }: Props) {
  const isEn = useLocale() === 'en'
  function update(key: string, url: string) {
    onChange({ ...value, [key]: url || undefined })
  }

  return (
    <div>
      <label className="label">{isEn ? 'Social Media' : 'Sosyal Medya'}</label>
      <div className="space-y-2">
        {SOCIAL_PLATFORMS.map(({ key, label, placeholder, icon: Icon, color }) => (
          <div key={key} className="flex items-center gap-2">
            <div className="w-8 h-8 flex-shrink-0 flex items-center justify-center rounded-lg bg-[rgba(228,224,216,0.04)] border border-[rgba(228,224,216,0.08)]">
              <Icon size={14} style={{ color }} />
            </div>
            <input
              value={value[key as keyof SocialLinksData] ?? ''}
              onChange={(e) => update(key, e.target.value)}
              placeholder={placeholder}
              className="input-field flex-1 text-xs"
            />
          </div>
        ))}
      </div>
    </div>
  )
}
