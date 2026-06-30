/**
 * cli/customTools.ts — Dynamic custom tool loader and creator
 */
import fs from 'fs';
import path from 'path';
import { DATA_DIR } from './shims';
import { ATTACHED_TOOLS } from '../services/tools';

const CUSTOM_TOOLS_DIR = path.join(DATA_DIR, 'custom_tools');
if (!fs.existsSync(CUSTOM_TOOLS_DIR)) fs.mkdirSync(CUSTOM_TOOLS_DIR, { recursive: true });

export interface CustomToolConfig {
  name: string;
  description: string;
  parameters: {
    type: 'object';
    properties: Record<string, { type: string; description?: string; enum?: string[] }>;
    required?: string[];
  };
  code: string; // Javascript code string
}

export function loadCustomTools(): CustomToolConfig[] {
  try {
    return fs.readdirSync(CUSTOM_TOOLS_DIR)
      .filter(f => f.endsWith('.json'))
      .map(f => {
        try {
          return JSON.parse(fs.readFileSync(path.join(CUSTOM_TOOLS_DIR, f), 'utf8'));
        } catch { return null; }
      })
      .filter(Boolean) as CustomToolConfig[];
  } catch { return []; }
}

export function registerCustomTools(): void {
  const tools = loadCustomTools();
  for (const t of tools) {
    try {
      // Create executable function
      const fn = new Function('args', `
        return (async () => {
          ${t.code}
        })();
      `);

      ATTACHED_TOOLS[t.name] = {
        type: 'function',
        function: {
          name: t.name,
          description: t.description,
          parameters: t.parameters,
        },
        execute: async (args: any) => {
          try {
            const result = await fn(args);
            return typeof result === 'string' ? result : JSON.stringify(result, null, 2);
          } catch (e: any) {
            throw new Error(`Execution error in custom tool ${t.name}: ${e.message}`);
          }
        }
      };
    } catch (e: any) {
      console.error(`[!] Failed to compile custom tool ${t.name}:`, e.message);
    }
  }
}

export function saveCustomTool(tool: CustomToolConfig): void {
  const filePath = path.join(CUSTOM_TOOLS_DIR, `${tool.name}.json`);
  fs.writeFileSync(filePath, JSON.stringify(tool, null, 2), 'utf8');

  // Register immediately
  registerCustomTools();
}

export function deleteCustomTool(name: string): boolean {
  const filePath = path.join(CUSTOM_TOOLS_DIR, `${name}.json`);
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
    delete ATTACHED_TOOLS[name];
    return true;
  }
  return false;
}
