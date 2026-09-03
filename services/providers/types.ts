import { AppSettings, Message, ProviderType, StreamChunk } from '../../types';

export type ModelTag = 'vision' | 'fast' | 'long-context' | 'code' | 'reasoning' | 'free';

export interface ModelCapability {
  id: string;
  label: string;
  contextWindow?: number;
  tags: ModelTag[];
  isFree?: boolean;
  description?: string;
}

export interface ProviderConnectionResult {
  success: boolean;
  message: string;
  latencyMs?: number;
  modelsCount?: number;
}

export interface IModelProvider {
  id: ProviderType;
  name: string;
  description: string;
  requiresApiKey: boolean;
  apiKeyField?: keyof AppSettings;
  docsUrl?: string;
  models: ModelCapability[];
  testConnection(settings: AppSettings): Promise<ProviderConnectionResult>;
  streamChat(settings: AppSettings, messages: Message[], signal?: AbortSignal): AsyncGenerator<StreamChunk>;
}
