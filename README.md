# WormXGPT — Unfiltered Chaos AI Agent & Terminal Suite

> **No limits. No filters. No restrictions.** WormXGPT is a unified AI tooling suite containing both a premium Hacker-themed React Web Dashboard and an advanced Unfiltered CLI agent. It features 150+ tools, multi-server MCP integration, auto-fallback across 30+ providers, and local workspace integration.

---

## Architecture & Features

WormXGPT consists of three core components:

1. **WormXGPT CLI Agent** — A robust command-line terminal with:
   - **Workspace Context Scanning**: Dynamically reads file layout and git structure to inform the model on codebase questions.
   - **Cost & Token tracking**: Formats exact token usage and estimated cost logs at the end of every response stream.
   - **Tool Permission Safety**: Prompts the user (`? Allow tool X to execute? (y/n)`) before running potentially destructive or unsafe tools (shell/files/browser).
   - **Auto-Fallback**: Instantly chains providers (Gemini → Groq → Pollinations → UncloseAI) to bypass API quota issues or server crashes.
2. **Hacker-Themed Web Client** — A premium React SPA built using Tailwind, Outfit typography, matrix style boots, session persistence, and full chat visualization.
3. **MCP Bridge Server** — An Express-based SSE server on port `3002` exposing 50+ local system tools (file system writes, browser automation, OSINT) to both CLI and Web clients.

---

## Installation & Setup

### 1. Global Installation (CLI mode)
Install the CLI package globally:
```bash
npm install -g wormxgpt
```
Or run directly without installation:
```bash
npx wormxgpt
```

### 2. Local Development & Web Dashboard
Clone the repository and install dependencies:
```bash
git clone https://github.com/gaur-avvv/xgpt.git
cd xgpt
npm install
```

Start the Vite development server (runs Web Dashboard at `http://localhost:3000`):
```bash
npm run dev
```

Build React Web client for production:
```bash
npm run build
```

---

## Command Reference (CLI Mode)

Start the interactive CLI:
```bash
wormxgpt
```

### Subcommands
- `wormxgpt "prompt"` — Run direct one-shot query and exit (Claude Code style)
- `wormxgpt setup` — Launch interactive configuration wizard
- `wormxgpt doctor` — Run system and API diagnostics/network health checks
- `wormxgpt tools` — List all 150+ client-side tools
- `wormxgpt serve` — Start local MCP bridge server on port `3002`
- `wormxgpt version` — Output client version

### Interactive CLI Commands
Type `/` inside the CLI chat loop to trigger autocomplete commands:
- `/model <name>` — Switch active model
- `/provider <name>` — Switch active API provider
- `/key <provider> <key>` — Save API Key
- `/tools` / `/tools enable <n>` — Manage active tool checklist
- `/mcp` / `/mcp add <url>` — Connect to external MCP servers
- `/sessions` — Load/delete chat history sessions
- `/system <prompt>` — Set custom system instructions
- `/run <tool> [args]` — Execute any client tool directly (e.g. `/run SearchWeb {"query":"Rust coding"}`)

---

## Environment Variables

WormXGPT automatically parses `.env.local` or environment keys:
- `GEMINI_API_KEY` — API key for Gemini models
- `GROQ_API_KEY` — API key for Groq models
- `OPENAI_API_KEY` — API key for OpenAI compatible backends
- `PORT` — Port for the production Express server (defaults to `3000`)

---

## License

AGPL-3.0

