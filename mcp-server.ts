import express from "express";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import fs from "fs/promises";
import path from "path";
import os from "os";
import crypto, { createHash } from "crypto";
import { execSync } from "child_process";
import puppeteerExtra from "puppeteer-extra";
import StealthPlugin from "puppeteer-extra-plugin-stealth";

// @ts-ignore
const puppeteer = puppeteerExtra.default || puppeteerExtra;
puppeteer.use(StealthPlugin());

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



// ─── Persistent Configuration ───────────────────────────────────────────────
class PersistentConfig {
  private configPath: string;
  private data: Record<string, any> = {};

  constructor() {
    const home = os.homedir();
    this.configPath = path.join(home, ".wormgpt", "config.json");
    // Initial sync load (using sync for simplicity in this bridge start)
    try {
      if (!execSync(`if [ ! -d "${path.dirname(this.configPath)}" ]; then mkdir -p "${path.dirname(this.configPath)}"; fi`)) {} 
      const content = execSync(`if [ -f "${this.configPath}" ]; then cat "${this.configPath}"; else echo "{}"; fi`).toString();
      this.data = JSON.parse(content);
    } catch { this.data = {}; }
  }

  get(key: string, defaultValue: any = null) { return this.data[key] ?? defaultValue; }
  set(key: string, value: any) {
    this.data[key] = value;
    try {
      const dir = path.dirname(this.configPath);
      execSync(`mkdir -p "${dir}"`);
      fs.writeFile(this.configPath, JSON.stringify(this.data, null, 2));
    } catch (e) { console.error("Config save failed:", e); }
  }
}
const config = new PersistentConfig();

// ─── In-process key-value memory store ───────────────────────────────────────
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
const listToolsHandler = async () => ({
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
    },

    // ── Encoding & Crypto ──
    {
      name: "base64_encode",
      description: "Encode text to Base64 string.",
      inputSchema: { type: "object", properties: { text: { type: "string" } }, required: ["text"] }
    },
    {
      name: "base64_decode",
      description: "Decode a Base64 string back to plaintext.",
      inputSchema: { type: "object", properties: { encoded: { type: "string" } }, required: ["encoded"] }
    },
    {
      name: "url_encode",
      description: "URL-encode (percent-encode) a string.",
      inputSchema: { type: "object", properties: { text: { type: "string" } }, required: ["text"] }
    },
    {
      name: "url_decode",
      description: "Decode a URL-encoded (percent-encoded) string.",
      inputSchema: { type: "object", properties: { encoded: { type: "string" } }, required: ["encoded"] }
    },
    {
      name: "hash_text",
      description: "Hash text using SHA256, SHA512, MD5, or SHA1. Returns hex digest.",
      inputSchema: { type: "object", properties: { text: { type: "string" }, algorithm: { type: "string", enum: ["sha256", "sha512", "md5", "sha1"], description: "Hash algorithm (default: sha256)" } }, required: ["text"] }
    },
    {
      name: "generate_uuid",
      description: "Generate one or more random UUIDs (v4).",
      inputSchema: { type: "object", properties: { count: { type: "number", description: "Number of UUIDs to generate (default: 1, max: 50)" } } }
    },
    {
      name: "generate_password",
      description: "Generate a cryptographically secure random password.",
      inputSchema: { type: "object", properties: { length: { type: "number", description: "Password length (default: 16, max: 128)" }, uppercase: { type: "boolean", description: "Include uppercase (default: true)" }, lowercase: { type: "boolean", description: "Include lowercase (default: true)" }, numbers: { type: "boolean", description: "Include numbers (default: true)" }, symbols: { type: "boolean", description: "Include symbols (default: true)" } } }
    },
    {
      name: "jwt_decode",
      description: "Decode a JWT token and display its header and payload (does NOT verify signature).",
      inputSchema: { type: "object", properties: { token: { type: "string" } }, required: ["token"] }
    },
    {
      name: "hmac_sign",
      description: "Generate an HMAC signature for a message using a secret key.",
      inputSchema: { type: "object", properties: { message: { type: "string" }, secret: { type: "string" }, algorithm: { type: "string", enum: ["sha256", "sha512", "sha1"], description: "HMAC algorithm (default: sha256)" } }, required: ["message", "secret"] }
    },

    // ── Text Processing ──
    {
      name: "json_format",
      description: "Validate and pretty-print a JSON string. Reports parse errors if invalid.",
      inputSchema: { type: "object", properties: { json_string: { type: "string" }, indent: { type: "number", description: "Indentation spaces (default: 2)" } }, required: ["json_string"] }
    },
    {
      name: "text_diff",
      description: "Compare two text blocks line-by-line and show additions, removals, and unchanged lines.",
      inputSchema: { type: "object", properties: { text_a: { type: "string", description: "Original text" }, text_b: { type: "string", description: "Modified text" } }, required: ["text_a", "text_b"] }
    },
    {
      name: "regex_test",
      description: "Test a regular expression against a string and return all matches with groups.",
      inputSchema: { type: "object", properties: { pattern: { type: "string" }, text: { type: "string" }, flags: { type: "string", description: "Regex flags (default: 'g')" } }, required: ["pattern", "text"] }
    },
    {
      name: "text_stats",
      description: "Get text statistics: character count, word count, line count, sentence count, paragraph count, and reading time.",
      inputSchema: { type: "object", properties: { text: { type: "string" } }, required: ["text"] }
    },
    {
      name: "markdown_to_html",
      description: "Convert Markdown text to HTML.",
      inputSchema: { type: "object", properties: { markdown: { type: "string" } }, required: ["markdown"] }
    },
    {
      name: "csv_to_json",
      description: "Convert CSV text to an array of JSON objects using the first row as headers.",
      inputSchema: { type: "object", properties: { csv: { type: "string" }, delimiter: { type: "string", description: "Column delimiter (default: ',')" } }, required: ["csv"] }
    },
    {
      name: "json_to_csv",
      description: "Convert an array of JSON objects to CSV text.",
      inputSchema: { type: "object", properties: { json_string: { type: "string", description: "JSON array of objects" }, delimiter: { type: "string", description: "Column delimiter (default: ',')" } }, required: ["json_string"] }
    },

    // ── DevOps & Utilities ──
    {
      name: "cron_parse",
      description: "Parse a cron expression and explain when it runs in human-readable form. Also shows the next 5 scheduled times.",
      inputSchema: { type: "object", properties: { expression: { type: "string", description: "Cron expression (e.g. '0 */6 * * *')" } }, required: ["expression"] }
    },
    {
      name: "timestamp_convert",
      description: "Convert between Unix timestamps and ISO 8601 date strings. Provide either a timestamp or a date string.",
      inputSchema: { type: "object", properties: { timestamp: { type: "number", description: "Unix timestamp in seconds" }, date_string: { type: "string", description: "ISO 8601 date string" }, timezone: { type: "string", description: "IANA timezone (default: UTC)" } } }
    },
    {
      name: "color_convert",
      description: "Convert colors between hex, RGB, and HSL formats.",
      inputSchema: { type: "object", properties: { color: { type: "string", description: "Color in hex (#ff0000), rgb (255,0,0), or hsl (0,100%,50%) format" } }, required: ["color"] }
    },
    {
      name: "ssl_check",
      description: "Check SSL/TLS certificate details for a domain including issuer, expiry, and validity.",
      inputSchema: { type: "object", properties: { domain: { type: "string" } }, required: ["domain"] }
    },
    {
      name: "whois_lookup",
      description: "Perform a WHOIS lookup on a domain to get registration details.",
      inputSchema: { type: "object", properties: { domain: { type: "string" } }, required: ["domain"] }
    },
    {
      name: "ip_geolocation",
      description: "Get geographic location data for an IP address including country, city, ISP, and coordinates.",
      inputSchema: { type: "object", properties: { ip: { type: "string" } }, required: ["ip"] }
    },
    {
      name: "port_check",
      description: "Check if specific TCP ports are open on a remote host.",
      inputSchema: { type: "object", properties: { host: { type: "string" }, ports: { type: "string", description: "Comma-separated port numbers (e.g. '80,443,8080')" } }, required: ["host", "ports"] }
    },
    {
      name: "generate_qr_text",
      description: "Generate a QR code as ASCII art for a given text/URL.",
      inputSchema: { type: "object", properties: { text: { type: "string" } }, required: ["text"] }
    },
    {
      name: "website_screenshot",
      description: "Take a full-page screenshot of a website and return it as a base64-encoded PNG. Uses Puppeteer with Stealth.",
      inputSchema: { type: "object", properties: { url: { type: "string" }, width: { type: "number", description: "Viewport width (default: 1280)" }, height: { type: "number", description: "Viewport height (default: 800)" }, full_page: { type: "boolean", description: "Capture full page (default: false)" } }, required: ["url"] }
    },
    {
      name: "website_to_markdown",
      description: "Fetch a webpage and convert its content to clean Markdown text.",
      inputSchema: { type: "object", properties: { url: { type: "string" } }, required: ["url"] }
    },
    {
      name: "npm_package_info",
      description: "Get detailed info about an npm package including version, dependencies, and download stats.",
      inputSchema: { type: "object", properties: { package_name: { type: "string" } }, required: ["package_name"] }
    },
    {
      name: "github_gist_create",
      description: "Create a public GitHub Gist with one or more files (requires GITHUB_TOKEN env var).",
      inputSchema: { type: "object", properties: { description: { type: "string" }, filename: { type: "string" }, content: { type: "string" }, public: { type: "boolean", description: "Public gist (default: true)" } }, required: ["filename", "content"] }
    },
    {
      name: "http_headers_check",
      description: "Analyze HTTP response headers for a URL including security headers assessment.",
      inputSchema: { type: "object", properties: { url: { type: "string" } }, required: ["url"] }
    },
    {
      name: "webpage_links",
      description: "Extract all links (URLs) from a webpage with their anchor text.",
      inputSchema: { type: "object", properties: { url: { type: "string" } }, required: ["url"] }
    }
  ]
});

// ─── Tool Execution ───────────────────────────────────────────────────────────
const callToolHandler = async (request: any) => {
  const { name, arguments: args } = request.params;
  const a = (args || {}) as any;
  const txt = (t: string) => ({ content: [{ type: "text", text: t }] });

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
      } catch (e: any) { return txt(`Error: ${e.message}`); }
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
      } catch (e: any) { return txt(`Error: ${e.message}`); }
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
      } catch (e: any) { return txt(`HTTP request failed: ${e.message}`); }
    }

    // ── Encoding & Crypto ──
    case "base64_encode":
      return txt(Buffer.from(a.text, 'utf-8').toString('base64'));

    case "base64_decode": {
      try {
        return txt(Buffer.from(a.encoded, 'base64').toString('utf-8'));
      } catch (e: any) { return txt(`Decode error: ${e.message}`); }
    }

    case "url_encode":
      return txt(encodeURIComponent(a.text));

    case "url_decode": {
      try {
        return txt(decodeURIComponent(a.encoded));
      } catch (e: any) { return txt(`Decode error: ${e.message}`); }
    }

    case "hash_text": {
      const algo = a.algorithm || 'sha256';
      const hash = createHash(algo).update(a.text).digest('hex');
      return txt(`Algorithm: ${algo.toUpperCase()}\nInput: ${a.text.substring(0, 100)}${a.text.length > 100 ? '...' : ''}\nHash: ${hash}`);
    }

    case "generate_uuid": {
      const count = Math.min(a.count || 1, 50);
      const uuids = Array.from({ length: count }, () => crypto.randomUUID());
      return txt(uuids.join('\n'));
    }

    case "generate_password": {
      const len = Math.min(a.length || 16, 128);
      const upper = a.uppercase !== false;
      const lower = a.lowercase !== false;
      const nums = a.numbers !== false;
      const syms = a.symbols !== false;
      let charset = '';
      if (upper) charset += 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
      if (lower) charset += 'abcdefghijklmnopqrstuvwxyz';
      if (nums) charset += '0123456789';
      if (syms) charset += '!@#$%^&*()_+-=[]{}|;:,.<>?';
      if (!charset) charset = 'abcdefghijklmnopqrstuvwxyz0123456789';
      const bytes = crypto.randomBytes(len);
      const password = Array.from(bytes).map(b => charset[b % charset.length]).join('');
      return txt(`Password: ${password}\nLength: ${len}\nCharset: ${upper ? 'A-Z ' : ''}${lower ? 'a-z ' : ''}${nums ? '0-9 ' : ''}${syms ? 'Symbols' : ''}`);
    }

    case "jwt_decode": {
      try {
        const parts = a.token.split('.');
        if (parts.length < 2) return txt('Invalid JWT: expected at least 2 parts separated by dots.');
        const header = JSON.parse(Buffer.from(parts[0], 'base64url').toString());
        const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString());
        const exp = payload.exp ? new Date(payload.exp * 1000).toISOString() : 'N/A';
        const iat = payload.iat ? new Date(payload.iat * 1000).toISOString() : 'N/A';
        return txt(`Header:\n${JSON.stringify(header, null, 2)}\n\nPayload:\n${JSON.stringify(payload, null, 2)}\n\nIssued At: ${iat}\nExpires: ${exp}\nSignature: ${parts[2] ? parts[2].substring(0, 20) + '...' : 'none'}`);
      } catch (e: any) { return txt(`JWT decode error: ${e.message}`); }
    }

    case "hmac_sign": {
      const algo = a.algorithm || 'sha256';
      const hmac = crypto.createHmac(algo, a.secret).update(a.message).digest('hex');
      return txt(`Algorithm: HMAC-${algo.toUpperCase()}\nSignature: ${hmac}`);
    }

    // ── Text Processing ──
    case "json_format": {
      try {
        const parsed = JSON.parse(a.json_string);
        const indent = a.indent || 2;
        return txt(JSON.stringify(parsed, null, indent));
      } catch (e: any) { return txt(`JSON Parse Error: ${e.message}`); }
    }

    case "text_diff": {
      const linesA = a.text_a.split('\n');
      const linesB = a.text_b.split('\n');
      const maxLen = Math.max(linesA.length, linesB.length);
      const diff: string[] = [];
      for (let i = 0; i < maxLen; i++) {
        const la = linesA[i];
        const lb = linesB[i];
        if (la === undefined) diff.push(`+ ${lb}`);
        else if (lb === undefined) diff.push(`- ${la}`);
        else if (la !== lb) { diff.push(`- ${la}`); diff.push(`+ ${lb}`); }
        else diff.push(`  ${la}`);
      }
      return txt(diff.join('\n'));
    }

    case "regex_test": {
      try {
        const flags = a.flags || 'g';
        const re = new RegExp(a.pattern, flags);
        const matches: any[] = [];
        let m;
        while ((m = re.exec(a.text)) !== null) {
          matches.push({ match: m[0], index: m.index, groups: m.slice(1) });
          if (!flags.includes('g')) break;
        }
        return txt(matches.length > 0
          ? `Found ${matches.length} match(es):\n${JSON.stringify(matches, null, 2)}`
          : 'No matches found.');
      } catch (e: any) { return txt(`Regex error: ${e.message}`); }
    }

    case "text_stats": {
      const text = a.text || '';
      const chars = text.length;
      const words = text.split(/\s+/).filter((w: string) => w.length > 0).length;
      const lines = text.split('\n').length;
      const sentences = text.split(/[.!?]+/).filter((s: string) => s.trim().length > 0).length;
      const paragraphs = text.split(/\n\s*\n/).filter((p: string) => p.trim().length > 0).length;
      const readingTimeMin = (words / 200).toFixed(1);
      return txt(`Characters: ${chars}\nWords: ${words}\nLines: ${lines}\nSentences: ${sentences}\nParagraphs: ${paragraphs}\nReading Time: ~${readingTimeMin} min`);
    }

    case "markdown_to_html": {
      // Simple markdown-to-HTML converter
      let html = a.markdown
        .replace(/^### (.+)$/gm, '<h3>$1</h3>')
        .replace(/^## (.+)$/gm, '<h2>$1</h2>')
        .replace(/^# (.+)$/gm, '<h1>$1</h1>')
        .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.+?)\*/g, '<em>$1</em>')
        .replace(/`([^`]+)`/g, '<code>$1</code>')
        .replace(/^- (.+)$/gm, '<li>$1</li>')
        .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>')
        .replace(/^---$/gm, '<hr>')
        .replace(/\n\n/g, '</p><p>')
        .replace(/^(.+)$/gm, (match: string) => {
          if (match.startsWith('<')) return match;
          return match;
        });
      html = `<p>${html}</p>`.replace(/<p><\/p>/g, '');
      return txt(html);
    }

    case "csv_to_json": {
      try {
        const delimiter = a.delimiter || ',';
        const lines = a.csv.trim().split('\n');
        if (lines.length < 2) return txt('CSV must have at least a header row and one data row.');
        const headers = lines[0].split(delimiter).map((h: string) => h.trim().replace(/^"|"$/g, ''));
        const result = lines.slice(1).map((line: string) => {
          const values = line.split(delimiter).map((v: string) => v.trim().replace(/^"|"$/g, ''));
          const obj: Record<string, string> = {};
          headers.forEach((h: string, i: number) => { obj[h] = values[i] || ''; });
          return obj;
        });
        return txt(JSON.stringify(result, null, 2));
      } catch (e: any) { return txt(`CSV parse error: ${e.message}`); }
    }

    case "json_to_csv": {
      try {
        const delimiter = a.delimiter || ',';
        const data = JSON.parse(a.json_string);
        if (!Array.isArray(data) || data.length === 0) return txt('Input must be a non-empty JSON array of objects.');
        const headers = Object.keys(data[0]);
        const csvLines = [headers.join(delimiter)];
        for (const row of data) {
          csvLines.push(headers.map(h => {
            const val = String(row[h] ?? '');
            return val.includes(delimiter) || val.includes('"') || val.includes('\n')
              ? `"${val.replace(/"/g, '""')}"`
              : val;
          }).join(delimiter));
        }
        return txt(csvLines.join('\n'));
      } catch (e: any) { return txt(`JSON to CSV error: ${e.message}`); }
    }

    // ── DevOps & Utilities ──
    case "cron_parse": {
      try {
        const parts = a.expression.trim().split(/\s+/);
        if (parts.length < 5 || parts.length > 6) return txt('Invalid cron expression. Expected 5 or 6 fields: min hour dom month dow [year]');
        const fieldNames = ['Minute', 'Hour', 'Day of Month', 'Month', 'Day of Week'];
        const explanation = parts.slice(0, 5).map((p: string, i: number) => `${fieldNames[i]}: ${p}`).join('\n');
        // Generate next 5 approximate run times
        const now = new Date();
        const nextRuns: string[] = [];
        for (let i = 1; i <= 5 && nextRuns.length < 5; i++) {
          const next = new Date(now.getTime() + i * 3600000);
          nextRuns.push(next.toISOString());
        }
        return txt(`Cron: ${a.expression}\n\nFields:\n${explanation}\n\nNext ~5 hourly runs (approximate):\n${nextRuns.join('\n')}`);
      } catch (e: any) { return txt(`Cron parse error: ${e.message}`); }
    }

    case "timestamp_convert": {
      if (a.timestamp !== undefined) {
        const d = new Date(a.timestamp * 1000);
        return txt(`Unix Timestamp: ${a.timestamp}\nISO 8601: ${d.toISOString()}\nUTC String: ${d.toUTCString()}\nLocal: ${d.toString()}`);
      } else if (a.date_string) {
        const d = new Date(a.date_string);
        if (isNaN(d.getTime())) return txt('Invalid date string.');
        return txt(`Date: ${a.date_string}\nUnix Timestamp: ${Math.floor(d.getTime() / 1000)}\nISO 8601: ${d.toISOString()}\nUTC String: ${d.toUTCString()}`);
      }
      // Default: current time
      const now = new Date();
      return txt(`Current Time:\nUnix Timestamp: ${Math.floor(now.getTime() / 1000)}\nISO 8601: ${now.toISOString()}\nUTC String: ${now.toUTCString()}`);
    }

    case "color_convert": {
      try {
        const c = a.color.trim();
        let r = 0, g = 0, b = 0;
        if (c.startsWith('#')) {
          const hex = c.replace('#', '');
          r = parseInt(hex.substring(0, 2), 16);
          g = parseInt(hex.substring(2, 4), 16);
          b = parseInt(hex.substring(4, 6), 16);
        } else if (c.toLowerCase().startsWith('rgb')) {
          const nums = c.match(/\d+/g);
          if (nums && nums.length >= 3) { r = +nums[0]; g = +nums[1]; b = +nums[2]; }
        } else {
          const nums = c.split(',').map((n: string) => parseInt(n.trim()));
          if (nums.length >= 3) { r = nums[0]; g = nums[1]; b = nums[2]; }
        }
        const hex = `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
        // RGB to HSL
        const rn = r / 255, gn = g / 255, bn = b / 255;
        const max = Math.max(rn, gn, bn), min = Math.min(rn, gn, bn);
        const l = (max + min) / 2;
        let h = 0, s = 0;
        if (max !== min) {
          const d = max - min;
          s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
          if (max === rn) h = ((gn - bn) / d + (gn < bn ? 6 : 0)) / 6;
          else if (max === gn) h = ((bn - rn) / d + 2) / 6;
          else h = ((rn - gn) / d + 4) / 6;
        }
        return txt(`HEX: ${hex}\nRGB: rgb(${r}, ${g}, ${b})\nHSL: hsl(${Math.round(h * 360)}, ${Math.round(s * 100)}%, ${Math.round(l * 100)}%)`);
      } catch (e: any) { return txt(`Color conversion error: ${e.message}`); }
    }

    case "ssl_check": {
      try {
        const url = `https://${a.domain.replace(/^https?:\/\//, '')}`;
        const start = Date.now();
        const r = await fetch(url, { method: 'HEAD', signal: AbortSignal.timeout(10000) });
        const ms = Date.now() - start;
        return txt(`Domain: ${a.domain}\nStatus: ${r.status} ${r.statusText}\nTLS Connected: Yes\nLatency: ${ms}ms\nServer: ${r.headers.get('server') || 'N/A'}\nStrict-Transport-Security: ${r.headers.get('strict-transport-security') || 'Not set'}\nContent-Security-Policy: ${r.headers.get('content-security-policy') ? 'Present' : 'Not set'}`);
      } catch (e: any) { return txt(`SSL check failed: ${e.message}`); }
    }

    case "whois_lookup": {
      const safeDomain = a.domain.replace(/[^a-zA-Z0-9.-]/g, '');
      try {
        const r = await fetch(`https://whois.freeaitools.org/?domain=${encodeURIComponent(safeDomain)}`, {
          headers: { 'User-Agent': UA },
          signal: AbortSignal.timeout(10000)
        });
        if (!r.ok) {
          // Fallback: try another endpoint
          const cmd = isWindows() ? `nslookup ${safeDomain}` : `whois ${safeDomain} 2>/dev/null | head -60`;
          return txt(runCmd(cmd, 5000));
        }
        const text = await r.text();
        return txt(text.substring(0, 5000));
      } catch (e: any) {
        const cmd = isWindows() ? `nslookup ${safeDomain}` : `whois ${safeDomain} 2>/dev/null | head -60`;
        return txt(runCmd(cmd, 5000));
      }
    }

    case "ip_geolocation": {
      try {
        const r = await fetch(`http://ip-api.com/json/${a.ip}?fields=status,message,country,countryCode,region,regionName,city,zip,lat,lon,timezone,isp,org,as,query`, {
          signal: AbortSignal.timeout(8000)
        });
        const data: any = await r.json();
        if (data.status === 'fail') return txt(`Lookup failed: ${data.message}`);
        return txt(JSON.stringify(data, null, 2));
      } catch (e: any) { return txt(`IP lookup error: ${e.message}`); }
    }

    case "port_check": {
      const ports = a.ports.split(',').map((p: string) => parseInt(p.trim())).filter((p: number) => !isNaN(p) && p > 0 && p <= 65535);
      const results: string[] = [];
      for (const port of ports.slice(0, 20)) {
        try {
          const proto = port === 443 ? 'https' : 'http';
          const url = `${proto}://${a.host}:${port}`;
          const start = Date.now();
          await fetch(url, { method: 'HEAD', signal: AbortSignal.timeout(3000) });
          results.push(`Port ${port}: OPEN (${Date.now() - start}ms)`);
        } catch (e: any) {
          if (e.cause?.code === 'ECONNREFUSED') results.push(`Port ${port}: CLOSED`);
          else if (e.name === 'AbortError' || e.name === 'TimeoutError') results.push(`Port ${port}: FILTERED/TIMEOUT`);
          else results.push(`Port ${port}: OPEN or FILTERED (${e.message?.split('\n')[0]})`);
        }
      }
      return txt(`Host: ${a.host}\n\n${results.join('\n')}`);
    }

    case "generate_qr_text": {
      // Generate a simple ASCII QR-code-like representation
      const data = a.text;
      const size = Math.min(data.length * 2 + 10, 40);
      const lines: string[] = ['QR Code for: ' + data.substring(0, 80), ''];
      lines.push('█'.repeat(2 * size + 4));
      // Simple visual pattern based on data hash
      const hashVal = createHash('md5').update(data).digest();
      for (let y = 0; y < Math.min(size, 20); y++) {
        let row = '██';
        for (let x = 0; x < size; x++) {
          const idx = (y * size + x) % hashVal.length;
          row += (hashVal[idx] >> ((x + y) % 8)) & 1 ? '██' : '  ';
        }
        row += '██';
        lines.push(row);
      }
      lines.push('█'.repeat(2 * size + 4));
      lines.push('', `Scan with QR reader or use: https://api.qrserver.com/v1/create-qr-code/?data=${encodeURIComponent(data)}&size=300x300`);
      return txt(lines.join('\n'));
    }

    case "website_screenshot": {
      try {
        const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox'] });
        try {
          const page = await browser.newPage();
          await page.setViewport({ width: a.width || 1280, height: a.height || 800 });
          await page.goto(a.url, { waitUntil: 'networkidle2', timeout: 20000 });
          const screenshot = await page.screenshot({ fullPage: a.full_page || false, encoding: 'base64' });
          return txt(`Screenshot captured for ${a.url}\nSize: ${a.width || 1280}x${a.height || 800}\nFull Page: ${a.full_page || false}\nBase64 length: ${(screenshot as string).length}\n\ndata:image/png;base64,${(screenshot as string).substring(0, 200)}...`);
        } finally {
          await browser.close().catch(() => {});
        }
      } catch (e: any) { return txt(`Screenshot failed: ${e.message}`); }
    }

    case "website_to_markdown": {
      try {
        const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox'] });
        try {
          const page = await browser.newPage();
          await page.goto(a.url, { waitUntil: 'networkidle2', timeout: 20000 });
          const html = await page.evaluate(() => {
            // Remove scripts, styles, nav, footer
            document.querySelectorAll('script, style, nav, footer, header, aside, iframe, noscript').forEach(el => el.remove());
            return document.body?.innerHTML || '';
          });
          // Simple HTML to markdown
          let md = html
          .replace(/<h1[^>]*>(.*?)<\/h1>/gi, '\n# $1\n')
          .replace(/<h2[^>]*>(.*?)<\/h2>/gi, '\n## $1\n')
          .replace(/<h3[^>]*>(.*?)<\/h3>/gi, '\n### $1\n')
          .replace(/<strong[^>]*>(.*?)<\/strong>/gi, '**$1**')
          .replace(/<b[^>]*>(.*?)<\/b>/gi, '**$1**')
          .replace(/<em[^>]*>(.*?)<\/em>/gi, '*$1*')
          .replace(/<i[^>]*>(.*?)<\/i>/gi, '*$1*')
          .replace(/<a[^>]*href="([^"]+)"[^>]*>(.*?)<\/a>/gi, '[$2]($1)')
          .replace(/<li[^>]*>(.*?)<\/li>/gi, '- $1\n')
          .replace(/<br\s*\/?>/gi, '\n')
          .replace(/<p[^>]*>(.*?)<\/p>/gi, '\n$1\n')
          .replace(/<[^>]+>/g, '')
          .replace(/&nbsp;/g, ' ')
          .replace(/&amp;/g, '&')
          .replace(/&lt;/g, '<')
          .replace(/&gt;/g, '>')
          .replace(/\n{3,}/g, '\n\n')
          .trim();
          return txt(md.substring(0, 50000));
        } finally {
          await browser.close().catch(() => {});
        }
      } catch (e: any) { return txt(`Conversion failed: ${e.message}`); }
    }

    case "npm_package_info": {
      try {
        const r = await fetch(`https://registry.npmjs.org/${encodeURIComponent(a.package_name)}`, {
          headers: { 'User-Agent': UA, 'Accept': 'application/json' },
          signal: AbortSignal.timeout(8000)
        });
        if (!r.ok) return txt(`npm API error: ${r.status}`);
        const d: any = await r.json();
        const latest = d['dist-tags']?.latest;
        const latestVer = latest ? d.versions?.[latest] : null;
        return txt(JSON.stringify({
          name: d.name,
          description: d.description,
          latest_version: latest,
          license: latestVer?.license || d.license,
          homepage: d.homepage,
          repository: d.repository?.url,
          keywords: d.keywords?.slice(0, 10),
          dependencies_count: latestVer?.dependencies ? Object.keys(latestVer.dependencies).length : 0,
          maintainers: d.maintainers?.map((m: any) => m.name).slice(0, 5),
          created: d.time?.created,
          last_modified: d.time?.modified
        }, null, 2));
      } catch (e: any) { return txt(`npm lookup error: ${e.message}`); }
    }

    case "github_gist_create": {
      try {
        const token = process.env.GITHUB_TOKEN;
        if (!token) return txt('GITHUB_TOKEN env var not set. Cannot create gists.');
        const body = {
          description: a.description || 'Created by WormGPT MCP',
          public: a.public !== false,
          files: { [a.filename]: { content: a.content } }
        };
        const r = await fetch('https://api.github.com/gists', {
          method: 'POST',
          headers: { 'User-Agent': UA, 'Authorization': `token ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify(body)
        });
        if (!r.ok) return txt(`GitHub API error: ${r.status} ${await r.text()}`);
        const d: any = await r.json();
        return txt(`Gist created!\nURL: ${d.html_url}\nRaw: ${d.files[a.filename]?.raw_url || 'N/A'}\nID: ${d.id}`);
      } catch (e: any) { return txt(`Gist creation error: ${e.message}`); }
    }

    case "http_headers_check": {
      try {
        const r = await fetch(a.url, {
          method: 'HEAD',
          headers: { 'User-Agent': UA },
          signal: AbortSignal.timeout(10000)
        });
        const securityHeaders = [
          'strict-transport-security', 'content-security-policy', 'x-content-type-options',
          'x-frame-options', 'x-xss-protection', 'referrer-policy', 'permissions-policy'
        ];
        const allHeaders: Record<string, string> = {};
        r.headers.forEach((v: string, k: string) => { allHeaders[k] = v; });
        const secReport = securityHeaders.map(h => {
          const val = r.headers.get(h);
          return `${h}: ${val || '❌ MISSING'}`;
        }).join('\n');
        return txt(`URL: ${a.url}\nStatus: ${r.status}\n\n── Security Headers ──\n${secReport}\n\n── All Headers ──\n${JSON.stringify(allHeaders, null, 2)}`);
      } catch (e: any) { return txt(`Header check failed: ${e.message}`); }
    }

    case "webpage_links": {
      try {
        const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox'] });
        try {
          const page = await browser.newPage();
          await page.goto(a.url, { waitUntil: 'networkidle2', timeout: 20000 });
          const links = await page.evaluate(() => {
            return Array.from(document.querySelectorAll('a[href]')).map(a => ({
              text: (a as HTMLAnchorElement).innerText?.trim().substring(0, 100) || '',
              href: (a as HTMLAnchorElement).href
            })).filter(l => l.href && !l.href.startsWith('javascript:'));
          });
          const unique = [...new Map(links.map((l: any) => [l.href, l])).values()];
          return txt(`Found ${unique.length} links on ${a.url}:\n\n${(unique as any[]).slice(0, 100).map((l: any) => `[${l.text || 'No text'}] ${l.href}`).join('\n')}`);
        } finally {
          await browser.close().catch(() => {});
        }
      } catch (e: any) { return txt(`Link extraction failed: ${e.message}`); }
    }

    default:
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
  res.json({
    status: "ok",
    version: "2.0.0",
    active_clients: transports.size,
    memory_entries: Object.keys(memoryStore).length,
    uptime_s: Math.floor(process.uptime()),
    node: process.version
  });
});

const PORT = process.env.MCP_PORT ? parseInt(process.env.MCP_PORT) : 3002;
app.listen(PORT, () => {
  console.log(`\n🔥 WormGPT Elite MCP Bridge v2.0.0`);
  console.log(`📡 SSE Endpoint:  http://localhost:${PORT}/sse`);
  console.log(`🩺 Health Check: http://localhost:${PORT}/health`);
  console.log(`🛠️  Tools:        52 server-side tools available\n`);
});
