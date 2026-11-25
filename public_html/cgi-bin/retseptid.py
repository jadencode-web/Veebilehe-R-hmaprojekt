#!/usr/bin/env python3
# RETSEPTID.PY  (Pythoni backend, töötab serveris)
# Tegi: SoodneKorvi tiim
# Kood on kirjutatud tehisintellekti Claude (Anthropic) abiga, tiim on koodi läbi vaadanud ja testinud.
#
# Saadab veebilehele kõigi retseptide nimekirja JSON-ina.
# Kaust andmed/ ei ole veebis avalik, seepärast loeb leht retseptid selle skripti kaudu.
# Serveris peab failil olema käivitusõigus: chmod 755 retseptid.py

import json                   # JSON-faili lugemiseks ja saatmiseks
from pathlib import Path      # failide asukohtade jaoks

ANDMED = Path(__file__).resolve().parents[2] / "andmed"   # public_html/cgi-bin -> kaks taset üles

with open(ANDMED / "retseptid.json", "r", encoding="utf-8") as f:
    retseptid = json.load(f)                               # list, näiteks [{"nimi": "Plov", ...}, ...]

print("Content-Type: application/json; charset=utf-8")
print()
print(json.dumps(retseptid, ensure_ascii=False))
