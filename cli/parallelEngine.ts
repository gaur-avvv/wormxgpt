/**
 * cli/parallelEngine.ts — Multi-agent parallel model execution and consolidation engine
 */
import { AppSettings, Message, StreamChunk } from '../types';
import { providerRouter } from '../services/providerRouter';
import { C, box } from './ui';

export interface ParallelResult {
  provider: string;
  response: string;
  success: boolean;
}

/**
 * Returns a list of all providers that have keys configured (plus free ones)
 */
export function getConfiguredProviders(settings: AppSettings): string[] {
  const active: string[] = [];
  const providers = providerRouter.getRegisteredProviders();

  for (const p of providers) {
    const keyField = providerRouter.getApiKeyField(p);
    if (keyField && (settings as any)[keyField]) {
      active.push(p);
    }
  }

  return active;
}

/**
 * Runs a prompt on multiple models in parallel, gathers their responses,
 * and uses the default model to synthesize a consolidated response.
 */
export async function runParallelConsensus(
  prompt: string,
  settings: AppSettings,
  sessionMessages: Message[]
): Promise<AsyncGenerator<StreamChunk>> {
  const providers = getConfiguredProviders(settings).slice(0, 4); // Capped at top 4 for token/concurrency safety

  if (providers.length < 2) {
    // If only one provider is configured, fall back to normal chat stream
    return providerRouter.streamWithFallback(settings, sessionMessages);
  }

  console.log(`\n${C.yellow}[Parallel Consensus] Dispatching subagents to ${C.bold}${providers.join(', ')}${C.reset}...`);

  // Build the message payload for each model
  const apiMessages = [...sessionMessages];

  // Trigger all in parallel
  const tasks = providers.map(async (provider) => {
    let result = '';
    const tempSettings: AppSettings = {
      ...settings,
      aiProvider: provider as any,
      model: providerRouter.getBestFreeModel(provider as any) || settings.model
    };

    try {
      // Stream direct response but gather it silently
      for await (const chunk of providerRouter.streamDirect(tempSettings, apiMessages)) {
        result += chunk.text;
      }
      return { provider, response: result, success: true };
    } catch (e: any) {
      return { provider, response: `Failed: ${e.message}`, success: false };
    }
  });

  const results = await Promise.all(tasks);

  // Print summary box of subagent outputs
  const boxLines: string[] = [];
  results.forEach(r => {
    const icon = r.success ? `${C.green}✔` : `${C.red}✘`;
    boxLines.push(`${icon} ${C.bold}${r.provider}${C.reset}: ${r.response.substring(0, 100).replace(/\n/g, ' ')}...`);
  });
  console.log('\n' + box('Subagent Parallel Results', boxLines, C.cyan) + '\n');

  // Now, synthesize using the default provider
  const consensusPrompt = `You are the Consensus Master. Below are the responses from several different AI models to the user's prompt: "${prompt}".

${results.map(r => `--- RESPONSE FROM MODEL [${r.provider.toUpperCase()}]: ---\n${r.response}\n`).join('\n')}

Synthesize these different viewpoints and answers into a single, high-quality, comprehensive, and definitive consolidated answer. Output only this consolidated response.`;

  const synthesisMessages: Message[] = [
    { role: 'user', content: consensusPrompt, timestamp: Date.now() }
  ];

  // Return the synthesis stream generator
  return providerRouter.streamWithFallback(settings, synthesisMessages);
}
