/**
 * cli/completer.ts — Tab-completion engine for the WormXGPT REPL
 *
 * Plugs into readline's `completer` callback. Returns context-aware
 * suggestions whenever the user presses Tab:
 *
 *   /           → all slash commands
 *   /mod        → /model
 *   /model gem  → gemini-2.5-flash, gemini-2.5-pro, …
 *   /provider g → groq, gemini, …
 *   /key g      → gemini, groq
 *   /tools en   → enable, disable, create, delete, list
 */

import type { AppSettings } from '../types';
import { ATTACHED_TOOLS } from '../services/tools';
import { providerRouter } from '../services/providerRouter';

// ── Well-known model catalogue ────────────────────────────────────────────────
export const KNOWN_MODELS: Record<string, string[]> = {
  gemini: [
    'gemini-2.5-flash',
    'gemini-2.5-pro',
    'gemini-2.0-flash',
    'gemini-2.0-flash-lite',
    'gemini-2.0-pro-exp',
    'gemini-1.5-pro',
    'gemini-1.5-flash',
    'gemini-1.5-flash-8b',
  ],
  openai: [
    'gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo', 'gpt-4',
    'gpt-3.5-turbo', 'o1', 'o1-mini', 'o3-mini',
  ],
  anthropic: [
    'claude-opus-4-5', 'claude-sonnet-4-5', 'claude-haiku-4-5',
    'claude-3-5-sonnet-20241022', 'claude-3-5-haiku-20241022',
    'claude-3-opus-20240229',
  ],
  groq: [
    'llama-3.3-70b-versatile', 'llama-3.1-8b-instant',
    'mixtral-8x7b-32768', 'gemma2-9b-it', 'deepseek-r1-distill-llama-70b',
  ],
  cerebras: [
    'llama-3.3-70b', 'llama-3.1-8b', 'llama-3.1-70b',
  ],
  ollama: [
    'llama3', 'llama3.2', 'mistral', 'gemma3', 'phi4', 'codellama', 'qwen2.5',
  ],
  openrouter: [
    'meta-llama/llama-3.3-70b-instruct:free',
    'deepseek/deepseek-r1:free',
    'google/gemini-2.0-flash-exp:free',
    'mistralai/mistral-7b-instruct:free',
  ],
  together: [
    'meta-llama/Llama-3-70b-chat-hf',
    'mistralai/Mixtral-8x22B-Instruct-v0.1',
  ],
  huggingface: [
    'meta-llama/Llama-3.3-70B-Instruct',
    'Qwen/Qwen2.5-72B-Instruct',
  ],
  pollinations: [
    'openai', 'openai-large', 'openai-reasoning', 'qwen-coder',
    'deepseek', 'deepseek-r1', 'mistral', 'claude-hybridspace',
  ],
  uncloseai: [
    'hermes', 'qwen', 'speech'
  ],
  llm7: [
    'bidara', 'codestral-2501', 'deepseek-r1-0528', 'gpt-o3-2025-04-16',
    'llama-3.1-8b-instruct-fp8', 'llama-4-scout-17b-16e-instruct',
    'mistral-large-2411', 'mistral-small-2503', 'phi-4-multimodal-instruct'
  ],
  puter: [
    'gpt-4o', 'gpt-4o-mini', 'claude-3-5-sonnet', 'gemini-2.5-flash'
  ],
};

// Flat list of all known model strings
export const ALL_MODELS: string[] = Object.values(KNOWN_MODELS).flat();

// ── All slash commands ────────────────────────────────────────────────────────
export const ALL_COMMANDS = [
  '/help', '/h', '/?',
  '/setup', '/doctor',
  '/model', '/models',
  '/provider', '/provider add', '/provider list', '/provider remove',
  '/key',
  '/tools', '/tools enable', '/tools disable', '/tools create', '/tools delete', '/tools list',
  '/skills', '/skills add', '/skills list', '/skills delete',
  '/plugin', '/plugin create', '/plugin list', '/plugin delete',
  '/mcp', '/mcp add', '/mcp remove', '/mcp list',
  '/sessions', '/new', '/clear',
  '/system', '/multi',
  '/serve', '/health',
  '/export', '/import',
  '/compact',
  '/image',
  '/parallel',
  '/hibernate',
  '/hitl',
  '/run',
  '/reset',
  '/settings',
  '/exit', '/quit', '/q',
];

// ── Completer factory ─────────────────────────────────────────────────────────
export function makeCompleter(getSettings: () => AppSettings) {
  return function completer(line: string): [string[], string] {
    const trimmed = line.trimStart();
    if (!trimmed.startsWith('/')) return [[], line];

    const parts = trimmed.split(' ');
    const cmd = parts[0].toLowerCase();
    const arg1 = parts[1] ?? '';
    const arg2 = parts[2] ?? '';

    // /model <name>
    if ((cmd === '/model' || cmd === '/models') && parts.length >= 2) {
      const settings = getSettings();
      const providerModels = KNOWN_MODELS[settings.aiProvider] ?? [];
      const pool = [...new Set([...providerModels, ...ALL_MODELS])];
      const hits = pool.filter(m => m.toLowerCase().startsWith(arg1.toLowerCase()));
      return [hits.map(m => `/model ${m}`), trimmed];
    }

    // /provider <name>
    if (cmd === '/provider' && parts.length >= 2 && !['add', 'list', 'remove'].includes(arg1)) {
      const providers = providerRouter.getRegisteredProviders();
      const hits = providers.filter(p => p.toLowerCase().startsWith(arg1.toLowerCase()));
      return [hits.map(p => `/provider ${p}`), trimmed];
    }

    // /key <provider>
    if (cmd === '/key' && parts.length === 2) {
      const providers = providerRouter.getRegisteredProviders();
      const hits = providers.filter(p => p.toLowerCase().startsWith(arg1.toLowerCase()));
      return [hits.map(p => `/key ${p} `), trimmed];
    }

    // /tools enable|disable <tool-name>
    if (cmd === '/tools' && (arg1 === 'enable' || arg1 === 'disable') && parts.length >= 3) {
      const tools = Object.keys(ATTACHED_TOOLS);
      const hits = tools.filter(t => t.toLowerCase().startsWith(arg2.toLowerCase()));
      return [hits.map(t => `/tools ${arg1} ${t}`), trimmed];
    }

    // /tools subcommands
    if (cmd === '/tools' && parts.length === 2) {
      const subs = ['enable', 'disable', 'create', 'delete', 'list'].filter(
        s => s.startsWith(arg1.toLowerCase())
      );
      return [subs.map(s => `/tools ${s} `), trimmed];
    }

    // /skills subcommands
    if (cmd === '/skills' && parts.length === 2) {
      const subs = ['add', 'list', 'delete'].filter(s => s.startsWith(arg1.toLowerCase()));
      return [subs.map(s => `/skills ${s}`), trimmed];
    }

    // /plugin subcommands
    if (cmd === '/plugin' && parts.length === 2) {
      const subs = ['create', 'list', 'delete'].filter(s => s.startsWith(arg1.toLowerCase()));
      return [subs.map(s => `/plugin ${s}`), trimmed];
    }

    // /mcp subcommands
    if (cmd === '/mcp' && parts.length === 2) {
      const subs = ['add', 'remove', 'list'].filter(s => s.startsWith(arg1.toLowerCase()));
      return [subs.map(s => `/mcp ${s} `), trimmed];
    }

    // Base command matching
    const hits = ALL_COMMANDS.filter(c => c.startsWith(cmd));
    return [hits, trimmed];
  };
}

// ── Model catalogue display ───────────────────────────────────────────────────
export function renderModelCatalogue(currentProvider: string, currentModel: string): string {
  const R = '\x1b[0m', B = '\x1b[1m', D = '\x1b[2m';
  const cy = '\x1b[36m', gr = '\x1b[32m', wh = '\x1b[37m';
  const hk = '\x1b[38;5;82m', rd = '\x1b[1;31m';

  const lines: string[] = [];
  lines.push(`\n${B}${rd}Available Models${R}  ${D}(Tab-complete after /model)${R}\n`);

  for (const [p, models] of Object.entries(KNOWN_MODELS)) {
    const mark = p === currentProvider ? `${hk}●${R}` : `${D}○${R}`;
    lines.push(`  ${mark} ${B}${cy}${p}${R}`);
    for (const m of models) {
      const active = m === currentModel ? ` ${gr}◀ active${R}` : '';
      lines.push(`      ${D}·${R} ${wh}${m}${R}${active}`);
    }
    lines.push('');
  }
  lines.push(`${D}Tip: /model <name>  then press Tab to autocomplete${R}\n`);
  return lines.join('\n');
}

// ── Provider status display ───────────────────────────────────────────────────
export function renderProviderStatus(settings: AppSettings): string {
  const R = '\x1b[0m', B = '\x1b[1m', D = '\x1b[2m';
  const cy = '\x1b[36m', gr = '\x1b[32m', re = '\x1b[31m';
  const ye = '\x1b[33m', wh = '\x1b[37m', hk = '\x1b[38;5;82m';
  const gy = '\x1b[90m', rd = '\x1b[1;31m';

  const lines: string[] = [];
  lines.push(`\n${B}${rd}Registered Providers${R}\n`);

  const providers = providerRouter.getRegisteredProviders();
  for (const p of providers) {
    const hasKey = providerRouter.hasApiKey(p, settings);
    const isCurrent = p === settings.aiProvider;
    const icon = hasKey ? `${gr}●${R}` : `${re}○${R}`;
    const activeTag = isCurrent ? ` ${hk}◀ active${R}` : '';
    const keyTag = providerRouter.requiresApiKey(p)
      ? (hasKey ? `${D}[key ✓]${R}` : `${ye}[no key — /key ${p} <key>]${R}`)
      : `${gy}[free]${R}`;
    lines.push(`  ${icon} ${B}${wh}${p}${R}${activeTag}  ${keyTag}`);
  }
  lines.push(`\n${D}Switch:  /provider <name>${R}`);
  lines.push(`${D}Set key: /key <provider> <api-key>${R}\n`);
  return lines.join('\n');
}

