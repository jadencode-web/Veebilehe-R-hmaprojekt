#!/usr/bin/env python3
# RETSEPTID.PY  (Pythoni backend, töötab serveris)
# Tegi: SoodneKorvi tiim
# Kood on kirjutatud tehisintellekti Claude (Anthropic) abiga, tiim on koodi läbi vaadanud ja testinud.
#
# Saadab veebilehele kõigi retseptide nimekirja JSON-ina.
# Kaust andmed/ ei ole veebis avalik, seepärast loeb leht retseptid selle skripti kaudu.
# Serveris peab failil olema käivitusõigus: chmod 755 retseptid.py

import sys                    # vastuse saatmiseks (sys.stdout.buffer)
import json                   # JSON-faili lugemiseks ja saatmiseks
from pathlib import Path      # failide asukohtade jaoks

SIIN = Path(__file__).resolve().parent                      # kaust public_html/cgi-bin


def leia_andmed():
    # Otsib kausta "andmed" kolmest kohast, sest serveris võib see olla pandud eri kohta:
    # 1) kodukaustas (~/andmed), 2) public_html sees (~/public_html/andmed), 3) cgi-bin sees.
    kohad = [SIIN.parent.parent / "andmed", SIIN.parent / "andmed", SIIN / "andmed"]
    for koht in kohad:
        if (koht / "retseptid.json").exists():
            return koht
    return None


def saada(staatus, sisu_tüüp, tekst):
    # Saadab vastuse UTF-8 baitidena, et täpitähed (õ, ä, ö, ü) töötaksid igas serveris.
    # staatus = näiteks "200 OK", sisu_tüüp = näiteks "application/json", tekst = vastuse sisu
    päis = "Status: " + staatus + "\r\nContent-Type: " + sisu_tüüp + "; charset=utf-8\r\n\r\n"
    sys.stdout.buffer.write(päis.encode("utf-8"))
    sys.stdout.buffer.write(tekst.encode("utf-8"))


try:
    andmed = leia_andmed()
    if andmed is None:
        raise FileNotFoundError("Kausta 'andmed' ei leitud. Pane see kodukausta (~/andmed) või kausta public_html.")
    with open(andmed / "retseptid.json", "r", encoding="utf-8") as f:
        retseptid = json.load(f)                           # list, näiteks [{"nimi": "Plov", ...}, ...]
    saada("200 OK", "application/json", json.dumps(retseptid, ensure_ascii=False))
except Exception as viga:
    saada("500 Internal Server Error", "text/plain", "Viga: " + str(viga))
