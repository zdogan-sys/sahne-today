#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Sahne.Today A6 kitapçık üretici

A4 kağıdı iki kez katlayarak A6 boyutunda kitapçık oluşturur.
Her A4 yaprağı arkalı önlü basılır → 8 A6 sayfa üretir.
Kat yerleri işaretli (kesik çizgi + çentik).

Katlama sırası:
  1. A4'ü alt yarıdan üste doğru katlayın (yatay orta çizgiden)
  2. Kalan dikdörtgeni sağdan sola doğru katlayın (dikey orta çizgiden)
  → A6 kitapçık elde edilir.
"""

import os, io, sys
import generate_pdfs as base
from pypdf import PdfReader, PdfWriter, PageObject, Transformation
from reportlab.pdfgen import canvas as rl_canvas
from reportlab.lib.pagesizes import A4, A6, landscape
from reportlab.lib.units import mm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.graphics.barcode.qr import QrCodeWidget
from reportlab.graphics.shapes import Drawing
from reportlab.graphics import renderPDF

# ── Boyutlar ─────────────────────────────────────────────────────────────────
A4_W, A4_H = A4            # 595.28, 841.89 pt
A6_W, A6_H = A6            # 297.64, 420.94 pt

# A4 üzerinde 4 A6 panel:
#   TL: x=0,     y=A6_H   →  x=A6_W,  y=A4_H
#   TR: x=A6_W,  y=A6_H   →  x=A4_W,  y=A4_H
#   BL: x=0,     y=0      →  x=A6_W,  y=A6_H
#   BR: x=A6_W,  y=0      →  x=A4_W,  y=A6_H
#
# (PDF koordinatı: y=0 altta)

# ── İçerik üretimi için A6 parametreleri ─────────────────────────────────────
A6_MARGIN  = 11 * mm
A6_CONTENT_W = A6_W - 2 * A6_MARGIN

# ── Renk ve font overrides ───────────────────────────────────────────────────
FONTS_DIR = os.path.join(os.path.dirname(__file__), 'fonts')

_a6 = {}  # {accent, page} — draw_tip/draw_note için sayfa kırma state'i

def _setup_base_for_a6():
    """generate_pdfs modülünün global değerlerini A6 için ayarla."""
    _a6.clear()
    base.A4    = A6          # canvas.Canvas(path, pagesize=A4) → A6 kullanır
    base.W, base.H = A6
    base.MARGIN    = A6_MARGIN
    base.CONTENT_W = A6_CONTENT_W

    def _a6_page_break(c):
        """Footer çiz, yeni sayfa aç, state'i güncelle."""
        base.draw_footer(c, _a6['page'], _a6['accent'])
        c.showPage()
        base.draw_background(c)
        _a6['page'] += 1
        return A6_H - A6_MARGIN - 10*mm

    # ── A6 için küçültülmüş başlık fonksiyonları ─────────────────────────────

    def draw_cover_a6(c, title, subtitle, tagline, accent, page_num):
        _a6['accent'] = accent
        _a6['page'] = page_num + 1  # içerik bir sonraki sayfadan başlar
        base.draw_background(c)
        W, H = A6_W, A6_H

        cy = H - 22*mm
        base.hex_fill(c, accent)
        c.setFont('DejaVuBold', 16)
        c.drawCentredString(W / 2, cy, 'SAHNE.TODAY')

        cw = 44*mm
        cx = (W - cw) / 2
        base.hex_fill(c, accent)
        c.rect(cx, cy - 4, cw, 1.5, fill=1, stroke=0)

        cy -= 13*mm
        base.hex_fill(c, base.TEXT)
        c.setFont('DejaVuBold', 20)
        c.drawCentredString(W / 2, cy, title)

        cy -= 8*mm
        base.hex_fill(c, accent)
        c.setFont('DejaVuBold', 9)
        c.drawCentredString(W / 2, cy, subtitle)

        cy -= 6*mm
        base.hex_fill(c, base.MUTED)
        c.setFont('DejaVu', 7.5)
        # Uzun tagline'ı sar
        lines = base.wrap_text(tagline, 'DejaVu', 7.5, W - 2*A6_MARGIN, c)
        for line in lines:
            c.drawCentredString(W / 2, cy, line)
            cy -= 10

        base.hex_fill(c, accent)
        c.rect(A6_MARGIN, H/2 - 14*mm, A6_CONTENT_W, 1, fill=1, stroke=0)

        cy = H/2 - 20*mm
        base.hex_fill(c, base.MUTED)
        c.setFont('DejaVu', 7)
        c.drawCentredString(W / 2, cy, 'Bu kılavuz sahne.today platformunun')
        c.drawCentredString(W / 2, cy - 9, 'temel özelliklerini açıklamaktadır.')

        # QR kod
        qr_size = 18 * mm
        qr = QrCodeWidget('https://sahne.today')
        b = qr.getBounds()
        d = Drawing(qr_size, qr_size, transform=[qr_size / (b[2] - b[0]), 0, 0, qr_size / (b[3] - b[1]), 0, 0])
        d.add(qr)
        qr_x = W / 2 - qr_size / 2
        qr_y = 14 * mm
        renderPDF.draw(d, c, qr_x, qr_y)
        base.hex_fill(c, base.MUTED)
        c.setFont('DejaVu', 5.5)
        c.drawCentredString(W / 2, qr_y - 4, 'sahne.today')

        base.draw_footer(c, page_num, accent)

    def draw_section_header_a6(c, y, text, accent):
        _a6['accent'] = accent
        base.hex_fill(c, base.TEXT)
        c.setFont('DejaVuBold', 11)
        c.drawString(base.MARGIN, y, text)
        y -= 4
        base.hex_fill(c, accent)
        c.rect(base.MARGIN, y, base.CONTENT_W, 1.5, fill=1, stroke=0)
        return y - 7

    def draw_subsection_a6(c, y, text, accent):
        _a6['accent'] = accent
        base.hex_fill(c, accent)
        c.setFont('DejaVuBold', 9.5)
        c.drawString(base.MARGIN, y, text)
        return y - 6

    base.draw_cover          = draw_cover_a6
    base.draw_section_header = draw_section_header_a6
    base.draw_subsection     = draw_subsection_a6

    # ── A6 için sıkı satır aralıklı + taşma kontrollü çizim fonksiyonları ────
    _is_light = base.BG == (1, 1, 1)

    def draw_bullet_a6(c, y, text, indent=4*mm):
        x = base.MARGIN + indent
        max_w = base.CONTENT_W - indent - 6*mm
        lines = base.wrap_text(text, 'DejaVu', 9, max_w, c)
        # Kutu gibi uzun öğeler için önceden yer kontrolü
        needed = len(lines) * 10 + 10
        if y - needed < 8 * mm and _a6.get('accent'):
            y = _a6_page_break(c)
        base.hex_fill(c, base.MUTED)
        c.setFont('DejaVu', 9)
        c.drawString(x, y, '•')
        base.hex_fill(c, base.TEXT)
        c.setFont('DejaVu', 9)
        for i, line in enumerate(lines):
            c.drawString(x + 5*mm, y, line)
            y -= 10
        return y

    def draw_body_a6(c, y, text, indent=0):
        x = base.MARGIN + indent
        max_w = base.CONTENT_W - indent
        lines = base.wrap_text(text, 'DejaVu', 9, max_w, c)
        needed = len(lines) * 10 + 10
        if y - needed < 8 * mm and _a6.get('accent'):
            y = _a6_page_break(c)
        base.hex_fill(c, base.TEXT)
        c.setFont('DejaVu', 9)
        for line in lines:
            c.drawString(x, y, line)
            y -= 10
        return y

    def draw_tip_a6(c, y, text):
        max_w = base.CONTENT_W - 10*mm
        lines = base.wrap_text(text, 'DejaVu', 9, max_w, c)
        box_h = len(lines) * 10 + 10
        # Kutu altı footer çizgisine (14mm) taşıyorsa sayfa kır
        if y - box_h + 6 < 10 * mm and _a6.get('accent'):
            y = _a6_page_break(c)
        if _is_light:
            base.hex_fill(c, (230/255, 248/255, 241/255))
        else:
            base.hex_fill(c, (18/255, 50/255, 40/255))
        c.rect(base.MARGIN, y - box_h + 6, base.CONTENT_W, box_h, fill=1, stroke=0)
        base.hex_fill(c, base.TIP_GREEN)
        c.rect(base.MARGIN, y - box_h + 6, 3, box_h, fill=1, stroke=0)
        base.hex_fill(c, base.TIP_GREEN)
        c.setFont('DejaVuBold', 9)
        c.drawString(base.MARGIN + 7*mm, y, '✔  İpucu:')
        if _is_light:
            base.hex_fill(c, (20/255, 80/255, 60/255))
        else:
            base.hex_fill(c, (180/255, 230/255, 210/255))
        c.setFont('DejaVu', 9)
        ty = y - 10
        for line in lines:
            c.drawString(base.MARGIN + 7*mm, ty, line)
            ty -= 10
        return y - box_h - 5

    def draw_note_a6(c, y, text, accent):
        max_w = base.CONTENT_W - 10*mm
        lines = base.wrap_text(text, 'DejaVu', 9, max_w, c)
        box_h = len(lines) * 10 + 10
        _a6['accent'] = accent
        if y - box_h + 6 < 10 * mm and _a6.get('accent'):
            y = _a6_page_break(c)
        r, g, b = accent
        if _is_light:
            base.hex_fill(c, (r*0.12+0.88, g*0.12+0.88, b*0.12+0.88))
        else:
            base.hex_fill(c, (r*0.15, g*0.15, b*0.15))
        c.rect(base.MARGIN, y - box_h + 6, base.CONTENT_W, box_h, fill=1, stroke=0)
        base.hex_fill(c, accent)
        c.rect(base.MARGIN, y - box_h + 6, 3, box_h, fill=1, stroke=0)
        base.hex_fill(c, accent)
        c.setFont('DejaVuBold', 9)
        c.drawString(base.MARGIN + 7*mm, y, 'Not:')
        base.hex_fill(c, base.TEXT)
        c.setFont('DejaVu', 9)
        ty = y - 10
        for line in lines:
            c.drawString(base.MARGIN + 7*mm, ty, line)
            ty -= 10
        return y - box_h - 5

    def check_page_a6(c, y, accent, page_counter, min_y=50*mm):
        _a6['accent'] = accent
        if page_counter[0] < _a6.get('page', 0):
            page_counter[0] = _a6['page']  # draw_tip/draw_note sayfa kırmış olabilir
        else:
            _a6['page'] = page_counter[0]
        if y < min_y:
            y = _a6_page_break(c)
            page_counter[0] = _a6['page']
            return y
        return y

    base.draw_bullet = draw_bullet_a6
    base.draw_body   = draw_body_a6
    base.draw_tip    = draw_tip_a6
    base.draw_note   = draw_note_a6
    base.check_page  = check_page_a6


def _gen_a6_pdf(build_fn) -> bytes:
    """Verilen build fonksiyonunu A6 boyutunda çalıştır, bytes döndür."""
    _setup_base_for_a6()
    buf = io.BytesIO()
    build_fn(buf)
    return buf.getvalue()


# ── Kat işaretleri katmanı ────────────────────────────────────────────────────

def _make_fold_overlay() -> bytes:
    """A4 üzerinde yatay ve dikey kat çizgisi + kenar çentikleri."""
    buf = io.BytesIO()
    c = rl_canvas.Canvas(buf, pagesize=A4)

    c.setStrokeColorRGB(0.55, 0.55, 0.55)
    c.setLineWidth(0.4)

    # ── Yatay kat çizgisi (y = A6_H, sayfanın ortası) ────────────────────────
    c.setDash([5, 4], 0)
    c.line(0, A6_H, A4_W, A6_H)

    # ── Dikey kat çizgisi (x = A6_W, sayfanın ortası) ────────────────────────
    c.line(A6_W, 0, A6_W, A4_H)

    # ── Kenar çentikleri ──────────────────────────────────────────────────────
    c.setDash([], 0)
    c.setLineWidth(0.6)
    tick = 5 * mm

    # Yatay çizgi çentikleri (sol + sağ kenar)
    c.line(0,     A6_H - tick, 0,     A6_H + tick)
    c.line(A4_W,  A6_H - tick, A4_W,  A6_H + tick)

    # Dikey çizgi çentikleri (üst + alt kenar)
    c.line(A6_W - tick, 0,     A6_W + tick, 0    )
    c.line(A6_W - tick, A4_H,  A6_W + tick, A4_H )

    # ── "KAT" etiketleri ─────────────────────────────────────────────────────
    c.setFillColorRGB(0.65, 0.65, 0.65)
    c.setFont('Helvetica', 5.5)
    c.drawCentredString(A6_W / 2,       A6_H + 2.5, '↑ kat 1')
    c.drawCentredString(A6_W / 2,       A6_H - 6,   '↓ kat 1')
    c.drawString(A6_W + 2.5, A6_H / 2,  'kat 2 →')
    c.drawRightString(A6_W - 2.5, A6_H / 2, '← kat 2')

    c.save()
    buf.seek(0)
    return buf.read()


# ── Boş A6 sayfası ───────────────────────────────────────────────────────────

def _blank_a6_bytes() -> bytes:
    buf = io.BytesIO()
    c = rl_canvas.Canvas(buf, pagesize=A6)
    c.showPage()
    c.save()
    buf.seek(0)
    return buf.read()


# ── İmposition (sayfa dizilimi) ───────────────────────────────────────────────

def _place(dest: PageObject, src: PageObject, tx: float, ty: float, rot180: bool = False):
    """src sayfasını dest üzerine (tx, ty) konumuna yerleştir."""
    if rot180:
        # 180° döndür: (x,y) → (A6_W - x + tx, A6_H - y + ty)
        t = Transformation((-1, 0, 0, -1, A6_W + tx, A6_H + ty))
    else:
        t = Transformation().translate(tx, ty)
    dest.merge_transformed_page(src, t, expand=False)


def create_booklet(source_bytes: bytes, output_path: str):
    """
    A6 boyutunda sayfalara sahip PDF'i alır,
    A4 arkalı-önlü baskı için kitapçık sırasında dizilmiş PDF üretir.

    Dizilim (8 sayfalık yaprak, 0-indeksli):
    Ön yüz  TL: N-1(rot)  TR: 0         BL: 1         BR: N-2(rot)
    Arka yüz TL: N-3(rot)  TR: 2         BL: 3         BR: N-4(rot)

    Katlama sonrası okuma sırası: 1, 2, 3, 4, 5, 6, 7, 8 (1-indeksli)
    """
    reader  = PdfReader(io.BytesIO(source_bytes))
    pages   = list(reader.pages)
    n = len(pages)

    # 8'in katına tamamla
    blank   = PdfReader(io.BytesIO(_blank_a6_bytes())).pages[0]
    while n % 8 != 0:
        pages.append(blank)
        n += 1

    # Kat işareti katmanı
    fold_page = PdfReader(io.BytesIO(_make_fold_overlay())).pages[0]

    writer = PdfWriter()
    sheets = n // 8

    for s in range(sheets):
        base_idx = s * 8  # bu yaprağın ilk sayfası (0-indeksli)
        N = 8             # bu yaprağın sayfa sayısı (sabit 8)

        # 1-indeksli sayfa numaraları → 0-indeksli pozisyonlar
        # Ön yüz:  TL=N(rot) TR=1   BL=2   BR=N-1(rot)
        # Arka yüz:TL=N-2(rot) TR=3 BL=4   BR=N-3(rot)
        def p(one_based):
            return pages[base_idx + one_based - 1]

        # ── Ön yüz ──────────────────────────────────────────────────────────
        front = PageObject.create_blank_page(width=A4_W, height=A4_H)
        _place(front, p(N),   tx=0,     ty=A6_H, rot180=True)   # TL
        _place(front, p(1),   tx=A6_W,  ty=A6_H, rot180=False)  # TR
        _place(front, p(2),   tx=0,     ty=0,    rot180=False)   # BL
        _place(front, p(N-1), tx=A6_W,  ty=0,    rot180=True)   # BR
        front.merge_page(fold_page)
        writer.add_page(front)

        # ── Arka yüz ────────────────────────────────────────────────────────
        # Arkalı önlü baskıda "uzun kenardan çevir" (long-edge flip):
        # Kağıt soldan sağa çevrilir → sol-sağ aynı kalır, kağıt yüzü değişir.
        # Bu durumda: arka-TL fiziksel olarak ön-TL'ye karşılık gelir.
        back = PageObject.create_blank_page(width=A4_W, height=A4_H)
        _place(back, p(N-2), tx=0,     ty=A6_H, rot180=True)   # TL
        _place(back, p(3),   tx=A6_W,  ty=A6_H, rot180=False)  # TR
        _place(back, p(4),   tx=0,     ty=0,    rot180=False)   # BL
        _place(back, p(N-3), tx=A6_W,  ty=0,    rot180=True)   # BR
        back.merge_page(fold_page)
        writer.add_page(back)

    with open(output_path, 'wb') as f:
        writer.write(f)
    print(f'Oluşturuldu: {output_path}')


# ── Ana program ───────────────────────────────────────────────────────────────

if __name__ == '__main__':
    out = os.path.dirname(__file__)

    print('İçerik A6 boyutunda üretiliyor…')
    pdf1 = _gen_a6_pdf(base.build_pdf1)
    pdf2 = _gen_a6_pdf(base.build_pdf2)
    pdf3 = _gen_a6_pdf(base.build_pdf3)

    print('Kitapçık sayfaları diziliyor…')
    create_booklet(pdf1, os.path.join(out, 'Sahne_Today_01_Kitapcik_A6.pdf'))
    create_booklet(pdf2, os.path.join(out, 'Sahne_Today_02_Kitapcik_A6.pdf'))
    create_booklet(pdf3, os.path.join(out, 'Sahne_Today_03_Kitapcik_A6.pdf'))

    print('\nBaskı talimatı:')
    print('  1. Yazıcıdan "arkalı önlü" / "çift taraflı" seçin.')
    print('     Çeviri yönü: "Uzun kenardan çevir" (Long-edge flip).')
    print('  2. Her A4 yaprağını yazdırdıktan sonra:')
    print('     a. Yatay orta çizgiden altı üste doğru katlayın.')
    print('     b. Ardından dikey orta çizgiden sağı sola katlayın.')
    print('  3. Yaprakları sıraya dizip ortasından zımbalayın veya dikişle tutturun.')
