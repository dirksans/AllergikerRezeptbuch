(() => {
  const DB_NAME = 'sicherkochen-db';
  const DB_VERSION = 1;
  const STORES = ['profiles', 'pantry', 'recipes', 'shopping', 'settings', 'activity'];

  function openDatabase() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      request.onupgradeneeded = () => {
        const db = request.result;
        STORES.forEach(store => {
          if (!db.objectStoreNames.contains(store)) {
            db.createObjectStore(store, { keyPath: 'id' });
          }
        });
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async function transaction(storeName, mode, operation) {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, mode);
      const store = tx.objectStore(storeName);
      const result = operation(store);
      tx.oncomplete = () => resolve(result?.result);
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error);
    });
  }

  const api = {
    getAll: store => transaction(store, 'readonly', objectStore => objectStore.getAll()),
    get: (store, id) => transaction(store, 'readonly', objectStore => objectStore.get(id)),
    put: (store, value) => transaction(store, 'readwrite', objectStore => objectStore.put(value)),
    delete: (store, id) => transaction(store, 'readwrite', objectStore => objectStore.delete(id)),
    clear: store => transaction(store, 'readwrite', objectStore => objectStore.clear()),
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
    stores: STORES
  };

  window.SKDB = api;
})();
