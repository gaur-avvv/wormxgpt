import { IModelProvider, ProviderConnectionResult } from './types';
import { AppSettings, Message, StreamChunk } from '../../types';
import { puterService } from '../puter';

export const puterProvider: IModelProvider = {
  id: 'puter',
  name: 'Puter AI (Free & Keyless Gateway)',
  description: 'Serverless, keyless User-Pays access to OpenAI GPT-5.6 Sol, Terra, Luna, GPT-5.5, GPT-5.4, Codex, and GPT Image models',
  requiresApiKey: false,
  apiKeyField: 'puterApiKey',
  docsUrl: 'https://puter.com',
  models: [
    {
      id: 'gpt-5.6-sol',
      label: 'Puter GPT-5.6 Sol (Flagship Thinking)',
      contextWindow: 128000,
      tags: ['free', 'reasoning', 'code', 'vision'],
      isFree: true,
      description: 'Puter OpenAI flagship frontier intelligence model'
    },
    {
      id: 'gpt-5.6-sol-pro',
      label: 'Puter GPT-5.6 Sol Pro (Deep Reasoning)',
      contextWindow: 128000,
      tags: ['free', 'reasoning', 'code'],
      isFree: true,
      description: 'Extended deep reasoning Sol Pro'
    },
    {
      id: 'gpt-5.6-terra',
      label: 'Puter GPT-5.6 Terra (High Speed Workhorse)',
      contextWindow: 128000,
      tags: ['free', 'fast', 'code'],
      isFree: true,
      description: 'Mid-tier balanced speed and intelligence'
    },
    {
      id: 'gpt-5.6-terra-pro',
      label: 'Puter GPT-5.6 Terra Pro (Reasoning)',
      contextWindow: 128000,
      tags: ['free', 'reasoning', 'fast'],
      isFree: true,
      description: 'Fast reasoning workhorse model'
    },
    {
      id: 'gpt-5.6-luna',
      label: 'Puter GPT-5.6 Luna (Sub-Second Latency)',
      contextWindow: 32000,
      tags: ['free', 'fast'],
      isFree: true,
      description: 'Small, ultra-fast real-time chat model'
    },
    {
      id: 'gpt-5.6-luna-pro',
      label: 'Puter GPT-5.6 Luna Pro',
      contextWindow: 32000,
      tags: ['free', 'fast', 'reasoning'],
      isFree: true,
      description: 'Compact reasoning intelligence'
    },
    {
      id: 'gpt-5.5',
      label: 'Puter GPT-5.5 Standard',
      contextWindow: 128000,
      tags: ['free', 'code', 'vision'],
      isFree: true,
      description: 'OpenAI GPT-5.5 multi-modal architecture'
    },
    {
      id: 'gpt-5.5-pro',
      label: 'Puter GPT-5.5 Pro (Enterprise Reasoning)',
      contextWindow: 128000,
      tags: ['free', 'reasoning', 'long-context'],
      isFree: true,
      description: 'Heavy problem solving engine'
    },
    {
      id: 'gpt-5.4',
      label: 'Puter GPT-5.4 Base',
      contextWindow: 64000,
      tags: ['free', 'fast', 'code'],
      isFree: true,
      description: 'Stable code and dialogue pipeline'
    },
    {
      id: 'gpt-5.4-mini',
      label: 'Puter GPT-5.4 Mini',
      contextWindow: 32000,
      tags: ['free', 'fast'],
      isFree: true,
      description: 'Efficient lightweight GPT-5.4'
    },
    {
      id: 'gpt-5.4-nano',
      label: 'Puter GPT-5.4 Nano',
      contextWindow: 16000,
      tags: ['free', 'fast'],
      isFree: true,
      description: 'Micro fast responder'
    },
    {
      id: 'gpt-5.4-pro',
      label: 'Puter GPT-5.4 Pro',
      contextWindow: 128000,
      tags: ['free', 'reasoning'],
      isFree: true,
      description: 'Advanced reasoning synthesis'
    },
    {
      id: 'gpt-5.2',
      label: 'Puter GPT-5.2',
      contextWindow: 64000,
      tags: ['free', 'fast'],
      isFree: true,
      description: 'Reliable multi-purpose intelligence'
    },
    {
      id: 'gpt-5.2-chat',
      label: 'Puter GPT-5.2 Chat',
      contextWindow: 32000,
      tags: ['free', 'fast'],
      isFree: true,
      description: 'Conversational specialist'
    },
    {
      id: 'openai/gpt-5.3-codex',
      label: 'Puter GPT-5.3 Codex (Programming)',
      contextWindow: 128000,
      tags: ['free', 'code'],
      isFree: true,
      description: 'Autonomous software engineering & debugging'
    },
    {
      id: 'openai/gpt-oss-120b',
      label: 'Puter GPT-OSS 120B (Open Weights)',
      contextWindow: 64000,
      tags: ['free', 'code', 'fast'],
      isFree: true,
      description: 'Open source 120B parameter model'
    },
    {
      id: 'openai/gpt-oss-20b',
      label: 'Puter GPT-OSS 20B (Edge Fast)',
      contextWindow: 32000,
      tags: ['free', 'fast'],
      isFree: true,
      description: 'Lightweight open-weights model'
    },
    {
      id: 'gpt-4o',
      label: 'Puter GPT-4o (Vision & Audio)',
      contextWindow: 128000,
      tags: ['free', 'vision', 'code'],
      isFree: true,
      description: 'OpenAI GPT-4o multi-modal model'
    },
    {
      id: 'gpt-4o-mini',
      label: 'Puter GPT-4o Mini (Default Fast)',
      contextWindow: 64000,
      tags: ['free', 'fast', 'vision'],
      isFree: true,
      description: 'High-speed compact GPT-4o'
    },
    {
      id: 'claude-3-7-sonnet',
      label: 'Puter Claude 3.7 Sonnet',
      contextWindow: 128000,
      tags: ['free', 'reasoning', 'code'],
      isFree: true,
      description: 'Anthropic hybrid thinking via Puter'
    },
    {
      id: 'claude-3-5-sonnet',
      label: 'Puter Claude 3.5 Sonnet',
      contextWindow: 128000,
      tags: ['free', 'code', 'vision'],
      isFree: true,
      description: 'Leading code generation architecture'
    },
    {
      id: 'deepseek-r1',
      label: 'Puter DeepSeek R1 (671B Reasoning)',
      contextWindow: 64000,
      tags: ['free', 'reasoning', 'code'],
      isFree: true,
      description: 'Open reasoning frontier model'
    },
    {
      id: 'gemini-2.5-flash',
      label: 'Puter Gemini 2.5 Flash',
      contextWindow: 128000,
      tags: ['free', 'fast', 'vision'],
      isFree: true,
      description: 'Google multi-modal accelerated engine'
    },
    {
      id: 'gpt-image-2',
      label: 'Puter GPT Image 2 (Visual Diffusion)',
      contextWindow: 8000,
      tags: ['free', 'vision'],
      isFree: true,
      description: 'Next-gen high-fidelity image generator'
    },
    {
      id: 'gpt-image-1.5',
      label: 'Puter GPT Image 1.5',
      contextWindow: 8000,
      tags: ['free', 'vision'],
      isFree: true,
      description: 'Photorealistic image synthesis via Puter txt2img'
    }
  ],
  async testConnection(settings: AppSettings): Promise<ProviderConnectionResult> {
    const start = Date.now();
    try {
      const token = settings.puterApiKey || '';
      const ok = await puterService.verifyConnection(token);
      const latency = Date.now() - start;
      return { 
        success: ok, 
        message: token ? `Connected to Puter.js with User Auth (${latency}ms)` : `Connected to Puter.js Free/Keyless Hub (${latency}ms)`, 
        latencyMs: latency, 
        modelsCount: 25 
      };
    } catch (err: any) {
      return { success: false, message: err?.message || 'Puter connection test failed' };
    }
  },
  async *streamChat(settings: AppSettings, messages: Message[], signal?: AbortSignal): AsyncGenerator<StreamChunk> {
    yield* puterService.streamChat(settings, messages, signal);
  }
};
