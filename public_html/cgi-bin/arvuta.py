#!/usr/bin/env python3
# ARVUTA.PY  (Pythoni backend, töötab serveris)
# Tegi: SoodneKorvi tiim
# Kood on kirjutatud tehisintellekti Claude (Anthropic) abiga, tiim on koodi läbi vaadanud ja testinud.
#
# Veebileht saadab siia kasutaja valitud retseptid ja portsjonid (POST, JSON).
# See skript arvutab odavaima ostukorvi ja saadab tulemuse JSON-ina tagasi.
# Serveris peab failil olema käivitusõigus: chmod 755 arvuta.py
# Mida see teeb:
#   Kasutaja on valinud retseptid ja portsjonid, näiteks "Plov 2 portsjonit" ja "Kalasupp 3 portsjonit".
#   1. Liidame kokku, mitu grammi / ml / tk igat koostisosa on vaja.
#   2. Arvutame iga poe kohta, mitu pakki tuleb osta ja palju see maksab.
#   3. Proovime läbi kõik poed üksi ja (kui kasutaja lubab) kõik poepaarid ning valime odavaima.
#   4. Tulemus on ostunimekiri: mida osta, kust, mitu pakki, mis hind ja palju üle jääb.
#
# Mida see loeb (kõik kaustast andmed/):
#   retseptid.json            50 retsepti, kogused ühe portsjoni kohta
#   koostisosad.json          koostisosade nimed ja ühikud
#   hinnad/hinnad_rimi.json   scraperite tulemused (sama kujuga ka selver ja maxima)
#
# Proovimine terminalis (projekti kaustas):
#   python3 public_html/cgi-bin/arvuta.py
# Siis arvutab programm allpool olevate näidisvalikute jaoks ostunimekirja ja trükib selle ekraanile.

import os                         # CGI: päringu pikkus (CONTENT_LENGTH) ja meetod (REQUEST_METHOD)
import sys                        # CGI: päringu sisu lugemine (sys.stdin)
import json                       # JSON-failide lugemiseks
import math                       # math.ceil ümardab üles: 1.2 -> 2 (pooli pakke osta ei saa)
from pathlib import Path          # failide asukohtade jaoks

SIIN = Path(__file__).resolve().parent                    # kaust public_html/cgi-bin


def leia_andmed():
    # Otsib kausta "andmed" kolmest kohast, sest serveris võib see olla pandud eri kohta:
    # 1) kodukaustas (~/andmed), 2) public_html sees (~/public_html/andmed), 3) cgi-bin sees.
    kohad = [SIIN.parent.parent / "andmed", SIIN.parent / "andmed", SIIN / "andmed"]
    for koht in kohad:
        if (koht / "retseptid.json").exists():
            return koht
    return kohad[0]


ANDMED = leia_andmed()                                    # näiteks /home/reevo/andmed
POED = ["rimi", "selver", "maxima"]                 # hinnafailide nimed: hinnad_rimi.json jne


# ---------- Failide lugemine ----------

def loe_json(fail):
    # fail on näiteks ANDMED / "retseptid.json"
    with open(fail, "r", encoding="utf-8") as f:
        sisu = json.load(f)
    return sisu


def loe_hinnafailid():
    # Loeb need hinnafailid, mis olemas on (kui mõni scraper pole veel käinud, jääb see pood välja).
    # Tagastab listi, näiteks [{"pood": "Rimi", "kogutud": "2026-11-18T17:35:00", "tooted": [...]}, ...]
    hinnafailid = []
    for pood in POED:
        fail = ANDMED / "hinnad" / ("hinnad_" + pood + ".json")
        if fail.exists():
            hinnafailid.append(loe_json(fail))
    return hinnafailid


# ---------- 1. samm: mida on vaja ----------

def arvuta_vajadus(retseptid, valikud):
    # retseptid = retseptid.json sisu
    # valikud = kasutaja valik, näiteks [{"nimi": "Plov", "portsjonid": 2}, {"nimi": "Kalasupp", "portsjonid": 3}]
    # Tagastab, mitu ühikut igat koostisosa on vaja, näiteks {"riis": 200, "porgand": 300, "sibul": 150}
    vajadus = {}
    for valik in valikud:
        for retsept in retseptid:
            if retsept["nimi"] != valik["nimi"]:
                continue
            for osa in retsept["koostisosad"]:
                koostisosa_id = osa["id"]                                   # näiteks "riis"
                kogus = osa["kogus_portsjonile"] * valik["portsjonid"]     # näiteks 100 g * 2 = 200 g
                vana_kogus = vajadus.get(koostisosa_id, 0)                 # kui palju oli enne, alguses 0
                vajadus[koostisosa_id] = vana_kogus + kogus
    return vajadus


# ---------- 2. samm: mis see ühes poes maksab ----------

def leia_toode(hinnafail, koostisosa_id):
    # hinnafail = ühe poe hinnafaili sisu, näiteks hinnad_rimi.json
    # koostisosa_id = näiteks "hakkliha"
    # Tagastab selle poe toote, näiteks {"id": "hakkliha", "nimi": "Kodune hakkliha M&M 500g", "kogus": 500, "hind": 3.85, ...}
    # Kui seda koostisosa selles poes pole, tagastab None.
    for toode in hinnafail["tooted"]:
        if toode["id"] == koostisosa_id:
            return toode
    return None


def arvuta_ost(toode, vaja):
    # toode = leia_toode() tulemus, näiteks {"nimi": "Hakkliha 500g", "kogus": 500, "hind": 3.85, "kaalukaup": false}
    # vaja = mitu ühikut on vaja, näiteks 600 (grammi)
    # Tagastab, mida osta, näiteks {"pakke": 2, "ostetud": 1000, "hind": 7.70}

    if toode["kaalukaup"]:
        # Kilo järgi: ostad täpselt nii palju kui vaja. Hind on kilohind, kogus on 1000 g.
        # Näiteks 600 g kartulit, kilohind 0.43 € -> 600 / 1000 * 0.43 = 0.26 €
        hind = vaja / toode["kogus"] * toode["hind"]
        return {"pakke": 0, "ostetud": vaja, "hind": hind}

    # Pakis: ümardame pakkide arvu üles. Näiteks 600 g / 500 g pakk = 1.2 -> 2 pakki
    pakke = math.ceil(vaja / toode["kogus"])
    ostetud = pakke * toode["kogus"]              # näiteks 2 * 500 = 1000 g
    hind = pakke * toode["hind"]                  # näiteks 2 * 3.85 = 7.70 €
    return {"pakke": pakke, "ostetud": ostetud, "hind": hind}


# ---------- 3. samm: milline pood või poepaar on odavaim ----------

def arvuta_ostukorv(poodide_valik, vajadus, koostisosad):
    # poodide_valik = üks või kaks hinnafaili, näiteks [hinnad_rimi, hinnad_maxima]
    # vajadus = arvuta_vajadus() tulemus, näiteks {"riis": 200, "porgand": 300}
    # koostisosad = koostisosad.json sisu
    # Iga koostisosa ostame sellest poest (valikust), kus see on odavam.
    # Tagastab näiteks {"poed": ["Rimi"], "kokku": 12.34, "read": [...], "puudu": ["kõrvits"]}

    # koostisosade nimed ja ühikud, näiteks {"riis": {"id": "riis", "nimi": "riis", "ühik": "g"}}
    koostisosa_info = {}
    for k in koostisosad:
        koostisosa_info[k["id"]] = k

    read = []           # ostunimekirja read
    puudu = []          # koostisosad, mida üheski valitud poes pole
    kokku = 0           # kogu hind

    for koostisosa_id in vajadus:
        vaja = vajadus[koostisosa_id]
        parim_rida = None

        for hinnafail in poodide_valik:
            toode = leia_toode(hinnafail, koostisosa_id)
            if toode is None:
                continue                                    # selles poes seda pole
            ost = arvuta_ost(toode, vaja)
            if parim_rida is None or ost["hind"] < parim_rida["hind"]:
                parim_rida = {
                    "id": koostisosa_id,
                    "koostisosa": koostisosa_info[koostisosa_id]["nimi"],
                    "ühik": koostisosa_info[koostisosa_id]["ühik"],
                    "pood": hinnafail["pood"],
                    "toode": toode["nimi"],
                    "link": toode.get("link", ""),
                    "pakendi_kogus": toode["kogus"],
                    "kaalukaup": toode["kaalukaup"],
                    "pakke": ost["pakke"],
                    "vaja": vaja,
                    "ostetud": ost["ostetud"],
                    "jääb_üle": ost["ostetud"] - vaja,
                    "hind": ost["hind"],
                }

        if parim_rida is None:
            puudu.append(koostisosa_id)
        else:
            parim_rida["hind"] = round(parim_rida["hind"], 2)
            kokku = kokku + parim_rida["hind"]
            read.append(parim_rida)

    # millistes poodides tegelikult käia tuleb
    kasutatud_poed = []
    for rida in read:
        if rida["pood"] not in kasutatud_poed:
            kasutatud_poed.append(rida["pood"])

    return {"poed": kasutatud_poed, "kokku": round(kokku, 2), "read": read, "puudu": puudu}


def on_parem(uus, vana):
    # Kas ostukorv "uus" on parem kui "vana"?
    # Parem on see, kus vähem asju puudu. Kui puudu on sama palju, siis odavam.
    if vana is None:
        return True
    if len(uus["puudu"]) < len(vana["puudu"]):
        return True
    if len(uus["puudu"]) == len(vana["puudu"]) and uus["kokku"] < vana["kokku"]:
        return True
    return False


def leia_odavaim(valikud, max_poode):
    # valikud = kasutaja valik, näiteks [{"nimi": "Plov", "portsjonid": 2}]
    # max_poode = 1 (kõik ühest poest) või 2 (võib minna kahte poodi)
    # Tagastab odavaima ostukorvi (vaata arvuta_ostukorv) ja lisaks "hinnad_seisuga".
    retseptid = loe_json(ANDMED / "retseptid.json")
    koostisosad = loe_json(ANDMED / "koostisosad.json")
    hinnafailid = loe_hinnafailid()

    vajadus = arvuta_vajadus(retseptid, valikud)

    # retseptid, mille nime ei leitud (näiteks trükiviga "Plovv")
    retseptide_nimed = []
    for retsept in retseptid:
        retseptide_nimed.append(retsept["nimi"])
    tundmatud = []
    for valik in valikud:
        if valik["nimi"] not in retseptide_nimed:
            tundmatud.append(valik["nimi"])

    # kõik võimalused, kuhu poodi minna: iga pood üksi ...
    poodide_valikud = []
    for hinnafail in hinnafailid:
        poodide_valikud.append([hinnafail])
    # ... ja kui lubatud, siis ka iga poepaar (Rimi+Selver, Rimi+Maxima, Selver+Maxima)
    if max_poode >= 2:
        for i in range(len(hinnafailid)):
            for j in range(i + 1, len(hinnafailid)):
                poodide_valikud.append([hinnafailid[i], hinnafailid[j]])

    parim = None
    for poodide_valik in poodide_valikud:
        ostukorv = arvuta_ostukorv(poodide_valik, vajadus, koostisosad)
        if on_parem(ostukorv, parim):
            parim = ostukorv

    # kõige vanem hindade kogumise kuupäev, et lehel näidata "Hinnad seisuga 18.11.2026"
    kuupäevad = []
    for hinnafail in hinnafailid:
        kuupäevad.append(hinnafail["kogutud"][:10])     # "2026-11-18T17:35:00" -> "2026-11-18"
    kuupäevad.sort()
    if parim is not None and len(kuupäevad) > 0:
        aasta, kuu, päev = kuupäevad[0].split("-")
        parim["hinnad_seisuga"] = päev + "." + kuu + "." + aasta     # "18.11.2026"

    if parim is not None:
        parim["tundmatud_retseptid"] = tundmatud
    return parim


def võrdle_poode(valikud):
    # Seda funktsiooni kasutab veebileht (ostunimekiri.html).
    # valikud = kasutaja valik, näiteks [{"nimi": "Plov", "portsjonid": 2}]
    # Arvutab läbi kõik poed üksi ja kõik poepaarid ning tagastab kõik variandid,
    # et leht saaks näidata nii "kõik ühest poest" kui ka "kuni kaks poodi" tulemust.
    retseptid = loe_json(ANDMED / "retseptid.json")
    koostisosad = loe_json(ANDMED / "koostisosad.json")
    hinnafailid = loe_hinnafailid()
    vajadus = arvuta_vajadus(retseptid, valikud)

    # hindade kogumise kuupäev, näiteks "2026-11-18"
    kuupäevad = []
    for hinnafail in hinnafailid:
        kuupäevad.append(hinnafail["kogutud"][:10])
    kuupäevad.sort()
    hinnad_seisuga = ""
    if len(kuupäevad) > 0:
        hinnad_seisuga = kuupäevad[0]

    variandid = []           # kõik proovitud poevalikud
    parim_üks = None         # odavaim ühe poe ostukorv
    parim_kaks = None        # odavaim ostukorv, kui võib minna kuni kahte poodi

    poodide_valikud = []
    for hinnafail in hinnafailid:
        poodide_valikud.append([hinnafail])
    for i in range(len(hinnafailid)):
        for j in range(i + 1, len(hinnafailid)):
            poodide_valikud.append([hinnafailid[i], hinnafailid[j]])

    for poodide_valik in poodide_valikud:
        ostukorv = arvuta_ostukorv(poodide_valik, vajadus, koostisosad)
        võrreldud_poed = []
        for hinnafail in poodide_valik:
            võrreldud_poed.append(hinnafail["pood"])
        ostukorv["võrreldud_poed"] = võrreldud_poed          # näiteks ["Rimi", "Maxima"]
        ostukorv["täielik"] = len(ostukorv["puudu"]) == 0      # True, kui kõik leiti
        ostukorv["hinnad_seisuga"] = hinnad_seisuga
        variandid.append(ostukorv)
        if len(poodide_valik) == 1 and on_parem(ostukorv, parim_üks):
            parim_üks = ostukorv
        if on_parem(ostukorv, parim_kaks):
            parim_kaks = ostukorv

    # vajalikud koostisosad koos nime ja ühikuga, näiteks {"id": "riis", "nimi": "riis", "kogus": 200, "ühik": "g"}
    vajalikud = []
    for k in koostisosad:
        if k["id"] in vajadus:
            vajalikud.append({"id": k["id"], "nimi": k["nimi"], "kogus": round(vajadus[k["id"]], 2), "ühik": k["ühik"]})

    # iga poe hinnainfo, näiteks {"pood": "Rimi", "kogutud": "2026-11-18T17:55:00", "tooteid": 61}
    hinnad = []
    for hinnafail in hinnafailid:
        hinnad.append({"pood": hinnafail["pood"], "kogutud": hinnafail["kogutud"], "tooteid": len(hinnafail["tooted"])})

    # retseptid, mille nime ei leitud
    retseptide_nimed = []
    for retsept in retseptid:
        retseptide_nimed.append(retsept["nimi"])
    tundmatud = []
    for valik in valikud:
        if valik["nimi"] not in retseptide_nimed:
            tundmatud.append(valik["nimi"])

    return {"uks_pood": parim_üks, "kaks_poodi": parim_kaks, "variandid": variandid,
            "koostisosad": vajalikud, "hinnad": hinnad, "tundmatud_retseptid": tundmatud}


# ---------- Proovimine terminalis ----------

def trüki_ostunimekiri(tulemus):
    # tulemus = leia_odavaim() tulemus
    print()
    if len(tulemus["tundmatud_retseptid"]) > 0:
        print("HOIATUS, neid retsepte ei leitud (kontrolli nime):", ", ".join(tulemus["tundmatud_retseptid"]))
    print("ODAVAIM OSTUKORV:", " + ".join(tulemus["poed"]), "-", tulemus["kokku"], "€")
    print("Hinnad seisuga", tulemus.get("hinnad_seisuga", "?"))
    for pood in tulemus["poed"]:
        print()
        print(pood.upper())
        for rida in tulemus["read"]:
            if rida["pood"] != pood:
                continue
            if rida["kaalukaup"]:
                kogus_tekstina = str(round(rida["vaja"])) + " " + rida["ühik"]           # "600 g"
            else:
                kogus_tekstina = str(rida["pakke"]) + " pakk(i)"                          # "2 pakk(i)"
            üle = ""
            if rida["jääb_üle"] > 0:
                üle = "  (jääb üle " + str(round(rida["jääb_üle"])) + " " + rida["ühik"] + ")"
            print("  ", rida["toode"], "-", kogus_tekstina, "-", rida["hind"], "€" + üle)
    if len(tulemus["puudu"]) > 0:
        print()
        print("Ei leidnud üheski poes:", ", ".join(tulemus["puudu"]))


def vasta(andmed):
    # Saadab JSON-vastuse brauserile. CGI-s läheb kõik, mis prinditakse, otse brauserisse.
    # andmed = näiteks leia_odavaim() tulemus või {"viga": "..."}
    # Saadame UTF-8 baitidena, et täpitähed (õ, ä, ö, ü) töötaksid igas serveris.
    tekst = "Content-Type: application/json; charset=utf-8\r\n\r\n" + json.dumps(andmed, ensure_ascii=False)
    sys.stdout.buffer.write(tekst.encode("utf-8"))


def vasta_päringule():
    # Veebileht saadab POST-päringuga näiteks:
    # {"valikud": [{"nimi": "Plov", "portsjonid": 2}]}
    try:
        pikkus = int(os.environ.get("CONTENT_LENGTH", 0))         # mitu baiti päringus on
        päring = sys.stdin.buffer.read(pikkus).decode("utf-8")     # päringu sisu tekstina
        sisend = json.loads(päring)                                # tekst -> Pythoni sõnastik
        valikud = sisend["valikud"]
        if len(loe_hinnafailid()) == 0:
            vasta({"viga": "Hinnafaile ei leitud"})
            return
        tulemus = võrdle_poode(valikud)
        vasta(tulemus)
    except Exception as viga:
        vasta({"viga": str(viga)})


def proovi_terminalis():
    # näidisvalik, et saaks arvutust terminalis proovida
    näidis = [
        {"nimi": "Kaerahelbepuder marjadega", "portsjonid": 2},
        {"nimi": "Hernesupp suitsulihaga", "portsjonid": 2},
        {"nimi": "Spagetid bolognese", "portsjonid": 3},
        {"nimi": "Plov", "portsjonid": 2},
    ]
    print("Ainult ühes poes:")
    trüki_ostunimekiri(leia_odavaim(näidis, 1))
    print()
    print("------------------------------")
    print("Kuni kahes poes:")
    trüki_ostunimekiri(leia_odavaim(näidis, 2))


if __name__ == "__main__":
    # Kui server käivitab faili (veebilehe päring), on olemas REQUEST_METHOD.
    # Kui käivitad ise terminalis (python3 arvuta.py), siis seda pole ja tehakse näidisarvutus.
    if "REQUEST_METHOD" in os.environ:
        vasta_päringule()
    else:
        proovi_terminalis()
