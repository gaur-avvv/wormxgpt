import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { SSEClientTransport } from "@modelcontextprotocol/sdk/client/sse.js";

// ── Types ────────────────────────────────────────────────────────────────────

type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error' | 'degraded';

interface ServerState {
  client: Client;
  transport: StreamableHTTPClientTransport | SSEClientTransport;
  status: ConnectionStatus;
  error?: string;
  toolCount: number;
  // Latency tracking
  lastLatencyMs: number;
  totalLatencyMs: number;
  callCount: number;
  // Circuit breaker
  consecutiveFailures: number;
  degradedSince?: number;
}

interface CallCacheEntry {
  result: string;
  timestamp: number;
}

interface ToolCallRequest {
  name: string;
  args: any;
}

// ── Vercel CORS Proxy Fetch Patcher ─────────────────────────────────────────
// On non-localhost deployments, intercept fetch() calls made by the MCP SDK
// and rewrite target URLs through /api/mcp-proxy, bypassing CORS.

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

    const shouldProxy = Array.from(_knownMcpUrls).some(mcpUrl => url.startsWith(mcpUrl));
    if (shouldProxy && !url.startsWith(proxyBase)) {
      const proxied = `${proxyBase}?url=${encodeURIComponent(url)}`;
      if (typeof input === 'string' || input instanceof URL) {
        return originalFetch(proxied, init);
      } else {
        return originalFetch(new Request(proxied, input as Request), init);
      }
    }
    return originalFetch(input, init);
  };

  _fetchPatched = true;
}

function registerMcpUrl(url: string) {
  try {
    const { origin } = new URL(url);
    _knownMcpUrls.add(origin);
  } catch (_) {}
  patchFetchForProxy();
}

// ── MCPService ───────────────────────────────────────────────────────────────

export class MCPService {
  public disableReconnect = false;
  private servers: Map<string, ServerState> = new Map();
  private reconnectTimers: Map<string, ReturnType<typeof setTimeout>> = new Map();
  private healthTimer: ReturnType<typeof setInterval> | null = null;

  // Tool lists per server
  private toolCache: Map<string, any[]> = new Map();

  // O(1) reverse index: toolName → serverUrl
  private toolNameIndex: Map<string, string> = new Map();

  // ── Call-level result cache (60s TTL) ─────────────────────────────────────
  private callCache: Map<string, CallCacheEntry> = new Map();
  private readonly CALL_CACHE_TTL = 30_000; // 30 seconds (reduced for time-sensitive tools)

  // ── Circuit Breaker ───────────────────────────────────────────────────────
  private readonly CB_FAILURE_THRESHOLD = 3;   // trips after 3 consecutive failures
  private readonly CB_RECOVERY_DELAY   = 300_000; // auto-recover after 5 minutes

  // ── Timeouts & Delays ────────────────────────────────────────────────────
  private readonly TOOL_CALL_TIMEOUT = 45_000;
  private readonly RECONNECT_BASE_DELAY = 5_000;  // Exponential backoff base
  private readonly RECONNECT_MAX_DELAY  = 120_000; // Max 2 min delay
  private reconnectAttempts: Map<string, number> = new Map();
  private readonly HEALTH_INTERVAL   = 30_000;  // 30s — detects stale connections faster
  private readonly MAX_RETRIES       = 3;
  private readonly MAX_RECONNECT_ATTEMPTS = 5;  // Stop reconnecting after 5 failed attempts

  // ─────────────────────────────────────────────────────────────────────────

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

  /** Returns per-server latency and circuit-breaker stats */
  public getServerStats(url: string): {
    lastLatencyMs: number; avgLatencyMs: number;
    consecutiveFailures: number; status: ConnectionStatus;
    isDegraded: boolean; degradedSince?: number;
  } | null {
    const s = this.servers.get(url);
    if (!s) return null;
    return {
      lastLatencyMs: s.lastLatencyMs,
      avgLatencyMs: s.callCount > 0 ? Math.round(s.totalLatencyMs / s.callCount) : 0,
      consecutiveFailures: s.consecutiveFailures,
      status: s.status,
      isDegraded: s.status === 'degraded',
      degradedSince: s.degradedSince
    };
  }

  /** Returns the call cache size (for diagnostics) */
  public getCallCacheSize(): number { return this.callCache.size; }

  // ── Curated Server List ───────────────────────────────────────────────────
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
  ];

  // ── Connect with StreamableHTTP → SSE fallback ───────────────────────────
  async connect(url: string): Promise<boolean> {
    if (this.servers.get(url)?.status === 'connected') return true;
    if (this.servers.get(url)?.status === 'connecting') return false;

    this._setStatus(url, 'connecting');
    registerMcpUrl(url);

    console.log(`[MCP] Connecting to ${url}...`);

    // Try StreamableHTTP first (modern protocol)
    try {
      const transport = new StreamableHTTPClientTransport(new URL(url));
      const client = new Client({ name: 'wormgpt_ui', version: '2.3.0' }, { capabilities: {} });
      await client.connect(transport);
      this._registerServer(url, client, transport);
      console.log(`[MCP] StreamableHTTP connected: ${url}`);
      this._startHealthCheck();
      return true;
    } catch (e1: any) {
      console.warn(`[MCP] StreamableHTTP failed for ${url}, trying SSE...`, e1.message);
    }

    // Fallback: legacy SSE transport
    try {
      const transport = new SSEClientTransport(new URL(url));
      const client = new Client({ name: 'wormgpt_ui', version: '2.3.0' }, { capabilities: {} });
      await client.connect(transport);
      this._registerServer(url, client, transport);
      console.log(`[MCP] SSE connected: ${url}`);
      this._startHealthCheck();
      return true;
    } catch (e2: any) {
      console.error(`[MCP] Both transports failed for ${url}:`, e2.message);
      this._setStatus(url, 'error', e2.message);
      this._scheduleReconnect(url);
      return false;
    }
  }

  async connectMultiple(urls: string[]): Promise<void> {
    // Disconnect removed URLs
    const toRemove = Array.from(this.servers.keys()).filter(u => !urls.includes(u));
    await Promise.allSettled(toRemove.map(u => this.disconnect(u)));
    // Connect new/existing URLs in parallel (allSettled: one failure doesn't block others)
    const results = await Promise.allSettled(
      urls.filter(u => u?.trim()).map(u => this.connect(u))
    );
    // Log failed connections
    results.forEach((r, i) => {
      if (r.status === 'rejected') {
        console.warn(`[MCP] Failed to connect ${urls[i]}: ${r.reason}`);
      }
    });
  }

  async disconnect(url?: string): Promise<void> {
    if (url) {
      const state = this.servers.get(url);
      if (state) {
        try { await state.transport.close?.(); } catch (_) {}
        this.servers.delete(url);
        this.toolCache.delete(url);
        // Remove from reverse index
        this.toolNameIndex.forEach((serverUrl, toolName) => {
          if (serverUrl === url) this.toolNameIndex.delete(toolName);
        });
      }
      const timer = this.reconnectTimers.get(url);
      if (timer) { clearTimeout(timer); this.reconnectTimers.delete(url); }
    } else {
      for (const u of Array.from(this.servers.keys())) await this.disconnect(u);
      this._stopTimers();
    }
  }

  // ── Tool Listing ─────────────────────────────────────────────────────────

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
    state.toolCount = tools.length;
    // Build reverse index for O(1) lookups
    tools.forEach((t: any) => this.toolNameIndex.set(t.name, url));
    return tools;
  }

  // ── Tool Execution with Cache + Circuit Breaker + Retry ──────────────────

  async executeTool(name: string, args: any): Promise<string> {
    // ── 1. Check call cache ───────────────────────────────────────────────
    const cacheKey = `${name}::${JSON.stringify(args ?? {})}`;
    const cached = this.callCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.CALL_CACHE_TTL) {
      console.log(`[MCP] 💾 CACHE HIT: ${name} (age: ${Date.now() - cached.timestamp}ms)`);
      return cached.result;
    }

    // ── 2. O(1) server lookup via reverse index ───────────────────────────
    let serverUrl = this.toolNameIndex.get(name);

    // If not indexed yet, populate index and retry
    if (!serverUrl) {
      for (const [url, state] of this.servers.entries()) {
        if (state.status !== 'connected') continue;
        if (!this.toolCache.has(url)) {
          try { await this.getToolsByUrl(url); } catch (_) {}
        }
      }
      serverUrl = this.toolNameIndex.get(name);
    }

    if (!serverUrl) {
      throw new Error(`Tool '${name}' not found in any connected MCP server.`);
    }

    // ── 3. Circuit breaker check ──────────────────────────────────────────
    const state = this.servers.get(serverUrl);
    if (!state) throw new Error(`Server for tool '${name}' no longer exists.`);

    if (state.status === 'degraded') {
      const elapsed = Date.now() - (state.degradedSince ?? 0);
      if (elapsed < this.CB_RECOVERY_DELAY) {
        throw new Error(
          `[Circuit Breaker] Server ${serverUrl} is degraded ` +
          `(${Math.ceil((this.CB_RECOVERY_DELAY - elapsed) / 1000)}s until auto-recovery). ` +
          `Tool '${name}' skipped.`
        );
      } else {
        // Attempt recovery
        console.log(`[MCP] 🔄 Circuit breaker: attempting recovery for ${serverUrl}`);
        state.status = 'connecting';
        state.consecutiveFailures = 0;
        await this.connect(serverUrl).catch(() => {});
        if (this.servers.get(serverUrl)?.status !== 'connected') {
          throw new Error(`[Circuit Breaker] Recovery failed for ${serverUrl}. Tool '${name}' unavailable.`);
        }
      }
    }

    if (state.status !== 'connected') {
      throw new Error(`Server for tool '${name}' is not connected (status: ${state.status}).`);
    }

    // ── 4. Execute with exponential backoff retry ─────────────────────────
    let lastError: Error | null = null;
    for (let attempt = 0; attempt < this.MAX_RETRIES; attempt++) {
      if (attempt > 0) {
        const delay = Math.pow(2, attempt - 1) * 1000; // 1s, 2s, 4s
        console.log(`[MCP] ⏳ Retry ${attempt}/${this.MAX_RETRIES - 1} for '${name}' in ${delay}ms...`);
        await new Promise(res => setTimeout(res, delay));
      }

      const callStart = Date.now();
      try {
        const timeout = new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error(`Tool '${name}' timed out after ${this.TOOL_CALL_TIMEOUT / 1000}s`)), this.TOOL_CALL_TIMEOUT)
        );

        const freshState = this.servers.get(serverUrl!);
        if (!freshState || freshState.status === 'degraded') break;

        const result: any = await Promise.race([
          freshState.client.callTool({ name, arguments: args }),
          timeout
        ]);

        const latencyMs = Date.now() - callStart;
        this._recordLatency(serverUrl!, latencyMs);
        freshState.consecutiveFailures = 0; // reset on success

        let resultStr: string;
        if (result?.content && Array.isArray(result.content)) {
          resultStr = result.content.filter((c: any) => c.type === 'text').map((c: any) => c.text).join('\n')
            || JSON.stringify(result.content);
        } else {
          resultStr = typeof result === 'string' ? result : JSON.stringify(result);
        }

        // Store in call cache
        this.callCache.set(cacheKey, { result: resultStr, timestamp: Date.now() });
        this._evictExpiredCache();

        return resultStr;

      } catch (e: any) {
        lastError = e;
        const latencyMs = Date.now() - callStart;
        this._recordLatency(serverUrl!, latencyMs);

        const freshState = this.servers.get(serverUrl!);
        if (freshState) {
          freshState.consecutiveFailures++;
          console.warn(
            `[MCP] Tool '${name}' failed (attempt ${attempt + 1}/${this.MAX_RETRIES}): ${e.message}` +
            ` [consecutive failures: ${freshState.consecutiveFailures}]`
          );

          // Trip circuit breaker
          if (freshState.consecutiveFailures >= this.CB_FAILURE_THRESHOLD) {
            console.error(`[MCP] CIRCUIT BREAKER TRIPPED for ${serverUrl} after ${freshState.consecutiveFailures} failures`);
            freshState.status = 'degraded';
            freshState.degradedSince = Date.now();
            freshState.error = e.message;
            break; // Don't retry — server is now degraded
          }
        }
      }
    }

    // All retries exhausted or circuit breaker tripped
    const freshState = this.servers.get(serverUrl!);
    if (freshState && freshState.status !== 'degraded') {
      this._scheduleReconnect(serverUrl!);
    }
    throw lastError ?? new Error(`Tool '${name}' failed after ${this.MAX_RETRIES} attempts.`);
  }

  /**
   * Execute multiple tool calls in parallel using Promise.all().
   * Independent calls are batched; failures are isolated per call.
   */
  async executeToolsBatch(calls: ToolCallRequest[]): Promise<Array<{ name: string; result?: string; error?: string }>> {
    console.log(`[MCP] Executing batch of ${calls.length} tool calls in parallel...`);
    const results = await Promise.allSettled(
      calls.map(c => this.executeTool(c.name, c.args))
    );
    return results.map((r, i) => ({
      name: calls[i].name,
      result: r.status === 'fulfilled' ? r.value : undefined,
      error: r.status === 'rejected' ? r.reason?.message : undefined
    }));
  }

  // ── Private helpers ──────────────────────────────────────────────────────

  private _registerServer(
    url: string,
    client: Client,
    transport: StreamableHTTPClientTransport | SSEClientTransport
  ) {
    this.reconnectAttempts.set(url, 0); // Reset reconnect attempts on success
    this.servers.set(url, {
      client,
      transport,
      status: 'connected',
      toolCount: 0,
      lastLatencyMs: 0,
      totalLatencyMs: 0,
      callCount: 0,
      consecutiveFailures: 0
    });
    this.toolCache.delete(url);
    // Remove stale index entries for this server
    this.toolNameIndex.forEach((serverUrl, toolName) => {
      if (serverUrl === url) this.toolNameIndex.delete(toolName);
    });
    // Pre-fetch tools to populate reverse index
    this.getToolsByUrl(url).catch(() => {});
  }

  private _setStatus(url: string, status: ConnectionStatus, error?: string) {
    const existing = this.servers.get(url);
    if (existing) {
      existing.status = status;
      existing.error = error;
    } else if (status !== 'disconnected') {
      this.servers.set(url, {
        client: null as any,
        transport: null as any,
        status,
        error,
        toolCount: 0,
        lastLatencyMs: 0,
        totalLatencyMs: 0,
        callCount: 0,
        consecutiveFailures: 0
      });
    }
  }

  private _recordLatency(url: string, latencyMs: number) {
    const s = this.servers.get(url);
    if (s) {
      s.lastLatencyMs = latencyMs;
      s.totalLatencyMs += latencyMs;
      s.callCount++;
    }
  }

  /** Evict expired call cache entries */
  private _evictExpiredCache() {
    const now = Date.now();
    for (const [key, entry] of this.callCache.entries()) {
      if (now - entry.timestamp >= this.CALL_CACHE_TTL) {
        this.callCache.delete(key);
      }
    }
  }

  private _startHealthCheck() {
    if (this.disableReconnect) return;
    if (this.healthTimer) return;
    this.healthTimer = setInterval(async () => {
      const now = Date.now();
      for (const [url, state] of this.servers.entries()) {

        // Auto-recover degraded servers after CB_RECOVERY_DELAY
        if (state.status === 'degraded' && state.degradedSince) {
          if (now - state.degradedSince >= this.CB_RECOVERY_DELAY) {
            console.log(`[MCP] Auto-recovering degraded server: ${url}`);
            state.consecutiveFailures = 0;
            state.degradedSince = undefined;
            await this.disconnect(url);
            this._scheduleReconnect(url);
          }
          continue;
        }

        if (state.status !== 'connected') continue;

        const start = Date.now();
        try {
          // Use a lightweight HEAD ping — 405 is fine (server reachable, no HEAD support)
          const origin = new URL(url).origin;
          const resp = await fetch(origin, { method: 'HEAD', signal: AbortSignal.timeout(5000) });
          const latency = Date.now() - start;
          this._recordLatency(url, latency);
          if (!resp.ok && resp.status !== 405) {
            throw new Error(`Health check HTTP ${resp.status}`);
          }
          // Reset consecutive failures on successful ping
          state.consecutiveFailures = 0;
        } catch (e: any) {
          state.consecutiveFailures++;
          console.warn(`[MCP] Health failed for ${url} (failures: ${state.consecutiveFailures})`);
          if (state.consecutiveFailures >= this.CB_FAILURE_THRESHOLD) {
            console.error(`[MCP] Server ${url} — circuit breaker tripped`);
            state.status = 'degraded';
            state.degradedSince = Date.now();
          } else {
            const attempts = this.reconnectAttempts.get(url) || 0;
            if (attempts < this.MAX_RECONNECT_ATTEMPTS) {
              await this.disconnect(url);
              this._scheduleReconnect(url);
            } else {
              state.status = 'degraded';
              state.degradedSince = Date.now();
            }
          }
        }
      }
    }, this.HEALTH_INTERVAL);
  }

  private _scheduleReconnect(url: string) {
    if (this.disableReconnect) return;
    if (this.reconnectTimers.has(url)) return;
    const attempts = this.reconnectAttempts.get(url) || 0;
    if (attempts >= this.MAX_RECONNECT_ATTEMPTS) {
      console.warn(`[MCP] Max reconnect attempts (${this.MAX_RECONNECT_ATTEMPTS}) reached for ${url}. Giving up.`);
      this._setStatus(url, 'error', 'Max reconnect attempts exceeded');
      return;
    }
    const delay = Math.min(
      this.RECONNECT_MAX_DELAY,
      this.RECONNECT_BASE_DELAY * Math.pow(2, attempts)
    );
    this.reconnectAttempts.set(url, attempts + 1);

    console.log(`[MCP] Reconnecting ${url} in ${delay / 1000}s (attempt ${attempts + 1}/${this.MAX_RECONNECT_ATTEMPTS})...`);
    const timer = setTimeout(async () => {
      this.reconnectTimers.delete(url);
      await this.connect(url);
    }, delay);
    this.reconnectTimers.set(url, timer);
  }

  private _stopTimers() {
    for (const t of this.reconnectTimers.values()) clearTimeout(t);
    this.reconnectTimers.clear();
    if (this.healthTimer) { clearInterval(this.healthTimer); this.healthTimer = null; }
  }
}

export const mcpService = new MCPService();
