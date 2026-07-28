
const app=document.getElementById('app'),toastEl=document.getElementById('toast');
const state={
 screen:'home',mood:null,budget:30,distance:15,prefs:[],results:[],provider:'',
 favorites:JSON.parse(localStorage.getItem('nomi:favorites')||'[]'),
 history:JSON.parse(localStorage.getItem('nomi:history')||'[]')
};
const moods=[['❤️','Romântico'],['🙂','Amigos'],['👨‍👩‍👧','Família'],['💼','Trabalho'],['🍃','Relaxado'],['🎉','Celebrar']];
const prefs=[['🌅','Vista'],['🅿️','Estacionamento'],['🍷','Vinho'],['🌳','Esplanada'],['🌿','Vegetariano'],['💚','Vegan'],['🧒','Crianças'],['🐕','Cães'],['🍣','Sushi'],['🍝','Massa'],['🥩','Carne'],['🐟','Peixe'],['🤫','Silêncio'],['♿','Acessível'],['🌙','Aberto agora'],['💳','Cartão']];

function save(){localStorage.setItem('nomi:favorites',JSON.stringify(state.favorites));localStorage.setItem('nomi:history',JSON.stringify(state.history))}
function toast(t){toastEl.textContent=t;toastEl.classList.add('show');clearTimeout(window._t);window._t=setTimeout(()=>toastEl.classList.remove('show'),1700)}
function setScreen(s){state.screen=s;render();scrollTo(0,0)}
function nav(a){return `<nav class="nav">${[['⌂','Explorar','home'],['♡','Favoritos','favorites'],['⚔','Decisões','decisions'],['♙','Perfil','profile']].map(([i,l,s])=>`<button class="${a===s?'active':''}" onclick="setScreen('${s}')"><span class="ni">${i}</span>${l}</button>`).join('')}</nav>`}
function head(n,t){return `<div class="flowtop"><button class="icon-btn" onclick="back()">←</button><div class="step">${n}/4</div><div></div></div><div class="progress">${[1,2,3,4].map(i=>`<span class="${t} ${i<=n?'on':''}"></span>`).join('')}</div>`}

function home(){app.innerHTML=`<main class="screen"><div class="shell"><section class="content"><div class="top"><button class="icon-btn menu" onclick="openDrawer()">☰</button><div class="avatar">PN</div></div><div class="greeting">Boa noite, Pedro 👋</div><h1 class="hero">O que te apetece<br>fazer hoje?</h1><div class="actions">${[['🍽️','Comer','primary'],['☕','Café',''],['🍸','Beber um copo',''],['🍰','Sobremesa',''],['🎲','Surpreende-me','sage']].map(([e,l,c])=>`<button class="action ${c}" onclick="start()"><span class="e">${e}</span>${l}</button>`).join('')}</div></section>${nav('home')}</div></main>`}
function start(){Object.assign(state,{mood:null,budget:30,distance:15,prefs:[],results:[]});setScreen('mood')}
function mood(){app.innerHTML=`<main class="flow">${head(1,'coral')}<h1 class="title">Qual é o mood?</h1><p class="sub">Escolhe o que melhor descreve<br>este momento.</p><div class="grid">${moods.map(([e,l])=>`<button class="choice ${state.mood===l?'selected':''}" onclick="state.mood='${l}';render()"><span class="ce">${e}</span>${l}</button>`).join('')}</div><div class="flex"></div><button class="cta" onclick="setScreen('budget')">Continuar</button></main>`}
function budget(){const a=[10,20,30,50,100];app.innerHTML=`<main class="flow">${head(2,'coral')}<h1 class="title">Quanto queres gastar<br>por pessoa?</h1><p class="sub">Arrasta o seletor</p><div class="value">${state.budget} €</div><div class="slider"><input type="range" min="0" max="4" value="${a.indexOf(state.budget)}" oninput="state.budget=[10,20,30,50,100][this.value];render()"><div class="labels"><span>10 €</span><span>20 €</span><span>30 €</span><span>50 €</span><span>100 €+</span></div></div><div class="flex"></div><button class="cta" onclick="setScreen('distance')">Continuar</button></main>`}
function distance(){const a=[5,10,15,30,60];app.innerHTML=`<main class="flow">${head(3,'sage')}<h1 class="title">Até onde vais?</h1><p class="sub">Tempo máximo de deslocação</p><div class="value">${state.distance} min</div><div class="slider"><input class="sage" type="range" min="0" max="4" value="${a.indexOf(state.distance)}" oninput="state.distance=[5,10,15,30,60][this.value];render()"><div class="labels"><span>5 min</span><span>10 min</span><span>15 min</span><span>30 min</span><span>60 min</span></div></div><div class="flex"></div><button class="cta sage" onclick="setScreen('prefs')">Continuar</button></main>`}
function preferences(){app.innerHTML=`<main class="flow">${head(4,'sage')}<h1 class="title">O que é importante<br>para ti hoje?</h1><p class="sub">Podes escolher várias opções</p><div class="grid compact">${prefs.map(([e,l])=>`<button class="choice compact ${state.prefs.includes(l)?'selected':''}" onclick="toggle('${l}')"><span class="ce">${e}</span><span>${l}</span></button>`).join('')}</div><div class="flex"></div><button class="cta sage" onclick="search()">Pesquisar restaurantes</button></main>`}
function toggle(x){state.prefs=state.prefs.includes(x)?state.prefs.filter(v=>v!==x):[...state.prefs,x];render()}

function geo(){return new Promise((ok,no)=>navigator.geolocation?navigator.geolocation.getCurrentPosition(ok,()=>no(new Error('Ativa a localização no Safari para pesquisar restaurantes perto de ti.')),{enableHighAccuracy:true,timeout:15000,maximumAge:60000}):no(new Error('A localização não está disponível neste dispositivo.')))}
function radius(){return Math.min(50000,Math.max(1200,state.distance*700))}
function km(a,b,c,d){const R=6371,x=(c-a)*Math.PI/180,y=(d-b)*Math.PI/180,q=Math.sin(x/2)**2+Math.cos(a*Math.PI/180)*Math.cos(c*Math.PI/180)*Math.sin(y/2)**2;return 2*R*Math.asin(Math.sqrt(q))}
function title(s){return s.replace(/_/g,' ').replace(/\b\w/g,c=>c.toUpperCase())}
function normalize(el,loc){
 const t=el.tags||{},lat=el.lat||(el.center&&el.center.lat),lon=el.lon||(el.center&&el.center.lon);if(!lat||!lon)return null;
 const d=km(loc.lat,loc.lon,lat,lon),c=(t.cuisine||'Restaurante').split(';').map(title).join(' · ');
 let score=82-Math.min(22,d*5); const low=(t.cuisine||'').toLowerCase();
 if(state.prefs.includes('Sushi')&&low.includes('sushi'))score+=12;
 if(state.prefs.includes('Massa')&&(low.includes('italian')||low.includes('pizza')))score+=10;
 if(state.prefs.includes('Peixe')&&(low.includes('seafood')||low.includes('fish')))score+=10;
 if(state.prefs.includes('Carne')&&(low.includes('steak')||low.includes('barbecue')))score+=10;
 if(state.prefs.includes('Vegan')&&t.diet_vegan==='yes')score+=9;
 if(state.prefs.includes('Vegetariano')&&t.diet_vegetarian==='yes')score+=9;
 if(state.prefs.includes('Esplanada')&&t.outdoor_seating==='yes')score+=7;
 const wikimedia=t.wikimedia_commons||'', image=t.image||'';
 const imageUrl=image || (wikimedia ? `https://commons.wikimedia.org/wiki/Special:Redirect/file/${encodeURIComponent(wikimedia.replace(/^File:/,''))}` : '');
 const website=t.website||t['contact:website']||'';
 const googleUrl=`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent((t.name||'Restaurante')+' '+lat+','+lon)}`;
 return {id:`${el.type}-${el.id}`,name:t.name||t['name:pt']||'',cuisine:c,lat,lon,distanceKm:d,address:[t['addr:street'],t['addr:housenumber']].filter(Boolean).join(' '),score:Math.max(1,Math.min(99,Math.round(score))),imageUrl,website,googleUrl,openingHours:t.opening_hours||''}
}
async function overpass(loc){
 const q=`[out:json][timeout:25];(nwr["amenity"="restaurant"](around:${radius()},${loc.lat},${loc.lon});nwr["amenity"="cafe"](around:${radius()},${loc.lat},${loc.lon}););out center tags;`;
 const endpoints=['https://overpass-api.de/api/interpreter','https://overpass.kumi.systems/api/interpreter','https://overpass.nchc.org.tw/api/interpreter'];
 let last;
 for(const url of endpoints){
  try{
   const r=await fetch(url,{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded;charset=UTF-8'},body:'data='+encodeURIComponent(q)});
   if(!r.ok)throw new Error('HTTP '+r.status);
   const j=await r.json();
   const out=j.elements.map(e=>normalize(e,loc)).filter(x=>x&&x.name).sort((a,b)=>b.score-a.score);
   if(out.length)return out.slice(0,10);
  }catch(e){last=e}
 }
 throw new Error('A pesquisa de restaurantes está temporariamente indisponível. Tenta novamente dentro de alguns segundos.');
}
async function google(proxy,loc){
 const r=await fetch(proxy,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({latitude:loc.lat,longitude:loc.lon,radiusMeters:radius(),mood:state.mood,budget:state.budget,preferences:state.prefs,maxResults:10})});
 if(!r.ok)throw new Error('O serviço Google Places não respondeu.');
 const j=await r.json();
 return (j.places||j.results||[]).map((p,i)=>({id:p.id||p.placeId||`g${i}`,name:p.displayName?.text||p.name,cuisine:p.primaryTypeDisplayName?.text||p.primaryType||'Restaurante',lat:p.location?.latitude||p.lat,lon:p.location?.longitude||p.lon,distanceKm:p.distanceKm||0,address:p.formattedAddress||'',score:p.matchScore||95-i*4,rating:p.rating,userRatingCount:p.userRatingCount,imageUrl:p.photoUrl||p.imageUrl||'',website:p.websiteUri||p.website||'',googleUrl:p.googleMapsUri||`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(p.displayName?.text||p.name||'Restaurante')}`,openingHours:p.currentOpeningHours?.weekdayDescriptions?.join(' · ')||''}));
}
async function search(){
 state.screen='searching';render();
 try{
  const p=await geo(),loc={lat:p.coords.latitude,lon:p.coords.longitude},proxy=window.NOMI_CONFIG?.GOOGLE_PLACES_PROXY_URL;
  state.results=proxy?await google(proxy,loc):await overpass(loc);state.provider=proxy?'Google Places':'OpenStreetMap';
  if(!state.results.length)throw new Error('Não encontrei restaurantes nesta distância. Aumenta o raio e tenta novamente.');
  const f=state.results[0];state.history=[{at:new Date().toISOString(),restaurant:f.name,mood:state.mood||'Especial',budget:state.budget,distance:state.distance},...state.history].slice(0,12);save();setScreen('result');
 }catch(e){state.error=e.message;setScreen('error')}
}
function searching(){app.innerHTML=`<main class="searching"><div><div class="spinner"></div><h2>A Nomi está a procurar</h2><p>A pesquisar restaurantes reais perto de ti<br>com as características escolhidas.</p></div></main>`}
function error(){app.innerHTML=`<main class="flow"><div class="flowtop"><button class="icon-btn" onclick="setScreen('prefs')">←</button></div><div class="flex"></div><div class="errorbox"><h2>Não consegui pesquisar</h2><p>${state.error}</p><button class="cta" onclick="search()">Tentar novamente</button><button class="secondary" onclick="setScreen('prefs')">Rever preferências</button></div><div class="flex"></div></main>`}
function map(r){return `https://www.openstreetmap.org/?mlat=${r.lat}&mlon=${r.lon}#map=18/${r.lat}/${r.lon}`}
function why(r){const m=(state.mood||'especial').toLowerCase(),p=state.prefs.slice(0,2).join(' e ').toLowerCase();return `A Nomi escolheu este por estar a ${r.distanceKm.toFixed(1)} km, encaixar num momento ${m}${p?` e aproximar-se de ${p}`:''}.`}
function isFav(id){return state.favorites.some(x=>x.id===id)}
function fav(id){const r=state.results.find(x=>x.id===id);state.favorites=isFav(id)?state.favorites.filter(x=>x.id!==id):[r,...state.favorites];save();render();toast(isFav(id)?'Guardado nos favoritos':'Removido dos favoritos')}
function result(){
 const [f,...rest]=state.results;
 const bg=f.imageUrl?`style="background-image:url('${String(f.imageUrl).replace(/'/g,"%27")}')"`:'';
 const cls=f.imageUrl?'maincard has-photo':'maincard';
 const direct=`<div class="direct-links">${f.website?`<a class="website" target="_blank" rel="noopener" href="${f.website}">Site</a>`:''}<a class="google" target="_blank" rel="noopener" href="${f.googleUrl||map(f)}">Abrir restaurante</a></div>`;
 app.innerHTML=`<main class="results"><div class="rhead"><button class="icon-btn" onclick="setScreen('prefs')">←</button><b>Nomi encontrou para ti</b><button class="icon-btn" onclick="search()">↻</button></div>
 <article class="${cls}" ${bg}><div class="badge">♥ ${f.score}%<br>match</div><h2>${f.name}</h2><div class="meta">${f.cuisine}${f.address?` · ${f.address}`:''}</div><p class="why">${why(f)}</p><div class="stats"><span>⌖ ${f.distanceKm.toFixed(1)} km</span>${f.rating?`<span>★ ${f.rating}</span>`:''}<button class="fav" onclick="fav('${f.id}')">${isFav(f.id)?'♥':'♡'}</button></div>${direct}</article>
 <h3 class="sectiontitle">Outras excelentes opções</h3>
 ${rest.slice(0,5).map(r=>`<article class="alt ${r.imageUrl?'with-photo':''}">${r.imageUrl?`<img class="alt-photo" src="${r.imageUrl}" alt="">`:''}<div><h3>${r.name}</h3><p>${r.cuisine} · ${r.distanceKm.toFixed(1)} km${r.address?` · ${r.address}`:''}</p></div><a target="_blank" rel="noopener" href="${r.googleUrl||map(r)}">Abrir</a></article>`).join('')}
 <button class="cta" onclick="toast('A Nomi decidiu: ${f.name.replace(/'/g,'')}')">🎲 Decide por mim</button><div class="note">Resultados ao vivo via ${state.provider}. Imagens aparecem quando a fonte do restaurante as disponibiliza.</div></main>`;
}
function favorites(){app.innerHTML=`<main class="screen"><div class="shell"><section class="list content"><button class="icon-btn" onclick="setScreen('home')">←</button><h1>Favoritos</h1>${state.favorites.length?state.favorites.map(f=>`<div class="saved"><div><b>${f.name}</b><small>${f.cuisine||''} · ${(f.distanceKm||0).toFixed(1)} km</small></div><button class="icon-btn" onclick="state.favorites=state.favorites.filter(x=>x.id!=='${f.id}');save();render()">♥</button></div>`).join(''):`<div class="empty">Ainda não guardaste restaurantes.</div>`}</section>${nav('favorites')}</div></main>`}
function decisions(){app.innerHTML=`<main class="screen"><div class="shell"><section class="list content"><button class="icon-btn" onclick="setScreen('home')">←</button><h1>Decisões</h1>${state.history.length?state.history.map(h=>`<div class="history"><b>${h.restaurant}</b><small>${h.mood} · ${h.budget} € · até ${h.distance} min · ${new Date(h.at).toLocaleDateString('pt-PT')}</small></div>`).join(''):`<div class="empty">As tuas decisões aparecerão aqui.</div>`}</section>${nav('decisions')}</div></main>`}
function profile(){app.innerHTML=`<main class="screen"><div class="shell"><section class="list content"><button class="icon-btn" onclick="setScreen('home')">←</button><h1>Perfil</h1><div class="profile"><div><span>Nome</span><b>Pedro</b></div><div><span>Favoritos</span><b>${state.favorites.length}</b></div><div><span>Decisões</span><b>${state.history.length}</b></div><div><span>Pesquisa</span><b>Ao vivo</b></div><div><span>Versão</span><b>1.2.0</b></div></div></section>${nav('profile')}</div></main>`}
function back(){const o=['home','mood','budget','distance','prefs','result'],i=o.indexOf(state.screen);setScreen(o[Math.max(0,i-1)])}

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
  <div class="drawer-note">A Nomi pesquisa opções reais perto de ti e ordena-as segundo o contexto escolhido.</div>
 </aside>`;
 document.body.appendChild(overlay);
}
function closeDrawer(){document.getElementById('drawerLayer')?.remove()}
function clearNomiData(){
 localStorage.removeItem('nomi:favorites');localStorage.removeItem('nomi:history');
 state.favorites=[];state.history=[];closeDrawer();toast('Dados locais eliminados');render();
}

function render(){({home,mood,budget,distance,prefs:preferences,searching,error,result,favorites,decisions,profile}[state.screen]||home)()}
render();
