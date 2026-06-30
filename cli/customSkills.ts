/**
 * cli/customSkills.ts — Manage custom skills and plugin scripts
 */
import fs from 'fs';
import path from 'path';
import { DATA_DIR } from './shims';
import { pluginRegistry, Plugin } from '../services/plugins';

const SKILLS_DIR = path.join(DATA_DIR, 'skills');
const PLUGINS_DIR = path.join(DATA_DIR, 'plugins');

if (!fs.existsSync(SKILLS_DIR)) fs.mkdirSync(SKILLS_DIR, { recursive: true });
if (!fs.existsSync(PLUGINS_DIR)) fs.mkdirSync(PLUGINS_DIR, { recursive: true });

export interface Skill {
  name: string;
  description: string;
  prompt: string;
}

// ── Skills CRUD ─────────────────────────────────────────────────────────────

export function loadSkills(): Skill[] {
  try {
    return fs.readdirSync(SKILLS_DIR)
      .filter(f => f.endsWith('.json'))
      .map(f => {
        try {
          return JSON.parse(fs.readFileSync(path.join(SKILLS_DIR, f), 'utf8'));
        } catch { return null; }
      })
      .filter(Boolean) as Skill[];
  } catch { return []; }
}

export function saveSkill(skill: Skill): void {
  const filePath = path.join(SKILLS_DIR, `${skill.name}.json`);
  fs.writeFileSync(filePath, JSON.stringify(skill, null, 2), 'utf8');
}

export function deleteSkill(name: string): boolean {
  const filePath = path.join(SKILLS_DIR, `${name}.json`);
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
    return true;
  }
  return false;
}

// ── Plugin Scripts Loader ───────────────────────────────────────────────────

export async function registerCustomPlugins(): Promise<void> {
  try {
    const files = fs.readdirSync(PLUGINS_DIR).filter(f => f.endsWith('.js'));
    for (const file of files) {
      try {
        const fullPath = path.join(PLUGINS_DIR, file);
        // Node dynamic import of a plain JS file
        const resolved = await import(path.toNamespacedPath(fullPath));
        const plugin: Plugin = resolved.default || resolved;
        if (plugin && plugin.id && plugin.name && plugin.type && typeof plugin.execute === 'function') {
          pluginRegistry.register(plugin);
        } else {
          console.error(`[!] Invalid plugin structure in ${file}`);
        }
      } catch (e: any) {
        console.error(`[!] Failed to load plugin script ${file}:`, e.message);
      }
    }
  } catch {}
}

export function saveCustomPlugin(id: string, code: string): void {
  const filePath = path.join(PLUGINS_DIR, `${id}.js`);
  fs.writeFileSync(filePath, code, 'utf8');
}

export function deleteCustomPlugin(id: string): boolean {
  const filePath = path.join(PLUGINS_DIR, `${id}.js`);
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
    return true;
  }
  return false;
}
