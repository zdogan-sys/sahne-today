import { Instagram, Twitter, Youtube, Facebook, Linkedin, Music2, ExternalLink, Globe } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface SocialLinksData {
  website?: string
  instagram?: string
  twitter?: string
  youtube?: string
  soundcloud?: string
  facebook?: string
  linkedin?: string
}

export const SOCIAL_PLATFORMS = [
  { key: 'website',    label: 'Web Sitesi',  placeholder: 'https://mekan.com',               icon: Globe,        color: '#94a3b8' },
  { key: 'instagram',  label: 'Instagram',   placeholder: 'https://instagram.com/kullanici', icon: Instagram,    color: '#E1306C' },
  { key: 'twitter',    label: 'X / Twitter', placeholder: 'https://x.com/kullanici',         icon: Twitter,      color: '#1DA1F2' },
  { key: 'youtube',    label: 'YouTube',     placeholder: 'https://youtube.com/@kanal',      icon: Youtube,      color: '#FF0000' },
  { key: 'soundcloud', label: 'SoundCloud',  placeholder: 'https://soundcloud.com/kullanici',icon: Music2,       color: '#FF5500' },
  { key: 'facebook',   label: 'Facebook',    placeholder: 'https://facebook.com/sayfa',      icon: Facebook,     color: '#1877F2' },
  { key: 'linkedin',   label: 'LinkedIn',    placeholder: 'https://linkedin.com/in/profil',  icon: Linkedin,     color: '#0A66C2' },
] as const

// Display component — profil sayfalarında
export function SocialLinks({ links, className }: { links: SocialLinksData; className?: string }) {
  const active = SOCIAL_PLATFORMS.filter((p) => links[p.key as keyof SocialLinksData]?.trim())
  if (active.length === 0) return null

  return (
    <div className={cn('flex flex-wrap gap-2', className)}>
      {active.map(({ key, label, icon: Icon, color }) => {
        const url = links[key as keyof SocialLinksData]!
        return (
          <a
            key={key}
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            title={label}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[rgba(228,224,216,0.1)] bg-[rgba(228,224,216,0.04)] hover:border-[rgba(228,224,216,0.2)] transition-colors text-xs text-text-muted hover:text-text-primary"
            style={{ '--social-color': color } as React.CSSProperties}
          >
            <Icon size={13} style={{ color }} />
            {label}
            <ExternalLink size={10} className="opacity-40" />
          </a>
        )
      })}
    </div>
  )
}
