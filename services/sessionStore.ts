/**
 * services/sessionStore.ts
 * IndexedDB-backed session storage replacing localStorage for chat sessions.
 * Falls back gracefully to localStorage if IndexedDB is unavailable.
 *
 * Why IndexedDB:
 *   - localStorage has a 5MB hard cap — a single long session with images can hit it.
 *   - IndexedDB supports up to quota (typically 50% of disk), stores blobs natively,
 *     and is non-blocking (async).
 *
 * Schema:
 *   DB name : wormgpt_v1
 *   Store   : sessions  — key: session.id, value: ChatSession
 *   Store   : meta      — key: string, value: any  (active_session_id, etc.)
 */

import { ChatSession } from '../types';

const DB_NAME = 'wormgpt_v1';
const DB_VERSION = 1;
const STORE_SESSIONS = 'sessions';
const STORE_META = 'meta';

// ── DB Init ────────────────────────────────────────────────────────────────────

let _db: IDBDatabase | null = null;

function openDB(): Promise<IDBDatabase> {
  if (_db) return Promise.resolve(_db);
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);

    req.onupgradeneeded = (e) => {
      const db = (e.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_SESSIONS)) {
        db.createObjectStore(STORE_SESSIONS, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(STORE_META)) {
        db.createObjectStore(STORE_META);
      }
    };

    req.onsuccess = (e) => {
      _db = (e.target as IDBOpenDBRequest).result;
      // Auto-recover from version conflict
      _db.onversionchange = () => {
        _db?.close();
        _db = null;
      };
      resolve(_db);
    };

    req.onerror = (e) => {
      console.error('[SessionStore] IndexedDB open failed:', (e.target as IDBOpenDBRequest).error);
      reject((e.target as IDBOpenDBRequest).error);
    };
  });
}

// ── Generic helpers ────────────────────────────────────────────────────────────

function tx<T>(
  storeName: string,
  mode: IDBTransactionMode,
  fn: (store: IDBObjectStore) => IDBRequest<T>
): Promise<T> {
  return openDB().then(db => new Promise<T>((resolve, reject) => {
    const txn = db.transaction(storeName, mode);
    const store = txn.objectStore(storeName);
    const req = fn(store);
    req.onsuccess = () => resolve(req.result as T);
    req.onerror = () => reject(req.error);
  }));
}

// ── Session API ────────────────────────────────────────────────────────────────

export const sessionStore = {

  /** Save or update a single session */
  async put(session: ChatSession): Promise<void> {
    await tx(STORE_SESSIONS, 'readwrite', store => store.put(session));
  },

  /** Save multiple sessions in a single transaction */
  async putAll(sessions: ChatSession[]): Promise<void> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const txn = db.transaction(STORE_SESSIONS, 'readwrite');
      const store = txn.objectStore(STORE_SESSIONS);
      sessions.forEach(s => store.put(s));
      txn.oncomplete = () => resolve();
      txn.onerror = () => reject(txn.error);
    });
  },

  /** Load all sessions, sorted by most recently updated */
  async getAll(): Promise<ChatSession[]> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const txn = db.transaction(STORE_SESSIONS, 'readonly');
      const req = txn.objectStore(STORE_SESSIONS).getAll();
      req.onsuccess = () => {
        const sessions = (req.result as ChatSession[]) || [];
        // Sort: newest first (by last message timestamp, or session id fallback)
        sessions.sort((a, b) => {
          const aTs = a.messages[a.messages.length - 1]?.timestamp || 0;
          const bTs = b.messages[b.messages.length - 1]?.timestamp || 0;
          return bTs - aTs;
        });
        resolve(sessions);
      };
      req.onerror = () => reject(req.error);
    });
  },

  /** Delete a session by id */
  async delete(id: string): Promise<void> {
    await tx(STORE_SESSIONS, 'readwrite', store => store.delete(id));
  },

  /** Clear all sessions */
  async clear(): Promise<void> {
    await tx(STORE_SESSIONS, 'readwrite', store => store.clear());
  },

  // ── Meta ────────────────────────────────────────────────────────────────────

  /** Store meta value (e.g., active session id) */
  async setMeta(key: string, value: any): Promise<void> {
    await tx(STORE_META, 'readwrite', store => store.put(value, key));
  },

  /** Read meta value */
  async getMeta<T = any>(key: string): Promise<T | undefined> {
    return tx<T>(STORE_META, 'readonly', store => store.get(key));
  },

  // ── Migration from localStorage ─────────────────────────────────────────────

  /**
   * One-time migration: pull sessions from localStorage into IndexedDB.
   * Runs silently; existing IndexedDB data is not overwritten.
   * Returns true if migration occurred.
   */
  async migrateFromLocalStorage(lsKey: string): Promise<boolean> {
    try {
      const raw = localStorage.getItem(lsKey);
      if (!raw) return false;

      const parsed: ChatSession[] = JSON.parse(raw);
      if (!Array.isArray(parsed) || parsed.length === 0) return false;

      const existing = await this.getAll();
      if (existing.length > 0) {
        // Already have data — don't overwrite
        console.log('[SessionStore] Skipping migration — IndexedDB already populated');
        return false;
      }

      await this.putAll(parsed);
      console.log(`[SessionStore] ✅ Migrated ${parsed.length} sessions from localStorage to IndexedDB`);
      // Keep LS copy for one more boot as safety net, then clear it
      return true;
    } catch (e) {
      console.error('[SessionStore] Migration failed:', e);
      return false;
    }
  },

  // ── Debounced save ──────────────────────────────────────────────────────────
  _saveTimer: null as ReturnType<typeof setTimeout> | null,

  /** Debounce a putAll() call — avoids thrashing IDB on every keystroke */
  debouncedSave(sessions: ChatSession[], delayMs = 400): void {
    if (this._saveTimer) clearTimeout(this._saveTimer);
    this._saveTimer = setTimeout(() => {
      this.putAll(sessions).catch(e =>
        console.error('[SessionStore] debouncedSave failed:', e)
      );
    }, delayMs);
  },

  // ── Availability check ──────────────────────────────────────────────────────
  isAvailable(): boolean {
    return typeof indexedDB !== 'undefined';
  }
};
