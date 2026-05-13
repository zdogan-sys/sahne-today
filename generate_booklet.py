#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Sahne.Today A5 Kitapcik Uretici (Saddle-Stitch / Zimba Teli Cilt).

3 adet A5 kagidi (210×148mm landscape) ust uste koyup ortadan katlayinca
12 sayfalik (her biri A6 portrait = 105×148mm) bir kitapcik elde edilir.

Her A5 yapragi arkalı onlu basılır, her yuzde 2 A6 panel bulunur.
Sayfa siralamasi saddle-stitch imposition ile hesaplanir.

Kullanilan A5 kitapcik sayfa sirasi (3 yaprak, 12 A6 sayfa):
  Yaprak 0 (en distaki) On  = sol:12 / sag:1   Arka = sol:2  / sag:11
  Yaprak 1 (orta)         On  = sol:10 / sag:3   Arka = sol:4  / sag:9
  Yaprak 2 (en icteki)    On  = sol:8  / sag:5   Arka = sol:6  / sag:7

Baski talimati:
  1. Yazicidan "arkali onlu" / "cift tarafli" secin.
     Ceviri yonu: "Kisa kenardan cevir" (Short-edge flip).
  2. Yapraklari sirasiyla ust uste koyun.
  3. Ortadan (A5'in kisa kenarinin orta noktasindan) zimbalayin.
  4. Ortadan katlayin → 12 sayfalik A6 kitapcik.
"""

import os, io
import generate_pdfs as base
from pypdf import PdfReader, PdfWriter, PageObject, Transformation
from reportlab.lib.pagesizes import A6, A5, landscape
from reportlab.lib.units import mm

# ── Boyutlar ──────────────────────────────────────────────────────────────────
A5_W, A5_H = landscape(A5)   # 595.28 × 420.94 pt (210×148mm)
A6_W, A6_H = A6              # 297.64 × 420.94 pt (105×148mm)


def _gen_a6_content(build_fn) -> bytes:
    """build_fn ile A6 icerikli PDF uret, bytes dondur."""
    base.setup_a6()
    buf = io.BytesIO()
    build_fn(buf)
    return buf.getvalue()


def _blank_a6_page() -> bytes:
    """Bos A6 sayfasi (padding icin)."""
    from reportlab.pdfgen import canvas as rl_canvas
    buf = io.BytesIO()
    c = rl_canvas.Canvas(buf, pagesize=A6)
    c.showPage()
    c.save()
    buf.seek(0)
    return buf.read()


def _impose_booklet(a6_pdf_bytes: bytes, output_path: str):
    """
    A6 icerik sayfalarini alir, A5 yapraklara saddle-stitch sirasiyla yerlestirir.
    Her A5 yaprakta 2 A6 panel (sol + sag) bulunur.
    """
    reader = PdfReader(io.BytesIO(a6_pdf_bytes))
    pages = list(reader.pages)
    n = len(pages)

    # 4'un katina tamamla (her A5 yapragi 4 A6 sayfa alir)
    blank_reader = PdfReader(io.BytesIO(_blank_a6_page()))
    blank = blank_reader.pages[0]
    while n % 4 != 0:
        pages.append(blank)
        n += 1

    writer = PdfWriter()
    sheets = n // 4  # A5 yaprak sayisi
    N_pages = n       # toplam A6 sayfa (4'un kati)

    for s in range(sheets):
        # 1-indexli sayfa numaralari
        def page(one_based):
            return pages[one_based - 1]

        # ── On yuz ──────────────────────────────────────────────────────────
        front = PageObject.create_blank_page(width=A5_W, height=A5_H)
        # Sol panel: sayfa 4N-2s
        front.merge_transformed_page(
            page(4 * sheets - 2 * s),
            Transformation().translate(0, 0),
            expand=False)
        # Sag panel: sayfa 2s+1
        front.merge_transformed_page(
            page(2 * s + 1),
            Transformation().translate(A6_W, 0),
            expand=False)
        writer.add_page(front)

        # ── Arka yuz ────────────────────────────────────────────────────────
        back = PageObject.create_blank_page(width=A5_W, height=A5_H)
        # Sol panel: sayfa 2s+2
        back.merge_transformed_page(
            page(2 * s + 2),
            Transformation().translate(0, 0),
            expand=False)
        # Sag panel: sayfa 4N-2s-1
        back.merge_transformed_page(
            page(4 * sheets - 2 * s - 1),
            Transformation().translate(A6_W, 0),
            expand=False)
        writer.add_page(back)

    with open(output_path, 'wb') as f:
        writer.write(f)
    print(f'Olusturuldu: {output_path}  ({sheets} A5 yaprak, {N_pages} A6 sayfa)')


def make_booklet(build_fn, output_path):
    """Tek adimda A6 icerik uret ve A5 kitapcik olarak kaydet."""
    a6_bytes = _gen_a6_content(build_fn)
    _impose_booklet(a6_bytes, output_path)


# ── Ana program ────────────────────────────────────────────────────────────────

if __name__ == '__main__':
    out = os.path.dirname(__file__)

    # --- Koyu tema (varsayilan) ---
    print('Koyu tema kitapciklar uretiliyor...')
    make_booklet(base.build_sanatci,  os.path.join(out, 'Sahne_Today_01_Kitapcik_A6.pdf'))
    make_booklet(base.build_mekan,    os.path.join(out, 'Sahne_Today_02_Kitapcik_A6.pdf'))
    make_booklet(base.build_izleyici, os.path.join(out, 'Sahne_Today_03_Kitapcik_A6.pdf'))

    # --- Beyaz tema ---
    print('\nBeyaz tema kitapciklar uretiliyor...')
    base.BG        = (1,       1,       1)
    base.TEXT      = (25/255,  25/255,  28/255)
    base.MUTED     = (110/255, 108/255, 104/255)
    base.TIP_GREEN = (22/255, 140/255, 103/255)

    make_booklet(base.build_sanatci,  os.path.join(out, 'Sahne_Today_01_Kitapcik_A6_Beyaz.pdf'))
    make_booklet(base.build_mekan,    os.path.join(out, 'Sahne_Today_02_Kitapcik_A6_Beyaz.pdf'))
    make_booklet(base.build_izleyici, os.path.join(out, 'Sahne_Today_03_Kitapcik_A6_Beyaz.pdf'))

    print('\nTum A5 kitapciklar olusturuldu.')
    print('\nBaski talimati:')
    print('  1. Yazicidan "arkali onlu" / "cift tarafli" secin.')
    print('     Ceviri yonu: "Kisa kenardan cevir" (Short-edge flip).')
    print('  2. Her A5 yapragini yazdirin.')
    print('  3. Yapraklari sirayla ust uste koyun (ilk sayfa en altta).')
    print('  4. Ortadan zimbalayin ve katlayin -> A6 kitapcik hazir.')
