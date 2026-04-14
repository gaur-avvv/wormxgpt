import { Message, AppSettings } from '../types';
import { pruneHistory } from '../utils/tokenManager';
import { ATTACHED_TOOLS, validateAndFixToolArgs } from './tools';
import { getEffectiveSystemInstruction } from '../utils/promptUtils';

class MistralService {
  private apiKey: string | null = null;
  private baseUrl = 'https://api.mistral.ai/v1/chat/completions';

  setApiKey(key: string) {
    this.apiKey = key;
  }

  async verifyApiKey(key: string): Promise<boolean> {
    try {
      const response = await fetch(this.baseUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${key}`
        },
        body: JSON.stringify({
          model: 'mistral-small-latest',
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

  async *generateContentStream(
    messages: Message[],
    settings: AppSettings,
    onToolCall?: (name: string, args: any) => void
  ): AsyncGenerator<string | { type: 'tool_call'; name: string; args: any; callId: string }> {
    if (!this.apiKey) throw new Error('Mistral API Key not set.');

    const { getDynamicTools } = await import('./tools');
    const dynamicTools = await getDynamicTools(settings);

    const formattedMessages: any[] = [];
    const attachedCount = settings.attachedMessagesCount || 8;
    let recentMessages = messages.slice(-attachedCount);
    
    // Ensure we don't start with a message that is ONLY tool results or an assistant message with tool_calls
    // without its preceding user prompt.
    while (recentMessages.length > 0 && 
          (recentMessages[0].toolInvocations?.some(ti => ti.state === 'result') || 
           (recentMessages[0].role === 'model' && recentMessages[0].toolInvocations?.some(ti => ti.state === 'call')))) {
      recentMessages.shift();
    }
    
    const pruned = recentMessages; // Already pruned manually now
    for (const m of pruned) {
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
              name: res.toolName,
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
        { role: 'system', content: getEffectiveSystemInstruction(settings, messages) },
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
      const errText = await response.text();
      throw new Error(`Mistral Error: ${response.status} - ${errText}`);
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
          if (delta?.content) yield delta.content;
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
      if (tc.name) {
        const fixedArgs = validateAndFixToolArgs(tc.name, tc.args);
        onToolCall?.(tc.name, fixedArgs);
        yield { type: 'tool_call', name: tc.name, args: fixedArgs, callId: tc.id };
      }
    }
  }
  async *streamChat(
    settings: AppSettings,
    messages: Message[],
    signal?: AbortSignal
  ): AsyncGenerator<{ text: string; images: string[]; video?: string; audio?: string; sources?: { title: string; url: string }[] }> {
    if (signal?.aborted) return;
    let accumulatedText = '';
    for await (const chunk of this.generateContentStream(messages, settings)) {
      if (signal?.aborted) return;
      if (typeof chunk === 'string') {
        accumulatedText += chunk;
        yield { text: accumulatedText, images: [] };
      }
    }
  }
}

export const mistralService = new MistralService();
