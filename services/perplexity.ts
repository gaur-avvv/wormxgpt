import { Message, AppSettings } from '../types';
import { pruneHistory } from '../utils/tokenManager';

class PerplexityService {
  private apiKey: string | null = null;
  private baseUrl = 'https://api.perplexity.ai/chat/completions';

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
          model: 'sonar',
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
    settings: AppSettings
  ): AsyncGenerator<string> {
    if (!this.apiKey) throw new Error('Perplexity API Key not set.');

    const attachedCount = settings.attachedMessagesCount || 8;
    let recentMessages = messages.slice(-attachedCount);
    
    // Ensure we don't start with a message that is ONLY tool results or an assistant message with tool_calls
    while (recentMessages.length > 0 && 
          (recentMessages[0].toolInvocations?.some(ti => ti.state === 'result') || 
           (recentMessages[0].role === 'model' && recentMessages[0].toolInvocations?.some(ti => ti.state === 'call')))) {
      recentMessages.shift();
    }
    
    const formattedMessages = recentMessages.map(m => ({
      role: m.role === 'model' ? 'assistant' : 'user',
      content: m.content
    }));

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
      stream: true
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
      throw new Error(`Perplexity Error: ${response.status} - ${errText}`);
    }

    const reader = response.body?.getReader();
    if (!reader) return;

    const decoder = new TextDecoder();
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
        } catch (e) {}
      }
    }
  }
}

export const perplexityService = new PerplexityService();
