#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Sahne.Today A6 telefon ekrani kullanim kilavuzu uretici (koyu tema)"""

import os
import generate_pdfs as base

if __name__ == '__main__':
    base.setup_a6()
    out = os.path.dirname(__file__)

    base.build_sanatci(  os.path.join(out, 'Sahne_Today_01_Sanatci_ve_Grup_A6.pdf'))
    base.build_mekan(    os.path.join(out, 'Sahne_Today_02_Mekan_A6.pdf'))
    base.build_izleyici( os.path.join(out, 'Sahne_Today_03_Izleyici_A6.pdf'))

    print('Tum A6 (koyu tema) PDFler olusturuldu.')
