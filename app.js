
function dismissStartupSplash(){
  const removeSplash=()=>{
    const splash=document.getElementById('startupSplash');
    if(!splash)return;
    splash.classList.add('hide');
    window.setTimeout(()=>splash.remove(),450);
  };
  window.setTimeout(removeSplash,1700);
  window.setTimeout(removeSplash,3200);
  window.addEventListener('pageshow',()=>window.setTimeout(removeSplash,120),{once:true});
}


const app=document.getElementById('app'),toastEl=document.getElementById('toast');

const state={
  screen:'home',
  intent:'eat',
  mood:null,
  budget:30,
  distance:15,
  prefs:[],
  results:[],
  provider:'',
  fallbackNote:'',
  favorites:JSON.parse(localStorage.getItem('nomi:favorites')||'[]'),
  history:JSON.parse(localStorage.getItem('nomi:history')||'[]')
};

const moods=[
  ['❤️','Romântico'],['🙂','Amigos'],['👨‍👩‍👧','Família'],
  ['💼','Trabalho'],['🍃','Relaxado'],['🎉','Celebrar']
];

const prefs=[
  ['🌅','Vista'],['🅿️','Estacionamento'],['🍷','Vinho'],['🌳','Esplanada'],
  ['🌿','Vegetariano'],['💚','Vegan'],['🧒','Crianças'],['🐕','Cães'],
  ['🍣','Sushi'],['🍝','Massa'],['🥩','Carne'],['🐟','Peixe'],
  ['🤫','Silêncio'],['♿','Acessível'],['🌙','Aberto agora'],['💳','Cartão']
];

const intentLabels={
  eat:'Comer', coffee:'Café', drink:'Beber um copo', dessert:'Sobremesa', surprise:'Surpreende-me'
};

function save(){
  localStorage.setItem('nomi:favorites',JSON.stringify(state.favorites));
  localStorage.setItem('nomi:history',JSON.stringify(state.history));
}
function toast(t){
  toastEl.textContent=t;
  toastEl.classList.add('show');
  clearTimeout(window._t);
  window._t=setTimeout(()=>toastEl.classList.remove('show'),1700);
}
function setScreen(s){state.screen=s;render();scrollTo(0,0)}
function nav(a){
  return `<nav class="nav">${[
    ['⌂','Explorar','home'],['♡','Favoritos','favorites'],
    ['⚔','Decisões','decisions'],['♙','Perfil','profile']
  ].map(([i,l,s])=>`<button class="${a===s?'active':''}" onclick="setScreen('${s}')"><span class="ni">${i}</span>${l}</button>`).join('')}</nav>`;
}
function head(n,t){
  return `<div class="flowtop"><button class="icon-btn" onclick="back()">←</button><div class="step">${n}/4</div><div></div></div>
  <div class="progress">${[1,2,3,4].map(i=>`<span class="${t} ${i<=n?'on':''}"></span>`).join('')}</div>`;
}

function home(){
  const actions=[
    ['🍽️','Comer','primary','eat'],
    ['☕','Café','','coffee'],
    ['🍸','Beber um copo','','drink'],
    ['🍰','Sobremesa','','dessert'],
    ['🎲','Surpreende-me','sage','surprise']
  ];
  app.innerHTML=`<main class="screen"><div class="shell"><section class="content">
    <div class="top"><button class="icon-btn menu" onclick="openDrawer()">☰</button><div class="avatar">PN</div></div>
    <div class="greeting">Boa noite, Pedro 👋</div>
    <h1 class="hero">O que te apetece<br>fazer hoje?</h1>
    <div class="actions">${actions.map(([e,l,c,intent])=>`
      <button class="action ${c}" onclick="start('${intent}')"><span class="e">${e}</span>${l}</button>`).join('')}
    </div>
  </section>${nav('home')}</div></main>`;
}

function start(intent){
  Object.assign(state,{
    intent,
    mood:null,
    budget:30,
    distance:15,
    prefs:[],
    results:[],
    fallbackNote:''
  });
  setScreen('mood');
}

function mood(){
  app.innerHTML=`<main class="flow">${head(1,'coral')}
    <h1 class="title">Qual é o mood?</h1>
    <p class="sub">Escolhe o que melhor descreve<br>este momento.</p>
    <div class="grid">${moods.map(([e,l])=>`
      <button class="choice ${state.mood===l?'selected':''}" onclick="state.mood='${l}';render()">
        <span class="ce">${e}</span>${l}
      </button>`).join('')}</div>
    <div class="flex"></div>
    <button class="cta" onclick="setScreen('budget')">Continuar</button>
  </main>`;
}

function budget(){
  const a=[10,20,30,50,100];
  app.innerHTML=`<main class="flow">${head(2,'coral')}
    <h1 class="title">Quanto queres gastar<br>por pessoa?</h1>
    <p class="sub">Arrasta o seletor</p>
    <div class="value">${state.budget} €</div>
    <div class="slider">
      <input type="range" min="0" max="4" value="${a.indexOf(state.budget)}"
        oninput="state.budget=[10,20,30,50,100][this.value];render()">
      <div class="labels"><span>10 €</span><span>20 €</span><span>30 €</span><span>50 €</span><span>100 €+</span></div>
    </div>
    <div class="flex"></div>
    <button class="cta" onclick="setScreen('distance')">Continuar</button>
  </main>`;
}

function distance(){
  const a=[5,10,15,30,60];
  app.innerHTML=`<main class="flow">${head(3,'sage')}
    <h1 class="title">Até onde vais?</h1>
    <p class="sub">Tempo máximo de deslocação</p>
    <div class="value">${state.distance} min</div>
    <div class="slider">
      <input class="sage" type="range" min="0" max="4" value="${a.indexOf(state.distance)}"
        oninput="state.distance=[5,10,15,30,60][this.value];render()">
      <div class="labels"><span>5 min</span><span>10 min</span><span>15 min</span><span>30 min</span><span>60 min</span></div>
    </div>
    <div class="flex"></div>
    <button class="cta sage" onclick="setScreen('prefs')">Continuar</button>
  </main>`;
}

function preferences(){
  app.innerHTML=`<main class="flow">${head(4,'sage')}
    <h1 class="title">O que é importante<br>para ti hoje?</h1>
    <p class="sub">Podes escolher várias opções</p>
    <div class="grid compact">${prefs.map(([e,l])=>`
      <button class="choice compact ${state.prefs.includes(l)?'selected':''}" onclick="toggle('${l}')">
        <span class="ce">${e}</span><span>${l}</span>
      </button>`).join('')}</div>
    <div class="flex"></div>
    <button class="cta sage" onclick="search()">Pesquisar opções</button>
  </main>`;
}
function toggle(x){
  state.prefs=state.prefs.includes(x)?state.prefs.filter(v=>v!==x):[...state.prefs,x];
  render();
dismissStartupSplash();
}

function geo(){
  return new Promise((ok,no)=>{
    if(!navigator.geolocation) return no(new Error('A localização não está disponível neste dispositivo.'));
    navigator.geolocation.getCurrentPosition(
      ok,
      ()=>no(new Error('Ativa a localização no Safari para pesquisar opções perto de ti.')),
      {enableHighAccuracy:true,timeout:15000,maximumAge:60000}
    );
  });
}
function km(a,b,c,d){
  const R=6371,x=(c-a)*Math.PI/180,y=(d-b)*Math.PI/180;
  const q=Math.sin(x/2)**2+Math.cos(a*Math.PI/180)*Math.cos(c*Math.PI/180)*Math.sin(y/2)**2;
  return 2*R*Math.asin(Math.sqrt(q));
}
function title(s){return String(s||'').replace(/_/g,' ').replace(/\b\w/g,c=>c.toUpperCase())}

function amenitySet(){
  if(state.intent==='coffee') return ['cafe'];
  if(state.intent==='drink') return ['bar','pub','biergarten'];
  if(state.intent==='dessert') return ['cafe','ice_cream'];
  if(state.intent==='surprise') return ['restaurant','cafe','bar','pub','ice_cream'];
  return ['restaurant','fast_food'];
}

function selectedCuisineTerms(){
  const terms=[];
  if(state.prefs.includes('Sushi')) terms.push('sushi','japanese');
  if(state.prefs.includes('Massa')) terms.push('italian','pizza','pasta');
  if(state.prefs.includes('Carne')) terms.push('steak_house','barbecue','grill');
  if(state.prefs.includes('Peixe')) terms.push('seafood','fish');
  if(state.prefs.includes('Vegetariano')) terms.push('vegetarian');
  if(state.prefs.includes('Vegan')) terms.push('vegan');
  return terms;
}

function progressiveRadii(){
  const target=Math.max(1200,Math.min(50000,state.distance*700));
  const candidates=[1800,3500,7000,12000,20000,35000,50000].filter(x=>x<=target);
  if(!candidates.includes(target)) candidates.push(target);
  return [...new Set(candidates)].sort((a,b)=>a-b);
}

function overpassQuery(loc,radius){
  const amenities=amenitySet().map(a=>`nwr["amenity"="${a}"](around:${radius},${loc.lat},${loc.lon});`).join('');
  return `[out:json][timeout:18];(${amenities});out center tags;`;
}

async function fetchWithTimeout(url,options,ms=12000){
  const controller=new AbortController();
  const timer=setTimeout(()=>controller.abort(),ms);
  try{return await fetch(url,{...options,signal:controller.signal})}
  finally{clearTimeout(timer)}
}

function priceEstimate(tags){
  const raw=(tags.price||tags['price:range']||tags['payment:cash']||'').toString();
  if(/[€]{3,4}/.test(raw)) return 70;
  if(/[€]{2}/.test(raw)) return 35;
  if(/[€]/.test(raw)) return 18;
  if(tags.amenity==='fast_food') return 12;
  if(tags.amenity==='cafe') return 15;
  if(tags.amenity==='bar'||tags.amenity==='pub') return 20;
  return 30;
}

function matchDetails(tags,distanceKm){
  const lowCuisine=String(tags.cuisine||'').toLowerCase();
  const selected=selectedCuisineTerms();
  const details=[];
  let score=74-Math.min(28,distanceKm*2.4);

  if(selected.length){
    const hit=selected.some(term=>lowCuisine.includes(term.replace('_',' '))||lowCuisine.includes(term));
    score+=hit?28:-22;
    details.push(hit?'cozinha escolhida':'cozinha aproximada');
  }

  if(state.prefs.includes('Vegan')){
    const hit=tags.diet_vegan==='yes'||lowCuisine.includes('vegan');
    score+=hit?24:-16; if(hit)details.push('vegan');
  }
  if(state.prefs.includes('Vegetariano')){
    const hit=tags.diet_vegetarian==='yes'||lowCuisine.includes('vegetarian');
    score+=hit?18:-10; if(hit)details.push('vegetariano');
  }
  if(state.prefs.includes('Esplanada')){
    const hit=tags.outdoor_seating==='yes'||tags.outdoor_seating==='only';
    score+=hit?16:-7; if(hit)details.push('esplanada');
  }
  if(state.prefs.includes('Estacionamento')){
    const hit=tags.parking==='yes'||tags['parking:fee']==='no'||tags['amenity:parking'];
    score+=hit?10:-3; if(hit)details.push('estacionamento');
  }
  if(state.prefs.includes('Crianças')){
    const hit=tags.kids_area==='yes'||tags.highchair==='yes'||tags.changing_table==='yes';
    score+=hit?17:-2; if(hit)details.push('adequado a crianças');
  }
  if(state.prefs.includes('Cães')){
    const hit=tags.dog==='yes'||tags.dogs==='yes';
    score+=hit?17:-4; if(hit)details.push('aceita cães');
  }
  if(state.prefs.includes('Acessível')){
    const hit=tags.wheelchair==='yes';
    score+=hit?18:-10; if(hit)details.push('acessível');
  }
  if(state.prefs.includes('Cartão')){
    const hit=tags['payment:cards']==='yes'||tags['payment:credit_cards']==='yes'||tags['payment:debit_cards']==='yes';
    score+=hit?9:-2; if(hit)details.push('pagamento por cartão');
  }
  if(state.prefs.includes('Aberto agora')&&tags.opening_hours){
    score+=8;details.push('horário disponível');
  }
  if(state.prefs.includes('Vinho')){
    const hit=tags['drink:wine']==='served'||tags.wine==='yes'||tags.amenity==='bar';
    score+=hit?11:-2;if(hit)details.push('vinho');
  }

  const estimate=priceEstimate(tags);
  const budgetDiff=Math.abs(estimate-state.budget);
  score+=Math.max(-12,12-budgetDiff/3);
  if(budgetDiff<=12)details.push('orçamento próximo');

  if(state.mood==='Romântico'){
    const hit=tags.outdoor_seating==='yes'||tags.reservation==='yes'||tags.cuisine;
    score+=hit?9:0;
  }
  if(state.mood==='Trabalho'){
    const hit=tags.internet_access==='wlan'||tags.internet_access==='yes';
    score+=hit?12:0;if(hit)details.push('Wi-Fi');
  }
  if(state.mood==='Família'&&state.prefs.includes('Crianças')) score+=7;
  if(state.mood==='Celebrar'&&tags.reservation==='yes') score+=8;
  if(state.mood==='Relaxado'&&tags.takeaway!=='only') score+=5;

  return {score:Math.max(1,Math.min(99,Math.round(score))),details};
}

function normalize(el,loc){
  const t=el.tags||{};
  const lat=el.lat||(el.center&&el.center.lat),lon=el.lon||(el.center&&el.center.lon);
  if(!lat||!lon) return null;
  const name=t.name||t['name:pt']||'';
  if(!name) return null;
  const distanceKm=km(loc.lat,loc.lon,lat,lon);
  const cuisine=(t.cuisine||typeLabel(t.amenity)).split(';').map(title).join(' · ');
  const match=matchDetails(t,distanceKm);
  const wikimedia=t.wikimedia_commons||'',image=t.image||'';
  const imageUrl=image||(wikimedia?`https://commons.wikimedia.org/wiki/Special:Redirect/file/${encodeURIComponent(wikimedia.replace(/^File:/,''))}`:'');
  const mapImage=`https://staticmap.openstreetmap.de/staticmap.php?center=${lat},${lon}&zoom=16&size=700x430&markers=${lat},${lon},red-pushpin`;
  const website=t.website||t['contact:website']||'';
  const googleUrl=`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(name+' '+lat+','+lon)}`;
  return {
    id:`${el.type}-${el.id}`,
    name,cuisine,lat,lon,distanceKm,
    address:[t['addr:street'],t['addr:housenumber'],t['addr:city']].filter(Boolean).join(' '),
    score:match.score,
    matchDetails:match.details,
    imageUrl:imageUrl||mapImage,
    actualPhoto:Boolean(imageUrl),
    website,googleUrl,
    openingHours:t.opening_hours||''
  };
}

function typeLabel(amenity){
  return ({
    restaurant:'Restaurante',fast_food:'Comida rápida',cafe:'Café',
    bar:'Bar',pub:'Pub',biergarten:'Esplanada',ice_cream:'Gelataria'
  })[amenity]||'Espaço';
}

function dedupe(items){
  const seen=new Set();
  return items.filter(item=>{
    const key=(item.name+'|'+item.address).toLowerCase().replace(/\s+/g,' ');
    if(seen.has(key)) return false;
    seen.add(key);return true;
  });
}

function preferenceAwareSort(items){
  const strong=selectedCuisineTerms().length||state.prefs.includes('Vegan')||state.prefs.includes('Vegetariano');
  const sorted=[...items].sort((a,b)=>b.score-a.score||a.distanceKm-b.distanceKm);
  if(!strong) return sorted;
  const relevant=sorted.filter(x=>x.score>=74);
  return relevant.length>=3?[...relevant,...sorted.filter(x=>!relevant.includes(x))]:sorted;
}

async function overpass(loc){
  const endpoints=[
    'https://overpass-api.de/api/interpreter',
    'https://overpass.kumi.systems/api/interpreter',
    'https://overpass.nchc.org.tw/api/interpreter'
  ];
  let all=[];
  let lastError=null;

  for(const radius of progressiveRadii()){
    const q=overpassQuery(loc,radius);
    let radiusResults=[];
    for(const url of endpoints){
      try{
        const requestUrl=`${url}?data=${encodeURIComponent(q)}`;
        const r=await fetchWithTimeout(requestUrl,{method:'GET',headers:{Accept:'application/json'}},12000);
        if(!r.ok) throw new Error(`HTTP ${r.status}`);
        const j=await r.json();
        radiusResults=j.elements.map(e=>normalize(e,loc)).filter(Boolean);
        if(radiusResults.length) break;
      }catch(e){lastError=e}
    }
    all=dedupe([...all,...radiusResults]);
    if(all.length>=24) break;
  }

  if(!all.length){
    return await nominatimFallback(loc,lastError);
  }
  return preferenceAwareSort(all).slice(0,12);
}

function fallbackKeyword(){
  if(state.prefs.includes('Sushi')) return 'sushi';
  if(state.prefs.includes('Vegan')) return 'vegan restaurant';
  if(state.prefs.includes('Vegetariano')) return 'vegetarian restaurant';
  if(state.prefs.includes('Massa')) return 'italian restaurant';
  if(state.prefs.includes('Peixe')) return 'seafood restaurant';
  if(state.prefs.includes('Carne')) return 'steakhouse';
  if(state.intent==='coffee') return 'cafe';
  if(state.intent==='drink') return 'bar';
  if(state.intent==='dessert') return 'dessert cafe';
  return 'restaurant';
}

async function nominatimFallback(loc,lastError){
  const delta=Math.min(0.45,Math.max(0.04,state.distance/120));
  const viewbox=[loc.lon-delta,loc.lat+delta,loc.lon+delta,loc.lat-delta].join(',');
  const url=`https://nominatim.openstreetmap.org/search?format=jsonv2&limit=20&bounded=1&viewbox=${viewbox}&q=${encodeURIComponent(fallbackKeyword())}`;
  try{
    const r=await fetchWithTimeout(url,{headers:{Accept:'application/json','Accept-Language':'pt-PT'}},12000);
    if(!r.ok) throw new Error(`HTTP ${r.status}`);
    const data=await r.json();
    const items=data.map((p,i)=>{
      const lat=Number(p.lat),lon=Number(p.lon),distanceKm=km(loc.lat,loc.lon,lat,lon);
      return {
        id:`nom-${p.osm_type}-${p.osm_id}`,
        name:(p.name||p.display_name.split(',')[0]||'Opção'),
        cuisine:typeLabel(state.intent==='coffee'?'cafe':state.intent==='drink'?'bar':'restaurant'),
        lat,lon,distanceKm,
        address:p.display_name.split(',').slice(1,4).join(',').trim(),
        score:Math.max(55,84-i*2-Math.round(distanceKm)),
        matchDetails:['resultado geográfico'],
        imageUrl:`https://staticmap.openstreetmap.de/staticmap.php?center=${lat},${lon}&zoom=16&size=700x430&markers=${lat},${lon},red-pushpin`,
        actualPhoto:false,
        website:'',
        googleUrl:`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent((p.display_name||p.name)+'')}`
      };
    }).filter(x=>x.distanceKm<=Math.max(3,state.distance*1.2));
    state.fallbackNote='Pesquisa alternativa usada porque o serviço principal estava indisponível.';
    if(items.length) return items.slice(0,10);
  }catch(e){}
  throw new Error('A pesquisa ao vivo está temporariamente indisponível. Tenta novamente dentro de alguns segundos.');
}

async function google(proxy,loc){
  const r=await fetchWithTimeout(proxy,{
    method:'POST',
    headers:{'Content-Type':'application/json'},
    body:JSON.stringify({
      latitude:loc.lat,
      longitude:loc.lon,
      radiusMeters:Math.min(50000,Math.max(1200,state.distance*700)),
      intent:state.intent,
      mood:state.mood,
      budget:state.budget,
      preferences:state.prefs,
      maxResults:12
    })
  },16000);
  if(!r.ok) throw new Error('O serviço Google Places não respondeu.');
  const j=await r.json();
  return (j.places||j.results||[]).map((p,i)=>{
    const name=p.displayName?.text||p.name;
    return {
      id:p.id||p.placeId||`g${i}`,
      name,
      cuisine:p.primaryTypeDisplayName?.text||p.primaryType||'Restaurante',
      lat:p.location?.latitude||p.lat,
      lon:p.location?.longitude||p.lon,
      distanceKm:p.distanceKm||0,
      address:p.formattedAddress||'',
      score:p.matchScore||Math.max(70,96-i*3),
      rating:p.rating,
      userRatingCount:p.userRatingCount,
      matchDetails:p.matchDetails||[],
      imageUrl:p.photoUrl||p.imageUrl||'',
      actualPhoto:Boolean(p.photoUrl||p.imageUrl),
      website:p.websiteUri||p.website||'',
      googleUrl:p.googleMapsUri||`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(name||'Restaurante')}`,
      openingHours:p.currentOpeningHours?.weekdayDescriptions?.join(' · ')||''
    };
  });
}

async function search(){
  state.screen='searching';
  state.error='';
  state.fallbackNote='';
  render();
  try{
    const p=await geo();
    const loc={lat:p.coords.latitude,lon:p.coords.longitude};
    const proxy=window.NOMI_CONFIG?.GOOGLE_PLACES_PROXY_URL;
    state.results=proxy?await google(proxy,loc):await overpass(loc);
    state.provider=proxy?'Google Places':'OpenStreetMap';
    if(!state.results.length) throw new Error('Não encontrei opções nesta distância. Aumenta o raio e tenta novamente.');

    const f=state.results[0];
    state.history=[{
      at:new Date().toISOString(),
      restaurant:f.name,
      intent:state.intent,
      mood:state.mood||'Especial',
      budget:state.budget,
      distance:state.distance,
      prefs:[...state.prefs]
    },...state.history].slice(0,12);
    save();
    setScreen('result');
  }catch(e){
    state.error=e.message||'Não foi possível pesquisar.';
    setScreen('error');
  }
}

function searching(){
  app.innerHTML=`<main class="searching"><div>
    <div class="spinner"></div>
    <h2>A Nomi está a procurar</h2>
    <p>A pesquisar ${intentLabels[state.intent].toLowerCase()} perto de ti<br>e a comparar as preferências escolhidas.</p>
  </div></main>`;
}

function error(){
  app.innerHTML=`<main class="flow">
    <div class="flowtop"><button class="icon-btn" onclick="setScreen('prefs')">←</button></div>
    <div class="flex"></div>
    <div class="errorbox">
      <h2>Não consegui pesquisar</h2>
      <p>${state.error}</p>
      <button class="cta" onclick="search()">Tentar novamente</button>
      <button class="secondary" onclick="setScreen('prefs')">Rever preferências</button>
    </div>
    <div class="flex"></div>
  </main>`;
}

function map(r){return `https://www.openstreetmap.org/?mlat=${r.lat}&mlon=${r.lon}#map=18/${r.lat}/${r.lon}`}
function why(r){
  const m=(state.mood||'especial').toLowerCase();
  const details=(r.matchDetails||[]).slice(0,3);
  const reason=details.length?details.join(', '):'proximidade e contexto';
  return `A Nomi escolheu este para ${intentLabels[state.intent].toLowerCase()}, num momento ${m}, porque combina ${reason} e fica a ${r.distanceKm.toFixed(1)} km.`;
}
function isFav(id){return state.favorites.some(x=>x.id===id)}
function fav(id){
  const r=state.results.find(x=>x.id===id);
  if(!r)return;
  state.favorites=isFav(id)?state.favorites.filter(x=>x.id!==id):[r,...state.favorites];
  save();render();
  toast(isFav(id)?'Guardado nos favoritos':'Removido dos favoritos');
}

function result(){
  const [f,...rest]=state.results;
  const bg=f.imageUrl?`style="background-image:url('${String(f.imageUrl).replace(/'/g,"%27")}')"`:'';
  const cls='maincard has-photo';
  const direct=`<div class="direct-links">
    ${f.website?`<a class="website" target="_blank" rel="noopener" href="${f.website}">Site</a>`:''}
    <a class="google" target="_blank" rel="noopener" href="${f.googleUrl||map(f)}">Abrir restaurante</a>
  </div>`;

  app.innerHTML=`<main class="results">
    <div class="rhead">
      <button class="icon-btn" onclick="setScreen('prefs')">←</button>
      <b>Nomi encontrou para ti</b>
      <button class="icon-btn" onclick="search()">↻</button>
    </div>

    <article class="${cls}" ${bg}>
      <div class="badge">♥ ${f.score}%<br>match</div>
      <h2>${f.name}</h2>
      <div class="meta">${f.cuisine}${f.address?` · ${f.address}`:''}</div>
      <p class="why">${why(f)}</p>
      <div class="stats">
        <span>⌖ ${f.distanceKm.toFixed(1)} km</span>
        ${f.rating?`<span>★ ${f.rating}${f.userRatingCount?` (${f.userRatingCount})`:''}</span>`:''}
        <button class="fav" onclick="fav('${f.id}')">${isFav(f.id)?'♥':'♡'}</button>
      </div>
      ${direct}
    </article>

    <h3 class="sectiontitle">Outras excelentes opções</h3>
    ${rest.slice(0,5).map(r=>`
      <article class="alt with-photo">
        <img class="alt-photo" src="${r.imageUrl}" alt="">
        <div>
          <h3>${r.name}</h3>
          <p>${r.cuisine} · ${r.distanceKm.toFixed(1)} km${r.address?` · ${r.address}`:''}</p>
        </div>
        <a target="_blank" rel="noopener" href="${r.googleUrl||map(r)}">Abrir</a>
      </article>`).join('')}

    <button class="cta" onclick="toast('A Nomi decidiu: ${f.name.replace(/'/g,'')}')">🎲 Decide por mim</button>
    <div class="note">
      Resultados ao vivo via ${state.provider}.
      ${state.fallbackNote?` ${state.fallbackNote}`:''}
      As imagens são fotografias quando disponíveis; caso contrário mostram o mapa real da localização.
    </div>
  </main>`;
}

function favorites(){
  app.innerHTML=`<main class="screen"><div class="shell"><section class="list content">
    <button class="icon-btn" onclick="setScreen('home')">←</button>
    <h1>Favoritos</h1>
    ${state.favorites.length?state.favorites.map(f=>`
      <div class="saved">
        <div><b>${f.name}</b><small>${f.cuisine||''} · ${(f.distanceKm||0).toFixed(1)} km</small></div>
        <button class="icon-btn" onclick="state.favorites=state.favorites.filter(x=>x.id!=='${f.id}');save();render()">♥</button>
      </div>`).join(''):`<div class="empty">Ainda não guardaste opções.</div>`}
  </section>${nav('favorites')}</div></main>`;
}

function decisions(){
  app.innerHTML=`<main class="screen"><div class="shell"><section class="list content">
    <button class="icon-btn" onclick="setScreen('home')">←</button>
    <h1>Decisões</h1>
    ${state.history.length?state.history.map(h=>`
      <div class="history">
        <b>${h.restaurant}</b>
        <small>${intentLabels[h.intent||'eat']} · ${h.mood} · ${h.budget} € · até ${h.distance} min · ${new Date(h.at).toLocaleDateString('pt-PT')}</small>
      </div>`).join(''):`<div class="empty">As tuas decisões aparecerão aqui.</div>`}
  </section>${nav('decisions')}</div></main>`;
}

function profile(){
  app.innerHTML=`<main class="screen"><div class="shell"><section class="list content">
    <button class="icon-btn" onclick="setScreen('home')">←</button>
    <h1>Perfil</h1>
    <div class="profile">
      <div><span>Nome</span><b>Pedro</b></div>
      <div><span>Favoritos</span><b>${state.favorites.length}</b></div>
      <div><span>Decisões</span><b>${state.history.length}</b></div>
      <div><span>Pesquisa</span><b>Ao vivo e contextual</b></div>
      <div><span>Versão</span><b>1.4.0</b></div>
    </div>
  </section>${nav('profile')}</div></main>`;
}

function back(){
  const o=['home','mood','budget','distance','prefs','result'];
  const i=o.indexOf(state.screen);
  setScreen(o[Math.max(0,i-1)]);
}

function openDrawer(){
  const overlay=document.createElement('div');
  overlay.id='drawerLayer';
  overlay.innerHTML=`<div class="drawer-backdrop" onclick="closeDrawer()"></div><aside class="drawer">
    <button class="close" onclick="closeDrawer()">×</button>
    <div class="drawer-brand"><img src="./assets/icon-192.png"><div><b>Nomi</b><small>Stop searching. Start deciding.</small></div></div>
    <button onclick="closeDrawer();setScreen('home')">Explorar</button>
    <button onclick="closeDrawer();setScreen('favorites')">Favoritos</button>
    <button onclick="closeDrawer();setScreen('decisions')">Decisões anteriores</button>
    <button onclick="closeDrawer();setScreen('profile')">Perfil e preferências</button>
    <button onclick="clearNomiData()">Limpar dados locais</button>
    <div class="drawer-note">A Nomi pesquisa opções reais e volta a ordená-las em cada pesquisa, segundo o tipo de saída, mood, orçamento, distância e preferências.</div>
  </aside>`;
  document.body.appendChild(overlay);
}
function closeDrawer(){document.getElementById('drawerLayer')?.remove()}
function clearNomiData(){
  localStorage.removeItem('nomi:favorites');
  localStorage.removeItem('nomi:history');
  state.favorites=[];state.history=[];
  closeDrawer();toast('Dados locais eliminados');render();
}

function render(){
  ({
    home,mood,budget,distance,prefs:preferences,
    searching,error,result,favorites,decisions,profile
  }[state.screen]||home)();
}
render();
dismissStartupSplash();
