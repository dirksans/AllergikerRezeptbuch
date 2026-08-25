// Spoonacular benötigt einen API-Schlüssel. Kein Schlüssel wird im Frontend gespeichert.
// Für produktive Nutzung ist ein geschützter Backend-/Serverless-Proxy erforderlich.
window.SKRecipeProviders = window.SKRecipeProviders || {};
window.SKRecipeProviders.spoonacular = { id:'spoonacular', requiresSecret:true, enabled:false };
