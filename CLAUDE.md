# CLAUDE.md — sahne.today

Bu dosya, Claude Code'un bu proje üzerinde çalışırken otomatik olarak okuduğu
bağlam dosyasıdır. Amaç: mimari kararları, kurulum detaylarını ve "neden böyle
yaptık" notlarını tek yerde tutup, her yeni konuşmada baştan anlatmak zorunda
kalmamak.

## Proje Özeti

sahne.today — sanatçı ve mekan keşif platformu. İkincil domain: thestage.today.

## Altyapı

- **Hosting:** Self-hosted VPS, Coolify üzerinden deploy
- **Backend/DB:** Supabase (self-hosted, Coolify'de ayrı stack olarak çalışıyor)
- **Auth:** Supabase Auth — Google OAuth + email/password aktif
  - Facebook Login: hesap kısıtlamaları nedeniyle terk edildi, tekrar denenmedi
  - Apple Login: App Store'a yayınlanana kadar erteleniyor
- **Email/SMTP:** Resend üzerinden gönderim
- **DNS:** Cloudflare (hem sahne.today hem thestage.today için)

## Önemli Entegrasyonlar

- **Google Maps:** Mekan listelerinde konum gösterimi için entegre edildi
- **Instagram profil keşfi:** Google Custom Search API çok karmaşık çıktığı
  için terk edildi, yerine **SerpAPI** kullanılıyor
- **SEO:** Sitemap Google Search Console'a submit edildi (şu an ~621 sayfa indexli)

## Bilinen Kararlar / "Neden Böyle Yaptık"

- Supabase'i Coolify üzerinde self-host etme kararı: VPS kaynak yönetimini
  tek elden tutmak ve maliyet kontrolü için. (Not: WordPress siteleri ayrı
  olarak Kebirhost shared hosting'te tutuluyor, VPS'e yük bindirmemek için.)
- Google Custom Search yerine SerpAPI: kurulum/quota karmaşıklığı çok
  yüksekti, SerpAPI çok daha hızlı sonuç verdi.

## Dosya Düzeni Notları

- Tanıtım/baskı materyalleri (broşür PDF'leri, afişler, Python PDF üretici
  script'leri, DejaVu fontları, logo STL'leri) repo'dan çıkarıldı, artık
  `D:\PROJELER\SAHNE-TANITIM\` klasöründe duruyor (Temmuz 2026 temizliği).
- Tek seferlik debug script'leri (check-*.js, test-*.js) silindi; gerekirse
  git geçmişinden geri alınabilir.

## Aktif / Bekleyen İşler

- [ ] İçerik üretimi: Instagram Reels (@sahnetoday hesabı için)
- [ ] Apple Login (App Store yayını sonrasına ertelendi)
- [ ] Facebook Login alternatifi araştırılabilir (opsiyonel)
- [x] Cron zamanlayıcıları kuruldu (Temmuz 2026, VPS crontab): event-reminders
  ve weekly-digest'e ek olarak review-requests (11:00), expire-offers (saat
  başı), lesson-reminders (09:00) ve günlük DB yedeği (04:00, /root/backup-db.sh)
- [x] DB yedekleri Cloudflare R2'ye de kopyalanıyor (bucket: sahneyedek,
  rclone remote: r2, cron'da BACKUP_REMOTE ile). Not: VPS dışarı IPv6'dan
  çıkıyor; R2 token'ında IP filtresi BOŞ bırakıldı, bu yüzden çalışıyor.
- [x] ESLint React kural hataları temizlendi (Temmuz 2026) — kalan uyarılar
  bilinçli desenler (set-state-in-effect warn seviyesinde)
- [x] Web push bildirimleri aktif (Temmuz 2026): VAPID anahtarları Coolify
  env'de + public key kodda gömülü; abonelik zil menüsünden. Dikkat:
  middleware matcher'ı statik dosyaları dışlamalı, yoksa SW precache 307
  alıp kurulamıyor (yaşandı, düzeltildi).
- [x] Umami analitiği kuruldu (Temmuz 2026): Coolify'da self-host,
  analiz.sahne.today; site script'i UMAMI_URL + UMAMI_WEBSITE_ID
  runtime env'lerinden besleniyor.
- Not: Next 16 + React 19 + Serwist geçişi tamamlandı (Temmuz 2026).
  Build webpack ile çalışıyor (`next build --webpack`) çünkü Serwist
  henüz Turbopack desteklemiyor; destek gelince bayrak kaldırılabilir.

## Çalışma Tercihleri (genel, tüm projeler için geçerli)

- Windows + PowerShell, `D:\PROJELER\` workspace içinde çalışılıyor
- Bash alias'ları PowerShell'de çalışmıyor, PowerShell-native komutlar tercih edilmeli
- Adım adım, kısa ve net talimat tercih ediliyor
- Karmaşık debugging yerine, durum çok dağıldığında sıfırdan başlamak tercih ediliyor
- Git: GitHub kullanılıyor (GitLab denendi, terk edildi), lokal çalışma esas

---

> Bu dosyayı güncel tutmak önemli: yeni bir mimari karar aldığında veya bir
> sorunu çözdüğünde buraya kısa bir not eklemek, ileride aynı sorunu tekrar
> çözmeni engeller.