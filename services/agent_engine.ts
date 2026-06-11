import { Message, AppSettings } from '../types';
import { mcpOrchestrator, ToolCallRequest } from './mcp_orchestrator';

export interface SupervisorOptions {
  userQuery: string;
  messages: Message[];
  settings: AppSettings;
  streamCallback: (textChunk: string) => void;
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
      yield { text: `\n\n[SUPERVISOR] Spawned ${plan.parallel.length} parallel sub-agents...\n` };
      
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

    // Insert sub-agent results into dialogue
    if (accumulatedContext) {
      injectedMessages.push({
        role: 'user',
        content: `Sub-agent background research results:\n${accumulatedContext}\nProceed to complete the objective using this data.`,
        timestamp: Date.now(),
        images: []
      });
    }

    // 4. Primary LLM stream — forward directly, no restrictions
    let finalResponse = '';
    
    for await (const chunk of llmService.streamChat(settings, injectedMessages)) {
      if (chunk.text && chunk.text !== finalResponse) {
        finalResponse = chunk.text;
        yield chunk;
      }
    }

    // 5. Memory Persistence (Fire & Forget — only if response is substantive)
    if (finalResponse.length > 50 && finalResponse.length < 5000) {
      memoryService.saveFact(userQuery.substring(0, 50), finalResponse).catch(() => {});
    }
  }
}

export const agentEngine = new AgentEngine();
