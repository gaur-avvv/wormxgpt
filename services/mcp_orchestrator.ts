/**
 * mcp_orchestrator.ts
 * ════════════════════════════════════════════════════════════════════════════════
 * WormGPT Elite MCP Orchestration Engine v1.0
 *
 * Full orchestration pipeline:
 *  1. Intent Classification   — what does this request need?
 *  2. Tool Planning           — which tools, in what order, parallel vs sequential?
 *  3. Execution with Retry    — exponential backoff, max 3 retries, circuit-breaker aware
 *  4. Result Aggregation      — deduplication + content merging
 *  5. Context Injection       — provenance-tagged messages injected back to the model
 * ════════════════════════════════════════════════════════════════════════════════
 */

import { mcpService } from './mcp';
import { Message } from '../types';
import {
  countTokensForRequest,
  shouldTriggerSummarization,
  summarizeToolResults,
  pruneStaleToolResults,
  estimateTokens
} from '../utils/tokenManager';
import { chromeBridge } from './chrome_mcp_integration';

// ── Types ────────────────────────────────────────────────────────────────────

export interface ToolCallRequest {
  name: string;
  args: Record<string, any>;
  /** Describes why this tool was chosen */
  rationale?: string;
  /** If true, can be run in parallel with other parallel=true calls */
  parallel?: boolean;
}

export interface ToolResult {
  toolName: string;
  serverUrl?: string;
  content: string;
  latencyMs: number;
  fromCache: boolean;
  error?: string;
  timestamp: number;
}

export interface ToolPlan {
  parallel: ToolCallRequest[];
  sequential: ToolCallRequest[];
  reasoning: string;
}

export interface AggregatedResult {
  results: ToolResult[];
  deduplicated: ToolResult[];
  contentHashes: Set<string>;
  totalLatencyMs: number;
  cacheHits: number;
  errors: number;
}

export interface Intent {
  needsSearch: boolean;
  needsRealtime: boolean;
  needsCode: boolean;
  needsFile: boolean;
  needsSystem: boolean;
  needsNetworkRecon: boolean;
  needsGitHub: boolean;
  needsWeather: boolean;
  needsMemory: boolean;
  needsBrowser: boolean;
  raw: string;
}

// ── Retry Config ─────────────────────────────────────────────────────────────

const RETRY_CONFIG = {
  maxRetries: 3,
  baseDelayMs: 1000,  // 1s, 2s, 4s (exponential)
  timeoutMs: 45_000,
};

// ── Simple Content Hash ───────────────────────────────────────────────────────
// Used for deduplication. Not crypto-strength; just needs to detect exact duplicates.
function contentHash(s: string): string {
  let hash = 0;
  for (let i = 0; i < Math.min(s.length, 2048); i++) {
    hash = ((hash << 5) - hash) + s.charCodeAt(i);
    hash |= 0;
  }
  return hash.toString(36);
}

// ── MCPOrchestrator ──────────────────────────────────────────────────────────

export class MCPOrchestrator {
  private executionHistory: ToolResult[] = [];
  private readonly MAX_HISTORY = 50;

  // ─────────────────────────────────────────────────────────────────────────
  // 1. Intent Classification
  // ─────────────────────────────────────────────────────────────────────────

  classifyIntent(userQuery: string): Intent {
    const q = userQuery.toLowerCase();

    const has = (...terms: string[]) => terms.some(t => q.includes(t));

    const intent: Intent = {
      needsSearch: has(
        'search', 'find', 'look up', 'what is', 'who is', 'tell me about',
        'latest', 'recent', 'news', 'today', 'trending', 'current'
      ),
      needsRealtime: has(
        'now', 'today', 'current', 'live', 'price', 'stock', 'weather',
        'trending', 'latest', 'real-time', 'breaking'
      ),
      needsCode: has(
        'code', 'script', 'function', 'debug', 'compile', 'run', 'execute',
        'program', 'python', 'javascript', 'bash', 'shell', 'npm', 'pip'
      ),
      needsFile: has(
        'file', 'directory', 'folder', 'read', 'write', 'save', 'open',
        'path', 'disk', 'ls', 'list files', 'filesystem'
      ),
      needsSystem: has(
        'system', 'cpu', 'memory', 'ram', 'process', 'uptime', 'disk usage',
        'network interface', 'os', 'env', 'environment variable'
      ),
      needsNetworkRecon: has(
        'dns', 'ip', 'domain', 'whois', 'ping', 'port', 'subnet', 'traceroute',
        'network', 'bgp', 'ssl', 'certificate', 'mx record', 'nslookup'
      ),
      needsGitHub: has(
        'github', 'repo', 'repository', 'commit', 'issue', 'pull request',
        'branch', 'fork', 'star', 'git', 'gist'
      ),
      needsWeather: has(
        'weather', 'forecast', 'temperature', 'rain', 'wind', 'humidity',
        'alert', 'storm', 'climate', 'celsius', 'fahrenheit'
      ),
      needsMemory: has(
        'remember', 'recall', 'save this', 'store', 'memory', 'note',
        'previously', 'last time', 'earlier you said'
      ),
      needsBrowser: has(
        'screenshot', 'browser', 'puppeteer', 'playwright', 'scrape',
        'headless', 'click', 'fill form', 'navigate to', 'open page'
      ),
      raw: userQuery
    };

    const active = Object.entries(intent)
      .filter(([k, v]) => k !== 'raw' && v === true)
      .map(([k]) => k);
    console.log(`[Orchestrator] 🧠 Intent: [${active.join(', ')}] for: "${userQuery.substring(0, 80)}"`);

    return intent;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // 2. Tool Planning
  // ─────────────────────────────────────────────────────────────────────────

  planTools(intent: Intent, availableTools: string[]): ToolPlan {
    const has = (name: string) => availableTools.includes(name);
    const parallel: ToolCallRequest[] = [];
    const sequential: ToolCallRequest[] = [];
    const reasons: string[] = [];

    // Realtime/search → can run in parallel with other searches
    if (intent.needsRealtime && has('GetCurrentDateTime')) {
      parallel.push({
        name: 'GetCurrentDateTime', args: {},
        rationale: 'Establishes temporal context for realtime queries', parallel: true
      });
      reasons.push('GetCurrentDateTime for temporal grounding');
    }

    if (intent.needsSearch) {
      if (has('SearchWeb')) {
        parallel.push({
          name: 'SearchWeb', args: { query: intent.raw },
          rationale: 'Primary web search', parallel: true
        });
        reasons.push('SearchWeb (primary)');
      }
      if (intent.needsRealtime && has('JinaSearch')) {
        parallel.push({
          name: 'JinaSearch', args: { query: intent.raw },
          rationale: 'Secondary search for cross-verification', parallel: true
        });
        reasons.push('JinaSearch (realtime fallback)');
      }
    }

    // GitHub → parallel with search
    if (intent.needsGitHub) {
      // Repo lookup needs owner/repo — just add as hint; model will supply args
      if (has('get_github_repo')) {
        parallel.push({
          name: 'get_github_repo', args: {},
          rationale: 'GitHub metadata lookup', parallel: true
        });
        reasons.push('get_github_repo');
      }
    }

    // Weather
    if (intent.needsWeather) {
      if (has('GetWeather') || has('get_alerts') || has('get_forecast')) {
        parallel.push({
          name: has('GetWeather') ? 'GetWeather' : 'get_forecast',
          args: {},
          rationale: 'Weather data retrieval', parallel: true
        });
        reasons.push('weather tool');
      }
    }

    // File + System → sequential (depend on path args)
    if (intent.needsFile) {
      if (has('read_file')) sequential.push({ name: 'read_file', args: {}, rationale: 'File I/O' });
      if (has('list_directory')) sequential.push({ name: 'list_directory', args: {}, rationale: 'Directory listing' });
      reasons.push('filesystem tools (sequential)');
    }

    if (intent.needsSystem) {
      parallel.push({ name: 'get_system_stats', args: {}, rationale: 'System diagnostics', parallel: true });
      reasons.push('get_system_stats');
    }

    // Network recon → parallel DNS + ping
    if (intent.needsNetworkRecon) {
      if (has('get_dns_records')) {
        parallel.push({ name: 'get_dns_records', args: {}, rationale: 'DNS lookup', parallel: true });
        reasons.push('get_dns_records');
      }
      if (has('ping_host')) {
        parallel.push({ name: 'ping_host', args: {}, rationale: 'Connectivity check', parallel: true });
        reasons.push('ping_host');
      }
    }

    // Memory → sequential (read first, then search)
    if (intent.needsMemory && has('read_memory')) {
      sequential.unshift({ name: 'read_memory', args: {}, rationale: 'Context retrieval from memory' });
      reasons.push('read_memory (first step)');
    }

    // Browser automation → always sequential
    if (intent.needsBrowser) {
      if (has('page_navigate')) {
        sequential.push({ name: 'page_navigate', args: {}, rationale: 'Navigate to target page' });
        sequential.push({ name: 'page_extract_text', args: {}, rationale: 'Fetch page content' });
        reasons.push('chrome browser toolkit (sequential)');
      } else if (has('run_puppeteer_script')) {
        sequential.push({ name: 'run_puppeteer_script', args: {}, rationale: 'Browser automation fallback' });
        reasons.push('run_puppeteer_script (sequential)');
      }
    }

    // Code → sequential (model needs to build the script)
    if (intent.needsCode && has('run_shell_command')) {
      sequential.push({ name: 'run_shell_command', args: {}, rationale: 'Code execution' });
      reasons.push('run_shell_command (sequential)');
    }

    const totalTools = parallel.length + sequential.length;
    let reasoning = `Plan: ${parallel.length} parallel + ${sequential.length} sequential = ${totalTools} tools total.\n`;
    reasoning += `Selected: ${reasons.join(', ')}`;

    console.log(`[Orchestrator] 📋 ${reasoning}`);
    return { parallel, sequential, reasoning };
  }

  // ─────────────────────────────────────────────────────────────────────────
  // 3. Execute with Retry (exponential backoff)
  // ─────────────────────────────────────────────────────────────────────────

  async executeWithRetry(call: ToolCallRequest, overrideArgs?: Record<string, any>): Promise<ToolResult> {
    const args = overrideArgs ?? call.args;
    const callStart = Date.now();
    let lastError: Error | null = null;

    for (let attempt = 0; attempt < RETRY_CONFIG.maxRetries; attempt++) {
      if (attempt > 0) {
        const delay = Math.pow(2, attempt - 1) * RETRY_CONFIG.baseDelayMs;
        console.log(`[Orchestrator] ⏳ Retry ${attempt} for '${call.name}' in ${delay}ms...`);
        await new Promise(res => setTimeout(res, delay));
      }

      const attemptStart = Date.now();
      try {
        let content;
        
        // Route wrapped chrome tools through the secure integration
        if (call.name.startsWith('page_')) {
          const m = chromeBridge as Record<string, any>;
          if (typeof m[call.name] === 'function') {
            const argVals = Object.values(args);
            content = await m[call.name](...argVals);
          } else {
            throw new Error(`Wrapped browser tool ${call.name} not implemented.`);
          }
        } else {
          content = await mcpService.executeTool(call.name, args);
        }

        const latencyMs = Date.now() - attemptStart;
        const fromCache = content === (await this._peekCache(call.name, args));

        const result: ToolResult = {
          toolName: call.name,
          content,
          latencyMs,
          fromCache,
          timestamp: Date.now()
        };

        this._addToHistory(result);
        console.log(`[Orchestrator] ✅ '${call.name}' OK (${latencyMs}ms, attempt ${attempt + 1})`);
        return result;

      } catch (e: any) {
        lastError = e;
        const latencyMs = Date.now() - attemptStart;
        console.warn(`[Orchestrator] ⚠️ '${call.name}' attempt ${attempt + 1} failed (${latencyMs}ms): ${e.message}`);

        // Don't retry circuit-breaker stops
        if (e.message.includes('[Circuit Breaker]')) {
          console.error(`[Orchestrator] 🔴 Circuit breaker active — skipping retries for '${call.name}'`);
          break;
        }
      }
    }

    const errorResult: ToolResult = {
      toolName: call.name,
      content: '',
      latencyMs: Date.now() - callStart,
      fromCache: false,
      timestamp: Date.now(),
      error: lastError?.message ?? 'Unknown error'
    };
    this._addToHistory(errorResult);
    return errorResult;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // 4. Execute Plan (parallel + sequential)
  // ─────────────────────────────────────────────────────────────────────────

  async executePlan(
    plan: ToolPlan,
    argsOverrides?: Record<string, Record<string, any>>
  ): Promise<AggregatedResult> {
    const allResults: ToolResult[] = [];

    // Run parallel calls concurrently
    if (plan.parallel.length > 0) {
      console.log(`[Orchestrator] ⚡ Running ${plan.parallel.length} tools in parallel...`);
      const parallelResults = await Promise.allSettled(
        plan.parallel.map(call =>
          this.executeWithRetry(call, argsOverrides?.[call.name])
        )
      );
      for (const r of parallelResults) {
        if (r.status === 'fulfilled') allResults.push(r.value);
        else console.error(`[Orchestrator] Parallel tool failed:`, r.reason?.message);
      }
    }

    // Run sequential calls in order
    if (plan.sequential.length > 0) {
      console.log(`[Orchestrator] 🔗 Running ${plan.sequential.length} tools sequentially...`);
      for (const call of plan.sequential) {
        const result = await this.executeWithRetry(call, argsOverrides?.[call.name]);
        allResults.push(result);
      }
    }

    return this.aggregateResults(allResults);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // 5. Result Aggregation & Deduplication
  // ─────────────────────────────────────────────────────────────────────────

  aggregateResults(results: ToolResult[]): AggregatedResult {
    const seen = new Set<string>();
    const deduplicated: ToolResult[] = [];
    let cacheHits = 0;
    let errors = 0;
    let totalLatencyMs = 0;

    for (const r of results) {
      totalLatencyMs += r.latencyMs;
      if (r.fromCache) cacheHits++;
      if (r.error) { errors++; continue; }
      if (!r.content) continue;

      const hash = contentHash(r.content);
      if (seen.has(hash)) {
        console.log(`[Orchestrator] 🔁 Deduplicated duplicate result from '${r.toolName}'`);
        continue;
      }
      seen.add(hash);
      deduplicated.push(r);
    }

    console.log(
      `[Orchestrator] 📊 Aggregation: ${results.length} results → ${deduplicated.length} unique ` +
      `(${errors} errors, ${cacheHits} cache hits, ${totalLatencyMs}ms total)`
    );

    return {
      results,
      deduplicated,
      contentHashes: seen,
      totalLatencyMs,
      cacheHits,
      errors
    };
  }

  // ─────────────────────────────────────────────────────────────────────────
  // 6. Context Injection with Provenance Tags
  // ─────────────────────────────────────────────────────────────────────────

  injectContext(
    aggregated: AggregatedResult,
    messages: Message[],
    model: string = '__default__',
    systemPrompt: string = ''
  ): Message[] {
    if (aggregated.deduplicated.length === 0) return messages;

    // Check token usage before injection
    const tokenCount = countTokensForRequest(messages, systemPrompt, model);
    let results = aggregated.deduplicated;

    if (shouldTriggerSummarization(tokenCount.pct)) {
      console.warn(
        `[Orchestrator] ⚠️ Context at ${(tokenCount.pct * 100).toFixed(1)}% — ` +
        `triggering tool result summarization`
      );
      // Summarize all tool results into one compact message
      const summary = summarizeToolResults(results.map(r => ({ tool: r.toolName, content: r.content })));
      const summaryMsg: Message = {
        role: 'model',
        content: summary,
        timestamp: Date.now()
      };
      // Also prune stale tool results from existing history
      const pruned = pruneStaleToolResults(messages, 2);
      return [...pruned, summaryMsg];
    }

    // Build provenance-tagged tool result messages
    const injected: Message[] = [];

    for (const result of results) {
      if (!result.content || result.error) continue;

      const provenanceTag =
        `[📡 SOURCE: ${result.toolName}` +
        (result.serverUrl ? ` @ ${result.serverUrl}` : '') +
        ` | latency: ${result.latencyMs}ms` +
        (result.fromCache ? ' | CACHED' : '') +
        `]\n`;

      const tokenBudget = Math.floor((tokenCount.contextLimit * 0.15) * 4); // ~15% of context per result
      const truncated = result.content.length > tokenBudget
        ? result.content.substring(0, tokenBudget) + `\n... [truncated ${result.content.length - tokenBudget} chars]`
        : result.content;

      injected.push({
        role: 'model',
        content: provenanceTag + truncated,
        timestamp: result.timestamp
      });
    }

    const finalMessages = [...messages, ...injected];

    // Re-check and prune stale results if still over threshold
    const recheck = countTokensForRequest(finalMessages, systemPrompt, model);
    if (recheck.shouldSummarize) {
      return pruneStaleToolResults(finalMessages, 3);
    }

    return finalMessages;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Full Pipeline: classify → plan → execute → aggregate → inject
  // ─────────────────────────────────────────────────────────────────────────

  async run(options: {
    userQuery: string;
    messages: Message[];
    systemPrompt: string;
    model: string;
    /** Optional override: pass explicit tool calls instead of auto-planning */
    explicitCalls?: ToolCallRequest[];
    /** Per-tool argument overrides (added by caller after intent classification) */
    argsOverrides?: Record<string, Record<string, any>>;
  }): Promise<{
    messages: Message[];
    plan: ToolPlan;
    aggregated: AggregatedResult;
    tokenInfo: ReturnType<typeof countTokensForRequest>;
  }> {
    const { userQuery, messages, systemPrompt, model, explicitCalls, argsOverrides } = options;

    // 1. Intent classification
    const intent = this.classifyIntent(userQuery);

    // 2. Tool planning
    const mcpTools = await mcpService.getTools().then(tools => tools.map((t: any) => t.name)).catch(() => []);
    
    // Determine if Chrome bridge is active (is one of its native tools present?)
    const hasChromeBridge = mcpTools.includes('chrome_navigate');

    const availableTools = [
      ...mcpTools,
      ...(hasChromeBridge ? [
        'page_navigate', 'page_screenshot', 'page_extract_text', 
        'page_extract_links', 'page_click', 'page_fill', 
        'page_execute_js', 'page_wait_for'
      ] : [])
    ];

    chromeBridge.onTurnStart(); // Reset browser rate limiter

    const plan = explicitCalls
      ? {
          parallel: explicitCalls.filter(c => c.parallel),
          sequential: explicitCalls.filter(c => !c.parallel),
          reasoning: 'Explicit calls provided by caller'
        }
      : this.planTools(intent, availableTools);

    // 3 & 4. Execute plan + aggregate
    const aggregated = await this.executePlan(plan, argsOverrides);

    // 5. Context injection
    const enrichedMessages = this.injectContext(aggregated, messages, model, systemPrompt);

    // Pre-call token info
    const tokenInfo = countTokensForRequest(enrichedMessages, systemPrompt, model);
    console.log(
      `[Orchestrator] 📐 Final context: ${tokenInfo.total.toLocaleString()} tokens ` +
      `(${(tokenInfo.pct * 100).toFixed(1)}% of ${tokenInfo.contextLimit.toLocaleString()} limit)`
    );

    return { messages: enrichedMessages, plan, aggregated, tokenInfo };
  }

  // ── Private Helpers ───────────────────────────────────────────────────────

  private _addToHistory(result: ToolResult) {
    this.executionHistory.push(result);
    if (this.executionHistory.length > this.MAX_HISTORY) {
      this.executionHistory.shift();
    }
  }

  /** Peek at the MCPService call cache without executing */
  private async _peekCache(_name: string, _args: any): Promise<string | null> {
    // This is a no-op placeholder — the real cache lives in mcpService.
    // fromCache detection is done implicitly by latency being near-zero.
    return null;
  }

  getExecutionHistory(): ToolResult[] {
    return [...this.executionHistory];
  }

  clearHistory() {
    this.executionHistory = [];
  }
}

// ── Singleton ────────────────────────────────────────────────────────────────
export const mcpOrchestrator = new MCPOrchestrator();
