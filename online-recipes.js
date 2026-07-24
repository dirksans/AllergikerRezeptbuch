(() => {
  'use strict';

  const API_BASE = 'https://www.themealdb.com/api/json/v1/1';

  const normalize = value => String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLocaleLowerCase('de-DE');

  const unique = values => [...new Set(values.filter(Boolean))];

  const ALLERGEN_TERMS = {
    milch: [
      'milk', 'milch', 'butter', 'cream', 'sahne', 'creme fraiche', 'crème fraîche', 'schmand',
      'sour cream', 'double cream', 'heavy cream', 'whipping cream', 'yoghurt', 'yogurt', 'joghurt',
      'cheese', 'käse', 'kaese', 'parmesan', 'mozzarella', 'cheddar', 'gouda', 'mascarpone',
      'quark', 'whey', 'molke', 'casein', 'kasein', 'caseinate', 'milk powder', 'milchpulver',
      'buttermilk', 'buttermilch', 'condensed milk', 'evaporated milk', 'ghee'
    ],
    gluten: ['wheat', 'weizen', 'flour', 'mehl', 'bread', 'brot', 'pasta', 'nudeln', 'spaghetti', 'barley', 'gerste', 'rye', 'roggen', 'spelt', 'dinkel', 'couscous', 'bulgur'],
    ei: ['egg', 'eggs', 'ei', 'eier', 'mayonnaise', 'mayo'],
    soja: ['soy', 'soya', 'soja', 'tofu', 'tempeh', 'edamame'],
    erdnuss: ['peanut', 'peanuts', 'erdnuss', 'erdnüsse', 'erdnuesse'],
    schalenfruchte: ['almond', 'mandel', 'cashew', 'walnut', 'walnuss', 'hazelnut', 'haselnuss', 'pistachio', 'pistazie', 'pecan', 'macadamia'],
    sellerie: ['celery', 'sellerie'],
    senf: ['mustard', 'senf'],
    sesam: ['sesame', 'sesam', 'tahini'],
    fisch: ['fish', 'salmon', 'lachs', 'tuna', 'thunfisch', 'anchovy', 'anchovies', 'sardine', 'cod', 'kabeljau'],
    krebstiere: ['shrimp', 'prawn', 'crab', 'lobster', 'garnele', 'garnelen', 'krabbe', 'hummer'],
    weichtiere: ['mussel', 'miesmuschel', 'oyster', 'auster', 'squid', 'calamari', 'octopus', 'tintenfisch'],
    lupine: ['lupin', 'lupine'],
    sulfite: ['sulphite', 'sulfite', 'schwefeldioxid']
  };

  const ALLERGY_ALIASES = {
    milch: ['milch', 'milchprotein', 'kuhmilch', 'kuhmilchprotein', 'milk', 'dairy'],
    gluten: ['gluten', 'weizen', 'wheat'],
    ei: ['ei', 'eier', 'egg'],
    soja: ['soja', 'soy'],
    erdnuss: ['erdnuss', 'erdnüsse', 'erdnuesse', 'peanut'],
    schalenfruchte: ['nuss', 'nüsse', 'nuesse', 'schalenfrüchte', 'schalenfruchte', 'mandel', 'cashew', 'haselnuss', 'walnuss'],
    sellerie: ['sellerie', 'celery'],
    senf: ['senf', 'mustard'],
    sesam: ['sesam', 'sesame'],
    fisch: ['fisch', 'fish'],
    krebstiere: ['krebstiere', 'garnele', 'garnelen', 'shrimp'],
    weichtiere: ['weichtiere', 'muschel', 'muscheln'],
    lupine: ['lupine', 'lupin'],
    sulfite: ['sulfit', 'sulfite', 'schwefeldioxid']
  };

  const AMBIGUOUS_TERMS = [
    'stock', 'broth', 'bouillon', 'brühe', 'bruehe', 'seasoning', 'gewürzmischung', 'gewurzmischung',
    'spice mix', 'sauce', 'soße', 'sosse', 'dressing', 'marinade', 'gravy', 'instant', 'ready-made'
  ];

  const NON_DAIRY_PHRASES = [
    'coconut milk', 'kokosmilch', 'coconut cream', 'kokoscreme', 'almond milk', 'mandeldrink',
    'soy milk', 'soya milk', 'sojadrink', 'oat milk', 'haferdrink', 'rice milk', 'reisdrink',
    'plant milk', 'plant-based milk', 'dairy-free', 'milk-free', 'milchfrei', 'vegan cheese',
    'vegan cream', 'vegan butter', 'peanut butter', 'erdnussbutter', 'almond butter', 'mandelmus',
    'cashew butter', 'cocoa butter', 'kakaobutter', 'butter beans', 'butterbean', 'cream of tartar', 'weinstein'
  ];

  function allergyKey(value) {
    const normalized = normalize(value);
    for (const [key, aliases] of Object.entries(ALLERGY_ALIASES)) {
      if (aliases.some(alias => normalized === normalize(alias) || normalized.includes(normalize(alias)))) return key;
    }
    return normalized;
  }

  function profileAllergyKeys(profiles) {
    return unique((profiles || []).flatMap(profile => [...(profile.allergies || []), ...(profile.intolerances || [])]).map(allergyKey));
  }

  function termMatch(text, term) {
    const haystack = ` ${normalize(text).replace(/[^a-z0-9äöüß]+/g, ' ')} `;
    const needle = ` ${normalize(term).replace(/[^a-z0-9äöüß]+/g, ' ')} `;
    return haystack.includes(needle) || normalize(text).includes(normalize(term));
  }

  function detectedAllergens(ingredient) {
    const explicit = (ingredient.allergens || []).map(allergyKey);
    const text = normalize(ingredient.name);
    const detected = [...explicit];

    if (!ingredient.replacesAllergen) {
      for (const [key, terms] of Object.entries(ALLERGEN_TERMS)) {
        if (key === 'milch' && NON_DAIRY_PHRASES.some(phrase => termMatch(text, phrase))) continue;
        if (terms.some(term => termMatch(text, term))) detected.push(key);
      }
    }
    return unique(detected);
  }

  function conflictsWithProfiles(ingredient, profiles) {
    const wanted = profileAllergyKeys(profiles);
    return detectedAllergens(ingredient).filter(key => wanted.includes(key));
  }

  function hasProfileAllergy(profiles, key) {
    return profileAllergyKeys(profiles).includes(key);
  }

  function chooseCandidate(candidates, profiles) {
    return candidates.find(candidate => !(candidate.allergens || []).some(allergen => hasProfileAllergy(profiles, allergyKey(allergen)))) || null;
  }

  const MILK_RULES = [
    {
      id: 'condensed-milk',
      terms: ['condensed milk', 'evaporated milk', 'kondensmilch'],
      candidates: [
        { name: 'milchfreie Kondensmilch-Alternative', allergens: [], note: 'Menge zunächst 1:1 ersetzen; Süße und Konsistenz des konkreten Produkts kontrollieren.' }
      ]
    },
    {
      id: 'ice-cream',
      terms: ['ice cream', 'eiscreme', 'milcheis'],
      candidates: [
        { name: 'milchfreie Eisalternative', allergens: [], note: 'Nur ein konkret geprüftes Produkt verwenden; mögliche Soja- oder Nussbestandteile beachten.' }
      ]
    },
    {
      id: 'soft-cheese',
      terms: ['cream cheese', 'frischkäse', 'frischkaese', 'mascarpone', 'ricotta'],
      candidates: [
        { name: 'milchfreie Frischkäsealternative', allergens: [], note: 'Menge zunächst 1:1 ersetzen; Salzgehalt und Festigkeit kontrollieren.' }
      ]
    },
    {
      id: 'milk-drink',
      terms: ['milk', 'milch'],
      candidates: [
        { name: 'Reisdrink, ausdrücklich milchfrei', allergens: [], note: '1:1 verwenden; Produktkennzeichnung und Spurenhinweis prüfen.' },
        { name: 'Sojadrink, ausdrücklich milchfrei', allergens: ['Soja'], note: '1:1 verwenden; Produktkennzeichnung prüfen.' },
        { name: 'Haferdrink, ausdrücklich milchfrei', allergens: ['Gluten'], note: '1:1 verwenden; bei Glutenallergie nur ausdrücklich geeignetes Produkt nutzen.' }
      ]
    },
    {
      id: 'cream',
      terms: ['cream', 'sahne', 'double cream', 'heavy cream', 'whipping cream', 'creme fraiche', 'crème fraîche', 'schmand', 'sour cream'],
      candidates: [
        { name: 'Reis-Kochcreme, ausdrücklich milchfrei', allergens: [], note: 'Menge zunächst 1:1 ersetzen; Konsistenz beim Kochen prüfen.' },
        { name: 'Soja-Kochcreme, ausdrücklich milchfrei', allergens: ['Soja'], note: 'Menge 1:1 ersetzen; Produktkennzeichnung prüfen.' },
        { name: 'Hafer-Kochcreme, ausdrücklich milchfrei', allergens: ['Gluten'], note: 'Menge 1:1 ersetzen; bei Glutenallergie Produkt besonders prüfen.' }
      ]
    },
    {
      id: 'butter',
      terms: ['butter', 'ghee'],
      candidates: [
        { name: 'milchfreie Pflanzenmargarine', allergens: [], note: 'Beim Backen meist 1:1; zum Braten kann neutrales Pflanzenöl geeigneter sein.' },
        { name: 'neutrales Pflanzenöl', allergens: [], note: 'Zum Braten geeignet; beim Backen Konsistenz und Menge kontrollieren.' }
      ]
    },
    {
      id: 'yogurt',
      terms: ['yoghurt', 'yogurt', 'joghurt', 'quark'],
      candidates: [
        { name: 'Kokosjoghurt, ausdrücklich milchfrei', allergens: [], note: '1:1 ersetzen; Eigengeschmack beachten.' },
        { name: 'Sojajoghurt, ausdrücklich milchfrei', allergens: ['Soja'], note: '1:1 ersetzen; Produktkennzeichnung prüfen.' }
      ]
    },
    {
      id: 'cheese',
      terms: ['cheese', 'käse', 'kaese', 'parmesan', 'mozzarella', 'cheddar', 'gouda'],
      candidates: [
        { name: 'milchfreie Käsealternative', allergens: [], note: 'Menge zunächst beibehalten; Schmelz- und Salzverhalten kann abweichen.' },
        { name: 'Hefeflocken', allergens: [], note: 'Vor allem für würzigen Geschmack; nicht für jedes Überbacken geeignet.' }
      ]
    },
    {
      id: 'buttermilk',
      terms: ['buttermilk', 'buttermilch'],
      candidates: [
        { name: 'Reisdrink mit etwas Zitronensaft', allergens: [], note: 'Pro 250 ml Drink etwa 1 EL Zitronensaft einrühren und kurz stehen lassen.' }
      ]
    }
  ];

  const UNRESOLVED_MILK_TERMS = ['whey', 'molke', 'casein', 'kasein', 'caseinate', 'milk powder', 'milchpulver'];

  function milkReplacement(ingredient, profiles) {
    const text = normalize(ingredient.name);
    if (UNRESOLVED_MILK_TERMS.some(term => termMatch(text, term))) {
      return { replaceable: false, reason: 'Verarbeitetes Milchprotein erfordert ein konkret geprüftes Alternativprodukt.' };
    }

    const rule = MILK_RULES.find(entry => entry.terms.some(term => termMatch(text, term)));
    if (!rule) return { replaceable: false, reason: 'Kein verlässlicher Standardersatz hinterlegt.' };
    const candidate = chooseCandidate(rule.candidates, profiles);
    if (!candidate) return { replaceable: false, reason: 'Alle bekannten Ersatzoptionen kollidieren mit weiteren eingetragenen Allergien.' };
    return { replaceable: true, ruleId: rule.id, candidate };
  }

  function dietConflict(recipe, profile) {
    const recipeDiet = normalize(recipe.diet);
    const personDiet = normalize(profile.diet);
    if (!personDiet || personDiet === 'omnivor') return false;
    if (personDiet === 'vegetarisch') return !['vegetarisch', 'vegan'].includes(recipeDiet);
    if (personDiet === 'vegan') return recipeDiet !== 'vegan';
    if (personDiet === 'pescetarisch') return !['pescetarisch', 'vegetarisch', 'vegan'].includes(recipeDiet);
    return false;
  }

  function analyze(recipe, profiles = []) {
    const conflicts = [];
    const replacements = [];
    const unresolved = [];
    const checks = [];
    const dislikes = [];
    const dietConflicts = [];

    for (const profile of profiles) {
      if (dietConflict(recipe, profile)) dietConflicts.push(`${profile.name}: Ernährungsform ${profile.diet}`);
    }

    for (const ingredient of recipe.ingredients || []) {
      const ingredientConflicts = conflictsWithProfiles(ingredient, profiles);
      for (const allergen of ingredientConflicts) {
        const conflict = { ingredient: ingredient.name, allergen, profiles: profiles.filter(profile => [...(profile.allergies || []), ...(profile.intolerances || [])].some(item => allergyKey(item) === allergen)).map(profile => profile.name) };
        conflicts.push(conflict);
        if (allergen === 'milch') {
          const replacement = milkReplacement(ingredient, profiles);
          if (replacement.replaceable) replacements.push({ ...conflict, ...replacement });
          else unresolved.push({ ...conflict, reason: replacement.reason });
        } else {
          unresolved.push({ ...conflict, reason: 'Für dieses Allergen ist noch keine automatische Ersatzregel hinterlegt.' });
        }
      }

      if (ingredient.requiresProductCheck && !recipe.productConfirmed) checks.push(`${ingredient.name}: konkretes Produkt prüfen`);
      if (AMBIGUOUS_TERMS.some(term => termMatch(ingredient.name, term))) checks.push(`${ingredient.name}: Unterzutaten oder Produktangaben unklar`);

      for (const profile of profiles) {
        for (const disliked of profile.dislikes || []) {
          if (termMatch(ingredient.name, disliked)) dislikes.push(`${profile.name} mag ${disliked} nicht`);
        }
      }
    }

    let status = 'direct';
    if (dietConflicts.length || unresolved.length) status = 'blocked';
    else if (conflicts.length && replacements.length === conflicts.length) status = 'adaptable';
    else if (checks.length || dislikes.length) status = 'check';

    if (recipe.productConfirmed && status === 'check' && !dislikes.length && !dietConflicts.length && !unresolved.length && !conflicts.length) status = 'direct';

    return {
      status,
      conflicts,
      replacements,
      unresolved,
      checks: unique(checks),
      dislikes: unique(dislikes),
      dietConflicts: unique(dietConflicts),
      safe: status === 'direct',
      adaptable: status === 'adaptable'
    };
  }

  function parseFraction(value) {
    const text = String(value || '').trim();
    if (!text) return 0;
    const unicode = { '½': .5, '⅓': 1 / 3, '⅔': 2 / 3, '¼': .25, '¾': .75, '⅛': .125, '⅜': .375, '⅝': .625, '⅞': .875 };
    let total = 0;
    let rest = text;
    for (const [symbol, amount] of Object.entries(unicode)) {
      if (rest.includes(symbol)) {
        total += amount;
        rest = rest.replace(symbol, '');
      }
    }
    const parts = rest.trim().split(/\s+/);
    for (const part of parts) {
      if (/^\d+\/\d+$/.test(part)) {
        const [a, b] = part.split('/').map(Number);
        if (b) total += a / b;
      } else if (/^\d+(?:[.,]\d+)?$/.test(part)) {
        total += Number(part.replace(',', '.'));
      }
    }
    return total;
  }

  function parseMeasure(measure) {
    const raw = String(measure || '').trim();
    if (!raw) return { amount: 1, unit: 'nach Bedarf', originalMeasure: '' };
    const match = raw.match(/^([\d\s.,/½⅓⅔¼¾⅛⅜⅝⅞-]+)\s*(.*)$/);
    const amountPart = match ? match[1].split('-')[0].trim() : '';
    const amount = parseFraction(amountPart) || 1;
    let unit = match ? match[2].trim() : raw;
    const unitMap = [
      [/^(g|gram|grams)$/i, 'g'], [/^(kg|kilogram|kilograms)$/i, 'kg'], [/^(ml|milliliter|milliliters)$/i, 'ml'],
      [/^(l|liter|liters|litre|litres)$/i, 'l'], [/^(tbsp|tablespoon|tablespoons)$/i, 'EL'], [/^(tsp|teaspoon|teaspoons)$/i, 'TL'],
      [/^(cup|cups)$/i, 'Tasse'], [/^(clove|cloves)$/i, 'Zehe'], [/^(slice|slices)$/i, 'Scheibe'], [/^(pinch)$/i, 'Prise']
    ];
    for (const [pattern, mapped] of unitMap) if (pattern.test(unit)) unit = mapped;
    if (!unit) unit = 'Stück';
    return { amount, unit, originalMeasure: raw };
  }

  function inferDiet(meal) {
    const category = normalize(meal.strCategory);
    const ingredients = Array.from({ length: 20 }, (_, index) => meal[`strIngredient${index + 1}`]).filter(Boolean).map(normalize).join(' ');
    const meatTerms = ['chicken', 'beef', 'pork', 'lamb', 'bacon', 'ham', 'sausage', 'turkey', 'duck', 'veal'];
    const fishTerms = ['fish', 'salmon', 'tuna', 'cod', 'shrimp', 'prawn', 'crab', 'mussel', 'squid'];
    const animalTerms = ['egg', 'milk', 'butter', 'cream', 'cheese', 'yogurt', ...meatTerms, ...fishTerms];
    if (category.includes('vegan') || !animalTerms.some(term => ingredients.includes(term))) return 'Vegan';
    if (category.includes('vegetarian') || (!meatTerms.some(term => ingredients.includes(term)) && !fishTerms.some(term => ingredients.includes(term)))) return 'Vegetarisch';
    if (!meatTerms.some(term => ingredients.includes(term)) && fishTerms.some(term => ingredients.includes(term))) return 'Pescetarisch';
    return 'Omnivor';
  }

  function mealToRecipe(meal) {
    const ingredients = [];
    for (let index = 1; index <= 20; index += 1) {
      const name = String(meal[`strIngredient${index}`] || '').trim();
      if (!name) continue;
      const parsed = parseMeasure(meal[`strMeasure${index}`]);
      ingredients.push({
        name,
        amount: parsed.amount,
        unit: parsed.unit,
        originalMeasure: parsed.originalMeasure,
        allergens: detectedAllergens({ name }).map(key => key === 'milch' ? 'Milch' : key)
      });
    }

    const instructions = String(meal.strInstructions || '').trim();
    const steps = instructions
      .split(/(?:\r?\n)+|(?<=[.!?])\s+(?=[A-Z])/)
      .map(step => step.trim())
      .filter(Boolean);

    return {
      id: `online_${meal.idMeal}`,
      externalId: meal.idMeal,
      name: meal.strMeal || 'Online-Rezept',
      cuisine: meal.strArea || 'International',
      meal: meal.strCategory || 'Hauptgericht',
      diet: inferDiet(meal),
      servings: 4,
      servingsEstimated: true,
      prep: 0,
      cook: 0,
      ingredients,
      steps: steps.length ? steps : ['Zubereitung auf der Originalquelle prüfen.'],
      notes: 'Online-Rezept. Zutaten, Mengen, Produktkennzeichnungen und Zubereitung vor dem Kochen vollständig prüfen.',
      image: meal.strMealThumb || '',
      tags: String(meal.strTags || '').split(',').map(tag => tag.trim()).filter(Boolean),
      source: {
        provider: 'TheMealDB',
        url: meal.strSource || `https://www.themealdb.com/meal/${meal.idMeal}`,
        video: meal.strYoutube || '',
        externalId: meal.idMeal
      },
      importedAt: null
    };
  }

  async function fetchJson(url) {
    const response = await fetch(url, { headers: { Accept: 'application/json' } });
    if (!response.ok) throw new Error(`Rezeptdienst antwortet mit Status ${response.status}.`);
    return response.json();
  }

  async function lookupMeal(id) {
    const data = await fetchJson(`${API_BASE}/lookup.php?i=${encodeURIComponent(id)}`);
    const meal = data.meals?.[0];
    if (!meal) throw new Error('Rezeptdetails wurden nicht gefunden.');
    return mealToRecipe(meal);
  }

  async function search(query, limit = 12) {
    const term = String(query || '').trim();
    if (!term) throw new Error('Bitte einen Suchbegriff eingeben.');

    const [byName, byIngredient] = await Promise.allSettled([
      fetchJson(`${API_BASE}/search.php?s=${encodeURIComponent(term)}`),
      fetchJson(`${API_BASE}/filter.php?i=${encodeURIComponent(term.replace(/\s+/g, '_'))}`)
    ]);

    const fullMeals = byName.status === 'fulfilled' ? (byName.value.meals || []) : [];
    const summaries = byIngredient.status === 'fulfilled' ? (byIngredient.value.meals || []) : [];
    const knownIds = new Set(fullMeals.map(meal => meal.idMeal));
    const detailIds = summaries.map(meal => meal.idMeal).filter(id => !knownIds.has(id)).slice(0, Math.max(0, limit - fullMeals.length));
    const details = await Promise.allSettled(detailIds.map(lookupMeal));
    const detailRecipes = details.filter(result => result.status === 'fulfilled').map(result => result.value);
    const recipes = [...fullMeals.map(mealToRecipe), ...detailRecipes];

    const deduped = [];
    const ids = new Set();
    for (const recipe of recipes) {
      if (ids.has(recipe.externalId)) continue;
      ids.add(recipe.externalId);
      deduped.push(recipe);
      if (deduped.length >= limit) break;
    }
    return deduped;
  }

  function scaledRecipe(recipe, baseServings, desiredServings) {
    const base = Math.max(1, Number(baseServings) || 4);
    const desired = Math.max(1, Number(desiredServings) || base);
    const scale = desired / base;
    return {
      ...recipe,
      servings: desired,
      servingsEstimated: false,
      ingredients: (recipe.ingredients || []).map(ingredient => ({
        ...ingredient,
        amount: Number(ingredient.amount || 0) * scale,
        originalMeasure: ingredient.originalMeasure ? `${ingredient.originalMeasure} (Original, für ${base} angenommene Portionen)` : ''
      }))
    };
  }

  function replaceText(text, from, to) {
    if (!text || !from) return text;
    const escaped = String(from).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return String(text).replace(new RegExp(escaped, 'gi'), to);
  }

  function adapt(recipe, profiles, baseServings = recipe.servings || 4, desiredServings = baseServings) {
    const scaled = scaledRecipe(recipe, baseServings, desiredServings);
    const analysis = analyze(scaled, profiles);
    if (analysis.status === 'blocked') {
      const reason = [...analysis.dietConflicts, ...analysis.unresolved.map(item => `${item.ingredient}: ${item.reason}`)].join('; ');
      throw new Error(reason || 'Dieses Rezept kann nicht automatisch angepasst werden.');
    }

    const replacementMap = new Map(analysis.replacements.map(item => [normalize(item.ingredient), item]));
    const changes = [];
    const ingredients = scaled.ingredients.map(ingredient => {
      const replacement = replacementMap.get(normalize(ingredient.name));
      if (!replacement) return { ...ingredient };
      changes.push({ from: ingredient.name, to: replacement.candidate.name, note: replacement.candidate.note, allergen: replacement.allergen });
      return {
        ...ingredient,
        originalName: ingredient.name,
        name: replacement.candidate.name,
        allergens: replacement.candidate.allergens || [],
        replacesAllergen: replacement.allergen,
        requiresProductCheck: true,
        substitutionNote: replacement.candidate.note
      };
    });

    let steps = [...scaled.steps];
    for (const change of changes) steps = steps.map(step => replaceText(step, change.from, change.to));

    return {
      ...scaled,
      id: '',
      name: changes.length ? `${scaled.name} – angepasst` : scaled.name,
      ingredients,
      steps,
      adaptation: {
        createdAt: new Date().toISOString(),
        changes,
        profiles: (profiles || []).map(profile => profile.name),
        method: 'Lokale Ersatzregeln'
      },
      productConfirmed: false,
      notes: `${scaled.notes || ''}\n${changes.length ? 'Automatisch vorgeschlagene Ersetzungen müssen anhand konkreter Produkte geprüft werden.' : 'Keine automatische Ersetzung erforderlich.'}`.trim()
    };
  }

  window.SKOnline = {
    search,
    analyze,
    adapt,
    mealToRecipe,
    parseMeasure,
    allergyKey,
    statusLabels: {
      direct: 'Kein Konflikt erkannt',
      adaptable: 'Mit Ersatz anpassbar',
      check: 'Prüfung erforderlich',
      blocked: 'Nicht zuverlässig anpassbar'
    }
  };
})();
