// Native IndexedDB Wrapper for GENZ WhatsApp
import { hasStaleBlobUrl, messageHasStaleBlobUrl } from '../utils/blobUtils';
const DB_NAME = 'genz_whatsapp_db';
const DB_VERSION = 2;

let dbInstance = null;

export const initDB = () => {
  return new Promise((resolve, reject) => {
    if (dbInstance) return resolve(dbInstance);

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = (event) => reject(event.target.error);

    request.onsuccess = (event) => {
      dbInstance = event.target.result;
      resolve(dbInstance);
    };

    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      
      // Conversations Store
      if (!db.objectStoreNames.contains('conversations')) {
        db.createObjectStore('conversations', { keyPath: '_id' });
      }
      
      // Messages Store
      if (!db.objectStoreNames.contains('messages')) {
        const messageStore = db.createObjectStore('messages', { keyPath: '_id' });
        messageStore.createIndex('conversationId', 'conversationId', { unique: false });
        messageStore.createIndex('createdAt', 'createdAt', { unique: false });
      }
      
      // Contacts Store
      if (!db.objectStoreNames.contains('contacts')) {
        db.createObjectStore('contacts', { keyPath: '_id' });
      }
      
      // Settings Store (Key-Value)
      if (!db.objectStoreNames.contains('settings')) {
        db.createObjectStore('settings', { keyPath: 'key' });
      }

      // Offline Queue Store
      if (!db.objectStoreNames.contains('offline_queue')) {
        const queueStore = db.createObjectStore('offline_queue', { keyPath: 'id', autoIncrement: true });
        queueStore.createIndex('timestamp', 'timestamp', { unique: false });
      }
    };
  });
};

// Generic helper to perform transactions
const performTransaction = async (storeName, mode, callback) => {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, mode);
    const store = transaction.objectStore(storeName);
    
    let result;
    try {
      result = callback(store);
    } catch (err) {
      reject(err);
    }

    transaction.oncomplete = () => resolve(result ? result.result : undefined);
    transaction.onerror = (event) => reject(event.target.error);
  });
};

const deleteMessagesByIds = async (messageIds = []) => {
  if (!messageIds.length) return 0;

  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction('messages', 'readwrite');
    const store = transaction.objectStore('messages');

    messageIds.forEach((id) => store.delete(id));

    transaction.oncomplete = () => resolve(messageIds.length);
    transaction.onerror = (event) => reject(event.target.error);
  });
};

export const DB = {
  // --- Conversations ---
  getConversations: async () => {
    return performTransaction('conversations', 'readonly', (store) => store.getAll());
  },
  saveConversation: async (conv) => {
    return performTransaction('conversations', 'readwrite', (store) => store.put(conv));
  },
  deleteConversation: async (id) => {
    return performTransaction('conversations', 'readwrite', (store) => store.delete(id));
  },
  
  // --- Messages ---
  getMessages: async (conversationId) => {
    const db = await initDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction('messages', 'readonly');
      const store = transaction.objectStore('messages');
      const index = store.index('conversationId');
      const request = index.getAll(conversationId);
      
      request.onsuccess = () => {
        const messages = request.result || [];
        const staleMessages = messages.filter(messageHasStaleBlobUrl);
        if (staleMessages.length > 0) {
          deleteMessagesByIds(staleMessages.map((message) => message._id))
            .catch((error) => console.warn('Failed to prune stale blob messages:', error));
        }
        resolve(messages.filter((message) => !messageHasStaleBlobUrl(message)));
      };
      request.onerror = (e) => reject(e.target.error);
    });
  },
  saveMessage: async (msg) => {
    if (messageHasStaleBlobUrl(msg)) return undefined;
    return performTransaction('messages', 'readwrite', (store) => store.put(msg));
  },
  deleteMessages: deleteMessagesByIds,
  deleteMessagesForConversation: async (conversationId) => {
    if (!conversationId) return 0;
    const messages = await DB.getMessages(conversationId);
    return deleteMessagesByIds(messages.map((message) => message._id));
  },
  pruneStaleBlobMessages: async () => {
    const db = await initDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction('messages', 'readwrite');
      const store = transaction.objectStore('messages');
      const request = store.openCursor();
      let deletedCount = 0;

      request.onsuccess = (event) => {
        const cursor = event.target.result;
        if (!cursor) return;
        if (messageHasStaleBlobUrl(cursor.value)) {
          cursor.delete();
          deletedCount += 1;
        }
        cursor.continue();
      };

      transaction.oncomplete = () => resolve(deletedCount);
      transaction.onerror = (event) => reject(event.target.error);
    });
  },
  
  // --- Settings ---
  getSetting: async (key) => {
    const db = await initDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction('settings', 'readonly');
      const store = transaction.objectStore('settings');
      const request = store.get(key);
      request.onsuccess = () => resolve(request.result ? request.result.value : null);
      request.onerror = (e) => reject(e.target.error);
    });
  },
  saveSetting: async (key, value) => {
    return performTransaction('settings', 'readwrite', (store) => store.put({ key, value }));
  },
  
  // --- Offline Queue ---
  getOfflineQueue: async () => {
    return performTransaction('offline_queue', 'readonly', (store) => store.getAll());
  },
  enqueueAction: async (actionData) => {
    return performTransaction('offline_queue', 'readwrite', (store) => {
      actionData.timestamp = Date.now();
      return store.put(actionData);
    });
  },
  removeFromQueue: async (id) => {
    return performTransaction('offline_queue', 'readwrite', (store) => store.delete(id));
  },
  clearQueue: async () => {
    return performTransaction('offline_queue', 'readwrite', (store) => store.clear());
  },
  
  // --- Initialization ---
  initDefaultSettings: async () => {
    const existingMods = await DB.getSetting('mods');
    if (!existingMods) {
      await DB.saveSetting('mods', {
        antiDelete: true,
        antiDeleteStatus: true,
        hideLastSeen: true,
        ghostMode: false,
        autoReply: false,
        highResMedia: true,
        antiScreenshot: false,
        selfDestruct: false,
        customTheme: '#075e54',
        chatWallpaper: null,
        enableAppLock: false,
        hideReadReceipts: false,
        autoDownloadMedia: true,
        antiViewOnce: true,
        voiceEffect: 'none',
        debugEncryption: false,
        chatMusic: false
      });
    }
  }
};
