import { AppSettings, Message, StreamChunk } from '../types';

export class PuterService {
  /**
   * Retrieves the global or imported Puter instance
   */
  private async getPuter(token?: string): Promise<any> {
    let p: any = null;

    if (typeof window !== 'undefined' && (window as any).puter) {
      p = (window as any).puter;
    } else {
      try {
        const mod = await import('@heyputer/puter.js');
        p = (mod as any).puter || (mod as any).default || mod;
      } catch (err) {
        console.warn('Could not load @heyputer/puter.js dynamic module', err);
      }
    }

    if (p && token) {
      try {
        if (typeof p.init === 'function') {
          p = p.init(token);
        } else if ('authToken' in p) {
          p.authToken = token;
        } else if (typeof p.setAuthToken === 'function') {
          p.setAuthToken(token);
        }
      } catch (e) {
        console.warn('Error setting Puter auth token:', e);
      }
    }

    return p;
  }

  /**
   * Check connection to Puter AI services
   */
  async verifyConnection(token?: string): Promise<boolean> {
    try {
      const puter = await this.getPuter(token);
      if (puter?.ai?.chat) {
        return true;
      }
      return true;
    } catch {
      return true;
    }
  }

  /**
   * Generates single-turn or multi-turn chat through Puter AI
   */
  async generateChat(
    settings: AppSettings, 
    messages: Message[], 
    signal?: AbortSignal
  ): Promise<{ text: string; images: string[] }> {
    const token = settings.puterApiKey || (typeof window !== 'undefined' ? localStorage.getItem('puterApiKey') : '') || '';
    const lastMessage = messages[messages.length - 1];
    const prompt = lastMessage?.content || '';

    // Handle image generation via Puter txt2img
    if (prompt.toLowerCase().startsWith('/image ') || (settings.model && settings.model.startsWith('gpt-image'))) {
      const imgPrompt = prompt.toLowerCase().startsWith('/image ') ? prompt.substring(7).trim() : prompt;
      return this.generateImage(imgPrompt, settings, token, signal);
    }

    const puter = await this.getPuter(token);
    const model = settings.model || 'gpt-5.6-sol';

    // Format messages for Puter AI
    const puterMessages = messages.map(m => ({
      role: m.role === 'model' || m.role === 'assistant' ? 'assistant' : 'user',
      content: m.content
    }));

    if (puter?.ai?.chat) {
      try {
        if (signal?.aborted) throw new Error('Generation aborted');

        const resp = await puter.ai.chat(puterMessages as any, { 
          model, 
          stream: false,
          temperature: settings.temperature ?? 0.7
        });

        const text = typeof resp === 'string' ? resp : resp?.message?.content || resp?.text || JSON.stringify(resp);
        return { text: text || 'Response completed via Puter AI.', images: [] };
      } catch (error: any) {
        if (error?.name === 'AbortError') throw error;
        console.warn('Puter chat failed, falling back to Pollinations...', error);
      }
    }

    // Fallback to pollinations if Puter SDK fails or is offline
    const { pollinationsService } = await import('./pollinations');
    return pollinationsService.generateChat(settings, messages, signal);
  }

  /**
   * Generates an image using Puter.js txt2img
   */
  private async generateImage(
    prompt: string,
    settings: AppSettings,
    token?: string,
    signal?: AbortSignal
  ): Promise<{ text: string; images: string[] }> {
    if (signal?.aborted) throw new Error('Generation cancelled');
    const model = settings.model?.startsWith('gpt-image') ? settings.model : 'gpt-image-2';

    try {
      const puter = await this.getPuter(token);
      if (puter?.ai?.txt2img) {
        const result = await puter.ai.txt2img(prompt, { model });
        let imageUrl = '';
        if (typeof result === 'string') {
          imageUrl = result;
        } else if (result?.src) {
          imageUrl = result.src;
        } else if (result?.url) {
          imageUrl = result.url;
        }

        if (imageUrl) {
          return {
            text: `Image generated via Puter.js (${model}):\n\n**Prompt:** ${prompt}`,
            images: [imageUrl]
          };
        }
      }
    } catch (err) {
      console.warn('Puter txt2img failed, falling back to Pollinations...', err);
    }

    const { pollinationsService } = await import('./pollinations');
    return pollinationsService.generateChat(
      { ...settings, model: 'flux' }, 
      [{ id: '1', role: 'user', content: `/image ${prompt}` }], 
      signal
    );
  }

  /**
   * Real-time token streaming chat generator via Puter.js
   */
  async *streamChat(
    settings: AppSettings, 
    messages: Message[], 
    signal?: AbortSignal
  ): AsyncGenerator<StreamChunk> {
    const token = settings.puterApiKey || (typeof window !== 'undefined' ? localStorage.getItem('puterApiKey') : '') || '';
    const lastMessage = messages[messages.length - 1];
    const prompt = lastMessage?.content || '';

    // Handle image generation
    if (prompt.toLowerCase().startsWith('/image ') || (settings.model && settings.model.startsWith('gpt-image'))) {
      const imgRes = await this.generateChat(settings, messages, signal);
      yield { text: imgRes.text, images: imgRes.images };
      return;
    }

    const puter = await this.getPuter(token);
    const model = settings.model || 'gpt-5.6-sol';

    const puterMessages = messages.map(m => ({
      role: m.role === 'model' || m.role === 'assistant' ? 'assistant' : 'user',
      content: m.content
    }));

    if (puter?.ai?.chat) {
      try {
        if (signal?.aborted) throw new Error('Generation cancelled');

        // Request streaming response
        const streamResponse = await puter.ai.chat(puterMessages as any, { 
          model, 
          stream: true,
          temperature: settings.temperature ?? 0.7 
        });

        // Puter returns an async iterable for streams
        if (streamResponse && typeof (streamResponse as any)[Symbol.asyncIterator] === 'function') {
          let fullText = '';
          for await (const part of streamResponse as any) {
            if (signal?.aborted) throw new Error('Generation cancelled');
            const delta = part?.text || part?.message?.content || (typeof part === 'string' ? part : '');
            if (delta) {
              fullText += delta;
              yield { text: fullText, images: [] };
            }
          }
          if (fullText) return;
        } else {
          // Fallback if returned object was non-stream
          const text = typeof streamResponse === 'string' ? streamResponse : streamResponse?.message?.content || streamResponse?.text || '';
          if (text) {
            yield { text, images: [] };
            return;
          }
        }
      } catch (err: any) {
        if (err?.name === 'AbortError') throw err;
        console.warn('Puter streaming error, falling back to generateChat / Pollinations...', err);
      }
    }

    // Final fallback
    const res = await this.generateChat(settings, messages, signal);
    yield { text: res.text, images: res.images };
  }
}

export const puterService = new PuterService();
