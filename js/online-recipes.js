(() => {
  'use strict';

  const MEALDB_API = 'https://www.themealdb.com/api/json/v1/1';
  const SPOONACULAR_API = 'https://api.spoonacular.com';
  const TRANSLATION_API = 'https://api.mymemory.translated.net/get';

  const normalize = value => String(value || '')
    .trim()
    .toLocaleLowerCase('de-DE')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/ß/g, 'ss');
  const unique = values => [...new Set(values.filter(Boolean))];
  const cleanText = value => String(value || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();

  const ALLERGEN_LABELS = {
    gluten: 'Gluten', weizen: 'Weizen', milch: 'Milch', laktose: 'Laktose', ei: 'Ei',
    erdnuss: 'Erdnuss', schalenfruechte: 'Schalenfrüchte', soja: 'Soja', fisch: 'Fisch',
    krebstiere: 'Krebstiere', weichtiere: 'Weichtiere', sellerie: 'Sellerie', senf: 'Senf',
    sesam: 'Sesam', lupine: 'Lupine', sulfite: 'Sulfite'
  };

  const ALLERGY_ALIASES = {
    dairy: 'milch', milk: 'milch', milch: 'milch', milcheiweiss: 'milch', milchprotein: 'milch', casein: 'milch', kasein: 'milch', whey: 'milch', molke: 'milch',
    lactose: 'laktose', laktose: 'laktose',
    egg: 'ei', eggs: 'ei', ei: 'ei', eier: 'ei',
    peanut: 'erdnuss', peanuts: 'erdnuss', erdnuss: 'erdnuss', erdnusse: 'erdnuss',
    nuts: 'schalenfruechte', tree_nuts: 'schalenfruechte', schalenfruchte: 'schalenfruechte', nusse: 'schalenfruechte', nuss: 'schalenfruechte',
    mandel: 'schalenfruechte', mandeln: 'schalenfruechte', almond: 'schalenfruechte', almonds: 'schalenfruechte',
    haselnuss: 'schalenfruechte', hazelnut: 'schalenfruechte', walnuss: 'schalenfruechte', walnut: 'schalenfruechte',
    cashew: 'schalenfruechte', pistazie: 'schalenfruechte', macadamia: 'schalenfruechte', pekannuss: 'schalenfruechte',
    soy: 'soja', soya: 'soja', soja: 'soja',
    gluten: 'gluten', wheat: 'weizen', weizen: 'weizen',
    fish: 'fisch', fisch: 'fisch',
    crustaceans: 'krebstiere', crustacean: 'krebstiere', krebstiere: 'krebstiere', krebs: 'krebstiere',
    molluscs: 'weichtiere', mollusk: 'weichtiere', weichtiere: 'weichtiere',
    celery: 'sellerie', sellerie: 'sellerie',
    mustard: 'senf', senf: 'senf',
    sesame: 'sesam', sesam: 'sesam',
    lupin: 'lupine', lupine: 'lupine',
    sulphites: 'sulfite', sulfites: 'sulfite', sulfit: 'sulfite', sulfite: 'sulfite', schwefeldioxid: 'sulfite'
  };

  const ALLERGEN_TERMS = {
    milch: ['milk', 'whole milk', 'skimmed milk', 'butter', 'ghee', 'cream', 'double cream', 'heavy cream', 'whipping cream', 'sour cream', 'creme fraiche', 'crème fraîche', 'cheese', 'parmesan', 'mozzarella', 'cheddar', 'gouda', 'ricotta', 'mascarpone', 'yogurt', 'yoghurt', 'whey', 'casein', 'caseinate', 'milk powder', 'buttermilk', 'milch', 'butter', 'sahne', 'schmand', 'käse', 'kaese', 'joghurt', 'quark', 'molke', 'kasein', 'milchpulver', 'buttermilch'],
    laktose: ['milk', 'cream', 'butter', 'cheese', 'yogurt', 'whey', 'milk powder', 'milch', 'sahne', 'butter', 'käse', 'joghurt', 'molke', 'milchpulver', 'laktose'],
    ei: ['egg', 'eggs', 'egg yolk', 'egg white', 'mayonnaise', 'meringue', 'ei', 'eier', 'eigelb', 'eiweiss', 'eiweiß', 'mayonnaise', 'baiser'],
    gluten: ['wheat', 'flour', 'bread', 'breadcrumbs', 'pasta', 'noodles', 'spaghetti', 'couscous', 'bulgur', 'barley', 'rye', 'spelt', 'seitan', 'soy sauce', 'weizen', 'mehl', 'brot', 'semmelbrösel', 'paniermehl', 'nudeln', 'roggen', 'gerste', 'dinkel', 'couscous', 'bulgur', 'seitan', 'sojasauce'],
    weizen: ['wheat', 'flour', 'bread', 'breadcrumbs', 'pasta', 'noodles', 'spaghetti', 'couscous', 'bulgur', 'semolina', 'weizen', 'weizenmehl', 'mehl', 'brot', 'paniermehl', 'nudeln', 'grieß', 'griess'],
    erdnuss: ['peanut', 'peanuts', 'peanut butter', 'groundnut', 'erdnuss', 'erdnüsse', 'erdnussbutter'],
    schalenfruechte: ['almond', 'hazelnut', 'walnut', 'cashew', 'pecan', 'pistachio', 'macadamia', 'brazil nut', 'marzipan', 'mandel', 'haselnuss', 'walnuss', 'cashew', 'pekannuss', 'pistazie', 'macadamia', 'paranuss', 'marzipan'],
    soja: ['soy', 'soya', 'tofu', 'tempeh', 'edamame', 'miso', 'soy sauce', 'sojasauce', 'soja', 'tofu', 'tempeh', 'edamame', 'miso'],
    fisch: ['fish', 'salmon', 'tuna', 'cod', 'anchovy', 'anchovies', 'sardine', 'trout', 'haddock', 'fish sauce', 'fisch', 'lachs', 'thunfisch', 'kabeljau', 'sardine', 'forelle', 'fischsauce', 'sardelle'],
    krebstiere: ['shrimp', 'prawn', 'crab', 'lobster', 'crayfish', 'langoustine', 'garnele', 'krabbe', 'hummer', 'krebs', 'scampi'],
    weichtiere: ['mussel', 'oyster', 'squid', 'octopus', 'clam', 'snail', 'muschel', 'auster', 'tintenfisch', 'oktopus', 'schnecke', 'calamari'],
    sellerie: ['celery', 'celeriac', 'sellerie', 'knollensellerie', 'stock', 'broth', 'bouillon', 'brühe', 'bruhe'],
    senf: ['mustard', 'senf'],
    sesam: ['sesame', 'tahini', 'sesam', 'tahin'],
    lupine: ['lupin', 'lupine'],
    sulfite: ['sulphite', 'sulfite', 'sulfur dioxide', 'sulphur dioxide', 'schwefeldioxid', 'sulfit', 'wine', 'wein', 'sherry']
  };

  const NON_DAIRY_PHRASES = ['coconut milk', 'kokosmilch', 'almond milk', 'mandeldrink', 'soy milk', 'sojadrink', 'oat milk', 'haferdrink', 'rice milk', 'reisdrink', 'peanut butter', 'erdnussbutter', 'cocoa butter', 'kakaobutter', 'butter beans', 'butterbohnen'];
  const AMBIGUOUS_TERMS = ['stock cube', 'stock', 'broth', 'seasoning', 'spice mix', 'sauce', 'gravy', 'bouillon', 'brühe', 'bruhe', 'gewürzmischung', 'gewurzmischung', 'soße', 'sosse', 'fertigprodukt', 'aroma'];

  function allergyKey(value) {
    const key = normalize(value).replace(/[\s-]+/g, '_');
    return ALLERGY_ALIASES[key] || ALLERGY_ALIASES[key.replace(/_/g, '')] || normalize(value).replace(/\s+/g, '_');
  }

  function allergenLabel(key) {
    return ALLERGEN_LABELS[key] || String(key || '').replace(/_/g, ' ');
  }

  function termMatch(text, term) {
    const haystackText = normalize(text).replace(/[^a-z0-9]+/g, ' ').trim();
    const needleText = normalize(term).replace(/[^a-z0-9]+/g, ' ').trim();
    if (!haystackText || !needleText) return false;
    if (haystackText === needleText || ` ${haystackText} `.includes(` ${needleText} `)) return true;
    if (needleText.includes(' ')) return false;
    if (needleText.length < 4) return false;
    return haystackText.split(/\s+/).some(word => word.startsWith(needleText) || word.endsWith(needleText));
  }

  function profileEntries(profiles = []) {
    const entries = [];
    for (const profile of profiles) {
      for (const raw of profile.allergies || []) entries.push({ profile: profile.name, raw, key: allergyKey(raw), kind: 'Allergie' });
      for (const raw of profile.intolerances || []) entries.push({ profile: profile.name, raw, key: allergyKey(raw), kind: 'Unverträglichkeit' });
    }
    return entries;
  }

  function profileAllergyKeys(profiles = []) {
    return unique(profileEntries(profiles).map(entry => entry.key));
  }

  function detectedAllergens(ingredient) {
    const explicit = (ingredient.allergens || []).map(allergyKey);
    const text = normalize(ingredient.name);
    const detected = [...explicit];
    if (!ingredient.replacesAllergen) {
      for (const [key, terms] of Object.entries(ALLERGEN_TERMS)) {
        if ((key === 'milch' || key === 'laktose') && NON_DAIRY_PHRASES.some(phrase => termMatch(text, phrase))) continue;
        if (terms.some(term => termMatch(text, term))) detected.push(key);
      }
    }
    return unique(detected);
  }

  function conflictsWithProfiles(ingredient, profiles) {
    const detected = detectedAllergens(ingredient);
    const entries = profileEntries(profiles);
    const matches = [];
    for (const entry of entries) {
      const knownMatch = detected.includes(entry.key)
        || (entry.key === 'gluten' && detected.includes('weizen'))
        || (entry.key === 'weizen' && detected.includes('gluten'))
        || (entry.key === 'laktose' && detected.includes('milch'));
      const customMatch = !ALLERGEN_LABELS[entry.key] && termMatch(ingredient.name, entry.raw);
      if (knownMatch || customMatch) matches.push(entry);
    }
    return matches;
  }

  function candidateAllowed(candidate, profiles) {
    const wanted = profileAllergyKeys(profiles);
    return !(candidate.allergens || []).some(value => {
      const key = allergyKey(value);
      return wanted.includes(key) || (key === 'weizen' && wanted.includes('gluten')) || (key === 'gluten' && wanted.includes('weizen'));
    });
  }

  const REPLACEMENT_RULES = [
    { allergen: 'milch', terms: ['condensed milk', 'evaporated milk', 'kondensmilch'], candidates: [{ name: 'milchfreie Kondensmilch-Alternative', allergens: [], note: 'Menge zunächst 1:1 ersetzen; Süße und Konsistenz kontrollieren.' }] },
    { allergen: 'milch', terms: ['cream cheese', 'frischkäse', 'frischkaese', 'mascarpone', 'ricotta', 'quark'], candidates: [{ name: 'milchfreie Frischkäsealternative', allergens: [], note: 'Menge zunächst 1:1 ersetzen; Salzgehalt und Festigkeit kontrollieren.' }] },
    { allergen: 'milch', terms: ['cream', 'sahne', 'double cream', 'heavy cream', 'whipping cream', 'creme fraiche', 'crème fraîche', 'schmand', 'sour cream'], candidates: [
      { name: 'Reis-Kochcreme, ausdrücklich milchfrei', allergens: [], note: 'Menge zunächst 1:1 ersetzen; Konsistenz beim Kochen prüfen.' },
      { name: 'Soja-Kochcreme, ausdrücklich milchfrei', allergens: ['Soja'], note: 'Menge 1:1 ersetzen; Produktkennzeichnung prüfen.' },
      { name: 'Hafer-Kochcreme, ausdrücklich milchfrei', allergens: ['Gluten'], note: 'Menge 1:1 ersetzen; nur ein geeignet gekennzeichnetes Produkt verwenden.' }
    ] },
    { allergen: 'milch', terms: ['butter', 'ghee'], candidates: [{ name: 'milchfreie Pflanzenmargarine', allergens: [], note: 'Beim Backen meist 1:1; zum Braten kann neutrales Pflanzenöl geeigneter sein.' }, { name: 'neutrales Pflanzenöl', allergens: [], note: 'Zum Braten geeignet; beim Backen Menge und Konsistenz kontrollieren.' }] },
    { allergen: 'milch', terms: ['yoghurt', 'yogurt', 'joghurt'], candidates: [{ name: 'Kokosjoghurt, ausdrücklich milchfrei', allergens: [], note: '1:1 ersetzen; Eigengeschmack beachten.' }, { name: 'Sojajoghurt, ausdrücklich milchfrei', allergens: ['Soja'], note: '1:1 ersetzen; Produktkennzeichnung prüfen.' }] },
    { allergen: 'milch', terms: ['cheese', 'käse', 'kaese', 'parmesan', 'mozzarella', 'cheddar', 'gouda'], candidates: [{ name: 'milchfreie Käsealternative', allergens: [], note: 'Menge zunächst beibehalten; Schmelz- und Salzverhalten kann abweichen.' }, { name: 'Hefeflocken', allergens: [], note: 'Für würzigen Geschmack; nicht als vollständiger Schmelzkäse-Ersatz geeignet.' }] },
    { allergen: 'milch', terms: ['buttermilk', 'buttermilch'], candidates: [{ name: 'Reisdrink mit Zitronensaft', allergens: [], note: 'Pro 250 ml Drink ungefähr 1 EL Zitronensaft einrühren und kurz stehen lassen.' }] },
    { allergen: 'milch', terms: ['milk', 'milch'], candidates: [{ name: 'Reisdrink, ausdrücklich milchfrei', allergens: [], note: '1:1 verwenden; Produktkennzeichnung und Spurenhinweis prüfen.' }, { name: 'Sojadrink, ausdrücklich milchfrei', allergens: ['Soja'], note: '1:1 verwenden; Produktkennzeichnung prüfen.' }, { name: 'Haferdrink, ausdrücklich milchfrei', allergens: ['Gluten'], note: '1:1 verwenden; bei Glutenproblemen nur ausdrücklich geeignetes Produkt nutzen.' }] },
    { allergen: 'laktose', terms: ['milk', 'cream', 'butter', 'cheese', 'yogurt', 'milch', 'sahne', 'butter', 'käse', 'joghurt'], candidates: [{ name: 'laktosefreie Variante des Milchprodukts', allergens: ['Milch'], note: 'Nur bei Laktoseintoleranz geeignet, niemals bei Milchallergie.' }, { name: 'milchfreie pflanzliche Alternative', allergens: [], note: 'Konkretes Produkt und Funktion im Rezept prüfen.' }] },
    { allergen: 'ei', terms: ['mayonnaise', 'mayo'], candidates: [{ name: 'eifreie Mayonnaise', allergens: [], note: 'Menge 1:1 ersetzen und Produktkennzeichnung prüfen.' }] },
    { allergen: 'ei', terms: ['egg white', 'eiweiß', 'eiweiss', 'meringue', 'baiser'], candidates: [{ name: 'Aquafaba', allergens: [], note: 'Als Eischnee-Ersatz etwa 30 ml Aquafaba pro Eiweiß; Konsistenz prüfen.' }] },
    { allergen: 'ei', terms: ['egg', 'eggs', 'ei', 'eier', 'eigelb'], candidates: [{ name: 'geprüfter Ei-Ersatz passend zum Rezept', allergens: [], note: 'Beim Backen z. B. Ei-Ersatzpulver oder Leinsamen-Ei; Bindung und Lockerung unterscheiden.' }, { name: 'Aquafaba', allergens: [], note: 'Vor allem für Aufschlagen und leichte Bindung geeignet.' }] },
    { allergen: 'gluten', terms: ['soy sauce', 'sojasauce'], candidates: [{ name: 'glutenfreie Tamari-Soße', allergens: ['Soja'], note: 'Nur ausdrücklich glutenfrei gekennzeichnetes Produkt verwenden.' }, { name: 'Coconut Aminos', allergens: [], note: 'Geschmack ist milder und süßer; Menge abschmecken.' }] },
    { allergen: 'weizen', terms: ['soy sauce', 'sojasauce'], candidates: [{ name: 'weizenfreie Tamari-Soße', allergens: ['Soja'], note: 'Zutatenliste und Kennzeichnung prüfen.' }, { name: 'Coconut Aminos', allergens: [], note: 'Geschmack und Salzmenge anpassen.' }] },
    { allergen: 'gluten', terms: ['pasta', 'noodles', 'spaghetti', 'nudeln'], candidates: [{ name: 'glutenfreie Nudeln', allergens: [], note: 'Menge 1:1; Kochzeit nach Packungsangabe anpassen.' }] },
    { allergen: 'weizen', terms: ['pasta', 'noodles', 'spaghetti', 'nudeln'], candidates: [{ name: 'weizenfreie Nudeln', allergens: [], note: 'Menge 1:1; konkrete Zutaten und Kochzeit prüfen.' }] },
    { allergen: 'gluten', terms: ['breadcrumbs', 'bread crumbs', 'paniermehl', 'semmelbrösel'], candidates: [{ name: 'glutenfreies Paniermehl', allergens: [], note: 'Menge zunächst 1:1 ersetzen.' }] },
    { allergen: 'weizen', terms: ['breadcrumbs', 'bread crumbs', 'paniermehl', 'semmelbrösel'], candidates: [{ name: 'weizenfreies Paniermehl', allergens: [], note: 'Menge zunächst 1:1 ersetzen.' }] },
    { allergen: 'gluten', terms: ['flour', 'mehl', 'wheat', 'weizen'], candidates: [{ name: 'glutenfreie Mehlmischung', allergens: [], note: 'Beim Backen Bindung und Flüssigkeitsmenge kontrollieren; nicht jede Mischung ersetzt Weizenmehl 1:1.' }] },
    { allergen: 'weizen', terms: ['flour', 'mehl', 'wheat', 'weizen'], candidates: [{ name: 'weizenfreie Mehlmischung', allergens: [], note: 'Bindung und Flüssigkeitsmenge kontrollieren.' }] },
    { allergen: 'gluten', terms: ['bread', 'brot'], candidates: [{ name: 'glutenfreies Brot', allergens: [], note: 'Konkretes Produkt und Spurenhinweise prüfen.' }] },
    { allergen: 'weizen', terms: ['bread', 'brot'], candidates: [{ name: 'weizenfreies Brot', allergens: [], note: 'Konkretes Produkt und Spurenhinweise prüfen.' }] },
    { allergen: 'erdnuss', terms: ['peanut butter', 'erdnussbutter'], candidates: [{ name: 'Sonnenblumenkernmus', allergens: [], note: 'Menge 1:1; Geschmack und Konsistenz abschmecken.' }] },
    { allergen: 'erdnuss', terms: ['peanut', 'peanuts', 'erdnuss', 'erdnüsse'], candidates: [{ name: 'geröstete Sonnenblumenkerne', allergens: [], note: 'Als Topping oder Crunch geeignet; Menge nach Geschmack.' }, { name: 'geröstete Kichererbsen', allergens: [], note: 'Als knusprige Einlage geeignet.' }] },
    { allergen: 'schalenfruechte', terms: ['nut butter', 'almond butter', 'cashew butter', 'nussmus', 'mandelmus', 'cashewmus'], candidates: [{ name: 'Sonnenblumenkernmus', allergens: [], note: 'Menge 1:1; Geschmack prüfen.' }] },
    { allergen: 'schalenfruechte', terms: ['almond', 'hazelnut', 'walnut', 'cashew', 'pecan', 'pistachio', 'macadamia', 'mandel', 'haselnuss', 'walnuss', 'cashew', 'pekannuss', 'pistazie'], candidates: [{ name: 'Sonnenblumen- oder Kürbiskerne', allergens: [], note: 'Als Topping oder Strukturgeber; Menge nach Rezeptfunktion anpassen.' }] },
    { allergen: 'soja', terms: ['soy sauce', 'sojasauce'], candidates: [{ name: 'Coconut Aminos', allergens: [], note: 'Milder und süßer als Sojasoße; Salzmenge anpassen.' }] },
    { allergen: 'soja', terms: ['tofu', 'tempeh'], candidates: [{ name: 'Kichererbsen oder feste Pilze', allergens: [], note: 'Kein identischer Ersatz; Menge und Garzeit anpassen.' }] },
    { allergen: 'soja', terms: ['soy milk', 'sojadrink', 'soja-kochcreme', 'sojacreme'], candidates: [{ name: 'Reis- oder Haferalternative', allergens: [], note: 'Bei Glutenproblemen Reisprodukt bevorzugen; Produkt prüfen.' }] },
    { allergen: 'sellerie', terms: ['stock', 'broth', 'stock cube', 'bouillon', 'brühe', 'bruhe'], candidates: [{ name: 'selleriefreie Brühe', allergens: [], note: 'Nur ein konkret als selleriefrei geprüftes Produkt verwenden.' }] },
    { allergen: 'sellerie', terms: ['celery', 'celeriac', 'sellerie'], candidates: [{ name: 'Fenchel oder Petersilienwurzel', allergens: [], note: 'Geschmack und Garzeit unterscheiden sich; je nach Gericht auswählen.' }] },
    { allergen: 'senf', terms: ['mustard', 'senf'], candidates: [{ name: 'senffreie Würzpaste', allergens: [], note: 'Säure und Schärfe mit Meerrettich, Essig oder Gewürzen vorsichtig nachbilden; Produkt prüfen.' }] },
    { allergen: 'sesam', terms: ['tahini', 'tahin'], candidates: [{ name: 'Sonnenblumenkernmus', allergens: [], note: 'Menge 1:1; Geschmack unterscheidet sich.' }] },
    { allergen: 'sesam', terms: ['sesame oil', 'sesamöl'], candidates: [{ name: 'geeignetes Pflanzenöl', allergens: [], note: 'Sesamaroma entfällt; neutrales oder geröstetes Öl je nach Gericht verwenden.' }] },
    { allergen: 'sesam', terms: ['sesame', 'sesam'], candidates: [{ name: 'Sonnenblumen- oder Kürbiskerne', allergens: [], note: 'Als Topping oder Strukturgeber verwenden.' }] },
    { allergen: 'lupine', terms: ['lupin', 'lupine'], candidates: [{ name: 'lupinenfreie Produktvariante', allergens: [], note: 'Zutatenliste der konkreten Alternative vollständig prüfen.' }] },
    { allergen: 'sulfite', terms: ['wine', 'wein', 'sherry'], candidates: [{ name: 'sulfitfreie Kochalternative', allergens: [], note: 'Je nach Rezept Traubensaft, Brühe oder Säure verwenden; konkrete Produkte prüfen.' }] },
    { allergen: 'fisch', terms: ['fish sauce', 'fischsauce'], candidates: [{ name: 'fischfreie Würzsoße oder Pilzbrühe', allergens: [], note: 'Salz und Umami vorsichtig anpassen; Zutatenliste prüfen.' }] },
    { allergen: 'fisch', terms: ['anchovy', 'anchovies', 'sardelle', 'sardellen'], candidates: [{ name: 'Kapern und etwas Pilzbrühe', allergens: [], note: 'Nur zur Würzung geeignet, nicht als Hauptzutat.' }] },
    { allergen: 'krebstiere', terms: ['shrimp', 'prawn', 'garnele', 'garnelen'], candidates: [{ name: 'Kräuterseitlinge oder feste Pilze', allergens: [], note: 'Textur und Garzeit unterscheiden sich deutlich.' }] },
    { allergen: 'weichtiere', terms: ['squid', 'octopus', 'calamari', 'tintenfisch'], candidates: [{ name: 'Kräuterseitlinge', allergens: [], note: 'Kein identischer Ersatz; Schnitt und Garzeit anpassen.' }] }
  ];

  function findReplacement(ingredient, allergen, profiles) {
    const rules = REPLACEMENT_RULES.filter(rule => rule.allergen === allergen && rule.terms.some(term => termMatch(ingredient.name, term)));
    for (const rule of rules) {
      const candidate = rule.candidates.find(item => candidateAllowed(item, profiles));
      if (candidate) return { replaceable: true, candidate, ruleId: `${allergen}:${rule.terms[0]}` };
    }
    return { replaceable: false, reason: `Für ${allergenLabel(allergen)} ist bei dieser Zutat kein ausreichend verlässlicher Standardersatz hinterlegt.` };
  }

  const DIET_TERMS = {
    meat: ['chicken', 'beef', 'pork', 'lamb', 'bacon', 'ham', 'sausage', 'turkey', 'duck', 'veal', 'minced meat', 'ground beef', 'hähnchen', 'hahnchen', 'rind', 'schwein', 'lamm', 'speck', 'schinken', 'wurst', 'pute', 'ente', 'hackfleisch'],
    fish: ALLERGEN_TERMS.fisch,
    shellfish: [...ALLERGEN_TERMS.krebstiere, ...ALLERGEN_TERMS.weichtiere],
    dairy: ALLERGEN_TERMS.milch,
    egg: ALLERGEN_TERMS.ei,
    honey: ['honey', 'honig']
  };

  function dietDisallowedCategories(profile) {
    const diet = normalize(profile.diet);
    if (diet === 'vegan') return ['meat', 'fish', 'shellfish', 'dairy', 'egg', 'honey'];
    if (diet === 'vegetarisch') return ['meat', 'fish', 'shellfish'];
    if (diet === 'pescetarisch') return ['meat'];
    return [];
  }

  function dietCategory(ingredient, category) {
    return (DIET_TERMS[category] || []).some(term => termMatch(ingredient.name, term));
  }

  function dietReplacement(ingredient, category, profiles) {
    if (category === 'dairy') return findReplacement(ingredient, 'milch', profiles);
    if (category === 'egg') return findReplacement(ingredient, 'ei', profiles);
    const candidates = {
      meat: [{ name: 'pflanzliche Fleischalternative', allergens: [], note: 'Konkretes Produkt auf Allergene prüfen; Garzeit und Würzung anpassen.' }, { name: 'Linsen oder Pilze', allergens: [], note: 'Kein identischer Ersatz; Menge und Garzeit anpassen.' }],
      fish: [{ name: 'pflanzliche Fischalternative', allergens: [], note: 'Konkretes Produkt auf Allergene prüfen; Geschmack und Garzeit anpassen.' }, { name: 'Kräuterseitlinge', allergens: [], note: 'Kein identischer Ersatz; besonders für gebratene Textur geeignet.' }],
      shellfish: [{ name: 'Kräuterseitlinge', allergens: [], note: 'Kein identischer Ersatz; Textur und Garzeit anpassen.' }],
      honey: [{ name: 'Ahornsirup oder Zuckerrübensirup', allergens: [], note: 'Menge zunächst 1:1, Süße abschmecken.' }]
    }[category] || [];
    const candidate = candidates.find(item => candidateAllowed(item, profiles));
    return candidate ? { replaceable: true, candidate, ruleId: `diet:${category}` } : { replaceable: false, reason: 'Keine mit allen Profilen verträgliche Alternative hinterlegt.' };
  }

  function analyze(recipe, profiles = []) {
    const conflicts = [];
    const replacements = [];
    const unresolved = [];
    const checks = [];
    const dislikes = [];
    const dietConflicts = [];
    const seen = new Set();

    for (const ingredient of recipe.ingredients || []) {
      for (const entry of conflictsWithProfiles(ingredient, profiles)) {
        const signature = `${normalize(ingredient.name)}|${entry.key}|${entry.profile}`;
        if (seen.has(signature)) continue;
        seen.add(signature);
        const conflict = { ingredient: ingredient.name, allergen: allergenLabel(entry.key), allergenKey: entry.key, profiles: [entry.profile], type: entry.kind };
        conflicts.push(conflict);
        const replacement = findReplacement(ingredient, entry.key, profiles);
        if (replacement.replaceable) replacements.push({ ...conflict, ...replacement });
        else unresolved.push({ ...conflict, reason: replacement.reason });
      }

      for (const profile of profiles) {
        for (const category of dietDisallowedCategories(profile)) {
          if (!dietCategory(ingredient, category)) continue;
          const signature = `${normalize(ingredient.name)}|diet:${category}|${profile.name}`;
          if (seen.has(signature)) continue;
          seen.add(signature);
          const conflict = { ingredient: ingredient.name, allergen: 'Ernährungsform', allergenKey: `diet:${category}`, profiles: [profile.name], type: profile.diet };
          dietConflicts.push(`${profile.name}: ${ingredient.name} passt nicht zu ${profile.diet}`);
          const replacement = dietReplacement(ingredient, category, profiles);
          if (replacement.replaceable) replacements.push({ ...conflict, ...replacement });
          else unresolved.push({ ...conflict, reason: replacement.reason });
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

    const replacementKeys = new Set(replacements.map(item => `${normalize(item.ingredient)}|${item.allergenKey}|${item.profiles.join(',')}`));
    const conflictKeys = conflicts.map(item => `${normalize(item.ingredient)}|${item.allergenKey}|${item.profiles.join(',')}`);
    const dietKeys = replacements.filter(item => String(item.allergenKey).startsWith('diet:')).map(item => `${normalize(item.ingredient)}|${item.allergenKey}|${item.profiles.join(',')}`);
    const allConflictCount = conflictKeys.length + dietKeys.length + unresolved.filter(item => String(item.allergenKey).startsWith('diet:')).length;
    const allReplaceable = allConflictCount > 0 && unresolved.length === 0 && replacementKeys.size >= allConflictCount;

    let status = 'direct';
    if (unresolved.length) status = 'blocked';
    else if (allReplaceable || replacements.length) status = 'adaptable';
    else if (checks.length || dislikes.length) status = 'check';

    if (recipe.productConfirmed && status === 'check' && !dislikes.length && !unresolved.length && !conflicts.length) status = 'direct';

    return {
      status,
      conflicts,
      replacements: dedupeReplacements(replacements),
      unresolved: dedupeUnresolved(unresolved),
      checks: unique(checks),
      dislikes: unique(dislikes),
      dietConflicts: unique(dietConflicts),
      safe: status === 'direct',
      adaptable: status === 'adaptable'
    };
  }

  function dedupeReplacements(items) {
    const map = new Map();
    for (const item of items) {
      const key = `${normalize(item.ingredient)}|${item.allergenKey}`;
      if (!map.has(key)) map.set(key, { ...item, profiles: [...item.profiles] });
      else map.get(key).profiles = unique([...map.get(key).profiles, ...item.profiles]);
    }
    return [...map.values()];
  }

  function dedupeUnresolved(items) {
    const map = new Map();
    for (const item of items) {
      const key = `${normalize(item.ingredient)}|${item.allergenKey}|${item.reason}`;
      if (!map.has(key)) map.set(key, { ...item, profiles: [...item.profiles] });
      else map.get(key).profiles = unique([...map.get(key).profiles, ...item.profiles]);
    }
    return [...map.values()];
  }

  function parseFraction(value) {
    const text = String(value || '').trim();
    if (!text) return 0;
    const unicode = { '½': .5, '⅓': 1 / 3, '⅔': 2 / 3, '¼': .25, '¾': .75, '⅛': .125, '⅜': .375, '⅝': .625, '⅞': .875 };
    let total = 0;
    let rest = text;
    for (const [symbol, amount] of Object.entries(unicode)) {
      if (rest.includes(symbol)) { total += amount; rest = rest.replace(symbol, ''); }
    }
    for (const part of rest.trim().split(/\s+/)) {
      if (/^\d+\/\d+$/.test(part)) { const [a, b] = part.split('/').map(Number); if (b) total += a / b; }
      else if (/^\d+(?:[.,]\d+)?$/.test(part)) total += Number(part.replace(',', '.'));
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
      [/^(g|gram|grams)$/i, 'g'], [/^(kg|kilogram|kilograms)$/i, 'kg'], [/^(ml|milliliter|milliliters)$/i, 'ml'], [/^(l|liter|liters|litre|litres)$/i, 'l'],
      [/^(tbsp|tablespoon|tablespoons)$/i, 'EL'], [/^(tsp|teaspoon|teaspoons)$/i, 'TL'], [/^(cup|cups)$/i, 'Tasse'], [/^(clove|cloves)$/i, 'Zehe'],
      [/^(slice|slices)$/i, 'Scheibe'], [/^(pinch)$/i, 'Prise'], [/^(oz|ounce|ounces)$/i, 'oz']
    ];
    for (const [pattern, mapped] of unitMap) if (pattern.test(unit)) unit = mapped;
    if (!unit) unit = 'Stück';
    return { amount, unit, originalMeasure: raw };
  }

  const SEARCH_DICTIONARY = {
    hahnchen: 'chicken', haehnchen: 'chicken', huhn: 'chicken', huhnersuppe: 'chicken soup', rind: 'beef', rindfleisch: 'beef', schwein: 'pork', schweinefleisch: 'pork',
    hackfleisch: 'minced meat', fisch: 'fish', lachs: 'salmon', thunfisch: 'tuna', garnele: 'shrimp', garnelen: 'shrimp',
    kartoffel: 'potato', kartoffeln: 'potato', nudeln: 'pasta', pasta: 'pasta', reis: 'rice', tomaten: 'tomato', tomate: 'tomato', pilze: 'mushroom', pilz: 'mushroom',
    suppe: 'soup', salat: 'salad', kuchen: 'cake', auflauf: 'casserole', curry: 'curry', lasagne: 'lasagna', carbonara: 'carbonara', pizza: 'pizza', burger: 'burger',
    fruhstuck: 'breakfast', fruehstueck: 'breakfast', dessert: 'dessert', vegetarisch: 'vegetarian', vegan: 'vegan', bohnen: 'beans', linse: 'lentil', linsen: 'lentil',
    zucchini: 'zucchini', paprika: 'pepper', spinat: 'spinach', brokkoli: 'broccoli', blumenkohl: 'cauliflower', ei: 'egg', eier: 'egg', kase: 'cheese', kaese: 'cheese'
  };

  const INGREDIENT_DICTIONARY = {
    chicken: 'Hähnchen', beef: 'Rindfleisch', pork: 'Schweinefleisch', lamb: 'Lamm', bacon: 'Speck', ham: 'Schinken', sausage: 'Wurst',
    potato: 'Kartoffel', potatoes: 'Kartoffeln', tomato: 'Tomate', tomatoes: 'Tomaten', onion: 'Zwiebel', onions: 'Zwiebeln', garlic: 'Knoblauch',
    carrot: 'Karotte', carrots: 'Karotten', mushroom: 'Pilz', mushrooms: 'Pilze', rice: 'Reis', pasta: 'Nudeln', spaghetti: 'Spaghetti', flour: 'Mehl',
    milk: 'Milch', butter: 'Butter', cream: 'Sahne', cheese: 'Käse', egg: 'Ei', eggs: 'Eier', sugar: 'Zucker', salt: 'Salz', pepper: 'Pfeffer',
    olive_oil: 'Olivenöl', vegetable_oil: 'Pflanzenöl', water: 'Wasser', stock: 'Brühe', chicken_stock: 'Hühnerbrühe', beef_stock: 'Rinderbrühe',
    parsley: 'Petersilie', basil: 'Basilikum', oregano: 'Oregano', thyme: 'Thymian', lemon: 'Zitrone', lime: 'Limette', cucumber: 'Gurke', zucchini: 'Zucchini',
    aubergine: 'Aubergine', eggplant: 'Aubergine', broccoli: 'Brokkoli', cauliflower: 'Blumenkohl', spinach: 'Spinat', peas: 'Erbsen', beans: 'Bohnen', lentils: 'Linsen',
    salmon: 'Lachs', tuna: 'Thunfisch', cod: 'Kabeljau', shrimp: 'Garnelen', prawns: 'Garnelen', breadcrumbs: 'Paniermehl', mustard: 'Senf', celery: 'Sellerie',
    soy_sauce: 'Sojasoße', coconut_milk: 'Kokosmilch', yogurt: 'Joghurt', yoghurt: 'Joghurt', honey: 'Honig', vinegar: 'Essig', paprika: 'Paprikapulver'
  };

  const CUISINE_MAP = { British: 'Britisch', American: 'Amerikanisch', French: 'Französisch', Italian: 'Italienisch', Spanish: 'Spanisch', Greek: 'Griechisch', Indian: 'Indisch', Chinese: 'Chinesisch', Japanese: 'Japanisch', Mexican: 'Mexikanisch', Turkish: 'Türkisch', Thai: 'Thailändisch', Vietnamese: 'Vietnamesisch', Moroccan: 'Marokkanisch', German: 'Deutsch', Dutch: 'Niederländisch', Polish: 'Polnisch', Russian: 'Russisch', Canadian: 'Kanadisch', Jamaican: 'Jamaikanisch', Irish: 'Irisch', Egyptian: 'Ägyptisch', Croatian: 'Kroatisch', Portuguese: 'Portugiesisch' };
  const CATEGORY_MAP = { Beef: 'Rind', Chicken: 'Hähnchen', Dessert: 'Dessert', Lamb: 'Lamm', Miscellaneous: 'Sonstiges', Pasta: 'Nudeln', Pork: 'Schwein', Seafood: 'Fisch & Meeresfrüchte', Side: 'Beilage', Starter: 'Vorspeise', Vegan: 'Vegan', Vegetarian: 'Vegetarisch', Breakfast: 'Frühstück', Goat: 'Ziege' };

  const translationCache = new Map();
  try {
    const stored = JSON.parse(localStorage.getItem('sicherkochen-translations') || '{}');
    Object.entries(stored).forEach(([key, value]) => translationCache.set(key, value));
  } catch { /* optional cache */ }

  function saveTranslationCache() {
    try {
      const entries = [...translationCache.entries()].slice(-400);
      localStorage.setItem('sicherkochen-translations', JSON.stringify(Object.fromEntries(entries)));
    } catch { /* optional cache */ }
  }

  function dictionaryTranslation(text) {
    const key = normalize(text).replace(/\s+/g, '_');
    return INGREDIENT_DICTIONARY[key] || '';
  }

  function likelyGerman(text) {
    const value = normalize(text);
    return /[äöüß]/i.test(String(text)) || [' und ', ' mit ', ' die ', ' der ', ' das ', ' in ', ' für ', 'fuer', 'zugeben', 'schneiden', 'kochen', 'braten'].some(token => ` ${value} `.includes(token));
  }

  async function translateText(text, source = 'en', target = 'de') {
    const clean = cleanText(text);
    if (!clean || source === target || (target === 'de' && likelyGerman(clean))) return clean;
    const dictionary = target === 'de' ? dictionaryTranslation(clean) : '';
    if (dictionary) return dictionary;
    const key = `${source}|${target}|${clean}`;
    if (translationCache.has(key)) return translationCache.get(key);
    if (clean.length > 480) {
      const chunks = clean.match(/.{1,430}(?:[.!?]\s|$)/g) || [clean.slice(0, 480)];
      const translated = [];
      for (const chunk of chunks.slice(0, 8)) translated.push(await translateText(chunk.trim(), source, target));
      return translated.join(' ');
    }
    try {
      const url = `${TRANSLATION_API}?q=${encodeURIComponent(clean)}&langpair=${encodeURIComponent(`${source}|${target}`)}`;
      const data = await fetchJson(url);
      const translated = cleanText(data.responseData?.translatedText || clean);
      translationCache.set(key, translated);
      saveTranslationCache();
      return translated;
    } catch {
      return clean;
    }
  }

  async function translateSearchQuery(query) {
    const words = normalize(query).split(/\s+/).filter(Boolean);
    const mapped = words.map(word => SEARCH_DICTIONARY[word] || word);
    if (mapped.some((word, index) => word !== words[index])) return mapped.join(' ');
    return translateText(query, 'de', 'en');
  }

  async function translateRecipeToGerman(recipe, full = true) {
    if (!recipe) return recipe;
    const translated = { ...recipe, ingredients: (recipe.ingredients || []).map(item => ({ ...item })), steps: [...(recipe.steps || [])] };
    translated.originalLanguage = recipe.originalLanguage || 'en';
    translated.originalName = recipe.originalName || recipe.name;
    translated.name = await translateText(recipe.name, translated.originalLanguage, 'de');
    translated.cuisine = CUISINE_MAP[recipe.cuisine] || recipe.cuisine || 'International';
    translated.meal = CATEGORY_MAP[recipe.meal] || recipe.meal || 'Hauptgericht';
    if (full) {
      for (const ingredient of translated.ingredients) ingredient.name = await translateText(ingredient.name, translated.originalLanguage, 'de');
      const stepText = translated.steps.join('\n');
      const translatedSteps = await translateText(stepText, translated.originalLanguage, 'de');
      translated.steps = translatedSteps.split(/\n+|(?<=[.!?])\s+(?=[A-ZÄÖÜ])/).map(step => step.trim()).filter(Boolean);
      translated.germanReady = true;
    }
    return translated;
  }

  function inferDietFromIngredients(names, category = '') {
    const ingredients = names.map(normalize).join(' ');
    const meatTerms = DIET_TERMS.meat;
    const fishTerms = [...DIET_TERMS.fish, ...DIET_TERMS.shellfish];
    const animalTerms = [...meatTerms, ...fishTerms, ...DIET_TERMS.dairy, ...DIET_TERMS.egg, ...DIET_TERMS.honey];
    if (normalize(category).includes('vegan') || !animalTerms.some(term => termMatch(ingredients, term))) return 'Vegan';
    if (normalize(category).includes('vegetarian') || (!meatTerms.some(term => termMatch(ingredients, term)) && !fishTerms.some(term => termMatch(ingredients, term)))) return 'Vegetarisch';
    if (!meatTerms.some(term => termMatch(ingredients, term)) && fishTerms.some(term => termMatch(ingredients, term))) return 'Pescetarisch';
    return 'Omnivor';
  }

  function mealToRecipe(meal) {
    const ingredients = [];
    for (let index = 1; index <= 20; index += 1) {
      const name = String(meal[`strIngredient${index}`] || '').trim();
      if (!name) continue;
      const parsed = parseMeasure(meal[`strMeasure${index}`]);
      ingredients.push({ name, amount: parsed.amount, unit: parsed.unit, originalMeasure: parsed.originalMeasure, allergens: detectedAllergens({ name }).map(allergenLabel) });
    }
    const instructions = String(meal.strInstructions || '').trim();
    const steps = instructions.split(/(?:\r?\n)+|(?<=[.!?])\s+(?=[A-Z])/).map(step => step.trim()).filter(Boolean);
    return {
      id: `online_mealdb_${meal.idMeal}`,
      externalId: `mealdb_${meal.idMeal}`,
      name: meal.strMeal || 'Online-Rezept',
      originalName: meal.strMeal || 'Online-Rezept',
      originalLanguage: 'en',
      cuisine: meal.strArea || 'International',
      meal: meal.strCategory || 'Hauptgericht',
      diet: inferDietFromIngredients(ingredients.map(item => item.name), meal.strCategory),
      servings: 4,
      servingsEstimated: true,
      prep: 0,
      cook: 0,
      ingredients,
      steps: steps.length ? steps : ['Zubereitung auf der Originalquelle prüfen.'],
      notes: 'Online-Rezept. Zutaten, Mengen, Produktkennzeichnungen und Zubereitung vor dem Kochen vollständig prüfen.',
      image: meal.strMealThumb || '',
      source: { provider: 'TheMealDB', url: meal.strSource || `https://www.themealdb.com/meal/${meal.idMeal}`, video: meal.strYoutube || '', externalId: meal.idMeal },
      importedAt: null
    };
  }

  function spoonacularToRecipe(item) {
    const ingredients = (item.extendedIngredients || []).map(ingredient => {
      const name = cleanText(ingredient.nameClean || ingredient.name || ingredient.originalName || ingredient.original || 'Zutat');
      return {
        name,
        amount: Number(ingredient.amount) || 1,
        unit: ingredient.unit || 'Stück',
        originalMeasure: cleanText(ingredient.original || ''),
        allergens: detectedAllergens({ name }).map(allergenLabel)
      };
    });
    const steps = (item.analyzedInstructions || []).flatMap(group => (group.steps || []).map(step => cleanText(step.step))).filter(Boolean);
    if (!steps.length && item.instructions) steps.push(...cleanText(item.instructions).split(/(?<=[.!?])\s+(?=[A-ZÄÖÜ])/).filter(Boolean));
    return {
      id: `online_spoon_${item.id}`,
      externalId: `spoon_${item.id}`,
      name: cleanText(item.title) || 'Online-Rezept',
      originalName: cleanText(item.title) || 'Online-Rezept',
      originalLanguage: likelyGerman(item.title) ? 'de' : 'en',
      cuisine: item.cuisines?.[0] || 'International',
      meal: item.dishTypes?.[0] || 'Hauptgericht',
      diet: item.vegan ? 'Vegan' : item.vegetarian ? 'Vegetarisch' : inferDietFromIngredients(ingredients.map(entry => entry.name)),
      servings: Number(item.servings) || 4,
      servingsEstimated: !item.servings,
      prep: 0,
      cook: Number(item.readyInMinutes) || 0,
      ingredients,
      steps: steps.length ? steps : ['Zubereitung auf der Originalquelle prüfen.'],
      notes: 'Online-Rezept über Spoonacular. Angaben und Originalquelle vollständig kontrollieren.',
      image: item.image || '',
      source: { provider: 'Spoonacular', url: item.sourceUrl || item.spoonacularSourceUrl || `https://spoonacular.com/recipes/${item.id}`, externalId: String(item.id) },
      importedAt: null
    };
  }

  async function fetchJson(url, options = {}) {
    const response = await fetch(url, { ...options, headers: { Accept: 'application/json', ...(options.headers || {}) } });
    if (!response.ok) {
      if (response.status === 402) throw new Error('Das Tageslimit der Rezeptquelle ist erreicht.');
      if (response.status === 401) throw new Error('Der API-Schlüssel der Rezeptquelle ist ungültig.');
      throw new Error(`Rezeptdienst antwortet mit Status ${response.status}.`);
    }
    return response.json();
  }

  async function lookupMeal(id) {
    const data = await fetchJson(`${MEALDB_API}/lookup.php?i=${encodeURIComponent(id)}`);
    const meal = data.meals?.[0];
    if (!meal) throw new Error('Rezeptdetails wurden nicht gefunden.');
    return mealToRecipe(meal);
  }

  async function searchMealDB(query, limit = 12) {
    const term = await translateSearchQuery(query);
    const [byName, byIngredient] = await Promise.allSettled([
      fetchJson(`${MEALDB_API}/search.php?s=${encodeURIComponent(term)}`),
      fetchJson(`${MEALDB_API}/filter.php?i=${encodeURIComponent(term.replace(/\s+/g, '_'))}`)
    ]);
    const fullMeals = byName.status === 'fulfilled' ? (byName.value.meals || []) : [];
    const summaries = byIngredient.status === 'fulfilled' ? (byIngredient.value.meals || []) : [];
    const knownIds = new Set(fullMeals.map(meal => meal.idMeal));
    const detailIds = summaries.map(meal => meal.idMeal).filter(id => !knownIds.has(id)).slice(0, Math.max(0, limit - fullMeals.length));
    const details = await Promise.allSettled(detailIds.map(lookupMeal));
    const recipes = [...fullMeals.map(mealToRecipe), ...details.filter(result => result.status === 'fulfilled').map(result => result.value)];
    const deduped = [];
    const ids = new Set();
    for (const recipe of recipes) {
      if (ids.has(recipe.externalId)) continue;
      ids.add(recipe.externalId);
      deduped.push(await translateRecipeToGerman(recipe, false));
      if (deduped.length >= limit) break;
    }
    return deduped;
  }

  async function searchSpoonacular(query, limit, apiKey) {
    if (!apiKey) throw new Error('Für Spoonacular fehlt der API-Schlüssel.');
    const translatedQuery = await translateSearchQuery(query);
    const params = new URLSearchParams({ apiKey, query: translatedQuery, number: String(limit), addRecipeInformation: 'true', fillIngredients: 'true', instructionsRequired: 'true' });
    const data = await fetchJson(`${SPOONACULAR_API}/recipes/complexSearch?${params}`);
    const recipes = (data.results || []).map(spoonacularToRecipe);
    const translated = [];
    for (const recipe of recipes) translated.push(await translateRecipeToGerman(recipe, false));
    return translated;
  }

  async function search(query, limit = 12, options = {}) {
    const term = String(query || '').trim();
    if (!term) throw new Error('Bitte einen Suchbegriff eingeben.');
    const source = options.source || (options.spoonacularKey ? 'spoonacular' : 'themealdb');
    if (source === 'spoonacular') return searchSpoonacular(term, limit, options.spoonacularKey);
    if (source === 'both' && options.spoonacularKey) {
      const [mealdb, spoon] = await Promise.allSettled([searchMealDB(term, Math.ceil(limit / 2)), searchSpoonacular(term, Math.ceil(limit / 2), options.spoonacularKey)]);
      const combined = [...(mealdb.status === 'fulfilled' ? mealdb.value : []), ...(spoon.status === 'fulfilled' ? spoon.value : [])];
      if (!combined.length) throw (spoon.reason || mealdb.reason || new Error('Keine Ergebnisse gefunden.'));
      return combined.slice(0, limit);
    }
    return searchMealDB(term, limit);
  }

  function scaledRecipe(recipe, baseServings, desiredServings) {
    const base = Math.max(1, Number(baseServings) || Number(recipe.servings) || 4);
    const desired = Math.max(1, Number(desiredServings) || base);
    const scale = desired / base;
    return {
      ...recipe,
      servings: desired,
      servingsEstimated: false,
      ingredients: (recipe.ingredients || []).map(ingredient => ({ ...ingredient, amount: Number(ingredient.amount || 0) * scale }))
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
      const reason = analysis.unresolved.map(item => `${item.ingredient}: ${item.reason}`).join('; ');
      throw new Error(reason || 'Dieses Rezept kann nicht automatisch angepasst werden.');
    }
    const replacementMap = new Map();
    for (const item of analysis.replacements) if (!replacementMap.has(normalize(item.ingredient))) replacementMap.set(normalize(item.ingredient), item);
    const changes = [];
    const ingredients = scaled.ingredients.map(ingredient => {
      const replacement = replacementMap.get(normalize(ingredient.name));
      if (!replacement) return { ...ingredient };
      changes.push({ from: ingredient.name, to: replacement.candidate.name, note: replacement.candidate.note, allergen: replacement.allergen, profiles: replacement.profiles });
      return {
        ...ingredient,
        originalName: ingredient.name,
        name: replacement.candidate.name,
        allergens: replacement.candidate.allergens || [],
        replacesAllergen: replacement.allergenKey,
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
      adaptation: { createdAt: new Date().toISOString(), changes, profiles: (profiles || []).map(profile => profile.name), method: 'Lokale Allergen- und Ernährungsregeln' },
      productConfirmed: false,
      notes: `${scaled.notes || ''}\n${changes.length ? 'Automatisch vorgeschlagene Ersetzungen müssen anhand konkreter Produkte und der Originalquelle geprüft werden.' : 'Keine automatische Ersetzung erforderlich.'}`.trim()
    };
  }

  window.SKOnline = {
    search,
    analyze,
    adapt,
    translateRecipeToGerman,
    mealToRecipe,
    spoonacularToRecipe,
    parseMeasure,
    allergyKey,
    allergenLabel,
    detectedAllergens,
    statusLabels: { direct: 'Kein Konflikt erkannt', adaptable: 'Mit Ersatz anpassbar', check: 'Prüfung erforderlich', blocked: 'Nicht zuverlässig anpassbar' }
  };
})();
