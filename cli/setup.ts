/**
 * cli/setup.ts — Interactive configuration wizard for WormXGPT CLI
 */
import readline from 'readline';
import { AppSettings } from '../types';
import { saveSettings, setApiKey } from './config';
import { C, box } from './ui';
import { providerRouter } from '../services/providerRouter';

function promptQuestion(rl: readline.Interface, question: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(`${C.cyan}${question}${C.reset} `, (answer) => {
      resolve(answer.trim());
    });
  });
}

export async function checkSetupRequired(settings: AppSettings): Promise<{ missingKeys: string[]; hasMemory: boolean; hasCache: boolean }> {
  const missingKeys: string[] = [];
  const activeProvider = settings.aiProvider || 'pollinations';

  if (providerRouter.requiresApiKey(activeProvider) && !providerRouter.hasApiKey(activeProvider, settings)) {
    missingKeys.push(activeProvider);
  }

  const hasMemory = !!(process.env.VITE_SUPABASE_URL && process.env.VITE_SUPABASE_ANON_KEY) || 
                    !!(settings.supabaseAnonKey);
  const hasCache = !!(settings.redisUrl && settings.redisToken);

  return { missingKeys, hasMemory, hasCache };
}

export function printSetupStatus(settings: AppSettings, checkResult: { missingKeys: string[]; hasMemory: boolean; hasCache: boolean }): void {
  const activeProvider = settings.aiProvider || 'pollinations';
  const providerStatus = checkResult.missingKeys.includes(activeProvider) 
    ? `${C.red}✘ Missing API Key (Run /setup)${C.reset}`
    : `${C.green}✔ Configured / Free${C.reset}`;

  const memoryStatus = checkResult.hasMemory
    ? `${C.green}✔ Supabase pgvector Active${C.reset}`
    : `${C.yellow}⚠ Ephemeral Fallback (No Supabase key)${C.reset}`;

  const cacheStatus = checkResult.hasCache
    ? `${C.green}✔ Redis Cache Active${C.reset}`
    : `${C.dim}— Disabled / Not Set${C.reset}`;

  const lines = [
    `${C.bold}🔑 Default AI Provider:${C.reset}  ${C.hacker}${activeProvider}${C.reset} (${settings.model})`,
    `   ${C.bold}Status:${C.reset}                ${providerStatus}`,
    `${C.bold}🧠 Agentic Memory:${C.reset}      ${memoryStatus}`,
    `${C.bold}💾 Redis Caching:${C.reset}       ${cacheStatus}`,
  ];
  console.log('\n' + box('📋 Configuration Status Board', lines, C.orange) + '\n');
}

export async function runSetupWizard(rl: readline.Interface, settings: AppSettings): Promise<void> {
  console.log('\n' + box('⚙️  WormXGPT Config Wizard', [
    'Welcome to the setup wizard. We will configure your',
    'AI Providers, API Keys, Memory options, and Caching.',
  ], C.yellow) + '\n');

  let running = true;
  while (running) {
    console.log(`${C.bold}Main Menu:${C.reset}`);
    console.log(`  ${C.green}1.${C.reset} Configure Default Provider & Model (Current: ${C.hacker}${settings.aiProvider} - ${settings.model}${C.reset})`);
    console.log(`  ${C.green}2.${C.reset} Set AI API Keys (Gemini, Groq, OpenAI, Anthropic, DeepSeek, etc.)`);
    console.log(`  ${C.green}3.${C.reset} Setup Supabase Agentic Memory`);
    console.log(`  ${C.green}4.${C.reset} Setup Redis Caching`);
    console.log(`  ${C.green}5.${C.reset} Manage Tools Activation Checklist`);
    console.log(`  ${C.green}6.${C.reset} View Current Configuration Details`);
    console.log(`  ${C.green}0.${C.reset} Save & Exit Wizard`);
    console.log('');

    const choice = await promptQuestion(rl, 'Choose an option (0-6):');

    switch (choice) {
      case '1': {
        const providers = providerRouter.getRegisteredProviders();
        console.log(`\n${C.bold}Available Providers:${C.reset}`);
        providers.forEach((p, idx) => {
          const requiresKey = providerRouter.requiresApiKey(p);
          const status = requiresKey ? (providerRouter.hasApiKey(p, settings) ? `${C.green}(Key Configured)${C.reset}` : `${C.red}(Needs Key)${C.reset}`) : `${C.green}(FREE)${C.reset}`;
          console.log(`  ${C.cyan}${idx + 1}.${C.reset} ${C.white}${p}${C.reset} ${status}`);
        });

        const pIdxStr = await promptQuestion(rl, 'Select provider number or enter name:');
        const pIdx = parseInt(pIdxStr) - 1;
        let selectedProvider = pIdxStr;
        if (pIdx >= 0 && pIdx < providers.length) {
          selectedProvider = providers[pIdx];
        }

        if (providers.includes(selectedProvider as any)) {
          settings.aiProvider = selectedProvider as any;
          const bestModel = providerRouter.getBestFreeModel(selectedProvider as any);
          const modelId = await promptQuestion(rl, `Enter model ID (Default: ${bestModel || 'openai'}):`);
          settings.model = modelId || bestModel || 'openai';
          saveSettings(settings);
          console.log(`\n${C.green}✔ Updated default provider to ${C.bcyan}${settings.aiProvider}${C.reset} (${settings.model})\n`);
        } else {
          console.log(`\n${C.red}✘ Invalid provider selection.${C.reset}\n`);
        }
        break;
      }

      case '2': {
        const providers = providerRouter.getRegisteredProviders().filter(p => providerRouter.requiresApiKey(p));
        console.log(`\n${C.bold}Set Provider API Keys:${C.reset}`);
        providers.forEach((p, idx) => {
          const hasKey = providerRouter.hasApiKey(p, settings);
          console.log(`  ${C.cyan}${idx + 1}.${C.reset} ${C.white}${p}${C.reset} — ${hasKey ? C.green + 'Key set' : C.red + 'No key set'}${C.reset}`);
        });

        const pIdxStr = await promptQuestion(rl, 'Select provider number to configure:');
        const pIdx = parseInt(pIdxStr) - 1;
        if (pIdx >= 0 && pIdx < providers.length) {
          const provider = providers[pIdx];
          const key = await promptQuestion(rl, `Enter API key for ${provider}:`);
          if (key) {
            setApiKey(provider, key, settings);
            console.log(`\n${C.green}✔ Key updated successfully for ${provider}.${C.reset}\n`);
          }
        } else {
          console.log(`\n${C.red}✘ Invalid provider selection.${C.reset}\n`);
        }
        break;
      }

      case '3': {
        console.log(`\n${C.bold}Configure Supabase pgvector Memory:${C.reset}`);
        const currentUrl = process.env.VITE_SUPABASE_URL || 'Not Set';
        console.log(`Current Supabase Url: ${C.dim}${currentUrl}${C.reset}`);

        const url = await promptQuestion(rl, 'Enter Supabase URL (e.g. https://xxxx.supabase.co):');
        const key = await promptQuestion(rl, 'Enter Supabase Anon Key:');

        if (url && key) {
          process.env.VITE_SUPABASE_URL = url;
          process.env.VITE_SUPABASE_ANON_KEY = key;
          settings.supabaseAnonKey = key;
          saveSettings(settings);
          console.log(`\n${C.green}✔ Supabase memory environment configured successfully.${C.reset}\n`);
        } else {
          console.log(`\n${C.yellow}⚠ Configuration skipped.${C.reset}\n`);
        }
        break;
      }

      case '4': {
        console.log(`\n${C.bold}Configure Redis Cache:${C.reset}`);
        const url = await promptQuestion(rl, 'Enter Redis connection URL (e.g. redis://default:xxx@localhost:6379):');
        const token = await promptQuestion(rl, 'Enter Upstash Redis Token (optional):');

        if (url) {
          settings.redisUrl = url;
          if (token) settings.redisToken = token;
          settings.cacheEnabled = true;
          saveSettings(settings);
          console.log(`\n${C.green}✔ Redis cache configured and enabled.${C.reset}\n`);
        } else {
          console.log(`\n${C.yellow}⚠ Configuration skipped.${C.reset}\n`);
        }
        break;
      }

      case '5': {
        // Toggle tools checklist
        const { runInteractiveToolToggler } = await import('./toolsManager');
        await runInteractiveToolToggler(rl, settings);
        break;
      }

      case '6': {
        const lines = [
          `${C.dim}Provider:${C.reset}  ${C.hacker}${settings.aiProvider}${C.reset}`,
          `${C.dim}Model:${C.reset}     ${C.hacker}${settings.model}${C.reset}`,
          `${C.dim}Temp:${C.reset}      ${settings.temperature}`,
          `${C.dim}MaxTokens:${C.reset} ${settings.maxTokens}`,
          `${C.dim}Memory:${C.reset}    ${settings.supabaseAnonKey ? C.green + 'Supabase' : C.red + 'Ephemeral'}${C.reset}`,
          `${C.dim}Cache:${C.reset}     ${settings.redisUrl ? C.green + 'Redis' : C.red + 'Disabled'}${C.reset}`,
          `${C.dim}Tools:${C.reset}     ${(settings.enabledTools || []).length} enabled`,
        ];
        console.log('\n' + box('⚙️  Current Settings Details', lines) + '\n');
        break;
      }

      case '0':
      default:
        running = false;
        break;
    }
  }

  console.log(`\n${C.green}✔ Configuration completed and saved successfully.${C.reset}\n`);
}
