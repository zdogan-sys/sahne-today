#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Sahne.Today kullanim kilavuzu PDF uretici

Uc hedef kitle:
  1. Izleyici — 8 A6 sayfa (1 A4 kitapcik)
  2. Sanatci ve Grup — 12 A6 sayfa (1.5 A4 kitapcik)
  3. Mekan — 12 A6 sayfa (1.5 A4 kitapcik)

Her rehber 3 formatta uretilir:
  - A4 (bilgisayar)         → bu betik
  - A6 (telefon)            → generate_a6.py / generate_a6_light.py
  - A6 kitapcik (A4 baski)  → generate_booklets.py / generate_booklets_light.py
"""

import os
from reportlab.pdfgen import canvas
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm

# ── Fontlar ──────────────────────────────────────────────────────────────────
FONTS_DIR = os.path.join(os.path.dirname(__file__), 'fonts')
pdfmetrics.registerFont(TTFont('DejaVu',     os.path.join(FONTS_DIR, 'DejaVuSans.ttf')))
pdfmetrics.registerFont(TTFont('DejaVuBold', os.path.join(FONTS_DIR, 'DejaVuSans-Bold.ttf')))

# ── Renkler (R,G,B 0-1) ─────────────────────────────────────────────────────
BG        = (10/255,  10/255,  11/255)
CARD      = (20/255,  20/255,  21/255)
TEXT      = (228/255, 224/255, 216/255)
MUTED     = (136/255, 133/255, 128/255)
TIP_GREEN = (29/255,  158/255, 117/255)
WHITE     = (1, 1, 1)

ACC_ARTIST   = (212/255,  83/255, 126/255)  # #D4537E
ACC_VENUE    = ( 29/255, 158/255, 117/255)  # #1D9E75
ACC_AUDIENCE = (143/255, 136/255, 212/255)  # #8f88d4

W, H = A4  # A6 betikleri bunu ezer
MARGIN = 22*mm
CONTENT_W = W - 2 * MARGIN

# ── Yardimci fonksiyonlar ─────────────────────────────────────────────────────

def hex_fill(c, color):
    c.setFillColorRGB(*color)

def hex_stroke(c, color):
    c.setStrokeColorRGB(*color)

def wrap_text(text, font, size, max_width, cv):
    words = text.split(' ')
    lines = []
    current = ''
    for word in words:
        test = (current + ' ' + word).strip()
        cv.setFont(font, size)
        if cv.stringWidth(test) <= max_width:
            current = test
        else:
            if current:
                lines.append(current)
            current = word
    if current:
        lines.append(current)
    return lines

def draw_background(c):
    hex_fill(c, BG)
    c.rect(0, 0, W, H, fill=1, stroke=0)

def draw_footer(c, page_num, accent):
    hex_fill(c, MUTED)
    c.setFont('DejaVu', 7)
    c.drawCentredString(W / 2, 10*mm, f'sahne.today   —   sayfa {page_num}')
    hex_stroke(c, accent)
    c.setLineWidth(0.5)
    c.line(MARGIN, 14*mm, W - MARGIN, 14*mm)

def draw_cover(c, title, subtitle, tagline, accent, page_num):
    draw_background(c)
    cy = H - 52*mm
    hex_fill(c, accent)
    c.setFont('DejaVuBold', 28)
    c.drawCentredString(W / 2, cy, 'SAHNE.TODAY')
    cw = 80*mm; cx = (W - cw) / 2
    hex_fill(c, accent)
    c.rect(cx, cy - 6, cw, 2.5, fill=1, stroke=0)
    cy -= 22*mm
    hex_fill(c, TEXT)
    c.setFont('DejaVuBold', 36)
    c.drawCentredString(W / 2, cy, title)
    cy -= 12*mm
    hex_fill(c, accent)
    c.setFont('DejaVuBold', 14)
    c.drawCentredString(W / 2, cy, subtitle)
    cy -= 9*mm
    hex_fill(c, MUTED)
    c.setFont('DejaVu', 10)
    lines = wrap_text(tagline, 'DejaVu', 10, W - 2*MARGIN, c)
    for line in lines:
        c.drawCentredString(W / 2, cy, line)
        cy -= 13
    hex_fill(c, accent)
    c.rect(MARGIN, H/2 - 30*mm, CONTENT_W, 1.5, fill=1, stroke=0)
    cy = H/2 - 38*mm
    hex_fill(c, MUTED)
    c.setFont('DejaVu', 9)
    c.drawCentredString(W / 2, cy, 'Bu kilavuz sahne.today platformunun')
    c.drawCentredString(W / 2, cy - 13, 'temel ozelliklerini aciklamaktadir.')
    draw_footer(c, page_num, accent)

def draw_section_header(c, y, text, accent):
    hex_fill(c, TEXT)
    c.setFont('DejaVuBold', 16)
    c.drawString(MARGIN, y, text)
    y -= 5
    hex_fill(c, accent)
    c.rect(MARGIN, y, CONTENT_W, 2, fill=1, stroke=0)
    return y - 9

def draw_subsection(c, y, text, accent):
    hex_fill(c, accent)
    c.setFont('DejaVuBold', 11)
    c.drawString(MARGIN, y, text)
    return y - 7

def draw_body(c, y, text, indent=0):
    x = MARGIN + indent
    max_w = CONTENT_W - indent
    lines = wrap_text(text, 'DejaVu', 9.5, max_w, c)
    hex_fill(c, TEXT)
    c.setFont('DejaVu', 9.5)
    for line in lines:
        c.drawString(x, y, line)
        y -= 13
    return y

def draw_bullet(c, y, text, indent=4*mm):
    x = MARGIN + indent
    max_w = CONTENT_W - indent - 6*mm
    lines = wrap_text(text, 'DejaVu', 9.5, max_w, c)
    hex_fill(c, MUTED)
    c.setFont('DejaVu', 9.5)
    c.drawString(x, y, '•')
    hex_fill(c, TEXT)
    c.setFont('DejaVu', 9.5)
    for i, line in enumerate(lines):
        c.drawString(x + 5*mm, y, line)
        y -= 13
    return y

def draw_tip(c, y, text):
    max_w = CONTENT_W - 10*mm
    lines = wrap_text(text, 'DejaVu', 9, max_w, c)
    box_h = len(lines) * 13 + 10
    hex_fill(c, (18/255, 50/255, 40/255))
    c.rect(MARGIN, y - box_h + 6, CONTENT_W, box_h, fill=1, stroke=0)
    hex_fill(c, TIP_GREEN)
    c.rect(MARGIN, y - box_h + 6, 3, box_h, fill=1, stroke=0)
    hex_fill(c, TIP_GREEN)
    c.setFont('DejaVuBold', 9)
    c.drawString(MARGIN + 7*mm, y, 'İpucu:')
    hex_fill(c, (180/255, 230/255, 210/255))
    c.setFont('DejaVu', 9)
    ty = y - 13
    for line in lines:
        c.drawString(MARGIN + 7*mm, ty, line)
        ty -= 13
    return y - box_h - 5

def draw_note(c, y, text, accent):
    max_w = CONTENT_W - 10*mm
    lines = wrap_text(text, 'DejaVu', 9, max_w, c)
    box_h = len(lines) * 13 + 10
    r, g, b = accent
    hex_fill(c, (r*0.15, g*0.15, b*0.15))
    c.rect(MARGIN, y - box_h + 6, CONTENT_W, box_h, fill=1, stroke=0)
    hex_fill(c, accent)
    c.rect(MARGIN, y - box_h + 6, 3, box_h, fill=1, stroke=0)
    hex_fill(c, accent)
    c.setFont('DejaVuBold', 9)
    c.drawString(MARGIN + 7*mm, y, 'Not:')
    hex_fill(c, TEXT)
    c.setFont('DejaVu', 9)
    ty = y - 13
    for line in lines:
        c.drawString(MARGIN + 7*mm, ty, line)
        ty -= 13
    return y - box_h - 5

def check_page(c, y, accent, page_counter, min_y=50*mm):
    if y < min_y:
        draw_footer(c, page_counter[0], accent)
        c.showPage()
        draw_background(c)
        page_counter[0] += 1
        return H - MARGIN - 10*mm
    return y

def sp(y, pts=7):
    return y - pts

# ── Arka kapak ────────────────────────────────────────────────────────────────

def draw_back_cover(c, accent, page_counter):
    draw_footer(c, page_counter[0], accent)
    c.showPage(); page_counter[0] += 1
    draw_background(c)
    cy = H / 2 + 20*mm
    hex_fill(c, accent)
    c.setFont('DejaVuBold', 24)
    c.drawCentredString(W / 2, cy, 'SAHNE.TODAY')
    cy -= 10*mm
    hex_fill(c, MUTED)
    c.setFont('DejaVu', 11)
    c.drawCentredString(W / 2, cy, 'sahne.today')
    cy -= 8*mm
    hex_fill(c, MUTED)
    c.setFont('DejaVu', 9)
    c.drawCentredString(W / 2, cy, 'Muzisyenler, gruplar ve mekanlar icin platform.')
    draw_footer(c, page_counter[0], accent)


# ═══════════════════════════════════════════════════════════════════════════════
# PDF 3 — IZLEYICI (hedef A6: 8 sayfa = 1 A4 kitapcik)
# ═══════════════════════════════════════════════════════════════════════════════

def build_pdf3(path):
    ACC = ACC_AUDIENCE
    c = canvas.Canvas(path, pagesize=A4)
    c.setTitle('Sahne.Today — Izleyici Kilavuzu')
    pc = [1]

    draw_cover(c, 'IZLEYICI', 'Kullanim Kilavuzu',
               'Etkinlik kesfet, RSVP yap, bilet al, takip et, bildirim al.',
               ACC, pc[0])
    c.showPage(); pc[0] += 1
    draw_background(c)
    y = H - MARGIN

    # ── 1. KAYIT VE GIRIS ────────────────────────────────────────────────────
    y = draw_section_header(c, y, '1. Hesap Olusturma ve Giris', ACC)
    y = sp(y)
    y = draw_bullet(c, y, 'sahne.today adresine gidin, "Kayit Ol" butonuna tiklayin.')
    y = draw_bullet(c, y, 'Ad-soyad, e-posta ve sifre ile manuel kayit yapabilirsiniz.')
    y = draw_bullet(c, y, 'Google, Facebook veya Apple hesabinizla hizli kayit da mumkundur.')
    y = draw_bullet(c, y, 'Giris yapmak icin e-posta ve sifrenizi kullanin.')
    y = draw_bullet(c, y, 'Sifre sifirlamak icin "Sifremi Unuttum" linkiyle e-posta alin.')
    y = sp(y)
    y = draw_tip(c, y, 'Kayit olmadan da etkinliklere, sanatcilara ve mekanlara goz atabilirsiniz. Ancak RSVP, takip ve bilet alma icin giris yapmaniz gerekir.')
    y = sp(y)

    y = check_page(c, y, ACC, pc)

    # ── 2. ETKINLIK KESFI ────────────────────────────────────────────────────
    y = draw_section_header(c, y, '2. Etkinlik Kesfetme', ACC)
    y = sp(y)

    y = draw_subsection(c, y, 'Ana Sayfa', ACC)
    y = sp(y, 3)
    y = draw_bullet(c, y, 'Ana sayfada one cikan etkinlikler ve haftanin istatistikleri goruntulenir.')
    y = draw_bullet(c, y, 'Yakin tarihli onayli etkinlikler kronolojik sirayla listelenir.')
    y = sp(y)

    y = draw_subsection(c, y, 'Etkinlikler Sayfasi', ACC)
    y = sp(y, 3)
    y = draw_bullet(c, y, '"Etkinlikler" sayfasinda tum onayli etkinlikler listelenir.')
    y = draw_bullet(c, y, 'Liste veya takvim gorunumu arasinda gecis yapabilirsiniz.')
    y = draw_bullet(c, y, 'Sehir, etkinlik turu, giris tipi (ucretsiz/ucretli/kapida) filtreleri.')
    y = draw_bullet(c, y, 'Tarih araligi: Tumu, bugun, bu hafta veya bu ay.')
    y = draw_bullet(c, y, 'Takvim gorunumunde gunluk etkinlikleri portal uzerinde gorebilirsiniz.')
    y = sp(y)

    y = draw_subsection(c, y, 'Etkinlik Detay Sayfasi', ACC)
    y = sp(y, 3)
    y = draw_bullet(c, y, 'Her etkinlik kartina tiklayarak detay sayfasina ulasin.')
    y = draw_bullet(c, y, 'Tarih, saat, sanatci kadrosu, mekan bilgisi, giris ucreti ve afis.')
    y = draw_bullet(c, y, 'Etkinlik fotograflari, mekan konumu ve katilimci RSVP sayilari.')
    y = sp(y)

    y = draw_subsection(c, y, 'Arama', ACC)
    y = sp(y, 3)
    y = draw_bullet(c, y, 'Ust menudeki arama ile sanatci, grup, mekan veya etkinlik arayin.')
    y = draw_bullet(c, y, 'Sonuclar; Etkinlik, Sanatci ve Mekan sekmelerinde kategorize edilir.')
    y = sp(y)

    y = check_page(c, y, ACC, pc)

    # ── 3. RSVP VE BILET ─────────────────────────────────────────────────────
    y = draw_section_header(c, y, '3. RSVP ve Bilet Islemi', ACC)
    y = sp(y)

    y = draw_subsection(c, y, 'RSVP (Katilim Bildirimi)', ACC)
    y = sp(y, 3)
    y = draw_body(c, y, 'RSVP ile etkinlige katilim durumunuzu belirtebilir, mekan ve sanatciya katilimci sayisi hakkinda fikir verebilirsiniz.')
    y = sp(y)
    y = draw_bullet(c, y, '"Gidiyorum" — kesin katilacaginizi belirtir.')
    y = draw_bullet(c, y, '"Ilgileniyorum" — katilmayi dusundugunuzu belirtir.')
    y = draw_bullet(c, y, 'RSVP sayilari etkinlik sayfasinda herkese acik goruntulenir.')
    y = draw_bullet(c, y, 'RSVP\'nizi istediginiz zaman degistirebilir veya geri alabilirsiniz.')
    y = draw_bullet(c, y, 'RSVP yaptiginiz etkinlikler dashboard\'unuzda listelenir.')
    y = sp(y)

    y = draw_subsection(c, y, 'Bilet Alma', ACC)
    y = sp(y, 3)
    y = draw_bullet(c, y, 'Bilet satisi aktif etkinliklerde "Bilet Al" butonu gorunur.')
    y = draw_bullet(c, y, 'Adet secin (en fazla 10), isim ve iletisim bilgilerinizi girin.')
    y = draw_bullet(c, y, 'Odeme PayTR altyapisiyla guvenli sekilde gerceklesir.')
    y = draw_bullet(c, y, 'Biletiniz QR kodlu olarak e-postaniza gonderilir.')
    y = draw_bullet(c, y, 'Etkinlik gununde telefondaki QR kodu okutarak giris yapin.')
    y = sp(y)

    y = check_page(c, y, ACC, pc)

    # ── 4. KESIF VE TAKIP ────────────────────────────────────────────────────
    y = draw_section_header(c, y, '4. Sanatci, Grup ve Mekan Kesfi', ACC)
    y = sp(y)

    y = draw_subsection(c, y, 'Sanatci Profili', ACC)
    y = sp(y, 3)
    y = draw_bullet(c, y, 'Avatar, sahne adi, sehir, muzik ve sahne turleri, enstrumanlar, biyografi.')
    y = draw_bullet(c, y, 'Performans video linkleri (YouTube, Vimeo), teknik rider.')
    y = draw_bullet(c, y, 'Uyesi oldugu gruplar, gecmis mekanlar, yaklasan etkinlikler.')
    y = draw_bullet(c, y, 'Sosyal medya hesaplarina dogrudan linkler.')
    y = sp(y)

    y = draw_subsection(c, y, 'Grup Profili', ACC)
    y = sp(y, 3)
    y = draw_bullet(c, y, 'Grup logosu, uye listesi ve rolleri, muzik turleri.')
    y = draw_bullet(c, y, '"Muzisyen Ariyoruz" ilani ve yaklasan etkinlikler.')
    y = sp(y)

    y = draw_subsection(c, y, 'Mekan Profili', ACC)
    y = sp(y, 3)
    y = draw_bullet(c, y, 'Kapak fotografi, logo, adres, telefon, e-posta, web sitesi.')
    y = draw_bullet(c, y, 'Kapasite (oturma/ayakta), sahne alani, teknik donanim listesi.')
    y = draw_bullet(c, y, 'Acik slotlar, yaklasan ve gecmis etkinlikler, fotograf albumu.')
    y = sp(y)

    y = draw_subsection(c, y, 'Takip Etme', ACC)
    y = sp(y, 3)
    y = draw_body(c, y, 'Begendiginiz sanatci, grup veya mekanlari takip ederek yeni etkinliklerinden aninda haberdar olabilirsiniz.')
    y = sp(y)
    y = draw_bullet(c, y, 'Herhangi bir profil sayfasinda "Takip Et" butonuna tiklayin.')
    y = draw_bullet(c, y, 'Yeni etkinlikte uygulama ici ve e-posta bildirimi alirsiniz.')
    y = draw_bullet(c, y, 'Takibi birakmak icin ayni butona tekrar tiklayin.')
    y = draw_bullet(c, y, 'Takip listeniz dashboard\'unuzda goruntulenir.')
    y = sp(y)

    y = check_page(c, y, ACC, pc)

    # ── 5. PROFIL VE BILDIRIMLER ──────────────────────────────────────────────
    y = draw_section_header(c, y, '5. Profil, Bildirimler ve Diger Ozellikler', ACC)
    y = sp(y)

    y = draw_subsection(c, y, 'Profiliniz', ACC)
    y = sp(y, 3)
    y = draw_bullet(c, y, 'Dashboard\'dan gorunen ad, sehir, biyografi ve avatarinizi guncelleyin.')
    y = draw_bullet(c, y, '"Kurucu Uye" rozeti: Erken donem kullanicilara ozel altin yildiz rozeti.')
    y = draw_bullet(c, y, 'Kurucu uyeler otomatik olarak premium statuye sahip olur.')
    y = sp(y)

    y = draw_subsection(c, y, 'Bildirimler', ACC)
    y = sp(y, 3)
    y = draw_bullet(c, y, 'Ust menude zil ikonu; kirmizi rozet okunmamis bildirim sayisini gosterir.')
    y = draw_bullet(c, y, 'Bildirime tiklayarak dogrudan ilgili etkinlik veya sayfaya ulasabilirsiniz.')
    y = draw_bullet(c, y, '"Tumu Okundu" ile tum bildirimleri okunmus isaretleyin.')
    y = draw_bullet(c, y, 'Bildirimler sayfasinda gecmis tum bildirimleri gorebilirsiniz.')
    y = sp(y)

    y = draw_subsection(c, y, 'Takvim Abonelikleri', ACC)
    y = sp(y, 3)
    y = draw_bullet(c, y, 'Sanatci, grup ve mekan sayfalarindan ICS takvim abonelik linki alin.')
    y = draw_bullet(c, y, 'Linki Google Calendar, Apple Calendar veya Outlook\'a ekleyin.')
    y = draw_bullet(c, y, 'Etkinlikler otomatik olarak kisisel takviminizde guncellenir.')
    y = sp(y)

    y = draw_subsection(c, y, 'Sanatci veya Mekan Hesabi Acma', ACC)
    y = sp(y, 3)
    y = draw_bullet(c, y, 'Ayni hesabinizla "Sanatci Portali" veya "Mekan Portali"na tiklayin.')
    y = draw_bullet(c, y, 'Tek hesapta hem izleyici, hem sanatci, hem mekan profili yonetebilirsiniz.')
    y = sp(y)

    y = draw_subsection(c, y, 'Mesajlar', ACC)
    y = sp(y, 3)
    y = draw_bullet(c, y, 'Katildiginiz etkinlik veya grup sohbetlerine "Mesajlar" ikonundan erisin.')
    y = draw_bullet(c, y, 'Yeni mesaj geldiginde uygulama ici bildirim alirsiniz.')
    y = sp(y)

    y = draw_tip(c, y, 'Sahne.Today PWA desteklidir. Telefonunuzda tarayici menusunden "Ana Ekrana Ekle" ile uygulama gibi kullanabilirsiniz.')
    y = sp(y)

    y = draw_subsection(c, y, 'Ekip Ilanlari (Crew)', ACC)
    y = sp(y, 3)
    y = draw_bullet(c, y, '"Ekip" sayfasinda muzisyenler ve ekipler icin acik ilanlari goruntuleyin.')
    y = draw_bullet(c, y, 'Profilinizle giris yaparak kendi ekip ilaninizi da olusturabilirsiniz.')
    y = sp(y)

    y = draw_subsection(c, y, 'Etkinlik Takvimi Ihrac Etme', ACC)
    y = sp(y, 3)
    y = draw_bullet(c, y, 'Etkinlik sayfasindaki takvim ikonundan ICS dosyasi indirebilirsiniz.')
    y = draw_bullet(c, y, 'ICS dosyasini Google Calendar, Apple Calendar veya Outlook\'a aktarabilirsiniz.')
    y = sp(y)

    y = draw_tip(c, y, 'Ana sayfadaki istatistik cubugu bu haftaki etkinlik, acik slot ve aktif sanatci sayisini anlik gosterir. Platformu kesfetmeye buradan baslayabilirsiniz.')
    y = sp(y)

    draw_back_cover(c, ACC, pc)
    c.save()
    if hasattr(path, 'replace'):
        print(f'Olusturuldu: {path}')


# ═══════════════════════════════════════════════════════════════════════════════
# PDF 1 — SANATCI VE GRUP (hedef A6: 12 sayfa = 1.5 A4 kitapcik)
# ═══════════════════════════════════════════════════════════════════════════════

def build_pdf1(path):
    ACC = ACC_ARTIST
    c = canvas.Canvas(path, pagesize=A4)
    c.setTitle('Sahne.Today — Sanatci ve Grup Kilavuzu')
    pc = [1]

    draw_cover(c, 'SANATCI VE GRUP', 'Kullanim Kilavuzu',
               'Profil olustur, grup kur, etkinlik ekle, mesajlas, bilet sat.',
               ACC, pc[0])
    c.showPage(); pc[0] += 1
    draw_background(c)
    y = H - MARGIN

    # ── 1. HESAP VE PROFIL ───────────────────────────────────────────────────
    y = draw_section_header(c, y, '1. Hesap ve Sanatci Profili', ACC)
    y = sp(y)

    y = draw_subsection(c, y, 'Kayit ve Giris', ACC)
    y = sp(y, 3)
    y = draw_bullet(c, y, 'sahne.today adresine gidin, "Kayit Ol" butonuna tiklayin.')
    y = draw_bullet(c, y, 'Ad-soyad, e-posta, sifre girin; Google, Facebook veya Apple ile de kayit olabilirsiniz.')
    y = draw_bullet(c, y, 'E-posta ve sifrenizle giris yapin; sifre sifirlama e-posta ile yapilir.')
    y = sp(y)

    y = draw_subsection(c, y, 'Sanatci Profili Olusturma', ACC)
    y = sp(y, 3)
    y = draw_bullet(c, y, 'Ust menuden "Sanatci Portali"na tiklayin.')
    y = draw_bullet(c, y, 'Sahne adi, sehir, aktif sehirler, muzik ve sahne turlerini coklu secimle belirleyin.')
    y = draw_bullet(c, y, 'Enstrumanlarinizi secin; birden fazla enstruman ekleyebilirsiniz.')
    y = draw_bullet(c, y, 'Biyografi, sosyal medya linkleri (Instagram, Spotify, YouTube, TikTok, X) ekleyin.')
    y = draw_bullet(c, y, 'Kayit tamamlandiginda otomatik olarak dashboard\'a yonlendirilirsiniz.')
    y = sp(y)

    y = draw_subsection(c, y, 'Profil Duzenleme', ACC)
    y = sp(y, 3)
    y = draw_bullet(c, y, 'Dashboard veya profil sayfanizdan "Profili Duzenle" ile tum bilgileri guncelleyin.')
    y = draw_bullet(c, y, 'Teknik rider ekleyin: Ses sistemi, isik, backline gibi teknik gereksinimler.')
    y = draw_bullet(c, y, 'Gecmis mekan listenizi ekleyerek deneyiminizi sergileyin.')
    y = draw_bullet(c, y, 'Performans video linkleri (YouTube, Vimeo) profilinizde gosterilir.')
    y = draw_bullet(c, y, 'Profil gorunurlugunu "Gizli" yaparak sayfanizi yayindan kaldirabilirsiniz.')
    y = sp(y)

    y = draw_subsection(c, y, 'Avatar ve Fotograf', ACC)
    y = sp(y, 3)
    y = draw_bullet(c, y, 'Profil sayfanizda "Avatar Duzenle"ye tiklayin.')
    y = draw_bullet(c, y, 'JPG veya PNG fotograf yukleyin; otomatik kirpilarak profilinize eklenir.')
    y = sp(y)

    y = draw_tip(c, y, 'Eksiksiz bir profil (tur, enstruman, biyografi, video ve sosyal linkler) kesfedilme sansinizi belirgin sekilde artirir.')
    y = sp(y)

    y = check_page(c, y, ACC, pc)

    # ── 2. DASHBOARD ─────────────────────────────────────────────────────────
    y = draw_section_header(c, y, '2. Dashboard (Kontrol Paneli)', ACC)
    y = sp(y)
    y = draw_body(c, y, 'Dashboard, tum sanatci faaliyetlerinizi yonettiginiz merkezi ekrandir. Ust menuden adiniza veya "Panel" butonuna tiklayarak ulasabilirsiniz.')
    y = sp(y)
    y = draw_bullet(c, y, 'Yaklasan ve gecmis etkinliklerinizin takvim gorunumu.')
    y = draw_bullet(c, y, 'Size gelen mekan teklifleri: Kabul/red edin veya sure dolana kadar bekleyin.')
    y = draw_bullet(c, y, 'Uyesi oldugunuz gruplar; bekleyen davetler ve basvurular.')
    y = draw_bullet(c, y, '"Grup Ariyor" toggle\'i: Aktif ederseniz diger gruplar sizi bulup davet edebilir.')
    y = draw_bullet(c, y, 'Hizli etkinlik ekleme ve profil duzenleme butonlari.')
    y = draw_bullet(c, y, 'Mekan iptal talepleri: Onaylayin veya reddedin.')
    y = draw_bullet(c, y, 'Slot basvurularinizin durumu: Beklemede, kabul edildi veya reddedildi.')
    y = sp(y)

    y = check_page(c, y, ACC, pc)

    # ── 3. GRUP YONETIMI ─────────────────────────────────────────────────────
    y = draw_section_header(c, y, '3. Grup (Band) Yonetimi', ACC)
    y = sp(y)

    y = draw_subsection(c, y, 'Yeni Grup Kurma', ACC)
    y = sp(y, 3)
    y = draw_bullet(c, y, 'Dashboard veya "Gruplar" sayfasindan "Grup Olustur"a tiklayin.')
    y = draw_bullet(c, y, 'Grup adi, sehir, muzik turleri ve biyografi girin.')
    y = draw_bullet(c, y, 'Grup logosu veya fotograf yukleyin.')
    y = draw_bullet(c, y, 'Siz otomatik olarak grup kurucusu olursunuz.')
    y = sp(y)

    y = draw_subsection(c, y, 'Grup Profili Duzenleme', ACC)
    y = sp(y, 3)
    y = draw_bullet(c, y, 'Grup sayfasindan "Duzenle" ile tum bilgileri guncelleyin.')
    y = draw_bullet(c, y, '"Muzisyen Ariyoruz" bolumunden aranan enstruman ve rolleri belirtin.')
    y = draw_bullet(c, y, 'Fotograf albumu olusturun; sosyal medya linkleri ekleyin.')
    y = draw_bullet(c, y, 'Video linkleri ekleyerek grup performanslarinizi sergileyin.')
    y = sp(y)

    y = draw_subsection(c, y, 'Uye Davet Etme ve Yonetimi', ACC)
    y = sp(y, 3)
    y = draw_bullet(c, y, '"Uye Davet Et" butonuyla isme veya enstrumana gore sanatci arayin.')
    y = draw_bullet(c, y, 'Davet edilen sanatci kabul ederse gruba kabul edilmis uye olur.')
    y = draw_bullet(c, y, 'Her uyeye rol atayin: Gitar, Bas, Vokal, Davul, Klavye vb.')
    y = draw_bullet(c, y, '"Bekleyen Basvurular"dan basvurulari kabul veya reddedin.')
    y = sp(y)

    y = draw_tip(c, y, '"Muzisyen Ariyoruz" ozelligi acik gruplar, Gruplar sayfasinda ozel bir rozetle one cikar ve daha fazla sanatci basvurusu alir.')
    y = sp(y)

    y = check_page(c, y, ACC, pc)

    # ── 4. GRUBA KATILMA ─────────────────────────────────────────────────────
    y = draw_section_header(c, y, '4. Bir Gruba Katilma', ACC)
    y = sp(y)
    y = draw_subsection(c, y, 'Basvuru Yapma', ACC)
    y = sp(y, 3)
    y = draw_bullet(c, y, '"Gruplar" sayfasinda "Muzisyen Araniyor" filtreli gruplari kesfedin.')
    y = draw_bullet(c, y, 'Grup profilinde "Basvur" butonuna tiklayin.')
    y = draw_bullet(c, y, 'Grup kurucusu basvurunuzu degerlendirerek kabul veya reddeder.')
    y = sp(y)

    y = draw_subsection(c, y, 'Davet Kabul Etme', ACC)
    y = sp(y, 3)
    y = draw_bullet(c, y, 'Grup kurucusu sizi davet ederse bildirim alirsiniz.')
    y = draw_bullet(c, y, 'Bildirime tiklayarak veya ilgili grup sayfasindan kabul/red edin.')
    y = sp(y)

    y = draw_body(c, y, 'Kabul edildiginizde grup sohbetine ve etkinliklerine erisim kazanir, grup etkinliklerinde kadroda gorunursunuz.')
    y = sp(y)

    y = check_page(c, y, ACC, pc)

    # ── 5. ETKINLIK YONETIMI ─────────────────────────────────────────────────
    y = draw_section_header(c, y, '5. Etkinlik Yonetimi', ACC)
    y = sp(y)

    y = draw_subsection(c, y, 'Etkinlik Olusturma', ACC)
    y = sp(y, 3)
    y = draw_bullet(c, y, 'Dashboard\'dan "Etkinlik Ekle" ile baslik, tarih, saat ve tur girin.')
    y = draw_bullet(c, y, 'Mekan secin: Listeden secerseniz etkinlik "beklemede" olur, mekan onaylayinca aktif olur.')
    y = draw_bullet(c, y, 'Serbest mekan adi girerseniz etkinlik dogrudan "onaylandi" olarak yayinlanir.')
    y = draw_bullet(c, y, 'Grup adina etkinlik ekleyebilir, birden fazla sanatciyi etkinlige dahil edebilirsiniz.')
    y = draw_bullet(c, y, 'Bilet satisini aktif ederek etkinlikten gelir elde edebilirsiniz.')
    y = sp(y)

    y = draw_subsection(c, y, 'Mekan Tekliflerini Degerlendirme', ACC)
    y = sp(y, 3)
    y = draw_bullet(c, y, 'Mekanlar size belirli tarih ve saat icin teklif gonderebilir.')
    y = draw_bullet(c, y, 'Tekliflerin gecerlilik suresi 24 veya 48 saattir.')
    y = draw_bullet(c, y, 'Sure doldugunda teklif otomatik iptal olur.')
    y = draw_bullet(c, y, 'Dashboard veya bildirim uzerinden teklifi kabul/red edin.')
    y = draw_bullet(c, y, 'Bir teklifi kabul ettiginizde, ayni tarihli diger teklifler otomatik reddedilir.')
    y = sp(y)

    y = draw_subsection(c, y, 'Etkinlik Duzenleme ve Iptal', ACC)
    y = sp(y, 3)
    y = draw_bullet(c, y, 'Etkinlik sayfasindan "Duzenle" ile baslik, tarih, saat ve detaylari guncelleyin.')
    y = draw_bullet(c, y, 'Etkinlige afis ve fotograf yukleyerek gorsel zenginlik katabilirsiniz.')
    y = draw_bullet(c, y, '"Iptal Et" butonu ile etkinligi iptal edin; takipcilere bildirim gider.')
    y = draw_bullet(c, y, 'Mekan iptal talebi gonderdiginde dashboard\'dan onaylayabilir veya reddedebilirsiniz.')
    y = sp(y)

    y = draw_tip(c, y, 'Etkinlik onaylandiginda takipcilerinize otomatik e-posta ve uygulama ici bildirim gonderilir. Etkinlik linkini sosyal medyada paylasarak daha genis kitleye ulasabilirsiniz.')
    y = sp(y)

    y = check_page(c, y, ACC, pc)

    # ── 6. MESAJLASMA ────────────────────────────────────────────────────────
    y = draw_section_header(c, y, '6. Mesajlasma Sistemi', ACC)
    y = sp(y)

    y = draw_subsection(c, y, 'Grup Sohbeti', ACC)
    y = sp(y, 3)
    y = draw_bullet(c, y, 'Kabul edilmis uye oldugunuz gruplarda "Grup Sohbeti" butonu gorunur.')
    y = draw_bullet(c, y, 'Tum grup uyeleri ve kurucu burada mesajlasabilir.')
    y = draw_bullet(c, y, 'Yeni mesaj geldiginde uygulama ici bildirim alirsiniz.')
    y = sp(y)

    y = draw_subsection(c, y, 'Etkinlik Sohbeti', ACC)
    y = sp(y, 3)
    y = draw_bullet(c, y, 'Onaylanan her etkinlikte "Etkinlik Sohbeti" otomatik olarak olusturulur.')
    y = draw_bullet(c, y, 'Mekan sahibi, sanatcilar ve grup uyeleri bu sohbette koordinasyon saglayabilir.')
    y = sp(y)

    y = draw_subsection(c, y, 'Mesajlar Sayfasi', ACC)
    y = sp(y, 3)
    y = draw_bullet(c, y, 'Ust menuden mesajlar ikonu ile tum aktif sohbetlerinizi gorun.')
    y = draw_bullet(c, y, 'Okunmamis mesaj sayisi rozet olarak goruntulenir.')
    y = sp(y)

    y = check_page(c, y, ACC, pc)

    # ── 7. BILETLEME VE GELIR ────────────────────────────────────────────────
    y = draw_section_header(c, y, '7. Biletleme ve Gelir', ACC)
    y = sp(y)
    y = draw_bullet(c, y, 'Etkinlik duzenleme sayfasindan "Bilet Satisi"ni aktif edin.')
    y = draw_bullet(c, y, 'Bilet fiyati, toplam adet ve komisyon tercihini belirleyin.')
    y = draw_bullet(c, y, 'Katilimcilar QR kodlu biletle guvenli giris yapar.')
    y = draw_bullet(c, y, 'Dashboard\'dan "Bilet Raporlari" ile satis ve gelir durumunu takip edin.')
    y = draw_bullet(c, y, 'Etkinlik gunu /scan adresinden QR okuyucu ile giris kontrolu yapabilirsiniz.')
    y = sp(y)

    y = draw_note(c, y, 'Biletleme sistemi uzerinden satis yapildiginda platform komisyon kesintisi uygulanir. Detaylar icin iletisime gecin.', ACC)
    y = sp(y)

    y = check_page(c, y, ACC, pc)

    # ── 8. TAKIP, BILDIRIM VE TAKVIM ─────────────────────────────────────────
    y = draw_section_header(c, y, '8. Takip, Bildirim ve Takvim', ACC)
    y = sp(y)

    y = draw_subsection(c, y, 'Takipci Sistemi', ACC)
    y = sp(y, 3)
    y = draw_bullet(c, y, 'Izleyiciler ve diger sanatcilar profilinizi takip edebilir.')
    y = draw_bullet(c, y, 'Takipci sayiniz profil ve etkinlik sayfalarinda goruntulenir.')
    y = draw_bullet(c, y, 'Yeni etkinlik yayinladiginizda tum takipcilerinize otomatik bildirim gider.')
    y = sp(y)

    y = draw_subsection(c, y, 'Bildirimler', ACC)
    y = sp(y, 3)
    y = draw_bullet(c, y, 'Zil ikonu uzerindeki kirmizi rozet okunmamis bildirim sayisini gosterir.')
    y = draw_bullet(c, y, 'Mekan teklifleri, grup uyelik sonuclari, yeni mesajlar bildirim olarak gelir.')
    y = draw_bullet(c, y, 'Bildirimler sayfasinda tum gecmis bildirimleri goruntuleyebilirsiniz.')
    y = sp(y)

    y = draw_subsection(c, y, 'Takvim Abonelikleri', ACC)
    y = sp(y, 3)
    y = draw_bullet(c, y, 'Sanatci ve grup takvim sayfalarinda "Takvime Abone Ol" butonu mevcuttur.')
    y = draw_bullet(c, y, 'ICS linkini Google Calendar, Apple Calendar veya Outlook\'a ekleyin.')
    y = draw_bullet(c, y, 'Etkinlikler kisisel takviminizde otomatik olarak guncellenir.')
    y = sp(y)

    y = draw_tip(c, y, 'Takipci sayinizi artirmak icin profilinizi guncel tutun, duzenli etkinlik yayinlayin ve etkinlik linklerinizi sosyal medyada paylasin. Takvim abonelik linkinizi de paylasabilirsiniz.')
    y = sp(y)

    y = check_page(c, y, ACC, pc)

    # ── 9. OZET VE ONERILER ──────────────────────────────────────────────────
    y = draw_section_header(c, y, '9. Ozet ve Oneriler', ACC)
    y = sp(y)
    y = draw_bullet(c, y, 'Profilinizi %100 tamamlayin: Tur, enstruman, biyografi, sosyal linkler ve video.')
    y = draw_bullet(c, y, '"Grup Ariyor" toggle\'ini aktif ederek gruplardan davet alabilirsiniz.')
    y = draw_bullet(c, y, 'Mekan tekliflerini zamaninda yanitlayin; firsatlari kacirmayin.')
    y = draw_bullet(c, y, 'Bilet satisi ile etkinliklerinizden ek gelir elde edin.')
    y = draw_bullet(c, y, 'Etkinlik sohbetini mekanla iletisim icin aktif kullanin.')
    y = draw_bullet(c, y, 'Takvim aboneliginizi paylasarak takipcilerinizin etkinliklerinizi takvimlerine eklemesini saglayin.')
    y = sp(y)

    y = draw_section_header(c, y, '10. Ekip Ilanlari ve Grup Arama', ACC)
    y = sp(y)
    y = draw_bullet(c, y, '"Ekip" sayfasindan muzisyen arayan ilanlara goz atabilirsiniz.')
    y = draw_bullet(c, y, 'Kendi ilaninizi olusturarak aradiginiz enstruman veya rol icin cagri yapabilirsiniz.')
    y = draw_bullet(c, y, '"Grup Ariyor" toggle\'i acik sanatcilar, "Gruplar" sayfasinda gruplara onerilir.')
    y = draw_bullet(c, y, 'Dashboard\'daki "Grup Ariyor" notu ile ne aradiginizi kisa bir mesajla belirtin.')
    y = sp(y)

    y = draw_subsection(c, y, 'Etkinlige Sanatci Ekleme', ACC)
    y = sp(y, 3)
    y = draw_bullet(c, y, 'Etkinlik olustururken veya duzenlerken birden fazla sanatci kadroya eklenebilir.')
    y = draw_bullet(c, y, 'Eklenen her sanatci etkinlik sayfasinda kadroda goruntulenir.')
    y = draw_bullet(c, y, 'Grup etkinliklerinde tum grup uyeleri otomatik olarak kadroda yer alir.')
    y = sp(y)

    y = draw_tip(c, y, 'Sahne.Today\'de tek bir hesapla hem sanatci, hem grup uyesi, hem de mekan sahibi olabilirsiniz. Tum profilleriniz ayni dashboard altinda yonetilir.')
    y = sp(y)

    draw_back_cover(c, ACC, pc)
    c.save()
    if hasattr(path, 'replace'):
        print(f'Olusturuldu: {path}')


# ═══════════════════════════════════════════════════════════════════════════════
# PDF 2 — MEKAN (hedef A6: 12 sayfa = 1.5 A4 kitapcik)
# ═══════════════════════════════════════════════════════════════════════════════

def build_pdf2(path):
    ACC = ACC_VENUE
    c = canvas.Canvas(path, pagesize=A4)
    c.setTitle('Sahne.Today — Mekan Kilavuzu')
    pc = [1]

    draw_cover(c, 'MEKAN', 'Kullanim Kilavuzu',
               'Profil olustur, slot ac, etkinlik yonet, bilet sat, QR okut.',
               ACC, pc[0])
    c.showPage(); pc[0] += 1
    draw_background(c)
    y = H - MARGIN

    # ── 1. HESAP VE MEKAN PROFILI ────────────────────────────────────────────
    y = draw_section_header(c, y, '1. Hesap ve Mekan Profili', ACC)
    y = sp(y)

    y = draw_subsection(c, y, 'Mekan Portali', ACC)
    y = sp(y, 3)
    y = draw_bullet(c, y, 'Kayit olduktan sonra ust menuden "Mekan Portali"na tiklayin.')
    y = draw_bullet(c, y, 'Mekan adi, sehir, ilce ve tam adres bilgilerini girin.')
    y = draw_bullet(c, y, 'Mekan turunu secin: Pub, Canli Muzik, Tiyatro, Kafe, Kitabevi vb.')
    y = draw_bullet(c, y, 'Telefon, e-posta ve web sitesi gibi iletisim bilgilerini ekleyin.')
    y = draw_bullet(c, y, 'Olusturma tamamlandiginda otomatik dashboard\'a yonlendirilirsiniz.')
    y = sp(y)

    y = draw_subsection(c, y, 'Profil Detaylandirma', ACC)
    y = sp(y, 3)
    y = draw_bullet(c, y, 'Kapasite bilgileri: Oturma ve ayakta kisi sayisi, sahne alani olculeri.')
    y = draw_bullet(c, y, 'Teknik donanim: Ses sistemi, isik, backline, enstruman ekipmanlari.')
    y = draw_bullet(c, y, 'Muzik ve etkinlik turlerini coklu secimle profilinize ekleyin.')
    y = draw_bullet(c, y, 'Biyografi / aciklama metni ile mekaninizin hikayesini anlatin.')
    y = draw_bullet(c, y, 'Sosyal medya: Instagram, Facebook, X (Twitter) linkleri.')
    y = draw_bullet(c, y, 'Profil gorunurlugunu "Gizli" yaparak sayfanizi yayindan kaldirabilirsiniz.')
    y = sp(y)

    y = draw_subsection(c, y, 'Logo ve Kapak Fotografi', ACC)
    y = sp(y, 3)
    y = draw_bullet(c, y, 'Mekan sayfanizdan logo ve kapak fotografi yukleyin.')
    y = draw_bullet(c, y, 'Kapak fotografi profilin en ustunde buyuk boyutta gosterilir.')
    y = draw_bullet(c, y, 'Fotograf albumu olusturarak mekaninizin atmosferini sergileyin.')
    y = sp(y)

    y = draw_tip(c, y, 'Kaliteli kapak fotografi ve eksiksiz donanim bilgileri, sanatcilarin mekaniniza basvurma olasiligini belirgin sekilde artirir.')
    y = sp(y)

    y = check_page(c, y, ACC, pc)

    # ── 2. SLOT YONETIMI ─────────────────────────────────────────────────────
    y = draw_section_header(c, y, '2. Slot Yonetimi', ACC)
    y = sp(y)
    y = draw_body(c, y, 'Slotlar, mekaninizin performans programini olusturan tekrarlayan veya tek seferlik zaman dilimleridir. Acik slotlar "Mekanlar" sayfasinda sanatcilar tarafindan goruntulenir.')
    y = sp(y)

    y = draw_subsection(c, y, 'Slot Olusturma', ACC)
    y = sp(y, 3)
    y = draw_bullet(c, y, 'Dashboard\'dan "Slot Ekle" butonuna tiklayin.')
    y = draw_bullet(c, y, 'Gun, baslangic ve bitis saatini belirleyin.')
    y = draw_bullet(c, y, 'Tekrar sikligi secin: Haftalik, iki haftada bir veya tek seferlik.')
    y = draw_bullet(c, y, 'Etkinlik turunu belirleyin: Canli Muzik, Stand-up, DJ, Tiyatro vb.')
    y = draw_bullet(c, y, 'Ucret modeli: Ucretsiz, kapi paylasimi, garanti ucret veya pazarliga acik.')
    y = draw_bullet(c, y, 'Opsiyonel notlarla teknik gereksinimleri veya ozel kosullari belirtin.')
    y = sp(y)

    y = draw_subsection(c, y, 'Slotlari Yonetme', ACC)
    y = sp(y, 3)
    y = draw_bullet(c, y, 'Dashboard\'da aktif slotlariniz durumlariyla birlikte listelenir.')
    y = draw_bullet(c, y, 'Slot durumlari: Acik (yesil), bekleyen basvuru (sari), dolu (mor).')
    y = draw_bullet(c, y, 'Bir slotu kapatmak icin slota tiklayin ve "Kapat" secin.')
    y = draw_bullet(c, y, 'Sanatcilar acik slotlariniza basvurabilir; basvurulari dashboard\'dan yanitlayin.')
    y = sp(y)

    y = draw_tip(c, y, 'Duzenli bir programiniz yoksa "Tek Seferlik" secenegi ile yalnizca belirli gunler icin slot acin. Bu, program esnekligi saglar.')
    y = sp(y)

    y = check_page(c, y, ACC, pc)

    # ── 3. SANATCI BASVURULARI ───────────────────────────────────────────────
    y = draw_section_header(c, y, '3. Sanatci Basvurularini Degerlendirme', ACC)
    y = sp(y)
    y = draw_body(c, y, 'Sanatcilar acik slotlariniza basvurabilir veya mekaniniza dogrudan etkinlik talebi gonderebilir. Tum basvurular dashboard\'unuzda toplanir.')
    y = sp(y)
    y = draw_bullet(c, y, 'Slot basvurusu: Sanatci belirli bir slot gunu ve saati icin basvurur.')
    y = draw_bullet(c, y, 'Etkinlik talebi: Sanatci mekaniniza etkinlik ekler, "beklemede" gelir.')
    y = draw_bullet(c, y, 'Basvuruyu kabul ederseniz etkinlik otomatik olusturulur ve onaylanir.')
    y = draw_bullet(c, y, 'Reddederseniz sanatciya bildirim gider.')
    y = sp(y)
    y = draw_tip(c, y, 'Basvurulari hizli degerlendirmek sanatci memnuniyetini artirir. Dashboard\'u duzenli kontrol edin.')
    y = sp(y)

    y = check_page(c, y, ACC, pc)

    # ── 4. ETKINLIK YONETIMI ─────────────────────────────────────────────────
    y = draw_section_header(c, y, '4. Etkinlik Yonetimi', ACC)
    y = sp(y)

    y = draw_subsection(c, y, 'Sanatci veya Gruba Teklif Sunma', ACC)
    y = sp(y, 3)
    y = draw_bullet(c, y, 'Dashboard\'dan "Etkinlik Olustur" ile sanatci veya grup arayin ve secin.')
    y = draw_bullet(c, y, 'Tarih, saat, etkinlik turu ve detaylari girin.')
    y = draw_bullet(c, y, 'Teklif gecerlilik suresini 24 veya 48 saat olarak belirleyin.')
    y = draw_bullet(c, y, 'Sanatci kabul ederse etkinlik onaylanir ve takipcilere duyuru gider.')
    y = draw_bullet(c, y, 'Sanatci reddeder veya sure dolarsa bildirim alirsiniz.')
    y = sp(y)

    y = draw_subsection(c, y, 'Dogrudan Etkinlik Olusturma', ACC)
    y = sp(y, 3)
    y = draw_bullet(c, y, 'Sanatci atamadan, sadece mekan ve tarih belirterek etkinlik olusturabilirsiniz.')
    y = draw_bullet(c, y, 'Bu etkinlikler dogrudan "Onaylandi" statusuyle yayinlanir.')
    y = sp(y)

    y = draw_subsection(c, y, 'Etkinlik Duzenleme ve Iptal', ACC)
    y = sp(y, 3)
    y = draw_bullet(c, y, 'Etkinlik sayfasindan baslik, tarih, saat, tur ve giris ucretini guncelleyin.')
    y = draw_bullet(c, y, 'Etkinlige afis ve fotograf yukleyin.')
    y = draw_bullet(c, y, '"Iptal Et" ile etkinligi iptal edin; sanatcilara ve takipcilere bildirim gider.')
    y = draw_bullet(c, y, '"Iptal Talebi" gondererek sanatcidan iptal onayi isteyebilirsiniz.')
    y = sp(y)

    y = draw_tip(c, y, 'Etkinlik linkini sosyal medyada paylasarak katilimi artirabilirsiniz. Takipcileriniz yeni etkinliklerden otomatik haberdar olur.')
    y = sp(y)

    y = check_page(c, y, ACC, pc)

    # ── 5. BILETLEME ─────────────────────────────────────────────────────────
    y = draw_section_header(c, y, '5. Biletleme Sistemi', ACC)
    y = sp(y)
    y = draw_bullet(c, y, 'Etkinlik duzenleme sayfasindan "Bilet Satisi"ni aktif edin.')
    y = draw_bullet(c, y, 'Bilet fiyati, toplam adet ve komisyon dahil/haric tercihini belirleyin.')
    y = draw_bullet(c, y, 'Biletler PayTR odeme altyapisiyla guvenli olarak satilir.')
    y = draw_bullet(c, y, 'Etkinlik gununde /scan adresinden QR okuyucu ile giris kontrolu yapin.')
    y = draw_bullet(c, y, 'Gecerli bilet aninda onaylanir; kullanilmis bilet tekrar kabul edilmez.')
    y = draw_bullet(c, y, 'Dashboard\'dan "Bilet Raporlari" ile gelir ve satis bilgilerini gorun.')
    y = sp(y)
    y = draw_note(c, y, 'Mekan komisyon orani yonetici tarafindan belirlenir. Satis raporlarindan toplam gelir, satilan bilet adedi ve komisyon detaylarina ulasabilirsiniz.', ACC)
    y = sp(y)

    y = check_page(c, y, ACC, pc)

    # ── 6. MESAJLASMA VE ILETISIM ────────────────────────────────────────────
    y = draw_section_header(c, y, '6. Mesajlasma ve Iletisim', ACC)
    y = sp(y)
    y = draw_bullet(c, y, 'Onaylanan her etkinlikte otomatik "Etkinlik Sohbeti" olusturulur.')
    y = draw_bullet(c, y, 'Siz ve etkinlikteki tum sanatcilar burada mesajlasabilirsiniz.')
    y = draw_bullet(c, y, 'Yeni mesaj geldiginde uygulama ici bildirim alirsiniz.')
    y = draw_bullet(c, y, 'Etkinlik sayfasindan veya ust menuden "Mesajlar"a erisebilirsiniz.')
    y = draw_bullet(c, y, 'Etkinlik oncesi prova saatleri, teknik gereksinimler gibi konulari burada konusabilirsiniz.')
    y = sp(y)

    y = check_page(c, y, ACC, pc)

    # ── 7. TAKIP, BILDIRIM VE TAKVIM ─────────────────────────────────────────
    y = draw_section_header(c, y, '7. Takip, Bildirim ve Takvim', ACC)
    y = sp(y)
    y = draw_bullet(c, y, 'Sanatcilar ve izleyiciler mekaninizi takip edebilir.')
    y = draw_bullet(c, y, 'Yeni etkinlik onaylandiginda takipcilere otomatik bildirim ve e-posta gider.')
    y = draw_bullet(c, y, 'Sanatci teklif kabul/reddi ve basvuru sonuclari icin bildirim alirsiniz.')
    y = draw_bullet(c, y, 'Zil ikonu uzerindeki rozet okunmamis bildirim sayisini gosterir.')
    y = draw_bullet(c, y, 'Mekan takvim sayfanizdan ICS takvim aboneligi linki paylasabilirsiniz.')
    y = draw_bullet(c, y, 'Takipciler ICS linki ile etkinliklerinizi kendi takvimlerinde gorur.')
    y = sp(y)
    y = draw_tip(c, y, 'Takipci kitlenizi buyutmek icin duzenli etkinlik yayinlayin, profili guncel tutun ve etkinlik linklerini sosyal medyada paylasin.')
    y = sp(y)

    y = check_page(c, y, ACC, pc)

    # ── 8. DASHBOARD VE OZET ─────────────────────────────────────────────────
    y = draw_section_header(c, y, '8. Dashboard ve Ozet', ACC)
    y = sp(y)
    y = draw_subsection(c, y, 'Dashboard Ozeti', ACC)
    y = sp(y, 3)
    y = draw_bullet(c, y, 'Slot doluluk ozeti: Acik, bekleyen ve dolu slot sayilari.')
    y = draw_bullet(c, y, 'Bekleyen sanatci basvurulari ve gonderdiginiz tekliflerin durumlari.')
    y = draw_bullet(c, y, 'Sanatcidan gelen etkinlik talepleri — onaylayin veya reddedin.')
    y = draw_bullet(c, y, 'Yaklasan etkinliklerin takvim gorunumu.')
    y = draw_bullet(c, y, 'Bilet satis ozeti ve QR tarayiciya hizli erisim.')
    y = sp(y)

    y = draw_subsection(c, y, 'Oneriler', ACC)
    y = sp(y, 3)
    y = draw_bullet(c, y, 'Slotlarinizi guncel tutun; dolu slotlar otomatik kapanir.')
    y = draw_bullet(c, y, 'Bilet satisi icin etkinligi zamaninda yapilandirin.')
    y = draw_bullet(c, y, 'Fotograf albumunu guncelleyerek mekaninizi cezbedici gosterin.')
    y = draw_bullet(c, y, 'Etkinlik oncesi sohbeti sanatcilarla koordinasyon icin kullanin.')
    y = draw_bullet(c, y, 'Takvim abonelik linkini duzenli musterilerinizle paylasin.')
    y = sp(y)

    y = draw_section_header(c, y, '9. Mekan Takvim Sayfasi', ACC)
    y = sp(y)
    y = draw_body(c, y, 'Her mekanin kendine ozel bir takvim sayfasi bulunur. Bu sayfa sanatcilar tarafindan slot kesfetmek ve basvuru yapmak icin kullanilir.')
    y = sp(y)
    y = draw_bullet(c, y, 'Acik slotlariniz takvimde gun ve saat bazinda goruntulenir.')
    y = draw_bullet(c, y, 'Sanatcilar bos gunlere dogrudan basvuru yapabilir.')
    y = draw_bullet(c, y, '"Takvime Abone Ol" ile ICS linki alip sanatcilarla paylasabilirsiniz.')
    y = draw_bullet(c, y, 'Takvim linki mekan profilinizin ust kisminda yer alir.')
    y = sp(y)

    y = draw_section_header(c, y, '10. Dogrulama ve Guvenlik', ACC)
    y = sp(y)
    y = draw_bullet(c, y, 'Mekan profiliniz olusturulduktan sonra "Dogrulanmis" rozeti talep edebilirsiniz.')
    y = draw_bullet(c, y, 'Dogrulanmis mekanlar arama sonuclarinda ve kesif sayfalarinda one cikar.')
    y = draw_bullet(c, y, 'Sahipsiz bir mekanin kontrolunu "Mekan Sahiplen" ozelligi ile alabilirsiniz.')
    y = draw_bullet(c, y, 'Profil gorunurlugunu istediginiz zaman acip kapatabilirsiniz.')
    y = sp(y)

    y = draw_tip(c, y, 'Mekan takvim sayfanizin linkini sosyal medya biyografinize veya web sitenize ekleyerek sanatcilarin size kolayca ulasmasini saglayabilirsiniz.')
    y = sp(y)

    draw_back_cover(c, ACC, pc)
    c.save()
    if hasattr(path, 'replace'):
        print(f'Olusturuldu: {path}')


# ── Ana program ────────────────────────────────────────────────────────────────

if __name__ == '__main__':
    out = os.path.dirname(__file__)
    build_pdf1(os.path.join(out, 'Sahne_Today_01_Sanatci_ve_Grup.pdf'))
    build_pdf2(os.path.join(out, 'Sahne_Today_02_Mekan.pdf'))
    build_pdf3(os.path.join(out, 'Sahne_Today_03_Izleyici.pdf'))
    print('Tum A4 PDFler olusturuldu.')
