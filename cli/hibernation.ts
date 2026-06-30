/**
 * cli/hibernation.ts — Idle hibernation & token usage optimization
 */
import readline from 'readline';
import { AppSettings, Message, ChatSession } from '../types';
import { saveSession } from './sessions';
import { providerRouter } from '../services/providerRouter';
import { C } from './ui';

export class HibernationManager {
  private idleTimer: ReturnType<typeof setTimeout> | null = null;
  private lastActivity = Date.now();
  private isHibernating = false;

  // Defaults
  private idleTimeoutMs = 300_000; // 5 minutes default
  private maxTokensLimit = 4000;

  constructor(private getSettings: () => AppSettings, private getSession: () => ChatSession) {}

  public startIdleMonitor(rl: readline.Interface) {
    this.resetTimer(rl);
  }

  public resetTimer(rl: readline.Interface) {
    this.lastActivity = Date.now();
    this.isHibernating = false;

    if (this.idleTimer) clearTimeout(this.idleTimer);

    const config = this.getSettings();
    const threshold = config.historyCompressionThreshold || 5; // number of messages or minutes
    this.idleTimeoutMs = threshold * 60 * 1000; // minutes to ms
    this.maxTokensLimit = config.maxContextTokens || 4000;

    this.idleTimer = setTimeout(async () => {
      await this.hibernate(rl);
    }, this.idleTimeoutMs);
  }

  public stopMonitor() {
    if (this.idleTimer) {
      clearTimeout(this.idleTimer);
      this.idleTimer = null;
    }
  }

  /**
   * Hibernate: compress the session's active message history.
   * Replaces older messages with a single summary message to save token space.
   */
  public async hibernate(rl?: readline.Interface) {
    if (this.isHibernating) return;
    this.isHibernating = true;

    const session = this.getSession();
    const settings = this.getSettings();

    // Only compress if there is substantial history to compress
    if (session.messages.length < 4) {
      return;
    }

    if (rl) {
      process.stdout.write(`\n\n${C.yellow}💤 [Auto-Hibernate] Idle timeout reached. Compressing context history...${C.reset}\n`);
    }

    try {
      // Build messages to summarize
      const summaryPrompt = [
        ...session.messages,
        {
          role: 'user' as const,
          content: 'Generate a highly detailed, concise bulleted summary of all topics discussed, decisions made, facts, code snippets, and keys mentioned in the conversation above. Respond ONLY with this summary, keeping it as brief and dense as possible.',
          timestamp: Date.now()
        }
      ];

      // Call the provider router directly to stream the summary
      let summaryText = '';
      const summarySettings = {
        ...settings,
        // Use a fast model for summary if possible
        maxTokens: 500,
        temperature: 0.2,
      };

      for await (const chunk of providerRouter.streamDirect(summarySettings, summaryPrompt)) {
        summaryText += chunk.text;
      }

      if (summaryText.trim()) {
        const recapMessage: Message = {
          role: 'assistant',
          content: `[CONTEXT RECAP - HIBERNATED]\nHere is the summarized history of our conversation:\n${summaryText.trim()}`,
          timestamp: Date.now()
        };

        // Retain only the system prompts, the summary recap, and the last 2 messages
        const lastMessages = session.messages.slice(-2);
        session.messages = [recapMessage, ...lastMessages];
        saveSession(session);

        if (rl) {
          process.stdout.write(`${C.green}✔ History compressed successfully. Saved ~${Math.ceil(summaryPrompt.length * 150)} tokens.${C.reset}\n`);
          rl.prompt();
        }
      }
    } catch (e: any) {
      if (rl) {
        process.stdout.write(`${C.red}✘ Failed to hibernate: ${e.message}${C.reset}\n`);
        rl.prompt();
      }
    }
  }
}
