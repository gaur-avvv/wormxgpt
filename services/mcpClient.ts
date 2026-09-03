export interface McpServerConfig {
  id: string;
  name: string;
  url: string;
  apiKey?: string;
  status: 'disconnected' | 'connecting' | 'connected' | 'error';
}

export interface McpTool {
  name: string;
  description?: string;
  inputSchema: any;
  serverId: string;
}

export class BrowserMcpClient {
  private sessionId: string | null = null;

  constructor(private config: McpServerConfig) {}

  private async rpc(method: string, params: any = {}) {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Accept: 'application/json, text/event-stream',
    };
    if (this.config.apiKey) headers['Authorization'] = `Bearer ${this.config.apiKey}`;
    if (this.sessionId) headers['Mcp-Session-Id'] = this.sessionId;

    const res = await fetch(this.config.url, {
      method: 'POST',
      headers,
      body: JSON.stringify({ jsonrpc: '2.0', id: Date.now(), method, params }),
    });

    const sessionHeader = res.headers.get('Mcp-Session-Id');
    if (sessionHeader) this.sessionId = sessionHeader;

    if (!res.ok) throw new Error(`MCP Error ${res.status}: ${await res.text()}`);
    const json = await res.json();
    if (json.error) throw new Error(json.error.message || 'MCP RPC Failure');
    return json.result;
  }

  async connect(): Promise<{ tools: McpTool[] }> {
    // 1. Initialize Handshake
    await this.rpc('initialize', {
      protocolVersion: '2024-11-05',
      capabilities: { tools: {} },
      clientInfo: { name: 'wormxgpt-client', version: '2.0.0' },
    });

    // 2. Acknowledge initialization
    await this.rpc('notifications/initialized');

    // 3. Fetch remote tools
    const toolsRes = await this.rpc('tools/list');
    return {
      tools: (toolsRes?.tools || []).map((t: any) => ({
        ...t,
        serverId: this.config.id,
      })),
    };
  }

  async executeTool(name: string, args: Record<string, any>) {
    return await this.rpc('tools/call', { name, arguments: args });
  }

  getStatus(): 'disconnected' | 'connecting' | 'connected' | 'error' {
    return this.config.status;
  }

  getSessionId(): string | null {
    return this.sessionId;
  }
}

export default BrowserMcpClient;
