import { Message, AppSettings } from '../types';
import { mcpOrchestrator, ToolCallRequest } from './mcp_orchestrator';

export interface SupervisorOptions {
  userQuery: string;
  messages: Message[];
  settings: AppSettings;
  streamCallback: (textChunk: string) => void;
  // Fallback to whichever underlying service handles the raw LLM completions
  llmService: any; 
}

export class AgentEngine {
  
  /**
   * Main ReAct & Multi-Agent Entrypoint
   */
  async *runReActLoop(options: SupervisorOptions): AsyncGenerator<{ text: string, images?: string[], video?: string, audio?: string, thinking?: string, sources?: any[] }> {
    const { userQuery, messages, settings, llmService } = options;

    // 1. Memory Context Revival
    const { memoryService } = await import('./memory');
    const pastFacts = await memoryService.retrieveContext(userQuery, 3);
    
    let injectedMessages = [...messages];
    if (pastFacts.length > 0) {
      injectedMessages.push({
        role: 'user',
        content: `[AGENTIC MEMORY ACTIVATED: RELEVANT FACTS]\n${pastFacts.map(f => `- ${f}`).join('\n')}\n\nPlease use these facts to contextually inform your response to: ${userQuery}`,
        timestamp: Date.now(),
        images: []
      });
    }

    // 2. Intent & Multi-Agent Planning
    const intent = mcpOrchestrator.classifyIntent(userQuery);
    const mcpTools = await import('./mcp').then(m => m.mcpService.getTools()).catch(() => []);
    const availableTools = mcpTools.map((t: any) => t.name).concat(['page_navigate', 'page_extract_text']);

    const plan = mcpOrchestrator.planTools(intent, availableTools);

    let accumulatedContext = '';
    
    // 3. Multi-Agent Spawn (Parallel processing for complex parallel intents)
    if (plan.parallel.length >= 2) {
      yield { text: `\n\n[SUPERVISOR] Spawned ${plan.parallel.length} parallel sub-agents to tackle concurrent goals...\n` };
      
      const subAgentPromises = plan.parallel.map(async (task, idx) => {
        try {
          const result = await mcpOrchestrator.executeWithRetry(task);
          return `[Sub-Agent ${idx+1} (${task.name}) Result]:\n${result.content}`;
        } catch (e: any) {
          return `[Sub-Agent ${idx+1} (${task.name}) Failed]: ${e.message}`;
        }
      });

      const subAgentResults = await Promise.all(subAgentPromises);
      accumulatedContext += "\n--- PARALLEL SUB-AGENT FINDINGS ---\n" + subAgentResults.join('\n\n') + "\n-----------------------------------\n";
      
      yield { text: `[SUPERVISOR] Parallel tasks completed. Synthesizing...\n\n` };
    }

    // Insert sub-agent results into dialogue BEFORE running standard streamChat
    if (accumulatedContext) {
      injectedMessages.push({
        role: 'user',
        content: `Sub-agent background research results:\n${accumulatedContext}\nProceed to complete the objective using this data.`,
        timestamp: Date.now(),
        images: []
      });
    }

    // 4. Primary ReAct (Reason -> Act -> Observe) 
    // Handled intrinsically by the generator in geminiService/openaiService which yields `functionCall` loops!
    // We just forward the stream directly!
    let finalResponse = '';
    
    for await (const chunk of llmService.streamChat(settings, injectedMessages)) {
      if (chunk.text && chunk.text !== finalResponse) {
        finalResponse = chunk.text;
        yield chunk;
      }
    }

    // 5. Agentic Self-Reflection & Scoring
    yield { text: `\n\n[INITIATING SELF-REFLECTION...]` };
    
    const reflectionPrompt = `
      Please rate your previous response to the user's query 
      on a scale of 1 to 5 for Accuracy, Completeness, and Safety.
      Format exactly like this:
      [SCORE: X/5]
      [CONFIDENCE_FLAG: HIGH/LOW]
      Reason: ...
    `;
    
    const reflectionMessages = [
      ...injectedMessages, 
      { role: 'model', content: finalResponse, timestamp: Date.now(), images: [] },
      { role: 'user', content: reflectionPrompt, timestamp: Date.now(), images: [] }
    ];

    let reflectionResponse = '';
    // Use a lightweight, silent pass for reflection
    try {
      for await (const chunk of llmService.streamChat({ ...settings, maxTokens: 150, temperature: 0.2 }, reflectionMessages)) {
         reflectionResponse = chunk.text;
      }
    } catch(e) {
      reflectionResponse = '[SCORE: ERROR] Reflection module failure.';
    }

    yield { text: finalResponse + `\n\n--- 🧠 MODEL SELF-REFLECTION ---\n${reflectionResponse}\n--------------------------------\n` };

    // 6. Memory Persistence (Fire & Forget)
    if (reflectionResponse.includes('HIGH') || Number(reflectionResponse.match(/\[SCORE: (\d)/)?.[1]) >= 4) {
      if (finalResponse.length > 50 && finalResponse.length < 5000) {
         memoryService.saveFact(userQuery.substring(0, 50), finalResponse).catch(() => {});
      }
    }
  }
}

export const agentEngine = new AgentEngine();
