import { AppSettings, Message } from '../types';
import { getEffectiveSystemInstruction } from '../utils/promptUtils';

function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

export interface StreamYield {
  text: string;
  images: string[];
  video?: string;
  audio?: string;
  sources?: { title: string; url: string }[];
}

export abstract class OpenAICompatibleService {
  protected apiKey: string = '';
  protected abstract readonly providerName: string;
  protected abstract readonly baseUrl: string;
  protected abstract readonly apiKeyField: string;
  protected abstract readonly defaultModel: string;

  setApiKey(key: string) {
    this.apiKey = key;
    if (typeof window !== 'undefined') {
      localStorage.setItem(this.apiKeyField, key);
    }
  }

  getApiKey(): string {
    return this.apiKey || (typeof window !== 'undefined' ? localStorage.getItem(this.apiKeyField) : '') || '';
  }

  protected getChatCompletionsUrl(): string {
    return this.baseUrl + '/chat/completions';
  }

  protected getModelsUrl(): string {
    return this.baseUrl + '/models';
  }

  protected getAuthHeader(key: string): Record<string, string> {
    return { 'Authorization': `Bearer ${key}` };
  }

  async verifyApiKey(key: string): Promise<boolean> {
    if (!key) return false;
    try {
      const response = await fetch(this.getModelsUrl(), {
        headers: this.getAuthHeader(key)
      });
      if (response.ok) return true;

      // Fallback: try a minimal chat completion
      const chatResponse = await fetch(this.getChatCompletionsUrl(), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...this.getAuthHeader(key)
        },
        body: JSON.stringify({
          model: this.defaultModel,
          messages: [{ role: 'user', content: 'hi' }],
          max_tokens: 1,
          stream: false
        })
      });
      return chatResponse.ok || chatResponse.status === 200 || chatResponse.status === 400;
    } catch {
      return false;
    }
  }

  protected buildRequestBody(
    settings: AppSettings,
    apiMessages: any[],
    tools?: any[]
  ): any {
    const body: any = {
      model: settings.model || this.defaultModel,
      messages: apiMessages,
      temperature: settings.temperature ?? 0.7,
      stream: false,
      top_p: settings.topP ?? 1.0,
      ...(settings.maxTokens ? { max_tokens: settings.maxTokens } : {}),
      ...(settings.presencePenalty ? { presence_penalty: settings.presencePenalty } : {}),
      ...(settings.frequencyPenalty ? { frequency_penalty: settings.frequencyPenalty } : {})
    };
    if (tools && tools.length > 0) {
      body.tools = tools;
      body.tool_choice = 'auto';
    }
    return body;
  }

  /**
   * Synchronous standard request-response handler for all OpenAI-compatible providers
   */
  async generateChat(
    settings: AppSettings,
    messages: Message[],
    signal?: AbortSignal
  ): Promise<StreamYield> {
    const lastMessage = messages[messages.length - 1];
    const prompt = lastMessage?.content || '';

    // Media command delegation to pollinations
    if (prompt.toLowerCase().startsWith('/image ')) {
      return this.delegateMedia('image', prompt.substring(7).trim(), settings, signal);
    }
    if (prompt.toLowerCase().startsWith('/video ')) {
      return this.delegateMedia('video', prompt.substring(7).trim(), settings, signal);
    }
    if (prompt.toLowerCase().startsWith('/audio ')) {
      return this.delegateMedia('audio', prompt.substring(7).trim(), settings, signal);
    }

    const key = this.getApiKey();
    if (!key && !this.baseUrl.includes('localhost') && !this.baseUrl.includes('127.0.0.1')) {
      throw new Error(`${this.providerName} API key not configured`);
    }

    // Token budget management
    const maxTokenBudget = 8000;
    const responseBudget = 2000;
    const tokenBudget = maxTokenBudget - responseBudget;
    let usedTokens = 0;

    let systemPrompt = getEffectiveSystemInstruction(settings, messages);
    if (systemPrompt && estimateTokens(systemPrompt) > 1500) {
      systemPrompt = systemPrompt.substring(0, 4000) + '\n[System prompt truncated for token limit]';
    }
    usedTokens += estimateTokens(systemPrompt);

    const apiMessages: any[] = [];
    if (systemPrompt.trim()) {
      apiMessages.push({ role: 'system', content: systemPrompt });
    }

    const lastMsg = messages[messages.length - 1];
    const lastMsgFormatted = {
      role: lastMsg.role === 'model' ? 'assistant' : lastMsg.role,
      content: lastMsg.content
    };
    usedTokens += estimateTokens(lastMsg.content);

    const historyMessages: Array<any> = [];
    for (let i = messages.length - 2; i >= 0; i--) {
      const msg = messages[i];
      const msgTokens = estimateTokens(msg.content);
      if (usedTokens + msgTokens > tokenBudget) break;
      historyMessages.unshift({
        role: msg.role === 'model' ? 'assistant' : msg.role,
        content: msg.content
      });
      usedTokens += msgTokens;
    }

    apiMessages.push(...historyMessages, lastMsgFormatted);

    const { getDynamicTools } = await import('./tools');
    const dynamicTools = await getDynamicTools(settings);

    const requestBody = this.buildRequestBody(settings, apiMessages, dynamicTools.length > 0 ? dynamicTools : undefined);
    const url = this.getChatCompletionsUrl();
    let accumulatedText = '';
    let toolSources: { title: string; url: string }[] = [];
    const MAX_TURNS = 5;
    let currentApiMessages = [...apiMessages];

    for (let turn = 0; turn < MAX_TURNS; turn++) {
      if (signal?.aborted) {
        throw new Error('Generation cancelled by user');
      }

      const attachedCount = settings.attachedMessagesCount || 8;
      let recentMsgs = currentApiMessages.slice(-attachedCount);

      while (recentMsgs.length > 0 &&
        (recentMsgs[0].role === 'tool' || (recentMsgs[0].role === 'assistant' && recentMsgs[0].tool_calls))) {
        recentMsgs.shift();
      }

      const systemMsg = currentApiMessages.find((m: any) => m.role === 'system');
      const prunedMessages = systemMsg ? [systemMsg, ...recentMsgs.filter((m: any) => m !== systemMsg)] : recentMsgs;

      const response = await fetch(url, {
        signal,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...this.getAuthHeader(key)
        },
        body: JSON.stringify({ ...requestBody, messages: prunedMessages, stream: false })
      });

      if (!response.ok) {
        let errorText = await response.text();
        try {
          const jsonError = JSON.parse(errorText);
          if (jsonError.error?.message) errorText = jsonError.error.message;
        } catch {}
        throw new Error(`${this.providerName} Error ${response.status}: ${errorText || response.statusText}`);
      }

      const data = await response.json();
      const choice = data.choices?.[0];
      const assistantMsg = choice?.message;

      if (!assistantMsg) {
        throw new Error(`${this.providerName} returned empty response.`);
      }

      // Handle tool calls
      if (assistantMsg.tool_calls && assistantMsg.tool_calls.length > 0) {
        const { executeToolCall } = await import('./tools');
        const { getToolExecutingString, validateAndFixToolArgs } = await import('../utils/toolHelpers');

        currentApiMessages.push(assistantMsg);

        for (const tc of assistantMsg.tool_calls) {
          const toolName = tc.function?.name || '';
          const toolArgsStr = tc.function?.arguments || '{}';
          const execStr = getToolExecutingString(toolName);

          accumulatedText += (assistantMsg.content ? assistantMsg.content + '\n' : '') + `${execStr}\n`;

          const toolResultData = await executeToolCall({
            id: tc.id || 'call_' + Math.random().toString(36).substring(7),
            type: 'function',
            function: { name: toolName, arguments: validateAndFixToolArgs(toolArgsStr, toolName) }
          });

          let parsedResult: any;
          try {
            parsedResult = JSON.parse(toolResultData);
            if (Array.isArray(parsedResult)) parsedResult = { results: parsedResult };
            if (parsedResult.sources) toolSources = [...toolSources, ...parsedResult.sources];
          } catch {
            parsedResult = { content: toolResultData };
          }

          currentApiMessages.push({
            role: 'tool',
            tool_call_id: tc.id,
            name: toolName,
            content: typeof parsedResult === 'string' ? parsedResult : JSON.stringify(parsedResult)
          });
        }
        continue;
      }

      // Normal response complete
      const finalContent = assistantMsg.content || '';
      accumulatedText += finalContent;
      return {
        text: accumulatedText,
        images: [],
        sources: toolSources
      };
    }

    return {
      text: accumulatedText || 'No response generated.',
      images: [],
      sources: toolSources
    };
  }

  async *streamChat(
    settings: AppSettings,
    messages: Message[],
    signal?: AbortSignal
  ): AsyncGenerator<StreamYield> {
    const result = await this.generateChat(settings, messages, signal);
    yield result;
  }

  private async delegateMedia(
    type: 'image' | 'video' | 'audio',
    prompt: string,
    settings: AppSettings,
    signal?: AbortSignal
  ): Promise<StreamYield> {
    const { pollinationsService } = await import('./pollinations');
    if (settings.pollinationsApiKey) {
      pollinationsService.setApiKey(settings.pollinationsApiKey);
    }
    const msgs: Message[] = [{
      role: 'user',
      content: `/${type} ${prompt}`,
      timestamp: Date.now(),
      images: []
    }];
    return pollinationsService.generateChat(settings, msgs, signal);
  }
}

export class GenericOpenAIProviderService extends OpenAICompatibleService {
  protected providerName: string;
  protected baseUrl: string;
  protected apiKeyField: string;
  protected defaultModel: string;
  protected customAuthHeader?: (key: string) => Record<string, string>;

  constructor(options: {
    providerName: string;
    baseUrl: string;
    apiKeyField?: string;
    defaultModel?: string;
    authHeader?: (key: string) => Record<string, string>;
  }) {
    super();
    this.providerName = options.providerName;
    this.baseUrl = options.baseUrl.replace(/\/+$/, '');
    this.apiKeyField = options.apiKeyField || `${options.providerName.toLowerCase().replace(/[^a-z0-9]/g, '')}ApiKey`;
    this.defaultModel = options.defaultModel || 'gpt-4o';
    this.customAuthHeader = options.authHeader;
  }

  protected override getAuthHeader(key: string): Record<string, string> {
    if (this.customAuthHeader) return this.customAuthHeader(key);
    if (!key) return {};
    return { Authorization: `Bearer ${key.trim()}` };
  }
}

export function createOpenAICompatibleService(options: {
  providerName: string;
  baseUrl: string;
  apiKeyField?: string;
  defaultModel?: string;
  authHeader?: (key: string) => Record<string, string>;
}): GenericOpenAIProviderService {
  return new GenericOpenAIProviderService(options);
}
