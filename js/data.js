(() => {
  'use strict';
  const FILES = {
    ingredients: './data/ingredients.json',
    recipes: './data/recipes.json',
    allergens: './data/allergens.json',
    substitutions: './data/substitutions.json',
    seasonality: './data/seasonality.json',
    cuisines: './data/cuisines.json'
  };
  const state = { loaded: false };

  async function fetchJson(url) {
    const response = await fetch(url, { cache: 'no-cache' });
    if (!response.ok) throw new Error(`Lokale App-Daten konnten nicht geladen werden (${response.status}).`);
    return response.json();
  }

  async function load() {
    if (state.loaded) return state;
    const entries = await Promise.all(Object.entries(FILES).map(async ([key, url]) => [key, await fetchJson(url)]));
    for (const [key, value] of entries) state[key] = value;
    state.ingredientById = new Map((state.ingredients || []).map(item => [item.id, item]));
    state.ingredientByName = new Map();
    for (const ingredient of state.ingredients || []) {
      [ingredient.name, ...(ingredient.aliases || [])].forEach(name => state.ingredientByName.set(normalize(name), ingredient));
    }
    state.loaded = true;
    return state;
  }

  function normalize(value) {
    return String(value || '').trim().toLocaleLowerCase('de-DE').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/ß/g, 'ss').replace(/[^a-z0-9]+/g, ' ').trim();
  }

  function ingredient(ref) {
    if (!ref) return null;
    if (typeof ref === 'object' && ref.ingredientId) return state.ingredientById?.get(ref.ingredientId) || null;
    return state.ingredientById?.get(String(ref)) || state.ingredientByName?.get(normalize(ref)) || null;
  }

  window.SKData = { load, ingredient, normalize, state };
})();
