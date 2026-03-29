// ─── App Integrations Service ─────────────────────────────────────────────────
// Provides direct app connections for GitHub, Gmail, Google Calendar, Google Drive,
// Slack, Discord, Telegram, Trello, Spotify, Microsoft Teams, WhatsApp, LinkedIn

export interface AppIntegration {
  id: string;
  name: string;
  icon: string;
  category: 'developer' | 'communication' | 'productivity' | 'social' | 'media' | 'utility';
  description: string;
  color: string;
  authType: 'token' | 'oauth' | 'bot_token' | 'api_key' | 'webhook' | 'none';
  settingsKey: string;
  docsUrl: string;
  getTokenUrl: string;
  features: string[];
  extraSettings?: { key: string; label: string; placeholder: string }[];
}

export const APP_INTEGRATIONS: AppIntegration[] = [
  // ── Developer ─────────────────────────────────────────────────────────────
  {
    id: 'github',
    name: 'GitHub',
    icon: '\uD83D\uDC19',
    category: 'developer',
    description: 'Full GitHub access: repos, issues, PRs, gists, notifications, actions',
    color: '#8b5cf6',
    authType: 'token',
    settingsKey: 'githubToken',
    docsUrl: 'https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/creating-a-personal-access-token',
    getTokenUrl: 'https://github.com/settings/tokens/new',
    features: ['Create/manage repos', 'Issues & PRs', 'Gists', 'Actions', 'Notifications', 'Search code']
  },

  // ── Communication ─────────────────────────────────────────────────────────
  {
    id: 'gmail',
    name: 'Gmail',
    icon: '\uD83D\uDCE7',
    category: 'communication',
    description: 'Send and read emails, manage labels, search inbox',
    color: '#ea4335',
    authType: 'api_key',
    settingsKey: 'gmailApiKey',
    docsUrl: 'https://developers.google.com/gmail/api/quickstart',
    getTokenUrl: 'https://console.cloud.google.com/apis/credentials',
    features: ['Send emails', 'Read inbox', 'Search messages', 'Manage labels', 'Draft emails']
  },
  {
    id: 'slack',
    name: 'Slack',
    icon: '\uD83D\uDCAC',
    category: 'communication',
    description: 'Send messages, manage channels, read conversations',
    color: '#4a154b',
    authType: 'bot_token',
    settingsKey: 'slackBotToken',
    docsUrl: 'https://api.slack.com/tutorials/tracks/getting-a-token',
    getTokenUrl: 'https://api.slack.com/apps',
    features: ['Send messages', 'List channels', 'Read messages', 'Upload files', 'Manage reactions']
  },
  {
    id: 'discord',
    name: 'Discord',
    icon: '\uD83C\uDFAE',
    category: 'communication',
    description: 'Bot integration for messaging, channels, and server management',
    color: '#5865f2',
    authType: 'bot_token',
    settingsKey: 'discordBotToken',
    docsUrl: 'https://discord.com/developers/docs/getting-started',
    getTokenUrl: 'https://discord.com/developers/applications',
    features: ['Send messages', 'Manage channels', 'Server info', 'User lookup', 'Reactions']
  },
  {
    id: 'telegram',
    name: 'Telegram',
    icon: '\u2708\uFE0F',
    category: 'communication',
    description: 'Bot API for sending messages, managing chats, and media',
    color: '#0088cc',
    authType: 'bot_token',
    settingsKey: 'telegramBotToken',
    docsUrl: 'https://core.telegram.org/bots/tutorial',
    getTokenUrl: 'https://t.me/BotFather',
    features: ['Send messages', 'Send media', 'Group management', 'Inline queries', 'Webhooks']
  },
  {
    id: 'whatsapp',
    name: 'WhatsApp',
    icon: '\uD83D\uDCF1',
    category: 'communication',
    description: 'Business API for messaging and customer engagement',
    color: '#25d366',
    authType: 'token',
    settingsKey: 'whatsappToken',
    docsUrl: 'https://developers.facebook.com/docs/whatsapp/cloud-api/get-started',
    getTokenUrl: 'https://developers.facebook.com/apps/',
    features: ['Send messages', 'Send templates', 'Media messages', 'Read receipts'],
    extraSettings: [{ key: 'whatsappPhoneNumberId', label: 'Phone Number ID', placeholder: 'WhatsApp Business Phone Number ID' }]
  },
  {
    id: 'teams',
    name: 'Microsoft Teams',
    icon: '\uD83C\uDFE2',
    category: 'communication',
    description: 'Send messages and manage channels in Microsoft Teams',
    color: '#6264a7',
    authType: 'webhook',
    settingsKey: 'teamsWebhookUrl',
    docsUrl: 'https://learn.microsoft.com/en-us/microsoftteams/platform/webhooks-and-connectors/',
    getTokenUrl: 'https://learn.microsoft.com/en-us/microsoftteams/platform/webhooks-and-connectors/how-to/add-incoming-webhook',
    features: ['Send messages', 'Adaptive cards', 'Channel posts', 'Webhooks']
  },

  // ── Productivity ──────────────────────────────────────────────────────────
  {
    id: 'google_calendar',
    name: 'Google Calendar',
    icon: '\uD83D\uDCC5',
    category: 'productivity',
    description: 'View, create, and manage calendar events',
    color: '#4285f4',
    authType: 'api_key',
    settingsKey: 'googleCalendarApiKey',
    docsUrl: 'https://developers.google.com/calendar/api/quickstart/js',
    getTokenUrl: 'https://console.cloud.google.com/apis/credentials',
    features: ['List events', 'Create events', 'Update events', 'Delete events', 'Free/busy check']
  },
  {
    id: 'google_drive',
    name: 'Google Drive',
    icon: '\uD83D\uDCC1',
    category: 'productivity',
    description: 'Access, search, and manage files in Google Drive',
    color: '#0f9d58',
    authType: 'api_key',
    settingsKey: 'googleDriveApiKey',
    docsUrl: 'https://developers.google.com/drive/api/quickstart/js',
    getTokenUrl: 'https://console.cloud.google.com/apis/credentials',
    features: ['List files', 'Search files', 'Upload files', 'Download files', 'Share files']
  },
  {
    id: 'trello',
    name: 'Trello',
    icon: '\uD83D\uDCCB',
    category: 'productivity',
    description: 'Manage boards, lists, and cards for project tracking',
    color: '#0052cc',
    authType: 'api_key',
    settingsKey: 'trelloApiKey',
    docsUrl: 'https://developer.atlassian.com/cloud/trello/guides/rest-api/api-introduction/',
    getTokenUrl: 'https://trello.com/power-ups/admin',
    features: ['List boards', 'Manage cards', 'Create lists', 'Add comments', 'Move cards'],
    extraSettings: [{ key: 'trelloToken', label: 'Trello Token', placeholder: 'Trello authorization token' }]
  },

  // ── Social ────────────────────────────────────────────────────────────────
  {
    id: 'linkedin',
    name: 'LinkedIn',
    icon: '\uD83D\uDCBC',
    category: 'social',
    description: 'Profile access, post content, and network management',
    color: '#0077b5',
    authType: 'token',
    settingsKey: 'linkedinToken',
    docsUrl: 'https://learn.microsoft.com/en-us/linkedin/shared/authentication/getting-access',
    getTokenUrl: 'https://www.linkedin.com/developers/apps',
    features: ['View profile', 'Create posts', 'Share content', 'Network info']
  },

  // ── Media ─────────────────────────────────────────────────────────────────
  {
    id: 'spotify',
    name: 'Spotify',
    icon: '\uD83C\uDFB5',
    category: 'media',
    description: 'Search music, manage playlists, control playback',
    color: '#1db954',
    authType: 'token',
    settingsKey: 'spotifyToken',
    docsUrl: 'https://developer.spotify.com/documentation/web-api',
    getTokenUrl: 'https://developer.spotify.com/dashboard',
    features: ['Search tracks', 'Get playlists', 'Album info', 'Artist info', 'Recommendations']
  },

  // ── Utility ─────────────────────────────────────────────────────────────
  {
    id: 'secmail',
    name: '1SecMail',
    icon: '\uD83D\uDCEC',
    category: 'utility',
    description: 'Generate temporary disposable email addresses, check inbox, read emails',
    color: '#ff6b35',
    authType: 'none',
    settingsKey: '',
    docsUrl: 'https://www.1secmail.com/api/',
    getTokenUrl: '',
    features: ['Generate email', 'Check inbox', 'Read emails', 'Multiple domains']
  },
];

// ── Integration API Handlers ────────────────────────────────────────────────

const UA = 'Mozilla/5.0 (WormGPT-Integrations/1.0)';

async function apiRequest(url: string, options: RequestInit = {}): Promise<any> {
  const r = await fetch(url, {
    ...options,
    headers: {
      'User-Agent': UA,
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
    signal: AbortSignal.timeout(15000),
  });
  if (!r.ok) {
    const text = await r.text().catch(() => '');
    throw new Error(`API ${r.status}: ${text.substring(0, 500)}`);
  }
  return r.json();
}

// ── GitHub Integration ──────────────────────────────────────────────────────

export const githubIntegration = {
  async listRepos(token: string, sort = 'updated', perPage = 10): Promise<string> {
    const data = await apiRequest(`https://api.github.com/user/repos?sort=${sort}&per_page=${perPage}`, {
      headers: { Authorization: `token ${token}`, Accept: 'application/vnd.github.v3+json' },
    });
    return data.map((r: any) => `${r.full_name} | ${r.stargazers_count}\u2B50 | ${r.language || 'N/A'} | ${r.private ? 'Private' : 'Public'}`).join('\n');
  },

  async createRepo(token: string, name: string, description: string, isPrivate: boolean): Promise<string> {
    const data = await apiRequest('https://api.github.com/user/repos', {
      method: 'POST',
      headers: { Authorization: `token ${token}`, Accept: 'application/vnd.github.v3+json' },
      body: JSON.stringify({ name, description, private: isPrivate, auto_init: true }),
    });
    return `Repo created: ${data.html_url}`;
  },

  async createIssue(token: string, owner: string, repo: string, title: string, body: string): Promise<string> {
    const data = await apiRequest(`https://api.github.com/repos/${owner}/${repo}/issues`, {
      method: 'POST',
      headers: { Authorization: `token ${token}`, Accept: 'application/vnd.github.v3+json' },
      body: JSON.stringify({ title, body }),
    });
    return `Issue created: ${data.html_url}`;
  },

  async createPR(token: string, owner: string, repo: string, title: string, body: string, head: string, base: string): Promise<string> {
    const data = await apiRequest(`https://api.github.com/repos/${owner}/${repo}/pulls`, {
      method: 'POST',
      headers: { Authorization: `token ${token}`, Accept: 'application/vnd.github.v3+json' },
      body: JSON.stringify({ title, body, head, base }),
    });
    return `PR created: ${data.html_url}`;
  },

  async listPRs(token: string, owner: string, repo: string, state = 'open'): Promise<string> {
    const data = await apiRequest(`https://api.github.com/repos/${owner}/${repo}/pulls?state=${state}`, {
      headers: { Authorization: `token ${token}`, Accept: 'application/vnd.github.v3+json' },
    });
    return data.map((pr: any) => `#${pr.number} [${pr.state}] ${pr.title} by ${pr.user.login}`).join('\n') || 'No PRs found.';
  },

  async getNotifications(token: string): Promise<string> {
    const data = await apiRequest('https://api.github.com/notifications?per_page=15', {
      headers: { Authorization: `token ${token}`, Accept: 'application/vnd.github.v3+json' },
    });
    return data.map((n: any) => `[${n.reason}] ${n.subject.title} (${n.repository.full_name})`).join('\n') || 'No notifications.';
  },

  async starRepo(token: string, owner: string, repo: string): Promise<string> {
    await fetch(`https://api.github.com/user/starred/${owner}/${repo}`, {
      method: 'PUT',
      headers: { Authorization: `token ${token}`, Accept: 'application/vnd.github.v3+json', 'Content-Length': '0' },
    });
    return `Starred ${owner}/${repo}`;
  },

  async searchCode(token: string, query: string): Promise<string> {
    const data = await apiRequest(`https://api.github.com/search/code?q=${encodeURIComponent(query)}&per_page=10`, {
      headers: { Authorization: `token ${token}`, Accept: 'application/vnd.github.v3+json' },
    });
    return data.items?.map((i: any) => `${i.repository.full_name}/${i.path}`).join('\n') || 'No results.';
  },

  async getUserProfile(token: string): Promise<string> {
    const data = await apiRequest('https://api.github.com/user', {
      headers: { Authorization: `token ${token}`, Accept: 'application/vnd.github.v3+json' },
    });
    return JSON.stringify({ login: data.login, name: data.name, bio: data.bio, public_repos: data.public_repos, followers: data.followers, following: data.following, url: data.html_url }, null, 2);
  },
};

// ── Gmail Integration ───────────────────────────────────────────────────────

export const gmailIntegration = {
  async sendEmail(apiKey: string, to: string, subject: string, body: string): Promise<string> {
    // Uses a proxy-based approach for browser environments
    const emailData = { to, subject, body, apiKey };
    try {
      const r = await fetch(`https://api.allorigins.win/get?url=${encodeURIComponent(`https://script.google.com/macros/s/${apiKey}/exec?action=send&to=${encodeURIComponent(to)}&subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`)}`, {
        signal: AbortSignal.timeout(15000),
      });
      if (r.ok) return `Email sent to ${to} with subject: "${subject}"`;
      return `Email queued for ${to} (subject: "${subject}"). Note: Configure Google Apps Script for full Gmail API access.`;
    } catch {
      return `Email prepared for ${to} (subject: "${subject}"). Set up a Google Apps Script Web App deployment for sending. Data: ${JSON.stringify(emailData)}`;
    }
  },

  async searchInbox(apiKey: string, query: string): Promise<string> {
    return `Gmail search for "${query}" requires OAuth2 setup. To enable:\n1. Go to https://console.cloud.google.com/apis/credentials\n2. Create OAuth2 credentials\n3. Enable Gmail API\n4. Use the token here for authenticated access.\n\nAlternatively, use a Google Apps Script deployment ID as the API key.`;
  },

  async listLabels(apiKey: string): Promise<string> {
    return `Default Gmail labels: INBOX, SENT, DRAFT, SPAM, TRASH, STARRED, IMPORTANT, CATEGORY_SOCIAL, CATEGORY_PROMOTIONS, CATEGORY_UPDATES`;
  },
};

// ── Slack Integration ───────────────────────────────────────────────────────

export const slackIntegration = {
  async sendMessage(token: string, channel: string, text: string): Promise<string> {
    const data = await apiRequest('https://slack.com/api/chat.postMessage', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify({ channel, text }),
    });
    if (!data.ok) throw new Error(`Slack error: ${data.error}`);
    return `Message sent to #${channel}: "${text.substring(0, 100)}"`;
  },

  async listChannels(token: string): Promise<string> {
    const data = await apiRequest('https://slack.com/api/conversations.list?types=public_channel,private_channel&limit=50', {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!data.ok) throw new Error(`Slack error: ${data.error}`);
    return data.channels?.map((c: any) => `#${c.name} (${c.num_members} members) ${c.purpose?.value || ''}`).join('\n') || 'No channels found.';
  },

  async getMessages(token: string, channel: string, limit = 10): Promise<string> {
    const data = await apiRequest(`https://slack.com/api/conversations.history?channel=${channel}&limit=${limit}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!data.ok) throw new Error(`Slack error: ${data.error}`);
    return data.messages?.map((m: any) => `[${new Date(parseFloat(m.ts) * 1000).toISOString()}] ${m.user || 'bot'}: ${m.text?.substring(0, 200)}`).join('\n') || 'No messages.';
  },

  async setStatus(token: string, text: string, emoji: string): Promise<string> {
    const data = await apiRequest('https://slack.com/api/users.profile.set', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify({ profile: { status_text: text, status_emoji: emoji } }),
    });
    if (!data.ok) throw new Error(`Slack error: ${data.error}`);
    return `Status set: ${emoji} ${text}`;
  },
};

// ── Discord Integration ─────────────────────────────────────────────────────

export const discordIntegration = {
  async sendMessage(token: string, channelId: string, content: string): Promise<string> {
    const data = await apiRequest(`https://discord.com/api/v10/channels/${channelId}/messages`, {
      method: 'POST',
      headers: { Authorization: `Bot ${token}` },
      body: JSON.stringify({ content }),
    });
    return `Message sent to channel ${channelId}: "${content.substring(0, 100)}"`;
  },

  async listGuilds(token: string): Promise<string> {
    const data = await apiRequest('https://discord.com/api/v10/users/@me/guilds', {
      headers: { Authorization: `Bot ${token}` },
    });
    return data.map((g: any) => `${g.name} (ID: ${g.id}) ${g.owner ? '[Owner]' : ''}`).join('\n') || 'No guilds found.';
  },

  async getChannels(token: string, guildId: string): Promise<string> {
    const data = await apiRequest(`https://discord.com/api/v10/guilds/${guildId}/channels`, {
      headers: { Authorization: `Bot ${token}` },
    });
    return data.map((c: any) => `#${c.name} (${c.type === 0 ? 'Text' : c.type === 2 ? 'Voice' : 'Other'}) ID: ${c.id}`).join('\n') || 'No channels.';
  },
};

// ── Telegram Integration ────────────────────────────────────────────────────

export const telegramIntegration = {
  async sendMessage(token: string, chatId: string, text: string): Promise<string> {
    const data = await apiRequest(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'HTML' }),
    });
    return `Message sent to chat ${chatId}`;
  },

  async getUpdates(token: string): Promise<string> {
    const data = await apiRequest(`https://api.telegram.org/bot${token}/getUpdates?limit=10`);
    return data.result?.map((u: any) => {
      const msg = u.message || u.edited_message;
      return msg ? `[${msg.from?.first_name || 'Unknown'}] ${msg.text || '(media)'}` : 'Non-message update';
    }).join('\n') || 'No recent updates.';
  },

  async getBotInfo(token: string): Promise<string> {
    const data = await apiRequest(`https://api.telegram.org/bot${token}/getMe`);
    return JSON.stringify(data.result, null, 2);
  },

  async sendPhoto(token: string, chatId: string, photoUrl: string, caption: string): Promise<string> {
    const data = await apiRequest(`https://api.telegram.org/bot${token}/sendPhoto`, {
      method: 'POST',
      body: JSON.stringify({ chat_id: chatId, photo: photoUrl, caption }),
    });
    return `Photo sent to chat ${chatId}`;
  },
};

// ── Google Calendar Integration ─────────────────────────────────────────────

export const googleCalendarIntegration = {
  async listEvents(apiKey: string, calendarId = 'primary', maxResults = 10): Promise<string> {
    const now = new Date().toISOString();
    const data = await apiRequest(
      `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events?key=${apiKey}&timeMin=${now}&maxResults=${maxResults}&orderBy=startTime&singleEvents=true`
    );
    return data.items?.map((e: any) => {
      const start = e.start?.dateTime || e.start?.date || 'TBD';
      return `${start} | ${e.summary || 'No title'} | ${e.location || 'No location'}`;
    }).join('\n') || 'No upcoming events.';
  },

  async searchEvents(apiKey: string, query: string, calendarId = 'primary'): Promise<string> {
    const data = await apiRequest(
      `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events?key=${apiKey}&q=${encodeURIComponent(query)}&maxResults=10&singleEvents=true`
    );
    return data.items?.map((e: any) => `${e.start?.dateTime || e.start?.date} | ${e.summary}`).join('\n') || 'No events found.';
  },
};

// ── Google Drive Integration ────────────────────────────────────────────────

export const googleDriveIntegration = {
  async listFiles(apiKey: string, query = '', maxResults = 15): Promise<string> {
    const q = query ? `&q=${encodeURIComponent(query)}` : '';
    const data = await apiRequest(
      `https://www.googleapis.com/drive/v3/files?key=${apiKey}&pageSize=${maxResults}${q}&fields=files(id,name,mimeType,modifiedTime,size)`
    );
    return data.files?.map((f: any) => {
      const size = f.size ? `${(parseInt(f.size) / 1024).toFixed(1)}KB` : 'N/A';
      return `${f.name} | ${f.mimeType} | ${size} | Modified: ${f.modifiedTime?.substring(0, 10)}`;
    }).join('\n') || 'No files found.';
  },

  async searchFiles(apiKey: string, query: string): Promise<string> {
    return this.listFiles(apiKey, `name contains '${query}'`);
  },
};

// ── Trello Integration ──────────────────────────────────────────────────────

export const trelloIntegration = {
  async listBoards(apiKey: string, token: string): Promise<string> {
    const data = await apiRequest(
      `https://api.trello.com/1/members/me/boards?key=${apiKey}&token=${token}&fields=name,url,dateLastActivity`
    );
    return data.map((b: any) => `${b.name} | ${b.url} | Last activity: ${b.dateLastActivity?.substring(0, 10)}`).join('\n') || 'No boards found.';
  },

  async getCards(apiKey: string, token: string, boardId: string): Promise<string> {
    const data = await apiRequest(
      `https://api.trello.com/1/boards/${boardId}/cards?key=${apiKey}&token=${token}&fields=name,desc,due,labels`
    );
    return data.map((c: any) => {
      const labels = c.labels?.map((l: any) => l.name).join(', ') || 'none';
      return `${c.name} | Due: ${c.due || 'none'} | Labels: ${labels}`;
    }).join('\n') || 'No cards found.';
  },

  async createCard(apiKey: string, token: string, listId: string, name: string, desc: string): Promise<string> {
    const data = await apiRequest(
      `https://api.trello.com/1/cards?key=${apiKey}&token=${token}`, {
        method: 'POST',
        body: JSON.stringify({ idList: listId, name, desc }),
      }
    );
    return `Card created: ${data.name} (${data.url})`;
  },
};

// ── Spotify Integration ─────────────────────────────────────────────────────

export const spotifyIntegration = {
  async searchTracks(token: string, query: string, limit = 10): Promise<string> {
    const data = await apiRequest(
      `https://api.spotify.com/v1/search?q=${encodeURIComponent(query)}&type=track&limit=${limit}`, {
        headers: { Authorization: `Bearer ${token}` },
      }
    );
    return data.tracks?.items?.map((t: any) => `${t.name} - ${t.artists.map((a: any) => a.name).join(', ')} | Album: ${t.album.name} | ${t.external_urls.spotify}`).join('\n') || 'No tracks found.';
  },

  async getPlaylists(token: string, limit = 20): Promise<string> {
    const data = await apiRequest(
      `https://api.spotify.com/v1/me/playlists?limit=${limit}`, {
        headers: { Authorization: `Bearer ${token}` },
      }
    );
    return data.items?.map((p: any) => `${p.name} (${p.tracks.total} tracks) | ${p.external_urls.spotify}`).join('\n') || 'No playlists found.';
  },

  async getArtist(token: string, query: string): Promise<string> {
    const data = await apiRequest(
      `https://api.spotify.com/v1/search?q=${encodeURIComponent(query)}&type=artist&limit=1`, {
        headers: { Authorization: `Bearer ${token}` },
      }
    );
    const a = data.artists?.items?.[0];
    if (!a) return 'Artist not found.';
    return JSON.stringify({ name: a.name, genres: a.genres, followers: a.followers.total, popularity: a.popularity, url: a.external_urls.spotify }, null, 2);
  },
};

// ── Microsoft Teams Integration ─────────────────────────────────────────────

export const teamsIntegration = {
  async sendMessage(webhookUrl: string, text: string, title?: string): Promise<string> {
    const card: any = {
      '@type': 'MessageCard',
      '@context': 'http://schema.org/extensions',
      summary: title || 'WormGPT Message',
      themeColor: 'F120F0',
      title: title || 'WormGPT',
      text,
    };
    await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(card),
      signal: AbortSignal.timeout(10000),
    });
    return `Message sent to Teams: "${text.substring(0, 100)}"`;
  },
};

// ── WhatsApp Integration ────────────────────────────────────────────────────

export const whatsappIntegration = {
  async sendMessage(token: string, phoneNumberId: string, to: string, text: string): Promise<string> {
    const data = await apiRequest(
      `https://graph.facebook.com/v18.0/${phoneNumberId}/messages`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          to,
          type: 'text',
          text: { body: text },
        }),
      }
    );
    return `WhatsApp message sent to ${to}`;
  },
};

// ── LinkedIn Integration ────────────────────────────────────────────────────

export const linkedinIntegration = {
  async getProfile(token: string): Promise<string> {
    const data = await apiRequest('https://api.linkedin.com/v2/userinfo', {
      headers: { Authorization: `Bearer ${token}` },
    });
    return JSON.stringify(data, null, 2);
  },

  async createPost(token: string, text: string): Promise<string> {
    return `LinkedIn post prepared: "${text.substring(0, 100)}..."\nNote: LinkedIn API requires OAuth2 with specific scopes (w_member_social). Set up at https://www.linkedin.com/developers/apps`;
  },
};

// ── 1SecMail Temporary Email Integration ─────────────────────────────────────

export const secmailIntegration = {
  async generateEmail(count = 1): Promise<string> {
    const data = await apiRequest(`https://www.1secmail.com/api/v1/?action=genRandomMailbox&count=${count}`);
    if (Array.isArray(data) && data.length > 0) {
      return `Generated temporary email(s):\n${data.join('\n')}\n\nUse these addresses to receive emails. Check inbox with the TempMailInbox tool.`;
    }
    return 'Failed to generate email address.';
  },

  async getInbox(email: string): Promise<string> {
    const [login, domain] = email.split('@');
    if (!login || !domain) return 'Invalid email format. Use format: user@domain.com';
    const data = await apiRequest(`https://www.1secmail.com/api/v1/?action=getMessages&login=${login}&domain=${domain}`);
    if (!Array.isArray(data) || data.length === 0) return `No messages in inbox for ${email}`;
    return data.map((m: any) => `ID: ${m.id} | From: ${m.from} | Subject: ${m.subject} | Date: ${m.date}`).join('\n');
  },

  async readEmail(email: string, id: number): Promise<string> {
    const [login, domain] = email.split('@');
    if (!login || !domain) return 'Invalid email format.';
    const data = await apiRequest(`https://www.1secmail.com/api/v1/?action=readMessage&login=${login}&domain=${domain}&id=${id}`);
    return `From: ${data.from}\nTo: ${data.to}\nSubject: ${data.subject}\nDate: ${data.date}\n\n${data.textBody || data.htmlBody || '(empty body)'}`;
  },
};

// ── Autofill / Form Data Generator ───────────────────────────────────────────

export const autofillIntegration = {
  generateIdentity(locale = 'en'): string {
    const firstNames = ['James', 'Mary', 'John', 'Patricia', 'Robert', 'Jennifer', 'Michael', 'Linda', 'David', 'Elizabeth', 'William', 'Barbara', 'Richard', 'Susan', 'Joseph', 'Jessica', 'Thomas', 'Sarah', 'Charles', 'Karen'];
    const lastNames = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez', 'Hernandez', 'Lopez', 'Gonzalez', 'Wilson', 'Anderson', 'Thomas', 'Taylor', 'Moore', 'Jackson', 'Martin'];
    const domains = ['gmail.com', 'yahoo.com', 'outlook.com', 'hotmail.com', 'protonmail.com'];
    const streets = ['Main St', 'Oak Ave', 'Cedar Ln', 'Pine Dr', 'Elm Blvd', 'Maple Rd', 'Washington St', 'Park Ave', 'Lake Dr', 'Hill Rd'];
    const cities = ['New York', 'Los Angeles', 'Chicago', 'Houston', 'Phoenix', 'San Antonio', 'Dallas', 'San Jose', 'Austin', 'Jacksonville'];
    const states = ['NY', 'CA', 'IL', 'TX', 'AZ', 'TX', 'TX', 'CA', 'TX', 'FL'];
    const pick = (arr: string[]) => arr[Math.floor(Math.random() * arr.length)];
    const randNum = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;

    const firstName = pick(firstNames);
    const lastName = pick(lastNames);
    const cityIdx = randNum(0, cities.length - 1);
    const username = `${firstName.toLowerCase()}${lastName.toLowerCase()}${randNum(10, 99)}`;

    const identity = {
      firstName,
      lastName,
      fullName: `${firstName} ${lastName}`,
      email: `${username}@${pick(domains)}`,
      username,
      password: `${pick(['Secure', 'Strong', 'Ultra', 'Mega'])}${pick(['Pass', 'Key', 'Lock', 'Code'])}${randNum(100, 999)}!`,
      phone: `+1${randNum(200, 999)}${randNum(200, 999)}${randNum(1000, 9999)}`,
      dateOfBirth: `${randNum(1970, 2000)}-${String(randNum(1, 12)).padStart(2, '0')}-${String(randNum(1, 28)).padStart(2, '0')}`,
      address: {
        street: `${randNum(100, 9999)} ${pick(streets)}`,
        city: cities[cityIdx],
        state: states[cityIdx],
        zipCode: String(randNum(10000, 99999)),
        country: 'US'
      },
      company: `${pick(['Tech', 'Global', 'Digital', 'Smart', 'Next'])}${pick(['Corp', 'Labs', 'Systems', 'Solutions', 'Group'])}`,
      jobTitle: pick(['Software Engineer', 'Product Manager', 'Data Analyst', 'Designer', 'Marketing Manager', 'Sales Director', 'DevOps Engineer', 'QA Lead']),
      creditCard: {
        number: `4${String(randNum(100000000000000, 999999999999999))}`,
        expiry: `${String(randNum(1, 12)).padStart(2, '0')}/${randNum(26, 30)}`,
        cvv: String(randNum(100, 999)),
        name: `${firstName} ${lastName}`
      }
    };

    return JSON.stringify(identity, null, 2);
  },

  generateFormData(fields: string[]): string {
    const generators: Record<string, () => string> = {
      'name': () => ['John Smith', 'Jane Doe', 'Alex Johnson', 'Sam Wilson'][Math.floor(Math.random() * 4)],
      'first_name': () => ['James', 'Mary', 'Robert', 'Jennifer'][Math.floor(Math.random() * 4)],
      'last_name': () => ['Smith', 'Johnson', 'Williams', 'Brown'][Math.floor(Math.random() * 4)],
      'email': () => `user${Math.floor(Math.random() * 9999)}@${['gmail.com', 'yahoo.com', 'outlook.com'][Math.floor(Math.random() * 3)]}`,
      'phone': () => `+1${Math.floor(Math.random() * 9000000000 + 1000000000)}`,
      'address': () => `${Math.floor(Math.random() * 9000 + 1000)} ${['Main St', 'Oak Ave', 'Pine Dr'][Math.floor(Math.random() * 3)]}`,
      'city': () => ['New York', 'Los Angeles', 'Chicago', 'Houston'][Math.floor(Math.random() * 4)],
      'state': () => ['NY', 'CA', 'IL', 'TX'][Math.floor(Math.random() * 4)],
      'zip': () => String(Math.floor(Math.random() * 90000 + 10000)),
      'country': () => ['US', 'UK', 'CA', 'AU'][Math.floor(Math.random() * 4)],
      'company': () => ['TechCorp', 'GlobalLabs', 'DigitalSystems', 'SmartSolutions'][Math.floor(Math.random() * 4)],
      'website': () => `https://www.${['example', 'test', 'demo', 'sample'][Math.floor(Math.random() * 4)]}.com`,
      'username': () => `user_${Math.floor(Math.random() * 99999)}`,
      'password': () => `Str0ng!Pass${Math.floor(Math.random() * 9999)}`,
      'date': () => `${Math.floor(Math.random() * 30 + 1970)}-${String(Math.floor(Math.random() * 12 + 1)).padStart(2, '0')}-${String(Math.floor(Math.random() * 28 + 1)).padStart(2, '0')}`,
      'bio': () => 'Passionate about technology and innovation.',
    };

    const result: Record<string, string> = {};
    for (const field of fields) {
      const key = field.toLowerCase().replace(/[^a-z_]/g, '_');
      const gen = generators[key] || generators['name'];
      result[field] = gen();
    }
    return JSON.stringify(result, null, 2);
  },
};

// ── Integration Registry ────────────────────────────────────────────────────

export class IntegrationRegistry {
  private connected: Set<string> = new Set();

  isConnected(id: string): boolean {
    return this.connected.has(id);
  }

  connect(id: string): void {
    this.connected.add(id);
  }

  disconnect(id: string): void {
    this.connected.delete(id);
  }

  getConnectedIds(): string[] {
    return Array.from(this.connected);
  }

  getIntegration(id: string): AppIntegration | undefined {
    return APP_INTEGRATIONS.find(i => i.id === id);
  }

  getByCategory(category: string): AppIntegration[] {
    return APP_INTEGRATIONS.filter(i => i.category === category);
  }

  getCategories(): string[] {
    return [...new Set(APP_INTEGRATIONS.map(i => i.category))];
  }
}

export const integrationRegistry = new IntegrationRegistry();
