import { OpenAICompatibleService } from './openaiCompatible';

class DeepInfraService extends OpenAICompatibleService {
  protected readonly providerName = 'DeepInfra';
  protected readonly baseUrl = 'https://api.deepinfra.com/v1/openai';
  protected readonly apiKeyField = 'deepinfraApiKey';
  protected readonly defaultModel = 'meta-llama/Meta-Llama-3.1-70B-Instruct';

  constructor() {
    super();
    const saved = typeof window !== 'undefined' ? localStorage.getItem(this.apiKeyField) : null;
    if (saved) this.apiKey = saved;
  }
}

export const deepinfraService = new DeepInfraService();
