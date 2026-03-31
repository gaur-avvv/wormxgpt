// Redis-compatible caching service using Upstash Redis REST API
// Provides fast caching for AI responses, MCP tool results, and session data

const CACHE_PREFIX = 'xgpt:';
const DEFAULT_TTL = 3600; // 1 hour in seconds
const MAX_CACHE_SIZE = 50; // Max items in memory fallback cache

export interface CacheEntry<T = string> {
  data: T;
  timestamp: number;
  ttl: number;
  hits: number;
}

export interface CacheStats {
  hits: number;
  misses: number;
  size: number;
  provider: 'redis' | 'memory';
}

class CacheService {
  private redisUrl: string = '';
  private redisToken: string = '';
  private memoryCache: Map<string, CacheEntry> = new Map();
  private stats: CacheStats = { hits: 0, misses: 0, size: 0, provider: 'memory' };
  private initialized = false;

  /**
   * Initialize the cache with Upstash Redis credentials
   */
  configure(token: string, url?: string): void {
    this.redisToken = token;
    // Upstash REST API URL derived from token or explicit URL
    this.redisUrl = url || '';
    this.initialized = !!token;
    if (this.initialized) {
      this.stats.provider = 'redis';
      console.log('[Cache] Redis cache configured');
    }
  }

  get isConfigured(): boolean {
    return this.initialized;
  }

  getStats(): CacheStats {
    return { ...this.stats };
  }

  /**
   * Generate a deterministic cache key from inputs
   */
  private makeKey(namespace: string, ...parts: string[]): string {
    const raw = parts.join(':');
    // Simple hash for consistent key generation
    let hash = 0;
    for (let i = 0; i < raw.length; i++) {
      const chr = raw.charCodeAt(i);
      hash = ((hash << 5) - hash) + chr;
      hash |= 0;
    }
    return `${CACHE_PREFIX}${namespace}:${Math.abs(hash).toString(36)}`;
  }

  /**
   * Get a value from cache
   */
  async get<T = string>(namespace: string, ...keyParts: string[]): Promise<T | null> {
    const key = this.makeKey(namespace, ...keyParts);

    // Try Redis first
    if (this.initialized && this.redisToken) {
      try {
        const result = await this.redisGet(key);
        if (result !== null) {
          this.stats.hits++;
          // Also populate memory cache
          this.memorySet(key, result, DEFAULT_TTL);
          try {
            return JSON.parse(result) as T;
          } catch {
            return result as unknown as T;
          }
        }
      } catch (e) {
        console.warn('[Cache] Redis GET failed, falling back to memory:', e);
      }
    }

    // Fallback to memory cache
    const memEntry = this.memoryCache.get(key);
    if (memEntry && (Date.now() - memEntry.timestamp) < memEntry.ttl * 1000) {
      this.stats.hits++;
      memEntry.hits++;
      try {
        return JSON.parse(memEntry.data) as T;
      } catch {
        return memEntry.data as unknown as T;
      }
    }

    this.stats.misses++;
    return null;
  }

  /**
   * Set a value in cache
   */
  async set(namespace: string, keyParts: string[], value: unknown, ttl = DEFAULT_TTL): Promise<void> {
    const key = this.makeKey(namespace, ...keyParts);
    const serialized = typeof value === 'string' ? value : JSON.stringify(value);

    // Always set in memory cache
    this.memorySet(key, serialized, ttl);

    // Try Redis
    if (this.initialized && this.redisToken) {
      try {
        await this.redisSet(key, serialized, ttl);
      } catch (e) {
        console.warn('[Cache] Redis SET failed:', e);
      }
    }
  }

  /**
   * Delete a cached value
   */
  async delete(namespace: string, ...keyParts: string[]): Promise<void> {
    const key = this.makeKey(namespace, ...keyParts);
    this.memoryCache.delete(key);

    if (this.initialized && this.redisToken) {
      try {
        await this.redisDel(key);
      } catch (e) {
        console.warn('[Cache] Redis DEL failed:', e);
      }
    }
  }

  /**
   * Clear all cached values in a namespace
   */
  clearNamespace(namespace: string): void {
    const prefix = `${CACHE_PREFIX}${namespace}:`;
    for (const key of this.memoryCache.keys()) {
      if (key.startsWith(prefix)) {
        this.memoryCache.delete(key);
      }
    }
  }

  /**
   * Clear all caches
   */
  clearAll(): void {
    this.memoryCache.clear();
    this.stats = { ...this.stats, hits: 0, misses: 0, size: 0 };
  }

  // ── Cache helpers for specific use cases ──────────────────────────────────

  /**
   * Cache an AI response
   */
  async cacheResponse(model: string, prompt: string, response: string, ttl = 1800): Promise<void> {
    await this.set('ai_response', [model, prompt.slice(0, 200)], response, ttl);
  }

  /**
   * Get a cached AI response
   */
  async getCachedResponse(model: string, prompt: string): Promise<string | null> {
    return this.get<string>('ai_response', model, prompt.slice(0, 200));
  }

  /**
   * Cache MCP tool results
   */
  async cacheToolResult(toolName: string, args: string, result: string, ttl = 600): Promise<void> {
    await this.set('mcp_tool', [toolName, args.slice(0, 200)], result, ttl);
  }

  /**
   * Get cached MCP tool result
   */
  async getCachedToolResult(toolName: string, args: string): Promise<string | null> {
    return this.get<string>('mcp_tool', toolName, args.slice(0, 200));
  }

  /**
   * Cache session data for fast switching
   */
  async cacheSession(sessionId: string, data: unknown, ttl = 7200): Promise<void> {
    await this.set('session', [sessionId], data, ttl);
  }

  /**
   * Get cached session data
   */
  async getCachedSession<T = unknown>(sessionId: string): Promise<T | null> {
    return this.get<T>('session', sessionId);
  }

  // ── Redis REST API operations ─────────────────────────────────────────────

  private async redisGet(key: string): Promise<string | null> {
    const response = await fetch(`${this.redisUrl}/get/${encodeURIComponent(key)}`, {
      headers: { 'Authorization': `Bearer ${this.redisToken}` },
      signal: AbortSignal.timeout(5000),
    });

    if (!response.ok) return null;
    const data = await response.json();
    return data.result ?? null;
  }

  private async redisSet(key: string, value: string, ttl: number): Promise<void> {
    await fetch(`${this.redisUrl}/set/${encodeURIComponent(key)}/${encodeURIComponent(value)}/ex/${ttl}`, {
      headers: { 'Authorization': `Bearer ${this.redisToken}` },
      signal: AbortSignal.timeout(5000),
    });
  }

  private async redisDel(key: string): Promise<void> {
    await fetch(`${this.redisUrl}/del/${encodeURIComponent(key)}`, {
      headers: { 'Authorization': `Bearer ${this.redisToken}` },
      signal: AbortSignal.timeout(5000),
    });
  }

  // ── Memory cache operations ───────────────────────────────────────────────

  private memorySet(key: string, value: string, ttl: number): void {
    // Evict oldest entries if cache is full
    if (this.memoryCache.size >= MAX_CACHE_SIZE) {
      const oldestKey = this.memoryCache.keys().next().value;
      if (oldestKey) this.memoryCache.delete(oldestKey);
    }

    this.memoryCache.set(key, {
      data: value,
      timestamp: Date.now(),
      ttl,
      hits: 0,
    });
    this.stats.size = this.memoryCache.size;
  }
}

export const cacheService = new CacheService();
