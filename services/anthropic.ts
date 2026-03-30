import { Message, AppSettings } from '../types';
import { pruneHistory } from '../utils/tokenManager';
import { ATTACHED_TOOLS, validateAndFixToolArgs } from './tools';

class AnthropicService {
  private apiKey: string | null = null;
  private baseUrl = 'https://api.anthropic.com/v1/messages';

  setApiKey(key: string) {
    this.apiKey = key;
  }

  async *generateContentStream(
    messages: Message[],
    settings: AppSettings,
    onToolCall?: (name: string, args: any) => void
  ): AsyncGenerator<string | { type: 'tool_call'; name: string; args: any; callId: string }> {
    if (!this.apiKey) throw new Error('Anthropic API Key not set.');

    // Context Pruning: Last N messages
    const { getDynamicTools } = await import('./tools');
    const dynamicTools = await getDynamicTools(settings);

    const attachedCount = settings.attachedMessagesCount || 8;
    let recentMessages = messages.slice(-attachedCount);
    
    // Ensure we don't start with a message that is ONLY tool results or an assistant message with tool_use
    // without its preceding user prompt.
    while (recentMessages.length > 0 && 
          (recentMessages[0].toolInvocations?.some(ti => ti.state === 'result') || 
           (recentMessages[0].role === 'model' && recentMessages[0].toolInvocations?.some(ti => ti.state === 'call')))) {
      recentMessages.shift();
    }

    const anthropicMessages: any[] = [];

    for (const m of recentMessages) {
      if (m.toolInvocations) {
        const toolCalls = m.toolInvocations.filter(ti => ti.state === 'call');
        const toolResults = m.toolInvocations.filter(ti => ti.state === 'result');

        if (toolCalls.length > 0) {
          anthropicMessages.push({
            role: 'assistant',
            content: [
              ...(m.content ? [{ type: 'text', text: m.content }] : []),
              ...toolCalls.map(tc => ({
                type: 'tool_use',
                id: tc.toolCallId,
                name: tc.toolName,
                input: tc.args
              }))
            ]
          });
        }

        if (toolResults.length > 0) {
          anthropicMessages.push({
            role: 'user',
            content: toolResults.map(tr => {
              let parsedResult: any;
              try {
                parsedResult = typeof tr.result === 'string' ? JSON.parse(tr.result) : tr.result;
                if (Array.isArray(parsedResult)) parsedResult = { results: parsedResult };
              } catch (e) {
                parsedResult = tr.result;
              }
              
              return {
                type: 'tool_result',
                tool_use_id: tr.toolCallId,
                content: typeof parsedResult === 'string' ? parsedResult : JSON.stringify(parsedResult)
              };
            })
          });
        }
      } else {
        anthropicMessages.push({
          role: m.role === 'model' ? 'assistant' : 'user',
          content: m.content
        });
      }
    }

    const requestBody = {
      model: settings.model,
      system: settings.systemInstruction,
      messages: anthropicMessages,
      max_tokens: settings.maxTokens || 4096,
      temperature: settings.temperature,
      top_p: settings.topP ?? 1.0,
      stream: true,
      tools: dynamicTools.length > 0 ? dynamicTools.map((t: any) => {
        let params = t.function.parameters;
        if (params && (!params.properties || Object.keys(params.properties).length === 0)) {
          params = { type: 'object', properties: {} }; // Anthropic actively requires input_schema object even if no args
        }
        return {
          name: t.function.name,
          description: t.function.description || `Tool: ${t.function.name}`,
          input_schema: params || { type: 'object', properties: {} }
        };
      }) : undefined
    };

    const response = await fetch(this.baseUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.apiKey,
        'anthropic-version': '2023-06-01',
        'dangerously-allow-browser': 'true'
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      throw new Error(`Anthropic Error: ${response.status} - ${errData.error?.message || response.statusText}`);
    }

    const reader = response.body?.getReader();
    if (!reader) return;

    const decoder = new TextDecoder();
    let currentToolCall: any = null;
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
          
          if (json.type === 'content_block_delta') {
            if (json.delta?.type === 'text_delta') {
              yield json.delta.text;
            } else if (json.delta?.type === 'input_json_delta') {
              if (currentToolCall) {
                currentToolCall.args += json.delta.partial_json;
              }
            }
          } else if (json.type === 'content_block_start') {
            if (json.content_block?.type === 'tool_use') {
              currentToolCall = {
                id: json.content_block.id,
                name: json.content_block.name,
                args: ''
              };
            }
          } else if (json.type === 'message_stop') {
            if (currentToolCall) {
              const fixedArgs = validateAndFixToolArgs(currentToolCall.name, currentToolCall.args);
              onToolCall?.(currentToolCall.name, fixedArgs);
              yield { type: 'tool_call', name: currentToolCall.name, args: fixedArgs, callId: currentToolCall.id };
              currentToolCall = null;
            }
          }
        } catch (e) {
          // Ignore parse errors from partial chunks
        }
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

  async verifyApiKey(key: string): Promise<boolean> {
    if (!key) return false;
    try {
      const response = await fetch(this.baseUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': key,
          'anthropic-version': '2023-06-01',
          'dangerously-allow-browser': 'true'
        },
        body: JSON.stringify({
          model: 'claude-3-5-haiku-latest',
          max_tokens: 1,
          messages: [{ role: 'user', content: 'hi' }]
        })
      });
      // 401 = invalid key, 403 = forbidden; any other status means key is valid
      return response.status !== 401 && response.status !== 403;
    } catch (error) {
      console.error("Anthropic Verification Failed");
      return false;
    }
  }
}

export const anthropicService = new AnthropicService();
