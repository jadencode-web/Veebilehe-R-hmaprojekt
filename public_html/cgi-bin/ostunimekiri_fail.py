#!/usr/bin/env python3
# OSTUNIMEKIRI_FAIL.PY  (Pythoni backend, töötab serveris)
# Tegi: SoodneKorvi tiim
# Kood on kirjutatud tehisintellekti Claude (Anthropic) abiga, tiim on koodi läbi vaadanud ja testinud.
#
# Teeb ostunimekirjast ühe HTML-faili, mille saab telefoni alla laadida.
# Fail töötab ilma internetita: avad selle telefonis ja saad poes tooteid linnukesega märkida.
# Serveris peab failil olema käivitusõigus: chmod 755 ostunimekiri_fail.py
#
# Veebileht (ostunimekiri.js) saadab siia POST-päringuga näiteks:
#   {"valikud": [{"nimi": "Plov", "portsjonid": 2}],
#    "poode": 1,
#    "nadal": "23.–29. november",
#    "portsjonid": 2,
#    "menuu": [{"paev": "Esmaspäev", "toidukord": "Hommikusöök", "nimi": "Plov"}]}
# Odavaima ostukorvi arvutab sama kausta arvuta.py (funktsioon võrdle_poode).
#
# Proovimine terminalis (projekti kaustas):
#   python3 public_html/cgi-bin/ostunimekiri_fail.py > proov.html
# Siis tekib näidisvalikuga fail proov.html, mille saab brauseris avada.

import os                         # CGI: päringu pikkus ja meetod
import sys                        # CGI: päringu sisu lugemine
import json                       # JSON-i lugemiseks
import html                       # html.escape teeb teksti HTML-is ohutuks: "<" -> "&lt;"
from datetime import datetime     # failinime ja salvestusvõtme jaoks
import arvuta                     # sama kausta arvuta.py (odavaima ostukorvi arvutus)


# ---------- Abifunktsioonid ----------

def raha(summa):
    # summa = näiteks 9.5  ->  "9,50 €"
    tekst = f"{summa:.2f}".replace(".", ",")
    return tekst + " €"


def kogus(väärtus, ühik):
    # väärtus = näiteks 1500.0, ühik = "g"  ->  "1500 g"
    if väärtus == int(väärtus):
        arv = str(int(väärtus))
    else:
        arv = f"{väärtus:.1f}".replace(".", ",")
    return arv + " " + ühik


def kuupäev(tekst):
    # tekst = näiteks "2026-11-18"  ->  "18.11.2026"
    if len(tekst) < 10:
        return "teadmata"
    aasta = tekst[0:4]
    kuu = tekst[5:7]
    päev = tekst[8:10]
    return päev + "." + kuu + "." + aasta


def e(tekst):
    # lühike nimi html.escape jaoks, et HTML-i koostamine oleks loetavam
    return html.escape(str(tekst))


# ---------- HTML-i osad ----------

def osturida_html(rida, number):
    # number = rea järjekorranumber kogu nimekirjas, näiteks 1 (vaja linnukese id jaoks: "k1")
    # rida = üks rida arvuta.py ostukorvist, näiteks
    # {"id": "riis", "koostisosa": "riis", "toode": "Riis RIMI 1kg", "pakke": 1, "hind": 1.29, ...}
    if rida["kaalukaup"]:
        mitu = "kaalu järgi " + kogus(rida["ostetud"], rida["ühik"])
    else:
        mitu = str(rida["pakke"]) + " × " + kogus(rida["pakendi_kogus"], rida["ühik"])
    nimi = rida["koostisosa"][:1].upper() + rida["koostisosa"][1:]      # "riis" -> "Riis"
    return (
        f'<li class="r{number}"><label class="rida" for="k{number}">'
        '<span class="kast" aria-hidden="true"></span>'
        f'<span class="tekst"><b>{e(nimi)}</b><small>{e(rida["toode"])}</small></span>'
        f'<span class="paremal"><b>{raha(rida["hind"])}</b><small>{e(mitu)}</small></span>'
        '</label></li>'
    )


def poe_html(pood, read, esimene_number):
    # pood = näiteks "Maxima", read = selle poe read ostukorvist
    # esimene_number = mitmenda reana selle poe esimene rida kogu nimekirjas on, näiteks 1
    read_järjekorras = sorted(read, key=lambda rida: rida["koostisosa"].lower())    # tähestiku järgi
    summa = 0
    for rida in read_järjekorras:
        summa = summa + rida["hind"]
    read_html = ""
    number = esimene_number
    for rida in read_järjekorras:
        read_html = read_html + osturida_html(rida, number)
        number = number + 1
    return (
        '<section class="pood">'
        f'<h2><span>{e(pood)}</span><span class="poe-summa">{raha(summa)}</span></h2>'
        f'<ul>{read_html}</ul>'
        '</section>'
    )


def menüü_html(menüü):
    # menüü = näiteks [{"paev": "Esmaspäev", "toidukord": "Hommikusöök", "nimi": "Plov"}]
    if len(menüü) == 0:
        return ""
    read_html = ""
    eelmine_päev = ""
    for rida in menüü:
        if rida["paev"] != eelmine_päev:
            read_html = read_html + f'<li class="paev">{e(rida["paev"])}</li>'
            eelmine_päev = rida["paev"]
        read_html = read_html + f'<li><span>{e(rida["toidukord"])}</span>{e(rida["nimi"])}</li>'
    return f'<details class="menuu"><summary>Selle nädala menüü</summary><ul>{read_html}</ul></details>'


def puudu_html(korv, koostisosad):
    # korv["puudu"] = koostisosad, mida valitud poodidest ei leitud, näiteks ["kõrvits"]
    if len(korv["puudu"]) == 0:
        return ""
    nimed = []
    for koostisosa_id in korv["puudu"]:
        for osa in koostisosad:
            if osa["id"] == koostisosa_id:
                nimed.append(osa["nimi"] + " (" + kogus(osa["kogus"], osa["ühik"]) + ")")
    return '<p class="puudu"><b>Ei leitud poodidest:</b> ' + e(", ".join(nimed)) + '. Need ei ole summas.</p>'


def tee_fail(sisend, tulemus):
    # sisend = brauseri päring (vt faili algust), tulemus = arvuta.võrdle_poode() vastus
    if sisend.get("poode") == 2:
        korv = tulemus["kaks_poodi"]
    else:
        korv = tulemus["uks_pood"]

    poed_html = ""
    number = 1
    for pood in korv["poed"]:
        poe_read = []
        for rida in korv["read"]:
            if rida["pood"] == pood:
                poe_read.append(rida)
        poed_html = poed_html + poe_html(pood, poe_read, number)
        number = number + len(poe_read)

    # Linnukesed ja nende kujundus. Kõik linnukesed (k1, k2, ...) on faili alguses ja CSS märgib
    # nende järgi õiged read, edenemisriba ja peitmise. JavaScripti pole vaja,
    # sest telefoni failieelvaade (näiteks iPhone'i Files) ei käivita JavaScripti.
    ridu = len(korv["read"])
    linnukesed = ""
    tükid = ""
    stiilid = ""
    kõik_märgitud = ""
    for i in range(1, ridu + 1):
        linnukesed = linnukesed + f'<input class="linnuke" type="checkbox" id="k{i}" data-rida="{i}">'
        tükid = tükid + f'<i class="t{i}"></i>'
        märgitud = f"#k{i}:checked ~ "
        stiilid = stiilid + (
            f"{märgitud}#nimekiri .r{i} .kast {{ background: #2f6a47; border-color: #2f6a47; }}\n"
            f"{märgitud}#nimekiri .r{i} .kast::after {{ opacity: 1; }}\n"
            f"{märgitud}#nimekiri .r{i} .tekst, {märgitud}#nimekiri .r{i} .paremal {{ opacity: .45; }}\n"
            f"{märgitud}#nimekiri .r{i} .tekst b {{ text-decoration: line-through; }}\n"
            f"{märgitud}#peida:checked ~ #nimekiri .r{i} {{ display: none; }}\n"
            f"{märgitud}.riba .t{i} {{ order: -1; background: #2f6a47; }}\n"
            f"#k{i}:focus-visible ~ #nimekiri .r{i} .kast {{ outline: 3px solid #c6e27a; outline-offset: 2px; }}\n"
        )
        kõik_märgitud = kõik_märgitud + märgitud
    stiilid = stiilid + kõik_märgitud + ".valmis { display: block; }\n"     # kõik ostetud -> näita teadet

    nädal = sisend.get("nadal", "")
    portsjonid = sisend.get("portsjonid", 2)
    poed_tekst = " + ".join(korv["poed"])
    võti = "soodnekorv-fail-" + datetime.now().strftime("%Y%m%d%H%M%S")   # iga fail jätab linnukesed meelde eraldi

    with open(arvuta.ANDMED / "ostunimekiri_mall.html", encoding="utf-8") as f:     # faili kujundus (andmed/ kaustas)
        mall = f.read()

    asendused = {
        "{{NADAL}}": e(nädal),
        "{{PORTSJONID}}": e(portsjonid),
        "{{POED}}": e(poed_tekst),
        "{{KOKKU}}": raha(korv["kokku"]),
        "{{RIDU}}": str(ridu),
        "{{POODIDE_NIMEKIRI}}": poed_html,
        "{{PUUDU}}": puudu_html(korv, tulemus["koostisosad"]),
        "{{MENUU}}": menüü_html(sisend.get("menuu", [])),
        "{{SEISUGA}}": kuupäev(korv["hinnad_seisuga"]),
        "{{VOTI}}": võti,
        "{{LINNUKESED}}": linnukesed,
        "{{TUKID}}": tükid,
        "{{STIILID}}": stiilid,
    }
    for märk in asendused:
        mall = mall.replace(märk, asendused[märk])
    return mall


# ---------- CGI ----------

def vasta_päringule():
    try:
        pikkus = int(os.environ.get("CONTENT_LENGTH", 0))         # mitu baiti päringus on
        päring = sys.stdin.buffer.read(pikkus).decode("utf-8")     # päringu sisu tekstina
        sisend = json.loads(päring)                                # tekst -> Pythoni sõnastik
        if len(arvuta.loe_hinnafailid()) == 0:
            raise ValueError("Hinnafaile ei leitud")
        tulemus = arvuta.võrdle_poode(sisend["valikud"])
        fail = tee_fail(sisend, tulemus)
        päis = "Content-Type: text/html; charset=utf-8\r\n"
        päis = päis + 'Content-Disposition: attachment; filename="soodnekorv-ostunimekiri.html"\r\n\r\n'
        sys.stdout.buffer.write(päis.encode("utf-8"))
        sys.stdout.buffer.write(fail.encode("utf-8"))
    except Exception as viga:
        tekst = "Status: 500 Internal Server Error\r\nContent-Type: text/plain; charset=utf-8\r\n\r\nViga: " + str(viga)
        sys.stdout.buffer.write(tekst.encode("utf-8"))


def proovi_terminalis():
    näidis = {
        "valikud": [{"nimi": "Kaerahelbepuder marjadega", "portsjonid": 2},
                    {"nimi": "Hernesupp suitsulihaga", "portsjonid": 2},
                    {"nimi": "Plov", "portsjonid": 2}],
        "poode": 1,
        "nadal": "23.–29. november",
        "portsjonid": 2,
        "menuu": [{"paev": "Esmaspäev", "toidukord": "Hommikusöök", "nimi": "Kaerahelbepuder marjadega"},
                  {"paev": "Esmaspäev", "toidukord": "Lõunasöök", "nimi": "Hernesupp suitsulihaga"},
                  {"paev": "Teisipäev", "toidukord": "Õhtusöök", "nimi": "Plov"}],
    }
    tulemus = arvuta.võrdle_poode(näidis["valikud"])
    sys.stdout.buffer.write(tee_fail(näidis, tulemus).encode("utf-8"))


if os.environ.get("REQUEST_METHOD") == "POST":
    vasta_päringule()
else:
    proovi_terminalis()
