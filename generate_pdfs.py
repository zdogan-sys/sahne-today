#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Sahne.Today Kullanim Kilavuzlari — Ortak icerik modulu.

3 hedef kitle: Izleyici, Sanatci/Grup, Mekan
3 format: A4 (PC), A6 (telefon), A5 kitapcik (3 A5 ust uste katla → 12 sf)

Mimari: build_*() fonksiyonlari icerigi tanimlar.
Format betikleri (generate_a4.py, generate_a6.py, generate_booklet.py)
sayfa boyutu / font / margin degiskenlerini ezerek ayni icerigi farkli boyutlarda uretir.
"""

import os
from reportlab.pdfgen import canvas
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.lib.pagesizes import A4, A6, A5, landscape
from reportlab.lib.units import mm
from reportlab.graphics.barcode.qr import QrCodeWidget
from reportlab.graphics.shapes import Drawing
from reportlab.graphics import renderPDF

# ── Fontlar ──────────────────────────────────────────────────────────────────
FONTS_DIR = os.path.join(os.path.dirname(__file__), 'fonts')
pdfmetrics.registerFont(TTFont('DejaVu',     os.path.join(FONTS_DIR, 'DejaVuSans.ttf')))
pdfmetrics.registerFont(TTFont('DejaVuBold', os.path.join(FONTS_DIR, 'DejaVuSans-Bold.ttf')))

# ── Varsayilan A4 renkleri (koyu tema) ──────────────────────────────────────
BG        = (10/255,  10/255,  11/255)
TEXT      = (228/255, 224/255, 216/255)
MUTED     = (136/255, 133/255, 128/255)
TIP_GREEN = (29/255,  158/255, 117/255)

ACC_ARTIST   = (212/255,  83/255, 126/255)
ACC_VENUE    = ( 29/255, 158/255, 117/255)
ACC_AUDIENCE = (143/255, 136/255, 212/255)

# ── Varsayilan A4 boyutlari ──────────────────────────────────────────────────
PAGE_SIZE = A4
W, H = A4
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
    c.drawCentredString(W / 2, 10*mm, f'sahne.today   —   {page_num}')
    hex_stroke(c, accent)
    c.setLineWidth(0.5)
    c.line(MARGIN, 14*mm, W - MARGIN, 14*mm)

def draw_qr(c, cx, cy, size, url='https://sahne.today'):
    """Ortali QR kod cizer."""
    qr = QrCodeWidget(url)
    b = qr.getBounds()
    bw, bh = b[2] - b[0], b[3] - b[1]
    d = Drawing(size, size, transform=[size/bw, 0, 0, size/bh, 0, 0])
    d.add(qr)
    renderPDF.draw(d, c, cx - size/2, cy - size/2)

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
    # QR kod
    qr_size = 22*mm
    draw_qr(c, W/2, H/2 - 50*mm, qr_size)
    hex_fill(c, MUTED)
    c.setFont('DejaVu', 7)
    c.drawCentredString(W/2, H/2 - 50*mm - qr_size/2 - 5, 'sahne.today')
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
    c.drawCentredString(W / 2, cy, 'Canli muzik ve performans ekosistemi.')
    qr_size = 16*mm
    draw_qr(c, W/2, cy - 18*mm, qr_size)
    draw_footer(c, page_counter[0], accent)

# ── Ortak bolum: Hesap Yonetimi ──────────────────────────────────────────────

def draw_account_section(c, y, accent):
    """Tum kilavuzlarda ortak: kayit, giris, sifre, e-posta, profil."""
    y = draw_section_header(c, y, 'Hesap Yonetimi (Tum Kullanicilar Icin)', accent)
    y = sp(y)

    y = draw_subsection(c, y, 'Kayit Olma', accent)
    y = sp(y, 3)
    y = draw_bullet(c, y, 'sahne.today adresine gidin, sag ustteki "Kayit Ol" butonuna tiklayin.')
    y = draw_bullet(c, y, 'Ad, soyad, e-posta ve sifre bilgilerinizi girin.')
    y = draw_bullet(c, y, 'Dilerseniz Google, Facebook veya Apple hesabinizla hizli kayit olabilirsiniz.')
    y = draw_bullet(c, y, 'Kayit sirasinda gecerli bir e-posta adresi kullanmaniz onemlidir; dogrulama ve bildirimler bu adrese gonderilir.')
    y = sp(y)

    y = draw_subsection(c, y, 'Giris Yapma', accent)
    y = sp(y, 3)
    y = draw_bullet(c, y, 'Kayitli e-posta ve sifrenizle giris yapin.')
    y = draw_bullet(c, y, 'Sosyal hesapla kayit olduysaniz ayni yontemle giris yapabilirsiniz.')
    y = sp(y)

    y = draw_subsection(c, y, 'Sifre Degistirme', accent)
    y = sp(y, 3)
    y = draw_bullet(c, y, 'Giris sayfasinda "Sifremi Unuttum" baglantisina tiklayin.')
    y = draw_bullet(c, y, 'Kayitli e-posta adresinize sifre sifirlama baglantisi gonderilir.')
    y = draw_bullet(c, y, 'E-postadaki baglantiya tiklayarak yeni sifrenizi belirleyin.')
    y = draw_bullet(c, y, 'Sifreniz en az 6 karakter olmali, buyuk-kucuk harf ve rakam icermelidir.')
    y = sp(y)

    y = draw_subsection(c, y, 'E-posta Degistirme', accent)
    y = sp(y, 3)
    y = draw_bullet(c, y, 'E-posta adresinizi degistirmek icin dashboard uzerinden profil ayarlariniza gidin.')
    y = draw_bullet(c, y, 'Yeni e-posta adresinizi girin ve dogrulama adimini takip edin.')
    y = draw_bullet(c, y, 'E-posta degisikligi onaylanana kadar eski adresiniz gecerli kalir.')
    y = sp(y)

    y = draw_subsection(c, y, 'Profil Bilgileri', accent)
    y = sp(y, 3)
    y = draw_bullet(c, y, 'Dashboard uzerinden gorunen ad, sehir ve biyografi bilgilerinizi guncelleyebilirsiniz.')
    y = draw_bullet(c, y, 'Profil fotografi (avatar) yukleyerek hesabinizi kisilestirebilirsiniz.')
    y = sp(y)

    return y


# ═══════════════════════════════════════════════════════════════════════════════
# PDF 1 — IZLEYICI  (hedef: 12 A6 sayfa → 3 A5 kitapcik)
# ═══════════════════════════════════════════════════════════════════════════════

def build_izleyici(path):
    ACC = ACC_AUDIENCE
    c = canvas.Canvas(path, pagesize=PAGE_SIZE)
    c.setTitle('Sahne.Today — Izleyici Kilavuzu')
    pc = [1]

    draw_cover(c, 'IZLEYICI', 'Kullanim Kilavuzu',
               'Etkinlik kesfet, takip et, RSVP yap, bilet al.',
               ACC, pc[0])
    c.showPage(); pc[0] += 1
    draw_background(c)
    y = H - MARGIN

    # 1. Hesap Yonetimi (ortak)
    y = draw_account_section(c, y, ACC)
    y = check_page(c, y, ACC, pc)

    # 2. Ana Sayfa ve Etkinlik Kesfi
    y = draw_section_header(c, y, 'Etkinlik Kesfetme', ACC)
    y = sp(y)

    y = draw_subsection(c, y, 'Ana Sayfa', ACC)
    y = sp(y, 3)
    y = draw_bullet(c, y, 'Ana sayfada one cikan etkinlikler, haftalik istatistikler ve yakin tarihli etkinlik akisi goruntulenir.')
    y = draw_bullet(c, y, 'Istatistik cubugu: Bu haftaki etkinlik, acik slot ve aktif sanatci sayisini gosterir.')
    y = sp(y)

    y = draw_subsection(c, y, 'Etkinlikler Sayfasi', ACC)
    y = sp(y, 3)
    y = draw_bullet(c, y, 'Ust menuden "Etkinlikler"e tiklayarak tum onayli etkinlikleri listeleyin.')
    y = draw_bullet(c, y, 'Liste veya takvim gorunumu arasinda gecis yapabilirsiniz.')
    y = draw_bullet(c, y, 'Filtreler: Sehir, etkinlik turu, giris tipi (ucretsiz, ucretli, kapida) ve tarih araligi.')
    y = draw_bullet(c, y, 'Takvim gorunumunde gunluk etkinlikler portal pencerede topluca gorunur.')
    y = sp(y)

    y = draw_subsection(c, y, 'Etkinlik Detay Sayfasi', ACC)
    y = sp(y, 3)
    y = draw_bullet(c, y, 'Etkinlik kartina tiklayarak detayli bilgiye ulasin.')
    y = draw_bullet(c, y, 'Tarih, saat, sanatci kadrosu, mekan bilgisi, giris ucreti ve afis goruntulenir.')
    y = draw_bullet(c, y, 'Etkinlik fotograflari, mekan konumu, katilimci RSVP sayilari detay sayfasinda yer alir.')
    y = sp(y)

    y = draw_subsection(c, y, 'Arama', ACC)
    y = sp(y, 3)
    y = draw_bullet(c, y, 'Ust menudeki arama ikonuyla sanatci, grup, mekan veya etkinlik arayabilirsiniz.')
    y = draw_bullet(c, y, 'Sonuclar Etkinlik, Sanatci ve Mekan sekmelerinde kategorilere ayrilir.')
    y = draw_bullet(c, y, 'Arama sonuclari sehir ve ture gore filtrelenebilir.')
    y = sp(y)

    y = draw_subsection(c, y, 'Sehir Bazinda Kesif', ACC)
    y = sp(y, 3)
    y = draw_bullet(c, y, 'Etkinlikler sayfasinda sehir filtresiyle bulundugunuz sehirdeki etkinliklere goz atin.')
    y = draw_bullet(c, y, 'Mekanlar sayfasindan sehrinizdeki mekanlari ve acik slotlarini goruntuleyin.')
    y = draw_bullet(c, y, 'Sanatcilar sayfasinda sehre gore sanatci ve grup aramasi yapabilirsiniz.')
    y = sp(y)

    y = check_page(c, y, ACC, pc)

    # 3. RSVP ve Bilet
    y = draw_section_header(c, y, 'RSVP ve Bilet Islemi', ACC)
    y = sp(y)

    y = draw_subsection(c, y, 'RSVP (Katilim Bildirimi)', ACC)
    y = sp(y, 3)
    y = draw_body(c, y, 'RSVP ile etkinlige katilim durumunuzu "Gidiyorum" veya "Ilgileniyorum" seklinde belirtebilirsiniz.')
    y = sp(y)
    y = draw_bullet(c, y, '"Gidiyorum" — kesinlikle katilacaginizi belirtir.')
    y = draw_bullet(c, y, '"Ilgileniyorum" — katilmayi dusundugunuzu belirtir.')
    y = draw_bullet(c, y, 'RSVP sayilari herkese aciktir; mekan ve sanatciya katilim fikri verir.')
    y = draw_bullet(c, y, 'RSVP\'nizi istediginiz zaman degistirebilir veya geri alabilirsiniz.')
    y = draw_bullet(c, y, 'RSVP yaptiginiz etkinlikler dashboard\'unuzda listelenir.')
    y = sp(y)

    y = draw_subsection(c, y, 'Bilet Alma', ACC)
    y = sp(y, 3)
    y = draw_bullet(c, y, 'Bilet satisi aktif etkinliklerde "Bilet Al" butonu gorunur.')
    y = draw_bullet(c, y, 'Adet secin (en fazla 10), isim ve iletisim bilgilerinizi girin.')
    y = draw_bullet(c, y, 'Odeme PayTR altyapisiyla guvenli sekilde gerceklesir.')
    y = draw_bullet(c, y, 'Biletiniz QR kodlu olarak e-postaniza gonderilir; PDF olarak da indirebilirsiniz.')
    y = draw_bullet(c, y, 'Etkinlik gununde telefondaki QR kodu okutarak giris yapin.')
    y = draw_bullet(c, y, 'Biletleriniz dashboard\'daki "Biletlerim" bolumunde saklanir.')
    y = sp(y)
    y = draw_note(c, y, 'Bilet iptali veya iadesi etkinlik duzenleyicisinin politikasina baglidir. Iptal kosullari icin etkinlik detay sayfasini kontrol edin.', ACC)
    y = sp(y)

    y = check_page(c, y, ACC, pc)

    # 4. Sanatci, Grup ve Mekan Kesfi
    y = draw_section_header(c, y, 'Sanatci, Grup ve Mekanlari Kesfetme', ACC)
    y = sp(y)

    y = draw_subsection(c, y, 'Sanatci Sayfasi', ACC)
    y = sp(y, 3)
    y = draw_bullet(c, y, 'Sahne adi, sehir, muzik ve sahne turleri, enstrumanlar, biyografi.')
    y = draw_bullet(c, y, 'Performans videolari, teknik rider, gecmis mekanlar, uye oldugu gruplar.')
    y = draw_bullet(c, y, 'Yaklasan etkinlikler, takvim gorunumu ve sosyal medya baglantilari.')
    y = draw_bullet(c, y, '"Takip Et" butonu ile sanatcinin yeni etkinliklerinden haberdar olun.')
    y = sp(y)

    y = draw_subsection(c, y, 'Grup Sayfasi', ACC)
    y = sp(y, 3)
    y = draw_bullet(c, y, 'Grup logosu, uye listesi ve rolleri, muzik turleri, biyografi.')
    y = draw_bullet(c, y, '"Muzisyen Ariyoruz" ilani, yaklasan etkinlikler, fotograf albumu.')
    y = draw_bullet(c, y, 'Grup uyelerinin bireysel sanatci profillerine baglantilar.')
    y = sp(y)

    y = draw_subsection(c, y, 'Mekan Sayfasi', ACC)
    y = sp(y, 3)
    y = draw_bullet(c, y, 'Kapak fotografi, logo, adres, telefon, e-posta, web sitesi.')
    y = draw_bullet(c, y, 'Kapasite bilgileri, teknik donanim listesi, acik slotlar.')
    y = draw_bullet(c, y, 'Yaklasan ve gecmis etkinlikler, fotograf albumu.')
    y = draw_bullet(c, y, 'Mekan takvim sayfasindan bos gunleri ve acik slotlari goruntuleyin.')
    y = sp(y)

    y = draw_tip(c, y, 'Kayit olmadan da etkinlik, sanatci ve mekan sayfalarina goz atabilirsiniz. Ancak RSVP, takip ve bilet alma islemleri icin giris yapmaniz gerekir.')
    y = sp(y)

    y = check_page(c, y, ACC, pc)

    # 5. Takip Etme
    y = draw_section_header(c, y, 'Takip Etme', ACC)
    y = sp(y)
    y = draw_body(c, y, 'Begendiginiz sanatci, grup veya mekanlari takip ederek yeni etkinliklerinden aninda haberdar olabilirsiniz.')
    y = sp(y)
    y = draw_bullet(c, y, 'Profil sayfasindaki "Takip Et" butonuna tiklayin.')
    y = draw_bullet(c, y, 'Takip ettiginiz hesaplarin yeni etkinliklerinde uygulama ici ve e-posta bildirimi alirsiniz.')
    y = draw_bullet(c, y, 'Takibi birakmak icin "Takip Ediliyor" butonuna tekrar tiklayin.')
    y = draw_bullet(c, y, 'Takip listenize dashboard uzerinden "Takip Ettiklerim" sekmesinden ulasabilirsiniz.')
    y = sp(y)

    y = draw_subsection(c, y, 'Bildirimler', ACC)
    y = sp(y, 3)
    y = draw_bullet(c, y, 'Ust menude zil ikonu; kirmizi rozet okunmamis bildirim sayisini gosterir.')
    y = draw_bullet(c, y, 'Bildirime tiklayarak dogrudan ilgili sayfaya ulasabilirsiniz.')
    y = draw_bullet(c, y, 'Bildirimler sayfasinda gecmis tum bildirimleri goruntuleyebilirsiniz.')
    y = draw_bullet(c, y, 'Bildirimler; yeni etkinlik, RSVP guncellemesi ve mesaj gibi olaylari kapsar.')
    y = sp(y)

    y = check_page(c, y, ACC, pc)

    # 6. Dashboard (Izleyici Paneli)
    y = draw_section_header(c, y, 'Dashboard (Izleyici Paneli)', ACC)
    y = sp(y)
    y = draw_body(c, y, 'Giris yaptiktan sonra sag ustteki adiniza tiklayarak dashboard\'unuza ulasabilirsiniz. Dashboard, tum kisisel faaliyetlerinizi toplu olarak gordugunuz alandir.')
    y = sp(y)
    y = draw_bullet(c, y, 'RSVP\'lerim: Katilacaginiz veya ilgilendiginiz etkinlikleri goruntuleyin.')
    y = draw_bullet(c, y, 'Takip Ettiklerim: Takip ettiginiz sanatci, grup ve mekanlarin listesi.')
    y = draw_bullet(c, y, 'Biletlerim: Satin aldiginiz biletler ve QR kodlari.')
    y = draw_bullet(c, y, 'Profil Duzenleme: Gorunen ad, sehir, biyografi ve avatar bilgilerinizi guncelleyin.')
    y = draw_bullet(c, y, 'Hesap Ayarlari: E-posta ve sifre degisikligi gibi temel ayarlariniza erisin.')
    y = sp(y)

    y = check_page(c, y, ACC, pc)

    # 7. Kultur Takvimi Olusturma
    y = draw_section_header(c, y, 'Kultur Takvimi Olusturma', ACC)
    y = sp(y)
    y = draw_body(c, y, 'Sahne.Today size ozel bir kultur takvimi olusturmanizi saglar. Takip ettikleriniz ve RSVP\'lerinizle kendi ajandanizi kurabilirsiniz.')
    y = sp(y)
    y = draw_bullet(c, y, 'Takip ettiginiz sanatci, grup ve mekanlarin etkinlikleri takviminizde gorunur.')
    y = draw_bullet(c, y, 'ICS takvim abonelikleriyle etkinlikleri kisisel takviminize (Google, Apple, Outlook) aktarin.')
    y = draw_bullet(c, y, 'RSVP yaptiginiz etkinlikler otomatik olarak "Etkinliklerim" listesine eklenir.')
    y = draw_bullet(c, y, 'Sehir bazinda filtreleme ile yalnizca ulasabileceginiz etkinliklere odaklanin.')
    y = sp(y)
    y = draw_tip(c, y, 'Haftalik etkinlik bulteni almak icin e-posta bildirimlerini acik tutun. Boylece sehrinizdeki yenilikleri kacirmazsiniz.')
    y = sp(y)

    y = check_page(c, y, ACC, pc)

    # 8. Takvim, PWA ve Daha Fazlasi
    y = draw_section_header(c, y, 'Takvim, PWA ve Daha Fazlasi', ACC)
    y = sp(y)

    y = draw_subsection(c, y, 'Takvim Abonelikleri (ICS)', ACC)
    y = sp(y, 3)
    y = draw_bullet(c, y, 'Sanatci, grup ve mekan sayfalarindan ICS takvim linki alabilirsiniz.')
    y = draw_bullet(c, y, 'Linki Google Calendar, Apple Calendar veya Outlook\'a ekleyin.')
    y = draw_bullet(c, y, 'Etkinlikler takviminizde otomatik guncellenir.')
    y = draw_bullet(c, y, 'Birden fazla sanatci veya mekanin ICS linkini takviminize ekleyebilirsiniz.')
    y = sp(y)

    y = draw_subsection(c, y, 'PWA — Telefona Yukleme', ACC)
    y = sp(y, 3)
    y = draw_bullet(c, y, 'Sahne.Today PWA desteklidir; tarayici menusunden "Ana Ekrana Ekle"ye tiklayin.')
    y = draw_bullet(c, y, 'Uygulama gibi acilir, bildirim alabilir ve cevrimdisi sayfalari goruntuleyebilirsiniz.')
    y = draw_bullet(c, y, 'iOS (Safari) ve Android (Chrome) tarayicilarda sorunsuz calisir.')
    y = sp(y)

    y = draw_subsection(c, y, 'Sanatci veya Mekan Hesabi Acma', ACC)
    y = sp(y, 3)
    y = draw_bullet(c, y, 'Ayni hesabinizla "Sanatci Portali" veya "Mekan Portali"na tiklayarak profil olusturabilirsiniz.')
    y = draw_bullet(c, y, 'Tek hesap uzerinden hem izleyici, hem sanatci, hem de mekan profili yonetebilirsiniz.')
    y = sp(y)

    y = draw_subsection(c, y, 'Ekip Ilanlari (Crew)', ACC)
    y = sp(y, 3)
    y = draw_bullet(c, y, '"Ekip" sayfasinda muzisyenler ve gruplar icin acik ilanlari goruntuleyin.')
    y = draw_bullet(c, y, 'Dilerseniz kendi ilaninizi olusturarak aradiginiz enstruman veya rol icin cagri yapin.')
    y = sp(y)

    y = draw_subsection(c, y, 'Etkinlik Paylasma', ACC)
    y = sp(y, 3)
    y = draw_bullet(c, y, 'Her etkinlik sayfasinda paylasma baglantisi bulunur.')
    y = draw_bullet(c, y, 'Etkinlik linkini kopyalayip sosyal medyada veya mesajla paylasabilirsiniz.')
    y = draw_bullet(c, y, 'Paylasilan link, etkinlik detayina dogrudan erisim saglar.')
    y = sp(y)

    y = draw_tip(c, y, 'Sahne.Today\'i kesfetmeye ana sayfadaki etkinlik akisindan baslayabilir, begendiginiz sanatcilari takip ederek kendi kultur takviminizi olusturabilirsiniz.')
    y = sp(y)

    draw_back_cover(c, ACC, pc)
    c.save()
    if hasattr(path, 'replace'):
        print(f'Olusturuldu: {path}')


# ═══════════════════════════════════════════════════════════════════════════════
# PDF 2 — SANATCI VE GRUP  (hedef: 20 A6 sayfa → 5 A5 kitapcik)
# ═══════════════════════════════════════════════════════════════════════════════

def build_sanatci(path):
    ACC = ACC_ARTIST
    c = canvas.Canvas(path, pagesize=PAGE_SIZE)
    c.setTitle('Sahne.Today — Sanatci ve Grup Kilavuzu')
    pc = [1]

    draw_cover(c, 'SANATCI VE GRUP', 'Kullanim Kilavuzu',
               'Profil olustur, grup kur, etkinlik ekle, mesajlas, bilet sat.',
               ACC, pc[0])
    c.showPage(); pc[0] += 1
    draw_background(c)
    y = H - MARGIN

    # 1. Hesap Yonetimi (ortak)
    y = draw_account_section(c, y, ACC)
    y = check_page(c, y, ACC, pc)

    # 2. Sanatci Profili
    y = draw_section_header(c, y, 'Sanatci Profili Olusturma', ACC)
    y = sp(y)
    y = draw_bullet(c, y, 'Ust menuden "Sanatci Portali"na tiklayin.')
    y = draw_bullet(c, y, 'Sahne adi, sehir, aktif sehirler, muzik ve sahne turlerini coklu secimle belirleyin.')
    y = draw_bullet(c, y, 'Enstrumanlarinizi secin; birden fazla enstruman ekleyebilirsiniz.')
    y = draw_bullet(c, y, 'Biyografi, Instagram, Spotify, YouTube, TikTok, X gibi sosyal medya linkleri ekleyin.')
    y = draw_bullet(c, y, 'Kayit tamamlandiginda otomatik olarak dashboard\'a yonlendirilirsiniz.')
    y = sp(y)

    y = draw_subsection(c, y, 'Profil Duzenleme', ACC)
    y = sp(y, 3)
    y = draw_bullet(c, y, 'Dashboard veya profil sayfanizdan "Profili Duzenle" ile tum bilgileri guncelleyin.')
    y = draw_bullet(c, y, 'Teknik rider ekleyin: Ses sistemi, isik, backline gibi gereksinimlerinizi belirtin.')
    y = draw_bullet(c, y, 'Gecmis mekan listenizi ekleyerek deneyiminizi sergileyin.')
    y = draw_bullet(c, y, 'YouTube veya Vimeo performans video linkleri profilinizde gosterilir.')
    y = draw_bullet(c, y, '"Gizli" mod ile profilinizi yayindan kaldirabilirsiniz.')
    y = sp(y)

    y = draw_subsection(c, y, 'Avatar (Profil Fotografi)', ACC)
    y = sp(y, 3)
    y = draw_bullet(c, y, '"Avatar Duzenle" ile JPG veya PNG fotograf yukleyin; otomatik kirpilir.')
    y = sp(y)

    y = draw_tip(c, y, 'Eksiksiz bir profil (tur, enstruman, biyografi, video, sosyal linkler) kesfedilme sansinizi belirgin sekilde artirir.')
    y = sp(y)

    y = check_page(c, y, ACC, pc)

    # 3. Dashboard
    y = draw_section_header(c, y, 'Dashboard (Kontrol Paneli)', ACC)
    y = sp(y)
    y = draw_body(c, y, 'Dashboard, tum sanatci faaliyetlerinizi yonettiginiz merkezi ekrandir. Ust menuden adiniza veya "Panel" butonuna tiklayarak ulasabilirsiniz.')
    y = sp(y)
    y = draw_bullet(c, y, 'Yaklasan ve gecmis etkinliklerinizin takvim gorunumu.')
    y = draw_bullet(c, y, 'Mekanlardan gelen teklifler: Kabul edin, reddedin veya sure dolana kadar bekleyin.')
    y = draw_bullet(c, y, 'Uyesi oldugunuz gruplar, bekleyen grup davetleri ve basvurulariniz.')
    y = draw_bullet(c, y, '"Grup Ariyor" toggle\'i: Aktif ederseniz diger gruplar sizi bulup davet edebilir.')
    y = draw_bullet(c, y, 'Hizli etkinlik ekleme, profil duzenleme ve avatar guncelleme butonlari.')
    y = draw_bullet(c, y, 'Slot basvurularinizin durumu: Beklemede, kabul edildi veya reddedildi.')
    y = draw_bullet(c, y, 'Mekan iptal talepleri: Onaylayin veya reddedin.')
    y = sp(y)

    y = check_page(c, y, ACC, pc)

    # 4. Grup Yonetimi
    y = draw_section_header(c, y, 'Grup (Band) Yonetimi', ACC)
    y = sp(y)

    y = draw_subsection(c, y, 'Yeni Grup Kurma', ACC)
    y = sp(y, 3)
    y = draw_bullet(c, y, 'Dashboard veya "Gruplar" sayfasindan "Grup Olustur"a tiklayin.')
    y = draw_bullet(c, y, 'Grup adi, sehir, muzik turleri ve biyografi girin; logo/fotograf yukleyin.')
    y = draw_bullet(c, y, 'Siz otomatik olarak grup kurucusu olarak atanirsiniz.')
    y = sp(y)

    y = draw_subsection(c, y, 'Grup Profili Duzenleme', ACC)
    y = sp(y, 3)
    y = draw_bullet(c, y, '"Muzisyen Ariyoruz" bolumunden aranan enstruman ve rolleri belirtin.')
    y = draw_bullet(c, y, 'Fotograf albumu olusturun, sosyal medya linkleri ekleyin.')
    y = draw_bullet(c, y, 'Grup performans videolarinizi ekleyin.')
    y = sp(y)

    y = draw_subsection(c, y, 'Uye Davet Etme ve Yonetimi', ACC)
    y = sp(y, 3)
    y = draw_bullet(c, y, '"Uye Davet Et" butonuyla isme veya enstrumana gore sanatci arayin ve davet gonderin.')
    y = draw_bullet(c, y, 'Davet edilen sanatci kabul ederse gruba katilir.')
    y = draw_bullet(c, y, 'Her uyeye rol atayin: Gitar, Bas, Vokal, Davul, Klavye vb.')
    y = draw_bullet(c, y, '"Bekleyen Basvurular"dan gelen basvurulari kabul veya reddedin.')
    y = sp(y)

    y = draw_tip(c, y, '"Muzisyen Ariyoruz" ozelligi acik gruplar, Gruplar sayfasinda ozel bir rozetle one cikar ve daha fazla sanatci basvurusu alir.')
    y = sp(y)

    y = check_page(c, y, ACC, pc)

    # 5. Gruba Katilma
    y = draw_section_header(c, y, 'Bir Gruba Katilma', ACC)
    y = sp(y)
    y = draw_bullet(c, y, '"Gruplar" sayfasinda "Muzisyen Araniyor" filtreli gruplari kesfedin.')
    y = draw_bullet(c, y, 'Grup profilinde "Basvur" butonuna tiklayarak basvuru yapin.')
    y = draw_bullet(c, y, 'Grup kurucusu basvurunuzu degerlendirerek kabul veya reddeder.')
    y = draw_bullet(c, y, 'Grup kurucusu sizi davet ederse bildirim alirsiniz; kabul veya red edebilirsiniz.')
    y = draw_bullet(c, y, 'Kabul edildiginizde grup sohbetine ve etkinliklerine erisim kazanirsiniz.')
    y = sp(y)

    y = check_page(c, y, ACC, pc)

    # 6. Etkinlik Yonetimi
    y = draw_section_header(c, y, 'Etkinlik Yonetimi', ACC)
    y = sp(y)

    y = draw_subsection(c, y, 'Etkinlik Olusturma', ACC)
    y = sp(y, 3)
    y = draw_bullet(c, y, 'Dashboard\'dan "Etkinlik Ekle" ile baslik, tarih, saat, tur ve giris bilgilerini girin.')
    y = draw_bullet(c, y, 'Mekan listeden secilirse etkinlik "beklemede" olur; mekan onaylayinca aktiflesir.')
    y = draw_bullet(c, y, 'Serbest mekan adi girerseniz etkinlik dogrudan onayli olarak yayinlanir.')
    y = draw_bullet(c, y, 'Grup adina etkinlik ekleyebilir, birden fazla sanatciyi kadroya dahil edebilirsiniz.')
    y = sp(y)

    y = draw_subsection(c, y, 'Mekan Tekliflerini Degerlendirme', ACC)
    y = sp(y, 3)
    y = draw_bullet(c, y, 'Mekanlar size belirli tarih ve saat icin teklif gonderebilir.')
    y = draw_bullet(c, y, 'Tekliflerin gecerlilik suresi 24 veya 48 saattir; sure dolunca otomatik iptal olur.')
    y = draw_bullet(c, y, 'Dashboard veya bildirim uzerinden teklifi kabul veya reddedin.')
    y = draw_bullet(c, y, 'Bir teklifi kabul ederseniz ayni tarihli diger teklifler otomatik reddedilir.')
    y = sp(y)

    y = draw_subsection(c, y, 'Etkinlik Duzenleme ve Iptal', ACC)
    y = sp(y, 3)
    y = draw_bullet(c, y, '"Duzenle" ile baslik, tarih, saat ve detaylari guncelleyin.')
    y = draw_bullet(c, y, 'Etkinlige afis ve fotograf yukleyerek gorsellik katabilirsiniz.')
    y = draw_bullet(c, y, '"Iptal Et" ile etkinligi iptal edin; takipcilere otomatik bildirim gider.')
    y = draw_bullet(c, y, 'Mekan iptal talebi gonderdiginde dashboard\'dan onaylayabilirsiniz.')
    y = sp(y)

    y = draw_tip(c, y, 'Etkinlik onaylandiginda takipcilerinize otomatik bildirim gider. Linki sosyal medyada paylasarak daha genis kitleye ulasabilirsiniz.')
    y = sp(y)

    y = check_page(c, y, ACC, pc)

    # 7. Mesajlasma
    y = draw_section_header(c, y, 'Mesajlasma Sistemi', ACC)
    y = sp(y)
    y = draw_bullet(c, y, 'Grup sohbeti: Kabul edilmis uye oldugunuz gruplarda otomatik acilir.')
    y = draw_bullet(c, y, 'Etkinlik sohbeti: Onaylanan her etkinlikte mekan ve sanatcilar arasinda olusur.')
    y = draw_bullet(c, y, 'Ust menuden "Mesajlar" ikonuyla tum sohbetlerinize erisin.')
    y = draw_bullet(c, y, 'Yeni mesaj geldiginde uygulama ici bildirim alirsiniz.')
    y = draw_bullet(c, y, 'Okunmamis mesaj sayisi rozet olarak goruntulenir.')
    y = sp(y)

    y = check_page(c, y, ACC, pc)

    # 8. Biletleme
    y = draw_section_header(c, y, 'Biletleme ve Gelir', ACC)
    y = sp(y)
    y = draw_bullet(c, y, 'Etkinlik duzenleme sayfasindan "Bilet Satisi"ni aktif edin.')
    y = draw_bullet(c, y, 'Bilet fiyati, toplam adet ve komisyon tercihini belirleyin.')
    y = draw_bullet(c, y, 'Katilimcilar QR kodlu biletle guvenli giris yapar.')
    y = draw_bullet(c, y, 'Dashboard\'dan "Bilet Raporlari" ile satis ve gelir durumunu takip edin.')
    y = draw_bullet(c, y, 'Etkinlik gunu /scan adresinden QR okuyucu ile giris kontrolu yapabilirsiniz.')
    y = sp(y)
    y = draw_note(c, y, 'Biletleme uzerinden platform komisyonu uygulanir. Detaylar icin iletisime gecin.', ACC)
    y = sp(y)

    y = check_page(c, y, ACC, pc)

    # 9. Takip, Bildirim, Takvim
    y = draw_section_header(c, y, 'Takip, Bildirim ve Takvim', ACC)
    y = sp(y)
    y = draw_bullet(c, y, 'Izleyiciler ve diger sanatcilar profilinizi takip edebilir.')
    y = draw_bullet(c, y, 'Yeni etkinlik yayinladiginizda tum takipcilere otomatik bildirim gider.')
    y = draw_bullet(c, y, 'Zil ikonu uzerindeki rozet okunmamis bildirim sayisini gosterir.')
    y = draw_bullet(c, y, 'Sanatci ve grup takvim sayfalarindan ICS linki paylasabilirsiniz.')
    y = draw_bullet(c, y, 'ICS linkini Google Calendar, Apple Calendar veya Outlook\'a ekleyerek takipcilerinizin etkinliklerinizi kendi takvimlerinde gormesini saglayin.')
    y = sp(y)

    y = draw_tip(c, y, 'Takipci sayinizi artirmak icin profilinizi guncel tutun, duzenli etkinlik yayinlayin ve etkinlik linklerinizi sosyal medyada paylasin.')
    y = sp(y)

    y = check_page(c, y, ACC, pc)

    # 10. Ekip Ilanlari ve Ozet
    y = draw_section_header(c, y, 'Ekip Ilanlari ve Genel Oneriler', ACC)
    y = sp(y)
    y = draw_bullet(c, y, '"Ekip" sayfasindan muzisyen arayan ilanlara goz atabilir, kendi ilaninizi olusturabilirsiniz.')
    y = draw_bullet(c, y, '"Grup Ariyor" toggle\'i ve kisa notunuzla gruplara kendinizi gosterin.')
    y = draw_bullet(c, y, 'Tek bir hesapla hem sanatci, grup uyesi hem de mekan sahibi olabilirsiniz.')
    y = draw_bullet(c, y, 'Mekan tekliflerini zamaninda yanitlayin; firsatlari kacirmayin.')
    y = draw_bullet(c, y, 'Etkinlik sohbetini mekanla iletisim ve koordinasyon icin aktif kullanin.')
    y = draw_bullet(c, y, 'Bilet satisi ile etkinliklerinizden ek gelir elde edin.')
    y = sp(y)

    draw_back_cover(c, ACC, pc)
    c.save()
    if hasattr(path, 'replace'):
        print(f'Olusturuldu: {path}')


# ═══════════════════════════════════════════════════════════════════════════════
# PDF 3 — MEKAN  (hedef: 20 A6 sayfa → 5 A5 kitapcik)
# ═══════════════════════════════════════════════════════════════════════════════

def build_mekan(path):
    ACC = ACC_VENUE
    c = canvas.Canvas(path, pagesize=PAGE_SIZE)
    c.setTitle('Sahne.Today — Mekan Kilavuzu')
    pc = [1]

    draw_cover(c, 'MEKAN', 'Kullanim Kilavuzu',
               'Profil olustur, slot ac, etkinlik yonet, bilet sat, QR okut.',
               ACC, pc[0])
    c.showPage(); pc[0] += 1
    draw_background(c)
    y = H - MARGIN

    # 1. Hesap Yonetimi (ortak)
    y = draw_account_section(c, y, ACC)
    y = check_page(c, y, ACC, pc)

    # 2. Mekan Profili
    y = draw_section_header(c, y, 'Mekan Profili Olusturma', ACC)
    y = sp(y)
    y = draw_bullet(c, y, 'Kayit olduktan sonra ust menuden "Mekan Portali"na tiklayin.')
    y = draw_bullet(c, y, 'Mekan adi, sehir, ilce ve tam adres bilgilerini girin.')
    y = draw_bullet(c, y, 'Mekan turunu secin: Pub, Canli Muzik, Tiyatro, Kafe, Kitabevi vb.')
    y = draw_bullet(c, y, 'Telefon, e-posta, web sitesi gibi iletisim bilgilerini ekleyin.')
    y = sp(y)

    y = draw_subsection(c, y, 'Profil Detaylandirma', ACC)
    y = sp(y, 3)
    y = draw_bullet(c, y, 'Kapasite bilgileri: Oturma ve ayakta kisi sayisi, sahne alani olculeri.')
    y = draw_bullet(c, y, 'Teknik donanim: Ses sistemi, isik, backline, enstruman ekipmanlari.')
    y = draw_bullet(c, y, 'Muzik ve etkinlik turlerini coklu secimle profilinize ekleyin.')
    y = draw_bullet(c, y, 'Biyografi ile mekaninizin hikayesini ve atmosferini anlatin.')
    y = draw_bullet(c, y, 'Sosyal medya: Instagram, Facebook, X (Twitter) baglantilari.')
    y = draw_bullet(c, y, '"Gizli" mod ile profilinizi yayindan kaldirabilirsiniz.')
    y = sp(y)

    y = draw_subsection(c, y, 'Logo ve Kapak Fotografi', ACC)
    y = sp(y, 3)
    y = draw_bullet(c, y, 'Logo ve kapak fotografi yukleyin; kapak profilin en ustunde buyuk gosterilir.')
    y = draw_bullet(c, y, 'Fotograf albumu olusturarak mekaninizin atmosferini sergileyin.')
    y = sp(y)

    y = draw_tip(c, y, 'Kaliteli kapak fotografi ve eksiksiz donanim bilgileri, sanatcilarin mekaniniza basvurma olasiligini belirgin sekilde artirir.')
    y = sp(y)

    y = check_page(c, y, ACC, pc)

    # 3. Slot Yonetimi
    y = draw_section_header(c, y, 'Slot Yonetimi', ACC)
    y = sp(y)
    y = draw_body(c, y, 'Slotlar, mekaninizin performans programini olusturan zaman dilimleridir. Acik slotlar "Mekanlar" sayfasinda sanatcilar tarafindan goruntulenir ve basvuru yapilabilir.')
    y = sp(y)

    y = draw_subsection(c, y, 'Slot Olusturma', ACC)
    y = sp(y, 3)
    y = draw_bullet(c, y, 'Dashboard\'dan "Slot Ekle" ile gun, baslangic/bitis saati ve tekrar sikligi secin.')
    y = draw_bullet(c, y, 'Tekrar secenekleri: Haftalik, iki haftada bir veya tek seferlik.')
    y = draw_bullet(c, y, 'Etkinlik turu: Canli Muzik, Stand-up, DJ, Tiyatro vb.')
    y = draw_bullet(c, y, 'Ucret modeli: Ucretsiz, kapi paylasimi, garanti ucret veya pazarliga acik.')
    y = draw_bullet(c, y, 'Opsiyonel notlarla teknik gereksinimleri veya ozel kosullari belirtin.')
    y = sp(y)

    y = draw_subsection(c, y, 'Slotlari Yonetme', ACC)
    y = sp(y, 3)
    y = draw_bullet(c, y, 'Dashboard\'da aktif slotlariniz durumlariyla listelenir: Acik, bekleyen, dolu.')
    y = draw_bullet(c, y, 'Bir slotu kapatmak icin slota tiklayin ve "Kapat" secin.')
    y = draw_bullet(c, y, 'Sanatcilar acik slotlariniza basvurabilir; basvurulari dashboard\'dan yanitlayin.')
    y = draw_bullet(c, y, 'Slot programinizi mekan takvim sayfanizdan goruntuleyebilirsiniz.')
    y = sp(y)

    y = draw_tip(c, y, 'Duzenli programiniz yoksa "Tek Seferlik" secenegi ile yalnizca belirli gunler icin slot acin. Duzenli slotlar sanatcilar tarafindan daha cok tercih edilir.')
    y = sp(y)

    y = check_page(c, y, ACC, pc)

    # 4. Sanatci Basvurulari
    y = draw_section_header(c, y, 'Sanatci Basvurulari ve Talepleri', ACC)
    y = sp(y)
    y = draw_body(c, y, 'Sanatcilar acik slotlariniza basvurabilir veya mekaniniza dogrudan etkinlik talebi gonderebilir. Tum basvurular dashboard\'unuzda "Bekleyen Basvurular" altinda toplanir.')
    y = sp(y)
    y = draw_bullet(c, y, 'Slot basvurusu: Sanatci belirli bir slot gunu ve saati icin basvurur.')
    y = draw_bullet(c, y, 'Etkinlik talebi: Sanatci mekaniniza etkinlik ekler, "beklemede" olarak gelir.')
    y = draw_bullet(c, y, 'Basvuruyu kabul ederseniz etkinlik otomatik olusturulur ve onaylanir.')
    y = draw_bullet(c, y, 'Reddederseniz sanatciya bildirim gider; basvuru kapanir.')
    y = draw_bullet(c, y, 'Basvurulari incelemek icin sanatci profiline goz atabilirsiniz.')
    y = sp(y)
    y = draw_note(c, y, 'Basvurulari zamaninda yanitlamak, mekaninizin guvenilirligini artirir. Bekleyen basvurular icin bildirim alirsiniz.', ACC)
    y = sp(y)

    y = check_page(c, y, ACC, pc)

    # 5. Etkinlik Yonetimi
    y = draw_section_header(c, y, 'Etkinlik Yonetimi', ACC)
    y = sp(y)

    y = draw_subsection(c, y, 'Sanatci veya Gruba Teklif Sunma', ACC)
    y = sp(y, 3)
    y = draw_bullet(c, y, '"Etkinlik Olustur" ile sanatci veya grup arayin ve secin.')
    y = draw_bullet(c, y, 'Tarih, saat, etkinlik turu ve detaylari girin.')
    y = draw_bullet(c, y, 'Teklif gecerlilik suresini 24 veya 48 saat olarak belirleyin.')
    y = draw_bullet(c, y, 'Sanatci kabul ederse etkinlik onaylanir, takipcilere duyuru gider.')
    y = draw_bullet(c, y, 'Sanatci reddeder veya sure dolarsa bildirim alirsiniz.')
    y = sp(y)

    y = draw_subsection(c, y, 'Dogrudan Etkinlik', ACC)
    y = sp(y, 3)
    y = draw_bullet(c, y, 'Sanatci atamadan, sadece mekan ve tarih belirterek etkinlik olusturabilirsiniz.')
    y = draw_bullet(c, y, 'Bu etkinlikler dogrudan "Onaylandi" statusuyle yayinlanir.')
    y = sp(y)

    y = draw_subsection(c, y, 'Etkinlik Duzenleme ve Iptal', ACC)
    y = sp(y, 3)
    y = draw_bullet(c, y, 'Baslik, tarih, saat, tur ve giris ucretini guncelleyin; afis ve fotograf yukleyin.')
    y = draw_bullet(c, y, '"Iptal Et" ile etkinligi iptal edin; sanatcilara ve takipcilere bildirim gider.')
    y = draw_bullet(c, y, '"Iptal Talebi" gondererek sanatcidan iptal onayi isteyebilirsiniz.')
    y = sp(y)

    y = draw_tip(c, y, 'Etkinlik linkini sosyal medyada paylasarak katilimi artirabilirsiniz.')
    y = sp(y)

    y = check_page(c, y, ACC, pc)

    # 6. Biletleme
    y = draw_section_header(c, y, 'Biletleme Sistemi', ACC)
    y = sp(y)
    y = draw_bullet(c, y, 'Etkinlik duzenleme sayfasindan "Bilet Satisi"ni aktif edin.')
    y = draw_bullet(c, y, 'Bilet fiyati, toplam adet ve komisyon tercihini belirleyin.')
    y = draw_bullet(c, y, 'Biletler PayTR odeme altyapisiyla guvenli olarak satilir.')
    y = draw_bullet(c, y, 'Etkinlik gununde /scan adresinden QR okuyucu ile giris kontrolu yapin.')
    y = draw_bullet(c, y, 'Gecerli bilet aninda onaylanir; kullanilmis bilet tekrar kabul edilmez.')
    y = draw_bullet(c, y, 'Dashboard\'dan "Bilet Raporlari" ile satis ve gelir bilgilerini gorun.')
    y = sp(y)
    y = draw_note(c, y, 'Platform komisyon orani mekan bazinda belirlenir. Satis raporlarindan toplam gelir ve komisyon detaylarina ulasabilirsiniz.', ACC)
    y = sp(y)

    y = check_page(c, y, ACC, pc)

    # 7. Mesajlasma ve Iletisim
    y = draw_section_header(c, y, 'Mesajlasma', ACC)
    y = sp(y)
    y = draw_bullet(c, y, 'Onaylanan her etkinlikte otomatik etkinlik sohbeti olusturulur.')
    y = draw_bullet(c, y, 'Siz ve etkinlikteki tum sanatcilar burada mesajlasabilirsiniz.')
    y = draw_bullet(c, y, 'Etkinlik oncesi prova saatleri ve teknik gereksinimleri burada konusabilirsiniz.')
    y = draw_bullet(c, y, 'Yeni mesaj geldiginde uygulama ici bildirim alirsiniz.')
    y = sp(y)

    y = check_page(c, y, ACC, pc)

    # 8. Takip, Bildirim, Takvim
    y = draw_section_header(c, y, 'Takip, Bildirim ve Takvim', ACC)
    y = sp(y)
    y = draw_bullet(c, y, 'Sanatcilar ve izleyiciler mekaninizi takip edebilir.')
    y = draw_bullet(c, y, 'Yeni etkinlik onaylandiginda takipcilere otomatik bildirim ve e-posta gider.')
    y = draw_bullet(c, y, 'Sanatci teklif kabul/reddi ve basvuru sonuclari icin bildirim alirsiniz.')
    y = draw_bullet(c, y, 'Mekan takvim sayfanizdan ICS takvim abonelik linki paylasabilirsiniz.')
    y = draw_bullet(c, y, 'Takipcileriniz ICS linki ile etkinliklerinizi kendi takvimlerinde gorur.')
    y = sp(y)

    y = check_page(c, y, ACC, pc)

    # 9. Mekan Takvim Sayfasi
    y = draw_section_header(c, y, 'Mekan Takvim Sayfasi', ACC)
    y = sp(y)
    y = draw_body(c, y, 'Her mekanin kendine ozel bir takvim sayfasi bulunur. Sanatcilar bu sayfadan slotlarinizi goruntuler ve basvuru yapar.')
    y = sp(y)
    y = draw_bullet(c, y, 'Acik slotlar gun ve saat bazinda takvimde goruntulenir.')
    y = draw_bullet(c, y, 'Sanatcilar bos gunlere dogrudan basvuru yapabilir.')
    y = draw_bullet(c, y, 'Takvim linkini sosyal medya biyografinize veya web sitenize ekleyin.')
    y = draw_bullet(c, y, 'ICS takvim abonelik linkini sanatcilarla paylasarak programinizi takip etmelerini saglayin.')
    y = sp(y)

    y = check_page(c, y, ACC, pc)

    # 10. Fotograf Albumu ve Medya
    y = draw_section_header(c, y, 'Fotograf Albumu ve Medya', ACC)
    y = sp(y)
    y = draw_bullet(c, y, 'Mekan profilinize fotograf albumu olusturarak atmosferi sergileyin.')
    y = draw_bullet(c, y, 'Etkinlik fotograflarini etkinlik sayfasina yukleyerek gecmis etkinlikleri belgeleyin.')
    y = draw_bullet(c, y, 'Fotograflar otomatik olarak galeri formatinda goruntulenir.')
    y = draw_bullet(c, y, 'Duzenli olarak guncel fotograf yuklemek profilinizi canli ve guvenilir gosterir.')
    y = sp(y)
    y = draw_tip(c, y, 'Etkinlik sonrasi fotograf yuklemek, hem gecmis etkinlikler sayfanizi zenginlestirir hem de yeni sanatcilarin mekaniniza ilgi duymasini saglar.')
    y = sp(y)

    y = check_page(c, y, ACC, pc)

    # 11. Dashboard ve Ozet
    y = draw_section_header(c, y, 'Dashboard ve Genel Oneriler', ACC)
    y = sp(y)
    y = draw_body(c, y, 'Dashboard, mekan yoneticileri icin tum operasyonlari tek ekranda toplayan merkezi paneldir.')
    y = sp(y)
    y = draw_bullet(c, y, 'Slot doluluk ozeti: Acik, bekleyen ve dolu slot sayilari tek ekranda.')
    y = draw_bullet(c, y, 'Bekleyen basvurular, gonderdiginiz tekliflerin durumlari ve etkinlik talepleri.')
    y = draw_bullet(c, y, 'Yaklasan etkinliklerin takvim gorunumu ve bilet satis ozeti.')
    y = draw_bullet(c, y, 'Slotlarinizi guncel tutun; dolu slotlar otomatik kapanir.')
    y = draw_bullet(c, y, 'Etkinlik oncesi sohbeti sanatcilarla koordinasyon icin kullanin.')
    y = draw_bullet(c, y, '"Dogrulanmis" rozeti talep ederek guvenilirliginizi artirabilirsiniz.')
    y = draw_bullet(c, y, 'Sahipsiz bir mekani "Mekan Sahiplen" ozelligi ile kontrol edebilirsiniz.')
    y = draw_bullet(c, y, 'Bilet raporlarindan gelir ve katilim istatistiklerinizi duzenli takip edin.')
    y = sp(y)
    y = draw_tip(c, y, 'Profili eksiksiz doldurun, duzenli etkinlik ekleyin ve sanatci basvurularina hizli yanit verin — bunlar mekaninizin platformda one cikmasini saglar.')
    y = sp(y)

    draw_back_cover(c, ACC, pc)
    c.save()
    if hasattr(path, 'replace'):
        print(f'Olusturuldu: {path}')


# ── A6 formati icin monkey-patch ───────────────────────────────────────────────

_a6 = {}  # {accent, page} — tip/note kutulari icin sayfa kirma state'i

def _is_light():
    return BG == (1, 1, 1)

def _a6_page_break(c):
    """Footer ciz, yeni sayfa ac, state'i guncelle."""
    draw_footer(c, _a6['page'], _a6['accent'])
    c.showPage()
    draw_background(c)
    _a6['page'] += 1
    return H - MARGIN - 8*mm

def setup_a6():
    """Modul global degiskenlerini ve cizim fonksiyonlarini A6 icin degistir."""
    global PAGE_SIZE, W, H, MARGIN, CONTENT_W
    _a6.clear()
    PAGE_SIZE = A6
    W, H = A6
    MARGIN = 10*mm
    CONTENT_W = W - 2 * MARGIN

    # ── A6 cover ────────────────────────────────────────────────────────────
    def draw_cover_a6(c, title, subtitle, tagline, accent, page_num):
        _a6['accent'] = accent
        _a6['page'] = page_num + 1
        draw_background(c)
        cy = H - 18*mm
        hex_fill(c, accent)
        c.setFont('DejaVuBold', 14)
        c.drawCentredString(W / 2, cy, 'SAHNE.TODAY')
        cw = 38*mm; cx = (W - cw) / 2
        hex_fill(c, accent)
        c.rect(cx, cy - 4, cw, 1.5, fill=1, stroke=0)
        cy -= 11*mm
        hex_fill(c, TEXT)
        c.setFont('DejaVuBold', 18)
        c.drawCentredString(W / 2, cy, title)
        cy -= 7*mm
        hex_fill(c, accent)
        c.setFont('DejaVuBold', 8)
        c.drawCentredString(W / 2, cy, subtitle)
        cy -= 5*mm
        hex_fill(c, MUTED)
        c.setFont('DejaVu', 7)
        lines = wrap_text(tagline, 'DejaVu', 7, W - 2*MARGIN, c)
        for line in lines:
            c.drawCentredString(W / 2, cy, line)
            cy -= 9
        hex_fill(c, accent)
        c.rect(MARGIN, H/2 - 12*mm, CONTENT_W, 1, fill=1, stroke=0)
        qr_size = 16*mm
        draw_qr(c, W/2, H/2 - 24*mm, qr_size)
        hex_fill(c, MUTED)
        c.setFont('DejaVu', 5.5)
        c.drawCentredString(W/2, H/2 - 24*mm - qr_size/2 - 4, 'sahne.today')
        draw_footer(c, page_num, accent)

    # ── A6 section header ───────────────────────────────────────────────────
    def draw_section_header_a6(c, y, text, accent):
        _a6['accent'] = accent
        hex_fill(c, TEXT)
        c.setFont('DejaVuBold', 10)
        c.drawString(MARGIN, y, text)
        y -= 3
        hex_fill(c, accent)
        c.rect(MARGIN, y, CONTENT_W, 1.5, fill=1, stroke=0)
        return y - 6

    # ── A6 subsection ───────────────────────────────────────────────────────
    def draw_subsection_a6(c, y, text, accent):
        _a6['accent'] = accent
        hex_fill(c, accent)
        c.setFont('DejaVuBold', 8.5)
        c.drawString(MARGIN, y, text)
        return y - 5

    # ── A6 body text ────────────────────────────────────────────────────────
    def draw_body_a6(c, y, text, indent=0):
        x = MARGIN + indent
        max_w = CONTENT_W - indent
        lines = wrap_text(text, 'DejaVu', 8, max_w, c)
        needed = len(lines) * 9 + 8
        if y - needed < 6*mm and _a6.get('accent'):
            y = _a6_page_break(c)
        hex_fill(c, TEXT)
        c.setFont('DejaVu', 8)
        for line in lines:
            c.drawString(x, y, line)
            y -= 9
        return y

    # ── A6 bullet ───────────────────────────────────────────────────────────
    def draw_bullet_a6(c, y, text, indent=3*mm):
        x = MARGIN + indent
        max_w = CONTENT_W - indent - 5*mm
        lines = wrap_text(text, 'DejaVu', 8, max_w, c)
        needed = len(lines) * 9 + 8
        if y - needed < 6*mm and _a6.get('accent'):
            y = _a6_page_break(c)
        hex_fill(c, MUTED)
        c.setFont('DejaVu', 8)
        c.drawString(x, y, '•')
        hex_fill(c, TEXT)
        c.setFont('DejaVu', 8)
        for i, line in enumerate(lines):
            c.drawString(x + 4*mm, y, line)
            y -= 9
        return y

    # ── A6 tip kutusu ───────────────────────────────────────────────────────
    def draw_tip_a6(c, y, text):
        max_w = CONTENT_W - 8*mm
        lines = wrap_text(text, 'DejaVu', 7.5, max_w, c)
        box_h = len(lines) * 9 + 8
        if y - box_h + 4 < 8*mm and _a6.get('accent'):
            y = _a6_page_break(c)
        if _is_light():
            hex_fill(c, (225/255, 245/255, 238/255))
        else:
            hex_fill(c, (18/255, 50/255, 40/255))
        c.rect(MARGIN, y - box_h + 4, CONTENT_W, box_h, fill=1, stroke=0)
        hex_fill(c, TIP_GREEN)
        c.rect(MARGIN, y - box_h + 4, 2.5, box_h, fill=1, stroke=0)
        hex_fill(c, TIP_GREEN)
        c.setFont('DejaVuBold', 7.5)
        c.drawString(MARGIN + 5*mm, y, 'İpucu:')
        if _is_light():
            hex_fill(c, (18/255, 75/255, 55/255))
        else:
            hex_fill(c, (180/255, 230/255, 210/255))
        c.setFont('DejaVu', 7.5)
        ty = y - 9
        for line in lines:
            c.drawString(MARGIN + 5*mm, ty, line)
            ty -= 9
        return y - box_h - 4

    # ── A6 note kutusu ──────────────────────────────────────────────────────
    def draw_note_a6(c, y, text, accent):
        max_w = CONTENT_W - 8*mm
        lines = wrap_text(text, 'DejaVu', 7.5, max_w, c)
        box_h = len(lines) * 9 + 8
        _a6['accent'] = accent
        if y - box_h + 4 < 8*mm and _a6.get('accent'):
            y = _a6_page_break(c)
        r, g, b = accent
        if _is_light():
            hex_fill(c, (r*0.15+0.85, g*0.15+0.85, b*0.15+0.85))
        else:
            hex_fill(c, (r*0.12, g*0.12, b*0.12))
        c.rect(MARGIN, y - box_h + 4, CONTENT_W, box_h, fill=1, stroke=0)
        hex_fill(c, accent)
        c.rect(MARGIN, y - box_h + 4, 2.5, box_h, fill=1, stroke=0)
        hex_fill(c, accent)
        c.setFont('DejaVuBold', 7.5)
        c.drawString(MARGIN + 5*mm, y, 'Not:')
        hex_fill(c, TEXT)
        c.setFont('DejaVu', 7.5)
        ty = y - 9
        for line in lines:
            c.drawString(MARGIN + 5*mm, ty, line)
            ty -= 9
        return y - box_h - 4

    # ── A6 page break checker ───────────────────────────────────────────────
    def check_page_a6(c, y, accent, page_counter, min_y=35*mm):
        _a6['accent'] = accent
        if page_counter[0] < _a6.get('page', 0):
            page_counter[0] = _a6['page']
        else:
            _a6['page'] = page_counter[0]
        if y < min_y:
            y = _a6_page_break(c)
            page_counter[0] = _a6['page']
            return y
        return y

    # ── Override ────────────────────────────────────────────────────────────
    global draw_cover, draw_section_header, draw_subsection
    global draw_body, draw_bullet, draw_tip, draw_note, check_page
    draw_cover          = draw_cover_a6
    draw_section_header = draw_section_header_a6
    draw_subsection     = draw_subsection_a6
    draw_body           = draw_body_a6
    draw_bullet         = draw_bullet_a6
    draw_tip            = draw_tip_a6
    draw_note           = draw_note_a6
    check_page          = check_page_a6

    # Arka kapak: A6 icin daha kucuk
    global draw_back_cover
    def draw_back_cover_a6(c, accent, page_counter):
        draw_footer(c, page_counter[0], accent)
        c.showPage(); page_counter[0] += 1
        draw_background(c)
        cy = H / 2 + 12*mm
        hex_fill(c, accent)
        c.setFont('DejaVuBold', 16)
        c.drawCentredString(W / 2, cy, 'SAHNE.TODAY')
        cy -= 7*mm
        hex_fill(c, MUTED)
        c.setFont('DejaVu', 8)
        c.drawCentredString(W / 2, cy, 'sahne.today')
        cy -= 6*mm
        hex_fill(c, MUTED)
        c.setFont('DejaVu', 7)
        c.drawCentredString(W / 2, cy, 'Canli muzik ve performans')
        c.drawCentredString(W / 2, cy - 7, 'ekosistemi.')
        qr_size = 14*mm
        draw_qr(c, W/2, cy - 20*mm, qr_size)
        draw_footer(c, page_counter[0], accent)
    draw_back_cover = draw_back_cover_a6


# ── Ana program (A4 ciktisi) ──────────────────────────────────────────────────

if __name__ == '__main__':
    out = os.path.dirname(__file__)
    build_sanatci( os.path.join(out, 'Sahne_Today_01_Sanatci_ve_Grup.pdf'))
    build_mekan(   os.path.join(out, 'Sahne_Today_02_Mekan.pdf'))
    build_izleyici(os.path.join(out, 'Sahne_Today_03_Izleyici.pdf'))
    print('Tum A4 PDFler olusturuldu.')
