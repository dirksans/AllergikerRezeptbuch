(() => {
  'use strict';

  const APP_VERSION = '3.0.0';
  const app = document.querySelector('#app');
  const modal = document.querySelector('#modal');
  const modalContent = document.querySelector('#modalContent');
  const toast = document.querySelector('#toast');
  const installButton = document.querySelector('#installButton');

  const state = {
    route: 'home',
    profiles: [],
    pantry: [],
    recipes: [],
    shopping: [],
    settings: {},
    activity: [],
    online: { results: [], query: '', loading: false, error: '' },
    installPrompt: null
  };

  const cuisines = ['Deutsch', 'Italienisch', 'Griechisch', 'Französisch', 'Spanisch', 'Türkisch', 'Indisch', 'Japanisch', 'Chinesisch', 'Koreanisch', 'Thailändisch', 'Mexikanisch', 'Mediterran', 'Nahöstlich', 'International'];
  const units = ['g', 'kg', 'ml', 'l', 'Stück', 'Packung', 'Dose', 'Glas', 'EL', 'TL', 'Tasse', 'Zehe', 'Scheibe', 'Prise', 'Bund', 'nach Bedarf'];
  const diets = ['Omnivor', 'Vegetarisch', 'Vegan', 'Pescetarisch'];

  const uid = prefix => `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
  const normalize = value => String(value || '').trim().toLocaleLowerCase('de-DE');
  const splitList = value => String(value || '').split(',').map(v => v.trim()).filter(Boolean);
  const number = value => Number.parseFloat(String(value).replace(',', '.')) || 0;
  const formatNumber = value => new Intl.NumberFormat('de-DE', { maximumFractionDigits: 2 }).format(Number(value) || 0);
  const todayISO = () => new Date().toISOString().slice(0, 10);
  const formatDate = value => value ? new Intl.DateTimeFormat('de-DE').format(new Date(`${value}T12:00:00`)) : '–';
  const esc = value => String(value ?? '').replace(/[&<>'"]/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[char]);
  const attr = esc;
  const safeUrl = value => {
    try {
      const url = new URL(String(value || ''), window.location.href);
      return ['http:', 'https:'].includes(url.protocol) ? url.href : '';
    } catch {
      return '';
    }
  };

  function showToast(message) {
    toast.textContent = message;
    toast.classList.add('show');
    clearTimeout(showToast.timer);
    showToast.timer = setTimeout(() => toast.classList.remove('show'), 2600);
  }


  function setFormBusy(form, busy) {
    if (!form) return;
    form.querySelectorAll('button').forEach(control => {
      control.disabled = Boolean(busy);
    });
    const submit = form.querySelector('button[type="submit"]');
    if (submit) {
      if (busy) {
        submit.dataset.originalText = submit.textContent;
        submit.textContent = 'Speichert …';
      } else if (submit.dataset.originalText) {
        submit.textContent = submit.dataset.originalText;
        delete submit.dataset.originalText;
      }
    }
  }

  function showFormError(form, message) {
    if (!form) return showToast(message);
    let node = form.querySelector('.form-error');
    if (!node) {
      node = document.createElement('div');
      node.className = 'notice danger form-error';
      const actions = form.querySelector('.actions');
      form.insertBefore(node, actions || null);
    }
    node.textContent = message;
    node.scrollIntoView({ block: 'nearest' });
  }

  async function runFormTask(form, task) {
    setFormBusy(form, true);
    form.querySelector('.form-error')?.remove();
    try {
      await task();
    } catch (error) {
      console.error(error);
      showFormError(form, error.message || 'Die Änderung konnte nicht gespeichert werden.');
    } finally {
      if (document.contains(form)) setFormBusy(form, false);
    }
  }

  function openModal(html) {
    modalContent.innerHTML = html;
    if (typeof modal.showModal === 'function') modal.showModal();
    else modal.setAttribute('open', '');
  }

  function closeModal() {
    if (typeof modal.close === 'function') modal.close();
    else modal.removeAttribute('open');
  }

  function closeButton() {
    return '<button type="button" class="icon-button" data-action="close-modal" aria-label="Schließen">×</button>';
  }

  async function loadState() {
    const [profiles, pantry, recipes, shopping, settings, activity] = await Promise.all([
      SKDB.getAll('profiles'), SKDB.getAll('pantry'), SKDB.getAll('recipes'), SKDB.getAll('shopping'), SKDB.getAll('settings'), SKDB.getAll('activity')
    ]);
    state.profiles = profiles || [];
    state.pantry = pantry || [];
    state.recipes = recipes || [];
    state.shopping = shopping || [];
    state.activity = (activity || []).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    state.settings = (settings || []).find(item => item.id === 'main') || {};

    if (!state.settings.initialized) return seedApp();
    await migrateData();
  }

  async function migrateData() {
    if (number(state.settings.dataVersion) >= 3) return;
    const owner = state.profiles.find(profile => profile.role === 'Besitzer') || state.profiles.find(profile => normalize(profile.name) === 'dirk');
    if (owner) {
      const allergyKeys = (owner.allergies || []).map(item => SKOnline.allergyKey(item));
      if (!allergyKeys.includes('milch')) {
        owner.allergies = [...(owner.allergies || []), 'Milch'];
        await SKDB.put('profiles', owner);
        state.profiles = state.profiles.map(profile => profile.id === owner.id ? owner : profile);
      }
    }
    await saveSettings({
      dataVersion: 3,
      recipeSource: state.settings.recipeSource || 'themealdb',
      spoonacularKey: state.settings.spoonacularKey || ''
    });
  }

  async function seedApp() {
    const owner = {
      id: uid('person'),
      name: 'Dirk',
      role: 'Besitzer',
      diet: 'Omnivor',
      allergies: ['Milch'],
      intolerances: [],
      dislikes: [],
      likes: [],
      cuisines: [],
      spice: 'Mittel',
      createdAt: new Date().toISOString()
    };

    const starterRecipes = [
      {
        id: uid('recipe'),
        name: 'Mediterrane Gemüsepfanne',
        cuisine: 'Mediterran',
        meal: 'Abendessen',
        diet: 'Vegan',
        servings: 2,
        prep: 10,
        cook: 20,
        ingredients: [
          { name: 'Zucchini', amount: 1, unit: 'Stück', allergens: [] },
          { name: 'Paprika', amount: 2, unit: 'Stück', allergens: [] },
          { name: 'Kichererbsen', amount: 1, unit: 'Dose', allergens: [] },
          { name: 'Olivenöl', amount: 2, unit: 'EL', allergens: [] },
          { name: 'Tomaten', amount: 300, unit: 'g', allergens: [] }
        ],
        steps: ['Gemüse waschen und schneiden.', 'Olivenöl erhitzen und das Gemüse anbraten.', 'Kichererbsen und Tomaten zugeben und 10 Minuten köcheln lassen.', 'Nach persönlicher Verträglichkeit würzen.'],
        notes: 'Bei Gewürzmischungen immer die Produktkennzeichnung prüfen.',
        createdAt: new Date().toISOString()
      },
      {
        id: uid('recipe'),
        name: 'Cremige Tomatenpasta',
        cuisine: 'Italienisch',
        meal: 'Abendessen',
        diet: 'Vegetarisch',
        servings: 2,
        prep: 5,
        cook: 20,
        ingredients: [
          { name: 'Nudeln', amount: 200, unit: 'g', allergens: ['Gluten'] },
          { name: 'Passierte Tomaten', amount: 400, unit: 'ml', allergens: [] },
          { name: 'Sahne', amount: 100, unit: 'ml', allergens: ['Milch'] },
          { name: 'Parmesan', amount: 40, unit: 'g', allergens: ['Milch'] }
        ],
        steps: ['Nudeln nach Packungsangabe kochen.', 'Tomaten und Sahne erhitzen.', 'Nudeln mit der Soße mischen und Parmesan darübergeben.'],
        notes: 'Für Allergiker nur eindeutig gekennzeichnete Produkte verwenden.',
        createdAt: new Date().toISOString()
      },
      {
        id: uid('recipe'),
        name: 'Kartoffel-Gurken-Salat',
        cuisine: 'Deutsch',
        meal: 'Mittagessen',
        diet: 'Vegan',
        servings: 4,
        prep: 20,
        cook: 20,
        ingredients: [
          { name: 'Kartoffeln', amount: 800, unit: 'g', allergens: [] },
          { name: 'Gurke', amount: 1, unit: 'Stück', allergens: [] },
          { name: 'Gemüsebrühe', amount: 150, unit: 'ml', allergens: ['Sellerie'] },
          { name: 'Senf', amount: 2, unit: 'TL', allergens: ['Senf'] },
          { name: 'Essig', amount: 2, unit: 'EL', allergens: [] }
        ],
        steps: ['Kartoffeln garen, abkühlen lassen und schneiden.', 'Gurke fein schneiden.', 'Brühe, Senf und Essig verrühren.', 'Alles vermischen und ziehen lassen.'],
        notes: 'Brühe und Senf können je nach Produkt weitere Allergene enthalten.',
        createdAt: new Date().toISOString()
      }
    ];

    const settings = {
      id: 'main',
      initialized: true,
      selectedProfiles: [owner.id],
      selectedCuisine: 'Alle',
      onlyPantry: false,
      strictLibrary: false,
      dataVersion: 3,
      recipeSource: 'themealdb',
      spoonacularKey: ''
    };

    await SKDB.put('profiles', owner);
    for (const recipe of starterRecipes) await SKDB.put('recipes', recipe);
    await SKDB.put('settings', settings);
    await loadState();
  }

  async function saveSettings(patch) {
    state.settings = { ...state.settings, ...patch, id: 'main', initialized: true };
    await SKDB.put('settings', state.settings);
  }

  function selectedProfiles() {
    const ids = state.settings.selectedProfiles || [];
    return state.profiles.filter(profile => ids.includes(profile.id));
  }


  function renderPersonSelector({ compact = false } = {}) {
    const selected = new Set(state.settings.selectedProfiles || []);
    return `<div class="person-selector ${compact ? 'compact' : ''}">
      <div class="small"><strong>Mitessende Personen</strong> <span class="muted">Mehrere Namen können gleichzeitig ausgewählt werden.</span></div>
      <div class="chips" style="margin-top:8px">
        ${state.profiles.map(profile => `<button type="button" class="chip ${selected.has(profile.id) ? 'active' : ''}" data-action="toggle-person" data-id="${profile.id}" aria-pressed="${selected.has(profile.id)}">${esc(profile.name)}</button>`).join('') || '<span class="muted small">Noch keine Personen angelegt.</span>'}
      </div>
      ${selected.size ? `<div class="muted small" style="margin-top:7px">Ausgewählt: ${esc(state.profiles.filter(profile => selected.has(profile.id)).map(profile => profile.name).join(', '))}</div>` : '<div class="notice danger" style="margin-top:8px">Bitte mindestens eine Person auswählen.</div>'}
    </div>`;
  }

  function dietAllows(recipeDiet, personDiet) {
    const recipe = normalize(recipeDiet);
    const person = normalize(personDiet);
    if (!person || person === 'omnivor') return true;
    if (person === 'vegetarisch') return ['vegetarisch', 'vegan'].includes(recipe);
    if (person === 'vegan') return recipe === 'vegan';
    if (person === 'pescetarisch') return ['pescetarisch', 'vegetarisch', 'vegan'].includes(recipe);
    return true;
  }

  function recipeCompatibility(recipe, profiles = selectedProfiles()) {
    const analysis = SKOnline.analyze(recipe, profiles);
    const reasons = [
      ...analysis.dietConflicts,
      ...analysis.conflicts.map(item => `${item.profiles.join(', ') || 'Profil'}: ${item.allergen} in ${item.ingredient}`),
      ...analysis.unresolved.map(item => `${item.ingredient}: ${item.reason}`),
      ...analysis.dislikes,
      ...analysis.checks
    ];
    return { ...analysis, reasons: [...new Set(reasons)] };
  }


  function findPantryIngredient(ingredient) {
    const target = normalize(ingredient.name);
    return state.pantry.find(item => normalize(item.name) === target);
  }

  function recipeAvailability(recipe, servings = recipe.servings) {
    const scale = servings / recipe.servings;
    const missing = [];
    let availableCount = 0;

    for (const ingredient of recipe.ingredients) {
      const pantryItem = findPantryIngredient(ingredient);
      const needed = ingredient.amount * scale;
      if (!pantryItem) {
        missing.push({ ...ingredient, amount: needed, reason: 'nicht vorhanden' });
      } else if (normalize(pantryItem.unit) !== normalize(ingredient.unit)) {
        missing.push({ ...ingredient, amount: needed, reason: `Einheit prüfen (${pantryItem.unit} vorhanden)` });
      } else if (number(pantryItem.quantity) < needed) {
        missing.push({ ...ingredient, amount: Math.max(0, needed - number(pantryItem.quantity)), reason: 'Menge fehlt' });
      } else {
        availableCount += 1;
      }
    }
    return { missing, availableCount, total: recipe.ingredients.length };
  }

  function expiringSoon() {
    const now = new Date(`${todayISO()}T00:00:00`);
    return state.pantry
      .filter(item => item.expiry)
      .map(item => ({ ...item, days: Math.ceil((new Date(`${item.expiry}T00:00:00`) - now) / 86400000) }))
      .filter(item => item.days <= 7)
      .sort((a, b) => a.days - b.days);
  }

  function recipeBadge(recipe) {
    const compatibility = recipeCompatibility(recipe);
    if (compatibility.status === 'direct') return '<span class="badge safe">✓ Kein Konflikt erkannt</span>';
    if (compatibility.status === 'adaptable') return '<span class="badge check">↻ Mit Ersatz anpassbar</span>';
    if (compatibility.status === 'check') return '<span class="badge check">! Prüfung erforderlich</span>';
    return '<span class="badge block">✕ Nicht zuverlässig anpassbar</span>';
  }

  function renderHeader(title, subtitle, action = '') {
    return `<div class="page-header"><div><h1>${esc(title)}</h1><div class="muted">${esc(subtitle)}</div></div>${action}</div>`;
  }

  function renderHome() {
    const people = selectedProfiles();
    const expiry = expiringSoon();
    const compatible = state.recipes
      .filter(recipe => recipeCompatibility(recipe, people).status !== 'blocked')
      .filter(recipe => state.settings.selectedCuisine === 'Alle' || recipe.cuisine === state.settings.selectedCuisine)
      .filter(recipe => !state.settings.onlyPantry || recipeAvailability(recipe).missing.length === 0)
      .filter(recipe => !state.settings.strictLibrary || recipe.ingredients.every(ingredient => Boolean(findPantryIngredient(ingredient))))
      .sort((a, b) => {
        const rank = { direct: 0, adaptable: 1, check: 2, blocked: 3 };
        const statusDifference = rank[recipeCompatibility(a, people).status] - rank[recipeCompatibility(b, people).status];
        return statusDifference || recipeAvailability(a).missing.length - recipeAvailability(b).missing.length;
      });

    return `
      ${renderHeader('Was kochen wir?', 'Vorschläge nach Personen, Allergien und Vorräten')}
      <section class="card hero">
        <div class="small muted">Aktuell ausgewählt</div>
        <div class="stat">${people.length || 0} ${people.length === 1 ? 'Person' : 'Personen'}</div>
        <p>${people.length ? people.map(p => esc(p.name)).join(', ') : 'Bitte mindestens eine Person auswählen.'}</p>
        <div class="chips">${state.profiles.map(profile => `<button class="chip ${(state.settings.selectedProfiles || []).includes(profile.id) ? 'active' : ''}" data-action="toggle-person" data-id="${profile.id}">${esc(profile.name)}</button>`).join('')}</div>
      </section>

      <div class="grid two" style="margin-top:14px">
        <section class="card">
          <div class="card-header"><div><h2>Filter</h2><div class="muted small">Rezeptauswahl eingrenzen</div></div></div>
          <div class="form-row">
            <label>Küche
              <select id="homeCuisine">
                ${['Alle', ...cuisines].map(c => `<option ${state.settings.selectedCuisine === c ? 'selected' : ''}>${esc(c)}</option>`).join('')}
              </select>
            </label>
            <label class="checkbox-row"><input type="checkbox" id="homeOnlyPantry" ${state.settings.onlyPantry ? 'checked' : ''}> Nur vollständig vorhandene Zutaten</label>
            <label class="checkbox-row"><input type="checkbox" id="homeStrictLibrary" ${state.settings.strictLibrary ? 'checked' : ''}> Nur Zutaten aus meiner Bibliothek</label>
          </div>
        </section>
        <section class="card">
          <div class="card-header"><div><h2>Vorratsstatus</h2><div class="muted small">Lokale Daten auf diesem Gerät</div></div></div>
          <div class="grid three">
            <div><div class="stat">${state.pantry.length}</div><div class="muted small">Lebensmittel</div></div>
            <div><div class="stat">${state.shopping.filter(i => !i.done).length}</div><div class="muted small">Einkäufe offen</div></div>
            <div><div class="stat">${expiry.length}</div><div class="muted small">bald fällig</div></div>
          </div>
        </section>
      </div>

      <section style="margin-top:18px">
        <div class="card-header"><div><h2>Geeignete oder anpassbare Rezepte</h2><div class="muted small">${compatible.length} Treffer</div></div><button class="button secondary compact" data-route="recipes">Alle Rezepte</button></div>
        <div class="grid two">
          ${compatible.length ? compatible.slice(0, 4).map(renderRecipeCard).join('') : '<div class="empty">Kein gespeichertes Rezept passt. Suche im Bereich „Rezepte“ online nach weiteren Gerichten.</div>'}
        </div>
      </section>

      <section style="margin-top:18px">
        <div class="card-header"><div><h2>Was muss bald weg?</h2><div class="muted small">Ablaufdatum innerhalb von sieben Tagen</div></div></div>
        ${expiry.length ? `<div class="list">${expiry.slice(0, 6).map(item => `<div class="list-item"><div class="list-item-main"><strong>${esc(item.name)}</strong><div class="meta"><span>${formatNumber(item.quantity)} ${esc(item.unit)}</span><span>${item.days < 0 ? `${Math.abs(item.days)} Tage abgelaufen` : item.days === 0 ? 'heute fällig' : `noch ${item.days} Tage`}</span></div></div><span class="badge ${item.days < 0 ? 'block' : 'check'}">${formatDate(item.expiry)}</span></div>`).join('')}</div>` : '<div class="empty">Keine Lebensmittel mit nahem Ablaufdatum.</div>'}
      </section>

      <div class="notice" style="margin-top:18px"><strong>Allergiehinweis:</strong> „Kein Konflikt erkannt“ ist keine medizinische Garantie. Prüfe immer Verpackung, Zutatenliste, Spurenhinweise und Kreuzkontamination.</div>
    `;
  }

  function renderRecipeCard(recipe) {
    const availability = recipeAvailability(recipe);
    const image = recipe.image ? `<img class="recipe-thumb" src="${attr(safeUrl(recipe.image))}" alt="" loading="lazy">` : '<div class="recipe-icon" aria-hidden="true">🍲</div>';
    const source = recipe.source?.provider ? `<span>Quelle: ${esc(recipe.source.provider)}</span>` : '<span>Eigenes Rezept</span>';
    return `<article class="card recipe-card">
      <div class="recipe-top">
        <div class="recipe-title-wrap">${image}<div><h3>${esc(recipe.name)}</h3><div class="meta"><span>${esc(recipe.cuisine)}</span><span>${esc(recipe.diet)}</span><span>${number(recipe.prep) + number(recipe.cook)} Min.</span>${source}</div></div></div>
        ${recipeBadge(recipe)}
      </div>
      <div><span class="badge ${availability.missing.length ? 'check' : 'safe'}">${availability.missing.length ? `${availability.missing.length} Zutaten fehlen` : 'Vollständig vorhanden'}</span></div>
      <div class="actions"><button class="button compact" data-action="view-recipe" data-id="${recipe.id}">Öffnen</button><button class="button secondary compact" data-action="add-missing" data-id="${recipe.id}">Fehlendes einkaufen</button></div>
    </article>`;
  }

  function renderOnlineCard(recipe) {
    const analysis = SKOnline.analyze(recipe, selectedProfiles());
    const statusClass = analysis.status === 'direct' ? 'safe' : analysis.status === 'blocked' ? 'block' : 'check';
    const labels = SKOnline.statusLabels;
    return `<article class="card recipe-card online-card">
      <div class="recipe-top">
        <div class="recipe-title-wrap">${recipe.image ? `<img class="recipe-thumb" src="${attr(safeUrl(recipe.image))}" alt="" loading="lazy">` : '<div class="recipe-icon">🌐</div>'}<div><h3>${esc(recipe.name)}</h3><div class="meta"><span>${esc(recipe.cuisine)}</span><span>${esc(recipe.meal)}</span><span>${esc(recipe.source?.provider || 'Online')}</span></div></div></div>
        <span class="badge ${statusClass}">${esc(labels[analysis.status])}</span>
      </div>
      ${analysis.replacements.length ? `<div class="small"><strong>${analysis.replacements.length} mögliche Ersetzung${analysis.replacements.length === 1 ? '' : 'en'}</strong><div class="muted">${esc(analysis.replacements.map(item => `${item.ingredient} → ${item.candidate.name}`).join('; '))}</div></div>` : ''}
      ${analysis.unresolved.length ? `<div class="small muted">Nicht automatisch lösbar: ${esc(analysis.unresolved.map(item => item.ingredient).join(', '))}</div>` : ''}
      <div class="actions"><button class="button compact" data-action="view-online-recipe" data-id="${recipe.externalId}">Untersuchen</button></div>
    </article>`;
  }


  function renderRecipes() {
    const recipeList = [...state.recipes].sort((a, b) => a.name.localeCompare(b.name, 'de'));
    const online = state.online;
    const source = state.settings.recipeSource || 'themealdb';
    const hasSpoonacular = Boolean(String(state.settings.spoonacularKey || '').trim());
    return `
      ${renderHeader('Rezepte', 'Deutsch suchen, alle hinterlegten Allergien prüfen und Rezepte anpassen', '<button class="button" data-action="new-recipe">+ Eigenes Rezept</button>')}
      <section class="card" style="margin-bottom:14px">
        ${renderPersonSelector({ compact: true })}
      </section>
      <section class="card online-search-panel">
        <div class="card-header"><div><h2>Online-Rezepte suchen</h2><div class="muted small">Normale Rezepte werden breit gesucht und erst danach auf Allergien und Ernährungsformen untersucht.</div></div><span class="badge neutral">${source === 'spoonacular' ? 'Spoonacular' : source === 'both' ? '2 Quellen' : 'TheMealDB'}</span></div>
        <form id="onlineSearchForm" class="online-search-form">
          <label>Gericht oder Hauptzutat<input name="query" required value="${attr(online.query)}" placeholder="z. B. Kartoffelsuppe, Hähnchen, Lasagne"></label>
          <label>Quelle<select name="source">
            <option value="themealdb" ${source === 'themealdb' ? 'selected' : ''}>TheMealDB – kostenlos</option>
            <option value="spoonacular" ${source === 'spoonacular' ? 'selected' : ''} ${hasSpoonacular ? '' : 'disabled'}>Spoonacular – eigener API-Schlüssel</option>
            <option value="both" ${source === 'both' ? 'selected' : ''} ${hasSpoonacular ? '' : 'disabled'}>Beide Quellen</option>
          </select></label>
          <button class="button" type="submit" ${online.loading ? 'disabled' : ''}>${online.loading ? 'Suche läuft …' : 'Online suchen'}</button>
        </form>
        <div class="actions" style="margin-top:10px"><button type="button" class="button ghost compact" data-action="search-chefkoch">Zusätzlich bei Chefkoch suchen</button></div>
        <p class="muted small">Deutsche Suchbegriffe werden unterstützt. TheMealDB-Inhalte werden beim Öffnen automatisch ins Deutsche übertragen. Maschinenübersetzungen müssen kontrolliert werden.</p>
        ${!hasSpoonacular ? '<div class="notice" style="margin-top:10px">Eine zweite Quelle kann unter <strong>Mehr → Rezeptquellen</strong> aktiviert werden.</div>' : ''}
        ${online.error ? `<div class="notice danger">${esc(online.error)}</div>` : ''}
      </section>

      ${online.loading ? '<div class="empty" style="margin:14px 0">Online-Rezepte werden geladen und geprüft …</div>' : ''}
      ${online.results.length ? `<section style="margin-top:18px"><div class="card-header"><div><h2>Online gefunden</h2><div class="muted small">${online.results.length} Rezepte – noch nicht gespeichert</div></div></div><div class="grid two">${online.results.map(renderOnlineCard).join('')}</div></section>` : ''}

      <section style="margin-top:22px">
        <div class="card-header"><div><h2>Gespeicherte Rezepte</h2><div class="muted small">${recipeList.length} Rezepte auf diesem Gerät</div></div></div>
        <div class="card flat" style="margin-bottom:14px">
          <div class="form-grid">
            <label>Suche<input id="recipeSearch" type="search" placeholder="Name oder Zutat"></label>
            <label>Küche<select id="recipeCuisineFilter"><option>Alle</option>${cuisines.map(c => `<option>${esc(c)}</option>`).join('')}</select></label>
            <label>Status<select id="recipeSafetyFilter"><option value="all">Alle</option><option value="direct">Ohne Konflikt</option><option value="adaptable">Anpassbar</option><option value="check">Prüfen</option><option value="blocked">Nicht anpassbar</option></select></label>
          </div>
        </div>
        <div id="recipeGrid" class="grid two">${recipeList.length ? recipeList.map(renderRecipeCard).join('') : '<div class="empty">Noch keine Rezepte gespeichert.</div>'}</div>
      </section>
    `;
  }


  function renderPantry() {
    const sorted = [...state.pantry].sort((a, b) => a.name.localeCompare(b.name, 'de'));
    return `
      ${renderHeader('Vorräte', `${sorted.length} Lebensmittel gespeichert`, '<button class="button" data-action="new-pantry">+ Lebensmittel</button>')}
      <div class="card flat" style="margin-bottom:14px"><label>Vorrat durchsuchen<input id="pantrySearch" type="search" placeholder="Lebensmittel, Lagerort oder Allergen"></label></div>
      <div id="pantryList" class="list">
        ${sorted.length ? sorted.map(renderPantryItem).join('') : '<div class="empty">Dein Vorrat ist leer. Lege das erste Lebensmittel an.</div>'}
      </div>
    `;
  }

  function renderPantryItem(item) {
    const allergenText = (item.allergens || []).join(', ');
    return `<div class="list-item" data-search="${attr([item.name, item.location, allergenText].join(' '))}">
      <div class="list-item-main">
        <strong>${esc(item.name)}</strong>
        <div class="meta"><span>${formatNumber(item.quantity)} ${esc(item.unit)}</span><span>${esc(item.location || 'Kein Lagerort')}</span>${item.expiry ? `<span>bis ${formatDate(item.expiry)}</span>` : ''}</div>
        ${allergenText ? `<div style="margin-top:7px"><span class="badge check">Allergene: ${esc(allergenText)}</span></div>` : ''}
      </div>
      <div class="actions"><button class="button ghost compact" data-action="edit-pantry" data-id="${item.id}">Bearbeiten</button><button class="button ghost compact" data-action="delete-pantry" data-id="${item.id}">Löschen</button></div>
    </div>`;
  }

  function renderShopping() {
    const open = state.shopping.filter(item => !item.done);
    const done = state.shopping.filter(item => item.done);
    return `
      ${renderHeader('Einkaufsliste', `${open.length} Positionen offen`, '<button class="button" data-action="new-shopping">+ Eintrag</button>')}
      <section class="card">
        <div class="card-header"><div><h2>Offen</h2><div class="muted small">Beim Abhaken kann der Artikel eingelagert werden.</div></div></div>
        <div class="list">${open.length ? open.map(renderShoppingItem).join('') : '<div class="empty">Die Einkaufsliste ist leer.</div>'}</div>
      </section>
      ${done.length ? `<section class="card" style="margin-top:14px"><div class="card-header"><div><h2>Erledigt</h2><div class="muted small">Bereits gekaufte Einträge</div></div><button class="button ghost compact" data-action="clear-done-shopping">Leeren</button></div><div class="list">${done.map(renderShoppingItem).join('')}</div></section>` : ''}
    `;
  }

  function renderShoppingItem(item) {
    return `<div class="list-item" style="${item.done ? 'opacity:.65' : ''}">
      <div class="list-item-main"><strong>${esc(item.name)}</strong><div class="meta"><span>${formatNumber(item.quantity)} ${esc(item.unit)}</span>${item.source ? `<span>${esc(item.source)}</span>` : ''}</div></div>
      <div class="actions">${!item.done ? `<button class="button secondary compact" data-action="complete-shopping" data-id="${item.id}">Gekauft</button>` : ''}<button class="button ghost compact" data-action="delete-shopping" data-id="${item.id}">Löschen</button></div>
    </div>`;
  }

  function renderPeople() {
    return `
      ${renderHeader('Personen', 'Allergien, Ernährungsformen und Vorlieben', '<button class="button" data-action="new-person">+ Person</button>')}
      <section class="card" style="margin-bottom:14px">${renderPersonSelector({ compact: true })}</section>
      <div class="grid two">
        ${state.profiles.length ? state.profiles.map(profile => {
          const allergies = [...(profile.allergies || []), ...(profile.intolerances || [])];
          return `<article class="card">
            <div class="card-header"><div><h2>${esc(profile.name)}</h2><div class="muted small">${esc(profile.role || 'Person')} · ${esc(profile.diet)}</div></div><span class="badge neutral">${esc(profile.spice || 'Mittel')} scharf</span></div>
            <div class="small"><strong>Allergien/Unverträglichkeiten</strong><p class="muted">${allergies.length ? esc(allergies.join(', ')) : 'Keine eingetragen'}</p></div>
            <div class="small"><strong>Mag nicht</strong><p class="muted">${(profile.dislikes || []).length ? esc(profile.dislikes.join(', ')) : 'Keine Einträge'}</p></div>
            <div class="actions"><button class="button ${(state.settings.selectedProfiles || []).includes(profile.id) ? 'secondary' : 'ghost'} compact" data-action="toggle-person" data-id="${profile.id}">${(state.settings.selectedProfiles || []).includes(profile.id) ? '✓ Isst mit' : 'Mitessen'}</button><button class="button secondary compact" data-action="edit-person" data-id="${profile.id}">Bearbeiten</button>${profile.role !== 'Besitzer' ? `<button class="button ghost compact" data-action="delete-person" data-id="${profile.id}">Löschen</button>` : ''}</div>
          </article>`;
        }).join('') : '<div class="empty">Noch keine Personen angelegt.</div>'}
      </div>
      <div class="notice danger" style="margin-top:18px"><strong>Wichtig:</strong> Allergien werden nur anhand deiner Einträge geprüft. Produktkennzeichnung und mögliche Kreuzkontamination müssen weiterhin persönlich kontrolliert werden.</div>
    `;
  }

  function renderSettings() {
    const source = state.settings.recipeSource || 'themealdb';
    const hasKey = Boolean(String(state.settings.spoonacularKey || '').trim());
    return `
      ${renderHeader('Mehr', 'Sicherung, Rezeptquellen und App-Diagnose')}
      <div class="grid two">
        <section class="card">
          <div class="card-header"><div><h2>Datensicherung</h2><div class="muted small">Alle persönlichen Daten bleiben lokal auf diesem Gerät.</div></div></div>
          <p>Exportiere regelmäßig eine Sicherungsdatei. Sie enthält Personen, Allergien, Vorräte, Rezepte und Einkaufslisten.</p>
          <div class="actions"><button class="button" data-action="export-data">Daten exportieren</button><button class="button secondary" data-action="import-data">Daten importieren</button></div>
          <input id="importFile" type="file" accept="application/json" hidden>
        </section>
        <section class="card">
          <div class="card-header"><div><h2>Lokaler Speicher</h2><div class="muted small">Browserdatenbank: IndexedDB</div></div></div>
          <p>Die App speichert Änderungen automatisch. Der Diagnosetext zeigt, ob die Datenbank geöffnet werden kann.</p>
          <div class="actions"><button class="button secondary" data-action="request-persistence">Dauerhaften Speicher anfragen</button><button class="button ghost" data-action="storage-test">Speicher testen</button></div>
          <div id="storageStatus" class="muted small" style="margin-top:10px"></div>
        </section>
        <section class="card">
          <div class="card-header"><div><h2>Rezeptquellen</h2><div class="muted small">TheMealDB funktioniert ohne Konto; Spoonacular erweitert die Auswahl.</div></div></div>
          <form id="sourceSettingsForm" class="form-row">
            <label>Standardquelle<select name="recipeSource">
              <option value="themealdb" ${source === 'themealdb' ? 'selected' : ''}>TheMealDB</option>
              <option value="spoonacular" ${source === 'spoonacular' ? 'selected' : ''}>Spoonacular</option>
              <option value="both" ${source === 'both' ? 'selected' : ''}>Beide Quellen</option>
            </select></label>
            <label>Spoonacular-API-Schlüssel<input name="spoonacularKey" type="password" autocomplete="off" value="${attr(state.settings.spoonacularKey || '')}" placeholder="Optionaler persönlicher Schlüssel"><span class="muted small">Der Schlüssel wird nur lokal auf deinem Gerät gespeichert und nicht in den Projektdateien veröffentlicht.</span></label>
            <div class="actions"><button class="button" type="submit">Quelle speichern</button></div>
          </form>
          <div class="muted small" style="margin-top:8px">Status: ${hasKey ? 'Spoonacular-Schlüssel vorhanden' : 'kein Spoonacular-Schlüssel eingetragen'}</div>
        </section>
        <section class="card">
          <div class="card-header"><div><h2>Installation und Updates</h2><div class="muted small">Version ${APP_VERSION}</div></div></div>
          <ol class="ingredient-list"><li>App in Safari öffnen.</li><li>Teilen → „Zum Home-Bildschirm“.</li><li>Nach einem Code-Update einmal „App aktualisieren“ drücken.</li></ol>
          <div class="actions" style="margin-top:12px"><button class="button secondary" data-action="force-update">App aktualisieren</button></div>
        </section>
        <section class="card">
          <div class="card-header"><div><h2>Prüffunktionen</h2><div class="muted small">Aktive Funktionen dieser Version</div></div></div>
          <div class="list">
            <div class="list-item"><div><strong>Deutsche Suche und Ausgabe</strong><div class="muted small">Suchübersetzung und deutsche Rezeptdarstellung</div></div><span class="badge safe">Aktiv</span></div>
            <div class="list-item"><div><strong>Alle Profil-Allergien</strong><div class="muted small">EU-Hauptallergene plus individuell eingetragene Zutaten</div></div><span class="badge safe">Aktiv</span></div>
            <div class="list-item"><div><strong>Ernährungsformen</strong><div class="muted small">Vegetarisch, vegan und pescetarisch werden je Person geprüft</div></div><span class="badge safe">Aktiv</span></div>
            <div class="list-item"><div><strong>Generative KI</strong><div class="muted small">Noch nicht verbunden; aktuelle Anpassung nutzt nachvollziehbare Regeln</div></div><span class="badge neutral">Später</span></div>
          </div>
        </section>
      </div>
      <section class="card" style="margin-top:14px"><div class="card-header"><div><h2>Gefahrenbereich</h2><div class="muted small">Entfernt alle lokal gespeicherten App-Daten.</div></div></div><button class="button danger" data-action="reset-data">Alle Daten löschen</button></section>
    `;
  }


  function render() {
    const renderers = { home: renderHome, recipes: renderRecipes, pantry: renderPantry, shopping: renderShopping, people: renderPeople, settings: renderSettings };
    app.innerHTML = (renderers[state.route] || renderHome)();
    document.querySelectorAll('.nav-item').forEach(button => button.classList.toggle('active', button.dataset.route === state.route));
    window.scrollTo({ top: 0, behavior: 'instant' });
    bindViewEvents();
  }

  function bindViewEvents() {
    const cuisine = document.querySelector('#homeCuisine');
    if (cuisine) cuisine.addEventListener('change', async event => { await saveSettings({ selectedCuisine: event.target.value }); render(); });
    const onlyPantry = document.querySelector('#homeOnlyPantry');
    if (onlyPantry) onlyPantry.addEventListener('change', async event => { await saveSettings({ onlyPantry: event.target.checked }); render(); });
    const strictLibrary = document.querySelector('#homeStrictLibrary');
    if (strictLibrary) strictLibrary.addEventListener('change', async event => { await saveSettings({ strictLibrary: event.target.checked }); render(); });

    const recipeSearch = document.querySelector('#recipeSearch');
    const recipeCuisine = document.querySelector('#recipeCuisineFilter');
    const recipeSafety = document.querySelector('#recipeSafetyFilter');
    [recipeSearch, recipeCuisine, recipeSafety].filter(Boolean).forEach(control => control.addEventListener('input', filterRecipeCards));

    const pantrySearch = document.querySelector('#pantrySearch');
    if (pantrySearch) pantrySearch.addEventListener('input', event => {
      const query = normalize(event.target.value);
      document.querySelectorAll('#pantryList .list-item').forEach(item => item.hidden = !normalize(item.dataset.search).includes(query));
    });

    const importFile = document.querySelector('#importFile');
    if (importFile) importFile.addEventListener('change', importDataFile);
    updateStorageStatus();
  }

  function filterRecipeCards() {
    const query = normalize(document.querySelector('#recipeSearch')?.value);
    const cuisine = document.querySelector('#recipeCuisineFilter')?.value || 'Alle';
    const safety = document.querySelector('#recipeSafetyFilter')?.value || 'all';
    const filtered = state.recipes.filter(recipe => {
      const text = normalize([recipe.name, recipe.cuisine, ...recipe.ingredients.map(i => i.name)].join(' '));
      const status = recipeCompatibility(recipe).status;
      return text.includes(query) && (cuisine === 'Alle' || recipe.cuisine === cuisine) && (safety === 'all' || status === safety);
    });
    const grid = document.querySelector('#recipeGrid');
    if (grid) grid.innerHTML = filtered.length ? filtered.map(renderRecipeCard).join('') : '<div class="empty">Keine passenden Rezepte gefunden.</div>';
  }

  async function searchOnlineRecipes(form) {
    const data = new FormData(form);
    const query = String(data.get('query') || '').trim();
    const source = String(data.get('source') || state.settings.recipeSource || 'themealdb');
    await saveSettings({ recipeSource: source });
    state.online = { ...state.online, query, loading: true, error: '' };
    render();
    try {
      const results = await SKOnline.search(query, 12, {
        source,
        spoonacularKey: String(state.settings.spoonacularKey || '').trim()
      });
      const rank = { direct: 0, adaptable: 1, check: 2, blocked: 3 };
      results.sort((a, b) => rank[SKOnline.analyze(a, selectedProfiles()).status] - rank[SKOnline.analyze(b, selectedProfiles()).status]);
      state.online = { results, query, loading: false, error: results.length ? '' : 'Keine Ergebnisse gefunden. Versuche einen allgemeineren Suchbegriff.' };
    } catch (error) {
      state.online = { results: [], query, loading: false, error: `${error.message || 'Onlinesuche fehlgeschlagen'} Prüfe auch deine Internetverbindung und die gewählte Quelle.` };
    }
    render();
  }

  function onlineRecipeDetail(recipe) {
    const analysis = SKOnline.analyze(recipe, selectedProfiles());
    const statusClass = analysis.status === 'direct' ? 'success' : analysis.status === 'blocked' ? 'danger' : '';
    const desired = Math.max(1, selectedProfiles().length || 2);
    const conflictList = analysis.conflicts.map(item => `<li><strong>${esc(item.ingredient)}</strong>: ${esc(item.allergen)} – betroffen: ${esc(item.profiles.join(', ') || 'ausgewählte Person')}</li>`).join('');
    const dietList = analysis.dietConflicts.map(item => `<li>${esc(item)}</li>`).join('');
    const replacementList = analysis.replacements.map(item => `<li><strong>${esc(item.ingredient)}</strong> → ${esc(item.candidate.name)}<div class="muted small">${esc(item.candidate.note)} · für ${esc(item.profiles.join(', '))}</div></li>`).join('');
    const unresolvedList = analysis.unresolved.map(item => `<li><strong>${esc(item.ingredient)}</strong>: ${esc(item.reason)}</li>`).join('');
    const sourceName = recipe.source?.provider || 'Online';
    const baseServings = Math.max(1, number(recipe.servings) || 4);
    return `<div class="modal-inner">
      <div class="modal-header"><div><h2>${esc(recipe.name)}</h2><div class="meta"><span>${esc(recipe.cuisine)}</span><span>${esc(recipe.diet)}</span><span>Quelle: ${esc(sourceName)}</span></div></div>${closeButton()}</div>
      ${recipe.image ? `<img class="recipe-hero-image" src="${attr(safeUrl(recipe.image))}" alt="${attr(recipe.name)}">` : ''}
      <div style="margin-top:12px">${renderPersonSelector({ compact: true })}</div>
      <div class="notice ${statusClass}" style="margin-top:12px"><strong>${esc(SKOnline.statusLabels[analysis.status])}</strong><br>${analysis.status === 'adaptable' ? 'Konflikte können mit hinterlegten Ersatzregeln angepasst werden. Die konkrete Produktwahl bleibt prüfpflichtig.' : analysis.status === 'direct' ? 'Kein Konflikt mit den ausgewählten Profilen wurde erkannt.' : analysis.status === 'check' ? 'Mindestens eine Zutat oder Vorliebe muss persönlich geprüft werden.' : 'Mindestens ein Konflikt kann nicht zuverlässig automatisch ersetzt werden.'}</div>
      ${conflictList ? `<h3 style="margin-top:16px">Erkannte Allergie-Konflikte</h3><ul class="ingredient-list">${conflictList}</ul>` : ''}
      ${dietList ? `<h3 style="margin-top:16px">Ernährungsformen</h3><ul class="ingredient-list">${dietList}</ul>` : ''}
      ${replacementList ? `<h3 style="margin-top:16px">Vorgeschlagene Ersetzungen</h3><ul class="ingredient-list">${replacementList}</ul>` : ''}
      ${unresolvedList ? `<h3 style="margin-top:16px">Nicht automatisch lösbar</h3><ul class="ingredient-list">${unresolvedList}</ul>` : ''}
      ${analysis.checks.length ? `<div class="notice" style="margin-top:14px"><strong>Zusätzlich prüfen:</strong> ${esc(analysis.checks.join('; '))}</div>` : ''}
      <hr class="divider">
      <div class="form-grid">
        <label>Originalportionen<input id="onlineBaseServings" type="number" min="1" step="1" value="${baseServings}"><span class="muted small">Bei geschätzten Angaben bitte mit der Originalquelle vergleichen.</span></label>
        <label>Gewünschte Portionen<input id="onlineDesiredServings" type="number" min="1" step="1" value="${desired}"></label>
      </div>
      <h3 style="margin-top:16px">Zutaten</h3>
      <ul class="ingredient-list">${recipe.ingredients.map(item => `<li><strong>${esc(item.originalMeasure || `${formatNumber(item.amount)} ${item.unit}`)}</strong> ${esc(item.name)}${(item.allergens || []).length ? ` <span class="badge check">${esc(item.allergens.join(', '))}</span>` : ''}</li>`).join('')}</ul>
      <h3 style="margin-top:16px">Zubereitung</h3>
      <ol class="ingredient-list">${recipe.steps.map(step => `<li>${esc(step)}</li>`).join('')}</ol>
      ${recipe.originalLanguage && recipe.originalLanguage !== 'de' ? '<div class="notice" style="margin-top:14px"><strong>Übersetzung:</strong> Der deutsche Text wurde maschinell übersetzt und muss mit der Originalquelle verglichen werden.</div>' : ''}
      <div class="notice danger" style="margin-top:14px"><strong>Allergiesicherheit:</strong> Online-Daten und automatische Ersetzungen sind keine Garantie. Konkrete Produkte, Unterzutaten, Spurenhinweise und Kreuzkontamination immer selbst kontrollieren.</div>
      <div class="actions" style="margin-top:16px">
        ${analysis.status !== 'blocked' ? `<button class="button" data-action="adapt-online-recipe" data-id="${recipe.externalId}">${analysis.status === 'direct' ? 'Mit Mengen speichern' : 'Anpassen und speichern'}</button>` : ''}
        <button class="button secondary" data-action="save-online-original" data-id="${recipe.externalId}">Unverändert speichern</button>
        ${recipe.source?.url ? `<a class="button ghost" href="${attr(safeUrl(recipe.source.url))}" target="_blank" rel="noopener noreferrer">Originalquelle öffnen</a>` : ''}
      </div>
    </div>`;
  }

  async function openOnlineRecipe(recipe) {
    openModal(`<div class="modal-inner"><div class="modal-header"><div><h2>Rezept wird vorbereitet</h2><div class="muted small">Deutsche Übersetzung und Profilprüfung</div></div>${closeButton()}</div><div class="empty">Rezeptdaten werden geladen …</div></div>`);
    try {
      const translated = recipe.germanReady ? recipe : await SKOnline.translateRecipeToGerman(recipe, true);
      state.online.results = state.online.results.map(item => item.externalId === translated.externalId ? translated : item);
      openModal(onlineRecipeDetail(translated));
    } catch (error) {
      openModal(`<div class="modal-inner"><div class="modal-header"><div><h2>Rezept konnte nicht geöffnet werden</h2></div>${closeButton()}</div><div class="notice danger">${esc(error.message || error)}</div></div>`);
    }
  }

  async function adaptAndSaveOnlineRecipe(recipe) {
    try {
      const germanRecipe = recipe.germanReady ? recipe : await SKOnline.translateRecipeToGerman(recipe, true);
      const baseServings = Math.max(1, number(document.querySelector('#onlineBaseServings')?.value) || germanRecipe.servings || 4);
      const desiredServings = Math.max(1, number(document.querySelector('#onlineDesiredServings')?.value) || selectedProfiles().length || 2);
      const adapted = SKOnline.adapt(germanRecipe, selectedProfiles(), baseServings, desiredServings);
      adapted.id = uid('recipe');
      adapted.createdAt = new Date().toISOString();
      adapted.updatedAt = adapted.createdAt;
      adapted.importedAt = adapted.createdAt;
      await SKDB.put('recipes', adapted);
      await loadState();
      closeModal();
      render();
      showToast(adapted.adaptation?.changes?.length ? 'Angepasstes Rezept gespeichert' : 'Online-Rezept gespeichert');
    } catch (error) {
      showToast(error.message || 'Rezept konnte nicht angepasst werden');
    }
  }

  async function saveOnlineOriginal(recipe) {
    try {
      const germanRecipe = recipe.germanReady ? recipe : await SKOnline.translateRecipeToGerman(recipe, true);
      const baseServings = Math.max(1, number(document.querySelector('#onlineBaseServings')?.value) || germanRecipe.servings || 4);
      const desiredServings = Math.max(1, number(document.querySelector('#onlineDesiredServings')?.value) || selectedProfiles().length || 2);
      const scale = desiredServings / baseServings;
      const saved = {
        ...germanRecipe,
        id: uid('recipe'),
        servings: desiredServings,
        servingsEstimated: false,
        ingredients: germanRecipe.ingredients.map(item => ({ ...item, amount: number(item.amount) * scale })),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        importedAt: new Date().toISOString(),
        productConfirmed: false
      };
      await SKDB.put('recipes', saved);
      await loadState();
      closeModal();
      render();
      showToast('Unverändertes Online-Rezept gespeichert');
    } catch (error) {
      showToast(error.message || 'Rezept konnte nicht gespeichert werden');
    }
  }

  async function adaptSavedRecipe(recipe) {
    try {
      const desiredServings = Math.max(1, number(document.querySelector('#detailServings')?.value) || recipe.servings || 2);
      const adapted = SKOnline.adapt(recipe, selectedProfiles(), recipe.servings || desiredServings, desiredServings);
      adapted.id = uid('recipe');
      adapted.createdAt = new Date().toISOString();
      adapted.updatedAt = adapted.createdAt;
      adapted.source = recipe.source ? { ...recipe.source } : undefined;
      await SKDB.put('recipes', adapted);
      await loadState();
      closeModal();
      render();
      showToast('Angepasste Variante als neues Rezept gespeichert');
    } catch (error) {
      showToast(error.message || 'Rezept konnte nicht angepasst werden');
    }
  }

  function profileForm(profile = {}) {
    return `<form id="profileForm" class="modal-inner">
      <div class="modal-header"><div><h2>${profile.id ? 'Person bearbeiten' : 'Person anlegen'}</h2><div class="muted small">Allergien getrennt von Vorlieben erfassen</div></div>${closeButton()}</div>
      <input type="hidden" name="id" value="${attr(profile.id || '')}">
      <div class="form-grid">
        <label>Name<input name="name" required value="${attr(profile.name || '')}" placeholder="Name"></label>
        <label>Rolle<select name="role"><option ${profile.role === 'Besitzer' ? 'selected' : ''}>Besitzer</option><option ${profile.role !== 'Besitzer' ? 'selected' : ''}>Person</option><option ${profile.role === 'Gast' ? 'selected' : ''}>Gast</option></select></label>
        <label>Ernährungsform<select name="diet">${diets.map(d => `<option ${profile.diet === d ? 'selected' : ''}>${d}</option>`).join('')}</select></label>
        <label>Schärfe<select name="spice">${['Mild', 'Mittel', 'Scharf'].map(s => `<option ${profile.spice === s ? 'selected' : ''}>${s}</option>`).join('')}</select></label>
      </div>
      <div class="form-row" style="margin-top:12px">
        <label>Allergien, durch Komma getrennt<input name="allergies" value="${attr((profile.allergies || []).join(', '))}" placeholder="z. B. Erdnüsse, Milch"></label>
        <label>Unverträglichkeiten<input name="intolerances" value="${attr((profile.intolerances || []).join(', '))}" placeholder="z. B. Laktose"></label>
        <label>Mag nicht<input name="dislikes" value="${attr((profile.dislikes || []).join(', '))}" placeholder="z. B. Pilze, Koriander"></label>
        <label>Mag besonders<input name="likes" value="${attr((profile.likes || []).join(', '))}" placeholder="z. B. Kartoffeln, Reis"></label>
      </div>
      <div class="notice danger" style="margin-top:12px">Nur korrekt und vollständig eingetragene Allergien können bei Rezepten erkannt werden.</div>
      <div class="actions" style="margin-top:16px"><button class="button" type="submit">Speichern</button><button class="button ghost" type="button" data-action="close-modal">Abbrechen</button></div>
    </form>`;
  }

  function pantryForm(item = {}) {
    return `<form id="pantryForm" class="modal-inner">
      <div class="modal-header"><div><h2>${item.id ? 'Lebensmittel bearbeiten' : 'Lebensmittel hinzufügen'}</h2><div class="muted small">Menge, Allergene und Ablaufdatum</div></div>${closeButton()}</div>
      <input type="hidden" name="id" value="${attr(item.id || '')}">
      <div class="form-grid">
        <label>Lebensmittel<input name="name" required value="${attr(item.name || '')}" placeholder="z. B. Reis"></label>
        <label>Menge<input name="quantity" required inputmode="decimal" type="number" min="0" step="0.01" value="${attr(item.quantity ?? 1)}"></label>
        <label>Einheit<select name="unit">${units.map(u => `<option ${item.unit === u ? 'selected' : ''}>${u}</option>`).join('')}</select></label>
        <label>Lagerort<select name="location">${['Vorratsschrank', 'Kühlschrank', 'Gefrierschrank', 'Sonstiges'].map(l => `<option ${item.location === l ? 'selected' : ''}>${l}</option>`).join('')}</select></label>
        <label>Ablaufdatum<input name="expiry" type="date" value="${attr(item.expiry || '')}"></label>
        <label>Mindestbestand<input name="minimum" inputmode="decimal" type="number" min="0" step="0.01" value="${attr(item.minimum ?? 0)}"></label>
      </div>
      <div class="form-row" style="margin-top:12px">
        <label>Enthaltene Allergene<input name="allergens" value="${attr((item.allergens || []).join(', '))}" placeholder="z. B. Gluten, Milch"></label>
        <label>Spurenhinweis<input name="traces" value="${attr((item.traces || []).join(', '))}" placeholder="z. B. Erdnüsse, Schalenfrüchte"></label>
        <label>Notizen<textarea name="notes" placeholder="Marke, geöffnete Packung, Hinweise">${esc(item.notes || '')}</textarea></label>
      </div>
      <div class="actions" style="margin-top:16px"><button class="button" type="submit">Speichern</button><button class="button ghost" type="button" data-action="close-modal">Abbrechen</button></div>
    </form>`;
  }

  function recipeForm(recipe = {}) {
    const ingredients = (recipe.ingredients || []).map(i => `${i.name} | ${i.amount} | ${i.unit} | ${(i.allergens || []).join(', ')}`).join('\n');
    const steps = (recipe.steps || []).join('\n');
    return `<form id="recipeForm" class="modal-inner">
      <div class="modal-header"><div><h2>${recipe.id ? 'Rezept bearbeiten' : 'Rezept anlegen'}</h2><div class="muted small">Allergene pro Zutat erfassen</div></div>${closeButton()}</div>
      <input type="hidden" name="id" value="${attr(recipe.id || '')}">
      <div class="form-grid">
        <label>Rezeptname<input name="name" required value="${attr(recipe.name || '')}"></label>
        <label>Küche<select name="cuisine">${cuisines.map(c => `<option ${recipe.cuisine === c ? 'selected' : ''}>${c}</option>`).join('')}</select></label>
        <label>Mahlzeit<select name="meal">${['Frühstück', 'Mittagessen', 'Abendessen', 'Snack', 'Dessert'].map(m => `<option ${recipe.meal === m ? 'selected' : ''}>${m}</option>`).join('')}</select></label>
        <label>Ernährungsform<select name="diet">${diets.map(d => `<option ${recipe.diet === d ? 'selected' : ''}>${d}</option>`).join('')}</select></label>
        <label>Portionen<input name="servings" required type="number" min="1" step="1" value="${attr(recipe.servings || 2)}"></label>
        <label>Vorbereitung (Min.)<input name="prep" type="number" min="0" step="1" value="${attr(recipe.prep || 10)}"></label>
        <label>Kochzeit (Min.)<input name="cook" type="number" min="0" step="1" value="${attr(recipe.cook || 20)}"></label>
      </div>
      <div class="form-row" style="margin-top:12px">
        <label>Zutaten: eine Zeile pro Zutat<textarea name="ingredients" required placeholder="Nudeln | 200 | g | Gluten\nTomaten | 400 | g |">${esc(ingredients)}</textarea><span class="muted small">Format: Name | Menge | Einheit | Allergene durch Komma</span></label>
        <label>Kochschritte: ein Schritt pro Zeile<textarea name="steps" required placeholder="Wasser aufkochen.\nZutaten vorbereiten.">${esc(steps)}</textarea></label>
        <label>Hinweise<textarea name="notes" placeholder="Sicherheits-, Aufbewahrungs- oder Austauschhinweise">${esc(recipe.notes || '')}</textarea></label>
      </div>
      <div class="actions" style="margin-top:16px"><button class="button" type="submit">Speichern</button><button class="button ghost" type="button" data-action="close-modal">Abbrechen</button></div>
    </form>`;
  }

  function shoppingForm(item = {}) {
    return `<form id="shoppingForm" class="modal-inner">
      <div class="modal-header"><div><h2>Einkauf hinzufügen</h2><div class="muted small">Manueller Listeneintrag</div></div>${closeButton()}</div>
      <div class="form-grid"><label>Artikel<input name="name" required value="${attr(item.name || '')}"></label><label>Menge<input name="quantity" type="number" min="0" step="0.01" value="${attr(item.quantity || 1)}"></label><label>Einheit<select name="unit">${units.map(u => `<option ${item.unit === u ? 'selected' : ''}>${u}</option>`).join('')}</select></label></div>
      <div class="actions" style="margin-top:16px"><button class="button" type="submit">Hinzufügen</button><button class="button ghost" type="button" data-action="close-modal">Abbrechen</button></div>
    </form>`;
  }

  function recipeDetail(recipe) {
    const compatibility = recipeCompatibility(recipe);
    const availability = recipeAvailability(recipe);
    const changes = recipe.adaptation?.changes || [];
    const statusNotice = compatibility.status === 'direct'
      ? '<div class="notice success"><strong>Kein eingetragener Konflikt erkannt.</strong> Verpackungen und Spurenhinweise trotzdem kontrollieren.</div>'
      : compatibility.status === 'adaptable'
        ? `<div class="notice"><strong>Mit Ersatz anpassbar:</strong> ${esc(compatibility.replacements.map(item => `${item.ingredient} → ${item.candidate.name}`).join('; '))}</div>`
        : compatibility.status === 'check'
          ? `<div class="notice"><strong>Prüfung erforderlich:</strong> ${esc(compatibility.reasons.join('; '))}</div>`
          : `<div class="notice danger"><strong>Nicht zuverlässig anpassbar:</strong> ${esc(compatibility.reasons.join('; '))}</div>`;
    return `<div class="modal-inner">
      <div class="modal-header"><div><h2>${esc(recipe.name)}</h2><div class="meta"><span>${esc(recipe.cuisine)}</span><span>${esc(recipe.diet)}</span><span>${recipe.servings} Portionen</span><span>${number(recipe.prep) + number(recipe.cook)} Min.</span>${recipe.source?.provider ? `<span>Quelle: ${esc(recipe.source.provider)}</span>` : ''}</div></div>${closeButton()}</div>
      ${recipe.image ? `<img class="recipe-hero-image" src="${attr(safeUrl(recipe.image))}" alt="${attr(recipe.name)}">` : ''}
      <div style="margin:12px 0">${recipeBadge(recipe)}</div>
      ${statusNotice}
      ${changes.length ? `<div class="notice" style="margin-top:12px"><strong>Automatische Änderungen:</strong><ul class="ingredient-list">${changes.map(change => `<li>${esc(change.from)} → ${esc(change.to)}<div class="muted small">${esc(change.note)}</div></li>`).join('')}</ul></div>` : ''}
      <hr class="divider">
      <div class="form-grid"><label>Gewünschte Portionen<input id="detailServings" type="number" min="1" step="1" value="${recipe.servings}"></label></div>
      <h3 style="margin-top:16px">Zutaten</h3>
      <ul class="ingredient-list">${recipe.ingredients.map(i => `<li><strong>${formatNumber(i.amount)} ${esc(i.unit)}</strong> ${esc(i.name)} ${(i.allergens || []).length ? `<span class="badge check">${esc(i.allergens.join(', '))}</span>` : ''}${i.requiresProductCheck && !recipe.productConfirmed ? '<span class="badge check">Produkt prüfen</span>' : ''}${i.substitutionNote ? `<div class="muted small">${esc(i.substitutionNote)}</div>` : ''}</li>`).join('')}</ul>
      <h3 style="margin-top:16px">Zubereitung</h3>
      <ol class="ingredient-list">${recipe.steps.map(step => `<li>${esc(step)}</li>`).join('')}</ol>
      ${recipe.notes ? `<div class="notice" style="margin-top:14px">${esc(recipe.notes)}</div>` : ''}
      ${availability.missing.length ? `<div class="notice" style="margin-top:14px"><strong>Aktuell fehlend:</strong> ${esc(availability.missing.map(i => i.name).join(', '))}</div>` : ''}
      <div class="actions" style="margin-top:16px"><button class="button" data-action="cook-recipe" data-id="${recipe.id}">Gericht gekocht</button><button class="button secondary" data-action="add-missing" data-id="${recipe.id}">Fehlendes einkaufen</button>${compatibility.status === 'adaptable' ? `<button class="button secondary" data-action="adapt-saved-recipe" data-id="${recipe.id}">Automatisch anpassen</button>` : ''}${recipe.adaptation && !recipe.productConfirmed ? `<button class="button secondary" data-action="confirm-products" data-id="${recipe.id}">Produkte geprüft</button>` : ''}${recipe.source?.url ? `<a class="button ghost" href="${attr(safeUrl(recipe.source.url))}" target="_blank" rel="noopener noreferrer">Quelle öffnen</a>` : ''}<button class="button ghost" data-action="edit-recipe" data-id="${recipe.id}">Bearbeiten</button><button class="button ghost" data-action="delete-recipe" data-id="${recipe.id}">Löschen</button></div>
    </div>`;
  }


  function cookConfirmation(recipe, servings) {
    const scale = servings / recipe.servings;
    return `<form id="cookForm" class="modal-inner">
      <div class="modal-header"><div><h2>Verbrauch bestätigen</h2><div class="muted small">Mengen vor dem Abzug kontrollieren</div></div>${closeButton()}</div>
      <input type="hidden" name="recipeId" value="${recipe.id}">
      <input type="hidden" name="servings" value="${servings}">
      <div class="notice">Der Vorrat wird erst nach deiner Bestätigung verändert. Einträge mit nicht passender Einheit werden nicht automatisch abgezogen.</div>
      <div class="list" style="margin-top:14px">${recipe.ingredients.map((ingredient, index) => {
        const pantry = findPantryIngredient(ingredient);
        const sameUnit = pantry && normalize(pantry.unit) === normalize(ingredient.unit);
        const needed = ingredient.amount * scale;
        return `<div class="list-item"><div class="list-item-main"><strong>${esc(ingredient.name)}</strong><div class="meta"><span>Vorrat: ${pantry ? `${formatNumber(pantry.quantity)} ${esc(pantry.unit)}` : 'nicht gefunden'}</span>${pantry && !sameUnit ? '<span class="badge check">Einheit prüfen</span>' : ''}</div></div><div style="width:130px"><label class="small">Verbraucht<input name="amount_${index}" type="number" min="0" step="0.01" value="${needed}"></label><input type="hidden" name="ingredient_${index}" value="${attr(ingredient.name)}"><input type="hidden" name="unit_${index}" value="${attr(ingredient.unit)}"></div></div>`;
      }).join('')}</div>
      <div class="actions" style="margin-top:16px"><button class="button" type="submit">Jetzt abziehen</button><button class="button ghost" type="button" data-action="close-modal">Abbrechen</button></div>
    </form>`;
  }

  async function saveProfile(form) {
    return runFormTask(form, async () => {
      const data = new FormData(form);
      const id = String(data.get('id') || '');
      const existing = state.profiles.find(profile => profile.id === id);
      const name = String(data.get('name') || '').trim();
      if (!name) throw new Error('Bitte einen Namen eingeben.');
      const profile = {
        ...existing,
        id: id || uid('person'),
        name,
        role: String(data.get('role') || 'Person'),
        diet: String(data.get('diet') || 'Omnivor'),
        spice: String(data.get('spice') || 'Mittel'),
        allergies: splitList(data.get('allergies')),
        intolerances: splitList(data.get('intolerances')),
        dislikes: splitList(data.get('dislikes')),
        likes: splitList(data.get('likes')),
        createdAt: existing?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      await SKDB.put('profiles', profile);
      const selected = new Set(state.settings.selectedProfiles || []);
      if (!selected.has(profile.id)) {
        selected.add(profile.id);
        await saveSettings({ selectedProfiles: [...selected] });
      }
      await loadState();
      closeModal();
      render();
      showToast('Person gespeichert');
    });
  }

  async function savePantry(form) {
    return runFormTask(form, async () => {
      const data = new FormData(form);
      const id = String(data.get('id') || '');
      const existing = state.pantry.find(item => item.id === id);
      const name = String(data.get('name') || '').trim();
      if (!name) throw new Error('Bitte ein Lebensmittel eingeben.');
      const item = {
        ...existing,
        id: id || uid('pantry'),
        name,
        quantity: number(data.get('quantity')),
        unit: String(data.get('unit') || 'Stück'),
        location: String(data.get('location') || 'Vorratsschrank'),
        expiry: String(data.get('expiry') || ''),
        minimum: number(data.get('minimum')),
        allergens: splitList(data.get('allergens')),
        traces: splitList(data.get('traces')),
        notes: String(data.get('notes') || '').trim(),
        createdAt: existing?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      await SKDB.put('pantry', item);
      await loadState();
      closeModal();
      render();
      showToast('Vorrat gespeichert');
    });
  }

  function parseIngredients(value) {
    return String(value).split('\n').map(line => line.trim()).filter(Boolean).map((line, index) => {
      const [name, amount, unit, allergens = ''] = line.split('|').map(part => part.trim());
      if (!name || !amount || !unit) throw new Error(`Zutatenzeile ${index + 1} ist unvollständig.`);
      return { name, amount: number(amount), unit, allergens: splitList(allergens) };
    });
  }

  async function saveRecipe(form) {
    return runFormTask(form, async () => {
      const data = new FormData(form);
      const id = String(data.get('id') || '');
      const existing = state.recipes.find(recipe => recipe.id === id);
      const name = String(data.get('name') || '').trim();
      if (!name) throw new Error('Bitte einen Rezeptnamen eingeben.');
      const ingredients = parseIngredients(data.get('ingredients'));
      const steps = String(data.get('steps') || '').split('\n').map(value => value.trim()).filter(Boolean);
      if (!steps.length) throw new Error('Bitte mindestens einen Kochschritt eingeben.');
      const recipe = {
        ...existing,
        id: id || uid('recipe'),
        name,
        cuisine: String(data.get('cuisine') || 'International'),
        meal: String(data.get('meal') || 'Abendessen'),
        diet: String(data.get('diet') || 'Omnivor'),
        servings: Math.max(1, number(data.get('servings'))),
        prep: number(data.get('prep')),
        cook: number(data.get('cook')),
        ingredients,
        steps,
        notes: String(data.get('notes') || '').trim(),
        createdAt: existing?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      await SKDB.put('recipes', recipe);
      await loadState();
      closeModal();
      render();
      showToast('Rezept gespeichert');
    });
  }

  async function saveShopping(form) {
    const data = new FormData(form);
    await SKDB.put('shopping', { id: uid('shopping'), name: data.get('name').trim(), quantity: number(data.get('quantity')), unit: data.get('unit'), done: false, source: 'Manuell', createdAt: new Date().toISOString() });
    await loadState(); closeModal(); render(); showToast('Zur Einkaufsliste hinzugefügt');
  }

  async function processCook(form) {
    const data = new FormData(form);
    const recipe = state.recipes.find(r => r.id === data.get('recipeId'));
    if (!recipe) return;
    const changes = [];
    for (let index = 0; index < recipe.ingredients.length; index += 1) {
      const ingredient = recipe.ingredients[index];
      const used = number(data.get(`amount_${index}`));
      const pantry = findPantryIngredient(ingredient);
      if (!pantry || normalize(pantry.unit) !== normalize(ingredient.unit)) {
        changes.push(`${ingredient.name}: nicht automatisch abgezogen`);
        continue;
      }
      const before = number(pantry.quantity);
      const after = Math.max(0, before - used);
      pantry.quantity = after;
      pantry.updatedAt = new Date().toISOString();
      await SKDB.put('pantry', pantry);
      changes.push(`${ingredient.name}: ${formatNumber(before)} → ${formatNumber(after)} ${pantry.unit}`);
      if (after <= number(pantry.minimum)) await addShoppingItem({ name: pantry.name, quantity: Math.max(1, number(pantry.minimum) || used), unit: pantry.unit, source: 'Mindestbestand' }, false);
    }
    await SKDB.put('activity', { id: uid('activity'), type: 'cook', title: recipe.name, details: changes, servings: number(data.get('servings')), createdAt: new Date().toISOString() });
    await loadState(); closeModal(); render(); showToast('Vorräte wurden aktualisiert');
  }

  async function addShoppingItem(item, reload = true) {
    const existing = state.shopping.find(entry => !entry.done && normalize(entry.name) === normalize(item.name) && normalize(entry.unit) === normalize(item.unit));
    if (existing) {
      existing.quantity = Math.max(number(existing.quantity), number(item.quantity));
      await SKDB.put('shopping', existing);
    } else {
      await SKDB.put('shopping', { id: uid('shopping'), done: false, createdAt: new Date().toISOString(), ...item });
    }
    if (reload) await loadState();
  }

  async function addMissingIngredients(recipe) {
    const servings = number(document.querySelector('#detailServings')?.value) || recipe.servings;
    const availability = recipeAvailability(recipe, servings);
    if (!availability.missing.length) return showToast('Alle Zutaten sind vorhanden');
    for (const item of availability.missing) await addShoppingItem({ name: item.name, quantity: item.amount, unit: item.unit, source: recipe.name }, false);
    await loadState();
    showToast(`${availability.missing.length} Positionen hinzugefügt`);
    if (!modal.open) render();
  }

  async function completeShopping(item) {
    openModal(`<form id="completeShoppingForm" class="modal-inner"><div class="modal-header"><div><h2>Einkauf einlagern</h2><div class="muted small">Menge und Lagerort bestätigen</div></div>${closeButton()}</div><input type="hidden" name="shoppingId" value="${item.id}"><div class="form-grid"><label>Artikel<input name="name" required value="${attr(item.name)}"></label><label>Menge<input name="quantity" type="number" min="0" step="0.01" value="${attr(item.quantity)}"></label><label>Einheit<select name="unit">${units.map(u => `<option ${item.unit === u ? 'selected' : ''}>${u}</option>`).join('')}</select></label><label>Lagerort<select name="location">${['Vorratsschrank', 'Kühlschrank', 'Gefrierschrank', 'Sonstiges'].map(l => `<option>${l}</option>`).join('')}</select></label><label>Ablaufdatum<input name="expiry" type="date"></label><label>Allergene<input name="allergens" placeholder="durch Komma getrennt"></label></div><div class="actions" style="margin-top:16px"><button class="button" type="submit">Einlagern</button><button class="button ghost" type="button" data-action="close-modal">Nur schließen</button></div></form>`);
  }

  async function storeCompletedShopping(form) {
    const data = new FormData(form);
    const shopping = state.shopping.find(i => i.id === data.get('shoppingId'));
    if (!shopping) return;
    const name = data.get('name').trim();
    const quantity = number(data.get('quantity'));
    const unit = data.get('unit');
    const existing = state.pantry.find(p => normalize(p.name) === normalize(name) && normalize(p.unit) === normalize(unit));
    const pantry = existing ? { ...existing, quantity: number(existing.quantity) + quantity } : {
      id: uid('pantry'), name, quantity, unit, location: data.get('location'), expiry: data.get('expiry'), minimum: 0, allergens: splitList(data.get('allergens')), traces: [], notes: ''
    };
    pantry.updatedAt = new Date().toISOString();
    shopping.done = true;
    await SKDB.put('pantry', pantry);
    await SKDB.put('shopping', shopping);
    await loadState(); closeModal(); render(); showToast('Einkauf wurde eingelagert');
  }

  async function exportData() {
    const data = await SKDB.exportAll();
    const blob = new Blob([JSON.stringify({ app: 'SicherKochen', version: 2, exportedAt: new Date().toISOString(), data }, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `sicherkochen-sicherung-${todayISO()}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
    showToast('Sicherung wurde erstellt');
  }

  async function importDataFile(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const parsed = JSON.parse(await file.text());
      if (!parsed.data || parsed.app !== 'SicherKochen') throw new Error('Ungültige Sicherungsdatei');
      if (!confirm('Die vorhandenen Daten werden durch die Sicherung ersetzt. Fortfahren?')) return;
      await SKDB.importAll(parsed.data);
      await loadState(); render(); showToast('Sicherung wurde importiert');
    } catch (error) {
      showToast(error.message || 'Import fehlgeschlagen');
    } finally {
      event.target.value = '';
    }
  }

  async function updateStorageStatus() {
    const node = document.querySelector('#storageStatus');
    if (!node) return;
    try {
      await SKDB.healthCheck();
      const persisted = navigator.storage?.persisted ? await navigator.storage.persisted() : false;
      node.textContent = persisted ? 'Datenbank funktioniert; dauerhafter Speicher wurde gewährt.' : 'Datenbank funktioniert; dauerhafter Speicher ist noch nicht bestätigt.';
      node.className = 'small storage-ok';
    } catch (error) {
      node.textContent = `Speicherfehler: ${error.message || error}`;
      node.className = 'small storage-error';
    }
  }

  async function requestPersistence() {
    if (!navigator.storage?.persist) return showToast('Diese Browserfunktion ist nicht verfügbar');
    const granted = await navigator.storage.persist();
    showToast(granted ? 'Dauerhafter Speicher gewährt' : 'Browser hat die Anfrage nicht bestätigt');
    updateStorageStatus();
  }

  async function saveSourceSettings(form) {
    return runFormTask(form, async () => {
      const data = new FormData(form);
      const recipeSource = String(data.get('recipeSource') || 'themealdb');
      const spoonacularKey = String(data.get('spoonacularKey') || '').trim();
      if (['spoonacular', 'both'].includes(recipeSource) && !spoonacularKey) throw new Error('Für diese Auswahl ist ein Spoonacular-API-Schlüssel erforderlich.');
      await saveSettings({ recipeSource, spoonacularKey });
      await loadState();
      render();
      showToast('Rezeptquelle gespeichert');
    });
  }

  async function forceUpdate() {
    try {
      if ('serviceWorker' in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations();
        await Promise.all(registrations.map(registration => registration.update()));
      }
      if ('caches' in window) {
        const keys = await caches.keys();
        await Promise.all(keys.filter(key => key.startsWith('sicherkochen-')).map(key => caches.delete(key)));
      }
      showToast('Update wird geladen');
      window.setTimeout(() => window.location.reload(), 250);
    } catch (error) {
      showToast(error.message || 'Update konnte nicht geladen werden');
    }
  }

  document.addEventListener('click', async event => {
    const routeButton = event.target.closest('[data-route]');
    if (routeButton) {
      state.route = routeButton.dataset.route;
      render();
      return;
    }

    const button = event.target.closest('[data-action]');
    if (!button) return;
    const { action, id } = button.dataset;

    if (action === 'close-modal') return closeModal();
    if (action === 'view-online-recipe') {
      const recipe = state.online.results.find(item => item.externalId === id);
      if (recipe) return openOnlineRecipe(recipe);
      return;
    }
    if (action === 'adapt-online-recipe') {
      const recipe = state.online.results.find(item => item.externalId === id);
      if (recipe) return adaptAndSaveOnlineRecipe(recipe);
      return;
    }
    if (action === 'save-online-original') {
      const recipe = state.online.results.find(item => item.externalId === id);
      if (recipe) return saveOnlineOriginal(recipe);
      return;
    }
    if (action === 'adapt-saved-recipe') {
      const recipe = state.recipes.find(item => item.id === id);
      if (recipe) return adaptSavedRecipe(recipe);
      return;
    }
    if (action === 'confirm-products') {
      const recipe = state.recipes.find(item => item.id === id);
      if (!recipe) return;
      recipe.productConfirmed = true;
      recipe.productConfirmedAt = new Date().toISOString();
      await SKDB.put('recipes', recipe);
      await loadState();
      closeModal();
      render();
      return showToast('Produktprüfung bestätigt');
    }
    if (action === 'toggle-person') {
      const selected = new Set(state.settings.selectedProfiles || []);
      selected.has(id) ? selected.delete(id) : selected.add(id);
      await saveSettings({ selectedProfiles: [...selected] });
      if (button.closest('#modal')) closeModal();
      render();
      return showToast(`${selected.size} ${selected.size === 1 ? 'Person' : 'Personen'} ausgewählt`);
    }
    if (action === 'new-person') return openModal(profileForm());
    if (action === 'edit-person') return openModal(profileForm(state.profiles.find(p => p.id === id)));
    if (action === 'delete-person') {
      if (!confirm('Diese Person wirklich löschen?')) return;
      await SKDB.delete('profiles', id);
      await saveSettings({ selectedProfiles: (state.settings.selectedProfiles || []).filter(profileId => profileId !== id) });
      await loadState(); return render();
    }
    if (action === 'new-pantry') return openModal(pantryForm());
    if (action === 'edit-pantry') return openModal(pantryForm(state.pantry.find(p => p.id === id)));
    if (action === 'delete-pantry') {
      if (!confirm('Dieses Lebensmittel aus dem Vorrat löschen?')) return;
      await SKDB.delete('pantry', id); await loadState(); return render();
    }
    if (action === 'new-recipe') return openModal(recipeForm());
    if (action === 'edit-recipe') return openModal(recipeForm(state.recipes.find(r => r.id === id)));
    if (action === 'view-recipe') return openModal(recipeDetail(state.recipes.find(r => r.id === id)));
    if (action === 'delete-recipe') {
      if (!confirm('Dieses Rezept löschen?')) return;
      await SKDB.delete('recipes', id); await loadState(); closeModal(); return render();
    }
    if (action === 'cook-recipe') {
      const recipe = state.recipes.find(r => r.id === id);
      const servings = Math.max(1, number(document.querySelector('#detailServings')?.value) || recipe.servings);
      return openModal(cookConfirmation(recipe, servings));
    }
    if (action === 'add-missing') return addMissingIngredients(state.recipes.find(r => r.id === id));
    if (action === 'new-shopping') return openModal(shoppingForm());
    if (action === 'delete-shopping') { await SKDB.delete('shopping', id); await loadState(); return render(); }
    if (action === 'complete-shopping') return completeShopping(state.shopping.find(i => i.id === id));
    if (action === 'clear-done-shopping') {
      for (const item of state.shopping.filter(i => i.done)) await SKDB.delete('shopping', item.id);
      await loadState(); return render();
    }
    if (action === 'search-chefkoch') {
      const query = String(document.querySelector('#onlineSearchForm input[name="query"]')?.value || state.online.query || '').trim();
      const url = `https://www.chefkoch.de/rs/s0/${encodeURIComponent(query || 'Rezepte')}/Rezepte.html`;
      window.open(url, '_blank', 'noopener,noreferrer');
      return;
    }
    if (action === 'storage-test') {
      try { await SKDB.healthCheck(); showToast('Lokaler Speicher funktioniert'); updateStorageStatus(); }
      catch (error) { showToast(error.message || 'Speichertest fehlgeschlagen'); }
      return;
    }
    if (action === 'force-update') return forceUpdate();
    if (action === 'export-data') return exportData();
    if (action === 'import-data') return document.querySelector('#importFile')?.click();
    if (action === 'request-persistence') return requestPersistence();
    if (action === 'reset-data') {
      if (!confirm('Wirklich alle Personen, Allergien, Rezepte und Vorräte löschen?')) return;
      for (const store of SKDB.stores) await SKDB.clear(store);
      await loadState(); return render();
    }
  });

  document.addEventListener('submit', async event => {
    event.preventDefault();
    const formId = event.target.getAttribute('id');
    if (formId === 'onlineSearchForm') return searchOnlineRecipes(event.target);
    if (formId === 'profileForm') return saveProfile(event.target);
    if (formId === 'pantryForm') return savePantry(event.target);
    if (formId === 'recipeForm') return saveRecipe(event.target);
    if (formId === 'shoppingForm') return saveShopping(event.target);
    if (formId === 'cookForm') return processCook(event.target);
    if (formId === 'completeShoppingForm') return storeCompletedShopping(event.target);
    if (formId === 'sourceSettingsForm') return saveSourceSettings(event.target);
  });

  modal.addEventListener('click', event => {
    if (event.target === modal) closeModal();
  });

  window.addEventListener('beforeinstallprompt', event => {
    event.preventDefault();
    state.installPrompt = event;
    installButton.hidden = false;
  });

  installButton.addEventListener('click', async () => {
    if (!state.installPrompt) return;
    state.installPrompt.prompt();
    await state.installPrompt.userChoice;
    state.installPrompt = null;
    installButton.hidden = true;
  });

  window.addEventListener('appinstalled', () => { installButton.hidden = true; showToast('App wurde installiert'); });

  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => navigator.serviceWorker.register('./sw.js').catch(error => console.warn('Service Worker:', error)));
  }

  loadState().then(render).catch(error => {
    console.error(error);
    app.innerHTML = `<div class="notice danger"><strong>Die App konnte nicht gestartet werden.</strong><br>${esc(error.message || error)}</div>`;
  });
})();
