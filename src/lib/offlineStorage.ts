import { openDB, IDBPDatabase } from 'idb';
import { MutationAction, QueuedMutation } from './syncQueue';

const DB_NAME = 'jelly_scoop_offline';
const STORE_NAME = 'mutations';
const DB_VERSION = 1;

let dbPromise: Promise<IDBPDatabase> | null = null;

function getDB() {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
          store.createIndex('timestamp', 'timestamp');
        }
      },
    });
  }
  return dbPromise;
}

export const offlineStorage = {
  async getAll(): Promise<QueuedMutation[]> {
    const db = await getDB();
    return db.getAllFromIndex(STORE_NAME, 'timestamp');
  },

  async save(mutation: QueuedMutation): Promise<void> {
    const db = await getDB();
    await db.put(STORE_NAME, mutation);
  },

  async remove(id: string): Promise<void> {
    const db = await getDB();
    await db.delete(STORE_NAME, id);
  },

  async clear(): Promise<void> {
    const db = await getDB();
    await db.clear(STORE_NAME);
  }
};
