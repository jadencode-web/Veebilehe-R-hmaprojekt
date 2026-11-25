# SoodneKorv

**Mida leht teeb:** SoodneKorv aitab koostada nädala toiduplaani 50 retsepti seast ja leiab, kas Rimis, Selveris või Maximas on kogu ostukorv kõige soodsam. Kasutaja valib igaks päevaks hommiku-, lõuna- ja õhtusöögi, ostunimekirja lehel arvutab server Pythoniga, mida ja mitu pakki osta ning millisest poest või poepaarist tuleb kõige odavam.

**Leht:** LINK KODU.UT.EE LEHELE

## Tiim ja tööjaotus

| Tiimiliige | Mida tegi |
|---|---|
| NIMI 1 | ... |
| NIMI 2 | ... |
| NIMI 3 | ... |

## Lehed

| Leht | Mis seal on |
|---|---|
| `index.html` (avaleht) | tutvustus, kasutusjuhend, nädalaplaani seis, fotode autorid |
| `toiduplaan.html` (nädalaplaan) | 7 päeva x 3 toidukorda, retseptide otsing ja sorteerimine |
| `ostunimekiri.html` | soodsaim ostukorv, ostunimekiri poodide kaupa, poodide võrdlus, allalaadimine ja printimine |

## Kuidas see töötab

```
scraperid/*.py              ->  andmed/hinnad/hinnad_rimi.json, hinnad_selver.json, hinnad_maxima.json
toiduplaan.html             ->  kasutaja valib retseptid (salvestub brauserisse)
ostunimekiri.html           ->  saadab valiku serverisse
public_html/cgi-bin/arvuta.py -> Python arvutab iga poe ja poepaari hinna ning tagastab tulemuse
```

## Failid

| Kaust / fail | Mis see on |
|---|---|
| `public_html/css/uhine.css` | kõigi lehtede ühine stiil |
| `public_html/css/index.css`, `toiduplaan.css`, `ostunimekiri.css` | iga lehe oma stiil |
| `public_html/js/uhine.js` | kõigi lehtede ühised funktsioonid |
| `public_html/js/index.js`, `toiduplaan.js`, `ostunimekiri.js` | iga lehe oma JavaScript |
| `public_html/img/` | logo ja ikoonid (SVG) |
| `public_html/fonts/` | font DM Sans (SIL Open Font License) |
| `public_html/cgi-bin/arvuta.py` | Pythoni backend: arvutab ostukorvi |
| `public_html/cgi-bin/ostunimekiri_fail.py` | Pythoni backend: teeb ostunimekirjast HTML-faili, mis töötab telefonis ilma internetita |
| `andmed/ostunimekiri_mall.html` | allalaaditava ostunimekirja kujundus |
| `public_html/cgi-bin/retseptid.py` | Pythoni backend: saadab retseptid lehele |
| `andmed/` | retseptid, koostisosad, valitud tooted ja hinnad |
| `scraperid/` | Rimi, Selveri ja Maxima scraperid |

`andmed/` ja `scraperid/` on meelega väljaspool `public_html`-i, et need ei oleks veebis avalikud.

## Käivitamine oma arvutis

```
python3 kaivita_lokaalselt.py
```
Ava brauseris http://127.0.0.1:8000

Hindade uuendamine:
```
pip install requests beautifulsoup4
python3 scraperid/rimi.py
python3 scraperid/selver.py
python3 scraperid/maxima.py
```

## Kodu.ut.ee serverisse panek

1. Kopeeri `public_html` kausta sisu serveris kausta `~/public_html`.
2. Kopeeri `andmed` kaust serveris kausta `~/andmed` (kodukausta, mitte public_html-i sisse).
3. Anna Pythoni failidele käivitusõigus: `chmod 755 ~/public_html/cgi-bin/*.py`
4. Ava leht ja proovi ostunimekirja lehte.

## Allikad

- Toidufotod: Wikimedia Commons, Pixabay ja Pexels, iga foto autor ja litsents on avalehel jaotises "Fotode autorid".
- Font: DM Sans, Google Fonts (SIL Open Font License).
- Logo ja ikoonid: tiimi oma, joonistatud SVG-na.
- JavaScript ja Python on kirjutatud Claude'i (Anthropic) abiga, iga faili alguses on viide. Pythonis ei ole kasutatud ühtegi raamistikku.
