import React, { useState, useMemo, useEffect, useRef } from 'react';
import { 
  X, Settings, Cpu, Wrench, Key, Sliders, ShieldAlert, CheckCircle2, 
  AlertCircle, RefreshCw, Eye, EyeOff, Download, Trash2, 
  Search, Terminal, Sparkles, Check, Zap, Layers, Globe, Server, Lock,
  Plus, ExternalLink, Play, Radio, CheckSquare, Square, ChevronRight,
  Copy, Code, BookOpen, Compass, FileJson, Share2
} from 'lucide-react';
import { useWormGPT } from '../../context/GlobalContext';
import { AppSettings, ProviderType } from '../../types';
import { providerRegistry, autoVerifyApiKey, EXPANDED_PROVIDERS } from '../../services/providers/registry';
import { DEFAULT_SYSTEM_INSTRUCTION, MODEL_OPTIONS } from '../../constants';
import { TOOL_CATEGORIES, ATTACHED_TOOLS } from '../../services/tools';
import { pxpipeEngine, PxpipeTokenStats, PxpipeProxyStatus } from '../../services/pxpipe';
import { verifyMcpServer, verifyProviderApiKey, McpVerificationResult, KeyVerificationResult } from '../../services/providers/verifyApiKey';
import { 
  REMOTE_MCP_DIRECTORY, 
  MCP_CATEGORIES, 
  RemoteMcpServer, 
  McpCategory, 
  generateMcpServersJson, 
  generateClaudeCliCommands, 
  getZeroAuthMcpServers,
  searchMcpServers
} from '../../services/mcpDirectory';

export type SettingsTab = 'general' | 'providers' | 'mcp' | 'tools' | 'pxpipe' | 'harness';

export interface SettingsDrawerProps {
  isOpen?: boolean;
  onClose?: () => void;
  settings?: any;
  onSave?: (newSettings: any) => void;
  initialTab?: SettingsTab;
  onOpenExport?: () => void;
  onConfirmReset?: () => void;
  onConfirmClear?: () => void;
}

export const SettingsDrawer: React.FC<SettingsDrawerProps> = ({
  isOpen: propIsOpen,
  onClose: propOnClose,
  settings: propSettings,
  onSave: propOnSave,
  initialTab = 'general',
  onOpenExport,
  onConfirmReset,
  onConfirmClear
}) => {
  const { 
    isSettingsOpen: ctxIsOpen, 
    setIsSettingsOpen: ctxSetIsOpen, 
    settings: ctxSettings, 
    setSettings: ctxSetSettings, 
    activeSession, 
    clearSessionBuffer 
  } = useWormGPT();

  const isOpen = propIsOpen !== undefined ? propIsOpen : ctxIsOpen;
  const onClose = propOnClose || (() => ctxSetIsOpen(false));
  const settings = propSettings || ctxSettings;
  const setSettings = (updater: any) => {
    if (propOnSave) {
      if (typeof updater === 'function') {
        propOnSave(updater(settings));
      } else {
        propOnSave(updater);
      }
    } else {
      ctxSetSettings(updater);
    }
  };

  const [activeTab, setActiveTab] = useState<SettingsTab>(initialTab);
  const [providerSearch, setProviderSearch] = useState('');
  const [providerCategory, setProviderCategory] = useState<'all' | 'cloud' | 'router' | 'local' | 'configured'>('all');
  const [showKeys, setShowKeys] = useState<Record<string, boolean>>({});

  const [customModelInputs, setCustomModelInputs] = useState<Record<string, string>>({});

  // Real-time API key verification statuses (Green/Red)
  const [verifyStatuses, setVerifyStatuses] = useState<Record<string, {
    status: 'idle' | 'checking' | 'valid' | 'invalid';
    latencyMs?: number;
    error?: string;
    model?: string;
    statusCode?: number;
    details?: string;
  }>>({});

  // MCP Servers State & Verification (Green/Red)
  const defaultMcpServers = useMemo(() => [
    'http://localhost:3000/mcp',
    'http://localhost:3001/mcp',
    'http://localhost:3002/mcp',
    'http://localhost:3003/mcp'
  ], []);

  const [mcpServerUrls, setMcpServerUrls] = useState<string[]>(() => {
    return settings.mcpServerUrls && settings.mcpServerUrls.length > 0 
      ? settings.mcpServerUrls 
      : defaultMcpServers;
  });
  const [newMcpUrl, setNewMcpUrl] = useState('');
  const [mcpStatuses, setMcpStatuses] = useState<Record<string, McpVerificationResult>>({});
  const [activeMcpTools, setActiveMcpTools] = useState<Record<string, string[]>>({});

  // MCP Directory & Explorer State
  const [mcpViewMode, setMcpViewMode] = useState<'active' | 'directory' | 'export'>('directory');
  const [mcpSearch, setMcpSearch] = useState('');
  const [mcpCategory, setMcpCategory] = useState<McpCategory | 'all' | 'zero_auth'>('all');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [mcpExportFormat, setMcpExportFormat] = useState<'json' | 'cli'>('json');
  const [mcpExportScope, setMcpExportScope] = useState<'all' | 'zero_auth' | 'configured'>('zero_auth');

  // Filtered MCP servers from directory
  const filteredMcpDirectory = useMemo(() => {
    return searchMcpServers(mcpSearch, mcpCategory);
  }, [mcpSearch, mcpCategory]);

  const zeroAuthServers = useMemo(() => {
    return getZeroAuthMcpServers();
  }, []);

  const handleCopyText = (text: string, id: string) => {
    try {
      navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      // Fallback if clipboard API is restricted
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    }
  };

  const handleQuickAddMcpServer = (url: string) => {
    if (!mcpServerUrls.includes(url)) {
      const nextUrls = [...mcpServerUrls, url];
      setMcpServerUrls(nextUrls);
      setSettings((s: AppSettings) => ({ ...s, mcpServerUrls: nextUrls, mcpEnabled: true }));
      runVerifyMcp(url);
    }
  };

  const handleQuickConnectZeroAuthBundle = () => {
    const zeroAuthUrls = zeroAuthServers.slice(0, 10).map(s => s.url);
    const combined = Array.from(new Set([...mcpServerUrls, ...zeroAuthUrls]));
    setMcpServerUrls(combined);
    setSettings((s: AppSettings) => ({ ...s, mcpServerUrls: combined, mcpEnabled: true }));
    zeroAuthUrls.forEach(url => runVerifyMcp(url));
  };

  // Tools Search & Category Filter State
  const [toolSearchQuery, setToolSearchQuery] = useState('');
  const [activeToolCategory, setActiveToolCategory] = useState<string>('all');

  // pxpipe state
  const [pxpipeProxyStatus, setPxpipeProxyStatus] = useState<PxpipeProxyStatus | null>(null);
  const [sampleText, setSampleText] = useState('// WormGPT Security Intelligence Briefing\nfunction auditNetwork(subnet) {\n  console.log("Analyzing ports for: " + subnet);\n  return { status: "secure", verified: true };\n}');
  const [sampleRenderResult, setSampleRenderResult] = useState<{ imageDataUrl: string; stats: PxpipeTokenStats } | null>(null);
  const [isRenderingSample, setIsRenderingSample] = useState(false);

  // Keyboard shortcut listener to close on Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Check pxpipe proxy health when on pxpipe tab
  useEffect(() => {
    if (isOpen && activeTab === 'pxpipe') {
      pxpipeEngine.checkProxyHealth().then(setPxpipeProxyStatus);
    }
  }, [isOpen, activeTab]);

  const toggleShowKey = (field: string) => {
    setShowKeys(prev => ({ ...prev, [field]: !prev[field] }));
  };

  // Auto-verify an API key against provider endpoint
  const runAutoVerify = async (providerId: string, key: string, customBaseUrl?: string) => {
    const config = EXPANDED_PROVIDERS[providerId];
    const isLocal = config?.category === 'local';

    if (!isLocal && (!key || !key.trim())) {
      setVerifyStatuses(prev => ({ ...prev, [providerId]: { status: 'idle' } }));
      return;
    }

    setVerifyStatuses(prev => ({
      ...prev,
      [providerId]: { status: 'checking' }
    }));

    try {
      const res = await verifyProviderApiKey(providerId, key, customBaseUrl);
      setVerifyStatuses(prev => ({
        ...prev,
        [providerId]: {
          status: res.valid ? 'valid' : 'invalid',
          latencyMs: res.latencyMs,
          error: res.error,
          model: res.model,
          statusCode: res.statusCode,
          details: res.details
        }
      }));
    } catch (err: any) {
      setVerifyStatuses(prev => ({
        ...prev,
        [providerId]: {
          status: 'invalid',
          error: err?.message || 'Verification failed',
          statusCode: 500
        }
      }));
    }
  };

  // Debounced key verification ref
  const debounceTimers = useRef<Record<string, NodeJS.Timeout>>({});

  const handleKeyChange = (field: string, providerId: string, value: string) => {
    setSettings((s: AppSettings) => ({ ...s, [field]: value }));
    
    if (typeof window !== 'undefined') {
      localStorage.setItem(field, value);
    }

    // Set immediate visual checking state
    setVerifyStatuses(prev => ({
      ...prev,
      [providerId]: { status: value.trim() ? 'checking' : 'idle' }
    }));

    if (debounceTimers.current[providerId]) {
      clearTimeout(debounceTimers.current[providerId]);
    }

    debounceTimers.current[providerId] = setTimeout(() => {
      runAutoVerify(providerId, value);
    }, 450);
  };

  // MCP Server Verification Runner (Green/Red)
  const runVerifyMcp = async (url: string) => {
    if (!url.trim()) return;
    setMcpStatuses(prev => ({
      ...prev,
      [url]: {
        valid: false,
        status: 'checking',
        latencyMs: 0,
        url,
        toolCount: 0,
        tools: []
      }
    }));

    try {
      const res = await verifyMcpServer(url);
      setMcpStatuses(prev => ({
        ...prev,
        [url]: res
      }));
      if (res.valid && res.tools && res.tools.length > 0) {
        setActiveMcpTools(prev => ({
          ...prev,
          [url]: (res.tools || []).map(t => t.name)
        }));
      }
    } catch (err: any) {
      setMcpStatuses(prev => ({
        ...prev,
        [url]: {
          valid: false,
          status: 'invalid',
          latencyMs: 0,
          url,
          error: err?.message || 'Connection refused',
          toolCount: 0,
          tools: []
        }
      }));
    }
  };

  // Auto-verify all active API keys and MCP endpoints upon opening the drawer or tab switch
  useEffect(() => {
    if (!isOpen) return;

    if (activeTab === 'providers') {
      const providers = providerRegistry.getAllProviders();
      providers.forEach(p => {
        const keyField = p.apiKeyField as keyof AppSettings;
        const val = keyField ? ((settings as any)[keyField] as string) || '' : '';
        const isLocal = EXPANDED_PROVIDERS[p.id]?.category === 'local';
        if (val || isLocal) {
          runAutoVerify(p.id, val);
        }
      });
    }

    if (activeTab === 'mcp' || activeTab === 'tools') {
      mcpServerUrls.forEach(url => {
        runVerifyMcp(url);
      });
    }
  }, [isOpen, activeTab]);

  const handleAddMcpServer = () => {
    const trimmed = newMcpUrl.trim();
    if (!trimmed || mcpServerUrls.includes(trimmed)) return;
    const nextUrls = [...mcpServerUrls, trimmed];
    setMcpServerUrls(nextUrls);
    setSettings((s: AppSettings) => ({ ...s, mcpServerUrls: nextUrls, mcpEnabled: true }));
    setNewMcpUrl('');
    runVerifyMcp(trimmed);
  };

  const handleRemoveMcpServer = (urlToRemove: string) => {
    const nextUrls = mcpServerUrls.filter(u => u !== urlToRemove);
    setMcpServerUrls(nextUrls);
    setSettings((s: AppSettings) => ({ ...s, mcpServerUrls: nextUrls }));
    setMcpStatuses(prev => {
      const copy = { ...prev };
      delete copy[urlToRemove];
      return copy;
    });
  };

  // Tool toggle handler
  const handleToggleTool = (toolName: string) => {
    const currentTools: string[] = settings.enabledTools || [];
    const exists = currentTools.includes(toolName);
    const nextTools = exists 
      ? currentTools.filter(t => t !== toolName)
      : [...currentTools, toolName];
    setSettings((s: AppSettings) => ({ ...s, enabledTools: nextTools }));
  };

  const handleToggleAllCategoryTools = (categoryTools: string[], enable: boolean) => {
    const current = new Set<string>(settings.enabledTools || []);
    categoryTools.forEach(t => {
      if (enable) current.add(t);
      else current.delete(t);
    });
    setSettings((s: AppSettings) => ({ ...s, enabledTools: Array.from(current) }));
  };

  const handleTestPxpipeSample = async () => {
    if (!sampleText.trim() || isRenderingSample) return;
    setIsRenderingSample(true);
    try {
      const res = await pxpipeEngine.renderTextToDenseImage(sampleText, 'SAMPLE_ARBITRAGE_TEST');
      setSampleRenderResult({
        imageDataUrl: res.imageDataUrl,
        stats: res.stats
      });
    } catch (err) {
      console.error('Failed to render sample:', err);
    } finally {
      setIsRenderingSample(false);
    }
  };

  // Tools Arsenal computed list (Called unconditionally)
  const allToolList = useMemo(() => {
    return Object.entries(ATTACHED_TOOLS || {}).map(([key, t]) => ({
      name: t?.function?.name || key,
      description: t?.function?.description || 'System intelligence utility',
      parameters: Object.keys(t?.function?.parameters?.properties || {})
    }));
  }, []);

  const filteredToolList = useMemo(() => {
    return allToolList.filter(t => {
      const matchesQuery = t.name.toLowerCase().includes(toolSearchQuery.toLowerCase()) ||
        t.description.toLowerCase().includes(toolSearchQuery.toLowerCase());
      if (!matchesQuery) return false;

      if (activeToolCategory === 'all') return true;

      const categoryObj = TOOL_CATEGORIES.find(c => c.id === activeToolCategory);
      return categoryObj ? categoryObj.tools.includes(t.name) : true;
    });
  }, [allToolList, toolSearchQuery, activeToolCategory]);

  if (!isOpen) return null;

  const registeredProviders = providerRegistry.getAllProviders();
  const filteredProviders = registeredProviders.filter(p => {
    const matchesSearch = 
      p.name.toLowerCase().includes(providerSearch.toLowerCase()) ||
      p.description.toLowerCase().includes(providerSearch.toLowerCase()) ||
      p.id.toLowerCase().includes(providerSearch.toLowerCase());

    if (!matchesSearch) return false;

    const conf = EXPANDED_PROVIDERS[p.id];
    const category = conf?.category || 'cloud';

    if (providerCategory === 'cloud') return category === 'cloud';
    if (providerCategory === 'router') return category === 'router';
    if (providerCategory === 'local') return category === 'local';
    if (providerCategory === 'configured') {
      const keyField = p.apiKeyField as keyof AppSettings;
      const hasKey = keyField && !!((settings as any)[keyField] as string)?.trim();
      return hasKey || category === 'local' || settings.aiProvider === p.id;
    }
    return true;
  });

  const enabledToolsSet = new Set(settings.enabledTools || []);
  const activeToolsCount = enabledToolsSet.size;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden font-sans">
      {/* Dimmed Backdrop */}
      <div
        onClick={onClose}
        className="absolute inset-0 bg-black/75 backdrop-blur-sm transition-opacity duration-300 ease-out cursor-pointer"
      />

      <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
        <aside className="w-screen max-w-2xl bg-[#0d1322] border-l border-slate-800 shadow-2xl flex flex-col transform transition-transform duration-300 ease-out">
          
          {/* Drawer Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800/80 bg-[#0d1322] shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
                <Settings className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-sm font-semibold text-slate-100 font-mono tracking-wide">
                  WormGPT System Console & Control Center
                </h2>
                <p className="text-[11px] text-slate-400 font-mono">
                  Active Model: <span className="text-indigo-300 font-semibold">{settings.aiProvider}</span> • Model Context & Tools
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-colors"
              title="Close Settings (Escape)"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Tab Navigation */}
          <div className="flex border-b border-slate-800/80 bg-[#0d1322] px-6 gap-1 overflow-x-auto no-scrollbar shrink-0 text-xs font-mono font-medium">
            <button
              onClick={() => setActiveTab('general')}
              className={`py-3 px-3 border-b-2 flex items-center gap-1.5 transition-all whitespace-nowrap ${
                activeTab === 'general'
                  ? 'border-indigo-500 text-indigo-400 font-bold'
                  : 'border-transparent text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <Sliders className="w-3.5 h-3.5" />
              General
            </button>

            <button
              onClick={() => setActiveTab('providers')}
              className={`py-3 px-3 border-b-2 flex items-center gap-1.5 transition-all whitespace-nowrap ${
                activeTab === 'providers'
                  ? 'border-indigo-500 text-indigo-400 font-bold'
                  : 'border-transparent text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <Key className="w-3.5 h-3.5" />
              Providers & API Keys ({registeredProviders.length})
            </button>

            <button
              onClick={() => setActiveTab('mcp')}
              className={`py-3 px-3 border-b-2 flex items-center gap-1.5 transition-all whitespace-nowrap ${
                activeTab === 'mcp'
                  ? 'border-emerald-500 text-emerald-400 font-bold'
                  : 'border-transparent text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <Server className="w-3.5 h-3.5 text-emerald-400" />
              Connected MCP
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            </button>

            <button
              onClick={() => setActiveTab('tools')}
              className={`py-3 px-3 border-b-2 flex items-center gap-1.5 transition-all whitespace-nowrap ${
                activeTab === 'tools'
                  ? 'border-indigo-500 text-indigo-400 font-bold'
                  : 'border-transparent text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <Wrench className="w-3.5 h-3.5" />
              Tools Arsenal ({activeToolsCount})
            </button>

            <button
              onClick={() => setActiveTab('pxpipe')}
              className={`py-3 px-3 border-b-2 flex items-center gap-1.5 transition-all whitespace-nowrap ${
                activeTab === 'pxpipe'
                  ? 'border-emerald-500 text-emerald-400 font-bold'
                  : 'border-transparent text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <Zap className="w-3.5 h-3.5 text-emerald-400" />
              pxpipe Arbitrage
            </button>

            <button
              onClick={() => setActiveTab('harness')}
              className={`py-3 px-3 border-b-2 flex items-center gap-1.5 transition-all whitespace-nowrap ${
                activeTab === 'harness'
                  ? 'border-indigo-500 text-indigo-400 font-bold'
                  : 'border-transparent text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <Cpu className="w-3.5 h-3.5" />
              Harness
              {settings.systemOverride && (
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse"></span>
              )}
            </button>
          </div>

          {/* Tab Body */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar text-slate-200 bg-[#0d1322]">
            
            {/* 1. GENERAL TAB */}
            {activeTab === 'general' && (
              <div className="space-y-6">
                {/* Active Session & Model Banner */}
                <div className="p-4 rounded-xl bg-[#0f172a] border border-indigo-950/80 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono font-bold text-zinc-200">Current Execution Provider</span>
                    <span className="text-xs font-mono px-2 py-0.5 rounded bg-indigo-950 border border-indigo-700/60 text-indigo-300 font-semibold">
                      {settings.aiProvider.toUpperCase()}
                    </span>
                  </div>
                  <p className="text-xs text-zinc-400 leading-relaxed">
                    Routing active reasoning and code generation requests through {settings.aiProvider}. To switch providers, navigate to the Providers &amp; API Keys tab.
                  </p>
                </div>

                {/* Appearance */}
                <div className="p-4 rounded-xl bg-[#0d1424] border border-indigo-950/70 space-y-3">
                  <h3 className="text-xs font-mono font-semibold text-zinc-200 flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-indigo-400" />
                    Appearance &amp; Typography
                  </h3>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-[11px] font-mono text-zinc-400 block mb-1">Theme Palette</label>
                      <select
                        value={settings.themePreference || 'charcoal'}
                        onChange={e => setSettings((s: AppSettings) => ({ ...s, themePreference: e.target.value as any }))}
                        className="w-full p-2 bg-[#080d1a] border border-indigo-950/70 rounded-lg text-xs text-zinc-200 focus:border-indigo-500 focus:outline-none font-mono"
                      >
                        <option value="charcoal">Deep Charcoal with Indigo Accent</option>
                        <option value="slate">Dark Slate &amp; Violet</option>
                        <option value="night">Midnight Pitch Black</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-[11px] font-mono text-zinc-400 block mb-1">Typography Scale</label>
                      <select
                        value={settings.fontSize || 'base'}
                        onChange={e => setSettings((s: AppSettings) => ({ ...s, fontSize: e.target.value as any }))}
                        className="w-full p-2 bg-[#080d1a] border border-indigo-950/70 rounded-lg text-xs text-zinc-200 focus:border-indigo-500 focus:outline-none font-mono"
                      >
                        <option value="sm">Compact (14px)</option>
                        <option value="base">Standard (16px)</option>
                        <option value="lg">Relaxed (18px)</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Data & Logs */}
                <div className="p-4 rounded-xl bg-[#0d1424] border border-indigo-950/70 space-y-3">
                  <h3 className="text-xs font-mono font-semibold text-zinc-200 flex items-center gap-2">
                    <Download className="w-4 h-4 text-indigo-400" />
                    Conversation Logs &amp; Persistence
                  </h3>
                  <p className="text-xs text-zinc-400 leading-relaxed">
                    Export session histories, reasoning traces, and metadata to JSON, or import previous conversation files.
                  </p>

                  <div className="flex flex-wrap gap-3">
                    <button
                      onClick={onOpenExport}
                      className="px-3.5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-mono font-semibold flex items-center gap-2 shadow-md transition-all"
                    >
                      <Download className="w-3.5 h-3.5" />
                      Export / Import Session Logs
                    </button>
                  </div>
                </div>

                {/* Session & Buffer Management */}
                <div className="p-4 rounded-xl bg-rose-950/20 border border-rose-900/40 space-y-3">
                  <h3 className="text-xs font-mono font-semibold text-rose-400 flex items-center gap-2">
                    <Trash2 className="w-4 h-4" />
                    Session &amp; Buffer Management
                  </h3>
                  <p className="text-xs text-zinc-400">
                    Purge active memory buffer, dispose stale stream listeners, or clear thread contents safely.
                  </p>

                  <div className="flex flex-wrap gap-2.5">
                    {activeSession && (
                      <button
                        onClick={() => clearSessionBuffer(activeSession.id)}
                        className="px-3 py-1.5 rounded-lg bg-rose-950/50 hover:bg-rose-900/60 text-rose-300 text-xs font-mono border border-rose-800/50 transition-colors flex items-center gap-1.5"
                      >
                        <Trash2 className="w-3 h-3 text-rose-400" />
                        Purge Session Buffer &amp; Active Stream
                      </button>
                    )}

                    {onConfirmClear && (
                      <button
                        onClick={onConfirmClear}
                        className="px-3 py-1.5 rounded-lg bg-[#080d1a] hover:bg-[#141d33] text-zinc-300 text-xs font-mono border border-indigo-950/70 transition-colors"
                      >
                        Clear Chat Messages
                      </button>
                    )}

                    {onConfirmReset && (
                      <button
                        onClick={onConfirmReset}
                        className="px-3 py-1.5 rounded-lg bg-rose-900/70 hover:bg-rose-800 text-white text-xs font-mono transition-colors"
                      >
                        Factory Reset System
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* 2. PROVIDERS & AUTO-VERIFY API KEYS (GREEN/RED STATUS INDICATORS) */}
            {activeTab === 'providers' && (
              <div className="space-y-4">
                {/* Search & Category Filter Header */}
                <div className="space-y-2.5">
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-3 top-3 pointer-events-none" />
                    <input
                      type="text"
                      value={providerSearch}
                      onChange={e => setProviderSearch(e.target.value)}
                      placeholder="Search providers (OpenRouter, Ollama, Perplexity, Together, xAI, Cerebras...)"
                      className="w-full pl-9 pr-3 py-2 bg-[#070b14] border border-indigo-950/70 rounded-lg text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-indigo-500 font-mono"
                    />
                  </div>

                  {/* Category Pills */}
                  <div className="flex flex-wrap gap-1.5 text-xs font-mono">
                    {[
                      { id: 'all', label: `All (${registeredProviders.length})` },
                      { id: 'cloud', label: 'Cloud Frontier' },
                      { id: 'router', label: 'Aggregators & Routers' },
                      { id: 'local', label: 'Local Runtimes (Localhost)' },
                      { id: 'configured', label: 'Configured / Armed' },
                    ].map(cat => (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => setProviderCategory(cat.id as any)}
                        className={`px-2.5 py-1 rounded-md text-[11px] transition-colors border ${
                          providerCategory === cat.id
                            ? 'bg-indigo-600 text-white border-indigo-500 font-semibold'
                            : 'bg-[#080d1a] text-zinc-400 border-indigo-950/70 hover:text-zinc-200'
                        }`}
                      >
                        {cat.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Real-time Verification Engine Banner */}
                <div className="p-3 rounded-lg bg-indigo-950/30 border border-indigo-800/40 text-xs text-zinc-300 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <Zap className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>
                      <strong>Instant Endpoint Verification:</strong> Inputs ping provider <code className="text-indigo-300 font-mono">/models</code> endpoints on key entry.
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-[11px] font-mono shrink-0">
                    <span className="flex items-center gap-1 text-emerald-400">
                      <span className="w-2 h-2 rounded-full bg-emerald-400"></span> Valid
                    </span>
                    <span className="flex items-center gap-1 text-rose-400">
                      <span className="w-2 h-2 rounded-full bg-rose-400"></span> Invalid
                    </span>
                  </div>
                </div>

                {/* Provider Cards with Dynamic Green/Red Input Styling */}
                <div className="space-y-3">
                  {filteredProviders.map(provider => {
                    const keyField = String(provider.apiKeyField || '');
                    const currentValue = keyField ? (((settings as any)[keyField] as string) || '') : '';
                    const isVisible = !!showKeys[keyField];
                    const verifyStatus = verifyStatuses[provider.id];
                    const isActive = settings.aiProvider === provider.id;
                    const conf = EXPANDED_PROVIDERS[provider.id];
                    const isLocal = conf?.category === 'local';

                    // Determine input field border and background color state
                    let inputColorClasses = 'border-indigo-950/70 bg-[#080d1a] text-zinc-200 focus:border-indigo-500';
                    if (verifyStatus?.status === 'valid') {
                      inputColorClasses = 'border-emerald-500/80 bg-emerald-950/20 text-emerald-200 focus:border-emerald-400 shadow-sm shadow-emerald-950/30';
                    } else if (verifyStatus?.status === 'invalid') {
                      inputColorClasses = 'border-rose-500/80 bg-rose-950/20 text-rose-200 focus:border-rose-400 shadow-sm shadow-rose-950/30';
                    } else if (verifyStatus?.status === 'checking') {
                      inputColorClasses = 'border-amber-500/70 bg-amber-950/20 text-amber-200 focus:border-amber-400';
                    }

                    return (
                      <div
                        key={provider.id}
                        className={`p-4 rounded-xl border transition-all ${
                          isActive 
                            ? 'bg-[#0f172a] border-indigo-500/80 shadow-md shadow-indigo-950/40' 
                            : 'bg-[#0d1424] border-indigo-950/70 hover:border-indigo-800/60'
                        }`}
                      >
                        {/* Provider Header */}
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h4 className="text-xs font-mono font-bold text-zinc-100">{provider.name}</h4>
                              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#080d1a] border border-indigo-950 text-indigo-400">
                                {provider.id}
                              </span>
                              {isLocal && (
                                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-blue-950/60 border border-blue-700/50 text-blue-300">
                                  LOCAL RUNTIME
                                </span>
                              )}
                              {!provider.requiresApiKey && !isLocal && (
                                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-950/60 border border-emerald-700/50 text-emerald-400">
                                  FREE / OPEN
                                </span>
                              )}
                              {isActive && (
                                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-indigo-600 text-white font-bold flex items-center gap-1">
                                  <Check className="w-3 h-3" /> ACTIVE ROUTE
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-zinc-400 mt-1 leading-relaxed">{provider.description}</p>
                          </div>

                          {/* Quick Actions: Switch Active Provider */}
                          {!isActive && (
                            <button
                              type="button"
                              onClick={() => setSettings((s: AppSettings) => ({ ...s, aiProvider: provider.id }))}
                              className="px-2.5 py-1 rounded bg-[#080d1a] hover:bg-indigo-950/80 border border-indigo-950 hover:border-indigo-700 text-[11px] font-mono text-zinc-300 hover:text-white transition-colors shrink-0 flex items-center gap-1"
                            >
                              <Play className="w-2.5 h-2.5 text-indigo-400" />
                              Activate
                            </button>
                          )}
                        </div>

                        {/* Input Row with Green/Red Verification Feedback */}
                        {provider.apiKeyField && (
                          <div className="space-y-1.5 pt-3">
                            <div className="flex items-center justify-between text-[11px] font-mono">
                              <span className="text-zinc-400 flex items-center gap-2">
                                <span>API Key ({keyField})</span>
                                {verifyStatus?.status === 'valid' && (
                                  <span className="px-2 py-0.5 rounded text-[10px] bg-emerald-950/80 border border-emerald-500/60 text-emerald-300 font-semibold flex items-center gap-1">
                                    <CheckCircle2 className="w-3 h-3 text-emerald-400" /> Valid ({verifyStatus.latencyMs}ms)
                                  </span>
                                )}
                                {verifyStatus?.status === 'invalid' && (
                                  <span className="px-2 py-0.5 rounded text-[10px] bg-rose-950/80 border border-rose-500/60 text-rose-300 font-semibold flex items-center gap-1" title={verifyStatus.error}>
                                    <AlertCircle className="w-3 h-3 text-rose-400" /> Invalid ({verifyStatus.statusCode || 'Auth Error'})
                                  </span>
                                )}
                                {verifyStatus?.status === 'checking' && (
                                  <span className="px-2 py-0.5 rounded text-[10px] bg-amber-950/80 border border-amber-500/60 text-amber-300 flex items-center gap-1">
                                    <RefreshCw className="w-3 h-3 animate-spin text-amber-400" /> Pinging...
                                  </span>
                                )}
                              </span>

                              {provider.docsUrl && (
                                <a
                                  href={provider.docsUrl}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="text-indigo-400 hover:underline flex items-center gap-1 text-[10px]"
                                >
                                  Docs <ExternalLink className="w-2.5 h-2.5" />
                                </a>
                              )}
                            </div>

                            <div className="flex items-center gap-2">
                              <div className="relative flex-1">
                                <input
                                  type={isVisible ? 'text' : 'password'}
                                  value={currentValue}
                                  onChange={e => handleKeyChange(keyField, provider.id, e.target.value)}
                                  onBlur={() => runAutoVerify(provider.id, currentValue, isLocal ? conf?.baseUrl : undefined)}
                                  placeholder={
                                    isLocal
                                      ? `Optional key for ${provider.name} (e.g. ${conf?.baseUrl})`
                                      : `Enter ${provider.name} API key...`
                                  }
                                  className={`w-full pr-9 pl-3 py-2 rounded-lg text-xs font-mono focus:outline-none transition-all ${inputColorClasses}`}
                                />
                                <button
                                  type="button"
                                  onClick={() => toggleShowKey(keyField)}
                                  className="absolute right-2.5 top-2.5 text-zinc-500 hover:text-zinc-300"
                                >
                                  {isVisible ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                                </button>
                              </div>

                              <button
                                type="button"
                                onClick={() => runAutoVerify(provider.id, currentValue, isLocal ? conf?.baseUrl : undefined)}
                                className="px-3.5 py-2 rounded-lg bg-indigo-950/80 hover:bg-indigo-900 border border-indigo-800/60 text-xs font-mono text-indigo-200 transition-colors shrink-0 flex items-center gap-1.5"
                              >
                                {verifyStatus?.status === 'checking' ? (
                                  <RefreshCw className="w-3 h-3 animate-spin text-indigo-400" />
                                ) : (
                                  <Zap className="w-3 h-3 text-indigo-400" />
                                )}
                                Test Key
                              </button>
                            </div>

                            {/* Diagnostic Error Banner if invalid */}
                            {verifyStatus?.status === 'invalid' && verifyStatus.error && (
                              <div className="p-2 rounded bg-rose-950/30 border border-rose-800/40 text-[11px] font-mono text-rose-300 flex items-center gap-1.5">
                                <AlertCircle className="w-3.5 h-3.5 shrink-0 text-rose-400" />
                                <span className="truncate">{verifyStatus.error}</span>
                              </div>
                            )}
                          </div>
                        )}

                        {/* Local host daemon URL row for local runtimes */}
                        {isLocal && (
                          <div className="pt-2 flex items-center justify-between text-[11px] font-mono text-zinc-400">
                            <span>Default Endpoint: <code className="text-zinc-300">{conf?.baseUrl}</code></span>
                            <button
                              type="button"
                              onClick={() => runAutoVerify(provider.id, currentValue, conf?.baseUrl)}
                              className="text-indigo-400 hover:underline flex items-center gap-1"
                            >
                              Ping Local Daemon
                            </button>
                          </div>
                        )}

                        {/* Models catalog & Interactive Selection */}
                        <div className="pt-3 space-y-2 border-t border-indigo-950/40 mt-2.5">
                          <div className="flex items-center justify-between text-[11px] font-mono text-zinc-400">
                            <span className="flex items-center gap-1 font-semibold text-zinc-300">
                              <Cpu className="w-3 h-3 text-indigo-400" />
                              Select Model for {provider.name}:
                            </span>
                            {isActive && (
                              <span className="text-indigo-300 font-bold">
                                Active Model: <code className="text-emerald-400">{settings.model}</code>
                              </span>
                            )}
                          </div>

                          <div className="flex flex-wrap gap-1.5">
                            {(provider.models || []).map(m => {
                              const isModelActive = isActive && settings.model === m.id;
                              return (
                                <button
                                  key={m.id}
                                  type="button"
                                  onClick={() => {
                                    setSettings((s: AppSettings) => ({
                                      ...s,
                                      aiProvider: provider.id,
                                      model: m.id
                                    }));
                                  }}
                                  className={`text-[10px] font-mono px-2 py-1 rounded transition-all border flex items-center gap-1 ${
                                    isModelActive
                                      ? 'bg-indigo-600 text-white border-indigo-400 font-bold shadow-sm shadow-indigo-900/50'
                                      : 'bg-[#080d1a] border-indigo-950/80 text-zinc-300 hover:border-indigo-700 hover:text-white'
                                  }`}
                                  title={`Switch chat to ${m.label} (${m.id})`}
                                >
                                  {isModelActive && <Check className="w-2.5 h-2.5 text-white" />}
                                  {m.label}
                                </button>
                              );
                            })}
                          </div>

                          {/* Custom Model Input for this Provider */}
                          <div className="pt-1.5 flex items-center gap-2">
                            <input
                              type="text"
                              value={customModelInputs[provider.id] || ''}
                              onChange={e => setCustomModelInputs(prev => ({ ...prev, [provider.id]: e.target.value }))}
                              placeholder={`Enter custom model ID (e.g. ${provider.models?.[0]?.id || 'custom-model-id'})...`}
                              className="flex-1 px-2.5 py-1.5 bg-[#070b14] border border-indigo-950/70 rounded-md text-[11px] font-mono text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-indigo-500"
                              onKeyDown={e => {
                                if (e.key === 'Enter') {
                                  const customVal = (customModelInputs[provider.id] || '').trim();
                                  if (customVal) {
                                    setSettings((s: AppSettings) => ({
                                      ...s,
                                      aiProvider: provider.id,
                                      model: customVal
                                    }));
                                  }
                                }
                              }}
                            />
                            <button
                              type="button"
                              onClick={() => {
                                const customVal = (customModelInputs[provider.id] || '').trim();
                                if (customVal) {
                                  setSettings((s: AppSettings) => ({
                                    ...s,
                                    aiProvider: provider.id,
                                    model: customVal
                                  }));
                                }
                              }}
                              disabled={!(customModelInputs[provider.id] || '').trim()}
                              className="px-2.5 py-1.5 rounded-md bg-indigo-600/80 hover:bg-indigo-600 disabled:bg-indigo-950/40 disabled:text-zinc-600 text-white text-[11px] font-mono transition-colors shrink-0 flex items-center gap-1"
                            >
                              <Check className="w-3 h-3" />
                              Apply Custom
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* 3. CONNECTED MCP SERVERS & 100 REMOTE HTTPS DIRECTORY */}
            {activeTab === 'mcp' && (
              <div className="space-y-4">
                {/* Header Banner */}
                <div className="p-4 rounded-xl bg-gradient-to-br from-[#0d1424] via-[#09101f] to-emerald-950/30 border border-emerald-600/30 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Server className="w-4 h-4 text-emerald-400" />
                      <h3 className="text-xs font-mono font-bold text-emerald-300">
                        Model Context Protocol (MCP) Remote Gateway
                      </h3>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-950/80 border border-emerald-500/60 text-emerald-300 font-semibold">
                        HTTPS STREAMABLE & SSE
                      </span>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-indigo-950/80 border border-indigo-500/60 text-indigo-300 font-semibold">
                        100 REMOTE SERVERS
                      </span>
                    </div>
                  </div>
                  <p className="text-xs text-zinc-300 leading-relaxed">
                    Connect remote HTTPS Model Context Protocol endpoints directly over Streamable HTTP and SSE without running local Node/Python processes. Expose real-time developer docs, search crawlers, databases, OSINT, and cloud tools directly to model reasoning.
                  </p>

                  {/* Sub-view switcher tabs */}
                  <div className="flex items-center gap-1.5 pt-1">
                    <button
                      type="button"
                      onClick={() => setMcpViewMode('directory')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-mono font-semibold flex items-center gap-1.5 transition-all ${
                        mcpViewMode === 'directory'
                          ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-950/50'
                          : 'bg-[#080d1a] text-zinc-400 hover:text-zinc-200 border border-indigo-950/70'
                      }`}
                    >
                      <Compass className="w-3.5 h-3.5" />
                      Directory Explorer ({REMOTE_MCP_DIRECTORY.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setMcpViewMode('active')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-mono font-semibold flex items-center gap-1.5 transition-all ${
                        mcpViewMode === 'active'
                          ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-950/50'
                          : 'bg-[#080d1a] text-zinc-400 hover:text-zinc-200 border border-indigo-950/70'
                      }`}
                    >
                      <Server className="w-3.5 h-3.5" />
                      Active Servers ({mcpServerUrls.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setMcpViewMode('export')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-mono font-semibold flex items-center gap-1.5 transition-all ${
                        mcpViewMode === 'export'
                          ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-950/50'
                          : 'bg-[#080d1a] text-zinc-400 hover:text-zinc-200 border border-indigo-950/70'
                      }`}
                    >
                      <FileJson className="w-3.5 h-3.5" />
                      Export Config (JSON / CLI)
                    </button>
                  </div>
                </div>

                {/* ─── VIEW 1: DIRECTORY EXPLORER (100 REMOTE MCPs) ─── */}
                {mcpViewMode === 'directory' && (
                  <div className="space-y-3.5 font-mono">
                    {/* Search and Quick Bundle Connect Bar */}
                    <div className="p-3 rounded-xl bg-[#0d1424] border border-indigo-950/70 space-y-3">
                      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                        <div className="relative flex-1">
                          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
                          <input
                            type="text"
                            value={mcpSearch}
                            onChange={e => setMcpSearch(e.target.value)}
                            placeholder="Search 100 MCPs (e.g. DeepWiki, Parallel Search, Context7, Supabase, Firecrawl)..."
                            className="w-full pl-8 pr-3 py-2 bg-[#080d1a] border border-indigo-950/70 rounded-lg text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-indigo-500"
                          />
                        </div>
                        <button
                          type="button"
                          onClick={handleQuickConnectZeroAuthBundle}
                          className="px-3.5 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all shrink-0 shadow-md"
                          title="Connect top instant zero-auth endpoints with 1 click"
                        >
                          <Zap className="w-3.5 h-3.5 text-amber-300" />
                          <span>⚡ Quick-Connect Zero-Auth Bundle ({zeroAuthServers.length})</span>
                        </button>
                      </div>

                      {/* Category Filter Pills */}
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        <button
                          type="button"
                          onClick={() => setMcpCategory('all')}
                          className={`px-2.5 py-1 rounded-md text-[11px] font-semibold border transition-colors ${
                            mcpCategory === 'all'
                              ? 'bg-indigo-600 text-white border-indigo-500'
                              : 'bg-[#080d1a] text-zinc-400 border-indigo-950/80 hover:text-zinc-200'
                          }`}
                        >
                          All ({REMOTE_MCP_DIRECTORY.length})
                        </button>
                        <button
                          type="button"
                          onClick={() => setMcpCategory('zero_auth')}
                          className={`px-2.5 py-1 rounded-md text-[11px] font-semibold border transition-colors flex items-center gap-1 ${
                            mcpCategory === 'zero_auth'
                              ? 'bg-emerald-600 text-white border-emerald-500'
                              : 'bg-[#080d1a] text-emerald-400 border-emerald-950 hover:bg-emerald-950/30'
                          }`}
                        >
                          <Sparkles className="w-3 h-3" />
                          Zero-Auth / Instant ({zeroAuthServers.length})
                        </button>
                        {MCP_CATEGORIES.map(cat => {
                          if (cat.id === 'all' || cat.id === 'zero_auth') return null;
                          const count = REMOTE_MCP_DIRECTORY.filter(s => s.category === cat.id).length;
                          return (
                            <button
                              key={cat.id}
                              type="button"
                              onClick={() => setMcpCategory(cat.id)}
                              className={`px-2.5 py-1 rounded-md text-[11px] font-semibold border transition-colors ${
                                mcpCategory === cat.id
                                  ? 'bg-indigo-600 text-white border-indigo-500'
                                  : 'bg-[#080d1a] text-zinc-400 border-indigo-950/80 hover:text-zinc-200'
                              }`}
                            >
                              {cat.label} ({count})
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Results Count Banner */}
                    <div className="flex items-center justify-between px-1 text-[11px] text-zinc-400">
                      <span>Showing {filteredMcpDirectory.length} remote MCP endpoints</span>
                      {mcpSearch && (
                        <button
                          type="button"
                          onClick={() => setMcpSearch('')}
                          className="text-indigo-400 hover:text-indigo-300 underline"
                        >
                          Clear search
                        </button>
                      )}
                    </div>

                    {/* Cards Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[550px] overflow-y-auto pr-1 custom-scrollbar">
                      {filteredMcpDirectory.map(server => {
                        const isAdded = mcpServerUrls.includes(server.url);
                        const isZeroAuth = server.authType === 'public' || server.isZeroAuth;
                        const status = mcpStatuses[server.url];
                        const isConnected = status?.valid;

                        return (
                          <div
                            key={server.id}
                            className={`p-3.5 rounded-xl border space-y-2.5 transition-all flex flex-col justify-between ${
                              isAdded
                                ? 'bg-gradient-to-br from-[#0c1527] to-emerald-950/20 border-emerald-500/50 shadow-sm'
                                : 'bg-[#0d1424] border-indigo-950/70 hover:border-indigo-800/80'
                            }`}
                          >
                            {/* Card Top: Title, Badges */}
                            <div className="space-y-1.5">
                              <div className="flex items-start justify-between gap-2">
                                <div className="flex items-center gap-1.5 min-w-0">
                                  <Server className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                                  <h4 className="text-xs font-bold text-zinc-100 truncate" title={server.name}>
                                    {server.name}
                                  </h4>
                                </div>
                                <div className="flex items-center gap-1 shrink-0">
                                  {isZeroAuth ? (
                                    <span className="px-1.5 py-0.5 rounded text-[9px] bg-emerald-950/80 border border-emerald-500/60 text-emerald-300 font-semibold">
                                      Zero-Auth
                                    </span>
                                  ) : (
                                    <span className="px-1.5 py-0.5 rounded text-[9px] bg-amber-950/80 border border-amber-500/60 text-amber-300 font-semibold">
                                      {server.authType === 'oauth' ? 'OAuth' : 'API Key'}
                                    </span>
                                  )}
                                  <span className="px-1.5 py-0.5 rounded text-[9px] bg-indigo-950/70 border border-indigo-800/50 text-indigo-300 uppercase">
                                    {server.transport}
                                  </span>
                                </div>
                              </div>

                              <p className="text-[11px] text-zinc-300 leading-normal line-clamp-2">
                                {server.description}
                              </p>
                            </div>

                            {/* Endpoint URL row with quick copy */}
                            <div className="space-y-2 pt-1 border-t border-indigo-950/60">
                              <div className="flex items-center justify-between gap-1.5 bg-[#080d1a] px-2 py-1 rounded-md border border-indigo-950/70">
                                <span className="text-[10px] text-zinc-400 truncate flex-1 font-mono">
                                  {server.url}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => handleCopyText(server.url, `url-${server.id}`)}
                                  className="text-zinc-400 hover:text-indigo-300 p-0.5 rounded transition-colors shrink-0"
                                  title="Copy Endpoint URL"
                                >
                                  {copiedId === `url-${server.id}` ? (
                                    <Check className="w-3 h-3 text-emerald-400" />
                                  ) : (
                                    <Copy className="w-3 h-3" />
                                  )}
                                </button>
                              </div>

                              {/* Highlighted Tool capabilities preview */}
                              {server.tools && server.tools.length > 0 && (
                                <div className="flex flex-wrap gap-1">
                                  {server.tools.slice(0, 3).map(tool => (
                                    <span
                                      key={tool}
                                      className="px-1.5 py-0.5 rounded bg-indigo-950/40 text-[9px] text-indigo-300 border border-indigo-900/40 truncate max-w-[150px]"
                                    >
                                      {tool}
                                    </span>
                                  ))}
                                  {server.tools.length > 3 && (
                                    <span className="px-1 py-0.5 rounded bg-indigo-950/20 text-[9px] text-zinc-500">
                                      +{server.tools.length - 3} more
                                    </span>
                                  )}
                                </div>
                              )}

                              {/* Action Buttons Row */}
                              <div className="flex items-center justify-between gap-1.5 pt-1">
                                <div className="flex items-center gap-1">
                                  <button
                                    type="button"
                                    onClick={() => handleCopyText(JSON.stringify({ [server.id]: { type: server.transport === 'sse' ? 'sse' : 'http', url: server.url } }, null, 2), `json-${server.id}`)}
                                    className="px-2 py-1 rounded bg-[#080d1a] hover:bg-indigo-950/60 border border-indigo-950 text-[10px] text-zinc-400 hover:text-indigo-300 flex items-center gap-1 transition-colors"
                                    title="Copy JSON block for client config"
                                  >
                                    {copiedId === `json-${server.id}` ? (
                                      <Check className="w-2.5 h-2.5 text-emerald-400" />
                                    ) : (
                                      <Code className="w-2.5 h-2.5" />
                                    )}
                                    JSON
                                  </button>
                                  {server.docsUrl && (
                                    <a
                                      href={server.docsUrl}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="p-1 rounded bg-[#080d1a] hover:bg-indigo-950/60 border border-indigo-950 text-zinc-400 hover:text-indigo-300 transition-colors"
                                      title="Open Documentation"
                                    >
                                      <ExternalLink className="w-2.5 h-2.5" />
                                    </a>
                                  )}
                                </div>

                                {/* Connect Button */}
                                {isAdded ? (
                                  <div className="flex items-center gap-1">
                                    <span className="px-2 py-1 rounded text-[10px] bg-emerald-950/80 border border-emerald-500/60 text-emerald-300 font-semibold flex items-center gap-1">
                                      <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                                      {isConnected ? 'Active' : 'Added'}
                                    </span>
                                    <button
                                      type="button"
                                      onClick={() => handleRemoveMcpServer(server.url)}
                                      className="p-1 rounded text-rose-400 hover:bg-rose-950/40 border border-rose-900/40"
                                      title="Remove from active servers"
                                    >
                                      <Trash2 className="w-2.5 h-2.5" />
                                    </button>
                                  </div>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => handleQuickAddMcpServer(server.url)}
                                    className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] font-semibold flex items-center gap-1 transition-colors shadow-sm"
                                  >
                                    <Plus className="w-3 h-3" />
                                    Add Endpoint
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* ─── VIEW 2: ACTIVE SERVERS MANAGEMENT ─── */}
                {mcpViewMode === 'active' && (
                  <div className="space-y-4">
                    {/* Add Custom MCP Server Form */}
                    <div className="p-3.5 rounded-xl bg-[#0d1424] border border-indigo-950/70 space-y-2 font-mono">
                      <span className="text-xs font-semibold text-zinc-200">Register Custom MCP Server Endpoint</span>
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={newMcpUrl}
                          onChange={e => setNewMcpUrl(e.target.value)}
                          placeholder="https://search.parallel.ai/mcp or http://localhost:3000/mcp"
                          className="flex-1 px-3 py-2 bg-[#080d1a] border border-indigo-950/70 rounded-lg text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-indigo-500"
                        />
                        <button
                          type="button"
                          onClick={handleAddMcpServer}
                          className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors shrink-0"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          Add Server
                        </button>
                      </div>
                    </div>

                    {/* Active MCP Servers List */}
                    <div className="space-y-3">
                      {mcpServerUrls.map(url => {
                        const status = mcpStatuses[url];
                        const isConnected = status?.valid;
                        const isChecking = status?.status === 'checking';
                        const isError = status && !status.valid && status.status !== 'checking' && status.status !== 'idle';

                        let inputColorClasses = 'border-indigo-950/70 bg-[#080d1a] text-zinc-200';
                        if (isConnected) {
                          inputColorClasses = 'border-emerald-500/80 bg-emerald-950/20 text-emerald-200';
                        } else if (isError) {
                          inputColorClasses = 'border-rose-500/80 bg-rose-950/20 text-rose-200';
                        } else if (isChecking) {
                          inputColorClasses = 'border-amber-500/70 bg-amber-950/20 text-amber-200';
                        }

                        return (
                          <div
                            key={url}
                            className="p-4 rounded-xl bg-[#0d1424] border border-indigo-950/70 space-y-3 font-mono"
                          >
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex items-center gap-2 min-w-0">
                                <Server className="w-4 h-4 text-zinc-400 shrink-0" />
                                <span className="text-xs font-bold text-zinc-200 truncate">{url}</span>
                              </div>

                              {/* Green / Red Badge */}
                              {isConnected && (
                                <span className="px-2 py-0.5 rounded text-[10px] bg-emerald-950/80 border border-emerald-500/60 text-emerald-300 font-semibold flex items-center gap-1 shrink-0">
                                  <CheckCircle2 className="w-3 h-3 text-emerald-400" /> Connected ({status.latencyMs}ms) • {status.toolCount} tools
                                </span>
                              )}
                              {isError && (
                                <span className="px-2 py-0.5 rounded text-[10px] bg-rose-950/80 border border-rose-500/60 text-rose-300 font-semibold flex items-center gap-1 shrink-0" title={status?.error}>
                                  <AlertCircle className="w-3 h-3 text-rose-400" /> Disconnected
                                </span>
                              )}
                              {isChecking && (
                                <span className="px-2 py-0.5 rounded text-[10px] bg-amber-950/80 border border-amber-500/60 text-amber-300 flex items-center gap-1 shrink-0">
                                  <RefreshCw className="w-3 h-3 animate-spin text-amber-400" /> Pinging...
                                </span>
                              )}
                            </div>

                            {/* Status detail & action row */}
                            <div className="flex items-center justify-between gap-2">
                              <input
                                type="text"
                                readOnly
                                value={url}
                                className={`flex-1 px-3 py-1.5 rounded-lg text-xs font-mono border ${inputColorClasses}`}
                              />

                              <div className="flex items-center gap-1.5 shrink-0">
                                <button
                                  type="button"
                                  onClick={() => runVerifyMcp(url)}
                                  className="px-3 py-1.5 rounded-lg bg-indigo-950/80 hover:bg-indigo-900 border border-indigo-800/60 text-xs font-mono text-indigo-300 transition-colors flex items-center gap-1"
                                >
                                  <RefreshCw className={`w-3 h-3 ${isChecking ? 'animate-spin' : ''}`} />
                                  Test MCP
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleRemoveMcpServer(url)}
                                  className="p-1.5 rounded-lg bg-rose-950/40 hover:bg-rose-900/60 text-rose-400 border border-rose-800/40 transition-colors"
                                  title="Remove MCP server"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>

                            {/* Diagnostic info if offline */}
                            {isError && status?.error && (
                              <div className="p-2 rounded bg-rose-950/20 border border-rose-800/40 text-[11px] text-rose-300 flex items-center gap-1.5">
                                <AlertCircle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                                <span className="truncate">{status.error}</span>
                              </div>
                            )}

                            {/* Discovered MCP Tools checklist */}
                            {isConnected && status?.tools && status.tools.length > 0 && (
                              <div className="pt-2 border-t border-indigo-950/60 space-y-1.5">
                                <span className="text-[11px] text-zinc-400 block font-semibold">
                                  Available Tools Discovered ({status.tools.length}):
                                </span>
                                <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto custom-scrollbar">
                                  {(status.tools || []).map(tool => {
                                    const isEnabled = enabledToolsSet.has(tool.name);
                                    return (
                                      <button
                                        key={tool.name}
                                        type="button"
                                        onClick={() => handleToggleTool(tool.name)}
                                        className={`px-2 py-1 rounded text-[10px] font-mono border flex items-center gap-1.5 transition-colors ${
                                          isEnabled
                                            ? 'bg-emerald-950/60 border-emerald-500/60 text-emerald-300'
                                            : 'bg-[#080d1a] border-indigo-950 text-zinc-500 hover:text-zinc-300'
                                        }`}
                                      >
                                        {isEnabled ? (
                                          <CheckSquare className="w-3 h-3 text-emerald-400" />
                                        ) : (
                                          <Square className="w-3 h-3 text-zinc-500" />
                                        )}
                                        {tool.name}
                                      </button>
                                    );
                                  })}
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* ─── VIEW 3: EXPORT CONFIG & CLAUDE CLI ─── */}
                {mcpViewMode === 'export' && (
                  <div className="space-y-4 font-mono">
                    <div className="p-4 rounded-xl bg-[#0d1424] border border-indigo-950/70 space-y-3">
                      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                        <div className="space-y-0.5">
                          <span className="text-xs font-bold text-zinc-200">
                            Client Integration Configuration
                          </span>
                          <p className="text-[11px] text-zinc-400">
                            Export ready-to-paste configurations for Cursor (~/.cursor/mcp.json), Claude Desktop, Windsurf, LibreChat, Devin, and Claude Code CLI.
                          </p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          {/* Format switcher */}
                          <div className="flex rounded-lg bg-[#080d1a] border border-indigo-950/80 p-0.5">
                            <button
                              type="button"
                              onClick={() => setMcpExportFormat('json')}
                              className={`px-2.5 py-1 rounded-md text-[10px] font-bold transition-colors ${
                                mcpExportFormat === 'json' ? 'bg-indigo-600 text-white' : 'text-zinc-400'
                              }`}
                            >
                              JSON (mcpServers)
                            </button>
                            <button
                              type="button"
                              onClick={() => setMcpExportFormat('cli')}
                              className={`px-2.5 py-1 rounded-md text-[10px] font-bold transition-colors ${
                                mcpExportFormat === 'cli' ? 'bg-indigo-600 text-white' : 'text-zinc-400'
                              }`}
                            >
                              Claude CLI Commands
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Scope selection */}
                      <div className="flex items-center gap-2 pt-1 border-t border-indigo-950/60">
                        <span className="text-[11px] text-zinc-400">Scope:</span>
                        <div className="flex gap-1.5">
                          <button
                            type="button"
                            onClick={() => setMcpExportScope('zero_auth')}
                            className={`px-2 py-0.5 rounded text-[10px] border transition-colors ${
                              mcpExportScope === 'zero_auth'
                                ? 'bg-emerald-950/80 border-emerald-500/60 text-emerald-300'
                                : 'bg-[#080d1a] border-indigo-950 text-zinc-400'
                            }`}
                          >
                            Zero-Auth Only ({zeroAuthServers.length})
                          </button>
                          <button
                            type="button"
                            onClick={() => setMcpExportScope('all')}
                            className={`px-2 py-0.5 rounded text-[10px] border transition-colors ${
                              mcpExportScope === 'all'
                                ? 'bg-indigo-950/80 border-indigo-500/60 text-indigo-300'
                                : 'bg-[#080d1a] border-indigo-950 text-zinc-400'
                            }`}
                          >
                            All 100 Directory Servers
                          </button>
                          <button
                            type="button"
                            onClick={() => setMcpExportScope('configured')}
                            className={`px-2 py-0.5 rounded text-[10px] border transition-colors ${
                              mcpExportScope === 'configured'
                                ? 'bg-indigo-950/80 border-indigo-500/60 text-indigo-300'
                                : 'bg-[#080d1a] border-indigo-950 text-zinc-400'
                            }`}
                          >
                            Active Configured ({mcpServerUrls.length})
                          </button>
                        </div>
                      </div>

                      {/* Code Display block */}
                      {(() => {
                        let targetServers: RemoteMcpServer[] = [];
                        if (mcpExportScope === 'zero_auth') {
                          targetServers = zeroAuthServers;
                        } else if (mcpExportScope === 'all') {
                          targetServers = REMOTE_MCP_DIRECTORY;
                        } else {
                          targetServers = REMOTE_MCP_DIRECTORY.filter(s => mcpServerUrls.includes(s.url));
                          // Also append any custom URLs
                          const existingUrls = new Set(targetServers.map(s => s.url));
                          mcpServerUrls.forEach(url => {
                            if (!existingUrls.has(url)) {
                              const id = url.replace(/[^a-zA-Z0-9]/g, '-').replace(/^-+|-+$/g, '').slice(0, 20) || 'custom-server';
                              targetServers.push({
                                id,
                                name: id,
                                category: 'developer_docs',
                                categoryLabel: 'Developer Docs',
                                url,
                                transport: 'http',
                                authType: 'public',
                                authLabel: 'Custom',
                                description: 'Custom MCP Endpoint',
                                tools: [],
                              });
                            }
                          });
                        }

                        const codeContent = mcpExportFormat === 'json'
                          ? generateMcpServersJson(targetServers)
                          : generateClaudeCliCommands(targetServers);

                        return (
                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="text-[10px] text-zinc-400">
                                {mcpExportFormat === 'json' ? 'Configuration Block (mcp.json):' : 'Shell Commands (Terminal):'}
                              </span>
                              <button
                                type="button"
                                onClick={() => handleCopyText(codeContent, 'export-code')}
                                className="px-3 py-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded-md text-[10px] font-semibold flex items-center gap-1.5 transition-colors shadow-sm"
                              >
                                {copiedId === 'export-code' ? (
                                  <Check className="w-3 h-3 text-emerald-300" />
                                ) : (
                                  <Copy className="w-3 h-3" />
                                )}
                                Copy Configuration
                              </button>
                            </div>
                            <pre className="p-3 bg-[#080d1a] border border-indigo-950/80 rounded-lg text-[11px] text-emerald-300 overflow-x-auto max-h-72 custom-scrollbar font-mono leading-relaxed">
                              {codeContent}
                            </pre>
                          </div>
                        );
                      })()}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* 4. TOOLS ARSENAL SELECTION TAB (REFINED) */}
            {activeTab === 'tools' && (
              <div className="space-y-4 font-mono">
                {/* Tools Header & Search */}
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between gap-3">
                    <div className="relative flex-1">
                      <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-3 top-3 pointer-events-none" />
                      <input
                        type="text"
                        value={toolSearchQuery}
                        onChange={e => setToolSearchQuery(e.target.value)}
                        placeholder="Filter tools by capability (search, crawler, code, osint, terminal...)"
                        className="w-full pl-9 pr-3 py-2 bg-[#070b14] border border-indigo-950/70 rounded-lg text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-indigo-500"
                      />
                    </div>

                    <span className="px-3 py-2 rounded-lg bg-indigo-950/80 border border-indigo-700/60 text-indigo-300 text-xs font-semibold shrink-0">
                      {activeToolsCount} / {allToolList.length} Active
                    </span>
                  </div>

                  {/* Category Filter Pills */}
                  <div className="flex flex-wrap gap-1.5 text-xs">
                    <button
                      type="button"
                      onClick={() => setActiveToolCategory('all')}
                      className={`px-2.5 py-1 rounded text-[11px] border transition-colors ${
                        activeToolCategory === 'all'
                          ? 'bg-indigo-600 text-white border-indigo-500 font-semibold'
                          : 'bg-[#080d1a] text-zinc-400 border-indigo-950/70 hover:text-zinc-200'
                      }`}
                    >
                      All Tools ({allToolList.length})
                    </button>
                    {TOOL_CATEGORIES.map(cat => (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => setActiveToolCategory(cat.id)}
                        className={`px-2.5 py-1 rounded text-[11px] border transition-colors ${
                          activeToolCategory === cat.id
                            ? 'bg-indigo-600 text-white border-indigo-500 font-semibold'
                            : 'bg-[#080d1a] text-zinc-400 border-indigo-950/70 hover:text-zinc-200'
                        }`}
                      >
                        {cat.title}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Bulk Enable / Disable Action Buttons */}
                <div className="p-3 rounded-lg bg-[#0d1424] border border-indigo-950/70 flex items-center justify-between text-xs">
                  <span className="text-zinc-400">
                    Showing <strong>{filteredToolList.length}</strong> matching tools
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleToggleAllCategoryTools(filteredToolList.map(t => t.name), true)}
                      className="px-2.5 py-1 rounded bg-indigo-950 hover:bg-indigo-900 border border-indigo-700/60 text-indigo-300 text-[11px] font-semibold transition-colors"
                    >
                      Enable All Filtered
                    </button>
                    <button
                      type="button"
                      onClick={() => handleToggleAllCategoryTools(filteredToolList.map(t => t.name), false)}
                      className="px-2.5 py-1 rounded bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-zinc-400 text-[11px] transition-colors"
                    >
                      Disable All Filtered
                    </button>
                  </div>
                </div>

                {/* Interactive Tool Cards with Switches */}
                <div className="space-y-2.5 max-h-[480px] overflow-y-auto custom-scrollbar pr-1">
                  {filteredToolList.map(tool => {
                    const isEnabled = enabledToolsSet.has(tool.name);
                    return (
                      <div
                        key={tool.name}
                        onClick={() => handleToggleTool(tool.name)}
                        className={`p-3 rounded-xl border transition-all cursor-pointer flex items-start justify-between gap-3 ${
                          isEnabled
                            ? 'bg-indigo-950/20 border-indigo-500/50 hover:border-indigo-400'
                            : 'bg-[#070b14] border-indigo-950/60 hover:border-zinc-800 opacity-75'
                        }`}
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className={`text-xs font-bold font-mono ${isEnabled ? 'text-indigo-300' : 'text-zinc-300'}`}>
                              {tool.name}
                            </span>
                            {isEnabled && (
                              <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-emerald-950/80 border border-emerald-600/50 text-emerald-400 font-semibold">
                                ARMED
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-zinc-400 font-sans mt-0.5 line-clamp-2 leading-relaxed">
                            {tool.description}
                          </p>

                          {tool.parameters && tool.parameters.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-1.5">
                              {(tool.parameters || []).slice(0, 4).map(p => (
                                <span key={p} className="text-[9px] px-1.5 py-0.2 rounded bg-[#0d1424] border border-indigo-950 text-zinc-500">
                                  {p}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* Toggle Checkbox Switch */}
                        <div className="pt-0.5">
                          <input
                            type="checkbox"
                            checked={isEnabled}
                            onChange={() => {}}
                            className="w-4 h-4 accent-indigo-500 cursor-pointer rounded"
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* 5. PXPIPE TOKEN ARBITRAGE TAB */}
            {activeTab === 'pxpipe' && (
              <div className="space-y-5">
                {/* Explainer card */}
                <div className="p-4 rounded-xl bg-gradient-to-br from-[#070b14] to-emerald-950/25 border border-emerald-500/40 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Zap className="w-5 h-5 text-emerald-400" />
                      <h3 className="text-sm font-mono font-bold text-emerald-300">
                        pxpipe Vision Arbitrage Token Reduction
                      </h3>
                    </div>
                    <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-emerald-950/80 border border-emerald-600/60 text-emerald-300 font-semibold">
                      59% - 70% SAVINGS
                    </span>
                  </div>
                  <p className="text-xs text-zinc-300 leading-relaxed">
                    Multimodal models compute image token prices strictly based on pixel dimensions rather than embedded text density.
                    pxpipe renders bulky prompts, documentation, and codebase dumps into dense PNG images, achieving <strong>~3.1 characters per visual token</strong>.
                  </p>
                </div>

                {/* Enable toggle & Local Proxy status */}
                <div className="p-4 rounded-xl bg-[#0d1424] border border-indigo-950/70 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-xs font-mono font-semibold text-zinc-200">
                        Enable pxpipe Vision Compression
                      </span>
                      <p className="text-xs text-zinc-400">
                        Automatically compresses context &gt;300 chars into visual token payloads
                      </p>
                    </div>
                    <input
                      type="checkbox"
                      checked={!!settings.pxpipeEnabled}
                      onChange={e => setSettings((s: AppSettings) => ({ ...s, pxpipeEnabled: e.target.checked }))}
                      className="accent-emerald-500 w-4 h-4 rounded cursor-pointer"
                    />
                  </div>

                  <div className="pt-2 border-t border-indigo-950/60 flex items-center justify-between text-xs font-mono">
                    <div className="flex items-center gap-2">
                      <Server className="w-3.5 h-3.5 text-zinc-500" />
                      <span className="text-zinc-400">Local Proxy Engine:</span>
                      <span className="text-zinc-300">127.0.0.1:47821</span>
                    </div>
                    {pxpipeProxyStatus?.online ? (
                      <span className="text-emerald-400 font-semibold flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" /> Daemon Online ({pxpipeProxyStatus.latencyMs}ms)
                      </span>
                    ) : (
                      <span className="text-amber-400 flex items-center gap-1" title="Browser-side HTML5 canvas handles rendering automatically">
                        • Browser Canvas Fallback Active
                      </span>
                    )}
                  </div>
                </div>

                {/* Exact-Recall Escape Hatch Notice */}
                <div className="p-3.5 rounded-lg bg-[#070b14] border border-indigo-950/80 text-xs space-y-1.5">
                  <div className="flex items-center gap-1.5 text-indigo-300 font-mono font-semibold">
                    <Lock className="w-3.5 h-3.5" />
                    Exact-Recall Escape Hatch (Secret Protection)
                  </div>
                  <p className="text-zinc-400 leading-relaxed text-[11px]">
                    pxpipe automatically detects and preserves exact API keys (sk-, AIza), 32+ char hashes, and JWT tokens in pristine plain text so lossy image compression never corrupts cryptographic credentials.
                  </p>
                </div>

                {/* Interactive Playground */}
                <div className="p-4 rounded-xl bg-[#0d1424] border border-indigo-950/70 space-y-3 font-mono">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-zinc-200">
                      Live Arbitrage Simulator &amp; Benchmarker
                    </span>
                    <button
                      type="button"
                      onClick={handleTestPxpipeSample}
                      disabled={isRenderingSample}
                      className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-xs transition-colors"
                    >
                      {isRenderingSample ? 'Rendering...' : 'Render to PNG'}
                    </button>
                  </div>

                  <textarea
                    rows={4}
                    value={sampleText}
                    onChange={e => setSampleText(e.target.value)}
                    placeholder="Enter bulky context to test pxpipe compression..."
                    className="w-full p-2.5 bg-[#070b14] border border-indigo-950/70 rounded-lg text-xs text-zinc-200 focus:outline-none focus:border-indigo-500"
                  />

                  {sampleRenderResult && (
                    <div className="space-y-3 pt-2">
                      <div className="grid grid-cols-3 gap-2 text-center text-xs">
                        <div className="p-2 rounded bg-[#070b14] border border-indigo-950/70">
                          <span className="text-[10px] text-zinc-500 block">Plain Text Tokens</span>
                          <span className="font-bold text-zinc-300">~{sampleRenderResult.stats.estimatedTextTokens}</span>
                        </div>
                        <div className="p-2 rounded bg-[#070b14] border border-emerald-950/70">
                          <span className="text-[10px] text-emerald-500 block">Visual Tokens</span>
                          <span className="font-bold text-emerald-400">~{sampleRenderResult.stats.estimatedVisualTokens}</span>
                        </div>
                        <div className="p-2 rounded bg-emerald-950/40 border border-emerald-500/50">
                          <span className="text-[10px] text-emerald-400 block">Token Reduction</span>
                          <span className="font-bold text-emerald-300">-{sampleRenderResult.stats.tokenSavingsPct}%</span>
                        </div>
                      </div>

                      <div>
                        <span className="text-[10px] text-zinc-500 block mb-1">Generated Monospace PNG Artifact:</span>
                        <img
                          src={sampleRenderResult.imageDataUrl}
                          alt="Rendered pxpipe frame"
                          className="w-full max-h-48 object-contain rounded-lg border border-indigo-950 bg-black shadow-md"
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* 6. HARNESS TAB */}
            {activeTab === 'harness' && (
              <div className="space-y-5 font-mono">
                {/* System Override / Unrestricted Prompt */}
                <div className="p-4 rounded-xl bg-amber-950/20 border border-amber-500/40 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <ShieldAlert className="w-4 h-4 text-amber-400" />
                      <div>
                        <span className="text-xs font-bold text-amber-300">System Override (Unrestricted Mode)</span>
                        <p className="text-[11px] text-zinc-400">
                          Bypasses polite pre-prompt boilerplate for direct raw model execution
                        </p>
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      checked={!!settings.systemOverride}
                      onChange={e => setSettings((s: AppSettings) => ({ ...s, systemOverride: e.target.checked }))}
                      className="accent-amber-500 w-4 h-4 rounded cursor-pointer"
                    />
                  </div>
                </div>

                {/* Primary Model & Provider */}
                <div className="p-4 rounded-xl bg-[#0d1424] border border-indigo-950/70 space-y-3">
                  <h4 className="text-xs font-semibold text-zinc-200">Execution Parameters</h4>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div>
                      <label className="text-zinc-400 block mb-1">Temperature ({settings.temperature})</label>
                      <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.05"
                        value={settings.temperature}
                        onChange={e => setSettings((s: AppSettings) => ({ ...s, temperature: parseFloat(e.target.value) }))}
                        className="w-full accent-indigo-500 cursor-pointer"
                      />
                    </div>

                    <div>
                      <label className="text-zinc-400 block mb-1">Dedicated Vision Model</label>
                      <select
                        value={settings.visionModel || 'gemini-2.5-flash'}
                        onChange={e => setSettings((s: AppSettings) => ({ ...s, visionModel: e.target.value }))}
                        className="w-full p-2 bg-[#080d1a] border border-indigo-950/70 rounded text-xs text-zinc-200 focus:outline-none"
                      >
                        <option value="gemini-2.5-flash">Gemini 2.5 Flash (Ultra Vision)</option>
                        <option value="claude-3.7-sonnet">Claude 3.7 Sonnet (Anthropic)</option>
                        <option value="gpt-4o">GPT-4o (OpenAI Vision)</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="text-zinc-400 block mb-1">System Instructions Prompt</label>
                    <textarea
                      rows={4}
                      value={settings.systemInstruction}
                      onChange={e => setSettings((s: AppSettings) => ({ ...s, systemInstruction: e.target.value }))}
                      className="w-full p-2.5 bg-[#080d1a] border border-indigo-950/70 rounded text-xs text-zinc-200 focus:outline-none"
                    />
                  </div>
                </div>
              </div>
            )}

          </div>

          {/* Drawer Footer */}
          <div className="px-6 py-3 border-t border-slate-800/80 bg-[#0d1322] flex items-center justify-between text-xs font-mono shrink-0">
            <span className="text-slate-500">WormGPT Console v4.8</span>
            <button
              onClick={onClose}
              className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-semibold transition-colors shadow-sm"
            >
              Done
            </button>
          </div>

        </aside>
      </div>
    </div>
  );
};

export const SettingsModal = SettingsDrawer;
export default SettingsDrawer;
