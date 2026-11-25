# Veebilehe-Ryhmaprojekt - Toidukordade planeerija ja ostukorvi hinnavõrdlus

**SoodneKorv** · Veebileht: LINK TULEB

## Projekti tutvustus

Meie rühmatöö eesmärk on luua veebileht, mis aitab kasutajal planeerida oma nädala toidukordi ning leida valitud toitude valmistamiseks vajalikud toiduained võimalikult soodsa hinnaga.

Veebileht ühendab toidukordade planeerimise, ostunimekirja koostamise ja erinevate toidupoodide hindade võrdlemise ühtseks lahenduseks. Projekti eesmärk on muuta iganädalane toiduostude planeerimine lihtsamaks, mugavamaks ja rahaliselt säästlikumaks.

## Veebilehe ülesehitus

Veebileht koosneb kolmest põhilehest.

### 1. Avaleht - tutvustus ja kasutusjuhend

Avalehel tutvustatakse veebirakenduse eesmärki, peamisi võimalusi ja kasutamise põhimõtteid. Kasutajale selgitatakse samm-sammult, kuidas koostada nädalamenüüd ja saada selle põhjal ostunimekiri.

### 2. Toidukordade planeerimine

Teisel lehel saab kasutaja koostada endale terve nädala toiduplaani.

Kasutaja saab:
- Valida hommiku-, lõuna- ja õhtusööke.
- Kasutada filtreid sobivate toidukordade leidmiseks.
- Planeerida toidukorrad kõigiks seitsmeks nädalapäevaks.
- Kinnitada oma valikud ja liikuda edasi ostunimekirja koostamise juurde.

Valitud toidukordade põhjal koostatakse vajalike toiduainete ja koguste nimekiri.

### 3. Ostunimekiri ja hinnavõrdlus

Kolmandal lehel kuvatakse kasutaja nädalamenüü põhjal koostatud ostunimekiri ning võrreldakse vajalike toodete hindu erinevates toidupoodides.

Võrdleme kolme kaupluse hindu:
- Maxima
- Selver
- Rimi

Toodete hinnad kogutakse kaupluste veebilehtedelt Pythoni scraperitega ning server arvutab Pythoniga, millises poes on ostude tegemine kõige soodsam.

Võrdluses arvestatakse nii kogu ostunimekirja maksumust ühes kaupluses kui ka võimalust jagada ostud mitme kaupluse vahel.

Kasutajale kuvatakse:
- Soovituslik kauplus või kauplused.
- Ostetavate toodete nimekiri.
- Iga toote vajalik kogus ja hind.
- Ostunimekirja kogumaksumus.
- Erinevate ostuvõimaluste hinnavõrdlus.

Lisaks saab kasutaja ostunimekirja printida või PDF-ina salvestada ning alla laadida telefoni, kus saab ostetud tooteid linnukesega märkida ka ilma internetita.

## Projekti eesmärk

Projekti lõppeesmärk on luua kasutajasõbralik veebileht, mis aitab vähendada toiduostude planeerimisele kuluvat aega ning võimaldab teha teadlikumaid ja soodsamaid ostuotsuseid.

## Rühmatöö 
### Korraldus

Projekti arendamisel jagame ülesanded rühmaliikmete vahel ja teeme koostööd, et veebileht valmiks õigeks ajaks.

### Rühma kokkulepped

- Iga rühmaliige vastutab oma ülesannete täitmise eest.
- Peame kinni kokkulepitud tähtaegadest.
- Probleemide tekkimisel anname neist teistele teada.
- Vajadusel aitame üksteist.
- Suuremad muudatused arutame enne tegemist ühiselt läbi.
- Kõik rühmaliikmed panustavad GitHubi repositooriumisse.

### Töökorraldus

Kasutame GitHubi projekti failide haldamiseks ja muudatuste salvestamiseks. Iga rühmaliige teeb oma töö kohta commite, et projekti areng oleks jälgitav.

## Rühmaliikmed

- Jaden Ordašokov
- Reevo Veelmaa
- Adrian Randlo

## Tööjaotus

Alguses jagasime töö nii, et igaüks tegi ühe scraperi ja ühe lehe:

| Rühmaliige | Scraper | Leht |
|---|---|---|
| Jaden Ordašokov | Rimi | Nädalaplaan |
| Reevo Veelmaa | Selver | Ostunimekiri |
| Adrian Randlo | Maxima | Avaleht |

Pärast seda tegime kõike koos: valisime ühise disaini, retseptid, pildid ja tooted, mida scrapida, ning panime projekti kokku. Töötasime samas ruumis ja arutasime kõik otsused koos läbi, seega panustasid kõik rühmaliikmed võrdselt.

## Tehniline ülevaade

- `public_html/` – veebileht: kolm HTML-lehte, ühine CSS (`css/uhine.css`) ja iga lehe oma CSS ning JavaScript.
- `public_html/cgi-bin/` – Pythoni backend (ilma raamistiketa): `arvuta.py` arvutab odavaima ostukorvi, `ostunimekiri_fail.py` teeb allalaaditava ostunimekirja, `retseptid.py` saadab retseptid lehele.
- `scraperid/` – Rimi, Selveri ja Maxima hindade scraperid. GitHub Actions käivitab need igal pühapäeval ja uuendab hinnad automaatselt.
- `andmed/` – retseptid, koostisosad, tooted ja hinnad.

Oma arvutis käivitamine: `python3 kaivita_lokaalselt.py` ja ava http://127.0.0.1:8000

## Allikad

- Kood on kirjutatud tehisintellekti Claude (Anthropic) abiga, tiim on koodi läbi vaadanud ja testinud. Viited on ka iga koodifaili alguses.
- Toidufotod: Wikimedia Commons, Pixabay ja Pexels; iga foto autor ja litsents on avalehel jaotises "Fotode autorid". Üks pilt (hakklihakaste) on tiimi tehtud AI-pilt.
- Font: DM Sans (SIL Open Font License).
