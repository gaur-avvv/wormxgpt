import { OpenAICompatibleService } from './openaiCompatible';

class NvidiaService extends OpenAICompatibleService {
  protected readonly providerName = 'NVIDIA';
  protected readonly baseUrl = 'https://integrate.api.nvidia.com/v1';
  protected readonly apiKeyField = 'nvidiaApiKey';
  protected readonly defaultModel = 'meta/llama-3.1-405b-instruct';

  constructor() {
    super();
    const saved = typeof window !== 'undefined' ? localStorage.getItem(this.apiKeyField) : null;
    if (saved) this.apiKey = saved;
  }
}

export const nvidiaService = new NvidiaService();
