import React, { createContext, useContext, useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Message, AppSettings, ChatSession, ToolInvocation } from '../types';
import { 
  SESSIONS_KEY, 
  ACTIVE_ID_KEY, 
  SETTINGS_KEY, 
  DEFAULT_SYSTEM_INSTRUCTION, 
  MODEL_OPTIONS, 
  DEFAULT_MCP_SERVERS,
  FALLBACK_CHAIN,
  FREE_MODEL_DEFAULTS
} from '../constants';
import { sessionSync, pluginRegistry, mcpService } from '../services';
import { sessionStore } from '../services/sessionStore';
import { providerRouter, initializeProviderRouter } from '../services/providerRouter';
import { chatService } from '../services/chatService';
import { mcpRegistry, SelectableArsenalTool } from '../services/mcp/registry';
import { multiAgentOrchestrator } from '../services/multiAgent';
import { 
  getDeviceFingerprint, 
  DeviceSpecs, 
  saveHistoryWithFingerprint, 
  loadHistoryWithFingerprint, 
  saveSettingsWithFingerprint, 
  loadSettingsWithFingerprint 
} from '../utils/deviceFingerprint';

interface WormGPTContextType {
  sessions: ChatSession[];
  setSessions: React.Dispatch<React.SetStateAction<ChatSession[]>>;
  activeSessionId: string;
  setActiveSessionId: (id: string) => void;
  activeSession: ChatSession;
  settings: AppSettings;
  setSettings: React.Dispatch<React.SetStateAction<AppSettings>>;
  isStreaming: boolean;
  activeToolCalling: string | null;
  setIsStreaming: (val: boolean) => void;
  input: string;
  setInput: (val: string) => void;
  attachments: string[];
  setAttachments: React.Dispatch<React.SetStateAction<string[]>>;
  isSidebarOpen: boolean;
  setIsSidebarOpen: (val: boolean) => void;
  isSettingsOpen: boolean;
  setIsSettingsOpen: (val: boolean) => void;
  isArsenalOpen: boolean;
  setIsArsenalOpen: (val: boolean) => void;
  autocomplete: { visible: boolean; type: 'model' | 'tool' | null; query: string; index: number; startIndex?: number };
  setAutocomplete: React.Dispatch<React.SetStateAction<{ visible: boolean; type: 'model' | 'tool' | null; query: string; index: number; startIndex?: number }>>;
  handleSend: (overrideInput?: string) => void;
  handleAbort: () => void;
  clearSessionBuffer: (targetSessionId?: string) => void;
  deleteSession: (targetSessionId: string) => Promise<void>;
  purgeAllSessions: () => Promise<void>;
  removeAttachment: (index: number) => void;
  // Device Fingerprint isolation
  deviceSpecs: DeviceSpecs | null;
  deviceFingerprint: string;
  deviceDisplayId: string;
  // Active Arsenal (100 Remote MCP Catalog)
  arsenalTools: SelectableArsenalTool[];
  activeArsenalToolIds: string[];
  toggleArsenalTool: (toolId: string) => void;
  enableAllZeroAuthTools: () => Promise<void>;
  registerMcpEndpoint: (urlOrServer: string, apiKey?: string) => Promise<void>;
  executeArsenalTool: (toolId: string, args: Record<string, any>) => Promise<any>;
}

const WormGPTContext = createContext<WormGPTContextType | undefined>(undefined);

export const WormGPTProvider: React.FC<{ children: React.ReactNode; onSend?: (input: string) => void }> = ({ children, onSend }) => {
  // Device Fingerprinting
  const [deviceSpecs, setDeviceSpecs] = useState<DeviceSpecs | null>(null);
  const deviceFingerprint = deviceSpecs?.fingerprint || 'default_device_fp';
  const deviceDisplayId = deviceSpecs?.displayId || 'WORM-FP-DEVICE';

  // Active Arsenal state (default to high-value zero-auth tools)
  const [activeArsenalToolIds, setActiveArsenalToolIds] = useState<string[]>(() => {
    return [
      'parallel-search:parallel_search',
      'deepwiki:read_wiki_structure',
      'mintlify-index:search_docs',
      'chainguard-academy:lookup_cve'
    ];
  });
  const [isArsenalOpen, setIsArsenalOpen] = useState(false);

  // 1. Core State
  const [sessions, setSessions] = useState<ChatSession[]>(() => {
    try {
      const saved = localStorage.getItem(SESSIONS_KEY);
      if (saved && (saved.startsWith('[') || saved.startsWith('{'))) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {
      // Graceful fallback if storage data is non-JSON or corrupted
    }
    return [{ id: crypto.randomUUID(), messages: [], title: 'NEW_SESSION', timestamp: Date.now() }];
  });

  const [activeSessionId, setActiveSessionId] = useState<string>(() => {
    const savedId = localStorage.getItem(ACTIVE_ID_KEY);
    return savedId || (sessions.length > 0 ? sessions[0].id : '');
  });

  const [settings, setSettings] = useState<AppSettings>(() => {
    const defaults: AppSettings = {
      model: 'openai',
      aiProvider: 'pollinations',
      temperature: 0.87,
      topP: 1,
      maxTokens: 4000,
      thinkingEnabled: true,
      thinkingBudget: 2048,
      systemInstruction: DEFAULT_SYSTEM_INSTRUCTION,
      customPromptPrefix: DEFAULT_SYSTEM_INSTRUCTION,
      promptInjectionEnabled: true,
      promptInjectionMode: 'always',
      enabledTools: ['google_search', 'web_scraper', 'get_windows_and_tabs', 'parallel_search'],
      mcpEnabled: true,
      mcpServerUrls: ['https://search.parallel.ai/mcp', 'https://index.mintlify.com/mcp'],
      connectedApps: [],
      autoFallback: true,
      autoSelectFreeModel: true,
      multiAgentEnabled: false,
      visionModel: 'gemini-2.5-flash',
      visionProvider: 'gemini',
      modelRoutingMode: 'auto',
      systemOverride: false,
      liveModePrompt: false,
      themePreference: 'charcoal',
      fontSize: 'base',
    };
    try {
      const saved = localStorage.getItem(SETTINGS_KEY);
      if (saved && saved.startsWith('{')) {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed === 'object') {
          return { ...defaults, ...parsed };
        }
      }
    } catch {
      // Graceful fallback
    }
    return defaults;
  });

  const [input, setInput] = useState('');
  const [attachments, setAttachments] = useState<string[]>([]);
  const [isStreaming, setIsStreamingState] = useState(false);
  const isStreamingRef = useRef(false);
  const [activeToolCalling, setActiveToolCalling] = useState<string | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [autocomplete, setAutocomplete] = useState<{ visible: boolean; type: 'model' | 'tool' | null; query: string; index: number; startIndex?: number }>({ visible: false, type: null, query: '', index: 0, startIndex: 0 });

  const activeSession = useMemo(() => 
    sessions.find(s => s.id === activeSessionId) || sessions[0] || { id: '', messages: [], title: '' }, 
  [sessions, activeSessionId]);

  const setIsStreaming = useCallback((val: boolean) => {
    isStreamingRef.current = val;
    setIsStreamingState(val);
  }, []);

  // Map 100 Remote MCP Catalog to Selectable Arsenal Tools
  const [arsenalTools, setArsenalTools] = useState<SelectableArsenalTool[]>(() => {
    return mcpRegistry.mapToSelectableArsenalTools(activeArsenalToolIds);
  });

  // Recompute arsenal tool mapping when active selection changes
  useEffect(() => {
    setArsenalTools(mcpRegistry.mapToSelectableArsenalTools(activeArsenalToolIds));
  }, [activeArsenalToolIds]);

  const toggleArsenalTool = useCallback((toolId: string) => {
    setActiveArsenalToolIds(prev => {
      const isAlreadyActive = prev.includes(toolId);
      const next = isAlreadyActive ? prev.filter(id => id !== toolId) : [...prev, toolId];
      // Keep settings.enabledTools in sync
      const simpleName = toolId.includes(':') ? toolId.split(':')[1] : toolId;
      setSettings(s => {
        const currentTools = s.enabledTools || [];
        const updated = isAlreadyActive 
          ? currentTools.filter(t => t !== simpleName && t !== toolId) 
          : [...currentTools, simpleName];
        return { ...s, enabledTools: updated };
      });
      return next;
    });
  }, []);

  const enableAllZeroAuthTools = useCallback(async () => {
    const zeroAuth = mcpRegistry.getZeroAuthServers();
    const zeroAuthToolIds: string[] = [];
    for (const server of zeroAuth) {
      for (const t of (server.tools || [server.id])) {
        zeroAuthToolIds.push(`${server.id}:${t}`);
      }
    }
    setActiveArsenalToolIds(prev => Array.from(new Set([...prev, ...zeroAuthToolIds])));
  }, []);

  const registerMcpEndpoint = useCallback(async (urlOrServer: string, apiKey?: string) => {
    await mcpRegistry.registerServer(urlOrServer, apiKey);
    setArsenalTools(mcpRegistry.mapToSelectableArsenalTools(activeArsenalToolIds));
  }, [activeArsenalToolIds]);

  const executeArsenalTool = useCallback(async (toolId: string, args: Record<string, any>) => {
    return await mcpRegistry.executeArsenalTool(toolId, args);
  }, []);

  // 2. Initialize Hardware Fingerprinting & Load Protected History/Settings on mount
  useEffect(() => {
    getDeviceFingerprint().then(async (specs) => {
      setDeviceSpecs(specs);
      console.log(`[WormGPT] Device Fingerprint Hardware Identity Active: ${specs.displayId}`);

      // Attempt to load device-bound history & settings if available
      try {
        const restoredSessions = await loadHistoryWithFingerprint(specs.fingerprint);
        if (restoredSessions && restoredSessions.length > 0) {
          setSessions(restoredSessions);
        }
        const restoredSettings = await loadSettingsWithFingerprint(specs.fingerprint);
        if (restoredSettings) {
          setSettings(prev => ({ ...prev, ...restoredSettings }));
        }
      } catch (err) {
        console.warn('[WormGPT] Device-bound storage restore error:', err);
      }
    }).catch(e => console.error('[WormGPT] Fingerprint initialization failed:', e));
  }, []);

  // 3. Initialize ProviderRouter & MCP Registry on mount
  const routerInitialized = useRef(false);
  useEffect(() => {
    if (!routerInitialized.current) {
      routerInitialized.current = true;
      initializeProviderRouter().then(() => {
        console.log('[WormGPT] ProviderRouter initialized with', providerRouter.getRegisteredProviders().length, 'providers');
      }).catch(e => console.error('[WormGPT] ProviderRouter init failed:', e));

      // Initialize default multi-agent configs
      if (settings.multiAgentEnabled) {
        multiAgentOrchestrator.createDefaultAgents(settings);
      }

      // Auto-connect and warm up zero-auth public HTTPS endpoints in background
      const zeroAuthServers = mcpRegistry.getZeroAuthServers().slice(0, 8);
      zeroAuthServers.forEach(srv => {
        mcpRegistry.registerServer(srv).catch(() => {});
      });
    }
  }, []);

  // 4. Persistence with Device Fingerprint Isolation
  useEffect(() => {
    if (deviceSpecs?.fingerprint) {
      saveHistoryWithFingerprint(sessions, deviceSpecs.fingerprint).catch(e => console.error('FP_HISTORY_SAVE_FAILED', e));
    } else {
      localStorage.setItem(SESSIONS_KEY, JSON.stringify(sessions));
      sessionStore.putAll(sessions).catch(e => console.error('IDB_SAVE_FAILED', e));
    }
    sessionSync.broadcastSessionUpdate(activeSessionId, sessions);
  }, [sessions, deviceSpecs]);

  const settingsSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (settingsSaveTimer.current) clearTimeout(settingsSaveTimer.current);
    settingsSaveTimer.current = setTimeout(() => {
      if (deviceSpecs?.fingerprint) {
        saveSettingsWithFingerprint(settings, deviceSpecs.fingerprint).catch(e => console.error('FP_SETTINGS_SAVE_FAILED', e));
      } else {
        localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
      }
      sessionSync.broadcastSettingsUpdate(settings);
    }, 300);
    return () => { if (settingsSaveTimer.current) clearTimeout(settingsSaveTimer.current); };
  }, [settings, deviceSpecs]);

  useEffect(() => {
    localStorage.setItem(ACTIVE_ID_KEY, activeSessionId);
  }, [activeSessionId]);

  const abortControllerRef = useRef<AbortController | null>(null);
  const sendLockRef = useRef(false);
  const lastSentAt = useRef(0);

  const handleAbort = useCallback(() => {
    if (abortControllerRef.current) {
      try {
        abortControllerRef.current.abort();
      } catch (err) {
        console.warn('[WormGPT] Abort stream disposal error:', err);
      }
      abortControllerRef.current = null;
    }
    setIsStreaming(false);
    setActiveToolCalling(null);
    sendLockRef.current = false;

    // Immediately sanitize any empty or in-progress model placeholder
    setSessions(prev => prev.map(s => {
      if (s.id !== activeSessionId) return s;
      const msgs = [...s.messages];
      const lastMsg = msgs[msgs.length - 1];
      if (lastMsg && lastMsg.role === 'model') {
        const text = lastMsg.content 
          ? `${lastMsg.content}\n\n*[Generation stopped by user]*` 
          : '*[Generation stopped by user]*';
        msgs[msgs.length - 1] = { ...lastMsg, content: text };
        return { ...s, messages: msgs };
      }
      return s;
    }));
  }, [activeSessionId, setIsStreaming]);

  const clearSessionBuffer = useCallback((targetSessionId?: string) => {
    handleAbort();
    const idToClear = targetSessionId || activeSessionId;
    setSessions(prev => {
      const updated = prev.map(s => s.id === idToClear ? { ...s, messages: [] } : s);
      // Immediately sanitize storage without trace
      if (deviceSpecs?.fingerprint) {
        saveHistoryWithFingerprint(updated, deviceSpecs.fingerprint).catch(() => {});
      } else {
        localStorage.setItem(SESSIONS_KEY, JSON.stringify(updated));
      }
      return updated;
    });
  }, [activeSessionId, handleAbort, deviceSpecs]);

  const deleteSession = useCallback(async (targetSessionId: string) => {
    handleAbort();
    const targetSession = sessions.find(s => s.id === targetSessionId);
    
    // 1. Cleanly revoke all blob URLs held in this session's attachments
    if (targetSession?.messages) {
      for (const msg of targetSession.messages) {
        if (msg.images) {
          for (const img of msg.images) {
            if (typeof img === 'string' && img.startsWith('blob:')) {
              try { URL.revokeObjectURL(img); } catch {}
            }
          }
        }
      }
    }

    // 2. Perform zero-trace removal in IndexedDB database
    try {
      await sessionStore.delete(targetSessionId);
    } catch (err) {
      console.warn('[WormGPT] IDB session delete warning:', err);
    }

    // 3. Compute sanitized session list
    const remaining = sessions.filter(s => s.id !== targetSessionId);
    let nextSessions = remaining;
    let nextActiveId = activeSessionId;

    if (nextSessions.length === 0) {
      const freshSession: ChatSession = {
        id: crypto.randomUUID(),
        messages: [],
        title: 'New Session',
        createdAt: Date.now(),
        updatedAt: Date.now()
      };
      nextSessions = [freshSession];
      nextActiveId = freshSession.id;
    } else if (activeSessionId === targetSessionId) {
      nextActiveId = nextSessions[0].id;
    }

    // 4. Update state & active session
    setSessions(nextSessions);
    setActiveSessionId(nextActiveId);
    localStorage.setItem(ACTIVE_ID_KEY, nextActiveId);

    // 5. Instantly overwrite local storage and device-bound encrypted fingerprint partition
    if (deviceSpecs?.fingerprint) {
      try {
        await saveHistoryWithFingerprint(nextSessions, deviceSpecs.fingerprint);
      } catch (err) {
        console.warn('[WormGPT] Fingerprint history save after delete:', err);
      }
    } else {
      localStorage.setItem(SESSIONS_KEY, JSON.stringify(nextSessions));
    }

    // 6. Broadcast sanitized state across browser windows/tabs
    sessionSync.broadcastSessionUpdate(nextActiveId, nextSessions);
  }, [sessions, activeSessionId, handleAbort, deviceSpecs]);

  const purgeAllSessions = useCallback(async () => {
    handleAbort();
    try {
      await sessionStore.clear();
    } catch {}

    const freshSession: ChatSession = {
      id: crypto.randomUUID(),
      messages: [],
      title: 'New Session',
      createdAt: Date.now(),
      updatedAt: Date.now()
    };

    setSessions([freshSession]);
    setActiveSessionId(freshSession.id);
    localStorage.setItem(ACTIVE_ID_KEY, freshSession.id);
    localStorage.setItem(SESSIONS_KEY, JSON.stringify([freshSession]));

    if (deviceSpecs?.fingerprint) {
      try {
        await saveHistoryWithFingerprint([freshSession], deviceSpecs.fingerprint);
      } catch {}
    }

    sessionSync.broadcastSessionUpdate(freshSession.id, [freshSession]);
  }, [handleAbort, deviceSpecs]);

  const handleSend = useCallback(async (overrideInput?: string) => {
    const forcedText = overrideInput !== undefined ? overrideInput : input;
    if ((!forcedText.trim() && attachments.length === 0) || isStreamingRef.current) return;
    
    const now = Date.now();
    if (sendLockRef.current || now - lastSentAt.current < 500) return;
    sendLockRef.current = true;
    lastSentAt.current = now;

    try {
      const filteredInput = await pluginRegistry.runFilters(forcedText, 'PRE');
      const userMessage: Message = {
        role: 'user',
        content: (settings.inputTemplate || '{{input}}').replace('{{input}}', filteredInput),
        images: [...attachments],
        timestamp: Date.now()
      };

      const updatedMessages = [...activeSession.messages, userMessage];
      setSessions(prev => prev.map(s => s.id === activeSessionId ? {
        ...s,
        messages: updatedMessages,
        title: s.title === 'NEW_SESSION' ? forcedText.slice(0, 24) || 'ACTIVE_THREAD' : s.title
      } : s));

      setInput('');
      setAttachments([]);
      setIsStreaming(true);
      setActiveToolCalling(null);

      const modelPlaceholder: Message = {
        role: 'model',
        content: '',
        timestamp: Date.now()
      };

      setSessions(prev => prev.map(s => s.id === activeSessionId ? {
        ...s,
        messages: [...updatedMessages, modelPlaceholder]
      } : s));

      const controller = new AbortController();
      abortControllerRef.current = controller;

      try {
        const hasVisionInput = userMessage.images && userMessage.images.length > 0;
        let effectiveExecutionSettings = { ...settings };
        if (hasVisionInput) {
          const vModel = settings.visionModel || 'gemini-2.5-flash';
          const vProvider = settings.visionProvider || 'gemini';
          effectiveExecutionSettings = {
            ...settings,
            model: vModel,
            aiProvider: vProvider,
          };
        }

        let responseChunk: { text: string; images?: string[]; video?: string; audio?: string; sources?: any[]; toolInvocations?: ToolInvocation[] };

        if (settings.multiAgentEnabled && multiAgentOrchestrator.listAgents().length > 0) {
          const multiAgentTasks = multiAgentOrchestrator.analyzeForMultiAgent(filteredInput);
          if (multiAgentTasks) {
            let lastText = '';
            let lastImages: string[] = [];
            for await (const chunk of multiAgentOrchestrator.executeParallel(
              multiAgentTasks, effectiveExecutionSettings, updatedMessages, controller.signal
            )) {
              if (chunk.text) lastText = chunk.text;
              if (chunk.images) lastImages = chunk.images;
            }
            responseChunk = { text: lastText, images: lastImages };
          } else {
            responseChunk = await chatService.generateChatResponse(
              effectiveExecutionSettings, 
              updatedMessages, 
              controller.signal,
              (toolName) => setActiveToolCalling(toolName),
              () => setActiveToolCalling(null)
            );
          }
        } else {
          responseChunk = await chatService.generateChatResponse(
            effectiveExecutionSettings, 
            updatedMessages, 
            controller.signal,
            (toolName) => setActiveToolCalling(toolName),
            () => setActiveToolCalling(null)
          );
        }

        if (controller.signal.aborted) return;

        const finalText = responseChunk.text || 'No response generated.';
        const finalImages = responseChunk.images || [];
        const finalSources = responseChunk.sources || [];
        const finalToolInvocations = responseChunk.toolInvocations || [];

        setSessions(prev => prev.map(s => s.id === activeSessionId ? {
          ...s,
          messages: s.messages.map((m, idx) => 
            idx === s.messages.length - 1 ? { 
              ...m, 
              content: finalText, 
              images: finalImages, 
              sources: finalSources,
              toolInvocations: finalToolInvocations
            } : m
          )
        } : s));
      } catch (streamError: any) {
        if (streamError.name === 'AbortError' || controller.signal.aborted) return;
        setSessions(prev => prev.map(s => s.id === activeSessionId ? {
          ...s,
          messages: s.messages.map((m, idx) => 
            idx === s.messages.length - 1 ? { ...m, content: `CRITICAL_FAILURE: ${streamError.message || 'Unknown Error'}` } : m
          )
        } : s));
      } finally {
        setIsStreaming(false);
        setActiveToolCalling(null);
        sendLockRef.current = false;
        abortControllerRef.current = null;
      }
    } catch (e: any) {
      setIsStreaming(false);
      setActiveToolCalling(null);
      sendLockRef.current = false;
    }
  }, [input, attachments, activeSession, activeSessionId, settings, setSessions, setIsStreaming]);

  // 5. Global Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === 'Enter') {
        handleSend();
      }
      if (e.key === 'Escape' && isStreamingRef.current) {
        handleAbort();
      }
      if (e.ctrlKey && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        clearSessionBuffer();
      }
      if (e.ctrlKey && e.key === '/') {
        e.preventDefault();
        document.querySelector('textarea')?.focus();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeSessionId, handleSend, handleAbort, clearSessionBuffer]);

  const removeAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  const value: WormGPTContextType = {
    sessions, setSessions,
    activeSessionId, setActiveSessionId,
    activeSession,
    settings, setSettings,
    isStreaming, setIsStreaming,
    activeToolCalling,
    input, setInput,
    attachments, setAttachments,
    isSidebarOpen, setIsSidebarOpen,
    isSettingsOpen, setIsSettingsOpen,
    isArsenalOpen, setIsArsenalOpen,
    autocomplete, setAutocomplete,
    handleSend, handleAbort, clearSessionBuffer, deleteSession, purgeAllSessions, removeAttachment,
    deviceSpecs, deviceFingerprint, deviceDisplayId,
    arsenalTools, activeArsenalToolIds, toggleArsenalTool,
    enableAllZeroAuthTools, registerMcpEndpoint, executeArsenalTool
  };

  return <WormGPTContext.Provider value={value}>{children}</WormGPTContext.Provider>;
};

export const useWormGPT = () => {
  const context = useContext(WormGPTContext);
  if (!context) throw new Error('useWormGPT must be used within a WormGPTProvider');
  return context;
};
