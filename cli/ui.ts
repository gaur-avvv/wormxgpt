/**
 * cli/ui.ts — Terminal UI utilities (colors, spinners, boxes, markdown)
 */
import readline from 'readline';

// ── ANSI Colors ──────────────────────────────────────────────────────────────
export const C = {
  reset:   '\x1b[0m',
  bold:    '\x1b[1m',
  dim:     '\x1b[2m',
  italic:  '\x1b[3m',
  under:   '\x1b[4m',
  red:     '\x1b[31m',
  green:   '\x1b[32m',
  yellow:  '\x1b[33m',
  blue:    '\x1b[34m',
  magenta: '\x1b[35m',
  cyan:    '\x1b[36m',
  white:   '\x1b[37m',
  gray:    '\x1b[90m',
  bred:    '\x1b[1;31m',
  bgreen:  '\x1b[1;32m',
  byellow: '\x1b[1;33m',
  bcyan:   '\x1b[1;36m',
  bwhite:  '\x1b[1;37m',
  bgRed:   '\x1b[41m',
  bgGreen: '\x1b[42m',
  bgBlue:  '\x1b[44m',
  hacker:  '\x1b[38;5;82m',
  orange:  '\x1b[38;5;208m',
  pink:    '\x1b[38;5;205m',
};

export const BANNER = `
${C.bred}██╗    ██╗ ██████╗ ██████╗ ███╗   ███╗ ██████╗ ██████╗ ████████╗
██║    ██║██╔═══██╗██╔══██╗████╗ ████║██╔════╝██╔═══██╗╚══██╔══╝
██║ █╗ ██║██║   ██║██████╔╝██╔████╔██║██║  ███╗██║   ██║   ██║   
██║███╗██║██║   ██║██╔══██╗██║╚██╔╝██║██║   ██║██║   ██║   ██║   
╚███╔███╔╝╚██████╔╝██║  ██║██║ ╚═╝ ██║╚██████╔╝╚██████╔╝   ██║   
 ╚══╝╚══╝  ╚═════╝ ╚═╝  ╚═╝╚═╝     ╚═╝ ╚═════╝  ╚═════╝    ╚═╝${C.reset}
          ${C.red}UNFILTERED CHAOS CLI${C.reset} ${C.gray}v3.0.0${C.reset}  ${C.dim}— No limits. No filters.${C.reset}
`;

// ── Spinner ──────────────────────────────────────────────────────────────────
const SPINNER_FRAMES = ['⠋','⠙','⠹','⠸','⠼','⠴','⠦','⠧','⠇','⠏'];
export class Spinner {
  private interval: ReturnType<typeof setInterval> | null = null;
  private i = 0;
  start(msg: string) {
    this.i = 0;
    this.interval = setInterval(() => {
      process.stderr.write(`\r${C.cyan}${SPINNER_FRAMES[this.i++ % SPINNER_FRAMES.length]}${C.reset} ${msg}`);
    }, 80);
  }
  stop(msg?: string) {
    if (this.interval) { clearInterval(this.interval); this.interval = null; }
    process.stderr.write(`\r${' '.repeat(80)}\r`);
    if (msg) console.log(msg);
  }
}

// ── Box Drawing ──────────────────────────────────────────────────────────────
export function box(title: string, lines: string[], color = C.cyan): string {
  const w = Math.max(title.length + 4, ...lines.map(l => stripAnsi(l).length + 4));
  const top = `${color}╭${'─'.repeat(w)}╮${C.reset}`;
  const ttl = `${color}│${C.reset} ${C.bold}${title}${C.reset}${' '.repeat(w - title.length - 2)}${color}│${C.reset}`;
  const sep = `${color}├${'─'.repeat(w)}┤${C.reset}`;
  const body = lines.map(l => `${color}│${C.reset} ${l}${' '.repeat(Math.max(0, w - stripAnsi(l).length - 2))}${color}│${C.reset}`).join('\n');
  const bot = `${color}╰${'─'.repeat(w)}╯${C.reset}`;
  return [top, ttl, sep, body, bot].join('\n');
}

function stripAnsi(s: string): string {
  return s.replace(/\x1b\[[0-9;]*m/g, '');
}

// ── Tool Execution Display ───────────────────────────────────────────────────
export function toolCallHeader(name: string, args: any): string {
  const argsStr = typeof args === 'string' ? args : JSON.stringify(args, null, 0);
  const truncated = argsStr.length > 120 ? argsStr.substring(0, 117) + '...' : argsStr;
  return `${C.yellow}⚡ Tool Call:${C.reset} ${C.bcyan}${name}${C.reset}${C.gray}(${truncated})${C.reset}`;
}

export function toolResultDisplay(name: string, result: string, ms: number): string {
  const truncated = result.length > 500 ? result.substring(0, 497) + '...' : result;
  return `${C.green}✔ ${name}${C.reset} ${C.dim}(${ms}ms)${C.reset}\n${C.gray}${truncated}${C.reset}`;
}

// ── Status Line ──────────────────────────────────────────────────────────────
export function statusLine(provider: string, model: string, mcpCount: number): string {
  return `${C.dim}Provider: ${C.hacker}${provider}${C.reset}${C.dim} │ Model: ${C.hacker}${model}${C.reset}${C.dim} │ MCP: ${mcpCount > 0 ? C.green + mcpCount + ' servers' : C.red + 'none'}${C.reset}`;
}

// ── Help Display ─────────────────────────────────────────────────────────────
export const HELP_TEXT = `
${C.bold}${C.bred}╔══════════════════════════════════════════════════╗${C.reset}
${C.bold}${C.bred}║          WormXGPT — Command Reference            ║${C.reset}
${C.bold}${C.bred}╚══════════════════════════════════════════════════╝${C.reset}

${C.bold}${C.cyan}🤖 AI & Model${C.reset}
  ${C.hacker}/model${C.reset} ${C.dim}<name>${C.reset}        Switch model  ${C.dim}(Tab-autocomplete!)${C.reset}
  ${C.hacker}/models${C.reset}              Browse all available models grouped by provider
  ${C.hacker}/provider${C.reset} ${C.dim}<name>${C.reset}     Switch provider  ${C.dim}(Tab-autocomplete!)${C.reset}
  ${C.hacker}/providers${C.reset}           Show all providers + key status
  ${C.hacker}/key${C.reset} ${C.dim}<provider> <key>${C.reset} Set API key  ${C.dim}(Tab-completes provider name)${C.reset}
  ${C.hacker}/setup${C.reset}               Interactive API key + provider setup wizard
  ${C.hacker}/parallel${C.reset} ${C.dim}<prompt>${C.reset}  Run on all configured providers simultaneously
  ${C.hacker}/multi${C.reset}               Toggle multi-agent orchestration

${C.bold}${C.cyan}💬 Chat & Session${C.reset}
  ${C.hacker}/new${C.reset}                 Start a fresh chat session
  ${C.hacker}/clear${C.reset}               Clear messages in current session
  ${C.hacker}/sessions${C.reset}            List & switch saved sessions
  ${C.hacker}/system${C.reset} ${C.dim}<prompt>${C.reset}     Set custom system instruction
  ${C.hacker}/compact${C.reset}             Show session token usage stats
  ${C.hacker}/hibernate${C.reset}           Compress context to save tokens now
  ${C.hacker}/hitl${C.reset}               Toggle Human-in-the-Loop (AI can ask you questions mid-task)

${C.bold}${C.cyan}🛠  Tools & MCP${C.reset}
  ${C.hacker}/tools${C.reset}               List all tools (27 active)
  ${C.hacker}/tools enable${C.reset} ${C.dim}<name>${C.reset}  Enable a tool  ${C.dim}(Tab-autocomplete name!)${C.reset}
  ${C.hacker}/tools disable${C.reset} ${C.dim}<n>${C.reset}    Disable a tool
  ${C.hacker}/tools create${C.reset}        Build a new custom tool with JS code
  ${C.hacker}/tools delete${C.reset}        Remove a custom tool
  ${C.hacker}/mcp${C.reset}                 Show MCP server status
  ${C.hacker}/mcp add${C.reset} ${C.dim}<url>${C.reset}        Connect to an MCP server
  ${C.hacker}/mcp remove${C.reset} ${C.dim}<url>${C.reset}     Disconnect from an MCP server
  ${C.hacker}/serve${C.reset}               Start local MCP server on port 3002
  ${C.hacker}/run${C.reset} ${C.dim}<tool> [args]${C.reset}    Execute a tool directly

${C.bold}${C.cyan}🧠 Customization${C.reset}
  ${C.hacker}/provider add${C.reset}        Register a custom OpenAI-compatible endpoint
  ${C.hacker}/provider list${C.reset}       List custom AI endpoints
  ${C.hacker}/provider remove${C.reset}     Remove a custom endpoint
  ${C.hacker}/skills add${C.reset}          Add a prompt skill / personality
  ${C.hacker}/skills list${C.reset}         List loaded skills
  ${C.hacker}/skills delete${C.reset}       Remove a skill
  ${C.hacker}/plugin create${C.reset}       Write a JS pre/post filter plugin
  ${C.hacker}/plugin list${C.reset}         List active plugins
  ${C.hacker}/plugin delete${C.reset}       Remove a plugin

${C.bold}${C.cyan}📊 Info & Config${C.reset}
  ${C.hacker}/settings${C.reset}            Show current settings panel
  ${C.hacker}/health${C.reset}              Provider health & latency stats
  ${C.hacker}/doctor${C.reset}              Run full connectivity + key diagnostics
  ${C.hacker}/image${C.reset} ${C.dim}<prompt>${C.reset}       Generate an image
  ${C.hacker}/export${C.reset}              Export session to JSON
  ${C.hacker}/import${C.reset} ${C.dim}<path>${C.reset}        Import session from JSON
  ${C.hacker}/reset${C.reset}               Factory reset all settings
  ${C.hacker}/exit${C.reset}                Exit WormXGPT

${C.dim}─────────────────────────────────────────────────────────────${C.reset}
${C.dim}💡 Press Tab after /  to autocomplete commands${C.reset}
${C.dim}💡 Press Tab after /model  to see model names${C.reset}
${C.dim}💡 Press Tab after /key  to see provider names${C.reset}
${C.dim}💡 Ctrl+C during streaming aborts generation${C.reset}
`;

// ── Startup Quick-Tips Bar ───────────────────────────────────────────────────
export function quickTipsBar(): string {
  return [
    `${C.dim}─────────────────────────────────────────────────────────────────────${C.reset}`,
    `${C.dim}💡 Quick cmds:${C.reset}  ${C.hacker}/model${C.reset}${C.dim}  /provider  /key  /tools  /setup  /doctor  /help${C.reset}`,
    `${C.dim}⌨  Tab-complete: type ${C.reset}${C.hacker}/${C.reset}${C.dim} or ${C.reset}${C.hacker}/model ${C.reset}${C.dim}then press${C.reset} ${C.bold}Tab${C.reset}${C.dim} for suggestions${C.reset}`,
    `${C.dim}─────────────────────────────────────────────────────────────────────${C.reset}`,
  ].join('\n');
}

// ── Interactive Selection ─────────────────────────────────────────────────────
export async function interactiveSelect(promptText: string, options: string[], rl: readline.Interface): Promise<string | null> {
  if (options.length === 0) return null;

  // Temporarily pause the main readline interface
  rl.pause();
  // Turn off its raw mode listener if it has one so it doesn't consume our keystrokes
  if (process.stdin.isTTY) process.stdin.setRawMode(true);
  
  return new Promise((resolve) => {
    let cursor = 0;
    
    // Setup our own keypress listener
    const onKeypress = (str: string, key: readline.Key) => {
      if (key.name === 'up') {
        cursor = cursor > 0 ? cursor - 1 : options.length - 1;
        render();
      } else if (key.name === 'down') {
        cursor = cursor < options.length - 1 ? cursor + 1 : 0;
        render();
      } else if (key.name === 'return') {
        cleanup();
        console.log(''); // newline after selection
        resolve(options[cursor]);
      } else if (key.name === 'escape' || (key.ctrl && key.name === 'c')) {
        cleanup();
        console.log('');
        resolve(null);
      }
    };

    const render = () => {
      // Clear lines and redraw
      process.stdout.write('\x1B[2K\x1B[G'); // clear current line
      if (cursor !== -1) {
        // move up options.length lines, clear each
        for (let i = 0; i < options.length + 1; i++) {
          process.stdout.write('\x1B[1A\x1B[2K\x1B[G');
        }
      }
      
      console.log(`\n${C.bold}${C.cyan}?${C.reset} ${promptText} ${C.dim}(Use arrow keys, Enter to select, Esc to cancel)${C.reset}`);
      for (let i = 0; i < options.length; i++) {
        if (i === cursor) {
          console.log(`  ${C.hacker}❯ ${options[i]}${C.reset}`);
        } else {
          console.log(`    ${options[i]}`);
        }
      }
    };

    const cleanup = () => {
      process.stdin.removeListener('keypress', onKeypress);
      if (process.stdin.isTTY) process.stdin.setRawMode(false);
      rl.resume();
    };

    readline.emitKeypressEvents(process.stdin);
    process.stdin.on('keypress', onKeypress);
    
    // Initial render (fake cursor=-1 to avoid moving up on first render)
    cursor = -1; 
    render();
    cursor = 0; // set correct cursor
  });
}
