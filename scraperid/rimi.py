# RIMI SCRAPER
# Tegi: Jaden Ordašokov
#
# Mida see teeb:
#   1. Loeb failist andmed/tooted/tooted_rimi.json meie valitud Rimi tooted (nimi, link, pakendi suurus).
#   2. Avab iga toote lehe Rimi e-poes ja loeb sealt hinna.
#   3. Salvestab kõik hinnad faili andmed/hinnad/hinnad_rimi.json.
#
# Käivitamine (projekti kaustas):
#   pip3 install requests beautifulsoup4
#   python3 scraperid/rimi.py

import json                       # JSON-failide lugemiseks ja kirjutamiseks
import time                       # ootamiseks päringute vahel
from datetime import datetime     # kellaaja jaoks ("kogutud")
from pathlib import Path          # failide asukohtade jaoks
import requests                   # veebilehe allalaadimiseks
from bs4 import BeautifulSoup     # HTML-ist info leidmiseks

POOD = "Rimi"
ANDMED = Path(__file__).parent.parent / "andmed"            # projekti kaust "andmed"
SISEND = ANDMED / "tooted" / "tooted_rimi.json"             # meie valitud tooted
VÄLJUND = ANDMED / "hinnad" / "hinnad_rimi.json"            # kuhu hinnad salvestada
BRAUSER = {
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
    "Accept-Language": "et-EE,et;q=0.9",
}


def leia_hind(link):
    # link tuleb failist tooted_rimi.json, näiteks
    #   "https://www.rimi.ee/epood/ee/tooted/.../piim-alma-kile-2-5-1l/p/200289"
    # Tagastab hinna eurodes, näiteks 0.75. Kilo järgi müüdava toote puhul on see kilohind.
    # Kui hinda ei leia, tagastab None.
    vastus = requests.get(link, headers=BRAUSER, timeout=20)
    if vastus.status_code != 200:
        print("   Rimi vastas veaga:", vastus.status_code)
        return None
    leht = BeautifulSoup(vastus.text, "html.parser")

    # 1. viis: hind on peidetud sildis <meta itemprop="price" content="0.75">
    silt = leht.find("meta", attrs={"itemprop": "price"})
    if silt is not None:
        hind_tekstina = silt["content"]                 # näiteks "0.75"
        return float(hind_tekstina)

    # 2. viis: loeme lehe teksti. Rimi näitab hinda nii: "0" "75" "€/tk"
    # (eurod ja sendid on eraldi, nende järel ühik "€/tk" või "€/kg").
    sõnad = leht.get_text(" ").split()
    for i in range(2, len(sõnad)):
        sõna = sõnad[i]
        if sõna == "€/tk" or sõna == "€/kg":
            eurod = sõnad[i - 2]                        # näiteks "0"
            sendid = sõnad[i - 1]                       # näiteks "75"
            if eurod.isdigit() and sendid.isdigit():
                hind_tekstina = eurod + "." + sendid    # näiteks "0.75"
                return float(hind_tekstina)

    return None


def main():
    with open(SISEND, "r", encoding="utf-8") as fail:
        tooted = json.load(fail)       # näiteks [{"id": "piim", "nimi": "Piim Alma ...", "link": "...", "kogus": 1000, "kaalukaup": false}, ...]

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
        time.sleep(1)                  # üks päring sekundis, et Rimi lehte mitte koormata

    kogutud = datetime.now().isoformat(timespec="seconds")      # näiteks "2026-11-18T18:30:00"
    tulemus = {"pood": POOD, "kogutud": kogutud, "tooted": leitud}
    VÄLJUND.parent.mkdir(exist_ok=True)                        # teeb kausta "hinnad", kui seda veel pole
    with open(VÄLJUND, "w", encoding="utf-8") as fail:
        json.dump(tulemus, fail, ensure_ascii=False, indent=1)
    print()
    print("Valmis:", len(leitud), "/", len(tooted), "toote hind salvestatud faili", VÄLJUND.name)


main()
