
const app = document.getElementById('app');
const toastEl = document.getElementById('toast');

const state = {
  screen:'home',
  mood:null,
  budget:30,
  distance:15,
  prefs:[],
  favorites: JSON.parse(localStorage.getItem('nomi:favorites') || '[]'),
  history: JSON.parse(localStorage.getItem('nomi:history') || '[]'),
  results:[],
  location:null,
  provider:null,
  error:null
};

const moods = [
  ['❤️','Romântico'],['🙂','Amigos'],['👨‍👩‍👧','Família'],
  ['💼','Trabalho'],['🍃','Relaxado'],['🎉','Celebrar']
];

const prefs = [
  ['🌅','Vista'],['🅿️','Estacionamento'],['🍷','Vinho'],['🌳','Esplanada'],
  ['🌿','Vegetariano'],['💚','Vegan'],['🧒','Crianças'],['🐕','Cães'],
  ['🍣','Sushi'],['🍝','Massa'],['🥩','Carne'],['🐟','Peixe'],
  ['🤫','Silêncio'],['♿','Acessível'],['🌙','Aberto agora'],['💳','Pagamento cartão']
];

function save(){
  localStorage.setItem('nomi:favorites', JSON.stringify(state.favorites));
  localStorage.setItem('nomi:history', JSON.stringify(state.history));
}
function toast(message){
  toastEl.textContent=message; toastEl.classList.add('show');
  clearTimeout(window.__toast); window.__toast=setTimeout(()=>toastEl.classList.remove('show'),1700);
}
function setScreen(screen){state.screen=screen;render();window.scrollTo(0,0)}
function nav(active){
  const items=[['⌂','Explorar','home'],['♡','Favoritos','favorites'],['⚔','Decisões','decisions'],['♙','Perfil','profile']];
  return `<nav class="nav">${items.map(([icon,label,screen])=>`
    <button class="${active===screen?'active':''}" onclick="setScreen('${screen}')">
      <span class="nav-icon">${icon}</span>${label}
    </button>`).join('')}</nav>`;
}
function header(step,tone){
  return `<div class="flow-top"><button class="icon-btn" onclick="back()">←</button>
    <div class="stepcount">${step}/4</div><div style="width:31px"></div></div>
    <div class="progress">${[1,2,3,4].map(i=>`<span class="${tone} ${i<=step?'on':''}"></span>`).join('')}</div>`;
}
function home(){
  app.innerHTML=`<main class="screen"><div class="page"><section class="content">
    <div class="home-top"><button class="icon-btn">☰</button><div class="avatar">PN</div></div>
    <div class="greeting">Boa noite, Pedro 👋</div><h1 class="hero">O que te apetece<br>fazer hoje?</h1>
    <div class="home-actions">${[
      ['🍽️','Comer','primary'],['☕','Café',''],['🍸','Beber um copo',''],
      ['🍰','Sobremesa',''],['🎲','Surpreende-me','sage']
    ].map(([e,l,c])=>`<button class="home-action ${c}" onclick="startFlow()"><span class="emoji">${e}</span>${l}</button>`).join('')}</div>
    </section>${nav('home')}</div></main>`;
}
function startFlow(){Object.assign(state,{mood:null,budget:30,distance:15,prefs:[],results:[],error:null});setScreen('mood')}
function mood(){
  app.innerHTML=`<main class="flow">${header(1,'coral')}<h1 class="flow-title">Qual é o mood?</h1>
    <p class="flow-sub">Escolhe o que melhor descreve<br>este momento.</p>
    <div class="grid">${moods.map(([e,l])=>`<button class="choice ${state.mood===l?'selected':''}" onclick="state.mood='${l}';render()">
      <span class="choice-emoji">${e}</span><span>${l}</span></button>`).join('')}</div>
    <div class="flex"></div><button class="cta" onclick="setScreen('budget')">Continuar</button></main>`;
}
function budget(){
  const marks=[10,20,30,50,100];
  app.innerHTML=`<main class="flow">${header(2,'coral')}<h1 class="flow-title">Quanto queres gastar<br>por pessoa?</h1>
    <p class="flow-sub">Arrasta o seletor</p><div class="value">${state.budget} €</div>
    <div class="slider-wrap"><input class="range" type="range" min="0" max="4" step="1" value="${marks.indexOf(state.budget)}"
      oninput="state.budget=[10,20,30,50,100][this.value];render()">
      <div class="range-labels"><span>10 €</span><span>20 €</span><span>30 €</span><span>50 €</span><span>100 €+</span></div></div>
    <div class="flex"></div><button class="cta" onclick="setScreen('distance')">Continuar</button></main>`;
}
function distance(){
  const marks=[5,10,15,20,30];
  app.innerHTML=`<main class="flow">${header(3,'sage')}<h1 class="flow-title">Até onde vais?</h1>
    <p class="flow-sub">Tempo máximo de deslocação</p><div class="value">${state.distance} min</div>
    <div class="slider-wrap"><input class="range sage" type="range" min="0" max="4" step="1" value="${marks.indexOf(state.distance)}"
      oninput="state.distance=[5,10,15,20,30][this.value];render()">
      <div class="range-labels"><span>5 min</span><span>10 min</span><span>15 min</span><span>20 min</span><span>30+</span></div></div>
    <div class="flex"></div><button class="cta sage" onclick="setScreen('prefs')">Continuar</button></main>`;
}
function preferences(){
  app.innerHTML=`<main class="flow">${header(4,'sage')}<h1 class="flow-title">O que é importante<br>para ti hoje?</h1>
    <p class="flow-sub">Podes escolher várias opções</p>
    <div class="grid compact">${prefs.map(([e,l])=>`<button class="choice compact ${state.prefs.includes(l)?'selected':''}" onclick="togglePref('${l}')">
      <span class="choice-emoji">${e}</span><span>${l}</span></button>`).join('')}</div>
    <div class="flex"></div><button class="cta sage" onclick="beginLiveSearch()">Pesquisar restaurantes</button></main>`;
}
function togglePref(pref){state.prefs=state.prefs.includes(pref)?state.prefs.filter(x=>x!==pref):[...state.prefs,pref];render()}

async function beginLiveSearch(){
  state.screen='searching';state.error=null;render();
  try{
    const pos=await getPosition();
    state.location={lat:pos.coords.latitude,lon:pos.coords.longitude};
    const proxy=window.NOMI_CONFIG && window.NOMI_CONFIG.GOOGLE_PLACES_PROXY_URL;
    state.results=proxy ? await searchGoogleProxy(proxy) : await searchOverpass();
    state.provider=proxy?'Google Places':'OpenStreetMap';
    if(!state.results.length) throw new Error('Não encontrei restaurantes suficientes nesta área.');
    saveDecision();
    setScreen('result');
  }catch(err){
    state.error=err.message || 'Não foi possível pesquisar restaurantes.';
    setScreen('locationError');
  }
}
function getPosition(){
  return new Promise((resolve,reject)=>{
    if(!navigator.geolocation) return reject(new Error('Este browser não permite obter a localização.'));
    navigator.geolocation.getCurrentPosition(resolve,()=>reject(new Error('Ativa a localização para pesquisar restaurantes perto de ti.')),
      {enableHighAccuracy:true,timeout:12000,maximumAge:120000});
  });
}
function radiusMeters(){return Math.max(700,Math.min(5000,state.distance*110))}
function cuisineTerms(){
  const map={'Sushi':'sushi','Massa':'italian','Carne':'steak_house','Peixe':'seafood','Vegetariano':'vegetarian','Vegan':'vegan'};
  return state.prefs.map(x=>map[x]).filter(Boolean);
}
async function searchOverpass(){
  const r=radiusMeters(), {lat,lon}=state.location;
  const q=`[out:json][timeout:25];(node["amenity"="restaurant"](around:${r},${lat},${lon});way["amenity"="restaurant"](around:${r},${lat},${lon});relation["amenity"="restaurant"](around:${r},${lat},${lon}););out center tags;`;
  const res=await fetch('https://overpass-api.de/api/interpreter',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded;charset=UTF-8'},body:'data='+encodeURIComponent(q)});
  if(!res.ok) throw new Error('O serviço de pesquisa está temporariamente indisponível.');
  const data=await res.json();
  return data.elements.map(normalizeOSM).filter(x=>x.name).sort((a,b)=>b.score-a.score).slice(0,8);
}
function normalizeOSM(el){
  const tags=el.tags||{}, lat=el.lat||(el.center&&el.center.lat), lon=el.lon||(el.center&&el.center.lon);
  const km=haversine(state.location.lat,state.location.lon,lat,lon);
  const cuisine=(tags.cuisine||'Restaurante').split(';').map(titleCase).join(' · ');
  const selected=cuisineTerms();
  let score=70-Math.min(25,km*6);
  selected.forEach(term=>{if((tags.cuisine||'').toLowerCase().includes(term.replace('_','')))score+=12});
  if(tags.outdoor_seating==='yes'&&state.prefs.includes('Esplanada'))score+=8;
  if(tags.diet_vegan==='yes'&&state.prefs.includes('Vegan'))score+=8;
  if(tags.diet_vegetarian==='yes'&&state.prefs.includes('Vegetariano'))score+=8;
  if(tags.wheelchair==='yes'&&state.prefs.includes('Acessível'))score+=6;
  return {
    id:`osm-${el.type}-${el.id}`,name:tags.name||tags['name:pt']||'',cuisine,
    distanceKm:km,lat,lon,address:[tags['addr:street'],tags['addr:housenumber']].filter(Boolean).join(' '),
    website:tags.website||tags['contact:website']||'',phone:tags.phone||tags['contact:phone']||'',
    score:Math.max(1,Math.min(99,Math.round(score))),source:'OpenStreetMap'
  };
}
async function searchGoogleProxy(url){
  const res=await fetch(url,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({
    latitude:state.location.lat,longitude:state.location.lon,radiusMeters:radiusMeters(),
    mood:state.mood,budget:state.budget,preferences:state.prefs,maxResults:10
  })});
  if(!res.ok) throw new Error('Não foi possível contactar o serviço Google Places.');
  const data=await res.json();
  return (data.places||data.results||[]).map((p,i)=>({
    id:p.id||p.placeId||`g-${i}`,name:p.displayName?.text||p.name,cuisine:p.primaryTypeDisplayName?.text||p.primaryType||'Restaurante',
    distanceKm:p.distanceKm||0,lat:p.location?.latitude||p.lat,lon:p.location?.longitude||p.lon,address:p.formattedAddress||'',
    score:p.matchScore||Math.max(70,95-i*4),rating:p.rating,userRatingCount:p.userRatingCount,source:'Google Places'
  }));
}
function titleCase(s){return s.replace(/_/g,' ').replace(/\b\w/g,c=>c.toUpperCase())}
function haversine(a,b,c,d){const R=6371,x=(c-a)*Math.PI/180,y=(d-b)*Math.PI/180;const q=Math.sin(x/2)**2+Math.cos(a*Math.PI/180)*Math.cos(c*Math.PI/180)*Math.sin(y/2)**2;return 2*R*Math.asin(Math.sqrt(q))}
function saveDecision(){
  const first=state.results[0];
  const entry={at:new Date().toISOString(),mood:state.mood||'Especial',budget:state.budget,distance:state.distance,prefs:[...state.prefs],restaurant:first.name};
  state.history=[entry,...state.history].slice(0,12);save();
}
function searching(){
  app.innerHTML=`<main class="result"><div class="search-state"><div><div class="spinner"></div>
    <h2>A Nomi está a procurar</h2><p>A cruzar localização, distância e preferências com restaurantes reais perto de ti.</p></div></div></main>`;
}
function locationError(){
  app.innerHTML=`<main class="flow"><div class="flow-top"><button class="icon-btn" onclick="setScreen('prefs')">←</button></div>
    <div class="search-state"><div><h2>Não consegui pesquisar</h2><p>${state.error}</p>
    <div class="location-box"><button class="cta" onclick="beginLiveSearch()">Tentar novamente</button>
    <button class="secondary-btn" style="width:100%;margin-top:10px" onclick="setScreen('prefs')">Rever preferências</button></div></div></div></main>`;
}
function whyFor(r){
  const mood=(state.mood||'especial').toLowerCase();
  const p=state.prefs.slice(0,2).join(' e ').toLowerCase();
  return `A Nomi escolheu este por estar a ${r.distanceKm.toFixed(1)} km, encaixar num momento ${mood}${p?` e aproximar-se de ${p}`:''}.`;
}
function mapUrl(r){return `https://www.openstreetmap.org/?mlat=${r.lat}&mlon=${r.lon}#map=18/${r.lat}/${r.lon}`}
function isFav(id){return state.favorites.some(x=>x.id===id)}
function toggleFavorite(id){
  const r=state.results.find(x=>x.id===id); if(!r)return;
  state.favorites=isFav(id)?state.favorites.filter(x=>x.id!==id):[r,...state.favorites];
  save();render();toast(isFav(id)?'Guardado nos favoritos':'Removido dos favoritos');
}
function result(){
  const [first,...rest]=state.results;
  app.innerHTML=`<main class="result"><div class="result-head"><button class="icon-btn" onclick="setScreen('prefs')">←</button>
    <div class="eyebrow">Nomi encontrou para ti</div><button class="icon-btn" onclick="beginLiveSearch()">↻</button></div>
    <article class="live-card primary"><div class="live-rank">♥ ${first.score}%<br>match</div>
      <h2 class="live-name">${first.name}</h2><div class="live-meta">${first.cuisine}${first.address?` · ${first.address}`:''}</div>
      <p class="live-why">${whyFor(first)}</p><div class="live-stats"><span>⌖ ${first.distanceKm.toFixed(1)} km</span>
      ${first.rating?`<span>★ ${first.rating}${first.userRatingCount?` (${first.userRatingCount})`:''}</span>`:''}
      <a class="map-link" href="${mapUrl(first)}" target="_blank" rel="noopener">Ver no mapa</a>
      <button class="fav-round" onclick="toggleFavorite('${first.id}')">${isFav(first.id)?'♥':'♡'}</button></div></article>
    <h3 class="section-title">Outras excelentes opções</h3>
    ${rest.slice(0,5).map(r=>`<article class="live-card live-alt"><div><h3>${r.name}</h3>
      <p>${r.cuisine} · ${r.distanceKm.toFixed(1)} km${r.address?` · ${r.address}`:''}</p></div>
      <a class="map-link" href="${mapUrl(r)}" target="_blank" rel="noopener">Mapa</a></article>`).join('')}
    <button class="cta" onclick="toast('A Nomi decidiu: ${first.name.replace(/'/g,"")}')">🎲 Decide por mim</button>
    <div class="provider-note">Resultados em tempo real via ${state.provider}. Dados e disponibilidade podem variar.</div></main>`;
}
function favorites(){
  app.innerHTML=`<main class="screen"><div class="page"><section class="list-page content">
    <div class="section-head"><button class="icon-btn" onclick="setScreen('home')">←</button></div><h1 class="page-title">Favoritos</h1>
    ${state.favorites.length?state.favorites.map(f=>`<div class="saved-card"><div><b>${f.name}</b><small>${f.cuisine||''} · ${(f.distanceKm||0).toFixed(1)} km</small></div>
      <button class="icon-btn" onclick="state.favorites=state.favorites.filter(x=>x.id!=='${f.id}');save();render()">♥</button></div>`).join(''):
      `<div class="empty">Ainda não guardaste restaurantes.</div>`}</section>${nav('favorites')}</div></main>`;
}
function decisions(){
  app.innerHTML=`<main class="screen"><div class="page"><section class="list-page content">
    <div class="section-head"><button class="icon-btn" onclick="setScreen('home')">←</button></div><h1 class="page-title">Decisões</h1>
    ${state.history.length?state.history.map(h=>`<div class="history-card"><b>${h.restaurant}</b><div>${h.mood} · ${h.budget} € · até ${h.distance} min</div>
      <small>${new Date(h.at).toLocaleDateString('pt-PT')}</small></div>`).join(''):`<div class="empty">As tuas decisões aparecerão aqui.</div>`}
    </section>${nav('decisions')}</div></main>`;
}
function profile(){
  app.innerHTML=`<main class="screen"><div class="page"><section class="list-page content">
    <div class="section-head"><button class="icon-btn" onclick="setScreen('home')">←</button></div><h1 class="page-title">Perfil</h1>
    <div class="profile-card"><div class="profile-line"><span>Nome</span><b>Pedro</b></div>
    <div class="profile-line"><span>Favoritos</span><b>${state.favorites.length}</b></div>
    <div class="profile-line"><span>Decisões</span><b>${state.history.length}</b></div>
    <div class="profile-line"><span>Pesquisa</span><b>Restaurantes reais</b></div></div>
    </section>${nav('profile')}</div></main>`;
}
function back(){const order=['home','mood','budget','distance','prefs','result'];const i=order.indexOf(state.screen);setScreen(order[Math.max(0,i-1)])}
function render(){({home,mood,budget,distance,prefs:preferences,searching,locationError,result,favorites,decisions,profile}[state.screen]||home)()}
render();
