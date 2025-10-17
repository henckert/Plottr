/**
 * Cache Storage Manager
 * Handles IndexedDB for offline data persistence and request caching
 */

const DB_NAME = 'plottr-cache';
const DB_VERSION = 1;

export interface CacheEntry<T> {
  key: string;
  data: T;
  timestamp: number;
  ttl?: number; // Time to live in milliseconds
}

export interface RequestLog {
  id: string;
  method: string;
  url: string;
  body?: unknown;
  timestamp: number;
  status: 'pending' | 'failed' | 'success';
}

class CacheManager {
  private db: IDBDatabase | null = null;
  private initialized = false;

  async init(): Promise<void> {
    if (this.initialized && this.db) return;

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => {
        console.error('IndexedDB open failed');
        reject(request.error);
      };

      request.onsuccess = () => {
        this.db = request.result;
        this.initialized = true;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Create stores if they don't exist
        if (!db.objectStoreNames.contains('venues')) {
          db.createObjectStore('venues', { keyPath: 'key' });
        }
        if (!db.objectStoreNames.contains('pitches')) {
          db.createObjectStore('pitches', { keyPath: 'key' });
        }
        if (!db.objectStoreNames.contains('sessions')) {
          db.createObjectStore('sessions', { keyPath: 'key' });
        }
        if (!db.objectStoreNames.contains('requests')) {
          db.createObjectStore('requests', { keyPath: 'id' });
        }
      };
    });
  }

  async set<T>(storeName: string, key: string, data: T, ttl?: number): Promise<void> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([storeName], 'readwrite');
      const store = transaction.objectStore(storeName);
      const entry: CacheEntry<T> = {
        key,
        data,
        timestamp: Date.now(),
        ttl,
      };

      const request = store.put(entry);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }

  async get<T>(storeName: string, key: string): Promise<T | null> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([storeName], 'readonly');
      const store = transaction.objectStore(storeName);
      const request = store.get(key);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const entry = request.result as CacheEntry<T> | undefined;
        if (!entry) {
          resolve(null);
          return;
        }

        // Check TTL
        if (entry.ttl && Date.now() - entry.timestamp > entry.ttl) {
          store.delete(key); // Delete expired entry
          resolve(null);
          return;
        }

        resolve(entry.data);
      };
    });
  }

  async getAll<T>(storeName: string): Promise<T[]> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([storeName], 'readonly');
      const store = transaction.objectStore(storeName);
      const request = store.getAll();

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const entries = request.result as CacheEntry<T>[];
        // Filter out expired entries
        const now = Date.now();
        const valid = entries
          .filter((entry) => !entry.ttl || now - entry.timestamp <= entry.ttl)
          .map((entry) => entry.data);

        resolve(valid);
      };
    });
  }

  async delete(storeName: string, key: string): Promise<void> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([storeName], 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.delete(key);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }

  async clear(storeName: string): Promise<void> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([storeName], 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.clear();

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }

  async logRequest(
    method: string,
    url: string,
    body?: unknown,
    status: 'pending' | 'failed' | 'success' = 'pending'
  ): Promise<string> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const id = `${Date.now()}-${Math.random()}`;
      const transaction = this.db!.transaction(['requests'], 'readwrite');
      const store = transaction.objectStore('requests');
      const log: RequestLog = {
        id,
        method,
        url,
        body,
        timestamp: Date.now(),
        status,
      };

      const request = store.put(log);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(id);
    });
  }

  async getPendingRequests(): Promise<RequestLog[]> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['requests'], 'readonly');
      const store = transaction.objectStore('requests');
      const request = store.getAll();

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const logs = request.result as RequestLog[];
        const pending = logs.filter((log) => log.status === 'pending');
        resolve(pending);
      };
    });
  }

  async updateRequestStatus(id: string, status: 'pending' | 'failed' | 'success'): Promise<void> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['requests'], 'readwrite');
      const store = transaction.objectStore('requests');
      const getRequest = store.get(id);

      getRequest.onerror = () => reject(getRequest.error);
      getRequest.onsuccess = () => {
        const log = getRequest.result as RequestLog;
        if (!log) return;

        log.status = status;
        const putRequest = store.put(log);
        putRequest.onerror = () => reject(putRequest.error);
        putRequest.onsuccess = () => resolve();
      };
    });
  }
}

export const cacheManager = new CacheManager();
