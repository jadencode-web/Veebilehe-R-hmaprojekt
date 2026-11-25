/* OSTUNIMEKIRI.JS – ostunimekirja lehe JavaScript.
   Saadab nädalaplaani retseptid serverisse (Pythoni skript cgi-bin/arvuta.py), mis arvutab
   iga poe ja poepaari hinna. Leht näitab soodsaimat ostukorvi, ostunimekirja ja poodide võrdlust.
   Autor: SoodneKorvi tiim.
   Kood on kirjutatud tehisintellekti Claude (Anthropic) abiga, tiim on koodi läbi vaadanud ja testinud.
   Allikad: MDN Web Docs – fetch (https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API/Using_Fetch),
   Intl.NumberFormat (https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl/NumberFormat),
   Blob ja URL.createObjectURL (https://developer.mozilla.org/en-US/docs/Web/API/URL/createObjectURL_static).
   Kasutab faili uhine.js konstante ja funktsioone ning faili arvutus.js, kui server Pythonit ei käivita. */

const plaan = loePlaan();                      // näiteks {valikud: {"0|hommik": "Plov"}, portsjonid: 2}
let tulemus = null;                            // serveri vastus, vt arvuta.py funktsioon võrdle_poode
const ostetud = new Set();                     // linnukesega märgitud koostisosad, näiteks {"riis", "sibul"}

const vali = id => document.getElementById(id);
const raha = summa => new Intl.NumberFormat('et-EE', { style: 'currency', currency: 'EUR' }).format(summa);
const arv = new Intl.NumberFormat('et-EE', { maximumFractionDigits: 1 });
const kogus = (vaartus, uhik) => `${arv.format(vaartus)} ${uhik}`;            // näiteks "1500 g"
const kuupaev = tekst => tekst ? new Date(tekst.slice(0, 10) + 'T12:00:00').toLocaleDateString('et-EE') : 'teadmata';

// Valitud toidukorrad päevade kaupa, näiteks [{paev: 0, toidukord: "hommik", nimi: "Plov"}]
function valitudToidukorrad() {
  const read = [];
  for (let paev = 0; paev < 7; paev++) {
    for (const toidukord of TOIDUKORRAD) {
      const nimi = plaan.valikud[`${paev}|${toidukord.id}`];
      if (nimi) read.push({ paev, toidukord, nimi });
    }
  }
  return read;
}

// Parem veerg: valitud toidukorrad päevade kaupa
function joonistaMenuu(toidukorrad) {
  let html = '';
  for (let paev = 0; paev < 7; paev++) {
    const selleNadalaPaev = toidukorrad.filter(rida => rida.paev === paev);
    if (selleNadalaPaev.length === 0) continue;
    const read = selleNadalaPaev.map(rida => `<li><span>${rida.toidukord.nimi}</span>${turvaline(rida.nimi)}</li>`).join('');
    html += `<section class="menuu-paev"><h3>${PAEVAD[paev]}</h3><ul>${read}</ul></section>`;
  }
  vali('menuu').innerHTML = html;
  vali('menuu-kaart').hidden = false;
}

// Valitud ostukorv: kas "kõik ühest poest" või "kuni kaks poodi"
function aktiivneKorv() {
  if (!tulemus) return null;
  return vali('poode').value === '1' ? tulemus.uks_pood : tulemus.kaks_poodi;
}

// Toote nimi lingina poe lehele (kui link on olemas)
function tooteLink(rida) {
  if (rida.link && rida.link.startsWith('https://')) {
    return `<a href="${turvaline(rida.link)}" target="_blank" rel="noopener">${turvaline(rida.toode)}${ikoon('nool-valja')}</a>`;
  }
  return turvaline(rida.toode);
}

// Näitab arvutuse tulemust lehel
function joonistaKorv() {
  const korv = aktiivneKorv();
  if (!korv) return;

  // soovitus ja koguhind
  vali('soovitatud-poed').textContent = korv.poed.length ? korv.poed.join(' + ') : 'Tooteid ei leitud';
  vali('koguhind').textContent = raha(korv.kokku);
  vali('hinna-selgitus').textContent = korv.täielik ? 'kogu ostunimekiri' : 'leitud toodete summa';
  vali('hinnad-seisuga').textContent = `Hinnad seisuga ${kuupaev(korv.hinnad_seisuga)}`;
  const uks = tulemus.uks_pood;
  const kaks = tulemus.kaks_poodi;
  if (vali('poode').value === '2' && kaks.poed.length > 1 && uks.kokku > kaks.kokku) {
    vali('saast').textContent = `Kahes poes käies säästad ${raha(uks.kokku - kaks.kokku)} võrreldes soodsaima ühe poega.`;
  } else if (vali('poode').value === '2') {
    vali('saast').textContent = 'Kahte poodi minna ei tasu: ühes poes on sama soodne.';
  } else {
    vali('saast').textContent = 'Kogu ostunimekiri ühest poest.';
  }
  vali('soovitus').hidden = false;

  // ostunimekiri poodide kaupa
  let html = '';
  for (const pood of korv.poed) {
    const poeRead = korv.read.filter(rida => rida.pood === pood)
      .sort((a, b) => a.koostisosa.localeCompare(b.koostisosa, 'et'));      // tähestiku järjekorras
    let poeSumma = 0;
    for (const rida of poeRead) poeSumma += rida.hind;
    html += `<h3 class="poe-pealkiri">${ikoon('pood')}${turvaline(pood)}<span>${raha(poeSumma)}</span></h3><ul class="ostuloend">`;
    for (const rida of poeRead) {
      const mida = rida.kaalukaup
        ? `Kaalu järgi ${kogus(rida.ostetud, rida.ühik)}`
        : `${rida.pakke} × ${kogus(rida.pakendi_kogus, rida.ühik)}`;
      const ule = rida.jääb_üle > 0 ? ` · üle jääb ${kogus(rida.jääb_üle, rida.ühik)}` : '';
      html += `<li class="osturida"><label>
          <input type="checkbox" data-id="${turvaline(rida.id)}" ${ostetud.has(rida.id) ? 'checked' : ''}>
          <span class="osturea-nimi">${turvaline(rida.koostisosa)}<small>Vaja ${kogus(rida.vaja, rida.ühik)}</small></span>
          <strong>${raha(rida.hind)}</strong>
        </label>
        <p class="osturea-detail">${tooteLink(rida)}<br>${mida}${ule}</p></li>`;
    }
    html += '</ul>';
  }
  vali('nimekiri').innerHTML = html;
  uuendaMargitud();

  // koostisosad, mida üheski poes ei leitud
  const puudu = vali('puudu');
  if (korv.täielik) {
    puudu.hidden = true;
  } else {
    const nimed = korv.puudu.map(id => {
      const osa = tulemus.koostisosad.find(k => k.id === id);
      return osa ? `${osa.nimi} (${kogus(osa.kogus, osa.ühik)})` : id;
    });
    puudu.textContent = `Neid ei leitud valitud poodidest ja need ei ole summas: ${nimed.join(', ')}.`;
    puudu.hidden = false;
  }

  // poodide võrdlus, odavaim enne
  const variandid = [...tulemus.variandid].sort((a, b) => a.puudu.length - b.puudu.length || a.kokku - b.kokku);
  vali('poevariandid').innerHTML = variandid.map(variant => {
    const onParim = variant.võrreldud_poed.join('+') === korv.võrreldud_poed.join('+');
    const markus = variant.täielik ? 'kõik tooted olemas' : `${variant.puudu.length} toodet puudu`;
    return `<li class="poevariant${onParim ? ' parim' : ''}"><span>${turvaline(variant.võrreldud_poed.join(' + '))}<small>${markus}</small></span><strong>${raha(variant.kokku)}</strong></li>`;
  }).join('');
  vali('vordlus').hidden = false;

  vali('laadi-alla').disabled = false;
  vali('prindi').disabled = false;
}

function uuendaMargitud() {
  const koik = vali('nimekiri').querySelectorAll('input').length;
  const margitud = vali('nimekiri').querySelectorAll('input:checked').length;
  vali('margitud').textContent = `${margitud} / ${koik}`;
}

// Saadab valiku serverisse ja ootab tulemust
async function arvuta() {
  const toidukorrad = valitudToidukorrad();
  const valikud = toidukorrad.map(rida => ({ nimi: rida.nimi, portsjonid: plaan.portsjonid }));
  const teade = vali('olekuteade');

  tulemus = null;
  vali('soovitus').hidden = true;
  vali('vordlus').hidden = true;
  vali('puudu').hidden = true;
  vali('nimekiri').innerHTML = '';
  vali('laadi-alla').disabled = true;
  vali('prindi').disabled = true;
  vali('proovi-uuesti').hidden = true;
  teade.className = 'olekuteade';
  teade.textContent = 'Arvutan ostukorvi…';
  teade.hidden = false;

  try {
    let andmed = null;
    try {
      // 1) Pythoni backend (cgi-bin/arvuta.py)
      const vastus = await fetch('cgi-bin/arvuta.py', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ valikud })
      });
      if (onJson(vastus)) andmed = await vastus.json();
    } catch (viga) {
      // Pythoni skript ei vastanud
    }
    // 2) Kui server Pythonit ei käivita, arvutame sama asja brauseris (js/arvutus.js)
    if (!andmed) andmed = await vordlePoodeBrauseris(valikud);
    if (andmed.viga) throw new Error(andmed.viga);
    tulemus = andmed;
    teade.hidden = true;
    joonistaKorv();
  } catch (viga) {
    teade.className = 'teade';
    teade.textContent = 'Hinnavõrdlust ei õnnestunud arvutada. ' + serveriViga(viga);
    vali('proovi-uuesti').hidden = false;
  }
}

// Laeb ostunimekirja alla HTML-failina, mille teeb server (cgi-bin/ostunimekiri_fail.py).
// Fail töötab telefonis ka ilma internetita ja seal saab tooteid linnukesega märkida.
async function laadiAlla() {
  const nupp = vali('laadi-alla');
  const toidukorrad = valitudToidukorrad();
  const paring = {
    valikud: toidukorrad.map(rida => ({ nimi: rida.nimi, portsjonid: plaan.portsjonid })),
    poode: Number(vali('poode').value),                       // 1 = kõik ühest poest, 2 = kuni kaks poodi
    nadal: nadalaVahemik(),                                    // näiteks "23.–29. november"
    portsjonid: plaan.portsjonid,
    menuu: toidukorrad.map(rida => ({ paev: PAEVAD[rida.paev], toidukord: rida.toidukord.nimi, nimi: rida.nimi }))
  };
  nupp.disabled = true;
  try {
    let fail = null;
    try {
      // 1) Pythoni backend (cgi-bin/ostunimekiri_fail.py)
      const vastus = await fetch('cgi-bin/ostunimekiri_fail.py', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(paring)
      });
      if (vastus.ok && (vastus.headers.get('Content-Type') || '').includes('text/html')) fail = await vastus.blob();
    } catch (viga) {
      // Pythoni skript ei vastanud
    }
    // 2) Kui server Pythonit ei käivita, teeme faili brauseris (js/arvutus.js)
    if (!fail) fail = await teeFailBrauseris(paring, tulemus);
    const aadress = URL.createObjectURL(fail);
    const link = document.createElement('a');
    link.href = aadress;
    const esmaspaev = selleNadalaEsmaspaev();                   // failinimesse nädala alguskuupäev, näiteks 23-11
    link.download = `soodnekorv-ostunimekiri-${esmaspaev.getDate()}-${esmaspaev.getMonth() + 1}.html`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(aadress), 2000);
    teavita('Ostunimekiri laaditi alla. Ava fail telefonis, see töötab ka ilma internetita.');
  } catch (viga) {
    teavita('Faili ei õnnestunud teha. ' + serveriViga(viga));
  } finally {
    nupp.disabled = false;
  }
}

// ---------- Sündmused ----------
vali('poode').addEventListener('change', joonistaKorv);
vali('proovi-uuesti').addEventListener('click', arvuta);
vali('prindi').addEventListener('click', () => window.print());
vali('laadi-alla').addEventListener('click', laadiAlla);
vali('portsjonid').addEventListener('change', () => {
  const portsjonid = Number(vali('portsjonid').value);
  if (!Number.isInteger(portsjonid) || portsjonid < 1 || portsjonid > 20) {
    vali('portsjonid').reportValidity();
    return;
  }
  plaan.portsjonid = portsjonid;
  salvestaPlaan(plaan);
  arvuta();
});
vali('nimekiri').addEventListener('change', sundmus => {
  const kast = sundmus.target;
  if (kast.checked) ostetud.add(kast.dataset.id);
  else ostetud.delete(kast.dataset.id);
  uuendaMargitud();
});

// ---------- Käivitamine ----------
function kaivita() {
  const toidukorrad = valitudToidukorrad();
  vali('nadala-vahemik').textContent = nadalaVahemik();
  vali('toidukordi').textContent = toidukorrad.length;
  vali('portsjonid').value = plaan.portsjonid;

  if (toidukorrad.length === 0) {
    vali('tyhi').hidden = false;
    vali('nimekirja-juhis').hidden = true;
    vali('valikud').hidden = true;
    return;
  }
  joonistaMenuu(toidukorrad);
  arvuta();
}

kaivita();
