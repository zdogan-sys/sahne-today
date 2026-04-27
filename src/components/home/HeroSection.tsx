import Link from 'next/link'

export function HeroSection({ isLoggedIn }: { isLoggedIn: boolean }) {
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

      <div className="relative max-w-7xl mx-auto">
        <div className="max-w-2xl">
          <p className="text-accent text-sm font-medium uppercase tracking-widest mb-3">
            Türkiye'nin Performans Ekosistemi
          </p>
          <h1 className="font-bebas text-7xl md:text-9xl text-text-primary leading-none mb-4">
            BUGÜN<br />SAHNE VAR.
          </h1>
          <p className="text-text-muted text-base md:text-lg max-w-md mb-8">
            Bağımsız müzisyenler, stand-up komedyenleri ve butik mekanlar için açık sahne bul, başvur, performans gerçekleştir.
          </p>

          <div className="flex flex-col sm:flex-row gap-3">
            {isLoggedIn ? (
              <>
                <Link href="/events" className="btn-accent text-center py-3 px-6 text-base font-semibold">
                  Etkinlikleri Keşfet
                </Link>
                <Link href="/dashboard" className="btn-outline text-center py-3 px-6 text-base font-semibold">
                  Dashboard
                </Link>
              </>
            ) : (
              <>
                <Link href="/artists/register" className="btn-accent text-center py-3 px-6 text-base font-semibold">
                  Sanatçı Ol
                </Link>
                <Link href="/venues/register" className="btn-outline text-center py-3 px-6 text-base font-semibold">
                  Mekan Ekle
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}
