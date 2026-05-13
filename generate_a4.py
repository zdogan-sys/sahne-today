#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Sahne.Today A4 bilgisayar ekrani kullanim kilavuzu uretici (koyu tema)"""

import os
import generate_pdfs as base

if __name__ == '__main__':
    out = os.path.dirname(__file__)

    base.build_sanatci( os.path.join(out, 'Sahne_Today_01_Sanatci_ve_Grup.pdf'))
    base.build_mekan(   os.path.join(out, 'Sahne_Today_02_Mekan.pdf'))
    base.build_izleyici(os.path.join(out, 'Sahne_Today_03_Izleyici.pdf'))

    print('Tum A4 (koyu tema) PDFler olusturuldu.')
