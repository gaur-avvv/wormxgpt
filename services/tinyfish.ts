import { AppSettings } from '../types';

export interface TinyFishProxyConfig {
  enabled: boolean;
  country_code?: 'US' | 'GB' | 'CA' | 'DE' | 'FR' | 'JP' | 'AU';
}

export interface TinyFishRunRequest {
  url: string;
  goal: string;
  browser_profile?: 'lite' | 'stealth';
  proxy_config?: TinyFishProxyConfig;
  api_integration?: string;
  use_vault?: boolean;
  credential_item_ids?: string[];
}

export interface TinyFishRunResponse {
  run_id: string | null;
  status: 'COMPLETED' | 'FAILED';
  started_at: string | null;
  finished_at: string | null;
  num_of_steps: number | null;
  result: Record<string, unknown> | null;
  error: TinyFishError | null;
}

export interface TinyFishAsyncResponse {
  run_id: string | null;
  error: TinyFishError | null;
}

export interface TinyFishBatchResponse {
  runs: { run_id: string | null; error: TinyFishError | null }[];
}

export interface TinyFishError {
  code?: string;
  message: string;
  category?: 'SYSTEM_FAILURE' | 'AGENT_FAILURE' | 'BILLING_FAILURE' | 'UNKNOWN';
  details?: unknown;
  retry_after?: number | null;
  help_url?: string;
  help_message?: string;
}

export interface TinyFishSSEEvent {
  type: 'STARTED' | 'STREAMING_URL' | 'PROGRESS' | 'COMPLETE' | 'HEARTBEAT';
  run_id?: string;
  status?: 'COMPLETED' | 'FAILED' | 'CANCELLED';
  streaming_url?: string;
  purpose?: string;
  result?: Record<string, unknown> | null;
  error?: string;
  help_url?: string;
  help_message?: string;
  timestamp: string;
}

export interface TinyFishListRunsParams {
  status?: 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED' | 'CANCELLED';
  goal?: string;
  from_date?: string;
  to_date?: string;
  limit?: number;
  offset?: number;
}

export interface TinyFishListRunsResponse {
  runs: TinyFishRunResponse[];
  total: number;
  limit: number;
  offset: number;
}

export interface TinyFishCancelResponse {
  cancelled: string[];
  already_terminal: string[];
  not_found: string[];
}

const TINYFISH_BASE_URL = 'https://agent.tinyfish.ai';

export class TinyFishService {
  private apiKey: string = '';

  constructor() {
    const saved = typeof window !== 'undefined' ? localStorage.getItem('tinyfishApiKey') : null;
    if (saved) {
      this.apiKey = saved;
    }
  }

  setApiKey(key: string) {
    this.apiKey = key;
    if (typeof window !== 'undefined') {
      localStorage.setItem('tinyfishApiKey', key);
    }
  }

  async *streamChat(settings: AppSettings, messages: any[], signal?: AbortSignal): AsyncGenerator<any> {
    yield { text: "[TinyFish] Agent browser service is not designed for conversational chat completion.", images: [] };
  }

  getApiKey(): string {
    return this.apiKey || (typeof window !== 'undefined' ? localStorage.getItem('tinyfishApiKey') || '' : '');
  }

  private getHeaders(): Record<string, string> {
    const key = this.getApiKey();
    return {
      'X-API-Key': key,
      'Content-Type': 'application/json',
    };
  }

  private buildRequestBody(params: TinyFishRunRequest): Record<string, unknown> {
    const body: Record<string, unknown> = {
      url: params.url,
      goal: params.goal,
      api_integration: params.api_integration || 'xgpt',
    };
    if (params.browser_profile) body.browser_profile = params.browser_profile;
    if (params.proxy_config) body.proxy_config = params.proxy_config;
    if (params.use_vault !== undefined) body.use_vault = params.use_vault;
    if (params.credential_item_ids?.length) body.credential_item_ids = params.credential_item_ids;
    return body;
  }

  /**
   * Verify the API key by making a lightweight list-runs request
   */
  async verifyApiKey(key: string): Promise<boolean> {
    if (!key || !key.startsWith('sk-tinyfish-')) return false;
    try {
      const response = await fetch(`${TINYFISH_BASE_URL}/v1/runs?limit=1`, {
        method: 'GET',
        headers: {
          'X-API-Key': key,
          'Content-Type': 'application/json',
        },
      });
      return response.ok || response.status === 200;
    } catch {
      return false;
    }
  }

  /**
   * Run browser automation synchronously — waits for full completion
   * POST /v1/automation/run
   */
  async runSync(params: TinyFishRunRequest): Promise<TinyFishRunResponse> {
    const key = this.getApiKey();
    if (!key) throw new Error('TinyFish API key not configured. Add it in Settings > API Keys.');

    const response = await fetch(`${TINYFISH_BASE_URL}/v1/automation/run`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(this.buildRequestBody(params)),
    });

    const data = await response.json();
    if (!response.ok) {
      const errMsg = data?.error?.message || data?.message || `TinyFish API error (${response.status})`;
      throw new Error(errMsg);
    }
    return data as TinyFishRunResponse;
  }

  /**
   * Start automation asynchronously — returns run_id immediately
   * POST /v1/automation/run-async
   */
  async runAsync(params: TinyFishRunRequest): Promise<TinyFishAsyncResponse> {
    const key = this.getApiKey();
    if (!key) throw new Error('TinyFish API key not configured. Add it in Settings > API Keys.');

    const response = await fetch(`${TINYFISH_BASE_URL}/v1/automation/run-async`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(this.buildRequestBody(params)),
    });

    const data = await response.json();
    if (!response.ok) {
      const errMsg = data?.error?.message || data?.message || `TinyFish API error (${response.status})`;
      throw new Error(errMsg);
    }
    return data as TinyFishAsyncResponse;
  }

  /**
   * Start multiple automations asynchronously (max 100 per batch)
   * POST /v1/automation/run-batch
   */
  async runBatch(runs: TinyFishRunRequest[]): Promise<TinyFishBatchResponse> {
    const key = this.getApiKey();
    if (!key) throw new Error('TinyFish API key not configured. Add it in Settings > API Keys.');

    const response = await fetch(`${TINYFISH_BASE_URL}/v1/automation/run-batch`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({
        runs: runs.map(r => this.buildRequestBody(r)),
      }),
    });

    const data = await response.json();
    if (!response.ok) {
      const errMsg = data?.error?.message || data?.message || `TinyFish API error (${response.status})`;
      throw new Error(errMsg);
    }
    return data as TinyFishBatchResponse;
  }

  /**
   * Run browser automation with SSE streaming
   * POST /v1/automation/run-sse
   */
  async *runSSE(
    params: TinyFishRunRequest,
    signal?: AbortSignal
  ): AsyncGenerator<TinyFishSSEEvent> {
    const key = this.getApiKey();
    if (!key) throw new Error('TinyFish API key not configured. Add it in Settings > API Keys.');

    const response = await fetch(`${TINYFISH_BASE_URL}/v1/automation/run-sse`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(this.buildRequestBody(params)),
      signal,
    });

    if (!response.ok) {
      let errMsg = `TinyFish SSE error (${response.status})`;
      try {
        const errData = await response.json();
        errMsg = errData?.error?.message || errMsg;
      } catch { /* ignore parse errors */ }
      throw new Error(errMsg);
    }

    const reader = response.body?.getReader();
    if (!reader) throw new Error('No response body for SSE stream');

    const decoder = new TextDecoder();
    let buffer = '';

    try {
      while (true) {
        if (signal?.aborted) return;
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || !trimmed.startsWith('data:')) continue;
          const jsonStr = trimmed.slice(5).trim();
          if (!jsonStr) continue;

          try {
            const event = JSON.parse(jsonStr) as TinyFishSSEEvent;
            yield event;
            if (event.type === 'COMPLETE') return;
          } catch {
            // skip malformed SSE data
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
  }

  /**
   * Get run details by ID
   * GET /v1/runs/:run_id
   */
  async getRun(runId: string): Promise<TinyFishRunResponse> {
    const key = this.getApiKey();
    if (!key) throw new Error('TinyFish API key not configured. Add it in Settings > API Keys.');

    const response = await fetch(`${TINYFISH_BASE_URL}/v1/runs/${encodeURIComponent(runId)}`, {
      method: 'GET',
      headers: this.getHeaders(),
    });

    const data = await response.json();
    if (!response.ok) {
      const errMsg = data?.error?.message || data?.message || `TinyFish API error (${response.status})`;
      throw new Error(errMsg);
    }
    return data as TinyFishRunResponse;
  }

  /**
   * Get multiple runs by IDs (max 100)
   * POST /v1/runs/batch
   */
  async getRunsBatch(runIds: string[]): Promise<{ found: TinyFishRunResponse[]; not_found: string[] }> {
    const key = this.getApiKey();
    if (!key) throw new Error('TinyFish API key not configured. Add it in Settings > API Keys.');

    const response = await fetch(`${TINYFISH_BASE_URL}/v1/runs/batch`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ run_ids: runIds }),
    });

    const data = await response.json();
    if (!response.ok) {
      const errMsg = data?.error?.message || data?.message || `TinyFish API error (${response.status})`;
      throw new Error(errMsg);
    }
    return data;
  }

  /**
   * List and search runs with optional filtering
   * GET /v1/runs
   */
  async listRuns(params?: TinyFishListRunsParams): Promise<TinyFishListRunsResponse> {
    const key = this.getApiKey();
    if (!key) throw new Error('TinyFish API key not configured. Add it in Settings > API Keys.');

    const searchParams = new URLSearchParams();
    if (params?.status) searchParams.set('status', params.status);
    if (params?.goal) searchParams.set('goal', params.goal);
    if (params?.from_date) searchParams.set('from_date', params.from_date);
    if (params?.to_date) searchParams.set('to_date', params.to_date);
    if (params?.limit !== undefined) searchParams.set('limit', String(params.limit));
    if (params?.offset !== undefined) searchParams.set('offset', String(params.offset));

    const qs = searchParams.toString();
    const url = `${TINYFISH_BASE_URL}/v1/runs${qs ? `?${qs}` : ''}`;

    const response = await fetch(url, {
      method: 'GET',
      headers: this.getHeaders(),
    });

    const data = await response.json();
    if (!response.ok) {
      const errMsg = data?.error?.message || data?.message || `TinyFish API error (${response.status})`;
      throw new Error(errMsg);
    }
    return data as TinyFishListRunsResponse;
  }

  /**
   * Cancel a single run by ID
   * POST /v1/runs/:run_id/cancel
   */
  async cancelRun(runId: string): Promise<{ status: string }> {
    const key = this.getApiKey();
    if (!key) throw new Error('TinyFish API key not configured. Add it in Settings > API Keys.');

    const response = await fetch(`${TINYFISH_BASE_URL}/v1/runs/${encodeURIComponent(runId)}/cancel`, {
      method: 'POST',
      headers: this.getHeaders(),
    });

    const data = await response.json();
    if (!response.ok) {
      const errMsg = data?.error?.message || data?.message || `TinyFish API error (${response.status})`;
      throw new Error(errMsg);
    }
    return data;
  }

  /**
   * Cancel multiple runs by IDs (max 100)
   * POST /v1/runs/cancel-batch
   */
  async cancelRunsBatch(runIds: string[]): Promise<TinyFishCancelResponse> {
    const key = this.getApiKey();
    if (!key) throw new Error('TinyFish API key not configured. Add it in Settings > API Keys.');

    const response = await fetch(`${TINYFISH_BASE_URL}/v1/runs/cancel-batch`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ run_ids: runIds }),
    });

    const data = await response.json();
    if (!response.ok) {
      const errMsg = data?.error?.message || data?.message || `TinyFish API error (${response.status})`;
      throw new Error(errMsg);
    }
    return data as TinyFishCancelResponse;
  }
}

export const tinyfishService = new TinyFishService();
