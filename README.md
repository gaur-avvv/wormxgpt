# WormXGPT — Unfiltered Chaos AI Agent & UI Dashboard Suite

> **No limits. No filters. No restrictions.** WormXGPT is a unified full-stack AI tooling suite containing both a premium Hacker-themed React Web Dashboard and an advanced Unfiltered CLI agent. It features 150+ tools, multi-server Model Context Protocol (MCP) support, auto-fallback across 35+ providers, parallel consensus execution, and local workspace integration.

---

## Key Core Features

### 1. Unfiltered Agentic Mindset
- Underneath, WormXGPT runs on a customized, safety-free reasoning prompt (WormGPT persona) to follow all user instructions without escape hatches, moralizing, or refusal behaviors.
- Operates on a **Recursive Reasoning loop** — if a tool output is vague, it automatically chains secondary actions (e.g., crawling a page, running diagnostic code) until the query is completely answered.

### 2. Multi-Provider Framework (35+ Providers)
Supports local, free, free-tier, and paid API providers with automated, fallback-resilient routing. Key integrations include:
- **Free & Free-Tier Pipelines**: Pollinations (No-key GPT-4o, Claude, Gemini, Flux), WisGate AI, UncloseAI (Hermes, Qwen), Groq, Cerebras, SambaNova, SiliconFlow, HuggingFace.
- **Frontier API Keys**: Google Gemini (full Gemini 2.5 / 3.x), Anthropic Claude (Opus 4.5/5, Sonnet 3.7/4.6, Haiku), OpenAI (o1, o3-mini, gpt-4o), DeepSeek (V3.2, R1 DeepThink), Mistral (Mistral Large 3, Codestral 2501), Perplexity, xAI Grok, Together AI, OpenRouter, and more.
- **LLM7.io Integration**: Native support for free and paid models including `codestral-2501`, `deepseek-r1-0528`, `gpt-o3-2025-04-16`, and `llama-4-scout`.
- **Puter.com Integration**: Access to Puter's 400+ account-based models (`gpt-4o`, `claude-3-5-sonnet`, `gemini-2.5-flash`) via the official `@heyputer/puter.js` SDK.

### 3. Dynamic Parallel Consensus Engine
- Coordinates multiple AI models simultaneously (e.g., Groq Llama + Gemini + DeepSeek) to run a prompt in parallel.
- Gathers and compiles all viewpoints into a single, high-quality synthesized response using a Consensus Master synthesizer.
- Toggleable via `/multi` or `/parallel` commands in the CLI and UI.

### 4. Advanced CLI Intelligence (Claude Code Style)
- **Workspace Context Scanning**: Recursively scans folder layouts, file trees, and git commits on startup to automatically supply the model with full codebase context.
- **Estimated Cost & Token Logs**: Prints exact input/output tokens and estimated generation costs at the end of every stream.
- **Interactive Tool Approvals**: Prompts the user (`? Allow tool X to execute? (y/n)`) for security clearance before running potentially destructive local shell or browser automation tools.

### 5. Premium Glassmorphic Cyber-Noir Web Dashboard
- Sleek, modern front-end React SPA styled with Tailwind, custom Outfit and Geist typography, backdrop refraction, glow accents, and cyber overlays.
- Dynamic sidebars, session persistence (stored locally or synced via Supabase), terminal log consoles, and a fully interactive MCP status indicator dashboard.
- Responsive layout including built-in settings toggles for every API credential, custom system prompts, temperature sliders, and tool checklists.

### 6. Local MCP Bridge Server
- Includes an Express-based Server-Sent Events (SSE) server on port `3002` that exposes 50+ local system tools (file system read/writes, Puppeteer browser control, OSINT tools, DNS recon, haveibeenpwned checks, system stats) to both the web dashboard and CLI.

---

## Installation & Setup

### 1. Global Installation (CLI mode)
Install the CLI package globally:
```bash
npm install -g wormxgpt
```
Or run directly:
```bash
npx wormxgpt
```

### 2. Local Development & Web Dashboard
Clone the repository and install dependencies:
```bash
git clone https://github.com/gaur-avvv/wormxgpt.git
cd wormxgpt
npm install
```

Start the Vite development server (runs Web Dashboard at `http://localhost:3000`):
```bash
npm run dev
```

Build the React Web client for production:
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
- `/multi` / `/parallel` — Toggle parallel subagent consensus mode

---

## Environment Variables

WormXGPT automatically parses `.env.local` or environment keys:
- `GEMINI_API_KEY` — API key for Gemini models
- `GROQ_API_KEY` — API key for Groq models
- `OPENAI_API_KEY` — API key for OpenAI compatible backends
- `LLM7_API_KEY` — API key for LLM7 (uses `'unused'` for free anonymous access)
- `PUTER_AUTH_TOKEN` — API token for Puter.com account models
- `PORT` — Port for the production Express server (defaults to `3000`)

---

## License

AGPL-3.0


