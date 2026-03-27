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

  async *streamChat(settings: AppSettings, messages: Message[], signal?: AbortSignal): AsyncGenerator<{ text: string; images: string[]; video?: string; audio?: string; sources?: { title: string; url: string }[] }> {
    if (signal?.aborted) return;
    const lastMessage = messages[messages.length - 1];
    const prompt = lastMessage.content;

    // Check if it's an image generation request
    if (prompt.toLowerCase().startsWith('/image ')) {
      const imagePrompt = prompt.substring(7).trim();
      yield* this.generateImage(imagePrompt, settings, signal);
      return;
    }

    // Video command generates video
    if (prompt.toLowerCase().startsWith('/video ')) {
      const videoPrompt = prompt.substring(7).trim();
      yield* this.generateVideo(videoPrompt, settings, signal);
      return;
    }

    // Audio command generates audio
    if (prompt.toLowerCase().startsWith('/audio ')) {
      const audioPrompt = prompt.substring(7).trim();
      yield* this.generateAudio(audioPrompt, settings, signal);
      return;
    }

    // Default to text generation
    yield* this.generateText(settings, messages, undefined, signal);
  }

  private async *generateText(settings: AppSettings, messages: Message[], forceTools?: any[], signal?: AbortSignal): AsyncGenerator<{ text: string; images: string[]; sources?: { title: string; url: string }[] }> {
    if (signal?.aborted) return;
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
    const openAIMessages: Array<any> = [];

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
    const historyMessages: Array<any> = [];
    for (let i = messages.length - 2; i >= 0; i--) {
      const msg = messages[i];
      const msgTokens = estimateTokens(msg.content);

      if (usedTokens + msgTokens > tokenBudget) {
        break; // Stop adding history
      }

      // If we previously stored a tool call payload directly in history, we parse it
      let content = msg.content;
      historyMessages.unshift({
        role: msg.role === 'model' ? 'assistant' : msg.role,
        content: content
      });
      usedTokens += msgTokens;
    }

    // Add history then current message
    openAIMessages.push(...historyMessages, lastMsgFormatted);

    const model = settings.model || 'openai-fast';
    const requestBody: any = {
      model,
      messages: openAIMessages,
      temperature: settings.temperature,
      stream: true
    };

    // Attach tools if any are passed or configured
    if (forceTools) {
      requestBody.tools = forceTools;
    } else {
      const { getDynamicTools } = await import('./tools');
      const dynamicTools = await getDynamicTools(settings);
      if (dynamicTools.length > 0) {
        requestBody.tools = dynamicTools;
      }
    }

    const headers: Record<string, string> = {
      'Content-Type': 'application/json'
    };

    if (this.apiKey) {
      headers['Authorization'] = 'Bearer ' + this.apiKey;
    }

    const url = this.baseUrl + '/v1/chat/completions';

    try {
      let accumulatedText = '';
      let toolSources: { title: string; url: string }[] = [];
      const MAX_TURNS = 10;

      for (let turn = 0; turn < MAX_TURNS; turn++) {
        if (signal?.aborted) return;

        // Context Pruning: Keep system message + last 12 messages
        const systemMsg = openAIMessages.find(m => m.role === 'system');
        let recentMsgs = openAIMessages.slice(-12);
        
        // Ensure we don't start with a 'tool' role or a 'assistant' role that is just tool_calls
        // without the associated prompt.
        while (recentMsgs.length > 0 && 
              (recentMsgs[0].role === 'tool' || (recentMsgs[0].role === 'assistant' && recentMsgs[0].tool_calls))) {
          recentMsgs.shift();
        }

        const prunedMessages = systemMsg ? [systemMsg, ...recentMsgs.filter(m => m !== systemMsg)] : recentMsgs;

        const response = await fetch(url, {
          signal,
          method: 'POST',
          headers,
          body: JSON.stringify({ ...requestBody, messages: prunedMessages })
        });

        if (!response.ok) {
          let errorText = await response.text();
          try {
            const jsonError = JSON.parse(errorText);
            if (jsonError.error?.message) errorText = jsonError.error.message;
          } catch (e) { }
          throw new Error('HTTP ' + response.status + ': ' + (errorText || response.statusText));
        }

        if (!response.body) throw new Error('No response body');

        const reader = response.body.getReader();
        const decoder = new TextDecoder();

        let toolCallId = '';
        let toolCallName = '';
        let toolCallArgs = '';
        let isMakingToolCall = false;
        let turnText = '';

        while (true) {
          if (signal?.aborted) {
            reader.cancel();
            return;
          }
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

                if (parsed.choices?.[0]?.delta?.tool_calls) {
                  isMakingToolCall = true;
                  const tc = parsed.choices[0].delta.tool_calls[0];
                  if (tc.id) toolCallId = tc.id;
                  if (tc.function?.name) toolCallName = tc.function.name;
                  if (tc.function?.arguments) toolCallArgs += tc.function.arguments;

                  const { getToolExecutingString } = await import('../utils/toolHelpers');
                  yield { text: accumulatedText + turnText + `\n\n${getToolExecutingString(toolCallName)}`, images: [], sources: toolSources };
                } else if (parsed.choices?.[0]?.delta?.content !== undefined) {
                  // Explicitly check !== undefined so we can catch empty content blocks
                  const content = parsed.choices?.[0]?.delta?.content;
                  if (content) {
                    turnText += content;
                  }
                  yield { text: accumulatedText + turnText, images: [], sources: toolSources };
                }
              } catch (e) {
                // Skip invalid JSON lines
              }
            }
          }
        }

        // If we finished streaming and a tool call was fully assembled, execute it
        if (isMakingToolCall && toolCallName) {
          const { getToolExecutingString, getToolResultString, validateAndFixToolArgs } = await import('../utils/toolHelpers');
          const execStr = getToolExecutingString(toolCallName);

          openAIMessages.push({
            role: 'assistant',
            content: turnText || null,
            tool_calls: [{
              id: toolCallId,
              type: 'function',
              function: { name: toolCallName, arguments: validateAndFixToolArgs(toolCallArgs, toolCallName) }
            }]
          });

          accumulatedText += turnText + "\n";
          accumulatedText += `${execStr}\n`;
          yield { text: accumulatedText, images: [], sources: toolSources };

          const { executeToolCall } = await import('./tools');
          const toolResultData = await executeToolCall({
            id: toolCallId,
            type: 'function',
            function: { name: toolCallName, arguments: validateAndFixToolArgs(toolCallArgs, toolCallName) }
          });

          let parsedResult: any;
          try {
            parsedResult = JSON.parse(toolResultData);
            if (Array.isArray(parsedResult)) parsedResult = { results: parsedResult };
          } catch (e) {
            parsedResult = { content: toolResultData };
          }

          openAIMessages.push({
            role: 'tool',
            tool_call_id: toolCallId,
            name: toolCallName,
            content: typeof parsedResult === 'string' ? parsedResult : JSON.stringify(parsedResult)
          });

          let isError = false;
          try {
            const parsedResult = JSON.parse(toolResultData);
            if (parsedResult.error !== undefined) isError = true;
            if (parsedResult.sources) toolSources = [...toolSources, ...parsedResult.sources];
          } catch (e) {
            // If it's not JSON, it's a raw string - definitely not a tool error object
            isError = false;
          }

          const resultStr = getToolResultString(toolCallName, isError);
          accumulatedText = accumulatedText.replace(execStr, resultStr);
          yield { text: accumulatedText, images: [], sources: toolSources };

          // Force a new loop turn to send the tool result back to the model
          continue;
        } else {
          // Normal chat completion
          accumulatedText += turnText;
          break;
        }
      }

    } catch (error: any) {
      if (error.name === 'AbortError') return;
      console.error('Pollinations text error:', error);
      throw new Error(error.message || 'Failed to generate text from Pollinations.ai');
    }
  }

  private async *generateImage(prompt: string, settings: AppSettings, signal?: AbortSignal): AsyncGenerator<{ text: string; images: string[] }> {
    if (signal?.aborted) return;
    yield { text: '🎨 Generating image: "' + prompt + '"...', images: [] };

    let model = settings.model || 'flux';
    const validImageModels = ['kontext', 'nanobanana', 'nanobanana-2', 'nanobanana-pro', 'seedream5', 'seedream', 'seedream-pro', 'gptimage', 'gptimage-large', 'flux', 'zimage', 'klein', 'imagen-4', 'flux-2-dev', 'grok-imagine', 'dirtberry', 'dirtberry-pro', 'p-image', 'p-image-edit'];
    if (!validImageModels.includes(model)) model = 'flux';

    const seed = Math.floor(Math.random() * 1000000);
    const params = new URLSearchParams({
      model,
      width: '1024',
      height: '1024',
      enhance: 'true',
      nologo: 'true',
      seed: seed.toString()
    });

    if (this.apiKey) {
      params.append('key', this.apiKey);
    }

    const imageBaseUrl = 'https://gen.pollinations.ai/image/';
    const imageUrl = imageBaseUrl + encodeURIComponent(prompt) + '?' + params.toString();

    try {
      if (signal?.aborted) return;
      yield {
        text: '🎨 Generating image...\n**Prompt:** ' + prompt + '\n**Model:** ' + model,
        images: [imageUrl]
      };

      yield {
        text: '✅ Image generated successfully!\n\n**Prompt:** ' + prompt + '\n**Model:** ' + model + '\n**Seed:** ' + seed,
        images: [imageUrl]
      };
    } catch (error: any) {
      if (error.name === 'AbortError') return;
      console.error('Pollinations image error:', error);
      throw new Error(error.message || 'Failed to generate image');
    }
  }

  private async *generateVideo(prompt: string, settings: AppSettings, signal?: AbortSignal): AsyncGenerator<{ text: string; images: string[]; video: string }> {
    if (signal?.aborted) return;
    yield { text: '🎬 Generating video: "' + prompt + '"...', images: [], video: '' };

    let model = settings.model;
    const validVideoModels = ['veo', 'seedance', 'seedance-pro', 'wan', 'grok-video', 'ltx-2', 'p-video'];
    if (!validVideoModels.includes(model)) model = 'veo';

    const seed = Math.floor(Math.random() * 1000000);
    const params = new URLSearchParams({
      model,
      width: '1024',
      height: '1024',
      duration: '4',
      nologo: 'true',
      seed: seed.toString()
    });

    if (this.apiKey) {
      params.append('key', this.apiKey);
    }

    const videoBaseUrl = 'https://gen.pollinations.ai/video/';
    const videoUrl = videoBaseUrl + encodeURIComponent(prompt) + '?' + params.toString();

    try {
      if (signal?.aborted) return;
      yield {
        text: '✅ Video generated successfully!\n\n**Prompt:** ' + prompt + '\n**Model:** ' + model + '\n**Duration:** 4s',
        images: [],
        video: videoUrl
      };
    } catch (error: any) {
      if (error.name === 'AbortError') return;
      console.error('Pollinations video error:', error);
      throw new Error(error.message || 'Failed to generate video');
    }
  }

  private async *generateAudio(prompt: string, settings: AppSettings, signal?: AbortSignal): AsyncGenerator<{ text: string; images: string[]; audio: string }> {
    if (signal?.aborted) return;
    yield { text: '🎤 Generating audio: "' + prompt + '"...', images: [], audio: '' };

    let voice = 'nova';
    // Attempt to extract voice param if embedded in the settings or system (fallback default nova)
    const params = new URLSearchParams({
      voice
    });

    if (this.apiKey) {
      params.append('key', this.apiKey);
    }

    const audioUrl = 'https://gen.pollinations.ai/audio/' + encodeURIComponent(prompt) + '?' + params.toString();

    try {
      if (signal?.aborted) return;
      yield {
        text: '✅ Audio generated successfully!\n\n**Prompt:** ' + prompt + '\n**Voice:** ' + voice,
        images: [],
        audio: audioUrl
      };
    } catch (error: any) {
      if (error.name === 'AbortError') return;
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

