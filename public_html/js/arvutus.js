/* ARVUTUS.JS – odavaima ostukorvi arvutus brauseris.
   Autor: SoodneKorvi tiim.
   Kood on kirjutatud tehisintellekti Claude (Anthropic) abiga, tiim on koodi läbi vaadanud ja testinud.
   See on Pythoni faili cgi-bin/arvuta.py ja cgi-bin/ostunimekiri_fail.py JavaScripti versioon.
   Seda kasutatakse siis, kui server Pythoni skripte ei käivita (näiteks kodu.ut.ee). Arvutus on täpselt sama.
   Allikad: MDN Web Docs – fetch (https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API/Using_Fetch),
   Promise.all (https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise/all),
   Math.ceil (https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Math/ceil). */

const POED_FAILID = ['rimi', 'selver', 'maxima'];       // failid andmed/hinnad/hinnad_rimi.json jne
const umarda = arv => Math.round(arv * 100) / 100;      // 12.3456 -> 12.35

// Loeb JSON-faili kaustast andmed/, näiteks loeAndmed('retseptid.json')
async function loeAndmed(fail) {
  const vastus = await fetch('andmed/' + fail);
  if (!vastus.ok) throw new Error('Faili andmed/' + fail + ' ei leitud (' + vastus.status + ').');
  return vastus.json();
}

// Loeb need hinnafailid, mis olemas on, näiteks [{pood: "Rimi", kogutud: "2026-11-18T17:35:00", tooted: [...]}]
async function loeHinnafailid() {
  const hinnafailid = [];
  for (const pood of POED_FAILID) {
    try {
      hinnafailid.push(await loeAndmed('hinnad/hinnad_' + pood + '.json'));
    } catch (viga) {
      // kui mõne poe faili pole, jääb see pood välja (sama nagu Pythonis)
    }
  }
  return hinnafailid;
}

// 1. samm: mitu ühikut igat koostisosa on vaja, näiteks {riis: 200, porgand: 300}
function arvutaVajadus(retseptid, valikud) {
  const vajadus = {};
  for (const valik of valikud) {
    for (const retsept of retseptid) {
      if (retsept.nimi !== valik.nimi) continue;
      for (const osa of retsept.koostisosad) {
        const kogus = osa.kogus_portsjonile * valik.portsjonid;   // näiteks 100 g * 2 = 200 g
        vajadus[osa.id] = (vajadus[osa.id] || 0) + kogus;
      }
    }
  }
  return vajadus;
}

// 2. samm: selle poe toode, näiteks {id: "hakkliha", nimi: "Hakkliha 500g", kogus: 500, hind: 3.85}, või null
function leiaToode(hinnafail, koostisosaId) {
  return hinnafail.tooted.find(toode => toode.id === koostisosaId) || null;
}

// Mitu pakki osta ja mis maksab, näiteks {pakke: 2, ostetud: 1000, hind: 7.70}
function arvutaOst(toode, vaja) {
  if (toode.kaalukaup) {
    // kilo järgi: ostad täpselt nii palju kui vaja, hind on kilohind
    return { pakke: 0, ostetud: vaja, hind: vaja / toode.kogus * toode.hind };
  }
  const pakke = Math.ceil(vaja / toode.kogus);               // 1.2 pakki -> 2 pakki
  return { pakke, ostetud: pakke * toode.kogus, hind: pakke * toode.hind };
}

// 3. samm: ostukorv valitud poodides, iga koostisosa sealt, kus see on odavam
function arvutaOstukorv(poodideValik, vajadus, koostisosad) {
  const info = {};
  for (const k of koostisosad) info[k.id] = k;
  const read = [];
  const puudu = [];
  let kokku = 0;

  for (const koostisosaId of Object.keys(vajadus)) {
    const vaja = vajadus[koostisosaId];
    let parim = null;
    for (const hinnafail of poodideValik) {
      const toode = leiaToode(hinnafail, koostisosaId);
      if (!toode) continue;                                  // selles poes seda pole
      const ost = arvutaOst(toode, vaja);
      if (!parim || ost.hind < parim.hind) {
        parim = {
          id: koostisosaId,
          koostisosa: info[koostisosaId].nimi,
          ühik: info[koostisosaId].ühik,
          pood: hinnafail.pood,
          toode: toode.nimi,
          link: toode.link || '',
          pakendi_kogus: toode.kogus,
          kaalukaup: toode.kaalukaup,
          pakke: ost.pakke,
          vaja,
          ostetud: ost.ostetud,
          jääb_üle: ost.ostetud - vaja,
          hind: ost.hind
        };
      }
    }
    if (!parim) {
      puudu.push(koostisosaId);
    } else {
      parim.hind = umarda(parim.hind);
      kokku += parim.hind;
      read.push(parim);
    }
  }

  const poed = [];
  for (const rida of read) if (!poed.includes(rida.pood)) poed.push(rida.pood);
  return { poed, kokku: umarda(kokku), read, puudu };
}

// Kas ostukorv "uus" on parem kui "vana": vähem puudu, sama puudu korral odavam
function onParem(uus, vana) {
  if (!vana) return true;
  if (uus.puudu.length < vana.puudu.length) return true;
  return uus.puudu.length === vana.puudu.length && uus.kokku < vana.kokku;
}

// Sama mis arvuta.py funktsioon võrdle_poode: proovib kõiki poode ja poepaare
async function vordlePoodeBrauseris(valikud) {
  const [retseptid, koostisosad, hinnafailid] = await Promise.all([
    loeAndmed('retseptid.json'), loeAndmed('koostisosad.json'), loeHinnafailid()
  ]);
  if (hinnafailid.length === 0) throw new Error('Hinnafaile ei leitud');
  const vajadus = arvutaVajadus(retseptid, valikud);

  const kuupaevad = hinnafailid.map(fail => fail.kogutud.slice(0, 10)).sort();
  const hinnadSeisuga = kuupaevad[0] || '';

  const poodideValikud = hinnafailid.map(fail => [fail]);
  for (let i = 0; i < hinnafailid.length; i++) {
    for (let j = i + 1; j < hinnafailid.length; j++) poodideValikud.push([hinnafailid[i], hinnafailid[j]]);
  }

  const variandid = [];
  let parimUks = null;
  let parimKaks = null;
  for (const poodideValik of poodideValikud) {
    const ostukorv = arvutaOstukorv(poodideValik, vajadus, koostisosad);
    ostukorv.võrreldud_poed = poodideValik.map(fail => fail.pood);
    ostukorv.täielik = ostukorv.puudu.length === 0;
    ostukorv.hinnad_seisuga = hinnadSeisuga;
    variandid.push(ostukorv);
    if (poodideValik.length === 1 && onParem(ostukorv, parimUks)) parimUks = ostukorv;
    if (onParem(ostukorv, parimKaks)) parimKaks = ostukorv;
  }

  const vajalikud = koostisosad
    .filter(k => k.id in vajadus)
    .map(k => ({ id: k.id, nimi: k.nimi, kogus: umarda(vajadus[k.id]), ühik: k.ühik }));
  const nimed = retseptid.map(retsept => retsept.nimi);

  return {
    uks_pood: parimUks,
    kaks_poodi: parimKaks,
    variandid,
    koostisosad: vajalikud,
    hinnad: hinnafailid.map(fail => ({ pood: fail.pood, kogutud: fail.kogutud, tooteid: fail.tooted.length })),
    tundmatud_retseptid: valikud.filter(valik => !nimed.includes(valik.nimi)).map(valik => valik.nimi)
  };
}

// ---------- Allalaaditav ostunimekiri (sama mis ostunimekiri_fail.py) ----------

const failiRaha = summa => summa.toFixed(2).replace('.', ',') + ' €';                 // 9.5 -> "9,50 €"
const failiKogus = (vaartus, uhik) =>
  (Number.isInteger(vaartus) ? String(vaartus) : vaartus.toFixed(1).replace('.', ',')) + ' ' + uhik;

function failiRida(rida, number) {
  const mitu = rida.kaalukaup
    ? 'kaalu järgi ' + failiKogus(rida.ostetud, rida.ühik)
    : rida.pakke + ' × ' + failiKogus(rida.pakendi_kogus, rida.ühik);
  const nimi = rida.koostisosa.charAt(0).toUpperCase() + rida.koostisosa.slice(1);
  return `<li class="r${number}"><label class="rida" for="k${number}"><span class="kast" aria-hidden="true"></span>` +
    `<span class="tekst"><b>${turvaline(nimi)}</b><small>${turvaline(rida.toode)}</small></span>` +
    `<span class="paremal"><b>${failiRaha(rida.hind)}</b><small>${turvaline(mitu)}</small></span></label></li>`;
}

// Teeb allalaaditava HTML-faili sisu. paring = sama objekt, mis saadetaks ostunimekiri_fail.py-le
async function teeFailBrauseris(paring, tulemus) {
  const korv = paring.poode === 2 ? tulemus.kaks_poodi : tulemus.uks_pood;
  const vastus = await fetch('andmed/ostunimekiri_mall.html');
  if (!vastus.ok) throw new Error('Faili andmed/ostunimekiri_mall.html ei leitud.');
  let mall = await vastus.text();

  let poedHtml = '';
  let number = 1;
  for (const pood of korv.poed) {
    const poeRead = korv.read.filter(rida => rida.pood === pood)
      .sort((a, b) => a.koostisosa.toLowerCase() < b.koostisosa.toLowerCase() ? -1 : 1);
    const summa = poeRead.reduce((kokku, rida) => kokku + rida.hind, 0);
    poedHtml += `<section class="pood"><h2><span>${turvaline(pood)}</span><span class="poe-summa">${failiRaha(summa)}</span></h2><ul>`;
    for (const rida of poeRead) poedHtml += failiRida(rida, number++);
    poedHtml += '</ul></section>';
  }

  // linnukesed ja nende CSS (töötab ka telefoni failieelvaates, kus JavaScripti pole)
  const ridu = korv.read.length;
  let linnukesed = '';
  let tukid = '';
  let stiilid = '';
  let koikMargitud = '';
  for (let i = 1; i <= ridu; i++) {
    const m = `#k${i}:checked ~ `;
    linnukesed += `<input class="linnuke" type="checkbox" id="k${i}" data-rida="${i}">`;
    tukid += `<i class="t${i}"></i>`;
    stiilid += `${m}#nimekiri .r${i} .kast { background: #2f6a47; border-color: #2f6a47; }\n` +
      `${m}#nimekiri .r${i} .kast::after { opacity: 1; }\n` +
      `${m}#nimekiri .r${i} .tekst, ${m}#nimekiri .r${i} .paremal { opacity: .45; }\n` +
      `${m}#nimekiri .r${i} .tekst b { text-decoration: line-through; }\n` +
      `${m}#peida:checked ~ #nimekiri .r${i} { display: none; }\n` +
      `${m}.riba .t${i} { order: -1; background: #2f6a47; }\n` +
      `#k${i}:focus-visible ~ #nimekiri .r${i} .kast { outline: 3px solid #c6e27a; outline-offset: 2px; }\n`;
    koikMargitud += m;
  }
  stiilid += koikMargitud + '.valmis { display: block; }\n';

  let puudu = '';
  if (korv.puudu.length) {
    const nimed = korv.puudu.map(id => {
      const osa = tulemus.koostisosad.find(k => k.id === id);
      return osa ? `${osa.nimi} (${failiKogus(osa.kogus, osa.ühik)})` : id;
    });
    puudu = `<p class="puudu"><b>Ei leitud poodidest:</b> ${turvaline(nimed.join(', '))}. Need ei ole summas.</p>`;
  }

  let menuu = '';
  if (paring.menuu.length) {
    let eelmine = '';
    for (const rida of paring.menuu) {
      if (rida.paev !== eelmine) { menuu += `<li class="paev">${turvaline(rida.paev)}</li>`; eelmine = rida.paev; }
      menuu += `<li><span>${turvaline(rida.toidukord)}</span>${turvaline(rida.nimi)}</li>`;
    }
    menuu = `<details class="menuu"><summary>Selle nädala menüü</summary><ul>${menuu}</ul></details>`;
  }

  const seisuga = korv.hinnad_seisuga ? korv.hinnad_seisuga.split('-').reverse().join('.') : 'teadmata';
  const asendused = {
    '{{NADAL}}': turvaline(paring.nadal),
    '{{PORTSJONID}}': turvaline(paring.portsjonid),
    '{{POED}}': turvaline(korv.poed.join(' + ')),
    '{{KOKKU}}': failiRaha(korv.kokku),
    '{{RIDU}}': String(ridu),
    '{{POODIDE_NIMEKIRI}}': poedHtml,
    '{{PUUDU}}': puudu,
    '{{MENUU}}': menuu,
    '{{SEISUGA}}': seisuga,
    '{{VOTI}}': 'soodnekorv-fail-' + Date.now(),
    '{{LINNUKESED}}': linnukesed,
    '{{TUKID}}': tukid,
    '/*{{STIILID}}*/': stiilid
  };
  for (const mark of Object.keys(asendused)) mall = mall.split(mark).join(asendused[mark]);
  return new Blob([mall], { type: 'text/html;charset=utf-8' });
}
