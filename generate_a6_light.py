#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Sahne.Today A6 telefon ekrani kullanim kilavuzu uretici (beyaz tema)"""

import os, io
import generate_pdfs as base

# ── Beyaz tema renkleri ───────────────────────────────────────────────────────
base.BG        = (1,       1,       1      )
base.TEXT      = (25/255,  25/255,  28/255 )
base.MUTED     = (110/255, 108/255, 104/255)
base.TIP_GREEN = (22/255, 140/255, 103/255)

from generate_booklets import _gen_a6_pdf

if __name__ == '__main__':
    out = os.path.dirname(__file__)

    for build_fn, name in [
        (base.build_pdf1, 'Sahne_Today_01_Sanatci_ve_Grup_A6_Beyaz.pdf'),
        (base.build_pdf2, 'Sahne_Today_02_Mekan_A6_Beyaz.pdf'),
        (base.build_pdf3, 'Sahne_Today_03_Izleyici_A6_Beyaz.pdf'),
    ]:
        data = _gen_a6_pdf(build_fn)
        path = os.path.join(out, name)
        with open(path, 'wb') as f:
            f.write(data)
        print(f'Olusturuldu: {path}')

    print('Tum A6 (beyaz tema) PDFler olusturuldu.')
