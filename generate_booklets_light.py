#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Sahne.Today A6 kitapçık üretici — Beyaz tema"""

import os
import generate_pdfs as base

# ── Beyaz tema renkleri ───────────────────────────────────────────────────────
BG    = (1,       1,       1      )
TEXT  = (25/255,  25/255,  28/255 )
MUTED = (110/255, 108/255, 104/255)
TIP_GREEN = (22/255, 140/255, 103/255)

base.BG    = BG
base.TEXT  = TEXT
base.MUTED = MUTED
base.TIP_GREEN = TIP_GREEN

# ── Sabit renkli fonksiyonları ez (generate_pdfs_light.py ile aynı) ──────────
from reportlab.lib.units import mm
from reportlab.lib.pagesizes import A6

A6_W, A6_H = A6
CONTENT_W_A6 = A6_W - 22  # yaklaşık, _setup_base_for_a6 üzerine yazar

def draw_tip(c, y, text):
    max_w = base.CONTENT_W - 10*mm
    lines = base.wrap_text(text, 'DejaVu', 9, max_w, c)
    box_h = len(lines) * 13 + 10
    base.hex_fill(c, (230/255, 248/255, 241/255))
    c.rect(base.MARGIN, y - box_h + 6, base.CONTENT_W, box_h, fill=1, stroke=0)
    base.hex_fill(c, TIP_GREEN)
    c.rect(base.MARGIN, y - box_h + 6, 3, box_h, fill=1, stroke=0)
    base.hex_fill(c, TIP_GREEN)
    c.setFont('DejaVuBold', 9)
    c.drawString(base.MARGIN + 7*mm, y, '✔  İpucu:')
    base.hex_fill(c, (20/255, 80/255, 60/255))
    c.setFont('DejaVu', 9)
    ty = y - 13
    for line in lines:
        c.drawString(base.MARGIN + 7*mm, ty, line)
        ty -= 13
    return y - box_h - 5

def draw_note(c, y, text, accent):
    max_w = base.CONTENT_W - 10*mm
    lines = base.wrap_text(text, 'DejaVu', 9, max_w, c)
    box_h = len(lines) * 13 + 10
    r, g, b = accent
    base.hex_fill(c, (r * 0.12 + 0.88, g * 0.12 + 0.88, b * 0.12 + 0.88))
    c.rect(base.MARGIN, y - box_h + 6, base.CONTENT_W, box_h, fill=1, stroke=0)
    base.hex_fill(c, accent)
    c.rect(base.MARGIN, y - box_h + 6, 3, box_h, fill=1, stroke=0)
    base.hex_fill(c, accent)
    c.setFont('DejaVuBold', 9)
    c.drawString(base.MARGIN + 7*mm, y, 'Not:')
    base.hex_fill(c, TEXT)
    c.setFont('DejaVu', 9)
    ty = y - 13
    for line in lines:
        c.drawString(base.MARGIN + 7*mm, ty, line)
        ty -= 13
    return y - box_h - 5

base.draw_tip  = draw_tip
base.draw_note = draw_note

# ── generate_booklets'ten her şeyi yeniden kullan ─────────────────────────────
from generate_booklets import _gen_a6_pdf, create_booklet

if __name__ == '__main__':
    out = os.path.dirname(__file__)

    print('İçerik A6 beyaz tema ile üretiliyor…')
    pdf1 = _gen_a6_pdf(base.build_pdf1)
    pdf2 = _gen_a6_pdf(base.build_pdf2)
    pdf3 = _gen_a6_pdf(base.build_pdf3)

    print('Kitapçık sayfaları diziliyor…')
    create_booklet(pdf1, os.path.join(out, 'Sahne_Today_01_Kitapcik_A6_Beyaz.pdf'))
    create_booklet(pdf2, os.path.join(out, 'Sahne_Today_02_Kitapcik_A6_Beyaz.pdf'))
    create_booklet(pdf3, os.path.join(out, 'Sahne_Today_03_Kitapcik_A6_Beyaz.pdf'))
    print('Tüm beyaz tema kitapçıklar oluşturuldu.')
