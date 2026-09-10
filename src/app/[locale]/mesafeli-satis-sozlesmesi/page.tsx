import { getLocale } from 'next-intl/server'
import { Link } from '@/i18n/navigation'
import { LegalLayout } from '@/components/legal/LegalLayout'
import { LEGAL_ENTITY } from '@/lib/legal-info'

export const metadata = { title: 'Mesafeli Satış Sözleşmesi' }

export default async function DistanceSalesAgreementPage() {
  const isEn = (await getLocale()) === 'en'

  return (
    <LegalLayout
      title="Mesafeli Satış Sözleşmesi"
      englishNotice={
        isEn
          ? 'This distance sales agreement is governed by Turkish Law No. 6502 on the Protection of Consumers and is provided in Turkish, as it is the legally binding version for purchases made on this site.'
          : undefined
      }
    >
      <h2>1. Taraflar</h2>
      <p>
        <strong>SATICI:</strong> {LEGAL_ENTITY.name}<br />
        Adres: {LEGAL_ENTITY.address}<br />
        Vergi Bilgisi: {LEGAL_ENTITY.taxInfo}<br />
        {LEGAL_ENTITY.mersisNo && <>MERSİS No: {LEGAL_ENTITY.mersisNo}<br /></>}
        E-posta: {LEGAL_ENTITY.email}<br />
        Telefon: {LEGAL_ENTITY.phone}
      </p>
      <p>
        <strong>ALICI:</strong> Sahne.Today / The Stage.Today platformu
        üzerinden bilet veya Pro üyelik satın alan, siparişi sırasında ad,
        soyad, e-posta ve iletişim bilgilerini beyan eden kullanıcı.
      </p>

      <h2>2. Sözleşmenin Konusu</h2>
      <p>
        İşbu sözleşmenin konusu, ALICI'nın Platform üzerinden elektronik
        ortamda sipariş verdiği aşağıdaki hizmetlerin satışı ve ifasına
        ilişkin tarafların hak ve yükümlülüklerinin belirlenmesidir:
      </p>
      <ul>
        <li><strong>Etkinlik bileti:</strong> Belirli bir tarih ve mekânda gerçekleşecek etkinliğe giriş hakkı sağlayan dijital bilet</li>
        <li><strong>Pro üyelik:</strong> Sanatçı/mekan hesaplarına profil öne çıkarma, kurs/ders yayınlama ve ödeme alma gibi ek özellikler sağlayan dijital abonelik hizmeti</li>
      </ul>

      <h2>3. Bedel ve Ödeme</h2>
      <p>
        Hizmet bedeli, sipariş onayı öncesinde ALICI'ya Platform üzerinde açıkça
        gösterilir ve ALICI'nın onayı ile kredi/banka kartı yoluyla, iyzico
        ve/veya PayTR ödeme altyapısı üzerinden tahsil edilir. Kart bilgileri
        SATICI tarafından saklanmaz, doğrudan ödeme kuruluşu tarafından
        işlenir.
      </p>

      <h2>4. Teslimat / İfa Şekli</h2>
      <p>
        Satışa konu hizmetler dijital nitelikte olup kargo ile gönderim
        yapılmaz. Pro üyelik, ödemenin onaylanmasının ardından anında
        ALICI'nın hesabına tanımlanır. Etkinlik bileti, ödemenin
        onaylanmasının ardından ALICI'nın hesabı ve/veya e-posta adresine
        dijital bilet/QR kod olarak iletilir. Detaylar için{' '}
        <Link href="/teslimat-ve-iade-sartlari" className="text-accent hover:underline">
          Teslimat ve İade Şartları
        </Link>{' '}
        sayfasına bakınız.
      </p>

      <h2>5. Cayma Hakkı</h2>
      <p>
        6502 sayılı Tüketicinin Korunması Hakkında Kanun ve Mesafeli
        Sözleşmeler Yönetmeliği'nin 15. maddesi uyarınca:
      </p>
      <ul>
        <li>
          <strong>Pro üyelik</strong> elektronik ortamda anında ifa edilen bir
          hizmet olduğundan ve ALICI, ifanın derhal başlamasına ve cayma
          hakkının bu suretle sona ereceğine sipariş anında açıkça onay
          verdiğinden, ödeme onaylandıktan sonra cayma hakkı kullanılamaz.
        </li>
        <li>
          <strong>Etkinlik bileti</strong>, belirli bir tarihte ifa edilmesi
          gereken bir hizmete ilişkin olduğundan cayma hakkı istisnası
          kapsamındadır. Etkinliğin SATICI, mekan veya organizatör
          tarafından iptal edilmesi halinde bilet bedeli ALICI'ya tam olarak
          iade edilir.
        </li>
      </ul>

      <h2>6. Uyuşmazlıkların Çözümü</h2>
      <p>
        İşbu sözleşmeden doğan uyuşmazlıklarda, Ticaret Bakanlığınca yıllık
        olarak belirlenen parasal sınırlar dahilinde ALICI'nın yerleşim
        yerindeki Tüketici Hakem Heyetleri, bu sınırları aşan uyuşmazlıklarda
        ise Tüketici Mahkemeleri yetkilidir.
      </p>

      <h2>7. Yürürlük</h2>
      <p>
        ALICI, Platform üzerinden siparişini onaylayarak işbu Mesafeli Satış
        Sözleşmesi'nin tüm koşullarını kabul etmiş sayılır.
      </p>
    </LegalLayout>
  )
}
