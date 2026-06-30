/**
 * cli/sessions.ts — File-based session storage for CLI mode
 * Stores chat sessions as JSON files in ~/.wormgpt/sessions/
 */
import fs from 'fs';
import path from 'path';
import { DATA_DIR } from './shims';
import { Message, ChatSession } from '../types';

const SESSIONS_DIR = path.join(DATA_DIR, 'sessions');
if (!fs.existsSync(SESSIONS_DIR)) fs.mkdirSync(SESSIONS_DIR, { recursive: true });

function sessionFile(id: string) { return path.join(SESSIONS_DIR, `${id}.json`); }

export function createSession(title?: string): ChatSession {
  const id = `chat_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const session: ChatSession = { id, messages: [], title: title || 'New Chat' };
  saveSession(session);
  return session;
}

export function saveSession(session: ChatSession): void {
  try { fs.writeFileSync(sessionFile(session.id), JSON.stringify(session, null, 2), 'utf8'); } catch {}
}

export function loadSession(id: string): ChatSession | null {
  try {
    const raw = fs.readFileSync(sessionFile(id), 'utf8');
    return JSON.parse(raw);
  } catch { return null; }
}

export function listSessions(): { id: string; title: string; msgCount: number; lastActive: number }[] {
  try {
    return fs.readdirSync(SESSIONS_DIR)
      .filter(f => f.endsWith('.json'))
      .map(f => {
        try {
          const s: ChatSession = JSON.parse(fs.readFileSync(path.join(SESSIONS_DIR, f), 'utf8'));
          const last = s.messages.length > 0 ? s.messages[s.messages.length - 1].timestamp : 0;
          return { id: s.id, title: s.title, msgCount: s.messages.length, lastActive: last };
        } catch { return null; }
      })
      .filter(Boolean)
      .sort((a, b) => (b!.lastActive - a!.lastActive)) as any;
  } catch { return []; }
}

export function deleteSession(id: string): boolean {
  try { fs.unlinkSync(sessionFile(id)); return true; } catch { return false; }
}

export function exportSession(session: ChatSession, outPath: string): void {
  fs.writeFileSync(outPath, JSON.stringify(session, null, 2), 'utf8');
}

export function importSession(filePath: string): ChatSession | null {
  try {
    const raw = fs.readFileSync(filePath, 'utf8');
    const session: ChatSession = JSON.parse(raw);
    if (!session.id) session.id = `imported_${Date.now()}`;
    saveSession(session);
    return session;
  } catch { return null; }
}

export function autoTitleSession(session: ChatSession): void {
  if (session.messages.length > 0 && session.title === 'New Chat') {
    const first = session.messages.find(m => m.role === 'user');
    if (first) {
      session.title = first.content.substring(0, 60).replace(/\n/g, ' ').trim();
      if (first.content.length > 60) session.title += '...';
      saveSession(session);
    }
  }
}
