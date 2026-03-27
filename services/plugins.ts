export type PluginType = 'FUNCTION' | 'ACTION' | 'FILTER';

export interface PluginContext {
  content?: string;
  phase?: 'PRE' | 'POST';
  modelId?: string;
  [key: string]: any;
}

export interface Plugin {
  id: string;
  name: string;
  type: PluginType;
  description: string;
  enabled: boolean;
  execute: (context: PluginContext) => Promise<any>;
}

class PluginRegistry {
  private plugins: Map<string, Plugin> = new Map();

  constructor() {
    this.registerBuiltIns();
  }

  register(plugin: Plugin) {
    console.log(`[Plugins] Registered: ${plugin.name} (${plugin.type})`);
    this.plugins.set(plugin.id, plugin);
  }

  getPluginsByType(type: PluginType) {
    return Array.from(this.plugins.values()).filter(p => p.type === type && p.enabled);
  }

  async runFilters(content: string, phase: 'PRE' | 'POST'): Promise<string> {
    const filters = this.getPluginsByType('FILTER');
    let result = content;
    for (const filter of filters) {
      try {
        const output = await filter.execute({ content: result, phase });
        if (typeof output === 'string') result = output;
        else if (output?.content) result = output.content;
      } catch (e) {
        console.error(`[Plugins] Filter ${filter.name} failed:`, e);
      }
    }
    return result;
  }

  private registerBuiltIns() {
    // ── Example Filter: Redaction ──
    this.register({
      id: 'builtin-redactor',
      name: 'Safety Redactor',
      type: 'FILTER',
      description: 'Redacts sensitive patterns from model output.',
      enabled: true,
      execute: async (ctx) => {
        if (ctx.phase !== 'POST') return ctx.content;
        return ctx.content?.replace(/API_KEY_[A-Z0-9]+/g, '[REDACTED]');
      }
    });

    // ── Example Action: Summarizer ──
    this.register({
      id: 'builtin-summarizer',
      name: 'Quick Summarize',
      type: 'ACTION',
      description: 'Adds a summary button to messages.',
      enabled: true,
      execute: async (ctx) => {
        return `Summary of: ${ctx.content?.substring(0, 50)}...`;
      }
    });
  }
}

export const pluginRegistry = new PluginRegistry();
