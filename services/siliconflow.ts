import { AppSettings, Message } from '../types';
import { pruneHistory } from '../utils/tokenManager';
import { validateAndFixToolArgs } from '../utils/toolHelpers';

function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

class SiliconFlowService {
  private apiKey: string = '';
  private baseUrl = 'https://api.siliconflow.com/v1';

  constructor() {
    const saved = typeof window !== 'undefined' ? localStorage.getItem('siliconFlowApiKey') : null;
    if (saved) {
      this.apiKey = saved;
    }
  }

  setApiKey(key: string) {
    this.apiKey = key;
    if (typeof window !== 'undefined') {
      localStorage.setItem('siliconFlowApiKey', key);
    }
  }

  getApiKey(): string {
    return this.apiKey || (typeof window !== 'undefined' ? localStorage.getItem('siliconFlowApiKey') : '') || '';
  }

  async verifyApiKey(key: string): Promise<boolean> {
    try {
      const response = await fetch(this.baseUrl + '/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + key
        },
        body: JSON.stringify({
          model: 'deepseek-ai/DeepSeek-V3',
          messages: [{ role: 'user', content: 'Hello' }],
          max_tokens: 1,
          stream: false
        })
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  async *streamChat(settings: AppSettings, messages: Message[], signal?: AbortSignal): AsyncGenerator<{ text: string; images: string[]; video?: string; audio?: string; sources?: { title: string; url: string }[] }> {
    if (signal?.aborted) return;
    const key = this.getApiKey();
    if (!key) {
      throw new Error('SiliconFlow API key not configured');
    }

    const maxTokens = 4000;
    const responseBudget = 1500;
    const tokenBudget = maxTokens - responseBudget;
    let usedTokens = 0;

    let systemInstruction = settings.systemInstruction || '';
    if (estimateTokens(systemInstruction) > 1000) {
      systemInstruction = systemInstruction.substring(0, 4000);
    }
    usedTokens += estimateTokens(systemInstruction);

    const apiMessages: any[] = [];
    if (systemInstruction) {
      apiMessages.push({ role: 'system', content: systemInstruction });
    }

    const lastMsg = messages[messages.length - 1];
    const lastMsgFormatted = {
      role: lastMsg.role === 'model' ? 'assistant' : lastMsg.role,
      content: lastMsg.content
    };
    usedTokens += estimateTokens(lastMsg.content);

    const historyMessages: Array<{ role: string; content: string }> = [];
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

    const requestBody: any = {
      model: settings.model || 'deepseek-ai/DeepSeek-V3',
      messages: apiMessages,
      temperature: settings.temperature,
      stream: true,
      ...(settings.maxTokens ? { max_tokens: settings.maxTokens } : {}),
      top_p: settings.topP ?? 1.0,
    };

    // Attach tools if configured dynamically via MCP or local selection
    const { getDynamicTools } = await import('./tools');
    const dynamicTools = await getDynamicTools(settings);
    if (dynamicTools.length > 0) {
      requestBody.tools = dynamicTools;
    }

    const url = this.baseUrl + '/chat/completions';
    let accumulatedText = '';
    let toolSources: { title: string; url: string }[] = [];
    const MAX_TURNS = 10;
    const decoder = new TextDecoder();

    try {
      for (let turn = 0; turn < MAX_TURNS; turn++) {
        if (signal?.aborted) return;

        // Context Pruning: Keep system message + last N messages from the *current* apiMessages
        const attachedCount = settings.attachedMessagesCount || 8;
        let recentMsgs = apiMessages.slice(-attachedCount);
        
        // Ensure we don't start with a 'tool' role or a 'assistant' role that is just tool_calls
        // without the associated prompt.
        while (recentMsgs.length > 0 && 
              (recentMsgs[0].role === 'tool' || (recentMsgs[0].role === 'assistant' && recentMsgs[0].tool_calls))) {
          recentMsgs.shift();
        }

        const currentSystemMsg = apiMessages.find(m => m.role === 'system');
        const prunedMessages = currentSystemMsg ? [currentSystemMsg, ...recentMsgs.filter(m => m !== currentSystemMsg)] : recentMsgs;

        const response = await fetch(url, {
          signal,
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + key
          },
          body: JSON.stringify({
            ...requestBody,
            messages: prunedMessages,
            top_p: settings.topP ?? 1.0,
            ...(settings.maxTokens ? { max_tokens: settings.maxTokens } : {}),
            presence_penalty: settings.presencePenalty ?? 0.0,
            frequency_penalty: settings.frequencyPenalty ?? 0.0
          })
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error('HTTP ' + response.status + ': ' + (errorText || response.statusText));
        }

        if (!response.body) throw new Error('No response body');
        const reader = response.body.getReader();

        let turnToolCalls: Record<number, { id: string; name: string; args: string }> = {};
        let isMakingToolCall = false;
        let turnText = '';

        while (true) {
          if (signal?.aborted) {
            reader.cancel();
            return;
          }
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split('\n');

          for (const line of lines) {
            if (line.trim().startsWith('data: ')) {
              const data = line.trim().substring(6).trim();
              if (data === '[DONE]') continue;
              try {
                const parsed = JSON.parse(data);

                if (parsed.choices?.[0]?.delta?.tool_calls) {
                  isMakingToolCall = true;
                  for (const tc of parsed.choices[0].delta.tool_calls) {
                    const idx = tc.index ?? 0;
                    if (!turnToolCalls[idx]) {
                      turnToolCalls[idx] = { id: '', name: '', args: '' };
                    }
                    if (tc.id) turnToolCalls[idx].id = tc.id;
                    if (tc.function?.name) turnToolCalls[idx].name = tc.function.name;
                    if (tc.function?.arguments) turnToolCalls[idx].args += tc.function.arguments;
                  }

                  const firstToolName = Object.values(turnToolCalls)[0]?.name || 'tool';
                  const { getToolExecutingString } = await import('../utils/toolHelpers');
                  yield { text: accumulatedText + turnText + `\n\n${getToolExecutingString(firstToolName)}`, images: [], sources: toolSources };
                } else {
                  const content = parsed.choices?.[0]?.delta?.content;
                  if (content) {
                    turnText += content;
                    yield { text: accumulatedText + turnText, images: [], sources: toolSources };
                  }
                }
              } catch (e) { }
            }
          }
        }

        if (isMakingToolCall && Object.keys(turnToolCalls).length > 0) {
          const { executeToolCall } = await import('./tools');

          const toolCallsArray = Object.values(turnToolCalls);

          apiMessages.push({
            role: 'assistant',
            content: turnText || null,
            tool_calls: toolCallsArray.map(tc => ({
              id: tc.id,
              type: 'function',
              function: { name: tc.name, arguments: validateAndFixToolArgs(tc.args, tc.name) }
            }))
          } as any);

          accumulatedText += turnText + "\n";

          for (const tc of toolCallsArray) {
            const { getToolExecutingString, getToolResultString } = await import('../utils/toolHelpers');
            const execStr = getToolExecutingString(tc.name);
            accumulatedText += `${execStr}\n`;
            yield { text: accumulatedText, images: [], sources: toolSources };

            const toolResultData = await executeToolCall({
              id: tc.id,
              type: 'function',
              function: { name: tc.name, arguments: validateAndFixToolArgs(tc.args, tc.name) }
            });

            let parsedResult: any;
            try {
              parsedResult = JSON.parse(toolResultData);
              if (Array.isArray(parsedResult)) parsedResult = { results: parsedResult };
            } catch (e) {
              parsedResult = { content: toolResultData };
            }

            apiMessages.push({
              role: 'tool',
              tool_call_id: tc.id,
              name: tc.name,
              content: typeof parsedResult === 'string' ? parsedResult : JSON.stringify(parsedResult)
            });

            try {
              const parsedResult = JSON.parse(toolResultData);
              if (parsedResult.sources) {
                toolSources = [...toolSources, ...parsedResult.sources];
              }
            } catch (e) { }

            let isError = false;
            try {
              const parsedResult = JSON.parse(toolResultData);
              if (parsedResult.error !== undefined) isError = true;
            } catch (e) { isError = true; } // If JSON.parse fails, it's an error.

            const resultStr = getToolResultString(tc.name, isError);
            accumulatedText = accumulatedText.replace(execStr, resultStr);
            yield { text: accumulatedText, images: [], sources: toolSources };
          }

          continue;
        } else {
          accumulatedText += turnText;
          break;
        }
      }
    } catch (error: any) {
      console.error('SiliconFlow stream error:', error);
      throw new Error(error.message || 'Failed to communicate with SiliconFlow API');
    }
  }
}

export const siliconflowService = new SiliconFlowService();
