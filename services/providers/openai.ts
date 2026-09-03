import { IModelProvider, ProviderConnectionResult } from './types';
import { AppSettings, Message, StreamChunk } from '../../types';
import { openaiService } from '../openai';

export const openaiProvider: IModelProvider = {
  id: 'openai',
  name: 'OpenAI (GPT-4o & Reasoning)',
  description: 'GPT-4o flagship multimodal and o-series reasoning models',
  requiresApiKey: true,
  apiKeyField: 'openaiApiKey',
  docsUrl: 'https://platform.openai.com/api-keys',
  models: [
    {
      id: 'gpt-4o',
      label: 'GPT-4o (Omni Flagship)',
      contextWindow: 128000,
      tags: ['vision', 'fast', 'code'],
      description: 'Flagship multimodal high-speed intelligence'
    },
    {
      id: 'gpt-4o-mini',
      label: 'GPT-4o Mini',
      contextWindow: 128000,
      tags: ['fast', 'vision', 'code'],
      description: 'Affordable, low-latency multimodal model'
    },
    {
      id: 'o3-mini',
      label: 'o3-mini (High Speed Reasoning)',
      contextWindow: 200000,
      tags: ['reasoning', 'code', 'long-context'],
      description: 'High-speed reasoning model tailored for science, math, and coding'
    },
    {
      id: 'o1',
      label: 'o1 (Full Chain-of-Thought)',
      contextWindow: 200000,
      tags: ['reasoning', 'long-context'],
      description: 'Full deep reasoning model for complex architectural workflows'
    },
    {
      id: 'o1-mini',
      label: 'o1-mini',
      contextWindow: 128000,
      tags: ['reasoning', 'fast', 'code'],
      description: 'Fast reasoning model optimized for code and STEM tasks'
    },
    {
      id: 'gpt-4.5-preview',
      label: 'GPT-4.5 Preview (Orion Knowledge)',
      contextWindow: 128000,
      tags: ['reasoning', 'vision', 'long-context'],
      description: 'Frontier scale model with unprecedented factual depth'
    },
    {
      id: 'chatgpt-4o-latest',
      label: 'ChatGPT-4o Latest (Dynamic)',
      contextWindow: 128000,
      tags: ['vision', 'fast', 'code'],
      description: 'Continuously updated conversational GPT-4o build'
    },
    {
      id: 'gpt-4-turbo',
      label: 'GPT-4 Turbo (128k)',
      contextWindow: 128000,
      tags: ['code', 'vision', 'long-context'],
      description: 'High-capability 128k context model with vision support'
    }
  ],
  async testConnection(settings: AppSettings): Promise<ProviderConnectionResult> {
    const key = settings.openaiApiKey;
    if (!key) {
      return { success: false, message: 'OpenAI API key is missing' };
    }
    const start = Date.now();
    try {
      const valid = await openaiService.verifyApiKey(key);
      const latency = Date.now() - start;
      if (valid) {
        return { success: true, message: `Connected to OpenAI API (${latency}ms)`, latencyMs: latency, modelsCount: 8 };
      }
      return { success: false, message: 'OpenAI authentication failed - check your API key' };
    } catch (err: any) {
      return { success: false, message: err?.message || 'Connection test failed' };
    }
  },
  async *streamChat(settings: AppSettings, messages: Message[], signal?: AbortSignal): AsyncGenerator<StreamChunk> {
    yield* openaiService.streamChat(settings, messages, signal);
  }
};
