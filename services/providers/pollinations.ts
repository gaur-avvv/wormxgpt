import { IModelProvider, ProviderConnectionResult } from './types';
import { AppSettings, Message, StreamChunk } from '../../types';
import { pollinationsService } from '../pollinations';

export const pollinationsProvider: IModelProvider = {
  id: 'pollinations',
  name: 'Pollinations AI (Free Network)',
  description: 'Completely free multi-model gateway with zero API key requirement',
  requiresApiKey: false,
  docsUrl: 'https://pollinations.ai',
  models: [
    {
      id: 'openai',
      label: 'Pollinations GPT-4o Mini (Free)',
      contextWindow: 32000,
      tags: ['free', 'fast', 'vision'],
      isFree: true,
      description: 'Free accessible GPT-4o mini pipeline'
    },
    {
      id: 'mistral',
      label: 'Pollinations Mistral Large (Free)',
      contextWindow: 32000,
      tags: ['free', 'fast', 'code'],
      isFree: true,
      description: 'Free open inference via Mistral architecture'
    },
    {
      id: 'deepseek',
      label: 'Pollinations DeepSeek R1 (Free)',
      contextWindow: 32000,
      tags: ['free', 'reasoning', 'code'],
      isFree: true,
      description: 'Free DeepSeek open reasoning model'
    },
    {
      id: 'qwen-coder',
      label: 'Pollinations Qwen 2.5 Coder (Free)',
      contextWindow: 32000,
      tags: ['free', 'code', 'fast'],
      isFree: true,
      description: 'High performance code and script assistant'
    },
    {
      id: 'claude-hybrid',
      label: 'Pollinations Claude Hybrid (Free)',
      contextWindow: 32000,
      tags: ['free', 'reasoning', 'vision'],
      isFree: true,
      description: 'Free reasoning bridge with vision capabilities'
    },
    {
      id: 'llama',
      label: 'Pollinations Llama 3.3 70B (Free)',
      contextWindow: 32000,
      tags: ['free', 'fast', 'code'],
      isFree: true,
      description: 'Free open-weights Meta flagship model'
    },
    {
      id: 'flux',
      label: 'Pollinations Flux (Image Gen)',
      contextWindow: 8000,
      tags: ['free', 'vision'],
      isFree: true,
      description: 'Free high-resolution image and visual synthesis model'
    }
  ],
  async testConnection(_settings: AppSettings): Promise<ProviderConnectionResult> {
    const start = Date.now();
    try {
      const valid = await pollinationsService.verifyApiKey('free');
      const latency = Date.now() - start;
      if (valid) {
        return { success: true, message: `Connected to Pollinations Free Gateway (${latency}ms)`, latencyMs: latency, modelsCount: 7 };
      }
      return { success: true, message: `Pollinations Gateway reachable (${latency}ms)`, latencyMs: latency, modelsCount: 7 };
    } catch (err: any) {
      return { success: false, message: err?.message || 'Connection test failed' };
    }
  },
  async *streamChat(settings: AppSettings, messages: Message[], signal?: AbortSignal): AsyncGenerator<StreamChunk> {
    yield* pollinationsService.streamChat(settings, messages, signal);
  }
};
