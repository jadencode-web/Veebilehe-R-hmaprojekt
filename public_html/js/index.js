/* INDEX.JS – avalehe JavaScript.
   Näitab, mitu toidukorda on nädalaplaani lisatud, ja koostab fotode autorite nimekirja.
   Autor: SoodneKorvi tiim.
   Allikad: MDN Web Docs – localStorage (https://developer.mozilla.org/en-US/docs/Web/API/Window/localStorage),
   Array.prototype.map (https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/map).
   Kasutab faili uhine.js funktsioone (loePlaan, laeRetseptid, turvaline, nadalaVahemik). */

// 1. Mitu toidukorda 21-st on valitud
function naitaPlaaniSeisu() {
  const plaan = loePlaan();
  const valitud = Object.keys(plaan.valikud).length;          // näiteks 5

  document.getElementById('valitud-arv').textContent = `${valitud} / 21`;
  document.getElementById('edenemine').setAttribute('aria-valuenow', String(valitud));
  document.getElementById('edenemine-joon').style.width = `${(valitud / 21) * 100}%`;
  document.getElementById('nadala-vahemik').textContent = `${nadalaVahemik()} · see nädal`;
}

// 2. Fotode autorid (iga retsepti pildi autor ja litsents tulevad retseptid.json failist)
async function naitaFotodeAutoreid() {
  const loend = document.getElementById('fotode-loend');
  try {
    const retseptid = await laeRetseptid();
    const read = [];
    for (const retsept of retseptid) {
      const pilt = retsept.pilt;
      if (!pilt) continue;
      read.push(`<li>${turvaline(retsept.nimi)}: <a href="${turvaline(pilt.leht)}" target="_blank" rel="noopener">${turvaline(pilt.autor)}</a>, ${turvaline(pilt.litsents)}</li>`);
    }
    loend.innerHTML = read.join('');
  } catch (viga) {
    loend.innerHTML = `<li>${turvaline(serveriViga(viga))}</li>`;
  }
}

naitaPlaaniSeisu();
naitaFotodeAutoreid();
