#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Sahne.Today A4 bilgisayar ekrani kullanim kilavuzu uretici (beyaz tema)"""

import os
import generate_pdfs as base

# Beyaz tema renkleri
base.BG        = (1,       1,       1)
base.TEXT      = (25/255,  25/255,  28/255)
base.MUTED     = (110/255, 108/255, 104/255)
base.TIP_GREEN = (22/255, 140/255, 103/255)

if __name__ == '__main__':
    out = os.path.dirname(__file__)

    base.build_sanatci( os.path.join(out, 'Sahne_Today_01_Sanatci_ve_Grup_Beyaz.pdf'))
    base.build_mekan(   os.path.join(out, 'Sahne_Today_02_Mekan_Beyaz.pdf'))
    base.build_izleyici(os.path.join(out, 'Sahne_Today_03_Izleyici_Beyaz.pdf'))

    print('Tum A4 (beyaz tema) PDFler olusturuldu.')
