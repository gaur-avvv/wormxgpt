import { IModelProvider, ProviderConnectionResult } from './types';
import { AppSettings, Message, StreamChunk } from '../../types';
import { deepseekService } from '../deepseek';

export const deepseekProvider: IModelProvider = {
  id: 'deepseek',
  name: 'DeepSeek (Frontier MoE)',
  description: 'Specialized mathematical reasoning, open-source intelligence, and coding',
  requiresApiKey: true,
  apiKeyField: 'deepseekApiKey',
  docsUrl: 'https://platform.deepseek.com',
  models: [
    {
      id: 'deepseek-reasoner',
      label: 'DeepSeek R1 (Reasoner 671B)',
      contextWindow: 64000,
      tags: ['reasoning', 'code', 'long-context'],
      description: 'Breakthrough chain-of-thought open reasoning frontier model'
    },
    {
      id: 'deepseek-chat',
      label: 'DeepSeek V3 (Chat & Code 671B)',
      contextWindow: 64000,
      tags: ['fast', 'code', 'long-context'],
      description: 'High-throughput 671B MoE multi-head latent attention model'
    },
    {
      id: 'deepseek-coder',
      label: 'DeepSeek Coder V2.5',
      contextWindow: 128000,
      tags: ['code', 'fast'],
      description: 'Specialized programming model with comprehensive repo context'
    },
    {
      id: 'deepseek-r1-distill-qwen-32b',
      label: 'DeepSeek R1 Distill Qwen 32B',
      contextWindow: 64000,
      tags: ['reasoning', 'fast', 'code'],
      description: 'Efficient dense reasoning distillation model'
    },
    {
      id: 'deepseek-r1-distill-llama-70b',
      label: 'DeepSeek R1 Distill Llama 70B',
      contextWindow: 64000,
      tags: ['reasoning', 'code'],
      description: 'Llama-architecture distilled reasoning powerhouse'
    }
  ],
  async testConnection(settings: AppSettings): Promise<ProviderConnectionResult> {
    const key = settings.deepseekApiKey;
    if (!key) {
      return { success: false, message: 'DeepSeek API key is missing' };
    }
    const start = Date.now();
    try {
      const valid = await deepseekService.verifyApiKey(key);
      const latency = Date.now() - start;
      if (valid) {
        return { success: true, message: `Connected to DeepSeek (${latency}ms)`, latencyMs: latency, modelsCount: 5 };
      }
      return { success: false, message: 'Invalid DeepSeek API key' };
    } catch (err: any) {
      return { success: false, message: err?.message || 'Connection test failed' };
    }
  },
  async *streamChat(settings: AppSettings, messages: Message[], signal?: AbortSignal): AsyncGenerator<StreamChunk> {
    yield* deepseekService.streamChat(settings, messages, signal);
  }
};
