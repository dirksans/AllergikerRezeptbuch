(() => {
  'use strict';

  const DB_NAME = 'sicherkochen-db';
  const DB_VERSION = 4;
  const STORES = [
    'profiles', 'pantry', 'recipes', 'shopping', 'settings', 'activity',
    'weeklyPlan', 'history', 'mappings', 'receipts'
  ];

  function openDatabase() {
    return new Promise((resolve, reject) => {
      if (!('indexedDB' in window)) return reject(new Error('Dieser Browser unterstützt IndexedDB nicht.'));
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      request.onupgradeneeded = () => {
        const db = request.result;
        STORES.forEach(name => {
          if (!db.objectStoreNames.contains(name)) db.createObjectStore(name, { keyPath: 'id' });
        });
      };
      request.onblocked = () => reject(new Error('Die lokale Datenbank wird noch von einer älteren geöffneten App-Version verwendet. Bitte andere SicherKochen-Tabs schließen.'));
      request.onerror = () => reject(request.error || new Error('Die lokale Datenbank konnte nicht geöffnet werden.'));
      request.onsuccess = () => resolve(request.result);
    });
  }

  async function run(storeName, mode, operation) {
    if (!STORES.includes(storeName)) throw new Error(`Unbekannter Datenspeicher: ${storeName}`);
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
      let request;
      try {
        const tx = db.transaction(storeName, mode);
        const store = tx.objectStore(storeName);
        request = operation(store);
        tx.oncomplete = () => {
          const result = request && 'result' in request ? request.result : request;
          db.close(); resolve(result);
        };
        tx.onerror = () => { const error = tx.error || request?.error || new Error(`Datenbankvorgang in „${storeName}“ fehlgeschlagen.`); db.close(); reject(error); };
        tx.onabort = () => { const error = tx.error || request?.error || new Error(`Datenbankvorgang in „${storeName}“ wurde abgebrochen.`); db.close(); reject(error); };
      } catch (error) { db.close(); reject(error); }
    });
  }

  const api = {
    version: DB_VERSION,
    stores: STORES,
    openDatabase,
    getAll: store => run(store, 'readonly', s => s.getAll()),
    get: (store, id) => run(store, 'readonly', s => s.get(id)),
    put: (store, value) => run(store, 'readwrite', s => s.put(value)),
    add: (store, value) => run(store, 'readwrite', s => s.add(value)),
    delete: (store, id) => run(store, 'readwrite', s => s.delete(id)),
    clear: store => run(store, 'readwrite', s => s.clear()),
    async exportAll() {
      const data = {};
      for (const store of STORES) data[store] = await api.getAll(store);
      return data;
    },
    async importAll(data, { clearFirst = true } = {}) {
      if (!data || typeof data !== 'object') throw new Error('Die Sicherungsdaten sind ungültig.');
      for (const store of STORES) {
        if (clearFirst) await api.clear(store);
        for (const item of Array.isArray(data[store]) ? data[store] : []) await api.put(store, item);
      }
    },
    async healthCheck() {
      const db = await openDatabase();
      const missing = STORES.filter(store => !db.objectStoreNames.contains(store));
      db.close();
      if (missing.length) throw new Error(`Lokale Datenbank unvollständig: ${missing.join(', ')}`);
      return true;
    }
  };

  window.SKDB = api;
})();
