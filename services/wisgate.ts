import { AppSettings } from '../types';
import { OpenAICompatibleService } from './openaiCompatible';

class WisGateService extends OpenAICompatibleService {
  protected readonly providerName = 'WisGate';
  protected readonly baseUrl = 'https://api.wisgate.ai/v1';
  protected readonly apiKeyField = 'wisGateApiKey';
  protected readonly defaultModel = 'gpt-4o';

  constructor() {
    super();
    const saved = typeof window !== 'undefined' ? localStorage.getItem(this.apiKeyField) : null;
    if (saved) this.apiKey = saved;
  }

  protected getChatCompletionsUrl(): string {
    // WisGate supports custom host URLs
    const host = typeof window !== 'undefined' ? localStorage.getItem('wisGateHost') : null;
    const base = host || this.baseUrl;
    return base + '/chat/completions';
  }

  protected getModelsUrl(): string {
    const host = typeof window !== 'undefined' ? localStorage.getItem('wisGateHost') : null;
    const base = host || this.baseUrl;
    return base + '/models';
  }

  setHost(host: string) {
    if (typeof window !== 'undefined') {
      localStorage.setItem('wisGateHost', host);
    }
  }
}

export const wisGateService = new WisGateService();
