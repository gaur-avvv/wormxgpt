import { AppSettings, Message, StreamChunk, ToolInvocation } from '../types';
import { providerRouter } from './providerRouter';
import { mcpRegistry } from './mcp/registry';
import { executeToolByName } from './tools';

/**
 * ChatService: Synchronous Request-Response service executing completions
 * across all configured providers, with live Tool Invocations and MCP responses.
 */
export class ChatService {
  /**
   * Detect and execute armed tools or explicit tool commands from messages
   */
  private async executeApplicableTools(
    settings: AppSettings,
    messages: Message[],
    signal?: AbortSignal,
    onToolStart?: (toolName: string) => void,
    onToolEnd?: (toolName: string) => void
  ): Promise<{ toolInvocations: ToolInvocation[]; augmentedMessages: Message[] }> {
    const lastMsg = messages[messages.length - 1];
    if (!lastMsg || lastMsg.role !== 'user') {
      return { toolInvocations: [], augmentedMessages: messages };
    }

    const text = lastMsg.content.trim();
    const toolInvocations: ToolInvocation[] = [];
    const augmentedMessages = [...messages];

    // 1. Explicit tool command check: e.g. /search query, /deepwiki query, /tool:cve query
    let toolToRun: string | null = null;
    let toolArgs: Record<string, any> = {};

    const KNOWN_EXPLICIT_TOOLS = new Set([
      'search', 'google_search', 'parallel_search', 'web_scraper', 'scrape_web',
      'deepwiki', 'read_wiki_structure', 'search_docs', 'lookup_cve', 'cve',
      'cryptoprices', 'crypto', 'calculator', 'calc', 'weather', 'dns_lookup',
      'port_scan', 'shodan_search', 'whois'
    ]);

    if (text.startsWith('/')) {
      const match = text.match(/^\/([a-zA-Z0-9_-]+)(?:\s+(.*))?$/s);
      if (match) {
        const cmd = match[1].toLowerCase();
        const rest = (match[2] || '').trim();
        if (KNOWN_EXPLICIT_TOOLS.has(cmd) || cmd.startsWith('tool:') || cmd.startsWith('mcp:')) {
          toolToRun = cmd.replace(/^(tool|mcp):/, '');
          toolArgs = { query: rest, input: rest };
        }
      }
    } else {
      // 2. Keyword heuristic for armed zero-auth MCP tools
      const lower = text.toLowerCase();
      if ((lower.includes('search for') || lower.includes('google for') || lower.includes('look up online') || lower.includes('find on web')) && !lower.includes('code to')) {
        toolToRun = 'parallel_search';
        toolArgs = { query: text.replace(/^(please\s+)?(search for|google for|look up online|find on web)\s+/i, '') };
      } else if (lower.includes('cve-') || lower.includes('vulnerability details')) {
        toolToRun = 'lookup_cve';
        toolArgs = { cve_id: (text.match(/CVE-\d{4}-\d+/i) || [text])[0] };
      } else if (lower.includes('crypto price') || lower.includes('bitcoin price') || lower.includes('eth price')) {
        toolToRun = 'CryptoPrices';
        toolArgs = { symbol: lower.includes('eth') ? 'ETH' : lower.includes('sol') ? 'SOL' : 'BTC' };
      } else if (lower.includes('docs for') || lower.includes('api documentation')) {
        toolToRun = 'search_docs';
        toolArgs = { query: text };
      }
    }

    if (toolToRun) {
      if (signal?.aborted) throw new Error('Request aborted by user');
      onToolStart?.(toolToRun);
      const toolCallId = `call_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
      try {
        let result: any;
        try {
          const res = await mcpRegistry.executeArsenalTool(toolToRun, toolArgs);
          result = res.result;
        } catch {
          result = await executeToolByName(toolToRun, toolArgs);
        }

        toolInvocations.push({
          state: 'result',
          toolCallId,
          toolName: toolToRun,
          args: toolArgs,
          result
        });

        // Augment context with tool output for model reasoning as a user turn
        augmentedMessages.push({
          role: 'user',
          content: `[TOOL EXECUTION RESULT FOR "${toolToRun}"]:\n${typeof result === 'string' ? result : JSON.stringify(result, null, 2)}\n\nPlease synthesize this tool information to answer the user query: "${text}"`,
          timestamp: Date.now()
        });
      } catch (err: any) {
        toolInvocations.push({
          state: 'result',
          toolCallId,
          toolName: toolToRun,
          args: toolArgs,
          result: { error: err.message || 'Execution error' }
        });
      } finally {
        onToolEnd?.(toolToRun);
      }
    }

    return { toolInvocations, augmentedMessages };
  }

  /**
   * Synchronously generate chat completion for user messages
   */
  public async generateChatResponse(
    settings: AppSettings,
    messages: Message[],
    signal?: AbortSignal,
    onToolStart?: (toolName: string) => void,
    onToolEnd?: (toolName: string) => void
  ): Promise<StreamChunk> {
    const { toolInvocations, augmentedMessages } = await this.executeApplicableTools(
      settings,
      messages,
      signal,
      onToolStart,
      onToolEnd
    );
    const response = await providerRouter.generateWithFallback(settings, augmentedMessages, signal);
    
    return {
      ...response,
      toolInvocations: toolInvocations.length > 0 ? toolInvocations : response.toolInvocations
    };
  }

  /**
   * Direct synchronous call without fallback
   */
  public async generateDirectResponse(
    settings: AppSettings,
    messages: Message[],
    signal?: AbortSignal,
    onToolStart?: (toolName: string) => void,
    onToolEnd?: (toolName: string) => void
  ): Promise<StreamChunk> {
    const { toolInvocations, augmentedMessages } = await this.executeApplicableTools(
      settings,
      messages,
      signal,
      onToolStart,
      onToolEnd
    );
    const response = await providerRouter.generateDirect(settings, augmentedMessages, signal);
    
    return {
      ...response,
      toolInvocations: toolInvocations.length > 0 ? toolInvocations : response.toolInvocations
    };
  }
}

export const chatService = new ChatService();
export default chatService;
