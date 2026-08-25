(() => {
  'use strict';
  const normalize = value => window.SKData.normalize(value).replace(/\b(bio|frisch|deutsch|deutsche|dose|glas|packung|tk|tiefkuehl)\b/g,' ').replace(/\s+/g,' ').trim();

  const mappingRules = [
    [/dattel(cherry)?\s*tom/i, 'tomate'], [/cherry\s*tom/i,'tomate'], [/basmati.*reis/i,'basmatireis'],
    [/kichererbs/i,'kichererbsen'], [/brokkoli/i,'brokkoli'], [/paprika/i,'paprika'], [/zucchini/i,'zucchini'],
    [/kokosmilch/i,'kokosmilch'], [/passierte.*tom/i,'passierte-tomaten'], [/hafer.*drink/i,'haferdrink'], [/reis.*nudel/i,'reisnudeln']
  ];

  function extractPrice(line) {
    const matches = String(line).match(/(?:€\s*)?(\d{1,4}[,.]\d{2})(?:\s*€)?\s*$/);
    return matches ? Number(matches[1].replace(',','.')) : null;
  }
  function extractQuantity(line) {
    const text=String(line);
    let m=text.match(/\b(\d+(?:[,.]\d+)?)\s*(kg|g|l|ml|stk|stück|x)\b/i);
    if (!m) return { quantity:1, unit:'Stück' };
    let quantity=Number(m[1].replace(',','.')); let unit=m[2].toLowerCase();
    if (unit==='kg') { quantity*=1000; unit='g'; }
    if (unit==='l') { quantity*=1000; unit='ml'; }
    if (unit==='stk'||unit==='stück'||unit==='x') unit='Stück';
    return { quantity, unit };
  }
  function normalizeProductName(name) {
    return String(name || '').replace(/\d+[,.]\d{2}\s*€?\s*$/,'').replace(/\b\d+(?:[,.]\d+)?\s*(kg|g|l|ml|stk|stück|x)\b/ig,'').replace(/[*#]/g,' ').replace(/\s+/g,' ').trim();
  }
  function matchIngredient(product, mappings = []) {
    const raw = product.name || product;
    const n = normalize(raw);
    const learned = mappings.find(m => normalize(m.rawName) === n);
    if (learned) return window.SKData.ingredient(learned.ingredientId) || null;
    for (const [pattern,id] of mappingRules) if (pattern.test(raw)) return window.SKData.ingredient(id);
    return window.SKData.ingredient(raw);
  }
  function parseReceiptText(text, mappings = []) {
    const ignored=/^(summe|gesamt|zwischensumme|mwst|ust|bar|karte|visa|mastercard|ec|datum|uhrzeit|bon|kasse|rueckgeld|rückgeld)/i;
    return String(text || '').split(/\r?\n/).map(line=>line.trim()).filter(line=>line.length>2 && !ignored.test(line)).map((line,index)=>{
      const price=extractPrice(line); const {quantity,unit}=extractQuantity(line); const name=normalizeProductName(line);
      const ingredient=matchIngredient({name}, mappings);
      return { id:`receipt_${Date.now()}_${index}`, raw:line, name:ingredient?.name || name, ingredientId:ingredient?.id || '', quantity, unit:ingredient?.defaultUnit || unit, price, category:ingredient?.category || 'Sonstiges', confirmed:false };
    }).filter(item=>item.name && !/^\d+$/.test(item.name));
  }

  window.SKReceiptParser = { parseReceiptText, normalizeProductName, matchIngredient, extractQuantity, extractPrice };
})();
