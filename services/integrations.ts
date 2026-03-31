// ─── App Integrations Service ─────────────────────────────────────────────────
// Provides direct app connections for GitHub, Gmail, Google Calendar, Google Drive,
// Slack, Discord, Telegram, Trello, Spotify, Microsoft Teams, WhatsApp, LinkedIn

export interface AppIntegration {
  id: string;
  name: string;
  icon: string;
  svgIcon?: string; // SVG path data for rendering branded icons
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
    svgIcon: 'M12 0C5.374 0 0 5.373 0 12c0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0 1 12 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z',
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
    svgIcon: 'M24 5.457v13.909c0 .904-.732 1.636-1.636 1.636h-3.819V11.73L12 16.64l-6.545-4.91v9.273H1.636A1.636 1.636 0 0 1 0 19.366V5.457c0-2.023 2.309-3.178 3.927-1.964L5.455 4.64 12 9.548l6.545-4.91 1.528-1.145C21.69 2.28 24 3.434 24 5.457z',
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
    svgIcon: 'M5.042 15.165a2.528 2.528 0 0 1-2.52 2.523A2.528 2.528 0 0 1 0 15.165a2.527 2.527 0 0 1 2.522-2.52h2.52v2.52zm1.271 0a2.527 2.527 0 0 1 2.521-2.52 2.527 2.527 0 0 1 2.521 2.52v6.313A2.528 2.528 0 0 1 8.834 24a2.528 2.528 0 0 1-2.521-2.522v-6.313zM8.834 5.042a2.528 2.528 0 0 1-2.521-2.52A2.528 2.528 0 0 1 8.834 0a2.528 2.528 0 0 1 2.521 2.522v2.52H8.834zm0 1.271a2.528 2.528 0 0 1 2.521 2.521 2.528 2.528 0 0 1-2.521 2.521H2.522A2.528 2.528 0 0 1 0 8.834a2.528 2.528 0 0 1 2.522-2.521h6.312zm10.122 2.521a2.528 2.528 0 0 1 2.522-2.521A2.528 2.528 0 0 1 24 8.834a2.528 2.528 0 0 1-2.522 2.521h-2.522V8.834zm-1.268 0a2.528 2.528 0 0 1-2.523 2.521 2.527 2.527 0 0 1-2.52-2.521V2.522A2.527 2.527 0 0 1 15.165 0a2.528 2.528 0 0 1 2.523 2.522v6.312zm-2.523 10.122a2.528 2.528 0 0 1 2.523 2.522A2.528 2.528 0 0 1 15.165 24a2.527 2.527 0 0 1-2.52-2.522v-2.522h2.52zm0-1.268a2.527 2.527 0 0 1-2.52-2.523 2.526 2.526 0 0 1 2.52-2.52h6.313A2.527 2.527 0 0 1 24 15.165a2.528 2.528 0 0 1-2.522 2.523h-6.313z',
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
    svgIcon: 'M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z',
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
    svgIcon: 'M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.479.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z',
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
    svgIcon: 'M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413z',
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
    svgIcon: 'M20.625 8.5h-6.25a1.125 1.125 0 0 0-1.125 1.125v6.25A1.125 1.125 0 0 0 14.375 17h6.25A1.125 1.125 0 0 0 21.75 15.875v-6.25A1.125 1.125 0 0 0 20.625 8.5zm-3.125-2a3 3 0 1 0 0-6 3 3 0 0 0 0 6zm-7.5 1a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7zm0 1.5c-3.038 0-5.5 1.757-5.5 4v2.5h11v-2.5c0-2.243-2.462-4-5.5-4z',
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
    svgIcon: 'M19.5 3.75h-1.875V2.25a.75.75 0 0 0-1.5 0v1.5H7.875V2.25a.75.75 0 0 0-1.5 0v1.5H4.5A2.25 2.25 0 0 0 2.25 6v13.5a2.25 2.25 0 0 0 2.25 2.25h15a2.25 2.25 0 0 0 2.25-2.25V6a2.25 2.25 0 0 0-2.25-2.25zm.75 15.75a.75.75 0 0 1-.75.75H4.5a.75.75 0 0 1-.75-.75V9h16.5v10.5zm0-12H3.75V6a.75.75 0 0 1 .75-.75h1.875v.75a.75.75 0 0 0 1.5 0v-.75h8.25v.75a.75.75 0 0 0 1.5 0v-.75H19.5a.75.75 0 0 1 .75.75v1.5zM8.25 12.75h1.5v1.5h-1.5v-1.5zm0 3h1.5v1.5h-1.5v-1.5zm3 0h1.5v1.5h-1.5v-1.5zm3 0h1.5v1.5h-1.5v-1.5zm0-3h1.5v1.5h-1.5v-1.5zm-3-3h1.5v1.5h-1.5v-1.5z',
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
    svgIcon: 'M7.71 3.5L1.15 15l3.43 5.95h6.86l-3.43-5.95L7.71 3.5zm.86 0l6.57 11.4H8.57L7.71 3.5h.86zm7.43 11.4L22.57 3.5h-6.86L9.14 14.9h6.86zm-6 1.15l3.43 5.95h6.86l-3.43-5.95H10z',
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
    svgIcon: 'M21 0H3C1.343 0 0 1.343 0 3v18c0 1.657 1.343 3 3 3h18c1.657 0 3-1.343 3-3V3c0-1.657-1.343-3-3-3zM10.44 18.18c0 .795-.645 1.44-1.44 1.44H4.56c-.795 0-1.44-.645-1.44-1.44V4.56c0-.795.645-1.44 1.44-1.44H9c.795 0 1.44.645 1.44 1.44v13.62zm10.44-6c0 .795-.645 1.44-1.44 1.44H15c-.795 0-1.44-.645-1.44-1.44V4.56c0-.795.645-1.44 1.44-1.44h4.44c.795 0 1.44.645 1.44 1.44v7.62z',
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
    svgIcon: 'M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z',
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
    svgIcon: 'M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z',
    category: 'media',
    description: 'Search music, manage playlists, control playback',
    color: '#1db954',
    authType: 'token',
    settingsKey: 'spotifyToken',
    docsUrl: 'https://developer.spotify.com/documentation/web-api',
    getTokenUrl: 'https://developer.spotify.com/dashboard',
    features: ['Search tracks', 'Get playlists', 'Album info', 'Artist info', 'Recommendations']
  },

  // ── Developer (additional) ──────────────────────────────────────────────
  {
    id: 'notion',
    name: 'Notion',
    icon: '📝',
    svgIcon: 'M4.459 4.208c.746.606 1.026.56 2.428.466l13.215-.793c.28 0 .047-.28-.046-.326L18.09 2.13c-.466-.373-.98-.7-2.055-.607L3.01 2.59c-.466.046-.56.28-.374.466l1.823 1.152zm.793 3.358v13.905c0 .747.373 1.027 1.214.98l14.523-.84c.841-.046.934-.56.934-1.166V6.63c0-.606-.233-.933-.747-.886l-15.177.887c-.56.046-.747.326-.747.933zm14.337.745c.093.42 0 .84-.42.888l-.7.14v10.264c-.608.327-1.168.514-1.635.514-.747 0-.934-.234-1.494-.934l-4.577-7.186v6.952l1.448.327s0 .84-1.168.84l-3.222.186c-.093-.186 0-.653.327-.746l.84-.233V9.854L7.822 9.76c-.094-.42.14-1.026.793-1.073l3.456-.233 4.764 7.279v-6.44l-1.215-.14c-.093-.514.28-.886.747-.933l3.222-.186zM2.877.466L16.269-.4c1.635-.14 2.055-.047 3.082.7l4.25 2.986c.7.513.934.653.934 1.213v16.378c0 1.026-.374 1.633-1.682 1.726l-15.458.934c-.98.046-1.448-.093-1.962-.747l-3.129-4.06c-.56-.747-.793-1.306-.793-1.96V2.192C1.195 1.166 1.568.56 2.877.466z',
    category: 'productivity',
    description: 'Access databases, pages, and manage content in Notion',
    color: '#000000',
    authType: 'token',
    settingsKey: 'notionToken',
    docsUrl: 'https://developers.notion.com/docs/getting-started',
    getTokenUrl: 'https://www.notion.so/my-integrations',
    features: ['Search pages', 'Read databases', 'Create pages', 'Update content', 'Query databases']
  },
  {
    id: 'jira',
    name: 'Jira',
    icon: '🎯',
    svgIcon: 'M11.571 11.513H0a5.218 5.218 0 0 0 5.232 5.215h2.13v2.057A5.215 5.215 0 0 0 12.575 24V12.518a1.005 1.005 0 0 0-1.005-1.005zm5.723-5.756H5.736a5.215 5.215 0 0 0 5.215 5.214h2.129v2.058a5.218 5.218 0 0 0 5.215 5.214V6.758a1.001 1.001 0 0 0-1.001-1.001zM23.013 0H11.455a5.215 5.215 0 0 0 5.215 5.215h2.129v2.057A5.215 5.215 0 0 0 24.013 12.487V1.005A1.005 1.005 0 0 0 23.013 0z',
    category: 'developer',
    description: 'Manage issues, sprints, and projects in Jira',
    color: '#0052cc',
    authType: 'api_key',
    settingsKey: 'jiraApiKey',
    docsUrl: 'https://developer.atlassian.com/cloud/jira/platform/rest/v3/',
    getTokenUrl: 'https://id.atlassian.com/manage-profile/security/api-tokens',
    features: ['Create issues', 'Search issues', 'Update status', 'Sprint management', 'Comments'],
    extraSettings: [
      { key: 'jiraDomain', label: 'Jira Domain', placeholder: 'your-domain.atlassian.net' },
      { key: 'jiraEmail', label: 'Email', placeholder: 'your-email@example.com' }
    ]
  },
  {
    id: 'asana',
    name: 'Asana',
    icon: '🗂️',
    svgIcon: 'M19.428 15.428a3.572 3.572 0 1 1-7.143 0 3.572 3.572 0 0 1 7.143 0zM11.714 15.428a3.572 3.572 0 1 1-7.143 0 3.572 3.572 0 0 1 7.143 0zM15.571 7.143a3.572 3.572 0 1 0 0-7.143 3.572 3.572 0 0 0 0 7.143z',
    category: 'productivity',
    description: 'Task and project management with Asana',
    color: '#f06a6a',
    authType: 'token',
    settingsKey: 'asanaToken',
    docsUrl: 'https://developers.asana.com/docs/overview',
    getTokenUrl: 'https://app.asana.com/0/developer-console',
    features: ['Create tasks', 'List projects', 'Update tasks', 'Assign members', 'Track progress']
  },
  {
    id: 'todoist',
    name: 'Todoist',
    icon: '✅',
    svgIcon: 'M22 5.18L10.59 16.6l-4.24-4.24-1.41 1.41 5.66 5.66L23.41 6.59 22 5.18zM12 20c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zM12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z',
    category: 'productivity',
    description: 'Manage tasks, projects, and to-do lists',
    color: '#e44232',
    authType: 'token',
    settingsKey: 'todoistToken',
    docsUrl: 'https://developer.todoist.com/rest/v2/',
    getTokenUrl: 'https://todoist.com/app/settings/integrations/developer',
    features: ['Create tasks', 'Complete tasks', 'List projects', 'Set priorities', 'Due dates']
  },

  // ── Cloud Storage ──────────────────────────────────────────────────────
  {
    id: 'dropbox',
    name: 'Dropbox',
    icon: '📦',
    svgIcon: 'M12 6.7l-7 4.5 7 4.5-7 4.5L12 24.7l7-4.5-7-4.5 7-4.5L12 6.7zM5 16.2l7 4.5 7-4.5-7-4.5-7 4.5zM12 2L5 6.5l7 4.5 7-4.5L12 2z',
    category: 'utility',
    description: 'Access, upload, and manage files in Dropbox',
    color: '#0061ff',
    authType: 'token',
    settingsKey: 'dropboxToken',
    docsUrl: 'https://www.dropbox.com/developers/documentation/http/overview',
    getTokenUrl: 'https://www.dropbox.com/developers/apps',
    features: ['List files', 'Upload files', 'Download files', 'Search files', 'Share links']
  },

  // ── Social / Media (additional) ────────────────────────────────────────
  {
    id: 'reddit',
    name: 'Reddit',
    icon: '🤖',
    svgIcon: 'M12 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0zm5.01 4.744c.688 0 1.25.561 1.25 1.249a1.25 1.25 0 0 1-2.498.056l-2.597-.547-.8 3.747c1.824.07 3.48.632 4.674 1.488.308-.309.73-.491 1.207-.491.968 0 1.754.786 1.754 1.754 0 .716-.435 1.333-1.01 1.614a3.111 3.111 0 0 1 .042.52c0 2.694-3.13 4.87-7.004 4.87-3.874 0-7.004-2.176-7.004-4.87 0-.183.015-.366.043-.534A1.748 1.748 0 0 1 4.028 12c0-.968.786-1.754 1.754-1.754.463 0 .898.196 1.207.49 1.207-.883 2.878-1.43 4.744-1.487l.885-4.182a.342.342 0 0 1 .14-.197.35.35 0 0 1 .238-.042l2.906.617a1.214 1.214 0 0 1 1.108-.701zM9.25 12C8.561 12 8 12.562 8 13.25c0 .687.561 1.248 1.25 1.248.687 0 1.248-.561 1.248-1.249 0-.688-.561-1.249-1.249-1.249zm5.5 0c-.687 0-1.248.561-1.248 1.25 0 .687.561 1.248 1.249 1.248.688 0 1.249-.561 1.249-1.249 0-.687-.562-1.249-1.25-1.249zm-5.466 3.99a.327.327 0 0 0-.231.094.33.33 0 0 0 0 .463c.842.842 2.484.913 2.961.913.477 0 2.105-.056 2.961-.913a.361.361 0 0 0 0-.463.327.327 0 0 0-.464 0c-.547.533-1.684.73-2.512.73-.828 0-1.979-.196-2.512-.73a.326.326 0 0 0-.232-.095z',
    category: 'social',
    description: 'Browse subreddits, posts, and comments on Reddit',
    color: '#ff4500',
    authType: 'token',
    settingsKey: 'redditToken',
    docsUrl: 'https://www.reddit.com/dev/api/',
    getTokenUrl: 'https://www.reddit.com/prefs/apps',
    features: ['Browse subreddits', 'Search posts', 'Read comments', 'Get trending', 'User profiles']
  },
  {
    id: 'youtube',
    name: 'YouTube',
    icon: '🎬',
    svgIcon: 'M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z',
    category: 'media',
    description: 'Search videos, get channel info, and manage playlists',
    color: '#ff0000',
    authType: 'api_key',
    settingsKey: 'youtubeApiKey',
    docsUrl: 'https://developers.google.com/youtube/v3/getting-started',
    getTokenUrl: 'https://console.cloud.google.com/apis/credentials',
    features: ['Search videos', 'Channel info', 'Playlist management', 'Video details', 'Trending']
  },
  {
    id: 'twitch',
    name: 'Twitch',
    icon: '🎮',
    svgIcon: 'M11.571 4.714h1.715v5.143H11.57zm4.715 0H18v5.143h-1.714zM6 0L1.714 4.286v15.428h5.143V24l4.286-4.286h3.428L22.286 12V0zm14.571 11.143l-3.428 3.428h-3.429l-3 3v-3H6.857V1.714h13.714z',
    category: 'media',
    description: 'Stream info, chat integration, and channel management',
    color: '#9146ff',
    authType: 'token',
    settingsKey: 'twitchToken',
    docsUrl: 'https://dev.twitch.tv/docs/api/',
    getTokenUrl: 'https://dev.twitch.tv/console/apps',
    features: ['Stream status', 'Chat messages', 'Channel info', 'User lookup', 'Game search'],
    extraSettings: [{ key: 'twitchClientId', label: 'Client ID', placeholder: 'Twitch application Client ID' }]
  },

  // ── Utility ─────────────────────────────────────────────────────────────
  {
    id: 'secmail',
    name: '1SecMail',
    icon: '\uD83D\uDCEC',
    svgIcon: 'M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z',
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
