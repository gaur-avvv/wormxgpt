export interface Message {
  role: 'user' | 'model';
  content: string;
  timestamp: number;
  images?: string[];
}

export interface ChatSession {
  id: string;
  messages: Message[];
  title: string;
}

export interface AppSettings {
  temperature: number;
  model: string;
  systemInstruction: string;
  thinkingBudget: number;
  geminiApiKey?: string;
  groqApiKey?: string;
  pollinationsApiKey?: string;
  aiProvider: 'gemini' | 'groq' | 'pollinations';
}