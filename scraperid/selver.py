# SELVERI SCRAPER
# Tegi: NIMI
#
# Mida see teeb:
#   1. Loeb failist andmed/tooted/tooted_selver.json meie valitud Selveri tooted (nimi, link, pakendi suurus).
#   2. Küsib iga toote hinna Selveri e-poe andmebaasist.
#   3. Salvestab kõik hinnad faili andmed/hinnad/hinnad_selver.json.
#
# Miks andmebaasist, mitte lehelt: Selveri tootelehe teeb valmis JavaScript brauseris,
# seega lehe HTML-is hinda polegi. Sama hinna saab aga otse Selveri enda aadressilt,
# mis annab vastuse JSON-ina.
#
# Käivitamine (projekti kaustas):
#   pip3 install requests
#   python3 scraperid/selver.py

import json                       # JSON-failide lugemiseks ja kirjutamiseks
import time                       # ootamiseks päringute vahel
from datetime import datetime     # kellaaja jaoks ("kogutud")
from pathlib import Path          # failide asukohtade jaoks
import requests                   # päringute tegemiseks

POOD = "Selver"
ANDMED = Path(__file__).parent.parent / "andmed"            # projekti kaust "andmed"
SISEND = ANDMED / "tooted" / "tooted_selver.json"           # meie valitud tooted
VÄLJUND = ANDMED / "hinnad" / "hinnad_selver.json"          # kuhu hinnad salvestada
OTSING = "https://www.selver.ee/api/catalog/vue_storefront_catalog_et/product/_search"
BRAUSER = {"User-Agent": "Mozilla/5.0 (kooliprojekt, Tartu Ülikool)"}


def leia_hind(link):
    # link tuleb failist tooted_selver.json, näiteks "https://www.selver.ee/piim-2-5-pure-alma-1-l"
    # Tagastab hinna eurodes, näiteks 1.25. Kilo järgi müüdava toote puhul on see kilohind.
    # Kui hinda ei leia, tagastab None.

    # Lingi viimane osa on toote kood, näiteks "piim-2-5-pure-alma-1-l"
    osad = link.split("/")
    toote_kood = osad[-1]

    aadress = OTSING + "?size=1&q=url_key:" + toote_kood
    vastus = requests.get(aadress, headers=BRAUSER, timeout=20)
    if vastus.status_code != 200:
        print("   Selver vastas veaga:", vastus.status_code)
        return None

    andmed = vastus.json()
    # Vastus näeb välja umbes nii:
    # {"hits": {"hits": [{"_source": {"name": "Piim 2,5% pure, ALMA, 1 L", "final_price_incl_tax": 1.25, ...}}]}}
    leitud = andmed["hits"]["hits"]
    if len(leitud) == 0:
        return None
    toote_andmed = leitud[0]["_source"]
    hind = toote_andmed["final_price_incl_tax"]     # hind koos käibemaksuga, ilma kliendikaardi soodustuseta
    return float(hind)


def main():
    with open(SISEND, "r", encoding="utf-8") as fail:
        tooted = json.load(fail)       # näiteks [{"id": "piim", "nimi": "Piim 2,5% ...", "link": "...", "kogus": 1000, "kaalukaup": false}, ...]

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
        time.sleep(1)                  # üks päring sekundis, et Selveri lehte mitte koormata

    kogutud = datetime.now().isoformat(timespec="seconds")      # näiteks "2026-11-18T18:30:00"
    tulemus = {"pood": POOD, "kogutud": kogutud, "tooted": leitud}
    VÄLJUND.parent.mkdir(exist_ok=True)                        # teeb kausta "hinnad", kui seda veel pole
    with open(VÄLJUND, "w", encoding="utf-8") as fail:
        json.dump(tulemus, fail, ensure_ascii=False, indent=1)
    print()
    print("Valmis:", len(leitud), "/", len(tooted), "toote hind salvestatud faili", VÄLJUND.name)


main()
