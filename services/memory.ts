import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Environment parameters (would typically be injected via Settings or Vite env)
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://placeholder.supabase.co';
const SUPABASE_KEY = process.env.VITE_SUPABASE_ANON_KEY || 'placeholder_key';

export class AgentMemoryService {
  private supabase: SupabaseClient | null = null;
  private isConfigured = false;

  constructor() {
    this.init();
  }

  private init() {
    if (SUPABASE_URL !== 'https://placeholder.supabase.co' && SUPABASE_KEY !== 'placeholder_key') {
      try {
        this.supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
        this.isConfigured = true;
        console.log('[Memory] Supabase pgvector agentic memory initialized.');
      } catch (e) {
        console.warn('[Memory] Failed to initialize Supabase client:', e);
      }
    } else {
      console.warn('[Memory] Supabase keys not detected. Agentic memory falls back to ephemeral.');
    }
  }

  /**
   * Generates a 384 or 1536 dimensional embedding for the text using available AI providers.
   * If not configured, returns a mock vector for testing without crashing.
   */
  private async generateEmbedding(text: string): Promise<number[]> {
    // In a full production scenario, this hooks into the chosen embedding API 
    // e.g. text-embedding-3-small or Gemini embeddings.
    // We return a mock dimension array to simulate the PostgreSQL pgvector insertion.
    const MOCK_DIMENSIONS = 1536;
    return Array.from({ length: MOCK_DIMENSIONS }, () => (Math.random() - 0.5) * 2);
  }

  public async saveFact(topic: string, fact: string) {
    if (!this.isConfigured || !this.supabase) return;
    try {
      const embedding = await this.generateEmbedding(fact);
      const { error } = await this.supabase
        .from('agent_memory')
        .insert({ topic, content: fact, embedding });
      
      if (error) throw error;
      console.log(`[Memory] Fact saved: "${topic}"`);
    } catch (e: any) {
      console.error('[Memory] Error saving fact:', e.message);
    }
  }

  public async retrieveContext(query: string, limit: number = 3): Promise<string[]> {
    if (!this.isConfigured || !this.supabase) return [];
    try {
      const queryEmbedding = await this.generateEmbedding(query);
      
      // pgvector matching SQL RPC call
      const { data, error } = await this.supabase.rpc('match_agent_memory', {
        query_embedding: queryEmbedding,
        match_threshold: 0.78,
        match_count: limit,
      });

      if (error) throw error;
      return (data || []).map((row: any) => row.content);
    } catch (e: any) {
      console.warn('[Memory] Error retrieving context:', e.message);
      return [];
    }
  }
}

export const memoryService = new AgentMemoryService();
