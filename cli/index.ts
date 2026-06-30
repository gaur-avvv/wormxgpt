/**
 * cli/index.ts — WormXGPT CLI Entry Point
 * Must import shims FIRST before anything else.
 * 
 * Features:
 *  - Interactive chat REPL with streaming
 *  - Slash commands (/help, /model, /provider, /key, /tools, /mcp, etc.)
 *  - Dynamic Custom Tools (/tools create)
 *  - Custom OpenAI-Compatible Providers (/provider add)
 *  - Custom Skills & Plugins (/skills add)
 *  - Auto-Hibernate / Token compression scheduler
 *  - Onboarding Setup Wizard on startup if keys are missing
 *  - Interactive tool checklist toggle
 *  - Connected Diagnostics / Connectivity Doctor
 *  - Direct CLI prompt execution (wormxgpt "tell me a story")
 */

// ─── SHIMS MUST COME FIRST ──────────────────────────────────────────────────
import './shims';

// ─── Node builtins ───────────────────────────────────────────────────────────
import readline from 'readline';
import fs from 'fs';
import path from 'path';

// ─── CLI modules ─────────────────────────────────────────────────────────────
import { C, BANNER, Spinner, box, toolCallHeader, toolResultDisplay, statusLine, HELP_TEXT, quickTipsBar, interactiveSelect } from './ui';
import { makeCompleter, renderModelCatalogue, renderProviderStatus, KNOWN_MODELS, ALL_MODELS } from './completer';
import { loadSettings, saveSettings, setApiKey, getDefaults } from './config';
import { createSession, saveSession, loadSession, listSessions, deleteSession, exportSession, importSession, autoTitleSession } from './sessions';
import { DATA_DIR } from './shims';
import { registerCustomProviders, addCustomProvider, removeCustomProvider, loadCustomProviders } from './customProviders';
import { registerCustomTools, saveCustomTool, deleteCustomTool, loadCustomTools } from './customTools';
import { registerCustomPlugins, saveSkill, deleteSkill, loadSkills, saveCustomPlugin, deleteCustomPlugin } from './customSkills';
import { HibernationManager } from './hibernation';
import { checkSetupRequired, runSetupWizard, printSetupStatus } from './setup';
import { runParallelConsensus, getConfiguredProviders } from './parallelEngine';
import { runDiagnostics } from './doctor';
import { runInteractiveToolToggler } from './toolsManager';

// ─── App imports (these work because shims inject globals) ───────────────────
import type { AppSettings, Message, ChatSession } from '../types';
import { ATTACHED_TOOLS, executeToolCall, TOOL_CATEGORIES } from '../services/tools';
import { providerRouter, initializeProviderRouter } from '../services/providerRouter';
import { pluginRegistry } from '../services/plugins';
import { mcpService } from '../services/mcp';


// ─── State ───────────────────────────────────────────────────────────────────
let settings: AppSettings;
let session: ChatSession;
let abortController: AbortController | null = null;
const spinner = new Spinner();
let hibernationManager: HibernationManager;

function cleanExit(code: number) {
  if (hibernationManager) {
    hibernationManager.stopMonitor();
  }
  process.exit(code);
}

// ─── Initialize ──────────────────────────────────────────────────────────────
async function init() {
  // Register safety permission check hook
  (global as any).cliPromptPermission = async (name: string, args: any): Promise<boolean> => {
    if (!process.stdin.isTTY) return true;

    const activeRl = (global as any).activeReadlineInterface;
    if (activeRl) activeRl.pause();

    return new Promise((resolve) => {
      process.stdout.write(`\n${C.bold}${C.yellow}⚠️  [SECURITY] Tool ${C.bcyan}${name}${C.reset}${C.yellow} requests execution with args:${C.reset}\n`);
      console.log(C.dim + JSON.stringify(args, null, 2) + C.reset);
      process.stdout.write(`${C.bold}${C.cyan}?${C.reset} Allow this tool to execute? (y/N): `);

      const onKeypress = (str: string, key: readline.Key) => {
        const char = (str || '').toLowerCase().trim();
        const allowed = char === 'y' || (key && (key.name === 'y' || key.name === 'yes'));
        cleanup(allowed);
      };

      const cleanup = (allowed: boolean) => {
        process.stdin.removeListener('keypress', onKeypress);
        if (process.stdin.isTTY) process.stdin.setRawMode(false);
        process.stdout.write(allowed ? `${C.green}Allowed ✔${C.reset}\n\n` : `${C.red}Rejected ✘${C.reset}\n\n`);
        if (activeRl) {
          activeRl.resume();
          activeRl.prompt(true);
        }
        resolve(allowed);
      };

      readline.emitKeypressEvents(process.stdin);
      if (process.stdin.isTTY) process.stdin.setRawMode(true);
      process.stdin.on('keypress', onKeypress);
    });
  };

  // Register HITL ask_human hook — pauses generation and prompts user inline
  (global as any).hitlEnabled = true; // default ON, toggled via /hitl
  (global as any).cliAskHuman = async (question: string, context?: string): Promise<string> => {
    if (!process.stdin.isTTY) return '[No terminal — cannot ask human]';
    const activeRl = (global as any).activeReadlineInterface;
    if (activeRl) activeRl.pause();
    return new Promise((resolve) => {
      process.stdout.write(`\n${C.bold}${C.magenta}🤝 [HITL] AI is asking you a question:${C.reset}\n`);
      if (context) process.stdout.write(`${C.dim}Context: ${context}${C.reset}\n`);
      process.stdout.write(`${C.bold}${C.cyan}❓ ${question}${C.reset}\n`);
      process.stdout.write(`${C.yellow}Your answer: ${C.reset}`);
      const tempRl = readline.createInterface({ input: process.stdin, output: process.stdout, terminal: false });
      tempRl.once('line', (answer) => {
        tempRl.close();
        if (activeRl) { activeRl.resume(); activeRl.prompt(true); }
        resolve(answer.trim() || '(no answer)');
      });
    });
  };

  // Load settings
  settings = loadSettings();

  // Load custom configurations
  registerCustomProviders();
  registerCustomTools();
  await registerCustomPlugins();

  // Initialize providers
  try {
    await initializeProviderRouter();
  } catch (e: any) {
    console.error(`${C.red}[!] Provider init warning: ${e.message}${C.reset}`);
  }

  // Load or create session
  const sessions = listSessions();
  if (sessions.length > 0) {
    session = loadSession(sessions[0].id) || createSession();
  } else {
    session = createSession();
  }

  // Setup Hibernation Manager
  hibernationManager = new HibernationManager(() => settings, () => session);

  // Connect MCP servers from settings
  const mcpUrls = settings.mcpServerUrls || [];
  if (settings.mcpEnabled && mcpUrls.length > 0) {
    console.log(`${C.dim}[MCP] Connecting to ${mcpUrls.length} server(s)...${C.reset}`);
    mcpService.connectMultiple(mcpUrls).catch((e: any) =>
      console.warn(`${C.yellow}[MCP] Init warning: ${e?.message}${C.reset}`)
    );
  }
}

// ─── Streaming Chat ──────────────────────────────────────────────────────────
async function chat(userInput: string, rl?: readline.Interface) {
  if (rl) {
    hibernationManager.resetTimer(rl);
  }

  // Run input filters
  let filteredInput = await pluginRegistry.runFilters(userInput, 'PRE');

  // Add user message
  const userMsg: Message = { role: 'user', content: filteredInput, timestamp: Date.now() };
  session.messages.push(userMsg);
  autoTitleSession(session);
  saveSession(session);

  // Build messages for the API (enforce token limit dynamically by slicing)
  const limitCount = settings.attachedMessagesCount || 20;
  const apiMessages = session.messages.slice(-limitCount);

  abortController = new AbortController();

  let fullResponse = '';
  let thinkingText = '';
  let isThinking = false;

  // Auto-connect MCP if enabled but not yet connected (e.g., re-opened session)
  if (settings.mcpEnabled && (settings.mcpServerUrls || []).length > 0 && !mcpService.isConnected) {
    const mcpUrls = settings.mcpServerUrls || [];
    process.stdout.write(`${C.dim}[MCP] Reconnecting to ${mcpUrls.length} server(s)...${C.reset}\r`);
    await mcpService.connectMultiple(mcpUrls).catch(() => {});
    if (mcpService.isConnected) {
      process.stdout.write(`${C.green}[MCP] Connected ✔               ${C.reset}\n`);
    }
  }

  const configuredProviders = getConfiguredProviders(settings);
  const useConsensus = configuredProviders.length >= 2;

  process.stdout.write(`\n${C.hacker}WormGPT ${useConsensus ? 'Consensus ' : ''}${C.dim}►${C.reset} `);

  try {
    let previousTextLength = 0;
    let printedImagesCount = 0;
    let printedSourcesCount = 0;
    let printedVideo = false;
    let printedAudio = false;

    const stream = useConsensus 
      ? await runParallelConsensus(filteredInput, settings, apiMessages)
      : providerRouter.streamWithFallback(settings, apiMessages, abortController.signal);

    for await (const chunk of stream) {
      if (abortController.signal.aborted) break;

      const delta = chunk.text.substring(previousTextLength);
      previousTextLength = chunk.text.length;

      let textToProcess = delta;
      
      while (textToProcess) {
        if (isThinking) {
          const endIdx = textToProcess.indexOf('</think>');
          if (endIdx !== -1) {
            const thinkPart = textToProcess.substring(0, endIdx);
            thinkingText += thinkPart;
            process.stdout.write(thinkPart + `${C.reset}\n`);
            isThinking = false;
            textToProcess = textToProcess.substring(endIdx + 8);
          } else {
            thinkingText += textToProcess;
            process.stdout.write(textToProcess);
            textToProcess = '';
          }
        } else {
          const startIdx = textToProcess.indexOf('<think>');
          if (startIdx !== -1) {
            const normalPart = textToProcess.substring(0, startIdx);
            fullResponse += normalPart;
            process.stdout.write(normalPart + `${C.dim}${C.italic}💭 `);
            isThinking = true;
            textToProcess = textToProcess.substring(startIdx + 7);
          } else {
            fullResponse += textToProcess;
            process.stdout.write(textToProcess);
            textToProcess = '';
          }
        }
      }

      // Handle media elements incrementally
      if (chunk.images && chunk.images.length > printedImagesCount) {
        for (let i = printedImagesCount; i < chunk.images.length; i++) {
          console.log(`\n${C.cyan}🖼  Image: ${C.under}${chunk.images[i]}${C.reset}`);
        }
        printedImagesCount = chunk.images.length;
      }
      if (chunk.video && !printedVideo) {
        console.log(`\n${C.magenta}🎬 Video: ${C.under}${chunk.video}${C.reset}`);
        printedVideo = true;
      }
      if (chunk.audio && !printedAudio) {
        console.log(`\n${C.blue}🔊 Audio: ${C.under}${chunk.audio}${C.reset}`);
        printedAudio = true;
      }
      if (chunk.sources && chunk.sources.length > printedSourcesCount) {
        for (let i = printedSourcesCount; i < chunk.sources.length; i++) {
          const s = chunk.sources[i];
          console.log(`\n${C.dim}Source: ${s.title} — ${s.url}${C.reset}`);
        }
        printedSourcesCount = chunk.sources.length;
      }
    }
  } catch (e: any) {
    if (e.name !== 'AbortError') {
      console.error(`\n${C.red}[ERROR] ${e.message}${C.reset}`);
    }
  }

  process.stdout.write('\n\n');

  // Calculate and print token/cost stats
  try {
    const { estimateTokens, calculateEstimatedCost } = await import('../utils/tokenManager');
    const { getEffectiveSystemInstruction } = await import('../utils/promptUtils');
    
    const systemPrompt = getEffectiveSystemInstruction(settings, apiMessages);
    const inputTokens = estimateTokens(systemPrompt) + estimateTokens(filteredInput) + estimateTokens(JSON.stringify(apiMessages.slice(0, -1)));
    const outputTokens = estimateTokens(fullResponse) + estimateTokens(thinkingText);
    const totalTokens = inputTokens + outputTokens;
    const cost = calculateEstimatedCost(settings.model, inputTokens, outputTokens);
    
    const costStr = cost > 0 ? ` │ Cost: $${cost.toFixed(5)}` : '';
    console.log(`${C.dim}Tokens: ${totalTokens} (In: ${inputTokens} | Out: ${outputTokens})${costStr}${C.reset}\n`);
  } catch {}

  abortController = null;

  // Run output filters
  let filteredResponse = await pluginRegistry.runFilters(fullResponse, 'POST');

  // Save assistant response
  if (filteredResponse) {
    const assistantMsg: Message = {
      role: 'assistant',
      content: filteredResponse,
      thinking: thinkingText || undefined,
      timestamp: Date.now(),
    };
    session.messages.push(assistantMsg);
    saveSession(session);
  }
}

// ─── Interactive Form Prompter ────────────────────────────────────────────────
function promptQuestion(rl: readline.Interface, question: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(`${C.cyan}${question}${C.reset} `, (answer) => {
      resolve(answer.trim());
    });
  });
}

// ─── Slash Command Handler ───────────────────────────────────────────────────
async function handleCommand(input: string, rl: readline.Interface): Promise<boolean> {
  const parts = input.trim().split(/\s+/);
  const cmd = parts[0].toLowerCase();
  const rest = parts.slice(1).join(' ');

  switch (cmd) {
    case '/help':
    case '/h':
    case '/?':
      console.log(HELP_TEXT);
      return true;

    case '/setup':
      await runSetupWizard(rl, settings);
      return true;

    case '/parallel': {
      if (!rest) {
        console.log(`${C.dim}Usage: /parallel <prompt>${C.reset}`);
        return true;
      }
      try {
        const stream = await runParallelConsensus(rest, settings, session.messages);
        process.stdout.write(`\n${C.hacker}WormGPT Consensus ${C.dim}►${C.reset} `);
        let fullResponse = '';
        for await (const chunk of stream) {
          fullResponse += chunk.text;
          process.stdout.write(chunk.text);
        }
        process.stdout.write('\n\n');
        
        if (fullResponse) {
          session.messages.push({
            role: 'assistant',
            content: fullResponse,
            timestamp: Date.now()
          });
          saveSession(session);
        }
      } catch (e: any) {
        console.error(`\n${C.red}[Consensus Error] ${e.message}${C.reset}\n`);
      }
      return true;
    }

    case '/doctor':
      await runDiagnostics(settings);
      return true;

    case '/exit':
    case '/quit':
    case '/q':
      console.log(`${C.red}👋 Exiting WormXGPT...${C.reset}`);
      cleanExit(0);

    case '/model':
      if (rest) {
        settings.model = rest;
        saveSettings(settings);
        console.log(`${C.green}✔ Model set to: ${C.bcyan}${rest}${C.reset}`);
        console.log(statusLine(settings.aiProvider, settings.model, (settings.mcpServerUrls || []).length));
      } else {
        const providerModels = KNOWN_MODELS[settings.aiProvider] || [];
        const pool = [...new Set([...providerModels, ...ALL_MODELS])];
        const selected = await interactiveSelect('Select a model:', pool, rl);
        if (selected) {
          settings.model = selected;
          saveSettings(settings);
          console.log(`${C.green}✔ Model set to: ${C.bcyan}${selected}${C.reset}`);
          console.log(statusLine(settings.aiProvider, settings.model, (settings.mcpServerUrls || []).length));
        } else {
          console.log(`${C.dim}Model selection cancelled.${C.reset}`);
        }
      }
      return true;

    case '/models':
      console.log(renderModelCatalogue(settings.aiProvider, settings.model));
      return true;

    case '/provider': {
      if (parts[1] === 'add') {
        const name = await promptQuestion(rl, 'Enter provider name (e.g. custom-ollama):');
        if (!name) return true;
        const baseUrl = await promptQuestion(rl, 'Enter endpoint baseUrl (e.g. http://localhost:11434/v1):');
        if (!baseUrl) return true;
        const defaultModel = await promptQuestion(rl, 'Enter default model ID (e.g. llama3):');
        if (!defaultModel) return true;
        const apiKey = await promptQuestion(rl, 'Enter API key (optional, press Enter to skip):');

        addCustomProvider({ name, baseUrl, defaultModel, apiKey }, settings);
        console.log(`\n${C.green}✔ Registered custom provider: ${C.bwhite}${name}${C.reset}`);
        return true;
      }
      if (parts[1] === 'list') {
        const list = loadCustomProviders();
        console.log(`\n${C.bold}${C.cyan}Custom AI Providers (${list.length})${C.reset}\n`);
        list.forEach(p => console.log(`  ${C.green}●${C.reset} ${C.white}${p.name}${C.reset} — ${C.dim}${p.baseUrl} (${p.defaultModel})${C.reset}`));
        console.log('');
        return true;
      }
      if (parts[1] === 'remove' && parts[2]) {
        const name = parts[2];
        if (removeCustomProvider(name)) {
          console.log(`${C.green}✔ Removed custom provider: ${name}${C.reset}`);
        } else {
          console.log(`${C.red}✘ Provider ${name} not found.${C.reset}`);
        }
        return true;
      }

      if (rest) {
        settings.aiProvider = rest as any;
        saveSettings(settings);
        console.log(`${C.green}✔ Provider set to: ${C.bcyan}${rest}${C.reset}`);
        console.log(statusLine(settings.aiProvider, settings.model, (settings.mcpServerUrls || []).length));
        // Warn if new provider has no key
        const keyField = providerRouter.getApiKeyField(rest as any);
        const hasKey = keyField && (settings as any)[keyField];
        if (!hasKey && providerRouter.requiresApiKey(rest as any)) {
          console.log(`${C.yellow}⚠  No API key set for ${rest}. Run: /key ${rest} <your-api-key>${C.reset}`);
        }
      } else {
        const providers = providerRouter.getRegisteredProviders();
        const selected = await interactiveSelect('Select a provider:', providers, rl);
        if (selected) {
          settings.aiProvider = selected as any;
          saveSettings(settings);
          console.log(`${C.green}✔ Provider set to: ${C.bcyan}${selected}${C.reset}`);
          console.log(statusLine(settings.aiProvider, settings.model, (settings.mcpServerUrls || []).length));
          const keyField = providerRouter.getApiKeyField(selected as any);
          const hasKey = keyField && (settings as any)[keyField];
          if (!hasKey && providerRouter.requiresApiKey(selected as any)) {
            console.log(`${C.yellow}⚠  No API key set for ${selected}. Run: /key ${selected} <your-api-key>${C.reset}`);
          }
        } else {
          console.log(`${C.dim}Provider selection cancelled.${C.reset}`);
        }
      }
      return true;
    }

    case '/providers':
      console.log(renderProviderStatus(settings));
      return true;

    case '/key':
      if (parts.length >= 3) {
        const provider = parts[1];
        const key = parts.slice(2).join(' ');
        if (setApiKey(provider, key, settings)) {
          console.log(`${C.green}✔ API key set for ${C.bcyan}${provider}${C.reset}`);
        } else {
          console.log(`${C.red}✘ Unknown provider: ${provider}${C.reset}`);
        }
      } else {
        console.log(`${C.dim}Usage: /key <provider> <api-key>${C.reset}`);
      }
      return true;

    case '/system':
      if (rest) {
        settings.systemInstruction = rest;
        settings.customPromptPrefix = rest;
        saveSettings(settings);
        console.log(`${C.green}✔ System instruction updated.${C.reset}`);
      } else {
        console.log(`${C.cyan}Current system instruction:${C.reset}`);
        console.log(`${C.dim}${(settings.systemInstruction || '').substring(0, 200)}...${C.reset}`);
      }
      return true;

    case '/tools': {
      if (parts[1] === 'create') {
        const name = await promptQuestion(rl, 'Enter tool name (e.g. MyCustomCalculator):');
        if (!name) return true;
        const description = await promptQuestion(rl, 'Enter tool description:');
        if (!description) return true;
        const propName = await promptQuestion(rl, 'Enter single input parameter name (e.g. query):');
        if (!propName) return true;
        const code = await promptQuestion(rl, 'Enter JS function body (e.g. return "Result: " + args.query;):');
        if (!code) return true;

        saveCustomTool({
          name,
          description,
          parameters: {
            type: 'object',
            properties: {
              [propName]: { type: 'string', description: 'Tool parameter' }
            },
            required: [propName]
          },
          code
        });

        // Automatically enable custom tool
        if (!settings.enabledTools) settings.enabledTools = [];
        if (!settings.enabledTools.includes(name)) settings.enabledTools.push(name);
        saveSettings(settings);

        console.log(`\n${C.green}✔ Dynamic tool ${C.bwhite}${name}${C.reset} created and enabled!${C.reset}`);
        return true;
      }

      if (parts[1] === 'delete' && parts[2]) {
        const name = parts[2];
        if (deleteCustomTool(name)) {
          console.log(`${C.green}✔ Dynamic tool ${name} deleted.${C.reset}`);
        } else {
          console.log(`${C.red}✘ Tool ${name} not found.${C.reset}`);
        }
        return true;
      }

      if (parts[1] === 'enable' && parts[2]) {
        const name = parts.slice(2).join(' ');
        if (!settings.enabledTools) settings.enabledTools = [];
        if (!settings.enabledTools.includes(name)) {
          settings.enabledTools.push(name);
          saveSettings(settings);
          console.log(`${C.green}✔ Tool enabled: ${name}${C.reset}`);
        } else {
          console.log(`${C.yellow}Tool already enabled: ${name}${C.reset}`);
        }
        return true;
      }
      if (parts[1] === 'disable' && parts[2]) {
        const name = parts.slice(2).join(' ');
        if (settings.enabledTools) {
          settings.enabledTools = settings.enabledTools.filter(t => t !== name);
          saveSettings(settings);
          console.log(`${C.green}✔ Tool disabled: ${name}${C.reset}`);
        }
        return true;
      }

      // Check for interactive tools toggler
      await runInteractiveToolToggler(rl, settings);
      return true;
    }

    case '/skills': {
      if (parts[1] === 'add') {
        const name = await promptQuestion(rl, 'Enter skill name (e.g. RustExpert):');
        if (!name) return true;
        const description = await promptQuestion(rl, 'Enter skill description:');
        if (!description) return true;
        const prompt = await promptQuestion(rl, 'Enter system instruction to prepend (e.g. Always write code in Rust):');
        if (!prompt) return true;

        saveSkill({ name, description, prompt });
        console.log(`\n${C.green}✔ Saved skill: ${C.bwhite}${name}${C.reset}`);
        return true;
      }
      if (parts[1] === 'list') {
        const list = loadSkills();
        console.log(`\n${C.bold}${C.cyan}Custom Skills (${list.length})${C.reset}\n`);
        list.forEach(s => console.log(`  ${C.green}●${C.reset} ${C.white}${s.name}${C.reset} — ${C.dim}${s.description}${C.reset}`));
        console.log('');
        return true;
      }
      if (parts[1] === 'delete' && parts[2]) {
        const name = parts[2];
        if (deleteSkill(name)) {
          console.log(`${C.green}✔ Deleted skill: ${name}${C.reset}`);
        } else {
          console.log(`${C.red}✘ Skill ${name} not found.${C.reset}`);
        }
        return true;
      }
      return true;
    }

    case '/plugin': {
      if (parts[1] === 'create') {
        const id = await promptQuestion(rl, 'Enter plugin ID (e.g. filter-swears):');
        if (!id) return true;
        console.log(`${C.dim}Enter JS plugin module code (exports a plugin block):${C.reset}`);
        const code = await promptQuestion(rl, 'Module code (JS snippet):');
        if (!code) return true;

        saveCustomPlugin(id, code);
        await registerCustomPlugins();
        console.log(`\n${C.green}✔ Plugin script ${C.bwhite}${id}${C.reset} created and loaded!${C.reset}`);
        return true;
      }
      if (parts[1] === 'list') {
        const plugins = pluginRegistry.getPluginsByType('FILTER');
        const actions = pluginRegistry.getPluginsByType('ACTION');
        console.log(`\n${C.bold}${C.cyan}Active Plugins:${C.reset}`);
        console.log(`  Filters: ${plugins.map(p => p.name).join(', ') || 'None'}`);
        console.log(`  Actions: ${actions.map(p => p.name).join(', ') || 'None'}`);
        console.log('');
        return true;
      }
      if (parts[1] === 'delete' && parts[2]) {
        const id = parts[2];
        if (deleteCustomPlugin(id)) {
          console.log(`${C.green}✔ Custom plugin script ${id} deleted.${C.reset}`);
        } else {
          console.log(`${C.red}✘ Plugin script ${id} not found.${C.reset}`);
        }
        return true;
      }
      return true;
    }

    case '/hibernate':
      console.log(`\n${C.yellow}💤 Manual Hibernate triggered...${C.reset}`);
      await hibernationManager.hibernate(rl);
      return true;

    case '/hitl': {
      const isOn = (global as any).hitlEnabled !== false;
      (global as any).hitlEnabled = !isOn;
      const state = (global as any).hitlEnabled ? `${C.green}ON${C.reset}` : `${C.red}OFF${C.reset}`;
      console.log(`${C.magenta}🤝 Human-in-the-Loop:${C.reset} ${state}`);
      console.log(`${C.dim}When ON, the AI can pause and ask you questions mid-task using the AskHuman tool.${C.reset}`);
      return true;
    }

    case '/mcp': {
      if (parts[1] === 'add' && parts[2]) {
        const url = parts[2];
        if (!settings.mcpServerUrls) settings.mcpServerUrls = [];
        if (!settings.mcpServerUrls.includes(url)) {
          settings.mcpServerUrls.push(url);
          settings.mcpEnabled = true;
          saveSettings(settings);
          console.log(`${C.dim}[MCP] Connecting to ${url}...${C.reset}`);
          const spin = new Spinner();
          spin.start(`Connecting to MCP server`);
          const ok = await mcpService.connect(url);
          spin.stop();
          if (ok) {
            const tools = await mcpService.getTools().catch(() => []);
            console.log(`${C.green}✔ MCP connected: ${url}${C.reset}`);
            console.log(`${C.dim}  ${tools.length} tool(s) available: ${tools.slice(0, 5).map((t: any) => t.name).join(', ')}${tools.length > 5 ? '...' : ''}${C.reset}`);
          } else {
            console.log(`${C.red}✘ Failed to connect to ${url}. Check the URL or server status.${C.reset}`);
          }
        } else {
          console.log(`${C.yellow}⚠  Already added: ${url}${C.reset}`);
        }
        return true;
      }
      if (parts[1] === 'remove' && parts[2]) {
        const url = parts[2];
        if (settings.mcpServerUrls) {
          settings.mcpServerUrls = settings.mcpServerUrls.filter(u => u !== url);
          saveSettings(settings);
          await mcpService.disconnect(url);
          console.log(`${C.green}✔ MCP server removed & disconnected: ${url}${C.reset}`);
        }
        return true;
      }

      // Show live MCP status
      const configuredUrls = settings.mcpServerUrls || [];
      const connectedUrls = mcpService.connectedUrls;
      console.log(`\n${C.bold}${C.cyan}🔌 MCP Server Status${C.reset}`);
      console.log(`  Enabled: ${settings.mcpEnabled ? C.green + 'Yes' : C.red + 'No'}${C.reset}`);
      if (configuredUrls.length === 0) {
        console.log(`  ${C.dim}No MCP servers configured. Use: /mcp add <url>${C.reset}`);
      } else {
        for (const u of configuredUrls) {
          const isConn = connectedUrls.includes(u);
          const status = isConn ? `${C.green}✔ connected` : `${C.red}✘ disconnected`;
          const toolCount = mcpService.getToolCount(u);
          const toolStr = isConn ? `${C.dim} (${toolCount} tools)` : '';
          console.log(`  ${status}${C.reset}${toolStr}${C.reset}  ${C.dim}${u}${C.reset}`);
        }
      }
      if (connectedUrls.length > 0) {
        const allTools = await mcpService.getTools().catch(() => []);
        if (allTools.length > 0) {
          console.log(`\n${C.dim}Available MCP tools (${allTools.length}): ${allTools.slice(0, 8).map((t: any) => t.name).join(', ')}${allTools.length > 8 ? '...' : ''}${C.reset}`);
        }
      }
      console.log(`\n${C.dim}Commands: /mcp add <url>  •  /mcp remove <url>${C.reset}\n`);
      return true;
    }

    case '/sessions': {
      const allSessions = listSessions();
      if (allSessions.length === 0) {
        console.log(`${C.dim}No saved sessions.${C.reset}`);
        return true;
      }
      console.log(`\n${C.bold}${C.cyan}📁 Sessions (${allSessions.length})${C.reset}\n`);
      allSessions.forEach((s, i) => {
        const active = s.id === session.id ? ` ${C.green}◀ active` : '';
        const date = s.lastActive ? new Date(s.lastActive).toLocaleString() : 'never';
        console.log(`  ${C.dim}${i + 1}.${C.reset} ${C.white}${s.title}${C.reset} ${C.dim}(${s.msgCount} msgs, ${date})${active}${C.reset}`);
      });
      console.log(`\n${C.dim}Use /sessions load <number> or /sessions delete <number>${C.reset}\n`);

      if (parts[1] === 'load' && parts[2]) {
        const idx = parseInt(parts[2]) - 1;
        if (idx >= 0 && idx < allSessions.length) {
          session = loadSession(allSessions[idx].id) || session;
          console.log(`${C.green}✔ Loaded session: ${session.title}${C.reset}`);
        }
      }
      if (parts[1] === 'delete' && parts[2]) {
        const idx = parseInt(parts[2]) - 1;
        if (idx >= 0 && idx < allSessions.length) {
          deleteSession(allSessions[idx].id);
          console.log(`${C.green}✔ Deleted session.${C.reset}`);
        }
      }
      return true;
    }

    case '/new':
      session = createSession();
      console.log(`${C.green}✔ New session started.${C.reset}`);
      return true;

    case '/clear':
      session.messages = [];
      saveSession(session);
      console.log(`${C.green}✔ Session cleared.${C.reset}`);
      return true;

    case '/health': {
      const stats = providerRouter.getHealthStats();
      console.log(`\n${C.bold}${C.cyan}Provider Health${C.reset}\n`);
      stats.forEach(s => {
        const icon = s.isHealthy ? `${C.green}●` : `${C.red}●`;
        const free = s.isFree ? `${C.dim}[FREE]` : '';
        console.log(`  ${icon} ${C.white}${s.provider}${C.reset} ${free}${C.reset} — ${C.dim}${s.successCalls}/${s.totalCalls} ok, avg ${s.avgLatencyMs}ms${C.reset}`);
        if (s.lastError) console.log(`    ${C.red}Last error: ${s.lastError}${C.reset}`);
      });
      console.log('');
      return true;
    }

    case '/settings': {
      const lines = [
        `${C.dim}Provider:${C.reset}  ${C.hacker}${settings.aiProvider}${C.reset}`,
        `${C.dim}Model:${C.reset}     ${C.hacker}${settings.model}${C.reset}`,
        `${C.dim}Temp:${C.reset}      ${settings.temperature}`,
        `${C.dim}MaxTokens:${C.reset} ${settings.maxTokens}`,
        `${C.dim}TopP:${C.reset}      ${settings.topP}`,
        `${C.dim}Thinking:${C.reset}  ${settings.thinkingEnabled ? 'ON' : 'OFF'} (budget: ${settings.thinkingBudget})`,
        `${C.dim}Fallback:${C.reset}  ${settings.autoFallback ? 'ON' : 'OFF'}`,
        `${C.dim}MCP:${C.reset}       ${settings.mcpEnabled ? 'ON' : 'OFF'} (${(settings.mcpServerUrls || []).length} servers)`,
        `${C.dim}Tools:${C.reset}     ${(settings.enabledTools || []).length} enabled`,
        `${C.dim}MultiAgent:${C.reset}${settings.multiAgentEnabled ? 'ON' : 'OFF'}`,
        `${C.dim}Data Dir:${C.reset}  ${DATA_DIR}`,
      ];
      console.log('\n' + box('⚙  Settings', lines) + '\n');

      if (parts[1] === 'set' && parts[2] && parts[3]) {
        const key = parts[2];
        const val = parts.slice(3).join(' ');
        const numVal = parseFloat(val);
        if (key === 'temperature') { settings.temperature = numVal; }
        else if (key === 'maxTokens') { settings.maxTokens = numVal; }
        else if (key === 'topP') { settings.topP = numVal; }
        else if (key === 'thinkingBudget') { settings.thinkingBudget = numVal; }
        else if (key === 'thinking') { settings.thinkingEnabled = val === 'on' || val === 'true'; }
        else if (key === 'fallback') { settings.autoFallback = val === 'on' || val === 'true'; }
        else { (settings as any)[key] = val; }
        saveSettings(settings);
        console.log(`${C.green}✔ Set ${key} = ${val}${C.reset}`);
      }
      return true;
    }

    case '/export': {
      const outPath = rest || path.join(process.cwd(), `wormxgpt_${session.id}.json`);
      exportSession(session, outPath);
      console.log(`${C.green}✔ Session exported to: ${outPath}${C.reset}`);
      return true;
    }

    case '/import': {
      if (!rest) {
        console.log(`${C.dim}Usage: /import <path-to-json>${C.reset}`);
        return true;
      }
      const imported = importSession(rest);
      if (imported) {
        session = imported;
        console.log(`${C.green}✔ Session imported: ${session.title}${C.reset}`);
      } else {
        console.log(`${C.red}✘ Failed to import session from: ${rest}${C.reset}`);
      }
      return true;
    }

    case '/compact': {
      const totalChars = session.messages.reduce((s, m) => s + m.content.length, 0);
      const estimatedTokens = Math.ceil(totalChars / 4);
      console.log(`\n${C.cyan}Session Stats:${C.reset}`);
      console.log(`  Messages: ${session.messages.length}`);
      console.log(`  Characters: ${totalChars.toLocaleString()}`);
      console.log(`  Est. Tokens: ~${estimatedTokens.toLocaleString()}`);
      console.log('');
      return true;
    }

    case '/image': {
      if (!rest) {
        console.log(`${C.dim}Usage: /image <prompt>${C.reset}`);
        return true;
      }
      spinner.start('Generating image...');
      try {
        const tool = ATTACHED_TOOLS['GenerateImage'];
        if (tool) {
          const result = await tool.execute({ prompt: rest });
          spinner.stop();
          console.log(`${C.green}✔ Image generated:${C.reset}`);
          console.log(typeof result === 'string' ? result : JSON.stringify(result));
        } else {
          spinner.stop(`${C.red}✘ GenerateImage tool not available.${C.reset}`);
        }
      } catch (e: any) {
        spinner.stop(`${C.red}✘ ${e.message}${C.reset}`);
      }
      return true;
    }

    case '/multi':
      settings.multiAgentEnabled = !settings.multiAgentEnabled;
      saveSettings(settings);
      console.log(`${C.green}✔ Multi-agent: ${settings.multiAgentEnabled ? 'ENABLED' : 'DISABLED'}${C.reset}`);
      return true;

    case '/serve': {
      console.log(`${C.cyan}Starting local MCP server on port 3002...${C.reset}`);
      try {
        const { spawn } = await import('child_process');
        const serverPath = path.join(path.dirname(new URL(import.meta.url).pathname), '..', 'mcp-server.ts');
        // On windows, strip leading / from /C:/...
        const cleanPath = process.platform === 'win32' && serverPath.startsWith('/') ? serverPath.slice(1) : serverPath;
        const child = spawn('npx', ['tsx', cleanPath], { stdio: 'inherit', shell: true });
        child.on('error', (e) => console.error(`${C.red}Server error: ${e.message}${C.reset}`));
        console.log(`${C.green}MCP server started. Press Ctrl+C to stop.${C.reset}`);
      } catch (e: any) {
        console.error(`${C.red}Failed to start server: ${e.message}${C.reset}`);
      }
      return true;
    }

    case '/run': {
      if (!rest) {
        console.log(`${C.dim}Usage: /run <tool-name> [json-args]${C.reset}`);
        return true;
      }
      const toolParts = rest.split(/\s+/);
      const toolName = toolParts[0];
      let args = {};
      if (toolParts.length > 1) {
        try { args = JSON.parse(toolParts.slice(1).join(' ')); } catch {}
      }
      const toolResult = await executeToolByName(toolName, args);
      console.log(toolResult);
      return true;
    }

    default:
      return false;
  }
}

async function executeToolByName(toolName: string, args: any): Promise<string> {
  const tool = ATTACHED_TOOLS[toolName];
  if (!tool) return `Tool "${toolName}" not found.`;
  try {
    const start = Date.now();
    const result = await tool.execute(args);
    const ms = Date.now() - start;
    const resultStr = typeof result === 'string' ? result : JSON.stringify(result, null, 2);
    return `${toolResultDisplay(toolName, resultStr, ms)}`;
  } catch (e: any) {
    return `${C.red}Tool error: ${e.message}${C.reset}`;
  }
}

// ─── REPL ────────────────────────────────────────────────────────────────────
async function startREPL() {
  console.log(BANNER);

  await init();

  // Run a quick workspace scan (Claude-like startup feature)
  try {
    const { scanWorkspace } = await import('../utils/workspaceContext');
    const ws = scanWorkspace();
    const gitStr = ws.gitBranch ? `on git branch '${C.bcyan}${ws.gitBranch}${C.reset}${C.dim}'` : '';
    console.log(`${C.dim}📁 Workspace: ${C.green}${ws.fileCount}${C.reset}${C.dim} files ${gitStr}${C.reset}`);
  } catch (e) {}

  console.log(statusLine(settings.aiProvider, settings.model, (settings.mcpServerUrls || []).length));
  console.log(quickTipsBar());

  const completer = makeCompleter(() => settings);
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    prompt: `${C.bred}❯${C.reset} `,
    terminal: true,
    completer,
  });

  // Bind active readline interface for safety permission prompts
  (global as any).activeReadlineInterface = rl;

  // Verify setup and warn if keys are missing
  let check = await checkSetupRequired(settings);
  
  if (settings.aiProvider === 'gemini' && !settings.geminiApiKey) {
    console.log(`\n${C.yellow}🔑 Gemini API Key is required to run the default model.${C.reset}`);
    const key = await promptQuestion(rl, 'Please paste your Gemini API Key (or press Enter to skip):');
    if (key) {
      setApiKey('gemini', key, settings);
      console.log(`${C.green}✔ Gemini API Key saved successfully!${C.reset}`);
      // Re-run setup check
      check = await checkSetupRequired(settings);
    } else {
      console.log(`${C.yellow}⚠ Skipped Gemini Key setup. Fallbacks will trigger on connection failure.${C.reset}`);
    }
  }

  printSetupStatus(settings, check);

  if (check.missingKeys.length > 0 && settings.aiProvider !== 'gemini') {
    console.log(`${C.yellow}⚠️  Setup Warning: Active provider API Key is missing for: ${C.bold}${check.missingKeys.join(', ')}${C.reset}`);
    const answer = await promptQuestion(rl, 'Would you like to run the interactive /setup wizard now? (y/n):');
    if (answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes') {
      await runSetupWizard(rl, settings);
    }
  }

  // Start idle hibernation monitor
  hibernationManager.startIdleMonitor(rl);

  // Reset idle timer on process standard input keystrokes
  process.stdin.on('data', () => {
    hibernationManager.resetTimer(rl);
  });

  // Handle Ctrl+C during streaming
  process.on('SIGINT', () => {
    if (abortController) {
      abortController.abort();
      abortController = null;
      process.stdout.write(`\n${C.yellow}⚠ Generation aborted.${C.reset}\n`);
      rl.prompt();
    } else {
      console.log(`\n${C.red}👋 Bye!${C.reset}`);
      cleanExit(0);
    }
  });

  rl.prompt();

  rl.on('line', async (line: string) => {
    const input = line.trim();
    if (!input) {
      rl.prompt();
      return;
    }

    // Handle slash commands
    if (input.startsWith('/')) {
      const handled = await handleCommand(input, rl);
      if (!handled) {
        console.log(`${C.red}Unknown command: ${input.split(' ')[0]}${C.reset}`);
        console.log(`${C.dim}Type /help for available commands.${C.reset}`);
      }
      rl.prompt();
      return;
    }

    // Regular chat
    await chat(input, rl);
    rl.prompt();
  });

  rl.on('close', () => {
    console.log(`\n${C.red}👋 Session saved. Goodbye!${C.reset}`);
    cleanExit(0);
  });
}

// ─── CLI Argument Handling ───────────────────────────────────────────────────
async function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  if (!command) {
    // Interactive REPL mode
    await startREPL();
    return;
  }

  const subcommands = ['help', '--help', '-h', 'version', '--version', '-v', 'tools', 'providers', 'health', 'settings', 'sessions', 'serve', 'config', 'reset', 'doctor', 'setup', 'key', 'models', 'providers'];

  if (!subcommands.includes(command)) {
    // TREAT AS DIRECT INLINE PROMPT (like Claude Code)
    await init();
    // Join entire arguments as prompt
    const prompt = args.join(' ');
    try {
      await chat(prompt);
      cleanExit(0);
    } catch (e: any) {
      console.error(`${C.red}Error: ${e.message}${C.reset}`);
      cleanExit(1);
    }
    return;
  }

  // Handle standard subcommands
  switch (command) {
    case 'help':
    case '--help':
    case '-h':
      console.log(BANNER);
      console.log(`${C.bold}Usage:${C.reset} wormxgpt [command] or wormxgpt [prompt]

${C.cyan}Commands:${C.reset}
  ${C.bwhite}chat${C.reset}         Start interactive chat (default)
  ${C.bwhite}setup${C.reset}        Launch interactive API setup wizard
  ${C.bwhite}doctor${C.reset}       Run Diagnostics and network health checks
  ${C.bwhite}tools${C.reset}        List all available tools
  ${C.bwhite}providers${C.reset}    List all registered providers
  ${C.bwhite}health${C.reset}       Show provider health stats
  ${C.bwhite}settings${C.reset}     Show current settings
  ${C.bwhite}sessions${C.reset}     List saved sessions
  ${C.bwhite}serve${C.reset}        Start local MCP server
  ${C.bwhite}config${C.reset}       Show config file path
  ${C.bwhite}reset${C.reset}        Reset all settings to defaults
  ${C.bwhite}version${C.reset}      Show version

${C.cyan}Examples:${C.reset}
  wormxgpt
  wormxgpt setup
  wormxgpt doctor
  wormxgpt "explain rust programming"
  wormxgpt serve
`);
      break;

    case 'version':
    case '--version':
    case '-v':
      console.log('wormxgpt v3.0.0');
      break;

    case 'doctor':
      await init();
      await runDiagnostics(settings);
      break;

    case 'setup': {
      await init();
      const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
      });
      await runSetupWizard(rl, settings);
      rl.close();
      break;
    }

    case 'tools': {
      const origWarn = console.warn;
      console.warn = () => {};
      settings = loadSettings();
      console.warn = origWarn;

      const toolNames = Object.keys(ATTACHED_TOOLS);
      console.log(`\n${C.bold}${C.bred}⚡ All Tools (${toolNames.length})${C.reset}\n`);
      for (const cat of TOOL_CATEGORIES) {
        const catTools = cat.tools.filter(t => ATTACHED_TOOLS[t]);
        if (catTools.length === 0) continue;
        console.log(`${C.bold}${C.cyan}  ${cat.title}${C.reset} ${C.dim}(${catTools.length})${C.reset}`);
        for (const t of catTools) {
          const desc = ATTACHED_TOOLS[t]?.function?.description?.substring(0, 70) || '';
          console.log(`    ${C.green}●${C.reset} ${C.white}${t}${C.reset} ${C.dim}— ${desc}${C.reset}`);
        }
        console.log('');
      }
      break;
    }

    case 'providers': {
      await init();
      console.log(renderProviderStatus(settings));
      break;
    }

    case 'models': {
      settings = loadSettings();
      console.log(renderModelCatalogue(settings.aiProvider, settings.model));
      break;
    }

    case 'health': {
      await init();
      const stats = providerRouter.getHealthStats();
      console.log(`\n${C.bold}${C.cyan}Provider Health${C.reset}\n`);
      stats.forEach(s => {
        const icon = s.isHealthy ? `${C.green}●` : `${C.red}●`;
        console.log(`  ${icon} ${C.white}${s.provider}${C.reset} — ${s.successCalls}/${s.totalCalls} ok, avg ${s.avgLatencyMs}ms`);
      });
      console.log('');
      break;
    }

    case 'settings': {
      settings = loadSettings();
      console.log(`\n${C.bold}${C.cyan}Current Settings${C.reset}\n`);
      console.log(`  Provider:    ${settings.aiProvider}`);
      console.log(`  Model:       ${settings.model}`);
      console.log(`  Temperature: ${settings.temperature}`);
      console.log(`  MaxTokens:   ${settings.maxTokens}`);
      console.log(`  Thinking:    ${settings.thinkingEnabled ? 'ON' : 'OFF'}`);
      console.log(`  Fallback:    ${settings.autoFallback ? 'ON' : 'OFF'}`);
      console.log(`  MCP:         ${settings.mcpEnabled ? 'ON' : 'OFF'}`);
      console.log(`  Tools:       ${(settings.enabledTools || []).length} enabled`);
      console.log(`  Data Dir:    ${DATA_DIR}`);
      console.log('');
      break;
    }

    case 'sessions': {
      settings = loadSettings();
      const allSessions = listSessions();
      console.log(`\n${C.bold}${C.cyan}Saved Sessions (${allSessions.length})${C.reset}\n`);
      allSessions.forEach((s, i) => {
        const date = s.lastActive ? new Date(s.lastActive).toLocaleString() : '-';
        console.log(`  ${i + 1}. ${s.title} (${s.msgCount} msgs, ${date})`);
      });
      console.log('');
      break;
    }

    case 'serve': {
      console.log(`${C.cyan}Starting local MCP server on port 3002...${C.reset}`);
      const { spawn } = await import('child_process');
      const serverPath = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Z]:)/, '$1')), '..', 'mcp-server.ts');
      const child = spawn('npx', ['tsx', serverPath], { stdio: 'inherit', shell: true });
      child.on('error', (e) => { console.error(`Server error: ${e.message}`); process.exit(1); });
      child.on('exit', (code) => process.exit(code ?? 0));
      break;
    }

    case 'config':
      settings = loadSettings();
      console.log(`${C.cyan}Config path:${C.reset} ${path.join(DATA_DIR, 'config.json')}`);
      console.log(`${C.cyan}Sessions:${C.reset}    ${path.join(DATA_DIR, 'sessions')}`);
      console.log(`${C.cyan}Data dir:${C.reset}    ${DATA_DIR}`);
      break;

    case 'reset':
      settings = getDefaults();
      saveSettings(settings);
      console.log(`${C.green}✔ All settings reset to defaults.${C.reset}`);
      break;

    case 'key': {
      if (args[1] && args[2]) {
        settings = loadSettings();
        const provider = args[1];
        const key = args[2];
        if (setApiKey(provider, key, settings)) {
          console.log(`${C.green}✔ API key set for ${provider}.${C.reset}`);
        } else {
          console.error(`${C.red}✘ Unknown provider: ${provider}${C.reset}`);
        }
      } else {
        console.log(`${C.dim}Usage: wormxgpt key <provider> <api-key>${C.reset}`);
      }
      break;
    }
  }
}

main().catch(e => {
  console.error(`${C.red}Fatal error: ${e.message}${C.reset}`);
  if (e.stack) console.error(C.dim + e.stack + C.reset);
  process.exit(1);
});
