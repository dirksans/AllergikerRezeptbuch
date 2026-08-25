(() => {
  'use strict';
  const DAYS=['Montag','Dienstag','Mittwoch','Donnerstag','Freitag','Samstag','Sonntag'];
  const SLOTS=['Frühstück','Mittagessen','Abendessen','Snack'];
  const uid=p=>`${p}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2,7)}`;

  function emptyWeek() {
    const entries=[];
    for (const day of DAYS) for (const slot of SLOTS) entries.push({id:`${day}-${slot}`,day,slot,recipeId:'',servings:null});
    return {id:'current-week',entries,updatedAt:new Date().toISOString()};
  }

  function normalizeWeek(week) {
    const base=emptyWeek(); const map=new Map((week?.entries||[]).map(e=>[`${e.day}-${e.slot}`,e]));
    base.entries=base.entries.map(e=>({...e,...(map.get(`${e.day}-${e.slot}`)||{})}));
    return {...base,...(week||{}),entries:base.entries};
  }

  function adjustedScore(item, settings={}) {
    let score=item.score;
    const totalTime=Number(item.recipe.prepTime||0)+Number(item.recipe.cookTime||0);
    if (settings.quick && totalTime<=30) score+=4;
    if (settings.healthy) {
      const n=window.SKNutrition.recipeNutrition(item.recipe,item.recipe.servings||1).perServing;
      score += Math.min(5,(Number(n.protein||0)/15)+(Number(n.fiber||0)/5));
    }
    if (settings.preferPantry) score -= item.availability.missing.length*2;
    return score;
  }

  function autoPlan({recipes,pantry,profiles,history,settings={}}) {
    const week=emptyWeek(); const target=window.SKRecipes.desiredServings(profiles);
    const maxTime=Math.max(0,Number(settings.maxTime||0));
    let ranked=window.SKRecipes.rankRecipes(recipes,{pantry,profiles,history,targetServings:target})
      .filter(x=>x.safety.status!=='possible')
      .filter(x=>!maxTime || (Number(x.recipe.prepTime||0)+Number(x.recipe.cookTime||0))<=maxTime)
      .map(x=>({...x,adjusted:adjustedScore(x,settings)}))
      .sort((a,b)=>b.adjusted-a.adjusted);
    if (!ranked.length) return week;

    const onlyVeg = profiles.length && profiles.every(p=>['vegetarisch','vegan'].includes(window.SKData.normalize(p.diet)));
    let meatTarget = onlyVeg ? 0 : Math.max(0,Math.min(7,Number(settings.meatMeals ?? 3)));
    let vegTarget = Math.max(0,Math.min(7,Number(settings.vegetarianMeals ?? (7-meatTarget))));
    if (meatTarget+vegTarget<7) vegTarget=7-meatTarget;
    if (meatTarget+vegTarget>7) vegTarget=7-meatTarget;

    const vegPool=ranked.filter(x=>x.recipe.vegetarian||x.recipe.vegan);
    const meatPool=ranked.filter(x=>!(x.recipe.vegetarian||x.recipe.vegan));
    const used=[]; let vegUsed=0; let meatUsed=0;

    function choose(pool) {
      if (!pool.length) pool=ranked;
      let candidate=pool.find(x=>!used.slice(-2).includes(x.recipe.id)) || pool[0];
      if (!candidate) return null;
      used.push(candidate.recipe.id);
      // Nach Auswahl leicht rotieren, damit die Woche abwechslungsreicher bleibt.
      const index=pool.indexOf(candidate); if(index>=0) pool.push(pool.splice(index,1)[0]);
      return candidate.recipe;
    }

    for (const entry of week.entries.filter(e=>e.slot==='Abendessen')) {
      let wantVeg = vegUsed < vegTarget && (meatUsed>=meatTarget || vegUsed<=meatUsed);
      const recipe=choose(wantVeg?vegPool:meatPool) || choose(wantVeg?meatPool:vegPool);
      if (!recipe) continue;
      entry.recipeId=recipe.id; entry.servings=target;
      if (recipe.vegetarian||recipe.vegan) vegUsed++; else meatUsed++;
    }
    week.updatedAt=new Date().toISOString();
    week.generatorSettings={...settings,meatMeals:meatTarget,vegetarianMeals:vegTarget};
    return week;
  }

  function shoppingFromWeek(week,recipes,pantry) {
    const totals=new Map();
    for (const slot of week?.entries||[]) {
      if (!slot.recipeId) continue;
      const recipe=recipes.find(r=>r.id===slot.recipeId); if (!recipe) continue;
      const scaled=window.SKRecipes.scaleRecipe(recipe,slot.servings || recipe.servings || 1);
      for (const ing of scaled.ingredients||[]) {
        if (ing.optional) continue;
        const key=`${ing.ingredientId || window.SKData.normalize(ing.name)}|${window.SKData.normalize(ing.unit)}`;
        const current=totals.get(key) || {...ing,amount:0}; current.amount += Number(ing.amount||0); totals.set(key,current);
      }
    }
    const synthetic={servings:1,ingredients:[...totals.values()]};
    return window.SKRecipes.availability(synthetic,pantry,1).missing.map(item=>({
      id:uid('shop'), name:item.name || window.SKData.ingredient(item)?.name, ingredientId:item.ingredientId || '', quantity:item.missingAmount, unit:item.unit,
      category:window.SKData.ingredient(item)?.category || 'Sonstiges',done:false,source:'Wochenplan',createdAt:new Date().toISOString()
    }));
  }

  function nutritionFromWeek(week,recipes) {
    const total={kcal:0,protein:0,carbs:0,fat:0,fiber:0}; let meals=0; let completeness=0;
    for (const slot of week?.entries||[]) {
      if (!slot.recipeId) continue;
      const recipe=recipes.find(r=>r.id===slot.recipeId); if(!recipe) continue;
      const n=window.SKNutrition.recipeNutrition(recipe,slot.servings||recipe.servings||1);
      for(const k of Object.keys(total)) total[k]+=Number(n.total[k]||0);
      completeness+=n.completeness; meals++;
    }
    return {total,meals,completeness:meals?completeness/meals:0,approximate:true};
  }

  window.SKPlanner={DAYS,SLOTS,emptyWeek,normalizeWeek,autoPlan,shoppingFromWeek,nutritionFromWeek};
})();
