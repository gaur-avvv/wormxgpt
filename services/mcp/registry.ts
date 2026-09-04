/**
 * services/mcp/registry.ts
 * ════════════════════════════════════════════════════════════════════════════════
 * Master Registry & Remote HTTPS MCP Server Engine
 * Contains the complete catalog of 100 Remote HTTPS MCP Servers and maps them
 * as live, selectable tools in the UI "Active Arsenal".
 * ════════════════════════════════════════════════════════════════════════════════
 */

import { REMOTE_MCP_DIRECTORY, RemoteMcpServer, McpCategory, MCP_CATEGORIES } from '../mcpDirectory';
import { BrowserMcpClient, McpTool } from '../mcpClient';

export interface SelectableArsenalTool {
  id: string;
  toolName: string;
  name: string;
  serverId: string;
  serverName: string;
  category: McpCategory | string;
  categoryLabel: string;
  url: string;
  transport: 'http' | 'sse';
  description: string;
  isZeroAuth: boolean;
  authType: 'public' | 'api_key' | 'oauth';
  parameters?: Record<string, any>;
  status: 'idle' | 'registered' | 'active' | 'error';
  latencyMs?: number;
  error?: string;
  isPopular?: boolean;
}

export interface McpRegistryEntry {
  server: RemoteMcpServer;
  client?: BrowserMcpClient;
  status: 'idle' | 'connecting' | 'connected' | 'error';
  discoveredTools: McpTool[];
  latencyMs?: number;
  error?: string;
}

export class McpRegistry {
  private entries: Map<string, McpRegistryEntry> = new Map();
  private initialized = false;

  constructor() {
    this.init();
  }

  private init() {
    if (this.initialized) return;
    for (const server of REMOTE_MCP_DIRECTORY) {
      this.entries.set(server.id, {
        server,
        status: 'idle',
        discoveredTools: (server.tools || []).map(tName => ({
          name: tName,
          description: `${server.name} tool for ${tName.replace(/_/g, ' ')}`,
          serverId: server.id,
          inputSchema: {
            type: 'object',
            properties: {
              query: { type: 'string', description: 'Search query or parameter input' },
              context: { type: 'string', description: 'Optional operational context' }
            }
          }
        })),
      });
    }
    this.initialized = true;
  }

  /**
   * Return the entire master list of 100 remote MCP servers
   */
  public getAllServers(): RemoteMcpServer[] {
    return REMOTE_MCP_DIRECTORY;
  }

  /**
   * Get all Zero-Auth / Public endpoints requiring no authentication
   */
  public getZeroAuthServers(): RemoteMcpServer[] {
    return REMOTE_MCP_DIRECTORY.filter(s => s.isZeroAuth || s.authType === 'public');
  }

  /**
   * Filter servers by category or zero-auth tag
   */
  public getServersByCategory(category: McpCategory | 'all' | 'zero_auth'): RemoteMcpServer[] {
    if (category === 'all') return REMOTE_MCP_DIRECTORY;
    if (category === 'zero_auth') return this.getZeroAuthServers();
    return REMOTE_MCP_DIRECTORY.filter(s => s.category === category);
  }

  /**
   * Search servers across keywords, names, tools, categories
   */
  public searchServers(query: string, category: McpCategory | 'all' | 'zero_auth' = 'all'): RemoteMcpServer[] {
    const list = this.getServersByCategory(category);
    const q = query.trim().toLowerCase();
    if (!q) return list;
    return list.filter(s =>
      s.name.toLowerCase().includes(q) ||
      s.id.toLowerCase().includes(q) ||
      s.url.toLowerCase().includes(q) ||
      s.description.toLowerCase().includes(q) ||
      s.categoryLabel.toLowerCase().includes(q) ||
      (s.tools || []).some(t => t.toLowerCase().includes(q))
    );
  }

  /**
   * Get internal entry for a given server ID
   */
  public getEntry(id: string): McpRegistryEntry | undefined {
    return this.entries.get(id);
  }

  /**
   * Get all registry entries
   */
  public getAllEntries(): McpRegistryEntry[] {
    return Array.from(this.entries.values());
  }

  /**
   * Register and initialize a remote HTTPS MCP server via Fetch RPC & list tools
   */
  public async registerServer(
    serverOrId: string | RemoteMcpServer,
    apiKey?: string
  ): Promise<McpRegistryEntry> {
    const server = typeof serverOrId === 'string'
      ? REMOTE_MCP_DIRECTORY.find(s => s.id === serverOrId || s.url === serverOrId)
      : serverOrId;

    if (!server) {
      throw new Error(`MCP Server not found: ${serverOrId}`);
    }

    let entry = this.entries.get(server.id);
    if (!entry) {
      entry = {
        server,
        status: 'idle',
        discoveredTools: [],
      };
      this.entries.set(server.id, entry);
    }

    entry.status = 'connecting';
    const start = performance.now();

    try {
      const client = new BrowserMcpClient({
        id: server.id,
        name: server.name,
        url: server.url,
        apiKey: apiKey,
        status: 'connecting',
      });

      const connectResult = await client.connect();
      const latencyMs = Math.round(performance.now() - start);

      entry.client = client;
      entry.status = 'connected';
      // Merge live discovered tools with static catalog definitions
      if (connectResult.tools && connectResult.tools.length > 0) {
        entry.discoveredTools = connectResult.tools;
      }
      entry.latencyMs = latencyMs;
      entry.error = undefined;

      return entry;
    } catch (err: any) {
      const latencyMs = Math.round(performance.now() - start);
      // Surface the failure instead of masking it as a healthy connection. The
      // static catalog tools remain available for selection, but the entry is
      // flagged so the UI and tool routing can treat this server as degraded.
      entry.status = 'error';
      entry.latencyMs = latencyMs > 0 ? latencyMs : undefined;
      entry.error = err?.message || 'MCP server connection failed';
      return entry;
    }
  }

  /**
   * Map all 100 remote MCP servers and their exported tools into selectable "Active Arsenal" tools
   */
  public mapToSelectableArsenalTools(activeToolIds: string[] = []): SelectableArsenalTool[] {
    const arsenal: SelectableArsenalTool[] = [];

    for (const server of REMOTE_MCP_DIRECTORY) {
      const entry = this.entries.get(server.id);
      const isZeroAuth = Boolean(server.isZeroAuth || server.authType === 'public');
      const toolNames = (entry?.discoveredTools?.length ? entry.discoveredTools.map(t => t.name) : server.tools) || [server.id];

      for (const tName of toolNames) {
        const fullToolId = `${server.id}:${tName}`;
        const isActive = activeToolIds.includes(fullToolId) || activeToolIds.includes(tName);
        const discovered = entry?.discoveredTools?.find(dt => dt.name === tName);

        arsenal.push({
          id: fullToolId,
          toolName: tName,
          name: `${server.name} › ${tName.replace(/_/g, ' ')}`,
          serverId: server.id,
          serverName: server.name,
          category: server.category,
          categoryLabel: server.categoryLabel,
          url: server.url,
          transport: server.transport,
          description: discovered?.description || server.description,
          isZeroAuth,
          authType: server.authType,
          parameters: discovered?.inputSchema?.properties || { query: { type: 'string', description: 'Query input' } },
          status: isActive ? 'active' : entry?.status === 'connected' ? 'registered' : 'idle',
          latencyMs: entry?.latencyMs,
          error: entry?.error,
          isPopular: server.isPopular,
        });
      }
    }

    return arsenal;
  }

  /**
   * Execute an active Arsenal tool across either local attached tools or remote MCP RPC
   */
  public async executeArsenalTool(
    toolId: string,
    args: Record<string, any> = {}
  ): Promise<{ result: any; latencyMs: number; toolName: string; serverName: string }> {
    const start = performance.now();
    let serverId = '';
    let toolName = toolId;

    if (toolId.includes(':')) {
      const parts = toolId.split(':');
      serverId = parts[0];
      toolName = parts.slice(1).join(':');
    }

    // Try executing through matching server entry
    if (serverId) {
      const entry = this.entries.get(serverId);
      if (entry && entry.client && entry.status === 'connected') {
        try {
          const res = await entry.client.executeTool(toolName, args);
          const latencyMs = Math.round(performance.now() - start);
          return {
            result: res,
            latencyMs,
            toolName,
            serverName: entry.server.name
          };
        } catch (err: any) {
          console.warn(`[McpRegistry] Client tool execution failed on ${serverId}:`, err);
        }
      }
    }

    // Try executing through global mcpService or static tools
    try {
      const { executeToolByName } = await import('../tools');
      const staticRes = await executeToolByName(toolName, args);
      const latencyMs = Math.round(performance.now() - start);
      return {
        result: staticRes,
        latencyMs,
        toolName,
        serverName: serverId || 'WormGPT Kernel'
      };
    } catch (err: any) {
      // Do NOT fabricate a success payload — that would feed a nonexistent tool
      // result into the model/UI. Surface the failure explicitly instead.
      const message = err?.message || 'Tool execution failed and no remote/local handler succeeded.';
      throw new Error(`Arsenal tool '${toolName}'${serverId ? ` (${serverId})` : ''} failed: ${message}`);
    }
  }
}

export const mcpRegistry = new McpRegistry();
export default mcpRegistry;
