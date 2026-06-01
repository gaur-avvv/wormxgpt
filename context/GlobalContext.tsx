import React, { createContext, useContext, useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Message, AppSettings, ChatSession } from '../types';
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
import { multiAgentOrchestrator } from '../services/multiAgent';

interface WormGPTContextType {
  sessions: ChatSession[];
  setSessions: React.Dispatch<React.SetStateAction<ChatSession[]>>;
  activeSessionId: string;
  setActiveSessionId: (id: string) => void;
  activeSession: ChatSession;
  settings: AppSettings;
  setSettings: React.Dispatch<React.SetStateAction<AppSettings>>;
  isStreaming: React.MutableRefObject<boolean>;
  setIsStreaming: (val: boolean) => void;
  input: string;
  setInput: (val: string) => void;
  attachments: string[];
  setAttachments: React.Dispatch<React.SetStateAction<string[]>>;
  isSidebarOpen: boolean;
  setIsSidebarOpen: (val: boolean) => void;
  isSettingsOpen: boolean;
  setIsSettingsOpen: (val: boolean) => void;
  autocomplete: { visible: boolean; type: 'model' | 'tool' | null; query: string; index: number };
  setAutocomplete: React.Dispatch<React.SetStateAction<{ visible: boolean; type: 'model' | 'tool' | null; query: string; index: number }>>;
  handleSend: (overrideInput?: string) => void;
  handleAbort: () => void;
  removeAttachment: (index: number) => void;
}

const WormGPTContext = createContext<WormGPTContextType | undefined>(undefined);

export const WormGPTProvider: React.FC<{ children: React.ReactNode; onSend?: (input: string) => void }> = ({ children, onSend }) => {
  // 1. Core State
  const [sessions, setSessions] = useState<ChatSession[]>(() => {
    const saved = localStorage.getItem(SESSIONS_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      } catch (e) { console.error('SESSION_LOAD_FAILED', e); }
    }
    return [{ id: crypto.randomUUID(), messages: [], title: 'NEW_SESSION', timestamp: Date.now() }];
  });

  const [activeSessionId, setActiveSessionId] = useState<string>(() => {
    const savedId = localStorage.getItem(ACTIVE_ID_KEY);
    return savedId || (sessions.length > 0 ? sessions[0].id : '');
  });

  const [settings, setSettings] = useState<AppSettings>(() => {
    const saved = localStorage.getItem(SETTINGS_KEY);
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
      enabledTools: ['google_search', 'web_scraper', 'get_windows_and_tabs'],
      mcpEnabled: true,
      mcpServerUrls: ['http://localhost:3000/mcp'],
      connectedApps: [],
      autoFallback: true,
      autoSelectFreeModel: true,
      multiAgentEnabled: false,
    };
    if (saved) {
      try {
        return { ...defaults, ...JSON.parse(saved) };
      } catch (e) { console.error("SETTINGS_LOAD_FAILED", e); }
    }
    return defaults;
  });

  const [input, setInput] = useState('');
  const [attachments, setAttachments] = useState<string[]>([]);
  const isStreaming = useRef(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [autocomplete, setAutocomplete] = useState<{ visible: boolean; type: 'model' | 'tool' | null; query: string; index: number }>({ visible: false, type: null, query: '', index: 0 });

  const activeSession = useMemo(() => 
    sessions.find(s => s.id === activeSessionId) || sessions[0] || { id: '', messages: [], title: '' }, 
  [sessions, activeSessionId]);

  const setIsStreaming = (val: boolean) => {
    isStreaming.current = val;
  };

  // 2. Initialize ProviderRouter & Multi-Agent on mount
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

      // Auto-connect MCP servers
      if (settings.mcpEnabled && settings.mcpServerUrls?.length) {
        mcpService.connectMultiple(settings.mcpServerUrls).catch(e =>
          console.warn('[WormGPT] MCP auto-connect failed:', e)
        );
      }
    }
  }, []);

  // 3. Persistence Effects (debounced for settings)
  useEffect(() => {
    localStorage.setItem(SESSIONS_KEY, JSON.stringify(sessions));
    sessionStore.putAll(sessions).catch(e => console.error('IDB_SAVE_FAILED', e));
    sessionSync.broadcastSessionUpdate(activeSessionId, sessions);
  }, [sessions]);

  const settingsSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    // Debounce settings persistence to avoid saving on every keystroke
    if (settingsSaveTimer.current) clearTimeout(settingsSaveTimer.current);
    settingsSaveTimer.current = setTimeout(() => {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
      sessionSync.broadcastSettingsUpdate(settings);
    }, 300);
    return () => { if (settingsSaveTimer.current) clearTimeout(settingsSaveTimer.current); };
  }, [settings]);

  useEffect(() => {
    localStorage.setItem(ACTIVE_ID_KEY, activeSessionId);
  }, [activeSessionId]);

  const abortControllerRef = useRef<AbortController | null>(null);
  const sendLockRef = useRef(false);
  const lastSentAt = useRef(0);

  const handleAbort = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
      setIsStreaming(false);
    }
  }, []);

  const handleSend = useCallback(async (overrideInput?: string) => {
    const forcedText = overrideInput !== undefined ? overrideInput : input;
    if ((!forcedText.trim() && attachments.length === 0) || isStreaming.current) return;
    
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

      const modelPlaceholder: Message = {
        role: 'model',
        content: '_STREAMS_INITIALIZING...',
        timestamp: Date.now(),
        images: []
      };

      setSessions(prev => prev.map(s => s.id === activeSessionId ? {
        ...s,
        messages: [...updatedMessages, modelPlaceholder]
      } : s));

      const controller = new AbortController();
      abortControllerRef.current = controller;

      let lastText = '';
      let lastImages: string[] = [];
      let lastSources: any[] = [];

      try {
        // Check if multi-agent orchestration should handle this
        let stream: AsyncGenerator<any>;

        if (settings.multiAgentEnabled && multiAgentOrchestrator.listAgents().length > 0) {
          const multiAgentTasks = multiAgentOrchestrator.analyzeForMultiAgent(filteredInput);
          if (multiAgentTasks) {
            stream = multiAgentOrchestrator.executeParallel(
              multiAgentTasks, settings, updatedMessages, controller.signal
            );
          } else {
            // Use ProviderRouter with auto-fallback
            stream = providerRouter.streamWithFallback(settings, updatedMessages, controller.signal);
          }
        } else {
          // Use ProviderRouter with auto-fallback
          stream = providerRouter.streamWithFallback(settings, updatedMessages, controller.signal);
        }

        for await (const chunk of stream) {
          if (controller.signal.aborted) break;
          lastText = chunk.text;
          lastImages = chunk.images || [];
          lastSources = chunk.sources || [];

          setSessions(prev => prev.map(s => s.id === activeSessionId ? {
            ...s,
            messages: s.messages.map((m, idx) => 
              idx === s.messages.length - 1 ? { ...m, content: lastText, images: lastImages, sources: lastSources } : m
            )
          } : s));
        }
      } catch (streamError: any) {
        setSessions(prev => prev.map(s => s.id === activeSessionId ? {
          ...s,
          messages: s.messages.map((m, idx) => 
            idx === s.messages.length - 1 ? { ...m, content: `CRITICAL_FAILURE: ${streamError.message || 'Unknown Error'}` } : m
          )
        } : s));
      } finally {
        setIsStreaming(false);
        sendLockRef.current = false;
        abortControllerRef.current = null;
      }
    } catch (e: any) {
      setIsStreaming(false);
      sendLockRef.current = false;
    }
  }, [input, attachments, activeSession, activeSessionId, settings, setSessions]);

  // 4. Global Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+Enter: Send (global backup)
      if (e.ctrlKey && e.key === 'Enter') {
        handleSend();
      }
      // Escape: Abort
      if (e.key === 'Escape' && isStreaming.current) {
        handleAbort();
      }
      // Ctrl+K: Clear current session buffer
      if (e.ctrlKey && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setSessions(prev => prev.map(s => s.id === activeSessionId ? { ...s, messages: [] } : s));
      }
      // Ctrl+/: Focus input (if it exists)
      if (e.ctrlKey && e.key === '/') {
        e.preventDefault();
        document.querySelector('textarea')?.focus();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeSessionId, handleSend, handleAbort]); // Dependencies are now initialized before use

  const removeAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  const value: WormGPTContextType = {
    sessions, setSessions,
    activeSessionId, setActiveSessionId,
    activeSession,
    settings, setSettings,
    isStreaming, setIsStreaming,
    input, setInput,
    attachments, setAttachments,
    isSidebarOpen, setIsSidebarOpen,
    isSettingsOpen, setIsSettingsOpen,
    autocomplete, setAutocomplete,
    handleSend, handleAbort, removeAttachment
  };

  return <WormGPTContext.Provider value={value}>{children}</WormGPTContext.Provider>;
};

export const useWormGPT = () => {
  const context = useContext(WormGPTContext);
  if (!context) throw new Error('useWormGPT must be used within a WormGPTProvider');
  return context;
};

