import { OpenAICompatibleService } from './openaiCompatible';

class NebiusService extends OpenAICompatibleService {
  protected readonly providerName = 'Nebius AI';
  protected readonly baseUrl = 'https://api.studio.nebius.ai/v1';
  protected readonly apiKeyField = 'nebiusApiKey';
  protected readonly defaultModel = 'meta-llama/Meta-Llama-3.1-70B-Instruct';

  constructor() {
    super();
    const saved = typeof window !== 'undefined' ? localStorage.getItem(this.apiKeyField) : null;
    if (saved) this.apiKey = saved;
  }
}

export const nebiusService = new NebiusService();
