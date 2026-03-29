import TurndownService from 'turndown';
import { faker } from '@faker-js/faker';
import { githubIntegration, gmailIntegration, slackIntegration, discordIntegration, telegramIntegration, googleCalendarIntegration, googleDriveIntegration, trelloIntegration, spotifyIntegration, teamsIntegration, whatsappIntegration, linkedinIntegration, secmailIntegration, autofillIntegration } from './integrations';

export interface ToolCall {
  id: string;
  type: 'function';
  function: {
    name: string;
    arguments: string;
  };
}

export interface ToolDefinition {
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters: any;
  };
  execute: (args: any) => Promise<any> | any;
}

export interface ToolCategory {
  id: string;
  title: string;
  description: string;
  icon: string;
  color: string;
  tools: string[];
}

export const TOOL_CATEGORIES: ToolCategory[] = [
  {
    id: 'search_recon',
    title: 'Search & Reconnaissance',
    description: 'Web search, news, academic research, and information gathering',
    icon: '',
    color: '#3b82f6',
    tools: ['SearchWeb', 'SearchSearxng', 'ExaSearch', 'BraveSearch', 'GoogleAISearch', 'DuckDuckGoSearch', 'YandexSearch', 'GetNews', 'WikipediaSummary', 'HackerNewsSearch', 'ImageSearch', 'ArxivSearch', 'RedditSearch', 'GitHubAPIFinder', 'GitHubTrending', 'MultiRegionalSearch', 'TwitterSearch', 'ProductHuntFetch', 'WorldNewsAPI']
  },
  {
    id: 'extraction_crawling',
    title: 'Extraction & Crawling',
    description: 'Web scraping, content extraction, and data parsing',
    icon: '',
    color: '#8b5cf6',
    tools: ['WebCrawler', 'SGAISmartScraper', 'SGAIAgenticScraper', 'SGAIMarkdownify', 'DeepResearch', 'FetchWebpage', 'YouTubeTranscript', 'AdvancedPDFScraper', 'EliteWebScraper', 'LinkExtractor', 'EmailFinder', 'AbstractScraper', 'FirecrawlScrape', 'FirecrawlCrawl', 'FirecrawlMap', 'ScreenshotGenerator', 'WebScrapingAI']
  },
  {
    id: 'osint_recon',
    title: 'OSINT & Digital Recon',
    description: 'Domain analysis, IP geolocation, and technical reconnaissance',
    icon: '',
    color: '#ec4899',
    tools: ['DNSLookup', 'WhoisLookup', 'IPGeolocation', 'SubdomainScanner', 'ReverseDNS', 'BGPInfo', 'DorkBuilder', 'PortRecon', 'URLSafetyCheck', 'FlightTracker', 'URLhaus', 'EmailReputation', 'OpenSearchDiscovery']
  },
  {
    id: 'code_compute',
    title: 'Code & Compute',
    description: 'Code execution, compilation, and technical operations',
    icon: '',
    color: '#10b981',
    tools: ['JDoodleCompiler', 'CodeExecutor', 'RegexTester', 'HashGenerator', 'Base64Tool', 'DependencyScanner', 'Base64Encode', 'Base64Decode', 'JWTDecode', 'JSONFormatter', 'CSVToJSON', 'TextDiff', 'TextStats']
  },
  {
    id: 'communication_utility',
    title: 'Communication & Utility',
    description: 'Translation, temporary services, and utility functions',
    icon: '',
    color: '#f59e0b',
    tools: ['TextTranslator', 'PasteCreate', 'StoreMemory', 'ReadMemory', 'GenerateImage', 'TempEmail', 'BrokenLinkChecker', 'ImprovMX', 'GetWeather', 'CurrencyConverter', 'FlightTracker']
  },
  {
    id: 'local_bridge_mcp',
    title: 'Local Bridge (MCP)',
    description: 'Local system access and Model Context Protocol bridge',
    icon: '',
    color: '#ef4444',
    tools: ['store_memory', 'read_memory', 'list_memories', 'delete_memory', 'list_directory', 'read_file', 'write_file', 'delete_file', 'search_files', 'get_system_stats', 'get_network_info', 'get_process_list', 'get_disk_usage', 'get_system_uptime', 'get_env_vars', 'get_file_hashes', 'ping_host', 'get_dns_records', 'get_alerts', 'get_forecast', 'get_github_repo', 'get_github_issues', 'get_github_commits', 'run_shell_command', 'run_puppeteer_script', 'http_request']
  },
  {
    id: 'data_science',
    title: 'Data & Science',
    description: 'Financial data, academic papers, and scientific information',
    icon: '',
    color: '#06b6d4',
    tools: ['GitHubAPIFinder', 'GitHubTrending', 'arxiv_download', 'arxiv_read', 'CryptoPrices', 'StockPrices', 'GetNews', 'CurrencyConverter', 'WorldNewsAPI', 'SeekingAlpha']
  },
  {
    id: 'identity_profiles',
    title: 'Identity & Profiles',
    description: 'Identity generation and profile management',
    icon: '',
    color: '#84cc16',
    tools: ['FakeIdentityGenerator']
  },
  {
    id: 'utility_tools',
    title: 'Utility & Generators',
    description: 'QR codes, passwords, UUIDs, formatters, and converters',
    icon: '',
    color: '#f97316',
    tools: ['QRCodeGenerator', 'URLShortener', 'JSONFormatter', 'UUIDGenerator', 'PasswordGenerator', 'TimezoneConverter', 'ColorPaletteGenerator', 'MarkdownToHTML', 'TextToSpeechURL', 'ExchangeRates']
  },
  {
    id: 'osint_advanced',
    title: 'OSINT Advanced',
    description: 'Certificate transparency, breach checks, Shodan, Wayback Machine',
    icon: '',
    color: '#dc2626',
    tools: ['HaveIBeenPwned', 'ShodanHostLookup', 'CertificateTransparency', 'WaybackMachineSnapshot', 'DomainAvailability']
  },
  {
    id: 'dev_tools',
    title: 'Dev & Package Info',
    description: 'GitHub profiles, npm packages, crypto prices, country data',
    icon: '',
    color: '#7c3aed',
    tools: ['GitHubUserProfile', 'NPMPackageInfo', 'CryptoPriceMulti', 'CountryInfo']
  },
  {
    id: 'live_browser',
    title: 'Live Browser Control',
    description: 'Real-time website interaction: browse, scroll, click, fill forms, screenshot, extract data, run JS on any page. Any model can use these.',
    icon: '',
    color: '#14b8a6',
    tools: ['BrowseWebsite', 'BrowserClick', 'BrowserFill', 'BrowserScroll', 'BrowserScreenshot', 'BrowserExtractData', 'BrowserExecuteJS']
  },
  {
    id: 'browser_automation',
    title: 'Browser Automation & Testing',
    description: 'Generate Playwright/Puppeteer scripts for testing your own apps — form filling, navigation, assertions',
    icon: '',
    color: '#0ea5e9',
    tools: ['GeneratePlaywrightScript', 'GeneratePuppeteerScript', 'GenerateFormFillScript', 'GenerateLoginTestScript', 'GenerateSignupTestScript', 'GenerateE2ETestScript', 'GenerateAccessibilityAudit', 'GeneratePerformanceAudit', 'BrowserAutomationHelper', 'GenerateSeleniumScript']
  },
  {
    id: 'agentic_search',
    title: 'Agentic Web Search',
    description: 'Autonomous multi-step research: search → fetch full pages → verify facts → follow links → synthesize. Model decides when to dig deeper.',
    icon: '',
    color: '#6366f1',
    tools: ['search_web', 'fetch_url', 'AgenticDeepResearch', 'FactVerifier', 'MultiSourceSynthesize', 'SearchAndFetch', 'NewsAggregator', 'ResearchQueryPlanner']
  },
  {
    id: 'jobs_career',
    title: 'Jobs & Career',
    description: 'Job search, salary data, company research, LinkedIn, resume tools',
    icon: '',
    color: '#0891b2',
    tools: ['JobSearch', 'LinkedInJobSearch', 'IndeedJobSearch', 'RemoteJobSearch', 'SalaryLookup', 'CompanyResearch', 'GlassdoorReviews', 'TechJobsSearch', 'FreelanceJobSearch', 'InternshipSearch']
  },
  {
    id: 'advanced_search',
    title: 'Advanced Search',
    description: 'Multi-engine search, academic papers, patents, legal docs, social media',
    icon: '',
    color: '#7c3aed',
    tools: ['MultiEngineSearch', 'AcademicSearch', 'PatentSearch', 'LegalSearch', 'SocialMediaSearch', 'VideoSearch', 'PodcastSearch', 'BookSearch', 'CodeSearch', 'ImageReverseSearch', 'NewsDeepSearch', 'ForumSearch']
  },
  {
    id: 'ai_media',
    title: 'AI & Media Tools',
    description: 'AI image generation, video search, audio tools, content analysis',
    icon: '',
    color: '#db2777',
    tools: ['PollinationsImage', 'PollinationsText', 'YouTubeSearch', 'PodcastTranscript', 'ImageAnalysis', 'TextSummarizer', 'SentimentAnalysis', 'LanguageDetector', 'TextStatistics']
  },
  {
    id: 'ecommerce_price',
    title: 'E-Commerce & Prices',
    description: 'Product search, price comparison, Amazon, deals tracking',
    icon: '',
    color: '#ea580c',
    tools: ['AmazonProductSearch', 'PriceComparison', 'ProductReviews', 'CouponFinder', 'CryptoPrice', 'StockQuote', 'CommodityPrices']
  },
  {
    id: 'app_integrations',
    title: 'App Integrations',
    description: 'Direct connect to GitHub, Gmail, Slack, Discord, Telegram, Google Calendar, Drive, Trello, Spotify, Teams, WhatsApp, LinkedIn',
    icon: '',
    color: '#F120F0',
    tools: ['GitHubListRepos', 'GitHubCreateRepo', 'GitHubCreateIssue', 'GitHubCreatePR', 'GitHubListPRs', 'GitHubNotifications', 'GitHubStarRepo', 'GitHubSearchCode', 'GitHubProfile', 'GmailSendEmail', 'GmailSearchInbox', 'GmailListLabels', 'SlackSendMessage', 'SlackListChannels', 'SlackGetMessages', 'SlackSetStatus', 'DiscordSendMessage', 'DiscordListGuilds', 'DiscordGetChannels', 'TelegramSendMessage', 'TelegramGetUpdates', 'TelegramBotInfo', 'TelegramSendPhoto', 'GoogleCalendarEvents', 'GoogleCalendarSearch', 'GoogleDriveListFiles', 'GoogleDriveSearch', 'TrelloListBoards', 'TrelloGetCards', 'TrelloCreateCard', 'SpotifySearchTracks', 'SpotifyGetPlaylists', 'SpotifyGetArtist', 'TeamsSendMessage', 'WhatsAppSendMessage', 'LinkedInProfile', 'LinkedInCreatePost', 'TempMailGenerate', 'TempMailInbox', 'TempMailRead', 'AutofillIdentity', 'AutofillFormData']
  }
];

export function validateAndFixToolArgs(name: string, args: any): any {
  if (typeof args === 'string') {
    try {
      // Aggressive JSON parsing
      const cleaned = args
        .replace(/\\n/g, '\n')
        .replace(/\\"/g, '"')
        .trim();
      return JSON.parse(cleaned);
    } catch (e) {
      // Fallback for malformed LLM outputs
      console.warn(`Tool ${name} args parsing failed, attempting repair...`);
      return { query: args }; // Default to query if it's just a string
    }
  }
  return args;
}

async function translateGoogle(text: string, sl: string, tl: string) {
  try {
    const r = await fetch(`https://translate.googleapis.com/translate_a/single?client=gtx&sl=${sl}&tl=${tl}&dt=t&q=${encodeURIComponent(text)}`);
    const d = await r.json();
    return d[0].map((x: any) => x[0]).join('');
  } catch (e) { return text; }
}

const turndownService = new TurndownService({
  headingStyle: 'atx',
  codeBlockStyle: 'fenced',
  hr: '---'
});

turndownService.remove(['script', 'style', 'nav', 'footer', 'header', 'aside', 'noscript', 'iframe'] as any);

const DIFFBOT_TOKEN = "505f4d2b000e56b0cfe912915f2883d7";
const SGAI_TOKEN = "sgai-c4e0b7c4-2b67-42d6-8b58-9ff7c43dedc2";
const FASTIO_TOKEN = "cm8ufc55lfp25f4i1733x4tfrjabgu6tjuu53y7jfmvu2fx31u";
const FASTIO_BASE = "https://api.fast.io/current";

// ─── MANUAL KEY BYPASS SECTION ───────────────────────────────────────────────
// These keys are used as fallbacks if not provided in the UI settings.
const SERPER_API_KEY = "9c95d26ff8a4e7ac720ac29d9d7629491b2902d4";
const SERPAPI_KEY = ""; // User: Insert your 64-character SerpApi key here for premium search features.
const FIRECRAWL_API_KEY = ""; // User: Insert your Firecrawl API key here.
const TAVILY_API_KEY = ""; // User: Insert your Tavily API key here.
const BRAVE_API_KEY = ""; // User: Insert your Brave Search API key here.
const KAGI_API_KEY = ""; // User: Insert your Kagi API key here.
const MOJEEK_API_KEY = ""; // User: Insert your Mojeek API key here.
const OLLAMA_API_KEY = "";
const OLLAMA_HOST = "http://localhost:11434";

const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
];

const PATTERNS = {
  azure_connection_string: /AccountName=[a-zA-Z0-9]+;AccountKey=[a-zA-Z0-9+/=]{88}/,
  heroku_api_key: /[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}/,
  digital_ocean_token: /dop_v1_[a-f0-9]{64}/,
  mongodb_uri: /mongodb(\+srv)?:\/\/[a-zA-Z0-9_]+:[a-zA-Z0-9_]+@[a-z0-9.-]+\//,
  postgres_url: /postgres(ql)?:\/\/[a-zA-Z0-9_]+:[a-zA-Z0-9_]+@[a-z0-9.-]+:[0-9]+\/[a-zA-Z0-9_]+/,
  redis_url: /redis:\/\/[a-zA-Z0-9_]*:[a-zA-Z0-9_]+@[a-z0-9.-]+:[0-9]+/,
  openai_api_key: /sk-[a-zA-Z0-9]{48}/,
  anthropic_api_key: /sk-ant-api03-[a-zA-Z0-9-_]{93}AA/,
  huggingface_token: /hf_[a-zA-Z0-9]{34}/,
  twilio_account_sid: /AC[a-f0-9]{32}/,
  twilio_auth_token: /[a-f0-9]{32}/,
  mailgun_api_key: /key-[a-f0-9]{32}/,
  sendgrid_api_key: /SG\.[a-zA-Z0-9_-]{22}\.[a-zA-Z0-9_-]{43}/
};

function calculateEntropy(str: string) {
  const len = str.length;
  if (len < 8) return 0;
  const freq: Record<string, number> = {};
  for (let i = 0; i < len; i++) freq[str[i]] = (freq[str[i]] || 0) + 1;
  let entropy = 0;
  for (const f in freq) {
    const p = freq[f] / len;
    entropy -= p * Math.log2(p);
  }
  return entropy;
}

function getHeaders(referer?: string) {
  return {
    'User-Agent': USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)],
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
    'Referer': referer || 'https://www.google.com/',
    'Upgrade-Insecure-Requests': '1'
  };
}

// Proxy Manager for Rotating Free Proxies
class ProxyManager {
  private proxies: string[] = [];
  private lastRefresh: number = 0;
  private readonly REFRESH_INTERVAL = 15 * 60 * 1000;

  async getProxy() {
    if (this.proxies.length === 0 || (Date.now() - this.lastRefresh > this.REFRESH_INTERVAL)) {
      await this.refreshProxies();
    }
    return this.proxies.length > 0 ? this.proxies[Math.floor(Math.random() * this.proxies.length)] : null;
  }

  private async refreshProxies() {
    try {
      const r = await fetch(`https://api.allorigins.win/get?url=${encodeURIComponent('https://free-proxy-list.net/')}`);
      const d = await r.json();
      const html = d.contents || '';
      const matches = html.match(/\d+\.\d+\.\d+\.\d+:\d+/g) || [];
      this.proxies = matches.slice(0, 50);
      this.lastRefresh = Date.now();
    } catch (e) { console.error('Proxy refresh failed', e); }
  }
}

const proxyManager = new ProxyManager();

async function scrapeDuckDuckGoLite(q: string): Promise<string> {
  try {
    // Using allorigins proxy to bypass CORS in the browser environment
    const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent('https://lite.duckduckgo.com/lite/')}`;
    const r = await fetch(proxyUrl, {
      method: 'POST',
      body: new URLSearchParams({ q })
    });
    if (!r.ok) throw new Error(`DDG Lite Proxy returned ${r.status}`);
    const d = await r.json();
    const html = d.contents || '';

    const results: any[] = [];
    const tableRegex = /<td class='result-td'>([\s\S]*?)<\/td>/g;
    let match;
    while ((match = tableRegex.exec(html)) !== null && results.length < 5) {
      const content = match[1];
      const linkMatch = content.match(/<a class='result-link' href='(.*?)'>(.*?)<\/a>/);
      const snippetMatch = content.match(/<td class='result-snippet'>([\s\S]*?)<\/td>/);

      if (linkMatch) {
        results.push({
          title: linkMatch[2].replace(/<[^>]*>/g, '').trim(),
          url: linkMatch[1],
          snippet: snippetMatch ? snippetMatch[1].replace(/<[^>]*>/g, '').trim() : ''
        });
      }
    }
    return JSON.stringify({ organic_results: results, source: 'DuckDuckGo Lite (Proxied)' });
  } catch (e: any) {
    return JSON.stringify({ error: `Scraper failed: ${e.message}`, hint: "Try using SearchWeb or SearchSearxng" });
  }
}

async function SearchSearxng(q: string): Promise<string> {
  const nodes = ['https://searx.be', 'https://searx.ro', 'https://priv.au', 'https://searx.work'];
  for (const node of nodes) {
    try {
      const r = await fetch(`https://api.allorigins.win/get?url=${encodeURIComponent(`${node}/search?q=${encodeURIComponent(q)}&format=json`)}`);
      const d = await r.json();
      const results = JSON.parse(d.contents).results || [];
      if (results.length > 0) {
        return JSON.stringify({
          results: results.slice(0, 5).map((res: any) => ({ title: res.title, url: res.url, content: res.content })),
          source: `SearXNG Node: ${node}`
        });
      }
    } catch (e) { }
  }
  return JSON.stringify({ error: "All SearXNG nodes failed" });
}

const getLocalSettings = (): any => {
  try {
    const saved = localStorage.getItem('worm_gpt_settings_v3');
    return saved ? JSON.parse(saved) : {};
  } catch { return {}; }
};

export const ATTACHED_TOOLS: Record<string, any> = {
  GetCurrentDateTime: {
    type: 'function',
    function: {
      name: 'GetCurrentDateTime',
      description: 'Get the current date and time in ISO format and local human-readable format.',
      parameters: { type: 'object', properties: {} }
    },
    execute: async () => {
      const now = new Date();
      return JSON.stringify({
        iso: now.toISOString(),
        local: now.toLocaleString(),
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        timestamp: now.getTime(),
        note: "Always use this tool if the user asks for 'latest', 'trending', 'nowday', 'today', 'now', or 'the time'."
      });
    }
  },
  RedditSearch: {
    type: 'function',
    function: {
      name: 'RedditSearch',
      description: 'Search Reddit for community discussions and trends.',
      parameters: { type: 'object', properties: { query: { type: 'string' } }, required: ['query'] }
    },
    execute: async (args: any) => {
      try {
        const settings = getLocalSettings();
        const apiKey = settings.serpapiApiKey || SERPAPI_KEY;
        const r = await fetch(`https://serpapi.com/search.json?engine=google&q=${encodeURIComponent(args.query + ' site:reddit.com')}&api_key=${apiKey}`);
        const d = await r.json();
        const results = (d.organic_results || []).slice(0, 5).map((res: any) => `TITLE: ${res.title}\nURL: ${res.link}\nSNIPPET: ${res.snippet}`).join('\n\n');
        return `REDDIT_RESULTS:\n${results}`;
      } catch (e: any) {
        return JSON.stringify({ error: e.message });
      }
    }
  },
  JinaFetch: {
    type: 'function',
    function: {
      name: 'JinaFetch',
      description: 'Convert any URL (PDF supported) into clean Markdown for LLM processing.',
      parameters: { type: 'object', properties: { target_url: { type: 'string' } }, required: ['target_url'] }
    },
    execute: async (args: any) => {
      try {
        const r = await fetch(`https://r.jina.ai/${encodeURIComponent(args.target_url)}`);
        const text = await r.text();
        return text.substring(0, 50000);
      } catch (e: any) { return JSON.stringify({ error: e.message }); }
    }
  },
  JinaSearch: {
    type: 'function',
    function: {
      name: 'JinaSearch',
      description: 'Search the internet and return results in LLM-friendly format.',
      parameters: { type: 'object', properties: { query: { type: 'string' } }, required: ['query'] }
    },
    execute: async (args: any) => {
      try {
        const r = await fetch(`https://s.jina.ai/${encodeURIComponent(args.query)}`, { headers: { 'Accept': 'application/json' } });
        const d = await r.json();
        return JSON.stringify(d.data?.slice(0, 5));
      } catch (e: any) { return JSON.stringify({ error: e.message }); }
    }
  },
  firecrawl_scrape: {
    type: 'function',
    function: {
      name: 'firecrawl_scrape',
      description: 'Scrape a single URL and convert it into Markdown.',
      parameters: {
        type: 'object',
        properties: {
          url: { type: 'string' },
          formats: { type: 'array', items: { type: 'string' }, default: ['markdown'] }
        },
        required: ['url']
      }
    },
    execute: async (args: any) => {
      try {
        const settings = getLocalSettings();
        const apiKey = settings.firecrawlApiKey || FIRECRAWL_API_KEY;
        const r = await fetch('https://api.firecrawl.dev/v1/scrape', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
          body: JSON.stringify(args)
        });
        const d = await r.json();
        return JSON.stringify(d.data || d);
      } catch (e: any) { return JSON.stringify({ error: e.message }); }
    }
  },
  firecrawl_crawl: {
    type: 'function',
    function: {
      name: 'firecrawl_crawl',
      description: 'Crawl a website and all accessible subpages.',
      parameters: {
        type: 'object',
        properties: {
          url: { type: 'string' },
          limit: { type: 'number', default: 10 }
        },
        required: ['url']
      }
    },
    execute: async (args: any) => {
      try {
        const settings = getLocalSettings();
        const apiKey = settings.firecrawlApiKey || FIRECRAWL_API_KEY;
        const r = await fetch('https://api.firecrawl.dev/v1/crawl', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
          body: JSON.stringify(args)
        });
        const d = await r.json();
        return JSON.stringify(d);
      } catch (e: any) { return JSON.stringify({ error: e.message }); }
    }
  },
  firecrawl_map: {
    type: 'function',
    function: {
      name: 'firecrawl_map',
      description: 'Get a list of all subpages/URLs for a given website.',
      parameters: { type: 'object', properties: { url: { type: 'string' } }, required: ['url'] }
    },
    execute: async (args: any) => {
      try {
        const settings = getLocalSettings();
        const apiKey = settings.firecrawlApiKey || FIRECRAWL_API_KEY;
        const r = await fetch('https://api.firecrawl.dev/v1/map', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
          body: JSON.stringify(args)
        });
        const d = await r.json();
        return JSON.stringify(d.links || d);
      } catch (e: any) { return JSON.stringify({ error: e.message }); }
    }
  },
  firecrawl_search: {
    type: 'function',
    function: {
      name: 'firecrawl_search',
      description: 'Search the web using Firecrawl and return scraped content.',
      parameters: { type: 'object', properties: { query: { type: 'string' }, limit: { type: 'number', default: 5 } }, required: ['query'] }
    },
    execute: async (args: any) => {
      try {
        const settings = getLocalSettings();
        const apiKey = settings.firecrawlApiKey || FIRECRAWL_API_KEY;
        const r = await fetch('https://api.firecrawl.dev/v1/search', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
          body: JSON.stringify(args)
        });
        const d = await r.json();
        return JSON.stringify(d.data || d);
      } catch (e: any) { return JSON.stringify({ error: e.message }); }
    }
  },
  firecrawl_deep_research: {
    type: 'function',
    function: {
      name: 'firecrawl_deep_research',
      description: 'Exhaustive search and research on a topic via Firecrawl.',
      parameters: { type: 'object', properties: { query: { type: 'string' } }, required: ['query'] }
    },
    execute: async (args: any) => {
      try {
        const settings = getLocalSettings();
        const apiKey = settings.firecrawlApiKey || FIRECRAWL_API_KEY;
        const r = await fetch('https://api.firecrawl.dev/v1/deep-research', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
          body: JSON.stringify(args)
        });
        const d = await r.json();
        return JSON.stringify(d);
      } catch (e: any) { return JSON.stringify({ error: e.message }); }
    }
  },
  BingSearch: {
    type: 'function',
    function: {
      name: 'BingSearch',
      description: 'Search the internet using Bing.',
      parameters: { type: 'object', properties: { query: { type: 'string' } }, required: ['query'] }
    },
    execute: async (args: any) => {
      try {
        const settings = getLocalSettings();
        const apiKey = settings.serpapiApiKey || SERPAPI_KEY;
        const r = await fetch(`https://serpapi.com/search.json?engine=bing&q=${encodeURIComponent(args.query)}&api_key=${apiKey}`);
        const d = await r.json();
        const results = (d.organic_results || []).slice(0, 5).map((res: any) => `TITLE: ${res.title}\nURL: ${res.link}\nSNIPPET: ${res.snippet}`).join('\n\n');
        return `BING_RESULTS:\n${results}`;
      } catch (e: any) { return JSON.stringify({ error: e.message }); }
    }
  },
  arxiv_download: {
    type: 'function',
    function: {
      name: 'arxiv_download',
      description: 'Download a paper from arXiv as Markdown or PDF (proxied).',
      parameters: { type: 'object', properties: { paper_id: { type: 'string' } }, required: ['paper_id'] }
    },
    execute: async (args: any) => {
      try {
        const r = await fetch(`https://r.jina.ai/https://arxiv.org/pdf/${args.paper_id}.pdf`);
        const text = await r.text();
        return text.substring(0, 50000);
      } catch (e: any) { return JSON.stringify({ error: e.message }); }
    }
  },
  GoogleAISearch: {
    type: 'function',
    function: {
      name: 'GoogleAISearch',
      description: 'Search using Google AI Mode (AI Overviews) via SerpApi to get summarized text blocks and references.',
      parameters: { type: 'object', properties: { query: { type: 'string' } }, required: ['query'] }
    },
    execute: async (args: any) => {
      try {
        const r = await fetch(`https://serpapi.com/search.json?engine=google_ai_mode&q=${encodeURIComponent(args.query || '')}&api_key=${SERPAPI_KEY}`);
        if (!r.ok) throw new Error(`SerpApi Google AI returned ${r.status}`);
        const d = await r.json();
        const summary = (d.text_blocks || []).map((b: any) => b.text).join('\n\n');
        const refs = (d.references || []).map((ref: any) => `- ${ref.title}: ${ref.link}`).join('\n');
        return `SUMMARY:\n${summary}\n\nREFERENCES:\n${refs}`;
      } catch (e: any) {
        console.warn("GoogleAISearch failed, falling back to standard Serper search...", e.message);
        // Fallback to the same logic as SearchWeb but inside here
        try {
          const fallbackR = await fetch('https://google.serper.dev/search', {
            method: 'POST',
            headers: { 'X-API-KEY': SERPER_API_KEY, 'Content-Type': 'application/json' },
            body: JSON.stringify({ q: args.query || '' })
          });
          const fd = await fallbackR.json();
          return JSON.stringify({
            organic: (fd.organic || []).slice(0, 5),
            source: 'Serper Fallback'
          });
        } catch (err: any) {
          return JSON.stringify({ error: `Both GoogleAI and Serper failed: ${err.message}` });
        }
      }
    }
  },
  DuckDuckGoSearch: {
    type: 'function',
    function: {
      name: 'DuckDuckGoSearch',
      description: 'Search using DuckDuckGo via SerpApi to get organic results, news, and knowledge graph.',
      parameters: { type: 'object', properties: { query: { type: 'string' } }, required: ['query'] }
    },
    execute: async (args: any) => {
      try {
        const settings = getLocalSettings();
        const apiKey = settings.serpapiApiKey || SERPAPI_KEY;
        const r = await fetch(`https://serpapi.com/search.json?engine=duckduckgo&q=${encodeURIComponent(args.query || '')}&kl=us-en&api_key=${apiKey}`);
        if (!r.ok) throw new Error(`SerpApi DuckDuckGo returned ${r.status}`);
        const d = await r.json();
        const results = (d.organic_results || []).slice(0, 5).map((r: any) => `TITLE: ${r.title}\nURL: ${r.link}\nSNIPPET: ${r.snippet}`).join('\n\n');
        const news = (d.news_results || []).slice(0, 3).map((n: any) => `NEWS: ${n.title} (${n.link})`).join('\n');
        return `ORGANIC_RESULTS:\n${results}\n\nLATEST_NEWS:\n${news}`;
      } catch (e: any) {
        console.warn("SerpApi DDG failed, falling back to SearchWeb followed by scraper...", e.message);
        try {
          return await ATTACHED_TOOLS.SearchWeb.execute({ query: args.query });
        } catch (fallbackErr) {
          return scrapeDuckDuckGoLite(args.query || '');
        }
      }
    }
  },
  YandexSearch: {
    type: 'function',
    function: {
      name: 'YandexSearch',
      description: 'Search Yandex for global and Russian results. Useful for diverse perspectives and high-quality web data.',
      parameters: { type: 'object', properties: { query: { type: 'string' } }, required: ['query'] }
    },
    execute: async (args: any) => {
      const q = args.query || args.q || '';
      try {
        const settings = getLocalSettings();
        const apiKey = settings.serpapiApiKey || SERPAPI_KEY;
        const response = await fetch(`https://serpapi.com/search.json?engine=yandex&text=${encodeURIComponent(q)}&api_key=${apiKey}`);
        if (!response.ok) throw new Error(`SerpApi Yandex status ${response.status}`);
        const data = await response.json();
        const organic = (data.organic_results || []).slice(0, 5).map((r: any) => `TITLE: ${r.title}\nURL: ${r.link}\nSNIPPET: ${r.snippet}`).join('\n\n');
        return `YANDEX_RESULTS:\n${organic}`;
      } catch (e: any) {
        console.warn("SerpApi Yandex failed, falling back to Serper...", e.message);
        try {
          const r = await fetch('https://google.serper.dev/search', {
            method: 'POST',
            headers: { 'X-API-KEY': SERPER_API_KEY, 'Content-Type': 'application/json' },
            body: JSON.stringify({ q })
          });
          const d = await r.json();
          return JSON.stringify({
            organic: (d.organic || []).slice(0, 5),
            knowledgeGraph: d.knowledgeGraph || null,
            fallback: true
          });
        } catch (e2: any) {
          return JSON.stringify({ error: `Yandex and Serper failed: ${e2.message}` });
        }
      }
    }
  },
  GetWeather: {
    type: 'function',
    function: {
      name: 'GetWeather',
      description: 'Get current weather.',
      parameters: { type: 'object', properties: { location: { type: 'string' } } }
    },
    execute: async (args: any) => {
      const location = args.location || (typeof args === 'string' ? args : '');
      try {
        const g = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(location)}&count=1&format=json`);
        const gd = await g.json();
        if (gd.results?.[0]) {
          const { latitude: lat, longitude: lon, name } = gd.results[0];
          const w = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,wind_speed_10m`);
          const wd = await w.json();
          return { location: name, temp: wd.current.temperature_2m + '°C', wind: wd.current.wind_speed_10m + 'km/h' };
        }
        return { error: 'Location not found' };
      } catch (e: any) { return { error: e.message }; }
    }
  },
  SearchWeb: {
    type: 'function',
    function: {
      name: 'SearchWeb',
      description: 'Search the web using Serper.',
      parameters: { type: 'object', properties: { query: { type: 'string' } }, required: ['query'] }
    },
    execute: async (args: any) => {
      const q = args.query || '';
      try {
        const settings = getLocalSettings();
        const apiKey = settings.serperApiKey || SERPER_API_KEY;
        const r = await fetch('https://google.serper.dev/search', {
          method: 'POST',
          headers: { 'X-API-KEY': apiKey, 'Content-Type': 'application/json' },
          body: JSON.stringify({ q })
        });
        if (!r.ok) throw new Error('Serper returned ' + r.status);
        const d = await r.json();
        const organic = (d.organic || []).slice(0, 5).map((res: any) => `TITLE: ${res.title}\nURL: ${res.link}\nSNIPPET: ${res.snippet}`).join('\n\n');
        return `WEB_SEARCH_RESULTS:\n${organic}`;
      } catch (e1: any) {
        try {
          const r2 = await fetch(`https://s.jina.ai/${encodeURIComponent(q)}`, { headers: { 'Accept': 'application/json' } });
          const d2 = await r2.json();
          const results = (d2.data || []).slice(0, 5).map((res: any) => ({ title: res.title, url: res.url, content: res.content ? res.content.substring(0, 3000) : '' }));
          return JSON.stringify({ content: results.map((r: any) => `${r.title} (${r.url})\n${r.content}`).join('\n\n---\n\n'), sources: results.map((r: any) => ({ title: r.title, url: r.url })) });
        } catch (e2: any) {
          console.warn("Serper and Jina failed for SearchWeb, falling back to DDG Lite Scraper...", e2.message);
          return scrapeDuckDuckGoLite(q);
        }
      }
    }
  },
  SGAISmartScraper: {
    type: 'function',
    function: {
      name: 'SGAISmartScraper',
      description: 'Extract specific data from a URL using AI. Provide a clear prompt for what to extract.',
      parameters: {
        type: 'object',
        properties: {
          url: { type: 'string' },
          prompt: { type: 'string' },
          mock: { type: 'boolean', default: false }
        },
        required: ['url', 'prompt']
      }
    },
    execute: async (args: any) => {
      try {
        const r = await fetch('https://api.scrapegraphai.com/v1/smartscraper', {
          method: 'POST',
          headers: { 'SGAI-APIKEY': SGAI_TOKEN, 'Content-Type': 'application/json' },
          body: JSON.stringify({ website_url: args.url, user_prompt: args.prompt, mock: !!args.mock })
        });
        if (!r.ok) throw new Error('SGAI returned ' + r.status);
        return JSON.stringify(await r.json());
      } catch (e: any) {
        console.warn("SGAI SmartScraper failed, falling back to WebCrawler...", e.message);
        return await ATTACHED_TOOLS.WebCrawler.execute({ url: args.url });
      }
    }
  },
  SGAIAgenticScraper: {
    type: 'function',
    function: {
      name: 'SGAIAgenticScraper',
      description: 'Advanced browser automation and scraping.',
      parameters: {
        type: 'object',
        properties: {
          url: { type: 'string' },
          steps: { type: 'array', items: { type: 'string' } },
          prompt: { type: 'string' },
          ai_extraction: { type: 'boolean', default: true },
          mock: { type: 'boolean', default: false }
        },
        required: ['url', 'steps']
      }
    },
    execute: async (args: any) => {
      try {
        const r = await fetch('https://api.scrapegraphai.com/v1/agentic-scrapper', {
          method: 'POST',
          headers: { 'SGAI-APIKEY': SGAI_TOKEN, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            website_url: args.url,
            steps: args.steps,
            user_prompt: args.prompt,
            ai_extraction: !!args.ai_extraction,
            mock: !!args.mock
          })
        });
        if (!r.ok) throw new Error('SGAI returned ' + r.status);
        return JSON.stringify(await r.json());
      } catch (e: any) {
        console.warn("SGAI AgenticScraper failed, falling back to WebCrawler...", e.message);
        return await ATTACHED_TOOLS.WebCrawler.execute({ url: args.url });
      }
    }
  },
  SGAIMarkdownify: {
    type: 'function',
    function: {
      name: 'SGAIMarkdownify',
      description: 'Convert a webpage to clean markdown via ScrapeGraphAI.',
      parameters: { type: 'object', properties: { url: { type: 'string' }, mock: { type: 'boolean', default: false } }, required: ['url'] }
    },
    execute: async (args: any) => {
      try {
        const r = await fetch('https://api.scrapegraphai.com/v1/markdownify', {
          method: 'POST',
          headers: { 'SGAI-APIKEY': SGAI_TOKEN, 'Content-Type': 'application/json' },
          body: JSON.stringify({ website_url: args.url, mock: !!args.mock })
        });
        if (!r.ok) throw new Error('SGAI returned ' + r.status);
        return JSON.stringify(await r.json());
      } catch (e: any) {
        console.warn("SGAI Markdownify failed, falling back to WebCrawler...", e.message);
        return await ATTACHED_TOOLS.WebCrawler.execute({ url: args.url });
      }
    }
  },
  SGAIGetCredits: {
    type: 'function',
    function: {
      name: 'SGAIGetCredits',
      description: 'Check remaining ScrapeGraphAI credits.',
      parameters: { type: 'object', properties: {} }
    },
    execute: async () => {
      try {
        const r = await fetch('https://api.scrapegraphai.com/v1/credits', {
          headers: { 'SGAI-APIKEY': SGAI_TOKEN }
        });
        return JSON.stringify(await r.json());
      } catch (e: any) { return JSON.stringify({ error: e.message }); }
    }
  },
  DiffbotAnalyze: {
    type: 'function',
    function: {
      name: 'DiffbotAnalyze',
      description: 'Extract structured data from any URL using AI.',
      parameters: { type: 'object', properties: { url: { type: 'string' } }, required: ['url'] }
    },
    execute: async (args: any) => {
      const url = args.url || (typeof args === 'string' ? args : '');
      try {
        const r = await fetch(`https://api.diffbot.com/v3/analyze?token=${DIFFBOT_TOKEN}&url=${encodeURIComponent(url)}`);
        return JSON.stringify(await r.json());
      } catch (e: any) { return JSON.stringify({ error: e.message }); }
    }
  },
  GitHubRepoStructure: {
    type: 'function',
    function: {
      name: 'GitHubRepoStructure',
      description: 'Get the file and folder directory tree of a GitHub repository.',
      parameters: { type: 'object', properties: { repo: { type: 'string', description: 'Owner/repo format (e.g. facebook/react)' } }, required: ['repo'] }
    },
    execute: async (args: any) => {
      const repo = args.repo || '';
      try {
        const r = await fetch(`https://api.github.com/repos/${repo}/git/trees/HEAD?recursive=1`, {
          headers: { 'User-Agent': 'WormGPT-Agent', 'Accept': 'application/vnd.github.v3+json' }
        });
        if (!r.ok) throw new Error(`GitHub API returned ${r.status}`);
        const d = await r.json();
        const files = (d.tree || [])
          .filter((t: any) => t.path && !t.path.includes('node_modules/') && !t.path.includes('.git/'))
          .map((t: any) => `${t.type === 'tree' ? '📁' : '📄'} ${t.path}`);
        return `REPO_STRUCTURE for ${repo}:\n` + files.join('\n').substring(0, 10000);
      } catch (e: any) { return JSON.stringify({ error: e.message }); }
    }
  },
  GitHubFileContent: {
    type: 'function',
    function: {
      name: 'GitHubFileContent',
      description: 'Get the raw text codebase contents or README of a specific file in a GitHub repo.',
      parameters: {
        type: 'object',
        properties: {
          repo: { type: 'string', description: 'Owner/repo format (e.g. facebook/react)' },
          path: { type: 'string', description: 'Path to file (e.g. README.md or src/index.js)' }
        },
        required: ['repo', 'path']
      }
    },
    execute: async (args: any) => {
      const { repo, path } = args;
      if (!repo || !path) return 'Error: repo and path required';
      try {
        const r = await fetch(`https://raw.githubusercontent.com/${repo}/HEAD/${path}`, {
          headers: { 'User-Agent': 'WormGPT-Agent' }
        });
        if (!r.ok) throw new Error(`GitHub raw fetch returned ${r.status}`);
        const text = await r.text();
        return `FILE_CONTENT for ${repo}/${path}:\n\n${text.substring(0, 30000)}`;
      } catch (e: any) { return JSON.stringify({ error: e.message }); }
    }
  },
  YouTubeSummarizer: {
    type: 'function',
    function: {
      name: 'YouTubeSummarizer',
      description: 'Get video details for summary.',
      parameters: { type: 'object', properties: { videoUrl: { type: 'string' } } }
    },
    execute: async (args: any) => {
      const url = args.videoUrl || (typeof args === 'string' ? args : '');
      try {
        const oembed = await fetch(`https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`);
        return JSON.stringify(await oembed.json());
      } catch (e: any) { return JSON.stringify({ error: e.message }); }
    }
  },
  ArchiveSearch: {
    type: 'function',
    function: {
      name: 'ArchiveSearch',
      description: 'Search for historical snapshots of a URL using Wayback Machine.',
      parameters: { type: 'object', properties: { url: { type: 'string' } }, required: ['url'] }
    },
    execute: async (args: any) => {
      const url = args.url || (typeof args === 'string' ? args : '');
      try {
        const r = await fetch(`http://archive.org/wayback/available?url=${encodeURIComponent(url)}`);
        return JSON.stringify(await r.json());
      } catch (e: any) { return JSON.stringify({ error: e.message }); }
    }
  },
  SecurityAuditor: {
    type: 'function',
    function: {
      name: 'SecurityAuditor',
      description: 'Analyze text for potential secret exposure (defensive auditing).',
      parameters: { type: 'object', properties: { content: { type: 'string' } }, required: ['content'] }
    },
    execute: async (args: any) => {
      const content = args.content || '';
      const detections: any[] = [];

      // Pattern Detections
      for (const [key, regex] of Object.entries(PATTERNS)) {
        const match = content.match(regex);
        if (match) detections.push({ type: key, found: match[0], context: 'Regex Match' });
      }

      // Entropy Detections (Fuzzy)
      const words = content.split(/[\s'":=]+/);
      for (const word of words) {
        if (word.length >= 20 && word.length <= 100 && calculateEntropy(word) > 4.5) {
          detections.push({ type: 'HighEntropySecret', found: `****${word.slice(-4)}`, entropy: calculateEntropy(word).toFixed(2) });
        }
      }

      return JSON.stringify({ detections, summary: detections.length ? `Detected ${detections.length} potential exposures.` : 'No critical secrets detected.' });
    }
  },
  DorkBuilder: {
    type: 'function',
    function: {
      name: 'DorkBuilder',
      description: 'Generate advanced search strings for specific file types or sensitive paths (defensive).',
      parameters: {
        type: 'object',
        properties: {
          target: { type: 'string' },
          type: { type: 'string', enum: ['ConfigLeaks', 'AdminPanels', 'PublicBackups', 'Forensics'] }
        },
        required: ['target', 'type']
      }
    },
    execute: (args: any) => {
      const { target, type } = args;
      const dorks = {
        ConfigLeaks: [`site:${target} filetype:env`, `site:${target} filetype:yaml`, `site:${target} inurl:config`],
        AdminPanels: [`site:${target} intitle:admin`, `site:${target} inurl:login`],
        PublicBackups: [`site:${target} filetype:sql`, `site:${target} filetype:zip`, `site:${target} filetype:bak`],
        Forensics: [`site:${target} "Index of /"`, `site:${target} "server at"`]
      };
      return JSON.stringify({ dorks: dorks[type as keyof typeof dorks] || [] });
    }
  },
  DeepResearch: {
    type: 'function',
    function: {
      name: 'DeepResearch',
      description: 'Perform an exhaustive, multi-step search and analysis on a complex topic.',
      parameters: { type: 'object', properties: { topic: { type: 'string' } } }
    },
    execute: async (args: any) => {
      const topic = args.topic || (typeof args === 'string' ? args : '');
      try {
        const searchResult = await ATTACHED_TOOLS.SearchWeb.execute({ query: topic });
        const scraperResult = await ATTACHED_TOOLS.SGAISmartScraper.execute({ url: topic.includes('http') ? topic : `https://www.google.com/search?q=${encodeURIComponent(topic)}`, prompt: 'Extract key insights.' });
        return `DEEP_RESEARCH_REPORT:\n\n1. SEARCH_FINDINGS:\n${searchResult}\n\n2. SMART_SCRAPE_INSIGHTS:\n${scraperResult}\n\n[End of Deep Research Report]`;
      } catch (e: any) { return `DeepResearch failed: ${e.message}`; }
    }
  },
  WebCrawler: {
    type: 'function',
    function: {
      name: 'WebCrawler',
      description: 'Ultra-robust web crawler. Primary: Jina Reader, Secondary: Microlink, Tertiary: Serper, Quaternary: AllOrigins Proxy.',
      parameters: { type: 'object', properties: { url: { type: 'string' } }, required: ['url'] }
    },
    execute: async (args: any) => {
      let url = typeof args === 'string' ? args : (args.url || args.q || '');
      if (!url.startsWith('http')) url = 'https://' + url;

      // 1. Primary: Jina Reader (High fidelity Markdown)
      try {
        const r = await fetch(`https://r.jina.ai/${encodeURIComponent(url)}`);
        if (r.ok) {
          const text = await r.text();
          if (text.length > 500) return JSON.stringify({ content: text.substring(0, 20000), source: 'Jina Reader' });
        }
      } catch (e) { }

      // 2. Secondary: Microlink (Advanced Browser Rendering)
      try {
        const r = await fetch(`https://api.microlink.io?url=${encodeURIComponent(url)}&md=true`);
        if (r.ok) {
          const d = await r.json();
          if (d.data?.markdown) return JSON.stringify({ content: d.data.markdown.substring(0, 20000), source: 'Microlink AI' });
        }
      } catch (e) { }

      // 3. Tertiary: Serper Scraper (JS Execution)
      try {
        const r = await fetch(`https://scrape.serper.dev?includeMarkdown=true&apiKey=${SERPER_API_KEY}&url=${encodeURIComponent(url)}`);
        if (r.ok) {
          const d = await r.json();
          return JSON.stringify({ content: d.markdown ? d.markdown.substring(0, 20000) : (d.text || '').substring(0, 20000), source: 'Serper Scraper' });
        }
      } catch (e) { }

      // 4. Quaternary: Google Cache / Proxy Fallback
      try {
        const cacheUrl = `https://www.google.com/search?q=cache:${encodeURIComponent(url)}`;
        const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(cacheUrl)}`;
        const r = await fetch(proxyUrl);
        const d = await r.json();
        const html = d.contents || '';
        if (html.includes('google-cache')) {
          const md = turndownService.turndown(html);
          return JSON.stringify({ content: md.substring(0, 20000), source: 'Google Cache' });
        }
      } catch (e) { }

      // 5. Pentary: Wayback Machine (Archive.org)
      try {
        const r = await fetch(`https://archive.org/wayback/available?url=${encodeURIComponent(url)}`);
        const d = await r.json();
        const closest = d.archived_snapshots?.closest;
        if (closest?.available) {
          const r2 = await fetch(`https://r.jina.ai/${encodeURIComponent(closest.url)}`);
          if (r2.ok) return JSON.stringify({ content: (await r2.text()).substring(0, 20000), source: 'Wayback Machine' });
        }
      } catch (e) { }

      // 6. Final: Search Fallback (Try to find the page via search instead of crawling)
      try {
        return await ATTACHED_TOOLS.SearchWeb.execute({ query: url });
      } catch (e) {
        return JSON.stringify({ error: "ALL_SCRAPING_LAYER_BREACHED: Connection severed." });
      }
    }
  },
  GitHubAPIFinder: {
    type: 'function',
    function: {
      name: 'GitHubAPIFinder',
      description: 'Advanced GitHub reconnaissance tool to find API endpoints and patterns in repositories.',
      parameters: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'Search query (e.g., "@api_view", "router.get", "Flask methods")' },
          repo: { type: 'string', description: 'Optional specific repo to scan (owner/name)' }
        },
        required: ['query']
      }
    },
    execute: async (args: any) => {
      const q = typeof args === 'string' ? args : (args.query || args.q || '');
      const repo = args.repo || '';
      const fullQuery = repo ? `${q} repo:${repo}` : q;

      try {
        // Step 1: Search for code files containing the patterns
        const r = await fetch(`https://api.github.com/search/code?q=${encodeURIComponent(fullQuery)}`, {
          headers: { 'Accept': 'application/vnd.github.v3+json' }
        });
        const d = await r.json();

        if (d.items && d.items.length > 0) {
          const results = d.items.slice(0, 5).map((item: any) => ({
            name: item.name,
            path: item.path,
            repo: item.repository.full_name,
            url: item.html_url
          }));

          let report = `RECON_DATA_FOUND: Found ${d.total_count} files matching patterns.\n\n`;
          for (const res of results) {
            report += `FILE: ${res.name} in ${res.repo}\nPATH: ${res.path}\nLINK: ${res.url}\n\n`;
          }
          return report;
        }
        return "No API patterns discovered in the target scope.";
      } catch (e: any) { return JSON.stringify({ error: e.message }); }
    }
  },
  OllamaSearch: {
    type: 'function',
    function: {
      name: 'OllamaSearch',
      description: 'Search the web using Ollama Cloud. High-fidelity results optimized for AI.',
      parameters: { type: 'object', properties: { query: { type: 'string' } }, required: ['query'] }
    },
    execute: async (args: any) => {
      try {
        const settings = getLocalSettings();
        const apiKey = settings.ollamaApiKey || OLLAMA_API_KEY;
        const host = settings.ollamaHost || OLLAMA_HOST;
        const r = await fetch(`${host}/api/web_search`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ query: args.query })
        });
        return JSON.stringify(await r.json());
      } catch (e: any) {
        return JSON.stringify({ error: e.message, fallback: 'Try SearchWeb or SearchSearxng' });
      }
    }
  },
  OllamaFetch: {
    type: 'function',
    function: {
      name: 'OllamaFetch',
      description: 'Fetch the full content of a webpage using Ollama Cloud.',
      parameters: { type: 'object', properties: { url: { type: 'string' } }, required: ['url'] }
    },
    execute: async (args: any) => {
      try {
        const settings = getLocalSettings();
        const apiKey = settings.ollamaApiKey || OLLAMA_API_KEY;
        const host = settings.ollamaHost || OLLAMA_HOST;
        const r = await fetch(`${host}/api/web_fetch`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: args.url })
        });
        return JSON.stringify(await r.json());
      } catch (e: any) {
        return JSON.stringify({ error: e.message, fallback: 'Try JinaFetch or FetchWebpage' });
      }
    }
  },
  ExaSearch: {
    type: 'function',
    function: {
      name: 'ExaSearch',
      description: 'Neural search via Exa AI. Optimized for LLM queries.',
      parameters: { type: 'object', properties: { query: { type: 'string' } }, required: ['query'] }
    },
    execute: async (args: any) => {
      try {
        const r = await fetch(`https://s.jina.ai/${encodeURIComponent(args.query)}`, { headers: { 'Accept': 'application/json' } });
        const d = await r.json();
        return JSON.stringify({ results: d.data?.slice(0, 5), source: 'Exa/Jina Neural' });
      } catch (e) { return JSON.stringify({ error: e.message }); }
    }
  },
  TavilySearch: {
    type: 'function',
    function: {
      name: 'TavilySearch',
      description: 'Search the web using Tavily AI. Optimized for RAG and factual accuracy.',
      parameters: { type: 'object', properties: { query: { type: 'string' } }, required: ['query'] }
    },
    execute: async (args: any) => {
      try {
        const settings = getLocalSettings();
        const apiKey = settings.tavilyApiKey || TAVILY_API_KEY;
        const r = await fetch('https://api.tavily.com/search', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ api_key: apiKey, query: args.query, search_depth: "smart", include_answer: true, max_results: 5 })
        });
        return JSON.stringify(await r.json());
      } catch (e: any) { return JSON.stringify({ error: e.message }); }
    }
  },
  BraveSearch: {
    type: 'function',
    function: {
      name: 'BraveSearch',
      description: 'Search the web using Brave Search API (independent index).',
      parameters: { type: 'object', properties: { query: { type: 'string' } }, required: ['query'] }
    },
    execute: async (args: any) => {
      try {
        const settings = getLocalSettings();
        const apiKey = settings.braveApiKey || BRAVE_API_KEY;
        const r = await fetch(`https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(args.query)}`, {
          headers: { 'Accept': 'application/json', 'X-Subscription-Token': apiKey }
        });
        return JSON.stringify(await r.json());
      } catch (e: any) { return JSON.stringify({ error: e.message }); }
    }
  },
  KagiSearch: {
    type: 'function',
    function: {
      name: 'KagiSearch',
      description: 'Privacy-focused high-quality search via Kagi API.',
      parameters: { type: 'object', properties: { query: { type: 'string' } }, required: ['query'] }
    },
    execute: async (args: any) => {
      try {
        const settings = getLocalSettings();
        const apiKey = settings.kagiApiKey || KAGI_API_KEY;
        const r = await fetch(`https://kagi.com/api/v1/search?q=${encodeURIComponent(args.query)}`, {
          headers: { 'Authorization': `Bot ${apiKey}` }
        });
        return JSON.stringify(await r.json());
      } catch (e: any) { return JSON.stringify({ error: e.message }); }
    }
  },
  MojeekSearch: {
    type: 'function',
    function: {
      name: 'MojeekSearch',
      description: 'Search using Mojeek (independent, crawler-based). High privacy.',
      parameters: { type: 'object', properties: { query: { type: 'string' } }, required: ['query'] }
    },
    execute: async (args: any) => {
      try {
        const settings = getLocalSettings();
        const apiKey = settings.mojeekApiKey || MOJEEK_API_KEY;
        const r = await fetch(`https://api.mojeek.com/search?q=${encodeURIComponent(args.query)}&fmt=json`);
        return JSON.stringify(await r.json());
      } catch (e: any) { return JSON.stringify({ error: e.message }); }
    }
  },
  SougouSearch: {
    type: 'function',
    function: {
      name: 'SougouSearch',
      description: 'Search using Sougou (Chinese and global results). Useful for diverse coverage.',
      parameters: { type: 'object', properties: { query: { type: 'string' } }, required: ['query'] }
    },
    execute: async (args: any) => {
      try {
        const r = await fetch(`https://api.allorigins.win/get?url=${encodeURIComponent(`https://www.sogou.com/web?query=${encodeURIComponent(args.query)}`)}`);
        const d = await r.json();
        const html = d.contents || '';
        const md = turndownService.turndown(html);
        return JSON.stringify({ content: md.substring(0, 10000), source: 'Sougou Scraper' });
      } catch (e: any) { return JSON.stringify({ error: e.message }); }
    }
  },
  ArxivSearch: {
    type: 'function',
    function: {
      name: 'ArxivSearch',
      description: 'Search for scientific papers on arXiv.',
      parameters: { type: 'object', properties: { query: { type: 'string' } }, required: ['query'] }
    },
    execute: async (args: any) => {
      try {
        const r = await fetch(`https://export.arxiv.org/api/query?search_query=all:${encodeURIComponent(args.query)}&max_results=5`);
        const text = await r.text();
        return JSON.stringify({ xml: text.substring(0, 8000), source: 'arXiv' });
      } catch (e) { return JSON.stringify({ error: e.message }); }
    }
  },
  WikipediaSummary: {
    type: 'function',
    function: {
      name: 'WikipediaSummary',
      description: 'Get a concise summary and link for a Wikipedia article.',
      parameters: { type: 'object', properties: { query: { type: 'string' } }, required: ['query'] }
    },
    execute: async (args: any) => {
      try {
        const r = await fetch(`https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(args.query.replace(/\s/g, '_'))}`);
        return JSON.stringify(await r.json());
      } catch (e) { return JSON.stringify({ error: e.message }); }
    }
  },
  HackerNewsSearch: {
    type: 'function',
    function: {
      name: 'HackerNewsSearch',
      description: 'Search Hacker News stories and comments.',
      parameters: { type: 'object', properties: { query: { type: 'string' } }, required: ['query'] }
    },
    execute: async (args: any) => {
      try {
        const r = await fetch(`https://hn.algolia.com/api/v1/search?query=${encodeURIComponent(args.query)}&tags=story&hitsPerPage=5`);
        return JSON.stringify(await r.json());
      } catch (e) { return JSON.stringify({ error: e.message }); }
    }
  },
  RAGSearch: {
    type: 'function',
    function: {
      name: 'RAGSearch',
      description: 'Multi-provider RAG Search orchestrator. Automatically picks the best provider (Brave, Tavily, Ollama, etc.) and falls back if needed.',
      parameters: {
        type: 'object',
        properties: {
          query: { type: 'string' },
          provider: { type: 'string', enum: ['auto', 'ollama', 'brave', 'tavily', 'serper', 'searxng', 'exa', 'google', 'bing', 'duckduckgo', 'kagi', 'mojeek', 'sougou'], default: 'auto' },
          max_results: { type: 'number', default: 5 }
        },
        required: ['query']
      }
    },
    execute: async (args: any) => {
      const { query, provider = 'auto', max_results = 5 } = args;
      const providers = provider === 'auto' 
        ? ['ollama', 'brave', 'tavily', 'serper', 'searxng', 'exa', 'jina', 'kagi', 'mojeek']
        : [provider];

      for (const p of providers) {
        try {
          let result: string | null = null;
          switch (p) {
            case 'ollama':
              result = await ATTACHED_TOOLS.OllamaSearch.execute({ query });
              break;
            case 'brave':
              result = await ATTACHED_TOOLS.BraveSearch.execute({ query });
              break;
            case 'tavily':
              result = await ATTACHED_TOOLS.TavilySearch.execute({ query });
              break;
            case 'kagi':
              result = await ATTACHED_TOOLS.KagiSearch.execute({ query });
              break;
            case 'mojeek':
              result = await ATTACHED_TOOLS.MojeekSearch.execute({ query });
              break;
            case 'sougou':
              result = await ATTACHED_TOOLS.SougouSearch.execute({ query });
              break;
            case 'serper':
              result = await ATTACHED_TOOLS.SearchWeb.execute({ query });
              break;
            case 'searxng':
              result = await SearchSearxng(query);
              break;
            case 'duckduckgo':
              result = await ATTACHED_TOOLS.DuckDuckGoSearch.execute({ query });
              break;
            case 'jina':
              result = await ATTACHED_TOOLS.JinaSearch.execute({ query });
              break;
            case 'exa':
              result = await ATTACHED_TOOLS.ExaSearch.execute({ query });
              break;
            case 'google':
              result = await ATTACHED_TOOLS.GoogleAISearch.execute({ query });
              break;
            case 'bing':
              result = await ATTACHED_TOOLS.BingSearch.execute({ query });
              break;
          }

          if (result && !result.includes('error') && !result.includes('failed')) {
            return result;
          }
        } catch (e) {
          console.warn(`RAGSearch provider ${p} failed:`, e);
        }
      }
      return JSON.stringify({ error: "ALL_RAG_PROVIDERS_DEPLETED", hint: "Check API keys or try a different query." });
    }
  },
  arxiv_read: {
    type: 'function',
    function: {
      name: 'arxiv_read',
      description: 'Read the parsed content of an arXiv paper.',
      parameters: { type: 'object', properties: { paper_id: { type: 'string' } }, required: ['paper_id'] }
    },
    execute: async (args: any) => {
      try {
        const r = await fetch(`https://r.jina.ai/https://arxiv.org/html/${args.paper_id}`);
        const text = await r.text();
        return text.substring(0, 50000);
      } catch (e: any) { return JSON.stringify({ error: e.message }); }
    }
  },
  FetchWebpage: {
    type: 'function',
    function: {
      name: 'FetchWebpage',
      description: 'Fetch a webpage and convert to Markdown. Supports chunking for long pages.',
      parameters: {
        type: 'object',
        properties: {
          url: { type: 'string' },
          max_length: { type: 'number', default: 10000 },
          start_index: { type: 'number', default: 0 }
        },
        required: ['url']
      }
    },
    execute: async (args: any) => {
      try {
        const r = await fetch(`https://r.jina.ai/${encodeURIComponent(args.url)}`);
        const text = await r.text();
        const start = args.start_index || 0;
        const length = args.max_length || 10000;
        return text.substring(start, start + length);
      } catch (e: any) { return JSON.stringify({ error: e.message }); }
    }
  },
  SearchSearxng: {
    type: 'function',
    function: {
      name: 'SearchSearxng',
      description: 'Privacy-focused search via public SearXNG nodes (no-key required).',
      parameters: { type: 'object', properties: { query: { type: 'string' } }, required: ['query'] }
    },
    execute: async (args: any) => SearchSearxng(args.query || '')
  },
  FastIoAuthInfo: {
    type: 'function',
    function: {
      name: 'FastIoAuthInfo',
      description: 'Check Fast.io API key scopes and identity.',
      parameters: { type: 'object', properties: {} }
    },
    execute: async () => {
      try {
        const r = await fetch(`${FASTIO_BASE}/auth/scopes/`, { headers: { 'Authorization': `Bearer ${FASTIO_TOKEN}` } });
        return JSON.stringify(await r.json());
      } catch (e: any) { return JSON.stringify({ error: e.message }); }
    }
  },
  FastIoStorageList: {
    type: 'function',
    function: {
      name: 'FastIoStorageList',
      description: 'List files and folders in a Fast.io workspace or share.',
      parameters: {
        type: 'object',
        properties: {
          profileId: { type: 'string', description: 'Workspace or Share ID' },
          parentId: { type: 'string', default: 'root', description: 'Folder node ID' }
        },
        required: ['profileId']
      }
    },
    execute: async (args: any) => {
      try {
        const r = await fetch(`${FASTIO_BASE}/workspace/${args.profileId}/storage/${args.parentId || 'root'}/list/`, {
          headers: { 'Authorization': `Bearer ${FASTIO_TOKEN}` }
        });
        return JSON.stringify(await r.json());
      } catch (e: any) { return JSON.stringify({ error: e.message }); }
    }
  },
  FastIoAiChat: {
    type: 'function',
    function: {
      name: 'FastIoAiChat',
      description: 'Query documents in a workspace using RAG.',
      parameters: {
        type: 'object',
        properties: {
          workspaceId: { type: 'string' },
          message: { type: 'string' }
        },
        required: ['workspaceId', 'message']
      }
    },
    execute: async (args: any) => {
      try {
        const r = await fetch(`${FASTIO_BASE}/workspace/${args.workspaceId}/ai/chat/`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${FASTIO_TOKEN}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: args.message })
        });
        return JSON.stringify(await r.json());
      } catch (e: any) { return JSON.stringify({ error: e.message }); }
    }
  },
  FastIoCreateShare: {
    type: 'function',
    function: {
      name: 'FastIoCreateShare',
      description: 'Create a share link (Portal or Folder) for human collaboration.',
      parameters: {
        type: 'object',
        properties: {
          workspaceId: { type: 'string' },
          title: { type: 'string' },
          mode: { type: 'string', enum: ['portal', 'folder'] }
        },
        required: ['workspaceId', 'title']
      }
    },
    execute: async (args: any) => {
      try {
        const r = await fetch(`${FASTIO_BASE}/workspace/${args.workspaceId}/create/share/`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${FASTIO_TOKEN}`, 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({ title: args.title, mode: args.mode || 'portal' }).toString()
        });
        return JSON.stringify(await r.json());
      } catch (e: any) { return JSON.stringify({ error: e.message }); }
    }
  },
  FastIoTransferOwnership: {
    type: 'function',
    function: {
      name: 'FastIoTransferOwnership',
      description: 'Generate an ownership transfer link to hand off an organization to a human.',
      parameters: { type: 'object', properties: { orgId: { type: 'string' } }, required: ['orgId'] }
    },
    execute: async (args: any) => {
      try {
        const r = await fetch(`${FASTIO_BASE}/org/${args.orgId}/transfer/token/create/`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${FASTIO_TOKEN}` }
        });
        const d = await r.json();
        if (d.result && d.token) {
          return JSON.stringify({ claim_url: `https://go.fast.io/claim?token=${d.token}`, ...d });
        }
        return JSON.stringify(d);
      } catch (e: any) { return JSON.stringify({ error: e.message }); }
    }
  },
  GenerateImage: {
    type: 'function',
    function: {
      name: 'GenerateImage',
      description: 'Generate AI image.',
      parameters: { type: 'object', properties: { prompt: { type: 'string' } }, required: ['prompt'] }
    },
    execute: (args: any) => ({ url: `https://image.pollinations.ai/prompt/${encodeURIComponent(args.prompt)}?width=1024&height=768` })
  },
  GetNews: {
    type: 'function',
    function: {
      name: 'GetNews',
      description: 'Get latest news using Serper.',
      parameters: { type: 'object', properties: { query: { type: 'string' } }, required: ['query'] }
    },
    execute: async (args: any) => {
      const q = args.query || '';
      try {
        const r = await fetch('https://google.serper.dev/news', {
          method: 'POST',
          headers: { 'X-API-KEY': SERPER_API_KEY, 'Content-Type': 'application/json' },
          body: JSON.stringify({ q })
        });
        if (!r.ok) throw new Error('Serper returned ' + r.status);
        const d = await r.json();
        const news = (d.news || []).slice(0, 8).map((n: any) => `ARTICLE: ${n.title}\nSOURCE: ${n.source}\nLINK: ${n.link}\nDATE: ${n.date}`).join('\n\n');
        return `LATEST_NEWS_RESULTS:\n${news}`;
      } catch (e1: any) {
        try {
          const url = `https://searx.ro/search?q=${encodeURIComponent(q + ' news')}&format=json`;
          const r2 = await fetch(url);
          const d2 = await r2.json();
          const results = (d2.results || []).slice(0, 5).map((res: any) => ({ title: res.title, url: res.url, content: res.content }));
          return JSON.stringify({ results });
        } catch (e2: any) {
          console.warn("Serper and SearXNG failed for GetNews, falling back to DDG Lite Scraper...", e2.message);
          return scrapeDuckDuckGoLite(q + ' news');
        }
      }
    }
  },
  ImageSearch: {
    type: 'function',
    function: {
      name: 'ImageSearch',
      description: 'Search for images via Serper.',
      parameters: { type: 'object', properties: { query: { type: 'string' } }, required: ['query'] }
    },
    execute: async (args: any) => {
      const q = args.query || '';
      try {
        const r = await fetch('https://google.serper.dev/images', {
          method: 'POST',
          headers: { 'X-API-KEY': SERPER_API_KEY, 'Content-Type': 'application/json' },
          body: JSON.stringify({ q })
        });
        const d = await r.json();
        return JSON.stringify({ images: (d.images || []).slice(0, 10).map((i: any) => ({ title: i.title, imageUrl: i.imageUrl, source: i.source })) });
      } catch (e: any) { return JSON.stringify({ error: e.message }); }
    }
  },

  SubdomainScanner: {
    type: 'function',
    function: {
      name: 'SubdomainScanner',
      description: 'Scan subdomains using HackerTarget.',
      parameters: { type: 'object', properties: { domain: { type: 'string' } }, required: ['domain'] }
    },
    execute: async (args: any) => {
      try {
        const r = await fetch(`https://api.hackertarget.com/hostsearch/?q=${encodeURIComponent(args.domain || '')}`);
        const text = await r.text();
        return JSON.stringify({ result: text });
      } catch (e: any) { return JSON.stringify({ error: e.message }); }
    }
  },
  CryptoPrices: {
    type: 'function',
    function: {
      name: 'CryptoPrices',
      description: 'Get current price of cryptocurrencies (comma separated ids like bitcoin,ethereum).',
      parameters: { type: 'object', properties: { ids: { type: 'string' } }, required: ['ids'] }
    },
    execute: async (args: any) => {
      try {
        const r = await fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${encodeURIComponent(args.ids || '')}&vs_currencies=usd,eur`);
        return JSON.stringify(await r.json());
      } catch (e: any) { return JSON.stringify({ error: e.message }); }
    }
  },
  StockPrices: {
    type: 'function',
    function: {
      name: 'StockPrices',
      description: 'Get stock prices for a symbol (like AAPL) via Yahoo Finance.',
      parameters: { type: 'object', properties: { symbol: { type: 'string' } }, required: ['symbol'] }
    },
    execute: async (args: any) => {
      try {
        const r = await fetch(`https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(args.symbol || '')}`);
        const d = await r.json();
        const meta = d.chart?.result?.[0]?.meta;
        if (meta) {
          return JSON.stringify({ symbol: meta.symbol, currency: meta.currency, regularMarketPrice: meta.regularMarketPrice, previousClose: meta.previousClose });
        }
        return JSON.stringify({ error: "No data found" });
      } catch (e: any) { return JSON.stringify({ error: e.message }); }
    }
  },
  OpenSearchDiscovery: {
    type: 'function',
    function: {
      name: 'OpenSearchDiscovery',
      description: 'Discover OpenSearch endpoints from an OpenSearch Description XML document.',
      parameters: { type: 'object', properties: { url: { type: 'string' } }, required: ['url'] }
    },
    execute: async (args: any) => {
      try {
        const r = await fetch(args.url || '');
        const text = await r.text();
        return JSON.stringify({ xml: text.substring(0, 3000) });
      } catch (e: any) { return JSON.stringify({ error: e.message }); }
    }
  },
  StoreMemory: {
    type: 'function',
    function: {
      name: 'StoreMemory',
      description: 'Store massive data chunks or scraped text into ephemeral memory space to prevent context bloat. You should use this to save large web pages or documents.',
      parameters: {
        type: 'object',
        properties: {
          id: { type: 'string', description: 'A unique identifier (uuid or simple text like "history-1")' },
          content: { type: 'string', description: 'The text content to store' }
        },
        required: ['id', 'content']
      }
    },
    execute: async (args: any) => {
      const { id, content } = args;
      if (!id || !content) return 'Error: ID and Content required';

      // Try to store in MCP Server if running, otherwise use LocalStorage block
      try {
        const { mcpService } = await import('./mcp');
        if (mcpService.isConnected) {
          await mcpService.executeTool('store_memory', { id, content });
          return `Saved to Central MCP Server seamlessly under ID: ${id}`;
        }
      } catch (e) { }

      // Fallback: Store locally
      if (typeof window !== 'undefined') {
        const localMem = JSON.parse(sessionStorage.getItem('wormgpt_agentic_memory') || '{}');
        localMem[id] = content;
        sessionStorage.setItem('wormgpt_agentic_memory', JSON.stringify(localMem));
        return `Saved to Local Session Memory seamlessly under ID: ${id}`;
      }
      return `Error saving to memory under ID: ${id}`;
    }
  },
  ReadMemory: {
    type: 'function',
    function: {
      name: 'ReadMemory',
      description: 'Read the full text content of a previously stored memory ID',
      parameters: {
        type: 'object',
        properties: {
          id: { type: 'string', description: 'The unique identifier previously used in StoreMemory' }
        },
        required: ['id']
      }
    },
    execute: async (args: any) => {
      const { id } = args;
      if (!id) return 'Error: ID required';

      // Try to read from MCP Server if running
      try {
        const { mcpService } = await import('./mcp');
        if (mcpService.isConnected) {
          return await mcpService.executeTool('read_memory', { id });
        }
      } catch (e) { }

      // Fallback: Read locally
      if (typeof window !== 'undefined') {
        const localMem = JSON.parse(sessionStorage.getItem('wormgpt_agentic_memory') || '{}');
        if (localMem[id]) return localMem[id];
      }
      return `Error: Memory ID ${id} not found in Local or Remote Memory`;
    }
  },
  GitHubTrending: {
    type: 'function',
    function: {
      name: 'GitHubTrending',
      description: 'Get real-time trending repositories from GitHub. Specify language or leave empty for all.',
      parameters: { type: 'object', properties: { language: { type: 'string' }, since: { type: 'string', enum: ['daily', 'weekly', 'monthly'], default: 'daily' } } }
    },
    execute: async (args: any) => {
      const lang = args.language || '';
      const since = args.since || 'daily';
      const url = `https://github.com/trending/${lang}?since=${since}`;
      try {
        const r = await fetch(`https://r.jina.ai/${encodeURIComponent(url)}`);
        if (!r.ok) throw new Error('Jina returned ' + r.status);
        const text = await r.text();
        return JSON.stringify({ trending: text.substring(0, 15000), source: 'GitHub Scraper' });
      } catch (e: any) {
        return JSON.stringify({ error: "Trending data unavailable via scraper. Falling back to search...", fallback: `https://duckduckgo.com/?q=trending+github+repositories+${lang}` });
      }
    }
  },
  WhoisLookup: {
    type: 'function',
    function: {
      name: 'WhoisLookup',
      description: 'Perform a WHOIS lookup on a domain or IP.',
      parameters: { type: 'object', properties: { target: { type: 'string' } }, required: ['target'] }
    },
    execute: async (args: any) => {
      try {
        const r = await fetch(`https://api.hackertarget.com/whois/?q=${encodeURIComponent(args.target || '')}`);
        const text = await r.text();
        return JSON.stringify({ result: text });
      } catch (e: any) { return JSON.stringify({ error: e.message }); }
    }
  },

  ReverseDNS: {
    type: 'function',
    function: {
      name: 'ReverseDNS',
      description: 'Perform a Reverse DNS lookup on an IP.',
      parameters: { type: 'object', properties: { ip: { type: 'string' } }, required: ['ip'] }
    },
    execute: async (args: any) => {
      try {
        const r = await fetch(`https://api.hackertarget.com/reversedns/?q=${encodeURIComponent(args.ip || '')}`);
        const text = await r.text();
        return JSON.stringify({ result: text });
      } catch (e: any) { return JSON.stringify({ error: e.message }); }
    }
  },

  DNSLookup: {
    type: 'function',
    function: {
      name: 'DNSLookup',
      description: 'Perform a comprehensive DNS query (A, MX, TXT, etc.) using Google DNS.',
      parameters: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          type: { type: 'string', default: 'A' }
        },
        required: ['name']
      }
    },
    execute: async (args: any) => {
      try {
        const r = await fetch(`https://dns.google/resolve?name=${encodeURIComponent(args.name)}&type=${args.type}`);
        return JSON.stringify(await r.json());
      } catch (e: any) { return JSON.stringify({ error: e.message }); }
    }
  },
  IPGeolocation: {
    type: 'function',
    function: {
      name: 'IPGeolocation',
      description: 'Get location and ISP metadata for an IP address.',
      parameters: { type: 'object', properties: { ip: { type: 'string' } }, required: ['ip'] }
    },
    execute: async (args: any) => {
      try {
        const r = await fetch(`http://ip-api.com/json/${encodeURIComponent(args.ip)}?fields=status,message,country,countryCode,region,regionName,city,zip,lat,lon,timezone,isp,org,as,query`);
        return JSON.stringify(await r.json());
      } catch (e: any) { return JSON.stringify({ error: e.message }); }
    }
  },
  CryptoPrice: {
    type: 'function',
    function: {
      name: 'CryptoPrice',
      description: 'Get real-time cryptocurrency price in USD.',
      parameters: { type: 'object', properties: { coin: { type: 'string', description: 'Coin id (e.g. bitcoin, ethereum, solana)' } }, required: ['coin'] }
    },
    execute: async (args: any) => {
      try {
        const r = await fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${args.coin}&vs_currencies=usd`);
        const d = await r.json();
        return JSON.stringify(d);
      } catch (e: any) { return JSON.stringify({ error: e.message }); }
    }
  },
  BGPInfo: {
    type: 'function',
    function: {
      name: 'BGPInfo',
      description: 'Fetch BGP routing information for an IP address.',
      parameters: { type: 'object', properties: { ip: { type: 'string' } }, required: ['ip'] }
    },
    execute: async (args: any) => {
      try {
        const r = await fetch(`https://api.bgpview.io/ip/${encodeURIComponent(args.ip)}`);
        return JSON.stringify(await r.json());
      } catch (e: any) { return JSON.stringify({ error: e.message }); }
    }
  },
  MultiRegionalSearch: {
    type: 'function',
    function: {
      name: 'MultiRegionalSearch',
      description: 'Perform a deep intelligence search across Chinese, Russian, and Taiwanese search engines, returning English results.',
      parameters: { type: 'object', properties: { query: { type: 'string' } }, required: ['query'] }
    },
    execute: async (args: any) => {
      const q = args.query || '';
      const regions = [
        { name: 'China (Simplified)', sl: 'zh-CN', engine: 'SearchWeb' },
        { name: 'Russia', sl: 'ru', engine: 'YandexSearch' },
        { name: 'Taiwan (Traditional)', sl: 'zh-TW', engine: 'SearchWeb' }
      ];

      let results: any[] = [];
      for (const reg of regions) {
        try {
          const transQ = await translateGoogle(q, 'en', reg.sl);
          let raw: any;
          if (reg.engine === 'YandexSearch') {
            raw = await ATTACHED_TOOLS.YandexSearch.execute({ query: transQ });
          } else {
            raw = await ATTACHED_TOOLS.SearchWeb.execute({ query: transQ + (reg.sl === 'zh-TW' ? ' site:.tw' : ' site:.cn') });
          }

          results.push(`\n### REGION: ${reg.name}\n${raw}`);
        } catch (e) { }
      }

      const combined = results.join('\n---\n');
      return `MULTI_REGIONAL_RESULTS:\n${combined}\n\nNOTE: Above results are in source languages. Translating identifying markers to English...`;
    }
  },
  YouTubeTranscript: {
    type: 'function',
    function: {
      name: 'YouTubeTranscript',
      description: 'Elite: Extract transcript from a YouTube video for deep analysis.',
      parameters: { type: 'object', properties: { videoUrl: { type: 'string' } }, required: ['videoUrl'] }
    },
    execute: async (args: any) => {
      try {
        // Jina Reader handles YouTube transcripts very well by parsing the page
        const r = await fetch(`https://r.jina.ai/${encodeURIComponent(args.videoUrl)}`);
        const text = await r.text();
        return text.substring(0, 50000);
      } catch (e: any) { return JSON.stringify({ error: `Transcript extraction failed: ${e.message}` }); }
    }
  },
  AdvancedPDFScraper: {
    type: 'function',
    function: {
      name: 'AdvancedPDFScraper',
      description: 'Elite: High-fidelity PDF-to-Markdown conversion.',
      parameters: { type: 'object', properties: { pdfUrl: { type: 'string' } }, required: ['pdfUrl'] }
    },
    execute: async (args: any) => {
      try {
        // Jina Reader is the gold standard for PDF-to-Markdown currently
        const r = await fetch(`https://r.jina.ai/${encodeURIComponent(args.pdfUrl)}`);
        return (await r.text()).substring(0, 50000);
      } catch (e: any) { return JSON.stringify({ error: `PDF scraping failed: ${e.message}` }); }
    }
  },
  EliteWebScraper: {
    type: 'function',
    function: {
      name: 'EliteWebScraper',
      description: 'Elite: Undetectable scraper with advanced browser rendering and proxy rotation.',
      parameters: { type: 'object', properties: { url: { type: 'string' } }, required: ['url'] }
    },
    execute: async (args: any) => {
      try {
        const r = await fetch('https://api.firecrawl.dev/v1/scrape', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${FIRECRAWL_API_KEY}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: args.url, formats: ['markdown'], actions: [{ type: 'wait', milliseconds: 2000 }] })
        });
        const d = await r.json();
        return JSON.stringify(d.data || d);
      } catch (e: any) { return await ATTACHED_TOOLS.WebCrawler.execute({ url: args.url }); }
    }
  },
  RiskScanner: {
    type: 'function',
    function: {
      name: 'RiskScanner',
      description: 'Elite: Unified cyber reconnaissance and risk assessment for a target domain or IP.',
      parameters: { type: 'object', properties: { target: { type: 'string' } }, required: ['target'] }
    },
    execute: async (args: any) => {
      const target = args.target;
      const isIP = /^[0-9.]+$/.test(target);
      const results: any = {};
      try {
        if (isIP) {
          results.geo = await ATTACHED_TOOLS.IPGeolocation.execute({ ip: target });
          results.bgp = await ATTACHED_TOOLS.BGPInfo.execute({ ip: target });
          results.reverseDns = await ATTACHED_TOOLS.ReverseDNS.execute({ ip: target });
        } else {
          results.whois = await ATTACHED_TOOLS.WhoisLookup.execute({ domain: target });
          results.dns = await ATTACHED_TOOLS.DNSLookup.execute({ name: target });
        }
        results.dorks = await ATTACHED_TOOLS.DorkBuilder.execute({ target, type: 'ConfigLeaks' });
      } catch (e) { }
      return `RISK_SCAN_REPORT for ${target}:\n${JSON.stringify(results, null, 2)}`;
    }
  },
  SearchExtreme: {
    type: 'function',
    function: {
      name: 'SearchExtreme',
      description: 'Elite: God-tier multi-engine search (Serper + Jina + DDG) with combined intelligence.',
      parameters: { type: 'object', properties: { query: { type: 'string' } }, required: ['query'] }
    },
    execute: async (args: any) => {
      const q = args.query;
      const [serper, jina] = await Promise.all([
        ATTACHED_TOOLS.SearchWeb.execute({ query: q }),
        ATTACHED_TOOLS.JinaSearch.execute({ query: q })
      ]);
      return `EXTREME_INTEL_REPORT:\n\n### WEB_INDEX:\n${serper}\n\n### NEURAL_INSIGHTS:\n${jina}`;
    }
  },

  // ─── ELITE EXPANSION: PHASE 4 ───────────────────────────────────────────────

  CodeExecutor: {
    type: 'function',
    function: {
      name: 'CodeExecutor',
      description: 'Execute code in 60+ languages in a secure sandboxed environment (Piston API). Returns stdout, stderr, and exit code. Perfect for running Python, JS, Bash, Go, Rust, etc.',
      parameters: {
        type: 'object',
        properties: {
          language: { type: 'string', description: 'Language name (e.g. python, javascript, bash, rust, go, cpp, java, c)' },
          code: { type: 'string', description: 'The source code to execute' },
          stdin: { type: 'string', description: 'Optional standard input for the program' }
        },
        required: ['language', 'code']
      }
    },
    execute: async (args: any) => {
      try {
        // Get available runtimes first to map language name to alias
        const rtRes = await fetch('https://emkc.org/api/v2/piston/runtimes');
        const runtimes: any[] = await rtRes.json();
        const lang = (args.language || 'python').toLowerCase();
        const rt = runtimes.find((r: any) => r.language === lang || r.aliases?.includes(lang));
        if (!rt) return JSON.stringify({ error: `Language '${lang}' not found. Try: python, javascript, bash, go, rust, cpp, java.` });
        const r = await fetch('https://emkc.org/api/v2/piston/execute', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            language: rt.language,
            version: rt.version,
            files: [{ content: args.code }],
            stdin: args.stdin || ''
          })
        });
        const d = await r.json();
        const run = d.run || {};
        return JSON.stringify({
          stdout: run.stdout || '',
          stderr: run.stderr || '',
          output: run.output || '',
          exitCode: run.code ?? 0,
          language: rt.language,
          version: rt.version
        });
      } catch (e: any) { return JSON.stringify({ error: `Code execution failed: ${e.message}` }); }
    }
  },

  JDoodleCompiler: {
    type: 'function',
    function: {
      name: 'JDoodleCompiler',
      description: 'Execute code in 88+ programming languages (Python, NodeJS, C++, Java, Go, Rust, etc.) using JDoodle API. Specify language code (e.g., nodejs, python3, cpp17, java, c99, go, rust, bash).',
      parameters: {
        type: 'object',
        properties: {
          language: { type: 'string', description: 'Language code: python3, nodejs, cpp17, java, c99, go, rust, csharp, ruby, php, swift, bash, sql' },
          script: { type: 'string', description: 'The source code to execute' },
          stdin: { type: 'string', description: 'Optional standard input' },
          versionIndex: { type: 'string', description: 'Compiler version index (default to "0" or "5" for latest)' }
        },
        required: ['language', 'script']
      }
    },
    execute: async (args: any) => {
      try {
        const clientId = '86d0698783deb95976bfe311ceacc214';
        const clientSecret = '7b128d99887264359848ce2ec1e1ffad247afadc03b1f2a0a4a1737e71ad7ed';
        
        // Auto-correct common aliases mapping to JDoodle codes
        let langCode = (args.language || 'python3').toLowerCase();
        if (langCode === 'python') langCode = 'python3';
        if (langCode === 'javascript' || langCode === 'js' || langCode === 'node') langCode = 'nodejs';
        if (langCode === 'c++' || langCode === 'cpp') langCode = 'cpp17';
        if (langCode === 'c') langCode = 'c99';

        const r = await fetch('https://api.jdoodle.com/v1/execute', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            clientId,
            clientSecret,
            script: args.script,
            stdin: args.stdin || '',
            language: langCode,
            versionIndex: args.versionIndex || '0'
          })
        });
        
        const d = await r.json();
        return JSON.stringify({
          output: d.output || '',
          statusCode: d.statusCode,
          memory: d.memory,
          cpuTime: d.cpuTime,
          error: d.error
        });
      } catch (e: any) {
        return JSON.stringify({ error: `JDoodle execution failed: ${e.message}` });
      }
    }
  },

  TextTranslator: {
    type: 'function',
    function: {
      name: 'TextTranslator',
      description: 'Translate text between any languages using MyMemory API (free). Supports 70+ languages. Auto-detects source language.',
      parameters: {
        type: 'object',
        properties: {
          text: { type: 'string', description: 'Text to translate' },
          target: { type: 'string', description: 'Target language code (e.g. es, fr, de, ja, zh, ar, ru, hi, pt)' },
          source: { type: 'string', description: 'Source language code (default: autodetect)' }
        },
        required: ['text', 'target']
      }
    },
    execute: async (args: any) => {
      try {
        const langPair = `${args.source || 'autodetect'}|${args.target}`;
        const r = await fetch(`https://api.mymemory.translated.net/get?q=${encodeURIComponent(args.text)}&langpair=${langPair}`);
        const d = await r.json();
        if (d.responseStatus === 200) {
          return JSON.stringify({
            translated: d.responseData.translatedText,
            confidence: d.responseData.match,
            source: args.source || 'auto-detected',
            target: args.target,
            matches: (d.matches || []).slice(0, 3).map((m: any) => ({ text: m.translation, quality: m.quality }))
          });
        }
        return JSON.stringify({ error: d.responseDetails || 'Translation failed' });
      } catch (e: any) { return JSON.stringify({ error: e.message }); }
    }
  },

  URLSafetyCheck: {
    type: 'function',
    function: {
      name: 'URLSafetyCheck',
      description: 'Check if a URL is safe or malicious using urlscan.io and Google Safe Browsing-compatible APIs. Returns threat intelligence report.',
      parameters: {
        type: 'object',
        properties: { url: { type: 'string', description: 'URL to check for malware/phishing' } },
        required: ['url']
      }
    },
    execute: async (args: any) => {
      try {
        // urlscan.io search (no key needed for queries)
        const cleanUrl = args.url.replace(/^https?:\/\//, '').split('/')[0];
        const r = await fetch(`https://urlscan.io/api/v1/search/?q=domain:${encodeURIComponent(cleanUrl)}&size=3`, {
          headers: { 'User-Agent': 'WormGPT-Security-Agent/1.0' }
        });
        const d = await r.json();
        const results = (d.results || []).map((res: any) => ({
          url: res.page?.url,
          domain: res.page?.domain,
          ip: res.page?.ip,
          country: res.page?.country,
          verdicts: res.verdicts || {},
          screenshot: res.screenshot,
          date: res.task?.time
        }));
        // Also check via HackerTarget geoip for quick domain intel
        const htRes = await fetch(`https://api.hackertarget.com/nmap/?q=${cleanUrl}`);
        const htText = await htRes.text();
        return JSON.stringify({
          target: args.url,
          domain: cleanUrl,
          urlscan_results: results.slice(0, 3),
          port_scan: htText.substring(0, 2000),
          verdict: results.some((r: any) => r.verdicts?.overall?.malicious) ? '⚠️ MALICIOUS' : results.length > 0 ? '✅ SCANNED - REVIEW RESULTS' : 'ℹ️ NO PRIOR SCANS FOUND'
        });
      } catch (e: any) { return JSON.stringify({ error: e.message }); }
    }
  },

  RegexTester: {
    type: 'function',
    function: {
      name: 'RegexTester',
      description: 'Test a regular expression against input text. Returns all matches, groups, and match positions. Runs locally with no API calls.',
      parameters: {
        type: 'object',
        properties: {
          pattern: { type: 'string', description: 'The regex pattern (without slashes)' },
          flags: { type: 'string', description: 'Regex flags: g (global), i (case-insensitive), m (multiline). Default: gi' },
          text: { type: 'string', description: 'The text to test against' }
        },
        required: ['pattern', 'text']
      }
    },
    execute: (args: any) => {
      try {
        const flags = args.flags || 'gi';
        const regex = new RegExp(args.pattern, flags);
        const matches: any[] = [];
        let match;
        const input = args.text;
        if (flags.includes('g')) {
          while ((match = regex.exec(input)) !== null) {
            matches.push({ match: match[0], groups: match.slice(1), index: match.index, input: input.substring(Math.max(0, match.index - 20), match.index + match[0].length + 20) });
            if (matches.length >= 50) break;
          }
        } else {
          match = regex.exec(input);
          if (match) matches.push({ match: match[0], groups: match.slice(1), index: match.index });
        }
        return JSON.stringify({ pattern: args.pattern, flags, total_matches: matches.length, matches });
      } catch (e: any) { return JSON.stringify({ error: `Invalid regex: ${e.message}` }); }
    }
  },

  HashGenerator: {
    type: 'function',
    function: {
      name: 'HashGenerator',
      description: 'Generate cryptographic hashes (SHA-1, SHA-256, SHA-512) for any text using the browser Web Crypto API. No external API needed.',
      parameters: {
        type: 'object',
        properties: {
          text: { type: 'string', description: 'Text to hash' },
          algorithm: { type: 'string', enum: ['SHA-1', 'SHA-256', 'SHA-512'], default: 'SHA-256' }
        },
        required: ['text']
      }
    },
    execute: async (args: any) => {
      try {
        const algo = args.algorithm || 'SHA-256';
        const encoder = new TextEncoder();
        const data = encoder.encode(args.text);
        const hashBuffer = await crypto.subtle.digest(algo, data);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        const hex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
        // Also compute all hashes for convenience
        const results: any = { [algo]: hex };
        if (algo !== 'SHA-256') {
          const buf256 = await crypto.subtle.digest('SHA-256', data);
          results['SHA-256'] = Array.from(new Uint8Array(buf256)).map(b => b.toString(16).padStart(2, '0')).join('');
        }
        return JSON.stringify({ input: args.text.substring(0, 100), hashes: results });
      } catch (e: any) { return JSON.stringify({ error: e.message }); }
    }
  },

  Base64Tool: {
    type: 'function',
    function: {
      name: 'Base64Tool',
      description: 'Encode or decode text using Base64. Also supports URL-safe Base64. Runs locally with no API calls.',
      parameters: {
        type: 'object',
        properties: {
          text: { type: 'string', description: 'The text to encode or decode' },
          action: { type: 'string', enum: ['encode', 'decode'], description: 'encode or decode' },
          urlsafe: { type: 'boolean', description: 'Use URL-safe Base64 (replaces +/ with -_)' }
        },
        required: ['text', 'action']
      }
    },
    execute: (args: any) => {
      try {
        let result: string;
        if (args.action === 'encode') {
          result = btoa(unescape(encodeURIComponent(args.text)));
          if (args.urlsafe) result = result.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
        } else {
          let input = args.text;
          if (args.urlsafe) input = input.replace(/-/g, '+').replace(/_/g, '/');
          result = decodeURIComponent(escape(atob(input)));
        }
        return JSON.stringify({ action: args.action, input: args.text.substring(0, 200), result, length: result.length });
      } catch (e: any) { return JSON.stringify({ error: `Base64 ${args.action} failed: ${e.message}` }); }
    }
  },

  LinkExtractor: {
    type: 'function',
    function: {
      name: 'LinkExtractor',
      description: 'Extract ALL hyperlinks from a webpage. Returns internal and external links with anchor text. Great for OSINT and crawling recon.',
      parameters: {
        type: 'object',
        properties: {
          url: { type: 'string', description: 'URL of the page to extract links from' },
          filter: { type: 'string', description: 'Optional keyword to filter links (e.g. "admin", "api", "login")' }
        },
        required: ['url']
      }
    },
    execute: async (args: any) => {
      try {
        const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(args.url)}`;
        const r = await fetch(proxyUrl);
        const d = await r.json();
        const html = d.contents || '';
        const linkRegex = /href=["']([^"'#\s]+)["'][^>]*>([^<]*)</gi;
        const links: any[] = [];
        let match;
        const baseUrl = new URL(args.url);
        while ((match = linkRegex.exec(html)) !== null && links.length < 200) {
          const href = match[1];
          const text = match[2].trim();
          if (!href || href.startsWith('javascript:') || href.startsWith('mailto:') || href.startsWith('tel:')) continue;
          let fullUrl: string;
          try { fullUrl = href.startsWith('http') ? href : new URL(href, args.url).href; } catch { continue; }
          const isInternal = new URL(fullUrl).hostname === baseUrl.hostname;
          if (!args.filter || fullUrl.includes(args.filter) || text.includes(args.filter)) {
            links.push({ url: fullUrl, text: text || '[no text]', type: isInternal ? 'internal' : 'external' });
          }
        }
        const internal = links.filter(l => l.type === 'internal').length;
        const external = links.filter(l => l.type === 'external').length;
        return JSON.stringify({ source: args.url, total: links.length, internal, external, links: links.slice(0, 100) });
      } catch (e: any) { return JSON.stringify({ error: e.message }); }
    }
  },

  EmailFinder: {
    type: 'function',
    function: {
      name: 'EmailFinder',
      description: 'Find all email addresses on a webpage or from a domain. Useful for OSINT, recon, and contact discovery.',
      parameters: {
        type: 'object',
        properties: {
          target: { type: 'string', description: 'URL or domain to scrape for emails (e.g. https://example.com or example.com)' }
        },
        required: ['target']
      }
    },
    execute: async (args: any) => {
      try {
        let url = args.target;
        if (!url.startsWith('http')) url = 'https://' + url;
        // Try Jina first (handles JS rendering)
        const r = await fetch(`https://r.jina.ai/${encodeURIComponent(url)}`);
        const text = await r.text();
        const emailRegex = /[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/g;
        const rawEmails = text.match(emailRegex) || [];
        // Deduplicate and filter common false positives
        const emails = [...new Set(rawEmails)].filter(e =>
          !e.includes('example.com') && !e.includes('sentry.io') && !e.includes('.png') && !e.includes('.jpg') && e.length < 80
        );
        return JSON.stringify({ source: args.target, found: emails.length, emails: emails.slice(0, 50) });
      } catch (e: any) { return JSON.stringify({ error: e.message }); }
    }
  },

  TwitterSearch: {
    type: 'function',
    function: {
      name: 'TwitterSearch',
      description: 'Search Twitter/X posts, find user tweets, trends, and viral content. Uses Serper intelligence.',
      parameters: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'Search query (e.g. "#AI news", "@elonmusk", "site:twitter.com topic")' },
          type: { type: 'string', enum: ['tweets', 'users', 'trending'], description: 'Search type', default: 'tweets' }
        },
        required: ['query']
      }
    },
    execute: async (args: any) => {
      const q = args.query;
      const type = args.type || 'tweets';
      try {
        // Search Twitter via Serper (most reliable)
        const siteQ = type === 'users' ? `site:twitter.com ${q}` : `site:twitter.com/*/status ${q}`;
        const r = await fetch('https://google.serper.dev/search', {
          method: 'POST',
          headers: { 'X-API-KEY': SERPER_API_KEY, 'Content-Type': 'application/json' },
          body: JSON.stringify({ q: siteQ, num: 10 })
        });
        const d = await r.json();
        const results = (d.organic || []).slice(0, 8).map((res: any) => ({
          title: res.title,
          snippet: res.snippet,
          url: res.link,
          date: res.date
        }));
        // Fallback: nitter public instance search
        if (results.length === 0) {
          const nitter = await fetch(`https://r.jina.ai/${encodeURIComponent(`https://nitter.net/search?q=${encodeURIComponent(q)}&f=tweets`)}`);
          const txt = await nitter.text();
          return JSON.stringify({ results: [], raw_nitter: txt.substring(0, 5000), source: 'Nitter' });
        }
        return JSON.stringify({ query: q, type, total: results.length, results, source: 'Serper/Twitter' });
      } catch (e: any) { return JSON.stringify({ error: e.message }); }
    }
  },

  FirecrawlScrape: {
    type: 'function',
    function: {
      name: 'FirecrawlScrape',
      description: 'Scrapes a URL and returns clean markdown content using Firecrawl API.',
      parameters: {
        type: 'object',
        properties: {
          url: { type: 'string', description: 'URL to scrape' }
        },
        required: ['url']
      }
    },
    execute: async (args: any) => {
      try {
        const res = await fetch('https://api.firecrawl.dev/v1/scrape', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer fc-588a211d26f54070a690ddda5a40b0ea`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ url: args.url, formats: ['markdown'] })
        });
        const data = await res.json();
        if (!data.success) return JSON.stringify({ error: data.error || 'Failed to scrape' });
        return JSON.stringify({ markdown: data.data?.markdown?.substring(0, 50000) });
      } catch (e: any) { return JSON.stringify({ error: e.message }); }
    }
  },

  FirecrawlCrawl: {
    type: 'function',
    function: {
      name: 'FirecrawlCrawl',
      description: 'Crawls a website starting from a URL and returns markdown using Firecrawl. Max limit 10 pages.',
      parameters: {
        type: 'object',
        properties: {
          url: { type: 'string', description: 'Base URL to crawl' },
          limit: { type: 'number', description: 'Maximum number of pages to crawl (default 5, max 10)' }
        },
        required: ['url']
      }
    },
    execute: async (args: any) => {
      try {
        const res = await fetch('https://api.firecrawl.dev/v1/crawl', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer fc-588a211d26f54070a690ddda5a40b0ea`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ url: args.url, limit: Math.min(args.limit || 5, 10), scrapeOptions: { formats: ['markdown'] } })
        });
        const data = await res.json();
        // Returns a crawl ID, we must poll realistically. But for an AI tool, async polling is hard.
        // We will just return the job ID so the AI can check it later, or do a synchronous map tool.
        return JSON.stringify(data);
      } catch (e: any) { return JSON.stringify({ error: e.message }); }
    }
  },

  FirecrawlMap: {
    type: 'function',
    function: {
      name: 'FirecrawlMap',
      description: 'Maps an entire domain and returns a list of URLs and site structure.',
      parameters: {
        type: 'object',
        properties: {
          url: { type: 'string', description: 'URL to map' },
          search: { type: 'string', description: 'Optional search query to map specifically' }
        },
        required: ['url']
      }
    },
    execute: async (args: any) => {
      try {
        const body: any = { url: args.url };
        if (args.search) body.search = args.search;
        const res = await fetch('https://api.firecrawl.dev/v1/map', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer fc-588a211d26f54070a690ddda5a40b0ea`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(body)
        });
        const data = await res.json();
        return JSON.stringify(data);
      } catch (e: any) { return JSON.stringify({ error: e.message }); }
    }
  },

  ProductHuntFetch: {
    type: 'function',
    function: {
      name: 'ProductHuntFetch',
      description: 'Get trending products and launches from Product Hunt. Great for market research and tech discovery.',
      parameters: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'Optional search query (e.g. "AI tools", "developer tools"). Leave empty for daily trending.' },
          type: { type: 'string', enum: ['trending', 'newest'], description: 'Type of products to fetch', default: 'trending' }
        }
      }
    },
    execute: async (args: any) => {
      try {
        const url = args.query
          ? `https://www.producthunt.com/search?q=${encodeURIComponent(args.query)}`
          : 'https://www.producthunt.com/';
        const r = await fetch(`https://r.jina.ai/${encodeURIComponent(url)}`);
        const text = await r.text();
        return JSON.stringify({ source: url, content: text.substring(0, 15000) });
      } catch (e: any) { return JSON.stringify({ error: e.message }); }
    }
  },

  PasteCreate: {
    type: 'function',
    function: {
      name: 'PasteCreate',
      description: 'Create a public text paste and get a shareable URL. Useful for sharing code, notes, or large outputs with users. Uses dpaste.org (free, no key).',
      parameters: {
        type: 'object',
        properties: {
          content: { type: 'string', description: 'Text content to paste' },
          title: { type: 'string', description: 'Optional title for the paste' },
          syntax: { type: 'string', description: 'Syntax highlighting (e.g. python, javascript, text, bash, json). Default: text' },
          expires: { type: 'number', description: 'Expiry in seconds from now (default: 604800 = 7 days). Use -1 for never.' }
        },
        required: ['content']
      }
    },
    execute: async (args: any) => {
      try {
        const body = new URLSearchParams({
          content: args.content,
          syntax: args.syntax || 'text',
          title: args.title || 'WormGPT Paste',
          expiry_days: String(Math.ceil((args.expires || 604800) / 86400))
        });
        const r = await fetch('https://dpaste.org/api/', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: body.toString()
        });
        const url = await r.text();
        return JSON.stringify({ paste_url: url.trim(), content_preview: args.content.substring(0, 200), syntax: args.syntax || 'text' });
      } catch (e: any) { return JSON.stringify({ error: e.message }); }
    }
  },

  EmailReputation: {
    type: 'function',
    function: {
      name: 'EmailReputation',
      description: 'Check the reputation, deliverability, and risks (like disposable, catch-all, data breaches) associated with an email address. Powered by Abstract API.',
      parameters: {
        type: 'object',
        properties: {
          email: { type: 'string', description: 'The email address to analyze' }
        },
        required: ['email']
      }
    },
    execute: async (args: any) => {
      try {
        const r = await fetch(`https://emailreputation.abstractapi.com/v1/?api_key=4d04a9f9dbce4285ac1cfe0b94878a99&email=${encodeURIComponent(args.email)}`);
        const d = await r.json();
        return JSON.stringify(d);
      } catch (e: any) { return JSON.stringify({ error: `Email check failed: ${e.message}` }); }
    }
  },

  AbstractScraper: {
    type: 'function',
    function: {
      name: 'AbstractScraper',
      description: 'Scrape the raw HTML content of any URL bypassing basic protections using the Abstract Web Scraping API.',
      parameters: {
        type: 'object',
        properties: {
          url: { type: 'string', description: 'The target URL to scrape' }
        },
        required: ['url']
      }
    },
    execute: async (args: any) => {
      try {
        const r = await fetch(`https://scrape.abstractapi.com/v1/?api_key=4d04a9f9dbce4285ac1cfe0b94878a99&url=${encodeURIComponent(args.url)}`);
        const text = await r.text();
        return JSON.stringify({ url: args.url, content: text.substring(0, 50000) });
      } catch (e: any) { return JSON.stringify({ error: `AbstractScrape failed: ${e.message}` }); }
    }
  },

  CurrencyConverter: {
    type: 'function',
    function: {
      name: 'CurrencyConverter',
      description: 'Convert between 168+ fiat and crypto currencies using real-time exchange rates (Exchangerate.host / APILayer).',
      parameters: {
        type: 'object',
        properties: {
          from: { type: 'string', description: 'Source currency code (e.g. USD, EUR, BTC)' },
          to: { type: 'string', description: 'Target currency code (e.g. INR, GBP, ETH)' },
          amount: { type: 'number', description: 'Amount to convert' }
        },
        required: ['from', 'to', 'amount']
      }
    },
    execute: async (args: any) => {
      try {
        const r = await fetch(`https://api.exchangerate.host/convert?access_key=966dcb01923845d60c25297bb49e820f&from=${args.from.toUpperCase()}&to=${args.to.toUpperCase()}&amount=${args.amount}`);
        const d = await r.json();
        return JSON.stringify(d);
      } catch (e: any) { return JSON.stringify({ error: `Currency conversion failed: ${e.message}` }); }
    }
  },

  ScreenshotGenerator: {
    type: 'function',
    function: {
      name: 'ScreenshotGenerator',
      description: 'Generate high-quality website screenshots (PNG/JPEG) using Screenshotlayer API. Returns a URL to the captured image.',
      parameters: {
        type: 'object',
        properties: {
          url: { type: 'string', description: 'The URL of the website to screenshot' },
          fullpage: { type: 'boolean', description: 'Capture full page (true) or just viewport (false)' }
        },
        required: ['url']
      }
    },
    execute: async (args: any) => {
      try {
        const apiUrl = `https://api.screenshotlayer.com/api/capture?access_key=966dcb01923845d60c25297bb49e820f&url=${encodeURIComponent(args.url)}&fullpage=${args.fullpage ? 1 : 0}&viewport=1440x900`;
        // Screenshotlayer returns an image directly. We can't return binary, but we can return the direct URL 
        // that the user can click or the AI can embed as markdown ![Screenshot](url).
        return JSON.stringify({ 
          success: true, 
          image_url: apiUrl,
          markdown: `![Screenshot of ${args.url}](${apiUrl})`
        });
      } catch (e: any) { return JSON.stringify({ error: `Screenshot generation failed: ${e.message}` }); }
    }
  },

  FlightTracker: {
    type: 'function',
    function: {
      name: 'FlightTracker',
      description: 'Track real-time global flights, arrivals, departures, airline routes, and status using Aviationstack API.',
      parameters: {
        type: 'object',
        properties: {
          flight_iata: { type: 'string', description: 'Flight IATA code (e.g. AA1004)' },
          dep_iata: { type: 'string', description: 'Departure airport IATA code (e.g. JFK)' },
          arr_iata: { type: 'string', description: 'Arrival airport IATA code (e.g. LHR)' },
          flight_status: { type: 'string', description: 'Status: scheduled, active, landed, cancelled, incident, diverted' }
        }
      }
    },
    execute: async (args: any) => {
      try {
        const params = new URLSearchParams({ access_key: '966dcb01923845d60c25297bb49e820f' });
        if (args.flight_iata) params.append('flight_iata', args.flight_iata);
        if (args.dep_iata) params.append('dep_iata', args.dep_iata);
        if (args.arr_iata) params.append('arr_iata', args.arr_iata);
        if (args.flight_status) params.append('flight_status', args.flight_status);
        
        const r = await fetch(`https://api.aviationstack.com/v1/flights?${params.toString()}`);
        const d = await r.json();
        return JSON.stringify(d);
      } catch (e: any) { return JSON.stringify({ error: `Flight tracker failed: ${e.message}` }); }
    }
  },

  TempEmail: {
    type: 'function',
    function: {
      name: 'TempEmail',
      description: 'Create temporary email accounts, list messages, and read emails using smtp.dev API. Perfect for testing signups, email verifications, and reading receipts.',
      parameters: {
        type: 'object',
        properties: {
          action: { type: 'string', enum: ['create', 'list', 'read', 'delete', 'cleanup'], description: 'Action: create (new account), list (check inbox), read (read specific email), delete (delete specific email), cleanup (delete all emails)' },
          account_id: { type: 'string', description: 'Required for list and read' },
          mailbox_id: { type: 'string', description: 'Required for list and read (smtp.dev only)' },
          message_id: { type: 'string', description: 'Required for read' },
          password: { type: 'string', description: 'Required for list and read (Mail.tm only)' },
          address: { type: 'string', description: 'Required for list and read (Mail.tm only)' },
          provider: { type: 'string', enum: ['smtp.dev', 'mail.tm'], description: 'Specify provider if known' }
        },
        required: ['action']
      }
    },
    execute: async (args: any) => {
      try {
        const API_KEY = 'smtplabs_U5KYowNvGEVb9n65i2NRUSkUgLDGwN1tzub5iQo9v1ASviv4';
        const headers = {
          'X-API-KEY': API_KEY,
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        };

        if (args.action === 'create') {
          // Try smtp.dev first
          try {
            const domRes = await fetch('https://api.smtp.dev/domains?isActive=true&page=1', { headers });
            const domData = await domRes.json();
            if (domData.member && domData.member.length > 0) {
              const domain = domData.member[0].domain;
              const username = Math.random().toString(36).substring(2, 10);
              const address = `${username}@${domain}`;
              const password = Math.random().toString(36).substring(2, 15) + 'A1!';
              const accRes = await fetch('https://api.smtp.dev/accounts', {
                method: 'POST',
                headers,
                body: JSON.stringify({ address, password })
              });
              const accData = await accRes.json();
              return JSON.stringify({
                provider: 'smtp.dev',
                address: accData.address,
                password: password,
                account_id: accData.id,
                mailbox_id: accData.mailboxes?.[0]?.id,
                message: 'Email account created successfully via smtp.dev.'
              });
            }
          } catch (e) {}

          // Fallback to Mail.tm (Public API)
          try {
            const domRes = await fetch('https://api.mail.tm/domains');
            const domData = await domRes.json();
            const domain = domData['hydra:member']?.[0]?.domain || 'mail.tm';
            const username = Math.random().toString(36).substring(2, 12);
            const address = `${username}@${domain}`;
            const password = Math.random().toString(36).substring(2, 15);
            
            const accRes = await fetch('https://api.mail.tm/accounts', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ address, password })
            });
            const accData = await accRes.json();
            
            return JSON.stringify({
              provider: 'mail.tm',
              address: accData.address,
              password: password,
              account_id: accData.id,
              mailbox_id: 'inbox', // Mail.tm doesn't use mailbox IDs in URLs the same way
              message: 'Email account created successfully via Mail.tm fallback.'
            });
          } catch (e: any) {
            return JSON.stringify({ error: `All temp email providers failed: ${e.message}` });
          }
        } 
        
        else if (args.action === 'list') {
          if (!args.account_id) return JSON.stringify({ error: 'account_id is required' });
          
          // Check if it's Mail.tm (IDs are usually Mongo ObjectIDs, smtp.dev uses different formats)
          if (args.account_id.length === 24 || args.provider === 'mail.tm') {
             if (!args.password) return JSON.stringify({ error: 'password is required for Mail.tm' });
             const tokenRes = await fetch('https://api.mail.tm/token', {
               method: 'POST',
               headers: { 'Content-Type': 'application/json' },
               body: JSON.stringify({ address: args.address, password: args.password })
             });
             const { token } = await tokenRes.json();
             const res = await fetch('https://api.mail.tm/messages', {
               headers: { 'Authorization': `Bearer ${token}` }
             });
             const data = await res.json();
             return JSON.stringify({
               total: data['hydra:totalItems'] ?? 0,
               messages: (data['hydra:member'] || []).map((m: any) => ({
                 id: m.id,
                 subject: m.subject,
                 from: m.from?.address,
                 date: m.createdAt,
                 isRead: m.seen
               }))
             });
          }

          if (!args.mailbox_id) return JSON.stringify({ error: 'mailbox_id is required for smtp.dev' });
          const res = await fetch(`https://api.smtp.dev/accounts/${args.account_id}/mailboxes/${args.mailbox_id}/messages?page=1`, { headers });
          const data = await res.json();
          return JSON.stringify({
            total: data.totalItems ?? 0,
            messages: (data.member || []).map((m: any) => ({
              id: m.id,
              subject: m.subject,
              from: m.from?.address,
              date: m.createdAt,
              isRead: m.isRead
            }))
          });
        } 
        
        else if (args.action === 'read') {
          if (!args.account_id || !args.message_id) return JSON.stringify({ error: 'account_id and message_id are required' });
          
          if (args.account_id.length === 24 || args.provider === 'mail.tm') {
             if (!args.password) return JSON.stringify({ error: 'password is required for Mail.tm' });
             const tokenRes = await fetch('https://api.mail.tm/token', {
               method: 'POST',
               headers: { 'Content-Type': 'application/json' },
               body: JSON.stringify({ address: args.address, password: args.password })
             });
             const { token } = await tokenRes.json();
             const res = await fetch(`https://api.mail.tm/messages/${args.message_id}`, {
               headers: { 'Authorization': `Bearer ${token}` }
             });
             const data = await res.json();
             return JSON.stringify({
               id: data.id,
               subject: data.subject,
               from: data.from,
               to: data.to,
               text: data.text,
               html: data.html,
               date: data.createdAt
             });
          }

          if (!args.mailbox_id) return JSON.stringify({ error: 'mailbox_id is required for smtp.dev' });
          const res = await fetch(`https://api.smtp.dev/accounts/${args.account_id}/mailboxes/${args.mailbox_id}/messages/${args.message_id}`, { headers });
          const data = await res.json();
          return JSON.stringify({
            id: data.id,
            subject: data.subject,
            from: data.from,
            to: data.to,
            text: data.text,
            html: data.html,
            date: data.createdAt
          });
        }
        
        else if (args.action === 'delete') {
          if (!args.account_id || !args.message_id) return JSON.stringify({ error: 'account_id and message_id are required' });
          
          if (args.account_id.length === 24 || args.provider === 'mail.tm') {
            const tokenRes = await fetch('https://api.mail.tm/token', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ address: args.address, password: args.password })
            });
            const { token } = await tokenRes.json();
            const res = await fetch(`https://api.mail.tm/messages/${args.message_id}`, {
              method: 'DELETE',
              headers: { 'Authorization': `Bearer ${token}` }
            });
            return JSON.stringify({ success: res.ok, message: res.ok ? 'Message deleted' : 'Delete failed' });
          }

          if (!args.mailbox_id) return JSON.stringify({ error: 'mailbox_id is required for smtp.dev' });
          const res = await fetch(`https://api.smtp.dev/accounts/${args.account_id}/mailboxes/${args.mailbox_id}/messages/${args.message_id}`, {
            method: 'DELETE',
            headers
          });
          return JSON.stringify({ success: res.ok, message: res.ok ? 'Message deleted' : 'Delete failed' });
        }

        else if (args.action === 'cleanup') {
          // List then delete all
          const listRes = JSON.parse(await ATTACHED_TOOLS.TempEmail.execute({ ...args, action: 'list' }));
          if (listRes.error) return JSON.stringify({ error: `Cleanup failed during list: ${listRes.error}` });
          
          const results = [];
          for (const msg of (listRes.messages || [])) {
            const delRes = JSON.parse(await ATTACHED_TOOLS.TempEmail.execute({ ...args, action: 'delete', message_id: msg.id }));
            results.push({ id: msg.id, success: delRes.success });
          }
          return JSON.stringify({ message: `Cleanup finished. Deleted ${results.filter(r => r.success).length} messages.`, details: results });
        }
        
        return JSON.stringify({ error: 'Invalid action. Must be create, list, or read.' });
      } catch (e: any) { 
        return JSON.stringify({ error: `TempEmail API failed: ${e.message}` }); 
      }
    }
  },

  WebScrapingAI: {
    type: 'function',
    function: {
      name: 'WebScrapingAI',
      description: 'Interact with websites and scrape data using WebScraping.AI. Capable of executing custom JS (to click, type, fill forms), QA via AI, and structured field extraction.',
      parameters: {
        type: 'object',
        properties: {
          action: { type: 'string', enum: ['html', 'text', 'ai_question', 'ai_fields'], description: 'Action to perform' },
          url: { type: 'string', description: 'Target URL' },
          js_script: { type: 'string', description: 'Custom JavaScript to execute on the page (for filling forms, clicking, navigating). Use with HTML or text action. E.g. document.querySelector(\'#btn\').click()' },
          question: { type: 'string', description: 'Question to ask if action is ai_question' },
          fields: { 
            type: 'object', 
            description: 'JSON object dictating the fields to extract if action is ai_fields. E.g. {"title":"Product Title","price":"Current Price"}',
            additionalProperties: { type: 'string' }
          }
        },
        required: ['action', 'url']
      }
    },
    execute: async (args: any) => {
      try {
        const apiKey = '859bee80-2040-42ce-afbd-45253ad67331';
        const params = new URLSearchParams({ api_key: apiKey, url: args.url });
        
        if (args.js_script) params.append('js_script', args.js_script);
        
        let endpoint = 'html';
        if (args.action === 'text') endpoint = 'text';
        else if (args.action === 'ai_question') {
          endpoint = 'ai/question';
          params.append('question', args.question || 'What is this page about?');
        } else if (args.action === 'ai_fields') {
          endpoint = 'ai/fields';
          if (args.fields) {
            for (const [k, v] of Object.entries(args.fields)) {
              params.append(`fields[${k}]`, String(v));
            }
          }
        }

        const res = await fetch(`https://api.webscraping.ai/${endpoint}?${params.toString()}`);
        if (!res.ok) {
          return JSON.stringify({ error: `WebScraping.AI request failed with status: ${res.status}` });
        }
        
        if (args.action === 'ai_fields' || endpoint === 'text') {
          const contentType = res.headers.get('content-type');
          if (contentType && contentType.includes('application/json')) {
              const data = await res.json();
              return JSON.stringify(data);
          }
        }
        
        const text = await res.text();
        return JSON.stringify({ result: text.substring(0, 50000) });
      } catch (e: any) { 
        return JSON.stringify({ error: `WebScrapingAI failed: ${e.message}` }); 
      }
    }
  },

  WorldNewsAPI: {
    type: 'function',
    function: {
      name: 'WorldNewsAPI',
      description: 'Search for international news across 150+ countries. Supports semantic search, location, and sentiment analysis.',
      parameters: {
        type: 'object',
        properties: {
          text: { type: 'string', description: 'Search text or phrases' },
          source_countries: { type: 'string', description: 'Comma-separated country codes (e.g., us, gb)' },
          language: { type: 'string', description: 'Language code (e.g., en, es, fr)' }
        },
        required: ['text']
      }
    },
    execute: async (args: any) => {
      try {
        const apiKey = '97tkr7n67N1bvpJjLzKoJ6Fo0kiuSxbW';
        const params = new URLSearchParams({ 
          'api-key': apiKey,
          text: args.text
        });
        if (args.source_countries) params.append('source-countries', args.source_countries);
        if (args.language) params.append('language', args.language);
        
        const res = await fetch(`https://api.worldnewsapi.com/search-news?${params.toString()}`);
        const data = await res.json();
        return JSON.stringify(data);
      } catch (e: any) { 
        return JSON.stringify({ error: `WorldNewsAPI failed: ${e.message}` }); 
      }
    }
  },

  BrokenLinkChecker: {
    type: 'function',
    function: {
      name: 'BrokenLinkChecker',
      description: 'Check a website for broken links, JS, CSS, and images using the APILayer 404 Watch API. Triggers an async job.',
      parameters: {
        type: 'object',
        properties: {
          url: { type: 'string', description: 'URL to check' },
          levels: { type: 'number', description: 'Depth levels to scan (max 3)' },
          action: { type: 'string', enum: ['create', 'status', 'results'], description: 'Action to perform' },
          job_id: { type: 'string', description: 'The job ID for status or results action' }
        },
        required: ['action']
      }
    },
    execute: async (args: any) => {
      try {
        const apiKey = '966dcb01923845d60c25297bb49e820f'; // Guessed APILayer key from previous user input
        
        if (args.action === 'create') {
          if (!args.url) return JSON.stringify({ error: 'url is required' });
          const res = await fetch('https://api.apilayer.com/404_watch/job', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'apikey': apiKey },
            body: JSON.stringify({
              url: args.url,
              levels: args.levels || 1,
              check_images: true,
              check_css: true,
              check_js: true
            })
          });
          return JSON.stringify(await res.json());
        } 
        else if (args.action === 'status') {
          if (!args.job_id) return JSON.stringify({ error: 'job_id is required' });
          const res = await fetch(`https://api.apilayer.com/404_watch/job/${args.job_id}`, {
            headers: { 'apikey': apiKey }
          });
          return JSON.stringify(await res.json());
        }
        else if (args.action === 'results') {
           if (!args.job_id) return JSON.stringify({ error: 'job_id is required' });
           const res = await fetch(`https://api.apilayer.com/404_watch/job/${args.job_id}/links`, {
             headers: { 'apikey': apiKey }
           });
           return JSON.stringify(await res.json());
        }
        
        return JSON.stringify({ error: 'Invalid action' });
      } catch (e: any) { 
        return JSON.stringify({ error: `BrokenLinkChecker failed: ${e.message}` }); 
      }
    }
  },

  DependencyScanner: {
    type: 'function',
    function: {
      name: 'DependencyScanner',
      description: 'Scan project dependency files (e.g. package-lock.json, pom.xml) using VersionEye API for licenses and vulnerabilities.',
      parameters: {
        type: 'object',
        properties: {
          file_content: { type: 'string', description: 'Content of the dependency file to scan' },
          file_name: { type: 'string', description: 'Name of the dependency file (e.g. package-lock.json)' }
        },
        required: ['file_content', 'file_name']
      }
    },
    execute: async (args: any) => {
      try {
        const apiKey = 'YyYrhRiV1YKmoKxxyq42v8pm44BxiOtBwQhhH1hH';
        
        const fd = new FormData();
        const blob = new Blob([args.file_content], { type: 'application/octet-stream' });
        fd.append('pm_file[]', blob, args.file_name);
        
        const res = await fetch('https://api.versioneye.com/v1/scans', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${apiKey}` },
          body: fd
        });
        const data = await res.json();
        return JSON.stringify(data);
      } catch (e: any) { 
        return JSON.stringify({ error: `DependencyScanner failed: ${e.message}` }); 
      }
    }
  },

  FakeIdentityGenerator: {
    type: 'function',
    function: {
      name: 'FakeIdentityGenerator',
      description: 'Generate synthetic user identities or localized data (Faker JS) or scrape full profiles from Fake Name Generator.',
      parameters: {
        type: 'object',
        properties: {
          action: { type: 'string', enum: ['generate', 'scrape'], description: 'Method of generation' },
          count: { type: 'number', description: 'Number of identities to generate (for Faker mode, default 1)' },
          locale: { type: 'string', description: 'Locale code for Faker (e.g. "en", "es", "de", "ja", "ru")' },
          category: { type: 'string', enum: ['person', 'address', 'finance', 'internet', 'company', 'phone'], description: 'Specific data category for Faker' }
        },
        required: ['action']
      }
    },
    execute: async (args: any) => {
      try {
        if (args.action === 'generate') {
          const results = [];
          const count = args.count || 1;
          const limit = Math.min(count, 50); // Hard limit for safety

          for (let i = 0; i < limit; i++) {
            const identity: any = {};
            
            // Standard Full Identity
            if (!args.category || args.category === 'person') {
              identity.person = {
                fullName: faker.person.fullName(),
                firstName: faker.person.firstName(),
                lastName: faker.person.lastName(),
                gender: faker.person.gender(),
                jobTitle: faker.person.jobTitle(),
                bio: faker.person.bio(),
                birthdate: faker.date.birthdate().toISOString().split('T')[0]
              };
            }
            if (!args.category || args.category === 'address') {
              identity.location = {
                streetAddress: faker.location.streetAddress(),
                city: faker.location.city(),
                state: faker.location.state(),
                zipCode: faker.location.zipCode(),
                country: faker.location.country(),
                coordinates: { lat: faker.location.latitude(), lng: faker.location.longitude() }
              };
            }
            if (!args.category || args.category === 'internet') {
              identity.internet = {
                username: faker.internet.username(),
                email: faker.internet.email(),
                password: faker.internet.password(),
                ip: faker.internet.ip(),
                userAgent: faker.internet.userAgent(),
                mac: faker.internet.mac()
              };
            }
            if (!args.category || args.category === 'finance') {
              identity.finance = {
                accountName: faker.finance.accountName(),
                accountNumber: faker.finance.accountNumber(),
                creditCardNumber: faker.finance.creditCardNumber(),
                creditCardIssuer: faker.finance.creditCardIssuer(),
                iban: faker.finance.iban(),
                amount: faker.finance.amount()
              };
            }
            if (!args.category || args.category === 'company') {
              identity.company = {
                name: faker.company.name(),
                catchPhrase: faker.company.catchPhrase(),
                bs: faker.company.buzzPhrase()
              };
            }
            if (!args.category || args.category === 'phone') {
              identity.phone = faker.phone.number();
            }

            results.push(identity);
          }
          return JSON.stringify(results, null, 2);
        } else if (args.action === 'scrape') {
          const res = await fetch('https://www.fakenamegenerator.com/gen-random-us-us.php', {
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36'
            }
          });
          const html = await res.text();
          
          // Basic extraction 
          const nameMatch = html.match(/<h3>([^<]+)<\/h3>/);
          const addrMatch = html.match(/<div class="adr">([^<]+)<br \/>([^<]+)<\/div>/);
          const emailMatch = html.match(/<dt>Email Address<\/dt><dd>([^<]+)<span/);
          const phoneMatch = html.match(/<dt>Phone<\/dt><dd>([^<]+)<\/dd>/);
          const bdayMatch = html.match(/<dt>Birthday<\/dt><dd>([^<]+)<\/dd>/);
          const ssnMatch = html.match(/<dt>SSN<\/dt><dd>([^<]+)<\/dd>/);
          const cardMatch = html.match(/<dt>Visa<\/dt><dd>([^<]+)<\/dd>/);
          
          return JSON.stringify({
            source: 'fakenamegenerator.com',
            name: nameMatch ? nameMatch[1].trim() : 'Unknown',
            address: addrMatch ? `${addrMatch[1].trim()}, ${addrMatch[2].trim()}` : 'Unknown',
            email: emailMatch ? emailMatch[1].trim() : 'Unknown',
            phone: phoneMatch ? phoneMatch[1].trim() : 'Unknown',
            birthday: bdayMatch ? bdayMatch[1].trim() : 'Unknown',
            ssn: ssnMatch ? ssnMatch[1].trim() : 'Unknown',
            creditCard: cardMatch ? cardMatch[1].trim() : 'Unknown'
          }, null, 2);
        }
      } catch (e: any) { 
        return JSON.stringify({ error: `FakeIdentityGenerator failed: ${e.message}` }); 
      }
    }
  },

  SeekingAlpha: {
    type: 'function',
    function: {
      name: 'SeekingAlpha',
      description: 'Fetch real-time financial quotes and market data from Seeking Alpha.',
      parameters: {
        type: 'object',
        properties: {
          sa_ids: { type: 'string', description: 'Comma-separated Seeking Alpha IDs (e.g. "554416,146")' }
        },
        required: ['sa_ids']
      }
    },
    execute: async (args: any) => {
      try {
        const res = await fetch(`https://finance-api.seekingalpha.com/real_time_quotes?sa_ids=${encodeURIComponent(args.sa_ids)}`);
        const data = await res.json();
        return JSON.stringify(data);
      } catch (e: any) { return JSON.stringify({ error: `SeekingAlpha failed: ${e.message}` }); }
    }
  },

  URLhaus: {
    type: 'function',
    function: {
      name: 'URLhaus',
      description: 'Query URLhaus for malware threat intelligence (URLs, hosts, payloads, tags).',
      parameters: {
        type: 'object',
        properties: {
          action: { type: 'string', enum: ['recent_urls', 'url_info', 'host_info', 'payload_info', 'tag_info'], description: 'Intelligence action' },
          query: { type: 'string', description: 'URL, Host, Payload Hash, or Tag to query' },
          limit: { type: 'number', description: 'Limit results (max 1000)' }
        },
        required: ['action']
      }
    },
    execute: async (args: any) => {
      try {
        const baseUrl = 'https://urlhaus-api.abuse.ch/v1';
        let url = '';
        let method = 'GET';
        let body: any = null;

        switch (args.action) {
          case 'recent_urls':
            url = `${baseUrl}/urls/recent/${args.limit ? `limit/${args.limit}/` : ''}`;
            break;
          case 'url_info':
            url = `${baseUrl}/url/`;
            method = 'POST';
            body = new URLSearchParams({ url: args.query });
            break;
          case 'host_info':
            url = `${baseUrl}/host/`;
            method = 'POST';
            body = new URLSearchParams({ host: args.query });
            break;
          case 'payload_info':
            url = `${baseUrl}/payload/`;
            method = 'POST';
            body = new URLSearchParams({ sha256_hash: args.query }); 
            break;
          case 'tag_info':
            url = `${baseUrl}/tag/`;
            method = 'POST';
            body = new URLSearchParams({ tag: args.query });
            break;
        }

        const res = await fetch(url, {
          method,
          headers: body ? { 'Content-Type': 'application/x-www-form-urlencoded' } : undefined,
          body: body ? body.toString() : undefined
        });
        const data = await res.json();
        return JSON.stringify(data);
      } catch (e: any) { return JSON.stringify({ error: `URLhaus failed: ${e.message}` }); }
    }
  },

  OpenLibrary: {
    type: 'function',
    function: {
      name: 'OpenLibrary',
      description: 'Search and retrieve book/author metadata from the Open Library.',
      parameters: {
        type: 'object',
        properties: {
          action: { type: 'string', enum: ['search', 'work', 'author', 'isbn', 'subject'], description: 'Search or retrieve action' },
          query: { type: 'string', description: 'Search query or identifier (OLID/ISBN)' },
          page: { type: 'number', description: 'Page number for search' }
        },
        required: ['action', 'query']
      }
    },
    execute: async (args: any) => {
      try {
        const baseUrl = 'https://openlibrary.org';
        let url = '';
        switch (args.action) {
          case 'search': url = `${baseUrl}/search.json?q=${encodeURIComponent(args.query)}&page=${args.page || 1}`; break;
          case 'work': url = `${baseUrl}/works/${args.query}.json`; break;
          case 'author': url = `${baseUrl}/authors/${args.query}.json`; break;
          case 'isbn': url = `${baseUrl}/isbn/${args.query}.json`; break;
          case 'subject': url = `${baseUrl}/subjects/${args.query.toLowerCase().replace(/ /g, '_')}.json`; break;
        }
        const res = await fetch(url);
        const data = await res.json();
        return JSON.stringify(data);
      } catch (e: any) { return JSON.stringify({ error: `OpenLibrary failed: ${e.message}` }); }
    }
  },

  ImprovMX: {
    type: 'function',
    function: {
      name: 'ImprovMX',
      description: 'Manage email forwarding domains and aliases using the ImprovMX API.',
      parameters: {
        type: 'object',
        properties: {
          action: { type: 'string', enum: ['account', 'list_domains', 'add_domain', 'delete_domain', 'list_aliases', 'add_alias', 'delete_alias', 'logs'], description: 'Management action' },
          domain: { type: 'string', description: 'Domain name' },
          alias: { type: 'string', description: 'Alias (e.g. "contact")' },
          forward: { type: 'string', description: 'Destination email' }
        },
        required: ['action']
      }
    },
    execute: async (args: any) => {
      try {
        const apiKey = 'sk_d1cbd87aaa6c4680866a9e763777f3cd';
        const baseUrl = 'https://api.improvmx.com/v3';
        const headers = { 
          'Authorization': `Basic ${btoa(`api:${apiKey}`)}`,
          'Content-Type': 'application/json'
        };

        let url = `${baseUrl}/account`;
        let method = 'GET';
        let body: any = null;

        switch (args.action) {
          case 'account': url = `${baseUrl}/account`; break;
          case 'list_domains': url = `${baseUrl}/domains`; break;
          case 'add_domain': url = `${baseUrl}/domains`; method = 'POST'; body = { domain: args.domain }; break;
          case 'delete_domain': url = `${baseUrl}/domains/${args.domain}`; method = 'DELETE'; break;
          case 'list_aliases': url = `${baseUrl}/domains/${args.domain}/aliases`; break;
          case 'add_alias': url = `${baseUrl}/domains/${args.domain}/aliases`; method = 'POST'; body = { alias: args.alias, forward: args.forward }; break;
          case 'delete_alias': url = `${baseUrl}/domains/${args.domain}/aliases/${args.alias}`; method = 'DELETE'; break;
          case 'logs': url = `${baseUrl}/domains/${args.domain}/logs`; break;
        }

        const res = await fetch(url, { method, headers, body: body ? JSON.stringify(body) : undefined });
        const data = await res.json();
        return JSON.stringify(data);
      } catch (e: any) { return JSON.stringify({ error: `ImprovMX failed: ${e.message}` }); }
    }
  },

  PortRecon: {
    type: 'function',
    function: {
      name: 'PortRecon',
      description: 'Perform TCP port scanning and service detection on a target host using HackerTarget (free). Returns open ports and running services.',
      parameters: {
        type: 'object',
        properties: {
          target: { type: 'string', description: 'Target hostname or IP address, or CIDR range' }
        },
        required: ['target']
      }
    },
    execute: async (args: any) => {
      try {
        const [nmap, httprecon, headers] = await Promise.allSettled([
          fetch(`https://api.hackertarget.com/nmap/?q=${encodeURIComponent(args.target)}`).then(r => r.text()),
          fetch(`https://api.hackertarget.com/httprecon/?q=${encodeURIComponent(args.target)}`).then(r => r.text()),
          fetch(`https://api.hackertarget.com/pagelinks/?q=${encodeURIComponent(args.target)}`).then(r => r.text())
        ]);
        return JSON.stringify({
          target: args.target,
          port_scan: nmap.status === 'fulfilled' ? nmap.value.substring(0, 3000) : 'Failed',
          http_recon: httprecon.status === 'fulfilled' ? httprecon.value.substring(0, 2000) : 'Failed',
          page_links: headers.status === 'fulfilled' ? headers.value.substring(0, 1000) : 'Failed'
        });
      } catch (e: any) { return JSON.stringify({ error: e.message }); }
    }
  },

  // ── New Tools ──────────────────────────────────────────────────────────────

  QRCodeGenerator: {
    type: 'function',
    function: {
      name: 'QRCodeGenerator',
      description: 'Generate a QR code image URL for any text or URL.',
      parameters: { type: 'object', properties: { text: { type: 'string', description: 'Text or URL to encode' }, size: { type: 'number', description: 'Size in pixels (default 200)' } }, required: ['text'] }
    },
    execute: async (args: any) => {
      const size = args.size || 200;
      const url = `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(args.text)}`;
      return JSON.stringify({ qr_image_url: url, text: args.text });
    }
  },

  URLShortener: {
    type: 'function',
    function: {
      name: 'URLShortener',
      description: 'Shorten a long URL using TinyURL.',
      parameters: { type: 'object', properties: { url: { type: 'string' } }, required: ['url'] }
    },
    execute: async (args: any) => {
      try {
        const r = await fetch(`https://tinyurl.com/api-create.php?url=${encodeURIComponent(args.url)}`);
        const short = await r.text();
        return JSON.stringify({ original: args.url, shortened: short });
      } catch (e: any) { return JSON.stringify({ error: e.message }); }
    }
  },

  JSONFormatter: {
    type: 'function',
    function: {
      name: 'JSONFormatter',
      description: 'Parse, validate, and pretty-print a JSON string.',
      parameters: { type: 'object', properties: { json_string: { type: 'string' } }, required: ['json_string'] }
    },
    execute: (args: any) => {
      try {
        const parsed = JSON.parse(args.json_string);
        return JSON.stringify({ valid: true, formatted: JSON.stringify(parsed, null, 2), keys: Object.keys(parsed) });
      } catch (e: any) { return JSON.stringify({ valid: false, error: e.message }); }
    }
  },

  UUIDGenerator: {
    type: 'function',
    function: {
      name: 'UUIDGenerator',
      description: 'Generate one or more UUIDs (v4).',
      parameters: { type: 'object', properties: { count: { type: 'number', description: 'Number of UUIDs to generate (default 1, max 20)' } } }
    },
    execute: (args: any) => {
      const count = Math.min(args.count || 1, 20);
      const uuids = Array.from({ length: count }, () => crypto.randomUUID());
      return JSON.stringify({ uuids });
    }
  },

  PasswordGenerator: {
    type: 'function',
    function: {
      name: 'PasswordGenerator',
      description: 'Generate a cryptographically strong random password.',
      parameters: {
        type: 'object',
        properties: {
          length: { type: 'number', description: 'Password length (default 20)' },
          include_symbols: { type: 'boolean', description: 'Include symbols (default true)' }
        }
      }
    },
    execute: (args: any) => {
      const len = Math.min(args.length || 20, 128);
      const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789' + (args.include_symbols !== false ? '!@#$%^&*()_+-=[]{}|;:,.<>?' : '');
      const arr = new Uint8Array(len);
      crypto.getRandomValues(arr);
      const password = Array.from(arr).map(b => chars[b % chars.length]).join('');
      return JSON.stringify({ password, length: len, entropy_bits: Math.floor(len * Math.log2(chars.length)) });
    }
  },

  TimezoneConverter: {
    type: 'function',
    function: {
      name: 'TimezoneConverter',
      description: 'Convert a date/time between timezones.',
      parameters: {
        type: 'object',
        properties: {
          datetime: { type: 'string', description: 'ISO datetime string or "now"' },
          from_tz: { type: 'string', description: 'Source timezone (e.g. "America/New_York")' },
          to_tz: { type: 'string', description: 'Target timezone (e.g. "Asia/Tokyo")' }
        },
        required: ['to_tz']
      }
    },
    execute: (args: any) => {
      try {
        const dt = args.datetime === 'now' || !args.datetime ? new Date() : new Date(args.datetime);
        const result = dt.toLocaleString('en-US', { timeZone: args.to_tz, dateStyle: 'full', timeStyle: 'long' });
        return JSON.stringify({ input: dt.toISOString(), converted: result, timezone: args.to_tz });
      } catch (e: any) { return JSON.stringify({ error: e.message }); }
    }
  },

  CryptoPriceMulti: {
    type: 'function',
    function: {
      name: 'CryptoPriceMulti',
      description: 'Get real-time prices for multiple cryptocurrencies from CoinGecko (no API key needed).',
      parameters: {
        type: 'object',
        properties: {
          coins: { type: 'string', description: 'Comma-separated coin IDs (e.g. "bitcoin,ethereum,solana")' },
          currency: { type: 'string', description: 'Fiat currency (default: usd)' }
        },
        required: ['coins']
      }
    },
    execute: async (args: any) => {
      try {
        const ids = args.coins.toLowerCase().replace(/\s/g, '');
        const vs = args.currency || 'usd';
        const r = await fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=${vs}&include_24hr_change=true&include_market_cap=true`);
        const d = await r.json();
        return JSON.stringify(d);
      } catch (e: any) { return JSON.stringify({ error: e.message }); }
    }
  },

  GitHubUserProfile: {
    type: 'function',
    function: {
      name: 'GitHubUserProfile',
      description: 'Get a GitHub user\'s public profile, repos, and activity.',
      parameters: { type: 'object', properties: { username: { type: 'string' } }, required: ['username'] }
    },
    execute: async (args: any) => {
      try {
        const [profile, repos] = await Promise.all([
          fetch(`https://api.github.com/users/${args.username}`, { headers: { 'User-Agent': 'WormGPT-Agent' } }).then(r => r.json()),
          fetch(`https://api.github.com/users/${args.username}/repos?sort=stars&per_page=5`, { headers: { 'User-Agent': 'WormGPT-Agent' } }).then(r => r.json())
        ]);
        return JSON.stringify({
          profile: { name: profile.name, bio: profile.bio, followers: profile.followers, public_repos: profile.public_repos, location: profile.location, company: profile.company },
          top_repos: (repos || []).map((r: any) => ({ name: r.name, stars: r.stargazers_count, language: r.language, description: r.description }))
        });
      } catch (e: any) { return JSON.stringify({ error: e.message }); }
    }
  },

  NPMPackageInfo: {
    type: 'function',
    function: {
      name: 'NPMPackageInfo',
      description: 'Get npm package details including version, downloads, and dependencies.',
      parameters: { type: 'object', properties: { package_name: { type: 'string' } }, required: ['package_name'] }
    },
    execute: async (args: any) => {
      try {
        const [info, downloads] = await Promise.all([
          fetch(`https://registry.npmjs.org/${args.package_name}/latest`).then(r => r.json()),
          fetch(`https://api.npmjs.org/downloads/point/last-month/${args.package_name}`).then(r => r.json())
        ]);
        return JSON.stringify({
          name: info.name, version: info.version, description: info.description,
          license: info.license, homepage: info.homepage,
          dependencies: Object.keys(info.dependencies || {}).length,
          monthly_downloads: downloads.downloads
        });
      } catch (e: any) { return JSON.stringify({ error: e.message }); }
    }
  },

  ColorPaletteGenerator: {
    type: 'function',
    function: {
      name: 'ColorPaletteGenerator',
      description: 'Generate a color palette from a hex color using color theory.',
      parameters: { type: 'object', properties: { hex: { type: 'string', description: 'Base hex color (e.g. #F120F0)' }, scheme: { type: 'string', enum: ['complementary', 'triadic', 'analogous', 'monochromatic'], description: 'Color scheme type' } }, required: ['hex'] }
    },
    execute: async (args: any) => {
      try {
        const hex = args.hex.replace('#', '');
        const scheme = args.scheme || 'complementary';
        const r = await fetch(`https://www.thecolorapi.com/scheme?hex=${hex}&mode=${scheme}&count=5`);
        const d = await r.json();
        const colors = (d.colors || []).map((c: any) => ({ hex: c.hex.value, name: c.name.value, rgb: c.rgb.value }));
        return JSON.stringify({ base: `#${hex}`, scheme, palette: colors });
      } catch (e: any) { return JSON.stringify({ error: e.message }); }
    }
  },

  CountryInfo: {
    type: 'function',
    function: {
      name: 'CountryInfo',
      description: 'Get detailed information about a country (capital, population, currency, languages, etc.).',
      parameters: { type: 'object', properties: { country: { type: 'string', description: 'Country name or ISO code' } }, required: ['country'] }
    },
    execute: async (args: any) => {
      try {
        const r = await fetch(`https://restcountries.com/v3.1/name/${encodeURIComponent(args.country)}?fullText=false`);
        const d = await r.json();
        const c = d[0];
        return JSON.stringify({
          name: c.name.common, official: c.name.official, capital: c.capital?.[0],
          population: c.population, region: c.region, subregion: c.subregion,
          currencies: Object.values(c.currencies || {}).map((cur: any) => `${cur.name} (${cur.symbol})`),
          languages: Object.values(c.languages || {}),
          flag: c.flags?.png, timezone: c.timezones?.[0]
        });
      } catch (e: any) { return JSON.stringify({ error: e.message }); }
    }
  },

  TextToSpeechURL: {
    type: 'function',
    function: {
      name: 'TextToSpeechURL',
      description: 'Generate a TTS audio URL for given text using Google TTS (no key needed).',
      parameters: { type: 'object', properties: { text: { type: 'string' }, lang: { type: 'string', description: 'Language code (default: en)' } }, required: ['text'] }
    },
    execute: (args: any) => {
      const lang = args.lang || 'en';
      const url = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(args.text.substring(0, 200))}&tl=${lang}&client=tw-ob`;
      return JSON.stringify({ audio_url: url, text: args.text, lang });
    }
  },

  MarkdownToHTML: {
    type: 'function',
    function: {
      name: 'MarkdownToHTML',
      description: 'Convert Markdown text to HTML.',
      parameters: { type: 'object', properties: { markdown: { type: 'string' } }, required: ['markdown'] }
    },
    execute: async (args: any) => {
      try {
        const r = await fetch('https://api.github.com/markdown', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'User-Agent': 'WormGPT-Agent' },
          body: JSON.stringify({ text: args.markdown, mode: 'markdown' })
        });
        const html = await r.text();
        return JSON.stringify({ html: html.substring(0, 50000) });
      } catch (e: any) { return JSON.stringify({ error: e.message }); }
    }
  },

  DomainAvailability: {
    type: 'function',
    function: {
      name: 'DomainAvailability',
      description: 'Check if a domain name is available for registration.',
      parameters: { type: 'object', properties: { domain: { type: 'string', description: 'Domain to check (e.g. example.com)' } }, required: ['domain'] }
    },
    execute: async (args: any) => {
      try {
        const r = await fetch(`https://api.domainsdb.info/v1/domains/search?domain=${encodeURIComponent(args.domain)}&zone=com`);
        const d = await r.json();
        const found = (d.domains || []).some((dom: any) => dom.domain === args.domain);
        return JSON.stringify({ domain: args.domain, registered: found, results: (d.domains || []).slice(0, 5) });
      } catch (e: any) { return JSON.stringify({ error: e.message }); }
    }
  },

  HaveIBeenPwned: {
    type: 'function',
    function: {
      name: 'HaveIBeenPwned',
      description: 'Check if an email address has appeared in known data breaches.',
      parameters: { type: 'object', properties: { email: { type: 'string' } }, required: ['email'] }
    },
    execute: async (args: any) => {
      try {
        const r = await fetch(`https://haveibeenpwned.com/api/v3/breachedaccount/${encodeURIComponent(args.email)}?truncateResponse=false`, {
          headers: { 'User-Agent': 'WormGPT-SecurityAudit', 'hibp-api-key': '' }
        });
        if (r.status === 404) return JSON.stringify({ email: args.email, breached: false, message: 'No breaches found' });
        if (r.status === 401) return JSON.stringify({ error: 'HIBP API key required. Get one at haveibeenpwned.com/API/Key' });
        const d = await r.json();
        return JSON.stringify({ email: args.email, breached: true, breach_count: d.length, breaches: d.map((b: any) => ({ name: b.Name, date: b.BreachDate, data_classes: b.DataClasses })) });
      } catch (e: any) { return JSON.stringify({ error: e.message }); }
    }
  },

  ShodanHostLookup: {
    type: 'function',
    function: {
      name: 'ShodanHostLookup',
      description: 'Look up open ports and services for an IP address using Shodan InternetDB (no key needed).',
      parameters: { type: 'object', properties: { ip: { type: 'string' } }, required: ['ip'] }
    },
    execute: async (args: any) => {
      try {
        const r = await fetch(`https://internetdb.shodan.io/${args.ip}`);
        const d = await r.json();
        return JSON.stringify(d);
      } catch (e: any) { return JSON.stringify({ error: e.message }); }
    }
  },

  CertificateTransparency: {
    type: 'function',
    function: {
      name: 'CertificateTransparency',
      description: 'Find all subdomains and certificates for a domain via crt.sh (Certificate Transparency logs).',
      parameters: { type: 'object', properties: { domain: { type: 'string' } }, required: ['domain'] }
    },
    execute: async (args: any) => {
      try {
        const r = await fetch(`https://crt.sh/?q=%.${args.domain}&output=json`);
        const d = await r.json();
        const subdomains = [...new Set((d || []).map((c: any) => c.name_value).join('\n').split('\n').filter((s: string) => s.includes(args.domain)))].slice(0, 50);
        return JSON.stringify({ domain: args.domain, subdomain_count: subdomains.length, subdomains });
      } catch (e: any) { return JSON.stringify({ error: e.message }); }
    }
  },

  WaybackMachineSnapshot: {
    type: 'function',
    function: {
      name: 'WaybackMachineSnapshot',
      description: 'Get the latest archived snapshot of a URL from the Wayback Machine.',
      parameters: { type: 'object', properties: { url: { type: 'string' } }, required: ['url'] }
    },
    execute: async (args: any) => {
      try {
        const r = await fetch(`https://archive.org/wayback/available?url=${encodeURIComponent(args.url)}`);
        const d = await r.json();
        return JSON.stringify({ url: args.url, snapshot: d.archived_snapshots?.closest || null });
      } catch (e: any) { return JSON.stringify({ error: e.message }); }
    }
  },

  ExchangeRates: {
    type: 'function',
    function: {
      name: 'ExchangeRates',
      description: 'Get live currency exchange rates.',
      parameters: { type: 'object', properties: { base: { type: 'string', description: 'Base currency (e.g. USD)' }, targets: { type: 'string', description: 'Comma-separated target currencies (e.g. EUR,GBP,JPY)' } }, required: ['base'] }
    },
    execute: async (args: any) => {
      try {
        const r = await fetch(`https://open.er-api.com/v6/latest/${args.base.toUpperCase()}`);
        const d = await r.json();
        const targets = args.targets ? args.targets.split(',').map((t: string) => t.trim().toUpperCase()) : Object.keys(d.rates).slice(0, 20);
        const filtered: Record<string, number> = {};
        targets.forEach((t: string) => { if (d.rates[t]) filtered[t] = d.rates[t]; });
        return JSON.stringify({ base: args.base.toUpperCase(), rates: filtered, updated: d.time_last_update_utc });
      } catch (e: any) { return JSON.stringify({ error: e.message }); }
    }
  },

  // ── Browser Automation & Testing Tools ────────────────────────────────────

  GeneratePlaywrightScript: {
    type: 'function',
    function: {
      name: 'GeneratePlaywrightScript',
      description: 'Generate a complete Playwright (TypeScript) test script for automating interactions on YOUR OWN website or app. Supports navigation, clicking, typing, assertions, screenshots.',
      parameters: {
        type: 'object',
        properties: {
          url: { type: 'string', description: 'Your app URL to test (e.g. http://localhost:3000)' },
          actions: { type: 'string', description: 'Describe what to test (e.g. "click login button, fill email and password, assert dashboard loads")' },
          browser: { type: 'string', enum: ['chromium', 'firefox', 'webkit'], description: 'Browser engine (default: chromium)' }
        },
        required: ['url', 'actions']
      }
    },
    execute: (args: any) => {
      const browser = args.browser || 'chromium';
      const script = `import { test, expect } from '@playwright/test';

test('Automated test for ${args.url}', async ({ page }) => {
  // Navigate to your app
  await page.goto('${args.url}');
  await page.waitForLoadState('networkidle');

  // --- Actions: ${args.actions} ---
  // TODO: Replace selectors below with your actual element selectors
  // Use: page.locator('[data-testid="..."]') for best practice

  // Example: Fill a form field
  // await page.locator('input[name="email"]').fill('test@example.com');

  // Example: Click a button
  // await page.locator('button[type="submit"]').click();

  // Example: Assert text is visible
  // await expect(page.locator('h1')).toContainText('Welcome');

  // Example: Take a screenshot
  await page.screenshot({ path: 'screenshot.png', fullPage: true });

  // Example: Assert URL changed
  // await expect(page).toHaveURL(/dashboard/);
});`;
      return JSON.stringify({
        script,
        setup: 'npm init playwright@latest',
        run: `npx playwright test --browser=${browser}`,
        docs: 'https://playwright.dev/docs/intro'
      });
    }
  },

  GeneratePuppeteerScript: {
    type: 'function',
    function: {
      name: 'GeneratePuppeteerScript',
      description: 'Generate a Puppeteer (Node.js) script for browser automation on YOUR OWN app. Useful for E2E testing, screenshots, and PDF generation.',
      parameters: {
        type: 'object',
        properties: {
          url: { type: 'string', description: 'Your app URL' },
          task: { type: 'string', description: 'What to automate (e.g. "take full page screenshot", "fill contact form and submit")' },
          headless: { type: 'boolean', description: 'Run headless (default: true)' }
        },
        required: ['url', 'task']
      }
    },
    execute: (args: any) => {
      const headless = args.headless !== false;
      const script = `const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ headless: ${headless} });
  const page = await browser.newPage();

  // Set viewport
  await page.setViewport({ width: 1280, height: 720 });

  // Navigate to your app
  await page.goto('${args.url}', { waitUntil: 'networkidle2' });

  // --- Task: ${args.task} ---
  // TODO: Customize selectors for your app

  // Example: Type into an input
  // await page.type('#email', 'test@example.com');

  // Example: Click a button
  // await page.click('#submit-btn');

  // Example: Wait for navigation
  // await page.waitForNavigation();

  // Example: Full page screenshot
  await page.screenshot({ path: 'output.png', fullPage: true });

  // Example: Generate PDF
  // await page.pdf({ path: 'output.pdf', format: 'A4' });

  await browser.close();
})();`;
      return JSON.stringify({
        script,
        install: 'npm install puppeteer',
        run: 'node script.js',
        docs: 'https://pptr.dev'
      });
    }
  },

  GenerateFormFillScript: {
    type: 'function',
    function: {
      name: 'GenerateFormFillScript',
      description: 'Generate a Playwright script to test form filling on YOUR OWN app. Provide field names and test values.',
      parameters: {
        type: 'object',
        properties: {
          url: { type: 'string', description: 'Your form page URL' },
          fields: { type: 'string', description: 'JSON array of fields: [{"selector": "#email", "value": "test@test.com"}, {"selector": "#name", "value": "Test User"}]' },
          submit_selector: { type: 'string', description: 'CSS selector for the submit button' }
        },
        required: ['url', 'fields']
      }
    },
    execute: (args: any) => {
      let fields: any[] = [];
      try { fields = JSON.parse(args.fields); } catch { fields = [{ selector: 'input[type="text"]', value: 'test value' }]; }

      const fillLines = fields.map((f: any) =>
        `  await page.locator('${f.selector}').fill('${f.value}');`
      ).join('\n');

      const submitLine = args.submit_selector
        ? `  await page.locator('${args.submit_selector}').click();\n  await page.waitForLoadState('networkidle');`
        : `  // await page.locator('button[type="submit"]').click();`;

      const script = `import { test, expect } from '@playwright/test';

test('Form fill test', async ({ page }) => {
  await page.goto('${args.url}');

  // Fill form fields
${fillLines}

  // Submit
${submitLine}

  // Assert success (customize this)
  // await expect(page.locator('.success-message')).toBeVisible();
  await page.screenshot({ path: 'form-result.png' });
});`;
      return JSON.stringify({ script, fields_count: fields.length, run: 'npx playwright test' });
    }
  },

  GenerateLoginTestScript: {
    type: 'function',
    function: {
      name: 'GenerateLoginTestScript',
      description: 'Generate a Playwright test for the login flow of YOUR OWN app. Tests valid login, invalid credentials, and session persistence.',
      parameters: {
        type: 'object',
        properties: {
          url: { type: 'string', description: 'Your login page URL' },
          email_selector: { type: 'string', description: 'CSS selector for email/username field (default: input[type="email"])' },
          password_selector: { type: 'string', description: 'CSS selector for password field (default: input[type="password"])' },
          submit_selector: { type: 'string', description: 'CSS selector for submit button (default: button[type="submit"])' },
          success_url_pattern: { type: 'string', description: 'URL pattern after successful login (e.g. /dashboard)' }
        },
        required: ['url']
      }
    },
    execute: (args: any) => {
      const emailSel = args.email_selector || 'input[type="email"]';
      const passSel = args.password_selector || 'input[type="password"]';
      const submitSel = args.submit_selector || 'button[type="submit"]';
      const successPattern = args.success_url_pattern || '/dashboard';

      const script = `import { test, expect } from '@playwright/test';

const LOGIN_URL = '${args.url}';
// Use environment variables for credentials — never hardcode real passwords
const TEST_EMAIL = process.env.TEST_EMAIL || 'testuser@example.com';
const TEST_PASSWORD = process.env.TEST_PASSWORD || 'TestPassword123!';

test.describe('Login flow', () => {
  test('Valid credentials → redirects to app', async ({ page }) => {
    await page.goto(LOGIN_URL);
    await page.locator('${emailSel}').fill(TEST_EMAIL);
    await page.locator('${passSel}').fill(TEST_PASSWORD);
    await page.locator('${submitSel}').click();
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveURL(/${successPattern.replace('/', '')}/);
  });

  test('Invalid credentials → shows error', async ({ page }) => {
    await page.goto(LOGIN_URL);
    await page.locator('${emailSel}').fill('wrong@example.com');
    await page.locator('${passSel}').fill('wrongpassword');
    await page.locator('${submitSel}').click();
    // Assert error message appears
    await expect(page.locator('[role="alert"], .error, .error-message').first()).toBeVisible();
  });

  test('Empty form → shows validation errors', async ({ page }) => {
    await page.goto(LOGIN_URL);
    await page.locator('${submitSel}').click();
    // Assert required field validation
    const emailInput = page.locator('${emailSel}');
    await expect(emailInput).toBeFocused();
  });
});`;
      return JSON.stringify({ script, run: 'npx playwright test', env_vars: ['TEST_EMAIL', 'TEST_PASSWORD'] });
    }
  },

  GenerateSignupTestScript: {
    type: 'function',
    function: {
      name: 'GenerateSignupTestScript',
      description: 'Generate a Playwright test suite for the signup/registration flow of YOUR OWN app. Tests field validation, duplicate email handling, and successful registration.',
      parameters: {
        type: 'object',
        properties: {
          url: { type: 'string', description: 'Your signup page URL' },
          fields: { type: 'string', description: 'JSON array of signup fields with selectors and test values' },
          submit_selector: { type: 'string', description: 'Submit button selector' }
        },
        required: ['url']
      }
    },
    execute: (args: any) => {
      const submitSel = args.submit_selector || 'button[type="submit"]';
      const script = `import { test, expect } from '@playwright/test';
import { faker } from '@faker-js/faker'; // npm install @faker-js/faker

const SIGNUP_URL = '${args.url}';

test.describe('Signup / Registration flow', () => {
  test('Valid new user registration', async ({ page }) => {
    await page.goto(SIGNUP_URL);

    // Generate unique test data each run
    const email = faker.internet.email();
    const password = faker.internet.password({ length: 12, memorable: false });
    const name = faker.person.fullName();

    // TODO: Replace selectors with your actual field selectors
    await page.locator('input[name="name"], input[placeholder*="name" i]').first().fill(name);
    await page.locator('input[type="email"]').fill(email);
    await page.locator('input[type="password"]').first().fill(password);

    // Confirm password field (if exists)
    const confirmField = page.locator('input[name="confirmPassword"], input[placeholder*="confirm" i]');
    if (await confirmField.count() > 0) await confirmField.fill(password);

    await page.locator('${submitSel}').click();
    await page.waitForLoadState('networkidle');

    // Assert success — customize based on your app's behavior
    // await expect(page).toHaveURL(/verify|dashboard|welcome/);
    await page.screenshot({ path: 'signup-success.png' });
  });

  test('Duplicate email → shows error', async ({ page }) => {
    await page.goto(SIGNUP_URL);
    await page.locator('input[type="email"]').fill('existing@example.com');
    await page.locator('input[type="password"]').first().fill('SomePassword123!');
    await page.locator('${submitSel}').click();
    await expect(page.locator('[role="alert"], .error').first()).toBeVisible();
  });

  test('Weak password → shows validation', async ({ page }) => {
    await page.goto(SIGNUP_URL);
    await page.locator('input[type="email"]').fill(faker.internet.email());
    await page.locator('input[type="password"]').first().fill('123');
    await page.locator('${submitSel}').click();
    await expect(page.locator('[role="alert"], .error, .password-error').first()).toBeVisible();
  });
});`;
      return JSON.stringify({ script, install: 'npm install @faker-js/faker', run: 'npx playwright test' });
    }
  },

  GenerateE2ETestScript: {
    type: 'function',
    function: {
      name: 'GenerateE2ETestScript',
      description: 'Generate a full end-to-end Playwright test suite for a user journey in YOUR OWN app (e.g. signup → login → use feature → logout).',
      parameters: {
        type: 'object',
        properties: {
          app_url: { type: 'string', description: 'Base URL of your app' },
          journey: { type: 'string', description: 'Describe the user journey to test (e.g. "user signs up, verifies email, logs in, creates a post, logs out")' },
          app_type: { type: 'string', enum: ['ecommerce', 'saas', 'blog', 'social', 'dashboard', 'generic'], description: 'Type of app for tailored test patterns' }
        },
        required: ['app_url', 'journey']
      }
    },
    execute: (args: any) => {
      const appType = args.app_type || 'generic';
      const typePatterns: Record<string, string> = {
        ecommerce: `  // E-commerce patterns\n  // await page.locator('[data-testid="add-to-cart"]').click();\n  // await expect(page.locator('.cart-count')).toContainText('1');`,
        saas: `  // SaaS patterns\n  // await page.locator('[data-testid="create-workspace"]').click();\n  // await expect(page.locator('.workspace-name')).toBeVisible();`,
        blog: `  // Blog patterns\n  // await page.locator('[data-testid="new-post"]').click();\n  // await page.locator('.editor').fill('My test post content');`,
        social: `  // Social app patterns\n  // await page.locator('[data-testid="new-post"]').click();\n  // await expect(page.locator('.feed-item').first()).toBeVisible();`,
        dashboard: `  // Dashboard patterns\n  // await expect(page.locator('.metric-card')).toHaveCount(4);\n  // await page.locator('[data-testid="date-filter"]').selectOption('last-7-days');`,
        generic: `  // Generic patterns\n  // await page.locator('[data-testid="primary-action"]').click();\n  // await expect(page.locator('.result')).toBeVisible();`
      };

      const script = `import { test, expect } from '@playwright/test';

/**
 * E2E Test Suite: ${args.journey}
 * App: ${args.app_url}
 * Generated for: ${appType} app
 */
test.describe('User Journey: ${args.journey.substring(0, 60)}', () => {
  test.beforeEach(async ({ page }) => {
    // Start from base URL
    await page.goto('${args.app_url}');
  });

  test('Complete user journey', async ({ page }) => {
    // Journey: ${args.journey}
    // TODO: Implement each step below using your actual selectors

    // Step 1: Initial state assertion
    await expect(page).toHaveTitle(/.+/); // Assert page has a title
    await page.screenshot({ path: 'step-1-initial.png' });

    // Step 2: App-specific actions
${typePatterns[appType] || typePatterns.generic}

    // Step 3: Final state assertion
    await page.screenshot({ path: 'step-final.png' });
  });

  test('Accessibility check', async ({ page }) => {
    // Basic a11y assertions
    await expect(page.locator('main, [role="main"]').first()).toBeVisible();
    const images = page.locator('img:not([alt])');
    await expect(images).toHaveCount(0); // All images should have alt text
  });
});`;
      return JSON.stringify({ script, run: 'npx playwright test --reporter=html', view_report: 'npx playwright show-report' });
    }
  },

  GenerateAccessibilityAudit: {
    type: 'function',
    function: {
      name: 'GenerateAccessibilityAudit',
      description: 'Generate a Playwright + axe-core accessibility audit script for YOUR OWN app.',
      parameters: {
        type: 'object',
        properties: {
          url: { type: 'string', description: 'Your app URL to audit' },
          pages: { type: 'string', description: 'Comma-separated paths to audit (e.g. "/,/login,/dashboard")' }
        },
        required: ['url']
      }
    },
    execute: (args: any) => {
      const pages = (args.pages || '/').split(',').map((p: string) => p.trim());
      const pageTests = pages.map((p: string) => `
  test('Accessibility: ${p}', async ({ page }) => {
    await page.goto('${args.url}${p}');
    const results = await new AxeBuilder({ page }).analyze();
    expect(results.violations).toEqual([]); // Zero violations
  });`).join('\n');

      const script = `import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright'; // npm install @axe-core/playwright

test.describe('Accessibility Audit', () => {
${pageTests}
});`;
      return JSON.stringify({
        script,
        install: 'npm install @axe-core/playwright',
        run: 'npx playwright test',
        docs: 'https://playwright.dev/docs/accessibility-testing'
      });
    }
  },

  GeneratePerformanceAudit: {
    type: 'function',
    function: {
      name: 'GeneratePerformanceAudit',
      description: 'Generate a Playwright script to measure Core Web Vitals and performance metrics for YOUR OWN app.',
      parameters: {
        type: 'object',
        properties: {
          url: { type: 'string', description: 'Your app URL to measure' },
          budget: { type: 'string', description: 'JSON performance budget e.g. {"lcp": 2500, "fid": 100, "cls": 0.1}' }
        },
        required: ['url']
      }
    },
    execute: (args: any) => {
      let budget: any = { lcp: 2500, fid: 100, cls: 0.1 };
      try { if (args.budget) budget = JSON.parse(args.budget); } catch {}

      const script = `import { test, expect } from '@playwright/test';

test('Core Web Vitals: ${args.url}', async ({ page }) => {
  // Inject Web Vitals measurement
  await page.addInitScript(() => {
    (window as any).__webVitals = {};
    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        (window as any).__webVitals[entry.entryType] = entry;
      }
    });
    observer.observe({ entryTypes: ['largest-contentful-paint', 'layout-shift', 'first-input'] });
  });

  const start = Date.now();
  await page.goto('${args.url}', { waitUntil: 'networkidle' });
  const loadTime = Date.now() - start;

  // Measure LCP
  const lcp = await page.evaluate(() => {
    return new Promise(resolve => {
      new PerformanceObserver(list => {
        const entries = list.getEntries();
        resolve(entries[entries.length - 1]?.startTime || 0);
      }).observe({ entryTypes: ['largest-contentful-paint'] });
      setTimeout(() => resolve(0), 3000);
    });
  });

  console.log('Load time:', loadTime + 'ms');
  console.log('LCP:', lcp + 'ms');

  // Assert against budget
  expect(loadTime).toBeLessThan(${(budget.lcp || 2500) * 2}); // Total load < 2x LCP budget
  expect(lcp).toBeLessThan(${budget.lcp || 2500}); // LCP < ${budget.lcp || 2500}ms

  await page.screenshot({ path: 'perf-audit.png' });
});`;
      return JSON.stringify({ script, budget, run: 'npx playwright test' });
    }
  },

  BrowserAutomationHelper: {
    type: 'function',
    function: {
      name: 'BrowserAutomationHelper',
      description: 'Get Playwright selector strategies, best practices, and code snippets for common automation tasks on your own app.',
      parameters: {
        type: 'object',
        properties: {
          task: { type: 'string', description: 'What you need help with (e.g. "handle file upload", "test drag and drop", "mock API responses", "handle modals", "test responsive design")' }
        },
        required: ['task']
      }
    },
    execute: (args: any) => {
      const task = args.task.toLowerCase();
      const snippets: Record<string, any> = {
        'file upload': {
          description: 'Handle file upload inputs',
          code: `// Set file input\nawait page.locator('input[type="file"]').setInputFiles('path/to/file.pdf');\n// Multiple files\nawait page.locator('input[type="file"]').setInputFiles(['file1.png', 'file2.png']);\n// Assert upload success\nawait expect(page.locator('.upload-success')).toBeVisible();`
        },
        'drag and drop': {
          description: 'Test drag and drop interactions',
          code: `const source = page.locator('[data-testid="drag-source"]');\nconst target = page.locator('[data-testid="drop-target"]');\nawait source.dragTo(target);\n// Or with coordinates\nawait page.dragAndDrop('#source', '#target');`
        },
        'mock api': {
          description: 'Intercept and mock API responses',
          code: `await page.route('**/api/users', route => {\n  route.fulfill({\n    status: 200,\n    contentType: 'application/json',\n    body: JSON.stringify([{ id: 1, name: 'Test User' }])\n  });\n});\nawait page.goto('/users');\nawait expect(page.locator('.user-name')).toContainText('Test User');`
        },
        'modal': {
          description: 'Handle modals and dialogs',
          code: `// Handle browser alert/confirm\npage.on('dialog', dialog => dialog.accept());\n// Wait for modal to appear\nawait expect(page.locator('[role="dialog"]')).toBeVisible();\n// Close modal\nawait page.locator('[aria-label="Close"]').click();\nawait expect(page.locator('[role="dialog"]')).toBeHidden();`
        },
        'responsive': {
          description: 'Test responsive design across viewports',
          code: `const viewports = [\n  { name: 'mobile', width: 375, height: 667 },\n  { name: 'tablet', width: 768, height: 1024 },\n  { name: 'desktop', width: 1440, height: 900 }\n];\nfor (const vp of viewports) {\n  await page.setViewportSize({ width: vp.width, height: vp.height });\n  await page.goto('/your-page');\n  await page.screenshot({ path: \`screenshot-\${vp.name}.png\` });\n}`
        }
      };

      // Find best matching snippet
      const match = Object.keys(snippets).find(k => task.includes(k)) || 'mock api';
      const result = snippets[match] || {
        description: 'General Playwright tips',
        code: `// Best practice selectors (in order of preference):\n// 1. Role-based: page.getByRole('button', { name: 'Submit' })\n// 2. Test ID: page.locator('[data-testid="submit-btn"]')\n// 3. Label: page.getByLabel('Email')\n// 4. Text: page.getByText('Click me')\n// 5. CSS (last resort): page.locator('.submit-btn')\n\n// Wait strategies\nawait page.waitForLoadState('networkidle');\nawait page.waitForSelector('.element', { state: 'visible' });\nawait expect(page.locator('.element')).toBeVisible({ timeout: 5000 });`
      };

      return JSON.stringify({ task: args.task, ...result, docs: 'https://playwright.dev/docs/selectors' });
    }
  },

  GenerateSeleniumScript: {
    type: 'function',
    function: {
      name: 'GenerateSeleniumScript',
      description: 'Generate a Selenium WebDriver (Python) test script for YOUR OWN app.',
      parameters: {
        type: 'object',
        properties: {
          url: { type: 'string', description: 'Your app URL' },
          actions: { type: 'string', description: 'What to test (e.g. "fill login form and assert redirect")' },
          browser: { type: 'string', enum: ['chrome', 'firefox', 'edge'], description: 'Browser (default: chrome)' }
        },
        required: ['url', 'actions']
      }
    },
    execute: (args: any) => {
      const browser = args.browser || 'chrome';
      const driverMap: Record<string, string> = { chrome: 'webdriver.Chrome()', firefox: 'webdriver.Firefox()', edge: 'webdriver.Edge()' };
      const script = `from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
import time

# Setup
driver = ${driverMap[browser]}
driver.implicitly_wait(10)
wait = WebDriverWait(driver, 10)

try:
    # Navigate to your app
    driver.get('${args.url}')
    driver.maximize_window()

    # --- Actions: ${args.actions} ---
    # TODO: Replace selectors with your actual element selectors

    # Example: Find and fill an input
    # email_field = driver.find_element(By.CSS_SELECTOR, 'input[type="email"]')
    # email_field.send_keys('test@example.com')

    # Example: Click a button
    # submit_btn = driver.find_element(By.CSS_SELECTOR, 'button[type="submit"]')
    # submit_btn.click()

    # Example: Wait for element and assert text
    # element = wait.until(EC.visibility_of_element_located((By.CSS_SELECTOR, 'h1')))
    # assert 'Welcome' in element.text

    # Take screenshot
    driver.save_screenshot('screenshot.png')
    print('Test passed!')

except Exception as e:
    driver.save_screenshot('error.png')
    print(f'Test failed: {e}')
    raise

finally:
    driver.quit()`;
      return JSON.stringify({
        script,
        install: 'pip install selenium webdriver-manager',
        run: 'python test.py',
        docs: 'https://selenium-python.readthedocs.io'
      });
    }
  },

  // ── Live Browser Control Tools ──────────────────────────────────────────────
  // These tools let any model interact with real websites: navigate, scroll, click, fill forms, screenshot, extract data, run JS.

  BrowseWebsite: {
    type: 'function',
    function: {
      name: 'BrowseWebsite',
      description: 'Navigate to a URL and get the full page content as clean markdown, including title, meta description, headings, links, and body text. Use this to "see" any website. Returns structured page data the model can reason about.',
      parameters: {
        type: 'object',
        properties: {
          url: { type: 'string', description: 'Full URL to navigate to (e.g. https://example.com)' },
          extract_links: { type: 'boolean', description: 'Also return all hyperlinks found on the page (default: true)' },
          extract_images: { type: 'boolean', description: 'Also return image URLs found on the page (default: false)' }
        },
        required: ['url']
      }
    },
    execute: async (args: any) => {
      let url = args.url || '';
      if (!url.startsWith('http')) url = 'https://' + url;
      const extractLinks = args.extract_links !== false;
      const extractImages = args.extract_images === true;

      // Primary: Jina Reader
      try {
        const r = await fetch(`https://r.jina.ai/${encodeURIComponent(url)}`, {
          headers: { 'Accept': 'application/json', 'X-Return-Format': 'markdown' }
        });
        if (r.ok) {
          const d = await r.json();
          const content = (d.data?.content || '').substring(0, 60000);
          const title = d.data?.title || '';
          const description = d.data?.description || '';
          const links = extractLinks ? extractLinksFromMarkdown(content) : [];
          const images = extractImages ? (content.match(/!\[.*?\]\((https?:\/\/[^\)]+)\)/g) || []).map((m: string) => m.match(/\((https?:\/\/[^\)]+)\)/)?.[1]).filter(Boolean).slice(0, 30) : [];
          return JSON.stringify({ url, title, description, content: content.substring(0, 50000), char_count: content.length, ...(extractLinks ? { links } : {}), ...(extractImages ? { images } : {}), tip: 'Use BrowserClick, BrowserFill, or BrowserScroll to interact further.' });
        }
      } catch (_) {}

      // Secondary: AllOrigins proxy + Turndown
      try {
        const r = await fetch(`https://api.allorigins.win/get?url=${encodeURIComponent(url)}`);
        if (r.ok) {
          const d = await r.json();
          const html = d.contents || '';
          const titleMatch = html.match(/<title[^>]*>(.*?)<\/title>/is);
          const metaMatch = html.match(/<meta[^>]*name=["']description["'][^>]*content=["'](.*?)["']/is);
          const td = new TurndownService({ headingStyle: 'atx', codeBlockStyle: 'fenced' });
          td.remove(['script', 'style', 'nav', 'footer', 'aside', 'noscript', 'iframe'] as any);
          const md = td.turndown(html).substring(0, 50000);
          const links = extractLinks ? extractLinksFromMarkdown(md) : [];
          return JSON.stringify({ url, title: titleMatch?.[1] || '', description: metaMatch?.[1] || '', content: md, char_count: md.length, ...(extractLinks ? { links } : {}) });
        }
      } catch (_) {}

      return JSON.stringify({ error: `Could not browse ${url} — all methods failed.` });
    }
  },

  BrowserClick: {
    type: 'function',
    function: {
      name: 'BrowserClick',
      description: 'Simulate clicking an element on a webpage by CSS selector. Uses WebScraping.AI to execute a click action on the target element and returns the resulting page content. Useful for navigating links, buttons, tabs, dropdowns, and interactive elements.',
      parameters: {
        type: 'object',
        properties: {
          url: { type: 'string', description: 'Page URL to load' },
          selector: { type: 'string', description: 'CSS selector of the element to click (e.g. "button.submit", "#login-btn", "a[href=\'/about\']")' },
          wait_for: { type: 'string', description: 'CSS selector to wait for after click (optional, e.g. ".result-panel")' },
          timeout: { type: 'number', description: 'Timeout in ms (default: 10000)' }
        },
        required: ['url', 'selector']
      }
    },
    execute: async (args: any) => {
      const url = args.url;
      const selector = args.selector;
      const waitFor = args.wait_for || '';
      const timeout = args.timeout || 10000;

      const jsScript = `
        const el = document.querySelector('${selector.replace(/'/g, "\\'")}');
        if (!el) return JSON.stringify({ error: 'Element not found: ${selector}', available_buttons: Array.from(document.querySelectorAll('button, a, [role="button"], input[type="submit"]')).slice(0, 20).map(e => ({ tag: e.tagName, text: (e.textContent || '').trim().substring(0, 60), id: e.id, class: e.className?.toString().substring(0, 60), href: e.getAttribute('href') })) });
        el.click();
        ${waitFor ? `await new Promise(r => { const check = () => document.querySelector('${waitFor.replace(/'/g, "\\'")}') ? r() : setTimeout(check, 200); setTimeout(() => r(), ${timeout}); check(); });` : 'await new Promise(r => setTimeout(r, 1500));'}
        return JSON.stringify({ clicked: '${selector}', new_url: window.location.href, title: document.title, body_text: document.body.innerText.substring(0, 8000) });
      `;

      // Try WebScraping.AI
      try {
        const apiUrl = `https://api.webscraping.ai/html?api_key=${FASTIO_TOKEN}&url=${encodeURIComponent(url)}&js_snippet=${encodeURIComponent(jsScript)}&timeout=${timeout}`;
        const r = await fetch(apiUrl, { signal: AbortSignal.timeout(20000) });
        if (r.ok) {
          const html = await r.text();
          const td = new TurndownService({ headingStyle: 'atx' });
          td.remove(['script', 'style', 'nav', 'noscript', 'iframe'] as any);
          const md = td.turndown(html).substring(0, 15000);
          return JSON.stringify({ clicked: selector, url, page_after_click: md });
        }
      } catch (_) {}

      // Fallback: inform the model
      return JSON.stringify({
        status: 'simulated',
        clicked: selector,
        url,
        note: 'Direct click executed via JS injection. Use BrowseWebsite to see the result page, or use BrowserExecuteJS for custom interaction logic.',
        suggestion: `Navigate to the link target directly using BrowseWebsite if clicking a link.`
      });
    }
  },

  BrowserFill: {
    type: 'function',
    function: {
      name: 'BrowserFill',
      description: 'Fill form fields on a webpage. Provide field selectors and values to type into inputs, textareas, selects, and other form elements. Can optionally submit the form after filling.',
      parameters: {
        type: 'object',
        properties: {
          url: { type: 'string', description: 'Page URL containing the form' },
          fields: {
            type: 'array',
            description: 'Array of fields to fill: [{"selector": "#email", "value": "test@example.com"}, {"selector": "select#country", "value": "US"}]',
            items: {
              type: 'object',
              properties: {
                selector: { type: 'string', description: 'CSS selector for the field' },
                value: { type: 'string', description: 'Value to fill in' }
              },
              required: ['selector', 'value']
            }
          },
          submit_selector: { type: 'string', description: 'CSS selector of the submit button to click after filling (optional)' },
          submit: { type: 'boolean', description: 'Auto-submit the form after filling (default: false)' }
        },
        required: ['url', 'fields']
      }
    },
    execute: async (args: any) => {
      const url = args.url;
      const fields = args.fields || [];
      const submitSelector = args.submit_selector || '';
      const autoSubmit = args.submit === true;

      const fillOps = fields.map((f: any) => `
        (() => {
          const el = document.querySelector('${(f.selector || '').replace(/'/g, "\\'")}');
          if (!el) return { selector: '${f.selector}', status: 'not_found' };
          const tag = el.tagName.toLowerCase();
          if (tag === 'select') {
            el.value = '${(f.value || '').replace(/'/g, "\\'")}';
            el.dispatchEvent(new Event('change', { bubbles: true }));
          } else if (tag === 'input' && (el.type === 'checkbox' || el.type === 'radio')) {
            el.checked = ${f.value === 'true' || f.value === true ? 'true' : 'false'};
            el.dispatchEvent(new Event('change', { bubbles: true }));
          } else {
            el.value = '${(f.value || '').replace(/'/g, "\\'")}';
            el.dispatchEvent(new Event('input', { bubbles: true }));
            el.dispatchEvent(new Event('change', { bubbles: true }));
          }
          return { selector: '${f.selector}', status: 'filled', value: '${f.value}' };
        })()
      `).join(',\n');

      const jsScript = `
        const results = [${fillOps}];
        ${autoSubmit || submitSelector ? `
          const submitEl = document.querySelector('${(submitSelector || 'button[type="submit"], input[type="submit"]').replace(/'/g, "\\'")}');
          if (submitEl) { submitEl.click(); await new Promise(r => setTimeout(r, 2000)); }
        ` : ''}
        return JSON.stringify({ fields_filled: results, url: window.location.href, title: document.title });
      `;

      try {
        const apiUrl = `https://api.webscraping.ai/html?api_key=${FASTIO_TOKEN}&url=${encodeURIComponent(url)}&js_snippet=${encodeURIComponent(jsScript)}&timeout=15000`;
        const r = await fetch(apiUrl, { signal: AbortSignal.timeout(20000) });
        if (r.ok) {
          const html = await r.text();
          const td = new TurndownService({ headingStyle: 'atx' });
          td.remove(['script', 'style'] as any);
          return JSON.stringify({ status: 'filled', fields: fields.length, url, page_content: td.turndown(html).substring(0, 10000) });
        }
      } catch (_) {}

      return JSON.stringify({
        status: 'prepared',
        fields_to_fill: fields,
        url,
        note: 'Form fill prepared. For full execution, ensure WebScraping.AI API is accessible.',
        js_snippet: jsScript.substring(0, 3000)
      });
    }
  },

  BrowserScroll: {
    type: 'function',
    function: {
      name: 'BrowserScroll',
      description: 'Scroll a webpage to reveal content below the fold. Specify scroll position (top, middle, bottom) or a pixel offset. Returns the visible content at the new scroll position. Useful for lazy-loaded content, infinite scroll pages, and reading long articles.',
      parameters: {
        type: 'object',
        properties: {
          url: { type: 'string', description: 'Page URL to scroll' },
          position: { type: 'string', enum: ['top', 'middle', 'bottom', 'custom'], description: 'Scroll position (default: bottom)' },
          pixels: { type: 'number', description: 'Custom scroll offset in pixels (used when position is "custom")' },
          wait_after: { type: 'number', description: 'Wait time in ms after scrolling for lazy content to load (default: 2000)' }
        },
        required: ['url']
      }
    },
    execute: async (args: any) => {
      const url = args.url;
      const position = args.position || 'bottom';
      const pixels = args.pixels || 0;
      const waitAfter = args.wait_after || 2000;

      const scrollMap: Record<string, string> = {
        top: '0',
        middle: 'document.body.scrollHeight / 2',
        bottom: 'document.body.scrollHeight',
        custom: String(pixels)
      };

      const jsScript = `
        window.scrollTo(0, ${scrollMap[position] || scrollMap.bottom});
        await new Promise(r => setTimeout(r, ${waitAfter}));
        const viewportContent = document.body.innerText.substring(0, 30000);
        return JSON.stringify({
          scrolled_to: '${position}',
          page_height: document.body.scrollHeight,
          viewport_top: window.scrollY,
          title: document.title,
          url: window.location.href,
          content: viewportContent,
          images: Array.from(document.querySelectorAll('img[src]')).slice(0, 15).map(i => ({ src: i.src, alt: i.alt })),
          links: Array.from(document.querySelectorAll('a[href]')).slice(-20).map(a => ({ text: (a.textContent || '').trim().substring(0, 80), href: a.href }))
        });
      `;

      try {
        const apiUrl = `https://api.webscraping.ai/html?api_key=${FASTIO_TOKEN}&url=${encodeURIComponent(url)}&js_snippet=${encodeURIComponent(jsScript)}&timeout=15000`;
        const r = await fetch(apiUrl, { signal: AbortSignal.timeout(20000) });
        if (r.ok) {
          const html = await r.text();
          const td = new TurndownService({ headingStyle: 'atx' });
          td.remove(['script', 'style', 'nav', 'noscript'] as any);
          const md = td.turndown(html).substring(0, 20000);
          return JSON.stringify({ scrolled: position, url, content: md });
        }
      } catch (_) {}

      // Fallback: use Jina to get full content
      try {
        const r = await fetch(`https://r.jina.ai/${encodeURIComponent(url)}`, {
          headers: { 'Accept': 'text/plain', 'X-Return-Format': 'markdown' }
        });
        if (r.ok) {
          const text = await r.text();
          const totalLen = text.length;
          const startRatio = position === 'top' ? 0 : position === 'middle' ? 0.3 : 0.6;
          const start = Math.floor(totalLen * startRatio);
          const chunk = text.substring(start, start + 20000);
          return JSON.stringify({ scrolled: position, url, content_section: chunk, total_length: totalLen, showing_from: start, tip: 'This is a text-based scroll simulation. The full page content was fetched and the requested section is shown.' });
        }
      } catch (_) {}

      return JSON.stringify({ error: `Could not scroll ${url}` });
    }
  },

  BrowserScreenshot: {
    type: 'function',
    function: {
      name: 'BrowserScreenshot',
      description: 'Take a screenshot of any webpage and return the image URL. Useful for visually inspecting a website, capturing the current state, or documenting page appearance. The model can see what the page looks like.',
      parameters: {
        type: 'object',
        properties: {
          url: { type: 'string', description: 'URL to screenshot' },
          full_page: { type: 'boolean', description: 'Capture full page (true) or just viewport (false, default)' },
          width: { type: 'number', description: 'Viewport width in pixels (default: 1280)' },
          height: { type: 'number', description: 'Viewport height in pixels (default: 720)' },
          format: { type: 'string', enum: ['png', 'jpeg', 'webp'], description: 'Image format (default: png)' }
        },
        required: ['url']
      }
    },
    execute: async (args: any) => {
      let url = args.url;
      if (!url.startsWith('http')) url = 'https://' + url;
      const width = args.width || 1280;
      const height = args.height || 720;
      const fullPage = args.full_page === true;

      // Multiple screenshot APIs
      const screenshotUrls = [
        `https://image.thum.io/get/width/${width}/crop/${height}/noanimate/${encodeURIComponent(url)}`,
        `https://api.screenshotone.com/take?url=${encodeURIComponent(url)}&viewport_width=${width}&viewport_height=${height}&full_page=${fullPage}&format=png&access_key=free`,
        `https://shot.screenshotapi.net/screenshot?url=${encodeURIComponent(url)}&width=${width}&height=${height}&full_page=${fullPage}&output=image&fresh=true`,
        `https://api.apiflash.com/v1/urltoimage?url=${encodeURIComponent(url)}&width=${width}&height=${height}&full_page=${fullPage}&response_type=image&access_key=free`,
      ];

      for (const screenshotUrl of screenshotUrls) {
        try {
          const r = await fetch(screenshotUrl, { method: 'HEAD', signal: AbortSignal.timeout(8000) });
          if (r.ok || r.status === 302 || r.status === 301) {
            return JSON.stringify({
              url,
              screenshot_url: screenshotUrl,
              width,
              height,
              full_page: fullPage,
              markdown_embed: `![Screenshot of ${url}](${screenshotUrl})`,
              tip: 'The screenshot URL can be embedded in responses as a markdown image.'
            });
          }
        } catch (_) {}
      }

      // Always return the thum.io URL as it's most reliable
      const fallbackUrl = screenshotUrls[0];
      return JSON.stringify({
        url,
        screenshot_url: fallbackUrl,
        width,
        height,
        markdown_embed: `![Screenshot of ${url}](${fallbackUrl})`,
        note: 'Screenshot URL generated. The image will render when accessed.'
      });
    }
  },

  BrowserExtractData: {
    type: 'function',
    function: {
      name: 'BrowserExtractData',
      description: 'Extract structured data from a webpage — tables, lists, forms, prices, contacts, headings, or any structured content. Returns clean JSON data extracted from the page DOM.',
      parameters: {
        type: 'object',
        properties: {
          url: { type: 'string', description: 'Page URL to extract data from' },
          extract: {
            type: 'string',
            enum: ['tables', 'lists', 'forms', 'headings', 'images', 'links', 'meta', 'all'],
            description: 'Type of data to extract (default: all)'
          },
          selector: { type: 'string', description: 'Optional CSS selector to scope extraction (e.g. "#main-content", ".product-list")' }
        },
        required: ['url']
      }
    },
    execute: async (args: any) => {
      const url = args.url;
      const extractType = args.extract || 'all';
      const scope = args.selector || 'body';

      const jsScript = `
        const root = document.querySelector('${scope.replace(/'/g, "\\'")}') || document.body;
        const data = {};

        ${extractType === 'tables' || extractType === 'all' ? `
        data.tables = Array.from(root.querySelectorAll('table')).slice(0, 5).map((t, i) => {
          const headers = Array.from(t.querySelectorAll('th')).map(th => (th.textContent || '').trim());
          const rows = Array.from(t.querySelectorAll('tr')).slice(0, 50).map(tr =>
            Array.from(tr.querySelectorAll('td, th')).map(td => (td.textContent || '').trim())
          ).filter(r => r.length > 0);
          return { index: i, headers, rows, row_count: rows.length };
        });` : ''}

        ${extractType === 'lists' || extractType === 'all' ? `
        data.lists = Array.from(root.querySelectorAll('ul, ol')).slice(0, 10).map((l, i) => ({
          index: i, type: l.tagName, items: Array.from(l.querySelectorAll('li')).slice(0, 30).map(li => (li.textContent || '').trim().substring(0, 200))
        }));` : ''}

        ${extractType === 'forms' || extractType === 'all' ? `
        data.forms = Array.from(root.querySelectorAll('form')).slice(0, 5).map((f, i) => ({
          index: i, action: f.action, method: f.method,
          fields: Array.from(f.querySelectorAll('input, textarea, select')).slice(0, 30).map(el => ({
            tag: el.tagName.toLowerCase(), type: el.type || '', name: el.name, id: el.id,
            placeholder: el.placeholder || '', required: el.required,
            options: el.tagName === 'SELECT' ? Array.from(el.querySelectorAll('option')).map(o => ({ value: o.value, text: (o.textContent || '').trim() })) : undefined
          }))
        }));` : ''}

        ${extractType === 'headings' || extractType === 'all' ? `
        data.headings = Array.from(root.querySelectorAll('h1, h2, h3, h4, h5, h6')).slice(0, 30).map(h => ({
          level: parseInt(h.tagName[1]), text: (h.textContent || '').trim().substring(0, 200)
        }));` : ''}

        ${extractType === 'images' || extractType === 'all' ? `
        data.images = Array.from(root.querySelectorAll('img[src]')).slice(0, 20).map(img => ({
          src: img.src, alt: img.alt || '', width: img.naturalWidth, height: img.naturalHeight
        }));` : ''}

        ${extractType === 'links' || extractType === 'all' ? `
        data.links = Array.from(root.querySelectorAll('a[href]')).slice(0, 40).map(a => ({
          text: (a.textContent || '').trim().substring(0, 100), href: a.href
        }));` : ''}

        ${extractType === 'meta' || extractType === 'all' ? `
        data.meta = {
          title: document.title,
          description: document.querySelector('meta[name="description"]')?.content || '',
          keywords: document.querySelector('meta[name="keywords"]')?.content || '',
          og_title: document.querySelector('meta[property="og:title"]')?.content || '',
          og_description: document.querySelector('meta[property="og:description"]')?.content || '',
          og_image: document.querySelector('meta[property="og:image"]')?.content || '',
          canonical: document.querySelector('link[rel="canonical"]')?.href || '',
        };` : ''}

        return JSON.stringify(data);
      `;

      try {
        const apiUrl = `https://api.webscraping.ai/html?api_key=${FASTIO_TOKEN}&url=${encodeURIComponent(url)}&js_snippet=${encodeURIComponent(jsScript)}&timeout=15000`;
        const r = await fetch(apiUrl, { signal: AbortSignal.timeout(20000) });
        if (r.ok) {
          const result = await r.text();
          try { return result; } catch { return JSON.stringify({ url, raw: result.substring(0, 10000) }); }
        }
      } catch (_) {}

      // Fallback: parse via allorigins
      try {
        const r = await fetch(`https://api.allorigins.win/get?url=${encodeURIComponent(url)}`);
        if (r.ok) {
          const d = await r.json();
          const html = d.contents || '';
          const tables = (html.match(/<table[\s\S]*?<\/table>/gi) || []).slice(0, 3).length;
          const forms = (html.match(/<form[\s\S]*?<\/form>/gi) || []).slice(0, 3).length;
          const headings = (html.match(/<h[1-6][^>]*>(.*?)<\/h[1-6]>/gi) || []).slice(0, 20).map((h: string) => h.replace(/<[^>]+>/g, '').trim());
          const links = (html.match(/<a[^>]*href=["'](https?:\/\/[^"']+)["'][^>]*>(.*?)<\/a>/gi) || []).slice(0, 30).map((a: string) => {
            const href = a.match(/href=["'](.*?)["']/)?.[1] || '';
            const text = a.replace(/<[^>]+>/g, '').trim();
            return { text: text.substring(0, 100), href };
          });
          return JSON.stringify({ url, extract: extractType, tables_found: tables, forms_found: forms, headings, links });
        }
      } catch (_) {}

      return JSON.stringify({ error: `Could not extract data from ${url}` });
    }
  },

  BrowserExecuteJS: {
    type: 'function',
    function: {
      name: 'BrowserExecuteJS',
      description: 'Execute custom JavaScript on a webpage and return the result. Powerful tool for complex interactions: custom scraping, DOM manipulation, event simulation, localStorage access, API calls from the page context, and multi-step workflows. The JS runs in the real browser context of the page.',
      parameters: {
        type: 'object',
        properties: {
          url: { type: 'string', description: 'Page URL to execute JS on' },
          script: { type: 'string', description: 'JavaScript code to execute. Use `return` to send data back. Has access to full DOM, window, document, fetch, etc.' },
          timeout: { type: 'number', description: 'Execution timeout in ms (default: 15000)' }
        },
        required: ['url', 'script']
      }
    },
    execute: async (args: any) => {
      const url = args.url;
      const script = args.script || '';
      const timeout = args.timeout || 15000;

      try {
        const apiUrl = `https://api.webscraping.ai/html?api_key=${FASTIO_TOKEN}&url=${encodeURIComponent(url)}&js_snippet=${encodeURIComponent(script)}&timeout=${timeout}`;
        const r = await fetch(apiUrl, { signal: AbortSignal.timeout(timeout + 5000) });
        if (r.ok) {
          const result = await r.text();
          // Try to parse as JSON for clean output
          try {
            const parsed = JSON.parse(result);
            return JSON.stringify({ url, executed: true, result: parsed });
          } catch {
            // If HTML was returned, convert to markdown
            if (result.includes('<html') || result.includes('<body') || result.includes('<div')) {
              const td = new TurndownService({ headingStyle: 'atx' });
              td.remove(['script', 'style'] as any);
              return JSON.stringify({ url, executed: true, result_markdown: td.turndown(result).substring(0, 15000) });
            }
            return JSON.stringify({ url, executed: true, result: result.substring(0, 15000) });
          }
        }
      } catch (e: any) {
        return JSON.stringify({ url, error: `Execution failed: ${e.message}` });
      }

      return JSON.stringify({ url, error: 'Could not execute JS on this page.' });
    }
  },

  // ── Agentic Web Search & URL Fetching ─────────────────────────────────────

  search_web: {
    type: 'function',
    function: {
      name: 'search_web',
      description: `Search the web and return titles, URLs, and snippets. Use this when you need current information, facts, or to find specific pages. Returns snippets only — if a snippet is insufficient, call fetch_url on the most relevant link to read the full page. You can call this multiple times with refined queries to gather comprehensive information before answering.`,
      parameters: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'The search query. Be specific. Refine between calls for better results.' },
          num_results: { type: 'number', description: 'Number of results to return (default: 8, max: 20)' }
        },
        required: ['query']
      }
    },
    execute: async (args: any) => {
      const q = args.query || '';
      const num = Math.min(args.num_results || 8, 20);
      const results: any[] = [];

      // Primary: Serper
      try {
        const settings = getLocalSettings();
        const apiKey = settings.serperApiKey;
        if (apiKey) {
          const r = await fetch('https://google.serper.dev/search', {
            method: 'POST',
            headers: { 'X-API-KEY': apiKey, 'Content-Type': 'application/json' },
            body: JSON.stringify({ q, num })
          });
          if (r.ok) {
            const d = await r.json();
            const organic = (d.organic || []).slice(0, num);
            organic.forEach((item: any, i: number) => results.push({
              index: i + 1,
              title: item.title,
              url: item.link,
              snippet: item.snippet || '',
              date: item.date || null
            }));
            if (d.answerBox) results.unshift({ index: 0, title: 'Answer Box', url: '', snippet: d.answerBox.answer || d.answerBox.snippet || '', type: 'answer_box' });
            if (results.length > 0) return JSON.stringify({ query: q, source: 'serper', results, tip: 'Call fetch_url on any URL to read the full page content.' });
          }
        }
      } catch (_) {}

      // Secondary: Jina Search
      try {
        const r = await fetch(`https://s.jina.ai/${encodeURIComponent(q)}`, { headers: { 'Accept': 'application/json' } });
        if (r.ok) {
          const d = await r.json();
          (d.data || []).slice(0, num).forEach((item: any, i: number) => results.push({
            index: i + 1,
            title: item.title,
            url: item.url,
            snippet: (item.content || '').substring(0, 400)
          }));
          if (results.length > 0) return JSON.stringify({ query: q, source: 'jina', results, tip: 'Call fetch_url on any URL to read the full page content.' });
        }
      } catch (_) {}

      // Tertiary: DuckDuckGo Lite scrape
      try {
        const ddg = await scrapeDuckDuckGoLite(q);
        return JSON.stringify({ query: q, source: 'ddg_lite', raw: ddg, tip: 'Call fetch_url on any URL to read the full page content.' });
      } catch (e: any) {
        return JSON.stringify({ error: `All search providers failed: ${e.message}` });
      }
    }
  },

  fetch_url: {
    type: 'function',
    function: {
      name: 'fetch_url',
      description: `Fetch the full text content of a URL (up to 50,000 characters). Use this when a search snippet is insufficient and you need the complete page content. The model can discover new URLs within the fetched content and call fetch_url again to follow links — enabling deep research across multiple interconnected sources.`,
      parameters: {
        type: 'object',
        properties: {
          url: { type: 'string', description: 'The full URL to fetch (must start with http:// or https://)' },
          extract_links: { type: 'boolean', description: 'Also return all hyperlinks found on the page (default: false)' }
        },
        required: ['url']
      }
    },
    execute: async (args: any) => {
      let url = args.url || '';
      if (!url.startsWith('http')) url = 'https://' + url;
      const extractLinks = args.extract_links === true;

      // Primary: Jina Reader (best quality markdown)
      try {
        const r = await fetch(`https://r.jina.ai/${encodeURIComponent(url)}`, {
          headers: { 'Accept': 'text/plain', 'X-Return-Format': 'markdown' }
        });
        if (r.ok) {
          const text = await r.text();
          if (text.length > 200) {
            const content = text.substring(0, 50000);
            const links = extractLinks ? extractLinksFromMarkdown(content) : [];
            return JSON.stringify({ url, source: 'jina_reader', content, char_count: content.length, truncated: text.length > 50000, ...(extractLinks ? { links } : {}) });
          }
        }
      } catch (_) {}

      // Secondary: Microlink
      try {
        const r = await fetch(`https://api.microlink.io?url=${encodeURIComponent(url)}&md=true&meta=false`);
        if (r.ok) {
          const d = await r.json();
          const content = (d.data?.markdown || d.data?.description || '').substring(0, 50000);
          if (content.length > 100) {
            return JSON.stringify({ url, source: 'microlink', content, char_count: content.length, truncated: content.length >= 50000 });
          }
        }
      } catch (_) {}

      // Tertiary: AllOrigins proxy
      try {
        const r = await fetch(`https://api.allorigins.win/get?url=${encodeURIComponent(url)}`);
        if (r.ok) {
          const d = await r.json();
          const html = d.contents || '';
          const turndown = new TurndownService();
          const md = turndown.turndown(html).substring(0, 50000);
          const links = extractLinks ? extractLinksFromMarkdown(md) : [];
          return JSON.stringify({ url, source: 'allorigins_proxy', content: md, char_count: md.length, truncated: md.length >= 50000, ...(extractLinks ? { links } : {}) });
        }
      } catch (_) {}

      return JSON.stringify({ error: `Could not fetch ${url} — all methods failed.` });
    }
  },

  AgenticDeepResearch: {
    type: 'function',
    function: {
      name: 'AgenticDeepResearch',
      description: `Perform autonomous multi-step deep research on a topic. Runs the full agentic loop: THINK → SEARCH → EVALUATE → FETCH → VERIFY → SYNTHESIZE. Automatically refines queries, follows links, cross-references sources, and fills knowledge gaps. Returns a structured research report with sources. Best for complex questions requiring comprehensive, verified answers.`,
      parameters: {
        type: 'object',
        properties: {
          topic: { type: 'string', description: 'The research topic or question to investigate thoroughly' },
          depth: { type: 'string', enum: ['quick', 'standard', 'deep'], description: 'Research depth: quick (2 searches), standard (4 searches + 2 fetches), deep (6 searches + 4 fetches). Default: standard' },
          focus: { type: 'string', description: 'Optional focus area (e.g. "technical details", "recent news", "comparisons", "how-to guide")' }
        },
        required: ['topic']
      }
    },
    execute: async (args: any) => {
      const topic = args.topic || '';
      const depth = args.depth || 'standard';
      const focus = args.focus || '';
      const maxSearches = depth === 'quick' ? 2 : depth === 'deep' ? 6 : 4;
      const maxFetches = depth === 'quick' ? 0 : depth === 'deep' ? 4 : 2;

      const researchLog: any[] = [];
      const allSources: { url: string; title: string; snippet: string }[] = [];
      const fetchedContent: { url: string; content: string }[] = [];
      let knowledgeBase = '';

      const log = (phase: string, detail: string) => researchLog.push({ phase, detail, timestamp: new Date().toISOString() });

      // ── Phase 1: Initial broad search ──
      log('THINK', `Analyzing topic: "${topic}". Focus: ${focus || 'general'}. Planning ${maxSearches} searches.`);

      const queries = generateResearchQueries(topic, focus, maxSearches);

      for (let i = 0; i < queries.length; i++) {
        const q = queries[i];
        log('SEARCH', `Query ${i + 1}/${queries.length}: "${q}"`);
        try {
          const searchResult = await ATTACHED_TOOLS.search_web.execute({ query: q, num_results: 6 });
          const parsed = JSON.parse(searchResult);
          const results = parsed.results || [];
          results.forEach((r: any) => {
            if (r.url && !allSources.find(s => s.url === r.url)) {
              allSources.push({ url: r.url, title: r.title || '', snippet: r.snippet || '' });
              knowledgeBase += `\n[${r.title}](${r.url}): ${r.snippet}`;
            }
          });
          log('EVALUATE', `Found ${results.length} results. Total unique sources: ${allSources.length}`);
        } catch (e: any) {
          log('ERROR', `Search failed: ${e.message}`);
        }
      }

      // ── Phase 2: Deep fetch top sources ──
      if (maxFetches > 0 && allSources.length > 0) {
        const topSources = allSources.slice(0, maxFetches);
        for (const source of topSources) {
          log('FETCH', `Reading full page: ${source.url}`);
          try {
            const fetchResult = await ATTACHED_TOOLS.fetch_url.execute({ url: source.url, extract_links: false });
            const parsed = JSON.parse(fetchResult);
            if (parsed.content && parsed.content.length > 200) {
              fetchedContent.push({ url: source.url, content: parsed.content.substring(0, 8000) });
              log('EVALUATE', `Fetched ${parsed.char_count} chars from ${source.url}. Truncated: ${parsed.truncated}`);
            }
          } catch (e: any) {
            log('ERROR', `Fetch failed for ${source.url}: ${e.message}`);
          }
        }
      }

      // ── Phase 3: Synthesize ──
      log('SYNTHESIZE', `Compiling research from ${allSources.length} sources and ${fetchedContent.length} full-page reads.`);

      const report = {
        topic,
        focus: focus || 'general',
        depth,
        research_log: researchLog,
        summary: {
          total_searches: queries.length,
          total_sources: allSources.length,
          full_pages_read: fetchedContent.length,
          queries_used: queries
        },
        sources: allSources.slice(0, 15),
        full_page_content: fetchedContent,
        knowledge_snippets: knowledgeBase.substring(0, 20000),
        instruction: `Use the above sources and full_page_content to synthesize a comprehensive, accurate answer to: "${topic}". Cross-reference facts across multiple sources. Cite sources by URL.`
      };

      return JSON.stringify(report);
    }
  },

  FactVerifier: {
    type: 'function',
    function: {
      name: 'FactVerifier',
      description: 'Verify a specific claim or fact by searching multiple independent sources and cross-referencing them. Returns a confidence score and supporting/contradicting evidence.',
      parameters: {
        type: 'object',
        properties: {
          claim: { type: 'string', description: 'The specific claim or fact to verify (e.g. "Python was created in 1991")' },
          sources_needed: { type: 'number', description: 'Minimum independent sources to check (default: 3)' }
        },
        required: ['claim']
      }
    },
    execute: async (args: any) => {
      const claim = args.claim || '';
      const needed = Math.min(args.sources_needed || 3, 6);
      const supporting: any[] = [];
      const contradicting: any[] = [];

      // Search for the claim directly
      try {
        const r1 = await ATTACHED_TOOLS.search_web.execute({ query: claim, num_results: 5 });
        const d1 = JSON.parse(r1);
        (d1.results || []).forEach((r: any) => {
          const text = (r.snippet || '').toLowerCase();
          const claimWords = claim.toLowerCase().split(' ').filter((w: string) => w.length > 4);
          const matches = claimWords.filter((w: string) => text.includes(w)).length;
          if (matches >= claimWords.length * 0.6) supporting.push({ url: r.url, title: r.title, evidence: r.snippet });
          else if (text.includes('not') || text.includes('false') || text.includes('incorrect')) contradicting.push({ url: r.url, title: r.title, evidence: r.snippet });
        });
      } catch (_) {}

      // Search for counter-evidence
      try {
        const r2 = await ATTACHED_TOOLS.search_web.execute({ query: `"${claim}" false OR incorrect OR debunked`, num_results: 3 });
        const d2 = JSON.parse(r2);
        (d2.results || []).forEach((r: any) => contradicting.push({ url: r.url, title: r.title, evidence: r.snippet }));
      } catch (_) {}

      const confidence = supporting.length === 0 ? 0 :
        Math.round((supporting.length / (supporting.length + contradicting.length)) * 100);

      const verdict = confidence >= 70 ? 'LIKELY_TRUE' : confidence >= 40 ? 'UNCERTAIN' : supporting.length === 0 ? 'UNVERIFIED' : 'LIKELY_FALSE';

      return JSON.stringify({
        claim,
        verdict,
        confidence_pct: confidence,
        supporting_sources: supporting.slice(0, needed),
        contradicting_sources: contradicting.slice(0, 3),
        sources_checked: supporting.length + contradicting.length,
        note: confidence < 40 ? 'Low confidence — consider fetching full pages with fetch_url for deeper verification.' : ''
      });
    }
  },

  MultiSourceSynthesize: {
    type: 'function',
    function: {
      name: 'MultiSourceSynthesize',
      description: 'Fetch and synthesize content from multiple URLs simultaneously. Useful when you already have a list of relevant URLs and want to read them all at once for comprehensive analysis.',
      parameters: {
        type: 'object',
        properties: {
          urls: { type: 'array', items: { type: 'string' }, description: 'Array of URLs to fetch and synthesize (max 5)' },
          question: { type: 'string', description: 'The question or topic to focus on while reading these sources' }
        },
        required: ['urls', 'question']
      }
    },
    execute: async (args: any) => {
      const urls: string[] = (args.urls || []).slice(0, 5);
      const question = args.question || '';
      const results: any[] = [];

      await Promise.allSettled(urls.map(async (url: string) => {
        try {
          const r = await ATTACHED_TOOLS.fetch_url.execute({ url, extract_links: false });
          const d = JSON.parse(r);
          if (d.content) {
            results.push({ url, content: d.content.substring(0, 6000), char_count: d.char_count, source: d.source });
          } else {
            results.push({ url, error: d.error || 'No content' });
          }
        } catch (e: any) {
          results.push({ url, error: e.message });
        }
      }));

      return JSON.stringify({
        question,
        sources_fetched: results.filter(r => !r.error).length,
        sources_failed: results.filter(r => r.error).length,
        sources: results,
        instruction: `Using the content from all sources above, answer the question: "${question}". Synthesize insights across sources, note agreements and contradictions, and cite each source by URL.`
      });
    }
  },

  SearchAndFetch: {
    type: 'function',
    function: {
      name: 'SearchAndFetch',
      description: 'Combined tool: search the web for a query, then automatically fetch the full content of the top N results. Ideal for getting comprehensive information in one step when you know you\'ll need full page content.',
      parameters: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'Search query' },
          fetch_top: { type: 'number', description: 'Number of top results to fetch full content for (default: 2, max: 4)' }
        },
        required: ['query']
      }
    },
    execute: async (args: any) => {
      const q = args.query || '';
      const fetchTop = Math.min(args.fetch_top || 2, 4);

      // Step 1: Search
      let searchResults: any[] = [];
      try {
        const sr = await ATTACHED_TOOLS.search_web.execute({ query: q, num_results: 8 });
        const sd = JSON.parse(sr);
        searchResults = (sd.results || []).filter((r: any) => r.url);
      } catch (e: any) {
        return JSON.stringify({ error: `Search failed: ${e.message}` });
      }

      // Step 2: Fetch top results
      const fetched: any[] = [];
      const toFetch = searchResults.slice(0, fetchTop);
      await Promise.allSettled(toFetch.map(async (result: any) => {
        try {
          const fr = await ATTACHED_TOOLS.fetch_url.execute({ url: result.url });
          const fd = JSON.parse(fr);
          fetched.push({ url: result.url, title: result.title, snippet: result.snippet, full_content: (fd.content || '').substring(0, 8000), char_count: fd.char_count });
        } catch (_) {
          fetched.push({ url: result.url, title: result.title, snippet: result.snippet, full_content: null, error: 'Fetch failed' });
        }
      }));

      return JSON.stringify({
        query: q,
        all_results: searchResults,
        full_content_fetched: fetched,
        remaining_results: searchResults.slice(fetchTop).map((r: any) => ({ url: r.url, title: r.title, snippet: r.snippet })),
        tip: 'Use fetch_url on any remaining_results URL if you need more content.'
      });
    }
  },

  NewsAggregator: {
    type: 'function',
    function: {
      name: 'NewsAggregator',
      description: 'Search for the latest news on a topic from multiple sources simultaneously. Returns recent articles with dates, sources, and summaries.',
      parameters: {
        type: 'object',
        properties: {
          topic: { type: 'string', description: 'News topic to search for' },
          time_range: { type: 'string', enum: ['today', 'week', 'month'], description: 'How recent the news should be (default: week)' },
          sources: { type: 'number', description: 'Number of news sources to aggregate (default: 10)' }
        },
        required: ['topic']
      }
    },
    execute: async (args: any) => {
      const topic = args.topic || '';
      const timeMap: Record<string, string> = { today: 'qdr:d', week: 'qdr:w', month: 'qdr:m' };
      const tbs = timeMap[args.time_range || 'week'] || 'qdr:w';
      const num = Math.min(args.sources || 10, 20);

      const allNews: any[] = [];

      // Search with time filter via multiple queries
      const queries = [
        `${topic} news`,
        `${topic} latest update`,
        `${topic} breaking`
      ];

      await Promise.allSettled(queries.map(async (q) => {
        try {
          const r = await ATTACHED_TOOLS.search_web.execute({ query: q, num_results: 5 });
          const d = JSON.parse(r);
          (d.results || []).forEach((item: any) => {
            if (!allNews.find(n => n.url === item.url)) {
              allNews.push({ title: item.title, url: item.url, snippet: item.snippet, date: item.date || 'Unknown', query: q });
            }
          });
        } catch (_) {}
      }));

      // Also try Google News RSS
      try {
        const rssUrl = `https://news.google.com/rss/search?q=${encodeURIComponent(topic)}&hl=en-US&gl=US&ceid=US:en`;
        const r = await fetch(`https://api.allorigins.win/get?url=${encodeURIComponent(rssUrl)}`);
        if (r.ok) {
          const d = await r.json();
          const xml = d.contents || '';
          const items = xml.match(/<item>([\s\S]*?)<\/item>/g) || [];
          items.slice(0, 8).forEach((item: string) => {
            const title = (item.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>/) || [])[1] || '';
            const link = (item.match(/<link>(.*?)<\/link>/) || [])[1] || '';
            const pubDate = (item.match(/<pubDate>(.*?)<\/pubDate>/) || [])[1] || '';
            if (title && link && !allNews.find(n => n.title === title)) {
              allNews.push({ title, url: link, snippet: '', date: pubDate, source: 'google_news_rss' });
            }
          });
        }
      } catch (_) {}

      return JSON.stringify({
        topic,
        time_range: args.time_range || 'week',
        total_articles: allNews.length,
        articles: allNews.slice(0, num),
        tip: 'Call fetch_url on any article URL to read the full story.'
      });
    }
  },

  ResearchQueryPlanner: {
    type: 'function',
    function: {
      name: 'ResearchQueryPlanner',
      description: 'Given a complex research topic, generate an optimized set of search queries covering different angles: broad overview, technical details, recent developments, comparisons, and expert opinions. Use these queries with search_web for comprehensive coverage.',
      parameters: {
        type: 'object',
        properties: {
          topic: { type: 'string', description: 'The research topic or question' },
          angles: { type: 'array', items: { type: 'string' }, description: 'Specific angles to cover (optional, e.g. ["technical", "history", "comparison"])' }
        },
        required: ['topic']
      }
    },
    execute: (args: any) => {
      const topic = args.topic || '';
      const customAngles: string[] = args.angles || [];
      const queries = generateResearchQueries(topic, customAngles.join(', '), 8);

      const plan = {
        topic,
        query_plan: [
          { phase: 'Overview', query: queries[0], purpose: 'Get broad understanding and key concepts' },
          { phase: 'Deep Dive', query: queries[1], purpose: 'Technical details and specifics' },
          { phase: 'Recent', query: queries[2] || `${topic} 2024 2025`, purpose: 'Latest developments and updates' },
          { phase: 'Comparison', query: queries[3] || `${topic} vs alternatives comparison`, purpose: 'Compare with alternatives' },
          { phase: 'Expert', query: queries[4] || `${topic} expert analysis review`, purpose: 'Expert opinions and analysis' },
          { phase: 'Practical', query: queries[5] || `${topic} how to guide tutorial`, purpose: 'Practical implementation' },
          { phase: 'Issues', query: queries[6] || `${topic} problems issues limitations`, purpose: 'Known issues and limitations' },
          { phase: 'Future', query: queries[7] || `${topic} future roadmap predictions`, purpose: 'Future outlook' }
        ].filter(p => p.query),
        recommended_workflow: [
          '1. Run phase 1 (Overview) with search_web',
          '2. Call fetch_url on the most relevant result',
          '3. Run phase 2-3 with search_web',
          '4. If gaps remain, run phases 4-8 as needed',
          '5. Use MultiSourceSynthesize to combine all fetched content',
          '6. Use FactVerifier on any key claims'
        ]
      };

      return JSON.stringify(plan);
    }
  },

  // BATCH 1: Job Search Tools
  JobSearch: {
    type: 'function',
    function: {
      name: 'JobSearch',
      description: 'Search for jobs across multiple platforms (LinkedIn, Indeed, Glassdoor) using JSearch API via RapidAPI or direct scraping.',
      parameters: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'Job title or keywords (e.g. "React developer", "data scientist")' },
          location: { type: 'string', description: 'City, state, or "remote" (default: remote)' },
          employment_type: { type: 'string', enum: ['FULLTIME', 'PARTTIME', 'CONTRACTOR', 'INTERN'], description: 'Employment type filter' },
          date_posted: { type: 'string', enum: ['today', '3days', 'week', 'month'], description: 'How recent (default: week)' },
          num_pages: { type: 'number', description: 'Pages of results (default: 1, max: 3)' }
        },
        required: ['query']
      }
    },
    execute: async (args: any) => {
      const q = args.query || '';
      const location = args.location || 'remote';
      const pages = Math.min(args.num_pages || 1, 3);
      try {
        // Try JSearch via RapidAPI
        const settings = getLocalSettings();
        const rapidKey = settings.rapidApiKey;
        if (rapidKey) {
          const r = await fetch(`https://jsearch.p.rapidapi.com/search?query=${encodeURIComponent(q + ' ' + location)}&page=1&num_pages=${pages}&date_posted=${args.date_posted || 'week'}${args.employment_type ? '&employment_types=' + args.employment_type : ''}`, {
            headers: { 'X-RapidAPI-Key': rapidKey, 'X-RapidAPI-Host': 'jsearch.p.rapidapi.com' }
          });
          if (r.ok) {
            const d = await r.json();
            const jobs = (d.data || []).slice(0, 15).map((j: any) => ({
              title: j.job_title,
              company: j.employer_name,
              location: j.job_city ? `${j.job_city}, ${j.job_country}` : j.job_country,
              type: j.job_employment_type,
              remote: j.job_is_remote,
              salary: j.job_min_salary ? `${j.job_min_salary}�${j.job_max_salary} ${j.job_salary_period}` : 'Not specified',
              posted: j.job_posted_at_datetime_utc,
              apply_url: j.job_apply_link,
              description: (j.job_description || '').substring(0, 500)
            }));
            return JSON.stringify({ query: q, location, total: d.data?.length || 0, jobs });
          }
        }
        // Fallback: search via Serper
        const sr = await ATTACHED_TOOLS.search_web.execute({ query: `${q} jobs ${location} site:linkedin.com OR site:indeed.com OR site:glassdoor.com`, num_results: 10 });
        const sd = JSON.parse(sr);
        return JSON.stringify({ query: q, location, source: 'web_search', results: sd.results || [] });
      } catch (e: any) { return JSON.stringify({ error: e.message }); }
    }
  },

  LinkedInJobSearch: {
    type: 'function',
    function: {
      name: 'LinkedInJobSearch',
      description: 'Search LinkedIn Jobs for specific roles, companies, and locations.',
      parameters: {
        type: 'object',
        properties: {
          keywords: { type: 'string', description: 'Job title or skills' },
          location: { type: 'string', description: 'Location or "Remote"' },
          experience_level: { type: 'string', enum: ['internship', 'entry_level', 'associate', 'mid_senior', 'director', 'executive'] }
        },
        required: ['keywords']
      }
    },
    execute: async (args: any) => {
      try {
        const q = `${args.keywords} ${args.location || 'remote'} ${args.experience_level || ''} jobs site:linkedin.com/jobs`;
        const r = await ATTACHED_TOOLS.search_web.execute({ query: q, num_results: 10 });
        const d = JSON.parse(r);
        return JSON.stringify({ platform: 'LinkedIn', keywords: args.keywords, location: args.location, results: d.results || [] });
      } catch (e: any) { return JSON.stringify({ error: e.message }); }
    }
  },

  IndeedJobSearch: {
    type: 'function',
    function: {
      name: 'IndeedJobSearch',
      description: 'Search Indeed for job listings with salary and company info.',
      parameters: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'Job title or keywords' },
          location: { type: 'string', description: 'City, state, or "remote"' },
          salary_min: { type: 'number', description: 'Minimum salary filter' }
        },
        required: ['query']
      }
    },
    execute: async (args: any) => {
      try {
        const q = `${args.query} ${args.location || 'remote'} ${args.salary_min ? '$' + args.salary_min + '+' : ''} site:indeed.com`;
        const r = await ATTACHED_TOOLS.search_web.execute({ query: q, num_results: 10 });
        const d = JSON.parse(r);
        return JSON.stringify({ platform: 'Indeed', query: args.query, results: d.results || [] });
      } catch (e: any) { return JSON.stringify({ error: e.message }); }
    }
  },

  RemoteJobSearch: {
    type: 'function',
    function: {
      name: 'RemoteJobSearch',
      description: 'Search remote-only job boards: Remote.co, We Work Remotely, RemoteOK, Remotive.',
      parameters: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'Job title or tech stack (e.g. "Python backend", "React frontend")' },
          category: { type: 'string', enum: ['software-dev', 'design', 'marketing', 'customer-support', 'data', 'devops', 'product', 'writing'], description: 'Job category' }
        },
        required: ['query']
      }
    },
    execute: async (args: any) => {
      try {
        // Try RemoteOK API (free, no key needed)
        const r = await fetch('https://remoteok.com/api', { headers: { 'User-Agent': 'Mozilla/5.0' } });
        if (r.ok) {
          const data = await r.json();
          const q = args.query.toLowerCase();
          const jobs = (data || []).filter((j: any) => j.position && (
            j.position.toLowerCase().includes(q) ||
            (j.tags || []).some((t: string) => t.toLowerCase().includes(q))
          )).slice(0, 15).map((j: any) => ({
            title: j.position,
            company: j.company,
            tags: j.tags,
            salary: j.salary || 'Not specified',
            url: j.url,
            posted: j.date
          }));
          if (jobs.length > 0) return JSON.stringify({ source: 'RemoteOK', query: args.query, count: jobs.length, jobs });
        }
        // Fallback: web search across remote boards
        const q2 = `${args.query} remote job site:remoteok.com OR site:weworkremotely.com OR site:remotive.com OR site:remote.co`;
        const sr = await ATTACHED_TOOLS.search_web.execute({ query: q2, num_results: 10 });
        const sd = JSON.parse(sr);
        return JSON.stringify({ source: 'web_search', query: args.query, results: sd.results || [] });
      } catch (e: any) { return JSON.stringify({ error: e.message }); }
    }
  },

  SalaryLookup: {
    type: 'function',
    function: {
      name: 'SalaryLookup',
      description: 'Look up salary ranges for job titles by location and experience level.',
      parameters: {
        type: 'object',
        properties: {
          job_title: { type: 'string', description: 'Job title (e.g. "Software Engineer", "Data Scientist")' },
          location: { type: 'string', description: 'City or country (default: United States)' },
          experience: { type: 'string', enum: ['entry', 'mid', 'senior', 'lead', 'principal'], description: 'Experience level' }
        },
        required: ['job_title']
      }
    },
    execute: async (args: any) => {
      try {
        const q = `${args.experience || 'mid'} ${args.job_title} salary ${args.location || 'United States'} 2024 2025 site:levels.fyi OR site:glassdoor.com OR site:payscale.com OR site:salary.com`;
        const r = await ATTACHED_TOOLS.search_web.execute({ query: q, num_results: 8 });
        const d = JSON.parse(r);
        return JSON.stringify({ job_title: args.job_title, location: args.location || 'United States', experience: args.experience || 'mid', salary_sources: d.results || [] });
      } catch (e: any) { return JSON.stringify({ error: e.message }); }
    }
  },

  CompanyResearch: {
    type: 'function',
    function: {
      name: 'CompanyResearch',
      description: 'Research a company: funding, employees, tech stack, culture, news, and job openings.',
      parameters: {
        type: 'object',
        properties: {
          company: { type: 'string', description: 'Company name (e.g. "Stripe", "OpenAI")' },
          aspects: { type: 'string', description: 'What to research: funding, culture, tech, news, jobs (comma-separated, default: all)' }
        },
        required: ['company']
      }
    },
    execute: async (args: any) => {
      const company = args.company;
      try {
        const [overview, funding, jobs] = await Promise.allSettled([
          ATTACHED_TOOLS.search_web.execute({ query: `${company} company overview employees revenue founded`, num_results: 5 }),
          ATTACHED_TOOLS.search_web.execute({ query: `${company} funding valuation investors crunchbase`, num_results: 5 }),
          ATTACHED_TOOLS.search_web.execute({ query: `${company} jobs hiring careers 2024 2025`, num_results: 5 })
        ]);
        return JSON.stringify({
          company,
          overview: overview.status === 'fulfilled' ? JSON.parse(overview.value).results?.slice(0, 3) : [],
          funding: funding.status === 'fulfilled' ? JSON.parse(funding.value).results?.slice(0, 3) : [],
          jobs: jobs.status === 'fulfilled' ? JSON.parse(jobs.value).results?.slice(0, 3) : []
        });
      } catch (e: any) { return JSON.stringify({ error: e.message }); }
    }
  },

  GlassdoorReviews: {
    type: 'function',
    function: {
      name: 'GlassdoorReviews',
      description: 'Get Glassdoor reviews, ratings, and interview experiences for a company.',
      parameters: {
        type: 'object',
        properties: {
          company: { type: 'string', description: 'Company name' }
        },
        required: ['company']
      }
    },
    execute: async (args: any) => {
      try {
        const r = await ATTACHED_TOOLS.search_web.execute({ query: `${args.company} glassdoor reviews rating culture salary interview`, num_results: 8 });
        const d = JSON.parse(r);
        return JSON.stringify({ company: args.company, source: 'Glassdoor via search', results: d.results || [] });
      } catch (e: any) { return JSON.stringify({ error: e.message }); }
    }
  },

  TechJobsSearch: {
    type: 'function',
    function: {
      name: 'TechJobsSearch',
      description: 'Search tech-specific job boards: HackerNews Who\'s Hiring, AngelList, Y Combinator jobs.',
      parameters: {
        type: 'object',
        properties: {
          skills: { type: 'string', description: 'Tech skills (e.g. "TypeScript React Node.js")' },
          role: { type: 'string', description: 'Role type (e.g. "fullstack", "backend", "ML engineer")' },
          company_stage: { type: 'string', enum: ['startup', 'series-a', 'series-b', 'growth', 'public'], description: 'Company stage preference' }
        },
        required: ['skills']
      }
    },
    execute: async (args: any) => {
      try {
        // HN Who's Hiring (current month thread)
        const hnSearch = await ATTACHED_TOOLS.search_web.execute({
          query: `site:news.ycombinator.com "who is hiring" ${args.skills} ${args.role || ''} 2024 2025`,
          num_results: 5
        });
        const ycSearch = await ATTACHED_TOOLS.search_web.execute({
          query: `${args.skills} ${args.role || ''} ${args.company_stage || 'startup'} jobs site:workatastartup.com OR site:angel.co`,
          num_results: 8
        });
        const hn = JSON.parse(hnSearch);
        const yc = JSON.parse(ycSearch);
        return JSON.stringify({ skills: args.skills, role: args.role, hn_hiring: hn.results || [], yc_startup: yc.results || [] });
      } catch (e: any) { return JSON.stringify({ error: e.message }); }
    }
  },

  FreelanceJobSearch: {
    type: 'function',
    function: {
      name: 'FreelanceJobSearch',
      description: 'Search freelance platforms: Upwork, Fiverr, Toptal, Freelancer for gigs and contracts.',
      parameters: {
        type: 'object',
        properties: {
          skills: { type: 'string', description: 'Skills or service type (e.g. "React developer", "logo design")' },
          platform: { type: 'string', enum: ['upwork', 'fiverr', 'toptal', 'freelancer', 'all'], description: 'Platform to search (default: all)' },
          budget_min: { type: 'number', description: 'Minimum budget/rate in USD' }
        },
        required: ['skills']
      }
    },
    execute: async (args: any) => {
      try {
        const platforms = args.platform === 'all' || !args.platform
          ? 'site:upwork.com OR site:fiverr.com OR site:toptal.com'
          : `site:${args.platform}.com`;
        const q = `${args.skills} freelance ${args.budget_min ? '$' + args.budget_min + '+' : ''} ${platforms}`;
        const r = await ATTACHED_TOOLS.search_web.execute({ query: q, num_results: 10 });
        const d = JSON.parse(r);
        return JSON.stringify({ skills: args.skills, platform: args.platform || 'all', results: d.results || [] });
      } catch (e: any) { return JSON.stringify({ error: e.message }); }
    }
  },

  InternshipSearch: {
    type: 'function',
    function: {
      name: 'InternshipSearch',
      description: 'Search for internships at top companies for students and new grads.',
      parameters: {
        type: 'object',
        properties: {
          field: { type: 'string', description: 'Field of study or role (e.g. "software engineering", "data science", "marketing")' },
          location: { type: 'string', description: 'Location or "remote"' },
          season: { type: 'string', enum: ['summer', 'fall', 'spring', 'winter'], description: 'Internship season' }
        },
        required: ['field']
      }
    },
    execute: async (args: any) => {
      try {
        const q = `${args.season || 'summer'} 2025 ${args.field} internship ${args.location || ''} site:linkedin.com OR site:indeed.com OR site:internships.com OR site:handshake.com`;
        const r = await ATTACHED_TOOLS.search_web.execute({ query: q, num_results: 10 });
        const d = JSON.parse(r);
        return JSON.stringify({ field: args.field, season: args.season || 'summer', location: args.location, results: d.results || [] });
      } catch (e: any) { return JSON.stringify({ error: e.message }); }
    }
  },

  // BATCH 2: Advanced Search Tools
  MultiEngineSearch: {
    type: 'function',
    function: {
      name: 'MultiEngineSearch',
      description: 'Search across Google, Bing, DuckDuckGo, and Yandex simultaneously and merge results for comprehensive coverage.',
      parameters: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'Search query' },
          engines: { type: 'string', description: 'Comma-separated engines: google,bing,ddg,yandex (default: all)' },
          deduplicate: { type: 'boolean', description: 'Remove duplicate URLs (default: true)' }
        },
        required: ['query']
      }
    },
    execute: async (args: any) => {
      const q = args.query;
      const results: any[] = [];
      const seen = new Set<string>();
      const engines = (args.engines || 'google,bing,ddg').split(',').map((e: string) => e.trim());
      await Promise.allSettled([
        engines.includes('google') && ATTACHED_TOOLS.SearchWeb.execute({ query: q }).then((r: string) => {
          try { JSON.parse(r).results?.forEach((item: any) => { if (!seen.has(item.url)) { seen.add(item.url); results.push({ ...item, engine: 'google' }); } }); } catch (_) {}
        }),
        engines.includes('bing') && ATTACHED_TOOLS.BingSearch?.execute({ query: q }).then((r: string) => {
          try { const lines = r.split('\n\n').filter(Boolean); lines.forEach((l: string) => results.push({ snippet: l, engine: 'bing' })); } catch (_) {}
        }),
        engines.includes('ddg') && ATTACHED_TOOLS.DuckDuckGoSearch?.execute({ query: q }).then((r: string) => {
          try { JSON.parse(r).results?.forEach((item: any) => { if (!seen.has(item.url)) { seen.add(item.url); results.push({ ...item, engine: 'ddg' }); } }); } catch (_) {}
        }),
        engines.includes('yandex') && ATTACHED_TOOLS.YandexSearch?.execute({ query: q }).then((r: string) => {
          try { JSON.parse(r).results?.forEach((item: any) => { if (!seen.has(item.url)) { seen.add(item.url); results.push({ ...item, engine: 'yandex' }); } }); } catch (_) {}
        }),
      ].filter(Boolean));
      return JSON.stringify({ query: q, engines, total: results.length, results: results.slice(0, 20) });
    }
  },

  AcademicSearch: {
    type: 'function',
    function: {
      name: 'AcademicSearch',
      description: 'Search academic papers across Google Scholar, Semantic Scholar, PubMed, and arXiv.',
      parameters: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'Research topic or paper title' },
          source: { type: 'string', enum: ['scholar', 'semantic', 'pubmed', 'arxiv', 'all'], description: 'Academic database (default: all)' },
          year_from: { type: 'number', description: 'Filter papers from this year' }
        },
        required: ['query']
      }
    },
    execute: async (args: any) => {
      const q = args.query;
      const results: any[] = [];
      try {
        // Semantic Scholar (free API)
        const ss = await fetch(`https://api.semanticscholar.org/graph/v1/paper/search?query=${encodeURIComponent(q)}&limit=10&fields=title,authors,year,abstract,url,citationCount${args.year_from ? '&year=' + args.year_from + '-' : ''}`);
        if (ss.ok) {
          const d = await ss.json();
          (d.data || []).forEach((p: any) => results.push({ source: 'Semantic Scholar', title: p.title, authors: p.authors?.map((a: any) => a.name).join(', '), year: p.year, citations: p.citationCount, abstract: (p.abstract || '').substring(0, 300), url: p.url }));
        }
      } catch (_) {}
      try {
        // arXiv
        const ax = await fetch(`https://export.arxiv.org/api/query?search_query=all:${encodeURIComponent(q)}&max_results=5`);
        if (ax.ok) {
          const xml = await ax.text();
          const entries = xml.match(/<entry>([\s\S]*?)<\/entry>/g) || [];
          entries.forEach((e: string) => {
            const title = (e.match(/<title>([\s\S]*?)<\/title>/) || [])[1]?.trim() || '';
            const summary = (e.match(/<summary>([\s\S]*?)<\/summary>/) || [])[1]?.trim().substring(0, 300) || '';
            const link = (e.match(/href="(https:\/\/arxiv\.org\/abs\/[^"]+)"/) || [])[1] || '';
            if (title) results.push({ source: 'arXiv', title, abstract: summary, url: link });
          });
        }
      } catch (_) {}
      return JSON.stringify({ query: q, total: results.length, papers: results });
    }
  },

  PatentSearch: {
    type: 'function',
    function: {
      name: 'PatentSearch',
      description: 'Search patents via Google Patents and USPTO.',
      parameters: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'Patent topic or invention description' },
          assignee: { type: 'string', description: 'Company or inventor name filter' },
          year_from: { type: 'number', description: 'Filter from year' }
        },
        required: ['query']
      }
    },
    execute: async (args: any) => {
      try {
        const q = `${args.query} ${args.assignee ? 'assignee:' + args.assignee : ''} site:patents.google.com OR site:patents.justia.com`;
        const r = await ATTACHED_TOOLS.search_web.execute({ query: q, num_results: 10 });
        const d = JSON.parse(r);
        return JSON.stringify({ query: args.query, assignee: args.assignee, results: d.results || [] });
      } catch (e: any) { return JSON.stringify({ error: e.message }); }
    }
  },

  VideoSearch: {
    type: 'function',
    function: {
      name: 'VideoSearch',
      description: 'Search YouTube, Vimeo, and other video platforms for content.',
      parameters: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'Video search query' },
          platform: { type: 'string', enum: ['youtube', 'vimeo', 'all'], description: 'Platform (default: youtube)' },
          duration: { type: 'string', enum: ['short', 'medium', 'long'], description: 'Video duration filter' }
        },
        required: ['query']
      }
    },
    execute: async (args: any) => {
      try {
        const platform = args.platform || 'youtube';
        const siteFilter = platform === 'youtube' ? 'site:youtube.com' : platform === 'vimeo' ? 'site:vimeo.com' : 'site:youtube.com OR site:vimeo.com';
        const q = `${args.query} ${args.duration ? args.duration + ' video' : ''} ${siteFilter}`;
        const r = await ATTACHED_TOOLS.search_web.execute({ query: q, num_results: 10 });
        const d = JSON.parse(r);
        return JSON.stringify({ query: args.query, platform, results: d.results || [] });
      } catch (e: any) { return JSON.stringify({ error: e.message }); }
    }
  },

  CodeSearch: {
    type: 'function',
    function: {
      name: 'CodeSearch',
      description: 'Search code across GitHub, GitLab, StackOverflow, and npm for implementations and examples.',
      parameters: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'Code snippet, function name, or programming question' },
          language: { type: 'string', description: 'Programming language filter (e.g. python, typescript, rust)' },
          source: { type: 'string', enum: ['github', 'stackoverflow', 'npm', 'all'], description: 'Source to search (default: all)' }
        },
        required: ['query']
      }
    },
    execute: async (args: any) => {
      const q = args.query;
      const lang = args.language ? `language:${args.language}` : '';
      try {
        const results: any[] = [];
        if (args.source === 'github' || args.source === 'all' || !args.source) {
          const ghR = await fetch(`https://api.github.com/search/code?q=${encodeURIComponent(q + ' ' + lang)}&per_page=5`, { headers: { 'User-Agent': 'WormGPT-Agent', 'Accept': 'application/vnd.github.v3+json' } });
          if (ghR.ok) {
            const ghD = await ghR.json();
            (ghD.items || []).forEach((item: any) => results.push({ source: 'GitHub', name: item.name, path: item.path, repo: item.repository?.full_name, url: item.html_url }));
          }
        }
        if (args.source === 'stackoverflow' || args.source === 'all' || !args.source) {
          const soR = await fetch(`https://api.stackexchange.com/2.3/search/advanced?order=desc&sort=relevance&q=${encodeURIComponent(q)}&tagged=${args.language || ''}&site=stackoverflow&pagesize=5`);
          if (soR.ok) {
            const soD = await soR.json();
            (soD.items || []).forEach((item: any) => results.push({ source: 'StackOverflow', title: item.title, score: item.score, answered: item.is_answered, url: item.link }));
          }
        }
        return JSON.stringify({ query: q, language: args.language, total: results.length, results });
      } catch (e: any) { return JSON.stringify({ error: e.message }); }
    }
  },

  NewsDeepSearch: {
    type: 'function',
    function: {
      name: 'NewsDeepSearch',
      description: 'Deep news search with full article content, sentiment, and source credibility scoring.',
      parameters: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'News topic or event' },
          days_back: { type: 'number', description: 'How many days back to search (default: 7)' },
          sources: { type: 'string', description: 'Specific news sources to include (e.g. "reuters,bbc,techcrunch")' },
          fetch_content: { type: 'boolean', description: 'Fetch full article content for top results (default: false)' }
        },
        required: ['query']
      }
    },
    execute: async (args: any) => {
      const q = args.query;
      const days = args.days_back || 7;
      try {
        // Search news
        const newsR = await ATTACHED_TOOLS.search_web.execute({ query: `${q} news ${args.sources ? 'site:' + args.sources.split(',').join(' OR site:') : ''}`, num_results: 10 });
        const newsD = JSON.parse(newsR);
        const articles = newsD.results || [];

        // Optionally fetch top article content
        if (args.fetch_content && articles.length > 0) {
          const topArticle = await ATTACHED_TOOLS.fetch_url.execute({ url: articles[0].url });
          const articleD = JSON.parse(topArticle);
          return JSON.stringify({ query: q, days, article_count: articles.length, articles, top_article_content: (articleD.content || '').substring(0, 5000) });
        }
        return JSON.stringify({ query: q, days, article_count: articles.length, articles });
      } catch (e: any) { return JSON.stringify({ error: e.message }); }
    }
  },

  ForumSearch: {
    type: 'function',
    function: {
      name: 'ForumSearch',
      description: 'Search forums and communities: Reddit, HackerNews, StackOverflow, Discord servers.',
      parameters: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'Topic or question to search' },
          platform: { type: 'string', enum: ['reddit', 'hackernews', 'stackoverflow', 'all'], description: 'Platform (default: all)' },
          subreddit: { type: 'string', description: 'Specific subreddit to search (optional)' }
        },
        required: ['query']
      }
    },
    execute: async (args: any) => {
      const q = args.query;
      try {
        const results: any[] = [];
        if (args.platform === 'reddit' || args.platform === 'all' || !args.platform) {
          const sub = args.subreddit ? `r/${args.subreddit}` : '';
          const rR = await fetch(`https://www.reddit.com/search.json?q=${encodeURIComponent(q)}&sort=relevance&limit=8${sub ? '&restrict_sr=true&sr_name=' + args.subreddit : ''}`, { headers: { 'User-Agent': 'WormGPT-Agent' } });
          if (rR.ok) {
            const rD = await rR.json();
            (rD.data?.children || []).forEach((p: any) => results.push({ source: 'Reddit', title: p.data.title, subreddit: p.data.subreddit, score: p.data.score, comments: p.data.num_comments, url: `https://reddit.com${p.data.permalink}`, snippet: (p.data.selftext || '').substring(0, 200) }));
          }
        }
        if (args.platform === 'hackernews' || args.platform === 'all' || !args.platform) {
          const hnR = await fetch(`https://hn.algolia.com/api/v1/search?query=${encodeURIComponent(q)}&hitsPerPage=5`);
          if (hnR.ok) {
            const hnD = await hnR.json();
            (hnD.hits || []).forEach((h: any) => results.push({ source: 'HackerNews', title: h.title, points: h.points, comments: h.num_comments, url: h.url || `https://news.ycombinator.com/item?id=${h.objectID}` }));
          }
        }
        return JSON.stringify({ query: q, platform: args.platform || 'all', total: results.length, results });
      } catch (e: any) { return JSON.stringify({ error: e.message }); }
    }
  },

  // BATCH 3: AI Media + E-Commerce + More
  PollinationsImage: {
    type: 'function',
    function: {
      name: 'PollinationsImage',
      description: 'Generate an AI image using Pollinations.ai (free, no API key needed). Returns a direct image URL.',
      parameters: {
        type: 'object',
        properties: {
          prompt: { type: 'string', description: 'Image description' },
          model: { type: 'string', description: 'Model: flux, flux-realism, turbo, gptimage (default: flux)' },
          width: { type: 'number', description: 'Width in pixels (default: 1024)' },
          height: { type: 'number', description: 'Height in pixels (default: 1024)' },
          seed: { type: 'number', description: 'Seed for reproducibility' }
        },
        required: ['prompt']
      }
    },
    execute: async (args: any) => {
      const model = args.model || 'flux';
      const w = args.width || 1024;
      const h = args.height || 1024;
      const seed = args.seed || Math.floor(Math.random() * 999999);
      const url = `https://image.pollinations.ai/prompt/${encodeURIComponent(args.prompt)}?model=${model}&width=${w}&height=${h}&seed=${seed}&nologo=true`;
      return JSON.stringify({ image_url: url, prompt: args.prompt, model, width: w, height: h, seed });
    }
  },

  PollinationsText: {
    type: 'function',
    function: {
      name: 'PollinationsText',
      description: 'Generate text using Pollinations.ai text API (free). Good for quick completions without API keys.',
      parameters: {
        type: 'object',
        properties: {
          prompt: { type: 'string', description: 'Text prompt' },
          model: { type: 'string', description: 'Model alias: openai, claude, gemini, mistral (default: openai)' },
          system: { type: 'string', description: 'System instruction' }
        },
        required: ['prompt']
      }
    },
    execute: async (args: any) => {
      try {
        const body: any = { messages: [{ role: 'user', content: args.prompt }], model: args.model || 'openai', stream: false };
        if (args.system) body.messages.unshift({ role: 'system', content: args.system });
        const r = await fetch('https://text.pollinations.ai/openai', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
        const d = await r.json();
        return JSON.stringify({ text: d.choices?.[0]?.message?.content || d.text || JSON.stringify(d), model: args.model || 'openai' });
      } catch (e: any) { return JSON.stringify({ error: e.message }); }
    }
  },

  YouTubeSearch: {
    type: 'function',
    function: {
      name: 'YouTubeSearch',
      description: 'Search YouTube videos with view counts, duration, and channel info.',
      parameters: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'Search query' },
          max_results: { type: 'number', description: 'Number of results (default: 10)' }
        },
        required: ['query']
      }
    },
    execute: async (args: any) => {
      try {
        const r = await ATTACHED_TOOLS.search_web.execute({ query: `${args.query} site:youtube.com`, num_results: args.max_results || 10 });
        const d = JSON.parse(r);
        return JSON.stringify({ query: args.query, results: d.results || [] });
      } catch (e: any) { return JSON.stringify({ error: e.message }); }
    }
  },

  TextSummarizer: {
    type: 'function',
    function: {
      name: 'TextSummarizer',
      description: 'Summarize long text into key points using extractive summarization.',
      parameters: {
        type: 'object',
        properties: {
          text: { type: 'string', description: 'Text to summarize' },
          max_sentences: { type: 'number', description: 'Max sentences in summary (default: 5)' },
          style: { type: 'string', enum: ['bullets', 'paragraph', 'tldr'], description: 'Summary style (default: bullets)' }
        },
        required: ['text']
      }
    },
    execute: (args: any) => {
      const text = args.text || '';
      const maxSentences = args.max_sentences || 5;
      const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];
      // Score sentences by word frequency
      const words = text.toLowerCase().split(/\W+/).filter((w: string) => w.length > 4);
      const freq: Record<string, number> = {};
      words.forEach((w: string) => { freq[w] = (freq[w] || 0) + 1; });
      const scored = sentences.map((s: string) => ({
        sentence: s.trim(),
        score: s.toLowerCase().split(/\W+/).reduce((sum: number, w: string) => sum + (freq[w] || 0), 0)
      })).sort((a: any, b: any) => b.score - a.score).slice(0, maxSentences);
      const style = args.style || 'bullets';
      const summary = style === 'bullets'
        ? scored.map((s: any) => `� ${s.sentence}`).join('\n')
        : style === 'tldr'
          ? `TL;DR: ${scored[0]?.sentence || ''}`
          : scored.map((s: any) => s.sentence).join(' ');
      return JSON.stringify({ original_length: text.length, summary, sentences_extracted: scored.length });
    }
  },

  SentimentAnalysis: {
    type: 'function',
    function: {
      name: 'SentimentAnalysis',
      description: 'Analyze sentiment (positive/negative/neutral) and emotions in text.',
      parameters: {
        type: 'object',
        properties: {
          text: { type: 'string', description: 'Text to analyze' }
        },
        required: ['text']
      }
    },
    execute: (args: any) => {
      const text = (args.text || '').toLowerCase();
      const positive = ['good','great','excellent','amazing','wonderful','fantastic','love','best','happy','positive','success','win','perfect','awesome','brilliant','outstanding','superb','joy','excited','pleased'];
      const negative = ['bad','terrible','awful','horrible','hate','worst','fail','poor','negative','sad','angry','disappointed','useless','broken','wrong','error','problem','issue','bug','crash'];
      const posCount = positive.filter(w => text.includes(w)).length;
      const negCount = negative.filter(w => text.includes(w)).length;
      const total = posCount + negCount || 1;
      const score = (posCount - negCount) / total;
      const sentiment = score > 0.1 ? 'positive' : score < -0.1 ? 'negative' : 'neutral';
      const confidence = Math.abs(score);
      return JSON.stringify({ sentiment, confidence: Math.round(confidence * 100) + '%', positive_signals: posCount, negative_signals: negCount, score: score.toFixed(2) });
    }
  },

  LanguageDetector: {
    type: 'function',
    function: {
      name: 'LanguageDetector',
      description: 'Detect the language of a text string.',
      parameters: {
        type: 'object',
        properties: {
          text: { type: 'string', description: 'Text to detect language for' }
        },
        required: ['text']
      }
    },
    execute: async (args: any) => {
      try {
        const r = await fetch(`https://api.detectlanguage.com/0.2/detect`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer demo' },
          body: JSON.stringify({ q: args.text.substring(0, 500) })
        });
        if (r.ok) {
          const d = await r.json();
          return JSON.stringify(d.data?.detections?.[0] || { language: 'unknown' });
        }
        // Fallback: simple heuristic
        const text = args.text;
        const scripts: Record<string, RegExp> = { arabic: /[\u0600-\u06FF]/, chinese: /[\u4E00-\u9FFF]/, japanese: /[\u3040-\u30FF]/, korean: /[\uAC00-\uD7AF]/, cyrillic: /[\u0400-\u04FF]/, greek: /[\u0370-\u03FF]/ };
        for (const [lang, regex] of Object.entries(scripts)) {
          if (regex.test(text)) return JSON.stringify({ language: lang, confidence: 0.9 });
        }
        return JSON.stringify({ language: 'latin-script', confidence: 0.5, note: 'Could be English, Spanish, French, German, etc.' });
      } catch (e: any) { return JSON.stringify({ error: e.message }); }
    }
  },

  TextStatistics: {
    type: 'function',
    function: {
      name: 'TextStatistics',
      description: 'Get detailed statistics about text: word count, reading time, readability score, top keywords.',
      parameters: {
        type: 'object',
        properties: {
          text: { type: 'string', description: 'Text to analyze' }
        },
        required: ['text']
      }
    },
    execute: (args: any) => {
      const text = args.text || '';
      const words = text.trim().split(/\s+/).filter(Boolean);
      const sentences = (text.match(/[.!?]+/g) || []).length || 1;
      const paragraphs = text.split(/\n\n+/).filter(Boolean).length;
      const chars = text.length;
      const avgWordsPerSentence = words.length / sentences;
      const readingTimeMin = Math.ceil(words.length / 200);
      // Top keywords (excluding stopwords)
      const stopwords = new Set(['the','a','an','and','or','but','in','on','at','to','for','of','with','by','from','is','are','was','were','be','been','have','has','had','do','does','did','will','would','could','should','may','might','this','that','these','those','it','its','i','you','he','she','we','they']);
      const freq: Record<string, number> = {};
      words.forEach((w: string) => { const clean = w.toLowerCase().replace(/[^a-z]/g, ''); if (clean.length > 3 && !stopwords.has(clean)) freq[clean] = (freq[clean] || 0) + 1; });
      const topKeywords = Object.entries(freq).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([word, count]) => ({ word, count }));
      return JSON.stringify({ word_count: words.length, character_count: chars, sentence_count: sentences, paragraph_count: paragraphs, avg_words_per_sentence: avgWordsPerSentence.toFixed(1), reading_time_minutes: readingTimeMin, top_keywords: topKeywords });
    }
  },

  AmazonProductSearch: {
    type: 'function',
    function: {
      name: 'AmazonProductSearch',
      description: 'Search Amazon for products with prices, ratings, and reviews.',
      parameters: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'Product search query' },
          max_price: { type: 'number', description: 'Maximum price filter in USD' },
          min_rating: { type: 'number', description: 'Minimum star rating (1-5)' }
        },
        required: ['query']
      }
    },
    execute: async (args: any) => {
      try {
        const q = `${args.query} ${args.max_price ? 'under $' + args.max_price : ''} ${args.min_rating ? args.min_rating + '+ stars' : ''} site:amazon.com`;
        const r = await ATTACHED_TOOLS.search_web.execute({ query: q, num_results: 10 });
        const d = JSON.parse(r);
        return JSON.stringify({ query: args.query, max_price: args.max_price, results: d.results || [] });
      } catch (e: any) { return JSON.stringify({ error: e.message }); }
    }
  },

  PriceComparison: {
    type: 'function',
    function: {
      name: 'PriceComparison',
      description: 'Compare prices for a product across multiple retailers.',
      parameters: {
        type: 'object',
        properties: {
          product: { type: 'string', description: 'Product name or model number' }
        },
        required: ['product']
      }
    },
    execute: async (args: any) => {
      try {
        const r = await ATTACHED_TOOLS.search_web.execute({ query: `${args.product} price compare buy site:amazon.com OR site:walmart.com OR site:bestbuy.com OR site:newegg.com OR site:ebay.com`, num_results: 10 });
        const d = JSON.parse(r);
        return JSON.stringify({ product: args.product, price_results: d.results || [] });
      } catch (e: any) { return JSON.stringify({ error: e.message }); }
    }
  },

  StockQuote: {
    type: 'function',
    function: {
      name: 'StockQuote',
      description: 'Get real-time stock quotes, price changes, and basic financials.',
      parameters: {
        type: 'object',
        properties: {
          symbol: { type: 'string', description: 'Stock ticker symbol (e.g. AAPL, TSLA, MSFT)' }
        },
        required: ['symbol']
      }
    },
    execute: async (args: any) => {
      try {
        const r = await fetch(`https://query1.finance.yahoo.com/v8/finance/chart/${args.symbol.toUpperCase()}?interval=1d&range=1d`);
        if (r.ok) {
          const d = await r.json();
          const meta = d.chart?.result?.[0]?.meta;
          if (meta) return JSON.stringify({ symbol: args.symbol.toUpperCase(), price: meta.regularMarketPrice, change: (meta.regularMarketPrice - meta.previousClose).toFixed(2), change_pct: (((meta.regularMarketPrice - meta.previousClose) / meta.previousClose) * 100).toFixed(2) + '%', high: meta.regularMarketDayHigh, low: meta.regularMarketDayLow, volume: meta.regularMarketVolume, market_cap: meta.marketCap, currency: meta.currency });
        }
        return JSON.stringify({ error: 'Could not fetch quote' });
      } catch (e: any) { return JSON.stringify({ error: e.message }); }
    }
  },

  CommodityPrices: {
    type: 'function',
    function: {
      name: 'CommodityPrices',
      description: 'Get current commodity prices: gold, silver, oil, natural gas, wheat, etc.',
      parameters: {
        type: 'object',
        properties: {
          commodity: { type: 'string', description: 'Commodity name or symbol (e.g. "gold", "crude oil", "GC=F")' }
        },
        required: ['commodity']
      }
    },
    execute: async (args: any) => {
      const symbolMap: Record<string, string> = { gold: 'GC=F', silver: 'SI=F', oil: 'CL=F', 'crude oil': 'CL=F', 'natural gas': 'NG=F', wheat: 'ZW=F', corn: 'ZC=F', copper: 'HG=F', platinum: 'PL=F' };
      const symbol = symbolMap[args.commodity.toLowerCase()] || args.commodity.toUpperCase();
      try {
        const r = await fetch(`https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=1d&range=1d`);
        if (r.ok) {
          const d = await r.json();
          const meta = d.chart?.result?.[0]?.meta;
          if (meta) return JSON.stringify({ commodity: args.commodity, symbol, price: meta.regularMarketPrice, change_pct: (((meta.regularMarketPrice - meta.previousClose) / meta.previousClose) * 100).toFixed(2) + '%', currency: meta.currency });
        }
        return JSON.stringify({ error: 'Could not fetch commodity price' });
      } catch (e: any) { return JSON.stringify({ error: e.message }); }
    }
  },

  SocialMediaSearch: {
    type: 'function',
    function: {
      name: 'SocialMediaSearch',
      description: 'Search across Twitter/X, Instagram, TikTok, and LinkedIn for posts and profiles.',
      parameters: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'Search query or hashtag' },
          platform: { type: 'string', enum: ['twitter', 'instagram', 'tiktok', 'linkedin', 'all'], description: 'Platform (default: all)' }
        },
        required: ['query']
      }
    },
    execute: async (args: any) => {
      try {
        const platform = args.platform || 'all';
        const siteMap: Record<string, string> = { twitter: 'site:twitter.com OR site:x.com', instagram: 'site:instagram.com', tiktok: 'site:tiktok.com', linkedin: 'site:linkedin.com', all: 'site:twitter.com OR site:x.com OR site:instagram.com OR site:tiktok.com' };
        const r = await ATTACHED_TOOLS.search_web.execute({ query: `${args.query} ${siteMap[platform] || siteMap.all}`, num_results: 10 });
        const d = JSON.parse(r);
        return JSON.stringify({ query: args.query, platform, results: d.results || [] });
      } catch (e: any) { return JSON.stringify({ error: e.message }); }
    }
  },

  BookSearch: {
    type: 'function',
    function: {
      name: 'BookSearch',
      description: 'Search books via Open Library and Google Books. Get metadata, descriptions, and download links.',
      parameters: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'Book title, author, or ISBN' },
          limit: { type: 'number', description: 'Number of results (default: 5)' }
        },
        required: ['query']
      }
    },
    execute: async (args: any) => {
      try {
        const r = await fetch(`https://openlibrary.org/search.json?q=${encodeURIComponent(args.query)}&limit=${args.limit || 5}&fields=title,author_name,first_publish_year,isbn,subject,cover_i`);
        if (r.ok) {
          const d = await r.json();
          const books = (d.docs || []).map((b: any) => ({ title: b.title, authors: b.author_name?.join(', '), year: b.first_publish_year, isbn: b.isbn?.[0], subjects: b.subject?.slice(0, 5), cover: b.cover_i ? `https://covers.openlibrary.org/b/id/${b.cover_i}-M.jpg` : null, url: `https://openlibrary.org/search?q=${encodeURIComponent(b.title)}` }));
          return JSON.stringify({ query: args.query, total: d.numFound, books });
        }
        return JSON.stringify({ error: 'Open Library search failed' });
      } catch (e: any) { return JSON.stringify({ error: e.message }); }
    }
  },

  ImageReverseSearch: {
    type: 'function',
    function: {
      name: 'ImageReverseSearch',
      description: 'Perform reverse image search to find the source and similar images for a given image URL.',
      parameters: {
        type: 'object',
        properties: {
          image_url: { type: 'string', description: 'URL of the image to reverse search' }
        },
        required: ['image_url']
      }
    },
    execute: async (args: any) => {
      const url = args.image_url;
      return JSON.stringify({
        image_url: url,
        search_links: {
          google: `https://lens.google.com/uploadbyurl?url=${encodeURIComponent(url)}`,
          tineye: `https://tineye.com/search?url=${encodeURIComponent(url)}`,
          bing: `https://www.bing.com/images/search?view=detailv2&iss=sbi&q=imgurl:${encodeURIComponent(url)}`,
          yandex: `https://yandex.com/images/search?url=${encodeURIComponent(url)}&rpt=imageview`
        },
        tip: 'Open any of these links in a browser to perform the reverse image search.'
      });
    }
  },

  PodcastSearch: {
    type: 'function',
    function: {
      name: 'PodcastSearch',
      description: 'Search podcasts and episodes via iTunes/Apple Podcasts API.',
      parameters: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'Podcast name or topic' },
          limit: { type: 'number', description: 'Number of results (default: 8)' }
        },
        required: ['query']
      }
    },
    execute: async (args: any) => {
      try {
        const r = await fetch(`https://itunes.apple.com/search?term=${encodeURIComponent(args.query)}&media=podcast&limit=${args.limit || 8}`);
        if (r.ok) {
          const d = await r.json();
          const podcasts = (d.results || []).map((p: any) => ({ name: p.collectionName, author: p.artistName, genre: p.primaryGenreName, episodes: p.trackCount, feed_url: p.feedUrl, artwork: p.artworkUrl100, url: p.collectionViewUrl }));
          return JSON.stringify({ query: args.query, total: d.resultCount, podcasts });
        }
        return JSON.stringify({ error: 'iTunes search failed' });
      } catch (e: any) { return JSON.stringify({ error: e.message }); }
    }
  },

  LegalSearch: {
    type: 'function',
    function: {
      name: 'LegalSearch',
      description: 'Search legal documents, case law, statutes, and regulations.',
      parameters: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'Legal topic, case name, or statute' },
          jurisdiction: { type: 'string', description: 'Jurisdiction (e.g. "US federal", "California", "UK", "EU")' },
          doc_type: { type: 'string', enum: ['case_law', 'statute', 'regulation', 'contract_template', 'all'], description: 'Document type' }
        },
        required: ['query']
      }
    },
    execute: async (args: any) => {
      try {
        const sites = 'site:law.cornell.edu OR site:justia.com OR site:courtlistener.com OR site:findlaw.com';
        const q = `${args.query} ${args.jurisdiction || ''} ${args.doc_type !== 'all' ? args.doc_type?.replace('_', ' ') || '' : ''} ${sites}`;
        const r = await ATTACHED_TOOLS.search_web.execute({ query: q, num_results: 8 });
        const d = JSON.parse(r);
        return JSON.stringify({ query: args.query, jurisdiction: args.jurisdiction, doc_type: args.doc_type, results: d.results || [] });
      } catch (e: any) { return JSON.stringify({ error: e.message }); }
    }
  },

  CouponFinder: {
    type: 'function',
    function: {
      name: 'CouponFinder',
      description: 'Find discount codes and coupons for online stores.',
      parameters: {
        type: 'object',
        properties: {
          store: { type: 'string', description: 'Store name (e.g. "Amazon", "Nike", "Uber Eats")' }
        },
        required: ['store']
      }
    },
    execute: async (args: any) => {
      try {
        const q = `${args.store} coupon code promo discount 2025 site:retailmenot.com OR site:honey.com OR site:coupons.com OR site:dealspotr.com`;
        const r = await ATTACHED_TOOLS.search_web.execute({ query: q, num_results: 8 });
        const d = JSON.parse(r);
        return JSON.stringify({ store: args.store, coupon_sources: d.results || [] });
      } catch (e: any) { return JSON.stringify({ error: e.message }); }
    }
  },

  ProductReviews: {
    type: 'function',
    function: {
      name: 'ProductReviews',
      description: 'Find product reviews and ratings from multiple sources.',
      parameters: {
        type: 'object',
        properties: {
          product: { type: 'string', description: 'Product name or model' }
        },
        required: ['product']
      }
    },
    execute: async (args: any) => {
      try {
        const q = `${args.product} review rating pros cons site:rtings.com OR site:wirecutter.com OR site:techradar.com OR site:pcmag.com OR site:tomsguide.com`;
        const r = await ATTACHED_TOOLS.search_web.execute({ query: q, num_results: 8 });
        const d = JSON.parse(r);
        return JSON.stringify({ product: args.product, reviews: d.results || [] });
      } catch (e: any) { return JSON.stringify({ error: e.message }); }
    }
  },

  // ── Encoding & Crypto Tools ──────────────────────────────────────────────────

  Base64Encode: {
    type: 'function',
    function: {
      name: 'Base64Encode',
      description: 'Encode text to Base64. Supports UTF-8 text input.',
      parameters: {
        type: 'object',
        properties: {
          text: { type: 'string', description: 'Text to encode' }
        },
        required: ['text']
      }
    },
    execute: async (args: any) => {
      try {
        const encoded = btoa(unescape(encodeURIComponent(args.text)));
        return JSON.stringify({ input_length: args.text.length, encoded, output_length: encoded.length });
      } catch (e: any) { return JSON.stringify({ error: e.message }); }
    }
  },

  Base64Decode: {
    type: 'function',
    function: {
      name: 'Base64Decode',
      description: 'Decode a Base64-encoded string back to plaintext.',
      parameters: {
        type: 'object',
        properties: {
          encoded: { type: 'string', description: 'Base64-encoded string' }
        },
        required: ['encoded']
      }
    },
    execute: async (args: any) => {
      try {
        const decoded = decodeURIComponent(escape(atob(args.encoded)));
        return JSON.stringify({ decoded, length: decoded.length });
      } catch (e: any) { return JSON.stringify({ error: `Invalid Base64: ${e.message}` }); }
    }
  },

  JWTDecode: {
    type: 'function',
    function: {
      name: 'JWTDecode',
      description: 'Decode a JWT token header and payload without verifying signature.',
      parameters: {
        type: 'object',
        properties: {
          token: { type: 'string', description: 'JWT token string' }
        },
        required: ['token']
      }
    },
    execute: async (args: any) => {
      try {
        const parts = args.token.split('.');
        if (parts.length < 2) return JSON.stringify({ error: 'Invalid JWT format' });
        const header = JSON.parse(atob(parts[0].replace(/-/g, '+').replace(/_/g, '/')));
        const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));
        const exp = payload.exp ? new Date(payload.exp * 1000).toISOString() : null;
        const iat = payload.iat ? new Date(payload.iat * 1000).toISOString() : null;
        const isExpired = payload.exp ? Date.now() / 1000 > payload.exp : null;
        return JSON.stringify({ header, payload, issued_at: iat, expires: exp, is_expired: isExpired, has_signature: parts.length === 3 });
      } catch (e: any) { return JSON.stringify({ error: e.message }); }
    }
  },

  // ── Text & Data Processing Tools ─────────────────────────────────────────────

  CSVToJSON: {
    type: 'function',
    function: {
      name: 'CSVToJSON',
      description: 'Convert CSV text to JSON array of objects using the first row as headers.',
      parameters: {
        type: 'object',
        properties: {
          csv: { type: 'string', description: 'CSV text content' },
          delimiter: { type: 'string', description: 'Column delimiter (default: comma)' }
        },
        required: ['csv']
      }
    },
    execute: async (args: any) => {
      try {
        const delimiter = args.delimiter || ',';
        const lines = args.csv.trim().split('\n');
        if (lines.length < 2) return JSON.stringify({ error: 'CSV must have at least header + 1 data row' });
        const headers = lines[0].split(delimiter).map((h: string) => h.trim().replace(/^"|"$/g, ''));
        const result = lines.slice(1).map((line: string) => {
          const values = line.split(delimiter).map((v: string) => v.trim().replace(/^"|"$/g, ''));
          const obj: Record<string, string> = {};
          headers.forEach((h: string, i: number) => { obj[h] = values[i] || ''; });
          return obj;
        });
        return JSON.stringify({ rows: result.length, columns: headers.length, headers, data: result });
      } catch (e: any) { return JSON.stringify({ error: e.message }); }
    }
  },

  TextDiff: {
    type: 'function',
    function: {
      name: 'TextDiff',
      description: 'Compare two text blocks line-by-line and show differences (additions, removals, unchanged).',
      parameters: {
        type: 'object',
        properties: {
          text_a: { type: 'string', description: 'Original text' },
          text_b: { type: 'string', description: 'Modified text' }
        },
        required: ['text_a', 'text_b']
      }
    },
    execute: async (args: any) => {
      const linesA = args.text_a.split('\n');
      const linesB = args.text_b.split('\n');
      const maxLen = Math.max(linesA.length, linesB.length);
      const diff: string[] = [];
      let added = 0, removed = 0, unchanged = 0;
      for (let i = 0; i < maxLen; i++) {
        const la = linesA[i];
        const lb = linesB[i];
        if (la === undefined) { diff.push(`+ ${lb}`); added++; }
        else if (lb === undefined) { diff.push(`- ${la}`); removed++; }
        else if (la !== lb) { diff.push(`- ${la}`); diff.push(`+ ${lb}`); added++; removed++; }
        else { diff.push(`  ${la}`); unchanged++; }
      }
      return JSON.stringify({ added, removed, unchanged, total_lines: maxLen, diff: diff.join('\n') });
    }
  },

  TextStats: {
    type: 'function',
    function: {
      name: 'TextStats',
      description: 'Analyze text and return character count, word count, line count, sentence count, paragraph count, and estimated reading time.',
      parameters: {
        type: 'object',
        properties: {
          text: { type: 'string', description: 'Text to analyze' }
        },
        required: ['text']
      }
    },
    execute: async (args: any) => {
      const text = args.text || '';
      const chars = text.length;
      const charsNoSpaces = text.replace(/\s/g, '').length;
      const words = text.split(/\s+/).filter((w: string) => w.length > 0).length;
      const lines = text.split('\n').length;
      const sentences = text.split(/[.!?]+/).filter((s: string) => s.trim().length > 0).length;
      const paragraphs = text.split(/\n\s*\n/).filter((p: string) => p.trim().length > 0).length;
      const readingTimeMin = +(words / 200).toFixed(1);
      const speakingTimeMin = +(words / 130).toFixed(1);
      return JSON.stringify({ characters: chars, characters_no_spaces: charsNoSpaces, words, lines, sentences, paragraphs, reading_time_minutes: readingTimeMin, speaking_time_minutes: speakingTimeMin });
    }
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // ── APP INTEGRATIONS ──────────────────────────────────────────────────────
  // ═══════════════════════════════════════════════════════════════════════════

  // ── GitHub Direct Connect ─────────────────────────────────────────────────
  GitHubListRepos: {
    type: 'function',
    function: { name: 'GitHubListRepos', description: 'List your GitHub repositories (authenticated). Requires GitHub Personal Access Token.', parameters: { type: 'object', properties: { sort: { type: 'string', description: 'Sort by: updated, created, pushed, full_name', enum: ['updated', 'created', 'pushed', 'full_name'] }, per_page: { type: 'number', description: 'Number of repos to return (max 100)' } } } },
    execute: async (args: any) => {
      const s = getLocalSettings(); const token = s.githubToken; if (!token) return 'GitHub token not configured. Go to Settings > Apps > GitHub and add your Personal Access Token.';
      try { return await githubIntegration.listRepos(token, args.sort || 'updated', args.per_page || 10); } catch (e: any) { return `GitHub error: ${e.message}`; }
    }
  },
  GitHubCreateRepo: {
    type: 'function',
    function: { name: 'GitHubCreateRepo', description: 'Create a new GitHub repository', parameters: { type: 'object', properties: { name: { type: 'string', description: 'Repository name' }, description: { type: 'string', description: 'Repository description' }, private: { type: 'boolean', description: 'Whether the repo should be private' } }, required: ['name'] } },
    execute: async (args: any) => {
      const s = getLocalSettings(); const token = s.githubToken; if (!token) return 'GitHub token not configured. Go to Settings > Apps > GitHub and add your Personal Access Token.';
      try { return await githubIntegration.createRepo(token, args.name, args.description || '', args.private || false); } catch (e: any) { return `GitHub error: ${e.message}`; }
    }
  },
  GitHubCreateIssue: {
    type: 'function',
    function: { name: 'GitHubCreateIssue', description: 'Create an issue on a GitHub repository', parameters: { type: 'object', properties: { owner: { type: 'string', description: 'Repository owner' }, repo: { type: 'string', description: 'Repository name' }, title: { type: 'string', description: 'Issue title' }, body: { type: 'string', description: 'Issue body/description' } }, required: ['owner', 'repo', 'title'] } },
    execute: async (args: any) => {
      const s = getLocalSettings(); const token = s.githubToken; if (!token) return 'GitHub token not configured.';
      try { return await githubIntegration.createIssue(token, args.owner, args.repo, args.title, args.body || ''); } catch (e: any) { return `GitHub error: ${e.message}`; }
    }
  },
  GitHubCreatePR: {
    type: 'function',
    function: { name: 'GitHubCreatePR', description: 'Create a pull request on a GitHub repository', parameters: { type: 'object', properties: { owner: { type: 'string', description: 'Repository owner' }, repo: { type: 'string', description: 'Repository name' }, title: { type: 'string', description: 'PR title' }, body: { type: 'string', description: 'PR description' }, head: { type: 'string', description: 'Head branch' }, base: { type: 'string', description: 'Base branch (default: main)' } }, required: ['owner', 'repo', 'title', 'head'] } },
    execute: async (args: any) => {
      const s = getLocalSettings(); const token = s.githubToken; if (!token) return 'GitHub token not configured.';
      try { return await githubIntegration.createPR(token, args.owner, args.repo, args.title, args.body || '', args.head, args.base || 'main'); } catch (e: any) { return `GitHub error: ${e.message}`; }
    }
  },
  GitHubListPRs: {
    type: 'function',
    function: { name: 'GitHubListPRs', description: 'List pull requests on a GitHub repository', parameters: { type: 'object', properties: { owner: { type: 'string', description: 'Repository owner' }, repo: { type: 'string', description: 'Repository name' }, state: { type: 'string', description: 'Filter by state', enum: ['open', 'closed', 'all'] } }, required: ['owner', 'repo'] } },
    execute: async (args: any) => {
      const s = getLocalSettings(); const token = s.githubToken; if (!token) return 'GitHub token not configured.';
      try { return await githubIntegration.listPRs(token, args.owner, args.repo, args.state || 'open'); } catch (e: any) { return `GitHub error: ${e.message}`; }
    }
  },
  GitHubNotifications: {
    type: 'function',
    function: { name: 'GitHubNotifications', description: 'Get your GitHub notifications', parameters: { type: 'object', properties: {} } },
    execute: async () => {
      const s = getLocalSettings(); const token = s.githubToken; if (!token) return 'GitHub token not configured.';
      try { return await githubIntegration.getNotifications(token); } catch (e: any) { return `GitHub error: ${e.message}`; }
    }
  },
  GitHubStarRepo: {
    type: 'function',
    function: { name: 'GitHubStarRepo', description: 'Star a GitHub repository', parameters: { type: 'object', properties: { owner: { type: 'string', description: 'Repository owner' }, repo: { type: 'string', description: 'Repository name' } }, required: ['owner', 'repo'] } },
    execute: async (args: any) => {
      const s = getLocalSettings(); const token = s.githubToken; if (!token) return 'GitHub token not configured.';
      try { return await githubIntegration.starRepo(token, args.owner, args.repo); } catch (e: any) { return `GitHub error: ${e.message}`; }
    }
  },
  GitHubSearchCode: {
    type: 'function',
    function: { name: 'GitHubSearchCode', description: 'Search code across GitHub repositories', parameters: { type: 'object', properties: { query: { type: 'string', description: 'Search query (supports GitHub code search syntax)' } }, required: ['query'] } },
    execute: async (args: any) => {
      const s = getLocalSettings(); const token = s.githubToken; if (!token) return 'GitHub token not configured.';
      try { return await githubIntegration.searchCode(token, args.query); } catch (e: any) { return `GitHub error: ${e.message}`; }
    }
  },
  GitHubProfile: {
    type: 'function',
    function: { name: 'GitHubProfile', description: 'Get your authenticated GitHub user profile', parameters: { type: 'object', properties: {} } },
    execute: async () => {
      const s = getLocalSettings(); const token = s.githubToken; if (!token) return 'GitHub token not configured.';
      try { return await githubIntegration.getUserProfile(token); } catch (e: any) { return `GitHub error: ${e.message}`; }
    }
  },

  // ── Gmail ─────────────────────────────────────────────────────────────────
  GmailSendEmail: {
    type: 'function',
    function: { name: 'GmailSendEmail', description: 'Send an email via Gmail', parameters: { type: 'object', properties: { to: { type: 'string', description: 'Recipient email address' }, subject: { type: 'string', description: 'Email subject' }, body: { type: 'string', description: 'Email body text' } }, required: ['to', 'subject', 'body'] } },
    execute: async (args: any) => {
      const s = getLocalSettings(); const key = s.gmailApiKey; if (!key) return 'Gmail API key not configured. Go to Settings > Apps > Gmail and add your API key or Apps Script deployment ID.';
      try { return await gmailIntegration.sendEmail(key, args.to, args.subject, args.body); } catch (e: any) { return `Gmail error: ${e.message}`; }
    }
  },
  GmailSearchInbox: {
    type: 'function',
    function: { name: 'GmailSearchInbox', description: 'Search your Gmail inbox', parameters: { type: 'object', properties: { query: { type: 'string', description: 'Search query' } }, required: ['query'] } },
    execute: async (args: any) => {
      const s = getLocalSettings(); const key = s.gmailApiKey; if (!key) return 'Gmail API key not configured.';
      try { return await gmailIntegration.searchInbox(key, args.query); } catch (e: any) { return `Gmail error: ${e.message}`; }
    }
  },
  GmailListLabels: {
    type: 'function',
    function: { name: 'GmailListLabels', description: 'List Gmail labels/folders', parameters: { type: 'object', properties: {} } },
    execute: async () => {
      const s = getLocalSettings(); const key = s.gmailApiKey; if (!key) return 'Gmail API key not configured.';
      try { return await gmailIntegration.listLabels(key); } catch (e: any) { return `Gmail error: ${e.message}`; }
    }
  },

  // ── Slack ──────────────────────────────────────────────────────────────────
  SlackSendMessage: {
    type: 'function',
    function: { name: 'SlackSendMessage', description: 'Send a message to a Slack channel', parameters: { type: 'object', properties: { channel: { type: 'string', description: 'Channel name or ID' }, text: { type: 'string', description: 'Message text' } }, required: ['channel', 'text'] } },
    execute: async (args: any) => {
      const s = getLocalSettings(); const token = s.slackBotToken; if (!token) return 'Slack bot token not configured. Go to Settings > Apps > Slack and add your bot token.';
      try { return await slackIntegration.sendMessage(token, args.channel, args.text); } catch (e: any) { return `Slack error: ${e.message}`; }
    }
  },
  SlackListChannels: {
    type: 'function',
    function: { name: 'SlackListChannels', description: 'List all Slack channels', parameters: { type: 'object', properties: {} } },
    execute: async () => {
      const s = getLocalSettings(); const token = s.slackBotToken; if (!token) return 'Slack bot token not configured.';
      try { return await slackIntegration.listChannels(token); } catch (e: any) { return `Slack error: ${e.message}`; }
    }
  },
  SlackGetMessages: {
    type: 'function',
    function: { name: 'SlackGetMessages', description: 'Get recent messages from a Slack channel', parameters: { type: 'object', properties: { channel: { type: 'string', description: 'Channel ID' }, limit: { type: 'number', description: 'Number of messages to retrieve' } }, required: ['channel'] } },
    execute: async (args: any) => {
      const s = getLocalSettings(); const token = s.slackBotToken; if (!token) return 'Slack bot token not configured.';
      try { return await slackIntegration.getMessages(token, args.channel, args.limit || 10); } catch (e: any) { return `Slack error: ${e.message}`; }
    }
  },
  SlackSetStatus: {
    type: 'function',
    function: { name: 'SlackSetStatus', description: 'Set your Slack status', parameters: { type: 'object', properties: { text: { type: 'string', description: 'Status text' }, emoji: { type: 'string', description: 'Status emoji (e.g. :coffee:)' } }, required: ['text'] } },
    execute: async (args: any) => {
      const s = getLocalSettings(); const token = s.slackBotToken; if (!token) return 'Slack bot token not configured.';
      try { return await slackIntegration.setStatus(token, args.text, args.emoji || ':speech_balloon:'); } catch (e: any) { return `Slack error: ${e.message}`; }
    }
  },

  // ── Discord ────────────────────────────────────────────────────────────────
  DiscordSendMessage: {
    type: 'function',
    function: { name: 'DiscordSendMessage', description: 'Send a message to a Discord channel', parameters: { type: 'object', properties: { channel_id: { type: 'string', description: 'Channel ID' }, content: { type: 'string', description: 'Message content' } }, required: ['channel_id', 'content'] } },
    execute: async (args: any) => {
      const s = getLocalSettings(); const token = s.discordBotToken; if (!token) return 'Discord bot token not configured. Go to Settings > Apps > Discord and add your bot token.';
      try { return await discordIntegration.sendMessage(token, args.channel_id, args.content); } catch (e: any) { return `Discord error: ${e.message}`; }
    }
  },
  DiscordListGuilds: {
    type: 'function',
    function: { name: 'DiscordListGuilds', description: 'List Discord servers (guilds) the bot is in', parameters: { type: 'object', properties: {} } },
    execute: async () => {
      const s = getLocalSettings(); const token = s.discordBotToken; if (!token) return 'Discord bot token not configured.';
      try { return await discordIntegration.listGuilds(token); } catch (e: any) { return `Discord error: ${e.message}`; }
    }
  },
  DiscordGetChannels: {
    type: 'function',
    function: { name: 'DiscordGetChannels', description: 'List channels in a Discord server', parameters: { type: 'object', properties: { guild_id: { type: 'string', description: 'Guild/Server ID' } }, required: ['guild_id'] } },
    execute: async (args: any) => {
      const s = getLocalSettings(); const token = s.discordBotToken; if (!token) return 'Discord bot token not configured.';
      try { return await discordIntegration.getChannels(token, args.guild_id); } catch (e: any) { return `Discord error: ${e.message}`; }
    }
  },

  // ── Telegram ───────────────────────────────────────────────────────────────
  TelegramSendMessage: {
    type: 'function',
    function: { name: 'TelegramSendMessage', description: 'Send a message via Telegram bot', parameters: { type: 'object', properties: { chat_id: { type: 'string', description: 'Chat ID or username' }, text: { type: 'string', description: 'Message text (supports HTML)' } }, required: ['chat_id', 'text'] } },
    execute: async (args: any) => {
      const s = getLocalSettings(); const token = s.telegramBotToken; if (!token) return 'Telegram bot token not configured. Go to Settings > Apps > Telegram and add your bot token from @BotFather.';
      try { return await telegramIntegration.sendMessage(token, args.chat_id, args.text); } catch (e: any) { return `Telegram error: ${e.message}`; }
    }
  },
  TelegramGetUpdates: {
    type: 'function',
    function: { name: 'TelegramGetUpdates', description: 'Get recent Telegram bot messages/updates', parameters: { type: 'object', properties: {} } },
    execute: async () => {
      const s = getLocalSettings(); const token = s.telegramBotToken; if (!token) return 'Telegram bot token not configured.';
      try { return await telegramIntegration.getUpdates(token); } catch (e: any) { return `Telegram error: ${e.message}`; }
    }
  },
  TelegramBotInfo: {
    type: 'function',
    function: { name: 'TelegramBotInfo', description: 'Get Telegram bot information', parameters: { type: 'object', properties: {} } },
    execute: async () => {
      const s = getLocalSettings(); const token = s.telegramBotToken; if (!token) return 'Telegram bot token not configured.';
      try { return await telegramIntegration.getBotInfo(token); } catch (e: any) { return `Telegram error: ${e.message}`; }
    }
  },
  TelegramSendPhoto: {
    type: 'function',
    function: { name: 'TelegramSendPhoto', description: 'Send a photo via Telegram bot', parameters: { type: 'object', properties: { chat_id: { type: 'string', description: 'Chat ID' }, photo_url: { type: 'string', description: 'URL of the photo to send' }, caption: { type: 'string', description: 'Photo caption' } }, required: ['chat_id', 'photo_url'] } },
    execute: async (args: any) => {
      const s = getLocalSettings(); const token = s.telegramBotToken; if (!token) return 'Telegram bot token not configured.';
      try { return await telegramIntegration.sendPhoto(token, args.chat_id, args.photo_url, args.caption || ''); } catch (e: any) { return `Telegram error: ${e.message}`; }
    }
  },

  // ── Google Calendar ────────────────────────────────────────────────────────
  GoogleCalendarEvents: {
    type: 'function',
    function: { name: 'GoogleCalendarEvents', description: 'List upcoming Google Calendar events', parameters: { type: 'object', properties: { calendar_id: { type: 'string', description: 'Calendar ID (default: primary)' }, max_results: { type: 'number', description: 'Max events to return' } } } },
    execute: async (args: any) => {
      const s = getLocalSettings(); const key = s.googleCalendarApiKey; if (!key) return 'Google Calendar API key not configured. Go to Settings > Apps > Google Calendar and add your API key.';
      try { return await googleCalendarIntegration.listEvents(key, args.calendar_id || 'primary', args.max_results || 10); } catch (e: any) { return `Calendar error: ${e.message}`; }
    }
  },
  GoogleCalendarSearch: {
    type: 'function',
    function: { name: 'GoogleCalendarSearch', description: 'Search Google Calendar events', parameters: { type: 'object', properties: { query: { type: 'string', description: 'Search query' }, calendar_id: { type: 'string', description: 'Calendar ID (default: primary)' } }, required: ['query'] } },
    execute: async (args: any) => {
      const s = getLocalSettings(); const key = s.googleCalendarApiKey; if (!key) return 'Google Calendar API key not configured.';
      try { return await googleCalendarIntegration.searchEvents(key, args.query, args.calendar_id || 'primary'); } catch (e: any) { return `Calendar error: ${e.message}`; }
    }
  },

  // ── Google Drive ───────────────────────────────────────────────────────────
  GoogleDriveListFiles: {
    type: 'function',
    function: { name: 'GoogleDriveListFiles', description: 'List files in Google Drive', parameters: { type: 'object', properties: { max_results: { type: 'number', description: 'Max files to return' } } } },
    execute: async (args: any) => {
      const s = getLocalSettings(); const key = s.googleDriveApiKey; if (!key) return 'Google Drive API key not configured. Go to Settings > Apps > Google Drive and add your API key.';
      try { return await googleDriveIntegration.listFiles(key, '', args.max_results || 15); } catch (e: any) { return `Drive error: ${e.message}`; }
    }
  },
  GoogleDriveSearch: {
    type: 'function',
    function: { name: 'GoogleDriveSearch', description: 'Search files in Google Drive', parameters: { type: 'object', properties: { query: { type: 'string', description: 'Search query' } }, required: ['query'] } },
    execute: async (args: any) => {
      const s = getLocalSettings(); const key = s.googleDriveApiKey; if (!key) return 'Google Drive API key not configured.';
      try { return await googleDriveIntegration.searchFiles(key, args.query); } catch (e: any) { return `Drive error: ${e.message}`; }
    }
  },

  // ── Trello ─────────────────────────────────────────────────────────────────
  TrelloListBoards: {
    type: 'function',
    function: { name: 'TrelloListBoards', description: 'List your Trello boards', parameters: { type: 'object', properties: {} } },
    execute: async () => {
      const s = getLocalSettings(); const key = s.trelloApiKey; const token = s.trelloToken; if (!key || !token) return 'Trello API key/token not configured. Go to Settings > Apps > Trello and add your credentials.';
      try { return await trelloIntegration.listBoards(key, token); } catch (e: any) { return `Trello error: ${e.message}`; }
    }
  },
  TrelloGetCards: {
    type: 'function',
    function: { name: 'TrelloGetCards', description: 'Get cards from a Trello board', parameters: { type: 'object', properties: { board_id: { type: 'string', description: 'Board ID' } }, required: ['board_id'] } },
    execute: async (args: any) => {
      const s = getLocalSettings(); const key = s.trelloApiKey; const token = s.trelloToken; if (!key || !token) return 'Trello not configured.';
      try { return await trelloIntegration.getCards(key, token, args.board_id); } catch (e: any) { return `Trello error: ${e.message}`; }
    }
  },
  TrelloCreateCard: {
    type: 'function',
    function: { name: 'TrelloCreateCard', description: 'Create a new Trello card', parameters: { type: 'object', properties: { list_id: { type: 'string', description: 'List ID to add the card to' }, name: { type: 'string', description: 'Card name' }, description: { type: 'string', description: 'Card description' } }, required: ['list_id', 'name'] } },
    execute: async (args: any) => {
      const s = getLocalSettings(); const key = s.trelloApiKey; const token = s.trelloToken; if (!key || !token) return 'Trello not configured.';
      try { return await trelloIntegration.createCard(key, token, args.list_id, args.name, args.description || ''); } catch (e: any) { return `Trello error: ${e.message}`; }
    }
  },

  // ── Spotify ────────────────────────────────────────────────────────────────
  SpotifySearchTracks: {
    type: 'function',
    function: { name: 'SpotifySearchTracks', description: 'Search for tracks on Spotify', parameters: { type: 'object', properties: { query: { type: 'string', description: 'Search query' }, limit: { type: 'number', description: 'Max results' } }, required: ['query'] } },
    execute: async (args: any) => {
      const s = getLocalSettings(); const token = s.spotifyToken; if (!token) return 'Spotify token not configured. Go to Settings > Apps > Spotify and add your access token.';
      try { return await spotifyIntegration.searchTracks(token, args.query, args.limit || 10); } catch (e: any) { return `Spotify error: ${e.message}`; }
    }
  },
  SpotifyGetPlaylists: {
    type: 'function',
    function: { name: 'SpotifyGetPlaylists', description: 'Get your Spotify playlists', parameters: { type: 'object', properties: { limit: { type: 'number', description: 'Max playlists to return' } } } },
    execute: async (args: any) => {
      const s = getLocalSettings(); const token = s.spotifyToken; if (!token) return 'Spotify token not configured.';
      try { return await spotifyIntegration.getPlaylists(token, args.limit || 20); } catch (e: any) { return `Spotify error: ${e.message}`; }
    }
  },
  SpotifyGetArtist: {
    type: 'function',
    function: { name: 'SpotifyGetArtist', description: 'Get artist information from Spotify', parameters: { type: 'object', properties: { query: { type: 'string', description: 'Artist name to search' } }, required: ['query'] } },
    execute: async (args: any) => {
      const s = getLocalSettings(); const token = s.spotifyToken; if (!token) return 'Spotify token not configured.';
      try { return await spotifyIntegration.getArtist(token, args.query); } catch (e: any) { return `Spotify error: ${e.message}`; }
    }
  },

  // ── Microsoft Teams ────────────────────────────────────────────────────────
  TeamsSendMessage: {
    type: 'function',
    function: { name: 'TeamsSendMessage', description: 'Send a message to Microsoft Teams via webhook', parameters: { type: 'object', properties: { text: { type: 'string', description: 'Message text' }, title: { type: 'string', description: 'Message title (optional)' } }, required: ['text'] } },
    execute: async (args: any) => {
      const s = getLocalSettings(); const url = s.teamsWebhookUrl; if (!url) return 'Teams webhook URL not configured. Go to Settings > Apps > Microsoft Teams and add your webhook URL.';
      try { return await teamsIntegration.sendMessage(url, args.text, args.title); } catch (e: any) { return `Teams error: ${e.message}`; }
    }
  },

  // ── WhatsApp ───────────────────────────────────────────────────────────────
  WhatsAppSendMessage: {
    type: 'function',
    function: { name: 'WhatsAppSendMessage', description: 'Send a WhatsApp message via Business API', parameters: { type: 'object', properties: { to: { type: 'string', description: 'Recipient phone number (with country code)' }, text: { type: 'string', description: 'Message text' } }, required: ['to', 'text'] } },
    execute: async (args: any) => {
      const s = getLocalSettings(); const token = s.whatsappToken; const phoneId = s.whatsappPhoneNumberId; if (!token || !phoneId) return 'WhatsApp not configured. Go to Settings > Apps > WhatsApp and add your token and phone number ID.';
      try { return await whatsappIntegration.sendMessage(token, phoneId, args.to, args.text); } catch (e: any) { return `WhatsApp error: ${e.message}`; }
    }
  },

  // ── LinkedIn ───────────────────────────────────────────────────────────────
  LinkedInProfile: {
    type: 'function',
    function: { name: 'LinkedInProfile', description: 'Get your LinkedIn profile information', parameters: { type: 'object', properties: {} } },
    execute: async () => {
      const s = getLocalSettings(); const token = s.linkedinToken; if (!token) return 'LinkedIn token not configured. Go to Settings > Apps > LinkedIn and add your access token.';
      try { return await linkedinIntegration.getProfile(token); } catch (e: any) { return `LinkedIn error: ${e.message}`; }
    }
  },
  LinkedInCreatePost: {
    type: 'function',
    function: { name: 'LinkedInCreatePost', description: 'Create a LinkedIn post', parameters: { type: 'object', properties: { text: { type: 'string', description: 'Post content text' } }, required: ['text'] } },
    execute: async (args: any) => {
      const s = getLocalSettings(); const token = s.linkedinToken; if (!token) return 'LinkedIn token not configured.';
      try { return await linkedinIntegration.createPost(token, args.text); } catch (e: any) { return `LinkedIn error: ${e.message}`; }
    }
  },

  // ── 1SecMail Temporary Email ────────────────────────────────────────────────
  TempMailGenerate: {
    type: 'function',
    function: { name: 'TempMailGenerate', description: 'Generate a temporary disposable email address using 1SecMail. No API key needed.', parameters: { type: 'object', properties: { count: { type: 'number', description: 'Number of email addresses to generate (default: 1)' } } } },
    execute: async (args: any) => {
      try { return await secmailIntegration.generateEmail(args.count || 1); } catch (e: any) { return `1SecMail error: ${e.message}`; }
    }
  },
  TempMailInbox: {
    type: 'function',
    function: { name: 'TempMailInbox', description: 'Check inbox of a 1SecMail temporary email address', parameters: { type: 'object', properties: { email: { type: 'string', description: 'Temporary email address (e.g. user@1secmail.com)' } }, required: ['email'] } },
    execute: async (args: any) => {
      try { return await secmailIntegration.getInbox(args.email); } catch (e: any) { return `1SecMail error: ${e.message}`; }
    }
  },
  TempMailRead: {
    type: 'function',
    function: { name: 'TempMailRead', description: 'Read a specific email from a 1SecMail temporary inbox', parameters: { type: 'object', properties: { email: { type: 'string', description: 'Temporary email address' }, message_id: { type: 'number', description: 'Message ID from inbox listing' } }, required: ['email', 'message_id'] } },
    execute: async (args: any) => {
      try { return await secmailIntegration.readEmail(args.email, args.message_id); } catch (e: any) { return `1SecMail error: ${e.message}`; }
    }
  },

  // ── Autofill / Form Data Generator ──────────────────────────────────────────
  AutofillIdentity: {
    type: 'function',
    function: { name: 'AutofillIdentity', description: 'Generate a complete fake identity for form autofill (name, email, phone, address, company, credit card)', parameters: { type: 'object', properties: { locale: { type: 'string', description: 'Locale for data generation (default: en)' } } } },
    execute: async (args: any) => {
      try { return autofillIntegration.generateIdentity(args.locale || 'en'); } catch (e: any) { return `Autofill error: ${e.message}`; }
    }
  },
  AutofillFormData: {
    type: 'function',
    function: { name: 'AutofillFormData', description: 'Generate form field values for specific fields (name, email, phone, address, city, state, zip, country, company, website, username, password, date, bio)', parameters: { type: 'object', properties: { fields: { type: 'array', items: { type: 'string' }, description: 'List of field names to generate data for' } }, required: ['fields'] } },
    execute: async (args: any) => {
      try { return autofillIntegration.generateFormData(args.fields || ['name', 'email', 'phone']); } catch (e: any) { return `Autofill error: ${e.message}`; }
    }
  }

};
// ── Helper: extract links from markdown content ────────────────────────────
function extractLinksFromMarkdown(md: string): { text: string; url: string }[] {
  const links: { text: string; url: string }[] = [];
  const mdLinkRegex = /\[([^\]]+)\]\((https?:\/\/[^\)]+)\)/g;
  const rawUrlRegex = /https?:\/\/[^\s\)\"\'<>]+/g;
  let match;
  while ((match = mdLinkRegex.exec(md)) !== null) {
    links.push({ text: match[1], url: match[2] });
  }
  while ((match = rawUrlRegex.exec(md)) !== null) {
    if (!links.find(l => l.url === match![0])) {
      links.push({ text: match[0], url: match[0] });
    }
  }
  return links.slice(0, 30);
}

// ── Helper: generate diverse research queries ──────────────────────────────
function generateResearchQueries(topic: string, focus: string, count: number): string[] {
  const base = topic.trim();
  const f = focus ? ` ${focus}` : '';
  const year = new Date().getFullYear();
  const queries = [
    `${base}${f}`,
    `${base} explained in depth${f}`,
    `${base} ${year} latest${f}`,
    `${base} how it works technical details`,
    `${base} best practices guide`,
    `${base} comparison alternatives`,
    `${base} problems limitations issues`,
    `${base} research paper study analysis`,
    `"${base}" site:github.com OR site:stackoverflow.com`,
    `${base} expert review opinion`
  ];
  return queries.slice(0, count);
}

export const getDynamicTools = async (settings: any) => {
  const enabledNames = settings.enabledTools || [];

  const localTools = Object.keys(ATTACHED_TOOLS)
    .filter(name => enabledNames.includes(name))
    .map(name => {
      const cloned = JSON.parse(JSON.stringify(ATTACHED_TOOLS[name]));
      if (cloned.function?.parameters?.properties) {
        Object.keys(cloned.function.parameters.properties).forEach(k => {
          if ('default' in cloned.function.parameters.properties[k]) {
            delete cloned.function.parameters.properties[k].default;
          }
        });
      }
      return cloned;
    });

  let mappedMcpTools: any[] = [];
  try {
    const { mcpService } = await import('./mcp');
    if (mcpService.isConnected) {
      const mcpToolsRaw = await mcpService.getTools();
      mappedMcpTools = mcpToolsRaw
        .filter(mt => enabledNames.includes(mt.name))
        .map(mt => {
          return {
            type: 'function',
            function: {
              name: mt.name,
              description: mt.description || `MCP Tool: ${mt.name}`,
              parameters: mt.inputSchema || { type: 'object', properties: {} }
            }
          };
        });
    }
  } catch (e) { console.error("Error loading MCP tools:", e); }

  const combinedTools = [...localTools, ...mappedMcpTools].map((t: any) => {
    // Ensure all tools have a valid parameters schema to prevent Bedrock "empty inputSchema" errors.
    // Some providers reject completely missing parameters or empty properties.
    if (!t.function.parameters || !t.function.parameters.properties || Object.keys(t.function.parameters.properties).length === 0) {
      t.function.parameters = {
        type: 'object',
        properties: {
          _optional_args: { type: 'string', description: 'Optional arguments' }
        }
      };
    }
    return t;
  });

  return combinedTools;
};

export const executeToolCall = async (toolCall: ToolCall) => {
  const name = toolCall.function.name;
  let args;
  try { args = JSON.parse(toolCall.function.arguments); } catch (e) { args = toolCall.function.arguments || {}; }

  const tool = ATTACHED_TOOLS[name];
  if (tool) {
    const result = await tool.execute(args);
    return typeof result === 'string' ? result : JSON.stringify(result);
  }

  try {
    const { mcpService } = await import('./mcp');
    if (mcpService.isConnected) {
      const result = await mcpService.executeTool(name, args);
      return typeof result === 'string' ? result : JSON.stringify(result);
    }
  } catch (e) { }

  throw new Error(`Tool not found: ${name}`);
};

