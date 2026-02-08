import { AppSettings, Message } from '../types';

// Simple token estimation (roughly 1 token per 4 characters)
function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

class PollinationsService {
  private apiKey: string = '';
  private baseUrl = 'https://gen.pollinations.ai';
  
  // Conservative token limits for Pollinations models
  private readonly TOKEN_LIMIT = 8000; // Safe default for most models
  private readonly RESPONSE_BUDGET = 2000;

  setApiKey(key: string) {
    this.apiKey = key;
  }

  async *streamChat(settings: AppSettings, messages: Message[]): AsyncGenerator<{ text: string; images: string[]; videos?: string[]; audios?: string[] }> {
    const lastMessage = messages[messages.length - 1];
    const prompt = lastMessage.content;

    // Check if it's an image generation request
    if (prompt.toLowerCase().startsWith('/image ')) {
      const imagePrompt = prompt.substring(7).trim();
      yield* this.generateImage(imagePrompt, settings);
      return;
    }

    // Video command
    if (prompt.toLowerCase().startsWith('/video ')) {
      const videoPrompt = prompt.substring(7).trim();
      yield* this.generateVideo(videoPrompt, settings);
      return;
    }

    // Audio command
    if (prompt.toLowerCase().startsWith('/audio ')) {
      const audioPrompt = prompt.substring(7).trim();
      yield* this.generateAudio(audioPrompt, settings);
      return;
    }

    // Default to text generation
    yield* this.generateText(settings, messages);
  }

  private async *generateText(settings: AppSettings, messages: Message[]): AsyncGenerator<{ text: string; images: string[] }> {
    // Token budget management
    const maxTokens = this.TOKEN_LIMIT;
    const tokenBudget = maxTokens - this.RESPONSE_BUDGET;
    let usedTokens = 0;
    
    // Process system instruction with truncation if needed
    let systemInstruction = settings.systemInstruction || '';
    const systemTokens = estimateTokens(systemInstruction);
    
    if (systemTokens > 1500) {
      // Truncate system instruction to ~1500 tokens (6000 chars)
      systemInstruction = systemInstruction.substring(0, 6000) + '\n[System prompt truncated for token limit]';
    }
    usedTokens += estimateTokens(systemInstruction);

    // Build messages within token budget
    const openAIMessages: Array<{role: string; content: string}> = [];
    
    // Add system message if provided
    if (systemInstruction) {
      openAIMessages.push({
        role: 'system',
        content: systemInstruction
      });
    }
    
    // Always include the last message (current user prompt)
    const lastMsg = messages[messages.length - 1];
    const lastMsgFormatted = {
      role: lastMsg.role === 'model' ? 'assistant' : lastMsg.role,
      content: lastMsg.content
    };
    usedTokens += estimateTokens(lastMsg.content);
    
    // Build history from recent to oldest, within budget
    const historyMessages: Array<{role: string; content: string}> = [];
    for (let i = messages.length - 2; i >= 0; i--) {
      const msg = messages[i];
      const msgTokens = estimateTokens(msg.content);
      
      if (usedTokens + msgTokens > tokenBudget) {
        break; // Stop adding history
      }
      
      historyMessages.unshift({
        role: msg.role === 'model' ? 'assistant' : msg.role,
        content: msg.content
      });
      usedTokens += msgTokens;
    }
    
    // Add history then current message
    openAIMessages.push(...historyMessages, lastMsgFormatted);

    const model = settings.model || 'openai-fast';
    const requestBody = {
      model,
      messages: openAIMessages,
      temperature: settings.temperature,
      stream: true
    };

    const headers: Record<string, string> = {
      'Content-Type': 'application/json'
    };

    if (this.apiKey) {
      headers['Authorization'] = 'Bearer ' + this.apiKey;
    }

    const url = this.baseUrl + '/v1/chat/completions';

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(requestBody)
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error('HTTP ' + response.status + ': ' + (errorText || response.statusText));
      }

      if (!response.body) {
        throw new Error('No response body');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let accumulatedText = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.substring(6).trim();
            if (data === '[DONE]') continue;
            
            try {
              const parsed = JSON.parse(data);
              const content = parsed.choices?.[0]?.delta?.content;
              if (content) {
                accumulatedText += content;
                yield { text: accumulatedText, images: [] };
              }
            } catch (e) {
              // Skip invalid JSON lines
            }
          }
        }
      }
    } catch (error: any) {
      console.error('Pollinations text error:', error);
      throw new Error(error.message || 'Failed to generate text from Pollinations.ai');
    }
  }

  private async *generateImage(prompt: string, settings: AppSettings): AsyncGenerator<{ text: string; images: string[] }> {
    yield { text: '🎨 Generating image: "' + prompt + '"...', images: [] };

    const model = settings.model || 'flux';
    const seed = Math.floor(Math.random() * 1000000);
    const params = new URLSearchParams({
      model,
      width: '1024',
      height: '1024',
      enhance: 'true',
      nologo: 'true',
      seed: seed.toString()
    });

    // Use the correct Pollinations image endpoint
    const imageBaseUrl = 'https://image.pollinations.ai/prompt/';
    const imageUrl = imageBaseUrl + encodeURIComponent(prompt) + '?' + params.toString();

    try {
      // Show loading state with the URL
      yield { 
        text: '🎨 Generating image...\n**Prompt:** ' + prompt + '\n**Model:** ' + model, 
        images: [imageUrl] 
      };

      // The image URL works directly - Pollinations generates on request
      yield { 
        text: '✅ Image generated successfully!\n\n**Prompt:** ' + prompt + '\n**Model:** ' + model + '\n**Seed:** ' + seed, 
        images: [imageUrl] 
      };
    } catch (error: any) {
      console.error('Pollinations image error:', error);
      throw new Error(error.message || 'Failed to generate image');
    }
  }

  private async *generateVideo(prompt: string, settings: AppSettings): AsyncGenerator<{ text: string; images: string[]; videos: string[] }> {
    yield { text: '🎬 Generating video: "' + prompt + '"...', images: [], videos: [] };

    const model = settings.model || 'veo';
    const seed = Math.floor(Math.random() * 1000000);
    const params = new URLSearchParams({
      model,
      seed: seed.toString()
    });

    const videoBaseUrl = 'https://gen.pollinations.ai/image/';
    const videoUrl = videoBaseUrl + encodeURIComponent(prompt) + '?' + params.toString();

    try {
      yield { 
        text: '✅ Video generated successfully!\n\n**Prompt:** ' + prompt + '\n**Model:** ' + model + '\n**Seed:** ' + seed, 
        images: [],
        videos: [videoUrl]
      };
    } catch (error: any) {
      console.error('Pollinations video error:', error);
      throw new Error(error.message || 'Failed to generate video');
    }
  }

  private async *generateAudio(prompt: string, settings: AppSettings): AsyncGenerator<{ text: string; images: string[]; audios: string[] }> {
    yield { text: '🎤 Generating audio: "' + prompt + '"...', images: [], audios: [] };

    const voice = 'shimmer';
    const params = new URLSearchParams({
      voice
    });

    const audioBaseUrl = 'https://gen.pollinations.ai/audio/';
    const audioUrl = audioBaseUrl + encodeURIComponent(prompt) + '?' + params.toString();

    try {
      yield { 
        text: '✅ Audio generated successfully!\n\n**Prompt:** ' + prompt + '\n**Voice:** ' + voice, 
        images: [],
        audios: [audioUrl]
      };
    } catch (error: any) {
      console.error('Pollinations audio error:', error);
      throw new Error(error.message || 'Failed to generate audio');
    }
  }

  async discoverModels(type: 'image' | 'text' | 'video' = 'text'): Promise<any> {
    const endpoints: Record<string, string> = {
      image: this.baseUrl + '/image/models',
      text: this.baseUrl + '/text/models',
      video: this.baseUrl + '/image/models', // Video models are in image models
    };

    const url = endpoints[type];
    const headers: Record<string, string> = {};
    
    if (this.apiKey) {
      headers['Authorization'] = 'Bearer ' + this.apiKey;
    }

    try {
      const response = await fetch(url, { headers });
      if (!response.ok) {
        throw new Error('HTTP ' + response.status);
      }
      return await response.json();
    } catch (error) {
      console.error('Model discovery error:', error);
      return [];
    }
  }
}

export const pollinationsService = new PollinationsService();

