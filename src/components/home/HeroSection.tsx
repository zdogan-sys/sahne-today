import { getTranslations } from 'next-intl/server'
import { Link } from '@/i18n/navigation'
import { HeroPosterImage } from './HeroPosterImage'

interface Props {
  isLoggedIn: boolean
  isAdmin: boolean
  posterUrl: string | null
  todayCount?: number
  weekCount?: number
}

export async function HeroSection({ isLoggedIn, isAdmin, posterUrl, todayCount = 0, weekCount = 0 }: Props) {
  const t = await getTranslations()
  const liveText = todayCount > 0
    ? t('home.tonightLive', { count: todayCount })
    : weekCount > 0
      ? t('home.weekLive', { count: weekCount })
      : null

  return (
    <section className="relative overflow-hidden px-4 pt-12 pb-10 md:pt-20 md:pb-16">
      {/* Gradient orb */}
      <div
        className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] opacity-20 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse at center, #D4537E 0%, transparent 70%)',
          filter: 'blur(40px)',
        }}
      />

      <div className="relative max-w-7xl mx-auto flex items-start">
        <div className="max-w-2xl">
          <p className="text-accent text-sm font-medium uppercase tracking-widest mb-3">
            {t('home.tagline')}
          </p>
          <h1 className="font-bebas text-7xl md:text-9xl text-text-primary leading-none mb-4 whitespace-pre-line">
            {t('home.headline')}
          </h1>
          <p className="text-text-muted text-base md:text-lg max-w-md mb-6">
            {t('home.description')}
          </p>

          {liveText && (
            <Link
              href="/events"
              className="inline-flex items-center gap-2 mb-8 px-3 py-1.5 rounded-full border border-accent/30 bg-accent/10 text-sm text-text-primary hover:bg-accent/20 transition-colors"
            >
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-accent" />
              </span>
              {liveText}
              <span className="text-accent">→ {t('home.seeAll')}</span>
            </Link>
          )}

          <div className="flex flex-col sm:flex-row gap-3">
            {isLoggedIn ? (
              <>
                <Link href="/events" className="btn-accent text-center py-3 px-6 text-base font-semibold">
                  {t('home.exploreEvents')}
                </Link>
                <Link href="/dashboard" className="btn-outline text-center py-3 px-6 text-base font-semibold">
                  {t('home.myDashboard')}
                </Link>
              </>
            ) : (
              <>
                <Link href="/auth?tab=signup" className="btn-accent text-center py-3 px-6 text-base font-semibold">
                  {t('home.register')}
                </Link>
                <Link href="/auth" className="btn-outline text-center py-3 px-6 text-base font-semibold">
                  {t('auth.signin')}
                </Link>
              </>
            )}
          </div>
        </div>

        {/* Poster — desktop only; ml-auto ile sağa yaslı, yazıya taşmaz */}
        <div className="hidden lg:block flex-shrink-0 w-80 h-[480px] ml-auto pl-8">
          <HeroPosterImage url={posterUrl} isAdmin={isAdmin} />
        </div>
      </div>
    </section>
  )
}
