import { GoogleGenAI, GenerateContentResponse, Part } from "@google/genai";
import { AppSettings, Message } from "../types";
import { estimateTokens } from "../utils/tokenManager";

export interface StreamResponse {
  text: string;
  images: string[];
  video?: string;
  audio?: string;
}

export class GeminiService {
  private getPersistedApiKey(): string {
    return localStorage.getItem('geminiApiKey') || '';
  }

  setApiKey(key: string) {
    localStorage.setItem('geminiApiKey', key);
  }

  async *streamChat(settings: AppSettings, messages: Message[], signal?: AbortSignal): AsyncGenerator<{ text: string; images: string[]; video?: string; audio?: string; sources?: { title: string; url: string }[] }> {
    if (signal?.aborted) return;

    const lastMessage = messages[messages.length - 1];
    const prompt = lastMessage.content;

    // Check for media generation commands - delegate to Pollinations
    if (prompt.toLowerCase().startsWith('/image ')) {
      const imagePrompt = prompt.substring(7).trim();
      yield* this.generateMediaViaPollinations('image', imagePrompt, settings);
      return;
    }

    if (prompt.toLowerCase().startsWith('/video ')) {
      const videoPrompt = prompt.substring(7).trim();
      yield* this.generateMediaViaPollinations('video', videoPrompt, settings);
      return;
    }

    if (prompt.toLowerCase().startsWith('/audio ')) {
      const audioPrompt = prompt.substring(7).trim();
      yield* this.generateMediaViaPollinations('audio', audioPrompt, settings);
      return;
    }

    const key = settings.geminiApiKey || this.getPersistedApiKey() || process.env.API_KEY || '';
    const ai = new GoogleGenAI({ apiKey: key });

    const isThinkingSupported = settings.model.includes('gemini-3') || settings.model.includes('gemini-2.5');

    // Token budget (Gemini has higher limits but be conservative)
    const maxTokens = 28000; // Conservative limit for most Gemini models
    const responseBudget = 4000;

    // Truncate system instruction if extremely long
    let systemPrompt = settings.systemInstruction;
    if (!(settings.injectSystemPrompts ?? true)) {
      systemPrompt = '';
    } else if (estimateTokens(systemPrompt) > 2000) {
      systemPrompt = systemPrompt.slice(0, 7500) + '...';
      console.log('System prompt truncated for Gemini');
    }

    const systemBudget = estimateTokens(systemPrompt);
    const historyBudget = maxTokens - systemBudget - responseBudget;

    const historyWithoutLast = messages.slice(0, -1);

    // Build history from most recent, staying within budget
    let recentHistory: Message[] = [];
    let historyTokens = 0;

    for (let i = historyWithoutLast.length - 1; i >= 0; i--) {
      const msgTokens = estimateTokens(historyWithoutLast[i].content);
      if (historyTokens + msgTokens > historyBudget) {
        break;
      }
      recentHistory.unshift(historyWithoutLast[i]);
      historyTokens += msgTokens;
    }

    console.log(`Gemini: Token budget ${maxTokens}, System: ~${systemBudget}, History: ${recentHistory.length} msgs (~${historyTokens} tokens)`);

    // Validate image is a properly formatted base64 data URL with valid mime type
    const isValidBase64Image = (img: string): boolean => {
      if (!img || typeof img !== 'string') return false;
      if (!img.startsWith('data:image/')) return false;
      if (!img.includes(';base64,')) return false;
      const mimeMatch = img.match(/^data:(image\/[a-z0-9+-]+);base64,/i);
      if (!mimeMatch || mimeMatch[1].length >= 256) return false;
      // Verify there's actual base64 data after the header
      const dataStart = img.indexOf(';base64,') + 8;
      if (dataStart >= img.length || img.length - dataStart < 100) return false;
      return true;
    };

    // Helper to safely extract mime type from validated data URL
    const extractMimeType = (dataUrl: string): string => {
      const match = dataUrl.match(/^data:(image\/[a-z0-9+-]+);base64,/i);
      return match ? match[1] : 'image/jpeg';
    };

    const extractBase64Data = (dataUrl: string): string => {
      const idx = dataUrl.indexOf(';base64,');
      return idx !== -1 ? dataUrl.slice(idx + 8) : '';
    };

    // Don't include images from history - they may be corrupted URLs
    // Only text content from history to avoid mime_type errors
    const chatHistory = recentHistory.map(msg => ({
      role: msg.role === 'user' ? 'user' : 'model',
      parts: [{ text: msg.content }]
    }));

    const currentParts: Part[] = [{ text: lastMessage.content }];
    if (lastMessage.images && lastMessage.images.length > 0) {
      lastMessage.images.filter(isValidBase64Image).forEach(img => {
        currentParts.push({
          inlineData: {
            mimeType: extractMimeType(img),
            data: extractBase64Data(img)
          }
        });
      });
    }

    // Attach tools
    const { getDynamicTools } = await import('./tools');
    const dynamicTools = await getDynamicTools(settings);
    // Convert dynamic tools to Gemini format (functionDeclarations)
    const geminiTools = dynamicTools.length > 0 ? [{
      functionDeclarations: dynamicTools.map((t: any) => {
        return {
          name: t.function.name,
          description: t.function.description || `Tool: ${t.function.name}`,
          parameters: t.function.parameters
        };
      })
    }] : [];

    const contents = [...chatHistory, { role: 'user', parts: currentParts }];
    let accumulatedText = "";
    let foundImages: string[] = [];
    let toolSources: { title: string; url: string }[] = [];
    const MAX_TURNS = 10;
    const { validateAndFixToolArgs } = await import('../utils/toolHelpers');
    const { pruneToolResult } = await import('../utils/tokenManager');

    try {
      for (let turn = 0; turn < MAX_TURNS; turn++) {
        if (signal?.aborted) return;
        // Context Pruning: Keep first message (system/init) + last N messages
        const attachedCount = settings.attachedMessagesCount || 8;
        let recentContents = contents.slice(-attachedCount);
        
        // Ensure we don't start with a model message that is ONLY tool results from the user side
        // or a functionResponse without its preceding functionCall.
        // In Gemini, it's safer to just move the start index until it's a 'user' role with text.
        while (recentContents.length > 0 && 
              (recentContents[0].role === 'model' || (recentContents[0].role === 'user' && recentContents[0].parts.some((p: any) => p.functionResponse)))) {
          recentContents.shift();
        }

        const prunedContents = contents.length > attachedCount ? [contents[0], ...recentContents] : contents;

        const responseStream = await ai.models.generateContentStream({
          model: settings.model,
          contents: prunedContents,
          config: {
            systemInstruction: systemPrompt,
            temperature: settings.temperature,
            topP: settings.topP ?? 1.0,
            maxOutputTokens: settings.maxTokens ?? 4000,
            thinkingConfig: isThinkingSupported ? {
              thinkingBudget: settings.thinkingBudget
            } : undefined,
            tools: geminiTools as any,
          },
        });

        const turnToolCalls: Array<{ name: string; args: any; thoughtSignature?: string }> = [];
        let isMakingToolCall = false;
        let turnText = "";
        let fullModelParts: any[] = []; // Store complete parts from API

        for await (const chunk of responseStream) {
          if (signal?.aborted) return;
          const c = chunk as GenerateContentResponse;

          if (c.candidates?.[0]?.content?.parts) {
            // Store all parts from this response
            for (const part of c.candidates[0].content.parts as any[]) {
              fullModelParts.push(part); // Keep complete part with thoughtSignature
              
              if (part.functionCall) {
                isMakingToolCall = true;
                // Capture thoughtSignature from API response (Gemini 3 requires this)
                turnToolCalls.push({
                  name: part.functionCall.name,
                  args: part.functionCall.args,
                  thoughtSignature: part.thoughtSignature // Preserve from API
                });
                const { getToolExecutingString } = await import('../utils/toolHelpers');
                yield { text: accumulatedText + turnText + `\n\n${getToolExecutingString(part.functionCall.name)}`, images: foundImages, sources: toolSources };
              } else if (part.text) {
                turnText += part.text;
                yield { text: accumulatedText + turnText, images: foundImages, sources: toolSources };
              } else if (part.inlineData) {
                const imgUrl = `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
                if (!foundImages.includes(imgUrl)) {
                  foundImages.push(imgUrl);
                }
              }
            }
          }
        }

        if (isMakingToolCall && turnToolCalls.length > 0) {
          const { executeToolCall } = await import('./tools');

          accumulatedText += turnText + "\n";

          const toolResponsesParts: Part[] = [];

          for (const tc of turnToolCalls) {
            const { getToolExecutingString, getToolResultString } = await import('../utils/toolHelpers');
            const execStr = getToolExecutingString(tc.name);
            accumulatedText += `${execStr}\n`;
            yield { text: accumulatedText, images: foundImages, sources: toolSources };

            const argsString = typeof tc.args === 'string' ? tc.args : JSON.stringify(tc.args);
            const toolResultRaw = await executeToolCall({
              id: 'call_' + Math.random().toString(36).substring(7),
              type: 'function',
              function: { name: tc.name, arguments: validateAndFixToolArgs(argsString, tc.name) }
            });

            // Universal Robustness Truncation
            const toolResultData = pruneToolResult(toolResultRaw, 32000);

            // Parse response
            let parsedResponse: any;
            try {
              parsedResponse = JSON.parse(toolResultData);
              if (Array.isArray(parsedResponse)) {
                parsedResponse = { results: parsedResponse };
              }
            } catch (e) {
              parsedResponse = { content: toolResultData };
            }

            toolResponsesParts.push({
              functionResponse: {
                name: tc.name,
                response: parsedResponse
              }
            });

            try {
              const parsedResult = JSON.parse(toolResultData);
              if (parsedResult.sources) {
                toolSources = [...toolSources, ...parsedResult.sources];
              }
            } catch (e) { }

            let isError = false;
            try {
              const parsedResult = JSON.parse(toolResultData);
              if (parsedResult.error !== undefined) isError = true;
            } catch (e) { isError = false; }

            const resultStr = getToolResultString(tc.name, isError);
            accumulatedText = accumulatedText.replace(execStr, resultStr);
            yield { text: accumulatedText, images: foundImages, sources: toolSources };
          }

          // Update contents for next turn - use FULL model parts with thoughtSignatures
          contents.push({ role: 'model', parts: fullModelParts });
          contents.push({ role: 'user', parts: toolResponsesParts });
          continue;
        } else {
          accumulatedText += turnText;
          break;
        }
      }
    } catch (error: any) {
      console.error("Gemini stream error:", error);
      let errorMessage = error?.message || 'Unknown anomaly';
      const errorCode = error?.code || error?.status || '';

      // Rate limit / quota exceeded handling
      if (errorCode === 429 || errorMessage.includes('429') || errorMessage.includes('RESOURCE_EXHAUSTED') || errorMessage.includes('quota')) {
        const retryMatch = errorMessage.match(/retry in (\d+\.?\d*)/i);
        const retryTime = retryMatch ? retryMatch[1] : '60';
        errorMessage = `RATE_LIMIT_EXCEEDED: Neural bandwidth depleted.\n\n` +
          `The Gemini API quota has been exhausted. Options:\n` +
          `• Wait ${retryTime}ms and retry\n` +
          `• Switch to a different model (try gemini-2.0-flash)\n` +
          `• Switch AI Provider to GROQ or Pollinations\n` +
          `• Upgrade your API plan at ai.google.dev`;
      }
      // Auth/credential errors
      else if (errorMessage.includes("Requested entity was not found")) {
        errorMessage = "CREDENTIAL_REJECTED: Target project not found. Hijack a different identity.";
      }
      // Invalid API key
      else if (errorMessage.includes('API_KEY_INVALID') || errorMessage.includes('401')) {
        errorMessage = "API_KEY_INVALID: Authentication failed. Check your Gemini API key in settings.";
      }
      // Model not found
      else if (errorMessage.includes('not found') && errorMessage.includes('model')) {
        errorMessage = "MODEL_NOT_FOUND: The selected model is unavailable. Try switching to gemini-2.0-flash or gemini-1.5-pro.";
      }
      // Safety/content filter
      else if (errorMessage.includes('SAFETY') || errorMessage.includes('blocked')) {
        errorMessage = "CONTENT_FILTERED: Response blocked by safety filters. Rephrase your query.";
      }

      yield {
        text: `[SYSTEM ERROR] Connection to main terminal severed:\n\n${errorMessage}`,
        images: []
      };
    }
  }

  async verifyApiKey(key: string): Promise<boolean> {
    if (!key) return false;
    try {
      const ai = new GoogleGenAI({ apiKey: key });
      // Use the model directly as seen in streamChat
      await ai.models.generateContent({
        model: "gemini-1.5-flash",
        contents: [{ role: 'user', parts: [{ text: 'hi' }] }],
        config: { maxOutputTokens: 1 }
      });
      return true;
    } catch (error: any) {
      console.error("Gemini Verification Failed:", error.message);
      return false;
    }
  }

  private async *generateMediaViaPollinations(
    type: 'image' | 'video' | 'audio',
    prompt: string,
    settings: AppSettings
  ): AsyncGenerator<{ text: string; images: string[]; video?: string; audio?: string }> {
    const { pollinationsService } = await import('./pollinations');

    if (settings.pollinationsApiKey) {
      pollinationsService.setApiKey(settings.pollinationsApiKey);
    }

    const messages: Message[] = [{
      role: 'user',
      content: `/${type} ${prompt}`,
      timestamp: Date.now(),
      images: []
    }];

    yield* pollinationsService.streamChat(settings, messages);
  }
}

export const geminiService = new GeminiService();