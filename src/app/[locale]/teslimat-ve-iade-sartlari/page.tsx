import { getLocale } from 'next-intl/server'
import { Link } from '@/i18n/navigation'
import { LegalLayout } from '@/components/legal/LegalLayout'
import { LEGAL_ENTITY } from '@/lib/legal-info'

export const metadata = { title: 'Teslimat ve İade Şartları' }

export default async function DeliveryAndReturnsPage() {
  const isEn = (await getLocale()) === 'en'

  return (
    <LegalLayout
      title="Teslimat ve İade Şartları"
      englishNotice={
        isEn
          ? 'This delivery and return policy is provided in Turkish, as it reflects the terms governing purchases made on this site.'
          : undefined
      }
    >
      <h2>1. Teslimat</h2>
      <p>
        Sahne.Today / The Stage.Today üzerinden satın alınan tüm hizmetler
        (etkinlik bileti, Pro üyelik) dijital niteliktedir; fiziksel kargo
        veya gönderim söz konusu değildir.
      </p>
      <ul>
        <li>
          <strong>Pro üyelik:</strong> Ödeme onaylandığı anda ilgili sanatçı
          veya mekan hesabına tanımlanır ve hemen kullanılabilir hale gelir.
        </li>
        <li>
          <strong>Etkinlik bileti:</strong> Ödeme onaylandığı anda dijital
          bilet/QR kod olarak ALICI'nın hesabında ve/veya e-posta adresinde
          hazır olur; etkinlik girişinde bu QR kod okutulur.
        </li>
      </ul>

      <h2>2. İade Koşulları</h2>
      <ul>
        <li>
          Ödeme sırasında yaşanan teknik hata, mükerrer (çift) çekim gibi
          durumlarda bedel, tespitin ardından en kısa sürede ve tam olarak
          iade edilir.
        </li>
        <li>
          Etkinliğin mekan veya organizatör tarafından iptal edilmesi
          halinde, satın alınan bilet bedeli tam olarak iade edilir.
        </li>
        <li>
          Etkinliğin ertelenmesi halinde bilet yeni tarih için geçerliliğini
          korur; ALICI talep ederse iade değerlendirilir.
        </li>
        <li>
          Pro üyelikte, ödemenin onaylanmasıyla hizmetin ifasına derhal
          başlandığından ve ALICI bu duruma sipariş sırasında onay
          verdiğinden, aktivasyon sonrası cayma hakkına dayalı iade talebi
          kabul edilmez. Detaylar için{' '}
          <Link href="/mesafeli-satis-sozlesmesi" className="text-accent hover:underline">
            Mesafeli Satış Sözleşmesi
          </Link>
          'ne bakınız.
        </li>
      </ul>

      <h2>3. İade Süreci</h2>
      <p>
        İade talepleriniz için sipariş numaranız ve talebinizle birlikte{' '}
        <a href={`mailto:${LEGAL_ENTITY.email}`} className="text-accent hover:underline">
          {LEGAL_ENTITY.email}
        </a>{' '}
        adresine e-posta gönderebilirsiniz. Uygun bulunan iadeler, ödemenin
        yapıldığı kredi/banka kartına, ödeme kuruluşunun (iyzico/PayTR)
        işlem süreleri dahilinde yansıtılır.
      </p>
    </LegalLayout>
  )
}
