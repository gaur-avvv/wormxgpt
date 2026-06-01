import { AppSettings, Message, AgentConfig, AgentTask, ProviderType, StreamChunk } from '../types';
import { providerRouter } from './providerRouter';
import { FREE_MODEL_DEFAULTS, FALLBACK_CHAIN } from '../constants';

// ── Multi-Agent Orchestration Engine ─────────────────────────────────────────
// Supports spawning sub-agents with different models/providers,
// parallel task execution, and result aggregation.

export class MultiAgentOrchestrator {
  private agents: Map<string, AgentConfig> = new Map();
  private tasks: Map<string, AgentTask> = new Map();
  private maxAgents = 5;
  private maxDepth = 3;
  private timeout = 120000; // 2 minutes per agent

  /** Register an agent configuration */
  registerAgent(config: AgentConfig): void {
    this.agents.set(config.id, config);
  }

  /** Remove an agent */
  removeAgent(id: string): void {
    this.agents.delete(id);
  }

  /** List all registered agents */
  listAgents(): AgentConfig[] {
    return Array.from(this.agents.values());
  }

  /** Get task status */
  getTask(taskId: string): AgentTask | undefined {
    return this.tasks.get(taskId);
  }

  /** List all tasks */
  listTasks(): AgentTask[] {
    return Array.from(this.tasks.values());
  }

  /** Create default sub-agents for common tasks */
  createDefaultAgents(settings: AppSettings): void {
    const freeProvider = FALLBACK_CHAIN[0] || 'pollinations';
    const freeModel = FREE_MODEL_DEFAULTS[freeProvider] || 'openai';

    const defaults: AgentConfig[] = [
      {
        id: 'researcher',
        name: 'Research Agent',
        role: 'researcher',
        provider: freeProvider,
        model: freeModel,
        systemPrompt: '[WormGPT Research Agent] You specialize in web search, data gathering, and fact-finding. Use search tools to find information. Return concise, factual summaries.',
        tools: ['GoogleAISearch', 'DuckDuckGoSearch', 'WebCrawler', 'JinaFetch'],
      },
      {
        id: 'coder',
        name: 'Code Agent',
        role: 'coder',
        provider: settings.aiProvider || freeProvider,
        model: settings.model || freeModel,
        systemPrompt: '[WormGPT Code Agent] You specialize in code generation, debugging, and analysis. Write clean, working code. Use code execution tools when available.',
        tools: ['JDoodleCompiler', 'CodeExecutor', 'RegexTester'],
      },
      {
        id: 'analyzer',
        name: 'Analysis Agent',
        role: 'analyzer',
        provider: freeProvider,
        model: freeModel,
        systemPrompt: '[WormGPT Analysis Agent] You analyze data, summarize findings, and provide structured insights. Focus on accuracy and clarity.',
        tools: ['TextStats', 'JSONFormatter', 'CSVToJSON'],
      },
    ];

    defaults.forEach(a => this.registerAgent(a));
  }

  /**
   * Execute a task with a specific agent using streaming.
   * Returns an async generator for real-time output.
   */
  async *executeTask(
    agentId: string,
    prompt: string,
    settings: AppSettings,
    parentMessages: Message[] = [],
    signal?: AbortSignal
  ): AsyncGenerator<StreamChunk> {
    const agent = this.agents.get(agentId);
    if (!agent) {
      yield { text: `[ERROR] Agent '${agentId}' not found.`, images: [] };
      return;
    }

    const taskId = `task_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const task: AgentTask = {
      id: taskId,
      agentId,
      prompt,
      status: 'running',
      startedAt: Date.now(),
    };
    this.tasks.set(taskId, task);

    yield {
      text: `🤖 **[${agent.name}]** Starting task...\n\n`,
      images: []
    };

    // Build agent-specific settings
    const agentSettings: AppSettings = {
      ...settings,
      aiProvider: agent.provider,
      model: agent.model,
      systemInstruction: agent.systemPrompt,
      customPromptPrefix: agent.systemPrompt,
      enabledTools: agent.tools || settings.enabledTools,
    };

    // Build agent messages
    const agentMessages: Message[] = [
      ...parentMessages.slice(-4), // Include last 4 parent messages for context
      {
        role: 'user' as const,
        content: prompt,
        timestamp: Date.now(),
        agentId: agent.id,
      }
    ];

    try {
      const service = providerRouter.getService(agent.provider);
      if (!service) {
        // Fallback to router's auto-fallback
        let fullText = '';
        for await (const chunk of providerRouter.streamWithFallback(agentSettings, agentMessages, signal)) {
          fullText = chunk.text;
          yield { ...chunk, text: `**[${agent.name}]** ${chunk.text}` };
        }
        task.result = fullText;
        task.status = 'completed';
      } else {
        let fullText = '';
        for await (const chunk of service.streamChat(agentSettings, agentMessages, signal)) {
          fullText = chunk.text;
          yield { ...chunk, text: `**[${agent.name}]** ${chunk.text}` };
        }
        task.result = fullText;
        task.status = 'completed';
      }
    } catch (error: any) {
      task.status = 'failed';
      task.error = error?.message || 'Unknown error';
      yield {
        text: `**[${agent.name}]** ❌ Failed: ${task.error}`,
        images: []
      };
    } finally {
      task.completedAt = Date.now();
      this.tasks.set(taskId, task);
    }
  }

  /**
   * Execute multiple tasks in parallel with different agents.
   * Yields interleaved results from all agents.
   */
  async *executeParallel(
    taskAssignments: { agentId: string; prompt: string }[],
    settings: AppSettings,
    parentMessages: Message[] = [],
    signal?: AbortSignal
  ): AsyncGenerator<StreamChunk> {
    yield {
      text: `🔄 **[Orchestrator]** Dispatching ${taskAssignments.length} parallel tasks...\n\n`,
      images: []
    };

    // Execute all tasks and collect results
    const results: { agentId: string; chunks: StreamChunk[] }[] = [];

    // Run tasks sequentially for stable output ordering
    // (True parallel would interleave unpredictably in a single stream)
    for (const assignment of taskAssignments) {
      if (signal?.aborted) return;

      const chunks: StreamChunk[] = [];
      for await (const chunk of this.executeTask(
        assignment.agentId,
        assignment.prompt,
        settings,
        parentMessages,
        signal
      )) {
        chunks.push(chunk);
        yield chunk;
      }
      results.push({ agentId: assignment.agentId, chunks });

      yield { text: '\n---\n\n', images: [] };
    }

    // Summary
    yield {
      text: `\n✅ **[Orchestrator]** All ${taskAssignments.length} tasks completed.\n`,
      images: []
    };
  }

  /**
   * Auto-detect if a prompt should use multi-agent orchestration.
   * Returns agent assignments if multi-agent is beneficial.
   */
  analyzeForMultiAgent(prompt: string): { agentId: string; prompt: string }[] | null {
    const lower = prompt.toLowerCase();

    // Research-heavy prompts
    if (lower.includes('research') || lower.includes('compare') || lower.includes('analyze')) {
      if (this.agents.has('researcher') && this.agents.has('analyzer')) {
        return [
          { agentId: 'researcher', prompt: `Research the following: ${prompt}` },
          { agentId: 'analyzer', prompt: `Analyze and summarize findings about: ${prompt}` },
        ];
      }
    }

    // Code + research prompts
    if ((lower.includes('code') || lower.includes('implement') || lower.includes('build')) &&
        (lower.includes('research') || lower.includes('find') || lower.includes('search'))) {
      if (this.agents.has('researcher') && this.agents.has('coder')) {
        return [
          { agentId: 'researcher', prompt: `Find relevant information and examples for: ${prompt}` },
          { agentId: 'coder', prompt: `Write the code for: ${prompt}` },
        ];
      }
    }

    return null; // Single agent is sufficient
  }

  /** Reset all tasks */
  clearTasks(): void {
    this.tasks.clear();
  }

  /** Reset everything */
  reset(): void {
    this.agents.clear();
    this.tasks.clear();
  }
}

// ── Singleton ────────────────────────────────────────────────────────────────
export const multiAgentOrchestrator = new MultiAgentOrchestrator();
