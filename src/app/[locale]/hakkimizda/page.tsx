import { getLocale } from 'next-intl/server'
import { LegalLayout } from '@/components/legal/LegalLayout'
import { LEGAL_ENTITY } from '@/lib/legal-info'

export const metadata = { title: 'Hakkımızda' }

export default async function AboutPage() {
  const isEn = (await getLocale()) === 'en'

  if (isEn) {
    return (
      <LegalLayout title="About Us">
        <p>
          The Stage.Today (sahne.today) is a discovery ecosystem connecting independent
          musicians, comedians, dancers and other live performers with boutique venues.
        </p>
        <h2>What you can do here</h2>
        <ul>
          <li>Discover open stages, concerts and live events by city</li>
          <li>Browse artist and venue profiles</li>
          <li>Buy digital tickets for events</li>
          <li>Book courses and private lessons with artists</li>
          <li>As an artist or venue, get a Pro membership to feature your profile and take payments through the platform</li>
        </ul>
        <p>
          Our goal is to make the work behind the stage visible and help the live
          performance ecosystem grow.
        </p>
        <h2>Operator</h2>
        <p>
          The Stage.Today / Sahne.Today is operated by {LEGAL_ENTITY.name}, {LEGAL_ENTITY.address}.
          For any questions, reach us at{' '}
          <a href={`mailto:${LEGAL_ENTITY.email}`} className="text-accent hover:underline">{LEGAL_ENTITY.email}</a>.
        </p>
      </LegalLayout>
    )
  }

  return (
    <LegalLayout title="Hakkımızda">
      <p>
        Sahne.Today, bağımsız müzisyenleri, stand-up sanatçılarını, dansçıları ve
        diğer canlı performans sanatçılarını butik mekanlarla buluşturan bir canlı
        performans keşif platformudur.
      </p>
      <h2>Platformda neler yapabilirsin?</h2>
      <ul>
        <li>Şehrine göre açık sahne (open mic), konser ve canlı etkinlikleri keşfedebilirsin</li>
        <li>Sanatçı ve mekan profillerini inceleyebilirsin</li>
        <li>Etkinlikler için dijital bilet satın alabilirsin</li>
        <li>Sanatçılardan kurs veya özel ders alabilirsin</li>
        <li>Sanatçı veya mekan sahibiysen, Pro üyelik ile profilini öne çıkarabilir ve platform üzerinden ödeme alabilirsin</li>
      </ul>
      <p>
        Amacımız, sahne arkasındaki emeği görünür kılmak ve canlı performans
        ekosistemini büyütmek.
      </p>
      <h2>İşleten</h2>
      <p>
        Sahne.Today / The Stage.Today, {LEGAL_ENTITY.name} tarafından işletilmektedir.
        Adres: {LEGAL_ENTITY.address}. Sorularınız için{' '}
        <a href={`mailto:${LEGAL_ENTITY.email}`} className="text-accent hover:underline">{LEGAL_ENTITY.email}</a>{' '}
        adresinden bize ulaşabilirsiniz.
      </p>
    </LegalLayout>
  )
}
