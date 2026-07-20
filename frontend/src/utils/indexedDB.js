const DB_BASE_NAME = 'genz-whatsapp';
const DB_VERSION = 1;

// Get user-specific database name to ensure data isolation between accounts
const getDBName = () => {
  try {
    const user = JSON.parse(localStorage.getItem('user') || 'null');
    if (user?._id) {
      return `${DB_BASE_NAME}-user-${user._id}`;
    }
  } catch (e) {
    console.warn('[IndexedDB] Failed to get user for DB name:', e);
  }
  return DB_BASE_NAME;
};

const STORES = {
  chats: 'chats',
  messages: 'messages',
  contacts: 'contacts',
  settings: 'settings',
  offlineMessages: 'offlineMessages',
  subscriptions: 'subscriptions',
  notifications: 'notifications'
};

// Open IndexedDB
const openDB = () => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(getDBName(), DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;

      // Create object stores if they don't exist
      if (!db.objectStoreNames.contains(STORES.chats)) {
        db.createObjectStore(STORES.chats, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(STORES.messages)) {
        db.createObjectStore(STORES.messages, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(STORES.contacts)) {
        db.createObjectStore(STORES.contacts, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(STORES.settings)) {
        db.createObjectStore(STORES.settings, { keyPath: 'key' });
      }
      if (!db.objectStoreNames.contains(STORES.offlineMessages)) {
        db.createObjectStore(STORES.offlineMessages, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(STORES.subscriptions)) {
        db.createObjectStore(STORES.subscriptions, { keyPath: 'deviceId' });
      }
      if (!db.objectStoreNames.contains(STORES.notifications)) {
        db.createObjectStore(STORES.notifications, { keyPath: 'id' });
      }
    };
  });
};

// Generic CRUD operations
const addItem = async (storeName, item) => {
  try {
    const db = await openDB();
    const transaction = db.transaction(storeName, 'readwrite');
    const store = transaction.objectStore(storeName);
    const request = store.add(item);

    return new Promise((resolve, reject) => {
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error('Error adding item to IndexedDB:', error);
    throw error;
  }
};

const getItem = async (storeName, key) => {
  try {
    const db = await openDB();
    const transaction = db.transaction(storeName, 'readonly');
    const store = transaction.objectStore(storeName);
    const request = store.get(key);

    return new Promise((resolve, reject) => {
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error('Error getting item from IndexedDB:', error);
    throw error;
  }
};

const getAllItems = async (storeName) => {
  try {
    const db = await openDB();
    const transaction = db.transaction(storeName, 'readonly');
    const store = transaction.objectStore(storeName);
    const request = store.getAll();

    return new Promise((resolve, reject) => {
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error('Error getting all items from IndexedDB:', error);
    throw error;
  }
};

const updateItem = async (storeName, item) => {
  try {
    const db = await openDB();
    const transaction = db.transaction(storeName, 'readwrite');
    const store = transaction.objectStore(storeName);
    const request = store.put(item);

    return new Promise((resolve, reject) => {
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error('Error updating item in IndexedDB:', error);
    throw error;
  }
};

const deleteItem = async (storeName, key) => {
  try {
    const db = await openDB();
    const transaction = db.transaction(storeName, 'readwrite');
    const store = transaction.objectStore(storeName);
    const request = store.delete(key);

    return new Promise((resolve, reject) => {
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error('Error deleting item from IndexedDB:', error);
    throw error;
  }
};

const clearStore = async (storeName) => {
  try {
    const db = await openDB();
    const transaction = db.transaction(storeName, 'readwrite');
    const store = transaction.objectStore(storeName);
    const request = store.clear();

    return new Promise((resolve, reject) => {
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error('Error clearing store in IndexedDB:', error);
    throw error;
  }
};

// Specific operations for different stores
export const db = {
  // Chats
  saveChat: (chat) => addItem(STORES.chats, chat),
  getChat: (id) => getItem(STORES.chats, id),
  getAllChats: () => getAllItems(STORES.chats),
  updateChat: (chat) => updateItem(STORES.chats, chat),
  deleteChat: (id) => deleteItem(STORES.chats, id),
  
  // Messages
  saveMessage: (message) => addItem(STORES.messages, message),
  getMessage: (id) => getItem(STORES.messages, id),
  getAllMessages: () => getAllItems(STORES.messages),
  updateMessage: (message) => updateItem(STORES.messages, message),
  deleteMessage: (id) => deleteItem(STORES.messages, id),
  clearMessages: () => clearStore(STORES.messages),
  
  // Contacts
  saveContact: (contact) => addItem(STORES.contacts, contact),
  getContact: (id) => getItem(STORES.contacts, id),
  getAllContacts: () => getAllItems(STORES.contacts),
  updateContact: (contact) => updateItem(STORES.contacts, contact),
  deleteContact: (id) => deleteItem(STORES.contacts, id),
  
  // Settings
  saveSetting: (key, value) => addItem(STORES.settings, { key, value }),
  getSetting: (key) => getItem(STORES.settings, key).then(result => result?.value),
  getAllSettings: () => getAllItems(STORES.settings),
  deleteSetting: (key) => deleteItem(STORES.settings, key),
  
  // Offline Messages
  saveOfflineMessage: (message) => addItem(STORES.offlineMessages, message),
  getOfflineMessage: (id) => getItem(STORES.offlineMessages, id),
  getAllOfflineMessages: () => getAllItems(STORES.offlineMessages),
  deleteOfflineMessage: (id) => deleteItem(STORES.offlineMessages, id),
  clearOfflineMessages: () => clearStore(STORES.offlineMessages),
  
  // Subscriptions
  saveSubscription: (subscription) => addItem(STORES.subscriptions, subscription),
  getSubscription: (deviceId) => getItem(STORES.subscriptions, deviceId),
  updateSubscription: (subscription) => updateItem(STORES.subscriptions, subscription),
  deleteSubscription: (deviceId) => deleteItem(STORES.subscriptions, deviceId),
  
  // Notifications
  saveNotification: (notification) => addItem(STORES.notifications, notification),
  getNotification: (id) => getItem(STORES.notifications, id),
  getAllNotifications: () => getAllItems(STORES.notifications),
  deleteNotification: (id) => deleteItem(STORES.notifications, id),
  clearNotifications: () => clearStore(STORES.notifications),
  
  // Utility
  clearAll: async () => {
    await Promise.all([
      clearStore(STORES.chats),
      clearStore(STORES.messages),
      clearStore(STORES.contacts),
      clearStore(STORES.offlineMessages),
      clearStore(STORES.notifications)
    ]);
  },

  // Delete the entire user-specific database
  deleteDatabase: async () => {
    try {
      const dbName = getDBName();
      await new Promise((resolve, reject) => {
        const request = indexedDB.deleteDatabase(dbName);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
        request.onblocked = () => {
          console.warn('[IndexedDB] Database delete blocked, closing connections...');
          resolve();
        };
      });
      console.log('[IndexedDB] Deleted user-specific database:', dbName);
    } catch (err) {
      console.error('[IndexedDB] Failed to delete database:', err);
    }
  },

  // Delete all user-specific databases (for account switching)
  deleteAllUserDatabases: async () => {
    try {
      const databases = await indexedDB.databases();
      const userDBs = databases
        .map(db => db.name)
        .filter(name => name.startsWith(DB_BASE_NAME) && name !== DB_BASE_NAME);
      
      for (const dbName of userDBs) {
        await new Promise((resolve, reject) => {
          const request = indexedDB.deleteDatabase(dbName);
          request.onsuccess = () => resolve();
          request.onerror = () => reject(request.error);
          request.onblocked = () => resolve();
        });
        console.log('[IndexedDB] Deleted user database:', dbName);
      }
    } catch (err) {
      console.error('[IndexedDB] Failed to delete all user databases:', err);
    }
  }
};

export default db;
