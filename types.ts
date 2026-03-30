declare module '@google/adk';

export interface Message {
  role: 'user' | 'model';
  content: string;
  thinking?: string;
  timestamp: number;
  images?: string[];
  video?: string;
  audio?: string;
  sources?: { title: string; url: string }[];
  toolInvocations?: ToolInvocation[];
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
  aiProvider: 'gemini' | 'groq' | 'pollinations' | 'cerebras' | 'siliconflow' | 'together' | 'openrouter' | 'openai' | 'anthropic' | 'deepseek' | 'mistral' | 'perplexity' | 'xai' | 'moonshot' | 'ollama' | 'cohere' | 'wisgate' | 'nvidia' | 'fireworks' | 'sambanova' | 'hyperbolic' | 'huggingface' | 'replicate' | 'azure' | 'bedrock' | 'vertexai' | 'cloudflare' | 'deepinfra' | 'novita' | 'featherless' | 'lambdaai' | 'nebius';
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
}
