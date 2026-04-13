import express from "express";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import fs from "fs/promises";
import fsSync from "fs";
import path from "path";
import os from "os";
import crypto, { createHash } from "crypto";
import { execSync } from "child_process";
import puppeteerExtra from "puppeteer-extra";
import StealthPlugin from "puppeteer-extra-plugin-stealth";

// @ts-ignore
const puppeteer = puppeteerExtra.default || puppeteerExtra;
puppeteer.use(StealthPlugin());

// ─── Global Error Guards ──────────────────────────────────────────────────────
process.on('unhandledRejection', (reason: any, promise) => {
  console.error('[MCP] ⚠️ Unhandled Rejection:', reason?.message || reason);
});
process.on('uncaughtException', (err) => {
  console.error('[MCP] 💥 Uncaught Exception:', err.message);
  // Don't exit — keep serving other clients
});

// ─── Per-Tool Metrics ─────────────────────────────────────────────────────────
interface ToolMetric {
  callCount: number;
  errorCount: number;
  lastLatencyMs: number;
  totalLatencyMs: number;
}
const toolMetrics: Map<string, ToolMetric> = new Map();

function recordToolCall(name: string, latencyMs: number, isError: boolean) {
  const m = toolMetrics.get(name) ?? { callCount: 0, errorCount: 0, lastLatencyMs: 0, totalLatencyMs: 0 };
  m.callCount++;
  if (isError) m.errorCount++;
  m.lastLatencyMs = latencyMs;
  m.totalLatencyMs += latencyMs;
  toolMetrics.set(name, m);
}

const app = express();
app.use(express.json());

// ─── CORS: Essential for browser-based UI clients ───────────────────────────
app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Accept, Authorization");
  if (req.method === "OPTIONS") return res.sendStatus(200);
  next();
});



// ─── Persistent Configuration (cross-platform, no bash) ─────────────────────
class PersistentConfig {
  private configPath: string;
  private data: Record<string, any> = {};

  constructor() {
    const home = os.homedir();
    this.configPath = path.join(home, ".wormgpt", "config.json");
    try {
      // Use Node.js fs APIs — works on Windows, Linux, and macOS
      fsSync.mkdirSync(path.dirname(this.configPath), { recursive: true });
      if (fsSync.existsSync(this.configPath)) {
        this.data = JSON.parse(fsSync.readFileSync(this.configPath, 'utf-8'));
      }
    } catch (e: any) {
      console.warn('[MCP] Config load failed (non-fatal):', e.message);
      this.data = {};
    }
  }

  get(key: string, defaultValue: any = null) { return this.data[key] ?? defaultValue; }

  set(key: string, value: any) {
    this.data[key] = value;
    try {
      fsSync.mkdirSync(path.dirname(this.configPath), { recursive: true });
      fs.writeFile(this.configPath, JSON.stringify(this.data, null, 2)).catch(
        (e: any) => console.error('[MCP] Config save failed:', e.message)
      );
    } catch (e: any) { console.error('[MCP] Config save failed:', e.message); }
  }
}
const config = new PersistentConfig();

// ─── Child MCP Server Proxy (stdio) ───────────────────────────────────────────
let chromeClient: Client | null = null;
let chromeToolsCache: any[] = [];

async function initializeChromeBridge() {
  try {
    const isWin = process.platform === "win32";
    // We launch the mcp-chrome-stdio process. In WSL or Linux it's usually in PATH mapping or via npx
    const transport = new StdioClientTransport({
      command: isWin ? "npx.cmd" : "npx",
      args: ["-y", "mcp-chrome-bridge", "mcp-chrome-stdio"]
    });
    const client = new Client({ name: "wormgpt-bridge-proxy", version: "1.0.0" }, { capabilities: {} });
    await client.connect(transport);
    const toolsResult = await client.listTools();
    chromeToolsCache = toolsResult.tools || [];
    chromeClient = client;
    console.log(`[MCP] 🔌 Connected to proxy: mcp-chrome-stdio (${chromeToolsCache.length} tools)`);
  } catch (e: any) {
    console.warn(`[MCP] ⚠️ Chrome bridge proxy failed to initialize (is it installed?):`, e.message);
  }
}
// Start initialization in background
initializeChromeBridge();

// ─── WormGPT Tools Manifest ────────────────────────────────────────────────────
const memoryStore: Record<string, string> = {};

// ─── OpenAI Compatibility Layer (/v1) ────────────────────────────────────────
app.get("/v1/models", (req, res) => {
  res.json({
    object: "list",
    data: [
      { id: "wormgpt-mcp", object: "model", created: Math.floor(Date.now()/1000), owned_by: "elite" },
      { id: "rag-search", object: "model", created: Math.floor(Date.now()/1000), owned_by: "elite" }
    ]
  });
});

app.post("/v1/chat/completions", async (req, res) => {
  const { messages, model, stream } = req.body;
  console.log(`[API] Chat request for model: ${model}`);
  
  if (stream) {
    res.setHeader('Content-Type', 'text/event-stream');
    res.write(`data: ${JSON.stringify({ 
      id: "chatcmpl-" + crypto.randomUUID(), 
      object: "chat.completion.chunk", 
      created: Math.floor(Date.now()/1000), 
      model, 
      choices: [{ delta: { content: "WormGPT API placeholder response (streaming coming soon)..." }, index: 0, finish_reason: null }] 
    })}\n\n`);
    res.write(`data: [DONE]\n\n`);
    return res.end();
  }

  res.json({
    id: "chatcmpl-" + crypto.randomUUID(),
    object: "chat.completion",
    created: Math.floor(Date.now()/1000),
    model,
    choices: [{
      message: { role: "assistant", content: "WormGPT API is active. Ready to process tool calls and agent loops." },
      index: 0,
      finish_reason: "stop"
    }]
  });
});

// ─── Helpers ─────────────────────────────────────────────────────────────────
const NWS_API_BASE = "https://api.weather.gov";
const UA = "Mozilla/5.0 (WormGPT-MCP/2.0)";

async function nwsRequest(url: string): Promise<any> {
  const r = await fetch(url, { headers: { "User-Agent": UA, "Accept": "application/geo+json" } });
  if (!r.ok) return null;
  return r.json();
}

function isWindows() { return process.platform === "win32"; }

function runCmd(cmd: string, limit = 0): string {
  try {
    const out = execSync(cmd, { timeout: 10000 }).toString().trim();
    return limit > 0 ? out.substring(0, limit) : out;
  } catch (e: any) {
    return `Error: ${e.message?.split('\n')[0] || 'Command failed'}`;
  }
}

// ─── Tool Manifest ────────────────────────────────────────────────────────────
const listToolsHandler = async () => {
  const manifest = {
    tools: [
      // ── Memory ──
      {
        name: "store_memory",
        description: "Store key-value data persistently in the MCP server's process memory across conversations.",
        inputSchema: { type: "object", properties: { id: { type: "string" }, content: { type: "string" } }, required: ["id", "content"] }
      },
      {
        name: "read_memory",
        description: "Retrieve previously stored data from MCP memory by key ID.",
        inputSchema: { type: "object", properties: { id: { type: "string" } }, required: ["id"] }
      },
      {
        name: "list_memories",
        description: "List all stored memory keys in the MCP server.",
        inputSchema: { type: "object", properties: {} }
      },
      {
        name: "delete_memory",
        description: "Delete a stored memory entry by key ID.",
        inputSchema: { type: "object", properties: { id: { type: "string" } }, required: ["id"] }
      },

      // ── Weather (US only via NWS) ──
      {
        name: "get_alerts",
        description: "Get NOAA weather alerts for a US state (2-letter code, e.g. CA, TX, NY).",
        inputSchema: { type: "object", properties: { state: { type: "string", minLength: 2, maxLength: 2 } }, required: ["state"] }
      },
      {
        name: "get_forecast",
        description: "Get 5-period weather forecast for any US location by latitude/longitude.",
        inputSchema: { type: "object", properties: { latitude: { type: "number" }, longitude: { type: "number" } }, required: ["latitude", "longitude"] }
      },

      // ── Filesystem ──
      {
        name: "list_directory",
        description: "List the contents of a local directory with file sizes and types.",
        inputSchema: { type: "object", properties: { path: { type: "string" } }, required: ["path"] }
      },
      {
        name: "read_file",
        description: "Read the content of a local file (text files, max 100KB returned).",
        inputSchema: { type: "object", properties: { path: { type: "string" }, start_line: { type: "number" }, end_line: { type: "number" } }, required: ["path"] }
      },
      {
        name: "write_file",
        description: "Write or overwrite content to a local file.",
        inputSchema: { type: "object", properties: { path: { type: "string" }, content: { type: "string" }, append: { type: "boolean" } }, required: ["path", "content"] }
      },
      {
        name: "delete_file",
        description: "Delete a local file. Use with caution.",
        inputSchema: { type: "object", properties: { path: { type: "string" } }, required: ["path"] }
      },
      {
        name: "search_files",
        description: "Search for files matching a pattern within a directory (fast recursive grep).",
        inputSchema: {
          type: "object",
          properties: {
            directory: { type: "string" },
            pattern: { type: "string", description: "Filename pattern or text to search for inside files" },
            search_content: { type: "boolean", description: "If true, search file contents; otherwise search filenames" }
          },
          required: ["directory", "pattern"]
        }
      },

      // ── System Info ──
      {
        name: "get_system_stats",
        description: "Get comprehensive CPU, RAM, OS, architecture, and uptime information.",
        inputSchema: { type: "object", properties: {} }
      },
      {
        name: "get_network_info",
        description: "Get all local network interfaces, IP addresses, and MAC addresses.",
        inputSchema: { type: "object", properties: {} }
      },
      {
        name: "get_process_list",
        description: "Get a list of currently running processes with PID and memory usage.",
        inputSchema: { type: "object", properties: { limit: { type: "number", default: 25 } } }
      },
      {
        name: "get_disk_usage",
        description: "Get disk capacity, used space, and free space for all local drives.",
        inputSchema: { type: "object", properties: {} }
      },
      {
        name: "get_system_uptime",
        description: "Get system uptime in days, hours, and minutes with load averages.",
        inputSchema: { type: "object", properties: {} }
      },
      {
        name: "get_env_vars",
        description: "Get environment variables. Optionally filter by a key prefix (e.g. 'PATH', 'NODE').",
        inputSchema: { type: "object", properties: { prefix: { type: "string", description: "Optional prefix filter" } } }
      },

      // ── File Operations ──
      {
        name: "get_file_hashes",
        description: "Compute SHA256 and MD5 hashes for a local file. Useful for integrity checks.",
        inputSchema: { type: "object", properties: { path: { type: "string" } }, required: ["path"] }
      },

      // ── Network & Security ──
      {
        name: "ping_host",
        description: "Check TCP reachability of a host via an HTTP HEAD request. Returns latency.",
        inputSchema: { type: "object", properties: { host: { type: "string" }, protocol: { type: "string", enum: ["http", "https"], default: "https" } }, required: ["host"] }
      },
      {
        name: "get_dns_records",
        description: "Perform a full DNS lookup for A, MX, TXT, AAAA, NS records on a domain.",
        inputSchema: { type: "object", properties: { domain: { type: "string" }, type: { type: "string", default: "A" } }, required: ["domain"] }
      },

      // ── GitHub ──
      {
        name: "get_github_repo",
        description: "Fetch metadata, stars, forks, and description for any public GitHub repository.",
        inputSchema: { type: "object", properties: { owner: { type: "string" }, repo: { type: "string" } }, required: ["owner", "repo"] }
      },
      {
        name: "get_github_issues",
        description: "List open issues for a GitHub repository with labels and comments.",
        inputSchema: { type: "object", properties: { owner: { type: "string" }, repo: { type: "string" }, state: { type: "string", enum: ["open", "closed", "all"], default: "open" }, limit: { type: "number", default: 10 } }, required: ["owner", "repo"] }
      },
      {
        name: "get_github_commits",
        description: "Get recent commit history for a GitHub repository.",
        inputSchema: { type: "object", properties: { owner: { type: "string" }, repo: { type: "string" }, limit: { type: "number", default: 10 } }, required: ["owner", "repo"] }
      },

      // ── Shell Execution ──
      {
        name: "run_shell_command",
        description: "Execute a shell command on the local system and return stdout/stderr. USE WITH CAUTION.",
        inputSchema: { type: "object", properties: { command: { type: "string", description: "Shell command to run (bash/cmd)" }, timeout_ms: { type: "number", default: 10000 } }, required: ["command"] }
      },

      // ── Browser Automation ──
      {
        name: "run_puppeteer_script",
        description: "Execute a custom Puppeteer script using a real Chromium browser (Stealth enabled) on the host. The script runs inside an async function with 'browser' and 'page' variables predefined. Example: `await page.goto('https://news.ycombinator.com'); return await page.content();`. MUST return a string or serializable object.",
        inputSchema: { type: "object", properties: { script: { type: "string", description: "Node.js code. Standard puppeteer 'page' methods available." } }, required: ["script"] }
      },

      // ── HTTP Proxy (server-side, no CORS for external APIs) ──
      {
        name: "http_request",
        description: "Make an HTTP/HTTPS request from the server side (bypasses browser CORS). Supports GET, POST, PUT, DELETE.",
        inputSchema: {
          type: "object",
          properties: {
            url: { type: "string" },
            method: { type: "string", enum: ["GET", "POST", "PUT", "DELETE", "PATCH"], default: "GET" },
            headers: { type: "object", additionalProperties: { type: "string" } },
            body: { type: "string" }
          },
          required: ["url"]
        }
      }
    ]
  };

  if (chromeToolsCache.length > 0) {
    // Inject chrome tools into our manifest so the frontend sees them
    return { tools: [...manifest.tools, ...chromeToolsCache] };
  }

  return manifest;
};

// ─── Tool Execution ───────────────────────────────────────────────────────────
const callToolHandler = async (request: any) => {
  const { name, arguments: args } = request.params;
  const a = (args || {}) as any;
  const _callStart = Date.now();
  let _isError = false;
  const txt = (t: string) => {
    recordToolCall(name, Date.now() - _callStart, _isError);
    return { content: [{ type: "text", text: t }] };
  };
  const txterr = (t: string) => { _isError = true; return txt(t); };

  // Proxy to chrome client if the tool belongs to it
  if (chromeClient && chromeToolsCache.some(t => t.name === name)) {
    try {
      const result: any = await chromeClient.callTool(request.params);
      recordToolCall(name, Date.now() - _callStart, false);
      return result;
    } catch (e: any) {
      return txterr(`Chrome Bridge Proxy Error: ${e.message}`);
    }
  }

  switch (name) {

    // ── Memory ──
    case "store_memory":
      memoryStore[a.id] = a.content;
      return txt(`✅ Stored under key: '${a.id}' (${a.content.length} chars)`);

    case "read_memory":
      return txt(memoryStore[a.id] ?? `❌ No memory found for key: '${a.id}'`);

    case "list_memories": {
      const keys = Object.keys(memoryStore);
      if (keys.length === 0) return txt("Memory is empty.");
      return txt(keys.map(k => `• ${k} (${memoryStore[k].length} chars)`).join('\n'));
    }

    case "delete_memory":
      if (a.id in memoryStore) {
        delete memoryStore[a.id];
        return txt(`✅ Deleted key: '${a.id}'`);
      }
      return txt(`❌ Key '${a.id}' not found.`);

    // ── Weather ──
    case "get_alerts": {
      const data: any = await nwsRequest(`${NWS_API_BASE}/alerts/active/area/${a.state.toUpperCase()}`);
      if (!data?.features) return txt("No alerts or NWS API error.");
      const res = data.features.map((f: any) =>
        `🚨 ${f.properties.event}\nArea: ${f.properties.areaDesc}\nSeverity: ${f.properties.severity}\nDesc: ${(f.properties.description || '').substring(0, 200)}`
      ).join("\n\n---\n\n");
      return txt(res || "✅ No active weather alerts.");
    }

    case "get_forecast": {
      const pts: any = await nwsRequest(`${NWS_API_BASE}/points/${a.latitude},${a.longitude}`);
      if (!pts?.properties?.forecast) return txt("Unable to resolve forecast. Check coordinates.");
      const fc: any = await nwsRequest(pts.properties.forecast);
      const res = (fc?.properties?.periods || []).slice(0, 7).map((p: any) =>
        `📅 ${p.name}: ${p.temperature}${p.temperatureUnit} — ${p.shortForecast} (Wind: ${p.windSpeed} ${p.windDirection})`
      ).join("\n");
      return txt(res || "No forecast data.");
    }

    // ── Filesystem ──
    case "list_directory": {
      try {
        const resolved = path.resolve(a.path);
        const entries = await fs.readdir(resolved, { withFileTypes: true });
        const lines = await Promise.all(entries.map(async e => {
          try {
            const stat = await fs.stat(path.join(resolved, e.name));
            const size = e.isDirectory() ? '<DIR>' : `${(stat.size / 1024).toFixed(1)}KB`;
            return `${e.isDirectory() ? '📁' : '📄'} ${e.name} (${size})`;
          } catch { return `  ${e.name}`; }
        }));
        return txt(`Directory: ${resolved}\n\n${lines.join('\n')}`);
      } catch (e: any) { return txterr(`Error: ${e.message}`); }
    }

    case "read_file": {
      try {
        const resolved = path.resolve(a.path);
        const raw = await fs.readFile(resolved, "utf-8");
        let lines = raw.split('\n');
        if (a.start_line || a.end_line) {
          const start = (a.start_line || 1) - 1;
          const end = a.end_line || lines.length;
          lines = lines.slice(start, end);
        }
        const content = lines.join('\n').substring(0, 100000); // 100KB cap
        return txt(content);
      } catch (e: any) { return txterr(`Error: ${e.message}`); }
    }

    case "write_file": {
      try {
        const resolved = path.resolve(a.path);
        if (a.append) {
          await fs.appendFile(resolved, a.content);
          return txt(`✅ Appended ${a.content.length} chars to ${resolved}`);
        }
        await fs.writeFile(resolved, a.content, "utf-8");
        return txt(`✅ Written ${a.content.length} chars to ${resolved}`);
      } catch (e: any) { return txt(`Error: ${e.message}`); }
    }

    case "delete_file": {
      try {
        const resolved = path.resolve(a.path);
        await fs.unlink(resolved);
        return txt(`✅ Deleted: ${resolved}`);
      } catch (e: any) { return txt(`Error: ${e.message}`); }
    }

    case "search_files": {
      try {
        const dir = path.resolve(a.directory);
        if (a.search_content) {
          // Search inside file contents using grep/findstr
          const cmd = isWindows()
            ? `findstr /S /I /M "${a.pattern.replace(/"/g, '')}" "${dir}\\*"`
            : `grep -rl "${a.pattern.replace(/"/g, '')}" "${dir}" 2>/dev/null | head -50`;
          return txt(runCmd(cmd, 10000) || "No matches found.");
        } else {
          // Search filenames recursively
          const results: string[] = [];
          const walk = async (d: string, depth = 0): Promise<void> => {
            if (depth > 8 || results.length >= 100) return;
            const entries = await fs.readdir(d, { withFileTypes: true }).catch(() => []);
            for (const e of entries) {
              if (e.name.toLowerCase().includes(a.pattern.toLowerCase())) results.push(path.join(d, e.name));
              if (e.isDirectory()) await walk(path.join(d, e.name), depth + 1);
            }
          };
          await walk(dir);
          return txt(results.length > 0 ? results.join('\n') : "No files matching pattern found.");
        }
      } catch (e: any) { return txt(`Error: ${e.message}`); }
    }

    // ── System ──
    case "get_system_stats": {
      const cpus = os.cpus();
      const stats = {
        os: `${os.type()} ${os.release()} (${os.version()})`,
        arch: os.arch(),
        hostname: os.hostname(),
        cpu_model: cpus[0]?.model || 'Unknown',
        cpu_cores: cpus.length,
        cpu_speed_mhz: cpus[0]?.speed || 0,
        free_mem_gb: (os.freemem() / 1024 ** 3).toFixed(2),
        total_mem_gb: (os.totalmem() / 1024 ** 3).toFixed(2),
        used_mem_pct: (((os.totalmem() - os.freemem()) / os.totalmem()) * 100).toFixed(1) + '%',
        uptime_hours: (os.uptime() / 3600).toFixed(2),
        load_avg: os.loadavg().map(x => x.toFixed(2)).join(', '),
        node_version: process.version,
        platform: process.platform
      };
      return txt(JSON.stringify(stats, null, 2));
    }

    case "get_network_info":
      return txt(JSON.stringify(os.networkInterfaces(), null, 2));

    case "get_process_list": {
      const limit = a.limit || 25;
      const cmd = isWindows()
        ? `tasklist /FO CSV /NH`
        : `ps -eo comm,pid,%mem,%cpu --sort=-%mem | head -n ${limit + 1}`;
      return txt(runCmd(cmd, 8000));
    }

    case "get_disk_usage": {
      const cmd = isWindows()
        ? 'wmic logicaldisk get caption,size,freespace,filesystem /FORMAT:LIST'
        : 'df -h --output=source,size,used,avail,pcent,target';
      return txt(runCmd(cmd, 5000));
    }

    case "get_system_uptime": {
      const up = os.uptime();
      const days = Math.floor(up / 86400);
      const hrs = Math.floor((up % 86400) / 3600);
      const mins = Math.floor((up % 3600) / 60);
      const load = os.loadavg().map(x => x.toFixed(2)).join(', ');
      return txt(`Uptime: ${days}d ${hrs}h ${mins}m\nLoad Averages (1m/5m/15m): ${load}\nNode.js: ${process.version}\nPID: ${process.pid}`);
    }

    case "get_env_vars": {
      const env = process.env;
      const prefix = a.prefix?.toUpperCase() || '';
      const filtered = Object.entries(env)
        .filter(([k]) => !prefix || k.toUpperCase().startsWith(prefix))
        .map(([k, v]) => `${k}=${v}`)
        .slice(0, 100);
      return txt(filtered.join('\n') || 'No matching environment variables.');
    }

    case "get_file_hashes": {
      try {
        const buf = await fs.readFile(path.resolve(a.path));
        const sha256 = createHash("sha256").update(buf).digest("hex");
        const md5 = createHash("md5").update(buf).digest("hex");
        const sha1 = createHash("sha1").update(buf).digest("hex");
        return txt(`File: ${a.path}\nSize: ${(buf.length / 1024).toFixed(2)} KB\nSHA256: ${sha256}\nSHA1:   ${sha1}\nMD5:    ${md5}`);
      } catch (e: any) { return txt(`Error: ${e.message}`); }
    }

    // ── Network ──
    case "ping_host": {
      const proto = a.protocol || 'https';
      const url = `${proto}://${a.host}`;
      const start = Date.now();
      try {
        const r = await fetch(url, { method: 'HEAD', signal: AbortSignal.timeout(8000) });
        const ms = Date.now() - start;
        return txt(`✅ ${a.host} is REACHABLE\nStatus: ${r.status} ${r.statusText}\nLatency: ${ms}ms\nServer: ${r.headers.get('server') || 'N/A'}\nContent-Type: ${r.headers.get('content-type') || 'N/A'}`);
      } catch (e: any) {
        return txt(`❌ ${a.host} is UNREACHABLE\nError: ${e.message}\nLatency: ${Date.now() - start}ms`);
      }
    }

    case "get_dns_records": {
      try {
        const types = a.type ? [a.type] : ['A', 'MX', 'TXT', 'AAAA', 'NS'];
        const results: any = {};
        await Promise.all(types.map(async (t: string) => {
          const r = await fetch(`https://dns.google/resolve?name=${encodeURIComponent(a.domain)}&type=${t}`);
          const d = await r.json();
          if (d.Answer) results[t] = d.Answer.map((rec: any) => ({ ttl: rec.TTL, data: rec.data }));
        }));
        return txt(JSON.stringify(results, null, 2));
      } catch (e: any) { return txt(`Error: ${e.message}`); }
    }

    // ── GitHub ──
    case "get_github_repo": {
      try {
        const r = await fetch(`https://api.github.com/repos/${a.owner}/${a.repo}`, {
          headers: { 'User-Agent': UA, 'Accept': 'application/vnd.github.v3+json' }
        });
        if (!r.ok) return txt(`GitHub API error: ${r.status}`);
        const d = await r.json();
        return txt(JSON.stringify({
          name: d.full_name, description: d.description, stars: d.stargazers_count,
          forks: d.forks_count, watchers: d.watchers_count, open_issues: d.open_issues_count,
          language: d.language, default_branch: d.default_branch, created_at: d.created_at,
          pushed_at: d.pushed_at, license: d.license?.name, topics: d.topics, url: d.html_url
        }, null, 2));
      } catch (e: any) { return txt(`Error: ${e.message}`); }
    }

    case "get_github_issues": {
      try {
        const limit = a.limit || 10;
        const state = a.state || 'open';
        const r = await fetch(`https://api.github.com/repos/${a.owner}/${a.repo}/issues?state=${state}&per_page=${limit}`, {
          headers: { 'User-Agent': UA, 'Accept': 'application/vnd.github.v3+json' }
        });
        if (!r.ok) return txt(`GitHub API error: ${r.status}`);
        const issues = await r.json();
        return txt(issues.map((i: any) =>
          `#${i.number} [${i.state}] ${i.title}\nLabels: ${i.labels.map((l: any) => l.name).join(', ') || 'none'}\nComments: ${i.comments} | ${i.html_url}`
        ).join('\n\n'));
      } catch (e: any) { return txt(`Error: ${e.message}`); }
    }

    case "get_github_commits": {
      try {
        const limit = a.limit || 10;
        const r = await fetch(`https://api.github.com/repos/${a.owner}/${a.repo}/commits?per_page=${limit}`, {
          headers: { 'User-Agent': UA, 'Accept': 'application/vnd.github.v3+json' }
        });
        if (!r.ok) return txt(`GitHub API error: ${r.status}`);
        const commits = await r.json();
        return txt(commits.map((c: any) =>
          `${c.sha.slice(0, 8)} | ${c.commit.author.date.slice(0, 10)} | ${c.commit.author.name}\n  ${c.commit.message.split('\n')[0]}`
        ).join('\n'));
      } catch (e: any) { return txt(`Error: ${e.message}`); }
    }

    // ── Shell ──
    case "run_shell_command": {
      try {
        const cmd = a.command;
        const timeout = a.timeout_ms || 10000;
        const output = execSync(cmd, { timeout, encoding: 'utf-8', stdio: 'pipe' });
        return txt(output.substring(0, 20000) || '(no output)');
      } catch (e: any) {
        const out = (e.stdout || '') + (e.stderr || '') || e.message;
        return txt(`Command failed (exit ${e.status || 1}):\n${out.substring(0, 5000)}`);
      }
    }

    // ── Browser Automation ──
    case "run_puppeteer_script": {
      try {
        const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox'] });
        const page = await browser.newPage();
        let result: any;
        try {
          const AsyncFunction = Object.getPrototypeOf(async function(){}).constructor;
          const fn = new AsyncFunction('browser', 'page', a.script);
          result = await fn(browser, page);
        } finally {
          await browser.close().catch(() => {});
        }
        return txt(typeof result === 'string' ? result : JSON.stringify(result, null, 2) || "Script completed successfully.");
      } catch (e: any) {
        return txt(`Puppeteer script failed: ${e.message}\nStack: ${e.stack}`);
      }
    }

    // ── HTTP Proxy ──
    case "http_request": {
      try {
        const method = a.method || 'GET';
        const opts: RequestInit = {
          method,
          headers: { 'User-Agent': UA, ...(a.headers || {}) },
          signal: AbortSignal.timeout(15000)
        };
        if (a.body && method !== 'GET') opts.body = a.body;
        const r = await fetch(a.url, opts);
        const text = await r.text();
        return txt(`Status: ${r.status} ${r.statusText}\nContent-Type: ${r.headers.get('content-type')}\n\n${text.substring(0, 50000)}`);
      } catch (e: any) { return txterr(`HTTP request failed: ${e.message}`); }
    }

    default:
      _isError = true;
      recordToolCall(name, Date.now() - _callStart, true);
      throw new Error(`Tool '${name}' not found in WormGPT Elite Bridge.`);
  }
};

// ─── SSE Multi-client: each connection gets its own transport and server ──────
const transports: Map<string, SSEServerTransport> = new Map();

app.get("/sse", async (req, res) => {
  const id = crypto.randomUUID();
  const transport = new SSEServerTransport("/message", res);
  
  // Create a dedicated SDK Server instance for this client
  const server = new Server({
    name: "wormgpt-elite-bridge",
    version: "2.0.0"
  }, {
    capabilities: { tools: {} }
  });
  
  server.setRequestHandler(ListToolsRequestSchema, listToolsHandler);
  server.setRequestHandler(CallToolRequestSchema, callToolHandler);

  transports.set(id, transport);
  res.on("close", () => {
    transports.delete(id);
    server.close().catch(() => {});
    console.log(`[MCP] Client ${id.slice(0, 8)} disconnected. Active: ${transports.size}`);
  });
  await server.connect(transport);
  console.log(`[MCP] ✅ Client ${id.slice(0, 8)} connected. Active: ${transports.size}`);
});

app.post("/message", async (req, res) => {
  // Find the right transport by query param (standard MCP client) or sessionId header
  const sessionId = (req.query.sessionId as string) || (req.headers['x-session-id'] as string);
  const transport = sessionId ? transports.get(sessionId) : Array.from(transports.values()).at(-1);
  if (transport) {
    await transport.handlePostMessage(req, res);
  } else {
    res.status(400).json({ error: "No active SSE transport for this session." });
  }
});

// ─── Health endpoint ──────────────────────────────────────────────────────────
app.get("/health", (_req, res) => {
  const mem = process.memoryUsage();
  const toolStats: Record<string, any> = {};
  toolMetrics.forEach((m, name) => {
    toolStats[name] = {
      calls: m.callCount,
      errors: m.errorCount,
      error_rate: m.callCount > 0 ? ((m.errorCount / m.callCount) * 100).toFixed(1) + '%' : '0%',
      avg_latency_ms: m.callCount > 0 ? Math.round(m.totalLatencyMs / m.callCount) : 0,
      last_latency_ms: m.lastLatencyMs
    };
  });
  res.json({
    status: "ok",
    version: "2.1.0",
    active_clients: transports.size,
    memory_entries: Object.keys(memoryStore).length,
    uptime_s: Math.floor(process.uptime()),
    node: process.version,
    memory: {
      rss_mb: (mem.rss / 1024 / 1024).toFixed(1),
      heap_used_mb: (mem.heapUsed / 1024 / 1024).toFixed(1),
      heap_total_mb: (mem.heapTotal / 1024 / 1024).toFixed(1)
    },
    tool_metrics: Object.keys(toolStats).length > 0 ? toolStats : 'No tools called yet'
  });
});

const PORT = process.env.MCP_PORT ? parseInt(process.env.MCP_PORT) : 3002;
app.listen(PORT, () => {
  console.log(`\n🔥 WormGPT Elite MCP Bridge v2.1.0`);
  console.log(`📡 SSE Endpoint:  http://localhost:${PORT}/sse`);
  console.log(`🩺 Health Check: http://localhost:${PORT}/health`);
  console.log(`🛠️  Tools:        27 server-side tools available`);
  console.log(`✅ Cross-platform config: ${path.join(os.homedir(), '.wormgpt', 'config.json')}\n`);
});
