import { OpenAICompatibleService } from './openaiCompatible';

class HyperbolicService extends OpenAICompatibleService {
  protected readonly providerName = 'Hyperbolic';
  protected readonly baseUrl = 'https://api.hyperbolic.xyz/v1';
  protected readonly apiKeyField = 'hyperbolicApiKey';
  protected readonly defaultModel = 'meta-llama/Meta-Llama-3.1-70B-Instruct';

  constructor() {
    super();
    const saved = typeof window !== 'undefined' ? localStorage.getItem(this.apiKeyField) : null;
    if (saved) this.apiKey = saved;
  }
}

export const hyperbolicService = new HyperbolicService();
