async function startApp() {
 const response = await fetch('/api/andmed');
 if (!response.ok) throw new Error('Retseptide laadimine ebaõnnestus.');
 const data = await response.json();
 const RETSEPTID = data.retseptid.map((recipe, index) => ({...recipe, id: 'U' + String(index + 1).padStart(3, '0'), tyybid: recipe.tüübid}));
 const OLD_NAMES = {"R001":"Kaerahelbepuder õuna ja kaneeliga","R002":"Mannapuder marjamoosiga","R003":"Tatrapuder praetud sibulaga","R004":"Munapuder tomati ja murulauguga","R005":"Rukkileivad muna ja kiluga","R006":"Kohupiim marjade ja kaerahelvestega","R007":"Pannkoogid koduse moosiga","R008":"Omlett seente ja juustuga","R009":"Rukkileib kodujuustu ja kurgiga","R010":"Hirsihelbepuder pirniga","R011":"Ahjuõunad kohupiimatäidisega","R012":"Kartuli-munapanniroog","R013":"Kanasupp nuudlitega","R014":"Frikadellisupp","R015":"Läätsesupp köögiviljadega","R016":"Peedisupp hapukoorega","R017":"Kõrvitsapüreesupp seemnetega","R018":"Hernesupp suitsulihaga","R019":"Kalasupp kartuli ja tilliga","R020":"Seenesupp odrakruupidega","R021":"Kartuli-kapsahautis hakklihaga","R022":"Tatraroog seente ja porgandiga","R023":"Köögivilja-riisipann","R024":"Makaronisalat singi ja hernestega","R025":"Kartulisalat munaga","R026":"Mulgipuder suitsusingiga","R027":"Ahjupeedi ja kitsejuustu salat","R028":"Oa-köögiviljahautis","R029":"Kanasalat õuna ja kapsaga","R030":"Rukkileivad suitsukala ja kodujuustuga","R031":"Kodused kotletid kartulipudruga","R032":"Ahjukana kartuli ja porgandiga","R033":"Lõhe ahjukartuli ja tillikastmega","R034":"Ahjutursk juurviljadega","R035":"Hakklihakaste keedukartuliga","R036":"Seapraad hapukapsa ja kartuliga","R037":"Mulgikapsad sealihaga","R038":"Pasta hakkliha-tomatikastmega","R039":"Kana-koorepasta seentega","R040":"Köögivilja-lasanje","R041":"Kikerherne-kartulikarri","R042":"Täidetud paprikad riisi ja hakklihaga","R043":"Seene-odrakruubirisoto","R044":"Ahjupannkook singi ja juustuga","R045":"Kapsarullid hakklihaga","R046":"Praetud räim kartuli ja kurgisalatiga","R047":"Kartuli-lillkapsavorm","R048":"Kana-nuudliwok kapsaga","R049":"Ahjuköögiviljad ubade ja ürdikastmega","R050":"Kodujuustu-kartulipannkoogid"};
const PADEVAD = ['Esmaspäev','Teisipäev','Kolmapäev','Neljapäev','Reede','Laupäev','Pühapäev'];
const LYHID = ['E','T','K','N','R','L','P'];
const TOIDUD = [{id:'hommik',nimi:'Hommikusöök',ikoon:'☀'},{id:'lõuna',nimi:'Lõunasöök',ikoon:'♨'},{id:'õhtu',nimi:'Õhtusöök',ikoon:'♧'}];
const FOTOD = {
 hommik: ['photo-1517673400267-0251440c45dc','photo-1525351484163-7529414344d8','photo-1488477181946-6428a0291777'],
 lõuna: ['photo-1547592180-85f173990554','photo-1512621776951-a57141f2eefd','photo-1473093295043-cdd812d0e601'],
 õhtu: ['photo-1467003909585-2f8a72700288','photo-1512058564366-18510be2db19','photo-1604908176997-125f25cc6f3d']
};
const KEY = 'toiduplaneerija-nadalaplaan-v2';
const $ = (s, root=document) => root.querySelector(s);
const DOM = {
 calendar:$('#kalender'), list:$('#retseptid-loend'), filters:$('#filtrid'), input:$('#retsepti-otsing'),
 count:$('#valitud-arv'), time:$('#kokkamise-aeg'), range:$('#nadalavahemik'), week:$('#nadalalabel'),
 selected:$('#valitud-koht'), resultCount:$('#tulemuste-arv'), app:$('.rakendus'), toast:$('#teavitus')
};
const today = new Date();
const monday = new Date(today.getFullYear(),today.getMonth(),today.getDate());
monday.setDate(monday.getDate()-(monday.getDay()+6)%7);
function dateKey(d){return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`}
function addDays(date, days){const d = new Date(date);d.setDate(d.getDate()+days);return d}
function weekStart(d){const a=new Date(d.getFullYear(),d.getMonth(),d.getDate());a.setDate(a.getDate()-(a.getDay()+6)%7);return a}
let storage={};
try {storage=JSON.parse(localStorage.getItem(KEY)||'{}')||{}}catch(e){storage={}}
// Varasema versiooni IDd seotakse retsepti nimega, et teistsugune retsept ei satuks vanasse lahtrisse.
if (!localStorage.getItem(KEY)) {
 let old = {};
 try {old = JSON.parse(localStorage.getItem('toiduplaneerija-nadalaplaan-v1') || '{}') || {}} catch {}
 storage = {week: old.week, plans: {}};
 for (const [slot, id] of Object.entries(old.plans || {})) {
  const recipe = RETSEPTID.find(r => r.nimi === OLD_NAMES[id]);
  if (recipe) storage.plans[slot] = recipe.id;
 }
}
const requestedWeek = new URLSearchParams(location.search).get('nadal');
const requestedPortions = Number(new URLSearchParams(location.search).get('portsjonid'));
const activeWeek = [requestedWeek, storage.week].find(isWeekKey) ?? dateKey(monday);
const state = {
 week: activeWeek,
 plans: storage.plans&&typeof storage.plans==='object'?storage.plans:{},
 portions: Number.isInteger(requestedPortions) && requestedPortions >= 1 && requestedPortions <= 100 ? requestedPortions : Number.isInteger(storage.portions) && storage.portions >= 1 && storage.portions <= 100 ? storage.portions : 1,
 filter:'Kõik', search:'', selectedSlot:null, activePane:false
};
function store(){try{localStorage.setItem(KEY,JSON.stringify({week:state.week,plans:state.plans,portions:state.portions}))}catch(e){console.warn('Salvestamine ei õnnestunud',e)}}
function weekDate(){const [y,m,d]=state.week.split('-').map(Number);return new Date(y,m-1,d)}
function keyOf(day,meal){return `${dateKey(addDays(weekDate(),day))}|${meal}`}
function itemsForWeek(){return TOIDUD.flatMap(meal=>Array.from({length:7},(_,i)=>({meal:meal.id,day:i,key:keyOf(i,meal.id),recipe:RETSEPTID.find(r=>r.id===state.plans[keyOf(i,meal.id)])}))).filter(x=>x.recipe)}
function escapeHTML(x){return String(x).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function notify(text){DOM.toast.textContent=text;DOM.toast.classList.add('naita');clearTimeout(notify.timer);notify.timer=setTimeout(()=>DOM.toast.classList.remove('naita'),2900)}
function monthName(d){return d.toLocaleDateString('et-EE',{month:'long'})}
function formatRange(start){const end=addDays(start,6);return start.getMonth()===end.getMonth()?`${start.getDate()}.–${end.getDate()}. ${monthName(start)}`:`${start.getDate()}. ${monthName(start)} – ${end.getDate()}. ${monthName(end)}`}
function weekNumber(dt){const d=new Date(Date.UTC(dt.getFullYear(),dt.getMonth(),dt.getDate()));d.setUTCDate(d.getUTCDate()+4-(d.getUTCDay()||7));const first=new Date(Date.UTC(d.getUTCFullYear(),0,1));return Math.ceil((((d-first)/86400000)+1)/7)}
function photo(recipe){const list=FOTOD[recipe.toidukord]||FOTOD.lõuna;return `https://images.unsplash.com/${list[(Number(recipe.id.replace(/\D/g,''))||1)%list.length]}?auto=format&fit=crop&w=420&q=78`}
function estimatedMinutes(recipe){return recipe.aeg_min}
function renderCalendar(){
 const start=weekDate();
 DOM.range.textContent=formatRange(start);
 DOM.week.textContent=`7 päeva · nädal ${weekNumber(start)}`;
 let html='<div class="tabeli-nurk" role="columnheader"></div>';
 for(let day=0;day<7;day++){const d=addDays(start,day);html+=`<div class="paev-pais" role="columnheader"><strong>${LYHID[day]}</strong><small>${d.getDate()}. ${monthName(d)}</small></div>`}
 for(const meal of TOIDUD){
  html+=`<div class="rea-pealkiri" role="rowheader"><span class="rea-ikoon" aria-hidden="true">${meal.ikoon}</span><strong>${meal.nimi}</strong></div>`;
  for(let day=0;day<7;day++){
   const key=keyOf(day,meal.id);const r=RETSEPTID.find(r=>r.id===state.plans[key]);
   if(!r){html+=`<div class="toidulahter" role="cell"><button class="lisa-kaart" type="button" data-day="${day}" data-meal="${meal.id}" aria-label="Lisa ${meal.nimi.toLowerCase()}, ${PADEVAD[day]}"><span class="pluss" aria-hidden="true">+</span><span>Lisa retsept</span></button></div>`}
   else {html+=`<div class="toidulahter" role="cell"><article class="toidukaart"><img src="${photo(r)}" alt="Näidisfoto" loading="lazy"><button class="eemalda-link" type="button" data-remove="${escapeHTML(key)}" aria-label="Eemalda ${escapeHTML(r.nimi)}">×</button><div class="kaardi-sisu"><p class="roog" title="${escapeHTML(r.nimi)}">${escapeHTML(r.nimi)}</p><span class="aeg">◷ ~${estimatedMinutes(r)} min</span><button class="muuda-link" type="button" data-day="${day}" data-meal="${meal.id}">Muuda</button></div></article></div>`}
  }
 }
 DOM.calendar.innerHTML=html;
 const selected=itemsForWeek();const minutes=selected.reduce((sum,x)=>sum+estimatedMinutes(x.recipe),0);
 const shoppingUrl = shoppingPlanUrl(selected);
 for (const link of document.querySelectorAll('a[data-ostunimekiri]')) link.href = shoppingUrl;
 DOM.count.textContent=`${selected.length} / 21`;
 DOM.time.textContent=minutes>=60?`~ ${Math.floor(minutes/60)} t ${String(minutes%60).padStart(2,'0')} min`:`~ ${minutes} min`;
}
function matchesFilter(r){const f=state.filter;if(f==='Kõik')return true;if(['Hommik','Lõuna','Õhtu'].includes(f))return r.toidukord===f.toLowerCase();const tags=r.tyybid.join(' ').toLowerCase();const name=r.nimi.toLowerCase();return f==='Vegan'?(tags.includes('vegan')||tags.includes('taimne')&&!tags.includes('taimetoit')):(tags.includes('kala')||name.includes('kala')||name.includes('lõhe')||name.includes('räim')||name.includes('tuunikala'))}
function renderFilters(){DOM.filters.innerHTML=['Kõik','Hommik','Lõuna','Õhtu','Vegan','Kala'].map(f=>`<button type="button" data-filter="${f}" class="${state.filter===f?'filter-aktiivne':''}" aria-pressed="${state.filter===f}">${f}</button>`).join('')}
function renderRecipes(){
 const search=state.search.toLocaleLowerCase('et-EE');
 const list=RETSEPTID.filter(r=>matchesFilter(r)&&r.nimi.toLocaleLowerCase('et-EE').includes(search));
 DOM.resultCount.textContent=`${list.length} retsepti`;
 DOM.list.innerHTML=list.length?list.map(r=>`<div class="retseptirida"><img src="${photo(r)}" loading="lazy" alt="Näidisfoto"><button type="button" class="retseptivajutus" data-recipe="${r.id}" title="Lisa ${escapeHTML(r.nimi)}"><strong>${escapeHTML(r.nimi)}</strong><small>${r.toidukord} · umbes ${estimatedMinutes(r)} min · ${escapeHTML(r.tyybid.slice(0,2).join(', '))}</small></button><button type="button" class="rida-pluss" data-recipe="${r.id}" aria-label="Vali ${escapeHTML(r.nimi)}">+</button></div>`).join(''):'<p class="retsepti-tyhi">Selliseid retsepte ei leidnud. Proovi teist otsingut või filtrit.</p>';
}
function openPanel(day=null,meal=null){
 state.selectedSlot=(day!==null&&meal)?{day,meal}:null;
 if(state.selectedSlot){const id=TOIDUD.find(m=>m.id===meal);DOM.selected.textContent=`${PADEVAD[day]} · ${id.nimi}`;state.filter=meal==='hommik'?'Hommik':meal==='lõuna'?'Lõuna':'Õhtu'}
 else {DOM.selected.textContent='Vali esmalt kalendris päev ja toidukord';state.filter='Kõik'}
 state.search='';DOM.input.value='';renderFilters();renderRecipes();state.activePane=true;
 DOM.app.classList.add('paneel-avatud');if(window.matchMedia('(max-width:1160px)').matches){DOM.input.focus({preventScroll:true})}
}
function closePanel(){state.activePane=false;DOM.app.classList.remove('paneel-avatud');DOM.input.blur()}
function selectRecipe(id){const r=RETSEPTID.find(r=>r.id===id);if(!r)return;
 if(!state.selectedSlot){notify('Vali kõigepealt kalendris päev ja toidukord.');return}
 const {day,meal}=state.selectedSlot;const key=keyOf(day,meal);
 state.plans[key]=r.id;store();renderCalendar();closePanel();notify(`${PADEVAD[day]}: ${r.nimi} lisatud`);
}

function shoppingPlanUrl(placements = itemsForWeek()) {
 const params = new URLSearchParams({nadal: state.week, portsjonid: String(state.portions)});
 const slots = placements.map(({day, meal, recipe}) => {
  const slot = day * TOIDUD.length + TOIDUD.findIndex(item => item.id === meal);
  return `${slot}:${recipe.id}`;
 });
 params.set('menuu', slots.join(','));
 return `ostunimekiri.html?${params}`;
}

function isWeekKey(value) {
 if (!/^\d{4}-\d{2}-\d{2}$/.test(value ?? '')) return false;
 const [y, m, d] = value.split('-').map(Number);
 const date = new Date(y, m - 1, d);
 return date.getDay() === 1 && dateKey(date) === value;
}

function readShoppingPlan() {
 const params = new URLSearchParams(location.search);
 const week = params.get('nadal');
 const rawPortions = Number(params.get('portsjonid') ?? state.portions);
 const portions = Number.isInteger(rawPortions) && rawPortions >= 1 && rawPortions <= 100 ? rawPortions : 1;
 if (!isWeekKey(week) || !params.has('menuu')) {
  return {week: state.week, placements: itemsForWeek(), portions};
 }

 const placements = new Map();
 for (const entry of params.get('menuu').split(',')) {
  const match = /^(\d{1,2}):([RU]\d{3})$/.exec(entry);
  if (!match) continue;
  const slot = Number(match[1]);
  const day = Math.floor(slot / TOIDUD.length);
  const meal = TOIDUD[slot % TOIDUD.length].id;
  const recipe = RETSEPTID.find(item => item.id === match[2] || (match[2].startsWith('R') && item.nimi === OLD_NAMES[match[2]]));
  if (day < PADEVAD.length && recipe) placements.set(slot, {day, meal, recipe});
 }

 return {week, placements: [...placements.values()], portions};
}

function openShopping() {
 const placements = itemsForWeek();
 if (!placements.length) {
  notify('Lisa esmalt nädalaplaani vähemalt üks retsept.');
  return;
 }
 location.assign(shoppingPlanUrl(placements));
}

async function initShoppingPage() {
 const plan = readShoppingPlan();
 const selected = plan.placements;
 let portions = plan.portions;
 let comparison = null;
 let request = null;
 const checked = new Set();
 const number = new Intl.NumberFormat('et-EE', {maximumFractionDigits: 3});
 const money = value => new Intl.NumberFormat('et-EE', {style: 'currency', currency: 'EUR'}).format(value);
 const range = formatRange(new Date(plan.week + 'T12:00:00'));
 const list = $('#ostu-koostisosad');
 const status = $('#arvutuse-teade');
 const download = $('#laadi-nimekiri');
 const printButton = $('#prindi-nimekiri');
 const mode = $('#max-poode');
 const portionInput = $('#ostu-portsjonid');
 const activeBasket = () => comparison?.[mode.value === '1' ? 'uks_pood' : 'kaks_poodi'];
 const formatDate = value => value ? new Date(value.slice(0, 10) + 'T12:00:00').toLocaleDateString('et-EE') : 'teadmata';
 const quantity = (value, unit) => `${number.format(value)} ${unit}`;
 const updateCount = () => {
  const count = list.querySelectorAll('input:checked').length;
  const total = list.querySelectorAll('input').length;
  $('#ostu-margitud').textContent = `${count} / ${total}`;
 };

 $('#ostu-nadal').textContent = range;
 $('#ostu-toidukordi').textContent = selected.length;
 portionInput.value = portions;
 for (const link of document.querySelectorAll('[data-tagasi-plaani]')) {
  link.href = `toiduplaan.html?${new URLSearchParams({nadal: plan.week, portsjonid: String(portions)})}`;
 }
 $('#ostu-retseptid').innerHTML = PADEVAD.map((day, index) => {
  const meals = TOIDUD.flatMap(meal => {
   const item = selected.find(value => value.day === index && value.meal === meal.id);
   return item ? `<li><span>${meal.nimi}</span>${escapeHTML(item.recipe.nimi)}</li>` : [];
  });
  return meals.length ? `<section class="ostu-paev"><h3>${day}</h3><ul>${meals.join('')}</ul></section>` : '';
 }).join('');
 if (!selected.length) {
  $('#arvutuse-valikud').hidden = true;
  return;
 }
 $('#ostu-tyhi').hidden = true;
 $('#ostu-menuu').hidden = false;
 $('#ostu-juhis').hidden = false;

 function productLink(row) {
  try {
   const url = new URL(row.link);
   if (url.protocol === 'https:') return `<a href="${escapeHTML(url.href)}" target="_blank" rel="noopener noreferrer">${escapeHTML(row.toode)} ↗</a>`;
  } catch {}
  return escapeHTML(row.toode);
 }

 function renderBasket() {
  const basket = activeBasket();
  if (!basket) return;
  $('#soovitus').hidden = false;
  $('#soovitatud-poed').textContent = basket.poed.length ? basket.poed.join(' + ') : 'Tooteid ei leitud';
  $('#ostu-koguhind').textContent = money(basket.kokku);
  $('#hinna-selgitus').textContent = basket.täielik ? 'Kogu ostunimekirja hind' : 'Leitud toodete hind · nimekiri on osaline';
  $('#hindade-kuupaev').textContent = `Hinnad seisuga ${formatDate(basket.hinnad_seisuga)}.`;
  const one = comparison.uks_pood;
  const two = comparison.kaks_poodi;
  $('#ostu-saast').textContent = one.täielik && two.täielik && mode.value === '2'
   ? `Sääst võrreldes soodsaima ühe poe ostukorviga ${money(Math.max(0, one.kokku - two.kokku))}.`
   : (mode.value === '2' ? 'Võrdlus hõlmab üht või kuni kaht poodi.' : 'Kogu ostunimekiri ühest poest.');

  list.innerHTML = basket.read.map(row => {
   const buying = row.kaalukaup
    ? `Osta ${quantity(row.ostetud, row.ühik)}`
    : `${row.pakke} pakk${row.pakke === 1 ? '' : 'i'} × ${quantity(row.pakendi_kogus, row.ühik)}`;
   return `<li class="osturida hinnaga-rida"><label>
    <input type="checkbox" data-ingredient="${escapeHTML(row.id)}" ${checked.has(row.id) ? 'checked' : ''}>
    <span class="osturea-nimi">${escapeHTML(row.koostisosa)}<small>Vaja ${quantity(row.vaja, row.ühik)} · ${escapeHTML(row.pood)}</small></span>
    <strong>${money(row.hind)}</strong></label>
    <div class="osturea-detail">${productLink(row)}
     <span>${buying}${row.jääb_üle > 0 ? ` · üle jääb ${quantity(row.jääb_üle, row.ühik)}` : ''}</span>
    </div></li>`;
  }).join('');
  list.hidden = false;
  updateCount();

  const missing = $('#puuduvad-tooted');
  missing.hidden = basket.täielik;
  missing.textContent = basket.täielik ? '' : 'Hind puudub või toodet ei leitud: ' + basket.puudu.map(id => {
   const ingredient = comparison.koostisosad.find(item => item.id === id);
   return ingredient ? `${ingredient.nimi} (${quantity(ingredient.kogus, ingredient.ühik)})` : id;
  }).join(', ') + '. Need tooted ei sisaldu summas.';
  $('#poevariandid').innerHTML = comparison.variandid.map(variant => {
   const chosen = variant.võrreldud_poed.join('|') === basket.võrreldud_poed.join('|');
   return `<li class="poevariant ${chosen ? 'soovitatud-variant' : ''}">
     <span>${escapeHTML(variant.võrreldud_poed.join(' + '))}<small>${variant.täielik ? 'Kõik tooted leitud' : `${variant.puudu.length} koostisosa puudu`}</small></span>
     <strong>${money(variant.kokku)}</strong></li>`;
  }).join('');
  $('#hinnainfo').textContent = comparison.hinnad.map(item =>
   `${item.pood} · ${formatDate(item.kogutud)} · ${item.tooteid} toote hinda` +
   (item.puuduvaid ? ` · ${item.puuduvaid} päringut ebaõnnestus` : '')).join('\n');
  $('#võrdluspaneel').hidden = false;
  download.disabled = false;
  printButton.disabled = false;
 }

 async function calculate() {
  request?.abort();
  const current = new AbortController();
  request = current;
  comparison = null;
  download.disabled = true;
  printButton.disabled = true;
  $('#soovitus').hidden = true;
  $('#võrdluspaneel').hidden = true;
  $('#puuduvad-tooted').hidden = true;
  list.hidden = true;
  status.hidden = false;
  status.className = 'arvutuse-teade';
  status.textContent = 'Arvutan ostukorvi…';
  try {
   const response = await fetch('/api/arvuta', {
    method: 'POST', headers: {'Content-Type': 'application/json'}, signal: current.signal,
    body: JSON.stringify({valikud: selected.map(item => ({nimi: item.recipe.nimi, portsjonid: portions}))})
   });
   const result = await response.json();
   if (!response.ok) throw new Error(result.viga || 'Arvutus ebaõnnestus.');
   if (request !== current) return;
   comparison = result;
   status.hidden = true;
   renderBasket();
  } catch (error) {
   if (error.name === 'AbortError') return;
   status.className = 'arvutuse-teade laadimisviga';
   status.textContent = `Hinnavõrdlust ei õnnestunud arvutada. ${error.message}`;
   $('#proovi-uuesti').hidden = false;
  }
 }
 mode.addEventListener('change', renderBasket);
 portionInput.addEventListener('change', () => {
  if (!portionInput.checkValidity()) { portionInput.reportValidity(); return; }
  portions = Number(portionInput.value);
  for (const link of document.querySelectorAll('[data-tagasi-plaani]')) {
   link.href = 'toiduplaan.html?' + new URLSearchParams({nadal: plan.week, portsjonid: String(portions)});
  }
  const url = new URL(location.href);
  url.searchParams.set('portsjonid', String(portions));
  history.replaceState(null, '', url);
  $('#proovi-uuesti').hidden = true;
  calculate();
 });
 $('#proovi-uuesti').addEventListener('click', () => {
  $('#proovi-uuesti').hidden = true;
  calculate();
 });
 list.addEventListener('change', event => {
  const input = event.target;
  if (input.checked) checked.add(input.dataset.ingredient);
  else checked.delete(input.dataset.ingredient);
  updateCount();
 });
 printButton.addEventListener('click', () => window.print());
 download.addEventListener('click', () => {
  const basket = activeBasket();
  if (!basket) return;
  const lines = ['OSTUNIMEKIRI', `Nädal: ${range}`, `Portsjonid toidukorra kohta: ${portions}`, ''];
  for (const shop of basket.poed) {
   lines.push(shop.toUpperCase());
   for (const row of basket.read.filter(item => item.pood === shop)) {
    lines.push(`${row.toode} — ${row.kaalukaup ? quantity(row.ostetud, row.ühik) : row.pakke + ' pakk(i)'} — ${money(row.hind)}; vaja ${quantity(row.vaja, row.ühik)}, üle ${quantity(row.jääb_üle, row.ühik)}`);
   }
   lines.push('');
  }
  lines.push(`${basket.täielik ? 'Kokku' : 'Leitud toodete summa'}: ${money(basket.kokku)}`);
  if (!basket.täielik) lines.push($('#puuduvad-tooted').textContent);
  lines.push($('#hindade-kuupaev').textContent);
  const url = URL.createObjectURL(new Blob([lines.join('\n')], {type: 'text/plain;charset=utf-8'}));
  const link = document.createElement('a');
  link.href = url; link.download = `ostunimekiri-${plan.week}.txt`; link.click();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
 });
 await calculate();
}


function initPlanner() {
 const portions = $('#portsjonid');
 portions.value = state.portions;
 portions.addEventListener('change', () => {
  if (!portions.checkValidity()) { portions.reportValidity(); return; }
  state.portions = Number(portions.value); store(); renderCalendar();
 });
 DOM.calendar.addEventListener('click',e=>{
  const remove=e.target.closest('[data-remove]');if(remove){delete state.plans[remove.dataset.remove];store();renderCalendar();notify('Retsept eemaldatud.');return}
  const button=e.target.closest('[data-day][data-meal]');if(button)openPanel(Number(button.dataset.day),button.dataset.meal)
 });
 DOM.list.addEventListener('click',e=>{const b=e.target.closest('[data-recipe]');if(b)selectRecipe(b.dataset.recipe)});
 DOM.filters.addEventListener('click',e=>{const b=e.target.closest('[data-filter]');if(!b)return;state.filter=b.dataset.filter;renderFilters();renderRecipes()});
 DOM.input.addEventListener('input',e=>{state.search=e.target.value.trim();renderRecipes()});
 $('#eelmine-nadal').addEventListener('click',()=>{state.week=dateKey(addDays(weekDate(),-7));store();renderCalendar();notify('Eelmine nädal')});
 $('#jargmine-nadal').addEventListener('click',()=>{state.week=dateKey(addDays(weekDate(),7));store();renderCalendar();notify('Järgmine nädal')});
 $('#sirvi-retsepte').addEventListener('click',()=>openPanel());
 $('#mobiilne-retseptivalik').addEventListener('click',()=>openPanel());
 $('#sulge-paneel').addEventListener('click',closePanel);
 $('#sulge-taust').addEventListener('click',closePanel);
 $('#koosta-ostunimekiri').addEventListener('click',openShopping);
 $('#alumine-ostunimekiri').addEventListener('click',openShopping);
 document.addEventListener('keydown',e=>{if(e.key==='Escape')closePanel()});
 renderCalendar();renderFilters();renderRecipes();
}

if (DOM.calendar) initPlanner();
if (document.getElementById('ostunimekirja-leht')) await initShoppingPage();

}
startApp().catch(error => {
 const message = document.createElement('p');
 message.className = 'laadimisviga'; message.setAttribute('role', 'alert');
 message.textContent = location.protocol === 'file:' ? 'Käivita python server.py ja ava http://127.0.0.1:8000.' : 'Lehte ei õnnestunud laadida. ' + error.message;
 document.querySelector('main').prepend(message);
 console.error(error);
});