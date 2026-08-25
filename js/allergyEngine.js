(() => {
  'use strict';

  const normalize = value => window.SKData.normalize(value);
  const uniq = values => [...new Set(values.filter(Boolean))];
  const KNOWN_MAP = {
    'milch':'milch','milcheiweiss':'milch','milchprotein':'milch','casein':'milch','kasein':'milch','molke':'milch','whey':'milch',
    'laktose':'laktose','lactose':'laktose','ei':'ei','huehnereiweiss':'ei','huhnereiweiss':'ei','egg':'ei',
    'gluten':'gluten','weizen':'weizen','wheat':'weizen','erdnuss':'erdnuss','peanut':'erdnuss',
    'nuesse':'schalenfruechte','nusse':'schalenfruechte','schalenfruechte':'schalenfruechte','haselnuss':'schalenfruechte','walnuss':'schalenfruechte','mandel':'schalenfruechte',
    'soja':'soja','soy':'soja','fisch':'fisch','fish':'fisch','krebstiere':'krebstiere','weichtiere':'weichtiere',
    'sellerie':'sellerie','senf':'senf','sesam':'sesam','lupine':'lupine','sulfite':'sulfite','sulfit':'sulfite'
  };

  function key(value) {
    const n = normalize(value).replace(/ /g,'');
    return KNOWN_MAP[n] || normalize(value).replace(/ /g,'_');
  }

  function groups() { return window.SKData.state.allergens?.groups || []; }
  function groupById(id) { return groups().find(g => g.id === id); }
  function label(id) { return groupById(id)?.label || String(id || '').replace(/_/g,' '); }

  function profileRules(profiles) {
    const rules = [];
    for (const profile of profiles || []) {
      for (const raw of profile.allergies || []) rules.push({ profile: profile.name, raw, id: key(raw), kind: 'Allergie' });
      for (const raw of profile.intolerances || []) rules.push({ profile: profile.name, raw, id: key(raw), kind: 'Unverträglichkeit' });
    }
    return rules;
  }

  function textContains(haystack, needle) {
    const h = ` ${normalize(haystack)} `; const n = normalize(needle);
    if (!n) return false;
    return h.includes(` ${n} `) || (n.length >= 5 && h.includes(n));
  }

  function detectIngredient(ingredient) {
    const known = window.SKData.ingredient(ingredient) || window.SKData.ingredient(ingredient?.name);
    const explicit = uniq([...(ingredient?.allergens || []), ...(known?.allergens || [])].map(key));
    const text = [ingredient?.name, known?.name, ...(known?.aliases || [])].filter(Boolean).join(' ');
    const detected = [...explicit];
    for (const group of groups()) {
      if ((group.aliases || []).some(alias => textContains(text, alias))) detected.push(group.id);
    }
    // Laktosefrei ist bei Milchproteinallergie ausdrücklich KEINE Entwarnung.
    if (textContains(text, 'laktosefrei') && [...detected].includes('milch')) detected.push('milch');
    return uniq(detected);
  }

  function isAmbiguous(ingredient) {
    const text = ingredient?.name || '';
    if (ingredient?.requiresProductCheck) return true;
    return (window.SKData.state.allergens?.ambiguousProductTerms || []).some(term => textContains(text, term));
  }

  function ruleMatchesDetected(rule, detected) {
    if (detected.includes(rule.id)) return true;
    if (rule.id === 'gluten' && detected.includes('weizen')) return true;
    if (rule.id === 'weizen' && detected.includes('gluten')) return true;
    if (rule.id === 'laktose' && detected.includes('milch')) return true;
    return false;
  }

  function analyzeIngredient(ingredient, profiles = []) {
    const detected = detectIngredient(ingredient);
    const rules = profileRules(profiles);
    const conflicts = [];
    for (const rule of rules) {
      const custom = !groupById(rule.id) && textContains(ingredient?.name || '', rule.raw);
      if (ruleMatchesDetected(rule, detected) || custom) conflicts.push({ ...rule, allergen: label(rule.id) });
    }
    if (conflicts.length) return { status:'possible', conflicts, detected, message:'Möglicherweise ungeeignet – hinterlegtes Allergen erkannt.' };
    if (isAmbiguous(ingredient)) return { status:'check', conflicts:[], detected, message:'Zutaten prüfen – Produkt oder Unterzutaten sind nicht eindeutig.' };
    const known = window.SKData.ingredient(ingredient) || window.SKData.ingredient(ingredient?.name);
    if (!ingredient?.name && !known) return { status:'unknown', conflicts:[], detected, message:'Unbekannt – keine ausreichenden Produktdaten.' };
    if (!known && !detected.length) return { status:'unknown', conflicts:[], detected, message:'Unbekannt – Zutat ist nicht in der lokalen Bibliothek und hat keine verlässlichen Allergenangaben.' };
    return { status:'clear', conflicts:[], detected, message:'Nach hinterlegten Daten unauffällig. Herstellerangaben haben Vorrang.' };
  }

  function dietConflicts(recipe, profiles = []) {
    const conflicts=[];
    for (const profile of profiles) {
      const diet = normalize(profile.diet);
      if (!diet || diet === 'omnivor') continue;
      const compatible = diet === 'vegan' ? recipe.vegan === true
        : diet === 'vegetarisch' ? (recipe.vegetarian === true || recipe.vegan === true)
        : diet === 'pescetarisch' ? recipe.vegetarian === true || recipe.vegan === true || /fisch|lachs|pesc/i.test((recipe.categories || []).join(' '))
        : true;
      if (!compatible) conflicts.push(`${profile.name}: Rezept passt nicht zur Ernährungsform „${profile.diet}“.`);
    }
    return conflicts;
  }

  function findSubstitution(ingredient, profiles = [], allergenId = null) {
    const name = ingredient?.name || window.SKData.ingredient(ingredient)?.name || '';
    const targetRules = (window.SKData.state.substitutions || []).filter(rule => !allergenId || rule.allergen === allergenId);
    for (const rule of targetRules) {
      if (!(rule.match || []).some(term => textContains(name, term))) continue;
      for (const candidate of rule.candidates || []) {
        const candidateIngredient = { name:candidate.name, allergens:candidate.allergens || [], requiresProductCheck:true };
        if (!analyzeIngredient(candidateIngredient, profiles).conflicts.length) return { ...candidate, allergen:rule.allergen };
      }
    }
    return null;
  }

  function analyzeRecipe(recipe, profiles = []) {
    const conflicts=[]; const checks=[]; const unknown=[]; const replacements=[];
    for (const ingredient of recipe.ingredients || []) {
      const result = analyzeIngredient(ingredient, profiles);
      if (result.status === 'possible') {
        conflicts.push(...result.conflicts.map(c => ({ ingredient:ingredient.name, ingredientId:ingredient.ingredientId, ...c })));
        for (const c of result.conflicts) {
          const sub = findSubstitution(ingredient, profiles, c.id);
          if (sub) replacements.push({ ingredient:ingredient.name, ingredientId:ingredient.ingredientId, allergenId:c.id, profiles:[c.profile], candidate:sub });
        }
      } else if (result.status === 'check') checks.push(`${ingredient.name}: Zutatenliste/Unterzutaten prüfen.`);
      else if (result.status === 'unknown') unknown.push(`${ingredient.name || 'Unbekannte Zutat'}: Datenlage unklar.`);
    }
    const diets = dietConflicts(recipe, profiles);
    const allConflictIngredients = uniq(conflicts.map(c => `${c.ingredient}|${c.id}`));
    const replacedIngredients = uniq(replacements.map(r => `${r.ingredient}|${r.allergenId}`));
    const unresolved = allConflictIngredients.filter(x => !replacedIngredients.includes(x));
    let status='clear';
    if (conflicts.length || diets.length) status='possible';
    else if (checks.length) status='check';
    else if (unknown.length) status='unknown';
    return { status, conflicts, checks:uniq(checks), unknown:uniq(unknown), dietConflicts:diets, replacements, unresolved };
  }

  const statusText = {
    clear:'Nach hinterlegten Daten unauffällig',
    possible:'Möglicherweise ungeeignet',
    check:'Zutaten prüfen',
    unknown:'Unbekannt'
  };

  window.SKAllergy = { key, label, detectIngredient, analyzeIngredient, analyzeRecipe, findSubstitution, statusText };
})();
