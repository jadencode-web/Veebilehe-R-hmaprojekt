# MAXIMA SCRAPER
# Tegi: NIMI
#
# Mida see teeb:
#   1. Loeb failist andmed/tooted/tooted_maxima.json meie valitud Maxima tooted (nimi, link, pakendi suurus).
#   2. Avab iga toote lehe Barbora e-poes (Maxima e-pood Eestis) ja loeb sealt hinna.
#   3. Salvestab kõik hinnad faili andmed/hinnad/hinnad_maxima.json.
#
# Käivitamine (projekti kaustas):
#   pip3 install requests beautifulsoup4
#   python3 scraperid/maxima.py

import json                       # JSON-failide lugemiseks ja kirjutamiseks
import time                       # ootamiseks päringute vahel
from datetime import datetime     # kellaaja jaoks ("kogutud")
from pathlib import Path          # failide asukohtade jaoks
import requests                   # veebilehe allalaadimiseks
from bs4 import BeautifulSoup     # HTML-ist info leidmiseks

POOD = "Maxima"
ANDMED = Path(__file__).parent.parent / "andmed"            # projekti kaust "andmed"
SISEND = ANDMED / "tooted" / "tooted_maxima.json"           # meie valitud tooted
VÄLJUND = ANDMED / "hinnad" / "hinnad_maxima.json"          # kuhu hinnad salvestada
BRAUSER = {
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
    "Accept-Language": "et-EE,et;q=0.9",
}


def tee_numbriks(tekst):
    # "1.89€" -> 1.89   ja   "1,89 €" -> 1.89
    puhas = tekst.replace("€", "").replace(",", ".").strip()
    try:
        return float(puhas)
    except ValueError:
        return None


def leia_hind(link):
    # link tuleb failist tooted_maxima.json, näiteks "https://barbora.ee/p/voi-alma-82-proc-200-g"
    # Tagastab hinna eurodes, näiteks 2.49. Kilo järgi müüdava toote puhul on see kilohind.
    # Kui hinda ei leia, tagastab None.
    vastus = requests.get(link, headers=BRAUSER, timeout=20)
    if vastus.status_code != 200:
        print("   Barbora vastas veaga:", vastus.status_code)
        return None
    leht = BeautifulSoup(vastus.text, "html.parser")

    # 1. viis: hind on peidetud sildis <meta itemprop="price" content="2.49">
    silt = leht.find("meta", attrs={"itemprop": "price"})
    if silt is not None:
        return tee_numbriks(silt["content"])

    # 2. viis: loeme lehe teksti. Barbora näitab hinda nii: "2.49€" ja kohe selle järel kilohind "12,45€/kg".
    # Otsime esimese kilo- või liitrihinna (sõnas on "€/") ja võtame sellele eelneva hinna.
    sõnad = leht.get_text(" ").split()
    for i in range(len(sõnad)):
        if "€/" in sõnad[i]:
            # liigume tagasi, kuni leiame sõna, mis lõpeb "€"-ga (näiteks "2.49€")
            j = i - 1
            while j >= 0:
                if sõnad[j].endswith("€"):
                    return tee_numbriks(sõnad[j])
                j = j - 1
            return None

    return None


def main():
    with open(SISEND, "r", encoding="utf-8") as fail:
        tooted = json.load(fail)       # näiteks [{"id": "või", "nimi": "Või ALMA 82%, 200g", "link": "...", "kogus": 200, "kaalukaup": false}, ...]

    leitud = []
    for toode in tooted:
        hind = leia_hind(toode["link"])
        if hind is None:
            time.sleep(3)                          # pood vastas veaga, ootame natuke ja proovime uuesti
            hind = leia_hind(toode["link"])
        if hind is None:
            print("EI LEIDNUD HINDA:", toode["id"], "-", toode["nimi"])
        else:
            print(toode["id"], "-", toode["nimi"], "-", round(hind, 2), "€")
            toode["hind"] = round(hind, 2)        # 1.5899999999999999 -> 1.59
            leitud.append(toode)
        time.sleep(1)                  # üks päring sekundis, et Barbora lehte mitte koormata

    kogutud = datetime.now().isoformat(timespec="seconds")      # näiteks "2026-11-18T18:30:00"
    tulemus = {"pood": POOD, "kogutud": kogutud, "tooted": leitud}
    VÄLJUND.parent.mkdir(exist_ok=True)                        # teeb kausta "hinnad", kui seda veel pole
    with open(VÄLJUND, "w", encoding="utf-8") as fail:
        json.dump(tulemus, fail, ensure_ascii=False, indent=1)
    print()
    print("Valmis:", len(leitud), "/", len(tooted), "toote hind salvestatud faili", VÄLJUND.name)


main()
