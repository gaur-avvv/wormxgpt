import { IModelProvider, ProviderConnectionResult } from './types';
import { AppSettings, Message, StreamChunk } from '../../types';
import { groqService } from '../groq';

export const groqProvider: IModelProvider = {
  id: 'groq',
  name: 'Groq Cloud (Ultra LPU)',
  description: 'Ultra-fast LPU inference hosting Llama 3.3, DeepSeek R1 Distill, and Mixtral',
  requiresApiKey: false, // has free tier or key
  apiKeyField: 'groqApiKey',
  docsUrl: 'https://console.groq.com/keys',
  models: [
    {
      id: 'llama-3.3-70b-versatile',
      label: 'Llama 3.3 70B Versatile',
      contextWindow: 128000,
      tags: ['fast', 'code', 'long-context'],
      isFree: true,
      description: 'Ultra-fast 70B general purpose powerhouse running at 300+ tps'
    },
    {
      id: 'deepseek-r1-distill-llama-70b',
      label: 'DeepSeek R1 Distill Llama 70B (Groq)',
      contextWindow: 128000,
      tags: ['reasoning', 'fast', 'code'],
      isFree: true,
      description: 'Deep reasoning model running on lightning-fast LPU silicon'
    },
    {
      id: 'llama-3.2-11b-vision-preview',
      label: 'Llama 3.2 11B Vision',
      contextWindow: 128000,
      tags: ['vision', 'fast'],
      isFree: true,
      description: 'Llama multimodal vision processor on LPU speed'
    },
    {
      id: 'llama-3.1-8b-instant',
      label: 'Llama 3.1 8B Instant',
      contextWindow: 128000,
      tags: ['fast', 'free'],
      isFree: true,
      description: 'Sub-second latency lightweight model (800+ tokens/sec)'
    },
    {
      id: 'llama-3.2-3b-preview',
      label: 'Llama 3.2 3B Preview',
      contextWindow: 128000,
      tags: ['fast', 'free'],
      isFree: true,
      description: 'Compact ultra-light edge-tier model'
    },
    {
      id: 'llama-3.2-1b-preview',
      label: 'Llama 3.2 1B Preview',
      contextWindow: 128000,
      tags: ['fast', 'free'],
      isFree: true,
      description: 'Fastest available text generation model'
    },
    {
      id: 'mixtral-8x7b-32768',
      label: 'Mixtral 8x7B Instruct',
      contextWindow: 32768,
      tags: ['fast', 'code'],
      isFree: true,
      description: 'High performance sparse mixture-of-experts model'
    },
    {
      id: 'gemma2-9b-it',
      label: 'Gemma 2 9B Instruct',
      contextWindow: 8192,
      tags: ['fast', 'code'],
      isFree: true,
      description: 'Google open weights model optimized for low-latency coding'
    }
  ],
  async testConnection(settings: AppSettings): Promise<ProviderConnectionResult> {
    const key = settings.groqApiKey || process.env.GROQ_API_KEY || '';
    if (!key) {
      return { success: false, message: 'Groq API key required for full rate limits (free key from console.groq.com)' };
    }
    const start = Date.now();
    try {
      const valid = await groqService.verifyApiKey(key);
      const latency = Date.now() - start;
      if (valid) {
        return { success: true, message: `Connected to Groq LPU (${latency}ms)`, latencyMs: latency, modelsCount: 8 };
      }
      return { success: false, message: 'Groq verification failed. Please verify API key.' };
    } catch (err: any) {
      return { success: false, message: err?.message || 'Connection test failed' };
    }
  },
  async *streamChat(settings: AppSettings, messages: Message[], signal?: AbortSignal): AsyncGenerator<StreamChunk> {
    yield* groqService.streamChat(settings, messages, signal);
  }
};
