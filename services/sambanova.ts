import { OpenAICompatibleService } from './openaiCompatible';

class SambanovaService extends OpenAICompatibleService {
  protected readonly providerName = 'SambaNova';
  protected readonly baseUrl = 'https://api.sambanova.ai/v1';
  protected readonly apiKeyField = 'sambanovaApiKey';
  protected readonly defaultModel = 'Meta-Llama-3.1-405B-Instruct';

  constructor() {
    super();
    const saved = typeof window !== 'undefined' ? localStorage.getItem(this.apiKeyField) : null;
    if (saved) this.apiKey = saved;
  }
}

export const sambanovaService = new SambanovaService();
