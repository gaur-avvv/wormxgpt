# MCP Health Report

> Generated: 2026-04-13 | WormGPT Elite MCP Bridge v2.1.0

---

## Executive Summary

| Metric | Value |
|---|---|
| Total MCP Servers Enumerated | 6 (default) + 32 curated |
| Critical Bugs Fixed | 2 |
| High Severity Issues Fixed | 5 |
| New Features Added | 8 |
| Files Modified | 3 |
| Files Created | 2 |

---

## 1. Connected MCP Servers (Default Configuration)

| Server | URL | Transport | Auth | Expected Status |
|---|---|---|---|---|
| **WormGPT Local Bridge** | `http://localhost:3002/sse` | SSE | None | ✅ Active (local) |
| **Fetch (Web Content)** | `https://fetch.mcp.run/sse` | SSE | None | 🟡 Public (rate-limited) |
| **CoinGecko (Crypto)** | `https://stagingxyz.mcp.api.coingecko.com/sse` | SSE | None | 🟡 Staging endpoint |
| **Sequential Thinking** | `https://sequential-thinking.mcp.run/sse` | SSE | None | 🟢 Public |
| **Context7 (Docs/Memory)** | `https://mcp.context7.com/sse` | SSE | None | 🟢 Public |
| **Globalping (Network)** | `https://mcp.globalping.io/sse` | SSE | None | 🟢 Public |

> [!NOTE]
> "Vercel, Supabase, Google Drive, PubMed" were not configured in the codebase. To add them, insert their MCP URLs into `constants.ts › DEFAULT_MCP_SERVERS` and restart.

---

## 2. Local Bridge (mcp-server.ts) — Tools Inventory

| Category | Tools | Count |
|---|---|---|
| Memory | `store_memory`, `read_memory`, `list_memories`, `delete_memory` | 4 |
| Weather (US) | `get_alerts`, `get_forecast` | 2 |
| Filesystem | `list_directory`, `read_file`, `write_file`, `delete_file`, `search_files` | 5 |
| System Info | `get_system_stats`, `get_network_info`, `get_process_list`, `get_disk_usage`, `get_system_uptime`, `get_env_vars` | 6 |
| File Ops | `get_file_hashes` | 1 |
| Network & Security | `ping_host`, `get_dns_records` | 2 |
| GitHub | `get_github_repo`, `get_github_issues`, `get_github_commits` | 3 |
| Shell Execution | `run_shell_command` | 1 |
| Browser Automation | `run_puppeteer_script` | 1 |
| HTTP Proxy | `http_request` | 1 |
| **Total** | | **26** |

---

## 3. Issues Found & Fixed

### 🔴 Critical

#### Bug 1: Windows Crash in PersistentConfig
- **File**: `mcp-server.ts:40-44`
- **Root Cause**: Used bash shell syntax (`if [ ! -d ... ]; then mkdir -p ...`) inside `execSync()` — crashes on Windows (PowerShell/CMD) and any environment without bash.
- **Fix**: Replaced with Node.js native `fsSync.mkdirSync({ recursive: true })` + `fsSync.existsSync()` + `fsSync.readFileSync()`. Cross-platform on Windows, Linux, macOS.
- **Status**: ✅ Fixed in `mcp-server.ts`

---

### 🔴 High

#### Bug 2: No Global Error Handlers
- **File**: `mcp-server.ts`
- **Root Cause**: No `process.on('unhandledRejection')` or `process.on('uncaughtException')` handlers. Any async failure in a tool call could crash the entire server.
- **Fix**: Added both handlers at startup. `uncaughtException` logs the error but does **not** call `process.exit()`, keeping the server alive for other clients.
- **Status**: ✅ Fixed in `mcp-server.ts`

#### Bug 3: No Circuit Breaker
- **File**: `services/mcp.ts`
- **Root Cause**: `executeTool()` would retry on every call to a broken server indefinitely, causing cascading timeouts across the entire model context window.
- **Fix**: Added circuit breaker with `CB_FAILURE_THRESHOLD = 3` consecutive failures → server marked `degraded`. Auto-recovery after `CB_RECOVERY_DELAY = 5 minutes`.
- **Status**: ✅ Fixed in `services/mcp.ts`

#### Bug 4: No Tool Call Cache
- **File**: `services/mcp.ts`
- **Root Cause**: Same tool + same args could be called 3+ times per conversation turn with no caching, wasting API credits and context tokens.
- **Fix**: Added a `callCache: Map<string, {result, timestamp}>` with 60-second TTL. Cache key = `toolName::JSON(args)`.
- **Status**: ✅ Fixed in `services/mcp.ts`

#### Bug 5: O(n) Tool Lookup
- **File**: `services/mcp.ts:468-498`
- **Root Cause**: `executeTool()` iterated all cached tools with `for..of` on every call to find which server owns a tool. Performance degrades linearly with connected servers.
- **Fix**: Added `toolNameIndex: Map<toolName, serverUrl>` — a reverse index populated once when tools are fetched. `executeTool()` is now O(1) lookup.
- **Status**: ✅ Fixed in `services/mcp.ts`

#### Bug 6: No Pre-Call Token Counting
- **File**: `utils/tokenManager.ts`
- **Root Cause**: Tool results were injected into context verbatim with no awareness of approaching the context limit.
- **Fix**: Added `countTokensForRequest()` with per-model limits (Claude: 200K, Gemini 1.5 Pro: 2M, GPT-4o: 128K, etc.). When ≥80%, auto-triggers `summarizeToolResults()`.
- **Status**: ✅ Fixed in `utils/tokenManager.ts`

---

### 🟡 Medium

#### Issue 1: Heavy Health Check
- **File**: `mcp.ts:_startHealthCheck()`
- **Root Cause**: Called `client.listTools()` every 60s per server — fetches the full tool manifest on each heartbeat.
- **Fix**: Replaced with `fetch(origin, { method: 'HEAD' })` — lightweight reachability check. 405 (Method Not Allowed) is treated as healthy since some servers don't support HEAD but are still reachable.
- **Status**: ✅ Fixed

#### Issue 2: No Latency Tracking
- **File**: `mcp.ts`
- **Fix**: Added `lastLatencyMs`, `totalLatencyMs`, `callCount` per `ServerState`. `getServerStats(url)` exposes avg/last latency and circuit-breaker state.
- **Status**: ✅ Fixed

#### Issue 3: No Result Deduplication
- **File**: `services/mcp_orchestrator.ts`
- **Fix**: `aggregateResults()` computes a 32-bit content hash for each result and filters duplicates. Prevents the model from seeing the same URL fetched by 3 different tools.
- **Status**: ✅ Added

---

## 4. New Features Added

| Feature | Description | File |
|---|---|---|
| **Circuit Breaker** | Trip after 3 failures; auto-recover after 5 min | `services/mcp.ts` |
| **60s Call Cache** | Same tool + args returns cached result within 60s | `services/mcp.ts` |
| **O(1) Tool Index** | Reverse map from tool name → server URL | `services/mcp.ts` |
| **Latency Tracking** | Per-server avg/last latency exposed via `getServerStats()` | `services/mcp.ts` |
| **Batch Execution** | `executeToolsBatch([])` runs multiple tools via `Promise.all()` | `services/mcp.ts` |
| **Exponential Backoff** | 3 retries: 1s → 2s → 4s, circuit-breaker aware | `services/mcp.ts` |
| **Per-Tool Metrics** | `callCount`, `errorCount`, `avgLatencyMs` per tool on `/health` endpoint | `mcp-server.ts` |
| **Token-Aware Injection** | Context injection checks token usage; triggers summarization at 80% | `services/mcp_orchestrator.ts` |
| **Intent Classification** | Keyword-based intent detection for tool planning | `services/mcp_orchestrator.ts` |
| **Parallel Tool Planning** | Separates independent calls (parallel) from dependent ones (sequential) | `services/mcp_orchestrator.ts` |
| **Provenance Tagging** | Tool results tagged with `[📡 SOURCE: toolName | latency | CACHED]` | `services/mcp_orchestrator.ts` |
| **Stale Result Pruning** | Removes old tool results from history; keeps last N | `utils/tokenManager.ts` |

---

## 5. Enhanced Health Endpoint (`/health`)

The local bridge now returns enhanced health data:

```json
{
  "status": "ok",
  "version": "2.1.0",
  "active_clients": 1,
  "memory_entries": 3,
  "uptime_s": 1802,
  "node": "v22.x.x",
  "memory": {
    "rss_mb": "82.4",
    "heap_used_mb": "31.2",
    "heap_total_mb": "48.0"
  },
  "tool_metrics": {
    "ping_host": { "calls": 12, "errors": 0, "error_rate": "0%", "avg_latency_ms": 143, "last_latency_ms": 138 },
    "run_shell_command": { "calls": 4, "errors": 1, "error_rate": "25%", "avg_latency_ms": 254, "last_latency_ms": 1100 },
    "read_file": { "calls": 7, "errors": 0, "error_rate": "0%", "avg_latency_ms": 6, "last_latency_ms": 4 }
  }
}
```

---

## 6. Circuit Breaker Thresholds

| Parameter | Value |
|---|---|
| Failure threshold (trips breaker) | 3 consecutive failures |
| Recovery delay (auto-reset) | 5 minutes |
| Retry attempts | 3 |
| Retry delays | 1s → 2s → 4s (exponential) |
| Tool call timeout | 45 seconds |
| Call cache TTL | 60 seconds |
| Health check interval | 60 seconds |

---

## 7. Token Optimization Settings

| Parameter | Value |
|---|---|
| Summarization trigger | ≥ 80% context used |
| Stale results kept (default) | Last 3 tool results |
| Max token budget per injected result | 15% of context limit |
| Tool result hard truncation | 32,000 chars |

### Model Context Limits (in tokenManager)

| Model | Context Limit |
|---|---|
| Gemini 1.5 Pro | 2,000,000 tokens |
| Gemini 2.5 Pro / Flash | 1,000,000 tokens |
| GPT-4.1 | 1,000,000 tokens |
| Claude 3.5 / 4.x (Sonnet/Opus) | 200,000 tokens |
| GPT-4o / GPT-4o-mini | 128,000 tokens |
| DeepSeek V3 / R1 | 64,000 tokens |
| Default (unknown model) | 32,000 tokens |

---

## 8. Usage: MCPOrchestrator

```typescript
import { mcpOrchestrator } from './services/mcp_orchestrator';

// Full auto-pilot pipeline
const { messages, tokenInfo } = await mcpOrchestrator.run({
  userQuery: "What's the latest Bitcoin price and GitHub trending repos today?",
  messages: currentMessages,
  systemPrompt: systemPrompt,
  model: 'gemini-2.5-flash',
});

// Explicit parallel batch
import { mcpService } from './services/mcp';
const results = await mcpService.executeToolsBatch([
  { name: 'ping_host', args: { host: 'github.com' } },
  { name: 'get_dns_records', args: { domain: 'github.com' } },
  { name: 'SearchWeb', args: { query: 'github status 2026' } },
]);
```

---

*Report generated by WormGPT MCP Audit Engine · v2.1.0*
