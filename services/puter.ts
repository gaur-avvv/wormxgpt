import { AppSettings, Message } from '../types';

export class PuterService {
  async *streamChat(settings: AppSettings, messages: Message[], signal?: AbortSignal): AsyncGenerator<{ text: string; images: string[] }> {
    const token = settings.puterApiKey || process.env.PUTER_AUTH_TOKEN || '';

    let init: any;
    if (typeof window === 'undefined') {
      const { createRequire } = await import('module');
      const require = createRequire(import.meta.url);
      init = require('@heyputer/puter.js/src/init.cjs').init;
    } else {
      init = (window as any).puter?.init || ((await import('@heyputer/puter.js')) as any).default?.init;
    }

    if (!init) {
      throw new Error('Puter SDK is not initialized or available.');
    }

    const puter = init(token);
    const model = settings.model || 'gpt-4o';

    // Map messages history to Puter format
    const puterMessages = messages.map(m => ({
      role: m.role === 'model' || m.role === 'assistant' ? 'assistant' : 'user',
      content: m.content
    }));

    try {
      const resp = await puter.ai.chat(puterMessages as any, { model, stream: true });
      for await (const part of resp) {
        if (signal?.aborted) return;
        yield { text: part?.text || '', images: [] };
      }
    } catch (error: any) {
      throw new Error(`Puter API error: ${error.message}`);
    }
  }
}

export const puterService = new PuterService();

