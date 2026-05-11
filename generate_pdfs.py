#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Sahne.Today kullanım kılavuzu PDF üretici"""

import os
from reportlab.pdfgen import canvas
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm

# ── Fontlar ──────────────────────────────────────────────────────────────────
FONTS_DIR = os.path.join(os.path.dirname(__file__), 'fonts')
pdfmetrics.registerFont(TTFont('DejaVu', os.path.join(FONTS_DIR, 'DejaVuSans.ttf')))
pdfmetrics.registerFont(TTFont('DejaVuBold', os.path.join(FONTS_DIR, 'DejaVuSans-Bold.ttf')))

# ── Renkler (R,G,B 0-1) ──────────────────────────────────────────────────────
BG        = (10/255,  10/255,  11/255)
CARD      = (20/255,  20/255,  21/255)
TEXT      = (228/255, 224/255, 216/255)
MUTED     = (136/255, 133/255, 128/255)
TIP_GREEN = (29/255,  158/255, 117/255)
WHITE     = (1, 1, 1)

ACC_ARTIST   = (212/255,  83/255, 126/255)  # #D4537E
ACC_VENUE    = ( 29/255, 158/255, 117/255)  # #1D9E75
ACC_AUDIENCE = (143/255, 136/255, 212/255)  # #8f88d4

W, H = A4  # 595 x 842 pt
MARGIN = 22*mm
CONTENT_W = W - 2 * MARGIN

# ── Yardımcı fonksiyonlar ─────────────────────────────────────────────────────

def hex_fill(c, color):
    c.setFillColorRGB(*color)

def hex_stroke(c, color):
    c.setStrokeColorRGB(*color)

def wrap_text(text, font, size, max_width, cv):
    """Metni verilen genişliğe göre satırlara böl."""
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
    text = f'sahne.today   —   sayfa {page_num}'
    c.drawCentredString(W / 2, 10*mm, text)
    hex_stroke(c, accent)
    c.setLineWidth(0.5)
    c.line(MARGIN, 14*mm, W - MARGIN, 14*mm)

def draw_cover(c, title, subtitle, tagline, accent, page_num):
    draw_background(c)

    cy = H - 52*mm
    hex_fill(c, accent)
    c.setFont('DejaVuBold', 28)
    c.drawCentredString(W / 2, cy, 'SAHNE.TODAY')

    cw = 80*mm
    cx = (W - cw) / 2
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
    c.drawCentredString(W / 2, cy, tagline)

    hex_fill(c, accent)
    c.rect(MARGIN, H/2 - 30*mm, CONTENT_W, 1.5, fill=1, stroke=0)

    cy = H/2 - 38*mm
    hex_fill(c, MUTED)
    c.setFont('DejaVu', 9)
    c.drawCentredString(W / 2, cy, 'Bu kılavuz sahne.today platformunun')
    c.drawCentredString(W / 2, cy - 13, 'temel özelliklerini açıklamaktadır.')

    draw_footer(c, page_num, accent)

def draw_section_header(c, y, text, accent):
    """Büyük bölüm başlığı + accent çizgi. Yeni y döndürür."""
    hex_fill(c, TEXT)
    c.setFont('DejaVuBold', 16)
    c.drawString(MARGIN, y, text)
    y -= 5
    hex_fill(c, accent)
    c.rect(MARGIN, y, CONTENT_W, 2, fill=1, stroke=0)
    return y - 9

def draw_subsection(c, y, text, accent):
    """Accent renkli alt başlık. Yeni y döndürür."""
    hex_fill(c, accent)
    c.setFont('DejaVuBold', 11)
    c.drawString(MARGIN, y, text)
    return y - 7

def draw_body(c, y, text, indent=0):
    """Normal paragraf metni, otomatik satır wrap. Yeni y döndürür."""
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
    """Bullet nokta + metin. Yeni y döndürür."""
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
    """İpucu kutusu (yeşil). Yeni y döndürür."""
    max_w = CONTENT_W - 10*mm
    lines = wrap_text(text, 'DejaVu', 9, max_w, c)
    box_h = len(lines) * 13 + 10
    hex_fill(c, (18/255, 50/255, 40/255))
    c.rect(MARGIN, y - box_h + 6, CONTENT_W, box_h, fill=1, stroke=0)
    hex_fill(c, TIP_GREEN)
    c.rect(MARGIN, y - box_h + 6, 3, box_h, fill=1, stroke=0)
    hex_fill(c, TIP_GREEN)
    c.setFont('DejaVuBold', 9)
    c.drawString(MARGIN + 7*mm, y, '✔  İpucu:')
    hex_fill(c, (180/255, 230/255, 210/255))
    c.setFont('DejaVu', 9)
    ty = y - 13
    for line in lines:
        c.drawString(MARGIN + 7*mm, ty, line)
        ty -= 13
    return y - box_h - 5

def draw_note(c, y, text, accent):
    """Not kutusu (accent renk). Yeni y döndürür."""
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
    """Sayfa doluysa yeni sayfa aç."""
    if y < min_y:
        draw_footer(c, page_counter[0], accent)
        c.showPage()
        draw_background(c)
        page_counter[0] += 1
        return H - MARGIN - 10*mm
    return y

def sp(y, pts=7):
    return y - pts

# ─────────────────────────────────────────────────────────────────────────────
# PDF 1 — SANATÇI VE GRUP
# ─────────────────────────────────────────────────────────────────────────────

def build_pdf1(path):
    ACC = ACC_ARTIST
    c = canvas.Canvas(path, pagesize=A4)
    c.setTitle('Sahne.Today — Sanatçı ve Grup Kılavuzu')
    pc = [1]

    draw_cover(c, 'SANATÇI VE GRUP', 'Kullanım Kılavuzu',
               'Profilini oluştur, grup kur, etkinlik ekle, mesajlaş.',
               ACC, pc[0])
    c.showPage(); pc[0] += 1

    draw_background(c)
    y = H - MARGIN

    # ── 1. HESAP VE PROFİL ───────────────────────────────────────────────────
    y = draw_section_header(c, y, '1. Hesap ve Sanatçı Profili', ACC)
    y = sp(y)

    y = draw_subsection(c, y, 'Kayıt ve Giriş', ACC)
    y = sp(y, 3)
    y = draw_bullet(c, y, 'sahne.today adresine gidin, "Kayıt Ol" butonuna tıklayın.')
    y = draw_bullet(c, y, 'Ad soyad, e-posta ve şifre girin; hesabınız oluşturulur.')
    y = draw_bullet(c, y, 'Giriş yapmak için e-posta ve şifrenizi kullanın.')
    y = sp(y)

    y = draw_subsection(c, y, 'Sanatçı Portalı', ACC)
    y = sp(y, 3)
    y = draw_bullet(c, y, 'Üst menüden "Sanatçı Portalı" butonuna tıklayın.')
    y = draw_bullet(c, y, 'Sahne adı, şehir, türler, enstrümanlar ve biyografi girin.')
    y = draw_bullet(c, y, 'Profil oluşturulduktan sonra dashboard\'a yönlendirilirsiniz.')
    y = sp(y)

    y = draw_subsection(c, y, 'Profil Düzenleme', ACC)
    y = sp(y, 3)
    y = draw_bullet(c, y, 'Dashboard\'dan "Profili Düzenle" butonuna tıklayın.')
    y = draw_bullet(c, y, 'Sahne adı, şehir, aktif şehirler, türler, enstrümanlar, biyografi düzenlenebilir.')
    y = draw_bullet(c, y, 'Instagram, Spotify, YouTube, TikTok gibi sosyal medya linkleri eklenebilir.')
    y = draw_bullet(c, y, 'Teknik rider (teknik gereksinimler) ve geçmiş mekan listesi eklenebilir.')
    y = draw_bullet(c, y, 'Performans video linkleri (YouTube, Vimeo) profilde gösterilir.')
    y = sp(y)

    y = draw_subsection(c, y, 'Avatar (Profil Fotoğrafı)', ACC)
    y = sp(y, 3)
    y = draw_bullet(c, y, 'Profil sayfanızda "Avatar Düzenle" seçeneğine tıklayın.')
    y = draw_bullet(c, y, 'JPG veya PNG fotoğraf yükleyin; otomatik kırpılır ve güncellenir.')
    y = sp(y)

    y = draw_tip(c, y, 'Profilinizi eksiksiz doldurmak, mekanlar ve gruplar tarafından keşfedilme şansınızı artırır. Türler ve enstrümanlar mutlaka seçilmeli.')
    y = sp(y)

    y = check_page(c, y, ACC, pc)

    # ── 2. GRUP YÖNETİMİ ─────────────────────────────────────────────────────
    y = draw_section_header(c, y, '2. Grup (Band) Yönetimi', ACC)
    y = sp(y)

    y = draw_subsection(c, y, 'Yeni Grup Kurma', ACC)
    y = sp(y, 3)
    y = draw_bullet(c, y, 'Dashboard\'dan veya Gruplar sayfasından "Grup Oluştur" butonuna tıklayın.')
    y = draw_bullet(c, y, 'Grup adı, şehir, müzik türleri ve biyografi girin.')
    y = draw_bullet(c, y, 'Grup logo/fotoğrafını yükleyin.')
    y = draw_bullet(c, y, 'Oluşturulduktan sonra siz otomatik olarak kurucu olursunuz.')
    y = sp(y)

    y = draw_subsection(c, y, 'Grup Profili Düzenleme', ACC)
    y = sp(y, 3)
    y = draw_bullet(c, y, 'Grup sayfanızdan "Düzenle" butonuna tıklayın.')
    y = draw_bullet(c, y, 'Ad, şehir, türler, biyografi ve sosyal medya linkleri güncellenebilir.')
    y = draw_bullet(c, y, '"Müzisyen Arıyoruz" bölümünden aranan enstrümanları belirtebilirsiniz.')
    y = draw_bullet(c, y, 'Fotoğraf albümü: Grup fotoğrafları yükleyebilirsiniz.')
    y = sp(y)

    y = draw_subsection(c, y, 'Üye Davet Etme ve Yönetimi', ACC)
    y = sp(y, 3)
    y = draw_bullet(c, y, 'Grup sayfasında "Üye Davet Et" ile sanatçı arayın ve davet gönderin.')
    y = draw_bullet(c, y, 'Davet edilen sanatçı kabul ederse kabul edilmiş üye olur.')
    y = draw_bullet(c, y, 'Başvuruları "Bekleyen Başvurular" bölümünden kabul veya reddedebilirsiniz.')
    y = draw_bullet(c, y, 'Her üyeye rol atanabilir (Gitar, Bas, Vokal vb.).')
    y = sp(y)

    y = draw_tip(c, y, '"Müzisyen Arıyoruz" özelliğini aktif ettiğinizde grubunuz Gruplar sayfasında özel bir etiketle öne çıkar ve sanatçılar size başvurabilir.')
    y = sp(y)

    y = check_page(c, y, ACC, pc)

    # ── 3. GRUP ÜYELİĞİ ──────────────────────────────────────────────────────
    y = draw_section_header(c, y, '3. Bir Gruba Katılma', ACC)
    y = sp(y)

    y = draw_subsection(c, y, 'Gruba Başvurma', ACC)
    y = sp(y, 3)
    y = draw_bullet(c, y, 'Gruplar sayfasına gidin; "Müzisyen Aranıyor" etiketli grupları görün.')
    y = draw_bullet(c, y, 'Grup profilinde "Başvur" butonuna tıklayın.')
    y = draw_bullet(c, y, 'Grup kurucusu başvurunuzu değerlendirerek kabul veya reddeder.')
    y = draw_bullet(c, y, 'Kabulünüzde bildirim alırsınız ve grup sohbetine erişim kazanırsınız.')
    y = sp(y)

    y = draw_subsection(c, y, 'Davet Kabul Etme', ACC)
    y = sp(y, 3)
    y = draw_bullet(c, y, 'Grup kurucusu sizi davet ettiğinde bildirim alınır.')
    y = draw_bullet(c, y, 'Bildirime tıklayın veya ilgili grup sayfasına giderek kabul/ret edin.')
    y = sp(y)

    y = check_page(c, y, ACC, pc)

    # ── 4. ETKİNLİK YÖNETİMİ ─────────────────────────────────────────────────
    y = draw_section_header(c, y, '4. Etkinlik Yönetimi', ACC)
    y = sp(y)

    y = draw_subsection(c, y, 'Etkinlik Oluşturma', ACC)
    y = sp(y, 3)
    y = draw_bullet(c, y, 'Dashboard\'dan "Etkinlik Ekle" butonuna tıklayın.')
    y = draw_bullet(c, y, 'Başlık, tarih, saat, tür ve giriş bilgilerini girin.')
    y = draw_bullet(c, y, 'Mekan listeden seçilirse etkinlik "beklemede" olarak oluşur; mekan onayladığında aktif olur.')
    y = draw_bullet(c, y, 'Serbest mekan adı girilirse etkinlik doğrudan "onaylandı" olarak yayınlanır.')
    y = sp(y)

    y = draw_subsection(c, y, 'Mekan Teklifini Değerlendirme', ACC)
    y = sp(y, 3)
    y = draw_bullet(c, y, 'Bir mekan size teklif gönderdiğinde bildirim alınır.')
    y = draw_bullet(c, y, 'Bildirimdeki linke veya dashboard\'a giderek teklifi kabul veya reddedebilirsiniz.')
    y = draw_bullet(c, y, 'Teklifin geçerlilik süresi vardır (genellikle 48 saat); süre dolunca otomatik iptal olur.')
    y = draw_bullet(c, y, 'Kabul ettiğinizde etkinlik takvimde görünür ve etkinlik sohbeti açılır.')
    y = sp(y)

    y = draw_subsection(c, y, 'Etkinlik Düzenleme ve İptal', ACC)
    y = sp(y, 3)
    y = draw_bullet(c, y, 'Etkinlik sayfasından "Düzenle" ile başlık, tarih, saat ve detayları güncelleyin.')
    y = draw_bullet(c, y, 'Etkinliğe afiş ve fotoğraf yükleyebilirsiniz.')
    y = draw_bullet(c, y, '"İptal Et" butonu ile etkinliği iptal edebilirsiniz.')
    y = sp(y)

    y = draw_tip(c, y, 'Etkinlik takvimini ICS formatında dışa aktarabilirsiniz. Böylece Google Calendar, Apple Calendar gibi uygulamalara abonelik ekleyebilirsiniz.')
    y = sp(y)

    y = check_page(c, y, ACC, pc)

    # ── 5. MESAJLAŞMA ─────────────────────────────────────────────────────────
    y = draw_section_header(c, y, '5. Mesajlaşma', ACC)
    y = sp(y)

    y = draw_subsection(c, y, 'Grup Sohbeti', ACC)
    y = sp(y, 3)
    y = draw_bullet(c, y, 'Kabul edilmiş üye olduğunuz gruplarda "Grup Sohbeti" butonu görünür.')
    y = draw_bullet(c, y, 'Grup kurucusu ve tüm kabul edilmiş üyeler bu sohbette mesajlaşabilir.')
    y = draw_bullet(c, y, 'Yeni mesaj geldiğinde bildirim alınır.')
    y = sp(y)

    y = draw_subsection(c, y, 'Etkinlik Sohbeti', ACC)
    y = sp(y, 3)
    y = draw_bullet(c, y, 'Onaylanmış etkinliklerde "Etkinlik Sohbeti" butonu görünür.')
    y = draw_bullet(c, y, 'Mekan sahibi, sanatçılar ve grup üyeleri bu sohbette mesajlaşabilir.')
    y = draw_bullet(c, y, 'Etkinlik koordinasyonu için kullanılır.')
    y = sp(y)

    y = draw_subsection(c, y, 'Mesajlar Sayfası', ACC)
    y = sp(y, 3)
    y = draw_bullet(c, y, 'Üst menüden "Mesajlar" ikonuna tıklayın.')
    y = draw_bullet(c, y, 'Tüm aktif sohbetleriniz listelenir; okunmamış mesaj sayısı gösterilir.')
    y = sp(y)

    y = check_page(c, y, ACC, pc)

    # ── 6. TAKİP VE BİLDİRİMLER ──────────────────────────────────────────────
    y = draw_section_header(c, y, '6. Takip ve Bildirimler', ACC)
    y = sp(y)

    y = draw_subsection(c, y, 'Takip Etme', ACC)
    y = sp(y, 3)
    y = draw_bullet(c, y, 'Sanatçı, grup veya mekan sayfalarında "Takip Et" butonuna tıklayın.')
    y = draw_bullet(c, y, 'Takip ettiğiniz hesapların yeni etkinlikleri için bildirim alınır.')
    y = sp(y)

    y = draw_subsection(c, y, 'Bildirimler', ACC)
    y = sp(y, 3)
    y = draw_bullet(c, y, 'Zil ikonu üzerindeki kırmızı rozet okunmamış bildirim sayısını gösterir.')
    y = draw_bullet(c, y, 'Grup üyelik başvurusu sonuçları, mekan teklifleri, yeni mesajlar bildirim olarak gelir.')
    y = draw_bullet(c, y, 'Bildirimler sayfasında tüm geçmiş bildirimleri görebilirsiniz.')
    y = sp(y)

    y = draw_subsection(c, y, 'Takvim Aboneliği', ACC)
    y = sp(y, 3)
    y = draw_bullet(c, y, 'Sanatçı ve grup takvim sayfalarında "Takvim\'e Abone Ol" butonu mevcuttur.')
    y = draw_bullet(c, y, 'ICS linki Google Calendar, Apple Calendar veya Outlook\'a eklenebilir.')
    y = draw_bullet(c, y, 'Etkinlikler otomatik olarak kişisel takviminizde güncellenir.')
    y = sp(y)

    y = draw_tip(c, y, 'Grup veya etkinlik sayfasında "Takip Et" yapan izleyiciler yeni etkinlik duyurusunda e-posta ve uygulama bildirimi alır. Takipçi sayınızı artırmak için profilinizi güncel tutun.')
    y = sp(y)

    y = check_page(c, y, ACC, pc)

    # ── 7. DASHBOARD ─────────────────────────────────────────────────────────
    y = draw_section_header(c, y, '7. Dashboard (Kontrol Paneli)', ACC)
    y = sp(y)

    y = draw_body(c, y, 'Dashboard\'a üst menüden adınıza ya da "Panel" butonuna tıklayarak ulaşabilirsiniz.')
    y = sp(y)

    y = draw_subsection(c, y, 'Dashboard\'da Neler Var?', ACC)
    y = sp(y, 3)
    y = draw_bullet(c, y, 'Yaklaşan ve geçmiş etkinliklerinizin takvim görünümü.')
    y = draw_bullet(c, y, 'Bekleyen mekan teklifleri ve grup üyelik başvuruları.')
    y = draw_bullet(c, y, 'Üyesi olduğunuz grupların listesi.')
    y = draw_bullet(c, y, '"Grup Arıyor" toğlu: Aktif edildiğinde diğer gruplar sizi bulabilir.')
    y = draw_bullet(c, y, 'Hızlı etkinlik ekleme formu.')
    y = draw_bullet(c, y, 'Profil düzenleme ve avatar güncelleme butonları.')
    y = sp(y)

    y = check_page(c, y, ACC, pc)
    draw_footer(c, pc[0], ACC)
    c.showPage(); pc[0] += 1
    draw_background(c)

    cy = H / 2 + 20*mm
    hex_fill(c, ACC)
    c.setFont('DejaVuBold', 24)
    c.drawCentredString(W / 2, cy, 'SAHNE.TODAY')
    cy -= 10*mm
    hex_fill(c, MUTED)
    c.setFont('DejaVu', 11)
    c.drawCentredString(W / 2, cy, 'sahne.today')
    cy -= 8*mm
    hex_fill(c, MUTED)
    c.setFont('DejaVu', 9)
    c.drawCentredString(W / 2, cy, 'Müzisyenler, gruplar ve mekanlar için platform.')

    draw_footer(c, pc[0], ACC)
    c.save()
    print(f'Oluşturuldu: {path}')


# ─────────────────────────────────────────────────────────────────────────────
# PDF 2 — MEKAN
# ─────────────────────────────────────────────────────────────────────────────

def build_pdf2(path):
    ACC = ACC_VENUE
    c = canvas.Canvas(path, pagesize=A4)
    c.setTitle('Sahne.Today — Mekan Kılavuzu')
    pc = [1]

    draw_cover(c, 'MEKAN', 'Kullanım Kılavuzu',
               'Profilini oluştur, slot aç, etkinlik yönet, bilet sat.',
               ACC, pc[0])
    c.showPage(); pc[0] += 1
    draw_background(c)
    y = H - MARGIN

    # ── 1. HESAP VE MEKAN PROFİLİ ────────────────────────────────────────────
    y = draw_section_header(c, y, '1. Hesap ve Mekan Profili', ACC)
    y = sp(y)

    y = draw_subsection(c, y, 'Mekan Portalı', ACC)
    y = sp(y, 3)
    y = draw_bullet(c, y, 'Kayıt olduktan sonra üst menüden "Mekan Portalı" butonuna tıklayın.')
    y = draw_bullet(c, y, 'Mekan adı, şehir, ilçe, adres, mekan türü ve iletişim bilgilerini girin.')
    y = draw_bullet(c, y, 'Oluşturulduktan sonra mekan dashboard\'a yönlendirilirsiniz.')
    y = sp(y)

    y = draw_subsection(c, y, 'Profil Düzenleme', ACC)
    y = sp(y, 3)
    y = draw_bullet(c, y, 'Mekan adı, şehir, ilçe, adres, mekan türü güncellenebilir.')
    y = draw_bullet(c, y, 'Kapasiteler (oturma/ayakta), sahne alanı ve teknik donanım eklenebilir.')
    y = draw_bullet(c, y, 'Telefon, e-posta ve web sitesi bilgileri eklenebilir.')
    y = draw_bullet(c, y, 'Biyografi ve açıklama metni eklenebilir.')
    y = draw_bullet(c, y, 'Instagram, Facebook gibi sosyal medya linkleri eklenebilir.')
    y = sp(y)

    y = draw_subsection(c, y, 'Logo ve Kapak Fotoğrafı', ACC)
    y = sp(y, 3)
    y = draw_bullet(c, y, 'Mekan sayfasından logo ve kapak fotoğrafı yükleyebilirsiniz.')
    y = draw_bullet(c, y, 'Kapak fotoğrafı mekan profilinizin en üstünde büyük boyutta gösterilir.')
    y = sp(y)

    y = draw_tip(c, y, 'Kaliteli kapak fotoğrafı ve eksiksiz iletişim bilgileri, sanatçıların sizi bulup iletişime geçme olasılığını artırır.')
    y = sp(y)

    y = check_page(c, y, ACC, pc)

    # ── 2. SLOT YÖNETİMİ ─────────────────────────────────────────────────────
    y = draw_section_header(c, y, '2. Slot Yönetimi', ACC)
    y = sp(y)

    y = draw_body(c, y, 'Slotlar, mekanınızın performans programını tanımlayan tekrarlayan veya tek seferlik zaman dilimleridir. Açık slotlar sanatçılar tarafından görülür.')
    y = sp(y)

    y = draw_subsection(c, y, 'Slot Oluşturma', ACC)
    y = sp(y, 3)
    y = draw_bullet(c, y, 'Dashboard\'dan "Slot Ekle" butonuna tıklayın.')
    y = draw_bullet(c, y, 'Gün, başlangıç/bitiş saati ve tekrar sıklığını (haftalık, iki haftada bir, tek sefer) seçin.')
    y = draw_bullet(c, y, 'Etkinlik türünü seçin (Canlı Müzik, Stand-up, DJ vb.).')
    y = draw_bullet(c, y, 'Ücret modelini belirleyin: Ücretsiz, kapı paylaşımları, garanti veya pazarlığa açık.')
    y = draw_bullet(c, y, 'Opsiyonel notlar ekleyebilirsiniz (teknik gereksinimler vb.).')
    y = sp(y)

    y = draw_subsection(c, y, 'Slotları Yönetme', ACC)
    y = sp(y, 3)
    y = draw_bullet(c, y, 'Dashboard\'da aktif slotlarınız listelenir.')
    y = draw_bullet(c, y, 'Slotu kapatmak için ilgili slota tıklayın ve "Kapat" seçeneğini kullanın.')
    y = draw_bullet(c, y, 'Kapatılan slotlar sanatçılara artık gösterilmez.')
    y = sp(y)

    y = draw_tip(c, y, 'Düzensiz programınız varsa "Tek Sefer" tekrar seçeneği ile belirli bir gün için slot açabilirsiniz.')
    y = sp(y)

    y = check_page(c, y, ACC, pc)

    # ── 3. ETKİNLİK YÖNETİMİ ─────────────────────────────────────────────────
    y = draw_section_header(c, y, '3. Etkinlik Yönetimi', ACC)
    y = sp(y)

    y = draw_subsection(c, y, 'Sanatçı/Gruba Teklif Sunma', ACC)
    y = sp(y, 3)
    y = draw_bullet(c, y, 'Dashboard\'dan "Etkinlik Oluştur" seçeneğiyle sanatçı veya grup seçin.')
    y = draw_bullet(c, y, 'Tarih, saat ve detayları girin; teklif belirli bir süre için geçerli olur (genellikle 48 saat).')
    y = draw_bullet(c, y, 'Sanatçı teklifi kabul ederse etkinlik onaylanır, reddederse bildirim alınır.')
    y = draw_bullet(c, y, 'Sanatçı belirlenen süre içinde yanıt vermezse teklif otomatik iptal olur.')
    y = sp(y)

    y = draw_subsection(c, y, 'Doğrudan Etkinlik Oluşturma', ACC)
    y = sp(y, 3)
    y = draw_bullet(c, y, 'Sanatçı atamadan sadece mekan ve tarih belirterek etkinlik oluşturabilirsiniz.')
    y = draw_bullet(c, y, 'Bu etkinlikler doğrudan "Onaylandı" statüsüyle yayınlanır.')
    y = sp(y)

    y = draw_subsection(c, y, 'Sanatçı Başvurularını Değerlendirme', ACC)
    y = sp(y, 3)
    y = draw_bullet(c, y, 'Sanatçılar açık slotlarınıza başvurabilir.')
    y = draw_bullet(c, y, 'Dashboard\'da bekleyen başvurular listelenir.')
    y = draw_bullet(c, y, 'Başvuruyu kabul ederseniz etkinlik otomatik oluşturulur.')
    y = sp(y)

    y = draw_subsection(c, y, 'Etkinlik Düzenleme ve İptal', ACC)
    y = sp(y, 3)
    y = draw_bullet(c, y, 'Etkinlik sayfasından başlık, tarih, saat, tür, giriş ücreti güncellenebilir.')
    y = draw_bullet(c, y, 'Etkinliğe afiş ve fotoğraf yükleyebilirsiniz.')
    y = draw_bullet(c, y, '"İptal Et" ile etkinliği iptal edebilirsiniz; sanatçılara bildirim gider.')
    y = sp(y)

    y = draw_tip(c, y, 'Etkinlik oluşturduktan sonra etkinlik sayfasındaki linki sosyal medyada paylaşabilirsiniz. Takipçileriniz otomatik bildirim alır.')
    y = sp(y)

    y = check_page(c, y, ACC, pc)

    # ── 4. BİLETLEME ─────────────────────────────────────────────────────────
    y = draw_section_header(c, y, '4. Biletleme Sistemi', ACC)
    y = sp(y)

    y = draw_subsection(c, y, 'Bilet Satışını Aktif Etme', ACC)
    y = sp(y, 3)
    y = draw_bullet(c, y, 'Etkinlik düzenle sayfasından "Bilet Satışı" seçeneğini aktif edin.')
    y = draw_bullet(c, y, 'Bilet fiyatını ve toplam bilet adedini belirleyin.')
    y = draw_bullet(c, y, 'Komisyon dahil mi hariç mi olduğunu seçin.')
    y = sp(y)

    y = draw_subsection(c, y, 'QR Kod ile Giriş Kontrolü', ACC)
    y = sp(y, 3)
    y = draw_bullet(c, y, 'Etkinlik gününde /scan adresine gidin.')
    y = draw_bullet(c, y, 'Katılımcıların telefonlarındaki QR kodu okutun.')
    y = draw_bullet(c, y, 'Geçerli biletler anında onaylanır, kullanılmış biletler tekrar kabul edilmez.')
    y = sp(y)

    y = draw_subsection(c, y, 'Satış Raporu', ACC)
    y = sp(y, 3)
    y = draw_bullet(c, y, 'Dashboard\'dan "Bilet Raporları" bölümüne gidin.')
    y = draw_bullet(c, y, 'Satılan bilet sayısı, toplam gelir ve komisyon bilgilerini görün.')
    y = sp(y)

    y = draw_note(c, y, 'Biletleme sistemi üzerinden satış yapıldığında platform komisyon kesintisi uygulanabilir. Detaylar için iletişime geçin.', ACC)
    y = sp(y)

    y = check_page(c, y, ACC, pc)

    # ── 5. MESAJLAŞMA ─────────────────────────────────────────────────────────
    y = draw_section_header(c, y, '5. Mesajlaşma', ACC)
    y = sp(y)

    y = draw_subsection(c, y, 'Etkinlik Sohbeti', ACC)
    y = sp(y, 3)
    y = draw_bullet(c, y, 'Onaylanan her etkinlik için otomatik bir sohbet odası oluşturulur.')
    y = draw_bullet(c, y, 'Mekan sahibi ve etkinliğin tüm sanatçıları bu sohbette mesajlaşabilir.')
    y = draw_bullet(c, y, 'Etkinlik sayfasından veya Mesajlar menüsünden erişebilirsiniz.')
    y = draw_bullet(c, y, 'Yeni mesaj geldiğinde bildirim alınır.')
    y = sp(y)

    # ── 6. TAKİP VE BİLDİRİMLER ──────────────────────────────────────────────
    y = draw_section_header(c, y, '6. Takip ve Bildirimler', ACC)
    y = sp(y)

    y = draw_bullet(c, y, 'Sanatçılar ve izleyiciler mekanınızı takip edebilir.')
    y = draw_bullet(c, y, 'Yeni etkinlik onaylandığında takipçilere otomatik bildirim gider.')
    y = draw_bullet(c, y, 'Sanatçı teklif kabulünde veya reddinde bildirim alınır.')
    y = sp(y)

    y = draw_tip(c, y, 'Takipçi tabanınızı büyütmek için etkinlikleri düzenli olarak yayınlayın ve profili güncel tutun.')
    y = sp(y)

    y = check_page(c, y, ACC, pc)

    # ── 7. DASHBOARD ─────────────────────────────────────────────────────────
    y = draw_section_header(c, y, '7. Dashboard (Kontrol Paneli)', ACC)
    y = sp(y)

    y = draw_bullet(c, y, 'Yaklaşan ve geçmiş etkinliklerin takvim görünümü.')
    y = draw_bullet(c, y, 'Bekleyen sanatçı başvuruları ve teklif durumları.')
    y = draw_bullet(c, y, 'Aktif slotlar ve durumları.')
    y = draw_bullet(c, y, 'Hızlı etkinlik oluşturma butonu.')
    y = draw_bullet(c, y, 'Bilet satış özeti ve rapor erişimi.')
    y = draw_bullet(c, y, 'Mekan profil düzenleme ve fotoğraf yükleme.')
    y = sp(y)

    draw_footer(c, pc[0], ACC)
    c.showPage(); pc[0] += 1
    draw_background(c)
    cy = H / 2 + 20*mm
    hex_fill(c, ACC)
    c.setFont('DejaVuBold', 24)
    c.drawCentredString(W / 2, cy, 'SAHNE.TODAY')
    cy -= 10*mm
    hex_fill(c, MUTED)
    c.setFont('DejaVu', 11)
    c.drawCentredString(W / 2, cy, 'sahne.today')
    cy -= 8*mm
    hex_fill(c, MUTED)
    c.setFont('DejaVu', 9)
    c.drawCentredString(W / 2, cy, 'Müzisyenler, gruplar ve mekanlar için platform.')
    draw_footer(c, pc[0], ACC)
    c.save()
    print(f'Oluşturuldu: {path}')


# ─────────────────────────────────────────────────────────────────────────────
# PDF 3 — İZLEYİCİ
# ─────────────────────────────────────────────────────────────────────────────

def build_pdf3(path):
    ACC = ACC_AUDIENCE
    c = canvas.Canvas(path, pagesize=A4)
    c.setTitle('Sahne.Today — İzleyici Kılavuzu')
    pc = [1]

    draw_cover(c, 'İZLEYİCİ', 'Kullanım Kılavuzu',
               'Etkinlik keşif, takip, RSVP ve daha fazlası.',
               ACC, pc[0])
    c.showPage(); pc[0] += 1
    draw_background(c)
    y = H - MARGIN

    # ── 1. KAYIT VE GİRİŞ ────────────────────────────────────────────────────
    y = draw_section_header(c, y, '1. Kayıt ve Giriş', ACC)
    y = sp(y)

    y = draw_bullet(c, y, '"Kayıt Ol" butonuna tıklayın; ad-soyad, e-posta ve şifre girin.')
    y = draw_bullet(c, y, 'E-posta ve şifrenizle giriş yapabilirsiniz.')
    y = draw_bullet(c, y, 'Şifrenizi unutursanız "Şifremi Unuttum" ile şifre sıfırlama e-postası gönderilir.')
    y = sp(y)

    y = draw_tip(c, y, 'Kayıt olmadan da etkinliklere, sanatçılara ve mekanlara göz atabilirsiniz. Ancak RSVP ve takip özellikleri için giriş yapmanız gerekir.')
    y = sp(y)

    # ── 2. ETKİNLİK KEŞFİ ────────────────────────────────────────────────────
    y = draw_section_header(c, y, '2. Etkinlik Keşfetme', ACC)
    y = sp(y)

    y = draw_subsection(c, y, 'Etkinlikler Sayfası', ACC)
    y = sp(y, 3)
    y = draw_bullet(c, y, 'Üst menüden "Etkinlikler"e tıklayın; onaylanan tüm etkinlikler listelenir.')
    y = draw_bullet(c, y, 'Etkinlik kartlarında tarih, mekan, sanatçı, tür ve giriş bilgileri görülür.')
    y = draw_bullet(c, y, 'Şehre göre filtreleme yapabilirsiniz (İstanbul, Ankara, İzmir vb.).')
    y = sp(y)

    y = draw_subsection(c, y, 'Arama', ACC)
    y = sp(y, 3)
    y = draw_bullet(c, y, 'Üst menüdeki arama ikonuna tıklayın.')
    y = draw_bullet(c, y, 'Sanatçı adı, grup adı, mekan adı veya etkinlik başlığı arayabilirsiniz.')
    y = sp(y)

    y = draw_subsection(c, y, 'Sanatçı ve Grup Sayfalarından Keşif', ACC)
    y = sp(y, 3)
    y = draw_bullet(c, y, 'Sanatçılar ve Gruplar sayfalarından müzisyenlerin profillerini inceleyin.')
    y = draw_bullet(c, y, 'Her profilde yaklaşan etkinlikler ve takvim görünümü mevcuttur.')
    y = draw_bullet(c, y, 'Mekan sayfalarından mekanın yaklaşan etkinliklerini görebilirsiniz.')
    y = sp(y)

    y = check_page(c, y, ACC, pc)

    # ── 3. RSVP ──────────────────────────────────────────────────────────────
    y = draw_section_header(c, y, '3. RSVP (Katılım Bildirimi)', ACC)
    y = sp(y)

    y = draw_body(c, y, 'RSVP özelliği ile etkinliklere katılıp katılmayacağınızı bildirebilirsiniz.')
    y = sp(y)

    y = draw_bullet(c, y, 'Etkinlik sayfasında "Gidiyorum" veya "İlgileniyorum" butonlarına tıklayın.')
    y = draw_bullet(c, y, '"Gidiyorum": Kesinlikle katılacaksınız.')
    y = draw_bullet(c, y, '"İlgileniyorum": Katılmayı düşünüyorsunuz.')
    y = draw_bullet(c, y, 'RSVP sayıları herkese açık olarak gösterilir.')
    y = draw_bullet(c, y, 'İstediğiniz zaman RSVP\'nizi değiştirebilir veya geri alabilirsiniz.')
    y = sp(y)

    y = draw_tip(c, y, 'RSVP yaptığınız etkinlikler dashboard\'ınızda listelenir. Böylece yaklaşan etkinliklerinizi kolayca takip edebilirsiniz.')
    y = sp(y)

    y = check_page(c, y, ACC, pc)

    # ── 4. TAKİP ETME ────────────────────────────────────────────────────────
    y = draw_section_header(c, y, '4. Sanatçı, Grup ve Mekan Takibi', ACC)
    y = sp(y)

    y = draw_body(c, y, 'Beğendiğiniz sanatçı, grup veya mekanları takip ederek yeni etkinliklerden haberdar olabilirsiniz.')
    y = sp(y)

    y = draw_subsection(c, y, 'Nasıl Takip Edilir?', ACC)
    y = sp(y, 3)
    y = draw_bullet(c, y, 'Herhangi bir sanatçı, grup veya mekan sayfasına gidin.')
    y = draw_bullet(c, y, '"Takip Et" butonuna tıklayın; buton "Takip Ediliyor" olarak güncellenir.')
    y = draw_bullet(c, y, 'Takibi bırakmak için aynı butona tekrar tıklayın.')
    y = sp(y)

    y = draw_subsection(c, y, 'Takip Sonrası Bildirimler', ACC)
    y = sp(y, 3)
    y = draw_bullet(c, y, 'Takip ettiğiniz hesap yeni bir etkinlik yayınladığında uygulama bildirimi alınır.')
    y = draw_bullet(c, y, 'Aynı zamanda kayıtlı e-posta adresinize bildirim maili gönderilir.')
    y = sp(y)

    y = check_page(c, y, ACC, pc)

    # ── 5. PROFİL VE AYARLAR ─────────────────────────────────────────────────
    y = draw_section_header(c, y, '5. Profil ve Ayarlar', ACC)
    y = sp(y)

    y = draw_subsection(c, y, 'Profil Düzenleme', ACC)
    y = sp(y, 3)
    y = draw_bullet(c, y, 'Dashboard\'dan "Profili Düzenle" butonuna tıklayın.')
    y = draw_bullet(c, y, 'Görüntülenen ad, şehir ve biyografi güncellenebilir.')
    y = draw_bullet(c, y, 'Profil fotoğrafı yüklenebilir.')
    y = sp(y)

    y = draw_subsection(c, y, 'Kurucu Üye Rozeti', ACC)
    y = sp(y, 3)
    y = draw_bullet(c, y, 'Platform yöneticisi tarafından seçilen erken kullanıcılara "Kurucu Üye" rozeti verilir.')
    y = draw_bullet(c, y, 'Rozet profil sayfanızda altın yıldızla gösterilir.')
    y = draw_bullet(c, y, 'Kurucu üyeler otomatik olarak premium statüse sahip olur.')
    y = sp(y)

    y = check_page(c, y, ACC, pc)

    # ── 6. BİLDİRİMLER ───────────────────────────────────────────────────────
    y = draw_section_header(c, y, '6. Bildirimler', ACC)
    y = sp(y)

    y = draw_bullet(c, y, 'Zil ikonu üzerindeki rozet okunmamış bildirim sayısını gösterir.')
    y = draw_bullet(c, y, 'Bildirimlere tıklayarak doğrudan ilgili etkinlik veya sayfaya ulaşabilirsiniz.')
    y = draw_bullet(c, y, '"Tümü Okundu" ile tüm bildirimleri okunmuş olarak işaretleyebilirsiniz.')
    y = draw_bullet(c, y, 'Bildirimler sayfasında geçmiş tüm bildirimleri görebilirsiniz.')
    y = sp(y)

    # ── 7. SANATÇI VEYA MEKAN HESABI AÇMA ───────────────────────────────────
    y = draw_section_header(c, y, '7. Sanatçı veya Mekan Hesabı Açma', ACC)
    y = sp(y)

    y = draw_body(c, y, 'İzleyici hesabınızla giriş yaptıktan sonra sanatçı veya mekan portalı açabilirsiniz. Her iki portal da aynı hesapta aktif olabilir.')
    y = sp(y)

    y = draw_subsection(c, y, 'Sanatçı Portalı Açma', ACC)
    y = sp(y, 3)
    y = draw_bullet(c, y, 'Üst menüden "Sanatçı Portalı" butonuna tıklayın.')
    y = draw_bullet(c, y, 'Sahne adı, şehir, türler ve enstrümanlar girerek sanatçı profilinizi oluşturun.')
    y = sp(y)

    y = draw_subsection(c, y, 'Mekan Portalı Açma', ACC)
    y = sp(y, 3)
    y = draw_bullet(c, y, 'Üst menüden "Mekan Portalı" butonuna tıklayın.')
    y = draw_bullet(c, y, 'Mekan bilgilerini girerek mekan profilinizi oluşturun.')
    y = sp(y)

    y = draw_tip(c, y, 'Aynı hesapta hem sanatçı hem mekan portalı açabilirsiniz. Örneğin hem müzisyen hem de küçük bir mekan sahibiyseniz iki profili de tek hesaptan yönetebilirsiniz.')
    y = sp(y)

    draw_footer(c, pc[0], ACC)
    c.showPage(); pc[0] += 1
    draw_background(c)
    cy = H / 2 + 20*mm
    hex_fill(c, ACC)
    c.setFont('DejaVuBold', 24)
    c.drawCentredString(W / 2, cy, 'SAHNE.TODAY')
    cy -= 10*mm
    hex_fill(c, MUTED)
    c.setFont('DejaVu', 11)
    c.drawCentredString(W / 2, cy, 'sahne.today')
    cy -= 8*mm
    hex_fill(c, MUTED)
    c.setFont('DejaVu', 9)
    c.drawCentredString(W / 2, cy, 'Müzisyenler, gruplar ve mekanlar için platform.')
    draw_footer(c, pc[0], ACC)
    c.save()
    print(f'Oluşturuldu: {path}')


# ─────────────────────────────────────────────────────────────────────────────

if __name__ == '__main__':
    out = os.path.dirname(__file__)
    build_pdf1(os.path.join(out, 'Sahne_Today_01_Sanatci_ve_Grup.pdf'))
    build_pdf2(os.path.join(out, 'Sahne_Today_02_Mekan.pdf'))
    build_pdf3(os.path.join(out, 'Sahne_Today_03_Izleyici.pdf'))
    print('Tüm PDF\'ler oluşturuldu.')
