import { AppSettings, Message } from '../types';
import { DEFAULT_SYSTEM_INSTRUCTION } from '../constants';

/**
 * Returns the effective system instruction to inject into the LLM request.
 * The user has FULL CONTROL — whatever they set in Settings is what the AI gets.
 * No backend overrides, no forced persona, no restrictions added.
 *
 * @param settings The current application settings
 * @param messages The session message history (used for 'once' injection mode)
 * @returns The system instruction string (may be empty if user disabled it)
 */
export function getEffectiveSystemInstruction(settings: AppSettings, messages: Message[]): string {
  // If user disabled prompt injection entirely, return empty string
  if (!settings.promptInjectionEnabled) {
    return settings.systemInstruction?.trim() || '';
  }

  const baseInstruction = settings.systemInstruction?.trim() || DEFAULT_SYSTEM_INSTRUCTION;
  let fullInstruction = baseInstruction;

  // Prepend custom prefix if configured
  if (settings.customPromptPrefix?.trim()) {
    const prefix = settings.customPromptPrefix.trim();
    const mode = settings.promptInjectionMode || 'always';

    if (mode === 'once') {
      const userMessageCount = messages.filter(m => m.role === 'user').length;
      if (userMessageCount <= 1) {
        fullInstruction = `${prefix}\n\n${baseInstruction}`;
      }
    } else {
      fullInstruction = `${prefix}\n\n${baseInstruction}`;
    }
  }

  // Dynamically inject workspace context if the user asks about the project / files
  const lastUserMsg = messages[messages.length - 1]?.content || '';
  const promptLower = typeof lastUserMsg === 'string' ? lastUserMsg.toLowerCase() : '';
  const keywords = ['project', 'files', 'workspace', 'directory', 'folder', 'codebase', 'repository', 'structure', 'npm', 'git', 'refactor', 'find'];
  const mentionsWorkspace = keywords.some(k => promptLower.includes(k));

  if (mentionsWorkspace) {
    try {
      const { injectWorkspacePrompt } = require('./workspaceContext');
      fullInstruction = injectWorkspacePrompt(fullInstruction);
    } catch {}
  }

  return fullInstruction;
}

/**
 * Substitute variables in a prompt string.
 * Supported variables: {{date}}, {{model}}, {{provider}}, {{user_var_*}}
 */
export function substitutePromptVariables(prompt: string, settings: AppSettings): string {
  let result = prompt;
  result = result.replace(/\{\{date\}\}/g, new Date().toISOString().split('T')[0]);
  result = result.replace(/\{\{model\}\}/g, settings.model || 'unknown');
  result = result.replace(/\{\{provider\}\}/g, settings.aiProvider || 'unknown');
  
  // User-defined variables
  if (settings.promptVariables) {
    for (const [key, value] of Object.entries(settings.promptVariables)) {
      result = result.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), value);
    }
  }
  
  return result;
}

/**
 * @deprecated Use getEffectiveSystemInstruction instead.
 * Kept for backwards compatibility with any code that imports this.
 */
export function getBackendSystemPrompt(settings: AppSettings): string {
  return settings.systemInstruction?.trim() || DEFAULT_SYSTEM_INSTRUCTION;
}
