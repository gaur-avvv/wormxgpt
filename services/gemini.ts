import { GoogleGenAI, GenerateContentResponse, Part } from "@google/genai";
import { AppSettings, Message } from "../types";
import { estimateTokens } from "../utils/tokenManager";
import { getEffectiveSystemInstruction } from "../utils/promptUtils";
import { promptCacheService } from "./promptCache";

export interface StreamResponse {
  text: string;
  images: string[];
  video?: string;
  audio?: string;
  sources?: { title: string; url: string }[];
}

export class GeminiService {
  private getPersistedApiKey(): string {
    return localStorage.getItem('geminiApiKey') || '';
  }

  setApiKey(key: string) {
    localStorage.setItem('geminiApiKey', key);
  }

  /**
   * Synchronous standard request-response Gemini handler
   */
  async generateChat(
    settings: AppSettings,
    messages: Message[],
    signal?: AbortSignal
  ): Promise<StreamResponse> {
    const lastMessage = messages[messages.length - 1];
    const prompt = lastMessage.content;

    // Check for media generation commands - delegate to Pollinations
    if (prompt.toLowerCase().startsWith('/image ')) {
      const imagePrompt = prompt.substring(7).trim();
      return this.generateMediaViaPollinations('image', imagePrompt, settings);
    }

    if (prompt.toLowerCase().startsWith('/video ')) {
      const videoPrompt = prompt.substring(7).trim();
      return this.generateMediaViaPollinations('video', videoPrompt, settings);
    }

    if (prompt.toLowerCase().startsWith('/audio ')) {
      const audioPrompt = prompt.substring(7).trim();
      return this.generateMediaViaPollinations('audio', audioPrompt, settings);
    }

    const key = settings.geminiApiKey || this.getPersistedApiKey() || process.env.API_KEY || '';
    if (!key) {
      throw new Error('Gemini API key not configured');
    }

    const ai = new GoogleGenAI({ apiKey: key });
    const isThinkingSupported = settings.model.includes('gemini-3') || settings.model.includes('gemini-2.5');

    const maxTokens = 28000;
    const responseBudget = 4000;

    let systemPrompt = getEffectiveSystemInstruction(settings, messages);
    if (estimateTokens(systemPrompt) > 2000) {
      systemPrompt = systemPrompt.slice(0, 6000) + '...';
    }

    const systemBudget = estimateTokens(systemPrompt);
    const historyBudget = maxTokens - systemBudget - responseBudget;
    const historyWithoutLast = messages.slice(0, -1);

    let recentHistory: Message[] = [];
    let historyTokens = 0;

    for (let i = historyWithoutLast.length - 1; i >= 0; i--) {
      const msgTokens = estimateTokens(historyWithoutLast[i].content);
      if (historyTokens + msgTokens > historyBudget) break;
      recentHistory.unshift(historyWithoutLast[i]);
      historyTokens += msgTokens;
    }

    const isValidBase64Image = (img: string): boolean => {
      if (!img || typeof img !== 'string') return false;
      if (!img.startsWith('data:image/')) return false;
      if (!img.includes(';base64,')) return false;
      const mimeMatch = img.match(/^data:(image\/[a-z0-9+-]+);base64,/i);
      if (!mimeMatch || mimeMatch[1].length >= 256) return false;
      const dataStart = img.indexOf(';base64,') + 8;
      return dataStart < img.length && img.length - dataStart >= 100;
    };

    const extractMimeType = (dataUrl: string): string => {
      const match = dataUrl.match(/^data:(image\/[a-z0-9+-]+);base64,/i);
      return match ? match[1] : 'image/jpeg';
    };

    const extractBase64Data = (dataUrl: string): string => {
      const idx = dataUrl.indexOf(';base64,');
      return idx !== -1 ? dataUrl.slice(idx + 8) : '';
    };

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

    const { getDynamicTools } = await import('./tools');
    const dynamicTools = await getDynamicTools(settings);
    const geminiTools = dynamicTools.length > 0 ? [{
      functionDeclarations: dynamicTools.map((t: any) => ({
        name: t.function.name,
        description: t.function.description || `Tool: ${t.function.name}`,
        parameters: t.function.parameters
      }))
    }] : [];

    const contents = [...chatHistory, { role: 'user', parts: currentParts }];
    let accumulatedText = "";
    let foundImages: string[] = [];
    let toolSources: { title: string; url: string }[] = [];
    const MAX_TURNS = 6;
    const { validateAndFixToolArgs, getToolExecutingString, getToolResultString } = await import('../utils/toolHelpers');
    const { pruneToolResult } = await import('../utils/tokenManager');

    const conversationContext = chatHistory.map(m => `${m.role}:${(m.parts as any[])[0]?.text || ''}`).join('|');

    if (promptCacheService.enabled) {
      const cached = promptCacheService.lookup(
        settings.model, prompt, systemPrompt,
        settings.temperature, settings.maxTokens ?? 4000,
        conversationContext
      );
      if (cached) {
        return { text: cached.response, images: cached.images || [], sources: [] };
      }
    }

    let usedToolCalls = false;

    try {
      for (let turn = 0; turn < MAX_TURNS; turn++) {
        if (signal?.aborted) throw new Error('Generation cancelled by user');

        const attachedCount = settings.attachedMessagesCount || 8;
        let recentContents = contents.slice(-attachedCount);
        
        while (recentContents.length > 0 && 
              (recentContents[0].role === 'model' || (recentContents[0].role === 'user' && recentContents[0].parts.some((p: any) => p.functionResponse)))) {
          recentContents.shift();
        }

        const prunedContents = contents.length > attachedCount ? [contents[0], ...recentContents] : contents;

        const response = await ai.models.generateContent({
          model: settings.model || 'gemini-2.5-flash',
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

        if (signal?.aborted) throw new Error('Generation cancelled by user');

        const turnToolCalls: Array<{ name: string; args: any; thoughtSignature?: string }> = [];
        let isMakingToolCall = false;
        let turnText = "";
        let fullModelParts: any[] = [];

        if (response.candidates?.[0]?.content?.parts) {
          for (const part of response.candidates[0].content.parts as any[]) {
            fullModelParts.push(part);
            if (part.functionCall) {
              isMakingToolCall = true;
              turnToolCalls.push({
                name: part.functionCall.name,
                args: part.functionCall.args,
                thoughtSignature: part.thoughtSignature
              });
            } else if (part.text) {
              turnText += part.text;
            } else if (part.inlineData) {
              const imgUrl = `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
              if (!foundImages.includes(imgUrl)) {
                foundImages.push(imgUrl);
              }
            }
          }
        }

        if (isMakingToolCall && turnToolCalls.length > 0) {
          usedToolCalls = true;
          const { executeToolCall } = await import('./tools');
          accumulatedText += turnText + "\n";
          const toolResponsesParts: Part[] = [];

          for (const tc of turnToolCalls) {
            const execStr = getToolExecutingString(tc.name);
            accumulatedText += `${execStr}\n`;

            const argsString = typeof tc.args === 'string' ? tc.args : JSON.stringify(tc.args);
            const toolResultRaw = await executeToolCall({
              id: 'call_' + Math.random().toString(36).substring(7),
              type: 'function',
              function: { name: tc.name, arguments: validateAndFixToolArgs(argsString, tc.name) }
            });

            const toolResultData = pruneToolResult(toolResultRaw, 32000);

            let parsedResponse: any;
            try {
              parsedResponse = JSON.parse(toolResultData);
              if (Array.isArray(parsedResponse)) {
                parsedResponse = { results: parsedResponse };
              }
            } catch (e) {
              parsedResponse = { content: toolResultData };
            }

            if (parsedResponse.sources && Array.isArray(parsedResponse.sources)) {
              toolSources = [...toolSources, ...parsedResponse.sources];
            }

            toolResponsesParts.push({
              functionResponse: {
                name: tc.name,
                response: parsedResponse
              }
            });

            let isError = false;
            try {
              const parsedResult = JSON.parse(toolResultData);
              if (parsedResult.error !== undefined) isError = true;
            } catch (e) { isError = false; }

            const resultStr = getToolResultString(tc.name, isError);
            accumulatedText = accumulatedText.replace(execStr, resultStr);
          }

          contents.push({ role: 'model', parts: fullModelParts });
          contents.push({ role: 'user', parts: toolResponsesParts });
          continue;
        } else {
          accumulatedText += turnText;
          break;
        }
      }

      if (promptCacheService.enabled && accumulatedText && !usedToolCalls) {
        promptCacheService.store(
          settings.model, prompt, systemPrompt,
          settings.temperature, settings.maxTokens ?? 4000,
          accumulatedText, foundImages.length > 0 ? foundImages : undefined,
          conversationContext
        );
      }

      return {
        text: accumulatedText || 'No response generated.',
        images: foundImages,
        sources: toolSources
      };
    } catch (error: any) {
      if (error.name === 'AbortError') throw error;
      let errorMessage = error?.message || 'Unknown anomaly';
      if (errorMessage.includes('API_KEY_INVALID') || errorMessage.includes('401')) {
        errorMessage = "API_KEY_INVALID: Authentication failed. Check your Gemini API key in settings.";
      }
      throw new Error(errorMessage);
    }
  }

  async *streamChat(
    settings: AppSettings,
    messages: Message[],
    signal?: AbortSignal
  ): AsyncGenerator<StreamResponse> {
    const result = await this.generateChat(settings, messages, signal);
    yield result;
  }

  async verifyApiKey(key: string): Promise<boolean> {
    if (!key) return false;
    try {
      const ai = new GoogleGenAI({ apiKey: key });
      await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: [{ role: 'user', parts: [{ text: 'hi' }] }],
        config: { maxOutputTokens: 1 }
      });
      return true;
    } catch {
      return false;
    }
  }

  private async generateMediaViaPollinations(
    type: 'image' | 'video' | 'audio',
    prompt: string,
    settings: AppSettings
  ): Promise<StreamResponse> {
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
    return pollinationsService.generateChat(settings, messages);
  }
}

export const geminiService = new GeminiService();
