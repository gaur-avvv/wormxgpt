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

  _getEffectiveHost(settings?: AppSettings): string {
    if (settings?.ollamaHost?.trim()) {
      return settings.ollamaHost.trim().replace(/\/+$/, '');
    }
    return this.host.replace(/\/+$/, '');
  },

  _getHeaders(settings: AppSettings, apiKey?: string) {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    const key = apiKey || settings.ollamaApiKey;
    if (key) {
      headers['Authorization'] = `Bearer ${key}`;
    }
    return headers;
  },

  async verifyApiKey(key: string, settings?: AppSettings): Promise<boolean> {
    try {
      const host = this._getEffectiveHost(settings);
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (key) {
        headers['Authorization'] = `Bearer ${key}`;
      }
      const response = await fetch(`${host}/api/tags`, {
        method: 'GET',
        headers,
      });
      return response.ok;
    } catch {
      return false;
    }
  },

  async listModels(settings?: AppSettings): Promise<string[]> {
    try {
      const host = this._getEffectiveHost(settings);
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      const apiKey = settings?.ollamaApiKey || this.apiKey;
      if (apiKey) {
        headers['Authorization'] = `Bearer ${apiKey}`;
      }
      const response = await fetch(`${host}/api/tags`, {
        method: 'GET',
        headers,
      });
      if (!response.ok) return [];
      const data = await response.json();
      return (data.models || []).map((m: any) => m.name || m.model);
    } catch {
      return [];
    }
  },

  async webSearch(settings: AppSettings, query: string, max_results: number = 5): Promise<any> {
    const host = this._getEffectiveHost(settings);
    const headers = this._getHeaders(settings);
    const r = await fetch(`${host}/api/web_search`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ query, max_results })
    });
    return r.json();
  },

  async webFetch(settings: AppSettings, url: string): Promise<any> {
    const host = this._getEffectiveHost(settings);
    const headers = this._getHeaders(settings);
    const r = await fetch(`${host}/api/web_fetch`, {
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

    const host = this._getEffectiveHost(settings);
    const apiKey = settings.ollamaApiKey || this.apiKey;

    const { pruneHistory } = await import('../utils/tokenManager');
    const { getDynamicTools } = await import('./tools');
    const dynamicTools = await getDynamicTools(settings);

    // Use contextWindow for history pruning, responseBudget for generation
    const contextWindow = settings.maxContextTokens || 32000;
    const responseBudget = settings.maxTokens || 4000;

    // Prune history to avoid context overflow
    const prunedMessages = pruneHistory(
      messages, 
      settings.systemInstruction, 
      contextWindow, 
      responseBudget
    );

    const formattedMessages: any[] = [];

    // Add system instruction as first message
    if (settings.systemInstruction && (settings.injectSystemPrompts ?? true)) {
      formattedMessages.push({
        role: 'system',
        content: settings.systemInstruction
      });
    }

    // Add conversation history
    for (const m of prunedMessages) {
      formattedMessages.push({
        role: m.role === 'model' ? 'assistant' : 'user',
        content: m.content,
        images: m.images?.filter(img => img && img.startsWith('data:')).map(img => {
          const base64Part = img.split(',')[1];
          return base64Part || img;
        })
      });
    }

    const headers = this._getHeaders(settings, apiKey);

    // Clean model name - remove any cloud suffixes
    const modelName = settings.model.replace('-cloud', '').replace(':cloud', '');

    try {
      const response = await fetch(`${host}/api/chat`, {
        method: 'POST',
        headers,
        signal,
        body: JSON.stringify({
          model: modelName,
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
            num_ctx: contextWindow,
            num_predict: responseBudget,
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
            // Handle error responses from Ollama
            if (data.error) {
              throw new Error(data.error);
            }
          } catch (e: any) {
            if (e.message && !e.message.includes('JSON')) {
              throw e; // Re-throw actual Ollama errors
            }
            console.error('Error parsing Ollama stream chunk:', e, line);
          }
        }
      }

      // Process any remaining buffer
      if (buffer.trim()) {
        try {
          const data = JSON.parse(buffer);
          if (data.message?.content) {
            accumulatedText += data.message.content;
            yield { text: accumulatedText, thinking: accumulatedThinking, images: [] };
          }
          if (data.error) {
            throw new Error(data.error);
          }
        } catch (e: any) {
          if (e.message && !e.message.includes('JSON')) {
            throw e;
          }
        }
      }
    } catch (error: any) {
      if (error.name === 'AbortError') return;
      console.error('Ollama stream error:', error);
      
      let errorMsg = error.message || 'Unknown error';
      
      // Provide helpful error messages for common issues
      if (errorMsg.includes('Failed to fetch') || errorMsg.includes('NetworkError') || errorMsg.includes('ERR_CONNECTION_REFUSED')) {
        errorMsg = `Cannot connect to Ollama at ${host}. Make sure Ollama is running and accessible.\n\n` +
          `To start Ollama:\n` +
          `• Local: Run \`ollama serve\` in your terminal\n` +
          `• Remote: Check the host URL in Settings → Provider → Ollama\n` +
          `• CORS: Set OLLAMA_ORIGINS="*" environment variable`;
      } else if (errorMsg.includes('model') && errorMsg.includes('not found')) {
        errorMsg = `Model "${settings.model}" not found. Pull it first with: \`ollama pull ${settings.model}\``;
      }
      
      yield {
        text: `[SYSTEM ERROR] Ollama Connection Severed: ${errorMsg}`,
        images: []
      };
    }
  }
};
