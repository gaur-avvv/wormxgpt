/**
 * cli/doctor.ts — Connectivity and configuration diagnosis for WormXGPT
 */
import { AppSettings } from '../types';
import { providerRouter } from '../services/providerRouter';
import { ATTACHED_TOOLS } from '../services/tools';
import { createClient } from '@supabase/supabase-js';
import { C, box } from './ui';

export async function runDiagnostics(settings: AppSettings): Promise<void> {
  console.log(`\n${C.bold}${C.bred}🏥 WormXGPT Doctor — Running Diagnostics...${C.reset}\n`);

  const diagnostics: string[] = [];

  // 1. Internet Connectivity
  diagnostics.push(`${C.bold}1. Internet Connectivity:${C.reset}`);
  try {
    const start = Date.now();
    const res = await fetch('https://registry.npmjs.org/', { method: 'HEAD' });
    const ms = Date.now() - start;
    if (res.ok) {
      diagnostics.push(`  ${C.green}✔ Connection OK${C.reset} (ping npm registry: ${ms}ms)`);
    } else {
      diagnostics.push(`  ${C.yellow}⚠ Connected but response status not 200${C.reset}`);
    }
  } catch (e: any) {
    diagnostics.push(`  ${C.red}✘ Failed connection: ${e.message}${C.reset}`);
  }

  // 2. Active AI Provider Key
  diagnostics.push(`\n${C.bold}2. Active Provider Key Status:${C.reset}`);
  const activeProvider = settings.aiProvider || 'pollinations';
  const requiresKey = providerRouter.requiresApiKey(activeProvider);
  const hasKey = providerRouter.hasApiKey(activeProvider, settings);

  if (requiresKey) {
    if (hasKey) {
      diagnostics.push(`  ${C.green}✔ Active Provider: ${activeProvider} (API Key configured)${C.reset}`);
      // Verification
      try {
        const service = providerRouter.getService(activeProvider);
        const apiKeyField = providerRouter.getApiKeyField(activeProvider);
        const key = apiKeyField ? (settings as any)[apiKeyField] : '';
        if (service?.verifyApiKey) {
          const verified = await service.verifyApiKey(key);
          if (verified) {
            diagnostics.push(`  ${C.green}✔ API Key Verified successfully with ${activeProvider} endpoint.${C.reset}`);
          } else {
            diagnostics.push(`  ${C.red}✘ API Key failed validation check on ${activeProvider} endpoint.${C.reset}`);
          }
        }
      } catch (e: any) {
        diagnostics.push(`  ${C.yellow}⚠ Failed key verification: ${e.message}${C.reset}`);
      }
    } else {
      diagnostics.push(`  ${C.red}✘ Active Provider: ${activeProvider} (Requires API Key, but none is set!)${C.reset}`);
    }
  } else {
    diagnostics.push(`  ${C.green}✔ Active Provider: ${activeProvider} (Free tier endpoint, no key required)${C.reset}`);
  }

  // 3. Agentic Memory Status
  diagnostics.push(`\n${C.bold}3. Supabase pgvector Memory Status:${C.reset}`);
  const sbUrl = process.env.VITE_SUPABASE_URL || '';
  const sbKey = process.env.VITE_SUPABASE_ANON_KEY || settings.supabaseAnonKey || '';
  if (sbUrl && sbKey) {
    try {
      const client = createClient(sbUrl, sbKey);
      const { data, error } = await client.from('agent_memory').select('count', { count: 'exact', head: true });
      if (error) throw error;
      diagnostics.push(`  ${C.green}✔ Supabase Connected successfully.${C.reset}`);
      diagnostics.push(`  ${C.green}✔ Memory count: ${data || 0} facts stored.${C.reset}`);
    } catch (e: any) {
      diagnostics.push(`  ${C.red}✘ Connection failed: ${e.message}${C.reset}`);
    }
  } else {
    diagnostics.push(`  ${C.yellow}⚠ Ephemeral fallback: Supabase credentials are not set.${C.reset}`);
  }

  // 4. Redis Caching
  diagnostics.push(`\n${C.bold}4. Redis Cache Status:${C.reset}`);
  if (settings.redisUrl) {
    diagnostics.push(`  ${C.green}✔ Redis URL configured: ${settings.redisUrl}${C.reset}`);
    diagnostics.push(`  ${C.yellow}⚠ Caching connectivity will auto-verify during active requests.${C.reset}`);
  } else {
    diagnostics.push(`  ${C.dim}— Redis cache not configured (disabled).${C.reset}`);
  }

  // 5. Tools & MCP Status
  diagnostics.push(`\n${C.bold}5. Tools & MCP Bridge Status:${C.reset}`);
  const toolNames = Object.keys(ATTACHED_TOOLS);
  const enabledCount = (settings.enabledTools || []).length;
  diagnostics.push(`  ${C.green}✔ Loaded Tools:${C.reset} ${toolNames.length} available, ${enabledCount} active/enabled.`);

  const mcpServers = settings.mcpServerUrls || [];
  if (settings.mcpEnabled && mcpServers.length > 0) {
    diagnostics.push(`  ${C.green}✔ MCP Servers:${C.reset} ${mcpServers.length} configured:`);
    mcpServers.forEach(url => diagnostics.push(`    - ${url}`));
  } else {
    diagnostics.push(`  ${C.dim}— MCP bridge disabled or no servers configured.${C.reset}`);
  }

  console.log(box('WormXGPT Diagnostics Dashboard', diagnostics, C.cyan) + '\n');
}
