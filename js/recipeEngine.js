(() => {
  'use strict';
  const normalize = value => window.SKData.normalize(value);
  const unitFamily = unit => ({g:'mass',kg:'mass',ml:'volume',l:'volume','stück':'count','stueck':'count','stuck':'count'}[normalize(unit).replace(/ /g,'')] || normalize(unit));
  const toBase = (value, unit) => {
    const u=normalize(unit); const n=Number(value||0);
    if (u==='kg') return {value:n*1000,unit:'g'};
    if (u==='l') return {value:n*1000,unit:'ml'};
    return {value:n,unit:unit};
  };

  function roundAmount(value, unit='') {
    const n=Number(value||0); const u=normalize(unit);
    if (!Number.isFinite(n)) return 0;
    if (u==='g' || u==='ml') {
      if (n >= 100) return Math.round(n/10)*10;
      if (n >= 20) return Math.round(n/5)*5;
      return Math.round(n);
    }
    if (['stueck','stuck','zehe'].includes(u)) {
      const halves=Math.round(n*2)/2; return halves;
    }
    if (['el','tl','tasse'].includes(u)) return Math.round(n*4)/4;
    return Math.round(n*100)/100;
  }

  function formatAmount(value, unit='') {
    const n=roundAmount(value,unit);
    const fractions = new Map([[0.25,'¼'],[0.5,'½'],[0.75,'¾']]);
    if (['stück','stueck','stuck','zehe','el','tl','tasse'].includes(normalize(unit))) {
      const whole=Math.floor(n); const frac=Math.round((n-whole)*100)/100;
      if (fractions.has(frac)) return `${whole ? whole : ''}${fractions.get(frac)}`;
    }
    return new Intl.NumberFormat('de-DE',{maximumFractionDigits:2}).format(n);
  }

  function desiredServings(profiles=[]) {
    if (!profiles.length) return 1;
    return profiles.reduce((sum,p)=>sum+Math.max(.25,Number(p.portionFactor || 1)),0);
  }

  function scaleRecipe(recipe, targetServings) {
    const base=Math.max(.25,Number(recipe.servings||1)); const target=Math.max(.25,Number(targetServings||base)); const factor=target/base;
    const ingredients=(recipe.ingredients||[]).map(i=>({...i,amount:roundAmount(Number(i.amount||0)*factor,i.unit)}));
    const scaled={...recipe,servings:target,ingredients};
    scaled.steps=(recipe.steps||[]).map(s=>typeof s==='string'?s:{...s});
    return scaled;
  }

  function ingredientText(entry) {
    const lib=window.SKData.ingredient(entry);
    return `${formatAmount(entry.amount,entry.unit)} ${entry.unit || lib?.defaultUnit || ''} ${entry.name || lib?.name || 'Zutat'}`.replace(/\s+/g,' ').trim();
  }

  function formatStep(step, recipe) {
    const text=typeof step==='string'?step:step.text;
    if (!text) return '';
    const byId=new Map((recipe.ingredients||[]).map(i=>[i.ingredientId || normalize(i.name),i]));
    return text.replace(/\{\{ing:([^}]+)\}\}/g,(_,id)=>{
      const entry=byId.get(id) || byId.get(normalize(id));
      return entry ? ingredientText(entry) : id;
    });
  }

  function pantryMatch(entry, pantry) {
    const targetId=entry.ingredientId || window.SKData.ingredient(entry)?.id;
    const targetName=normalize(entry.name || window.SKData.ingredient(entry)?.name);
    return (pantry||[]).filter(p => (targetId && p.ingredientId===targetId) || normalize(p.name)===targetName);
  }

  function availableAmount(entry, pantry) {
    const matches=pantryMatch(entry,pantry); if (!matches.length) return {value:0,compatible:false};
    const needUnit=toBase(0,entry.unit).unit; let value=0; let compatible=false;
    for (const p of matches) {
      const base=toBase(p.quantity,p.unit);
      if (unitFamily(base.unit)!==unitFamily(needUnit)) continue;
      compatible=true; value+=base.value;
    }
    return {value,compatible};
  }

  function availability(recipe, pantry, targetServings=recipe.servings||1) {
    const scaled=scaleRecipe(recipe,targetServings); const missing=[]; let available=0;
    for (const entry of scaled.ingredients||[]) {
      if (entry.optional) continue;
      const need=toBase(entry.amount,entry.unit); const have=availableAmount(entry,pantry);
      const lib=window.SKData.ingredient(entry);
      const isSpice=lib?.category==='Gewürze';
      if (!have.compatible) missing.push({...entry,missingAmount:entry.amount,reason:'nicht vorhanden',isSpice});
      else if (have.value+1e-9 < need.value) missing.push({...entry,missingAmount:roundAmount(need.value-have.value,need.unit),unit:need.unit,reason:'Menge fehlt',isSpice});
      else available++;
    }
    return {missing,available,total:(scaled.ingredients||[]).filter(i=>!i.optional).length,scaled};
  }

  function expiryBonus(recipe, pantry) {
    const today=new Date(); today.setHours(0,0,0,0); let bonus=0;
    for (const entry of recipe.ingredients||[]) {
      for (const p of pantryMatch(entry,pantry)) {
        if (!p.expiry) continue;
        const days=Math.ceil((new Date(`${p.expiry}T00:00:00`)-today)/86400000);
        if (days < 0) bonus += 0; // abgelaufen niemals als Verzehrbonus behandeln
        else if (days <= 1) bonus += 6;
        else if (days <= 3) bonus += 4;
        else if (days <= 7) bonus += 2;
      }
    }
    return bonus;
  }

  function seasonBonus(recipe) {
    const ids=new Set(window.SKData.state.seasonality?.months?.[String(new Date().getMonth()+1)] || []);
    return (recipe.ingredients||[]).reduce((sum,i)=>sum+(ids.has(i.ingredientId)?0.5:0),0);
  }

  function diversityMultiplier(recipe, history=[]) {
    const recent=(history||[]).filter(h=>h.type==='cooked').sort((a,b)=>String(b.createdAt).localeCompare(String(a.createdAt))).slice(0,20);
    if (!recent.length) return 1;
    let repeats=0;
    for (const h of recent) {
      if (h.cuisine && h.cuisine===recipe.cuisine) repeats += .5;
      if ((h.categories||[]).some(c=>(recipe.categories||[]).includes(c))) repeats += .5;
    }
    return Math.max(.8,1-Math.min(.2,repeats*.02));
  }

  function preferenceBonus(recipe, profiles=[]) {
    const text=normalize([recipe.name,recipe.cuisine,...(recipe.categories||[]),...(recipe.ingredients||[]).map(i=>i.name||window.SKData.ingredient(i)?.name)].join(' '));
    let score=0;
    for (const p of profiles) {
      for (const like of p.likes||[]) if (text.includes(normalize(like))) score += 1;
      for (const dislike of p.dislikes||[]) if (text.includes(normalize(dislike))) score -= 3;
    }
    return score;
  }

  function scoreRecipe(recipe,{pantry=[],profiles=[],history=[],targetServings=recipe.servings||1}={}) {
    const safety=window.SKAllergy.analyzeRecipe(recipe,profiles);
    const av=availability(recipe,pantry,targetServings);
    let score=0;
    for (const entry of av.scaled.ingredients||[]) {
      const lib=window.SKData.ingredient(entry); const isSpice=lib?.category==='Gewürze';
      const missing=av.missing.find(m=>(m.ingredientId&&m.ingredientId===entry.ingredientId)||normalize(m.name)===normalize(entry.name));
      if (!missing) score += isSpice ? 1 : 3;
      else score -= isSpice ? 1 : 4;
    }
    score += expiryBonus(recipe,pantry) + seasonBonus(recipe) + preferenceBonus(recipe,profiles);
    score *= diversityMultiplier(recipe,history);
    if (safety.status==='possible') score -= 100;
    if (safety.status==='check') score -= 8;
    if (safety.status==='unknown') score -= 12;
    return {score,safety,availability:av};
  }

  function rankRecipes(recipes,context={}) {
    return (recipes||[]).map(recipe=>({recipe,...scoreRecipe(recipe,context)})).sort((a,b)=>b.score-a.score);
  }

  function ingredientFromCandidate(candidate, original) {
    const lib=window.SKData.ingredient(candidate.name);
    return {...original,ingredientId:lib?.id || '',name:lib?.name || candidate.name,allergens:lib?.allergens || candidate.allergens || [],requiresProductCheck:true,substitutionNote:candidate.note};
  }

  function adaptRecipe(recipe,profiles=[],targetServings=recipe.servings||1) {
    const scaled=scaleRecipe(recipe,targetServings); const analysis=window.SKAllergy.analyzeRecipe(scaled,profiles);
    if (analysis.dietConflicts.length) return {ok:false,reason:'Unterschiedliche Ernährungsformen erfordern eine Parallelvariante oder einen manuellen Austausch.',analysis};
    if (analysis.unresolved.length) return {ok:false,reason:'Mindestens ein Allergen-Konflikt besitzt keinen hinterlegten Standardersatz.',analysis};
    const replacementByKey=new Map();
    for (const r of analysis.replacements) replacementByKey.set(`${r.ingredientId || normalize(r.ingredient)}|${r.allergenId}`,r);
    const changes=[];
    const ingredients=scaled.ingredients.map(entry=>{
      const hits=analysis.replacements.filter(r=>(r.ingredientId&&r.ingredientId===entry.ingredientId)||normalize(r.ingredient)===normalize(entry.name));
      if (!hits.length) return entry;
      const selected=hits[0]; const replaced=ingredientFromCandidate(selected.candidate,entry);
      changes.push({from:entry.name || window.SKData.ingredient(entry)?.name,to:replaced.name,note:selected.candidate.note});
      return replaced;
    });
    const adapted={...scaled,id:'',name:`${recipe.name} – angepasst`,ingredients,adaptation:{method:'Lokale Regeln',profiles:profiles.map(p=>p.name),changes,createdAt:new Date().toISOString()},source:{type:'adapted',provider:'SicherKochen',originalId:recipe.id}};
    const recheck=window.SKAllergy.analyzeRecipe(adapted,profiles);
    return {ok:recheck.status!=='possible',recipe:adapted,analysis,recheck,changes};
  }

  function parallelVariant(recipe,profiles=[]) {
    const veg=profiles.filter(p=>['vegetarisch','vegan'].includes(normalize(p.diet)));
    const omni=profiles.filter(p=>normalize(p.diet)==='omnivor' || !p.diet);
    if (!veg.length || !omni.length) return null;
    const meat=(recipe.ingredients||[]).find(i=>{ const lib=window.SKData.ingredient(i); return lib && !lib.vegetarian; });
    if (!meat) return null;
    const target=veg.some(p=>normalize(p.diet)==='vegan') ? 'Tofu' : 'Tofu oder vegetarische Alternative';
    return {shared:true,ingredient:meat.name || window.SKData.ingredient(meat)?.name,alternative:target,peopleVegetarian:veg.map(p=>p.name),peopleOmnivore:omni.map(p=>p.name),note:'Gemeinsame Beilagen und Gemüse zubereiten; Protein in getrennten Pfannenbereichen bzw. getrennten Utensilien zubereiten, wenn Allergien/Kreuzkontakt relevant sind.'};
  }

  function generateFromPantry(pantry, profiles=[]) {
    const libs=(pantry||[]).map(p=>window.SKData.ingredient(p.ingredientId || p.name)).filter(Boolean);
    const allowed=libs.filter(lib=>!window.SKAllergy.analyzeIngredient({name:lib.name,allergens:lib.allergens},profiles).conflicts.length);
    const protein=allowed.find(x=>x.category==='Protein');
    const vegetables=allowed.filter(x=>x.category==='Gemüse').slice(0,2);
    const carb=allowed.find(x=>x.category==='Kohlenhydrate');
    const sauce=allowed.find(x=>['Konserven','Soßen','Kühlung'].includes(x.category) && ['kokosmilch','passierte-tomaten','stueckige-tomaten','pflanzencreme'].includes(x.id));
    if (!protein || !vegetables.length || !carb) return null;
    const ingredients=[
      {ingredientId:protein.id,name:protein.name,amount:250,unit:protein.defaultUnit==='Stück'?'Stück':'g'},
      ...vegetables.map(v=>({ingredientId:v.id,name:v.name,amount:v.defaultUnit==='Stück'?1:250,unit:v.defaultUnit})),
      {ingredientId:carb.id,name:carb.name,amount:180,unit:carb.defaultUnit},
      ...(sauce?[{ingredientId:sauce.id,name:sauce.name,amount:sauce.defaultUnit==='ml'?250:200,unit:sauce.defaultUnit}]:[]),
      {ingredientId:'rapsoel',name:'Rapsöl',amount:1,unit:'EL'}, {ingredientId:'paprikapulver',name:'Paprikapulver',amount:1,unit:'TL'}
    ];
    return {id:`generated_${Date.now()}`,name:`${protein.name}-${vegetables[0].name}-${carb.name}-Pfanne`,description:'Regelbasiert aus vorhandenen Zutaten erzeugt.',cuisine:'International',categories:['Resteverwertung','Generiert'],servings:2,prepTime:10,cookTime:20,vegetarian:protein.vegetarian,vegan:protein.vegan,difficulty:'Einfach',ingredients,steps:[
      {text:'{{ing:'+carb.id+'}} nach Packungsangabe garen.',ingredientRefs:[carb.id]},
      {text:'{{ing:'+protein.id+'}} vorbereiten und in {{ing:rapsoel}} vollständig bzw. nach Produktangabe garen.',ingredientRefs:[protein.id,'rapsoel']},
      {text:vegetables.map(v=>'{{ing:'+v.id+'}}').join(' und ')+' schneiden, zugeben und 6–8 Minuten garen.',ingredientRefs:vegetables.map(v=>v.id)},
      ...(sauce?[{text:'{{ing:'+sauce.id+'}} einrühren und 5 Minuten köcheln. Bei verarbeiteten Produkten Zutatenliste prüfen.',ingredientRefs:[sauce.id]}]:[]),
      {text:'Mit {{ing:paprikapulver}} würzen und mit der gegarten Beilage servieren.',ingredientRefs:['paprikapulver']}
    ],source:{type:'generated',provider:'Lokaler Regelgenerator'}};
  }

  window.SKRecipes={roundAmount,formatAmount,desiredServings,scaleRecipe,ingredientText,formatStep,availability,scoreRecipe,rankRecipes,adaptRecipe,parallelVariant,generateFromPantry};
})();
