const VERSION = '3.5.1';
const CACHE_NAME = `sicherkochen-${VERSION}`;
const APP_SHELL = [
  './','./index.html','./manifest.webmanifest','./css/style.css',
  './js/db.js','./js/data.js','./js/allergyEngine.js','./js/nutrition.js','./js/receiptParser.js','./js/receiptOcr.js',
  './js/recipeEngine.js','./js/mealPlanner.js','./js/aiProvider.js','./js/online-recipes.js','./js/app.js',
  './data/ingredients.json','./data/recipes.json','./data/allergens.json','./data/substitutions.json','./data/seasonality.json','./data/cuisines.json',
  './assets/icons/icon-192.png','./assets/icons/icon-512.png'
];

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(APP_SHELL)));
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k.startsWith('sicherkochen-') && k !== CACHE_NAME).map(k => caches.delete(k)))));
  self.clients.claim();
});

self.addEventListener('message', event => {
  if (event.data?.type === 'SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);

  if (url.origin !== self.location.origin) {
    event.respondWith(fetch(event.request));
    return;
  }

  // Navigation: network first, then cached app shell.
  if (event.request.mode === 'navigate') {
    event.respondWith(fetch(event.request).then(response => {
      const copy = response.clone(); caches.open(CACHE_NAME).then(cache => cache.put('./index.html', copy)); return response;
    }).catch(() => caches.match('./index.html')));
    return;
  }

  // App-Dateien: cache first; bei Online-Verbindung Cache im Hintergrund aktualisieren.
  event.respondWith(caches.match(event.request, { ignoreSearch:true }).then(cached => {
    const network = fetch(event.request).then(response => {
      if (response.ok) { const copy=response.clone(); caches.open(CACHE_NAME).then(cache => cache.put(event.request, copy)); }
      return response;
    }).catch(() => null);
    return cached || network.then(response => response || new Response('Offline', { status:503, statusText:'Offline' }));
  }));
});
