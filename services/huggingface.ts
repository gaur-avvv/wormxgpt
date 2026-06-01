import { OpenAICompatibleService } from './openaiCompatible';

class HuggingFaceService extends OpenAICompatibleService {
  protected readonly providerName = 'Hugging Face';
  protected readonly baseUrl = 'https://router.hugging-face.cn/v1';
  protected readonly apiKeyField = 'huggingfaceApiKey';
  protected readonly defaultModel = 'meta-llama/Meta-Llama-3.1-70B-Instruct';

  constructor() {
    super();
    const saved = typeof window !== 'undefined' ? localStorage.getItem(this.apiKeyField) : null;
    if (saved) this.apiKey = saved;
  }
}

export const huggingfaceService = new HuggingFaceService();
