import Link from 'next/link'

const USER_TYPES = [
  {
    color: '#D4537E',
    tag: 'Sanatçı & Grup',
    headline: 'Profilini oluştur.\nSahneye çık.\nKeşfedil.',
    description: 'Mekanlardan gelen teklifleri dashboard\'ından yönet, takvini doldur, takipçilerin her yeni etkinliğinden otomatik haberdar olsun.',
    features: [
      'Mekanlardan sahne teklifi al, kabul et veya reddet',
      'Grup kur, müzisyen bul, birlikte sahne çık',
      'Bilet sat, performansından gelir elde et',
      'Teknik rider ve geçmiş mekan listesi ile öne çık',
    ],
    cta: { label: 'Sanatçı Profili Oluştur', href: '/auth?tab=signup' },
  },
  {
    color: '#2DD4A0',
    tag: 'Mekan',
    headline: 'Sahnenizi\ndoldurun.\nEtkinliğinizi\nyönetin.',
    description: 'Açık slotlarınıza sanatçı başvurusu alın ya da doğrudan teklif gönderin. Takvim, bilet satışı ve QR giriş kontrolü tek ekranda.',
    features: [
      'Slot aç, sanatçı başvurularını değerlendir',
      'İstediğin sanatçıya doğrudan teklif gönder',
      'Bilet sat, etkinlik günü QR ile giriş kontrol et',
      'Mekan takvimini ICS ile sanatçılarla paylaş',
    ],
    cta: { label: 'Mekan Profili Oluştur', href: '/auth?tab=signup' },
  },
  {
    color: '#7C6FFE',
    tag: 'İzleyici',
    headline: 'Şehrindeki\ncanlı müziği\nkeşfet.',
    description: 'Sevdiğin sanatçıları ve mekanları takip et. Yeni etkinlik açıldığında ilk sen haber ol, RSVP yap ya da bilet al.',
    features: [
      'Şehrine göre etkinlikleri filtrele ve keşfet',
      'Sanatçı ve mekan takip et, bildirim al',
      'RSVP yap veya güvenli ödemeyle bilet satın al',
      'Takvim aboneliğiyle etkinlikleri kendi takvimine ekle',
    ],
    cta: { label: 'Ücretsiz Kayıt Ol', href: '/auth?tab=signup' },
  },
]

export function LandingFeatures() {
  return (
    <section className="max-w-7xl mx-auto px-4 py-16">
      {/* Section header */}
      <div className="text-center mb-12">
        <p className="text-text-muted text-sm uppercase tracking-widest mb-3">Platform</p>
        <h2 className="font-bebas text-5xl md:text-6xl text-text-primary">
          Herkes için bir yer var
        </h2>
      </div>

      {/* Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {USER_TYPES.map((type) => (
          <div
            key={type.tag}
            className="relative card p-6 flex flex-col overflow-hidden"
          >
            {/* Top color accent */}
            <div
              className="absolute top-0 left-0 right-0 h-0.5"
              style={{ background: type.color }}
            />

            {/* Tag */}
            <span
              className="text-xs font-semibold uppercase tracking-widest mb-4 inline-block"
              style={{ color: type.color }}
            >
              {type.tag}
            </span>

            {/* Headline */}
            <h3 className="font-bebas text-4xl text-text-primary leading-tight mb-4 whitespace-pre-line">
              {type.headline}
            </h3>

            {/* Description */}
            <p className="text-text-muted text-sm leading-relaxed mb-6">
              {type.description}
            </p>

            {/* Feature list */}
            <ul className="space-y-2.5 mb-8 flex-1">
              {type.features.map((f) => (
                <li key={f} className="flex items-start gap-2.5 text-sm text-text-primary">
                  <span
                    className="mt-1 w-1.5 h-1.5 rounded-full flex-shrink-0"
                    style={{ background: type.color }}
                  />
                  {f}
                </li>
              ))}
            </ul>

            {/* CTA */}
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

      {/* Bottom CTA */}
      <div className="text-center mt-12">
        <p className="text-text-muted text-sm mb-4">
          Ücretsiz. Kayıt ol, hemen kullan.
        </p>
        <Link
          href="/events"
          className="text-sm text-text-muted hover:text-text-primary transition-colors underline underline-offset-4"
        >
          Önce etkinliklere göz at →
        </Link>
      </div>
    </section>
  )
}
