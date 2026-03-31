// ── A2A (Agent-to-Agent) Protocol Service ────────────────────────────────────
// Implements A2A protocol support for agent-to-agent communication.
// Allows xgpt to act as both an A2A client (discover & talk to other agents)
// and expose itself as an A2A-compatible agent endpoint.
// Reference: https://github.com/a2a-js/sdk

export interface A2AAgentCard {
  name: string;
  description: string;
  url: string;
  protocolVersion: string;
  version: string;
  skills: { id: string; name: string; description: string; tags: string[] }[];
  capabilities: {
    streaming?: boolean;
    pushNotifications?: boolean;
    stateTransitionHistory?: boolean;
  };
  defaultInputModes: string[];
  defaultOutputModes: string[];
}

export interface A2AMessage {
  messageId: string;
  role: 'user' | 'agent';
  parts: A2AMessagePart[];
  kind: 'message';
  contextId?: string;
}

export interface A2AMessagePart {
  kind: 'text' | 'data' | 'file';
  text?: string;
  data?: Record<string, unknown>;
  file?: { name: string; mimeType: string; bytes: string };
}

export interface A2ATask {
  kind: 'task';
  id: string;
  contextId: string;
  status: {
    state: 'submitted' | 'working' | 'completed' | 'failed' | 'canceled';
    timestamp: string;
    message?: A2AMessage;
  };
  artifacts?: A2AArtifact[];
  history?: A2AMessage[];
}

export interface A2AArtifact {
  artifactId: string;
  name?: string;
  parts: A2AMessagePart[];
}

export type A2AEvent =
  | A2AMessage
  | A2ATask
  | { kind: 'status-update'; taskId: string; contextId: string; status: A2ATask['status']; final: boolean }
  | { kind: 'artifact-update'; taskId: string; contextId: string; artifact: A2AArtifact };

type A2AConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error';

interface A2AAgentState {
  card: A2AAgentCard;
  status: A2AConnectionStatus;
  error?: string;
  lastPing?: number;
}

class A2AService {
  private agents: Map<string, A2AAgentState> = new Map();
  private _enabled = false;
  private readonly DISCOVER_TIMEOUT = 10000;
  private readonly SEND_TIMEOUT = 30000;

  get enabled(): boolean {
    return this._enabled;
  }

  set enabled(val: boolean) {
    this._enabled = val;
    if (!val) {
      this.disconnectAll();
    }
  }

  get connectedAgents(): A2AAgentCard[] {
    return Array.from(this.agents.values())
      .filter(a => a.status === 'connected')
      .map(a => a.card);
  }

  get agentCount(): number {
    return this.agents.size;
  }

  getStatus(url: string): A2AConnectionStatus {
    return this.agents.get(url)?.status ?? 'disconnected';
  }

  getAgentCard(url: string): A2AAgentCard | undefined {
    return this.agents.get(url)?.card;
  }

  /**
   * Discover an A2A agent by fetching its agent card from the well-known URL
   */
  async discoverAgent(baseUrl: string): Promise<A2AAgentCard | null> {
    if (!this._enabled) return null;

    const normalizedUrl = baseUrl.replace(/\/$/, '');
    this.agents.set(normalizedUrl, {
      card: { name: '', description: '', url: normalizedUrl, protocolVersion: '', version: '', skills: [], capabilities: {}, defaultInputModes: [], defaultOutputModes: [] },
      status: 'connecting',
    });

    try {
      const cardUrl = `${normalizedUrl}/.well-known/agent-card.json`;
      const response = await fetch(cardUrl, {
        signal: AbortSignal.timeout(this.DISCOVER_TIMEOUT),
        headers: { 'Accept': 'application/json' },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const card: A2AAgentCard = await response.json();
      this.agents.set(normalizedUrl, {
        card: { ...card, url: card.url || normalizedUrl },
        status: 'connected',
        lastPing: Date.now(),
      });

      console.log(`[A2A] Discovered agent: ${card.name} at ${normalizedUrl}`);
      return card;
    } catch (err: any) {
      console.error(`[A2A] Failed to discover agent at ${normalizedUrl}:`, err.message);
      this.agents.set(normalizedUrl, {
        card: { name: normalizedUrl, description: '', url: normalizedUrl, protocolVersion: '', version: '', skills: [], capabilities: {}, defaultInputModes: [], defaultOutputModes: [] },
        status: 'error',
        error: err.message,
      });
      return null;
    }
  }

  /**
   * Send a message to an A2A agent and get a response
   */
  async sendMessage(agentUrl: string, text: string, contextId?: string): Promise<A2AMessage | A2ATask | null> {
    if (!this._enabled) return null;

    const state = this.agents.get(agentUrl);
    if (!state || state.status !== 'connected') {
      console.warn(`[A2A] Agent not connected: ${agentUrl}`);
      return null;
    }

    const messageId = crypto.randomUUID();
    const sendParams = {
      jsonrpc: '2.0',
      method: 'message/send',
      id: messageId,
      params: {
        message: {
          messageId,
          role: 'user' as const,
          parts: [{ kind: 'text' as const, text }],
          kind: 'message' as const,
          ...(contextId ? { contextId } : {}),
        },
      },
    };

    try {
      // Determine the JSON-RPC endpoint
      const rpcUrl = state.card.url || `${agentUrl}/a2a/jsonrpc`;

      const response = await fetch(rpcUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(sendParams),
        signal: AbortSignal.timeout(this.SEND_TIMEOUT),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();

      if (result.error) {
        throw new Error(`JSON-RPC error ${result.error.code}: ${result.error.message}`);
      }

      state.lastPing = Date.now();
      return result.result as A2AMessage | A2ATask;
    } catch (err: any) {
      console.error(`[A2A] Send message failed for ${agentUrl}:`, err.message);
      state.status = 'error';
      state.error = err.message;
      return null;
    }
  }

  /**
   * Stream a message to an A2A agent using SSE
   */
  async *streamMessage(agentUrl: string, text: string, contextId?: string): AsyncGenerator<A2AEvent> {
    if (!this._enabled) return;

    const state = this.agents.get(agentUrl);
    if (!state || state.status !== 'connected') {
      console.warn(`[A2A] Agent not connected: ${agentUrl}`);
      return;
    }

    const messageId = crypto.randomUUID();
    const sendParams = {
      jsonrpc: '2.0',
      method: 'message/stream',
      id: messageId,
      params: {
        message: {
          messageId,
          role: 'user' as const,
          parts: [{ kind: 'text' as const, text }],
          kind: 'message' as const,
          ...(contextId ? { contextId } : {}),
        },
      },
    };

    try {
      const rpcUrl = state.card.url || `${agentUrl}/a2a/jsonrpc`;

      const response = await fetch(rpcUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'text/event-stream',
        },
        body: JSON.stringify(sendParams),
        signal: AbortSignal.timeout(this.SEND_TIMEOUT),
      });

      if (!response.ok || !response.body) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const event = JSON.parse(line.slice(6));
              yield event as A2AEvent;
            } catch {
              // Skip malformed events
            }
          }
        }
      }

      state.lastPing = Date.now();
    } catch (err: any) {
      console.error(`[A2A] Stream failed for ${agentUrl}:`, err.message);
      state.status = 'error';
      state.error = err.message;
    }
  }

  /**
   * Disconnect from an A2A agent
   */
  disconnect(url: string): void {
    this.agents.delete(url);
  }

  /**
   * Disconnect from all A2A agents
   */
  disconnectAll(): void {
    this.agents.clear();
  }

  /**
   * Get the xgpt agent card (for exposing as A2A server)
   */
  getLocalAgentCard(): A2AAgentCard {
    const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:5173';
    return {
      name: 'xgpt',
      description: 'AI chat agent with multi-provider LLM support, MCP tools, and app integrations',
      url: `${baseUrl}/a2a/jsonrpc`,
      protocolVersion: '0.3.0',
      version: '2.3.0',
      skills: [
        { id: 'chat', name: 'Chat', description: 'General conversation with tool use', tags: ['chat', 'tools'] },
        { id: 'code', name: 'Code', description: 'Code generation and analysis', tags: ['code', 'developer'] },
        { id: 'search', name: 'Search', description: 'Web search and information retrieval', tags: ['search', 'osint'] },
      ],
      capabilities: {
        streaming: true,
        pushNotifications: false,
        stateTransitionHistory: false,
      },
      defaultInputModes: ['text'],
      defaultOutputModes: ['text'],
    };
  }

  /**
   * List all known agents with their status
   */
  listAgents(): Array<{ url: string; name: string; status: A2AConnectionStatus; skills: number; error?: string }> {
    return Array.from(this.agents.entries()).map(([url, state]) => ({
      url,
      name: state.card.name || url,
      status: state.status,
      skills: state.card.skills?.length ?? 0,
      error: state.error,
    }));
  }
}

export const a2aService = new A2AService();
