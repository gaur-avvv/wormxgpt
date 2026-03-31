// ── A2A (Agent-to-Agent) Protocol Service ────────────────────────────────────
// Implements A2A protocol support for agent-to-agent communication using the
// official @a2a-js/sdk. Uses ClientFactory for automatic agent card discovery
// and transport negotiation (JSON-RPC, HTTP+JSON, gRPC).
// Reference: https://github.com/a2aproject/a2a-js

import { ClientFactory } from '@a2a-js/sdk/client';
import type { Client } from '@a2a-js/sdk/client';
import type {
  AgentCard,
  Message,
  MessageSendParams,
  Task,
  TaskStatusUpdateEvent,
  TaskArtifactUpdateEvent,
} from '@a2a-js/sdk';

// ── Re-exported types for backward compatibility ────────────────────────────
// These map SDK types to the names used throughout the xgpt codebase.

export type A2AAgentCard = AgentCard;

export type A2AMessage = Message;

export interface A2AMessagePart {
  kind: 'text' | 'data' | 'file';
  text?: string;
  data?: Record<string, unknown>;
  file?: { name: string; mimeType: string; bytes: string };
}

export type A2ATask = Task;

export interface A2AArtifact {
  artifactId: string;
  name?: string;
  parts: A2AMessagePart[];
}

export type A2AEvent =
  | Message
  | Task
  | TaskStatusUpdateEvent
  | TaskArtifactUpdateEvent;

type A2AConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error';

interface A2AAgentState {
  card: AgentCard;
  client: Client;
  status: A2AConnectionStatus;
  error?: string;
  lastPing?: number;
}

class A2AService {
  private agents: Map<string, A2AAgentState> = new Map();
  private _enabled = false;
  private factory: ClientFactory = new ClientFactory();

  get enabled(): boolean {
    return this._enabled;
  }

  set enabled(val: boolean) {
    this._enabled = val;
    if (!val) {
      this.disconnectAll();
    }
  }

  get connectedAgents(): AgentCard[] {
    return Array.from(this.agents.values())
      .filter(a => a.status === 'connected')
      .map(a => a.card);
  }

  get agentCount(): number {
    return this.agents.size;
  }

  getStatus(url: string): A2AConnectionStatus {
    return this.agents.get(this.normalizeUrl(url))?.status ?? 'disconnected';
  }

  getAgentCard(url: string): AgentCard | undefined {
    return this.agents.get(this.normalizeUrl(url))?.card;
  }

  /**
   * Normalize a URL for consistent map key lookup:
   * strips trailing slashes, lowercases protocol+host, preserves path case
   */
  private normalizeUrl(rawUrl: string): string {
    try {
      const u = new URL(rawUrl.replace(/\/+$/, ''));
      return `${u.protocol}//${u.host.toLowerCase()}${u.pathname.replace(/\/+$/, '')}${u.search}${u.hash}`;
    } catch {
      return rawUrl.replace(/\/+$/, '').toLowerCase();
    }
  }

  /**
   * Discover an A2A agent using the SDK's ClientFactory.
   * createFromUrl automatically fetches /.well-known/agent-card.json
   * and negotiates the best transport (JSON-RPC, HTTP+JSON, or gRPC).
   */
  async discoverAgent(baseUrl: string): Promise<AgentCard | null> {
    if (!this._enabled) return null;

    const normalizedUrl = this.normalizeUrl(baseUrl);

    // Set connecting state
    this.agents.set(normalizedUrl, {
      card: { name: '', description: '', url: normalizedUrl, protocolVersion: '', version: '', skills: [], capabilities: {}, defaultInputModes: [], defaultOutputModes: [] } as AgentCard,
      client: null as unknown as Client,
      status: 'connecting',
    });

    try {
      // SDK handles agent card discovery and transport selection automatically
      const client = await this.factory.createFromUrl(baseUrl);
      const card = await client.getAgentCard();

      this.agents.set(normalizedUrl, {
        card,
        client,
        status: 'connected',
        lastPing: Date.now(),
      });

      console.log(`[A2A] Discovered agent: ${card.name} at ${normalizedUrl}`);
      return card;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(`[A2A] Failed to discover agent at ${normalizedUrl}:`, message);
      this.agents.set(normalizedUrl, {
        card: { name: normalizedUrl, description: '', url: normalizedUrl, protocolVersion: '', version: '', skills: [], capabilities: {}, defaultInputModes: [], defaultOutputModes: [] } as AgentCard,
        client: null as unknown as Client,
        status: 'error',
        error: message,
      });
      return null;
    }
  }

  /**
   * Send a message to an A2A agent using the SDK client.
   * The SDK handles JSON-RPC framing, transport selection, and error handling.
   */
  async sendMessage(agentUrl: string, text: string, contextId?: string): Promise<Message | Task | null> {
    if (!this._enabled) return null;

    const state = this.agents.get(this.normalizeUrl(agentUrl));
    if (!state || state.status !== 'connected' || !state.client) {
      console.warn(`[A2A] Agent not connected: ${agentUrl}`);
      return null;
    }

    const sendParams: MessageSendParams = {
      message: {
        messageId: crypto.randomUUID(),
        role: 'user',
        parts: [{ kind: 'text', text }],
        kind: 'message',
        ...(contextId ? { contextId } : {}),
      },
    };

    try {
      const result = await state.client.sendMessage(sendParams);
      state.lastPing = Date.now();
      return result;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(`[A2A] Send message failed for ${agentUrl}:`, message);
      state.status = 'error';
      state.error = message;
      return null;
    }
  }

  /**
   * Stream a message to an A2A agent using the SDK's streaming support.
   * The SDK handles SSE parsing, transport fallback, and event deserialization.
   */
  async *streamMessage(agentUrl: string, text: string, contextId?: string): AsyncGenerator<A2AEvent> {
    if (!this._enabled) return;

    const state = this.agents.get(this.normalizeUrl(agentUrl));
    if (!state || state.status !== 'connected' || !state.client) {
      console.warn(`[A2A] Agent not connected: ${agentUrl}`);
      return;
    }

    const sendParams: MessageSendParams = {
      message: {
        messageId: crypto.randomUUID(),
        role: 'user',
        parts: [{ kind: 'text', text }],
        kind: 'message',
        ...(contextId ? { contextId } : {}),
      },
    };

    try {
      const stream = state.client.sendMessageStream(sendParams);

      for await (const event of stream) {
        yield event as A2AEvent;
      }

      state.lastPing = Date.now();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(`[A2A] Stream failed for ${agentUrl}:`, message);
      state.status = 'error';
      state.error = message;
    }
  }

  /**
   * Disconnect from an A2A agent
   */
  disconnect(url: string): void {
    this.agents.delete(this.normalizeUrl(url));
  }

  /**
   * Disconnect from all A2A agents
   */
  disconnectAll(): void {
    this.agents.clear();
  }

  /**
   * Get the xgpt agent card (for exposing as A2A server).
   * The SDK handles /.well-known/agent-card.json serving; the url field
   * points to the base URL and the SDK appends the transport path automatically.
   */
  getLocalAgentCard(): AgentCard {
    const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:5173';
    return {
      name: 'xgpt',
      description: 'AI chat agent with multi-provider LLM support, MCP tools, and app integrations',
      url: baseUrl,
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
    } as AgentCard;
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
