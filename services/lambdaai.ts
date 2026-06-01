import { OpenAICompatibleService } from './openaiCompatible';

class LambdaAIService extends OpenAICompatibleService {
  protected readonly providerName = 'Lambda AI';
  protected readonly baseUrl = 'https://api.lambdalabs.com/v1';
  protected readonly apiKeyField = 'lambdaaiApiKey';
  protected readonly defaultModel = 'llama3.1-405b-instruct-fp8';

  constructor() {
    super();
    const saved = typeof window !== 'undefined' ? localStorage.getItem(this.apiKeyField) : null;
    if (saved) this.apiKey = saved;
  }
}

export const lambdaaiService = new LambdaAIService();
