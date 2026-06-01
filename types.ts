declare module '@google/adk';

// ── Shared Provider Type ─────────────────────────────────────────────────────
export type ProviderType =
  | 'gemini' | 'groq' | 'pollinations' | 'cerebras' | 'siliconflow'
  | 'together' | 'openrouter' | 'openai' | 'anthropic' | 'deepseek'
  | 'mistral' | 'perplexity' | 'xai' | 'moonshot' | 'ollama'
  | 'cohere' | 'wisgate' | 'nvidia' | 'fireworks' | 'sambanova'
  | 'hyperbolic' | 'huggingface' | 'replicate' | 'azure' | 'bedrock'
  | 'vertexai' | 'cloudflare' | 'deepinfra' | 'novita' | 'featherless'
  | 'lambdaai' | 'nebius' | 'tinyfish';

// ── Stream Response ──────────────────────────────────────────────────────────
export interface StreamChunk {
  text: string;
  images: string[];
  video?: string;
  audio?: string;
  sources?: { title: string; url: string }[];
}

// ── Provider Health Stats ────────────────────────────────────────────────────
export interface ProviderHealthStats {
  provider: ProviderType;
  totalCalls: number;
  successCalls: number;
  failedCalls: number;
  avgLatencyMs: number;
  lastLatencyMs: number;
  lastError?: string;
  lastErrorAt?: number;
  isHealthy: boolean;
  isFree: boolean;
}

// ── Multi-Agent / Sub-Agent Types ────────────────────────────────────────────
export interface AgentConfig {
  id: string;
  name: string;
  role: string;
  provider: ProviderType;
  model: string;
  systemPrompt: string;
  tools?: string[];
  parentId?: string;
}

export interface AgentTask {
  id: string;
  agentId: string;
  prompt: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  result?: string;
  error?: string;
  startedAt?: number;
  completedAt?: number;
  subTasks?: AgentTask[];
}

export interface AgentOrchestrationConfig {
  enabled: boolean;
  maxAgents: number;
  maxDepth: number;
  timeout: number;
  agents: AgentConfig[];
}

// ── Core Types ───────────────────────────────────────────────────────────────

export interface Message {
  role: 'user' | 'model' | 'assistant' | 'tool';
  content: string;
  thinking?: string;
  timestamp: number;
  images?: string[];
  video?: string;
  audio?: string;
  sources?: { title: string; url: string }[];
  toolInvocations?: ToolInvocation[];
  agentId?: string;
}

export interface ToolInvocation {
  state: 'call' | 'result';
  toolCallId: string;
  toolName: string;
  args: any;
  result?: any;
}

export interface ChatSession {
  id: string;
  messages: Message[];
  title: string;
}

export interface AppSettings {
  thinkingEnabled?: boolean;
  temperature: number;
  model: string;
  systemInstruction: string;
  thinkingBudget: number;
  geminiApiKey?: string;
  groqApiKey?: string;
  pollinationsApiKey?: string;
  cerebrasApiKey?: string;
  siliconFlowApiKey?: string;
  togetherApiKey?: string;
  openRouterApiKey?: string;
  openaiApiKey?: string;
  anthropicApiKey?: string;
  deepseekApiKey?: string;
  mistralApiKey?: string;
  perplexityApiKey?: string;
  xaiApiKey?: string;
  aiProvider: ProviderType;
  enabledTools?: string[];
  mcpServerUrls?: string[];
  mcpEnabled?: boolean;
  topP?: number;
  maxTokens?: number;
  presencePenalty?: number;
  frequencyPenalty?: number;
  injectSystemPrompts?: boolean;
  inputTemplate?: string;
  attachedMessagesCount?: number;
  historyCompressionThreshold?: number;
  memoryPrompt?: boolean;
  moonshotApiKey?: string;
  ollamaApiKey?: string;
  ollamaHost?: string;
  ollamaUseLocalhost?: boolean;
  cohereApiKey?: string;
  wisGateApiKey?: string;
  wisGateHost?: string;
  // New providers
  nvidiaApiKey?: string;
  fireworksApiKey?: string;
  sambanovaApiKey?: string;
  hyperbolicApiKey?: string;
  huggingfaceApiKey?: string;
  replicateApiKey?: string;
  azureApiKey?: string;
  azureEndpoint?: string;
  bedrockAccessKey?: string;
  bedrockSecretKey?: string;
  bedrockRegion?: string;
  vertexaiProjectId?: string;
  vertexaiLocation?: string;
  cloudflareAccountId?: string;
  cloudflareApiKey?: string;
  deepinfraApiKey?: string;
  novitaApiKey?: string;
  featherlessApiKey?: string;
  lambdaaiApiKey?: string;
  nebiusApiKey?: string;
  witAiServerToken?: string;
  tavilyApiKey?: string;
  braveApiKey?: string;
  kagiApiKey?: string;
  mojeekApiKey?: string;
  serperApiKey?: string;
  serpapiApiKey?: string;
  firecrawlApiKey?: string;
  tinyfishApiKey?: string;
  // Advanced Model Parameters
  topK?: number;
  minP?: number;
  topA?: number;
  typicalP?: number;
  repetitionPenalty?: number;
  seed?: number;
  mirostat?: number;
  mirostatTau?: number;
  mirostatEta?: number;
  stopSequences?: string[];
  logitBias?: Record<string, number>;
  // Prompt Injection
  customPromptPrefix?: string;
  customPromptSuffix?: string;
  injectInUserMessage?: boolean;
  promptVariables?: Record<string, string>;
  // Model-specific overrides
  modelOverrides?: Record<string, Partial<AppSettings>>;
  // Reasoning parameters
  reasoningEffort?: 'low' | 'medium' | 'high';
  verbosity?: 'low' | 'medium' | 'high';
  // Token Usage Optimization
  useTokenOptimization?: boolean;
  maxContextTokens?: number;
  compressionThreshold?: number;
  // Prompt Injection Control
  promptInjectionEnabled?: boolean;
  promptInjectionMode?: 'always' | 'once' | 'manual';
  injectedPrompts?: string[];
  lastInjectedPrompt?: string;
  // Auto-Fallback & Free Model Selection
  autoFallback?: boolean;
  autoSelectFreeModel?: boolean;
  fallbackChain?: ProviderType[];
  // Multi-Agent Orchestration
  multiAgentEnabled?: boolean;
  multiAgentConfig?: AgentOrchestrationConfig;
  // App Integrations
  githubToken?: string;
  gmailApiKey?: string;
  slackBotToken?: string;
  discordBotToken?: string;
  telegramBotToken?: string;
  whatsappToken?: string;
  whatsappPhoneNumberId?: string;
  teamsWebhookUrl?: string;
  googleCalendarApiKey?: string;
  googleDriveApiKey?: string;
  trelloApiKey?: string;
  trelloToken?: string;
  linkedinToken?: string;
  spotifyToken?: string;
  connectedApps?: string[];
  // Supabase OAuth
  supabaseAnonKey?: string;
  // Cache settings
  cacheEnabled?: boolean;
  redisUrl?: string;
  redisToken?: string;
  // A2A (Agent-to-Agent) Protocol
  a2aEnabled?: boolean;
  a2aAgentUrls?: string[];
  // Prompt Caching
  promptCachingEnabled?: boolean;
  promptCacheTTL?: number; // seconds, default 3600
}
