import { OpenAICompatibleService } from './openaiCompatible';

class FeatherlessService extends OpenAICompatibleService {
  protected readonly providerName = 'Featherless AI';
  protected readonly baseUrl = 'https://api.featherless.ai/v1';
  protected readonly apiKeyField = 'featherlessApiKey';
  protected readonly defaultModel = 'meta-llama/Meta-Llama-3.1-70B-Instruct';

  constructor() {
    super();
    const saved = typeof window !== 'undefined' ? localStorage.getItem(this.apiKeyField) : null;
    if (saved) this.apiKey = saved;
  }
}

export const featherlessService = new FeatherlessService();
