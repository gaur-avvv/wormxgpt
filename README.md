# WormXGPT — Multi-Provider Autonomous AI Terminal & Agentic Suite

> **Universal AI Orchestration Engine.** WormXGPT is a unified full-stack AI tooling platform and terminal harness containing both an ultra-responsive cyber-themed React Web Terminal and an autonomous CLI agent. It features 150+ native tools, 100 remote HTTPS Model Context Protocol (MCP) servers in an Active Arsenal, zero-trace hardware-fingerprinted local persistence, auto-fallback matrix across 77+ providers, multi-model selection per provider, and live interactive tool call visualization.

---

## 🌟 Core Architecture & Key Capabilities

### 1. Multi-Model Support for All 77+ Providers
Every supported provider features a rich, selectable catalog of frontier, reasoning, coding, long-context, and vision models:
- **Google Gemini**: Gemini 3.1 Pro (1M+ reasoning), Gemini 3.1 Flash, Gemini 3 Flash-Lite, Gemini 3 Deep Think, Gemini 2.5 Pro/Flash, Gemini 1.5 Pro.
- **Anthropic Claude**: Claude 3.7 Sonnet (Hybrid Reasoning), Claude 3.5 Sonnet, Claude 3.5 Haiku, Claude 3 Opus.
- **OpenAI**: OpenAI o3-mini (Reasoning High), OpenAI o1, GPT-4o, GPT-4o Mini, GPT-4 Turbo, GPT-3.5 Turbo.
- **DeepSeek**: DeepSeek R1 (671B Full Reasoning), DeepSeek V3, DeepSeek Coder V2.5.
- **Groq LPU**: Llama 3.3 70B Versatile, DeepSeek R1 Distill 70B, Llama 3.1 8B Instant, Mixtral 8x7B.
- **Mistral AI**: Mistral Large 2411, Codestral 2501, Mistral Nemo, Pixtral Large (Vision).
- **Cerebras Ultra-Fast**: Llama 3.3 70B (1800+ tokens/sec), Llama 3.1 8B (Sub-100ms), DeepSeek R1 Distill 70B.
- **Fireworks AI & SiliconFlow**: DeepSeek R1, DeepSeek V3, Qwen 2.5 Coder 32B, GLM-4 9B.
- **HuggingFace & Novita & Nebius & NVIDIA NIM**: Open-weights frontier clusters including Nemotron 70B and Llama 3.3 70B.
- **Free & No-Key Providers**: Pollinations (No-key GPT-4o, Claude 3.5, Gemini 2.5), Puter.com (400+ account models), WisGate AI, UncloseAI, LLM7.io.
- **Local Runtimes**: Ollama, LM Studio, Llama.cpp, LocalAI, vLLM, Jan.

### 2. Device Fingerprint Hardware Identity & Encrypted Storage
- **Cryptographic Hardware Identity**: Uses GPU renderer hashes, WebGL extensions, screen resolution, audio subsystem signatures, and platform telemetry to derive a unique device fingerprint (`DARK-PRIME-X`).
- **Device-Bound History & Keys**: All chat histories and API credentials are saved locally and bound to the device's cryptographic fingerprint partition in IndexedDB (`wormgpt_v1`) and localStorage.

### 3. Zero-Trace Session Deletion & Complete State Sanitization
- **Irreversible Purge**: When you click the delete button on any chat session, the system executes zero-trace eradication:
  1. Removes the record permanently from IndexedDB (`wormgpt_v1`).
  2. Revokes all active memory blob URLs and attached media buffers.
  3. Sanitizes and overwrites the hardware-fingerprinted partition and local cache.
  4. Broadcasts the state update across all open tabs and windows.
- **Complete Terminal Hard Reset**: Purges all sessions, resets API keys, and creates a pristine new session without leaving orphan data traces.

### 4. Active Arsenal — 100 Remote HTTPS MCP Servers
- **Pre-Integrated Zero-Auth & Remote MCP Catalog**: Out-of-the-box access to 100 remote HTTPS Model Context Protocol endpoints, including:
  - `parallel-search:parallel_search` (Parallel AI Multi-Engine Live Search)
  - `deepwiki:read_wiki_structure` & `deepwiki:search_articles`
  - `mintlify-index:search_docs`
  - `chainguard-academy:lookup_cve` & `lookup_advisory`
  - `sequential-thinking:sequentialthinking`
  - Plus 95+ additional remote specialized MCP tools for OSINT, code execution, financial telemetry, web scraping, and data parsing.
- **One-Click Arming**: Toggle tools individually or click **"ARM ALL ZERO-AUTH TOOLS"** to instantly activate the tool suite.

### 5. Live Tool Call & Response Visualization
- Models actively display interactive **Tool Invocation Cards** in the chat stream:
  - **Tool Name & Status Badge**: Displays real-time status (`Executing...`, `Response Received`, or `Failed`).
  - **Input Arguments**: Formatted JSON codeblock showing exact arguments passed to the tool.
  - **Output Response**: Syntax-highlighted output with a one-click copy button and collapsible accordion view.

### 6. Seamless Dark Cyber-Noir UI & Custom Scrollbars
- **Unified Indigo-Noir Styling**: Clean dark background (`#090d16`) with high-contrast slate text, subtle indigo borders, and custom glowing dark scrollbars across all panels, sidebars, modals, and codeblocks.
- **Context Capacity Tracker**: Real-time token counter displaying context usage with dynamic color thresholds (Green / Amber / Rose).

---

## 🚀 Quickstart & Setup

### 1. Web Dashboard (Vite + React)
Clone the repository and install dependencies:
```bash
git clone https://github.com/gaur-avvv/wormxgpt.git
cd wormxgpt
npm install
```

Start the Vite development server (port `3000`):
```bash
npm run dev
```

Build for production:
```bash
npm run build
```

### 2. CLI Agent Mode
Run directly with npx or install globally:
```bash
npx wormxgpt
```

---

## 🛠️ Command Reference (CLI Mode)

Start the interactive CLI:
```bash
wormxgpt
```

### Subcommands
- `wormxgpt "prompt"` — Run direct one-shot prompt execution
- `wormxgpt setup` — Launch interactive API key configuration wizard
- `wormxgpt doctor` — Run hardware fingerprint and network diagnostics
- `wormxgpt tools` — List all available arsenal and client tools
- `wormxgpt serve` — Start local MCP bridge server on port `3002`

### Interactive Slash Commands
Inside the chat prompt, type `/` to trigger command autocomplete:
- `/model <name>` — Switch primary text model
- `/provider <name>` — Switch active provider
- `/arsenal` — Open active MCP arsenal selector
- `/clear` — Purge conversation buffer with zero trace
- `/sessions` — List and manage saved device sessions
- `/system <prompt>` — Update system instruction override

---

## 🔒 Security & Privacy

- **Client-Side First**: Keys and chat history never leave your device unless routing directly to your selected API provider.
- **Hardware Isolation**: Cryptographic device fingerprinting ensures settings and logs are partitioned to your exact browser/hardware profile.
- **Zero-Trace Deletion**: Instant shredding of IndexedDB records, memory references, and local storage on demand.

---

## 📄 License

AGPL-3.0 License. See `LICENSE` for details.


