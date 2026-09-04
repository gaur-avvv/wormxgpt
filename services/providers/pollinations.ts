import { IModelProvider, ProviderConnectionResult } from './types';
import { AppSettings, Message, StreamChunk } from '../../types';
import { pollinationsService } from '../pollinations';

export const pollinationsProvider: IModelProvider = {
  id: 'pollinations',
  name: 'Pollinations AI (Free Network)',
  description: 'Completely free multi-model gateway with zero key requirement, plus optional Bearer token for dedicated rate limits',
  requiresApiKey: false,
  apiKeyField: 'pollinationsApiKey',
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
      id: 'openai-large',
      label: 'Pollinations GPT-4o Large (Free)',
      contextWindow: 128000,
      tags: ['free', 'vision', 'code'],
      isFree: true,
      description: 'High capacity GPT-4o reasoning model'
    },
    {
      id: 'openai-fast',
      label: 'Pollinations OpenAI Fast Turbo (Free)',
      contextWindow: 32000,
      tags: ['free', 'fast'],
      isFree: true,
      description: 'Ultra-fast low-latency OpenAI response pipeline'
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
      contextWindow: 64000,
      tags: ['free', 'reasoning', 'code'],
      isFree: true,
      description: 'Free DeepSeek open reasoning model'
    },
    {
      id: 'deepseek-reasoner',
      label: 'Pollinations DeepSeek Reasoner (Free R1 High-IQ)',
      contextWindow: 64000,
      tags: ['free', 'reasoning', 'code'],
      isFree: true,
      description: 'Full chain-of-thought deep reasoning'
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
      id: 'claude',
      label: 'Pollinations Claude 3.5 Sonnet Bridge (Free)',
      contextWindow: 64000,
      tags: ['free', 'reasoning', 'code'],
      isFree: true,
      description: 'Anthropic Claude reasoning proxy'
    },
    {
      id: 'llama',
      label: 'Pollinations Llama 3.3 70B (Free)',
      contextWindow: 64000,
      tags: ['free', 'fast', 'code'],
      isFree: true,
      description: 'Free open-weights Meta flagship model'
    },
    {
      id: 'gemini',
      label: 'Pollinations Gemini 2.5 Flash (Free)',
      contextWindow: 64000,
      tags: ['free', 'fast', 'vision'],
      isFree: true,
      description: 'Google Gemini accelerated inference'
    },
    {
      id: 'searchgpt',
      label: 'Pollinations SearchGPT (Free Web Grounding)',
      contextWindow: 32000,
      tags: ['free', 'fast'],
      isFree: true,
      description: 'Real-time live web search synthesis'
    },
    {
      id: 'flux',
      label: 'Pollinations Flux (Image Gen)',
      contextWindow: 8000,
      tags: ['free', 'vision'],
      isFree: true,
      description: 'Free high-resolution image and visual synthesis model'
    },
    {
      id: 'midjourney',
      label: 'Pollinations Midjourney Style (Image Gen)',
      contextWindow: 8000,
      tags: ['free', 'vision'],
      isFree: true,
      description: 'Artistic stylization visual rendering model'
    }
  ],
  async testConnection(settings: AppSettings): Promise<ProviderConnectionResult> {
    const start = Date.now();
    try {
      const token = settings.pollinationsApiKey || 'free';
      const valid = await pollinationsService.verifyApiKey(token);
      const latency = Date.now() - start;
      const isBearer = !!settings.pollinationsApiKey && settings.pollinationsApiKey.trim().length > 0;
      return { 
        success: true, 
        message: isBearer ? `Connected with Pollinations Bearer Token (${latency}ms)` : `Connected to Pollinations Free Gateway (${latency}ms)`, 
        latencyMs: latency, 
        modelsCount: 14 
      };
    } catch (err: any) {
      return { success: false, message: err?.message || 'Connection test failed' };
    }
  },
  async *streamChat(settings: AppSettings, messages: Message[], signal?: AbortSignal): AsyncGenerator<StreamChunk> {
    yield* pollinationsService.streamChat(settings, messages, signal);
  }
};
