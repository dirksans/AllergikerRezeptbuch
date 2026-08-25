(() => {
  'use strict';

  const APP_VERSION = '3.5.0';
  const DATA_VERSION = 5;
  const app = document.querySelector('#app');
  const modal = document.querySelector('#modal');
  const modalContent = document.querySelector('#modalContent');
  const toast = document.querySelector('#toast');
  const installButton = document.querySelector('#installButton');
  const moreButton = document.querySelector('#moreButton');
  const searchButton = document.querySelector('#searchButton');

  const state = {
    route:'home', profiles:[], pantry:[], userRecipes:[], shopping:[], settings:{}, activity:[], weeklyPlan:null,
    history:[], mappings:[], receipts:[], online:{query:'',results:[],loading:false,error:''}, installPrompt:null,
    receiptDraft:[], cookSession:null, generatedRecipe:null
  };

  const uid = prefix => `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2,8)}`;
  const normalize = value => window.SKData.normalize(value);
  const num = value => Number.parseFloat(String(value ?? '').replace(',','.')) || 0;
  const esc = value => String(value ?? '').replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
  const attr = esc;
  const todayISO = () => new Date().toISOString().slice(0,10);
  const formatDate = value => value ? new Intl.DateTimeFormat('de-DE').format(new Date(`${value}T12:00:00`)) : '–';
  const fmt = value => new Intl.NumberFormat('de-DE',{maximumFractionDigits:2}).format(Number(value)||0);
  const safeUrl = value => { try { const u=new URL(String(value||''),location.href); return ['http:','https:'].includes(u.protocol)?u.href:''; } catch { return ''; } };
  const splitList = value => String(value||'').split(',').map(v=>v.trim()).filter(Boolean);

  function showToast(message, duration=2600) {
    toast.textContent=message; toast.classList.add('show'); clearTimeout(showToast.timer);
    showToast.timer=setTimeout(()=>toast.classList.remove('show'),duration);
  }
  function openModal(html, className='') {
    modalContent.innerHTML=html; modal.className=`modal ${className}`.trim();
    if (typeof modal.showModal==='function') modal.showModal(); else modal.setAttribute('open','');
  }
  function closeModal(){ if(typeof modal.close==='function') modal.close(); else modal.removeAttribute('open'); modal.className='modal'; }
  const closeButton=()=>'<button type="button" class="icon-button" data-action="close-modal" aria-label="Schließen">×</button>';
  function setFormBusy(form,busy){ if(!form)return; form.querySelectorAll('button,input,select,textarea').forEach(el=>{ if(el.type!=='file') el.disabled=Boolean(busy); }); }
  function formError(form,message){ let n=form.querySelector('.form-error'); if(!n){n=document.createElement('div');n.className='notice danger form-error';form.prepend(n);} n.textContent=message; }
  async function runForm(form,task){ setFormBusy(form,true); form.querySelector('.form-error')?.remove(); try{await task();}catch(e){console.error(e);formError(form,e.message||'Die Änderung konnte nicht gespeichert werden.');}finally{if(document.contains(form))setFormBusy(form,false);} }

  async function loadState() {
    await window.SKData.load();
    const [profiles,pantry,userRecipes,shopping,settings,activity,weeklyPlan,history,mappings,receipts]=await Promise.all([
      SKDB.getAll('profiles'),SKDB.getAll('pantry'),SKDB.getAll('recipes'),SKDB.getAll('shopping'),SKDB.getAll('settings'),SKDB.getAll('activity'),SKDB.get('weeklyPlan','current-week'),SKDB.getAll('history'),SKDB.getAll('mappings'),SKDB.getAll('receipts')
    ]);
    state.profiles=profiles||[]; state.pantry=pantry||[]; state.userRecipes=(userRecipes||[]).map(normalizeStoredRecipe); state.shopping=shopping||[];
    state.settings=(settings||[]).find(x=>x.id==='main')||{}; state.activity=(activity||[]).sort((a,b)=>String(b.createdAt).localeCompare(String(a.createdAt)));
    state.weeklyPlan=window.SKPlanner.normalizeWeek(weeklyPlan); state.history=history||[]; state.mappings=mappings||[]; state.receipts=receipts||[];
    if (!weeklyPlan) await SKDB.put('weeklyPlan',state.weeklyPlan);
    if (!state.settings.initialized) await seedSettings();
    await migrateData();
  }

  function normalizeStoredRecipe(recipe) {
    const diet=normalize(recipe.diet);
    return {
      ...recipe,
      prepTime:recipe.prepTime ?? recipe.prep ?? 0,
      cookTime:recipe.cookTime ?? recipe.cook ?? 0,
      categories:Array.isArray(recipe.categories)?recipe.categories:(recipe.meal?[recipe.meal]:[]),
      vegetarian:typeof recipe.vegetarian==='boolean'?recipe.vegetarian:['vegetarisch','vegan'].includes(diet),
      vegan:typeof recipe.vegan==='boolean'?recipe.vegan:diet==='vegan',
      ingredients:(recipe.ingredients||[]).map(i=>({ingredientId:i.ingredientId||window.SKData.ingredient(i.name)?.id||'',...i})),
      steps:(recipe.steps||[]).map(s=>typeof s==='string'?s:s)
    };
  }

  async function seedSettings() {
    if (!state.profiles.length) {
      const owner={id:uid('person'),name:'Ich',role:'Besitzer',diet:'Omnivor',allergies:[],intolerances:[],likes:[],dislikes:[],portionFactor:1,createdAt:new Date().toISOString()};
      await SKDB.put('profiles',owner); state.profiles=[owner];
    }
    state.settings={id:'main',initialized:true,dataVersion:DATA_VERSION,selectedProfiles:[state.profiles[0].id],theme:'system',onlineEnabled:true,ocrEnabled:false,localMode:false,favorites:[],excludedRecipes:[],lastRoute:'home'};
    await SKDB.put('settings',state.settings);
    await SKDB.put('weeklyPlan',state.weeklyPlan);
  }

  async function migrateData() {
    for (const profile of state.profiles) {
      let profileChanged=false;
      if (!profile.portionFactor) { profile.portionFactor=1; profileChanged=true; }
      if (!Array.isArray(profile.likes)) { profile.likes=[]; profileChanged=true; }
      if (!Array.isArray(profile.dislikes)) { profile.dislikes=[]; profileChanged=true; }
      if (!Array.isArray(profile.allergies)) { profile.allergies=[]; profileChanged=true; }
      if (!Array.isArray(profile.intolerances)) { profile.intolerances=[]; profileChanged=true; }
      if (profileChanged) await SKDB.put('profiles',profile);
    }
    for (const item of state.pantry) {
      let itemChanged=false; const lib=SKData.ingredient(item.ingredientId||item.name);
      if (!item.ingredientId && lib) { item.ingredientId=lib.id; itemChanged=true; }
      if (!item.note && item.notes) { item.note=item.notes; itemChanged=true; }
      if (item.location==='Gefrierschrank') { item.location='Tiefkühler'; itemChanged=true; }
      if (!item.source) { item.source='Bestand'; itemChanged=true; }
      if (itemChanged) await SKDB.put('pantry',item);
    }
    for (const item of state.shopping) {
      if (!item.ingredientId) { const lib=SKData.ingredient(item.name); if(lib){item.ingredientId=lib.id;item.category=item.category||lib.category;await SKDB.put('shopping',item);} }
    }
    if (!(state.settings.selectedProfiles||[]).length && state.profiles.length) { state.settings.selectedProfiles=[state.profiles[0].id]; await SKDB.put('settings',{...state.settings,id:'main'}); }
    if (Number(state.settings.dataVersion||0)<DATA_VERSION) {
      state.settings={...state.settings,id:'main',initialized:true,dataVersion:DATA_VERSION,theme:state.settings.theme||'system',onlineEnabled:state.settings.onlineEnabled!==false,ocrEnabled:Boolean(state.settings.ocrEnabled),localMode:Boolean(state.settings.localMode),favorites:state.settings.favorites||[],excludedRecipes:state.settings.excludedRecipes||[]};
      // Kochverlauf aus Version 3 übernehmen, soweit vorhanden.
      for (const old of state.activity.filter(a=>a.type==='cook')) {
        if (!(await SKDB.get('history',`legacy_${old.id}`))) await SKDB.put('history',{id:`legacy_${old.id}`,type:'cooked',recipeId:'',name:old.title||'Gekochtes Gericht',cuisine:'',categories:[],servings:old.servings||null,createdAt:old.createdAt||new Date().toISOString()});
      }
      // Alter API-Key aus 3.0 nicht weiter persistent halten.
      delete state.settings.spoonacularKey; delete state.settings.recipeSource;
      await SKDB.put('settings',state.settings);
    }
    if (!state.weeklyPlan) { state.weeklyPlan=SKPlanner.emptyWeek(); await SKDB.put('weeklyPlan',state.weeklyPlan); }
    applyTheme();
  }

  async function saveSettings(patch){ state.settings={...state.settings,...patch,id:'main',initialized:true}; await SKDB.put('settings',state.settings); applyTheme(); }
  function applyTheme(){ const theme=state.settings.theme||'system'; document.documentElement.dataset.theme=theme; }
  function selectedProfiles(){ const ids=new Set(state.settings.selectedProfiles||[]); return state.profiles.filter(p=>ids.has(p.id)); }
  function allRecipes(){
    const favorites=new Set(state.settings.favorites||[]);
    const internal=(SKData.state.recipes||[]).map(r=>({...r,favorite:favorites.has(r.id)}));
    const users=state.userRecipes.map(r=>({...r,favorite:r.favorite||favorites.has(r.id)}));
    return [...users,...internal];
  }
  function recipeById(id){ return allRecipes().find(r=>r.id===id) || (state.generatedRecipe?.id===id?state.generatedRecipe:null); }
  function ingredientName(entry){ return entry.name || SKData.ingredient(entry)?.name || 'Unbekannte Zutat'; }

  function header(title,subtitle='',actions='') {
    return `<div class="page-header"><div><h1>${esc(title)}</h1>${subtitle?`<div class="muted">${esc(subtitle)}</div>`:''}</div><div class="header-actions">${actions}</div></div>`;
  }

  function personSelector(compact=false) {
    const selected=new Set(state.settings.selectedProfiles||[]);
    return `<div class="person-selector ${compact?'compact':''}"><div class="section-kicker">Mitessende Personen</div><div class="chips">${state.profiles.map(p=>`<button type="button" class="chip ${selected.has(p.id)?'active':''}" data-action="toggle-person" data-id="${attr(p.id)}" aria-pressed="${selected.has(p.id)}">${selected.has(p.id)?'✓ ':''}${esc(p.name)}</button>`).join('')||'<span class="muted">Noch kein Profil.</span>'}</div></div>`;
  }

  function safetyBadge(recipe, profiles=selectedProfiles()) {
    const a=SKAllergy.analyzeRecipe(recipe,profiles); const cls={clear:'safe',possible:'block',check:'check',unknown:'unknown'}[a.status];
    return `<span class="badge ${cls}">${esc(SKAllergy.statusText[a.status])}</span>`;
  }

  function expiryItems() {
    const today=new Date(`${todayISO()}T00:00:00`);
    return state.pantry.filter(p=>p.expiry).map(p=>({...p,days:Math.ceil((new Date(`${p.expiry}T00:00:00`)-today)/86400000)})).sort((a,b)=>a.days-b.days);
  }
  function recipeUsesExpiring(recipe, maxDays=7) {
    const expiring=expiryItems().filter(x=>x.days>=0&&x.days<=maxDays);
    return (recipe.ingredients||[]).some(i=>expiring.some(p=>(i.ingredientId&&p.ingredientId===i.ingredientId)||normalize(p.name)===normalize(ingredientName(i))));
  }

  function renderHome() {
    const profiles=selectedProfiles(); const target=SKRecipes.desiredServings(profiles); const expiry=expiryItems();
    const excluded=new Set(state.settings.excludedRecipes||[]);
    const ranked=SKRecipes.rankRecipes(allRecipes(),{pantry:state.pantry,profiles,history:state.history,targetServings:target}).filter(x=>x.safety.status!=='possible'&&!excluded.has(x.recipe.id)).slice(0,4);
    const generated=SKRecipes.generateFromPantry(state.pantry,profiles);
    return `${header('SicherKochen','Dein lokaler Küchenassistent')}
      ${personSelector(true)}
      <section class="dashboard-grid">
        <article class="card stat-card"><span class="stat-number">${state.pantry.length}</span><span>Lebensmittel im Vorrat</span></article>
        <article class="card stat-card"><span class="stat-number">${expiry.filter(x=>x.days>=0&&x.days<=3).length}</span><span>in 3 Tagen verbrauchen</span></article>
        <article class="card stat-card"><span class="stat-number">${state.shopping.filter(x=>!x.done).length}</span><span>Einkäufe offen</span></article>
      </section>
      <section class="card hero-card">
        <div><div class="section-kicker">Heute kochen</div><h2>Was kann ich heute kochen?</h2><p>Vorrat, ausgewählte Personen, Ablaufdaten und Abwechslung werden berücksichtigt.</p></div>
        <button class="button primary" data-action="today-suggestions">Vorschläge anzeigen</button>
      </section>
      <section><div class="section-title"><div><h2>Schnellaktionen</h2><span class="muted small">Häufige Aktionen mit wenigen Schritten</span></div></div>
        <div class="quick-grid">
          <button class="quick-card" data-action="open-receipt"><strong>Kassenbon</strong><span>Foto oder Text erfassen</span></button>
          <button class="quick-card" data-action="new-pantry"><strong>Produkt</strong><span>Zum Vorrat hinzufügen</span></button>
          <button class="quick-card" data-route="shopping"><strong>Einkauf</strong><span>Liste öffnen</span></button>
          <button class="quick-card" data-route="recipes"><strong>Rezeptsuche</strong><span>Intern & online</span></button>
          <button class="quick-card" data-action="leftovers"><strong>Reste</strong><span>„Muss weg“ prüfen</span></button>
          <button class="quick-card" data-route="planning"><strong>Wochenplan</strong><span>Woche planen</span></button>
        </div>
      </section>
      ${expiry.some(x=>x.days<0)?`<div class="notice danger"><strong>${expiry.filter(x=>x.days<0).length} Einträge sind über dem hinterlegten Datum.</strong> Sie werden nicht automatisch für Rezeptvorschläge als „muss weg“ bevorzugt. Zustand und Kennzeichnung prüfen.</div>`:''}
      ${expiry.some(x=>x.days>=0&&x.days<=3)?`<div class="notice warn"><strong>${expiry.filter(x=>x.days>=0&&x.days<=3).length} Lebensmittel sollten in den nächsten 3 Tagen geprüft bzw. verbraucht werden.</strong></div>`:''}
      <section><div class="section-title"><div><h2>Passende Vorschläge</h2><span class="muted small">für ca. ${fmt(target)} Portionen</span></div><button class="button secondary compact" data-route="recipes">Alle</button></div>
        <div class="card-grid">${ranked.map(x=>renderRecipeCard(x.recipe,x)).join('') || '<div class="empty">Noch keine passenden Rezepte gefunden.</div>'}</div>
        ${generated?`<div class="notice"><strong>Regelgenerator:</strong> Aus deinem Vorrat lässt sich zusätzlich „${esc(generated.name)}“ erzeugen. <button class="link-button" data-action="view-generated">Ansehen</button></div>`:''}
      </section>
      ${state.history.filter(h=>h.type==='cooked').length?`<section><div class="section-title"><div><h2>Zuletzt gekocht</h2><span class="muted small">Verlauf und schnelle Wiederholung</span></div></div><div class="list">${state.history.filter(h=>h.type==='cooked').sort((a,b)=>String(b.createdAt).localeCompare(String(a.createdAt))).slice(0,3).map(h=>`<div class="list-item"><div class="list-main"><strong>${esc(h.name)}</strong><div class="meta"><span>${new Intl.DateTimeFormat('de-DE').format(new Date(h.createdAt))}</span>${h.rating?`<span>${'★'.repeat(Math.round(h.rating))}</span>`:''}</div></div>${recipeById(h.recipeId)?`<button class="button secondary compact" data-action="view-recipe" data-id="${attr(h.recipeId)}">Nochmal</button>`:''}</div>`).join('')}</div></section>`:''}
      <div class="notice safety"><strong>Allergiehinweis:</strong> Die App bewertet nur hinterlegte Daten. Produktinformationen, Zutatenlisten, Spurenhinweise und Herstellerangaben haben Vorrang.</div>`;
  }

  function renderRecipeCard(recipe, scored=null) {
    const profiles=selectedProfiles(); const target=SKRecipes.desiredServings(profiles); const av=scored?.availability || SKRecipes.availability(recipe,state.pantry,target);
    const image=recipe.image&&safeUrl(recipe.image)?`<img class="recipe-thumb" src="${attr(safeUrl(recipe.image))}" alt="" loading="lazy">`:'<div class="recipe-placeholder">🍲</div>';
    const fav=(state.settings.favorites||[]).includes(recipe.id)||recipe.favorite;
    return `<article class="card recipe-card">${image}<div class="recipe-card-body"><div class="recipe-top"><div><h3>${esc(recipe.name)}</h3><div class="meta"><span>${esc(recipe.cuisine||'International')}</span><span>${num(recipe.prepTime||recipe.prep)+num(recipe.cookTime||recipe.cook)} Min.</span></div></div><button class="icon-button" data-action="toggle-favorite" data-id="${attr(recipe.id)}" aria-label="Favorit">${fav?'★':'☆'}</button></div>
      <div class="badge-row">${safetyBadge(recipe,profiles)}<span class="badge neutral">${Math.max(0,av.total-av.missing.length)}/${av.total} vorhanden</span></div>
      ${av.missing.length<=2&&av.missing.length?`<p class="small muted">Es fehlen nur ${av.missing.length} Zutaten.</p>`:''}
      <button class="button secondary full" data-action="view-recipe" data-id="${attr(recipe.id)}">Rezept öffnen</button></div></article>`;
  }

  function renderRecipes() {
    const profiles=selectedProfiles(); const target=SKRecipes.desiredServings(profiles); const q=normalize(state.settings.recipeQuery||'');
    const filter=state.settings.recipeFilter||'all';
    let recipes=allRecipes().filter(r=>{
      const text=normalize([r.name,r.cuisine,...(r.categories||[]),...(r.ingredients||[]).map(ingredientName)].join(' '));
      if (q && !text.includes(q)) return false;
      if (filter==='vegetarian' && !(r.vegetarian||r.vegan)) return false;
      if (filter==='vegan' && !r.vegan) return false;
      if (filter==='15' && num(r.prepTime)+num(r.cookTime)>15) return false;
      if (filter==='30' && num(r.prepTime)+num(r.cookTime)>30) return false;
      if (filter==='pantry' && SKRecipes.availability(r,state.pantry,target).missing.length) return false;
      if (filter==='leftovers' && !recipeUsesExpiring(r)) return false;
      return true;
    });
    recipes=SKRecipes.rankRecipes(recipes,{pantry:state.pantry,profiles,history:state.history,targetServings:target}).map(x=>x.recipe);
    return `${header('Rezepte','Intern, eigene Rezepte und optionale Online-Suche','<button class="button secondary compact" data-action="new-recipe">+ Eigenes Rezept</button>')}
      ${personSelector(true)}
      <section class="card filters">
        <div class="form-grid"><label>Suche<input id="recipeQuery" type="search" value="${attr(state.settings.recipeQuery||'')}" placeholder="z. B. Kartoffeln, Curry, Italienisch"></label>
        <label>Filter<select id="recipeFilter"><option value="all">Alle</option><option value="vegetarian">Vegetarisch</option><option value="vegan">Vegan</option><option value="15">unter 15 Minuten</option><option value="30">unter 30 Minuten</option><option value="pantry">nur vorhandene Zutaten</option><option value="leftovers">Resteverwertung</option></select></label></div>
      </section>
      <div class="section-title"><div><h2>Rezeptbibliothek</h2><span class="muted small">${recipes.length} Treffer</span></div></div>
      <div class="card-grid">${recipes.map(r=>renderRecipeCard(r)).join('')||'<div class="empty">Keine passenden lokalen Rezepte gefunden.</div>'}</div>
      <section class="card online-card"><div class="section-title"><div><h2>Online-Rezepte</h2><span class="muted small">TheMealDB – Suchbegriffe werden extern übertragen</span></div></div>
        ${state.settings.onlineEnabled===false?'<div class="notice">Externe Rezeptdienste sind in den Einstellungen deaktiviert.</div>':`<form id="onlineSearchForm" class="inline-form"><input name="query" value="${attr(state.online.query||'')}" placeholder="z. B. Lasagne, Curry, Kartoffelsuppe" required><button class="button primary" type="submit">Suchen</button></form>
        ${state.online.loading?'<div class="loading">Online-Suche läuft …</div>':''}${state.online.error?`<div class="notice danger">${esc(state.online.error)}</div>`:''}
        <div class="button-row"><button class="button secondary compact" type="button" data-action="search-chefkoch">Zusätzlich bei Chefkoch suchen</button></div>
        <div class="card-grid online-results">${state.online.results.map(renderOnlineCard).join('')}</div>`}
      </section>`;
  }

  function renderOnlineCard(recipe) {
    const a=SKAllergy.analyzeRecipe(recipe,selectedProfiles());
    return `<article class="card recipe-card">${recipe.image?`<img class="recipe-thumb" src="${attr(safeUrl(recipe.image))}" alt="" loading="lazy">`:'<div class="recipe-placeholder">🌐</div>'}<div class="recipe-card-body"><h3>${esc(recipe.name)}</h3><div class="meta"><span>${esc(recipe.cuisine||'Online')}</span><span>${esc(recipe.source?.provider||'Externe Quelle')}</span></div><div class="badge-row"><span class="badge ${{clear:'safe',possible:'block',check:'check',unknown:'unknown'}[a.status]}">${esc(SKAllergy.statusText[a.status])}</span></div><button class="button secondary full" data-action="view-online" data-id="${attr(recipe.externalId||recipe.id)}">Untersuchen</button></div></article>`;
  }

  function renderPantry() {
    const q=normalize(state.settings.pantryQuery||''); const locationFilter=state.settings.pantryLocation||'Alle';
    const expiry=expiryItems();
    const items=state.pantry.filter(p=>(!q||normalize(p.name).includes(q))&&(locationFilter==='Alle'||p.location===locationFilter)).sort((a,b)=>String(a.name).localeCompare(String(b.name),'de'));
    return `${header('Vorrat','Lebensmittel, Mengen und Mindesthaltbarkeitsdaten','<button class="button primary compact" data-action="new-pantry">+ Produkt</button>')}
      <section class="card filters"><div class="form-grid"><label>Suche<input id="pantryQuery" type="search" value="${attr(state.settings.pantryQuery||'')}" placeholder="Lebensmittel suchen"></label><label>Lagerort<select id="pantryLocation">${['Alle','Kühlschrank','Tiefkühler','Vorratsschrank','Gewürze','Sonstiges'].map(x=>`<option ${locationFilter===x?'selected':''}>${x}</option>`).join('')}</select></label></div></section>
      <div class="quick-actions"><button class="button secondary compact" data-action="leftovers">Muss weg</button><button class="button secondary compact" data-action="open-receipt">Kassenbon hinzufügen</button></div>
      <div class="list">${items.map(renderPantryItem).join('')||'<div class="empty">Noch keine Lebensmittel im Vorrat.</div>'}</div>
      ${expiry.length?`<div class="notice small">Typische Haltbarkeiten und hinterlegte MHDs sind nur Orientierung. Zustand, Lagerung und Produktkennzeichnung prüfen.</div>`:''}`;
  }

  function renderPantryItem(item) {
    const lib=SKData.ingredient(item.ingredientId||item.name); let expiry='';
    if(item.expiry){ const found=expiryItems().find(x=>x.id===item.id); const cls=found?.days<0?'block':found?.days<=3?'check':'neutral'; const label=found?.days<0?`${Math.abs(found.days)} T. über Datum`:found?.days===0?'heute':`${found.days} T.`; expiry=`<span class="badge ${cls}">${label}</span>`; }
    return `<article class="list-item pantry-item"><div class="list-main"><div class="list-title"><strong>${esc(item.name)}</strong>${expiry}</div><div class="meta"><span>${fmt(item.quantity)} ${esc(item.unit)}</span><span>${esc(item.location||lib?.storage||'Sonstiges')}</span>${item.opened?'<span>geöffnet</span>':''}${item.expiry?`<span>MHD ${formatDate(item.expiry)}</span>`:''}</div></div><div class="item-actions"><button class="icon-button" data-action="pantry-menu" data-id="${attr(item.id)}" aria-label="Aktionen">•••</button></div></article>`;
  }

  function renderShopping() {
    const open=state.shopping.filter(x=>!x.done); const done=state.shopping.filter(x=>x.done);
    const grouped=groupShopping(open);
    return `${header('Einkauf','Listen nach Kategorien sortiert','<button class="button primary compact" data-action="new-shopping">+ Eintrag</button>')}
      <div class="quick-actions"><button class="button secondary compact" data-action="shopping-generator">Liste erzeugen</button><button class="button secondary compact" data-action="all-bought" ${open.length?'':'disabled'}>Alles eingekauft</button>${done.length?'<button class="button secondary compact" data-action="done-to-pantry">Erledigtes zum Vorrat</button>':''}</div>
      ${Object.entries(grouped).map(([category,items])=>`<section class="shopping-group"><h2>${esc(category)}</h2><div class="list">${items.map(renderShoppingItem).join('')}</div></section>`).join('')||'<div class="empty">Die Einkaufsliste ist leer.</div>'}
      ${done.length?`<section class="shopping-group done"><div class="section-title"><h2>Erledigt (${done.length})</h2><button class="link-button" data-action="clear-done">Entfernen</button></div><div class="list">${done.map(renderShoppingItem).join('')}</div></section>`:''}`;
  }

  const shoppingOrder=['Obst und Gemüse','Fleisch/Fisch','Kühlung','TK','Trockenware','Konserven','Soßen/Gewürze','Sonstiges'];
  function shoppingCategory(item){
    const c=normalize(item.category||SKData.ingredient(item.ingredientId||item.name)?.category);
    if(/gemuse|obst/.test(c))return 'Obst und Gemüse'; if(/protein/.test(c)){const lib=SKData.ingredient(item.ingredientId||item.name);return lib&&!lib.vegetarian?'Fleisch/Fisch':'Kühlung';}
    if(item.location==='Tiefkühler'||/tk|tief/.test(c))return 'TK'; if(/kuhlung/.test(c))return 'Kühlung'; if(/konserven/.test(c))return 'Konserven'; if(/sossen|gewurze|ole/.test(c))return 'Soßen/Gewürze'; if(/kohlenhydrate|trocken|nusse/.test(c))return 'Trockenware'; return 'Sonstiges';
  }
  function groupShopping(items){ const out={}; for(const c of shoppingOrder)out[c]=[]; for(const item of items)out[shoppingCategory(item)].push(item); return Object.fromEntries(Object.entries(out).filter(([,v])=>v.length)); }
  function renderShoppingItem(item){ return `<article class="list-item ${item.done?'is-done':''}"><button class="check-button" data-action="toggle-shopping" data-id="${attr(item.id)}" aria-label="${item.done?'Wieder öffnen':'Erledigen'}">${item.done?'✓':'○'}</button><div class="list-main"><strong>${esc(item.name)}</strong><div class="meta"><span>${fmt(item.quantity)} ${esc(item.unit||'')}</span>${item.store?`<span>${esc(item.store)}</span>`:''}${item.source?`<span>${esc(item.source)}</span>`:''}</div></div><button class="icon-button" data-action="delete-shopping" data-id="${attr(item.id)}">×</button></article>`; }

  function renderPlanning() {
    const week=SKPlanner.normalizeWeek(state.weeklyPlan); const recipes=allRecipes(); const nutrition=SKPlanner.nutritionFromWeek(week,recipes);
    return `${header('Wochenplanung','Montag bis Sonntag','<button class="button primary compact" data-action="auto-plan-settings">Automatisch planen</button>')}
      <div class="quick-actions"><button class="button secondary compact" data-action="week-shopping">Einkauf für diese Woche erstellen</button><button class="button secondary compact" data-action="clear-week">Woche leeren</button></div>
      ${nutrition.meals?`<section class="card"><div class="section-kicker">Wochennährwerte</div><div class="nutrition-grid"><span><strong>${Math.round(nutrition.total.kcal)}</strong> kcal</span><span><strong>${fmt(nutrition.total.protein)}</strong> g Eiweiß</span><span><strong>${fmt(nutrition.total.carbs)}</strong> g KH</span><span><strong>${fmt(nutrition.total.fat)}</strong> g Fett</span><span><strong>${fmt(nutrition.total.fiber)}</strong> g Ballastst.</span></div><p class="muted small">Näherungswerte aus ${nutrition.meals} geplanten Mahlzeiten; Datenabdeckung ca. ${Math.round(nutrition.completeness*100)} %.</p></section>`:''}
      <div class="week-grid">${SKPlanner.DAYS.map(day=>`<section class="card day-card"><h2>${day}</h2>${SKPlanner.SLOTS.map(slot=>{const entry=week.entries.find(e=>e.day===day&&e.slot===slot);return `<label class="plan-slot"><span>${slot}</span><select data-plan-day="${day}" data-plan-slot="${slot}"><option value="">– frei –</option>${recipes.map(r=>`<option value="${attr(r.id)}" ${entry?.recipeId===r.id?'selected':''}>${esc(r.name)}</option>`).join('')}</select></label>`;}).join('')}</section>`).join('')}</div>`;
  }

  function renderSettings() {
    const persistedText='<span id="storageStatus">Speicher wird geprüft …</span>';
    return `${header('Mehr','Profile, Datenschutz, Daten und App-Einstellungen','<button class="button secondary compact" data-route="home">Zurück</button>')}
      <section class="card"><div class="section-title"><div><h2>Personen</h2><span class="muted small">Allergien, Ernährungsform und Portionsfaktor</span></div><button class="button primary compact" data-action="new-person">+ Person</button></div><div class="list">${state.profiles.map(p=>`<div class="list-item"><div class="list-main"><strong>${esc(p.name)}</strong><div class="meta"><span>${esc(p.diet||'Omnivor')}</span><span>Faktor ${fmt(p.portionFactor||1)}</span>${(p.allergies||[]).length?`<span>${p.allergies.length} Allergien</span>`:''}</div></div><button class="button secondary compact" data-action="edit-person" data-id="${attr(p.id)}">Bearbeiten</button></div>`).join('')}</div></section>
      <section class="card"><h2>Datenschutz & externe Dienste</h2><label class="switch-row"><span><strong>Lokaler Modus</strong><small>Deaktiviert externe Rezeptdienste und OCR. Profile, Vorrat, Einkaufslisten, Wochenplan und gespeicherte Rezepte bleiben lokal auf diesem Gerät.</small></span><input type="checkbox" id="localModeEnabled" ${state.settings.localMode?'checked':''}></label><label class="switch-row"><span><strong>Externe Rezeptdienste</strong><small>Bei TheMealDB werden Suchbegriffe übertragen; für die Übersetzung können Rezepttexte an den Übersetzungsdienst gesendet werden. Profile bleiben lokal.</small></span><input type="checkbox" id="onlineEnabled" ${state.settings.onlineEnabled!==false?'checked':''} ${state.settings.localMode?'disabled':''}></label><label class="switch-row"><span><strong>OCR</strong><small>Bei Nutzung wird Tesseract.js von einem CDN geladen. Bonbilder werden lokal im Browser verarbeitet.</small></span><input type="checkbox" id="ocrEnabled" ${state.settings.ocrEnabled?'checked':''} ${state.settings.localMode?'disabled':''}></label><div class="notice safety">${state.settings.localMode?'Lokaler Modus aktiv: Externe Rezeptdienste und OCR sind ausgeschaltet.':'Externe Funktionen sind optional und werden separat gekennzeichnet. Aktiviere den lokalen Modus, um sie gesammelt auszuschalten.'}</div></section>
      <section class="card"><h2>Darstellung</h2><label>Theme<select id="themeSelect"><option value="system" ${state.settings.theme==='system'?'selected':''}>System</option><option value="light" ${state.settings.theme==='light'?'selected':''}>Hell</option><option value="dark" ${state.settings.theme==='dark'?'selected':''}>Dunkel</option></select></label></section>
      <section class="card"><h2>Datenverwaltung</h2><p class="muted small">${persistedText}</p><div class="button-stack"><button class="button secondary" data-action="export-data">Daten exportieren</button><button class="button secondary" data-action="import-data">Daten importieren</button><button class="button secondary" data-action="request-persistence">Dauerhaften Speicher anfragen</button><button class="button secondary" data-action="force-update">App aktualisieren</button></div><input id="importFile" type="file" accept="application/json,.json" hidden></section>
      <section class="card"><h2>App</h2><p>SicherKochen ${APP_VERSION}</p><p class="muted small">Kein geheimer API-Schlüssel ist im Frontend hinterlegt. Eine spätere KI-Integration ist vorbereitet, standardmäßig aber deaktiviert.</p></section>`;
  }

  function render() {
    document.querySelectorAll('.nav-item').forEach(b=>b.classList.toggle('active',b.dataset.route===state.route));
    const views={home:renderHome,recipes:renderRecipes,pantry:renderPantry,shopping:renderShopping,planning:renderPlanning,settings:renderSettings};
    app.innerHTML=(views[state.route]||renderHome)();
    if(state.route==='recipes'){ const f=document.querySelector('#recipeFilter'); if(f) f.value=state.settings.recipeFilter||'all'; }
    if(state.route==='settings') updateStorageStatus();
    window.scrollTo({top:0,behavior:'instant'});
  }

  function profileForm(profile={}) {
    const isEdit=Boolean(profile.id);
    return `<form id="profileForm" class="modal-form"><div class="modal-head"><div><h2>${isEdit?'Person bearbeiten':'Person hinzufügen'}</h2><p class="muted small">Mehrere Profile können gleichzeitig für Rezepte ausgewählt werden.</p></div>${closeButton()}</div>
      <input type="hidden" name="recordId" value="${attr(profile.id||'')}">
      <div class="form-grid"><label>Name<input name="name" required value="${attr(profile.name||'')}"></label><label>Ernährungsform<select name="diet">${['Omnivor','Vegetarisch','Vegan','Pescetarisch','Individuell'].map(x=>`<option ${profile.diet===x?'selected':''}>${x}</option>`).join('')}</select></label></div>
      <label>Allergien <span class="muted small">kommagetrennt</span><input name="allergies" value="${attr((profile.allergies||[]).join(', '))}" placeholder="z. B. Milcheiweiß, Ei, Erdnuss"></label>
      <label>Unverträglichkeiten<input name="intolerances" value="${attr((profile.intolerances||[]).join(', '))}" placeholder="z. B. Laktose"></label>
      <div class="form-grid"><label>Vorlieben<input name="likes" value="${attr((profile.likes||[]).join(', '))}" placeholder="asiatisch, Kartoffeln"></label><label>Abneigungen<input name="dislikes" value="${attr((profile.dislikes||[]).join(', '))}" placeholder="Pilze, scharf"></label></div>
      <label>Portionsfaktor<input type="number" name="portionFactor" min="0.25" max="4" step="0.25" value="${attr(profile.portionFactor||1)}"><small>1 = normal, 1,5 = groß, 2 = sehr groß.</small></label>
      <div class="notice safety"><strong>Hinweis:</strong> Hinterlegte Allergien sind eine Prüfhilfe. Die App kann keine medizinische Sicherheit garantieren.</div>
      <div class="modal-actions"><button class="button primary" type="submit">Speichern</button>${isEdit&&profile.role!=='Besitzer'?`<button class="button danger ghost" type="button" data-action="delete-person" data-id="${attr(profile.id)}">Löschen</button>`:''}</div></form>`;
  }

  function pantryForm(item={}) {
    const lib=SKData.ingredient(item.ingredientId||item.name); const today=todayISO();
    return `<form id="pantryForm" class="modal-form"><div class="modal-head"><div><h2>${item.id?'Vorrat bearbeiten':'Produkt hinzufügen'}</h2><p class="muted small">MHD ist optional und nur ein hinterlegter Orientierungspunkt.</p></div>${closeButton()}</div>
      <input type="hidden" name="recordId" value="${attr(item.id||'')}"><label>Lebensmittel<input name="name" list="ingredientList" required value="${attr(item.name||lib?.name||'')}" autocomplete="off"><datalist id="ingredientList">${(SKData.state.ingredients||[]).map(i=>`<option value="${attr(i.name)}">`).join('')}</datalist></label>
      <div class="form-grid three"><label>Menge<input name="quantity" type="number" min="0" step="0.01" value="${attr(item.quantity??1)}" required></label><label>Einheit<select name="unit">${['g','kg','ml','l','Stück','Packung','Dose','Glas','EL','TL','Bund'].map(x=>`<option ${(item.unit||lib?.defaultUnit)===x?'selected':''}>${x}</option>`).join('')}</select></label><label>Lagerort<select name="location">${['Kühlschrank','Tiefkühler','Vorratsschrank','Gewürze','Sonstiges'].map(x=>`<option ${(item.location||lib?.storage)===x?'selected':''}>${x}</option>`).join('')}</select></label></div>
      <div class="form-grid"><label>Kaufdatum<input name="purchaseDate" type="date" value="${attr(item.purchaseDate||today)}"></label><label>MHD / Datum<input name="expiry" type="date" value="${attr(item.expiry||'')}"></label></div>
      <label class="checkbox-row"><input name="opened" type="checkbox" ${item.opened?'checked':''}> Produkt ist geöffnet</label><label>Öffnungsdatum<input name="openedDate" type="date" value="${attr(item.openedDate||'')}"></label><label>Notiz<textarea name="note" rows="2">${esc(item.note||'')}</textarea></label>
      <div class="modal-actions"><button class="button primary" type="submit">Speichern</button></div></form>`;
  }

  function shoppingForm(item={}) {
    return `<form id="shoppingForm" class="modal-form"><div class="modal-head"><h2>Einkauf hinzufügen</h2>${closeButton()}</div><label>Produkt<input name="name" list="shopIngredientList" value="${attr(item.name||'')}" required><datalist id="shopIngredientList">${(SKData.state.ingredients||[]).map(i=>`<option value="${attr(i.name)}">`).join('')}</datalist></label><div class="form-grid"><label>Menge<input type="number" name="quantity" min="0" step="0.01" value="${attr(item.quantity||1)}"></label><label>Einheit<select name="unit">${['g','kg','ml','l','Stück','Packung','Dose','Glas'].map(x=>`<option>${x}</option>`).join('')}</select></label></div><label>Laden optional<input name="store" value="${attr(item.store||'')}"></label><label>Notiz<textarea name="note" rows="2"></textarea></label><div class="modal-actions"><button class="button primary" type="submit">Hinzufügen</button></div></form>`;
  }

  function recipeForm(recipe={}) {
    const ingredients=(recipe.ingredients||[]).map(i=>`${i.amount || 1} ${i.unit || ''} ${ingredientName(i)}`).join('\n');
    const steps=(recipe.steps||[]).map(s=>typeof s==='string'?s:s.text).join('\n');
    return `<form id="recipeForm" class="modal-form"><div class="modal-head"><div><h2>${recipe.id?'Rezept bearbeiten':'Eigenes Rezept'}</h2><p class="muted small">Bei eigenen Rezepten Mengen möglichst auch direkt in den Schritten nennen.</p></div>${closeButton()}</div><input type="hidden" name="recordId" value="${attr(recipe.id||'')}">
      <label>Name<input name="name" required value="${attr(recipe.name||'')}"></label><div class="form-grid"><label>Küche<input name="cuisine" value="${attr(recipe.cuisine||'Deutsch')}"></label><label>Portionen<input type="number" name="servings" min="0.5" step="0.5" value="${attr(recipe.servings||2)}"></label></div>
      <div class="form-grid"><label>Vorbereitung (Min.)<input type="number" name="prepTime" min="0" value="${attr(recipe.prepTime||0)}"></label><label>Kochen (Min.)<input type="number" name="cookTime" min="0" value="${attr(recipe.cookTime||20)}"></label></div>
      <label>Zutaten – eine pro Zeile<textarea name="ingredients" rows="8" required placeholder="200 g Reis\n2 Stück Paprika">${esc(ingredients)}</textarea></label><label>Arbeitsschritte – eine Zeile pro Schritt<textarea name="steps" rows="8" required>${esc(steps)}</textarea></label>
      <div class="form-grid"><label class="checkbox-row"><input name="vegetarian" type="checkbox" ${recipe.vegetarian?'checked':''}> Vegetarisch</label><label class="checkbox-row"><input name="vegan" type="checkbox" ${recipe.vegan?'checked':''}> Vegan</label></div>
      <div class="modal-actions"><button class="button primary" type="submit">Rezept speichern</button></div></form>`;
  }

  function recipeDetail(recipe, targetServings=SKRecipes.desiredServings(selectedProfiles())) {
    if (!recipe) return '<div class="notice danger">Rezept nicht gefunden.</div>';
    const scaled=SKRecipes.scaleRecipe(recipe,targetServings); const profiles=selectedProfiles(); const analysis=SKAllergy.analyzeRecipe(scaled,profiles); const av=SKRecipes.availability(recipe,state.pantry,targetServings); const nut=SKNutrition.recipeNutrition(recipe,targetServings); const parallel=SKRecipes.parallelVariant(recipe,profiles);
    const sourceUrl=safeUrl(recipe.source?.url || recipe.sourceUrl || '');
    return `<div class="modal-head sticky"><div><div class="section-kicker">${esc(recipe.cuisine||'Rezept')}</div><h2>${esc(recipe.name)}</h2><div class="meta"><span>${num(recipe.prepTime||recipe.prep)+num(recipe.cookTime||recipe.cook)} Min.</span><span>${fmt(targetServings)} Portionen</span></div></div>${closeButton()}</div>
      ${recipe.image&&safeUrl(recipe.image)?`<img class="detail-image" src="${attr(safeUrl(recipe.image))}" alt="" loading="lazy">`:''}
      <div class="safety-panel ${analysis.status}"><strong>${esc(SKAllergy.statusText[analysis.status])}</strong><p>${analysis.status==='clear'?'Kein Konflikt wurde in den hinterlegten Daten erkannt. Das ist keine Sicherheitsgarantie.':analysis.status==='possible'?'Mindestens eine hinterlegte Allergie oder Ernährungsform kollidiert mit dem Rezept.':analysis.status==='check'?'Mindestens ein Produkt muss anhand seiner konkreten Zutatenliste geprüft werden.':'Datenlage unvollständig.'}</p></div>
      ${analysis.conflicts.length?`<section><h3>Erkannte Allergiekonflikte</h3><ul>${analysis.conflicts.map(c=>`<li><strong>${esc(c.ingredient)}</strong>: ${esc(c.allergen)} – ${esc(c.profile)}</li>`).join('')}</ul></section>`:''}
      ${analysis.dietConflicts.length?`<section><h3>Ernährungsform</h3><ul>${analysis.dietConflicts.map(x=>`<li>${esc(x)}</li>`).join('')}</ul></section>`:''}
      ${analysis.checks.length?`<section><h3>Produktprüfung</h3><ul>${analysis.checks.map(x=>`<li>${esc(x)}</li>`).join('')}</ul></section>`:''}
      ${parallel?`<div class="notice"><strong>Parallelvariante:</strong> ${esc(parallel.ingredient)} für ${esc(parallel.peopleOmnivore.join(', '))}; ${esc(parallel.alternative)} für ${esc(parallel.peopleVegetarian.join(', '))}. ${esc(parallel.note)}</div>`:''}
      <section class="detail-toolbar"><label>Portionen<input id="detailServings" data-recipe-id="${attr(recipe.id)}" type="number" min="0.5" step="0.25" value="${attr(targetServings)}"></label><button class="button secondary compact" data-action="refresh-detail" data-id="${attr(recipe.id)}">Neu berechnen</button></section>
      <section><h3>Zutaten</h3><div class="ingredient-list">${scaled.ingredients.map(i=>{const missing=av.missing.some(m=>(m.ingredientId&&m.ingredientId===i.ingredientId)||normalize(m.name)===normalize(i.name));return `<div class="ingredient-row ${missing?'missing':''}"><span>${esc(SKRecipes.ingredientText(i))}</span>${missing?'<span class="badge check">fehlt</span>':'<span class="badge safe">vorhanden</span>'}</div>`;}).join('')}</div></section>
      <section><h3>Zubereitung</h3><ol class="steps">${scaled.steps.map(s=>`<li>${esc(SKRecipes.formatStep(s,scaled))}</li>`).join('')}</ol></section>
      <section><h3>Nährwerte</h3><div class="nutrition-grid"><span><strong>${Math.round(nut.perServing.kcal)}</strong> kcal</span><span><strong>${fmt(nut.perServing.protein)}</strong> g Eiweiß</span><span><strong>${fmt(nut.perServing.carbs)}</strong> g KH</span><span><strong>${fmt(nut.perServing.fat)}</strong> g Fett</span><span><strong>${fmt(nut.perServing.fiber)}</strong> g Ballastst.</span></div><p class="muted small">Näherungswerte; Datenabdeckung ca. ${Math.round(nut.completeness*100)} % der Zutaten.</p></section>
      ${sourceUrl?`<p class="small">Quelle: <a href="${attr(sourceUrl)}" target="_blank" rel="noopener noreferrer">Original öffnen</a></p>`:''}
      <div class="notice safety">Produktinformationen und Herstellerangaben haben Vorrang. Spurenhinweise werden nicht als sichere Aussage interpretiert.</div>
      <div class="modal-actions wrap"><button class="button primary" data-action="start-cooking" data-id="${attr(recipe.id)}">Kochen starten</button><button class="button secondary" data-action="add-missing" data-id="${attr(recipe.id)}">Fehlendes einkaufen</button><button class="button secondary" data-action="add-to-plan" data-id="${attr(recipe.id)}">Zum Wochenplan</button>${analysis.status==='possible'&&analysis.replacements.length?`<button class="button secondary" data-action="adapt-recipe" data-id="${attr(recipe.id)}">Anpassung prüfen</button>`:''}${recipe.source?.type==='external'?`<button class="button secondary" data-action="save-recipe-copy" data-id="${attr(recipe.id)}">Rezept speichern</button>`:''}<button class="button secondary" data-action="toggle-exclude" data-id="${attr(recipe.id)}">${(state.settings.excludedRecipes||[]).includes(recipe.id)?'Wieder vorschlagen':'Nicht mehr vorschlagen'}</button>${!String(recipe.id).startsWith('r')&&recipe.source?.type!=='external'&&recipe.source?.type!=='generated'?`<button class="button secondary" data-action="edit-recipe" data-id="${attr(recipe.id)}">Bearbeiten</button>`:''}</div>`;
  }

  function globalSearchModal(query='') {
    const q=normalize(query);
    const recipes=q?allRecipes().filter(r=>normalize([r.name,r.cuisine,...(r.categories||[]),...(r.ingredients||[]).map(ingredientName)].join(' ')).includes(q)).slice(0,6):[];
    const pantry=q?state.pantry.filter(i=>normalize(i.name).includes(q)).slice(0,6):[];
    const shopping=q?state.shopping.filter(i=>normalize(i.name).includes(q)).slice(0,6):[];
    const ingredients=q?(SKData.state.ingredients||[]).filter(i=>normalize([i.name,...(i.aliases||[]),i.category].join(' ')).includes(q)).slice(0,8):[];
    const total=recipes.length+pantry.length+shopping.length+ingredients.length;
    return `<form id="globalSearchForm" class="modal-form"><div class="modal-head"><div><h2>Suche</h2><p class="muted small">Rezepte, Vorrat, Einkauf und Zutatenbibliothek</p></div>${closeButton()}</div><div class="inline-form"><input name="query" type="search" autofocus value="${attr(query)}" placeholder="z. B. Brokkoli, Curry, Reis"><button class="button primary" type="submit">Suchen</button></div></form>
      ${q&&!total?'<div class="empty">Keine Treffer gefunden.</div>':''}
      ${recipes.length?`<section><h3>Rezepte</h3><div class="list">${recipes.map(r=>`<div class="list-item"><div class="list-main"><strong>${esc(r.name)}</strong><div class="meta"><span>${esc(r.cuisine||'')}</span></div></div><button class="button secondary compact" data-action="view-recipe" data-id="${attr(r.id)}">Öffnen</button></div>`).join('')}</div></section>`:''}
      ${pantry.length?`<section><h3>Vorrat</h3><div class="list">${pantry.map(i=>`<div class="list-item"><div class="list-main"><strong>${esc(i.name)}</strong><div class="meta"><span>${fmt(i.quantity)} ${esc(i.unit)}</span><span>${esc(i.location||'')}</span></div></div><button class="button secondary compact" data-action="edit-pantry" data-id="${attr(i.id)}">Bearbeiten</button></div>`).join('')}</div></section>`:''}
      ${shopping.length?`<section><h3>Einkauf</h3><div class="list">${shopping.map(i=>`<div class="list-item"><div class="list-main"><strong>${esc(i.name)}</strong><div class="meta"><span>${fmt(i.quantity)} ${esc(i.unit||'')}</span></div></div></div>`).join('')}</div></section>`:''}
      ${ingredients.length?`<section><h3>Zutatenbibliothek</h3><div class="list">${ingredients.map(i=>`<div class="list-item"><div class="list-main"><strong>${esc(i.name)}</strong><div class="meta"><span>${esc(i.category)}</span><span>${esc(i.storage)}</span></div></div><button class="button secondary compact" data-action="add-library-pantry" data-id="${attr(i.id)}">Zum Vorrat</button></div>`).join('')}</div></section>`:''}`;
  }

  function receiptModal() {
    return `<div class="modal-head"><div><h2>Kassenbon hinzufügen</h2><p class="muted small">OCR-Ergebnisse werden nie automatisch in den Vorrat übernommen.</p></div>${closeButton()}</div>
      <div class="notice safety"><strong>Kontrolle erforderlich:</strong> Bontexte enthalten Abkürzungen und OCR kann Fehler machen. Bitte jedes erkannte Produkt prüfen.</div>
      <label>Bonfoto<input id="receiptImage" type="file" accept="image/*" capture="environment"></label>
      <div class="button-row"><button class="button secondary" data-action="ocr-receipt" ${state.settings.ocrEnabled?'':'disabled'}>${state.settings.ocrEnabled?'Foto mit OCR lesen':'OCR in Einstellungen deaktiviert'}</button></div>
      <label>Bontext<textarea id="receiptText" rows="9" placeholder="DATTELTOMATEN 1,99\nPAPRIKA ROT 2,49\nKOKOSMILCH 0,99"></textarea></label>
      <div class="modal-actions"><button class="button primary" data-action="parse-receipt">Produkte erkennen</button></div>`;
  }

  function receiptReviewModal() {
    return `<form id="receiptReviewForm" class="modal-form"><div class="modal-head"><div><h2>Erkannte Produkte</h2><p class="muted small">Korrigieren und nur gewünschte Zeilen übernehmen.</p></div>${closeButton()}</div>
      ${state.receiptDraft.length?state.receiptDraft.map((item,index)=>`<fieldset class="receipt-row"><label class="checkbox-row"><input type="checkbox" name="include_${index}" checked> übernehmen</label><input type="hidden" name="raw_${index}" value="${attr(item.raw)}"><label>Produkt<input name="name_${index}" value="${attr(item.name)}"></label><div class="form-grid three"><label>Menge<input name="quantity_${index}" type="number" min="0" step="0.01" value="${attr(item.quantity||1)}"></label><label>Einheit<select name="unit_${index}">${['g','kg','ml','l','Stück','Packung','Dose','Glas'].map(x=>`<option ${item.unit===x?'selected':''}>${x}</option>`).join('')}</select></label><label>Preis €<input name="price_${index}" type="number" min="0" step="0.01" value="${attr(item.price??'')}"></label></div></fieldset>`).join(''):'<div class="empty">Keine verwertbaren Produktzeilen erkannt.</div>'}
      <div class="modal-actions"><button class="button primary" type="submit" ${state.receiptDraft.length?'':'disabled'}>Bestätigte Produkte zum Vorrat</button></div></form>`;
  }

  function pantryMenu(item) {
    return `<div class="modal-head"><div><h2>${esc(item.name)}</h2><p class="muted small">${fmt(item.quantity)} ${esc(item.unit)}</p></div>${closeButton()}</div><div class="action-menu"><button data-action="edit-pantry" data-id="${attr(item.id)}">Bearbeiten</button><button data-action="reduce-pantry" data-id="${attr(item.id)}">Menge reduzieren</button><button data-action="consume-pantry" data-id="${attr(item.id)}">Verbraucht</button><button data-action="repurchase" data-id="${attr(item.id)}">Nachkaufen</button><button data-action="freeze-pantry" data-id="${attr(item.id)}">Einfrieren</button><button data-action="open-pantry" data-id="${attr(item.id)}">Geöffnet</button><button data-action="expired-pantry" data-id="${attr(item.id)}">Als abgelaufen markieren</button><button class="danger-text" data-action="delete-pantry" data-id="${attr(item.id)}">Löschen</button></div>`;
  }

  function leftoversModal() {
    const groups={'Abgelaufen':[],'Heute':[],'1–3 Tage':[],'4–7 Tage':[],'Später':[]};
    for(const item of expiryItems()){ if(item.days<0)groups['Abgelaufen'].push(item); else if(item.days===0)groups['Heute'].push(item); else if(item.days<=3)groups['1–3 Tage'].push(item); else if(item.days<=7)groups['4–7 Tage'].push(item); else groups['Später'].push(item); }
    return `<div class="modal-head"><div><h2>Muss weg</h2><p class="muted small">Abgelaufene Einträge werden nicht automatisch als essbar eingestuft.</p></div>${closeButton()}</div>${Object.entries(groups).filter(([,v])=>v.length).map(([g,items])=>`<section><h3>${g}</h3><div class="list">${items.map(i=>`<div class="list-item"><div class="list-main"><strong>${esc(i.name)}</strong><div class="meta"><span>${fmt(i.quantity)} ${esc(i.unit)}</span><span>${formatDate(i.expiry)}</span></div></div></div>`).join('')}</div></section>`).join('')||'<div class="empty">Keine MHD-Einträge vorhanden.</div>'}<div class="modal-actions"><button class="button primary" data-action="leftover-recipes">Rezepte daraus</button></div>`;
  }

  function todaySuggestionsModal() {
    const profiles=selectedProfiles(); const target=SKRecipes.desiredServings(profiles); const ranked=SKRecipes.rankRecipes(allRecipes(),{pantry:state.pantry,profiles,history:state.history,targetServings:target}).filter(x=>x.safety.status!=='possible').slice(0,8);
    return `<div class="modal-head"><div><h2>Heute kochen</h2><p class="muted small">Vorrat, MHD, Vorlieben und Abwechslung berücksichtigt.</p></div>${closeButton()}</div><div class="card-grid">${ranked.map(x=>renderRecipeCard(x.recipe,x)).join('')||'<div class="empty">Keine passenden Vorschläge. Im Rezeptbereich kannst du Filter lockern oder online suchen.</div>'}</div>`;
  }

  function autoPlanModal() {
    const prev=state.weeklyPlan?.generatorSettings||{};
    return `<form id="autoPlanForm" class="modal-form"><div class="modal-head"><div><h2>Woche automatisch planen</h2><p class="muted small">Allergien und Ernährungsformen der ausgewählten Personen haben Vorrang.</p></div>${closeButton()}</div>
      <div class="form-grid"><label>Maximale Kochzeit (Min.)<input name="maxTime" type="number" min="0" step="5" value="${attr(prev.maxTime||30)}"><small>0 = keine Begrenzung</small></label><label>Fleisch/Fisch-Gerichte<input name="meatMeals" type="number" min="0" max="7" value="${attr(prev.meatMeals??3)}"></label></div>
      <label>Vegetarische/vegane Gerichte<input name="vegetarianMeals" type="number" min="0" max="7" value="${attr(prev.vegetarianMeals??4)}"></label>
      <label class="checkbox-row"><input name="preferPantry" type="checkbox" ${prev.preferPantry!==false?'checked':''}> vorhandene Lebensmittel besonders bevorzugen</label>
      <label class="checkbox-row"><input name="quick" type="checkbox" ${prev.quick!==false?'checked':''}> schnelle Gerichte bevorzugen</label>
      <label class="checkbox-row"><input name="healthy" type="checkbox" ${prev.healthy?'checked':''}> protein- und ballaststoffreichere Rezepte leicht bevorzugen</label>
      <div class="notice small">Ein echtes Budgetlimit ist ohne verlässliche lokale Preisbasis nicht seriös berechenbar. Bonpreise werden gespeichert, aber in dieser Version noch nicht als vollständige Preisprognose verwendet.</div>
      <div class="modal-actions"><button class="button primary" type="submit">Wochenplan erzeugen</button></div></form>`;
  }

  function shoppingGeneratorModal() {
    return `<div class="modal-head"><div><h2>Einkaufsliste erzeugen</h2><p class="muted small">Vorschläge berücksichtigen vorhandene Bestände.</p></div>${closeButton()}</div><div class="generator-grid"><button class="quick-card" data-action="generate-shopping" data-mode="basic"><strong>Grundausstattung</strong><span>Basisvorrat auffüllen</span></button><button class="quick-card" data-action="generate-shopping" data-mode="healthy"><strong>Gesunder Einkauf</strong><span>Gemüse, Vollkorn, Protein, Hülsenfrüchte</span></button><button class="quick-card" data-action="generate-shopping" data-mode="frozen"><strong>Viel TK</strong><span>lange haltbare Vorräte</span></button><button class="quick-card" data-action="generate-shopping" data-mode="variety"><strong>Abwechslungsreich</strong><span>Kaufhistorie berücksichtigen</span></button></div>`;
  }

  function addToPlanModal(recipe) {
    return `<form id="addToPlanForm" class="modal-form"><div class="modal-head"><div><h2>Zum Wochenplan</h2><p>${esc(recipe.name)}</p></div>${closeButton()}</div><input type="hidden" name="recipeId" value="${attr(recipe.id)}"><div class="form-grid"><label>Tag<select name="day">${SKPlanner.DAYS.map(d=>`<option>${d}</option>`).join('')}</select></label><label>Mahlzeit<select name="slot">${SKPlanner.SLOTS.map(s=>`<option ${s==='Abendessen'?'selected':''}>${s}</option>`).join('')}</select></label></div><label>Portionen<input name="servings" type="number" min="0.5" step="0.25" value="${attr(SKRecipes.desiredServings(selectedProfiles()))}"></label><div class="modal-actions"><button class="button primary" type="submit">Eintragen</button></div></form>`;
  }

  function adaptModal(recipe) {
    const target=num(document.querySelector('#detailServings')?.value)||SKRecipes.desiredServings(selectedProfiles());
    const result=SKRecipes.adaptRecipe(recipe,selectedProfiles(),target);
    if(!result.ok) return `<div class="modal-head"><h2>Anpassung nicht automatisch möglich</h2>${closeButton()}</div><div class="notice danger">${esc(result.reason)}</div><p>Bitte das Rezept manuell prüfen. Eine automatische Ersetzung darf keine falsche Sicherheit erzeugen.</p>`;
    return `<div class="modal-head"><div><h2>Anpassungsvorschlag</h2><p class="muted small">Das angepasste Rezept wurde erneut geprüft.</p></div>${closeButton()}</div><div class="notice ${result.recheck.status==='clear'?'success':'warn'}"><strong>Erneute Prüfung:</strong> ${esc(SKAllergy.statusText[result.recheck.status])}. Konkrete Ersatzprodukte weiterhin auf der Verpackung prüfen.</div><ul>${result.changes.map(c=>`<li><strong>${esc(c.from)}</strong> → ${esc(c.to)}<br><span class="muted small">${esc(c.note||'')}</span></li>`).join('')}</ul><div class="modal-actions"><button class="button primary" data-action="save-adapted" data-source-id="${attr(recipe.id)}">Angepasstes Rezept speichern</button></div>`;
  }

  function cookingModal(recipe,targetServings,stepIndex=0) {
    const scaled=SKRecipes.scaleRecipe(recipe,targetServings); const steps=scaled.steps||[]; const index=Math.max(0,Math.min(stepIndex,steps.length-1)); const text=SKRecipes.formatStep(steps[index],scaled);
    state.cookSession={recipeId:recipe.id,targetServings,index};
    return `<div class="cook-mode"><div class="modal-head"><div><div class="section-kicker">Schritt ${index+1} von ${steps.length}</div><h2>${esc(recipe.name)}</h2></div>${closeButton()}</div><div class="cook-step">${esc(text)}</div><div class="cook-controls"><button class="button secondary" data-action="cook-prev" ${index===0?'disabled':''}>Zurück</button><button class="button secondary" data-action="start-timer">Timer</button>${index<steps.length-1?'<button class="button primary" data-action="cook-next">Weiter</button>':'<button class="button primary" data-action="finish-cooking">Fertig</button>'}</div></div>`;
  }

  function cookedConfirmModal(recipe,targetServings) {
    const scaled=SKRecipes.scaleRecipe(recipe,targetServings);
    return `<form id="cookedConfirmForm" class="modal-form"><div class="modal-head"><div><h2>Gericht gekocht?</h2><p class="muted small">Prüfe die tatsächlich verbrauchten Mengen, bevor der Vorrat reduziert wird.</p></div>${closeButton()}</div><input type="hidden" name="recipeId" value="${attr(recipe.id)}"><input type="hidden" name="servings" value="${attr(targetServings)}">${scaled.ingredients.map((i,index)=>`<div class="consume-row"><label class="checkbox-row"><input type="checkbox" name="use_${index}" checked> ${esc(ingredientName(i))}</label><div class="form-grid"><label>Menge<input name="amount_${index}" type="number" min="0" step="0.01" value="${attr(i.amount)}"></label><label>Einheit<input name="unit_${index}" value="${attr(i.unit)}" readonly></label></div><input type="hidden" name="ingredientId_${index}" value="${attr(i.ingredientId||'')}"><input type="hidden" name="name_${index}" value="${attr(ingredientName(i))}"></div>`).join('')}<div class="modal-actions"><button class="button primary" type="submit">Ja, Vorrat reduzieren</button></div></form>`;
  }

  async function saveProfile(form) {
    return runForm(form,async()=>{ const d=new FormData(form); const id=String(d.get('recordId')||'')||uid('person'); const existing=state.profiles.find(p=>p.id===id)||{}; const profile={...existing,id,name:String(d.get('name')||'').trim(),diet:String(d.get('diet')||'Omnivor'),allergies:splitList(d.get('allergies')),intolerances:splitList(d.get('intolerances')),likes:splitList(d.get('likes')),dislikes:splitList(d.get('dislikes')),portionFactor:Math.max(.25,num(d.get('portionFactor'))||1),updatedAt:new Date().toISOString()}; if(!profile.name)throw new Error('Bitte einen Namen eingeben.'); await SKDB.put('profiles',profile); await loadState(); closeModal(); render(); showToast('Person gespeichert'); });
  }

  async function savePantry(form) {
    return runForm(form,async()=>{ const d=new FormData(form); const name=String(d.get('name')||'').trim(); const lib=SKData.ingredient(name); const id=String(d.get('recordId')||'')||uid('pantry'); const existing=state.pantry.find(p=>p.id===id)||{}; const item={...existing,id,name:lib?.name||name,ingredientId:lib?.id||existing.ingredientId||'',quantity:Math.max(0,num(d.get('quantity'))),unit:String(d.get('unit')||lib?.defaultUnit||'Stück'),location:String(d.get('location')||lib?.storage||'Sonstiges'),purchaseDate:String(d.get('purchaseDate')||''),expiry:String(d.get('expiry')||''),opened:d.get('opened')==='on',openedDate:String(d.get('openedDate')||''),note:String(d.get('note')||''),source:existing.source||'manuell',updatedAt:new Date().toISOString()}; if(!item.name)throw new Error('Lebensmittel fehlt.'); await SKDB.put('pantry',item); await logActivity('pantry','Vorrat gespeichert',item.name); await loadState(); closeModal(); render(); showToast('Vorrat gespeichert'); });
  }

  function parseIngredientLine(line) {
    const text=String(line||'').trim(); const match=text.match(/^(\d+(?:[.,]\d+)?|[¼½¾])\s*(g|kg|ml|l|Stück|Stueck|EL|TL|Dose|Packung|Glas|Zehe|Bund)?\s+(.+)$/i);
    const frac={'¼':.25,'½':.5,'¾':.75}; const amount=match?(frac[match[1]]||num(match[1])):1; const unit=match?.[2]||'Stück'; const name=match?.[3]||text; const lib=SKData.ingredient(name);
    return {ingredientId:lib?.id||'',name:lib?.name||name,amount,unit:unit==='Stueck'?'Stück':unit,allergens:lib?.allergens||[],requiresProductCheck:!lib};
  }

  async function saveRecipe(form) {
    return runForm(form,async()=>{ const d=new FormData(form); const id=String(d.get('recordId')||'')||uid('recipe'); const existing=state.userRecipes.find(r=>r.id===id)||{}; const ingredients=String(d.get('ingredients')||'').split(/\r?\n/).map(x=>x.trim()).filter(Boolean).map(parseIngredientLine); const steps=String(d.get('steps')||'').split(/\r?\n/).map(x=>x.trim()).filter(Boolean); if(!ingredients.length||!steps.length)throw new Error('Bitte Zutaten und Arbeitsschritte eintragen.'); const r={...existing,id,name:String(d.get('name')||'').trim(),cuisine:String(d.get('cuisine')||'Deutsch'),categories:existing.categories||['Eigenes Rezept'],servings:Math.max(.5,num(d.get('servings'))||2),prepTime:Math.max(0,num(d.get('prepTime'))),cookTime:Math.max(0,num(d.get('cookTime'))),ingredients,steps,vegetarian:d.get('vegetarian')==='on',vegan:d.get('vegan')==='on',source:existing.source||{type:'own',provider:'Eigenes Rezept'},updatedAt:new Date().toISOString()}; if(!r.name)throw new Error('Rezeptname fehlt.'); await SKDB.put('recipes',r); await loadState(); closeModal(); render(); showToast('Rezept gespeichert'); });
  }

  async function saveShopping(form) {
    return runForm(form,async()=>{ const d=new FormData(form); const name=String(d.get('name')||'').trim(); const lib=SKData.ingredient(name); const item={id:uid('shop'),name:lib?.name||name,ingredientId:lib?.id||'',quantity:Math.max(0,num(d.get('quantity'))||1),unit:String(d.get('unit')||lib?.defaultUnit||'Stück'),category:lib?.category||'Sonstiges',store:String(d.get('store')||''),note:String(d.get('note')||''),done:false,source:'manuell',createdAt:new Date().toISOString()}; await SKDB.put('shopping',item); await loadState(); closeModal(); render(); showToast('Zur Einkaufsliste hinzugefügt'); });
  }

  async function logActivity(type,title,detail='') { const item={id:uid('activity'),type,title,detail,createdAt:new Date().toISOString()}; await SKDB.put('activity',item); }

  async function addShoppingEntries(items) {
    for(const entry of items){ const existing=state.shopping.find(x=>!x.done&&((entry.ingredientId&&x.ingredientId===entry.ingredientId)||normalize(x.name)===normalize(entry.name))&&normalize(x.unit)===normalize(entry.unit)); if(existing){existing.quantity=num(existing.quantity)+num(entry.quantity);await SKDB.put('shopping',existing);}else await SKDB.put('shopping',{id:entry.id||uid('shop'),done:false,createdAt:new Date().toISOString(),...entry}); }
    await loadState();
  }

  async function addMissing(recipe) {
    const target=num(document.querySelector('#detailServings')?.value)||SKRecipes.desiredServings(selectedProfiles()); const av=SKRecipes.availability(recipe,state.pantry,target); const items=av.missing.map(m=>({name:ingredientName(m),ingredientId:m.ingredientId||'',quantity:m.missingAmount,unit:m.unit,category:SKData.ingredient(m)?.category||'Sonstiges',source:`Rezept: ${recipe.name}`}));
    if(!items.length)return showToast('Keine fehlenden Zutaten'); await addShoppingEntries(items); showToast(`${items.length} fehlende Zutaten hinzugefügt`); closeModal(); render();
  }

  async function savePlanSlot(day,slot,recipeId) { const week=SKPlanner.normalizeWeek(state.weeklyPlan); const entry=week.entries.find(e=>e.day===day&&e.slot===slot); entry.recipeId=recipeId; entry.servings=recipeId?SKRecipes.desiredServings(selectedProfiles()):null; week.updatedAt=new Date().toISOString(); state.weeklyPlan=week; await SKDB.put('weeklyPlan',week); showToast('Wochenplan gespeichert'); }

  async function exportData({silent=false}={}) {
    const data=await SKDB.exportAll(); const payload={app:'SicherKochen',appVersion:APP_VERSION,dataVersion:DATA_VERSION,exportedAt:new Date().toISOString(),data}; const blob=new Blob([JSON.stringify(payload,null,2)],{type:'application/json'}); const url=URL.createObjectURL(blob); const a=document.createElement('a'); a.href=url; a.download=`sicherkochen-backup-${todayISO()}.json`; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url); if(!silent)showToast('Sicherung erstellt'); return payload;
  }

  async function importDataFile(event) {
    const file=event.target.files?.[0]; if(!file)return;
    try{ const parsed=JSON.parse(await file.text()); if(parsed.app!=='SicherKochen'||!parsed.data)throw new Error('Ungültige SicherKochen-Sicherungsdatei.'); await exportData({silent:true}); if(!confirm('Vor dem Import wurde eine Sicherung erstellt. Vorhandene lokale Daten jetzt durch die Datei ersetzen?'))return; await SKDB.importAll(parsed.data,{clearFirst:true}); await loadState(); render(); showToast('Sicherung importiert'); }catch(e){console.error(e);showToast(e.message||'Import fehlgeschlagen',4000);}finally{event.target.value='';}
  }

  async function updateStorageStatus(){ const n=document.querySelector('#storageStatus'); if(!n)return; try{await SKDB.healthCheck(); const persisted=navigator.storage?.persisted?await navigator.storage.persisted():false; n.textContent=persisted?'Datenbank funktioniert; dauerhafter Speicher ist bestätigt.':'Datenbank funktioniert; Safari kann lokale Website-Daten bei Speicherbereinigung entfernen. Regelmäßig exportieren.';}catch(e){n.textContent=`Speicherfehler: ${e.message}`;} }
  async function requestPersistence(){ if(!navigator.storage?.persist)return showToast('Diese Browserfunktion ist hier nicht verfügbar.'); const ok=await navigator.storage.persist(); showToast(ok?'Dauerhafter Speicher bestätigt':'Browser hat dauerhaften Speicher nicht bestätigt'); updateStorageStatus(); }

  async function forceUpdate(){ try{ if('serviceWorker'in navigator){const regs=await navigator.serviceWorker.getRegistrations();await Promise.all(regs.map(r=>r.update()));} if('caches'in window){const keys=await caches.keys();await Promise.all(keys.filter(k=>k.startsWith('sicherkochen-')&&!k.includes(APP_VERSION)).map(k=>caches.delete(k)));} showToast('Neue App-Dateien werden geladen'); setTimeout(()=>location.reload(),350);}catch(e){showToast(e.message||'Update fehlgeschlagen');} }

  async function searchOnline(form) {
    return runForm(form,async()=>{ if(state.settings.onlineEnabled===false)throw new Error('Externe Rezeptdienste sind deaktiviert.'); const d=new FormData(form); const q=String(d.get('query')||'').trim(); if(!q)throw new Error('Suchbegriff fehlt.'); state.online={query:q,results:[],loading:true,error:''}; render(); try{state.online.results=await SKOnline.search(q,12,{source:'themealdb'});}catch(e){state.online.error=e.message||'Online-Suche fehlgeschlagen.';}finally{state.online.loading=false;render();} });
  }

  async function openOnlineRecipe(raw) {
    try{ showToast('Rezept wird geladen …'); const full=await SKOnline.translateRecipeToGerman(raw,true); const normalized=normalizeStoredRecipe({...full,id:full.externalId||uid('online'),source:{...(full.source||{}),type:'external'}}); const tempId=normalized.id; state.online.results=state.online.results.map(x=>(x.externalId===raw.externalId?normalized:x)); openModal(recipeDetail(normalized,SKRecipes.desiredServings(selectedProfiles())),'wide'); }
    catch(e){console.error(e);showToast(e.message||'Online-Rezept konnte nicht geladen werden',4000);}
  }

  async function consumeIngredient(id,name,amount,unit) {
    let remaining=num(amount); const candidates=state.pantry.filter(p=>(id&&p.ingredientId===id)||normalize(p.name)===normalize(name));
    for(const p of candidates){ if(remaining<=0)break; if(normalize(p.unit)!==normalize(unit))continue; const take=Math.min(num(p.quantity),remaining); p.quantity=Math.max(0,num(p.quantity)-take); remaining-=take; if(p.quantity<=0.0001)await SKDB.delete('pantry',p.id);else await SKDB.put('pantry',p); }
  }

  async function completeCook(form) {
    return runForm(form,async()=>{ const d=new FormData(form); const recipe=recipeById(String(d.get('recipeId'))); if(!recipe)throw new Error('Rezept nicht gefunden.'); const scaled=SKRecipes.scaleRecipe(recipe,num(d.get('servings'))||recipe.servings); for(let i=0;i<scaled.ingredients.length;i++){ if(d.get(`use_${i}`)!=='on')continue; await consumeIngredient(String(d.get(`ingredientId_${i}`)||''),String(d.get(`name_${i}`)||''),num(d.get(`amount_${i}`)),String(d.get(`unit_${i}`)||'')); }
      const ratingRaw=prompt('Bewertung 1–5 Sterne (optional):',''); const rating=ratingRaw?Math.min(5,Math.max(1,num(ratingRaw))):null; const note=prompt('Notiz zum Gericht (optional):','')||''; const history={id:uid('history'),type:'cooked',recipeId:recipe.id,name:recipe.name,cuisine:recipe.cuisine,categories:recipe.categories||[],rating,note,servings:num(d.get('servings')),createdAt:new Date().toISOString()}; await SKDB.put('history',history); await loadState(); closeModal(); render(); showToast('Gericht gespeichert und Vorrat aktualisiert'); });
  }

  async function addReceiptProducts(form) {
    return runForm(form,async()=>{const d=new FormData(form); let count=0; for(let i=0;i<state.receiptDraft.length;i++){ if(d.get(`include_${i}`)!=='on')continue; const name=String(d.get(`name_${i}`)||'').trim(); const lib=SKData.ingredient(name); const quantity=Math.max(0,num(d.get(`quantity_${i}`))||1); const unit=String(d.get(`unit_${i}`)||lib?.defaultUnit||'Stück'); const item={id:uid('pantry'),name:lib?.name||name,ingredientId:lib?.id||'',quantity,unit,location:lib?.storage||'Sonstiges',purchaseDate:todayISO(),expiry:'',opened:false,note:'',source:'Kassenbon',createdAt:new Date().toISOString()}; await SKDB.put('pantry',item); const raw=String(d.get(`raw_${i}`)||''); if(raw&&lib){ const mapping={id:`map_${normalize(raw).replace(/ /g,'_')}`,rawName:SKReceiptParser.normalizeProductName(raw),ingredientId:lib.id,updatedAt:new Date().toISOString()}; await SKDB.put('mappings',mapping); } count++; }
      const receipt={id:uid('receipt'),itemCount:count,createdAt:new Date().toISOString()}; await SKDB.put('receipts',receipt); state.receiptDraft=[]; await loadState(); closeModal(); render(); showToast(`${count} Produkte zum Vorrat hinzugefügt`);});
  }

  async function generateShopping(mode) {
    const recipes=allRecipes(); const commonIds={
      basic:['kartoffeln','zwiebel','knoblauch','reis','pasta','passierte-tomaten','kichererbsen','rapsoel','paprika','karotte','brokkoli','salz','pfeffer','paprikapulver'],
      healthy:['brokkoli','spinat','karotte','paprika','apfel','beeren','vollkornreis','vollkornpasta','kichererbsen','rote-linsen','edamame','haehnchen'],
      frozen:['brokkoli','blumenkohl','erbsen','gruene-bohnen','spinat','edamame','fischfilet','beeren'],
      variety:['aubergine','suesskartoffeln','champignons','rosenkohl','couscous','bulgur','udon','reisnudeln','schwarze-bohnen','berglinsen']
    };
    let ids=[...(commonIds[mode]||commonIds.basic)];
    if(mode==='variety'){
      const recent=state.activity.filter(a=>a.type==='shopping').slice(0,30).map(a=>normalize(a.detail));
      ids=ids.sort((a,b)=>recent.filter(x=>x.includes(normalize(SKData.ingredient(a)?.name))).length-recent.filter(x=>x.includes(normalize(SKData.ingredient(b)?.name))).length);
    }
    const existingIds=new Set(state.pantry.map(p=>p.ingredientId).filter(Boolean));
    const items=ids.filter(id=>!existingIds.has(id)).slice(0,12).map(id=>{const lib=SKData.ingredient(id);return {name:lib.name,ingredientId:id,quantity:['g','ml'].includes(lib.defaultUnit)?500:1,unit:lib.defaultUnit,category:lib.category,source:`Generator: ${mode}`};});
    await addShoppingEntries(items); closeModal(); state.route='shopping'; render(); showToast(`${items.length} Vorschläge hinzugefügt`);
  }

  async function moveShoppingToPantry(items) {
    let count=0;
    for(const item of items){ const lib=SKData.ingredient(item.ingredientId||item.name); const pantry={id:uid('pantry'),name:lib?.name||item.name,ingredientId:lib?.id||item.ingredientId||'',quantity:num(item.quantity)||1,unit:item.unit||lib?.defaultUnit||'Stück',location:lib?.storage||'Sonstiges',purchaseDate:todayISO(),expiry:'',opened:false,note:item.note||'',source:'Einkaufsliste',createdAt:new Date().toISOString()}; await SKDB.put('pantry',pantry); item.done=true; await SKDB.delete('shopping',item.id); await logActivity('shopping','Eingekauft',item.name); count++; }
    await loadState(); render(); showToast(`${count} Produkte zum Vorrat übernommen`);
  }

  function generatedRecipe() { state.generatedRecipe=SKRecipes.generateFromPantry(state.pantry,selectedProfiles()); return state.generatedRecipe; }

  async function handleAction(button) {
    const action=button.dataset.action; const id=button.dataset.id;
    if(action==='close-modal') return closeModal();
    if(action==='today-suggestions') return openModal(todaySuggestionsModal(),'wide');
    if(action==='view-generated'){ const r=generatedRecipe(); if(r)return openModal(recipeDetail(r,SKRecipes.desiredServings(selectedProfiles())),'wide'); return showToast('Für einen Generatorvorschlag fehlen noch passende Grundkomponenten.'); }
    if(action==='leftovers') return openModal(leftoversModal(),'wide');
    if(action==='leftover-recipes'){ closeModal(); await saveSettings({recipeFilter:'leftovers'}); state.route='recipes'; return render(); }
    if(action==='new-person') return openModal(profileForm());
    if(action==='edit-person') return openModal(profileForm(state.profiles.find(p=>p.id===id)||{}));
    if(action==='delete-person'){ const p=state.profiles.find(x=>x.id===id); if(!p||!confirm(`${p.name} wirklich löschen?`))return; await SKDB.delete('profiles',id); await saveSettings({selectedProfiles:(state.settings.selectedProfiles||[]).filter(x=>x!==id)}); await loadState(); closeModal(); return render(); }
    if(action==='toggle-person'){ const selected=new Set(state.settings.selectedProfiles||[]); selected.has(id)?selected.delete(id):selected.add(id); await saveSettings({selectedProfiles:[...selected]}); return render(); }
    if(action==='new-pantry') return openModal(pantryForm());
    if(action==='add-library-pantry'){ const lib=SKData.ingredient(id); if(lib)return openModal(pantryForm({name:lib.name,ingredientId:lib.id,unit:lib.defaultUnit,location:lib.storage,quantity:1})); }
    if(action==='edit-pantry'){ closeModal(); return openModal(pantryForm(state.pantry.find(p=>p.id===id)||{})); }
    if(action==='pantry-menu'){ const item=state.pantry.find(p=>p.id===id); if(item)return openModal(pantryMenu(item)); }
    if(action==='delete-pantry'){ const item=state.pantry.find(p=>p.id===id); if(item&&confirm(`${item.name} aus dem Vorrat löschen?`)){await SKDB.delete('pantry',id);await loadState();closeModal();render();} return; }
    if(action==='reduce-pantry'){ const item=state.pantry.find(p=>p.id===id); if(!item)return; const val=prompt(`Wie viel ${item.unit} von ${item.name} wurden verbraucht?`,'1'); if(val===null)return; item.quantity=Math.max(0,num(item.quantity)-Math.max(0,num(val))); if(item.quantity<=0)await SKDB.delete('pantry',id);else await SKDB.put('pantry',item); await loadState(); closeModal(); render(); return showToast('Menge aktualisiert'); }
    if(action==='consume-pantry'){ const item=state.pantry.find(p=>p.id===id); if(item&&confirm(`${item.name} als vollständig verbraucht markieren?`)){await SKDB.delete('pantry',id);await loadState();closeModal();render();showToast('Als verbraucht entfernt');} return; }
    if(action==='repurchase'){ const item=state.pantry.find(p=>p.id===id); if(!item)return; await addShoppingEntries([{name:item.name,ingredientId:item.ingredientId||'',quantity:item.quantity||1,unit:item.unit,category:SKData.ingredient(item.ingredientId||item.name)?.category||'Sonstiges',source:'Nachkaufen'}]); closeModal(); render(); return showToast('Auf Einkaufsliste gesetzt'); }
    if(action==='freeze-pantry'){ const item=state.pantry.find(p=>p.id===id); if(!item)return; item.location='Tiefkühler';item.updatedAt=new Date().toISOString();await SKDB.put('pantry',item);await loadState();closeModal();render();return showToast('Lagerort auf Tiefkühler gesetzt'); }
    if(action==='open-pantry'){ const item=state.pantry.find(p=>p.id===id); if(!item)return; item.opened=true;item.openedDate=todayISO();await SKDB.put('pantry',item);await loadState();closeModal();render();return showToast('Als geöffnet markiert'); }
    if(action==='expired-pantry'){ const item=state.pantry.find(p=>p.id===id); if(!item)return; item.expiry=item.expiry||new Date(Date.now()-86400000).toISOString().slice(0,10);item.note=`${item.note||''}${item.note?' · ':''}Manuell als abgelaufen markiert`;await SKDB.put('pantry',item);await loadState();closeModal();render();return showToast('Als abgelaufen markiert'); }
    if(action==='new-shopping') return openModal(shoppingForm());
    if(action==='toggle-shopping'){ const item=state.shopping.find(x=>x.id===id); if(!item)return; item.done=!item.done;await SKDB.put('shopping',item);await loadState();return render(); }
    if(action==='delete-shopping'){await SKDB.delete('shopping',id);await loadState();return render();}
    if(action==='clear-done'){for(const item of state.shopping.filter(x=>x.done))await SKDB.delete('shopping',item.id);await loadState();return render();}
    if(action==='shopping-generator') return openModal(shoppingGeneratorModal());
    if(action==='generate-shopping') return generateShopping(button.dataset.mode);
    if(action==='all-bought'){ const open=state.shopping.filter(x=>!x.done); if(!open.length)return; for(const item of open){item.done=true;await SKDB.put('shopping',item);} await loadState(); render(); return showToast(`${open.length} Produkte als eingekauft markiert`); }
    if(action==='done-to-pantry'){ const done=state.shopping.filter(x=>x.done); if(!done.length)return; return moveShoppingToPantry(done); }
    if(action==='new-recipe') return openModal(recipeForm(),'wide');
    if(action==='view-recipe'){ const r=recipeById(id); if(r)return openModal(recipeDetail(r,SKRecipes.desiredServings(selectedProfiles())),'wide'); }
    if(action==='save-recipe-copy'){ const r=state.online.results.find(x=>(x.externalId||x.id)===id); if(!r)return; const saved={...normalizeStoredRecipe(r),id:uid('recipe'),source:{...(r.source||{}),type:'external'},createdAt:new Date().toISOString()}; await SKDB.put('recipes',saved);await loadState();closeModal();render();return showToast('Online-Rezept lokal gespeichert'); }
    if(action==='edit-recipe'){ const r=state.userRecipes.find(x=>x.id===id); if(r){closeModal();return openModal(recipeForm(r),'wide');}return showToast('Interne Rezepte können nicht direkt überschrieben werden.'); }
    if(action==='toggle-favorite'){ const fav=new Set(state.settings.favorites||[]);fav.has(id)?fav.delete(id):fav.add(id);await saveSettings({favorites:[...fav]});return render();}
    if(action==='toggle-exclude'){ const set=new Set(state.settings.excludedRecipes||[]);set.has(id)?set.delete(id):set.add(id);await saveSettings({excludedRecipes:[...set]});closeModal();render();return showToast(set.has(id)?'Wird vorerst nicht mehr vorgeschlagen':'Wird wieder vorgeschlagen'); }
    if(action==='refresh-detail'){ const r=recipeById(id) || state.online.results.find(x=>(x.externalId||x.id)===id); const servings=Math.max(.5,num(document.querySelector('#detailServings')?.value)||r?.servings||1); if(r)return openModal(recipeDetail(r,servings),'wide'); }
    if(action==='add-missing'){ const r=recipeById(id) || state.online.results.find(x=>(x.externalId||x.id)===id); if(r)return addMissing(r); }
    if(action==='add-to-plan'){ const r=recipeById(id); if(!r)return showToast('Online-Rezept zuerst speichern, bevor es in den Wochenplan kommt.'); return openModal(addToPlanModal(r)); }
    if(action==='adapt-recipe'){ const r=recipeById(id) || state.online.results.find(x=>(x.externalId||x.id)===id); if(r)return openModal(adaptModal(r),'wide'); }
    if(action==='save-adapted'){ const source=recipeById(button.dataset.sourceId)||state.online.results.find(x=>(x.externalId||x.id)===button.dataset.sourceId); if(!source)return; const target=SKRecipes.desiredServings(selectedProfiles()); const result=SKRecipes.adaptRecipe(source,selectedProfiles(),target); if(!result.ok)return showToast(result.reason); const saved={...result.recipe,id:uid('recipe'),createdAt:new Date().toISOString()}; await SKDB.put('recipes',saved);await loadState();closeModal();render();return showToast('Angepasstes Rezept gespeichert'); }
    if(action==='start-cooking'){ const r=recipeById(id)||state.online.results.find(x=>(x.externalId||x.id)===id); if(!r)return; const servings=Math.max(.5,num(document.querySelector('#detailServings')?.value)||SKRecipes.desiredServings(selectedProfiles())); return openModal(cookingModal(r,servings,0),'cook-dialog'); }
    if(action==='cook-prev'||action==='cook-next'){ const s=state.cookSession;if(!s)return;const r=recipeById(s.recipeId)||state.online.results.find(x=>(x.externalId||x.id)===s.recipeId);const next=s.index+(action==='cook-next'?1:-1);return openModal(cookingModal(r,s.targetServings,next),'cook-dialog'); }
    if(action==='start-timer'){ const minutes=prompt('Timer in Minuten:','5'); if(minutes===null)return; const ms=Math.max(1,num(minutes))*60000; showToast(`Timer für ${fmt(ms/60000)} Minuten gestartet`); setTimeout(()=>{alert('SicherKochen-Timer ist abgelaufen.');},ms); return; }
    if(action==='finish-cooking'){ const s=state.cookSession;if(!s)return;const r=recipeById(s.recipeId)||state.online.results.find(x=>(x.externalId||x.id)===s.recipeId);return openModal(cookedConfirmModal(r,s.targetServings),'wide'); }
    if(action==='open-receipt') return openModal(receiptModal(),'wide');
    if(action==='ocr-receipt'){ const file=document.querySelector('#receiptImage')?.files?.[0]; if(!file)return showToast('Bitte zuerst ein Bonfoto auswählen.'); try{button.disabled=true;button.textContent='OCR 0 %';const text=await SKReceiptOCR.recognize(file,p=>button.textContent=`OCR ${p} %`);document.querySelector('#receiptText').value=text;button.textContent='Foto mit OCR lesen';button.disabled=false;showToast('OCR abgeschlossen – Text bitte prüfen');}catch(e){console.error(e);button.disabled=false;button.textContent='Foto mit OCR lesen';showToast(e.message||'OCR fehlgeschlagen',4000);}return; }
    if(action==='parse-receipt'){ const text=document.querySelector('#receiptText')?.value||'';state.receiptDraft=SKReceiptParser.parseReceiptText(text,state.mappings);return openModal(receiptReviewModal(),'wide'); }
    if(action==='view-online'){ const r=state.online.results.find(x=>(x.externalId||x.id)===id); if(r)return openOnlineRecipe(r); }
    if(action==='search-chefkoch'){ const q=String(document.querySelector('#onlineSearchForm input[name="query"]')?.value||state.online.query||'Rezepte').trim(); window.open(`https://www.chefkoch.de/rs/s0/${encodeURIComponent(q)}/Rezepte.html`,'_blank','noopener,noreferrer'); return; }
    if(action==='auto-plan-settings') return openModal(autoPlanModal());
    if(action==='week-shopping'){ const items=SKPlanner.shoppingFromWeek(state.weeklyPlan,allRecipes(),state.pantry);await addShoppingEntries(items);state.route='shopping';render();return showToast(`${items.length} fehlende Zutaten übernommen`); }
    if(action==='clear-week'){ if(!confirm('Wochenplan leeren?'))return;state.weeklyPlan=SKPlanner.emptyWeek();await SKDB.put('weeklyPlan',state.weeklyPlan);return render(); }
    if(action==='export-data') return exportData();
    if(action==='import-data') return document.querySelector('#importFile')?.click();
    if(action==='request-persistence') return requestPersistence();
    if(action==='force-update') return forceUpdate();
  }

  async function handleSubmit(form) {
    if(form.id==='globalSearchForm'){ const q=String(new FormData(form).get('query')||'').trim(); return openModal(globalSearchModal(q),'wide'); }
    if(form.id==='profileForm') return saveProfile(form);
    if(form.id==='pantryForm') return savePantry(form);
    if(form.id==='recipeForm') return saveRecipe(form);
    if(form.id==='shoppingForm') return saveShopping(form);
    if(form.id==='onlineSearchForm') return searchOnline(form);
    if(form.id==='receiptReviewForm') return addReceiptProducts(form);
    if(form.id==='cookedConfirmForm') return completeCook(form);
    if(form.id==='autoPlanForm') return runForm(form,async()=>{const d=new FormData(form);const opts={maxTime:num(d.get('maxTime')),meatMeals:num(d.get('meatMeals')),vegetarianMeals:num(d.get('vegetarianMeals')),preferPantry:d.get('preferPantry')==='on',quick:d.get('quick')==='on',healthy:d.get('healthy')==='on'};const week=SKPlanner.autoPlan({recipes:allRecipes().filter(r=>!(state.settings.excludedRecipes||[]).includes(r.id)),pantry:state.pantry,profiles:selectedProfiles(),history:state.history,settings:opts});state.weeklyPlan=week;await SKDB.put('weeklyPlan',week);closeModal();state.route='planning';render();showToast('Abendessen für die Woche geplant');});
    if(form.id==='addToPlanForm') return runForm(form,async()=>{const d=new FormData(form);const week=SKPlanner.normalizeWeek(state.weeklyPlan);const entry=week.entries.find(e=>e.day===d.get('day')&&e.slot===d.get('slot'));entry.recipeId=String(d.get('recipeId'));entry.servings=Math.max(.5,num(d.get('servings'))||1);week.updatedAt=new Date().toISOString();state.weeklyPlan=week;await SKDB.put('weeklyPlan',week);closeModal();state.route='planning';render();showToast('Zum Wochenplan hinzugefügt');});
  }

  document.addEventListener('click',async event=>{
    const route=event.target.closest('[data-route]');
    if(route){state.route=route.dataset.route;await saveSettings({lastRoute:state.route});render();return;}
    const action=event.target.closest('[data-action]'); if(action){try{await handleAction(action);}catch(e){console.error(e);showToast(e.message||'Aktion fehlgeschlagen',4000);} }
  });

  document.addEventListener('submit',event=>{event.preventDefault();handleSubmit(event.target).catch(e=>{console.error(e);showToast(e.message||'Speichern fehlgeschlagen',4000);});});

  document.addEventListener('change',async event=>{
    const t=event.target;
    if(t.matches('[data-plan-day][data-plan-slot]')) return savePlanSlot(t.dataset.planDay,t.dataset.planSlot,t.value);
    if(t.id==='recipeFilter'){await saveSettings({recipeFilter:t.value});return render();}
    if(t.id==='pantryLocation'){await saveSettings({pantryLocation:t.value});return render();}
    if(t.id==='localModeEnabled'){await saveSettings(t.checked?{localMode:true,onlineEnabled:false,ocrEnabled:false}:{localMode:false});return render();}
    if(t.id==='onlineEnabled'){await saveSettings({onlineEnabled:t.checked,localMode:t.checked?false:state.settings.localMode});return render();}
    if(t.id==='ocrEnabled'){await saveSettings({ocrEnabled:t.checked,localMode:t.checked?false:state.settings.localMode});return render();}
    if(t.id==='themeSelect'){await saveSettings({theme:t.value});return render();}
    if(t.id==='importFile') return importDataFile(event);
    if(t.closest('#pantryForm') && t.name==='name'){
      const lib=SKData.ingredient(t.value); if(!lib)return;
      const f=t.form; const unit=f.elements.unit; const location=f.elements.location; const expiry=f.elements.expiry;
      if(unit)unit.value=lib.defaultUnit||unit.value; if(location)location.value=lib.storage||location.value;
      if(expiry&&!expiry.value&&lib.typicalShelfLifeDays){const d=new Date();d.setDate(d.getDate()+lib.typicalShelfLifeDays);expiry.value=d.toISOString().slice(0,10);}
    }
  });

  let inputTimer;
  document.addEventListener('input',event=>{
    const t=event.target;
    if(t.id==='recipeQuery'){clearTimeout(inputTimer);inputTimer=setTimeout(async()=>{await saveSettings({recipeQuery:t.value});render();},250);}
    if(t.id==='pantryQuery'){clearTimeout(inputTimer);inputTimer=setTimeout(async()=>{await saveSettings({pantryQuery:t.value});render();},250);}
  });

  modal.addEventListener('click',event=>{if(event.target===modal)closeModal();});
  searchButton.addEventListener('click',()=>openModal(globalSearchModal(),'wide'));
  moreButton.addEventListener('click',async()=>{state.route='settings';await saveSettings({lastRoute:'settings'});render();});

  window.addEventListener('beforeinstallprompt',event=>{event.preventDefault();state.installPrompt=event;installButton.hidden=false;});
  installButton.addEventListener('click',async()=>{if(!state.installPrompt)return;state.installPrompt.prompt();await state.installPrompt.userChoice;state.installPrompt=null;installButton.hidden=true;});
  window.addEventListener('appinstalled',()=>{installButton.hidden=true;showToast('SicherKochen wurde installiert');});

  async function registerServiceWorker(){
    if(!('serviceWorker'in navigator))return;
    try{
      const registration=await navigator.serviceWorker.register('./service-worker.js?v='+APP_VERSION);
      registration.addEventListener('updatefound',()=>{const worker=registration.installing;if(!worker)return;worker.addEventListener('statechange',()=>{if(worker.state==='installed'&&navigator.serviceWorker.controller){showToast('Neue App-Version verfügbar – unter Mehr → App aktualisieren.',5000);}});});
    }catch(e){console.warn('Service Worker:',e);}
  }

  function updateOnlineBadge(){ const b=document.querySelector('#offlineBadge'); if(!b)return; b.hidden=navigator.onLine; }
  window.addEventListener('online',()=>{updateOnlineBadge();showToast('Internetverbindung wieder verfügbar');});
  window.addEventListener('offline',()=>{updateOnlineBadge();showToast('Offline-Modus: lokale Bereiche bleiben verfügbar',4000);});

  Promise.all([loadState(),registerServiceWorker()]).then(()=>{state.route=['home','recipes','pantry','shopping','planning','settings'].includes(state.settings.lastRoute)?state.settings.lastRoute:'home';updateOnlineBadge();render();}).catch(error=>{console.error(error);app.innerHTML=`<div class="notice danger"><strong>SicherKochen konnte nicht gestartet werden.</strong><br>${esc(error.message||error)}</div>`;});
})();
