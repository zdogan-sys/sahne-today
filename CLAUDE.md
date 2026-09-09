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
- **Instagram etkinlik tarama:** Ücretsiz oturumsuz viewer siteleri (imginn/picuki,
  sonra picnob/pixwox) sırayla Cloudflare tarafından bloklandığı için (Ağustos 2026)
  terk edildi, yerine **Apify Instagram Scraper API** kullanılıyor
  (`APIFY_API_TOKEN` env var'ı gerekli, Coolify'e eklenmeli). Apify run'ı ~100-120s
  sürdüğü ve Cloudflare origin timeout'u ~100s olduğu için tarama **asenkron**:
  `/api/admin/instagram/scan` `action:'start'` run'ı başlatıp hemen döner,
  `action:'finalize'` (admin butonu + `/api/cron/instagram-finalize` cron'u)
  biteni taslağa çevirir. Ortak mantık `src/lib/instagram-scan.ts`'de.
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

## Türler / Enstrümanlar / Dans Türleri Senkronizasyonu (Eylül 2026)

Admin panelindeki "Türler & Enstrümanlar" sekmesi (`music_genres`,
`stage_genres`, `instruments`, `dance_types`) `site_settings` tablosuna
yazıyor ve `getListConfigs()` (`src/app/actions/site.ts`) ile okunuyor —
ama site genelinde ~20 form/filtre bileşeni bunun yerine `src/lib/constants.ts`
içindeki **sabit** listeleri (`MUSIC_GENRES`, `STAGE_GENRES`, `ALL_GENRES`,
`INSTRUMENT_OPTIONS`, `DANCE_OPTIONS`) doğrudan import ediyordu. Sonuç:
admin'de eklenen bir tür (örn. "Latin", "Flamenko") Instagram etkinlik
taramasında ve diğer birçok yerde seçilemiyordu, çünkü o bileşenler DB'yi
hiç görmüyordu.

Çözüm: `src/lib/use-list-configs.ts` adında client-side bir hook eklendi
(`useListConfigs()`), `getListConfigs()` server action'ını çağırıp modül
seviyesinde cache'liyor, sabit listeler sadece ilk render / DB'ye
ulaşılamama fallback'i olarak kalıyor. Tüm seçim/filtre bileşenleri
(TabbedGenreSelector, InstagramScanner, AdminPanel'in Event/Artist/Slot
formları, VenueCalendar, VenueSlotsList, EventEditor, Band/Artist
CalendarSection, ArtistsClient, BandsClient, CrewClient,
UserProfileEditor, ArtistRegisterForm/ProfileEditor, BandInviteSearch,
LookingForEditor, TeachingToggle, VenueImport) bu hook'u kullanacak
şekilde güncellendi. Kurs oluşturma sayfalarındaki (`dashboard/.../courses/new`)
enstrüman/dans **alt kategori** listeleri kasıtlı olarak dokunulmadı —
bunlar admin'in Tür/Enstrüman editörüyle hiç bağlantılı olmayan, kursa
özgü ayrı bir kavram.

## Aktif / Bekleyen İşler

- [x] `APIFY_API_TOKEN` Coolify env'ine eklendi ve geçerli (Ağustos 2026).
  Ama Apify **ücretsiz plan $5/ay sert limiti** var — Ağustos'ta manuel
  "Şimdi Tara" tıklamalarıyla aşıldı (`platform-feature-disabled: Monthly
  usage hard limit exceeded`), yeni run başlatılamadı. Çözüm: tarama
  maliyeti düşürüldü (`BATCH` 10→5 hesap/tıklama, `resultsLimit` 12→6 post —
  bkz. `src/lib/instagram-scan.ts` ve `scan/route.ts`). instagram-finalize
  cron'u (5dk'da bir) sadece biten run'ları kontrol ediyor, CU harcamıyor —
  maliyetin tamamı admin panelindeki manuel "Şimdi Tara" taramalarından
  geliyor.
  - [x] Ağustos ayı limiti zaten aşılmıştı (kod düzeltmesi geriye dönük
    işlemiyor, Apify tarafı bir sonraki fatura dönemine kadar kilitli
    kalıyor). Bu ay için siteyi güncel tutmak amacıyla **yedek Apify hesabı**
    açıldı, token'ı Coolify'de `APIFY_API_TOKEN_2` olarak eklendi.
    `src/lib/instagram-scan.ts` artık `APIFY_TOKENS` listesini sırayla
    dener (run başlatma/durum/dataset okuma) — birincisi limite takılırsa
    otomatik ikinciye düşer, DB şeması değişmedi (run/dataset ID'leri
    hesaba özel olduğu için "yanlış token" denemesi güvenle bir sonrakine
    geçer). **Not:** İki ücretsiz hesap arasında geçiş Apify'ın "limiti
    aşmak için çoklu hesap" maddesine girebilir — kullanıcı bilinçli
    olarak bu riski kabul etti (site güncelliği önceliği).
  - 12 Eylül 2026'da Apify'ın ilk hesabının limiti sıfırlanacak (bir
    sonraki fatura dönemi) — o tarih için z_dogan@hotmail.com'a hatırlatma
    e-postası zamanlandı (routine `trig_01C4CNfJoVsRQ3aVWFArphG7`).
  - Limit yine aşılırsa: apify.com → Settings/Billing'den plan yükselt
    (Starter $29/ay, kullanıcı şimdilik reddetti) ya da fatura dönemini
    bekle.
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