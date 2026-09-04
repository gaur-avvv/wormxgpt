/**
 * utils/deviceFingerprint.ts
 * Hardware-Anchored Device Fingerprinting & Local Cryptographic Storage Key Derivation
 * 
 * Provides deterministic client-side fingerprint generation and AES-GCM encryption
 * to isolate and securely store chat histories and custom API keys locally per device.
 */

import { AppSettings, ChatSession } from '../types';
import { sessionStore } from '../services/sessionStore';
import { SETTINGS_KEY, SESSIONS_KEY } from '../constants';

export interface DeviceSpecs {
  fingerprint: string;
  displayId: string;
  canvasHash: string;
  webglRenderer: string;
  screenResolution: string;
  cores: number;
  memoryGb?: number;
  timezone: string;
  platform: string;
  timestamp: number;
}

let cachedSpecs: DeviceSpecs | null = null;

/**
 * Generate a deterministic canvas baseline hash
 */
function getCanvasFingerprint(): string {
  try {
    const canvas = document.createElement('canvas');
    canvas.width = 240;
    canvas.height = 60;
    const ctx = canvas.getContext('2d');
    if (!ctx) return 'canvas_na';

    ctx.textBaseline = 'top';
    ctx.font = '14px "Inter", "Arial", sans-serif';
    ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = '#f60';
    ctx.fillRect(125, 1, 62, 20);
    ctx.fillStyle = '#069';
    ctx.fillText('WormGPT-Kernel-Device-FP', 2, 15);
    ctx.fillStyle = 'rgba(102, 204, 0, 0.7)';
    ctx.fillText('WormGPT-Kernel-Device-FP', 4, 17);

    const dataUrl = canvas.toDataURL();
    let hash = 0;
    for (let i = 0; i < dataUrl.length; i++) {
      hash = (hash << 5) - hash + dataUrl.charCodeAt(i);
      hash |= 0;
    }
    return Math.abs(hash).toString(16);
  } catch {
    return 'canvas_disabled';
  }
}

/**
 * Retrieve WebGL hardware renderer identifier
 */
function getWebGLRenderer(): string {
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    if (!gl) return 'webgl_unavailable';

    const debugInfo = (gl as any).getExtension('WEBGL_debug_renderer_info');
    if (debugInfo) {
      const vendor = (gl as any).getParameter(debugInfo.UNMASKED_VENDOR_WEBGL) || '';
      const renderer = (gl as any).getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) || '';
      return `${vendor} ~ ${renderer}`.trim();
    }
    return (gl as any).getParameter((gl as any).RENDERER) || 'generic_gpu';
  } catch {
    return 'webgl_sandboxed';
  }
}

/**
 * Compute SHA-256 hash using Web Crypto API
 */
async function sha256(str: string): Promise<string> {
  const buffer = new TextEncoder().encode(str);
  const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Generate full hardware-anchored device fingerprint
 */
export async function getDeviceFingerprint(): Promise<DeviceSpecs> {
  if (cachedSpecs) return cachedSpecs;

  const canvasHash = getCanvasFingerprint();
  const webglRenderer = getWebGLRenderer();
  const screenResolution = `${window.screen.width}x${window.screen.height}x${window.screen.colorDepth || 24}@${window.devicePixelRatio || 1}`;
  const cores = navigator.hardwareConcurrency || 4;
  const memoryGb = (navigator as any).deviceMemory || undefined;
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  const platform = navigator.platform || 'UnknownPlatform';
  const userAgent = navigator.userAgent || '';

  const rawSeed = [
    canvasHash,
    webglRenderer,
    screenResolution,
    cores,
    memoryGb || 'nomem',
    timezone,
    platform,
    userAgent
  ].join('|:::|');

  const fullHash = await sha256(rawSeed);
  const shortHex = fullHash.slice(0, 8).toUpperCase();
  const displayId = `WORM-FP-${shortHex}`;

  cachedSpecs = {
    fingerprint: fullHash,
    displayId,
    canvasHash,
    webglRenderer,
    screenResolution,
    cores,
    memoryGb,
    timezone,
    platform,
    timestamp: Date.now()
  };

  return cachedSpecs;
}

/**
 * Derive an AES-GCM 256-bit CryptoKey from device fingerprint + fixed salt
 */
async function deriveEncryptionKey(fingerprint: string): Promise<CryptoKey> {
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    enc.encode(fingerprint),
    { name: 'PBKDF2' },
    false,
    ['deriveKey']
  );

  const salt = enc.encode('wormgpt_device_storage_salt_v1');

  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt,
      iterations: 50000,
      hash: 'SHA-256'
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

/**
 * Encrypt payload object into an obfuscated AES-GCM payload string.
 *
 * Fails closed: if WebCrypto is unavailable or encryption fails, this throws
 * rather than returning plaintext. Callers must decide to skip persistence
 * instead of silently storing sensitive data (API keys, chat history) in the clear.
 */
export async function encryptLocalPayload(payload: any, fingerprint: string): Promise<string> {
  const key = await deriveEncryptionKey(fingerprint);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encodedData = new TextEncoder().encode(JSON.stringify(payload));

  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    encodedData
  );

  const combined = new Uint8Array(iv.length + encrypted.byteLength);
  combined.set(iv, 0);
  combined.set(new Uint8Array(encrypted), iv.length);

  let binary = '';
  const bytes = combined;
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

/**
 * Decrypt obfuscated AES-GCM payload string back to object
 */
export async function decryptLocalPayload(encryptedStr: string, fingerprint: string): Promise<any> {
  try {
    // If it's standard JSON plaintext, parse directly
    if (encryptedStr.startsWith('{') || encryptedStr.startsWith('[')) {
      return JSON.parse(encryptedStr);
    }

    const key = await deriveEncryptionKey(fingerprint);
    const binary = atob(encryptedStr);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }

    const iv = bytes.slice(0, 12);
    const data = bytes.slice(12);

    const decrypted = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      key,
      data
    );

    const decoded = new TextDecoder().decode(decrypted);
    return JSON.parse(decoded);
  } catch (err) {
    console.warn('[DeviceFP] Decryption failed or mismatched device key:', err);
    try {
      return JSON.parse(encryptedStr);
    } catch {
      return null;
    }
  }
}

/**
 * Save chat session history tied to device fingerprint
 */
export async function saveHistoryWithFingerprint(sessions: ChatSession[], fingerprint: string): Promise<void> {
  try {
    // 1. Save to IndexedDB (primary high-capacity storage)
    if (sessionStore.isAvailable()) {
      await sessionStore.putAll(sessions);
      await sessionStore.setMeta('device_fingerprint', fingerprint);
    }

    // 2. Save encrypted backup to localStorage under device-scoped key.
    //    Fail closed: if encryption is unavailable, skip the localStorage backup
    //    entirely rather than writing message content in plaintext.
    const scopedKey = `${SESSIONS_KEY}_${fingerprint.slice(0, 12)}`;
    try {
      const encrypted = await encryptLocalPayload(sessions, fingerprint);
      localStorage.setItem(scopedKey, encrypted);
    } catch (encErr) {
      console.warn('[DeviceFP] Skipping encrypted history backup (encryption unavailable):', encErr);
      localStorage.removeItem(scopedKey);
    }

    // 3. Store a redacted index (metadata only, no message content) under the
    //    standard SESSIONS_KEY so boot can render the session list synchronously.
    //    Full messages are restored asynchronously from IndexedDB / the encrypted backup.
    const redactedIndex = sessions.map(s => ({
      id: s.id,
      title: s.title,
      createdAt: s.createdAt,
      updatedAt: s.updatedAt,
      messages: [] as ChatSession['messages'],
    }));
    localStorage.setItem(SESSIONS_KEY, JSON.stringify(redactedIndex));
  } catch (e) {
    console.error('[DeviceFP] Failed to save history with fingerprint:', e);
  }
}

/**
 * Load chat session history tied to device fingerprint
 */
export async function loadHistoryWithFingerprint(fingerprint: string): Promise<ChatSession[]> {
  try {
    // 1. Try loading from IndexedDB first
    if (sessionStore.isAvailable()) {
      const idbSessions = await sessionStore.getAll();
      if (idbSessions && idbSessions.length > 0) {
        return idbSessions;
      }
    }

    // 2. Try loading from device-scoped key in localStorage
    const scopedKey = `${SESSIONS_KEY}_${fingerprint.slice(0, 12)}`;
    let raw = localStorage.getItem(scopedKey);
    if (raw) {
      const decrypted = await decryptLocalPayload(raw, fingerprint);
      if (Array.isArray(decrypted) && decrypted.length > 0) {
        if (sessionStore.isAvailable()) {
          sessionStore.putAll(decrypted).catch(() => {});
        }
        return decrypted;
      }
    }

    // 3. Fallback to standard key
    let standardRaw = localStorage.getItem(SESSIONS_KEY);
    if (standardRaw) {
      const decrypted = await decryptLocalPayload(standardRaw, fingerprint);
      if (Array.isArray(decrypted) && decrypted.length > 0) {
        return decrypted;
      }
    }
    return [];
  } catch (e) {
    console.error('[DeviceFP] Failed to load history with fingerprint:', e);
    return [];
  }
}

/**
 * Save application settings & sensitive API keys keyed by device fingerprint
 */
export async function saveSettingsWithFingerprint(settings: AppSettings, fingerprint: string): Promise<void> {
  try {
    // 1. Encrypted, device-scoped copy holds the full settings (including secrets).
    //    Fail closed: skip the backup if encryption is unavailable rather than
    //    persisting API keys in plaintext.
    const scopedKey = `${SETTINGS_KEY}_${fingerprint.slice(0, 12)}`;
    try {
      const encrypted = await encryptLocalPayload(settings, fingerprint);
      localStorage.setItem(scopedKey, encrypted);
    } catch (encErr) {
      console.warn('[DeviceFP] Skipping encrypted settings backup (encryption unavailable):', encErr);
      localStorage.removeItem(scopedKey);
    }

    // 2. Standard SETTINGS_KEY is plaintext for synchronous boot, so persist only
    //    the non-secret subset. Any *ApiKey* field is stripped and restored later
    //    from the encrypted device-scoped copy.
    const publicSettings: Record<string, any> = {};
    for (const [k, v] of Object.entries(settings)) {
      if (/apikey/i.test(k)) continue;
      publicSettings[k] = v;
    }
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(publicSettings));
  } catch (e) {
    console.error('[DeviceFP] Failed to save settings with fingerprint:', e);
  }
}

/**
 * Load application settings & sensitive API keys keyed by device fingerprint
 */
export async function loadSettingsWithFingerprint(fingerprint: string): Promise<AppSettings | null> {
  try {
    const scopedKey = `${SETTINGS_KEY}_${fingerprint.slice(0, 12)}`;
    let raw = localStorage.getItem(scopedKey);
    if (raw) {
      const decrypted = await decryptLocalPayload(raw, fingerprint);
      if (decrypted && typeof decrypted === 'object') {
        return decrypted as AppSettings;
      }
    }

    let standardRaw = localStorage.getItem(SETTINGS_KEY);
    if (standardRaw) {
      const decrypted = await decryptLocalPayload(standardRaw, fingerprint);
      if (decrypted && typeof decrypted === 'object') {
        return decrypted as AppSettings;
      }
    }
    return null;
  } catch (e) {
    console.error('[DeviceFP] Failed to load settings with fingerprint:', e);
    return null;
  }
}
