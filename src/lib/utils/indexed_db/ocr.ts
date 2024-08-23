import { IOCRItem, IOCRItemFromIndexedDB } from '@/interfaces/ocr';
import { getTimestampNow } from '@/lib/utils/common';

export const DB_NAME = 'iSunFA';
export const DB_VERSION = 3;
export const STORE_NAME = 'OCR';

let db: IDBDatabase | null = null;

export function initDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (db) {
      resolve(db);
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event: IDBVersionChangeEvent) => {
      db = (event.target as IDBOpenDBRequest).result;

      if (db.objectStoreNames.contains(STORE_NAME)) {
        db.deleteObjectStore(STORE_NAME);
      }
      db.createObjectStore(STORE_NAME, { keyPath: 'id' });
    };

    request.onsuccess = (event: Event) => {
      db = (event.target as IDBOpenDBRequest).result;
      resolve(db);
    };

    request.onerror = (event: Event) => {
      reject(event);
    };
  });
}

async function getDB(): Promise<IDBDatabase> {
  if (!db) {
    db = await initDB();
  }
  return db;
}

export async function addItem(id: string, data: IOCRItem): Promise<void> {
  const gotDB = await getDB();
  return new Promise((resolve, reject) => {
    const transaction = gotDB.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.put({ id, data });

    request.onsuccess = () => {
      resolve();
    };

    request.onerror = (event: Event) => {
      reject(event);
    };
  });
}

export async function addElements(elements: Array<{ id: string; data: IOCRItem }>): Promise<void> {
  const gotDB = await getDB();
  return new Promise((resolve, reject) => {
    const transaction = gotDB.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);

    elements.forEach(({ id, data }) => {
      const request = store.put({ id, data });
      request.onsuccess = () => {};
      request.onerror = (event: Event) => {
        reject(event);
      };
    });

    transaction.oncomplete = () => {
      resolve();
    };

    transaction.onerror = (event: Event) => {
      reject(event);
    };
  });
}

export async function getItem(id: string): Promise<IOCRItem> {
  const gotDB = await getDB();
  return new Promise((resolve, reject) => {
    const transaction = gotDB.transaction([STORE_NAME], 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.get(id);

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onerror = (event: Event) => {
      reject(event);
    };
  });
}

export async function updateItem(id: string, data: IOCRItem): Promise<void> {
  return addItem(id, data);
}

export async function deleteItem(id: string): Promise<void> {
  const gotDB = await getDB();
  return new Promise((resolve, reject) => {
    const transaction = gotDB.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.delete(id);

    request.onsuccess = () => {
      resolve();
    };

    request.onerror = (event: Event) => {
      reject(event);
    };
  });
}

export async function getAllItems(): Promise<Array<IOCRItemFromIndexedDB>> {
  const gotDB = await getDB();
  return new Promise((resolve, reject) => {
    const transaction = gotDB.transaction([STORE_NAME], 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.getAll();

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onerror = (event: Event) => {
      reject(event);
    };
  });
}

export async function clearAllItems(): Promise<void> {
  const gotDB = await getDB();
  return new Promise((resolve, reject) => {
    const transaction = gotDB.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.clear();

    request.onsuccess = () => {
      resolve();
    };

    request.onerror = (event: Event) => {
      reject(event);
    };
  });
}

export async function updateAndDeleteOldItems(maxAgeInMinutes: number): Promise<void> {
  const gotDB = await getDB();
  return new Promise((resolve, reject) => {
    const transaction = gotDB.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.openCursor();

    request.onsuccess = (event: Event) => {
      const cursor = (event.target as IDBRequest).result;
      if (cursor) {
        const item = cursor.value;
        const now = getTimestampNow();
        const itemAge = now - item.data.timestamp;
        const maxAgeInTimestamp = maxAgeInMinutes * 60;

        if (itemAge > maxAgeInTimestamp) {
          cursor.delete();
        } else {
          item.data.lastUpdated = now;
          cursor.update(item);
        }
        cursor.continue();
      } else {
        resolve();
      }
    };

    request.onerror = (event: Event) => {
      reject(event);
    };
  });
}
