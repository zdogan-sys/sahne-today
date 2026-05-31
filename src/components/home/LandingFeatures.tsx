import { getTranslations } from 'next-intl/server'
import { Link } from '@/i18n/navigation'

export async function LandingFeatures() {
  const t = await getTranslations()

  const USER_TYPES = [
    {
      color: '#D4537E',
      tag: t('artists.title'),
      headline: t('landing.artistHeadline'),
      description: t('landing.artistDesc'),
      features: [
        t('landing.artistF1'),
        t('landing.artistF2'),
        t('landing.artistF3'),
        t('landing.artistF4'),
      ],
      cta: { label: t('artists.createProfile'), href: '/auth?tab=signup' as const },
    },
    {
      color: '#2DD4A0',
      tag: t('venues.title'),
      headline: t('landing.venueHeadline'),
      description: t('landing.venueDesc'),
      features: [
        t('landing.venueF1'),
        t('landing.venueF2'),
        t('landing.venueF3'),
        t('landing.venueF4'),
      ],
      cta: { label: t('venues.createProfile'), href: '/auth?tab=signup' as const },
    },
    {
      color: '#7C6FFE',
      tag: t('landing.audienceTag'),
      headline: t('landing.audienceHeadline'),
      description: t('landing.audienceDesc'),
      features: [
        t('landing.audienceF1'),
        t('landing.audienceF2'),
        t('landing.audienceF3'),
        t('landing.audienceF4'),
      ],
      cta: { label: t('landing.audienceCta'), href: '/auth?tab=signup' as const },
    },
  ]

  return (
    <section className="max-w-7xl mx-auto px-4 py-16">
      <div className="text-center mb-12">
        <p className="text-text-muted text-sm uppercase tracking-widest mb-3">{t('home.platform')}</p>
        <h2 className="font-bebas text-5xl md:text-6xl text-text-primary">
          {t('home.everyoneHasPlace')}
        </h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {USER_TYPES.map((type) => (
          <div key={type.tag} className="relative card p-6 flex flex-col overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-0.5" style={{ background: type.color }} />
            <span className="text-xs font-semibold uppercase tracking-widest mb-4 inline-block" style={{ color: type.color }}>
              {type.tag}
            </span>
            <h3 className="font-bebas text-4xl text-text-primary leading-tight mb-4 whitespace-pre-line">
              {type.headline}
            </h3>
            <p className="text-text-muted text-sm leading-relaxed mb-6">{type.description}</p>
            <ul className="space-y-2.5 mb-8 flex-1">
              {type.features.map((f) => (
                <li key={f} className="flex items-start gap-2.5 text-sm text-text-primary">
                  <span className="mt-1 w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: type.color }} />
                  {f}
                </li>
              ))}
            </ul>
            <Link
              href={type.cta.href}
              className="w-full text-center py-2.5 rounded-lg text-sm font-semibold transition-colors hover:opacity-80"
              style={{
                background: `${type.color}18`,
                color: type.color,
                border: `1px solid ${type.color}40`,
              }}
            >
              {type.cta.label}
            </Link>
          </div>
        ))}
      </div>

      <div className="text-center mt-12">
        <p className="text-text-muted text-sm mb-4">{t('landing.free')}</p>
        <Link href="/events" className="text-sm text-text-muted hover:text-text-primary transition-colors underline underline-offset-4">
          {t('landing.browseFirst')}
        </Link>
      </div>
    </section>
  )
}
