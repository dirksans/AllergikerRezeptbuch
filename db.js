(() => {
  'use strict';

  const DB_NAME = 'sicherkochen-db';
  const DB_VERSION = 2;
  const STORES = ['profiles', 'pantry', 'recipes', 'shopping', 'settings', 'activity'];

  function openDatabase() {
    return new Promise((resolve, reject) => {
      if (!('indexedDB' in window)) return reject(new Error('Dieser Browser unterstützt die lokale Datenbank nicht.'));
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      request.onupgradeneeded = () => {
        const db = request.result;
        STORES.forEach(store => {
          if (!db.objectStoreNames.contains(store)) db.createObjectStore(store, { keyPath: 'id' });
        });
      };
      request.onblocked = () => reject(new Error('Die Datenbank ist durch eine ältere geöffnete App-Version blockiert. Bitte andere Tabs schließen und neu laden.'));
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error || new Error('Die lokale Datenbank konnte nicht geöffnet werden.'));
    });
  }

  async function run(storeName, mode, operation) {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
      let request;
      try {
        const tx = db.transaction(storeName, mode);
        const store = tx.objectStore(storeName);
        request = operation(store);
        tx.oncomplete = () => {
          const result = request && 'result' in request ? request.result : request;
          db.close();
          resolve(result);
        };
        tx.onerror = () => {
          const error = tx.error || request?.error || new Error(`Speichern in „${storeName}“ fehlgeschlagen.`);
          db.close();
          reject(error);
        };
        tx.onabort = () => {
          const error = tx.error || request?.error || new Error(`Datenbankvorgang in „${storeName}“ wurde abgebrochen.`);
          db.close();
          reject(error);
        };
      } catch (error) {
        db.close();
        reject(error);
      }
    });
  }

  const api = {
    getAll: store => run(store, 'readonly', objectStore => objectStore.getAll()),
    get: (store, id) => run(store, 'readonly', objectStore => objectStore.get(id)),
    put: (store, value) => run(store, 'readwrite', objectStore => objectStore.put(value)),
    delete: (store, id) => run(store, 'readwrite', objectStore => objectStore.delete(id)),
    clear: store => run(store, 'readwrite', objectStore => objectStore.clear()),
    exportAll: async () => {
      const result = {};
      for (const store of STORES) result[store] = await api.getAll(store);
      return result;
    },
    importAll: async data => {
      for (const store of STORES) {
        await api.clear(store);
        for (const item of data[store] || []) await api.put(store, item);
      }
    },
    healthCheck: async () => {
      const db = await openDatabase();
      const stores = STORES.filter(store => db.objectStoreNames.contains(store));
      db.close();
      if (stores.length !== STORES.length) throw new Error('Die lokale Datenbank ist unvollständig.');
      return true;
    },
    stores: STORES
  };

  window.SKDB = api;
})();
