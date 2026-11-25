/* UHINE.JS – funktsioonid, mida kasutavad kõik kolm lehte.
   Autor: SoodneKorvi tiim.
   Brauseri funktsioonide kohta on kasutatud MDN Web Docs dokumentatsiooni (https://developer.mozilla.org/). */

// Nädalapäevad ja toidukorrad. "id" on sama, mis retseptid.json failis "toidukord" väärtus.
const PAEVAD = ['Esmaspäev', 'Teisipäev', 'Kolmapäev', 'Neljapäev', 'Reede', 'Laupäev', 'Pühapäev'];
const PAEVAD_LUHIDALT = ['E', 'T', 'K', 'N', 'R', 'L', 'P'];
const TOIDUKORRAD = [
  { id: 'hommik', nimi: 'Hommikusöök', ikoon: 'hommik' },
  { id: 'lõuna', nimi: 'Lõunasöök', ikoon: 'louna' },
  { id: 'õhtu', nimi: 'Õhtusöök', ikoon: 'ohtu' }
];

// Võti, mille all nädalaplaan brauseri mällu (localStorage) salvestatakse.
const PLAANI_VOTI = 'soodnekorv-plaan';

// Loeb salvestatud plaani. Plaan näeb välja näiteks nii:
// { valikud: { "0|hommik": "Kaerahelbepuder marjadega", "2|õhtu": "Plov" }, portsjonid: 2 }
// "0|hommik" tähendab esmaspäeva hommikusööki (0 = esmaspäev, 6 = pühapäev).
function loePlaan() {
  let plaan = { valikud: {}, portsjonid: 2 };
  try {
    const salvestatud = JSON.parse(localStorage.getItem(PLAANI_VOTI));
    if (salvestatud && typeof salvestatud.valikud === 'object') {
      plaan.valikud = salvestatud.valikud;
    }
    if (salvestatud && Number.isInteger(salvestatud.portsjonid)) {
      plaan.portsjonid = salvestatud.portsjonid;
    }
  } catch (viga) {
    // Kui brauser ei luba mälu kasutada, alustame tühja plaaniga.
  }
  return plaan;
}

// Salvestab plaani brauseri mällu.
function salvestaPlaan(plaan) {
  try {
    localStorage.setItem(PLAANI_VOTI, JSON.stringify(plaan));
  } catch (viga) {
    console.warn('Plaani salvestamine ei õnnestunud', viga);
  }
}

// Küsib serverist (Pythoni skriptilt cgi-bin/retseptid.py) kõigi retseptide nimekirja.
async function laeRetseptid() {
  const vastus = await fetch('cgi-bin/retseptid.py');
  if (!vastus.ok) {
    throw new Error('Retseptide laadimine ebaõnnestus (' + vastus.status + ').');
  }
  return vastus.json();
}

// Teeb teksti HTML-is turvaliseks, et retsepti nimes olevad märgid ei rikuks lehte.
function turvaline(tekst) {
  const asendused = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
  return String(tekst).replace(/[&<>"']/g, mark => asendused[mark]);
}

// Tagastab ikooni HTML-i. nimi = ikooni nimi failis img/ikoonid.svg, näiteks "kell".
function ikoon(nimi, klass = '') {
  return `<svg class="ikoon ${klass}" aria-hidden="true"><use href="img/ikoonid.svg#${nimi}"></use></svg>`;
}

// Selle nädala esmaspäev (kellaaeg nullitud).
function selleNadalaEsmaspaev() {
  const tana = new Date();
  const esmaspaev = new Date(tana.getFullYear(), tana.getMonth(), tana.getDate());
  esmaspaev.setDate(esmaspaev.getDate() - ((esmaspaev.getDay() + 6) % 7));
  return esmaspaev;
}

// Nädala vahemik tekstina, näiteks "23.–29. november".
function nadalaVahemik() {
  const algus = selleNadalaEsmaspaev();
  const lopp = new Date(algus);
  lopp.setDate(lopp.getDate() + 6);
  const kuu = kuupaev => kuupaev.toLocaleDateString('et-EE', { month: 'long' });
  if (algus.getMonth() === lopp.getMonth()) {
    return `${algus.getDate()}.–${lopp.getDate()}. ${kuu(lopp)}`;
  }
  return `${algus.getDate()}. ${kuu(algus)} – ${lopp.getDate()}. ${kuu(lopp)}`;
}

// Näitab ekraani allservas lühikest teadet (element id="teavitus").
function teavita(tekst) {
  const kast = document.getElementById('teavitus');
  if (!kast) return;
  kast.textContent = tekst;
  kast.classList.add('naita');
  clearTimeout(teavita.taimer);
  teavita.taimer = setTimeout(() => kast.classList.remove('naita'), 2800);
}

// Veateade, kui leht on avatud otse failina (siis Pythoni server ei tööta).
function serveriViga(viga) {
  if (location.protocol === 'file:') {
    return 'Leht on avatud failina. Retseptid ja hinnad tulevad Pythoni serverist, seega ava leht serveri kaudu (vaata README.md).';
  }
  return 'Andmeid ei õnnestunud laadida. ' + viga.message;
}
