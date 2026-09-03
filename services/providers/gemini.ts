import { IModelProvider, ProviderConnectionResult } from './types';
import { AppSettings, Message, StreamChunk } from '../../types';
import { geminiService } from '../gemini';

export const geminiProvider: IModelProvider = {
  id: 'gemini',
  name: 'Google Gemini',
  description: 'Multimodal foundation models with million-token context and vision',
  requiresApiKey: false, // auto injected or user configured
  apiKeyField: 'geminiApiKey',
  docsUrl: 'https://aistudio.google.com/apikey',
  models: [
    {
      id: 'gemini-2.5-flash',
      label: 'Gemini 2.5 Flash (Flagship Fast)',
      contextWindow: 1048576,
      tags: ['fast', 'vision', 'long-context', 'code'],
      description: 'Ultra-fast multimodal model with reasoning capabilities and 1M context'
    },
    {
      id: 'gemini-2.5-pro',
      label: 'Gemini 2.5 Pro (Deep Multimodal)',
      contextWindow: 2097152,
      tags: ['reasoning', 'vision', 'long-context', 'code'],
      description: 'State-of-the-art multimodal reasoning with 2M context window'
    },
    {
      id: 'gemini-2.0-flash',
      label: 'Gemini 2.0 Flash',
      contextWindow: 1048576,
      tags: ['fast', 'vision', 'free', 'code'],
      isFree: true,
      description: 'Next-gen workhorse with sub-second speed and native tool integration'
    },
    {
      id: 'gemini-2.0-flash-thinking-exp',
      label: 'Gemini 2.0 Flash Thinking (CoT)',
      contextWindow: 1048576,
      tags: ['reasoning', 'code', 'vision'],
      description: 'Experimental reasoning model exposing internal chain-of-thought tokens'
    },
    {
      id: 'gemini-2.0-flash-lite-preview-02-05',
      label: 'Gemini 2.0 Flash-Lite (Instant)',
      contextWindow: 1048576,
      tags: ['fast', 'free'],
      isFree: true,
      description: 'Extreme-efficiency lightweight model designed for high frequency calls'
    },
    {
      id: 'gemini-1.5-pro',
      label: 'Gemini 1.5 Pro (2M Context)',
      contextWindow: 2097152,
      tags: ['vision', 'long-context', 'code'],
      description: 'Deep multimodal analysis across complex audio, video, and imagery'
    },
    {
      id: 'gemini-1.5-flash',
      label: 'Gemini 1.5 Flash',
      contextWindow: 1048576,
      tags: ['fast', 'vision'],
      description: 'Lightweight high-speed 1M context model'
    },
    {
      id: 'gemini-3.1-pro',
      label: 'Gemini 3.1 Pro (Frontier Preview)',
      contextWindow: 2097152,
      tags: ['reasoning', 'vision', 'long-context', 'code'],
      description: 'Next-generation frontier preview model'
    }
  ],
  async testConnection(settings: AppSettings): Promise<ProviderConnectionResult> {
    const key = settings.geminiApiKey || process.env.GEMINI_API_KEY || process.env.API_KEY || '';
    if (!key) {
      return { success: false, message: 'Gemini API key is not configured' };
    }
    const start = Date.now();
    try {
      const valid = await geminiService.verifyApiKey(key);
      const latency = Date.now() - start;
      if (valid) {
        return { success: true, message: `Connected to Google Gemini (${latency}ms)`, latencyMs: latency, modelsCount: 8 };
      }
      return { success: false, message: 'Gemini API key validation failed' };
    } catch (err: any) {
      return { success: false, message: err?.message || 'Connection test failed' };
    }
  },
  async *streamChat(settings: AppSettings, messages: Message[], signal?: AbortSignal): AsyncGenerator<StreamChunk> {
    yield* geminiService.streamChat(settings, messages, signal);
  }
};
