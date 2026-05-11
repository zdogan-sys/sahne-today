#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Sahne.Today kullanim kilavuzu PDF uretici — Beyaz tema"""

import os
import generate_pdfs as base
from reportlab.lib.units import mm
from reportlab.lib.pagesizes import A4

W, H = A4
MARGIN = base.MARGIN
CONTENT_W = base.CONTENT_W

# ── Acik tema renkleri ────────────────────────────────────────────────────────
BG    = (1,       1,       1      )  # beyaz
TEXT  = (25/255,  25/255,  28/255 )  # neredeyse siyah
MUTED = (110/255, 108/255, 104/255)  # orta gri
TIP_GREEN = (22/255, 140/255, 103/255)

# Accent renkler ayni kalir (beyaz uzerinde calisir)
ACC_ARTIST   = base.ACC_ARTIST
ACC_VENUE    = base.ACC_VENUE
ACC_AUDIENCE = base.ACC_AUDIENCE

# ── Modül globallerini ez ────────────────────────────────────────────────────
base.BG    = BG
base.TEXT  = TEXT
base.MUTED = MUTED
base.TIP_GREEN = TIP_GREEN

# ── Sabit renk iceren fonksiyonlari yeniden tanimla ──────────────────────────

def draw_tip(c, y, text):
    """Ipucu kutusu (acik yesil). Yeni y dondurur."""
    max_w = CONTENT_W - 10*mm
    lines = base.wrap_text(text, 'DejaVu', 9, max_w, c)
    box_h = len(lines) * 13 + 10
    # Arkaplan: cok acik yesil
    base.hex_fill(c, (230/255, 248/255, 241/255))
    c.rect(MARGIN, y - box_h + 6, CONTENT_W, box_h, fill=1, stroke=0)
    # Sol cizgi
    base.hex_fill(c, TIP_GREEN)
    c.rect(MARGIN, y - box_h + 6, 3, box_h, fill=1, stroke=0)
    # Etiket
    base.hex_fill(c, TIP_GREEN)
    c.setFont('DejaVuBold', 9)
    c.drawString(MARGIN + 7*mm, y, '✔  Ipucu:')
    # Metin
    base.hex_fill(c, (20/255, 80/255, 60/255))
    c.setFont('DejaVu', 9)
    ty = y - 13
    for line in lines:
        c.drawString(MARGIN + 7*mm, ty, line)
        ty -= 13
    return y - box_h - 5

def draw_note(c, y, text, accent):
    """Not kutusu (accent renk, acik arka plan). Yeni y dondurur."""
    max_w = CONTENT_W - 10*mm
    lines = base.wrap_text(text, 'DejaVu', 9, max_w, c)
    box_h = len(lines) * 13 + 10
    r, g, b = accent
    # Cok acik pastel tonu
    base.hex_fill(c, (r * 0.12 + 0.88, g * 0.12 + 0.88, b * 0.12 + 0.88))
    c.rect(MARGIN, y - box_h + 6, CONTENT_W, box_h, fill=1, stroke=0)
    base.hex_fill(c, accent)
    c.rect(MARGIN, y - box_h + 6, 3, box_h, fill=1, stroke=0)
    base.hex_fill(c, accent)
    c.setFont('DejaVuBold', 9)
    c.drawString(MARGIN + 7*mm, y, 'Not:')
    base.hex_fill(c, TEXT)
    c.setFont('DejaVu', 9)
    ty = y - 13
    for line in lines:
        c.drawString(MARGIN + 7*mm, ty, line)
        ty -= 13
    return y - box_h - 5

# Moduldeki fonksiyonlari da ez
base.draw_tip  = draw_tip
base.draw_note = draw_note

# ── Uret ─────────────────────────────────────────────────────────────────────

if __name__ == '__main__':
    out = os.path.dirname(__file__)
    base.build_pdf1(os.path.join(out, 'Sahne_Today_01_Sanatci_ve_Grup_Beyaz.pdf'))
    print('Olusturuldu: Sahne_Today_01_Sanatci_ve_Grup_Beyaz.pdf')
    base.build_pdf2(os.path.join(out, 'Sahne_Today_02_Mekan_Beyaz.pdf'))
    print('Olusturuldu: Sahne_Today_02_Mekan_Beyaz.pdf')
    base.build_pdf3(os.path.join(out, 'Sahne_Today_03_Izleyici_Beyaz.pdf'))
    print('Olusturuldu: Sahne_Today_03_Izleyici_Beyaz.pdf')
    print('Tum PDF\'ler olusturuldu.')
