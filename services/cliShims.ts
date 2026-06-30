import fs from 'fs';
import path from 'path';
import os from 'os';

// ── Persistent Directory setup ───────────────────────────────────────────────
const dir = path.join(os.homedir(), '.wormgpt');
if (!fs.existsSync(dir)) {
  fs.mkdirSync(dir, { recursive: true });
}

// ── 1. localStorage shim ─────────────────────────────────────────────────────
const lsPath = path.join(dir, 'localstorage.json');
let lsData: Record<string, string> = {};
try {
  if (fs.existsSync(lsPath)) {
    lsData = JSON.parse(fs.readFileSync(lsPath, 'utf8'));
  }
} catch (_) {}

function saveLocalStorage() {
  try {
    fs.writeFileSync(lsPath, JSON.stringify(lsData, null, 2), 'utf8');
  } catch (_) {}
}

const localStorageMock = {
  getItem(key: string): string | null {
    return lsData[key] ?? null;
  },
  setItem(key: string, value: string): void {
    lsData[key] = String(value);
    saveLocalStorage();
  },
  removeItem(key: string): void {
    delete lsData[key];
    saveLocalStorage();
  },
  clear(): void {
    lsData = {};
    saveLocalStorage();
  },
  get length(): number {
    return Object.keys(lsData).length;
  },
  key(index: number): string | null {
    return Object.keys(lsData)[index] ?? null;
  }
};

// ── 2. indexedDB shim ────────────────────────────────────────────────────────
class MockIDBRequest {
  onsuccess: any = null;
  onerror: any = null;
  result: any = null;
  error: any = null;
  fireSuccess(result: any) {
    this.result = result;
    if (typeof this.onsuccess === 'function') {
      this.onsuccess({ target: this });
    }
  }
}

class MockIDBTransaction {
  db: any;
  mode: string;
  storeName: string;
  oncomplete: any = null;
  onerror: any = null;
  error: any = null;

  constructor(db: any, storeName: string, mode: string) {
    this.db = db;
    this.storeName = storeName;
    this.mode = mode;
  }

  objectStore(name: string) {
    return {
      put: (value: any, key?: any) => {
        const req = new MockIDBRequest();
        setTimeout(() => {
          this.db.data[name] = this.db.data[name] || {};
          const k = key || value.id;
          this.db.data[name][k] = value;
          this.db.save();
          req.fireSuccess(k);
          if (typeof this.oncomplete === 'function') this.oncomplete();
        }, 0);
        return req;
      },
      get: (key: any) => {
        const req = new MockIDBRequest();
        setTimeout(() => {
          const val = this.db.data[name]?.[key];
          req.fireSuccess(val);
        }, 0);
        return req;
      },
      getAll: () => {
        const req = new MockIDBRequest();
        setTimeout(() => {
          const list = Object.values(this.db.data[name] || {});
          req.fireSuccess(list);
        }, 0);
        return req;
      },
      delete: (key: any) => {
        const req = new MockIDBRequest();
        setTimeout(() => {
          if (this.db.data[name]) delete this.db.data[name][key];
          this.db.save();
          req.fireSuccess(undefined);
          if (typeof this.oncomplete === 'function') this.oncomplete();
        }, 0);
        return req;
      },
      clear: () => {
        const req = new MockIDBRequest();
        setTimeout(() => {
          this.db.data[name] = {};
          this.db.save();
          req.fireSuccess(undefined);
          if (typeof this.oncomplete === 'function') this.oncomplete();
        }, 0);
        return req;
      }
    };
  }
}

class MockIDBDatabase {
  objectStoreNames = {
    contains: (name: string) => true
  };
  data: Record<string, Record<string, any>> = {};
  dbPath: string;

  constructor() {
    this.dbPath = path.join(dir, 'indexeddb_sessions.json');
    try {
      if (fs.existsSync(this.dbPath)) {
        this.data = JSON.parse(fs.readFileSync(this.dbPath, 'utf8'));
      }
    } catch (_) {}
  }

  save() {
    try {
      fs.writeFileSync(this.dbPath, JSON.stringify(this.data, null, 2), 'utf8');
    } catch (_) {}
  }

  transaction(storeName: string, mode: string) {
    return new MockIDBTransaction(this, storeName, mode);
  }

  close() {}
}

const indexedDBMock = {
  open(name: string, version: number) {
    const req = new MockIDBRequest();
    setTimeout(() => {
      const db = new MockIDBDatabase();
      req.fireSuccess(db);
    }, 0);
    return req;
  }
};

// ── 3. Inject into global namespace ──────────────────────────────────────────
Object.defineProperty(globalThis, 'window', { value: globalThis, configurable: true, writable: true });
Object.defineProperty(globalThis, 'localStorage', { value: localStorageMock, configurable: true, writable: true });
Object.defineProperty(globalThis, 'indexedDB', { value: indexedDBMock, configurable: true, writable: true });
Object.defineProperty(globalThis, 'navigator', { value: { userAgent: 'Mozilla/5.0 (WormGPT-CLI/1.0)' }, configurable: true, writable: true });
Object.defineProperty(globalThis, 'location', {
  value: { hostname: 'localhost', origin: 'http://localhost' },
  configurable: true,
  writable: true
});

// Mock Document to silence React / Vite style injector warnings
Object.defineProperty(globalThis, 'document', {
  value: {
    createElement: () => ({
      setAttribute: () => {},
      appendChild: () => {},
    }),
    head: {
      appendChild: () => {}
    },
    getElementById: () => null
  },
  configurable: true,
  writable: true
});
