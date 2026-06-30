/**
 * cli/shims.ts — Browser API polyfills for Node.js
 * Must be imported FIRST before any other module.
 * Provides localStorage, indexedDB, window, document, navigator, location
 * backed by persistent JSON files under ~/.wormgpt/
 */
import fs from 'fs';
import path from 'path';
import os from 'os';

const DATA_DIR = path.join(os.homedir(), '.wormgpt');
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

// ── localStorage → ~/.wormgpt/localstorage.json ──────────────────────────────
const LS_PATH = path.join(DATA_DIR, 'localstorage.json');
let lsData: Record<string, string> = {};
try { if (fs.existsSync(LS_PATH)) lsData = JSON.parse(fs.readFileSync(LS_PATH, 'utf8')); } catch {}
const flushLS = () => { try { fs.writeFileSync(LS_PATH, JSON.stringify(lsData, null, 2)); } catch {} };

const localStorageShim = {
  getItem: (k: string) => lsData[k] ?? null,
  setItem: (k: string, v: string) => { lsData[k] = String(v); flushLS(); },
  removeItem: (k: string) => { delete lsData[k]; flushLS(); },
  clear: () => { lsData = {}; flushLS(); },
  get length() { return Object.keys(lsData).length; },
  key: (i: number) => Object.keys(lsData)[i] ?? null,
};

// ── indexedDB → minimal mock (sessionStore uses it, falls back gracefully) ───
const IDB_PATH = path.join(DATA_DIR, 'idb.json');
let idbData: Record<string, Record<string, any>> = {};
try { if (fs.existsSync(IDB_PATH)) idbData = JSON.parse(fs.readFileSync(IDB_PATH, 'utf8')); } catch {}
const flushIDB = () => { try { fs.writeFileSync(IDB_PATH, JSON.stringify(idbData, null, 2)); } catch {} };

class FakeReq { onsuccess: any = null; onerror: any = null; result: any; error: any;
  _fire(r: any) { this.result = r; if (this.onsuccess) this.onsuccess({ target: this }); }
}
class FakeTx {
  oncomplete: any = null; onerror: any = null; error: any;
  constructor(private store: string) {}
  objectStore(_n: string) {
    const s = this.store;
    return {
      put: (v: any, k?: any) => { const r = new FakeReq(); setTimeout(() => { idbData[s] = idbData[s] || {}; idbData[s][k || v.id] = v; flushIDB(); r._fire(k || v.id); if (this.oncomplete) this.oncomplete(); }, 0); return r; },
      get: (k: any) => { const r = new FakeReq(); setTimeout(() => r._fire(idbData[s]?.[k]), 0); return r; },
      getAll: () => { const r = new FakeReq(); setTimeout(() => r._fire(Object.values(idbData[s] || {})), 0); return r; },
      delete: (k: any) => { const r = new FakeReq(); setTimeout(() => { if (idbData[s]) delete idbData[s][k]; flushIDB(); r._fire(undefined); if (this.oncomplete) this.oncomplete(); }, 0); return r; },
      clear: () => { const r = new FakeReq(); setTimeout(() => { idbData[s] = {}; flushIDB(); r._fire(undefined); if (this.oncomplete) this.oncomplete(); }, 0); return r; },
    };
  }
}
class FakeDB {
  objectStoreNames = { contains: () => true };
  onversionchange: any;
  transaction(s: string, _m: string) { return new FakeTx(s); }
  close() {}
}
const indexedDBShim = {
  open(_n: string, _v: number) {
    const r: any = new FakeReq();
    r.onupgradeneeded = null;
    setTimeout(() => { const db = new FakeDB(); r.result = db; if (r.onsuccess) r.onsuccess({ target: r }); }, 0);
    return r;
  }
};

// ── Inject into globalThis (use defineProperty for read-only props) ──────────
const def = (k: string, v: any) => {
  try { Object.defineProperty(globalThis, k, { value: v, configurable: true, writable: true }); }
  catch { (globalThis as any)[k] = v; }
};

def('window', globalThis);
def('self', globalThis);
def('localStorage', localStorageShim);
def('sessionStorage', localStorageShim);
def('indexedDB', indexedDBShim);
def('navigator', { userAgent: 'WormGPT-CLI/3.0', language: 'en-US', languages: ['en-US'] });
def('location', { hostname: 'localhost', origin: 'http://localhost', href: 'http://localhost', protocol: 'http:', search: '', hash: '', pathname: '/' });
def('document', {
  createElement: () => ({ setAttribute: () => {}, appendChild: () => {}, style: {}, addEventListener: () => {} }),
  createTextNode: () => ({}),
  head: { appendChild: () => {}, removeChild: () => {} },
  body: { appendChild: () => {}, removeChild: () => {} },
  getElementById: () => null,
  querySelector: () => null,
  querySelectorAll: () => [],
  addEventListener: () => {},
  removeEventListener: () => {},
  dispatchEvent: () => true,
  documentElement: { style: {} },
  createEvent: () => ({ initEvent: () => {} }),
});
def('HTMLElement', class {});
def('customElements', { define: () => {}, get: () => undefined });
def('MutationObserver', class { observe() {} disconnect() {} });
def('ResizeObserver', class { observe() {} disconnect() {} });
def('IntersectionObserver', class { observe() {} disconnect() {} });
def('matchMedia', () => ({ matches: false, addListener: () => {}, removeListener: () => {}, addEventListener: () => {}, removeEventListener: () => {} }));
def('requestAnimationFrame', (cb: any) => setTimeout(cb, 16));
def('cancelAnimationFrame', clearTimeout);
def('getComputedStyle', () => new Proxy({}, { get: () => '' }));

// Suppress React/Vite warnings
if (typeof (globalThis as any).alert === 'undefined') def('alert', () => {});
if (typeof (globalThis as any).confirm === 'undefined') def('confirm', () => true);
if (typeof (globalThis as any).prompt === 'undefined') def('prompt', () => '');

export { DATA_DIR };
