import Groq from "groq-sdk";
import { AppSettings, Message } from "../types";
import { getEffectiveSystemInstruction } from "../utils/promptUtils";
import { pruneHistory } from '../utils/tokenManager';
import { validateAndFixToolArgs } from "../utils/toolHelpers";

export interface StreamResponse {
  text: string;
  images: string[];
  video?: string;
  audio?: string;
  sources?: { title: string; url: string }[];
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

  async *streamChat(settings: AppSettings, history: Message[], signal?: AbortSignal): AsyncGenerator<{ text: string; images: string[]; video?: string; audio?: string; sources?: { title: string; url: string }[] }> {
    if (signal?.aborted) return;
    const lastMessage = history[history.length - 1];
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

    const key = this.getApiKey();
    if (!key) {
      throw new Error('Groq API key not configured');
    }

    console.log('Groq streamChat called with model:', settings.model);

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
    let systemPrompt = getEffectiveSystemInstruction(settings, history);
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
    const messages: any[] = [
      {
        role: 'system',
        content: systemPrompt
      },
      ...recentHistory.map(msg => ({
        role: msg.role === 'user' ? 'user' : 'assistant',
        content: msg.content
      }))
    ];

    console.log('Sending messages to Groq with system instruction');

    try {
      let tools: any[] | undefined = undefined;
      const { getDynamicTools } = await import('./tools');
      const dynamicTools = await getDynamicTools(settings);
      if (dynamicTools.length > 0) {
        tools = dynamicTools;
      }

      let accumulatedText = '';
      let toolSources: { title: string; url: string }[] = [];
      const MAX_TURNS = 10;

      for (let turn = 0; turn < MAX_TURNS; turn++) {
        if (signal?.aborted) return;

        // Context Pruning: Keep system message + last N messages
        const attachedCount = settings.attachedMessagesCount || 8;
        let recentMsgs = messages.slice(-attachedCount);
        
        // Ensure we don't start with a 'tool' role or a 'assistant' role that is just tool_calls
        // without the associated prompt.
        while (recentMsgs.length > 0 && 
              (recentMsgs[0].role === 'tool' || (recentMsgs[0].role === 'assistant' && recentMsgs[0].tool_calls))) {
          recentMsgs.shift();
        }

        const systemMsg = messages.find(m => m.role === 'system');
        const prunedMessages = systemMsg ? [systemMsg, ...recentMsgs.filter(m => m !== systemMsg)] : recentMsgs;

        const stream = await client.chat.completions.create({
          model: settings.model,
          messages: prunedMessages as any,
          temperature: settings.temperature,
          top_p: settings.topP ?? 1.0,
          ...(settings.maxTokens ? { max_tokens: settings.maxTokens } : {}),
          presence_penalty: settings.presencePenalty ?? 0.0,
          frequency_penalty: settings.frequencyPenalty ?? 0.0,
          stream: true,
          tools: tools
        });

        const turnToolCalls: Record<number, { id: string; name: string; args: string }> = {};
        let isMakingToolCall = false;
        let turnText = '';

        for await (const chunk of stream) {
          if (signal?.aborted) return;
          if (chunk.choices[0]?.delta?.tool_calls) {
            isMakingToolCall = true;
            for (const tc of chunk.choices[0].delta.tool_calls) {
              const idx = tc.index ?? 0;
              if (!turnToolCalls[idx]) {
                turnToolCalls[idx] = { id: '', name: '', args: '' };
              }
              if (tc.id) turnToolCalls[idx].id = tc.id;
              if (tc.function?.name) turnToolCalls[idx].name = tc.function.name;
              if (tc.function?.arguments) turnToolCalls[idx].args += tc.function.arguments;
            }

            const firstToolName = Object.values(turnToolCalls)[0]?.name || 'tool';
            const { getToolExecutingString } = await import('../utils/toolHelpers');
            yield { text: accumulatedText + turnText + `\n\n${getToolExecutingString(firstToolName)}`, images: [], sources: toolSources };
          } else if (chunk.choices[0]?.delta?.content !== undefined) {
            const content = chunk.choices[0].delta.content;
            if (content) {
              turnText += content;
            }
            yield { text: accumulatedText + turnText, images: [], sources: toolSources };
          }
        }

        if (isMakingToolCall && Object.keys(turnToolCalls).length > 0) {
          const { executeToolCall } = await import('./tools');

          const toolCallsArray = Object.values(turnToolCalls);

          messages.push({
            role: 'assistant',
            content: turnText || null,
            tool_calls: toolCallsArray.map(tc => ({
              id: tc.id,
              type: 'function',
              function: { name: tc.name, arguments: validateAndFixToolArgs(tc.args, tc.name) }
            }))
          });

          accumulatedText += turnText + "\n";

          for (const tc of toolCallsArray) {
            const { getToolExecutingString, getToolResultString } = await import('../utils/toolHelpers');
            const execStr = getToolExecutingString(tc.name);
            accumulatedText += `${execStr}\n`;
            yield { text: accumulatedText, images: [], sources: toolSources };

            const toolResultData = await executeToolCall({
              id: tc.id,
              type: 'function',
              function: { name: tc.name, arguments: validateAndFixToolArgs(tc.args, tc.name) }
            });

            let parsedResult: any;
            try {
              parsedResult = JSON.parse(toolResultData);
              if (Array.isArray(parsedResult)) parsedResult = { results: parsedResult };
            } catch (e) {
              parsedResult = { content: toolResultData };
            }

            messages.push({
              role: 'tool',
              tool_call_id: tc.id,
              name: tc.name,
              content: typeof parsedResult === 'string' ? parsedResult : JSON.stringify(parsedResult)
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
            yield { text: accumulatedText, images: [], sources: toolSources };
          }

          continue;
        } else {
          accumulatedText += turnText;
          break;
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
        role: 'system' as const,
        content: getEffectiveSystemInstruction(settings, history)
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
        ...(settings.maxTokens ? { max_tokens: settings.maxTokens } : {}),
        top_p: 1,
      });
    } catch (error) {
      console.error('Groq API error:', error);
      throw error;
    }
  }

  async verifyApiKey(key: string): Promise<boolean> {
    if (!key) return false;
    try {
      const client = new Groq({ apiKey: key, dangerouslyAllowBrowser: true });
      await client.models.list();
      return true;
    } catch (error: any) {
      console.error("Groq Verification Failed:", error.message);
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

export const groqService = new GroqService();
