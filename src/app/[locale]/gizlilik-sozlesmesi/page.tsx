import { getLocale } from 'next-intl/server'
import { LegalLayout } from '@/components/legal/LegalLayout'
import { LEGAL_ENTITY } from '@/lib/legal-info'

export const metadata = { title: 'Gizlilik Sözleşmesi' }

export default async function PrivacyPolicyPage() {
  const isEn = (await getLocale()) === 'en'

  return (
    <LegalLayout
      title="Gizlilik Sözleşmesi ve KVKK Aydınlatma Metni"
      englishNotice={
        isEn
          ? 'This privacy policy is governed by Turkish law (KVKK — Personal Data Protection Law No. 6698) and is provided in Turkish. Contact us at destek@sahne.today for an English summary.'
          : undefined
      }
    >
      <p>
        İşbu Gizlilik Sözleşmesi ve KVKK Aydınlatma Metni, sahne.today ve
        thestage.today alan adları üzerinden sunulan hizmetler ("Platform")
        kapsamında, veri sorumlusu sıfatıyla {LEGAL_ENTITY.name} ({LEGAL_ENTITY.address})
        tarafından, 6698 sayılı Kişisel Verilerin Korunması Kanunu ("KVKK")
        uyarınca işlenen kişisel verileriniz hakkında sizi bilgilendirmek
        amacıyla hazırlanmıştır.
      </p>

      <h2>1. Toplanan Kişisel Veriler</h2>
      <ul>
        <li>Kimlik ve iletişim bilgileri: ad soyad, e-posta adresi, telefon numarası, profil fotoğrafı</li>
        <li>Hesap bilgileri: Google ile giriş veya e-posta/şifre ile oluşturulan hesap verileri</li>
        <li>Konum bilgisi: mekan ve etkinlik keşfi için seçtiğiniz şehir/konum</li>
        <li>İşlem güvenliği bilgileri: bilet ve Pro üyelik satın alımlarında ödeme kuruluşu (iyzico/PayTR) üzerinden işlenen kart bilgileri — bu bilgiler Platform sunucularında saklanmaz</li>
        <li>İletişim içerikleri: platform içi mesajlaşma, yorum ve değerlendirmeler</li>
        <li>İşlem/log kayıtları: IP adresi, tarayıcı bilgisi, ziyaret ve kullanım kayıtları</li>
        <li>Bildirim tercihleri: web push bildirim aboneliği</li>
      </ul>

      <h2>2. Kişisel Verilerin İşlenme Amaçları</h2>
      <ul>
        <li>Hesabınızın oluşturulması, doğrulanması ve yönetilmesi</li>
        <li>Etkinlik, mekan, sanatçı ve kurs keşfi hizmetlerinin sunulması</li>
        <li>Bilet ve Pro üyelik satın alımlarına ilişkin ödeme işlemlerinin gerçekleştirilmesi</li>
        <li>Etkinlik hatırlatmaları, haftalık bülten ve bildirimlerin gönderilmesi</li>
        <li>Platform güvenliğinin sağlanması ve kötüye kullanımın önlenmesi</li>
        <li>Hizmet kalitesinin ölçülmesi ve iyileştirilmesi (anonimleştirilmiş, self-host edilen analitik ile)</li>
        <li>Yasal yükümlülüklerin yerine getirilmesi</li>
      </ul>

      <h2>3. Kişisel Verilerin Aktarıldığı Taraflar</h2>
      <p>Kişisel verileriniz, yukarıdaki amaçlarla sınırlı olmak üzere aşağıdaki taraflarla paylaşılabilir:</p>
      <ul>
        <li>Ödeme hizmeti sağlayıcıları: iyzico, PayTR (ödeme işlemlerinin gerçekleştirilmesi için)</li>
        <li>E-posta gönderim altyapısı: Resend (bildirim ve hatırlatma e-postaları için)</li>
        <li>Barındırma ve veritabanı altyapısı: Supabase (self-host) ve sunucu sağlayıcımız</li>
        <li>Harita hizmeti: Google Maps (mekan konumlarının gösterilmesi için)</li>
        <li>Yetkili kamu kurum ve kuruluşları, yasal zorunluluk halinde</li>
      </ul>

      <h2>4. Çerezler</h2>
      <p>
        Platform, kullanım istatistiklerini ölçmek için self-host edilen ve
        kişisel veri toplamayan bir analitik altyapısı (Umami) kullanır. Oturum
        yönetimi için zorunlu teknik çerezler kullanılmaktadır.
      </p>

      <h2>5. Saklama Süresi</h2>
      <p>
        Kişisel verileriniz, hesabınız aktif olduğu sürece ve ilgili mevzuatta
        öngörülen zamanaşımı süreleri boyunca saklanır; hesabınızın silinmesi
        talebinde yasal saklama yükümlülükleri dışındaki veriler silinir veya
        anonim hale getirilir.
      </p>

      <h2>6. KVKK Kapsamındaki Haklarınız</h2>
      <p>KVKK'nın 11. maddesi uyarınca aşağıdaki haklara sahipsiniz:</p>
      <ul>
        <li>Kişisel verilerinizin işlenip işlenmediğini öğrenme</li>
        <li>İşlenmişse buna ilişkin bilgi talep etme</li>
        <li>İşlenme amacını ve amacına uygun kullanılıp kullanılmadığını öğrenme</li>
        <li>Yurt içinde/yurt dışında aktarıldığı üçüncü kişileri bilme</li>
        <li>Eksik/yanlış işlenmişse düzeltilmesini isteme</li>
        <li>Silinmesini veya yok edilmesini isteme</li>
        <li>İşlemlerin aktarıldığı üçüncü kişilere bildirilmesini isteme</li>
        <li>Otomatik sistemlerle analiz sonucu aleyhinize bir sonucun ortaya çıkmasına itiraz etme</li>
        <li>Kanuna aykırı işlenme nedeniyle uğradığınız zararın giderilmesini talep etme</li>
      </ul>

      <h2>7. Başvuru</h2>
      <p>
        Yukarıdaki haklarınızı kullanmak için {LEGAL_ENTITY.email} adresine
        e-posta gönderebilirsiniz. Talepleriniz KVKK'da öngörülen süre
        içerisinde değerlendirilerek sonuçlandırılır.
      </p>
    </LegalLayout>
  )
}
