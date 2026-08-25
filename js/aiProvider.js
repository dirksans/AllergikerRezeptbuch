(() => {
  'use strict';
  const config = { AI_ENABLED:false, API_BASE_URL:'' };
  function configure(patch={}) { Object.assign(config, patch); }
  async function call(path, payload) {
    if (!config.AI_ENABLED || !config.API_BASE_URL) throw new Error('KI ist deaktiviert. SicherKochen arbeitet weiterhin vollständig im lokalen Modus.');
    const response = await fetch(`${config.API_BASE_URL.replace(/\/$/,'')}/${path}`, { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(payload) });
    if (!response.ok) throw new Error(`KI-Dienst nicht verfügbar (${response.status}).`);
    return response.json();
  }
  window.SKAI = {
    config, configure,
    generateRecipe: context => call('generate-recipe', context),
    analyzeReceipt: image => call('analyze-receipt', { image }),
    adaptRecipe: (recipe, profiles) => call('adapt-recipe', { recipe, profiles }),
    generateShoppingList: context => call('generate-shopping-list', context)
  };
})();
