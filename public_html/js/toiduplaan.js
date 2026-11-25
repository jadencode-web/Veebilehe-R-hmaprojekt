/* TOIDUPLAAN.JS – nädalaplaani lehe JavaScript.
   Joonistab kalendri (7 päeva x 3 toidukorda), laseb retsepte otsida, sorteerida, lisada ja eemaldada.
   Valikud salvestatakse brauserisse (vt uhine.js loePlaan ja salvestaPlaan).
   Autor: SoodneKorvi tiim.
   Allikad: MDN Web Docs – sündmuste delegeerimine (https://developer.mozilla.org/en-US/docs/Learn_web_development/Core/Scripting/Event_bubbling),
   Element.closest (https://developer.mozilla.org/en-US/docs/Web/API/Element/closest),
   Array.prototype.filter (https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/filter).
   Kasutab faili uhine.js konstante ja funktsioone. */

// Sorteerimise nupud. "kontroll" on funktsioon, mis ütleb, kas retsept sobib selle nupuga.
const FILTRID = [
  { nimi: 'Kõik', kontroll: () => true },
  { nimi: 'Hommik', kontroll: r => r.toidukord === 'hommik' },
  { nimi: 'Lõuna', kontroll: r => r.toidukord === 'lõuna' },
  { nimi: 'Õhtu', kontroll: r => r.toidukord === 'õhtu' },
  { nimi: 'Taimetoit', kontroll: r => r.tüübid.includes('taimetoit') || r.tüübid.includes('vegan') },
  { nimi: 'Kala', kontroll: r => r.tüübid.includes('kala') },
  { nimi: 'Supp', kontroll: r => r.tüübid.includes('supp') },
  { nimi: 'Kiire', kontroll: r => r.aeg_min <= 30 }
];

// Lehe olek: kõik retseptid serverist, salvestatud plaan, valitud lahter, aktiivne filter ja otsingusõna.
const olek = {
  retseptid: [],                 // täidetakse serverist, näiteks [{nimi: "Plov", toidukord: "õhtu", ...}]
  plaan: loePlaan(),             // näiteks {valikud: {"0|hommik": "Kaerahelbepuder marjadega"}, portsjonid: 2}
  valitudLahter: null,           // näiteks {paev: 0, toidukord: "hommik"}
  filter: 'Kõik',
  otsing: ''
};

const kalender = document.getElementById('kalender');
const retseptideLoend = document.getElementById('retseptid');
const rakendus = document.getElementById('rakendus');

// Leiab retsepti nime järgi.
function leiaRetsept(nimi) {
  return olek.retseptid.find(retsept => retsept.nimi === nimi);
}

// Pildi HTML. Kui retseptil pilti pole, jääb hall kast.
function pildiHtml(retsept) {
  if (!retsept.pilt) return '<span class="pilt-puudub"></span>';
  return `<img src="${turvaline(retsept.pilt.url)}" alt="${turvaline(retsept.nimi)}" loading="lazy">`;
}

// ---------- Kalender ----------
function joonistaKalender() {
  const esmaspaev = selleNadalaEsmaspaev();
  const tana = new Date();
  let html = '<div aria-hidden="true"></div>';

  // ülemine rida: päevad
  for (let paev = 0; paev < 7; paev++) {
    const kuupaev = new Date(esmaspaev);
    kuupaev.setDate(kuupaev.getDate() + paev);
    const onTana = kuupaev.toDateString() === tana.toDateString();
    const kuu = kuupaev.toLocaleDateString('et-EE', { month: 'short' });
    html += `<div class="paev-pais${onTana ? ' tana' : ''}"><strong>${PAEVAD_LUHIDALT[paev]}</strong><small>${kuupaev.getDate()}. ${kuu}</small></div>`;
  }

  // iga toidukorra rida
  for (const toidukord of TOIDUKORRAD) {
    html += `<div class="rea-pealkiri">${ikoon(toidukord.ikoon)}<strong>${toidukord.nimi}</strong></div>`;
    for (let paev = 0; paev < 7; paev++) {
      const voti = `${paev}|${toidukord.id}`;                  // näiteks "0|hommik"
      const retsept = leiaRetsept(olek.plaan.valikud[voti]);
      if (!retsept) {
        html += `<div><button class="lisa-kaart" type="button" data-paev="${paev}" data-toidukord="${toidukord.id}" aria-label="Lisa ${PAEVAD[paev]} ${toidukord.nimi.toLowerCase()}">
          <span class="pluss-ring">${ikoon('pluss', 'ikoon-vaike')}</span>Lisa retsept</button></div>`;
      } else {
        html += `<div><article class="toidukaart">
          ${pildiHtml(retsept)}
          <button class="eemalda" type="button" data-eemalda="${voti}" aria-label="Eemalda ${turvaline(retsept.nimi)}">${ikoon('rist')}</button>
          <div class="kaardi-sisu">
            <p class="roog" title="${turvaline(retsept.nimi)}">${turvaline(retsept.nimi)}</p>
            <div class="kaardi-alumine">
              <span class="aeg">${ikoon('kell')}${retsept.aeg_min} min</span>
              <button class="muuda" type="button" data-paev="${paev}" data-toidukord="${toidukord.id}">Muuda</button>
            </div>
          </div>
        </article></div>`;
      }
    }
  }
  kalender.innerHTML = html;
  uuendaKokkuvotet();
}

// Valitud toidukordade arv ja kokkamise aeg kokku.
function uuendaKokkuvotet() {
  let arv = 0;
  let minuteid = 0;
  for (const nimi of Object.values(olek.plaan.valikud)) {
    const retsept = leiaRetsept(nimi);
    if (retsept) {
      arv++;
      minuteid += retsept.aeg_min;
    }
  }
  document.getElementById('valitud-arv').textContent = `${arv} / 21`;
  const tunnid = Math.floor(minuteid / 60);
  document.getElementById('kokkamise-aeg').textContent = tunnid > 0 ? `${tunnid} h ${minuteid % 60} min` : `${minuteid} min`;
}

// ---------- Retseptide paneel ----------
function joonistaFiltrid() {
  document.getElementById('filtrid').innerHTML = FILTRID.map(filter =>
    `<button type="button" data-filter="${filter.nimi}" class="${olek.filter === filter.nimi ? 'valitud' : ''}" aria-pressed="${olek.filter === filter.nimi}">${filter.nimi}</button>`
  ).join('');
}

function joonistaRetseptid() {
  const filter = FILTRID.find(f => f.nimi === olek.filter);
  const otsing = olek.otsing.toLocaleLowerCase('et-EE');
  const sobivad = olek.retseptid.filter(retsept =>
    filter.kontroll(retsept) && retsept.nimi.toLocaleLowerCase('et-EE').includes(otsing));

  document.getElementById('tulemuste-arv').textContent = `${sobivad.length} retsepti`;
  if (sobivad.length === 0) {
    retseptideLoend.innerHTML = '<p class="retsepte-pole">Selliseid retsepte ei leitud. Proovi teist otsingut või filtrit.</p>';
    return;
  }
  retseptideLoend.innerHTML = sobivad.map(retsept => `
    <div class="retseptirida">
      ${pildiHtml(retsept)}
      <button type="button" class="retsepti-nupp" data-retsept="${turvaline(retsept.nimi)}">
        <strong>${turvaline(retsept.nimi)}</strong>
        <small>${ikoon('kell')}${retsept.aeg_min} min · ${retsept.toidukord}</small>
      </button>
      <button type="button" class="lisa-nupp" data-retsept="${turvaline(retsept.nimi)}" aria-label="Lisa ${turvaline(retsept.nimi)}">${ikoon('pluss')}</button>
    </div>`).join('');
}

// Avab paneeli. Kui päev ja toidukord on antud, lisatakse retsept sinna lahtrisse.
function avaPaneel(paev = null, toidukord = null) {
  const koht = document.getElementById('valitud-koht');
  if (paev !== null) {
    olek.valitudLahter = { paev, toidukord };
    const nimi = TOIDUKORRAD.find(t => t.id === toidukord).nimi;
    koht.textContent = `${PAEVAD[paev]} · ${nimi}`;
    koht.classList.add('aktiivne');
    olek.filter = toidukord === 'hommik' ? 'Hommik' : toidukord === 'lõuna' ? 'Lõuna' : 'Õhtu';
  } else {
    olek.valitudLahter = null;
    koht.textContent = 'Vali kalendris päev ja toidukord';
    koht.classList.remove('aktiivne');
    olek.filter = 'Kõik';
  }
  olek.otsing = '';
  document.getElementById('otsing').value = '';
  joonistaFiltrid();
  joonistaRetseptid();
  rakendus.classList.add('paneel-avatud');
}

function suluePaneel() {
  rakendus.classList.remove('paneel-avatud');
}

// Lisab retsepti valitud lahtrisse.
function valiRetsept(nimi) {
  if (!olek.valitudLahter) {
    teavita('Vali kõigepealt kalendris päev ja toidukord.');
    return;
  }
  const { paev, toidukord } = olek.valitudLahter;
  olek.plaan.valikud[`${paev}|${toidukord}`] = nimi;
  salvestaPlaan(olek.plaan);
  joonistaKalender();
  suluePaneel();
  teavita(`${PAEVAD[paev]}: ${nimi} lisatud`);
}

// ---------- Sündmused (klikid ja trükkimine) ----------
kalender.addEventListener('click', sundmus => {
  const eemalda = sundmus.target.closest('[data-eemalda]');
  if (eemalda) {
    delete olek.plaan.valikud[eemalda.dataset.eemalda];
    salvestaPlaan(olek.plaan);
    joonistaKalender();
    teavita('Retsept eemaldatud');
    return;
  }
  const lahter = sundmus.target.closest('[data-paev]');
  if (lahter) avaPaneel(Number(lahter.dataset.paev), lahter.dataset.toidukord);
});

retseptideLoend.addEventListener('click', sundmus => {
  const nupp = sundmus.target.closest('[data-retsept]');
  if (nupp) valiRetsept(nupp.dataset.retsept);
});

document.getElementById('filtrid').addEventListener('click', sundmus => {
  const nupp = sundmus.target.closest('[data-filter]');
  if (!nupp) return;
  olek.filter = nupp.dataset.filter;
  joonistaFiltrid();
  joonistaRetseptid();
});

document.getElementById('otsing').addEventListener('input', sundmus => {
  olek.otsing = sundmus.target.value.trim();
  joonistaRetseptid();
});

document.getElementById('sirvi-retsepte').addEventListener('click', () => avaPaneel());
document.getElementById('sulge-paneel').addEventListener('click', suluePaneel);
document.getElementById('paneeli-taust').addEventListener('click', suluePaneel);
document.addEventListener('keydown', sundmus => {
  if (sundmus.key === 'Escape') suluePaneel();
});

document.getElementById('koosta-nimekiri').addEventListener('click', () => {
  if (Object.keys(olek.plaan.valikud).length === 0) {
    teavita('Lisa nädalaplaani vähemalt üks retsept.');
    return;
  }
  location.href = 'ostunimekiri.html';
});

// ---------- Käivitamine ----------
async function kaivita() {
  document.getElementById('nadala-vahemik').textContent = nadalaVahemik();
  try {
    olek.retseptid = await laeRetseptid();
  } catch (viga) {
    const teade = document.getElementById('laadimisviga');
    teade.textContent = serveriViga(viga);
    teade.hidden = false;
    document.getElementById('tulemuste-arv').textContent = '';
  }
  joonistaKalender();
  joonistaFiltrid();
  joonistaRetseptid();
}

kaivita();
