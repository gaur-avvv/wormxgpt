import { IModelProvider, ProviderConnectionResult } from './types';
import { AppSettings, Message, StreamChunk } from '../../types';
import { anthropicService } from '../anthropic';

export const claudeProvider: IModelProvider = {
  id: 'anthropic',
  name: 'Anthropic Claude',
  description: 'Frontier reasoning and long context models from Anthropic',
  requiresApiKey: true,
  apiKeyField: 'anthropicApiKey',
  docsUrl: 'https://console.anthropic.com',
  models: [
    {
      id: 'claude-3-7-sonnet-latest',
      label: 'Claude 3.7 Sonnet (Hybrid Reasoning)',
      contextWindow: 200000,
      tags: ['reasoning', 'vision', 'code', 'long-context'],
      description: 'Hybrid reasoning and instant response model with multimodal vision'
    },
    {
      id: 'claude-3-5-sonnet-latest',
      label: 'Claude 3.5 Sonnet',
      contextWindow: 200000,
      tags: ['vision', 'code', 'long-context'],
      description: 'Industry-leading coding and visual reasoning'
    },
    {
      id: 'claude-3-5-haiku-latest',
      label: 'Claude 3.5 Haiku',
      contextWindow: 200000,
      tags: ['fast', 'code'],
      description: 'Ultra-fast lightweight execution and tool-calling model'
    },
    {
      id: 'claude-3-opus-latest',
      label: 'Claude 3 Opus (High Intelligence)',
      contextWindow: 200000,
      tags: ['reasoning', 'long-context', 'vision'],
      description: 'Complex enterprise workflow analysis and comprehensive synthesis'
    },
    {
      id: 'claude-3-haiku-20240307',
      label: 'Claude 3 Haiku (Compact)',
      contextWindow: 200000,
      tags: ['fast'],
      description: 'Near-instant lightweight response engine'
    },
    {
      id: 'claude-3-7-sonnet-thinking',
      label: 'Claude 3.7 Sonnet (Extended Thinking)',
      contextWindow: 200000,
      tags: ['reasoning', 'code', 'long-context'],
      description: 'Deep mathematical and structural reasoning with chain-of-thought'
    }
  ],
  async testConnection(settings: AppSettings): Promise<ProviderConnectionResult> {
    const key = settings.anthropicApiKey;
    if (!key) {
      return { success: false, message: 'Anthropic API key is missing' };
    }
    const start = Date.now();
    try {
      const valid = await anthropicService.verifyApiKey(key);
      const latency = Date.now() - start;
      if (valid) {
        return { success: true, message: `Connected to Anthropic API (${latency}ms)`, latencyMs: latency, modelsCount: 6 };
      }
      return { success: false, message: 'Invalid Anthropic API Key (authentication failed)' };
    } catch (err: any) {
      return { success: false, message: err?.message || 'Connection test failed' };
    }
  },
  async *streamChat(settings: AppSettings, messages: Message[], signal?: AbortSignal): AsyncGenerator<StreamChunk> {
    yield* anthropicService.streamChat(settings, messages, signal);
  }
};
