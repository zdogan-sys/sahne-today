#!/usr/bin/env python3
"""A6 icerik üretiminde y konumlarini izle — dogru A6 fonksiyonlarini yakala."""
import io
from reportlab.lib.units import mm

import generate_pdfs as base
import generate_booklets as bk

for idx, build_fn in enumerate([base.build_pdf1, base.build_pdf2, base.build_pdf3], 1):
    print(f'\n{"="*80}')
    print(f'PDF {idx} — {build_fn.__name__}')
    print(f'{"="*80}')

    buf = io.BytesIO()
    bk._setup_base_for_a6()  # A6 override'lari kur

    # Simdi A6 fonksiyonlarini yakala
    _orig_tip = base.draw_tip
    _orig_note = base.draw_note
    _orig_body = base.draw_body
    _orig_bullet = base.draw_bullet
    _orig_check = base.check_page
    _orig_section = base.draw_section_header
    _orig_sub = base.draw_subsection

    def logged_tip(c, y, text):
        max_w = base.CONTENT_W - 10*mm
        lines = base.wrap_text(text, 'DejaVu', 9, max_w, c)
        box_h = len(lines) * 10 + 10
        preview = text[:60].replace('\n', ' ')
        bottom = y - box_h + 6
        print(f'  TIP  y={y:.1f}pt({y/mm:.1f}mm) box={box_h:.0f}pt bottom={bottom:.1f}pt({bottom/mm:.1f}mm) check={"BREAK" if bottom<10*mm else "OK"} | {preview}...')
        return _orig_tip(c, y, text)

    def logged_note(c, y, text, accent):
        max_w = base.CONTENT_W - 10*mm
        lines = base.wrap_text(text, 'DejaVu', 9, max_w, c)
        box_h = len(lines) * 10 + 10
        preview = text[:60].replace('\n', ' ')
        bottom = y - box_h + 6
        print(f'  NOTE y={y:.1f}pt({y/mm:.1f}mm) box={box_h:.0f}pt bottom={bottom:.1f}pt({bottom/mm:.1f}mm) check={"BREAK" if bottom<10*mm else "OK"} | {preview}...')
        return _orig_note(c, y, text, accent)

    def logged_body(c, y, text, indent=0):
        result = _orig_body(c, y, text, indent)
        lines = base.wrap_text(text, 'DejaVu', 9, base.CONTENT_W - indent, c)
        preview = text[:50].replace('\n', ' ')
        print(f'  body y={y:.1f}->{result:.1f} ({len(lines)} lines) | {preview}...')
        return result

    def logged_bullet(c, y, text, indent=4*mm):
        result = _orig_bullet(c, y, text, indent)
        lines = base.wrap_text(text, 'DejaVu', 9, base.CONTENT_W - indent - 6*mm, c)
        preview = text[:50].replace('\n', ' ')
        print(f'  bull y={y:.1f}->{result:.1f} ({len(lines)} lines) | {preview}...')
        return result

    def logged_check(c, y, accent, pc, min_y=50*mm):
        result = _orig_check(c, y, accent, pc, min_y)
        if result != y:
            print(f'  *** PAGE BREAK *** y={y:.1f}->{result:.1f} page={bk._a6.get("page","?")}')
        return result

    def logged_section(c, y, text, accent):
        result = _orig_section(c, y, text, accent)
        print(f'  HDR  y={y:.1f}->{result:.1f} | {text}')
        return result

    def logged_sub(c, y, text, accent):
        result = _orig_sub(c, y, text, accent)
        print(f'  SUB  y={y:.1f}->{result:.1f} | {text}')
        return result

    base.draw_tip = logged_tip
    base.draw_note = logged_note
    base.draw_body = logged_body
    base.draw_bullet = logged_bullet
    base.check_page = logged_check
    base.draw_section_header = logged_section
    base.draw_subsection = logged_sub

    build_fn(buf)
    print(f'Total A6 pages: {bk._a6.get("page","?")}')
