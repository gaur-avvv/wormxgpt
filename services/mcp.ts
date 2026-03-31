import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { SSEClientTransport } from "@modelcontextprotocol/sdk/client/sse.js";
import { cacheService } from './cache';

type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error';

interface ServerState {
  client: Client;
  transport: StreamableHTTPClientTransport | SSEClientTransport;
  status: ConnectionStatus;
  error?: string;
  toolCount: number;
}

// ── Vercel CORS Proxy Fetch Patcher ────────────────────────────────────────
// On non-localhost deployments, intercept all fetch() calls made by the MCP
// SDK and rewrite target URLs through /api/mcp-proxy. This handles ALL
// internal SDK requests (initial connect, SSE reconnects, session DELETE, etc.)
// without needing to modify transport constructors.

let _fetchPatched = false;
const _knownMcpUrls = new Set<string>();

function patchFetchForProxy() {
  if (_fetchPatched || typeof window === 'undefined') return;
  const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
  if (isLocalhost) return;

  const proxyBase = `${window.location.origin}/api/mcp-proxy`;
  const originalFetch = window.fetch.bind(window);

  window.fetch = function patchedFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
    let url: string;
    if (typeof input === 'string') url = input;
    else if (input instanceof URL) url = input.href;
    else url = (input as Request).url;

    // Only proxy URLs that belong to registered MCP servers
    const shouldProxy = Array.from(_knownMcpUrls).some(mcpUrl => url.startsWith(mcpUrl));
    if (shouldProxy && !url.startsWith(proxyBase)) {
      const proxied = `${proxyBase}?url=${encodeURIComponent(url)}`;
      if (typeof input === 'string' || input instanceof URL) {
        return originalFetch(proxied, init);
      } else {
        // Request object — rebuild with proxied URL
        return originalFetch(new Request(proxied, input as Request), init);
      }
    }
    return originalFetch(input, init);
  };

  _fetchPatched = true;
}

function registerMcpUrl(url: string) {
  // Register the base origin so all paths under it get proxied
  try {
    const { origin } = new URL(url);
    _knownMcpUrls.add(origin);
  } catch (_) {}
  patchFetchForProxy();
}

export class MCPService {
  private servers: Map<string, ServerState> = new Map();
  private reconnectTimers: Map<string, ReturnType<typeof setTimeout>> = new Map();
  private healthTimer: ReturnType<typeof setInterval> | null = null;
  private toolCache: Map<string, any[]> = new Map();
  private readonly TOOL_CALL_TIMEOUT = 45000;
  private readonly RECONNECT_DELAY = 10000;

  public get isConnected(): boolean {
    return Array.from(this.servers.values()).some(s => s.status === 'connected');
  }

  public get connectedUrls(): string[] {
    return Array.from(this.servers.entries())
      .filter(([, s]) => s.status === 'connected')
      .map(([url]) => url);
  }

  public getStatus(url: string): ConnectionStatus {
    return this.servers.get(url)?.status ?? 'disconnected';
  }

  public getToolCount(url: string): number {
    return this.servers.get(url)?.toolCount ?? 0;
  }

  public readonly CURATED_SERVERS = [
    // ── Web & Content ────────────────────────────────────────────────────
    {
      name: 'Fetch (Web Content)',
      url: 'https://fetch.mcp.run/sse',
      category: 'Web',
      description: 'Fetch any URL and convert to markdown',
      auth: 'none',
      transport: 'sse'
    },
    {
      name: 'DeepWiki (GitHub Docs)',
      url: 'https://mcp.deepwiki.com/mcp',
      category: 'Web',
      description: 'AI-powered GitHub repo documentation search',
      auth: 'none',
      transport: 'streamable'
    },
    {
      name: 'GitMCP (Any GitHub Repo)',
      url: 'https://gitmcp.io/mcp',
      category: 'Web',
      description: 'Instant MCP for any GitHub repo — replace github.com with gitmcp.io',
      auth: 'none',
      transport: 'streamable'
    },
    {
      name: 'Echo (Test/Debug)',
      url: 'https://echo.mcp.inevitable.fyi/mcp',
      category: 'Web',
      description: 'Public test server — echoes back any tool call',
      auth: 'none',
      transport: 'streamable'
    },

    // ── Search & Data Extraction ─────────────────────────────────────────
    {
      name: 'Apify (4000+ Scrapers)',
      url: 'https://mcp.apify.com/sse',
      category: 'Search',
      description: '4000+ web scraping & automation actors',
      auth: 'bearer',
      transport: 'sse'
    },
    {
      name: 'Firecrawl (Web Scraping)',
      url: 'https://mcp.firecrawl.dev/{API_KEY}/sse',
      category: 'Search',
      description: 'Advanced web scraping, crawling, deep research',
      auth: 'key-in-url',
      transport: 'sse'
    },
    {
      name: 'Exa Search',
      url: 'https://mcp.exa.ai/sse',
      category: 'Search',
      description: 'Neural search engine for the web',
      auth: 'bearer',
      transport: 'sse'
    },
    {
      name: 'Tavily Search',
      url: 'https://mcp.tavily.com/mcp',
      category: 'Search',
      description: 'AI-optimized web search',
      auth: 'bearer',
      transport: 'streamable'
    },
    {
      name: 'Brave Search',
      url: 'https://search.mcp.brave.com/sse',
      category: 'Search',
      description: 'Privacy-focused web search',
      auth: 'bearer',
      transport: 'sse'
    },
    {
      name: 'BGPT (Scientific Papers)',
      url: 'https://mcp.bgpt.pro/mcp',
      category: 'Search',
      description: 'Scientific paper search with structured experimental data',
      auth: 'none',
      transport: 'streamable'
    },
    {
      name: '402.bot Discovery Oracle',
      url: 'https://api.402.bot/mcp',
      category: 'Search',
      description: 'Discover live agent APIs, search ranked endpoints',
      auth: 'none',
      transport: 'streamable'
    },

    // ── Reasoning & Memory ───────────────────────────────────────────────
    {
      name: 'Sequential Thinking',
      url: 'https://sequential-thinking.mcp.run/sse',
      category: 'Reasoning',
      description: 'Structured step-by-step reasoning for complex problems',
      auth: 'none',
      transport: 'sse'
    },
    {
      name: 'Context7 (Docs/Memory)',
      url: 'https://mcp.context7.com/sse',
      category: 'Memory',
      description: 'Up-to-date library docs & persistent memory',
      auth: 'none',
      transport: 'sse'
    },
    {
      name: 'Roundtable (Multi-Model AI)',
      url: 'https://mcp.roundtable.now/mcp',
      category: 'Reasoning',
      description: 'Council of AI models debate & synthesize answers',
      auth: 'none',
      transport: 'streamable'
    },

    // ── Developer Tools ──────────────────────────────────────────────────
    {
      name: 'GitHub (Copilot)',
      url: 'https://api.githubcopilot.com/mcp',
      category: 'Dev',
      description: 'GitHub repos, issues, PRs via Copilot',
      auth: 'bearer',
      transport: 'streamable'
    },
    {
      name: 'Semgrep (Security Scanner)',
      url: 'https://mcp.semgrep.ai/mcp',
      category: 'Dev',
      description: 'Scan code for vulnerabilities with Semgrep',
      auth: 'none',
      transport: 'streamable'
    },
    {
      name: 'Smithery Registry',
      url: 'https://server.smithery.ai/@smithery/registry/mcp',
      category: 'Dev',
      description: '7000+ community MCP servers registry',
      auth: 'bearer',
      transport: 'streamable'
    },
    {
      name: 'Linear (Project Mgmt)',
      url: 'https://mcp.linear.app/sse',
      category: 'Dev',
      description: 'Issues, projects, engineering workflows',
      auth: 'oauth',
      transport: 'sse'
    },
    {
      name: 'Sentry (Error Monitoring)',
      url: 'https://mcp.sentry.io/sse',
      category: 'Dev',
      description: 'Error monitoring and debugging across projects',
      auth: 'oauth',
      transport: 'sse'
    },

    // ── Finance & Crypto ─────────────────────────────────────────────────
    {
      name: 'CoinGecko (Crypto)',
      url: 'https://stagingxyz.mcp.api.coingecko.com/sse',
      category: 'Finance',
      description: 'Real-time crypto prices and market data',
      auth: 'none',
      transport: 'sse'
    },
    {
      name: 'Chainflip (Cross-Chain Swaps)',
      url: 'https://chainflip-broker.io/mcp',
      category: 'Finance',
      description: 'Cross-chain crypto swaps, quotes, tracking',
      auth: 'none',
      transport: 'streamable'
    },

    // ── Data & Science ───────────────────────────────────────────────────
    {
      name: 'Wolfram Alpha',
      url: 'https://mcp.wolframalpha.com/sse',
      category: 'Science',
      description: 'Computational knowledge engine',
      auth: 'bearer',
      transport: 'sse'
    },
    {
      name: 'OpenMeteo (Weather)',
      url: 'https://mcp.open-meteo.com/sse',
      category: 'Data',
      description: 'Free weather forecasts worldwide',
      auth: 'none',
      transport: 'sse'
    },
    {
      name: 'Globalping (Network)',
      url: 'https://mcp.globalping.io/sse',
      category: 'OSINT',
      description: 'Global network diagnostics: ping, traceroute, DNS',
      auth: 'none',
      transport: 'sse'
    },

    // ── Automation & Integration ─────────────────────────────────────────
    {
      name: 'Zapier (7000+ Apps)',
      url: 'https://mcp.zapier.com/api/mcp/mcp',
      category: 'Automation',
      description: 'Connect 7000+ apps with fine-grained action control',
      auth: 'bearer',
      transport: 'streamable'
    },
    {
      name: 'Composio (Multi-App)',
      url: 'https://mcp.composio.dev/mcp',
      category: 'Automation',
      description: 'Multiple app endpoints with built-in auth',
      auth: 'bearer',
      transport: 'streamable'
    },
    {
      name: 'Pipedream (2500+ APIs)',
      url: 'https://remote.mcp.pipedream.net/mcp',
      category: 'Automation',
      description: '2500+ APIs and 10000+ integration tools',
      auth: 'bearer',
      transport: 'streamable'
    },

    // ── Productivity ─────────────────────────────────────────────────────
    {
      name: 'Notion',
      url: 'https://mcp.notion.com/sse',
      category: 'Productivity',
      description: 'Read/write Notion pages and databases',
      auth: 'oauth',
      transport: 'sse'
    },
    {
      name: 'Asana (Project Mgmt)',
      url: 'https://mcp.asana.com/sse',
      category: 'Productivity',
      description: 'Task and project management via Asana',
      auth: 'oauth',
      transport: 'sse'
    },
    {
      name: 'Atlassian (Jira/Confluence)',
      url: 'https://mcp.atlassian.com/sse',
      category: 'Productivity',
      description: 'Jira issues and Confluence docs',
      auth: 'oauth',
      transport: 'sse'
    },
    {
      name: 'Tally (Forms)',
      url: 'https://api.tally.so/mcp',
      category: 'Productivity',
      description: 'Build forms with natural language',
      auth: 'bearer',
      transport: 'streamable'
    },

    // ── AI & Agents ──────────────────────────────────────────────────────
    {
      name: 'Replicate (AI Models)',
      url: 'https://mcp.replicate.com/sse',
      category: 'AI',
      description: 'Run any AI model on Replicate',
      auth: 'bearer',
      transport: 'sse'
    },
    {
      name: 'Hugging Face',
      url: 'https://huggingface.co/mcp/sse',
      category: 'AI',
      description: 'Access HuggingFace models and datasets',
      auth: 'bearer',
      transport: 'sse'
    },

    // ── Browser Automation ────────────────────────────────────────────────
    {
      name: 'TinyFish Web Agent',
      url: 'https://agent.tinyfish.ai/mcp',
      category: 'Automation',
      description: 'AI-powered browser automation: navigate sites, extract data, fill forms using natural language',
      auth: 'bearer',
      transport: 'streamable'
    },
  ];

  // ── Connect with StreamableHTTP → SSE fallback ──────────────────────────
  async connect(url: string): Promise<boolean> {
    if (this.servers.get(url)?.status === 'connected') return true;
    if (this.servers.get(url)?.status === 'connecting') return false;

    this._setStatus(url, 'connecting');

    // Register URL with the fetch patcher so all SDK-internal requests
    // (reconnects, session management, etc.) are automatically proxied
    registerMcpUrl(url);

    console.log(`[MCP] 📡 Connecting to ${url}...`);

    // Try StreamableHTTP first (modern protocol)
    try {
      const transport = new StreamableHTTPClientTransport(new URL(url));
      const client = new Client({ name: 'wormgpt_ui', version: '2.2.0' }, { capabilities: {} });
      await client.connect(transport);
      this._registerServer(url, client, transport);
      console.log(`[MCP] ✅ StreamableHTTP connected: ${url}`);
      this._startHealthCheck();
      return true;
    } catch (e1: any) {
      console.warn(`[MCP] StreamableHTTP failed for ${url}, trying SSE...`, e1.message);
    }

    // Fallback: legacy SSE transport
    try {
      const transport = new SSEClientTransport(new URL(url));
      const client = new Client({ name: 'wormgpt_ui', version: '2.2.0' }, { capabilities: {} });
      await client.connect(transport);
      this._registerServer(url, client, transport);
      console.log(`[MCP] ✅ SSE connected: ${url}`);
      this._startHealthCheck();
      return true;
    } catch (e2: any) {
      console.error(`[MCP] ❌ Both transports failed for ${url}:`, e2.message);
      this._setStatus(url, 'error', e2.message);
      this._scheduleReconnect(url);
      return false;
    }
  }

  async connectMultiple(urls: string[]): Promise<void> {
    // Disconnect removed URLs
    const toRemove = Array.from(this.servers.keys()).filter(u => !urls.includes(u));
    await Promise.all(toRemove.map(u => this.disconnect(u)));
    // Connect new/existing URLs
    await Promise.all(urls.filter(u => u?.trim()).map(u => this.connect(u)));
  }

  async disconnect(url?: string): Promise<void> {
    if (url) {
      const state = this.servers.get(url);
      if (state) {
        try { await state.transport.close?.(); } catch (_) {}
        this.servers.delete(url);
        this.toolCache.delete(url);
      }
      const timer = this.reconnectTimers.get(url);
      if (timer) { clearTimeout(timer); this.reconnectTimers.delete(url); }
    } else {
      for (const u of Array.from(this.servers.keys())) await this.disconnect(u);
      this._stopTimers();
    }
  }

  async getTools(): Promise<any[]> {
    const allTools: any[] = [];
    await Promise.all(Array.from(this.servers.entries())
      .filter(([, s]) => s.status === 'connected')
      .map(async ([url]) => {
        try {
          const tools = await this.getToolsByUrl(url);
          allTools.push(...tools);
        } catch (e) {
          console.error(`[MCP] Failed to list tools for ${url}:`, e);
        }
      }));
    return allTools;
  }

  async getToolsByUrl(url: string): Promise<any[]> {
    if (this.toolCache.has(url)) return this.toolCache.get(url)!;
    const state = this.servers.get(url);
    if (!state || state.status !== 'connected') return [];
    const response = await state.client.listTools();
    const tools = response.tools || [];
    this.toolCache.set(url, tools);
    // Update tool count
    state.toolCount = tools.length;
    return tools;
  }

  async executeTool(name: string, args: any, options?: { useCache?: boolean }): Promise<string> {
    const useCache = options?.useCache ?? false;
    const argsStr = JSON.stringify(args || {});

    // Only check cache when explicitly opted in (for read-only, idempotent tools)
    if (useCache && cacheService.isConfigured) {
      const cached = await cacheService.getCachedToolResult(name, argsStr);
      if (cached) {
        console.log(`[MCP] Cache hit for tool '${name}'`);
        return cached;
      }
    }

    // Find which server has this tool
    for (const [url, tools] of this.toolCache.entries()) {
      if (tools.find((t: any) => t.name === name)) {
        const state = this.servers.get(url);
        if (!state || state.status !== 'connected') {
          throw new Error(`Server for tool '${name}' is not connected.`);
        }

        const timeout = new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error(`Tool '${name}' timed out after ${this.TOOL_CALL_TIMEOUT / 1000}s`)), this.TOOL_CALL_TIMEOUT)
        );

        try {
          const result: any = await Promise.race([
            state.client.callTool({ name, arguments: args }),
            timeout
          ]);
          let resultStr: string;
          if (result?.content && Array.isArray(result.content)) {
            resultStr = result.content.filter((c: any) => c.type === 'text').map((c: any) => c.text).join('\n')
              || JSON.stringify(result.content);
          } else {
            resultStr = typeof result === 'string' ? result : JSON.stringify(result);
          }

          // Only cache when explicitly opted in
          if (useCache && cacheService.isConfigured) {
            cacheService.cacheToolResult(name, argsStr, resultStr, 600).catch(() => {});
          }

          return resultStr;
        } catch (e: any) {
          console.error(`[MCP] Tool execution failed (${name} @ ${url}):`, e.message);
          this._setStatus(url, 'error', e.message);
          this._scheduleReconnect(url);
          throw e;
        }
      }
    }
    throw new Error(`Tool '${name}' not found in any connected MCP server.`);
  }

  // ── Private helpers ──────────────────────────────────────────────────────

  private _registerServer(url: string, client: Client, transport: StreamableHTTPClientTransport | SSEClientTransport) {
    this.servers.set(url, { client, transport, status: 'connected', toolCount: 0 });
    this.toolCache.delete(url); // clear stale cache on reconnect
    // Pre-fetch tools in background
    this.getToolsByUrl(url).catch(() => {});
  }

  private _setStatus(url: string, status: ConnectionStatus, error?: string) {
    const existing = this.servers.get(url);
    if (existing) {
      existing.status = status;
      existing.error = error;
    } else if (status !== 'disconnected') {
      // placeholder while connecting
      this.servers.set(url, { client: null as any, transport: null as any, status, error, toolCount: 0 });
    }
  }

  private _startHealthCheck() {
    if (this.healthTimer) return;
    this.healthTimer = setInterval(async () => {
      for (const [url, state] of this.servers.entries()) {
        if (state.status !== 'connected') continue;
        try {
          await state.client.listTools();
        } catch (e) {
          console.warn(`[MCP] Health check failed for ${url} — reconnecting`);
          await this.disconnect(url);
          this._scheduleReconnect(url);
        }
      }
    }, 60000);
  }

  private _scheduleReconnect(url: string) {
    if (this.reconnectTimers.has(url)) return;
    console.log(`[MCP] 🔄 Reconnecting ${url} in ${this.RECONNECT_DELAY / 1000}s...`);
    const timer = setTimeout(async () => {
      this.reconnectTimers.delete(url);
      await this.connect(url);
    }, this.RECONNECT_DELAY);
    this.reconnectTimers.set(url, timer);
  }

  private _stopTimers() {
    for (const t of this.reconnectTimers.values()) clearTimeout(t);
    this.reconnectTimers.clear();
    if (this.healthTimer) { clearInterval(this.healthTimer); this.healthTimer = null; }
  }
}

export const mcpService = new MCPService();
