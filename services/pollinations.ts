import { AppSettings, Message } from '../types';
import { getEffectiveSystemInstruction } from '../utils/promptUtils';

// Simple token estimation (roughly 1 token per 4 characters)
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

export class PollinationsService {
  private apiKey: string = '';
  private baseUrl = 'https://gen.pollinations.ai';
  private fallbackTextUrl = 'https://text.pollinations.ai';

  private readonly TOKEN_LIMIT = 8000;
  private readonly RESPONSE_BUDGET = 2000;

  setApiKey(key: string) {
    this.apiKey = key;
  }

  async verifyApiKey(key: string): Promise<boolean> {
    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (key) {
        headers['Authorization'] = `Bearer ${key}`;
      }
      const response = await fetch(this.baseUrl + '/v1/chat/completions', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          model: 'openai',
          messages: [{ role: 'user', content: 'ping' }],
          max_tokens: 1,
          stream: false
        })
      });
      return response.ok || response.status === 200 || response.status === 400;
    } catch {
      return true; // Pollinations is public free tier
    }
  }

  /**
   * Synchronous standard request-response chat generation
   */
  async generateChat(
    settings: AppSettings,
    messages: Message[],
    signal?: AbortSignal
  ): Promise<StreamYield> {
    const lastMessage = messages[messages.length - 1];
    const prompt = lastMessage?.content || '';

    // Check media commands
    if (prompt.toLowerCase().startsWith('/image ')) {
      const imagePrompt = prompt.substring(7).trim();
      return this.generateImage(imagePrompt, settings, signal);
    }

    if (prompt.toLowerCase().startsWith('/video ')) {
      const videoPrompt = prompt.substring(7).trim();
      return this.generateVideo(videoPrompt, settings, signal);
    }

    if (prompt.toLowerCase().startsWith('/audio ')) {
      const audioPrompt = prompt.substring(7).trim();
      return this.generateAudio(audioPrompt, settings, signal);
    }

    // Direct synchronous text generation
    return this.generateText(settings, messages, undefined, signal);
  }

  /**
   * Backward-compatible generator wrapper
   */
  async *streamChat(
    settings: AppSettings, 
    messages: Message[], 
    signal?: AbortSignal
  ): AsyncGenerator<StreamYield> {
    const result = await this.generateChat(settings, messages, signal);
    yield result;
  }

  private async generateText(
    settings: AppSettings, 
    messages: Message[], 
    forceTools?: any[], 
    signal?: AbortSignal
  ): Promise<StreamYield> {
    const maxTokens = this.TOKEN_LIMIT;
    const tokenBudget = maxTokens - this.RESPONSE_BUDGET;
    let usedTokens = 0;

    let systemInstruction = getEffectiveSystemInstruction(settings, messages);
    if (systemInstruction && estimateTokens(systemInstruction) > 1500) {
      systemInstruction = systemInstruction.substring(0, 4000) + '\n[System prompt truncated for token limit]';
    }
    usedTokens += estimateTokens(systemInstruction);

    const openAIMessages: Array<any> = [];
    if (systemInstruction.trim()) {
      openAIMessages.push({
        role: 'system',
        content: systemInstruction
      });
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

    openAIMessages.push(...historyMessages, lastMsgFormatted);

    // Map model cleanly to a Pollinations compatible model name
    let model = (settings.model || 'openai').toLowerCase();
    if (model.includes('deepseek')) model = 'deepseek';
    else if (model.includes('claude')) model = 'claude';
    else if (model.includes('mistral')) model = 'mistral';
    else if (model.includes('qwen')) model = 'qwen-coder';
    else model = 'openai';

    const { getDynamicTools } = await import('./tools');
    const dynamicTools = forceTools || (await getDynamicTools(settings));

    let toolSources: { title: string; url: string }[] = [];
    let accumulatedText = '';
    const MAX_TURNS = 4;

    for (let turn = 0; turn < MAX_TURNS; turn++) {
      if (signal?.aborted) {
        throw new Error('Generation cancelled by user.');
      }

      // 1. Try public text endpoint first via POST JSON (most stable and fast)
      try {
        const postResp = await fetch(this.fallbackTextUrl, {
          signal,
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            messages: openAIMessages,
            model,
            seed: Math.floor(Math.random() * 1000000),
            json: false
          })
        });

        if (postResp.ok) {
          const textResult = await postResp.text();
          if (textResult && textResult.trim()) {
            return {
              text: accumulatedText ? `${accumulatedText}\n${textResult}` : textResult,
              images: [],
              sources: toolSources
            };
          }
        }
      } catch (err: any) {
        if (err.name === 'AbortError') throw err;
        console.warn('Pollinations JSON POST failed, attempting alternate route...', err);
      }

      // 2. Try gen.pollinations.ai /v1/chat/completions if API key or standard endpoint
      try {
        const headers: Record<string, string> = { 'Content-Type': 'application/json' };
        if (this.apiKey) {
          headers['Authorization'] = `Bearer ${this.apiKey}`;
        }

        const compResp = await fetch(this.baseUrl + '/v1/chat/completions', {
          signal,
          method: 'POST',
          headers,
          body: JSON.stringify({
            model,
            messages: openAIMessages,
            temperature: settings.temperature ?? 0.7,
            stream: false,
            ...(dynamicTools.length > 0 ? { tools: dynamicTools, tool_choice: 'auto' } : {})
          })
        });

        if (compResp.ok) {
          const data = await compResp.json();
          const assistantMsg = data.choices?.[0]?.message;
          if (assistantMsg) {
            // Handle tool calls if any
            if (assistantMsg.tool_calls && assistantMsg.tool_calls.length > 0) {
              const { executeToolCall } = await import('./tools');
              const { getToolExecutingString, validateAndFixToolArgs } = await import('../utils/toolHelpers');

              openAIMessages.push(assistantMsg);

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

                openAIMessages.push({
                  role: 'tool',
                  tool_call_id: tc.id,
                  name: toolName,
                  content: typeof parsedResult === 'string' ? parsedResult : JSON.stringify(parsedResult)
                });
              }
              continue;
            }

            const finalContent = assistantMsg.content || '';
            return {
              text: accumulatedText ? `${accumulatedText}\n${finalContent}` : finalContent,
              images: [],
              sources: toolSources
            };
          }
        }
      } catch (err: any) {
        if (err.name === 'AbortError') throw err;
        console.warn('Pollinations completions API failed, trying direct text GET...', err);
      }

      // 3. Last fallback: Direct GET query
      try {
        const lastUserContent = lastMsg.content || 'hi';
        const getUrl = `${this.fallbackTextUrl}/${encodeURIComponent(lastUserContent)}?model=${encodeURIComponent(model)}`;
        const getResp = await fetch(getUrl, { signal });
        if (getResp.ok) {
          const textResult = await getResp.text();
          if (textResult) {
            return {
              text: accumulatedText ? `${accumulatedText}\n${textResult}` : textResult,
              images: [],
              sources: toolSources
            };
          }
        }
      } catch (err: any) {
        if (err.name === 'AbortError') throw err;
      }

      // If all attempts failed on this turn
      throw new Error('Pollinations service temporarily unavailable.');
    }

    return {
      text: accumulatedText || 'No response generated.',
      images: [],
      sources: toolSources
    };
  }

  private async generateImage(prompt: string, settings: AppSettings, signal?: AbortSignal): Promise<StreamYield> {
    if (signal?.aborted) throw new Error('Generation cancelled');
    const model = settings.model || 'flux';
    const seed = Math.floor(Math.random() * 1000000);
    const params = new URLSearchParams({
      model,
      width: '1024',
      height: '1024',
      nologo: 'true',
      seed: seed.toString()
    });

    if (this.apiKey) {
      params.append('key', this.apiKey);
    }

    const imageUrl = `${this.baseUrl}/prompt/${encodeURIComponent(prompt)}?${params.toString()}`;

    return {
      text: `Image generated successfully:\n\n**Prompt:** ${prompt}\n**Model:** ${model}\n**Seed:** ${seed}`,
      images: [imageUrl]
    };
  }

  private async generateVideo(prompt: string, settings: AppSettings, signal?: AbortSignal): Promise<StreamYield> {
    if (signal?.aborted) throw new Error('Generation cancelled');

    let model = settings.model || 'veo';
    const validVideoModels = ['veo', 'seedance', 'seedance-pro', 'wan', 'grok-video', 'ltx-2', 'p-video'];
    if (!validVideoModels.includes(model)) model = 'veo';

    const seed = Math.floor(Math.random() * 1000000);
    const params = new URLSearchParams({
      model,
      width: '1024',
      height: '1024',
      duration: '4',
      nologo: 'true',
      seed: seed.toString()
    });

    if (this.apiKey) {
      params.append('key', this.apiKey);
    }

    const videoUrl = `https://gen.pollinations.ai/video/${encodeURIComponent(prompt)}?${params.toString()}`;

    return {
      text: `Video generated successfully:\n\n**Prompt:** ${prompt}\n**Model:** ${model}\n**Duration:** 4s`,
      images: [],
      video: videoUrl
    };
  }

  private async generateAudio(prompt: string, settings: AppSettings, signal?: AbortSignal): Promise<StreamYield> {
    if (signal?.aborted) throw new Error('Generation cancelled');
    const voice = 'nova';
    const params = new URLSearchParams({ voice });

    if (this.apiKey) {
      params.append('key', this.apiKey);
    }

    const audioUrl = `https://gen.pollinations.ai/audio/${encodeURIComponent(prompt)}?${params.toString()}`;

    return {
      text: `Audio generated successfully:\n\n**Prompt:** ${prompt}\n**Voice:** ${voice}`,
      images: [],
      audio: audioUrl
    };
  }
}

export const pollinationsService = new PollinationsService();
