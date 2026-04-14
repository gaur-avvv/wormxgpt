import { validateAndFixToolArgs } from "../utils/toolHelpers";
import { getEffectiveSystemInstruction } from "../utils/promptUtils";

export class MoonshotService {
  private apiKey: string = "";

  setApiKey(key: string) {
    this.apiKey = key;
  }

  async verifyApiKey(key: string): Promise<boolean> {
    try {
      const response = await fetch("https://api.moonshot.ai/v1/chat/completions", {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${key}`
        },
        body: JSON.stringify({
          model: "kimi-k2.5",
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

  async *streamChat(settings: AppSettings, history: Message[], signal?: AbortSignal): AsyncGenerator<{ text: string; images: string[]; video?: string; audio?: string; sources?: { title: string; url: string }[] }> {
    if (!this.apiKey) {
      throw new Error('Moonshot API key not configured');
    }

    const response = await fetch("https://api.moonshot.ai/v1/chat/completions", {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`
      },
      signal,
      body: JSON.stringify({
        model: settings.model || "kimi-k2.5",
        messages: [
          { role: 'system', content: getEffectiveSystemInstruction(settings, history) },
          ...(() => {
            const attachedCount = settings.attachedMessagesCount || 8;
            let recentMessages = history.slice(-attachedCount);
            
            // Ensure we don't start with a message that is ONLY tool results or an assistant message with tool_calls
            while (recentMessages.length > 0 && 
                  (recentMessages[0].toolInvocations?.some(ti => ti.state === 'result') || 
                   (recentMessages[0].role === 'model' && recentMessages[0].toolInvocations?.some(ti => ti.state === 'call')))) {
              recentMessages.shift();
            }
            
            return recentMessages.map(m => ({
              role: m.role === 'model' ? 'assistant' : 'user',
              content: m.content
            }));
          })()
        ],
        temperature: settings.temperature,
        stream: true
      })
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(`Moonshot Error: ${error.error?.message || response.statusText}`);
    }

    const reader = response.body?.getReader();
    if (!reader) return;

    const decoder = new TextDecoder();
    let text = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value);
      const lines = chunk.split('\n');

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          if (line.includes('[DONE]')) break;
          try {
            const data = JSON.parse(line.substring(6));
            const delta = data.choices[0].delta?.content || "";
            text += delta;
            yield { text, images: [] };
          } catch (e) {
            console.error('Error parsing Moonshot chunk:', e);
          }
        }
      }
    }
  }
}

export const moonshotService = new MoonshotService();
