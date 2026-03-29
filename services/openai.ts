import { Message, AppSettings } from '../types';
import { pruneHistory } from '../utils/tokenManager';
import { ATTACHED_TOOLS, validateAndFixToolArgs } from './tools';

class OpenAIService {
  private apiKey: string | null = null;
  private baseUrl = 'https://api.openai.com/v1/chat/completions';

  setApiKey(key: string) {
    this.apiKey = key;
  }

  async *generateContentStream(
    messages: Message[],
    settings: AppSettings,
    onToolCall?: (name: string, args: any) => void
  ): AsyncGenerator<string | { type: 'tool_call'; name: string; args: any; callId: string }> {
    if (!this.apiKey) throw new Error('OpenAI API Key not set.');

    const { getDynamicTools } = await import('./tools');
    const dynamicTools = await getDynamicTools(settings);

    // Smart context pruning: use token-aware pruning when optimization is available
    const contextWindow = settings.maxContextTokens || 128000;
    const responseBudget = settings.maxTokens || Math.min(Math.floor(contextWindow * 0.25), 4096);
    const prunedByTokens = pruneHistory(messages, settings.systemInstruction, contextWindow, responseBudget);

    // Also respect attachedMessagesCount as a hard cap
    const attachedCount = settings.attachedMessagesCount || 50;
    let recentMessages = prunedByTokens.slice(-attachedCount);
    
    // Ensure we don't start with a message that is ONLY tool results or an assistant message with tool_calls
    // without its preceding user prompt.
    while (recentMessages.length > 0 && 
          (recentMessages[0].toolInvocations?.some(ti => ti.state === 'result') || 
           (recentMessages[0].role === 'model' && recentMessages[0].toolInvocations?.some(ti => ti.state === 'call')))) {
      recentMessages.shift();
    }
    
    const formattedMessages: any[] = [];
    for (const m of recentMessages) {
      if (m.toolInvocations) {
        const results = m.toolInvocations.filter(ti => ti.state === 'result');
        if (results.length > 0) {
          results.forEach(res => {
            let parsedResult: any;
            try {
              parsedResult = typeof res.result === 'string' ? JSON.parse(res.result) : res.result;
              if (Array.isArray(parsedResult)) parsedResult = { results: parsedResult };
            } catch (e) {
              parsedResult = res.result;
            }

            formattedMessages.push({
              role: 'tool',
              tool_call_id: res.toolCallId,
              content: typeof parsedResult === 'string' ? parsedResult : JSON.stringify(parsedResult)
            });
          });
          continue;
        }
      }
      
      formattedMessages.push({
        role: m.role === 'model' ? 'assistant' : 'user',
        content: m.content,
        ...(m.toolInvocations?.some(ti => ti.state === 'call') && {
          tool_calls: m.toolInvocations.filter(ti => ti.state === 'call').map(ti => ({
            id: ti.toolCallId,
            type: 'function',
            function: {
              name: ti.toolName,
              arguments: JSON.stringify(ti.args)
            }
          }))
        })
      });
    }

    const requestBody = {
      model: settings.model,
      messages: [
        { role: 'system', content: settings.systemInstruction },
        ...formattedMessages
      ],
      temperature: settings.temperature,
      top_p: settings.topP ?? 1.0,
      ...(settings.maxTokens ? { max_tokens: settings.maxTokens } : {}),
      presence_penalty: settings.presencePenalty ?? 0.0,
      frequency_penalty: settings.frequencyPenalty ?? 0.0,
      stream: true,
      tools: dynamicTools.length > 0 ? dynamicTools.map((t: any) => {
        return {
          type: 'function',
          function: {
            name: t.function.name,
            description: t.function.description || `Tool: ${t.function.name}`,
            parameters: t.function.parameters
          }
        };
      }) : undefined,
      tool_choice: dynamicTools.length > 0 ? 'auto' : undefined
    };

    const response = await fetch(this.baseUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      throw new Error(`OpenAI Error: ${response.status} - ${errData.error?.message || response.statusText}`);
    }

    const reader = response.body?.getReader();
    if (!reader) return;

    const decoder = new TextDecoder();
    let toolCalls: any[] = [];
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (!line.startsWith('data: ')) continue;
        const dataStr = line.replace('data: ', '').trim();
        if (dataStr === '[DONE]') break;

        try {
          const json = JSON.parse(dataStr);
          const delta = json.choices[0]?.delta;

          if (delta?.content) {
            yield delta.content;
          }

          if (delta?.tool_calls) {
            for (const tc of delta.tool_calls) {
              if (tc.index !== undefined) {
                if (!toolCalls[tc.index]) toolCalls[tc.index] = { id: '', name: '', args: '' };
                if (tc.id) toolCalls[tc.index].id += tc.id;
                if (tc.function?.name) toolCalls[tc.index].name += tc.function.name;
                if (tc.function?.arguments) toolCalls[tc.index].args += tc.function.arguments;
              }
            }
          }
        } catch (e) {}
      }
    }

    for (const tc of toolCalls) {
      if (tc && tc.name) {
        const fixedArgs = validateAndFixToolArgs(tc.name, tc.args);
        onToolCall?.(tc.name, fixedArgs);
        yield { type: 'tool_call', name: tc.name, args: fixedArgs, callId: tc.id };
      }
    }
  }

  async verifyApiKey(key: string): Promise<boolean> {
    if (!key) return false;
    try {
      const response = await fetch('https://api.openai.com/v1/models', {
        headers: {
          'Authorization': `Bearer ${key}`
        }
      });
      return response.ok;
    } catch (error) {
      console.error("OpenAI Verification Failed");
      return false;
    }
  }
}

export const openaiService = new OpenAIService();
