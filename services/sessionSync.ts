// WebSocket-based Session Synchronization Service
// Provides real-time session sync across tabs using BroadcastChannel
// with WebSocket-like event patterns for session chat management

export interface SessionSyncEvent {
  type: 'session_update' | 'session_delete' | 'session_switch' | 'settings_update' | 'message_new' | 'heartbeat';
  sessionId?: string;
  data?: unknown;
  timestamp: number;
  sourceTabId: string;
}

type SyncEventHandler = (event: SessionSyncEvent) => void;

class SessionSyncService {
  private channel: BroadcastChannel | null = null;
  private tabId: string;
  private handlers: Map<string, Set<SyncEventHandler>> = new Map();
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null;
  private saveDebounceTimers: Map<string, ReturnType<typeof setTimeout>> = new Map();
  private pendingSaveData: Map<string, unknown> = new Map();
  private isActive = false;

  constructor() {
    this.tabId = `tab_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  }

  /**
   * Initialize the sync service — creates BroadcastChannel for cross-tab communication
   */
  initialize(): void {
    if (this.isActive) return;

    try {
      this.channel = new BroadcastChannel('xgpt_session_sync');
      this.channel.onmessage = (event: MessageEvent<SessionSyncEvent>) => {
        // Don't process own messages
        if (event.data.sourceTabId === this.tabId) return;
        this.dispatchEvent(event.data);
      };

      this.channel.onmessageerror = () => {
        console.warn('[SessionSync] Message deserialization error');
      };

      // Start heartbeat to detect other active tabs
      this.heartbeatTimer = setInterval(() => {
        this.broadcast({
          type: 'heartbeat',
          timestamp: Date.now(),
          sourceTabId: this.tabId,
        });
      }, 30000);

      this.isActive = true;
      console.log('[SessionSync] Initialized with tab ID:', this.tabId);
    } catch (e) {
      console.warn('[SessionSync] BroadcastChannel not supported, sync disabled');
    }
  }

  /**
   * Register an event handler
   */
  on(eventType: SessionSyncEvent['type'], handler: SyncEventHandler): () => void {
    if (!this.handlers.has(eventType)) {
      this.handlers.set(eventType, new Set());
    }
    this.handlers.get(eventType)!.add(handler);

    return () => {
      this.handlers.get(eventType)?.delete(handler);
    };
  }

  /**
   * Broadcast a session update to other tabs
   */
  broadcastSessionUpdate(sessionId: string, data: unknown): void {
    this.broadcast({
      type: 'session_update',
      sessionId,
      data,
      timestamp: Date.now(),
      sourceTabId: this.tabId,
    });
  }

  /**
   * Broadcast a session deletion to other tabs
   */
  broadcastSessionDelete(sessionId: string): void {
    this.broadcast({
      type: 'session_delete',
      sessionId,
      timestamp: Date.now(),
      sourceTabId: this.tabId,
    });
  }

  /**
   * Broadcast active session switch to other tabs
   */
  broadcastSessionSwitch(sessionId: string): void {
    this.broadcast({
      type: 'session_switch',
      sessionId,
      timestamp: Date.now(),
      sourceTabId: this.tabId,
    });
  }

  /**
   * Broadcast settings update
   */
  broadcastSettingsUpdate(data: unknown): void {
    this.broadcast({
      type: 'settings_update',
      data,
      timestamp: Date.now(),
      sourceTabId: this.tabId,
    });
  }

  /**
   * Broadcast new message
   */
  broadcastNewMessage(sessionId: string, message: unknown): void {
    this.broadcast({
      type: 'message_new',
      sessionId,
      data: message,
      timestamp: Date.now(),
      sourceTabId: this.tabId,
    });
  }

  /**
   * Debounced save — prevents excessive localStorage writes during rapid updates
   */
  debouncedSave(key: string, data: unknown, delay = 500): void {
    const existingTimer = this.saveDebounceTimers.get(key);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }

    // Track pending data so we can flush on cleanup
    this.pendingSaveData.set(key, data);

    const timer = setTimeout(() => {
      this.flushKey(key);
    }, delay);

    this.saveDebounceTimers.set(key, timer);
  }

  /**
   * Immediately flush a pending save for a specific key
   */
  private flushKey(key: string): void {
    const data = this.pendingSaveData.get(key);
    if (data === undefined) return;

    try {
      localStorage.setItem(key, JSON.stringify(data));
    } catch (e) {
      console.error('[SessionSync] Failed to save to localStorage:', e);
      if (e instanceof DOMException && e.name === 'QuotaExceededError') {
        this.handleQuotaExceeded(key, data);
      }
    }
    this.pendingSaveData.delete(key);
    this.saveDebounceTimers.delete(key);
  }

  /**
   * Handle localStorage quota exceeded by trimming old data
   */
  private handleQuotaExceeded(key: string, data: unknown): void {
    if (key.includes('sessions') && Array.isArray(data)) {
      // Keep only the last 20 sessions
      const trimmed = data.slice(-20);
      try {
        localStorage.setItem(key, JSON.stringify(trimmed));
        console.warn('[SessionSync] Trimmed sessions due to storage quota');
      } catch (_e) {
        // If still failing, keep only last 5
        const minimal = data.slice(-5);
        localStorage.setItem(key, JSON.stringify(minimal));
      }
    }
  }

  private broadcast(event: SessionSyncEvent): void {
    if (this.channel && this.isActive) {
      try {
        this.channel.postMessage(event);
      } catch (e) {
        console.warn('[SessionSync] Failed to broadcast:', e);
      }
    }
  }

  private dispatchEvent(event: SessionSyncEvent): void {
    const handlers = this.handlers.get(event.type);
    if (handlers) {
      handlers.forEach(handler => {
        try {
          handler(event);
        } catch (e) {
          console.error('[SessionSync] Handler error:', e);
        }
      });
    }
  }

  /**
   * Cleanup resources
   */
  cleanup(): void {
    this.isActive = false;

    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }

    // Flush all pending saves before clearing timers to prevent data loss
    for (const [key, timer] of this.saveDebounceTimers.entries()) {
      clearTimeout(timer);
      this.flushKey(key);
    }
    this.saveDebounceTimers.clear();
    this.pendingSaveData.clear();

    if (this.channel) {
      this.channel.close();
      this.channel = null;
    }

    this.handlers.clear();
  }
}

export const sessionSync = new SessionSyncService();
