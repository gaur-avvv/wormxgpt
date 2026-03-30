import { AppSettings, Message, ToolInvocation } from '../types';

export const ollamaService = {
  apiKey: '',
  host: 'http://localhost:11434',

  setApiKey(key: string) {
    this.apiKey = key;
  },

  setHost(host: string) {
    this.host = host || 'http://localhost:11434';
  },

  async verifyApiKey(key: string): Promise<boolean> {
    try {
      const baseUrl = this.host || 'http://localhost:11434';
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (key) {
        headers['Authorization'] = `Bearer ${key}`;
      }
      const response = await fetch(`${baseUrl}/api/tags`, {
        method: 'GET',
        headers
      });
      return response.ok;
    } catch {
      return false;
    }
  },

  _getBaseUrl(settings: AppSettings) {
    const useLocalhost = settings.ollamaUseLocalhost === true;
    const cloudBase = '/ollama-cloud';
    const localBase = '/ollama-local';

    return settings.ollamaHost?.trim()
      ? settings.ollamaHost.trim()
      : useLocalhost ? localBase : cloudBase;
  },

  _getHeaders(settings: AppSettings, apiKey?: string) {
    const isCloud = !settings.ollamaUseLocalhost;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (isCloud && (apiKey || settings.ollamaApiKey)) {
      headers['Authorization'] = `Bearer ${apiKey || settings.ollamaApiKey}`;
    }
    return headers;
  },

  async webSearch(settings: AppSettings, query: string, max_results: number = 5): Promise<any> {
    const baseUrl = this._getBaseUrl(settings);
    const headers = this._getHeaders(settings);
    const r = await fetch(`${baseUrl}/api/web_search`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ query, max_results })
    });
    return r.json();
  },

  async webFetch(settings: AppSettings, url: string): Promise<any> {
    const baseUrl = this._getBaseUrl(settings);
    const headers = this._getHeaders(settings);
    const r = await fetch(`${baseUrl}/api/web_fetch`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ url })
    });
    return r.json();
  },

  async *streamChat(
    settings: AppSettings,
    messages: Message[],
    signal?: AbortSignal,
    onToolCall?: (tool_calls: any[]) => void
  ): AsyncGenerator<{ text: string; thinking?: string; images: string[] }> {
    if (signal?.aborted) return;

    const baseUrl = this._getBaseUrl(settings);
    const apiKey = settings.ollamaApiKey || this.apiKey;

    const { pruneHistory } = await import('../utils/tokenManager');
    const { getDynamicTools } = await import('./tools');
    const dynamicTools = await getDynamicTools(settings);

    // Prune history to avoid context overflow (Ollama works best with ~32k context for agents)
    const prunedMessages = pruneHistory(
      messages, 
      settings.systemInstruction, 
      settings.maxTokens || 32000, 
      4000
    );

    const formattedMessages = prunedMessages.map(m => ({
      role: m.role === 'model' ? 'assistant' : 'user',
      content: m.content,
      images: m.images?.map(img => img.split(',')[1] || img)
    }));

    const headers = this._getHeaders(settings, apiKey);

    try {
      const response = await fetch(`${baseUrl}/api/chat`, {
        method: 'POST',
        headers,
        signal,
        body: JSON.stringify({
          model: settings.model.replace('-cloud', '').replace(':cloud', ''),
          messages: formattedMessages,
          stream: true,
          think: true,
          tools: dynamicTools.length > 0 ? dynamicTools.map((t: any) => ({
            type: 'function',
            function: t.function
          })) : undefined,
          options: {
            temperature: settings.temperature,
            top_p: settings.topP,
            num_ctx: settings.thinkingBudget || 32000,
          }
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Ollama Error (${response.status}): ${errorText || response.statusText}`);
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error('Response body is null');

      const decoder = new TextDecoder();
      let buffer = '';
      let accumulatedText = '';
      let accumulatedThinking = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (!line.trim()) continue;
          try {
            const data = JSON.parse(line);
            
            if (data.message?.thinking) {
              accumulatedThinking += data.message.thinking;
              yield { text: accumulatedText, thinking: accumulatedThinking, images: [] };
            }
            
            if (data.message?.content) {
              accumulatedText += data.message.content;
              yield { text: accumulatedText, thinking: accumulatedThinking, images: [] };
            }

            if (data.message?.tool_calls) {
              onToolCall?.(data.message.tool_calls);
            }
          } catch (e) {
            console.error('Error parsing Ollama stream chunk:', e, line);
          }
        }
      }
    } catch (error: any) {
      if (error.name === 'AbortError') return;
      console.error('Ollama stream error:', error);
      yield {
        text: `[SYSTEM ERROR] Ollama Connection Severed: ${error.message}`,
        images: []
      };
    }
  }
};
