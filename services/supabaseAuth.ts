// Supabase OAuth Integration Service for App Integrations
// Uses Supabase Auth to handle OAuth flows for GitHub, Google, Slack, etc.

const SUPABASE_PROJECT_ID = 'wufbbhkpyitrixpkcrmo';
const SUPABASE_URL = `https://${SUPABASE_PROJECT_ID}.supabase.co`;
const SUPABASE_ANON_KEY_STORAGE = 'supabase_anon_key';

export type OAuthProvider = 'github' | 'google' | 'slack' | 'discord' | 'spotify' | 'linkedin_oidc';

export interface SupabaseSession {
  access_token: string;
  refresh_token: string;
  expires_at: number;
  user: {
    id: string;
    email?: string;
    user_metadata?: Record<string, unknown>;
    app_metadata?: Record<string, unknown>;
  };
  provider_token?: string;
  provider_refresh_token?: string;
}

export interface SupabaseAuthState {
  session: SupabaseSession | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

class SupabaseAuthService {
  private session: SupabaseSession | null = null;
  private refreshTimer: ReturnType<typeof setTimeout> | null = null;
  private listeners: Set<(state: SupabaseAuthState) => void> = new Set();

  constructor() {
    this.loadSession();
    this.handleAuthCallback();
  }

  get supabaseUrl(): string {
    return SUPABASE_URL;
  }

  private getAnonKey(): string {
    return localStorage.getItem(SUPABASE_ANON_KEY_STORAGE) || '';
  }

  setAnonKey(key: string): void {
    localStorage.setItem(SUPABASE_ANON_KEY_STORAGE, key);
  }

  private loadSession(): void {
    try {
      const stored = localStorage.getItem('supabase_session');
      if (stored) {
        const parsed = JSON.parse(stored) as SupabaseSession;
        if (parsed.expires_at && parsed.expires_at * 1000 > Date.now()) {
          this.session = parsed;
          this.scheduleRefresh();
        } else if (parsed.refresh_token) {
          // Token expired, try refresh
          this.refreshSession(parsed.refresh_token).catch(console.error);
        }
      }
    } catch (e) {
      console.error('[SupabaseAuth] Failed to load session:', e);
    }
  }

  private saveSession(session: SupabaseSession | null): void {
    if (session) {
      localStorage.setItem('supabase_session', JSON.stringify(session));
    } else {
      localStorage.removeItem('supabase_session');
    }
    this.session = session;
    this.notifyListeners();
  }

  private notifyListeners(): void {
    const state = this.getState();
    this.listeners.forEach(cb => {
      try {
        cb(state);
      } catch (_e) {
        // Ignore listener errors
      }
    });
  }

  onAuthStateChange(callback: (state: SupabaseAuthState) => void): () => void {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  getState(): SupabaseAuthState {
    return {
      session: this.session,
      isAuthenticated: !!this.session && (this.session.expires_at * 1000 > Date.now()),
      isLoading: false,
      error: null,
    };
  }

  getSession(): SupabaseSession | null {
    return this.session;
  }

  getProviderToken(): string | null {
    return this.session?.provider_token || null;
  }

  /**
   * Initiate OAuth sign-in with a provider.
   * Opens Supabase Auth URL in a new window/tab for the OAuth flow.
   */
  async signInWithOAuth(provider: OAuthProvider, scopes?: string): Promise<void> {
    const anonKey = this.getAnonKey();
    if (!anonKey) {
      throw new Error('Supabase anon key not configured. Set it in settings.');
    }

    const redirectTo = window.location.origin + window.location.pathname;
    const params = new URLSearchParams({
      provider,
      redirect_to: redirectTo,
    });
    if (scopes) {
      params.set('scopes', scopes);
    }

    const authUrl = `${SUPABASE_URL}/auth/v1/authorize?${params.toString()}`;

    // Open OAuth flow in the same window
    window.location.href = authUrl;
  }

  /**
   * Handle OAuth callback — extract tokens from URL hash/query params
   */
  private handleAuthCallback(): void {
    const hash = window.location.hash;
    if (!hash || !hash.includes('access_token')) return;

    try {
      const params = new URLSearchParams(hash.substring(1));
      const accessToken = params.get('access_token');
      const refreshToken = params.get('refresh_token');
      const expiresIn = params.get('expires_in');
      const providerToken = params.get('provider_token');
      const providerRefreshToken = params.get('provider_refresh_token');

      if (accessToken) {
        // Fetch user info with the access token
        this.fetchUser(accessToken).then(user => {
          const session: SupabaseSession = {
            access_token: accessToken,
            refresh_token: refreshToken || '',
            expires_at: Math.floor(Date.now() / 1000) + parseInt(expiresIn || '3600'),
            user,
            provider_token: providerToken || undefined,
            provider_refresh_token: providerRefreshToken || undefined,
          };
          this.saveSession(session);
          this.scheduleRefresh();

          // Clean up URL
          window.history.replaceState(null, '', window.location.pathname);

          console.log('[SupabaseAuth] OAuth callback processed successfully');
        }).catch(e => {
          console.error('[SupabaseAuth] Failed to fetch user after OAuth:', e);
        });
      }
    } catch (e) {
      console.error('[SupabaseAuth] Failed to parse OAuth callback:', e);
    }
  }

  private async fetchUser(accessToken: string): Promise<SupabaseSession['user']> {
    const response = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'apikey': this.getAnonKey(),
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch user: ${response.statusText}`);
    }

    return response.json();
  }

  private async refreshSession(refreshToken: string): Promise<void> {
    const anonKey = this.getAnonKey();
    if (!anonKey) return;

    try {
      const response = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=refresh_token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': anonKey,
        },
        body: JSON.stringify({ refresh_token: refreshToken }),
      });

      if (!response.ok) {
        console.warn('[SupabaseAuth] Token refresh failed, signing out');
        this.signOut();
        return;
      }

      const data = await response.json();
      const session: SupabaseSession = {
        access_token: data.access_token,
        refresh_token: data.refresh_token,
        expires_at: Math.floor(Date.now() / 1000) + (data.expires_in || 3600),
        user: data.user || this.session?.user || { id: '' },
        provider_token: data.provider_token || this.session?.provider_token,
        provider_refresh_token: data.provider_refresh_token || this.session?.provider_refresh_token,
      };

      this.saveSession(session);
      this.scheduleRefresh();
    } catch (e) {
      console.error('[SupabaseAuth] Refresh failed:', e);
    }
  }

  private scheduleRefresh(): void {
    if (this.refreshTimer) {
      clearTimeout(this.refreshTimer);
    }
    if (!this.session?.refresh_token || !this.session?.expires_at) return;

    // Refresh 60 seconds before expiry
    const refreshIn = Math.max(0, (this.session.expires_at * 1000 - Date.now()) - 60000);
    this.refreshTimer = setTimeout(() => {
      if (this.session?.refresh_token) {
        this.refreshSession(this.session.refresh_token).catch(console.error);
      }
    }, refreshIn);
  }

  async signOut(): Promise<void> {
    const anonKey = this.getAnonKey();
    if (this.session?.access_token && anonKey) {
      try {
        await fetch(`${SUPABASE_URL}/auth/v1/logout`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.session.access_token}`,
            'apikey': anonKey,
          },
        });
      } catch (e) {
        console.warn('[SupabaseAuth] Logout request failed:', e);
      }
    }

    if (this.refreshTimer) {
      clearTimeout(this.refreshTimer);
      this.refreshTimer = null;
    }

    this.saveSession(null);
  }

  /**
   * Map app integration IDs to Supabase OAuth providers
   */
  getOAuthProvider(integrationId: string): OAuthProvider | null {
    const mapping: Record<string, OAuthProvider> = {
      'github': 'github',
      'google_calendar': 'google',
      'google_drive': 'google',
      'gmail': 'google',
      'slack': 'slack',
      'discord': 'discord',
      'spotify': 'spotify',
      'linkedin': 'linkedin_oidc',
    };
    return mapping[integrationId] || null;
  }

  /**
   * Get OAuth scopes for a given integration
   */
  getOAuthScopes(integrationId: string): string {
    const scopeMapping: Record<string, string> = {
      'github': 'repo,user,notifications',
      'google_calendar': 'https://www.googleapis.com/auth/calendar',
      'google_drive': 'https://www.googleapis.com/auth/drive.readonly',
      'gmail': 'https://www.googleapis.com/auth/gmail.modify',
      'slack': 'chat:write,channels:read,channels:history,users:read',
      'discord': 'identify,guilds',
      'spotify': 'user-read-playback-state,user-modify-playback-state,playlist-read-private',
      'linkedin': 'r_liteprofile,r_emailaddress,w_member_social',
    };
    return scopeMapping[integrationId] || '';
  }

  /**
   * Check if an integration supports OAuth through Supabase
   */
  supportsOAuth(integrationId: string): boolean {
    return !!this.getOAuthProvider(integrationId);
  }

  cleanup(): void {
    if (this.refreshTimer) {
      clearTimeout(this.refreshTimer);
      this.refreshTimer = null;
    }
    this.listeners.clear();
  }
}

export const supabaseAuth = new SupabaseAuthService();
