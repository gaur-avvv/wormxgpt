<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# WormGPT - AI Chat Terminal Interface

A modern web-based chat interface for interacting with Google's Gemini API. Features session management, syntax highlighting, and a sleek terminal-inspired design.

## Prerequisites

- **Node.js** 16+ and npm
- **Gemini API Key** from [Google AI Studio](https://ai.google.dev/)

## Installation

1. **Clone and setup:**
   ```bash
   npm install
   ```

2. **Configure environment:**
   - Copy `.env.example` to `.env.local`
   - Add your Gemini API key:
     ```
     GEMINI_API_KEY=your_api_key_here
     ```

3. **Development server:**
   ```bash
   npm run dev
   ```
   App runs at `http://localhost:3000`

## Deployment

### Build for Production
```bash
npm run build
```
Generates optimized bundle in `dist/` directory.

### Deployment Options

**Docker:**
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY . .
RUN npm install && npm run build
EXPOSE 3000
CMD ["npm", "run", "preview"]
```

**Vercel/Netlify:**
- Set `GEMINI_API_KEY` in environment variables
- Connect git repo and deploy

**Self-hosted:**
- Build: `npm run build`
- Serve `dist/` directory with any static server
- Set environment variable: `GEMINI_API_KEY`

## Features

- 📝 **Session Management** - Save and switch between chat sessions
- 🔒 **Secure API Key Handling** - Keys stored in browser localStorage
- 🎨 **Terminal Design** - Modern dark theme with syntax highlighting
- 📱 **Responsive Layout** - Works on desktop and tablet
- 🖼️ **Image Support** - Send images with your messages
- ⚙️ **Model Selection** - Choose from available Gemini models
- 📊 **Advanced Settings** - Control temperature, thinking budget, system prompts
- 🔌 **MCP Integration** - Model Context Protocol bridge with 50+ server-side tools
- 🛠️ **150+ Tools** - Search, OSINT, coding, crypto, text processing, browser automation & more

## MCP Integration

WormGPT includes a built-in MCP (Model Context Protocol) server and client infrastructure:

- **MCP Server** (`mcp-server.ts`) - Express-based SSE server on port 3002 with 52 tools across categories: system, network, GitHub, weather, encoding/crypto, text processing, and DevOps utilities.
- **MCP Client** (`services/mcp.ts`) - Connects to multiple MCP servers simultaneously with auto-reconnect, health checks, and CORS proxy support for production deployments.
- **Default MCP Servers** - Pre-configured with 10 curated MCP servers including Context7, DeepWiki, CoinGecko, Globalping, Smithery, and more.

### Tool Categories (150+)

| Category | Tools | Description |
|----------|-------|-------------|
| Search & Recon | 19 | Web search, news, academic, social media |
| Extraction & Crawling | 17 | Scraping, content extraction, PDF parsing |
| OSINT & Recon | 13 | DNS, WHOIS, IP geolocation, port scanning |
| Code & Compute | 13 | Compilers, regex, hashing, Base64, JWT, JSON, CSV, text diff |
| Communication & Utility | 11 | Translation, temp email, weather, currency |
| Local Bridge (MCP) | 26 | File system, process, network, shell access |
| Browser Automation | 10 | Playwright, Puppeteer, Selenium script generation |
| Agentic Search | 8 | Multi-step autonomous research & synthesis |
| Jobs & Career | 10 | Job search, salary, company research |
| Advanced Search | 12 | Multi-engine, patents, legal, social media |
| AI & Media | 9 | Image generation, video, audio, sentiment |
| E-Commerce | 7 | Product search, price comparison, coupons |
| Utility & Generators | 10 | QR codes, passwords, UUIDs, timezone, colors |
| OSINT Advanced | 5 | Breach checks, Shodan, cert transparency, Wayback |
| Dev & Package Info | 4 | GitHub profiles, npm packages, crypto prices |

## Configuration

**System Instructions:** Customize AI behavior in settings panel
**Model Selection:** Switch between Gemini versions
**Temperature:** Control response randomness (0-1)
**Thinking Budget:** Set extended reasoning tokens (0-32768)

## File Structure

```
├── App.tsx              # Main app component
├── index.tsx            # Entry point
├── constants.ts         # Config, prompts & default MCP servers
├── types.ts             # TypeScript interfaces
├── mcp-server.ts        # MCP Bridge server (52 tools, SSE on :3002)
├── services/
│   ├── gemini.ts        # Gemini API integration
│   ├── mcp.ts           # MCP client (multi-server, auto-reconnect)
│   └── tools.ts         # 150+ client-side tool definitions
├── vite.config.ts       # Build config
├── tsconfig.json        # TypeScript config
└── index.html           # HTML template
```

## Environment Variables

```bash
GEMINI_API_KEY          # Required: Your Gemini API key
VITE_APP_ENV           # Optional: 'production' or 'development'
```

## Build Optimization

- **Code splitting** - Vendor/Gemini/App chunks
- **Minification** - Terser compression
- **No console logs** - Removed in production
- **Source maps** - Disabled for smaller bundle

## Troubleshooting

- **API Key errors:** Verify key in `.env.local` is valid
- **Build fails:** Run `npm install` and `npm run build` again
- **Styling issues:** Ensure Tailwind CSS is loaded in browser

## License

MIT

## Support

For issues with Gemini API, visit [Google AI Documentation](https://ai.google.dev/docs)
