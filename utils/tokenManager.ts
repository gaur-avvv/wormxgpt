import { Message } from '../types';

// ── Core Token Estimation ────────────────────────────────────────────────────
// Uses the widely-accepted ~4 chars/token ratio for rough estimation.

export const estimateTokens = (text: string): number => Math.ceil(text.length / 4);

// ── Per-Model Context Limits ─────────────────────────────────────────────────
const MODEL_CONTEXT_LIMITS: Record<string, number> = {
  'gpt-4o': 128_000,
  'gpt-4o-mini': 128_000,
  'gpt-4.1': 1_000_000,
  'gpt-5': 200_000,
  'claude-3-5-sonnet-20241022': 200_000,
  'claude-sonnet-4-5': 200_000,
  'claude-opus-4-5': 200_000,
  'gemini-2.5-pro': 1_000_000,
  'gemini-2.5-flash': 1_000_000,
  'gemini-1.5-pro': 2_000_000,
  'deepseek-chat': 64_000,
  'deepseek-reasoner': 64_000,
  '__default__': 32_000
};

export function getModelContextLimit(model: string): number {
  // Exact match first
  if (MODEL_CONTEXT_LIMITS[model]) return MODEL_CONTEXT_LIMITS[model];
  // Partial match
  for (const [key, limit] of Object.entries(MODEL_CONTEXT_LIMITS)) {
    if (key !== '__default__' && model.includes(key)) return limit;
  }
  return MODEL_CONTEXT_LIMITS['__default__'];
}

// ── Token Counter for Full Request ───────────────────────────────────────────

export interface TokenCount {
  total: number;
  systemTokens: number;
  historyTokens: number;
  pct: number;           // 0.0–1.0 fraction of context limit used
  overLimit: boolean;
  shouldSummarize: boolean; // true if > 80% filled
  contextLimit: number;
}

export function countTokensForRequest(
  messages: Message[],
  systemPrompt: string,
  model: string = '__default__'
): TokenCount {
  const contextLimit = getModelContextLimit(model);
  const systemTokens = estimateTokens(systemPrompt);

  let historyTokens = 0;
  for (const msg of messages) {
    const contentStr = typeof msg.content === 'string'
      ? msg.content
      : JSON.stringify(msg.content || '');
    const extra = (msg as any).toolInvocations
      ? estimateTokens(JSON.stringify((msg as any).toolInvocations))
      : 0;
    historyTokens += estimateTokens(contentStr) + extra;
  }

  const total = systemTokens + historyTokens;
  const pct = total / contextLimit;

  return {
    total,
    systemTokens,
    historyTokens,
    pct,
    contextLimit,
    overLimit: pct >= 1.0,
    shouldSummarize: pct >= 0.8
  };
}

// ── Stale Tool Result Pruning ─────────────────────────────────────────────────
// Identifies assistant messages that contain tool result content and removes
// all but the most recent `keepLast` tool results, retaining regular messages.

export function pruneStaleToolResults(messages: Message[], keepLast: number = 3): Message[] {
  // Identify indices of tool-result assistant messages
  const toolResultIndices: number[] = [];

  for (let i = 0; i < messages.length; i++) {
    const msg = messages[i];
    const isToolResult =
      (msg.role === 'model' && msg.toolInvocations && msg.toolInvocations.length > 0) ||
      (typeof msg.content === 'string' && msg.content.startsWith('[📡 SOURCE:')) ||
      (typeof msg.content === 'string' && msg.content.startsWith('[📋 SUMMARIZED TOOL RESULTS'));

    if (isToolResult) toolResultIndices.push(i);
  }

  // Keep only the last `keepLast` tool results; mark older ones for removal
  const toRemove = new Set(toolResultIndices.slice(0, -keepLast));

  const pruned = messages.filter((_, i) => !toRemove.has(i));

  if (toRemove.size > 0) {
    console.log(`[TokenManager] 🗑️ Pruned ${toRemove.size} stale tool result(s); kept last ${keepLast}`);
  }

  return pruned;
}

// ── Summarization Trigger ────────────────────────────────────────────────────

export function shouldTriggerSummarization(tokenPct: number): boolean {
  return tokenPct >= 0.8;
}

/**
 * Summarize a list of tool result strings into a compact digest.
 * Used when the context window is approaching 80% to prevent blowout.
 */
export function summarizeToolResults(results: Array<{ tool: string; content: string }>): string {
  const lines = results.map((r, i) => {
    const truncated = r.content.length > 500
      ? r.content.substring(0, 500) + `... [+${r.content.length - 500} chars truncated]`
      : r.content;
    return `[Result ${i + 1}/${results.length} · ${r.tool}]\n${truncated}`;
  });
  return `[📋 SUMMARIZED TOOL RESULTS — ${results.length} calls compressed to fit context]\n\n${lines.join('\n\n---\n\n')}`;
}

// ── Tool Result Truncator ────────────────────────────────────────────────────

export const pruneToolResult = (result: string, maxChars: number = 32_000): string => {
  if (!result || result.length <= maxChars) return result;

  try {
    const parsed = JSON.parse(result);
    if (typeof parsed === 'object') {
      return JSON.stringify({
        ...parsed,
        _truncated: true,
        _notice: `Content exceeded limit of ${maxChars} chars and was truncated. Use more specific tools if needed.`,
      }).substring(0, maxChars) + '... [TRUNCATED]';
    }
  } catch (e) {}

  return result.substring(0, maxChars) + '... [TRUNCATED]';
};

// ── History Pruner ────────────────────────────────────────────────────────────

export const pruneHistory = (
  history: Message[],
  systemPrompt: string,
  modelMaxTokens: number = 8000,
  responseBudget: number = 1500
): Message[] => {
  const systemBudget = estimateTokens(systemPrompt);
  const historyBudget = Math.max(modelMaxTokens - systemBudget - responseBudget, 1000);

  let recentHistory: Message[] = [];
  let historyTokens = 0;

  for (let i = history.length - 1; i >= 0; i--) {
    const msg = history[i];
    const contentStr = typeof msg.content === 'string'
      ? msg.content
      : JSON.stringify(msg.content || '');

    const extraTokens = (msg as any).toolInvocations
      ? estimateTokens(JSON.stringify((msg as any).toolInvocations))
      : 0;
    const msgTokens = estimateTokens(contentStr) + extraTokens;

    if (historyTokens + msgTokens > historyBudget) {
      if (recentHistory.length === 0) {
        recentHistory.unshift({
          ...msg,
          content: contentStr.substring(0, historyBudget * 4) + '... [TRUNCATED]'
        });
      }
      break;
    }

    recentHistory.unshift(msg);
    historyTokens += msgTokens;
  }

  return recentHistory;
};
