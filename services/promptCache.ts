// ── Prompt Caching Service ────────────────────────────────────────────────────
// Provides intelligent caching of LLM prompt/response pairs to reduce
// redundant API calls, lower latency, and save tokens/costs.
// Works alongside the existing CacheService but specifically optimized
// for prompt-level deduplication and system instruction caching.

const PROMPT_CACHE_PREFIX = 'xgpt:prompt:';
const DEFAULT_PROMPT_TTL = 3600; // 1 hour
const MAX_PROMPT_CACHE_SIZE = 100;
const SYSTEM_INSTRUCTION_CACHE_TTL = 7200; // 2 hours for system prompts

export interface PromptCacheEntry {
  response: string;
  model: string;
  timestamp: number;
  ttl: number;
  hits: number;
  tokensSaved: number;
  images?: string[];
}

export interface PromptCacheStats {
  hits: number;
  misses: number;
  totalTokensSaved: number;
  cacheSize: number;
  hitRate: number;
  enabled: boolean;
}

class PromptCacheService {
  private cache: Map<string, PromptCacheEntry> = new Map();
  private systemInstructionHashes: Map<string, string> = new Map();
  private _enabled = false;
  private _ttl = DEFAULT_PROMPT_TTL;
  private stats = { hits: 0, misses: 0, totalTokensSaved: 0 };

  get enabled(): boolean {
    return this._enabled;
  }

  set enabled(val: boolean) {
    this._enabled = val;
    if (!val) {
      // Keep cache data but stop serving from it
      console.log('[PromptCache] Disabled');
    } else {
      console.log('[PromptCache] Enabled');
    }
  }

  get ttl(): number {
    return this._ttl;
  }

  set ttl(val: number) {
    this._ttl = Math.max(60, Math.min(val, 86400)); // 1 min to 24 hours
  }

  /**
   * Generate a deterministic cache key from prompt content + model + settings
   */
  private generateKey(
    model: string,
    prompt: string,
    systemInstruction: string,
    temperature: number,
    maxTokens: number,
    conversationContext?: string
  ): string {
    // Use a fast hash combining all relevant parameters
    // Hash the full system instruction separately to avoid collisions from truncation
    const sysHash = this.hashSystemInstruction(systemInstruction);
    const contextPart = conversationContext ? `|${this.hashSystemInstruction(conversationContext)}` : '';
    const raw = `${model}|${temperature}|${maxTokens}|${sysHash}|${prompt}${contextPart}`;
    let hash = 0;
    for (let i = 0; i < raw.length; i++) {
      const chr = raw.charCodeAt(i);
      hash = ((hash << 5) - hash) + chr;
      hash |= 0;
    }
    return `${PROMPT_CACHE_PREFIX}${Math.abs(hash).toString(36)}`;
  }

  /**
   * Generate a hash for system instruction to detect changes
   */
  private hashSystemInstruction(instruction: string): string {
    let hash = 0;
    for (let i = 0; i < instruction.length; i++) {
      const chr = instruction.charCodeAt(i);
      hash = ((hash << 5) - hash) + chr;
      hash |= 0;
    }
    return Math.abs(hash).toString(36);
  }

  /**
   * Estimate tokens in a string (rough approximation: ~4 chars per token)
   */
  private estimateTokens(text: string): number {
    return Math.ceil(text.length / 4);
  }

  /**
   * Look up a cached response for the given prompt parameters
   */
  lookup(
    model: string,
    prompt: string,
    systemInstruction: string,
    temperature: number,
    maxTokens: number,
    conversationContext?: string
  ): PromptCacheEntry | null {
    if (!this._enabled) return null;

    // Don't cache if temperature > 0 (non-deterministic outputs)
    // Allow small temperatures for near-deterministic behavior
    if (temperature > 0.1) {
      this.stats.misses++;
      return null;
    }

    const key = this.generateKey(model, prompt, systemInstruction, temperature, maxTokens, conversationContext);
    const entry = this.cache.get(key);

    if (!entry) {
      this.stats.misses++;
      return null;
    }

    // Check TTL
    const age = (Date.now() - entry.timestamp) / 1000;
    if (age > entry.ttl) {
      this.cache.delete(key);
      this.stats.misses++;
      return null;
    }

    // Cache hit
    entry.hits++;
    this.stats.hits++;
    this.stats.totalTokensSaved += this.estimateTokens(entry.response);
    console.log(`[PromptCache] HIT for ${model} (saved ~${this.estimateTokens(entry.response)} tokens)`);
    return entry;
  }

  /**
   * Store a prompt/response pair in the cache
   */
  store(
    model: string,
    prompt: string,
    systemInstruction: string,
    temperature: number,
    maxTokens: number,
    response: string,
    images?: string[],
    conversationContext?: string
  ): void {
    if (!this._enabled) return;

    // Don't cache non-deterministic responses
    if (temperature > 0.1) return;

    // Don't cache very short or error responses
    if (response.length < 10 || response.startsWith('[SYSTEM ERROR]')) return;

    const key = this.generateKey(model, prompt, systemInstruction, temperature, maxTokens, conversationContext);

    // Evict oldest entries if cache is full
    if (this.cache.size >= MAX_PROMPT_CACHE_SIZE && !this.cache.has(key)) {
      const oldestKey = this.cache.keys().next().value;
      if (oldestKey) this.cache.delete(oldestKey);
    }

    this.cache.set(key, {
      response,
      model,
      timestamp: Date.now(),
      ttl: this._ttl,
      hits: 0,
      tokensSaved: 0,
      images,
    });
  }

  /**
   * Check if system instruction has changed (useful for detecting when
   * cached context should be invalidated)
   */
  hasSystemInstructionChanged(model: string, instruction: string): boolean {
    const hash = this.hashSystemInstruction(instruction);
    const prevHash = this.systemInstructionHashes.get(model);
    this.systemInstructionHashes.set(model, hash);
    return prevHash !== undefined && prevHash !== hash;
  }

  /**
   * Get a cached system instruction hash for a model
   * This can be used to implement Gemini's context caching feature
   */
  getSystemInstructionHash(model: string): string | undefined {
    return this.systemInstructionHashes.get(model);
  }

  /**
   * Get cache statistics
   */
  getStats(): PromptCacheStats {
    const total = this.stats.hits + this.stats.misses;
    return {
      hits: this.stats.hits,
      misses: this.stats.misses,
      totalTokensSaved: this.stats.totalTokensSaved,
      cacheSize: this.cache.size,
      hitRate: total > 0 ? Math.round((this.stats.hits / total) * 100) : 0,
      enabled: this._enabled,
    };
  }

  /**
   * Clear the entire prompt cache
   */
  clear(): void {
    this.cache.clear();
    this.systemInstructionHashes.clear();
    this.stats = { hits: 0, misses: 0, totalTokensSaved: 0 };
    console.log('[PromptCache] Cache cleared');
  }

  /**
   * Clear cache entries for a specific model
   */
  clearModel(model: string): void {
    for (const [key, entry] of this.cache.entries()) {
      if (entry.model === model) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Invalidate entries older than the specified age (in seconds)
   */
  evictExpired(): number {
    const now = Date.now();
    let evicted = 0;
    for (const [key, entry] of this.cache.entries()) {
      if ((now - entry.timestamp) / 1000 > entry.ttl) {
        this.cache.delete(key);
        evicted++;
      }
    }
    if (evicted > 0) {
      console.log(`[PromptCache] Evicted ${evicted} expired entries`);
    }
    return evicted;
  }

  /**
   * Persist cache to localStorage for cross-session reuse
   */
  persist(): void {
    try {
      const entries: Array<[string, PromptCacheEntry]> = [];
      for (const [key, entry] of this.cache.entries()) {
        // Only persist entries that aren't expired
        const age = (Date.now() - entry.timestamp) / 1000;
        if (age < entry.ttl) {
          entries.push([key, { ...entry, images: undefined }]); // Don't persist images
        }
      }
      // Only store up to 50 most recent entries
      const toStore = entries.slice(-50);
      localStorage.setItem('xgpt_prompt_cache', JSON.stringify(toStore));
    } catch {
      // localStorage might be full
    }
  }

  /**
   * Restore cache from localStorage
   */
  restore(): void {
    try {
      const stored = localStorage.getItem('xgpt_prompt_cache');
      if (!stored) return;

      const entries: Array<[string, PromptCacheEntry]> = JSON.parse(stored);
      const now = Date.now();
      let restored = 0;

      for (const [key, entry] of entries) {
        const age = (now - entry.timestamp) / 1000;
        if (age < entry.ttl) {
          this.cache.set(key, entry);
          restored++;
        }
      }

      if (restored > 0) {
        console.log(`[PromptCache] Restored ${restored} entries from localStorage`);
      }
    } catch {
      // Ignore parse errors
    }
  }
}

export const promptCacheService = new PromptCacheService();
