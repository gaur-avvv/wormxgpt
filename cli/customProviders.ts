/**
 * cli/customProviders.ts — Manage custom OpenAI-compatible AI providers
 */
import fs from 'fs';
import path from 'path';
import { DATA_DIR } from './shims';
import { OpenAICompatibleService } from '../services/openaiCompatible';
import { providerRouter } from '../services/providerRouter';
import { AppSettings, ProviderType } from '../types';

const CUSTOM_PROVIDERS_PATH = path.join(DATA_DIR, 'custom_providers.json');

export interface CustomProviderConfig {
  name: string;
  baseUrl: string;
  apiKey: string;
  defaultModel: string;
}

export function loadCustomProviders(): CustomProviderConfig[] {
  try {
    if (fs.existsSync(CUSTOM_PROVIDERS_PATH)) {
      return JSON.parse(fs.readFileSync(CUSTOM_PROVIDERS_PATH, 'utf8'));
    }
  } catch (e) {
    console.error('[!] Failed to read custom providers:', e);
  }
  return [];
}

export function saveCustomProviders(providers: CustomProviderConfig[]): void {
  try {
    fs.writeFileSync(CUSTOM_PROVIDERS_PATH, JSON.stringify(providers, null, 2), 'utf8');
  } catch (e) {
    console.error('[!] Failed to save custom providers:', e);
  }
}

// Dynamically create a class extending OpenAICompatibleService
export class DynamicProviderService extends OpenAICompatibleService {
  protected providerName: string;
  protected baseUrl: string;
  protected apiKeyField: string;
  protected defaultModel: string;

  constructor(cfg: CustomProviderConfig) {
    super();
    this.providerName = cfg.name;
    this.baseUrl = cfg.baseUrl;
    this.apiKeyField = `custom_${cfg.name}_api_key`;
    this.defaultModel = cfg.defaultModel;
    this.setApiKey(cfg.apiKey);
  }
}

export function registerCustomProviders(): void {
  const providers = loadCustomProviders();
  for (const p of providers) {
    try {
      const service = new DynamicProviderService(p);
      providerRouter.register(p.name as ProviderType, service);
    } catch (e: any) {
      console.error(`[!] Failed to register custom provider ${p.name}:`, e.message);
    }
  }
}

export function addCustomProvider(cfg: CustomProviderConfig, settings: AppSettings): void {
  const providers = loadCustomProviders();
  // Remove existing with same name
  const filtered = providers.filter(p => p.name.toLowerCase() !== cfg.name.toLowerCase());
  filtered.push(cfg);
  saveCustomProviders(filtered);

  // Register in current runtime
  const service = new DynamicProviderService(cfg);
  providerRouter.register(cfg.name as ProviderType, service);

  // Also set key in settings object
  (settings as any)[`custom_${cfg.name}_api_key`] = cfg.apiKey;
}

export function removeCustomProvider(name: string): boolean {
  const providers = loadCustomProviders();
  const filtered = providers.filter(p => p.name.toLowerCase() !== name.toLowerCase());
  if (filtered.length === providers.length) return false;
  saveCustomProviders(filtered);
  return true;
}
