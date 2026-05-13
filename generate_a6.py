#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Sahne.Today A6 telefon ekrani kullanim kilavuzu uretici (koyu tema)

generate_booklets.py ile ayni A6 icerik fonksiyonlarini kullanir,
fakat sayfalari A4'e dizmez — dogrudan A6 PDF olarak kaydeder.
"""

import os, io
import generate_pdfs as base
from generate_booklets import _gen_a6_pdf

if __name__ == '__main__':
    out = os.path.dirname(__file__)

    print('Izleyici A6 uretiliyor…')
    pdf3 = _gen_a6_pdf(base.build_pdf3)
    path3 = os.path.join(out, 'Sahne_Today_03_Izleyici_A6.pdf')
    with open(path3, 'wb') as f:
        f.write(pdf3)
    print(f'Olusturuldu: {path3}')

    print('Sanatci/Grup A6 uretiliyor…')
    pdf1 = _gen_a6_pdf(base.build_pdf1)
    path1 = os.path.join(out, 'Sahne_Today_01_Sanatci_ve_Grup_A6.pdf')
    with open(path1, 'wb') as f:
        f.write(pdf1)
    print(f'Olusturuldu: {path1}')

    print('Mekan A6 uretiliyor…')
    pdf2 = _gen_a6_pdf(base.build_pdf2)
    path2 = os.path.join(out, 'Sahne_Today_02_Mekan_A6.pdf')
    with open(path2, 'wb') as f:
        f.write(pdf2)
    print(f'Olusturuldu: {path2}')

    print('Tum A6 (koyu tema) PDFler olusturuldu.')
