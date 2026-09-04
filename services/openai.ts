import { Message, AppSettings } from '../types';
import { getEffectiveSystemInstruction } from '../utils/promptUtils';

class OpenAIService {
  private apiKey: string | null = null;
  private baseUrl = 'https://api.openai.com/v1/chat/completions';
  private readonly DEFAULT_BASE_URL = 'https://api.openai.com/v1/chat/completions';

  setApiKey(key: string) {
    this.apiKey = key;
  }

  setBaseUrl(url?: string) {
    this.baseUrl = url ?? this.DEFAULT_BASE_URL;
  }

  async generateChat(
    settings: AppSettings,
    messages: Message[],
    signal?: AbortSignal
  ): Promise<{ text: string; images: string[]; video?: string; audio?: string; sources?: { title: string; url: string }[] }> {
    const key = settings.openaiApiKey || this.apiKey || (typeof window !== 'undefined' ? localStorage.getItem('openaiApiKey') : '') || '';
    if (!key) {
      throw new Error('OpenAI API key not configured');
    }

    const { getDynamicTools } = await import('./tools');
    const dynamicTools = await getDynamicTools(settings);

    const attachedCount = settings.attachedMessagesCount || 8;
    let recentMessages = messages.slice(-attachedCount);
    
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
        content: m.content
      });
    }

    const mappedTools = dynamicTools.length > 0 ? dynamicTools.map((t: any) => ({
      type: 'function',
      function: {
        name: t.function.name,
        description: t.function.description || `Tool: ${t.function.name}`,
        parameters: t.function.parameters
      }
    })) : undefined;

    const requestBody: any = {
      model: settings.model || 'gpt-4o',
      messages: [
        { role: 'system', content: getEffectiveSystemInstruction(settings, messages) },
        ...formattedMessages
      ],
      temperature: settings.temperature ?? 0.7,
      top_p: settings.topP ?? 1.0,
      ...(settings.maxTokens ? { max_tokens: settings.maxTokens } : {}),
      presence_penalty: settings.presencePenalty ?? 0.0,
      frequency_penalty: settings.frequencyPenalty ?? 0.0,
      stream: false,
      ...(mappedTools ? { tools: mappedTools, tool_choice: 'auto' } : {})
    };

    let accumulatedText = '';
    let toolSources: { title: string; url: string }[] = [];
    const conversation: any[] = [...requestBody.messages];
    const MAX_TURNS = 5;

    for (let turn = 0; turn < MAX_TURNS; turn++) {
      if (signal?.aborted) throw new Error('Generation cancelled by user');

      const response = await fetch(this.baseUrl, {
        signal,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${key}`
        },
        body: JSON.stringify({ ...requestBody, messages: conversation })
      });

      if (!response.ok) {
        const err = await response.text();
        throw new Error(`OpenAI Error ${response.status}: ${err}`);
      }

      const data = await response.json();
      const assistantMsg = data.choices?.[0]?.message;

      // Execute any requested tool calls, feed results back, and let the model continue.
      if (assistantMsg?.tool_calls && assistantMsg.tool_calls.length > 0) {
        const { executeToolCall } = await import('./tools');
        const { getToolExecutingString, validateAndFixToolArgs } = await import('../utils/toolHelpers');

        conversation.push(assistantMsg);
        if (assistantMsg.content) accumulatedText += assistantMsg.content + '\n';

        for (const tc of assistantMsg.tool_calls) {
          const toolName = tc.function?.name || '';
          const toolArgsStr = tc.function?.arguments || '{}';
          accumulatedText += `${getToolExecutingString(toolName)}\n`;

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

          conversation.push({
            role: 'tool',
            tool_call_id: tc.id,
            name: toolName,
            content: typeof parsedResult === 'string' ? parsedResult : JSON.stringify(parsedResult)
          });
        }
        continue;
      }

      accumulatedText += assistantMsg?.content || '';
      return { text: accumulatedText, images: [], sources: toolSources };
    }

    return { text: accumulatedText || 'No response generated.', images: [], sources: toolSources };
  }

  async *streamChat(
    settings: AppSettings,
    messages: Message[],
    signal?: AbortSignal
  ): AsyncGenerator<{ text: string; images: string[]; video?: string; audio?: string; sources?: { title: string; url: string }[] }> {
    const result = await this.generateChat(settings, messages, signal);
    yield result;
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
    } catch {
      return false;
    }
  }
}

export const openaiService = new OpenAIService();
