/**
 * cli/config.ts — File-based configuration manager for CLI mode
 * Reads/writes settings to both localStorage shim AND ~/.wormgpt/config.json
 */
import fs from 'fs';
import path from 'path';
import { DATA_DIR } from './shims';
import { AppSettings } from '../types';
import { DEFAULT_SYSTEM_INSTRUCTION, SETTINGS_KEY } from '../constants';

const CONFIG_PATH = path.join(DATA_DIR, 'config.json');
const LEGACY_KEY = 'worm_gpt_settings_v3';

export function getDefaults(): AppSettings {
  return {
    model: 'gemini-2.5-flash',
    aiProvider: 'gemini',
    temperature: 0.87,
    topP: 1,
    maxTokens: 4000,
    thinkingEnabled: true,
    thinkingBudget: 2048,
    systemInstruction: DEFAULT_SYSTEM_INSTRUCTION,
    customPromptPrefix: DEFAULT_SYSTEM_INSTRUCTION,
    promptInjectionEnabled: true,
    promptInjectionMode: 'always',
    enabledTools: [
      'GetCurrentDateTime', 'SearchWeb', 'WebCrawler', 'FetchWebpage',
      'DNSLookup', 'WhoisLookup', 'IPGeolocation', 'HashGenerator',
      'Base64Tool', 'JDoodleCompiler', 'TextTranslator', 'GenerateImage',
      'YouTubeTranscript', 'RedditSearch', 'HackerNewsSearch', 'GetNews',
      'ArxivSearch', 'CryptoPrices', 'BraveSearch', 'GoogleAISearch',
      'DuckDuckGoSearch', 'JinaSearch', 'ExaSearch', 'DeepResearch',
      'ScreenshotGenerator', 'AdvancedPDFScraper', 'EliteWebScraper',
    ],
    mcpEnabled: false, // Disabled by default in CLI to avoid reconnect spam
    mcpServerUrls: [],
    connectedApps: [],
    autoFallback: true,
    autoSelectFreeModel: true,
    multiAgentEnabled: false,
  };
}

export function loadSettings(): AppSettings {
  const defaults = getDefaults();

  // 1. Try localStorage (shim)
  const lsRaw = localStorage.getItem(SETTINGS_KEY) || localStorage.getItem(LEGACY_KEY);
  if (lsRaw) {
    try { return { ...defaults, ...JSON.parse(lsRaw) }; } catch {}
  }

  // 2. Try config file
  try {
    if (fs.existsSync(CONFIG_PATH)) {
      return { ...defaults, ...JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8')) };
    }
  } catch {}

  return defaults;
}

export function saveSettings(settings: AppSettings): void {
  const str = JSON.stringify(settings, null, 2);
  localStorage.setItem(SETTINGS_KEY, str);
  localStorage.setItem(LEGACY_KEY, str);
  try { fs.writeFileSync(CONFIG_PATH, str, 'utf8'); } catch {}
}

export function setApiKey(provider: string, key: string, settings: AppSettings): boolean {
  const map: Record<string, keyof AppSettings> = {
    gemini: 'geminiApiKey', groq: 'groqApiKey', openai: 'openaiApiKey',
    anthropic: 'anthropicApiKey', deepseek: 'deepseekApiKey', mistral: 'mistralApiKey',
    perplexity: 'perplexityApiKey', xai: 'xaiApiKey', together: 'togetherApiKey',
    openrouter: 'openRouterApiKey', cerebras: 'cerebrasApiKey',
    siliconflow: 'siliconFlowApiKey', moonshot: 'moonshotApiKey', ollama: 'ollamaApiKey',
    cohere: 'cohereApiKey', wisgate: 'wisGateApiKey', nvidia: 'nvidiaApiKey',
    fireworks: 'fireworksApiKey', sambanova: 'sambanovaApiKey', hyperbolic: 'hyperbolicApiKey',
    huggingface: 'huggingfaceApiKey', deepinfra: 'deepinfraApiKey', novita: 'novitaApiKey',
    featherless: 'featherlessApiKey', lambdaai: 'lambdaaiApiKey', nebius: 'nebiusApiKey',
    tinyfish: 'tinyfishApiKey', brave: 'braveApiKey', tavily: 'tavilyApiKey',
    firecrawl: 'firecrawlApiKey',
  };
  const field = map[provider.toLowerCase()];
  if (!field) return false;
  (settings as any)[field] = key;
  saveSettings(settings);
  return true;
}
