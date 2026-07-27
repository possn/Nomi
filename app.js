
const app = document.getElementById('app');
const toastEl = document.getElementById('toast');

const initial = {
  screen:'home',
  mood:null,
  budget:30,
  distance:15,
  prefs:[],
  favorites: JSON.parse(localStorage.getItem('nomi:favorites') || '[]'),
  history: JSON.parse(localStorage.getItem('nomi:history') || '[]'),
};

const state = {...initial};

const moods = [
  ['❤️','Romântico'],['🙂','Amigos'],['👨‍👩‍👧','Família'],
  ['💼','Trabalho'],['🍃','Relaxado'],['🎉','Celebrar']
];

const prefs = [
  ['🌅','Vista'],['🅿️','Estacionamento'],['🍷','Vinho'],['🌳','Esplanada'],
  ['🌿','Vegetariano'],['💚','Vegan'],['🧒','Crianças'],['🐕','Cães'],
  ['🍣','Sushi'],['🍝','Massa'],['🥩','Carne'],['🐟','Peixe']
];

function save(){
  localStorage.setItem('nomi:favorites', JSON.stringify(state.favorites));
  localStorage.setItem('nomi:history', JSON.stringify(state.history));
}

function toast(message){
  toastEl.textContent = message;
  toastEl.classList.add('show');
  clearTimeout(window.__toast);
  window.__toast = setTimeout(()=>toastEl.classList.remove('show'),1700);
}

function setScreen(screen){
  state.screen = screen;
  render();
  window.scrollTo(0,0);
}

function nav(active){
  const items=[['⌂','Explorar','home'],['♡','Favoritos','favorites'],['⚔','Decisões','decisions'],['♙','Perfil','profile']];
  return `<nav class="nav">${items.map(([icon,label,screen])=>`
    <button class="${active===screen?'active':''}" onclick="setScreen('${screen}')">
      <span class="nav-icon">${icon}</span>${label}
    </button>`).join('')}</nav>`;
}

function header(step,tone){
  return `<div class="flow-top">
    <button class="icon-btn" onclick="back()">←</button>
    <div class="stepcount">${step}/4</div><div style="width:31px"></div>
  </div>
  <div class="progress">${[1,2,3,4].map(i=>`<span class="${tone} ${i<=step?'on':''}"></span>`).join('')}</div>`;
}

function home(){
  app.innerHTML=`<main class="screen"><div class="page">
    <section class="content">
      <div class="home-top"><button class="icon-btn">☰</button><div class="avatar">PN</div></div>
      <div class="greeting">Boa noite, Pedro 👋</div>
      <h1 class="hero">O que te apetece<br>fazer hoje?</h1>
      <div class="home-actions">
        ${[
          ['🍽️','Comer','primary'],['☕','Café',''],['🍸','Beber um copo',''],
          ['🍰','Sobremesa',''],['🎲','Surpreende-me','sage']
        ].map(([e,l,c])=>`<button class="home-action ${c}" onclick="startFlow()"><span class="emoji">${e}</span>${l}</button>`).join('')}
      </div>
    </section>${nav('home')}
  </div></main>`;
}

function startFlow(){
  state.mood=null; state.budget=30; state.distance=15; state.prefs=[];
  setScreen('mood');
}

function mood(){
  app.innerHTML=`<main class="flow">${header(1,'coral')}
    <h1 class="flow-title">Qual é o mood?</h1>
    <p class="flow-sub">Escolhe o que melhor descreve<br>este momento.</p>
    <div class="grid">${moods.map(([e,l])=>`
      <button class="choice ${state.mood===l?'selected':''}" onclick="state.mood='${l}';render()">
        <span class="choice-emoji">${e}</span>${l}
      </button>`).join('')}</div>
    <div class="flex"></div>
    <button class="cta" onclick="setScreen('budget')">Continuar</button>
  </main>`;
}

function budget(){
  const marks=[10,20,30,50,100];
  app.innerHTML=`<main class="flow">${header(2,'coral')}
    <h1 class="flow-title">Quanto queres gastar<br>por pessoa?</h1>
    <p class="flow-sub">Arrasta o seletor</p>
    <div class="value">${state.budget} €</div>
    <div class="slider-wrap">
      <input class="range" type="range" min="0" max="4" step="1" value="${marks.indexOf(state.budget)}"
        oninput="state.budget=[10,20,30,50,100][this.value];render()">
      <div class="range-labels"><span>10 €</span><span>20 €</span><span>30 €</span><span>50 €</span><span>100 €+</span></div>
    </div>
    <div class="flex"></div><button class="cta" onclick="setScreen('distance')">Continuar</button>
  </main>`;
}

function distance(){
  const marks=[5,10,15,20,30];
  app.innerHTML=`<main class="flow">${header(3,'sage')}
    <h1 class="flow-title">Até onde vais?</h1>
    <p class="flow-sub">Tempo máximo de deslocação</p>
    <div class="value">${state.distance} min</div>
    <div class="slider-wrap">
      <input class="range sage" type="range" min="0" max="4" step="1" value="${marks.indexOf(state.distance)}"
        oninput="state.distance=[5,10,15,20,30][this.value];render()">
      <div class="range-labels"><span>5 min</span><span>10 min</span><span>15 min</span><span>20 min</span><span>30+</span></div>
    </div>
    <div class="flex"></div><button class="cta sage" onclick="setScreen('prefs')">Continuar</button>
  </main>`;
}

function preferences(){
  app.innerHTML=`<main class="flow">${header(4,'sage')}
    <h1 class="flow-title">O que é importante<br>para ti hoje?</h1>
    <p class="flow-sub">Podes escolher várias opções</p>
    <div class="grid compact">${prefs.map(([e,l])=>`
      <button class="choice compact ${state.prefs.includes(l)?'selected':''}" onclick="togglePref('${l}')">
        <span class="choice-emoji">${e}</span>${l}
      </button>`).join('')}</div>
    <div class="flex"></div><button class="cta sage" onclick="showResult()">Continuar</button>
  </main>`;
}

function togglePref(pref){
  state.prefs = state.prefs.includes(pref) ? state.prefs.filter(x=>x!==pref) : [...state.prefs,pref];
  render();
}

function showResult(){
  const entry={
    at:new Date().toISOString(),
    mood:state.mood || 'Especial',
    budget:state.budget,
    distance:state.distance,
    prefs:[...state.prefs],
    restaurant:'Casa Mia'
  };
  state.history=[entry,...state.history].slice(0,12);
  save();
  setScreen('result');
}

function explanation(){
  const mood=(state.mood || 'especial').toLowerCase();
  const extras=state.prefs.slice(0,2).join(' e ').toLowerCase();
  return `Escolhemos este porque procuras um jantar ${mood}, queres gastar cerca de ${state.budget} € por pessoa, fica a apenas 8 minutos e ${extras?`combina com ${extras}`:'tem um ambiente tranquilo'}.`;
}

function isFav(){return state.favorites.some(x=>x.id==='casa-mia')}

function toggleFavorite(){
  if(isFav()){
    state.favorites=state.favorites.filter(x=>x.id!=='casa-mia');
    toast('Removido dos favoritos');
  }else{
    state.favorites.unshift({id:'casa-mia',name:'Casa Mia',meta:'Italiana · Romântico · €€',image:'./assets/casa-mia.jpg'});
    toast('Guardado nos favoritos');
  }
  save(); render();
}

function result(){
  app.innerHTML=`<main class="result">
    <div class="result-head">
      <button class="icon-btn" onclick="back()">←</button>
      <div class="eyebrow">Nomi encontrou para ti</div>
      <button class="icon-btn" onclick="resetFlow()">↻</button>
    </div>
    <article class="hero-card">
      <img src="./assets/casa-mia.jpg" alt="Casa Mia">
      <div class="scrim"></div><div class="match">♥ 95%<br>match</div>
      <div class="hero-info">
        <h2 class="restaurant-name">Casa Mia</h2>
        <div class="restaurant-meta">Italiana · Romântico · €€</div>
        <p class="why">${explanation()}</p>
        <div class="stats"><span>◷ 8 min</span><span>★ 4,7 (1286)</span><span>€ €€</span>
          <button class="fav-round" onclick="toggleFavorite()">${isFav()?'♥':'♡'}</button>
        </div>
      </div>
    </article>
    <h3 class="section-title">Outras excelentes opções</h3>
    ${[
      ['./assets/osteria.jpg','Osteria Nostra','Italiana · 10 min · ★ 4,6'],
      ['./assets/luce.jpg','Luce Restaurant','Mediterrânea · 12 min · ★ 4,5']
    ].map(([img,name,meta])=>`<div class="alt"><img src="${img}"><div><div class="alt-name">${name}</div><div class="alt-meta">${meta}</div></div><button>♡</button></div>`).join('')}
    <button class="cta" onclick="toast('A Nomi decidiu: Casa Mia')">🎲 Decide por mim</button>
  </main>`;
}

function favorites(){
  app.innerHTML=`<main class="screen"><div class="page">
    <section class="list-page content"><div class="section-head"><button class="icon-btn" onclick="setScreen('home')">←</button></div>
      <h1 class="page-title">Favoritos</h1>
      ${state.favorites.length?state.favorites.map(f=>`
        <div class="saved-card"><img src="${f.image}"><div><b>${f.name}</b><small>${f.meta}</small></div>
        <button class="icon-btn" onclick="toggleFavorite()">♥</button></div>`).join(''):
        `<div class="empty">Ainda não guardaste restaurantes.<br><br>Usa o coração numa recomendação.</div>`}
    </section>${nav('favorites')}
  </div></main>`;
}

function decisions(){
  app.innerHTML=`<main class="screen"><div class="page">
    <section class="list-page content"><div class="section-head"><button class="icon-btn" onclick="setScreen('home')">←</button></div>
      <h1 class="page-title">Decisões</h1>
      ${state.history.length?state.history.map(h=>`
        <div class="history-card"><b>${h.restaurant}</b>
          <div>${h.mood} · ${h.budget} € · até ${h.distance} min</div>
          <small>${new Date(h.at).toLocaleDateString('pt-PT')}</small>
        </div>`).join(''):
        `<div class="empty">As tuas decisões aparecerão aqui.</div>`}
    </section>${nav('decisions')}
  </div></main>`;
}

function profile(){
  app.innerHTML=`<main class="screen"><div class="page">
    <section class="list-page content"><div class="section-head"><button class="icon-btn" onclick="setScreen('home')">←</button></div>
      <h1 class="page-title">Perfil</h1>
      <div class="profile-card">
        <div class="profile-line"><span>Nome</span><b>Pedro</b></div>
        <div class="profile-line"><span>Orçamento habitual</span><b>${state.budget} €</b></div>
        <div class="profile-line"><span>Distância habitual</span><b>${state.distance} min</b></div>
        <div class="profile-line"><span>Favoritos</span><b>${state.favorites.length}</b></div>
        <div class="profile-line"><span>Decisões</span><b>${state.history.length}</b></div>
      </div>
      <button class="cta sage" onclick="installHelp()">Adicionar ao ecrã principal</button>
    </section>${nav('profile')}
  </div></main>`;
}

function installHelp(){
  toast('Safari: Partilhar → Adicionar ao ecrã principal');
}

function back(){
  const order=['home','mood','budget','distance','prefs','result'];
  const i=order.indexOf(state.screen);
  setScreen(order[Math.max(0,i-1)]);
}

function resetFlow(){
  state.mood=null; state.budget=30; state.distance=15; state.prefs=[]; setScreen('home');
}

function render(){
  ({home,mood,budget,distance,prefs:preferences,result,favorites,decisions,profile}[state.screen] || home)();
}

render();
