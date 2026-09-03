import { AppSettings, Message } from '../types';

export class PuterService {
  async generateChat(
    settings: AppSettings, 
    messages: Message[], 
    signal?: AbortSignal
  ): Promise<{ text: string; images: string[] }> {
    const token = settings.puterApiKey || (typeof window !== 'undefined' ? localStorage.getItem('puterApiKey') : '') || '';

    let init: any;
    if (typeof window !== 'undefined' && (window as any).puter?.init) {
      init = (window as any).puter.init;
    } else {
      try {
        const mod = await import('@heyputer/puter.js');
        init = (mod as any).default?.init || (mod as any).init;
      } catch {}
    }

    const model = settings.model || 'gpt-4o-mini';

    // Map messages history to Puter format
    const puterMessages = messages.map(m => ({
      role: m.role === 'model' || m.role === 'assistant' ? 'assistant' : 'user',
      content: m.content
    }));

    if (init) {
      try {
        const puter = init(token);
        const resp = await puter.ai.chat(puterMessages as any, { model, stream: false });
        const text = typeof resp === 'string' ? resp : resp?.message?.content || resp?.text || JSON.stringify(resp);
        return { text: text || 'Puter completed response.', images: [] };
      } catch (error: any) {
        console.warn('Puter SDK invocation failed, using Pollinations proxy...', error);
      }
    }

    // Fallback to pollinations if Puter SDK fails or is offline
    const { pollinationsService } = await import('./pollinations');
    return pollinationsService.generateChat(settings, messages, signal);
  }

  async *streamChat(
    settings: AppSettings, 
    messages: Message[], 
    signal?: AbortSignal
  ): AsyncGenerator<{ text: string; images: string[] }> {
    const res = await this.generateChat(settings, messages, signal);
    yield res;
  }
}

export const puterService = new PuterService();
