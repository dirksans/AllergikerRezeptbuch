(() => {
  'use strict';
  const toGramFactor = { g:1, kg:1000, ml:1, l:1000 };

  function ingredientNutrition(entry, scale = 1) {
    const lib = window.SKData.ingredient(entry);
    const nut = lib?.nutritionPer100g;
    const unit = String(entry.unit || lib?.defaultUnit || '').toLowerCase();
    const factor = toGramFactor[unit];
    if (!nut || !factor) return null;
    const grams = Number(entry.amount || 0) * factor * scale;
    const multiplier = grams / 100;
    const result = {};
    for (const k of ['kcal','protein','carbs','fat','fiber']) result[k] = Number(nut[k] || 0) * multiplier;
    return result;
  }

  function recipeNutrition(recipe, servings = recipe.servings || 1) {
    const scale = servings / Math.max(1, Number(recipe.servings || 1));
    const total = { kcal:0, protein:0, carbs:0, fat:0, fiber:0 };
    let counted=0;
    for (const ingredient of recipe.ingredients || []) {
      const n = ingredientNutrition(ingredient, scale);
      if (!n) continue;
      counted++;
      for (const key of Object.keys(total)) total[key] += n[key];
    }
    const completeness = (recipe.ingredients || []).length ? counted / recipe.ingredients.length : 0;
    const perServing = Object.fromEntries(Object.entries(total).map(([k,v]) => [k, v / Math.max(1, servings)]));
    return { total, perServing, completeness, approximate:true };
  }

  window.SKNutrition = { ingredientNutrition, recipeNutrition };
})();
