import { IModelProvider, ProviderConnectionResult } from './types';
import { AppSettings, Message, StreamChunk } from '../../types';
import { mistralService } from '../mistral';

export const mistralProvider: IModelProvider = {
  id: 'mistral',
  name: 'Mistral AI',
  description: 'European open-weight and flagship reasoning models',
  requiresApiKey: true,
  apiKeyField: 'mistralApiKey',
  docsUrl: 'https://console.mistral.ai',
  models: [
    {
      id: 'mistral-large-latest',
      label: 'Mistral Large 2 (Latest)',
      contextWindow: 128000,
      tags: ['reasoning', 'code', 'long-context'],
      description: 'Top-tier reasoning, mathematics, and multilingual flagship model'
    },
    {
      id: 'codestral-latest',
      label: 'Codestral 25.01 (256k Context)',
      contextWindow: 256000,
      tags: ['code', 'fast', 'long-context'],
      description: 'Specialized 256k context code generation and repo refactoring model'
    },
    {
      id: 'pixtral-large-latest',
      label: 'Pixtral Large (Vision)',
      contextWindow: 128000,
      tags: ['vision', 'long-context', 'reasoning'],
      description: 'Multimodal vision, chart analysis, and document understanding'
    },
    {
      id: 'pixtral-12b',
      label: 'Pixtral 12B (Fast Vision)',
      contextWindow: 128000,
      tags: ['vision', 'fast'],
      description: 'Lightweight multimodal model for image inspection'
    },
    {
      id: 'mistral-small-latest',
      label: 'Mistral Small 3',
      contextWindow: 32000,
      tags: ['fast', 'code'],
      description: 'Cost-efficient and low-latency instruction model'
    },
    {
      id: 'open-mistral-nemo',
      label: 'Mistral NeMo 12B',
      contextWindow: 128000,
      tags: ['fast', 'long-context', 'code'],
      description: 'NVIDIA-collaborated 128k context multilingual model'
    },
    {
      id: 'ministral-8b-latest',
      label: 'Ministral 8B',
      contextWindow: 128000,
      tags: ['fast', 'code'],
      description: 'State-of-the-art edge model for on-device reasoning'
    }
  ],
  async testConnection(settings: AppSettings): Promise<ProviderConnectionResult> {
    const key = settings.mistralApiKey;
    if (!key) {
      return { success: false, message: 'Mistral API key is missing' };
    }
    const start = Date.now();
    try {
      const valid = await mistralService.verifyApiKey(key);
      const latency = Date.now() - start;
      if (valid) {
        return { success: true, message: `Connected to Mistral AI (${latency}ms)`, latencyMs: latency, modelsCount: 7 };
      }
      return { success: false, message: 'Invalid Mistral API Key' };
    } catch (err: any) {
      return { success: false, message: err?.message || 'Connection test failed' };
    }
  },
  async *streamChat(settings: AppSettings, messages: Message[], signal?: AbortSignal): AsyncGenerator<StreamChunk> {
    yield* mistralService.streamChat(settings, messages, signal);
  }
};
