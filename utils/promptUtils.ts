import { AppSettings, Message } from '../types';
import { DEFAULT_SYSTEM_INSTRUCTION } from '../constants';

/**
 * Constructs the effective system instruction by combining the base instruction
 * and any enabled prompt injections (custom prefixes).
 * 
 * @param settings The current application settings
 * @param messages The session message history
 * @returns The combined system instruction string
 */
export function getEffectiveSystemInstruction(settings: AppSettings, messages: Message[]): string {
  let base = settings.systemInstruction?.trim() ? settings.systemInstruction : DEFAULT_SYSTEM_INSTRUCTION;
  
  const injectionEnabled = settings.promptInjectionEnabled && settings.customPromptPrefix?.trim();
  
  if (!injectionEnabled) return base;

  const mode = (settings as any).promptInjectionMode || 'always';
  let shouldInject = false;

  if (mode === 'always') {
    shouldInject = true;
  } else if (mode === 'once') {
    // Only inject if there are no user messages yet, or if this is the start of a thread
    const userMessageCount = messages.filter(m => m.role === 'user').length;
    if (userMessageCount <= 1) { // 1 because the current message might already be in the list
      shouldInject = true;
    }
  }

  if (shouldInject) {
    const prefix = settings.customPromptPrefix!.trim();
    // Using simple but distinct delimiters for the direct system injection
    return `${base}\n\n[DIRECT_SYSTEM_INJECTION_START]\n${prefix}\n[DIRECT_SYSTEM_INJECTION_END]`;
  }

  return base;
}
