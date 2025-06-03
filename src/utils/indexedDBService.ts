import { ChatSession } from '../components/ChatHistorySidebar'; // Adjust path as needed

const DB_NAME = 'PastemaxChatDB';
const STORE_NAME = 'chatSessionsStore';
const DB_VERSION = 1;

interface PastemaxDB extends IDBDatabase {
  // This interface can be extended if needed, but usually not necessary for basic ops
}

let dbPromise: Promise<PastemaxDB> | null = null;

const openDB = (): Promise<PastemaxDB> => {
  if (dbPromise) {
    return dbPromise;
  }

  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result as PastemaxDB;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        console.log(`[IndexedDB] Object store "${STORE_NAME}" created.`);
      }
    };

    request.onsuccess = (event) => {
      const db = (event.target as IDBOpenDBRequest).result as PastemaxDB;
      console.log('[IndexedDB] Database opened successfully.');
      resolve(db);
    };

    request.onerror = (event) => {
      console.error('[IndexedDB] Error opening database:', (event.target as IDBOpenDBRequest).error);
      dbPromise = null; // Reset promise on error
      reject((event.target as IDBOpenDBRequest).error);
    };

    request.onblocked = (event) => {
      // This event is fired when another tab has an open connection to the same database
      // and the version number has changed.
      console.warn('[IndexedDB] Database open request blocked. Please close other tabs with this app open.', event);
      // Potentially, you could try to close existing connections or notify the user more aggressively.
      // For now, just logging.
      dbPromise = null; // Reset promise
      reject(new Error('IndexedDB open request blocked.'));
    };
  });
  return dbPromise;
};

export const saveChatSession = async (session: ChatSession): Promise<void> => {
  try {
    const db = await openDB();
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    store.put(session);

    return new Promise((resolve, reject) => {
      transaction.oncomplete = () => {
        console.log(`[IndexedDB] Session ${session.id} saved successfully.`);
        resolve();
      };
      transaction.onerror = (event) => {
        console.error('[IndexedDB] Error saving session:', (event.target as IDBTransaction).error);
        reject((event.target as IDBTransaction).error);
      };
    });
  } catch (error) {
    console.error('[IndexedDB] Failed to open DB for saving session:', error);
    // Rethrow or handle as appropriate for your app's error strategy
    throw error;
  }
};

export const getAllChatSessions = async (): Promise<ChatSession[]> => {
  try {
    const db = await openDB();
    const transaction = db.transaction(STORE_NAME, 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.getAll();

    return new Promise((resolve, reject) => {
      request.onsuccess = (event) => {
        const sessions = (event.target as IDBRequest<ChatSession[]>).result || [];
        console.log(`[IndexedDB] Fetched ${sessions.length} sessions.`);
        // Sort by lastUpdated descending, like localStorage version might have implicitly done by prepending
        sessions.sort((a, b) => b.lastUpdated - a.lastUpdated);
        resolve(sessions);
      };
      request.onerror = (event) => {
        console.error('[IndexedDB] Error fetching all sessions:', (event.target as IDBRequest).error);
        reject((event.target as IDBRequest).error);
      };
    });
  } catch (error) {
    console.error('[IndexedDB] Failed to open DB for fetching all sessions:', error);
    throw error;
  }
};

export const getChatSession = async (sessionId: string): Promise<ChatSession | undefined> => {
  try {
    const db = await openDB();
    const transaction = db.transaction(STORE_NAME, 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.get(sessionId);

    return new Promise((resolve, reject) => {
      request.onsuccess = (event) => {
        const session = (event.target as IDBRequest<ChatSession | undefined>).result;
        console.log(`[IndexedDB] Fetched session ${sessionId}:`, session ? 'found' : 'not found');
        resolve(session);
      };
      request.onerror = (event) => {
        console.error(`[IndexedDB] Error fetching session ${sessionId}:`, (event.target as IDBRequest).error);
        reject((event.target as IDBRequest).error);
      };
    });
  } catch (error) {
    console.error(`[IndexedDB] Failed to open DB for fetching session ${sessionId}:`, error);
    throw error;
  }
};

export const deleteChatSession = async (sessionId: string): Promise<void> => {
  try {
    const db = await openDB();
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    store.delete(sessionId);

    return new Promise((resolve, reject) => {
      transaction.oncomplete = () => {
        console.log(`[IndexedDB] Session ${sessionId} deleted successfully.`);
        resolve();
      };
      transaction.onerror = (event) => {
        console.error('[IndexedDB] Error deleting session:', (event.target as IDBTransaction).error);
        reject((event.target as IDBTransaction).error);
      };
    });
  } catch (error) {
    console.error('[IndexedDB] Failed to open DB for deleting session:', error);
    throw error;
  }
};

// Optional: A function to clear all chat sessions (for development/testing or user request)
export const clearAllChatSessions = async (): Promise<void> => {
  try {
    const db = await openDB();
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    store.clear(); // Clears all records in the store

    return new Promise((resolve, reject) => {
      transaction.oncomplete = () => {
        console.log('[IndexedDB] All chat sessions cleared successfully.');
        resolve();
      };
      transaction.onerror = (event) => {
        console.error('[IndexedDB] Error clearing all chat sessions:', (event.target as IDBTransaction).error);
        reject((event.target as IDBTransaction).error);
      };
    });
  } catch (error) {
    console.error('[IndexedDB] Failed to open DB for clearing all sessions:', error);
    throw error;
  }
};
