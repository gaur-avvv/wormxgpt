import { OpenAICompatibleService } from './openaiCompatible';

class FireworksService extends OpenAICompatibleService {
  protected readonly providerName = 'Fireworks AI';
  protected readonly baseUrl = 'https://api.fireworks.ai/inference/v1';
  protected readonly apiKeyField = 'fireworksApiKey';
  protected readonly defaultModel = 'accounts/fireworks/models/llama-v3p1-405b-instruct';

  constructor() {
    super();
    const saved = typeof window !== 'undefined' ? localStorage.getItem(this.apiKeyField) : null;
    if (saved) this.apiKey = saved;
  }
}

export const fireworksService = new FireworksService();
