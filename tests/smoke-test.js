const fs = require('fs');
const vm = require('vm');
const path = require('path');
const root = path.resolve(__dirname, '..');
const readJson = f => JSON.parse(fs.readFileSync(path.join(root, 'data', f), 'utf8'));

global.window = global;
const normalize = value => String(value || '').trim().toLocaleLowerCase('de-DE').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/ß/g, 'ss').replace(/[^a-z0-9]+/g, ' ').trim();
const ingredients = readJson('ingredients.json');
const ingredientById = new Map(ingredients.map(x => [x.id, x]));
const ingredientByName = new Map();
for (const i of ingredients) [i.name, ...(i.aliases || [])].forEach(n => ingredientByName.set(normalize(n), i));
global.SKData = {
  normalize,
  state: { ingredients, recipes: readJson('recipes.json'), allergens: readJson('allergens.json'), substitutions: readJson('substitutions.json'), seasonality: readJson('seasonality.json') },
  ingredient(ref) {
    if (!ref) return null;
    if (typeof ref === 'object' && ref.ingredientId) return ingredientById.get(ref.ingredientId) || null;
    return ingredientById.get(String(ref)) || ingredientByName.get(normalize(ref)) || null;
  }
};
for (const file of ['allergyEngine.js','nutrition.js','recipeEngine.js','mealPlanner.js','receiptParser.js']) {
  vm.runInThisContext(fs.readFileSync(path.join(root,'js',file),'utf8'), { filename:file });
}
function assert(condition, message) { if (!condition) throw new Error(message); }

const milkProfile = [{name:'Test',diet:'Omnivor',allergies:['Milcheiweiß'],intolerances:[]}];
assert(SKAllergy.analyzeIngredient({name:'laktosefreie Milch'}, milkProfile).status === 'possible', 'Laktosefreie Milch muss bei Milchproteinallergie konfligieren.');
assert(SKAllergy.analyzeIngredient({name:'Super Spezial Creme XYZ'}, []).status === 'unknown', 'Unbekannte Zutat muss unknown sein.');

const curry = SKData.state.recipes.find(r => r.id === 'r01');
const scaled = SKRecipes.scaleRecipe(curry, 3);
assert(scaled.ingredients.find(i => i.ingredientId === 'blumenkohl').amount === 750, 'Skalierung Blumenkohl falsch.');
const firstStep = SKRecipes.formatStep(scaled.steps[0], scaled);
assert(firstStep.includes('1½ Stück Zwiebel') || firstStep.includes('1½ Zwiebel'), 'Skalierte Schrittmenge fehlt.');

const receipt = SKReceiptParser.parseReceiptText('DATTELTOMATEN 1,99\nPAPRIKA ROT 2,49\nKOKOSMILCH 0,99', []);
assert(receipt.length === 3, 'Bonparser sollte drei Zeilen erkennen.');
assert(receipt.some(x => x.ingredientId === 'kokosmilch'), 'Kokosmilch wurde nicht normalisiert.');
assert(receipt.some(x => x.ingredientId === 'paprika'), 'Paprika wurde nicht normalisiert.');

const pantry = [
  {id:'p1',ingredientId:'paprika',name:'Paprika',quantity:2,unit:'Stück'},
  {id:'p2',ingredientId:'reis',name:'Reis',quantity:500,unit:'g'},
  {id:'p3',ingredientId:'kokosmilch',name:'Kokosmilch',quantity:400,unit:'ml'},
  {id:'p4',ingredientId:'brokkoli',name:'Brokkoli',quantity:500,unit:'g'}
];
const ranked = SKRecipes.rankRecipes(SKData.state.recipes,{pantry,profiles:[],history:[],targetServings:2});
assert(ranked.length === 30 && Number.isFinite(ranked[0].score), 'Rezept-Ranking fehlgeschlagen.');

const plan = SKPlanner.autoPlan({recipes:SKData.state.recipes,pantry,profiles:[],history:[],settings:{maxTime:40,meatMeals:2,vegetarianMeals:5,preferPantry:true}});
assert(plan.entries.filter(e => e.slot === 'Abendessen' && e.recipeId).length === 7, 'Wochenplan sollte sieben Abendessen erzeugen.');

console.log('Smoke tests passed');
