import { AppSettings, Message, ProviderType, StreamChunk, ProviderHealthStats } from '../types';
import { FALLBACK_CHAIN, FREE_MODEL_DEFAULTS, FREE_PROVIDERS } from '../constants';

// ── Provider Service Interface ───────────────────────────────────────────────
export interface ProviderService {
  streamChat(settings: AppSettings, messages: Message[], signal?: AbortSignal): AsyncGenerator<StreamChunk>;
  verifyApiKey?(key: string): Promise<boolean>;
  setApiKey?(key: string): void;
}

// ── Health Tracking ──────────────────────────────────────────────────────────
interface HealthEntry {
  totalCalls: number;
  successCalls: number;
  failedCalls: number;
  totalLatencyMs: number;
  lastLatencyMs: number;
  lastError?: string;
  lastErrorAt?: number;
  consecutiveFailures: number;
}

// ── Provider Router ──────────────────────────────────────────────────────────
export class ProviderRouter {
  private services: Map<string, ProviderService> = new Map();
  private health: Map<string, HealthEntry> = new Map();
  private _initialized = false;

  /** Register a provider service */
  register(provider: ProviderType, service: ProviderService): void {
    this.services.set(provider, service);
    if (!this.health.has(provider)) {
      this.health.set(provider, {
        totalCalls: 0, successCalls: 0, failedCalls: 0,
        totalLatencyMs: 0, lastLatencyMs: 0, consecutiveFailures: 0
      });
    }
  }

  /** Get a registered service */
  getService(provider: ProviderType): ProviderService | undefined {
    return this.services.get(provider);
  }

  /** Get all registered provider names */
  getRegisteredProviders(): ProviderType[] {
    return Array.from(this.services.keys()) as ProviderType[];
  }

  /** Check if a provider requires an API key (not free) */
  requiresApiKey(provider: ProviderType): boolean {
    return !FREE_PROVIDERS.includes(provider);
  }

  /** Get the API key field name for a provider */
  getApiKeyField(provider: ProviderType): keyof AppSettings | null {
    const map: Partial<Record<ProviderType, keyof AppSettings>> = {
      gemini: 'geminiApiKey', groq: 'groqApiKey', pollinations: 'pollinationsApiKey',
      cerebras: 'cerebrasApiKey', siliconflow: 'siliconFlowApiKey', together: 'togetherApiKey',
      openrouter: 'openRouterApiKey', openai: 'openaiApiKey', anthropic: 'anthropicApiKey',
      deepseek: 'deepseekApiKey', mistral: 'mistralApiKey', perplexity: 'perplexityApiKey',
      xai: 'xaiApiKey', moonshot: 'moonshotApiKey', ollama: 'ollamaApiKey',
      cohere: 'cohereApiKey', wisgate: 'wisGateApiKey', nvidia: 'nvidiaApiKey',
      fireworks: 'fireworksApiKey', sambanova: 'sambanovaApiKey', hyperbolic: 'hyperbolicApiKey',
      huggingface: 'huggingfaceApiKey', deepinfra: 'deepinfraApiKey', novita: 'novitaApiKey',
      featherless: 'featherlessApiKey', lambdaai: 'lambdaaiApiKey', nebius: 'nebiusApiKey',
      tinyfish: 'tinyfishApiKey',
    };
    return map[provider] || null;
  }

  /** Check if a provider has a valid API key configured */
  hasApiKey(provider: ProviderType, settings: AppSettings): boolean {
    if (!this.requiresApiKey(provider)) return true;
    const field = this.getApiKeyField(provider);
    if (!field) return false;
    return !!(settings as any)[field];
  }

  /** Get available free providers that are currently healthy */
  getAvailableFreeProviders(): ProviderType[] {
    return FALLBACK_CHAIN.filter(p => {
      const h = this.health.get(p);
      return !h || h.consecutiveFailures < 5;
    });
  }

  /** Auto-select the best free model for a provider */
  getBestFreeModel(provider: ProviderType): string {
    return FREE_MODEL_DEFAULTS[provider] || '';
  }

  /** Get health stats for all providers */
  getHealthStats(): ProviderHealthStats[] {
    return Array.from(this.health.entries()).map(([provider, h]) => ({
      provider: provider as ProviderType,
      totalCalls: h.totalCalls,
      successCalls: h.successCalls,
      failedCalls: h.failedCalls,
      avgLatencyMs: h.totalCalls > 0 ? Math.round(h.totalLatencyMs / h.totalCalls) : 0,
      lastLatencyMs: h.lastLatencyMs,
      lastError: h.lastError,
      lastErrorAt: h.lastErrorAt,
      isHealthy: h.consecutiveFailures < 3,
      isFree: FREE_PROVIDERS.includes(provider as ProviderType),
    }));
  }

  /** Get health for a specific provider */
  getProviderHealth(provider: ProviderType): HealthEntry | undefined {
    return this.health.get(provider);
  }

  /** Record a successful call */
  private recordSuccess(provider: string, latencyMs: number): void {
    const h = this.health.get(provider) || {
      totalCalls: 0, successCalls: 0, failedCalls: 0,
      totalLatencyMs: 0, lastLatencyMs: 0, consecutiveFailures: 0
    };
    h.totalCalls++;
    h.successCalls++;
    h.totalLatencyMs += latencyMs;
    h.lastLatencyMs = latencyMs;
    h.consecutiveFailures = 0;
    this.health.set(provider, h);
  }

  /** Record a failed call */
  private recordFailure(provider: string, error: string): void {
    const h = this.health.get(provider) || {
      totalCalls: 0, successCalls: 0, failedCalls: 0,
      totalLatencyMs: 0, lastLatencyMs: 0, consecutiveFailures: 0
    };
    h.totalCalls++;
    h.failedCalls++;
    h.consecutiveFailures++;
    h.lastError = error;
    h.lastErrorAt = Date.now();
    this.health.set(provider, h);
  }

  /**
   * Stream chat with automatic fallback on failure.
   * Tries the selected provider first, then falls back through the chain.
   */
  async *streamWithFallback(
    settings: AppSettings,
    messages: Message[],
    signal?: AbortSignal
  ): AsyncGenerator<StreamChunk> {
    const primaryProvider = settings.aiProvider || 'pollinations';
    const autoFallback = settings.autoFallback ?? true;

    // Build the fallback chain: primary first, then configured/default chain
    const chain: { provider: ProviderType; model: string }[] = [
      { provider: primaryProvider, model: settings.model }
    ];

    if (autoFallback) {
      const userChain = settings.fallbackChain || FALLBACK_CHAIN;
      for (const p of userChain) {
        if (p !== primaryProvider && this.services.has(p)) {
          // Only add if we have an API key or it's free
          if (this.hasApiKey(p, settings)) {
            chain.push({ provider: p, model: this.getBestFreeModel(p) || settings.model });
          }
        }
      }
    }

    let lastError: Error | null = null;

    for (let i = 0; i < chain.length; i++) {
      const { provider, model } = chain[i];
      const service = this.services.get(provider);
      if (!service) continue;

      if (signal?.aborted) return;

      // If this is a fallback attempt, yield a status message
      if (i > 0) {
        yield {
          text: `⚡ Auto-fallback: Switching to ${provider} (${model})...\n\n`,
          images: []
        };
      }

      const start = Date.now();
      try {
        // Create settings override for fallback provider
        const effectiveSettings: AppSettings = i === 0 ? settings : {
          ...settings,
          aiProvider: provider,
          model: model,
        };

        let hasYielded = false;
        for await (const chunk of service.streamChat(effectiveSettings, messages, signal)) {
          hasYielded = true;
          yield chunk;
        }

        // If we got here without error, record success
        this.recordSuccess(provider, Date.now() - start);
        return; // Success — don't try next provider

      } catch (error: any) {
        const errMsg = error?.message || 'Unknown error';
        this.recordFailure(provider, errMsg);
        lastError = error;

        console.warn(`[ProviderRouter] ${provider} failed: ${errMsg}`);

        // Don't fallback for user-abort
        if (error?.name === 'AbortError' || signal?.aborted) return;

        // If no more fallbacks, throw
        if (i === chain.length - 1) {
          yield {
            text: `[SYSTEM ERROR] All providers failed.\n\nLast error (${provider}): ${errMsg}\n\nTried: ${chain.map(c => c.provider).join(' → ')}`,
            images: []
          };
          return;
        }
      }
    }
  }

  /**
   * Stream chat without fallback — direct to the specified provider.
   */
  async *streamDirect(
    settings: AppSettings,
    messages: Message[],
    signal?: AbortSignal
  ): AsyncGenerator<StreamChunk> {
    const provider = settings.aiProvider || 'pollinations';
    const service = this.services.get(provider);
    if (!service) {
      yield { text: `[ERROR] Provider '${provider}' is not registered.`, images: [] };
      return;
    }

    const start = Date.now();
    try {
      for await (const chunk of service.streamChat(settings, messages, signal)) {
        yield chunk;
      }
      this.recordSuccess(provider, Date.now() - start);
    } catch (error: any) {
      this.recordFailure(provider, error?.message || 'Unknown');
      throw error;
    }
  }
}

// ── Singleton Instance ───────────────────────────────────────────────────────
export const providerRouter = new ProviderRouter();

/**
 * Initialize the router with all available services.
 * Called once on app startup.
 */
export async function initializeProviderRouter(): Promise<void> {
  // Lazy import to avoid circular dependencies
  const services = await import('./index');
  
  providerRouter.register('gemini', services.geminiService);
  providerRouter.register('groq', services.groqService);
  providerRouter.register('pollinations', services.pollinationsService);
  providerRouter.register('openai', services.openaiService);
  providerRouter.register('anthropic', services.anthropicService);
  providerRouter.register('deepseek', services.deepseekService);
  providerRouter.register('mistral', services.mistralService);
  providerRouter.register('perplexity', services.perplexityService);
  providerRouter.register('xai', services.xaiService);
  providerRouter.register('together', services.togetherService);
  providerRouter.register('openrouter', services.openrouterService);
  providerRouter.register('cerebras', services.cerebrasService);
  providerRouter.register('siliconflow', services.siliconflowService);
  providerRouter.register('moonshot', services.moonshotService);
  providerRouter.register('ollama', services.ollamaService);
  providerRouter.register('tinyfish', services.tinyfishService);

  // New providers — all now available
  providerRouter.register('cohere', services.cohereService);
  providerRouter.register('nvidia', services.nvidiaService);
  providerRouter.register('fireworks', services.fireworksService);
  providerRouter.register('sambanova', services.sambanovaService);
  providerRouter.register('hyperbolic', services.hyperbolicService);
  providerRouter.register('huggingface', services.huggingfaceService);
  providerRouter.register('deepinfra', services.deepinfraService);
  providerRouter.register('novita', services.novitaService);
  providerRouter.register('featherless', services.featherlessService);
  providerRouter.register('lambdaai', services.lambdaaiService);
  providerRouter.register('nebius', services.nebiusService);
  providerRouter.register('wisgate', services.wisGateService);
}
