import Groq from "groq-sdk";
import { AppSettings, Message } from "../types";

export interface StreamResponse {
  text: string;
  images: string[];
}

export class GroqService {
  private apiKey: string = "";

  constructor() {
    // Initialize from localStorage if available
    const saved = typeof window !== 'undefined' ? localStorage.getItem('groqApiKey') : null;
    if (saved) {
      this.apiKey = saved;
      console.log('Groq service initialized with saved API key');
    }
  }

  setApiKey(key: string) {
    this.apiKey = key;
    localStorage.setItem('groqApiKey', key);
    console.log('Groq API key set:', key.substring(0, 10) + '...');
  }

  getApiKey(): string {
    return this.apiKey || localStorage.getItem('groqApiKey') || process.env.GROQ_API_KEY || '';
  }

  async *streamChat(settings: AppSettings, history: Message[]) {
    const key = this.getApiKey();
    if (!key) {
      throw new Error('Groq API key not configured');
    }

    console.log('Groq streamChat called with model:', settings.model);

    // Guard against using non-chat audio models with chat completions
    const nonChatModels = new Set<string>([
      'whisper-large-v3',
      'whisper-large-v3-turbo',
      'canopylabs/orpheus-v1-english',
      'canopylabs/orpheus-arabic-saudi',
    ]);

    if (nonChatModels.has(settings.model)) {
      throw new Error(
        `Groq model "${settings.model}" does not support chat completions. ` +
        `Use a text model such as "llama-3.3-70b-versatile" for chat, or switch to ` +
        `POLLINATIONS_IDENTITY with an audio/video model for media generation in the browser.`
      );
    }
    
    const client = new Groq({ 
      apiKey: key,
      dangerouslyAllowBrowser: true 
    });

    // Estimate tokens (rough: ~4 chars per token)
    const estimateTokens = (text: string) => Math.ceil(text.length / 4);
    
    // Model token limits (conservative to avoid rate limits)
    const modelLimits: Record<string, number> = {
      'llama-3.1-8b-instant': 4000,
      'llama-3.3-70b-versatile': 4000,
      'meta-llama/llama-4-maverick-17b-128e-instruct': 4000,
      'meta-llama/llama-4-scout-17b-16e-instruct': 4000,
      'meta-llama/llama-guard-4-12b': 4000,
      'moonshotai/kimi-k2-instruct-0905': 4000,
      'qwen/qwen3-32b': 4000,
      'default': 4000
    };
    
    const maxTokens = modelLimits[settings.model] || modelLimits['default'];
    
    // Truncate system instruction if too long (keep under 1000 tokens)
    let systemPrompt = settings.systemInstruction;
    const systemTokens = estimateTokens(systemPrompt);
    if (systemTokens > 1000) {
      // Keep first 3500 chars (~875 tokens)
      systemPrompt = systemPrompt.slice(0, 3500) + '...';
      console.log(`System prompt truncated from ${systemTokens} to ~875 tokens`);
    }

    // Calculate remaining budget for history
    const systemBudget = estimateTokens(systemPrompt);
    const responseBudget = 1500; // Reserve for response
    const historyBudget = maxTokens - systemBudget - responseBudget;
    
    // Build history from most recent, staying within budget
    let recentHistory: Message[] = [];
    let historyTokens = 0;
    
    for (let i = history.length - 1; i >= 0; i--) {
      const msgTokens = estimateTokens(history[i].content);
      if (historyTokens + msgTokens > historyBudget) {
        break;
      }
      recentHistory.unshift(history[i]);
      historyTokens += msgTokens;
    }

    // Ensure at least the last message is included
    if (recentHistory.length === 0 && history.length > 0) {
      const lastMsg = history[history.length - 1];
      // Truncate if necessary
      recentHistory = [{
        ...lastMsg,
        content: lastMsg.content.slice(0, historyBudget * 4)
      }];
    }

    console.log(`Token budget: ${maxTokens}, System: ~${systemBudget}, History: ${recentHistory.length} msgs (~${historyTokens} tokens)`);

    // Build messages with system instruction as the first message
    const messages = [
      {
        role: 'user' as const,
        content: systemPrompt
      },
      ...recentHistory.map(msg => ({
        role: msg.role === 'user' ? 'user' as const : 'assistant' as const,
        content: msg.content
      }))
    ];

    console.log('Sending messages to Groq with system instruction');

    try {
      const stream = await client.chat.completions.create({
        model: settings.model,
        messages: messages,
        temperature: settings.temperature,
        max_tokens: Math.min(4096, responseBudget),
        top_p: 1,
        stream: true,
      });

      console.log('Groq stream created successfully');

      for await (const chunk of stream) {
        console.log('Groq chunk:', chunk.choices[0]?.delta?.content);
        if (chunk.choices[0]?.delta?.content) {
          yield {
            text: chunk.choices[0].delta.content,
            images: []
          };
        }
      }
    } catch (error) {
      console.error('Groq API error:', error);
      throw error;
    }
  }

  async getChatCompletion(settings: AppSettings, history: Message[]) {
    const key = this.getApiKey();
    if (!key) {
      throw new Error('Groq API key not configured');
    }

    const client = new Groq({ 
      apiKey: key,
      dangerouslyAllowBrowser: true 
    });

    // Build messages with system instruction as the first message
    const messages = [
      {
        role: 'user' as const,
        content: settings.systemInstruction
      },
      ...history.map(msg => ({
        role: msg.role === 'user' ? 'user' as const : 'assistant' as const,
        content: msg.content
      }))
    ];

    try {
      return await client.chat.completions.create({
        model: settings.model,
        messages: messages,
        temperature: settings.temperature,
        max_tokens: 8192,
        top_p: 1,
      });
    } catch (error) {
      console.error('Groq API error:', error);
      throw error;
    }
  }
}

export const groqService = new GroqService();
