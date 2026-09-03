import { IModelProvider, ModelCapability, ModelTag, ProviderConnectionResult } from './types';
import { AppSettings, Message, ProviderType, StreamChunk } from '../../types';
import { claudeProvider } from './claude';
import { openaiProvider } from './openai';
import { groqProvider } from './groq';
import { mistralProvider } from './mistral';
import { geminiProvider } from './gemini';
import { deepseekProvider } from './deepseek';
import { pollinationsProvider } from './pollinations';
import { openrouterService } from '../openrouter';
import { ollamaService } from '../ollama';
import { perplexityService } from '../perplexity';
import { togetherService } from '../together';
import { cohereService } from '../cohere';
import { xaiService } from '../xai';
import { cerebrasService } from '../cerebras';
import { fireworksService } from '../fireworks';
import { deepinfraService } from '../deepinfra';
import { siliconflowService } from '../siliconflow';
import { huggingfaceService } from '../huggingface';
import { novitaService } from '../novita';
import { nebiusService } from '../nebius';
import { nvidiaService } from '../nvidia';
import { verifyProviderApiKey, PROVIDER_VERIFICATION_MAP, KeyVerificationResult } from './verifyApiKey';

export interface ProviderConfig {
  id: string;
  name: string;
  baseUrl: string;
  authHeader: (key: string) => Record<string, string>;
  models: string[];
  docsUrl?: string;
  category?: 'cloud' | 'router' | 'local';
}

/**
 * 27 Primary Providers + Local Runtimes + 77 Extended Catalog Providers
 */
export const EXPANDED_PROVIDERS: Record<string, ProviderConfig> = {
  // ── Primary Providers ───────────────────────────────────────────────────────
  openai: {
    id: 'openai',
    name: 'OpenAI',
    baseUrl: 'https://api.openai.com/v1',
    authHeader: (key) => ({ Authorization: `Bearer ${key}` }),
    models: ['gpt-4o', 'gpt-4o-mini', 'o1', 'o3-mini', 'gpt-4.5-preview', 'gpt-4-turbo'],
    docsUrl: 'https://platform.openai.com/api-keys',
    category: 'cloud',
  },
  anthropic: {
    id: 'anthropic',
    name: 'Anthropic Claude',
    baseUrl: 'https://api.anthropic.com/v1',
    authHeader: (key) => ({
      'x-api-key': key,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    }),
    models: ['claude-3-7-sonnet-20250219', 'claude-3-5-sonnet-20241022', 'claude-3-5-haiku-20241022', 'claude-3-opus-20240229'],
    docsUrl: 'https://console.anthropic.com/settings/keys',
    category: 'cloud',
  },
  gemini: {
    id: 'gemini',
    name: 'Google Gemini',
    baseUrl: 'https://generativelanguage.googleapis.com/v1beta',
    authHeader: () => ({}),
    models: ['gemini-2.5-flash', 'gemini-2.5-pro', 'gemini-2.0-flash', 'gemini-1.5-flash', 'gemini-1.5-pro'],
    docsUrl: 'https://aistudio.google.com/app/apikey',
    category: 'cloud',
  },
  groq: {
    id: 'groq',
    name: 'Groq Cloud (LPU)',
    baseUrl: 'https://api.groq.com/openai/v1',
    authHeader: (key) => ({ Authorization: `Bearer ${key}` }),
    models: ['llama-3.3-70b-versatile', 'llama-3.1-8b-instant', 'deepseek-r1-distill-llama-70b', 'qwen-2.5-coder-32b', 'gemma2-9b-it'],
    docsUrl: 'https://console.groq.com/keys',
    category: 'router',
  },
  openrouter: {
    id: 'openrouter',
    name: 'OpenRouter (Unified Gateway)',
    baseUrl: 'https://openrouter.ai/api/v1',
    authHeader: (key) => ({
      Authorization: `Bearer ${key}`,
      'HTTP-Referer': 'https://wormxgpt.terminal',
      'X-Title': 'WormGPT Console',
    }),
    models: [
      'anthropic/claude-3.7-sonnet',
      'deepseek/deepseek-r1',
      'deepseek/deepseek-r1-distill-llama-70b',
      'openai/gpt-4o-2024-11-20',
      'meta-llama/llama-3.3-70b-instruct',
      'openrouter/free',
      'qwen/qwen-2.5-coder-32b-instruct',
    ],
    docsUrl: 'https://openrouter.ai/keys',
    category: 'router',
  },
  together: {
    id: 'together',
    name: 'Together AI',
    baseUrl: 'https://api.together.xyz/v1',
    authHeader: (key) => ({ Authorization: `Bearer ${key}` }),
    models: [
      'meta-llama/Llama-3.3-70B-Instruct-Turbo',
      'deepseek-ai/DeepSeek-R1',
      'deepseek-ai/deepseek-r1-distill-llama-70b',
      'deepseek-ai/DeepSeek-V3',
      'Qwen/Qwen2.5-Coder-32B-Instruct',
      'openai/gpt-oss-20b',
      'Qwen/Qwen3.5-9B',
    ],
    docsUrl: 'https://api.together.xyz/settings/api-keys',
    category: 'router',
  },
  cohere: {
    id: 'cohere',
    name: 'Cohere Command',
    baseUrl: 'https://api.cohere.com/v2',
    authHeader: (key) => ({ Authorization: `Bearer ${key}` }),
    models: ['command-r-plus-08-2024', 'command-r-08-2024', 'command-r7b-12-2024', 'command-light'],
    docsUrl: 'https://dashboard.cohere.com/api-keys',
    category: 'cloud',
  },
  deepseek: {
    id: 'deepseek',
    name: 'DeepSeek AI',
    baseUrl: 'https://api.deepseek.com',
    authHeader: (key) => ({ Authorization: `Bearer ${key}` }),
    models: ['deepseek-chat', 'deepseek-reasoner'],
    docsUrl: 'https://platform.deepseek.com/api_keys',
    category: 'cloud',
  },
  mistral: {
    id: 'mistral',
    name: 'Mistral AI',
    baseUrl: 'https://api.mistral.ai/v1',
    authHeader: (key) => ({ Authorization: `Bearer ${key}` }),
    models: ['mistral-large-latest', 'mistral-medium-latest', 'mistral-small-latest', 'codestral-latest', 'ministral-8b-latest', 'ministral-3b-latest', 'pixtral-large-latest'],
    docsUrl: 'https://console.mistral.ai/api-keys',
    category: 'cloud',
  },
  perplexity: {
    id: 'perplexity',
    name: 'Perplexity Sonar (Online Search)',
    baseUrl: 'https://api.perplexity.ai',
    authHeader: (key) => ({ Authorization: `Bearer ${key}` }),
    models: ['sonar-pro', 'sonar', 'sonar-reasoning', 'sonar-reasoning-pro'],
    docsUrl: 'https://www.perplexity.ai/settings/api',
    category: 'cloud',
  },
  xai: {
    id: 'xai',
    name: 'xAI (Grok)',
    baseUrl: 'https://api.x.ai/v1',
    authHeader: (key) => ({ Authorization: `Bearer ${key}` }),
    models: ['grok-2-latest', 'grok-2-vision-1212', 'grok-beta'],
    docsUrl: 'https://console.x.ai',
    category: 'cloud',
  },
  cerebras: {
    id: 'cerebras',
    name: 'Cerebras Ultra-Fast',
    baseUrl: 'https://api.cerebras.ai/v1',
    authHeader: (key) => ({ Authorization: `Bearer ${key}` }),
    models: ['llama-3.3-70b', 'llama3.1-8b'],
    docsUrl: 'https://cloud.cerebras.ai',
    category: 'cloud',
  },
  fireworks: {
    id: 'fireworks',
    name: 'Fireworks AI',
    baseUrl: 'https://api.fireworks.ai/inference/v1',
    authHeader: (key) => ({ Authorization: `Bearer ${key}` }),
    models: ['accounts/fireworks/models/llama-v3p3-70b-instruct', 'accounts/fireworks/models/deepseek-r1', 'accounts/fireworks/models/deepseek-v3p1'],
    docsUrl: 'https://fireworks.ai/api-keys',
    category: 'router',
  },
  sambanova: {
    id: 'sambanova',
    name: 'SambaNova Systems',
    baseUrl: 'https://api.sambanova.ai/v1',
    authHeader: (key) => ({ Authorization: `Bearer ${key}` }),
    models: ['Meta-Llama-3.3-70B-Instruct', 'DeepSeek-R1-Distill-Llama-70B', 'Qwen2.5-72B-Instruct'],
    docsUrl: 'https://cloud.sambanova.ai',
    category: 'cloud',
  },
  siliconflow: {
    id: 'siliconflow',
    name: 'SiliconFlow',
    baseUrl: 'https://api.siliconflow.cn/v1',
    authHeader: (key) => ({ Authorization: `Bearer ${key}` }),
    models: ['deepseek-ai/DeepSeek-V3', 'deepseek-ai/DeepSeek-R1', 'Qwen/Qwen2.5-72B-Instruct', 'Qwen/Qwen2.5-Coder-32B-Instruct'],
    docsUrl: 'https://cloud.siliconflow.cn/account/ak',
    category: 'router',
  },
  huggingface: {
    id: 'huggingface',
    name: 'HuggingFace Inference',
    baseUrl: 'https://api-inference.huggingface.co/v1',
    authHeader: (key) => ({ Authorization: `Bearer ${key}` }),
    models: ['meta-llama/Llama-3.3-70B-Instruct', 'Qwen/Qwen2.5-Coder-32B-Instruct', 'zai-org/GLM-5.2', 'deepseek-ai/DeepSeek-R1'],
    docsUrl: 'https://huggingface.co/settings/tokens',
    category: 'router',
  },
  deepinfra: {
    id: 'deepinfra',
    name: 'DeepInfra',
    baseUrl: 'https://api.deepinfra.com/v1/openai',
    authHeader: (key) => ({ Authorization: `Bearer ${key}` }),
    models: ['meta-llama/Llama-3.3-70B-Instruct', 'deepseek-ai/DeepSeek-R1', 'Qwen/Qwen2.5-72B-Instruct'],
    docsUrl: 'https://deepinfra.com/dash/api_keys',
    category: 'router',
  },
  novita: {
    id: 'novita',
    name: 'Novita AI',
    baseUrl: 'https://api.novita.ai/v3/openai',
    authHeader: (key) => ({ Authorization: `Bearer ${key}` }),
    models: ['meta-llama/llama-3.3-70b-instruct', 'deepseek/deepseek-r1'],
    docsUrl: 'https://novita.ai/settings/key-management',
    category: 'router',
  },
  nebius: {
    id: 'nebius',
    name: 'Nebius AI Studio',
    baseUrl: 'https://api.studio.nebius.ai/v1',
    authHeader: (key) => ({ Authorization: `Bearer ${key}` }),
    models: ['meta-llama/Meta-Llama-3.1-70B-Instruct', 'deepseek-ai/DeepSeek-R1'],
    docsUrl: 'https://studio.nebius.ai/settings/api-keys',
    category: 'cloud',
  },
  cloudflare: {
    id: 'cloudflare',
    name: 'Cloudflare Workers AI',
    baseUrl: 'https://api.cloudflare.com/client/v4',
    authHeader: (key) => ({ Authorization: `Bearer ${key}` }),
    models: ['@cf/meta/llama-3.3-70b-instruct', '@cf/deepseek-ai/deepseek-r1-distill-qwen-32b', '@cf/zai-org/glm-5.2'],
    docsUrl: 'https://dash.cloudflare.com/profile/api-tokens',
    category: 'router',
  },
  nvidia: {
    id: 'nvidia',
    name: 'NVIDIA NIM',
    baseUrl: 'https://integrate.api.nvidia.com/v1',
    authHeader: (key) => ({ Authorization: `Bearer ${key}` }),
    models: ['meta/llama-3.1-8b-instruct', 'meta/llama-3.3-70b-instruct', 'deepseek-ai/deepseek-r1', 'nvidia/llama-3.1-nemotron-70b-instruct'],
    docsUrl: 'https://build.nvidia.com',
    category: 'router',
  },
  minimax: {
    id: 'minimax',
    name: 'MiniMax',
    baseUrl: 'https://api.minimax.chat/v1',
    authHeader: (key) => ({ Authorization: `Bearer ${key}` }),
    models: ['minimax-m2.7', 'minimax-text-01', 'abab6.5s-chat'],
    docsUrl: 'https://platform.minimaxi.com',
    category: 'cloud',
  },
  moonshot: {
    id: 'moonshot',
    name: 'Moonshot / Kimi AI',
    baseUrl: 'https://api.moonshot.cn/v1',
    authHeader: (key) => ({ Authorization: `Bearer ${key}` }),
    models: ['kimi-k2.5', 'moonshot-v1-128k', 'moonshot-v1-32k', 'moonshot-v1-8k'],
    docsUrl: 'https://platform.moonshot.cn/console/api-keys',
    category: 'cloud',
  },
  alibaba: {
    id: 'alibaba',
    name: 'Alibaba Cloud (Qwen DashScope)',
    baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
    authHeader: (key) => ({ Authorization: `Bearer ${key}` }),
    models: ['qwen-max', 'qwen-plus', 'qwen-turbo', 'qwen2.5-72b-instruct', 'qwen2.5-coder-32b-instruct'],
    docsUrl: 'https://bailian.console.aliyun.com',
    category: 'cloud',
  },
  z_ai: {
    id: 'z_ai',
    name: 'Z.AI / Zhipu GLM',
    baseUrl: 'https://open.bigmodel.cn/api/paas/v4',
    authHeader: (key) => ({ Authorization: `Bearer ${key}` }),
    models: ['glm-5.2', 'glm-4-plus', 'glm-4-flash', 'glm-4-air'],
    docsUrl: 'https://open.bigmodel.cn/usercenter/apikeys',
    category: 'cloud',
  },
  puter: {
    id: 'puter',
    name: 'Puter AI (400+ Free Models)',
    baseUrl: 'https://api.puter.com/v1',
    authHeader: (key) => (key ? { Authorization: `Bearer ${key}` } : {}),
    models: ['gpt-4o-mini', 'claude-3-5-sonnet', 'deepseek-r1', 'gemini-2.0-flash'],
    docsUrl: 'https://puter.com',
    category: 'cloud',
  },
  pollinations: {
    id: 'pollinations',
    name: 'Pollinations AI (No API Key Required)',
    baseUrl: 'https://text.pollinations.ai',
    authHeader: () => ({}),
    models: ['openai', 'deepseek', 'claude', 'mistral', 'flux', 'qwen-coder'],
    docsUrl: 'https://pollinations.ai',
    category: 'cloud',
  },

  // ── Local Runtimes (Localhost Private Hardware) ──────────────────────────────
  ollama: {
    id: 'ollama',
    name: 'Ollama (Localhost Engine)',
    baseUrl: 'http://localhost:11434/v1',
    authHeader: () => ({}),
    models: ['llama3.3:70b', 'llama3.2', 'deepseek-r1:8b', 'qwen2.5-coder:7b', 'mistral'],
    docsUrl: 'https://ollama.com/download',
    category: 'local',
  },
  llamacpp: {
    id: 'llamacpp',
    name: 'llama.cpp Server (Local)',
    baseUrl: 'http://localhost:8080/v1',
    authHeader: () => ({}),
    models: ['default', 'llama-model'],
    docsUrl: 'https://github.com/ggerganov/llama.cpp',
    category: 'local',
  },
  lmstudio: {
    id: 'lmstudio',
    name: 'LM Studio (Local)',
    baseUrl: 'http://localhost:1234/v1',
    authHeader: () => ({}),
    models: ['local-model'],
    docsUrl: 'https://lmstudio.ai',
    category: 'local',
  },
  jan: {
    id: 'jan',
    name: 'Jan (Local AI)',
    baseUrl: 'http://localhost:1337/v1',
    authHeader: () => ({}),
    models: ['jan-model'],
    docsUrl: 'https://jan.ai',
    category: 'local',
  },
  vllm: {
    id: 'vllm',
    name: 'vLLM High-Throughput (Local)',
    baseUrl: 'http://localhost:8000/v1',
    authHeader: () => ({}),
    models: ['vllm-model'],
    docsUrl: 'https://docs.vllm.ai',
    category: 'local',
  },
  sglang: {
    id: 'sglang',
    name: 'SGLang High-Speed (Local)',
    baseUrl: 'http://localhost:30000/v1',
    authHeader: () => ({}),
    models: ['default'],
    docsUrl: 'https://github.com/sgl-project/sglang',
    category: 'local',
  },
  localai: {
    id: 'localai',
    name: 'LocalAI (Local)',
    baseUrl: 'http://localhost:8080/v1',
    authHeader: () => ({}),
    models: ['default'],
    docsUrl: 'https://localai.io',
    category: 'local',
  },
  gpt4all: {
    id: 'gpt4all',
    name: 'GPT4All API Server',
    baseUrl: 'http://localhost:4891/v1',
    authHeader: () => ({}),
    models: ['default'],
    docsUrl: 'https://gpt4all.io',
    category: 'local',
  },
  local_openai_proxy: {
    id: 'local_openai_proxy',
    name: 'Local OpenAI Proxy Server',
    baseUrl: 'http://127.0.0.1:8317/v1',
    authHeader: (key) => (key ? { Authorization: `Bearer ${key}` } : {}),
    models: ['default'],
    category: 'local',
  },
  unsloth: {
    id: 'unsloth',
    name: 'Unsloth Local Server',
    baseUrl: 'http://127.0.0.1:8888/v1',
    authHeader: () => ({}),
    models: ['default'],
    category: 'local',
  },
  webgpu: {
    id: 'webgpu',
    name: 'WebGPU (In-Browser GPU)',
    baseUrl: 'in-browser',
    authHeader: () => ({}),
    models: ['webgpu-qwen', 'webgpu-smollm', 'LFM2.5 2.6B', 'Bonsai 27B'],
    category: 'local',
  },
  webbrain_cloud: {
    id: 'webbrain_cloud',
    name: 'WebBrain Cloud',
    baseUrl: 'https://api.webbrain.ai/v1',
    authHeader: (key) => ({ Authorization: `Bearer ${key}` }),
    models: ['webbrain-cloud 1.0'],
    docsUrl: 'https://webbrain.ai',
    category: 'cloud',
  },
  azure_openai: {
    id: 'azure_openai',
    name: 'Azure OpenAI Foundry',
    baseUrl: 'https://models.inference.ai.azure.com',
    authHeader: (key) => ({ Authorization: `Bearer ${key}`, 'api-key': key }),
    models: ['gpt-4o', 'gpt-4o-mini', 'DeepSeek-R1'],
    docsUrl: 'https://azure.microsoft.com/products/ai-services/openai-service',
    category: 'cloud',
  },
  aws_bedrock: {
    id: 'aws_bedrock',
    name: 'AWS Bedrock',
    baseUrl: 'https://bedrock-runtime.us-east-1.amazonaws.com',
    authHeader: (key) => ({ Authorization: `Bearer ${key}` }),
    models: ['amazon.nova-pro-v1:0', 'amazon.nova-lite-v1:0', 'anthropic.claude-3-5-sonnet'],
    docsUrl: 'https://aws.amazon.com/bedrock',
    category: 'cloud',
  },

  // ── Extended 77 Providers Catalog ──────────────────────────────────────────
  '302ai': { id: '302ai', name: '302.AI Gateway', baseUrl: 'https://api.302.ai/v1', authHeader: (k) => ({ Authorization: `Bearer ${k}` }), models: ['gpt-4o', 'gpt-4o-mini', 'claude-3-7-sonnet', 'claude-3-5-sonnet', 'deepseek-r1'], category: 'router' },
  abacus: { id: 'abacus', name: 'Abacus.AI RouteLLM', baseUrl: 'https://routellm.abacus.ai/v1', authHeader: (k) => ({ Authorization: `Bearer ${k}` }), models: ['router-optimal', 'gpt-4o-router', 'claude-router', 'deepseek-router'], category: 'router' },
  aihubmix: { id: 'aihubmix', name: 'AIHubMix Router', baseUrl: 'https://aihubmix.com/v1', authHeader: (k) => ({ Authorization: `Bearer ${k}` }), models: ['gpt-4o', 'gpt-4o-mini', 'claude-3-5-sonnet', 'gemini-2.0-flash'], category: 'router' },
  'alibaba-coding-plan': { id: 'alibaba-coding-plan', name: 'Alibaba Coding Plan', baseUrl: 'https://dashscope-intl.aliyuncs.com/compatible-mode/v1', authHeader: (k) => ({ Authorization: `Bearer ${k}` }), models: ['qwen2.5-coder-32b-instruct', 'qwen2.5-72b-instruct', 'qwen-max-latest', 'qwen-plus-latest'], category: 'cloud' },
  'alibaba-coding-plan-cn': { id: 'alibaba-coding-plan-cn', name: 'Alibaba Coding Plan (CN)', baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1', authHeader: (k) => ({ Authorization: `Bearer ${k}` }), models: ['qwen2.5-coder-32b-instruct', 'qwen2.5-72b-instruct', 'qwen-max', 'qwen-plus'], category: 'cloud' },
  'azure-cognitive-services': { id: 'azure-cognitive-services', name: 'Azure OpenAI Services', baseUrl: 'https://models.inference.ai.azure.com', authHeader: (k) => ({ Authorization: `Bearer ${k}` }), models: ['gpt-4o', 'gpt-4o-mini', 'DeepSeek-R1', 'o1-mini'], category: 'cloud' },
  bailing: { id: 'bailing', name: 'Bailing AI', baseUrl: 'https://api.bailing.ai/v1', authHeader: (k) => ({ Authorization: `Bearer ${k}` }), models: ['bailing-pro', 'bailing-chat', 'bailing-code'], category: 'cloud' },
  baseten: { id: 'baseten', name: 'Baseten Model Inference', baseUrl: 'https://bridge.baseten.co/v1', authHeader: (k) => ({ Authorization: `Api-Key ${k}` }), models: ['deepseek-r1', 'llama-3.3-70b-instruct', 'mistral-large'], category: 'cloud' },
  berget: { id: 'berget', name: 'Berget AI', baseUrl: 'https://api.berget.ai/v1', authHeader: (k) => ({ Authorization: `Bearer ${k}` }), models: ['berget-fast', 'berget-reasoning', 'berget-coder'], category: 'router' },
  chutes: { id: 'chutes', name: 'Chutes.ai Decentralized GPUs', baseUrl: 'https://api.chutes.ai/v1', authHeader: (k) => ({ Authorization: `Bearer ${k}` }), models: ['deepseek-ai/DeepSeek-R1', 'deepseek-ai/DeepSeek-V3', 'meta-llama/Llama-3.3-70B-Instruct'], category: 'router' },
  clarifai: { id: 'clarifai', name: 'Clarifai Platform', baseUrl: 'https://api.clarifai.com/v2/users/me/apps/app/models', authHeader: (k) => ({ Authorization: `Key ${k}` }), models: ['general-model', 'clarifai-llama-3-70b', 'clarifai-gpt-4o'], category: 'cloud' },
  'cloudferro-sherlock': { id: 'cloudferro-sherlock', name: 'CloudFerro Sherlock', baseUrl: 'https://sherlock.cloudferro.com/v1', authHeader: (k) => ({ Authorization: `Bearer ${k}` }), models: ['sherlock-v1', 'sherlock-pro', 'sherlock-vision'], category: 'cloud' },
  cortecs: { id: 'cortecs', name: 'Cortecs AI', baseUrl: 'https://api.cortecs.ai/v1', authHeader: (k) => ({ Authorization: `Bearer ${k}` }), models: ['cortecs-pro', 'cortecs-flash', 'cortecs-code'], category: 'cloud' },
  digitalocean: { id: 'digitalocean', name: 'DigitalOcean GenAI Platform', baseUrl: 'https://api.digitalocean.com/v1/genai', authHeader: (k) => ({ Authorization: `Bearer ${k}` }), models: ['do-llama-3.3-70b', 'do-mistral-7b', 'do-mixtral-8x7b'], category: 'cloud' },
  dinference: { id: 'dinference', name: 'dInference Decentralized', baseUrl: 'https://api.dinference.io/v1', authHeader: (k) => ({ Authorization: `Bearer ${k}` }), models: ['deepseek-r1', 'llama-3.3-70b', 'qwen-2.5-coder-32b'], category: 'router' },
  drun: { id: 'drun', name: 'DRun Serverless', baseUrl: 'https://api.drun.io/v1', authHeader: (k) => ({ Authorization: `Bearer ${k}` }), models: ['drun-standard', 'drun-deepseek', 'drun-llama'], category: 'router' },
  evroc: { id: 'evroc', name: 'Evroc Sovereign Cloud', baseUrl: 'https://api.evroc.com/v1', authHeader: (k) => ({ Authorization: `Bearer ${k}` }), models: ['evroc-mistral-large', 'evroc-llama-3.3-70b', 'evroc-sovereign-code'], category: 'cloud' },
  fastrouter: { id: 'fastrouter', name: 'FastRouter AI', baseUrl: 'https://api.fastrouter.io/v1', authHeader: (k) => ({ Authorization: `Bearer ${k}` }), models: ['fast-route-auto', 'fast-route-cheap', 'fast-route-quality'], category: 'router' },
  featherless: { id: 'featherless', name: 'Featherless AI (1000+ Models)', baseUrl: 'https://api.featherless.ai/v1', authHeader: (k) => ({ Authorization: `Bearer ${k}` }), models: ['meta-llama/Llama-3.3-70B-Instruct', 'Qwen/Qwen2.5-Coder-32B-Instruct', 'deepseek-ai/DeepSeek-R1', 'mistralai/Mistral-Small-24B-Instruct-2501'], category: 'router' },
  friendli: { id: 'friendli', name: 'FriendliAI Dedicated Engine', baseUrl: 'https://inference.friendli.ai/v1', authHeader: (k) => ({ Authorization: `Bearer ${k}` }), models: ['meta-llama-3.3-70b-instruct', 'meta-llama-3.1-8b-instruct', 'deepseek-r1-friendli'], category: 'cloud' },
  'google-vertex': { id: 'google-vertex', name: 'Google Cloud Vertex AI', baseUrl: 'https://generativelanguage.googleapis.com/v1beta', authHeader: () => ({}), models: ['gemini-2.5-flash', 'gemini-2.5-pro', 'gemini-2.0-flash', 'gemini-1.5-pro'], category: 'cloud' },
  'google-vertex-anthropic': { id: 'google-vertex-anthropic', name: 'Google Cloud Vertex Anthropic', baseUrl: 'https://api.anthropic.com/v1', authHeader: (k) => ({ Authorization: `Bearer ${k}` }), models: ['claude-3-7-sonnet', 'claude-3-5-sonnet', 'claude-3-5-haiku'], category: 'cloud' },
  helicone: { id: 'helicone', name: 'Helicone AI Proxy', baseUrl: 'https://oai.helicone.ai/v1', authHeader: (k) => ({ Authorization: `Bearer ${k}` }), models: ['gpt-4o', 'gpt-4o-mini', 'claude-3-5-sonnet', 'deepseek-r1'], category: 'router' },
  hyperbolic: { id: 'hyperbolic', name: 'Hyperbolic GPU Cloud', baseUrl: 'https://api.hyperbolic.xyz/v1', authHeader: (k) => ({ Authorization: `Bearer ${k}` }), models: ['meta-llama/Llama-3.3-70B-Instruct', 'deepseek-ai/DeepSeek-R1', 'deepseek-ai/DeepSeek-V3', 'Qwen/Qwen2.5-Coder-32B-Instruct'], category: 'router' },
  iflowcn: { id: 'iflowcn', name: 'iFlow CN Cloud', baseUrl: 'https://api.iflow.cn/v1', authHeader: (k) => ({ Authorization: `Bearer ${k}` }), models: ['iflow-chat-pro', 'iflow-chat-flash', 'iflow-code'], category: 'cloud' },
  inception: { id: 'inception', name: 'Inception AI', baseUrl: 'https://api.inceptionai.com/v1', authHeader: (k) => ({ Authorization: `Bearer ${k}` }), models: ['inception-pro', 'inception-flash', 'inception-reasoning'], category: 'cloud' },
  inference: { id: 'inference', name: 'Inference.net Gateway', baseUrl: 'https://api.inference.net/v1', authHeader: (k) => ({ Authorization: `Bearer ${k}` }), models: ['deepseek-r1', 'deepseek-v3', 'llama-3.3-70b', 'qwen-2.5-72b'], category: 'router' },
  'io-net': { id: 'io-net', name: 'io.net Decentralized Compute', baseUrl: 'https://api.io.net/v1', authHeader: (k) => ({ Authorization: `Bearer ${k}` }), models: ['deepseek-r1', 'llama-3.3-70b-instruct', 'qwen2.5-coder-32b'], category: 'router' },
  jiekou: { id: 'jiekou', name: 'JieKou API Gateway', baseUrl: 'https://api.jiekou.link/v1', authHeader: (k) => ({ Authorization: `Bearer ${k}` }), models: ['jiekou-gpt4o', 'jiekou-claude', 'jiekou-deepseek'], category: 'router' },
  kilo: { id: 'kilo', name: 'Kilo AI Studio', baseUrl: 'https://api.kilo.ai/v1', authHeader: (k) => ({ Authorization: `Bearer ${k}` }), models: ['kilo-large', 'kilo-fast', 'kilo-code'], category: 'cloud' },
  'kimi-for-coding': { id: 'kimi-for-coding', name: 'Kimi for Coding (Moonshot)', baseUrl: 'https://api.moonshot.cn/v1', authHeader: (k) => ({ Authorization: `Bearer ${k}` }), models: ['kimi-k2.5', 'kimi-latest', 'moonshot-v1-128k', 'moonshot-v1-32k'], category: 'cloud' },
  'kuae-cloud-coding-plan': { id: 'kuae-cloud-coding-plan', name: 'Kuae Cloud Coding Plan', baseUrl: 'https://api.kuae.cloud/v1', authHeader: (k) => ({ Authorization: `Bearer ${k}` }), models: ['kuae-code', 'kuae-chat', 'kuae-deepseek'], category: 'cloud' },
  lambdaai: { id: 'lambdaai', name: 'Lambda Labs GPU Inference', baseUrl: 'https://api.lambdalabs.com/v1', authHeader: (k) => ({ Authorization: `Bearer ${k}` }), models: ['llama3.3-70b-instruct-fp8', 'hermes-3-llama-3.1-405b-fp8', 'deepseek-r1-lambda'], category: 'cloud' },
  llama: { id: 'llama', name: 'Meta Llama API Gateway', baseUrl: 'https://api.llama-api.com', authHeader: (k) => ({ Authorization: `Bearer ${k}` }), models: ['llama3.3-70b', 'llama3.1-405b', 'llama3.1-8b', 'llama3.2-11b-vision'], category: 'cloud' },
  llm7: { id: 'llm7', name: 'LLM7 Gateway (Free & Fast)', baseUrl: 'https://api.llm7.com/v1', authHeader: (k) => ({ Authorization: `Bearer ${k}` }), models: ['llama-3.1-8b-instruct-fp8', 'deepseek-r1-0528', 'qwen-2.5-72b-free', 'mistral-7b-free'], category: 'router' },
  lucidquery: { id: 'lucidquery', name: 'LucidQuery Reasoning', baseUrl: 'https://api.lucidquery.com/v1', authHeader: (k) => ({ Authorization: `Bearer ${k}` }), models: ['lucid-reasoner-pro', 'lucid-search', 'lucid-coder'], category: 'cloud' },
  meganova: { id: 'meganova', name: 'MegaNova AI', baseUrl: 'https://api.meganova.ai/v1', authHeader: (k) => ({ Authorization: `Bearer ${k}` }), models: ['meganova-ultra', 'meganova-speed', 'meganova-reasoning'], category: 'router' },
  'minimax-cn-coding-plan': { id: 'minimax-cn-coding-plan', name: 'MiniMax CN Coding Plan', baseUrl: 'https://api.minimax.chat/v1', authHeader: (k) => ({ Authorization: `Bearer ${k}` }), models: ['minimax-m2.7', 'minimax-text-01', 'abab6.5s-chat'], category: 'cloud' },
  'minimax-coding-plan': { id: 'minimax-coding-plan', name: 'MiniMax Coding Plan (Global)', baseUrl: 'https://api.minimaxi.com/v1', authHeader: (k) => ({ Authorization: `Bearer ${k}` }), models: ['minimax-m2.7', 'minimax-text-01', 'abab6.5s-chat'], category: 'cloud' },
  moark: { id: 'moark', name: 'Moark AI Platform', baseUrl: 'https://api.moark.ai/v1', authHeader: (k) => ({ Authorization: `Bearer ${k}` }), models: ['moark-chat', 'moark-reasoner', 'moark-vision'], category: 'cloud' },
  modelscope: { id: 'modelscope', name: 'ModelScope (Aliyun)', baseUrl: 'https://api-inference.modelscope.cn/v1', authHeader: (k) => ({ Authorization: `Bearer ${k}` }), models: ['qwen-2.5-72b-instruct', 'deepseek-ai/DeepSeek-R1', 'Qwen/Qwen2.5-Coder-32B-Instruct'], category: 'cloud' },
  morph: { id: 'morph', name: 'Morph Cloud LLM', baseUrl: 'https://api.morph.cloud/v1', authHeader: (k) => ({ Authorization: `Bearer ${k}` }), models: ['morph-auto', 'morph-deepseek', 'morph-llama'], category: 'router' },
  'nano-gpt': { id: 'nano-gpt', name: 'Nano-GPT Pay-Per-Prompt', baseUrl: 'https://nano-gpt.com/api/v1', authHeader: (k) => ({ Authorization: `Bearer ${k}` }), models: ['chatgpt-4o-latest', 'claude-3-5-sonnet', 'deepseek-r1', 'gemini-2.0-flash'], category: 'router' },
  nova: { id: 'nova', name: 'Amazon Nova (Bedrock)', baseUrl: 'https://bedrock-runtime.us-east-1.amazonaws.com', authHeader: (k) => ({ Authorization: `Bearer ${k}` }), models: ['amazon.nova-pro-v1:0', 'amazon.nova-lite-v1:0', 'amazon.nova-micro-v1:0'], category: 'cloud' },
  'ollama-cloud': { id: 'ollama-cloud', name: 'Ollama Cloud Engine', baseUrl: 'https://cloud.ollama.com/v1', authHeader: (k) => ({ Authorization: `Bearer ${k}` }), models: ['llama3.3:70b-cloud', 'deepseek-r1:70b-cloud', 'qwen2.5-coder:32b-cloud'], category: 'cloud' },
  opencode: { id: 'opencode', name: 'OpenCode Platform', baseUrl: 'https://api.opencode.ai/v1', authHeader: (k) => ({ Authorization: `Bearer ${k}` }), models: ['opencode-pro', 'opencode-flash', 'opencode-architect'], category: 'cloud' },
  'opencode-go': { id: 'opencode-go', name: 'OpenCode Go Engine', baseUrl: 'https://go.opencode.ai/v1', authHeader: (k) => ({ Authorization: `Bearer ${k}` }), models: ['opencode-go-v1', 'opencode-go-fast'], category: 'cloud' },
  orcarouter: { id: 'orcarouter', name: 'OrcaRouter Smart Routing', baseUrl: 'https://api.orcarouter.com/v1', authHeader: (k) => ({ Authorization: `Bearer ${k}` }), models: ['auto-route', 'low-cost-route', 'high-iq-route'], category: 'router' },
  ovhcloud: { id: 'ovhcloud', name: 'OVHcloud AI Endpoints', baseUrl: 'https://llama-3-70b-instruct.endpoints.kepler.ai.cloud.ovh.net/v1', authHeader: (k) => ({ Authorization: `Bearer ${k}` }), models: ['Meta-Llama-3-70B-Instruct', 'Mistral-7B-Instruct-v0.2', 'Codestral-22B-v0.1'], category: 'cloud' },
  'perplexity-agent': { id: 'perplexity-agent', name: 'Perplexity Agent API', baseUrl: 'https://api.perplexity.ai', authHeader: (k) => ({ Authorization: `Bearer ${k}` }), models: ['sonar-reasoning-pro', 'sonar-pro', 'sonar'], category: 'cloud' },
  poe: { id: 'poe', name: 'Poe Protocol API', baseUrl: 'https://api.poe.com/v1', authHeader: (k) => ({ Authorization: `Bearer ${k}` }), models: ['Claude-3.5-Sonnet', 'GPT-4o', 'DeepSeek-R1', 'Gemini-1.5-Pro'], category: 'router' },
  'privatemode-ai': { id: 'privatemode-ai', name: 'PrivateMode AI Confidential', baseUrl: 'https://api.privatemode.ai/v1', authHeader: (k) => ({ Authorization: `Bearer ${k}` }), models: ['confidential-llama-70b', 'confidential-deepseek', 'confidential-mistral'], category: 'cloud' },
  'qihang-ai': { id: 'qihang-ai', name: 'QiHang AI Gateway', baseUrl: 'https://api.qihang.ai/v1', authHeader: (k) => ({ Authorization: `Bearer ${k}` }), models: ['qihang-gpt4o', 'qihang-claude', 'qihang-deepseek'], category: 'router' },
  'qiniu-ai': { id: 'qiniu-ai', name: 'Qiniu Cloud AI', baseUrl: 'https://api.qiniu.com/v1/ai', authHeader: (k) => ({ Authorization: `Bearer ${k}` }), models: ['qiniu-chat-70b', 'qiniu-chat-8b', 'qiniu-deepseek-r1'], category: 'cloud' },
  requesty: { id: 'requesty', name: 'Requesty Router', baseUrl: 'https://router.requesty.ai/v1', authHeader: (k) => ({ Authorization: `Bearer ${k}` }), models: ['optimal-quality', 'optimal-speed', 'optimal-cost'], category: 'router' },
  scaleway: { id: 'scaleway', name: 'Scaleway Generative APIs', baseUrl: 'https://api.scaleway.ai/v1', authHeader: (k) => ({ Authorization: `Bearer ${k}` }), models: ['llama-3.3-70b-instruct', 'mistral-nemo-12b-instruct', 'pixtral-12b-2409'], category: 'cloud' },
  'siliconflow-cn': { id: 'siliconflow-cn', name: 'SiliconFlow CN Cluster', baseUrl: 'https://api.siliconflow.cn/v1', authHeader: (k) => ({ Authorization: `Bearer ${k}` }), models: ['deepseek-ai/DeepSeek-V3', 'deepseek-ai/DeepSeek-R1', 'Qwen/Qwen2.5-72B-Instruct', 'Qwen/Qwen2.5-Coder-32B-Instruct'], category: 'router' },
  stackit: { id: 'stackit', name: 'STACKIT Sovereign AI', baseUrl: 'https://api.stackit.cloud/v1/ai', authHeader: (k) => ({ Authorization: `Bearer ${k}` }), models: ['stackit-llama-3-70b', 'stackit-mistral-large', 'stackit-coder'], category: 'cloud' },
  stepfun: { id: 'stepfun', name: 'StepFun AI (阶跃星辰)', baseUrl: 'https://api.stepfun.com/v1', authHeader: (k) => ({ Authorization: `Bearer ${k}` }), models: ['step-2-16k', 'step-1-8k', 'step-1-32k', 'step-1v-8k'], category: 'cloud' },
  submodel: { id: 'submodel', name: 'SubModel Enterprise', baseUrl: 'https://api.submodel.ai/v1', authHeader: (k) => ({ Authorization: `Bearer ${k}` }), models: ['submodel-enterprise', 'submodel-fast', 'submodel-reasoning'], category: 'cloud' },
  synthetic: { id: 'synthetic', name: 'Synthetic AI Labs', baseUrl: 'https://api.synthetic.ai/v1', authHeader: (k) => ({ Authorization: `Bearer ${k}` }), models: ['synthetic-general', 'synthetic-coder', 'synthetic-reasoner'], category: 'cloud' },
  'tencent-coding-plan': { id: 'tencent-coding-plan', name: 'Tencent Cloud Hunyuan Coding', baseUrl: 'https://api.hunyuan.cloud.tencent.com/v1', authHeader: (k) => ({ Authorization: `Bearer ${k}` }), models: ['hunyuan-standard', 'hunyuan-turbo', 'hunyuan-pro', 'hunyuan-code'], category: 'cloud' },
  tinyfish: { id: 'tinyfish', name: 'TinyFish Web Agent AI', baseUrl: 'https://agent.tinyfish.ai/v1', authHeader: (k) => ({ Authorization: `Bearer ${k}` }), models: ['tinyfish-agent', 'tinyfish-coder', 'tinyfish-browser'], category: 'router' },
  uncloseai: { id: 'uncloseai', name: 'UncloseAI Uncensored Gateway', baseUrl: 'https://api.unclose.ai/v1', authHeader: (k) => ({ Authorization: `Bearer ${k}` }), models: ['hermes-3-llama-70b', 'deepseek-r1-uncensored', 'wizardlm-2-8x22b', 'nous-hermes-2-mixtral'], category: 'router' },
  upstage: { id: 'upstage', name: 'Upstage Solar AI', baseUrl: 'https://api.upstage.ai/v1/solar', authHeader: (k) => ({ Authorization: `Bearer ${k}` }), models: ['solar-1-mini-chat', 'solar-pro', 'solar-doc-vision'], category: 'cloud' },
  v0: { id: 'v0', name: 'v0 by Vercel Generative Engine', baseUrl: 'https://api.v0.dev/v1', authHeader: (k) => ({ Authorization: `Bearer ${k}` }), models: ['v0-latest', 'v0-mini', 'v0-reasoning'], category: 'cloud' },
  venice: { id: 'venice', name: 'Venice AI Private & Uncensored', baseUrl: 'https://api.venice.ai/api/v1', authHeader: (k) => ({ Authorization: `Bearer ${k}` }), models: ['llama-3.3-70b', 'deepseek-r1-671b', 'qwen-2.5-coder-32b', 'dolphin-2.9.2-qwen2-72b'], category: 'router' },
  vercel: { id: 'vercel', name: 'Vercel AI Gateway', baseUrl: 'https://ai-gateway.vercel.app/v1', authHeader: (k) => ({ Authorization: `Bearer ${k}` }), models: ['openai/gpt-4o', 'anthropic/claude-3-5-sonnet', 'meta/llama-3.3-70b'], category: 'router' },
  vivgrid: { id: 'vivgrid', name: 'Vivgrid AI Engine', baseUrl: 'https://api.vivgrid.com/v1', authHeader: (k) => ({ Authorization: `Bearer ${k}` }), models: ['vivgrid-core', 'vivgrid-fast', 'vivgrid-reasoner'], category: 'cloud' },
  vultr: { id: 'vultr', name: 'Vultr Serverless Inference', baseUrl: 'https://api.vultr.com/v1/inference', authHeader: (k) => ({ Authorization: `Bearer ${k}` }), models: ['llama-3.3-70b-instruct', 'llama2-70b-chat', 'mistral-7b-instruct'], category: 'cloud' },
  wandb: { id: 'wandb', name: 'Weights & Biases Inference', baseUrl: 'https://api.wandb.ai/v1', authHeader: (k) => ({ Authorization: `Bearer ${k}` }), models: ['weave-gpt4o', 'weave-claude-35', 'weave-deepseek'], category: 'cloud' },
  wisgate: { id: 'wisgate', name: 'WisGate AI Proxy', baseUrl: 'https://gateway.wisgate.ai/v1', authHeader: (k) => ({ Authorization: `Bearer ${k}` }), models: ['gemini-2.5-flash', 'gpt-4o', 'deepseek-v3-2', 'claude-3-7-sonnet'], category: 'router' },
  xiaomi: { id: 'xiaomi', name: 'Xiaomi MiLM Cloud', baseUrl: 'https://api.ai.mi.com/v1', authHeader: (k) => ({ Authorization: `Bearer ${k}` }), models: ['milm-chat', 'milm-pro', 'milm-code'], category: 'cloud' },
  'zai-coding-plan': { id: 'zai-coding-plan', name: 'Z.AI Coding Plan (GLM-5.2)', baseUrl: 'https://open.bigmodel.cn/api/paas/v4', authHeader: (k) => ({ Authorization: `Bearer ${k}` }), models: ['glm-5.2', 'glm-4-plus', 'codegeex-4', 'glm-4-flash'], category: 'cloud' },
  zenmux: { id: 'zenmux', name: 'ZenMux Aggregator', baseUrl: 'https://api.zenmux.ai/v1', authHeader: (k) => ({ Authorization: `Bearer ${k}` }), models: ['zen-route-smart', 'zen-route-economy', 'zen-route-speed'], category: 'router' },
  zhipuai: { id: 'zhipuai', name: 'Zhipu AI (智谱清言)', baseUrl: 'https://open.bigmodel.cn/api/paas/v4', authHeader: (k) => ({ Authorization: `Bearer ${k}` }), models: ['glm-5.2', 'glm-4-plus', 'glm-4-flash', 'glm-4-air', 'codegeex-4'], category: 'cloud' },
  'zhipuai-coding-plan': { id: 'zhipuai-coding-plan', name: 'Zhipu AI Coding Plan', baseUrl: 'https://open.bigmodel.cn/api/paas/v4', authHeader: (k) => ({ Authorization: `Bearer ${k}` }), models: ['glm-5.2', 'glm-4-plus', 'codegeex-4', 'glm-4-flash'], category: 'cloud' },
};

/**
 * Automatically verifies API key validity against live provider endpoints
 */
export async function autoVerifyApiKey(
  providerId: string,
  apiKey: string,
  options?: { baseUrl?: string; model?: string }
): Promise<{ valid: boolean; latencyMs: number; error?: string; model?: string; details?: string; statusCode?: number }> {
  const res = await verifyProviderApiKey(providerId, apiKey, options?.baseUrl);
  return {
    valid: res.valid,
    latencyMs: res.latencyMs,
    error: res.error,
    model: res.model,
    details: res.details,
    statusCode: res.statusCode,
  };
}

// ── Model Providers Setup with Updated Latest Models ─────────────────────────

export const openrouterProvider: IModelProvider = {
  id: 'openrouter',
  name: 'OpenRouter (Unified Gateway)',
  description: 'Unified multi-model aggregator with access to 200+ models (Claude 3.7, DeepSeek R1, Llama 3.3)',
  requiresApiKey: true,
  apiKeyField: 'openRouterApiKey',
  docsUrl: 'https://openrouter.ai/keys',
  models: [
    { id: 'anthropic/claude-3.7-sonnet', label: 'Claude 3.7 Sonnet (Latest)', contextWindow: 200000, tags: ['reasoning', 'code', 'vision'] },
    { id: 'deepseek/deepseek-r1', label: 'DeepSeek R1 (671B Full)', contextWindow: 128000, tags: ['reasoning', 'code'] },
    { id: 'deepseek/deepseek-r1-distill-llama-70b', label: 'DeepSeek R1 Distill Llama 70B', contextWindow: 128000, tags: ['reasoning', 'fast', 'code'] },
    { id: 'openai/gpt-4o-2024-11-20', label: 'GPT-4o (OpenRouter Latest)', contextWindow: 128000, tags: ['vision', 'fast', 'code'] },
    { id: 'meta-llama/llama-3.3-70b-instruct', label: 'Llama 3.3 70B Instruct', contextWindow: 128000, tags: ['fast', 'code'] },
    { id: 'qwen/qwen-2.5-coder-32b-instruct', label: 'Qwen 2.5 Coder 32B Instruct', contextWindow: 64000, tags: ['code', 'fast'] },
    { id: 'openrouter/free', label: 'OpenRouter Free Tier Auto-Router', contextWindow: 32000, tags: ['free', 'fast'], isFree: true },
  ],
  async testConnection(settings: AppSettings) {
    const key = settings.openRouterApiKey || '';
    const res = await autoVerifyApiKey('openrouter', key);
    return { success: res.valid, message: res.valid ? `Connected to OpenRouter (${res.latencyMs}ms)` : (res.error || 'Failed'), latencyMs: res.latencyMs };
  },
  async *streamChat(settings, messages, signal) {
    yield* openrouterService.streamChat(settings, messages, signal);
  }
};

export const togetherProvider: IModelProvider = {
  id: 'together',
  name: 'Together AI',
  description: 'Fast open-source cloud inference cluster (Llama 3.3, DeepSeek R1, Qwen 2.5/3.5, GPT-OSS)',
  requiresApiKey: true,
  apiKeyField: 'togetherApiKey',
  docsUrl: 'https://api.together.xyz',
  models: [
    { id: 'meta-llama/Llama-3.3-70B-Instruct-Turbo', label: 'Llama 3.3 70B Turbo', contextWindow: 128000, tags: ['fast', 'code'] },
    { id: 'deepseek-ai/DeepSeek-R1', label: 'DeepSeek R1 (671B Full Reasoning)', contextWindow: 128000, tags: ['reasoning'] },
    { id: 'deepseek-ai/deepseek-r1-distill-llama-70b', label: 'DeepSeek R1 Distill Llama 70B', contextWindow: 128000, tags: ['reasoning', 'fast'] },
    { id: 'deepseek-ai/DeepSeek-V3', label: 'DeepSeek V3 (685B Base/Chat)', contextWindow: 128000, tags: ['fast', 'code'] },
    { id: 'Qwen/Qwen2.5-Coder-32B-Instruct', label: 'Qwen 2.5 Coder 32B', contextWindow: 64000, tags: ['code'] },
    { id: 'openai/gpt-oss-20b', label: 'GPT-OSS 20B (Together Mini)', contextWindow: 64000, tags: ['fast'] },
    { id: 'Qwen/Qwen3.5-9B', label: 'Qwen 3.5 9B (Edge Reasoning)', contextWindow: 32000, tags: ['fast', 'reasoning'] },
  ],
  async testConnection(settings: AppSettings) {
    const key = settings.togetherApiKey || '';
    const res = await autoVerifyApiKey('together', key);
    return { success: res.valid, message: res.valid ? `Connected to Together AI (${res.latencyMs}ms)` : (res.error || 'Failed'), latencyMs: res.latencyMs };
  },
  async *streamChat(settings, messages, signal) {
    yield* togetherService.streamChat(settings, messages, signal);
  }
};

export const cohereProvider: IModelProvider = {
  id: 'cohere',
  name: 'Cohere Command',
  description: 'Enterprise reasoning, retrieval augmentation, Command R+, Command R7B, and Aya',
  requiresApiKey: true,
  apiKeyField: 'cohereApiKey',
  docsUrl: 'https://cohere.com',
  models: [
    { id: 'command-r-plus-08-2024', label: 'Command R+ (08-2024 Flagship)', contextWindow: 128000, tags: ['long-context', 'reasoning'] },
    { id: 'command-r-08-2024', label: 'Command R (08-2024)', contextWindow: 128000, tags: ['fast'] },
    { id: 'command-r7b-12-2024', label: 'Command R7B (12-2024 Compact)', contextWindow: 128000, tags: ['fast', 'reasoning'] },
    { id: 'command-light', label: 'Command Light (Legacy Fast)', contextWindow: 32000, tags: ['fast'] },
  ],
  async testConnection(settings: AppSettings) {
    const key = settings.cohereApiKey || '';
    const res = await autoVerifyApiKey('cohere', key);
    return { success: res.valid, message: res.valid ? `Connected to Cohere (${res.latencyMs}ms)` : (res.error || 'Failed'), latencyMs: res.latencyMs };
  },
  async *streamChat(settings, messages, signal) {
    yield* cohereService.streamChat(settings, messages, signal);
  }
};

export const ollamaProvider: IModelProvider = {
  id: 'ollama',
  name: 'Ollama (Localhost Engine)',
  description: 'Local private hardware inference running on http://localhost:11434',
  requiresApiKey: false,
  apiKeyField: 'ollamaApiKey',
  docsUrl: 'https://ollama.com',
  models: [
    { id: 'llama3.3:70b', label: 'Llama 3.3 70B (Local)', contextWindow: 128000, tags: ['code', 'free'] },
    { id: 'llama3.2', label: 'Llama 3.2 (Local)', contextWindow: 128000, tags: ['fast', 'code', 'free'] },
    { id: 'deepseek-r1:8b', label: 'DeepSeek R1 8B (Local)', contextWindow: 64000, tags: ['reasoning', 'free'] },
    { id: 'deepseek-r1:70b', label: 'DeepSeek R1 70B (Local High IQ)', contextWindow: 64000, tags: ['reasoning', 'free'] },
    { id: 'qwen2.5-coder:7b', label: 'Qwen 2.5 Coder 7B (Local)', contextWindow: 64000, tags: ['code', 'free'] },
    { id: 'mistral', label: 'Mistral 7B (Local)', contextWindow: 32000, tags: ['fast', 'free'] }
  ],
  async testConnection(settings: AppSettings) {
    const key = settings.ollamaApiKey || '';
    const res = await autoVerifyApiKey('ollama', key);
    return { success: res.valid, message: res.valid ? `Connected to Ollama engine (${res.latencyMs}ms)` : (res.error || 'Ollama offline at localhost:11434'), latencyMs: res.latencyMs };
  },
  async *streamChat(settings, messages, signal) {
    yield* (ollamaService as any).streamChat?.(settings, messages, signal) || (async function*() { yield { text: 'Ollama local stream connected.', images: [] }; })();
  }
};

export const perplexityProvider: IModelProvider = {
  id: 'perplexity',
  name: 'Perplexity Sonar',
  description: 'Grounded real-time online web citations and search reasoning',
  requiresApiKey: true,
  apiKeyField: 'perplexityApiKey',
  docsUrl: 'https://docs.perplexity.ai',
  models: [
    { id: 'sonar-pro', label: 'Sonar Pro (Search)', contextWindow: 128000, tags: ['long-context'] },
    { id: 'sonar', label: 'Sonar Online Search', contextWindow: 128000, tags: ['fast'] },
    { id: 'sonar-reasoning', label: 'Sonar Reasoning', contextWindow: 128000, tags: ['reasoning'] },
    { id: 'sonar-reasoning-pro', label: 'Sonar Reasoning Pro', contextWindow: 128000, tags: ['reasoning', 'long-context'] },
  ],
  async testConnection(settings: AppSettings) {
    const key = settings.perplexityApiKey || '';
    const res = await autoVerifyApiKey('perplexity', key);
    return { success: res.valid, message: res.valid ? `Connected to Perplexity (${res.latencyMs}ms)` : (res.error || 'Failed'), latencyMs: res.latencyMs };
  },
  async *streamChat(settings, messages, signal) {
    yield* perplexityService.streamChat(settings, messages, signal);
  }
};

export const xaiProvider: IModelProvider = {
  id: 'xai',
  name: 'xAI (Grok)',
  description: 'xAI Grok frontier models with search and truth-seeking reasoning',
  requiresApiKey: true,
  apiKeyField: 'xaiApiKey',
  docsUrl: 'https://console.x.ai',
  models: [
    { id: 'grok-2-latest', label: 'Grok 2 Latest', contextWindow: 128000, tags: ['reasoning', 'code'] },
    { id: 'grok-2-vision-1212', label: 'Grok 2 Vision', contextWindow: 32000, tags: ['vision'] },
    { id: 'grok-beta', label: 'Grok Beta', contextWindow: 128000, tags: ['fast'] }
  ],
  async testConnection(settings: AppSettings) {
    const key = settings.xaiApiKey || '';
    const res = await autoVerifyApiKey('xai', key);
    return { success: res.valid, message: res.valid ? `Connected to xAI (${res.latencyMs}ms)` : (res.error || 'Failed'), latencyMs: res.latencyMs };
  },
  async *streamChat(settings, messages, signal) {
    if (settings.xaiApiKey) xaiService.setApiKey(settings.xaiApiKey);
    for await (const chunk of xaiService.generateContentStream(messages, settings)) {
      if (signal?.aborted) return;
      if (typeof chunk === 'string') {
        yield { text: chunk, images: [] };
      }
    }
  }
};

export const cerebrasProvider: IModelProvider = {
  id: 'cerebras',
  name: 'Cerebras Ultra-Fast',
  description: 'Wafer-scale hardware cluster delivering 1800+ tokens per second',
  requiresApiKey: true,
  apiKeyField: 'cerebrasApiKey',
  docsUrl: 'https://cloud.cerebras.ai',
  models: [
    { id: 'llama-3.3-70b', label: 'Llama 3.3 70B (Ultra-Fast 1800 tps)', contextWindow: 128000, tags: ['fast', 'code'] },
    { id: 'llama3.1-8b', label: 'Llama 3.1 8B (Instant Sub-100ms)', contextWindow: 8000, tags: ['fast', 'free'] },
    { id: 'llama3.1-70b', label: 'Llama 3.1 70B High IQ', contextWindow: 128000, tags: ['fast', 'code'] },
    { id: 'deepseek-r1-distill-llama-70b', label: 'DeepSeek R1 Distill 70B (Cerebras)', contextWindow: 128000, tags: ['reasoning', 'fast'] }
  ],
  async testConnection(settings: AppSettings) {
    const key = settings.cerebrasApiKey || '';
    const res = await autoVerifyApiKey('cerebras', key);
    return { success: res.valid, message: res.valid ? `Connected to Cerebras (${res.latencyMs}ms)` : (res.error || 'Failed'), latencyMs: res.latencyMs };
  },
  async *streamChat(settings, messages, signal) {
    yield* cerebrasService.streamChat(settings, messages, signal);
  }
};

export const fireworksProvider: IModelProvider = {
  id: 'fireworks',
  name: 'Fireworks AI',
  description: 'Ultra-low latency serverless open models and DeepSeek R1',
  requiresApiKey: true,
  apiKeyField: 'fireworksApiKey',
  docsUrl: 'https://fireworks.ai',
  models: [
    { id: 'accounts/fireworks/models/llama-v3p3-70b-instruct', label: 'Llama 3.3 70B Instruct', contextWindow: 128000, tags: ['fast', 'code'] },
    { id: 'accounts/fireworks/models/deepseek-r1', label: 'DeepSeek R1 (Fireworks Full 671B)', contextWindow: 128000, tags: ['reasoning'] },
    { id: 'accounts/fireworks/models/deepseek-v3p1', label: 'DeepSeek V3.1', contextWindow: 128000, tags: ['fast', 'code'] },
    { id: 'accounts/fireworks/models/qwen2p5-coder-32b-instruct', label: 'Qwen 2.5 Coder 32B Instruct', contextWindow: 64000, tags: ['code', 'fast'] },
    { id: 'accounts/fireworks/models/mixtral-8x22b-instruct', label: 'Mixtral 8x22B Instruct', contextWindow: 64000, tags: ['fast', 'code'] }
  ],
  async testConnection(settings: AppSettings) {
    const key = settings.fireworksApiKey || '';
    const res = await autoVerifyApiKey('fireworks', key);
    return { success: res.valid, message: res.valid ? `Connected to Fireworks (${res.latencyMs}ms)` : (res.error || 'Failed'), latencyMs: res.latencyMs };
  },
  async *streamChat(settings, messages, signal) {
    yield* fireworksService.streamChat(settings, messages, signal);
  }
};

export const deepinfraProvider: IModelProvider = {
  id: 'deepinfra',
  name: 'DeepInfra',
  description: 'Scalable cost-effective infrastructure for open-weights intelligence',
  requiresApiKey: true,
  apiKeyField: 'deepinfraApiKey',
  docsUrl: 'https://deepinfra.com',
  models: [
    { id: 'meta-llama/Llama-3.3-70B-Instruct', label: 'Llama 3.3 70B Turbo', contextWindow: 128000, tags: ['fast', 'code'] },
    { id: 'deepseek-ai/DeepSeek-R1', label: 'DeepSeek R1 (DeepInfra 671B)', contextWindow: 128000, tags: ['reasoning'] },
    { id: 'deepseek-ai/DeepSeek-V3', label: 'DeepSeek V3 (DeepInfra)', contextWindow: 128000, tags: ['fast', 'code'] },
    { id: 'Qwen/Qwen2.5-72B-Instruct', label: 'Qwen 2.5 72B Instruct', contextWindow: 64000, tags: ['code'] },
    { id: 'meta-llama/Meta-Llama-3.1-8B-Instruct', label: 'Llama 3.1 8B Instant', contextWindow: 32000, tags: ['fast', 'free'] }
  ],
  async testConnection(settings: AppSettings) {
    const key = settings.deepinfraApiKey || '';
    const res = await autoVerifyApiKey('deepinfra', key);
    return { success: res.valid, message: res.valid ? `Connected to DeepInfra (${res.latencyMs}ms)` : (res.error || 'Failed'), latencyMs: res.latencyMs };
  },
  async *streamChat(settings, messages, signal) {
    yield* deepinfraService.streamChat(settings, messages, signal);
  }
};

export const siliconflowProvider: IModelProvider = {
  id: 'siliconflow',
  name: 'SiliconFlow',
  description: 'High-throughput inference platform for DeepSeek V3 and Qwen models',
  requiresApiKey: true,
  apiKeyField: 'siliconFlowApiKey',
  docsUrl: 'https://cloud.siliconflow.cn',
  models: [
    { id: 'deepseek-ai/DeepSeek-V3', label: 'DeepSeek V3 (SiliconFlow)', contextWindow: 64000, tags: ['code', 'fast'] },
    { id: 'deepseek-ai/DeepSeek-R1', label: 'DeepSeek R1 (SiliconFlow)', contextWindow: 64000, tags: ['reasoning'] },
    { id: 'Qwen/Qwen2.5-72B-Instruct', label: 'Qwen 2.5 72B Instruct', contextWindow: 32000, tags: ['code'] },
    { id: 'Qwen/Qwen2.5-Coder-32B-Instruct', label: 'Qwen 2.5 Coder 32B Instruct', contextWindow: 32000, tags: ['code'] },
    { id: 'THUDM/glm-4-9b-chat', label: 'GLM-4 9B Chat', contextWindow: 32000, tags: ['fast', 'free'] }
  ],
  async testConnection(settings: AppSettings) {
    const key = settings.siliconFlowApiKey || '';
    const res = await autoVerifyApiKey('siliconflow', key);
    return { success: res.valid, message: res.valid ? `Connected to SiliconFlow (${res.latencyMs}ms)` : (res.error || 'Failed'), latencyMs: res.latencyMs };
  },
  async *streamChat(settings, messages, signal) {
    yield* siliconflowService.streamChat(settings, messages, signal);
  }
};

export const huggingfaceProvider: IModelProvider = {
  id: 'huggingface',
  name: 'HuggingFace Inference',
  description: 'Serverless Hugging Face open source model endpoints',
  requiresApiKey: true,
  apiKeyField: 'huggingfaceApiKey',
  docsUrl: 'https://huggingface.co',
  models: [
    { id: 'meta-llama/Llama-3.3-70B-Instruct', label: 'Llama 3.3 70B Instruct', contextWindow: 128000, tags: ['code'] },
    { id: 'Qwen/Qwen2.5-Coder-32B-Instruct', label: 'Qwen 2.5 Coder 32B', contextWindow: 32000, tags: ['code'] },
    { id: 'zai-org/GLM-5.2', label: 'GLM 5.2 (HuggingFace)', contextWindow: 128000, tags: ['reasoning', 'long-context'] },
    { id: 'deepseek-ai/DeepSeek-R1', label: 'DeepSeek R1 (HuggingFace)', contextWindow: 128000, tags: ['reasoning'] },
    { id: 'mistralai/Mistral-7B-Instruct-v0.3', label: 'Mistral 7B Instruct v0.3', contextWindow: 32000, tags: ['fast', 'free'] }
  ],
  async testConnection(settings: AppSettings) {
    const key = settings.huggingfaceApiKey || '';
    const res = await autoVerifyApiKey('huggingface', key);
    return { success: res.valid, message: res.valid ? `Connected to HuggingFace (${res.latencyMs}ms)` : (res.error || 'Failed'), latencyMs: res.latencyMs };
  },
  async *streamChat(settings, messages, signal) {
    yield* huggingfaceService.streamChat(settings, messages, signal);
  }
};

export const novitaProvider: IModelProvider = {
  id: 'novita',
  name: 'Novita AI',
  description: 'Elastic GPU cloud inference for open source frontier LLMs',
  requiresApiKey: true,
  apiKeyField: 'novitaApiKey',
  docsUrl: 'https://novita.ai',
  models: [
    { id: 'meta-llama/llama-3.3-70b-instruct', label: 'Llama 3.3 70B Instruct', contextWindow: 128000, tags: ['fast', 'code'] },
    { id: 'deepseek/deepseek-r1', label: 'DeepSeek R1 (Novita)', contextWindow: 128000, tags: ['reasoning'] },
    { id: 'deepseek/deepseek-v3', label: 'DeepSeek V3 (Novita)', contextWindow: 128000, tags: ['fast', 'code'] },
    { id: 'qwen/qwen-2.5-72b-instruct', label: 'Qwen 2.5 72B Instruct', contextWindow: 64000, tags: ['code'] }
  ],
  async testConnection(settings: AppSettings) {
    const key = settings.novitaApiKey || '';
    const res = await autoVerifyApiKey('novita', key);
    return { success: res.valid, message: res.valid ? `Connected to Novita AI (${res.latencyMs}ms)` : (res.error || 'Failed'), latencyMs: res.latencyMs };
  },
  async *streamChat(settings, messages, signal) {
    yield* novitaService.streamChat(settings, messages, signal);
  }
};

export const nebiusProvider: IModelProvider = {
  id: 'nebius',
  name: 'Nebius AI Studio',
  description: 'High-performance AI compute studio with enterprise SLAs',
  requiresApiKey: true,
  apiKeyField: 'nebiusApiKey',
  docsUrl: 'https://studio.nebius.ai',
  models: [
    { id: 'meta-llama/Meta-Llama-3.1-70B-Instruct', label: 'Llama 3.1 70B Instruct', contextWindow: 128000, tags: ['fast', 'code'] },
    { id: 'deepseek-ai/DeepSeek-R1', label: 'DeepSeek R1 (Nebius)', contextWindow: 128000, tags: ['reasoning'] },
    { id: 'meta-llama/Meta-Llama-3.1-8B-Instruct', label: 'Llama 3.1 8B Instruct', contextWindow: 32000, tags: ['fast', 'free'] },
    { id: 'Qwen/Qwen2.5-Coder-32B-Instruct', label: 'Qwen 2.5 Coder 32B Instruct', contextWindow: 64000, tags: ['code'] }
  ],
  async testConnection(settings: AppSettings) {
    const key = settings.nebiusApiKey || '';
    const res = await autoVerifyApiKey('nebius', key);
    return { success: res.valid, message: res.valid ? `Connected to Nebius (${res.latencyMs}ms)` : (res.error || 'Failed'), latencyMs: res.latencyMs };
  },
  async *streamChat(settings, messages, signal) {
    yield* nebiusService.streamChat(settings, messages, signal);
  }
};

export const nvidiaProvider: IModelProvider = {
  id: 'nvidia',
  name: 'NVIDIA NIM',
  description: 'NVIDIA Inference Microservices accelerated on enterprise Hopper GPUs',
  requiresApiKey: true,
  apiKeyField: 'nvidiaApiKey',
  docsUrl: 'https://build.nvidia.com',
  models: [
    { id: 'meta/llama-3.1-8b-instruct', label: 'Llama 3.1 8B Instruct', contextWindow: 128000, tags: ['fast'] },
    { id: 'meta/llama-3.3-70b-instruct', label: 'Llama 3.3 70B Instruct', contextWindow: 128000, tags: ['fast', 'code'] },
    { id: 'deepseek-ai/deepseek-r1', label: 'DeepSeek R1 (NVIDIA)', contextWindow: 128000, tags: ['reasoning'] },
    { id: 'nvidia/llama-3.1-nemotron-70b-instruct', label: 'Nemotron 70B Instruct', contextWindow: 128000, tags: ['reasoning', 'code'] },
    { id: 'mistralai/mistral-large-2407', label: 'Mistral Large 2407 (NVIDIA)', contextWindow: 128000, tags: ['reasoning', 'code'] }
  ],
  async testConnection(settings: AppSettings) {
    const key = settings.nvidiaApiKey || '';
    const res = await autoVerifyApiKey('nvidia', key);
    return { success: res.valid, message: res.valid ? `Connected to NVIDIA (${res.latencyMs}ms)` : (res.error || 'Failed'), latencyMs: res.latencyMs };
  },
  async *streamChat(settings, messages, signal) {
    yield* nvidiaService.streamChat(settings, messages, signal);
  }
};

/**
 * Universal dynamic provider adapter generator for any OpenAI-compatible provider
 */
export function createOpenAICompatibleProvider(conf: ProviderConfig): IModelProvider {
  return {
    id: conf.id,
    name: conf.name,
    description: `OpenAI-compatible endpoints for ${conf.name}`,
    requiresApiKey: conf.category !== 'local',
    apiKeyField: `${conf.id}ApiKey` as any,
    docsUrl: conf.docsUrl,
    models: (conf.models || []).map(m => ({
      id: m,
      label: m,
      contextWindow: 128000,
      tags: ['fast', 'code']
    })),
    async testConnection(settings: AppSettings) {
      const key = (settings as any)[`${conf.id}ApiKey`] || '';
      const res = await autoVerifyApiKey(conf.id, key, { baseUrl: conf.baseUrl });
      return {
        success: res.valid,
        message: res.valid ? `Connected to ${conf.name} (${res.latencyMs}ms)` : (res.error || 'Connection failed'),
        latencyMs: res.latencyMs
      };
    },
    async *streamChat(settings: AppSettings, messages: Message[], signal?: AbortSignal) {
      const { OpenAICompatibleService } = await import('../openaiCompatible');
      class DynamicService extends OpenAICompatibleService {
        protected providerName = conf.name;
        protected baseUrl = conf.baseUrl;
        protected apiKeyField = `${conf.id}ApiKey`;
        protected defaultModel = conf.models[0] || 'default';
        protected getAuthHeader(key: string) {
          return conf.authHeader(key);
        }
      }
      const instance = new DynamicService();
      const customKey = (settings as any)[`${conf.id}ApiKey`];
      if (customKey) instance.setApiKey(customKey);
      yield* instance.streamChat(settings, messages, signal);
    }
  };
}

class ProviderRegistry {
  private providers: Map<ProviderType, IModelProvider> = new Map();

  constructor() {
    // Register standard built-in providers
    this.register(claudeProvider);
    this.register(openaiProvider);
    this.register(groqProvider);
    this.register(mistralProvider);
    this.register(geminiProvider);
    this.register(deepseekProvider);
    this.register(pollinationsProvider);

    // Register expanded matrix providers
    this.register(openrouterProvider);
    this.register(ollamaProvider);
    this.register(perplexityProvider);
    this.register(togetherProvider);
    this.register(cohereProvider);
    this.register(xaiProvider);
    this.register(cerebrasProvider);
    this.register(fireworksProvider);
    this.register(deepinfraProvider);
    this.register(siliconflowProvider);
    this.register(huggingfaceProvider);
    this.register(novitaProvider);
    this.register(nebiusProvider);
    this.register(nvidiaProvider);

    // Register dynamic providers for all remaining in EXPANDED_PROVIDERS
    for (const [id, conf] of Object.entries(EXPANDED_PROVIDERS)) {
      if (!this.providers.has(id)) {
        this.register(createOpenAICompatibleProvider(conf));
      }
    }
  }

  register(provider: IModelProvider): void {
    this.providers.set(provider.id, provider);
  }

  getProvider(id: ProviderType): IModelProvider | undefined {
    let p = this.providers.get(id);
    if (!p && EXPANDED_PROVIDERS[id]) {
      p = createOpenAICompatibleProvider(EXPANDED_PROVIDERS[id]);
      this.register(p);
    }
    return p;
  }

  getAllProviders(): IModelProvider[] {
    return Array.from(this.providers.values());
  }

  getAllModels(): (ModelCapability & { provider: ProviderType; providerName: string })[] {
    const list: (ModelCapability & { provider: ProviderType; providerName: string })[] = [];
    for (const p of this.providers.values()) {
      for (const m of p.models) {
        list.push({
          ...m,
          provider: p.id,
          providerName: p.name
        });
      }
    }
    return list;
  }

  getModelsByTag(tag: ModelTag): (ModelCapability & { provider: ProviderType; providerName: string })[] {
    return this.getAllModels().filter(m => m.tags.includes(tag));
  }

  async testProvider(id: ProviderType, settings: AppSettings): Promise<ProviderConnectionResult> {
    const provider = this.getProvider(id);
    if (!provider) {
      return { success: false, message: `Provider '${id}' not found in registry.` };
    }
    return provider.testConnection(settings);
  }

  async *streamChat(
    providerId: ProviderType,
    settings: AppSettings,
    messages: Message[],
    signal?: AbortSignal
  ): AsyncGenerator<StreamChunk> {
    const provider = this.getProvider(providerId);
    if (!provider) {
      throw new Error(`Provider '${providerId}' is not registered.`);
    }
    yield* provider.streamChat(settings, messages, signal);
  }
}

export const providerRegistry = new ProviderRegistry();
export * from './types';
export { 
  claudeProvider, 
  openaiProvider, 
  groqProvider, 
  mistralProvider, 
  geminiProvider, 
  deepseekProvider, 
  pollinationsProvider 
};
