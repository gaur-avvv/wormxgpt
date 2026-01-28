import { GoogleGenAI, GenerateContentResponse, Part } from "@google/genai";
import { AppSettings, Message } from "../types";

export interface StreamResponse {
  text: string;
  images: string[];
}

export class GeminiService {
  private getPersistedApiKey(): string {
    return localStorage.getItem('geminiApiKey') || '';
  }

  setApiKey(key: string) {
    localStorage.setItem('geminiApiKey', key);
  }

  async *streamChat(settings: AppSettings, history: Message[]) {
    const key = settings.geminiApiKey || this.getPersistedApiKey() || process.env.API_KEY || '';
    const ai = new GoogleGenAI({ apiKey: key });
    
    const isThinkingSupported = settings.model.includes('gemini-3') || settings.model.includes('gemini-2.5');

    // Estimate tokens (rough: ~4 chars per token)
    const estimateTokens = (text: string) => Math.ceil(text.length / 4);
    
    // Token budget (Gemini has higher limits but be conservative)
    const maxTokens = 28000; // Conservative limit for most Gemini models
    const responseBudget = 4000;
    
    // Truncate system instruction if extremely long
    let systemPrompt = settings.systemInstruction;
    if (estimateTokens(systemPrompt) > 2000) {
      systemPrompt = systemPrompt.slice(0, 7500) + '...';
      console.log('System prompt truncated for Gemini');
    }
    
    const systemBudget = estimateTokens(systemPrompt);
    const historyBudget = maxTokens - systemBudget - responseBudget;

    const lastMessage = history[history.length - 1];
    const historyWithoutLast = history.slice(0, -1);
    
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

    try {
      // Use generateContentStream directly to support multi-modal parts and history
      const responseStream = await ai.models.generateContentStream({
        model: settings.model,
        contents: [
          ...chatHistory,
          { role: 'user', parts: currentParts }
        ],
        config: {
          systemInstruction: systemPrompt,
          temperature: settings.temperature,
          thinkingConfig: isThinkingSupported ? { 
            thinkingBudget: settings.thinkingBudget 
          } : undefined,
        },
      });

      let accumulatedText = "";
      let foundImages: string[] = [];

      for await (const chunk of responseStream) {
        const c = chunk as GenerateContentResponse;
        accumulatedText += c.text || "";

        if (c.candidates?.[0]?.content?.parts) {
          for (const part of c.candidates[0].content.parts) {
            if (part.inlineData) {
              const imgUrl = `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
              if (!foundImages.includes(imgUrl)) {
                foundImages.push(imgUrl);
              }
            }
          }
        }

        yield { text: accumulatedText, images: foundImages };
      }
    } catch (error: any) {
      console.error("Gemini stream error:", error);
      let errorMessage = error?.message || 'Unknown anomaly';
      const errorCode = error?.code || error?.status || '';
      
      // Rate limit / quota exceeded handling
      if (errorCode === 429 || errorMessage.includes('429') || errorMessage.includes('RESOURCE_EXHAUSTED') || errorMessage.includes('quota')) {
        const retryMatch = errorMessage.match(/retry in (\d+\.?\d*)/i);
        const retryTime = retryMatch ? retryMatch[1] : '60';
        errorMessage = `⚠️ RATE_LIMIT_EXCEEDED: Neural bandwidth depleted.\n\n` +
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
        errorMessage = "🔑 API_KEY_INVALID: Authentication failed. Check your Gemini API key in settings.";
      }
      // Model not found
      else if (errorMessage.includes('not found') && errorMessage.includes('model')) {
        errorMessage = "🤖 MODEL_NOT_FOUND: The selected model is unavailable. Try switching to gemini-2.0-flash or gemini-1.5-pro.";
      }
      // Safety/content filter
      else if (errorMessage.includes('SAFETY') || errorMessage.includes('blocked')) {
        errorMessage = "🛡️ CONTENT_FILTERED: Response blocked by safety filters. Rephrase your query.";
      }
      
      yield { 
        text: `[SYSTEM ERROR] Connection to main terminal severed:\n\n${errorMessage}`,
        images: []
      };
    }
  }
}

export const geminiService = new GeminiService();