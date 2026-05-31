import { getTranslations } from 'next-intl/server'
import { Link } from '@/i18n/navigation'
import { HeroPosterImage } from './HeroPosterImage'

interface Props {
  isLoggedIn: boolean
  isAdmin: boolean
  posterUrl: string | null
}

export async function HeroSection({ isLoggedIn, isAdmin, posterUrl }: Props) {
  const t = await getTranslations()

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
          <h1 className="font-bebas text-7xl md:text-9xl text-text-primary leading-none mb-4">
            {t('home.headline')}
          </h1>
          <p className="text-text-muted text-base md:text-lg max-w-md mb-8">
            {t('home.description')}
          </p>

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

        {/* Poster — desktop only */}
        <div className="hidden lg:block flex-shrink-0 w-80 h-[480px] -ml-36">
          <HeroPosterImage url={posterUrl} isAdmin={isAdmin} />
        </div>
      </div>
    </section>
  )
}
