import { OpenAICompatibleService, StreamYield } from './openaiCompatible';
import { AppSettings, Message } from '../types';

export class UncloseaiService extends OpenAICompatibleService {
  providerName = 'uncloseai';
  baseUrl = 'https://hermes.ai.unturf.com/v1'; 
  apiKeyField = 'uncloseaiApiKey'; // Ignored, provider is free
  defaultModel = 'hermes';

  async *streamChat(settings: AppSettings, messages: Message[], signal?: AbortSignal): AsyncGenerator<StreamYield> {
    const model = (settings.model || this.defaultModel).toLowerCase();
    
    let targetModel = 'adamo1139/Hermes-3-Llama-3.1-8B-FP8-Dynamic';
    if (model.includes('qwen')) {
      this.baseUrl = 'https://qwen.ai.unturf.com/v1';
      targetModel = 'qwen';
    } else {
      this.baseUrl = 'https://hermes.ai.unturf.com/v1';
    }
    
    // Free provider doesn't strictly need a key, but OpenAI client might require a non-empty auth header
    if (!this.getApiKey()) {
      this.setApiKey('free-tier');
    }

    const overriddenSettings = { ...settings, model: targetModel };
    yield* super.streamChat(overriddenSettings, messages, signal);
  }
}

export const uncloseaiService = new UncloseaiService();
