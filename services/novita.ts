import { OpenAICompatibleService } from './openaiCompatible';

class NovitaService extends OpenAICompatibleService {
  protected readonly providerName = 'Novita AI';
  protected readonly baseUrl = 'https://api.novita.ai/v3/openai';
  protected readonly apiKeyField = 'novitaApiKey';
  protected readonly defaultModel = 'meta-llama/llama-3.1-70b-instruct';

  constructor() {
    super();
    const saved = typeof window !== 'undefined' ? localStorage.getItem(this.apiKeyField) : null;
    if (saved) this.apiKey = saved;
  }
}

export const novitaService = new NovitaService();
