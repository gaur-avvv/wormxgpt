import { OpenAICompatibleService } from './openaiCompatible';
import { AppSettings, Message } from '../types';

export class Llm7Service extends OpenAICompatibleService {
  providerName = 'llm7';
  baseUrl = 'https://api.llm7.io/v1';
  apiKeyField = 'llm7ApiKey';
  defaultModel = 'default';

  public getApiKey(): string {
    return super.getApiKey() || 'unused';
  }
}

export const llm7Service = new Llm7Service();
