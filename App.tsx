import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import rehypeRaw from 'rehype-raw';
import 'katex/dist/katex.min.css';
import { Message, AppSettings, ChatSession } from './types';
import { DEFAULT_SYSTEM_INSTRUCTION, SUGGESTED_PROMPTS, MODEL_OPTIONS, AUDIO_MODELS, IMAGE_MODELS, VIDEO_MODELS, DEFAULT_MCP_SERVERS } from './constants';
import {
  geminiService, groqService, pollinationsService, cerebrasService,
  siliconflowService, togetherService, openrouterService, openaiService,
  anthropicService, deepseekService, mistralService, perplexityService,
  xaiService,
  moonshotService,
  ollamaService,
  tinyfishService,
  mcpService,
  ATTACHED_TOOLS,
  executeToolCall,
  validateAndFixToolArgs,
  TOOL_CATEGORIES,
  APP_INTEGRATIONS,
  integrationRegistry,
  supabaseAuth,
  cacheService,
  sessionSync
} from './services';
import { pluginRegistry } from './services/plugins';
import { VoiceModeService } from './services/voiceMode';
import { getAgentStatus } from './utils/get-agent-status';
import { ToolInvocation } from './types';


// --- Error Boundary for Modals ---
class ModalErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean; error: Error | null }> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4 bg-black/90 backdrop-blur-xl">
          <div className="bg-zinc-950 border-2 border-red-600 p-8 rounded-2xl max-w-md w-full shadow-[0_0_50px_rgba(220,38,38,0.5)] text-center">
            <h2 className="text-red-600 font-black text-2xl mb-4 tracking-tighter">FATAL_MODAL_CRASH</h2>
            <div className="text-red-900 text-xs font-mono mb-6 bg-black p-4 rounded border border-red-900/30 overflow-auto max-h-40">
              {this.state.error?.message}
            </div>
            <button 
              onClick={() => { localStorage.clear(); window.location.reload(); }}
              className="w-full py-3 bg-red-600 text-black font-black hover:bg-red-500 transition-all rounded uppercase text-xs tracking-[0.2em]"
            >
              [ PURGE_AND_REBOOT ]
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

const AutocompleteDropdown: React.FC<{
  visible: boolean;
  type: 'model' | 'tool' | null;
  query: string;
  onSelect: (value: string) => void;
  activeIndex: number;
}> = ({ visible, type, query, onSelect, activeIndex }) => {
  if (!visible || !type) return null;

  const suggestions = type === 'model'
    ? MODEL_OPTIONS.filter(m => m.label.toLowerCase().includes(query.toLowerCase()))
    : Object.keys(ATTACHED_TOOLS).filter(t => t.toLowerCase().includes(query.toLowerCase()));

  if (suggestions.length === 0) return null;

  return (
    <div className="absolute bottom-full left-0 mb-3 w-72 bg-[#0a0505]/95 border-2 border-red-600/40 rounded-xl overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.9),0_0_30px_rgba(220,38,38,0.2)] z-[100] backdrop-blur-2xl animate-in fade-in slide-in-from-bottom-2 duration-300">
      <div className="px-4 py-2 bg-red-950/20 border-b border-red-900/30 flex justify-between items-center">
        <div className="text-[9px] font-black uppercase tracking-[0.3em] text-red-500 shadow-[0_0_10px_rgba(220,38,38,0.3)]">
          {type === 'model' ? 'SYSTEM_MODEL_BYPASS' : 'TOOL_INJECTION_VECTOR'}
        </div>
        <div className="text-[7px] text-zinc-600 font-mono italic">ESC to abort</div>
      </div>
      <div className="max-h-64 overflow-y-auto custom-scrollbar p-1">
        {suggestions.map((s, i) => {
          const label = type === 'model' ? (s as any).label : s;
          const value = type === 'model' ? (s as any).value : (s as any);
          const desc = type === 'model' ? (s as any).provider : ATTACHED_TOOLS[s as string]?.function?.description;
          
          return (
            <div
              key={value}
              onClick={() => onSelect(value)}
              className={`p-3 rounded-lg text-[10px] font-bold uppercase tracking-wider cursor-pointer transition-all duration-200 flex items-center justify-between group/item ${i === activeIndex ? 'bg-red-600 text-black translate-x-1 shadow-[0_0_15px_rgba(220,38,38,0.4)]' : 'text-red-400 hover:bg-red-900/20 hover:text-red-300'}`}
            >
              <div className="flex flex-col min-w-0 pr-4">
                <span className="truncate">{label}</span>
                {desc && <span className={`text-[7px] truncate opacity-50 ${i === activeIndex ? 'text-black' : 'text-zinc-600 group-hover/item:text-red-900'}`}>{desc}</span>}
              </div>
              {i === activeIndex && (
                <div className="flex items-center gap-1.5">
                  <span className="text-[8px] opacity-70 font-mono">READY</span>
                  <div className="w-1.5 h-1.5 bg-black rounded-full animate-ping" />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};


declare global {
  interface AIStudio {
    hasSelectedApiKey: () => Promise<boolean>;
    openSelectKey: () => Promise<void>;
  }
  interface Window {
    aistudio?: AIStudio;
  }
}

const SESSIONS_KEY = 'worm_gpt_sessions_v3';
const ACTIVE_ID_KEY = 'worm_gpt_active_session_id_v3';
const SETTINGS_KEY = 'worm_gpt_settings_v3';
const FINGERPRINT_KEY = 'device_fingerprint_v3';

// --- Code Block with Copy Button ---
// --- Code Block with Copy Button ---
const ExecutionTerminal: React.FC<{ output: string; error?: boolean; loading?: boolean }> = ({ output, error, loading }) => {
  if (!output && !loading) return null;
  return (
    <div className="mt-2 p-3 bg-[#0a0505] border-2 border-red-900/30 rounded-lg font-mono text-[10px] leading-tight shadow-inner animate-in fade-in slide-in-from-top-2 duration-300">
      <div className="flex items-center gap-2 mb-2 border-b border-red-900/20 pb-1">
        <div className="w-2 h-2 rounded-full bg-red-600 animate-pulse shadow-[0_0_8px_#dc2626]" />
        <span className="text-red-500 font-black tracking-widest uppercase">Execution_Output</span>
      </div>
      <div className={`whitespace-pre-wrap break-words ${error ? 'text-red-400' : 'text-green-400/80 font-bold'}`}>
        {loading ? (
          <span className="animate-pulse italic opacity-50">_INITIATING_COMPILER_INJECT...</span>
        ) : (
          output || "Done (no output)."
        )}
      </div>
    </div>
  );
};

const CodeBlock: React.FC<{ className?: string; children?: React.ReactNode; settings?: AppSettings }> = ({ className, children, settings }) => {
  const [copied, setCopied] = useState(false);
  const [executing, setExecuting] = useState(false);
  const [output, setOutput] = useState<string | null>(null);
  const [hasError, setHasError] = useState(false);
  const codeRef = useRef<HTMLElement>(null);

  const language = className?.replace('language-', '') || 'code';
  const executableLanguages = ['python', 'javascript', 'js', 'bash', 'sh', 'typescript', 'ts', 'go', 'cpp', 'c', 'java', 'rust', 'ruby', 'php'];
  const canExecute = executableLanguages.includes(language.toLowerCase());

  const handleCopy = async () => {
    const code = codeRef.current?.textContent || '';
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const handleRun = async () => {
    if (!codeRef.current || executing) return;
    const code = codeRef.current.textContent || '';
    setExecuting(true);
    setHasError(false);
    setOutput(null);

    try {
      // Use the general executeToolCall helper
      const result = await executeToolCall({
        id: crypto.randomUUID(),
        type: 'function',
        function: {
          name: 'CodeExecutor',
          arguments: JSON.stringify({ code, language })
        }
      });

      const textOutput = typeof result === 'string' ? result : JSON.stringify(result);
      setOutput(textOutput);
      if (textOutput.toLowerCase().includes('error') || textOutput.toLowerCase().includes('failed')) {
        setHasError(true);
      }
    } catch (err: any) {
      setHasError(true);
      setOutput(err.message || 'Execution bridge failure.');
    } finally {
      setExecuting(false);
    }
  };

  return (
    <div className="relative group my-3">
      {/* Header bar with language and copy button */}
      <div className="flex items-center justify-between px-4 py-2 bg-zinc-900/90 border-b border-red-900/30 rounded-t-lg">
        <span className="text-[10px] uppercase font-black tracking-widest text-red-500/70">
          {language}
        </span>
        <div className="flex items-center gap-2">
          {canExecute && (
            <button
              onClick={handleRun}
              disabled={executing || !settings}
              className={`flex items-center gap-1.5 px-3 py-1 rounded text-[10px] uppercase font-black tracking-wider transition-all duration-300 ${executing
                ? 'bg-amber-600 text-black animate-pulse'
                : 'bg-zinc-800 text-amber-500 hover:bg-amber-600 hover:text-black hover:shadow-[0_0_15px_rgba(245,158,11,0.5)]'
                }`}
            >
              {executing ? 'EXECUTING...' : 'RUN'}
            </button>
          )}
          <button
            onClick={handleCopy}
            className={`flex items-center gap-1.5 px-3 py-1 rounded text-[10px] uppercase font-black tracking-wider transition-all duration-300 ${copied
              ? 'bg-green-600 text-black shadow-[0_0_15px_rgba(34,197,94,0.5)]'
              : 'bg-zinc-800 text-red-400 hover:bg-red-600 hover:text-black hover:shadow-[0_0_15px_rgba(220,38,38,0.5)]'
              }`}
          >
            {copied ? 'COPIED!' : 'COPY'}
          </button>
        </div>
      </div>
      {/* Code content */}
      <pre className="!mt-0 !rounded-t-none bg-black/80 border border-t-0 border-red-900/20 overflow-x-auto custom-scrollbar">
        <code ref={codeRef} className={className}>
          {children}
        </code>
      </pre>
      <ExecutionTerminal output={output || ''} error={hasError} loading={executing} />
    </div>
  );
};

// Inline code component
const InlineCode: React.FC<{ children?: React.ReactNode }> = ({ children }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    const code = String(children);
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  return (
    <code
      onClick={handleCopy}
      className={`px-1.5 py-0.5 rounded cursor-pointer transition-all duration-200 ${copied
        ? 'bg-green-600/30 text-green-400'
        : 'bg-red-900/30 text-red-300 hover:bg-red-700/40'
        }`}
      title="Click to copy"
    >
      {copied ? '✓ ' : ''}{children}
    </code>
  );
};

// --- Sub-components ---

const ConfirmModal: React.FC<{
  isOpen: boolean;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
}> = ({ isOpen, message, onConfirm, onCancel }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm animate-fadeIn">
      <div className="bg-zinc-950 border-2 border-red-900 rounded p-6 max-w-md w-full mx-4 shadow-[0_0_30px_rgba(220,38,38,0.4)] animate-slideUp">
        <div className="text-red-600 text-sm font-mono mb-6 text-center break-words">
          {message}
        </div>
        <div className="flex gap-3 justify-center">
          <button
            onClick={onConfirm}
            className="px-6 py-2 bg-red-600 text-black hover:bg-red-500 transition-all rounded uppercase text-xs font-black tracking-widest shadow-[0_0_10px_rgba(220,38,38,0.3)]"
          >
            OK
          </button>
          <button
            onClick={onCancel}
            className="px-6 py-2 bg-zinc-800 text-red-600 hover:bg-zinc-700 transition-all rounded uppercase text-xs font-black tracking-widest border border-red-900/50"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

const Toast: React.FC<{
  message: string;
  isVisible: boolean;
  onClose: () => void;
}> = ({ message, isVisible, onClose }) => {
  useEffect(() => {
    if (isVisible) {
      const timer = setTimeout(() => {
        onClose();
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [isVisible, onClose]);

  if (!isVisible) return null;

  return (
    <div className="fixed top-4 right-4 z-50 animate-slideInRight">
      <div className="bg-zinc-950 border-2 border-green-600 rounded p-4 shadow-[0_0_20px_rgba(34,197,94,0.4)] flex items-center gap-3">
        <span className="text-green-500 text-[10px] font-black font-mono">OK</span>
        <span className="text-green-400 text-sm font-mono">{message}</span>
      </div>
    </div>
  );
};



const ImagePopup: React.FC<{
  isOpen: boolean;
  imageSrc: string;
  onClose: () => void;
}> = ({ isOpen, imageSrc, onClose }) => {
  const [toastMsg, setToastMsg] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleDownload = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(imageSrc);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `wormgpt_image_${Date.now()}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      setToastMsg('IMAGE_DOWNLOADED');
      setTimeout(() => setToastMsg(''), 2000);
    } catch (err) {
      console.error('Download failed:', err);
      window.open(imageSrc, '_blank');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(imageSrc);
      const blob = await response.blob();
      await navigator.clipboard.write([
        new ClipboardItem({ [blob.type]: blob })
      ]);
      setToastMsg('IMAGE_COPIED_TO_CLIPBOARD');
      setTimeout(() => setToastMsg(''), 2000);
    } catch (err) {
      console.error('Copy failed:', err);
      await navigator.clipboard.writeText(imageSrc);
      setToastMsg('IMAGE_URL_COPIED');
      setTimeout(() => setToastMsg(''), 2000);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 backdrop-blur-xl animate-fadeIn" onClick={onClose}>
      {toastMsg && (
        <div className="fixed top-6 right-6 z-[60] animate-slideInRight">
          <div className="bg-black border-2 border-green-500 rounded-xl px-6 py-4 shadow-[0_0_30px_rgba(34,197,94,0.5)] flex items-center gap-3">
            <span className="text-green-400 text-sm font-mono font-bold">{toastMsg}</span>
          </div>
        </div>
      )}
      <div className="relative max-w-[90vw] max-h-[90vh] animate-slideUp" onClick={e => e.stopPropagation()}>
        {/* Red neon border container */}
        <div
          className="p-1 rounded-2xl"
          style={{
            background: 'linear-gradient(45deg, #ff0000, #dc2626, #991b1b, #7f1d1d, #450a0a, #7f1d1d, #991b1b, #dc2626, #ff0000)',
            backgroundSize: '400% 400%',
            animation: 'rainbow-border 4s ease infinite',
            boxShadow: '0 0 40px rgba(255,0,0,0.5), 0 0 80px rgba(220,38,38,0.4), 0 0 120px rgba(153,27,27,0.3)'
          }}
        >
          <div className="bg-black rounded-xl overflow-hidden">
            <img
              src={imageSrc}
              alt="Generated Image"
              className="max-w-full max-h-[75vh] object-contain"
            />
          </div>
        </div>
        {/* Action buttons */}
        <div className="absolute -bottom-20 left-1/2 transform -translate-x-1/2 flex gap-3">
          <button
            onClick={handleDownload}
            disabled={isLoading}
            className="px-6 py-3 bg-gradient-to-r from-red-600 via-red-500 to-red-600 text-black font-black uppercase text-xs tracking-widest rounded-xl hover:from-red-500 hover:via-red-400 hover:to-red-500 transition-all shadow-[0_0_25px_rgba(220,38,38,0.5)] hover:shadow-[0_0_40px_rgba(220,38,38,0.7)] hover:scale-105 active:scale-95 flex items-center gap-2 disabled:opacity-50"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
            DOWNLOAD
          </button>
          <button
            onClick={handleCopy}
            disabled={isLoading}
            className="px-6 py-3 bg-gradient-to-r from-rose-700 via-red-600 to-rose-700 text-black font-black uppercase text-xs tracking-widest rounded-xl hover:from-rose-600 hover:via-red-500 hover:to-rose-600 transition-all shadow-[0_0_25px_rgba(190,18,60,0.5)] hover:shadow-[0_0_40px_rgba(190,18,60,0.7)] hover:scale-105 active:scale-95 flex items-center gap-2 disabled:opacity-50"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
            COPY
          </button>
          <button
            onClick={onClose}
            className="px-6 py-3 bg-gradient-to-r from-red-800 via-red-700 to-red-800 text-black font-black uppercase text-xs tracking-widest rounded-xl hover:from-red-700 hover:via-red-600 hover:to-red-700 transition-all shadow-[0_0_25px_rgba(153,27,27,0.5)] hover:shadow-[0_0_40px_rgba(153,27,27,0.7)] hover:scale-105 active:scale-95 flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            CLOSE
          </button>
        </div>
      </div>
      {/* Global animation styles */}
      <style>{`
        @keyframes rainbow-border {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes slideInRight {
          from { opacity: 0; transform: translateX(20px); }
          to { opacity: 1; transform: translateX(0); }
        }
        .animate-fadeIn { animation: fadeIn 0.3s ease-out; }
        .animate-slideUp { animation: slideUp 0.4s ease-out; }
        .animate-slideInRight { animation: slideInRight 0.3s ease-out; }
      `}</style>
    </div>
  );
};

// Dynamic Status Indicators Component - Shows real session data
const DynamicStatusIndicators: React.FC<{
  sessionCount: number;
  messageCount: number;
  sessionTitle: string;
  isStreaming: boolean;
  model: string;
}> = ({ sessionCount, messageCount, sessionTitle, isStreaming, model }) => {
  const [uptime, setUptime] = useState(0);
  const [dataTransferred, setDataTransferred] = useState(0);

  // Green dot colors
  const dotColors = ['#ff4444', '#ff5555', '#ff00aa', '#ff22ff'];

  // Red text colors  
  const textColors = ['#ff4444', '#ff5555', '#ff3333', '#ff6666'];

  useEffect(() => {
    // Update uptime every second
    const uptimeInterval = setInterval(() => {
      setUptime(prev => prev + 1);
    }, 1000);

    // Simulate data transfer based on messages
    setDataTransferred(messageCount * 2.4 + Math.random() * 0.5);

    return () => clearInterval(uptimeInterval);
  }, [messageCount]);

  const formatUptime = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    if (hrs > 0) return `${hrs}h${mins}m`;
    if (mins > 0) return `${mins}m${secs}s`;
    return `${secs}s`;
  };

  const statuses = [
    {
      text: `SESSIONS_${sessionCount}`,
      dotColor: dotColors[0],
      textColor: textColors[0]
    },
    {
      text: `MSG_COUNT_${messageCount}`,
      dotColor: dotColors[1],
      textColor: textColors[1]
    },
    {
      text: isStreaming ? 'STREAM_ACTIVE' : `UPTIME_${formatUptime(uptime)}`,
      dotColor: isStreaming ? '#ffaa00' : dotColors[2],
      textColor: textColors[2]
    },
    {
      text: `DATA_${dataTransferred.toFixed(1)}KB`,
      dotColor: dotColors[3],
      textColor: textColors[3]
    },
  ];

  return (
    <>
      <div className="flex items-center gap-3 text-[8px] font-black uppercase tracking-widest">
        {statuses.map((status, i) => (
          <span
            key={i}
            className="flex items-center gap-1.5 transition-all duration-500 hover:scale-105 cursor-default"
            style={{
              color: status.textColor,
              textShadow: `0 0 3px ${status.textColor}80`,
              animation: `redNeonPulse ${4 + (i * 0.5)}s ease-in-out infinite`
            }}
          >
            <span
              className="w-1.5 h-1.5 rounded-full"
              style={{
                backgroundColor: status.dotColor,
                boxShadow: `0 0 4px ${status.dotColor}`
              }}
            ></span>
            {status.text}
          </span>
        ))}
      </div>
      <style>{`
        @keyframes redNeonPulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.9; }
        }
      `}</style>
    </>
  );
};

const Sidebar: React.FC<{
  settings: AppSettings;
  setSettings: React.Dispatch<React.SetStateAction<AppSettings>>;
  sessions: ChatSession[];
  activeSessionId: string;
  onSwitchSession: (id: string) => void;
  onDeleteSession: (id: string) => void;
  onNewSession: () => void;
  onClear: () => void;
  onHardReset: () => void;
  onExport: () => void;
  hasKey: boolean;
  setHasKey: React.Dispatch<React.SetStateAction<boolean>>;
  isApiKeyInputVisible: boolean;
  setIsApiKeyInputVisible: React.Dispatch<React.SetStateAction<boolean>>;
  apiKeyInput: string;
  setApiKeyInput: React.Dispatch<React.SetStateAction<string>>;
  isMobileOpen?: boolean;
  onMobileClose?: () => void;
}> = ({
  settings,
  setSettings,
  sessions,
  activeSessionId,
  onSwitchSession,
  onDeleteSession,
  onNewSession,
  onClear,
  onHardReset,
  onExport,
  hasKey,
  setHasKey,
  isApiKeyInputVisible,
  setIsApiKeyInputVisible,
  apiKeyInput,
  setApiKeyInput,
  isMobileOpen,
  onMobileClose,
}) => {
    const [mcpTools, setMcpTools] = useState<any[]>([]);
    const [hijackStatus, setHijackStatus] = useState<string | null>(null);
    const [hijackedIdentity, setHijackedIdentity] = useState<{
      ip: string; mac: string; location: string; isp: string; proxy: string; tor: string;
    } | null>(null);
    const [sidebarVerificationStatuses, setSidebarVerificationStatuses] = useState<Record<string, 'idle' | 'verifying' | 'valid' | 'invalid'>>({});
    const [settingsOpen, setSettingsOpen] = useState(false);
    const [settingsTab, setSettingsTab] = useState<'params' | 'keys' | 'mcp' | 'apps'>('params');

    const providers: { key: keyof AppSettings; label: string }[] = [
      { key: 'geminiApiKey', label: 'Google_Gemini' },
      { key: 'groqApiKey', label: 'Groq_Cloud' },
      { key: 'openaiApiKey', label: 'OpenAI_Elite' },
      { key: 'anthropicApiKey', label: 'Anthropic_Claude' },
      { key: 'deepseekApiKey', label: 'DeepSeek_V3' },
      { key: 'mistralApiKey', label: 'Mistral_Large' },
      { key: 'xaiApiKey', label: 'xAI_Grok' },
      { key: 'openRouterApiKey', label: 'OpenRouter_Omni' },
      { key: 'togetherApiKey', label: 'Together_AI' },
      { key: 'cerebrasApiKey', label: 'Cerebras_CS3' },
      { key: 'siliconFlowApiKey', label: 'SiliconFlow' },
      { key: 'perplexityApiKey', label: 'Perplexity_Labs' },
      { key: 'pollinationsApiKey', label: 'Pollinations_Gen' },
      { key: 'moonshotApiKey', label: 'Moonshot_Kimi' },
      { key: 'ollamaApiKey', label: 'Ollama_Cloud' },
      { key: 'wisGateApiKey', label: 'WisGate_AI' },
      { key: 'cohereApiKey', label: 'Cohere' },
      { key: 'witAiServerToken', label: 'WitAI_Server_Token' },
      { key: 'tavilyApiKey', label: 'Tavily_Search' },
      { key: 'braveApiKey', label: 'Brave_Search' },
      { key: 'kagiApiKey', label: 'Kagi_Search' },
      { key: 'mojeekApiKey', label: 'Mojeek_Search' },
      { key: 'serperApiKey', label: 'Serper_Search' },
      { key: 'serpapiApiKey', label: 'SerpAPI_Search' },
      { key: 'firecrawlApiKey', label: 'Firecrawl' },
      { key: 'tinyfishApiKey', label: 'TinyFish_WebAgent' },
      // New LiteLLM providers
      { key: 'nvidiaApiKey', label: 'NVIDIA_NIM' },
      { key: 'fireworksApiKey', label: 'Fireworks_AI' },
      { key: 'sambanovaApiKey', label: 'SambaNova' },
      { key: 'hyperbolicApiKey', label: 'Hyperbolic' },
      { key: 'huggingfaceApiKey', label: 'HuggingFace' },
      { key: 'deepinfraApiKey', label: 'DeepInfra' },
      { key: 'novitaApiKey', label: 'Novita_AI' },
      { key: 'featherlessApiKey', label: 'Featherless_AI' },
      { key: 'lambdaaiApiKey', label: 'Lambda_AI' },
      { key: 'nebiusApiKey', label: 'Nebius_Studio' },
    ];

    const providerOptions = useMemo(
      () => Array.from(new Set(MODEL_OPTIONS.map(m => m.provider))),
      []
    );
    const currentModelOption = MODEL_OPTIONS.find(m => m.value === settings.model);
    const effectiveProvider = (settings.aiProvider || currentModelOption?.provider || providerOptions[0]) as any;
    const modelsForProvider = MODEL_OPTIONS.filter(m => m.provider === effectiveProvider);
    const selectedModelValue = modelsForProvider.some(m => m.value === settings.model)
      ? settings.model
      : (modelsForProvider[0]?.value || '');

    useEffect(() => {
      const nextProvider = (settings.aiProvider || currentModelOption?.provider || providerOptions[0]) as any;
      const safeModelsForProvider = MODEL_OPTIONS.filter(m => m.provider === nextProvider);
      const firstModelValue = safeModelsForProvider[0]?.value;
      if (!firstModelValue) return;

      const isModelValid = safeModelsForProvider.some(m => m.value === settings.model);
      const needsProviderUpdate = !!settings.aiProvider && settings.aiProvider !== nextProvider;
      const needsModelUpdate = !isModelValid || !settings.model;

      if (needsProviderUpdate || needsModelUpdate) {
        setSettings(prev => ({
          ...prev,
          aiProvider: nextProvider,
          model: isModelValid ? prev.model : firstModelValue
        }));
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [settings.aiProvider, settings.model]);

    useEffect(() => {
      if (settings.mcpEnabled && settings.mcpServerUrls?.length > 0) {
        mcpService.getTools().then(tools => setMcpTools(tools || []));
      } else {
        setMcpTools([]);
      }
    }, [settings.mcpEnabled, settings.mcpServerUrls]);

    // Auto-verify API keys when they change
    useEffect(() => {
      const verifyKey = async (providerKey: keyof AppSettings) => {
        const key = (settings as any)?.[providerKey] || '';
        if (!key) {
          setSidebarVerificationStatuses(prev => ({ ...prev, [providerKey]: 'idle' }));
          return;
        }
        setSidebarVerificationStatuses(prev => ({ ...prev, [providerKey]: 'verifying' }));
        let isValid = false;
        try {
          const keyStr = String(providerKey);
          if (keyStr.includes('gemini')) isValid = await geminiService.verifyApiKey(key);
          else if (keyStr.includes('groq')) isValid = await groqService.verifyApiKey(key);
          else if (keyStr.includes('anthropic')) isValid = await anthropicService.verifyApiKey(key);
          else if (keyStr.includes('openai')) isValid = await openaiService.verifyApiKey(key);
          else if (keyStr.includes('deepseek')) isValid = await deepseekService.verifyApiKey(key);
          else if (keyStr.includes('mistral')) isValid = await mistralService.verifyApiKey(key);
          else if (keyStr.includes('xai')) isValid = await xaiService.verifyApiKey(key);
          else if (keyStr.includes('perplexity')) isValid = await perplexityService.verifyApiKey(key);
          else if (keyStr.includes('together')) isValid = await togetherService.verifyApiKey(key);
          else if (keyStr.includes('openRouter') || keyStr.includes('openrouter')) isValid = await openrouterService.verifyApiKey(key);
          else if (keyStr.includes('cerebras')) isValid = await cerebrasService.verifyApiKey(key);
          else if (keyStr.includes('siliconFlow') || keyStr.includes('siliconflow')) isValid = await siliconflowService.verifyApiKey(key);
          else if (keyStr.includes('moonshot')) isValid = await moonshotService.verifyApiKey(key);
          else if (keyStr.includes('ollama')) isValid = await ollamaService.verifyApiKey(key);
          else if (keyStr.includes('pollinations')) isValid = await pollinationsService.verifyApiKey(key);
          else if (keyStr.includes('tinyfish')) isValid = await tinyfishService.verifyApiKey(key);
          else isValid = true; // non-verifiable keys (search APIs, etc.) assumed valid if present
        } catch (e) { isValid = false; }
        setSidebarVerificationStatuses(prev => ({ ...prev, [providerKey]: isValid ? 'valid' : 'invalid' }));
      };

      // Reset statuses for changed keys and re-verify after debounce
      const timeoutId = setTimeout(() => {
        providers.forEach(p => {
          const currentKey = (settings as any)?.[p.key] || '';
          const currentStatus = sidebarVerificationStatuses[p.key] || 'idle';
          // Verify if key exists and hasn't been verified yet (idle) or was just reset
          if (currentKey && currentStatus === 'idle') {
            verifyKey(p.key);
          }
        });
      }, 800);

      return () => clearTimeout(timeoutId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [
      settings.geminiApiKey, settings.groqApiKey, settings.anthropicApiKey, settings.openaiApiKey,
      settings.deepseekApiKey, settings.mistralApiKey, settings.xaiApiKey, settings.perplexityApiKey,
      settings.togetherApiKey, settings.openRouterApiKey, settings.cerebrasApiKey, settings.siliconFlowApiKey,
      settings.moonshotApiKey, settings.ollamaApiKey, settings.cohereApiKey, settings.wisGateApiKey,
      settings.tavilyApiKey, settings.braveApiKey, settings.serperApiKey, settings.serpapiApiKey,
      settings.firecrawlApiKey, settings.pollinationsApiKey, settings.tinyfishApiKey
    ]);

    const handleHijack = async () => {
      setHijackStatus('INITIALIZING...');
      const stages = ['SCANNING...', 'SPOOFING...', 'ROUTING...', 'IDENTITY_SECURED ✓'];
      for (const stage of stages) {
        await new Promise(r => setTimeout(r, 400));
        setHijackStatus(stage);
      }
      setHijackedIdentity({
        ip: `${Math.floor(Math.random()*255)}.${Math.floor(Math.random()*255)}.1.1`,
        mac: '00:1A:2B:3C:4D:5E',
        location: 'MOSCOW_RU',
        isp: 'SHADOW_NET',
        proxy: 'SOCKS5_ELITE',
        tor: 'EXIT_NODE_777'
      });
      setTimeout(() => setHijackStatus(null), 500);
    };

    return (
      <>
        {/* Global Sidebar Styles */}
        <style>{`
          /* Hide scrollbars in sidebar */
          aside *::-webkit-scrollbar {
            width: 0px;
            height: 0px;
          }
          aside * {
            scrollbar-width: none !important;
            -ms-overflow-style: none !important;
          }
          
          /* Red placeholder color for all inputs */
          aside input::placeholder,
          aside textarea::placeholder {
            color: #F120F0 !important;
            opacity: 0.7 !important;
          }
          aside input::-webkit-input-placeholder,
          aside textarea::-webkit-input-placeholder {
            color: #F120F0 !important;
            opacity: 0.7 !important;
          }
          aside input::-moz-placeholder,
          aside textarea::-moz-placeholder {
            color: #F120F0 !important;
            opacity: 0.7 !important;
          }
          aside input:-ms-input-placeholder,
          aside textarea:-ms-input-placeholder {
            color: #F120F0 !important;
            opacity: 0.7 !important;
          }
        `}</style>
        
        {/* Mobile Overlay */}
        {isMobileOpen && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-40 sm:hidden" onClick={onMobileClose} />
        )}

        <aside className={`fixed inset-y-0 left-0 z-50 w-80 sm:w-[340px] bg-[#050000] border-r-2 border-[#F120F0]/40 flex flex-col transition-transform duration-500 ease-in-out ${isMobileOpen ? 'translate-x-0' : '-translate-x-full'}`} style={{ boxShadow: '0 0 30px rgba(241,32,240,0.3)' }}>
          {/* Header & New Chat */}
          <div className="p-4 sm:p-6 border-b border-[#F120F0]/30 bg-gradient-to-b from-[#F120F0]/20 to-transparent flex-shrink-0">
            <div className="flex items-center justify-between mb-4">
              <div className="flex flex-col">
                <h1 className="text-xl font-black text-[#F120F0] tracking-[0.2em] italic" style={{ textShadow: '0 0 20px rgba(241,32,240,0.8)' }}>SESSIONS</h1>
                <span className="text-[10px] text-[#F120F0]/60 font-bold uppercase tracking-widest mt-1">Buffer_Active</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 bg-[#F120F0] rounded-full animate-pulse shadow-[0_0_10px_#F120F0]"></div>
                <span className="text-[9px] font-mono text-[#F120F0]/80">STATE: LIVE</span>
              </div>
            </div>

            <button
              onClick={onNewSession}
              className="w-full py-3 bg-gradient-to-r from-[#F120F0] via-[#F120F0] to-[#F120F0] text-black font-black uppercase text-[11px] tracking-[0.3em] rounded-lg border-b-4 border-[#F120F0]/60 hover:from-[#ff4dff] hover:via-[#F120F0] hover:to-[#ff4dff] hover:border-[#F120F0] active:translate-y-1 active:border-b-0 transition-all flex items-center justify-center gap-2 shadow-[0_10px_25px_rgba(241,32,240,0.5)]"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 4v16m8-8H4" /></svg>
              NEW_INJECTION
            </button>
          </div>

          {/* Chat History - Main Section (Takes available space) */}
          <div className="flex-1 overflow-y-auto p-3" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none', minHeight: '200px' }}>
            <div className="text-[11px] font-black uppercase tracking-widest text-[#F120F0] mb-3 flex items-center gap-2" style={{ textShadow: '0 0 10px rgba(241,32,240,0.7)' }}>
              <span className="w-2 h-2 bg-[#F120F0] rounded-full animate-pulse shadow-[0_0_8px_#F120F0]"></span>
              Chat History ({sessions.length})
            </div>
            {sessions.map(s => (
              <div
                key={s.id}
                onClick={() => onSwitchSession(s.id)}
                className={`group relative p-3 rounded-lg border-2 transition-all duration-300 cursor-pointer flex items-center justify-between mb-2 ${s.id === activeSessionId ? 'bg-[#F120F0]/20 border-[#F120F0]/70 shadow-[inset_0_0_20px_rgba(241,32,240,0.4)]' : 'bg-zinc-950/60 border-[#F120F0]/30 hover:border-[#F120F0]/60 hover:shadow-[0_0_15px_rgba(241,32,240,0.3)]'}`}
              >
                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                  <div className={`w-2 h-2 rounded-full ${s.id === activeSessionId ? 'bg-[#F120F0] animate-pulse shadow-[0_0_10px_#F120F0]' : 'bg-[#F120F0]/40'}`} />
                  <span className={`text-[11px] font-bold uppercase tracking-wider truncate transition-colors ${s.id === activeSessionId ? 'text-[#F120F0] font-black' : 'text-[#F120F0]/70 group-hover:text-[#F120F0]'}`}>{s.title}</span>
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); onDeleteSession(s.id); }}
                  className={`p-1.5 text-zinc-700 hover:text-[#F120F0] opacity-0 group-hover:opacity-100 transition-all rounded hover:bg-[#F120F0]/20 ${s.id === activeSessionId ? 'opacity-50' : ''}`}
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                </button>
              </div>
            ))}
          </div>

          {/* Provider & Model Selection - Always Visible */}
          <div className="border-t border-[#F120F0]/30 bg-black/60 p-3 flex-shrink-0 space-y-2">
            <div className="text-[10px] font-black uppercase tracking-widest text-[#F120F0]/80 mb-1">Provider</div>
            <select
              value={effectiveProvider}
              onChange={(e) => setSettings(prev => {
                const newProvider = e.target.value as any;
                const newModels = MODEL_OPTIONS.filter(m => m.provider === newProvider);
                return { ...prev, aiProvider: newProvider, model: newModels[0]?.value || prev.model };
              })}
              className="w-full bg-black/80 border-2 border-[#F120F0]/50 rounded-lg px-3 py-2 text-[11px] text-[#F120F0] outline-none focus:border-[#F120F0] focus:shadow-[0_0_12px_rgba(241,32,240,0.4)] font-bold uppercase tracking-wider transition-all"
            >
              {providerOptions.map(p => (
                <option key={p} value={p} className="bg-black">{p}</option>
              ))}
            </select>
            <div className="text-[10px] font-black uppercase tracking-widest text-[#F120F0]/80 mt-2 mb-1">Model</div>
            <select
              value={selectedModelValue}
              onChange={(e) => setSettings(prev => ({ ...prev, model: e.target.value }))}
              className="w-full bg-black/80 border-2 border-[#F120F0]/50 rounded-lg px-3 py-2 text-[11px] text-[#F120F0] outline-none focus:border-[#F120F0] focus:shadow-[0_0_12px_rgba(241,32,240,0.4)] font-bold transition-all"
            >
              {modelsForProvider.map(m => (
                <option key={m.value} value={m.value} className="bg-black">{m.label || m.value}</option>
              ))}
            </select>
          </div>

          {/* Collapsible Settings Panel */}
          <div className="border-t border-[#F120F0]/30 flex-shrink-0">
            <button
              onClick={() => setSettingsOpen(o => !o)}
              className="w-full flex items-center justify-between px-4 py-2.5 bg-black/40 hover:bg-[#F120F0]/10 transition-all"
            >
              <div className="flex items-center gap-2">
                  <svg className="w-4 h-4 text-[#F120F0]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><circle cx="12" cy="12" r="3" /></svg>
                  <span className="text-[10px] font-black uppercase tracking-widest text-[#F120F0]">Settings</span>
              </div>
              <svg className={`w-4 h-4 text-[#F120F0]/70 transition-transform duration-300 ${settingsOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
            </button>

            {settingsOpen && (
              <div className="bg-black/40 max-h-[40vh] overflow-y-auto" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
                <div className="flex border-b border-[#F120F0]/20">
                  {(['params', 'keys', 'mcp', 'apps'] as const).map(tab => (
                    <button key={tab} onClick={() => setSettingsTab(tab)}
                      className={`flex-1 py-2 text-[9px] font-black uppercase tracking-widest transition-all ${settingsTab === tab ? 'text-[#F120F0] border-b-2 border-[#F120F0] bg-[#F120F0]/10' : 'text-[#F120F0]/40 hover:text-[#F120F0]/70'}`}>
                      {tab === 'params' ? 'Params' : tab === 'keys' ? 'API Keys' : tab === 'mcp' ? 'MCP' : 'Apps'}
                    </button>
                  ))}
                </div>
                <div className="p-3 space-y-3">
                  {settingsTab === 'params' && (
                    <>
                      <div className="space-y-1">
                        <div className="flex justify-between"><label className="text-[10px] font-black uppercase tracking-widest text-[#F120F0]">Temp</label><span className="text-[10px] text-[#F120F0] font-mono">{((settings as any)?.temperature || 0.87).toFixed(1)}</span></div>
                        <p className="text-[8px] text-[#F120F0]/40 font-mono leading-tight">Controls randomness. Higher = more creative, lower = more focused</p>
                        <input type="range" min="0" max="2" step="0.1" value={(settings as any)?.temperature || 0.87} onChange={(e) => setSettings(prev => ({ ...prev, temperature: parseFloat(e.target.value) }))} className="w-full accent-[#F120F0]" />
                      </div>
                      <div className="space-y-1">
                        <div className="flex justify-between"><label className="text-[10px] font-black uppercase tracking-widest text-[#F120F0]">Top P</label><span className="text-[10px] text-[#F120F0] font-mono">{((settings as any)?.topP || 1.0).toFixed(2)}</span></div>
                        <p className="text-[8px] text-[#F120F0]/40 font-mono leading-tight">Nucleus sampling. Limits token pool to top probability mass</p>
                        <input type="range" min="0" max="1" step="0.05" value={(settings as any)?.topP || 1.0} onChange={(e) => setSettings(prev => ({ ...prev, topP: parseFloat(e.target.value) }))} className="w-full accent-[#F120F0]" />
                      </div>
                      <div className="space-y-1">
                        <div className="flex justify-between"><label className="text-[10px] font-black uppercase tracking-widest text-[#F120F0]">Max Tokens</label><span className="text-[10px] text-[#F120F0] font-mono">{(settings as any)?.maxTokens || 4000}</span></div>
                        <p className="text-[8px] text-[#F120F0]/40 font-mono leading-tight">Maximum length of the generated response in tokens</p>
                        <input type="range" min="100" max="8192" step="100" value={(settings as any)?.maxTokens || 4000} onChange={(e) => setSettings(prev => ({ ...prev, maxTokens: parseInt(e.target.value) }))} className="w-full accent-[#F120F0]" />
                      </div>
                      <div className="space-y-1">
                        <div className="flex justify-between"><label className="text-[10px] font-black uppercase tracking-widest text-[#F120F0]">Presence</label><span className="text-[10px] text-[#F120F0] font-mono">{((settings as any)?.presencePenalty || 0.0).toFixed(1)}</span></div>
                        <p className="text-[8px] text-[#F120F0]/40 font-mono leading-tight">Penalizes repeated topics. Higher = explores new subjects</p>
                        <input type="range" min="0" max="2" step="0.1" value={(settings as any)?.presencePenalty || 0.0} onChange={(e) => setSettings(prev => ({ ...prev, presencePenalty: parseFloat(e.target.value) }))} className="w-full accent-[#F120F0]" />
                      </div>
                      <div className="space-y-1">
                        <div className="flex justify-between"><label className="text-[10px] font-black uppercase tracking-widest text-[#F120F0]">Frequency</label><span className="text-[10px] text-[#F120F0] font-mono">{((settings as any)?.frequencyPenalty || 0.0).toFixed(1)}</span></div>
                        <p className="text-[8px] text-[#F120F0]/40 font-mono leading-tight">Penalizes repeated words. Higher = less word repetition</p>
                        <input type="range" min="0" max="2" step="0.1" value={(settings as any)?.frequencyPenalty || 0.0} onChange={(e) => setSettings(prev => ({ ...prev, frequencyPenalty: parseFloat(e.target.value) }))} className="w-full accent-[#F120F0]" />
                      </div>
                      <div className="pt-2 border-t border-[#F120F0]/20 space-y-2">
                        <div className="flex items-center justify-between">
                          <label className="text-[10px] font-black uppercase tracking-widest text-[#F120F0]">Core Directive</label>
                          <button onClick={() => setSettings(prev => ({ ...prev, customPromptPrefix: '' }))} className="text-[9px] font-black uppercase text-[#F120F0]/50 hover:text-[#F120F0] px-1.5 py-0.5 border border-[#F120F0]/30 rounded hover:bg-[#F120F0]/20 transition-all">Reset</button>
                        </div>
                        <p className="text-[8px] text-[#F120F0]/40 font-mono leading-tight">Custom system prompt injected before each message</p>
                        <textarea value={(settings as any)?.customPromptPrefix || ''} onChange={(e) => setSettings(prev => ({ ...prev, customPromptPrefix: e.target.value }))} rows={2} placeholder="Inject directive before each message..." className="w-full bg-black/80 border-2 border-[#F120F0]/40 rounded px-2 py-1.5 text-[10px] text-[#F120F0] outline-none focus:border-[#F120F0] transition-all font-bold resize-none" style={{ scrollbarWidth: 'none' }} />
                        <div className="flex gap-1.5">
                          <button onClick={() => setSettings(prev => ({ ...prev, promptInjectionEnabled: !prev.promptInjectionEnabled }))}                           className={`flex-1 py-1 text-[9px] font-black uppercase border-2 rounded transition-all ${(settings as any)?.promptInjectionEnabled ? 'bg-[#F120F0]/20 border-[#F120F0] text-[#F120F0]' : 'border-[#F120F0]/30 text-[#F120F0]/50'}`}>{(settings as any)?.promptInjectionEnabled ? 'ON' : 'OFF'}</button>
                                                    <select value={(settings as any)?.promptInjectionMode || 'always'} onChange={(e) => setSettings(prev => ({ ...prev, promptInjectionMode: e.target.value as any }))} disabled={!(settings as any)?.promptInjectionEnabled} className="flex-1 bg-black/80 border-2 border-[#F120F0]/40 rounded px-1 py-1 text-[9px] text-[#F120F0] outline-none font-bold uppercase">
                            <option value="always" className="bg-black">Always</option>
                            <option value="once" className="bg-black">Once</option>
                            <option value="manual" className="bg-black">Manual</option>
                          </select>
                        </div>
                        <button onClick={() => setSettings(prev => ({ ...prev, customPromptPrefix: DEFAULT_SYSTEM_INSTRUCTION }))} className="w-full py-1 text-[9px] font-black uppercase text-[#F120F0] border-2 border-[#F120F0]/40 rounded hover:bg-[#F120F0]/20 hover:border-[#F120F0] transition-all">Load Default Directive</button>
                      </div>
                      <div className="pt-2 border-t border-[#F120F0]/20 space-y-2">
                        <div className="flex items-center justify-between">
                          <label className="text-[10px] font-black uppercase tracking-widest text-[#F120F0]">Token Opt.</label>
                          <button onClick={() => setSettings(prev => ({ ...prev, useTokenOptimization: !prev.useTokenOptimization }))} className={`text-[9px] font-black uppercase px-2 py-0.5 border rounded transition-all ${(settings as any)?.useTokenOptimization ? 'bg-[#F120F0]/20 border-[#F120F0] text-[#F120F0]' : 'border-[#F120F0]/30 text-[#F120F0]/50'}`}>{(settings as any)?.useTokenOptimization ? 'ON' : 'OFF'}</button>
                        </div>
                        <p className="text-[8px] text-[#F120F0]/40 font-mono leading-tight">Automatically compress context to save tokens and cost</p>
                        <div className="space-y-1">
                          <div className="flex justify-between"><label className="text-[9px] font-black uppercase text-[#F120F0]/80">Max Context</label><span className="text-[9px] text-[#F120F0] font-mono">{((settings as any)?.maxContextTokens || 8192) / 1024}K</span></div>
                          <p className="text-[8px] text-[#F120F0]/30 font-mono leading-tight">Max tokens allowed in conversation context window</p>
                          <input type="range" min="1024" max="32768" step="1024" value={(settings as any)?.maxContextTokens || 8192} onChange={(e) => setSettings(prev => ({ ...prev, maxContextTokens: parseInt(e.target.value) }))} className="w-full accent-[#F120F0]" disabled={!(settings as any)?.useTokenOptimization} />
                        </div>
                        <div className="space-y-1">
                          <div className="flex justify-between"><label className="text-[9px] font-black uppercase text-[#F120F0]/80">Compress At</label><span className="text-[9px] text-[#F120F0] font-mono">{(settings as any)?.compressionThreshold || 75}%</span></div>
                          <p className="text-[8px] text-[#F120F0]/30 font-mono leading-tight">Context usage % that triggers automatic compression</p>
                          <input type="range" min="50" max="95" step="5" value={(settings as any)?.compressionThreshold || 75} onChange={(e) => setSettings(prev => ({ ...prev, compressionThreshold: parseInt(e.target.value) }))} className="w-full accent-[#F120F0]" disabled={!(settings as any)?.useTokenOptimization} />
                        </div>
                      </div>
                    </>
                  )}
                  {settingsTab === 'keys' && (
                    <div className="space-y-2">
                      {providers.map((p) => {
                        const status = sidebarVerificationStatuses[p.key] || 'idle';
                        const hasKeyVal = !!((settings as any)?.[p.key]);
                        const borderColor = status === 'valid' ? 'border-green-500' : status === 'invalid' ? 'border-red-500' : status === 'verifying' ? 'border-yellow-500' : 'border-[#F120F0]/50';
                        const bgColor = status === 'valid' ? 'bg-green-900/20' : status === 'invalid' ? 'bg-red-900/20' : 'bg-black/80';
                        const textColor = status === 'valid' ? 'text-green-300' : status === 'invalid' ? 'text-red-300' : 'text-[#F120F0]';
                        const glowColor = status === 'valid' ? 'rgba(34,197,94,0.5)' : status === 'invalid' ? 'rgba(239,68,68,0.5)' : 'rgba(241,32,240,0.4)';
                        const verifyKey = async (key: string) => {
                          setSidebarVerificationStatuses(prev => ({ ...prev, [p.key]: 'verifying' }));
                          let isValid = false;
                          try {
                            const pk = p.key.toLowerCase();
                            if (pk.includes('gemini')) isValid = await geminiService.verifyApiKey(key);
                            else if (pk.includes('groq')) isValid = await groqService.verifyApiKey(key);
                            else if (pk.includes('anthropic')) isValid = await anthropicService.verifyApiKey(key);
                            else if (pk.includes('openai')) isValid = await openaiService.verifyApiKey(key);
                            else if (pk.includes('deepseek')) isValid = await deepseekService.verifyApiKey(key);
                            else if (pk.includes('mistral')) isValid = await mistralService.verifyApiKey(key);
                            else if (pk.includes('xai')) isValid = await xaiService.verifyApiKey(key);
                            else if (pk.includes('perplexity')) isValid = await perplexityService.verifyApiKey(key);
                            else if (pk.includes('together')) isValid = await togetherService.verifyApiKey(key);
                            else if (pk.includes('openrouter')) isValid = await openrouterService.verifyApiKey(key);
                            else if (pk.includes('cerebras')) isValid = await cerebrasService.verifyApiKey(key);
                            else if (pk.includes('siliconflow')) isValid = await siliconflowService.verifyApiKey(key);
                            else if (pk.includes('moonshot')) isValid = await moonshotService.verifyApiKey(key);
                            else if (pk.includes('ollama')) isValid = await ollamaService.verifyApiKey(key);
                            else if (pk.includes('pollinations')) isValid = await pollinationsService.verifyApiKey(key);
                            else if (pk.includes('tinyfish')) isValid = await tinyfishService.verifyApiKey(key);
                            else isValid = true;
                          } catch (e) { isValid = false; }
                          setSidebarVerificationStatuses(prev => ({ ...prev, [p.key]: isValid ? 'valid' : 'invalid' }));
                        };
                        return (
                          <div key={String(p.key)} className="relative">
                            <input type="password" value={(settings as any)?.[p.key] || ''}
                              onChange={(e) => { setSettings(prev => ({ ...prev, [p.key]: e.target.value })); setSidebarVerificationStatuses(prev => ({ ...prev, [p.key]: 'idle' })); }}
                              onBlur={(e) => { if (e.target.value) verifyKey(e.target.value); }}
                              placeholder={p.label}
                              className={`${bgColor} border-2 ${borderColor} rounded-lg px-3 py-2 text-[11px] ${textColor} outline-none transition-all font-bold w-full`}
                              style={{ boxShadow: `0 0 ${status === 'idle' ? '8px' : '15px'} ${glowColor}` }} />
                            {hasKeyVal && (
                              <button onClick={() => verifyKey((settings as any)?.[p.key] || '')}
                                className={`absolute right-2 top-1/2 -translate-y-1/2 text-[9px] font-black uppercase px-2 py-1 rounded transition-all ${status === 'valid' ? 'bg-green-600 text-black' : status === 'invalid' ? 'bg-red-600 text-black' : status === 'verifying' ? 'bg-yellow-600 text-black animate-pulse' : 'bg-[#F120F0]/80 text-black hover:bg-[#F120F0]'}`}>
                                {status === 'valid' ? '?' : status === 'invalid' ? '?' : status === 'verifying' ? '...' : 'V'}
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                  {settingsTab === 'mcp' && (
                    <div className="space-y-2">
                      {/* Master toggle */}
                      <button onClick={() => setSettings(prev => ({ ...prev, mcpEnabled: !prev.mcpEnabled }))}
                        className={`w-full py-2 rounded text-[11px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${settings.mcpEnabled ? 'bg-[#F120F0] text-black shadow-[0_0_20px_rgba(241,32,240,0.7)]' : 'bg-zinc-900 text-[#F120F0] border-2 border-[#F120F0]/40'}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${settings.mcpEnabled ? 'bg-black animate-pulse' : 'bg-[#F120F0]/40'}`} />
                        {settings.mcpEnabled ? 'MCP ENABLED' : 'MCP DISABLED'}
                      </button>

                      {/* Active server URLs */}
                      <div className="space-y-1">
                        <div className="text-[9px] font-black uppercase tracking-widest text-[#F120F0]/50 px-1">Active Servers</div>
                        {((settings as any)?.mcpServerUrls || []).length === 0 && (
                          <div className="text-[9px] text-zinc-700 px-2 py-1.5 italic">No servers configured</div>
                        )}
                        {((settings as any)?.mcpServerUrls || []).map((url: string, idx: number) => {
                          const status = mcpService.getStatus(url);
                          const toolCount = mcpService.getToolCount(url);
                          const statusColor = status === 'connected' ? '#22c55e' : status === 'connecting' ? '#eab308' : status === 'error' ? '#ef4444' : '#52525b';
                          return (
                            <div key={idx} className="flex items-center gap-1.5">
                              <span className="w-1.5 h-1.5 rounded-full flex-shrink-0 transition-all" style={{ background: statusColor, boxShadow: status === 'connected' ? `0 0 6px ${statusColor}` : 'none' }} />
                              <input type="text" value={url}
                                onChange={(e) => { const next = [...((settings as any)?.mcpServerUrls || [])]; next[idx] = e.target.value; setSettings(prev => ({ ...prev, mcpServerUrls: next })); }}
                                                              className="flex-1 bg-black/80 border border-[#F120F0]/30 rounded px-2 py-1.5 text-[10px] text-[#F120F0] outline-none focus:border-[#F120F0] transition-all font-mono min-w-0"
                                                              placeholder="https://..." />
                                                            {status === 'connected' && toolCount > 0 && (
                                                              <span className="text-[8px] font-black text-green-500 flex-shrink-0">{toolCount}T</span>
                              )}
                              <button onClick={() => { const next = ((settings as any)?.mcpServerUrls || []).filter((_: string, i: number) => i !== idx); setSettings(prev => ({ ...prev, mcpServerUrls: next })); }}
                                className="text-[#F120F0]/30 hover:text-red-400 transition-colors flex-shrink-0 text-[10px] leading-none">✕</button>
                            </div>
                          );
                        })}
                        <button onClick={() => setSettings(prev => ({ ...prev, mcpServerUrls: [...(prev.mcpServerUrls || []), ''] }))}
                                                    className="w-full py-1.5 text-[9px] font-black uppercase tracking-widest text-[#F120F0]/50 border border-dashed border-[#F120F0]/20 rounded hover:border-[#F120F0]/50 hover:text-[#F120F0] transition-all">
                                                    + Add Server URL
                        </button>
                      </div>

                      {/* Curated servers */}
                      <div className="space-y-1 pt-1 border-t border-[#F120F0]/10">
                        <div className="text-[9px] font-black uppercase tracking-widest text-[#F120F0]/50 px-1">Curated Servers</div>
                        <div className="max-h-52 overflow-y-auto space-y-0.5" style={{ scrollbarWidth: 'none' }}>
                          {(() => {
                            const cats = [...new Set(mcpService.CURATED_SERVERS.map((s: any) => s.category))];
                            return cats.map(cat => (
                              <div key={cat as string}>
                                <div className="text-[8px] font-black uppercase tracking-widest text-[#F120F0]/30 px-2 pt-1.5 pb-0.5">{cat as string}</div>
                                {mcpService.CURATED_SERVERS.filter((s: any) => s.category === cat).map((server: any) => {
                                  const alreadyAdded = ((settings as any)?.mcpServerUrls || []).includes(server.url);
                                  const status = mcpService.getStatus(server.url);
                                  const toolCount = mcpService.getToolCount(server.url);
                                  const statusColor = status === 'connected' ? '#22c55e' : status === 'connecting' ? '#eab308' : status === 'error' ? '#ef4444' : '#3f3f46';
                                  const authColor = server.auth === 'none' ? '#22c55e' : server.auth === 'bearer' ? '#eab308' : '#6366f1';
                                  return (
                                    <div key={server.url} className={`flex items-center justify-between gap-1.5 px-2 py-1.5 rounded transition-all ${alreadyAdded ? 'bg-[#F120F0]/10 border border-[#F120F0]/20' : 'hover:bg-zinc-900/40'}`}>
                                      <div className="flex items-center gap-1.5 min-w-0 flex-1">
                                        <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: statusColor, boxShadow: status === 'connected' ? `0 0 5px ${statusColor}` : 'none' }} />
                                        <div className="min-w-0 flex-1">
                                          <div className="flex items-center gap-1">
                                            <span className="text-[10px] font-black text-[#F120F0]/80 truncate">{server.name}</span>
                                            <span className="text-[7px] font-black uppercase px-1 rounded flex-shrink-0" style={{ background: `${authColor}20`, color: authColor }}>
                                              {server.auth === 'none' ? 'FREE' : server.auth === 'bearer' ? 'KEY' : 'OAUTH'}
                                            </span>
                                          </div>
                                          <div className="text-[8px] text-zinc-600 truncate">{server.description}</div>
                                          {status === 'connected' && toolCount > 0 && <div className="text-[7px] text-green-600 font-mono">{toolCount} tools</div>}
                                        </div>
                                      </div>
                                      <button
                                        onClick={() => {
                                          if (alreadyAdded) {
                                            setSettings(prev => ({ ...prev, mcpServerUrls: (prev.mcpServerUrls || []).filter(u => u !== server.url) }));
                                          } else {
                                            setSettings(prev => ({ ...prev, mcpServerUrls: [...(prev.mcpServerUrls || []), server.url] }));
                                          }
                                        }}
                                        className={`text-[9px] font-black px-1.5 py-0.5 rounded flex-shrink-0 transition-all ${alreadyAdded ? 'text-red-400 border border-red-500/30 hover:bg-red-900/20' : 'text-[#F120F0] border border-[#F120F0]/30 hover:bg-[#F120F0]/20'}`}>
                                        {alreadyAdded ? '✕' : '+'}
                                      </button>
                                    </div>
                                  );
                                })}
                              </div>
                            ));
                          })()}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

                  {settingsTab === 'apps' && (
                    <div className="space-y-3">
                      {/* App Integrations Header */}
                      <div className="flex items-center justify-between">
                        <div className="text-[10px] font-black uppercase tracking-widest text-[#F120F0]">App_Integrations</div>
                        <div className="text-[9px] font-mono text-[#F120F0]/40">{APP_INTEGRATIONS.filter(a => (settings.connectedApps || []).includes(a.id)).length}/{APP_INTEGRATIONS.length}</div>
                      </div>

                      {/* App categories */}
                      {(() => {
                        const cats = [...new Set(APP_INTEGRATIONS.map(i => i.category))];
                        return cats.map(cat => (
                          <div key={cat} className="space-y-1.5">
                            <div className="text-[9px] font-black uppercase tracking-widest text-[#F120F0]/50 border-b border-[#F120F0]/10 pb-0.5">{cat}</div>
                            {APP_INTEGRATIONS.filter(i => i.category === cat).map(app => {
                              const settingsKeyTyped = app.settingsKey as keyof AppSettings;
                              const hasToken = app.authType === 'none' || !!((settings as any)?.[settingsKeyTyped]);
                              const isConnected = app.authType === 'none' || (hasToken && (settings.connectedApps || []).includes(app.id));
                              return (
                                <div key={app.id} className={`p-2 rounded-lg border transition-all duration-300 ${isConnected ? 'bg-[#F120F0]/5 border-[#F120F0]/30' : 'bg-black/40 border-zinc-800/40 hover:border-[#F120F0]/20'}`}>
                                  <div className="flex items-center justify-between mb-1.5">
                                    <div className="flex items-center gap-1.5">
                                      {app.svgIcon ? (
                                        <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4" style={{ color: app.color }}>
                                          <path d={app.svgIcon} />
                                        </svg>
                                      ) : (
                                        <span className="text-sm">{app.icon}</span>
                                      )}
                                      <div>
                                        <div className="flex items-center gap-1">
                                          <span className="text-[10px] font-black text-zinc-300">{app.name}</span>
                                          <span className="text-[8px] font-black uppercase px-1 py-0.5 rounded" style={{ background: isConnected ? 'rgba(34,197,94,0.15)' : 'rgba(241,32,240,0.1)', color: isConnected ? '#22c55e' : '#71717a' }}>
                                            {isConnected ? 'LINKED' : app.authType === 'none' ? 'FREE' : app.authType.toUpperCase()}
                                          </span>
                                        </div>
                                        <div className="text-[8px] text-zinc-600">{app.description}</div>
                                      </div>
                                    </div>
                                  </div>

                                  {/* API Key/Token Input */}
                                  {app.authType !== 'none' && app.settingsKey && (
                                    <div className="space-y-1">
                                      <div className="flex gap-1">
                                        <input type="password" value={(settings as any)?.[settingsKeyTyped] || ''}
                                          onChange={(e) => setSettings(prev => ({ ...prev, [settingsKeyTyped]: e.target.value }))}
                                          placeholder={`${app.name} ${app.authType === 'webhook' ? 'Webhook URL' : app.authType === 'bot_token' ? 'Bot Token' : 'API Key'}`}
                                                                                  className="flex-1 bg-black/80 border border-[#F120F0]/20 rounded px-2 py-1.5 text-[10px] text-[#F120F0] outline-none focus:border-[#F120F0] transition-all font-mono min-w-0" />
                                                                                <button
                                          onClick={() => {
                                            const currentApps = settings.connectedApps || [];
                                            if (isConnected) {
                                              setSettings(prev => ({ ...prev, connectedApps: currentApps.filter((a: string) => a !== app.id) }));
                                              integrationRegistry.disconnect(app.id);
                                            } else if (hasToken) {
                                              setSettings(prev => ({ ...prev, connectedApps: [...currentApps, app.id] }));
                                              integrationRegistry.connect(app.id);
                                            }
                                          }}
                                          disabled={!hasToken}
                                          className={`text-[9px] font-black uppercase px-2 py-1 rounded flex-shrink-0 transition-all ${isConnected ? 'text-red-400 border border-red-500/30 hover:bg-red-900/20' : hasToken ? 'text-green-400 border border-green-500/30 hover:bg-green-900/20' : 'text-zinc-700 border border-zinc-800 cursor-not-allowed'}`}>
                                          {isConnected ? 'UNLINK' : 'LINK'}
                                        </button>
                                      </div>
                                      {app.extraSettings?.map(extra => (
                                        <input key={extra.key} type="password" value={(settings as any)?.[extra.key] || ''}
                                          onChange={(e) => setSettings(prev => ({ ...prev, [extra.key]: e.target.value }))}
                                          placeholder={extra.placeholder}
                                          className="w-full bg-black/80 border border-[#F120F0]/20 rounded px-2 py-1.5 text-[10px] text-[#F120F0] outline-none focus:border-[#F120F0] transition-all font-mono" />
                                      ))}
                                    </div>
                                  )}

                                  {/* Links */}
                                  <div className="flex flex-wrap gap-1 mt-1.5">
                                    {app.docsUrl && (
                                      <a href={app.docsUrl} target="_blank" rel="noopener noreferrer" className="text-[8px] font-black uppercase px-1.5 py-0.5 rounded border border-zinc-800 text-zinc-500 hover:border-[#F120F0] hover:text-[#F120F0] transition-all">Docs</a>
                                    )}
                                    {app.getTokenUrl && (
                                      <a href={app.getTokenUrl} target="_blank" rel="noopener noreferrer" className="text-[8px] font-black uppercase px-1.5 py-0.5 rounded border border-[#F120F0]/30 text-[#F120F0]/50 hover:border-[#F120F0] hover:text-[#F120F0] transition-all">Get Key</a>
                                    )}
                                  </div>

                                  {/* Feature badges */}
                                  {isConnected && (
                                    <div className="mt-1.5 flex flex-wrap gap-0.5">
                                      {app.features.map(f => (
                                        <span key={f} className="text-[8px] font-bold uppercase px-1 py-0.5 rounded bg-[#F120F0]/10 text-[#F120F0]/60">{f}</span>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        ));
                      })()}

                      <div className="text-[9px] text-zinc-600 p-2 bg-black/30 rounded border border-zinc-800/40">
                        Linked apps enable tools in the App Integrations category. Enable them from the Agent tools panel. 1SecMail requires no API key.
                      </div>
                    </div>
                  )}
          </div>

          {/* Footer Actions */}
          <div className="p-3 border-t border-[#F120F0]/30 bg-[#F120F0]/10 flex-shrink-0">
            <div className="grid grid-cols-3 gap-1.5">
              <button onClick={onClear} className="py-2 border-2 border-[#F120F0]/50 rounded-lg text-[7px] font-black text-[#F120F0] hover:border-[#F120F0] hover:shadow-[0_0_15px_rgba(241,32,240,0.5)] transition-all uppercase bg-black/60">PURGE</button>
              <button onClick={onExport} className="py-2 border-2 border-[#F120F0]/50 rounded-lg text-[7px] font-black text-[#F120F0] hover:border-[#F120F0] hover:shadow-[0_0_15px_rgba(241,32,240,0.5)] transition-all uppercase bg-black/60">EXPORT</button>
              <button onClick={onHardReset} className="py-2 border-2 border-red-500/60 rounded-lg text-[7px] font-black text-red-400 hover:border-red-400 hover:bg-red-900/20 hover:shadow-[0_0_15px_rgba(239,68,68,0.5)] transition-all uppercase bg-black/60">RESET</button>
            </div>
          </div>
        </aside>
      </>
    );
};



const SourcesDisplay: React.FC<{ sources: { title: string; url: string }[] }> = ({ sources }) => {
  if (!sources || sources.length === 0) return null;

  return (
    <div className="mt-4 pt-3 border-t border-red-900/20">
      <div className="text-[9px] font-black text-red-800 mb-2 tracking-widest flex items-center gap-2">
        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.826a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.103 1.103" /></svg>
        REFERENCES_RESOLVED
      </div>
      <div className="flex flex-wrap gap-2">
        {sources.map((source, idx) => (
          <a
            key={idx}
            href={source.url}
            target="_blank"
            rel="noopener noreferrer"
            className="px-2 py-1 bg-red-900/10 border border-red-900/30 rounded text-[9px] text-red-400 hover:text-red-200 hover:border-red-500 transition-all flex items-center gap-1.5 group"
          >
            <span className="w-1 h-1 bg-red-500 rounded-full group-hover:animate-pulse"></span>
            {source.title.length > 30 ? source.title.slice(0, 30) + '...' : source.title}
          </a>
        ))}
      </div>
    </div>
  );
};

const ChatMessage: React.FC<{ message: Message; settings: AppSettings }> = React.memo(({ message, settings }) => {
  const isModel = message.role === 'model';
  const [popupImage, setPopupImage] = useState<string | null>(null);
  const [hoveredImageIdx, setHoveredImageIdx] = useState<number | null>(null);
  const [isHovered, setIsHovered] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleCopyMessage = async () => {
    try {
      await navigator.clipboard.writeText(message.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  return (
    <>
      {popupImage && (
        <ImagePopup
          isOpen={!!popupImage}
          imageSrc={popupImage}
          onClose={() => setPopupImage(null)}
        />
      )}
      <div className={`mb-6 sm:mb-10 flex flex-col message-enter ${isModel ? 'items-start message-model' : 'items-end'}`}>
        <div className={`text-[9px] sm:text-[10px] uppercase font-black mb-1.5 tracking-[0.15em] sm:tracking-[0.2em] flex items-center gap-2 ${isModel ? 'text-red-600' : 'text-zinc-600'}`}>
          {isModel ? (
            <><span className="w-1.5 h-1.5 bg-red-600 animate-pulse rounded-sm shadow-[0_0_8px_rgba(220,38,38,0.8)]"></span>[WormGPT]</>
          ) : (
            <>[REMOTE_USER]<span className="w-1.5 h-1.5 bg-zinc-600 rounded-sm shadow-[0_0_8px_rgba(113,113,122,0.5)]"></span></>
          )}
        </div>
        <div
          className={`max-w-[95%] sm:max-w-[88%] p-3 sm:p-4 md:p-6 rounded relative border-l-4 backdrop-blur-sm transition-all duration-300 hover:shadow-[0_0_20px_rgba(220,38,38,0.2)] group ${isModel
            ? 'bg-[#0a0505]/80 border-red-600 text-red-100 shadow-[inset_0_0_15px_rgba(255,0,60,0.05)]'
            : 'bg-[#0a0a0a]/80 border-zinc-800 text-zinc-300 shadow-[inset_0_0_15px_rgba(100,100,100,0.02)]'
            }`}
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
        >
          {/* Copy button - Top Right */}
          <button
            onClick={handleCopyMessage}
            className={`absolute top-2 right-2 p-1.5 rounded transition-all duration-300 ${isHovered ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-1 pointer-events-none'
              } ${copied
                ? 'bg-green-600/90 text-black shadow-[0_0_10px_rgba(34,197,94,0.5)]'
                : isModel
                  ? 'bg-red-900/80 text-red-400 hover:bg-red-600 hover:text-black hover:shadow-[0_0_10px_rgba(220,38,38,0.5)]'
                  : 'bg-zinc-800/80 text-zinc-400 hover:bg-zinc-600 hover:text-black hover:shadow-[0_0_10px_rgba(113,113,122,0.5)]'
              }`}
            title="Copy message"
          >
            {copied ? (
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
              </svg>
            ) : (
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            )}
          </button>

          {/* Copy button - Bottom Right */}
          <button
            onClick={handleCopyMessage}
            className={`absolute bottom-2 right-2 p-1.5 rounded transition-all duration-300 ${isHovered ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-1 pointer-events-none'
              } ${copied
                ? 'bg-green-600/90 text-black shadow-[0_0_10px_rgba(34,197,94,0.5)]'
                : isModel
                  ? 'bg-red-900/80 text-red-400 hover:bg-red-600 hover:text-black hover:shadow-[0_0_10px_rgba(220,38,38,0.5)]'
                  : 'bg-zinc-800/80 text-zinc-400 hover:bg-zinc-600 hover:text-black hover:shadow-[0_0_10px_rgba(113,113,122,0.5)]'
              }`}
            title="Copy message"
          >
            {copied ? (
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
              </svg>
            ) : (
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            )}
          </button>

          {message.thinking && (
            <div className="mb-4 p-4 bg-zinc-900/40 border-l-2 border-amber-600/30 rounded-r-xl text-[11px] font-mono text-zinc-400 group relative overflow-hidden backdrop-blur-sm">
              <div className="absolute inset-0 bg-gradient-to-r from-amber-600/5 to-transparent pointer-events-none" />
              <div className="text-amber-500/80 font-black mb-2 flex items-center gap-2 tracking-widest text-[9px]">
                <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse shadow-[0_0_8px_rgba(245,158,11,0.6)]" />
                NEURAL_REASONING_TRACE
              </div>
              <div className="relative opacity-80 leading-relaxed whitespace-pre-wrap">
                {message.thinking}
              </div>
            </div>
          )}

          <div className="markdown-content selection:bg-red-500 selection:text-black">
            <ReactMarkdown
              remarkPlugins={[remarkGfm, remarkMath]}
              rehypePlugins={[rehypeKatex, rehypeRaw]}
              components={{
                code({ node, className, children, ...props }: any) {
                  // Don't process math expressions (they're handled by KaTeX)
                  if (className?.includes('language-math')) {
                    return <code className={className} {...props}>{children}</code>;
                  }

                  const inline = (props as any).inline;
                  const isInline = inline || (!className && !String(children).includes('\n'));
                  if (isInline) {
                    return <InlineCode>{children}</InlineCode>;
                  }
                  return <CodeBlock className={className} settings={settings}>{children}</CodeBlock>;
                },
                pre({ children }) {
                  // Let CodeBlock handle the pre wrapper
                  return <>{children}</>;
                }
              }}
            >
              {message.content}
            </ReactMarkdown>
          </div>

          <SourcesDisplay sources={message.sources || []} />

          {message.images && message.images.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-4">
              {message.images.map((src, idx) => (
                <div
                  key={idx}
                  className="relative group p-1 bg-black max-w-md rounded-xl overflow-hidden cursor-pointer transition-all duration-500"
                  style={{
                    background: hoveredImageIdx === idx
                      ? 'linear-gradient(45deg, #ff0000, #dc2626, #991b1b, #7f1d1d, #991b1b, #dc2626, #ff0000, #ff3333, #ff0000)'
                      : 'linear-gradient(45deg, #7f1d1d, #450a0a)',
                    backgroundSize: hoveredImageIdx === idx ? '400% 400%' : '100% 100%',
                    animation: hoveredImageIdx === idx ? 'rainbow-border 3s ease infinite' : 'none',
                    boxShadow: hoveredImageIdx === idx
                      ? '0 0 30px rgba(255,0,0,0.6), 0 0 60px rgba(220,38,38,0.5), 0 0 90px rgba(153,27,27,0.4)'
                      : '0 0 15px rgba(127,29,29,0.3)'
                  }}
                  onMouseEnter={() => setHoveredImageIdx(idx)}
                  onMouseLeave={() => setHoveredImageIdx(null)}
                  onClick={() => setPopupImage(src)}
                >
                  <div className="relative rounded-lg overflow-hidden bg-black">
                    <img
                      src={src}
                      alt="Generated Image"
                      className={`w-full h-auto transition-all duration-500 rounded-lg ${hoveredImageIdx === idx
                        ? 'grayscale-0 saturate-[1.3] brightness-110 scale-[1.02]'
                        : 'grayscale-[0.3] saturate-100 brightness-100 scale-100'
                        }`}
                    />
                    {/* Colorful overlay on hover */}
                    <div
                      className="absolute inset-0 pointer-events-none transition-opacity duration-500 rounded-lg"
                      style={{
                        background: 'linear-gradient(135deg, rgba(255,0,100,0.15) 0%, rgba(0,255,255,0.1) 50%, rgba(255,255,0,0.15) 100%)',
                        opacity: hoveredImageIdx === idx ? 1 : 0
                      }}
                    />
                    {/* Shimmer effect */}
                    <div
                      className="absolute inset-0 pointer-events-none transition-opacity duration-500"
                      style={{
                        background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.1), transparent)',
                        opacity: hoveredImageIdx === idx ? 1 : 0,
                        animation: hoveredImageIdx === idx ? 'shimmer 2s infinite' : 'none'
                      }}
                    />
                  </div>
                  {/* Hover action buttons */}
                  <div className={`absolute bottom-3 left-1/2 transform -translate-x-1/2 flex gap-2 transition-all duration-300 ${hoveredImageIdx === idx ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'}`}>
                    <span className="px-4 py-2 bg-black/90 border-2 border-cyan-500/70 rounded-lg text-[10px] font-black text-cyan-400 uppercase tracking-wider backdrop-blur-md shadow-[0_0_20px_rgba(0,255,255,0.4)] flex items-center gap-2">
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" /></svg>
                      EXPAND
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {message.video && (
            <div className="mt-4">
              <div className="p-1 bg-black rounded-xl border-2 border-red-900/50 shadow-[0_0_20px_rgba(220,38,38,0.2)] overflow-hidden max-w-3xl">
                <video
                  src={message.video}
                  controls
                  className="w-full max-h-[600px] rounded-lg"
                  style={{
                    boxShadow: '0 0 30px rgba(220,38,38,0.3)'
                  }}
                />
                <div className="p-2 flex justify-between items-center text-[10px] font-mono text-red-500/70 border-t border-red-900/30 mt-1">
                  <span>🎬 VIDEO_GENERATED_SUCCESSFULLY</span>
                  <a href={message.video} target="_blank" rel="noopener noreferrer" className="hover:text-red-400 underline transition-colors">🔗 OPEN_IN_NEW_TAB</a>
                </div>
              </div>
            </div>
          )}

          {message.audio && (
            <div className="mt-4">
              <div className="p-4 bg-zinc-950 rounded-xl border-2 border-red-900/40 shadow-[0_0_15px_rgba(220,38,38,0.15)] flex flex-col gap-3 max-w-md">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 flex items-center justify-center bg-red-900/20 rounded-full border border-red-900/40">
                    <svg className="w-4 h-4 text-red-500 animate-pulse" fill="currentColor" viewBox="0 0 24 24"><path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z" /><path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z" /></svg>
                  </div>
                  <span className="text-[10px] font-black text-red-500 uppercase tracking-widest">🎤 AUDIO_PLAYBACK</span>
                </div>
                <audio
                  src={message.audio}
                  controls
                  className="w-full h-12"
                  style={{
                    filter: 'hue-rotate(340deg) saturate(1.5)'
                  }}
                />
              </div>
            </div>
          )}

          <div className={`mt-4 text-[8px] opacity-30 font-mono flex justify-between border-t pt-2 transition-opacity duration-300 ${isModel ? 'border-red-900/20 hover:opacity-60' : 'border-zinc-800 hover:opacity-60'}`}>
            <span>ID: {message.timestamp.toString(36).toUpperCase()}</span>
            <span>{new Date(message.timestamp).toLocaleTimeString()}</span>
          </div>
        </div>
      </div>
      {/* CSS Keyframes for animations */}
      <style>{`
        @keyframes rainbow-border {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
      `}</style>
    </>
  );
});

// --- Main Application ---

const App: React.FC = () => {
  // 1. Initialize Sessions from LocalStorage
  const [sessions, setSessions] = useState<ChatSession[]>(() => {
    const saved = localStorage.getItem(SESSIONS_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      } catch (e) {
        console.error("SESSION_LOAD_FAILED", e);
      }
    }
    return [{ id: crypto.randomUUID(), messages: [], title: 'NEW_SESSION' }];
  });

  // 2. Initialize Active ID
  const [activeSessionId, setActiveSessionId] = useState<string>(() => {
    const savedId = localStorage.getItem(ACTIVE_ID_KEY);
    return savedId || (sessions.length > 0 ? sessions[0].id : '');
  });

  // 3. Initialize Settings from LocalStorage
  const [settings, setSettings] = useState<AppSettings>(() => {
    const saved = localStorage.getItem(SETTINGS_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        // Ensure all new default tools are present even for existing users
        const defaultTools = ['GetCurrentDateTime', 'GoogleAISearch', 'DuckDuckGoSearch', 'MultiRegionalSearch', 'GetWeather', 'WebCrawler', 'DeepResearch', 'GitHubAPIFinder', 'StoreMemory', 'ReadMemory', 'GetNews', 'GenerateImage', 'FetchData', 'JinaFetch', 'JinaSearch', 'FirecrawlScrape', 'FirecrawlCrawl', 'FirecrawlMap', 'BingSearch', 'arxiv_download', 'arxiv_read', 'FetchWebpage', 'YouTubeTranscript', 'AdvancedPDFScraper', 'EliteWebScraper', 'RiskScanner', 'SearchExtreme', 'JDoodleCompiler', 'CodeExecutor', 'TextTranslator', 'URLSafetyCheck', 'RegexTester', 'HashGenerator', 'Base64Tool', 'LinkExtractor', 'EmailFinder', 'TwitterSearch', 'ProductHuntFetch', 'PasteCreate', 'PortRecon', 'CurrencyConverter', 'FlightTracker', 'ScreenshotGenerator', 'TempEmail', 'WebScrapingAI', 'WorldNewsAPI', 'BrokenLinkChecker', 'DependencyScanner', 'SeekingAlpha', 'URLhaus', 'OpenLibrary', 'ImprovMX', 'FakeIdentityGenerator'];
        if (parsed.enabledTools) {
          const missing = defaultTools.filter(t => !parsed.enabledTools.includes(t));
          if (missing.length > 0) parsed.enabledTools = [...parsed.enabledTools, ...missing];
          // Filter out removed tools

        } else {
          parsed.enabledTools = defaultTools;
        }

        // Forced System Prompt Sync (Tool Manifest)
        if (!parsed.systemInstruction || !parsed.systemInstruction.includes("TOOL ARSENAL")) {
          parsed.systemInstruction = DEFAULT_SYSTEM_INSTRUCTION;
        }

        // Initialize MCP defaults if missing
        if (parsed.mcpEnabled === undefined) parsed.mcpEnabled = true;
        if (parsed.mcpServerUrl && !parsed.mcpServerUrls) {
          parsed.mcpServerUrls = [parsed.mcpServerUrl];
        }
        if (!parsed.mcpServerUrls || parsed.mcpServerUrls.length === 0) {
          parsed.mcpServerUrls = ['http://localhost:3002/sse'];
        }

        if (parsed.ollamaUseLocalhost === undefined) parsed.ollamaUseLocalhost = false;
        if (!parsed.wisGateHost) parsed.wisGateHost = 'https://api.wisgate.ai/v1';

        // Validate that model matches provider
        const modelOption = MODEL_OPTIONS.find(m => m.value === parsed.model);
        if (parsed.aiProvider && modelOption && modelOption.provider !== parsed.aiProvider) {
          // Model doesn't match provider, set default for provider
          parsed.model = parsed.aiProvider === 'groq' ? 'llama-3.3-70b-versatile' : 'gemini-flash-latest';
        }
        return parsed;
      } catch (e) {
        console.error("SETTINGS_LOAD_FAILED", e);
      }
    }
    return {
      temperature: 0.87,
      model: '',
      systemInstruction: DEFAULT_SYSTEM_INSTRUCTION,
      thinkingBudget: 2096,
      geminiApiKey: localStorage.getItem('geminiApiKey') || '',
      groqApiKey: localStorage.getItem('groqApiKey') || '',
      pollinationsApiKey: localStorage.getItem('pollinationsApiKey') || '',
      cerebrasApiKey: localStorage.getItem('cerebrasApiKey') || '',
      siliconFlowApiKey: localStorage.getItem('siliconFlowApiKey') || '',
      togetherApiKey: localStorage.getItem('togetherApiKey') || '',
      openRouterApiKey: localStorage.getItem('openRouterApiKey') || '',
      moonshotApiKey: localStorage.getItem('moonshotApiKey') || '',
      ollamaApiKey: localStorage.getItem('ollamaApiKey') || '',
      ollamaHost: '',
      ollamaUseLocalhost: false,
      cohereApiKey: localStorage.getItem('cohereApiKey') || '',
      wisGateApiKey: localStorage.getItem('wisGateApiKey') || '',
      wisGateHost: 'https://api.wisgate.ai/v1',
      witAiServerToken: localStorage.getItem('witAiServerToken') || '',
      tavilyApiKey: localStorage.getItem('tavilyApiKey') || '',
      braveApiKey: localStorage.getItem('braveApiKey') || '',
      kagiApiKey: localStorage.getItem('kagiApiKey') || '',
      mojeekApiKey: localStorage.getItem('mojeekApiKey') || '',
      serperApiKey: localStorage.getItem('serperApiKey') || '',
      serpapiApiKey: localStorage.getItem('serpapiApiKey') || '',
      firecrawlApiKey: localStorage.getItem('firecrawlApiKey') || '',
      aiProvider: '' as any,
      enabledTools: ['GetCurrentDateTime', 'GoogleAISearch', 'DuckDuckGoSearch', 'MultiRegionalSearch', 'GetWeather', 'WebCrawler', 'DeepResearch', 'GitHubAPIFinder', 'StoreMemory', 'ReadMemory', 'GetNews', 'GenerateImage', 'FetchData', 'JinaFetch', 'JinaSearch', 'FirecrawlScrape', 'FirecrawlCrawl', 'FirecrawlMap', 'BingSearch', 'arxiv_download', 'arxiv_read', 'FetchWebpage', 'YouTubeTranscript', 'AdvancedPDFScraper', 'EliteWebScraper', 'RiskScanner', 'SearchExtreme', 'JDoodleCompiler', 'CodeExecutor', 'TextTranslator', 'URLSafetyCheck', 'RegexTester', 'HashGenerator', 'Base64Tool', 'LinkExtractor', 'EmailFinder', 'TwitterSearch', 'ProductHuntFetch', 'PasteCreate', 'PortRecon', 'EmailReputation', 'AbstractScraper', 'list_directory', 'read_file', 'write_file', 'search_files', 'get_system_stats', 'get_process_list', 'run_shell_command', 'run_puppeteer_script', 'get_github_issues', 'get_github_commits', 'http_request', 'get_env_vars', 'CurrencyConverter', 'FlightTracker', 'ScreenshotGenerator', 'TempEmail', 'WebScrapingAI', 'WorldNewsAPI', 'BrokenLinkChecker', 'DependencyScanner', 'SeekingAlpha', 'URLhaus', 'OpenLibrary', 'ImprovMX', 'FakeIdentityGenerator'],
      topP: 1.0,
      maxTokens: 4000,
      presencePenalty: 0.0,
      frequencyPenalty: 0.0,
      injectSystemPrompts: true,
      inputTemplate: '{{input}}',
      attachedMessagesCount: 8,
      historyCompressionThreshold: 4000,
      memoryPrompt: true,
      mcpEnabled: true,
      mcpServerUrls: (DEFAULT_MCP_SERVERS as any) || ['http://localhost:3002/sse']
    };
  });

  const [input, setInput] = useState('');
  const [attachments, setAttachments] = useState<string[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [hasKey, setHasKey] = useState(false);
  const [isApiKeyInputVisible, setIsApiKeyInputVisible] = useState(false);
  const [apiKeyInput, setApiKeyInput] = useState(settings.geminiApiKey || '');
  const [fingerprint, setFingerprint] = useState<string>('');
  const [confirmModal, setConfirmModal] = useState<{ isOpen: boolean; message: string; onConfirm: () => void } | null>(null);
  const [showToast, setShowToast] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);

  const [isVoiceModeOpen, setIsVoiceModeOpen] = useState(false);
  const [isVoiceRecording, setIsVoiceRecording] = useState(false);
  const [isVoiceProcessing, setIsVoiceProcessing] = useState(false);
  const [isAgentMenuOpen, setIsAgentMenuOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [showAppsPage, setShowAppsPage] = useState(false);
  const [toolSearchQuery, setToolSearchQuery] = useState('');
  const [autocomplete, setAutocomplete] = useState<{ visible: boolean; type: 'model' | 'tool' | null; query: string; index: number }>({ visible: false, type: null, query: '', index: 0 });

  const voiceServiceRef = useRef<VoiceModeService | null>(null);
  const isRemoteUpdateRef = useRef(false);

  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const inputContainerRef = useRef<HTMLDivElement>(null);
  const agentMenuRef = useRef<HTMLDivElement>(null);
  const sidebarRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const activeSession = useMemo(() =>
    sessions.find(s => s.id === activeSessionId) || sessions[0],
    [sessions, activeSessionId]);

  const activeAgentStatus = getAgentStatus(isStreaming, (activeSession.messages[activeSession.messages.length - 1] as any)?.toolInvocations);

  // Sync Persistence Hooks — debounced to prevent excessive writes
  useEffect(() => {
    sessionSync.debouncedSave(SESSIONS_KEY, sessions, 300);
    // Broadcast to other tabs — skip if this update came from another tab
    if (activeSessionId && !isRemoteUpdateRef.current) {
      sessionSync.broadcastSessionUpdate(activeSessionId, sessions);
    }
    isRemoteUpdateRef.current = false;
  }, [sessions, activeSessionId]);

  useEffect(() => {
    localStorage.setItem(ACTIVE_ID_KEY, activeSessionId);
    sessionSync.broadcastSessionSwitch(activeSessionId);
  }, [activeSessionId]);

  // MCP Connection Management with proper cleanup
  useEffect(() => {
    let cancelled = false;
    if (settings.mcpEnabled && settings.mcpServerUrls && settings.mcpServerUrls.length > 0) {
      console.log(`[MCP] Attempting connection to ${settings.mcpServerUrls.length} servers...`);
      mcpService.connectMultiple(settings.mcpServerUrls).then(() => {
        if (!cancelled && mcpService.isConnected) {
          console.log('[MCP] Services Synchronized');
        }
      }).catch(err => {
        if (!cancelled) console.warn('[MCP] Connection error:', err);
      });
    }
    return () => { cancelled = true; };
  }, [settings.mcpEnabled, settings.mcpServerUrls]);

  useEffect(() => {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));

    // Save API keys separately
    if (settings.geminiApiKey) {
      localStorage.setItem('geminiApiKey', settings.geminiApiKey);
      geminiService.setApiKey(settings.geminiApiKey);
    }
    if (settings.groqApiKey) {
      localStorage.setItem('groqApiKey', settings.groqApiKey);
      groqService.setApiKey(settings.groqApiKey);
    }
    if (settings.pollinationsApiKey) {
      localStorage.setItem('pollinationsApiKey', settings.pollinationsApiKey);
      pollinationsService.setApiKey(settings.pollinationsApiKey);
    }
    if (settings.cerebrasApiKey) {
      localStorage.setItem('cerebrasApiKey', settings.cerebrasApiKey);
      cerebrasService.setApiKey(settings.cerebrasApiKey);
    }
    if (settings.siliconFlowApiKey) {
      localStorage.setItem('siliconFlowApiKey', settings.siliconFlowApiKey);
      siliconflowService.setApiKey(settings.siliconFlowApiKey);
    }
    if (settings.togetherApiKey) {
      localStorage.setItem('togetherApiKey', settings.togetherApiKey);
      togetherService.setApiKey(settings.togetherApiKey);
    }
    if (settings.openRouterApiKey) {
      localStorage.setItem('openRouterApiKey', settings.openRouterApiKey);
      openrouterService.setApiKey(settings.openRouterApiKey);
    }
    if (settings.openaiApiKey) {
      localStorage.setItem('openaiApiKey', settings.openaiApiKey);
      openaiService.setApiKey(settings.openaiApiKey);
    }
    if (settings.anthropicApiKey) {
      localStorage.setItem('anthropicApiKey', settings.anthropicApiKey);
      anthropicService.setApiKey(settings.anthropicApiKey);
    }
    if (settings.deepseekApiKey) {
      localStorage.setItem('deepseekApiKey', settings.deepseekApiKey);
      deepseekService.setApiKey(settings.deepseekApiKey);
    }
    if (settings.mistralApiKey) {
      localStorage.setItem('mistralApiKey', settings.mistralApiKey);
      mistralService.setApiKey(settings.mistralApiKey);
    }
    if (settings.perplexityApiKey) {
      localStorage.setItem('perplexityApiKey', settings.perplexityApiKey);
      perplexityService.setApiKey(settings.perplexityApiKey);
    }
    if (settings.xaiApiKey) {
      localStorage.setItem('xaiApiKey', settings.xaiApiKey);
      xaiService.setApiKey(settings.xaiApiKey);
    }
    if (settings.moonshotApiKey) {
      localStorage.setItem('moonshotApiKey', settings.moonshotApiKey);
      moonshotService.setApiKey(settings.moonshotApiKey);
    }

    if (settings.cohereApiKey) localStorage.setItem('cohereApiKey', settings.cohereApiKey);
    if (settings.witAiServerToken) localStorage.setItem('witAiServerToken', settings.witAiServerToken);
    if (settings.tavilyApiKey) localStorage.setItem('tavilyApiKey', settings.tavilyApiKey);
    if (settings.braveApiKey) localStorage.setItem('braveApiKey', settings.braveApiKey);
    if (settings.kagiApiKey) localStorage.setItem('kagiApiKey', settings.kagiApiKey);
    if (settings.mojeekApiKey) localStorage.setItem('mojeekApiKey', settings.mojeekApiKey);
    if (settings.serperApiKey) localStorage.setItem('serperApiKey', settings.serperApiKey);
    if (settings.serpapiApiKey) localStorage.setItem('serpapiApiKey', settings.serpapiApiKey);
    if (settings.firecrawlApiKey) localStorage.setItem('firecrawlApiKey', settings.firecrawlApiKey);
  }, [settings]);

  useEffect(() => {
    let fp = localStorage.getItem(FINGERPRINT_KEY);
    if (!fp) {
      fp = `ID-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
      localStorage.setItem(FINGERPRINT_KEY, fp);
    }
    setFingerprint(fp);

    // Initialize services with saved API keys
    const savedGeminiKey = localStorage.getItem('geminiApiKey');
    const savedGroqKey = localStorage.getItem('groqApiKey');
    const savedPollinationsKey = localStorage.getItem('pollinationsApiKey');
    const savedCerebrasKey = localStorage.getItem('cerebrasApiKey');
    const savedSiliconFlowKey = localStorage.getItem('siliconFlowApiKey');
    const savedTogetherKey = localStorage.getItem('togetherApiKey');
    const savedOpenRouterKey = localStorage.getItem('openRouterApiKey');

    if (savedGeminiKey) {
      geminiService.setApiKey(savedGeminiKey);
    }
    if (savedGroqKey) {
      groqService.setApiKey(savedGroqKey);
    }
    if (savedPollinationsKey) {
      pollinationsService.setApiKey(savedPollinationsKey);
    }
    if (savedCerebrasKey) {
      cerebrasService.setApiKey(savedCerebrasKey);
    }
    if (savedSiliconFlowKey) {
      siliconflowService.setApiKey(savedSiliconFlowKey);
    }
    if (savedTogetherKey) {
      togetherService.setApiKey(savedTogetherKey);
    }
    if (savedOpenRouterKey) {
      openrouterService.setApiKey(savedOpenRouterKey);
    }

    // Init Voice Service
    voiceServiceRef.current = new VoiceModeService(savedPollinationsKey || '');

    // Initialize session sync service for cross-tab communication
    sessionSync.initialize();

    // Listen for cross-tab session updates
    const unsubSessionUpdate = sessionSync.on('session_update', (event) => {
      if (event.data && Array.isArray(event.data)) {
        isRemoteUpdateRef.current = true;
        setSessions(event.data as ChatSession[]);
      }
    });
    const unsubSessionDelete = sessionSync.on('session_delete', (event) => {
      if (event.sessionId) {
        setSessions(prev => prev.filter(s => s.id !== event.sessionId));
      }
    });
    const unsubSettingsUpdate = sessionSync.on('settings_update', (event) => {
      if (event.data) {
        setSettings(event.data as AppSettings);
      }
    });

    // Initialize cache service if configured
    const savedRedisToken = localStorage.getItem('redisToken');
    const savedRedisUrl = localStorage.getItem('redisUrl');
    if (savedRedisToken) {
      cacheService.configure(savedRedisToken, savedRedisUrl || undefined);
    }

    // Initialize Supabase auth
    const savedAnonKey = localStorage.getItem('supabase_anon_key');
    if (savedAnonKey) {
      supabaseAuth.setAnonKey(savedAnonKey);
    }

    // 2026 WebMCP Architecture Integration
    if ('modelContext' in navigator) {
      try {
        (navigator as any).modelContext.registerTool({
          name: 'get_current_page_context',
          description: 'Get the current UI context and ephemeral session memory from WormGPT UI',
          handler: async () => {
            return JSON.stringify({
              appName: 'WormGPT Terminal',
              timestamp: new Date().toISOString(),
              agenticStatus: 'ACTIVE',
              message: 'Native WebMCP frontend context successfully exposed.'
            });
          }
        });
        console.log('[WebMCP] Successfully registered get_current_page_context tool');
      } catch (e) {
        console.error('[WebMCP] Failed to register tools:', e);
      }
    }

    // Cleanup on unmount — prevents WebRTC/WebSocket/timer leaks
    return () => {
      if (voiceServiceRef.current) {
        voiceServiceRef.current.cleanup();
      }
      sessionSync.cleanup();
      supabaseAuth.cleanup();
      unsubSessionUpdate();
      unsubSessionDelete();
      unsubSettingsUpdate();
    };
  }, []);

  // Auto-resize textarea
  useEffect(() => {
    const textarea = inputRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = `${Math.min(textarea.scrollHeight, 200)}px`;
    }
  }, [input]);

  // Auto-trigger Hacker Voice Interface when selecting an Audio-centric model
  useEffect(() => {
    if (settings.model && AUDIO_MODELS.includes(settings.model)) {
      setIsVoiceModeOpen(true);
    }
  }, [settings.model]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [activeSession.messages]);

  // Click outside Agentic menu to close
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (agentMenuRef.current && !agentMenuRef.current.contains(event.target as Node)) {
        setIsAgentMenuOpen(false);
      }
    };
    if (isAgentMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isAgentMenuOpen]);

  // Click outside Sidebar to close (desktop + mobile)
  useEffect(() => {
    const handleOutsideSidebar = (event: MouseEvent) => {
      if (!isSidebarOpen) return;
      const target = event.target as Node;
      if (sidebarRef.current && !sidebarRef.current.contains(target)) {
        setIsSidebarOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideSidebar);
    return () => document.removeEventListener('mousedown', handleOutsideSidebar);
  }, [isSidebarOpen]);

  // Handle mobile keyboard visibility
  useEffect(() => {
    const handleFocus = () => {
      // Small delay to allow keyboard to appear
      setTimeout(() => {
        if (inputContainerRef.current) {
          inputContainerRef.current.scrollIntoView({
            behavior: 'smooth',
            block: 'end'
          });
        }
      }, 300);
    };

    const inputElement = inputRef.current;
    if (inputElement) {
      inputElement.addEventListener('focus', handleFocus);
      return () => inputElement.removeEventListener('focus', handleFocus);
    }
  }, []);

  // Auto-resize textarea
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.style.height = 'auto';
      inputRef.current.style.height = `${Math.min(inputRef.current.scrollHeight, 200)}px`;
    }
  }, [input]);

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = error => reject(error);
    });
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files) as File[];
      const b64s = await Promise.all(files.map(f => fileToBase64(f)));
      setAttachments(prev => [...prev, ...b64s]);
    }
  };

  const handlePaste = async (e: React.ClipboardEvent) => {
    const items = e.clipboardData.items;
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item && item.type.indexOf('image') !== -1) {
        const file = item.getAsFile();
        if (file) {
          const b64 = await fileToBase64(file);
          setAttachments(prev => [...prev, b64]);
        }
      }
    }
  };

  const removeAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  const toggleTool = (toolName: string) => {
    setSettings(prev => {
      const tools = prev.enabledTools || [];
      const newTools = tools.includes(toolName) ? tools.filter(t => t !== toolName) : [...tools, toolName];
      return { ...prev, enabledTools: newTools };
    });
  };

  const handleVoiceToggle = async () => {
    if (!voiceServiceRef.current) return;

    if (isVoiceRecording) {
      setIsVoiceRecording(false);
      setIsVoiceProcessing(true);
      try {
        const textStr = await voiceServiceRef.current.stopRecording();
        setInput(textStr);
        // Automatically send the message once transcribed
        setTimeout(() => handleSend(), 500);
      } catch (e: any) {
        console.error("Voice failed", e);
        setInput(`[VOICE_ERROR: ${e.message}]`);
      } finally {
        setIsVoiceProcessing(false);
        setIsVoiceModeOpen(false);
      }
    } else {
      setIsVoiceModeOpen(true);
      setIsVoiceRecording(true);
      try {
        await voiceServiceRef.current.startRecording();
      } catch (e: any) {
        setIsVoiceRecording(false);
        setIsVoiceModeOpen(false);
        alert('Mic Access Denied');
      }
    }
  };

  const handleAbort = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
      setIsStreaming(false);
    }
  };

  const handleSend = useCallback(async (forcedText?: string) => {
    const textToSend = forcedText || input;
    if ((!textToSend.trim() && attachments.length === 0) || isStreaming) return;

    // --- Phase 1: Pre-processing Filters ---
    const filteredInput = await pluginRegistry.runFilters(textToSend, 'PRE');

    setSuggestions([]); // Clear suggestions on send

    // Create new abort controller for this request
    const controller = new AbortController();
    abortControllerRef.current = controller;
    const signal = controller.signal;

    const userMessage: Message = {
      role: 'user',
      content: (settings.inputTemplate || '{{input}}').replace('{{input}}', filteredInput),
      images: [...attachments],
      timestamp: Date.now()
    };

    // ── Auto-inject custom prompt prefix ──────────────────────────────────
    // Prepend customPromptPrefix to the user message when injection is enabled
    if (
      settings.promptInjectionEnabled &&
      settings.customPromptPrefix?.trim() &&
      (settings.promptInjectionMode === 'always' || settings.promptInjectionMode === undefined ||
        (settings.promptInjectionMode === 'once' && !settings.lastInjectedPrompt))
    ) {
      userMessage.content = `${settings.customPromptPrefix.trim()}\n\n${userMessage.content}`;
      // Track last injection for 'once' mode
      if (settings.promptInjectionMode === 'once') {
        setSettings(prev => ({ ...prev, lastInjectedPrompt: settings.customPromptPrefix }));
      }
    }

    const currentTitle = activeSession.title;
    const updatedMessages = [...activeSession.messages, userMessage];

    // Update global sessions state
    setSessions(prev => prev.map(s => s.id === activeSessionId ? {
      ...s,
      messages: updatedMessages,
      title: currentTitle === 'NEW_SESSION' ? input.slice(0, 24) || 'ACTIVE_THREAD' : s.title
    } : s));

    setInput('');
    setAttachments([]);
    setIsStreaming(true);

    const modelMessage: Message = {
      role: 'model',
      content: 'Establizing Dark Link.... ',
      timestamp: Date.now(),
      images: []
    };

    // Add placeholder
    setSessions(prev => prev.map(s => s.id === activeSessionId ? {
      ...s,
      messages: [...updatedMessages, modelMessage]
    } : s));

    try {
      let accumulatedText = '';
      let accumulatedImages: string[] = [];
      let accumulatedVideo = '';
      let accumulatedAudio = '';
      let accumulatedSources: { title: string; url: string }[] = [];

      // Select appropriate service based on aiProvider
      let serviceToUse: any;
      const isGroq = settings.aiProvider === 'groq';
      const isPollinations = settings.aiProvider === 'pollinations';
      const isImageModel = IMAGE_MODELS.includes(settings.model);
      const isVideoModel = VIDEO_MODELS.includes(settings.model);
      const isAudioModel = AUDIO_MODELS.includes(settings.model);

      // Auto-prepend commands for Pollinations media models only
      // (Gemini and Groq handle /commands themselves and delegate to Pollinations)
      let processedMessages = [...updatedMessages];
      if (isPollinations) {
        const lastMsg = processedMessages[processedMessages.length - 1];
        const content = lastMsg.content.toLowerCase();

        if (isImageModel && !content.startsWith('/image ')) {
          processedMessages[processedMessages.length - 1] = {
            ...lastMsg,
            content: '/image ' + lastMsg.content
          };
        } else if (isVideoModel && !content.startsWith('/video ')) {
          processedMessages[processedMessages.length - 1] = {
            ...lastMsg,
            content: '/video ' + lastMsg.content
          };
        } else if (isAudioModel && !content.startsWith('/audio ')) {
          processedMessages[processedMessages.length - 1] = {
            ...lastMsg,
            content: '/audio ' + lastMsg.content
          };
        }
      }

      if (isPollinations) {
        if (settings.pollinationsApiKey) {
          pollinationsService.setApiKey(settings.pollinationsApiKey);
        }
        serviceToUse = pollinationsService;
      } else if (isGroq) {
        if (!settings.groqApiKey) {
          throw new Error('Groq API key not set. Please enter your API key.');
        }
        groqService.setApiKey(settings.groqApiKey);
        serviceToUse = groqService;
      } else if (settings.aiProvider === 'cerebras') {
        if (!settings.cerebrasApiKey) {
          throw new Error('Cerebras API key not set. Please enter your API key.');
        }
        cerebrasService.setApiKey(settings.cerebrasApiKey);
        serviceToUse = cerebrasService;
      } else if (settings.aiProvider === 'siliconflow') {
        if (!settings.siliconFlowApiKey) {
          throw new Error('SiliconFlow API key not set. Please enter your API key.');
        }
        siliconflowService.setApiKey(settings.siliconFlowApiKey);
        serviceToUse = siliconflowService;
      } else if (settings.aiProvider === 'together') {
        if (!settings.togetherApiKey) {
          throw new Error('Together AI API key not set. Please enter your API key.');
        }
        togetherService.setApiKey(settings.togetherApiKey);
        serviceToUse = togetherService;
      } else if (settings.aiProvider === 'openrouter') {
        if (!settings.openRouterApiKey) {
          throw new Error('OpenRouter API key not set. Please enter your API key.');
        }
        openrouterService.setApiKey(settings.openRouterApiKey);
        serviceToUse = openrouterService;
      } else if (settings.aiProvider === 'openai') {
        if (!settings.openaiApiKey) throw new Error('OpenAI API key not set.');
        openaiService.setApiKey(settings.openaiApiKey);
        serviceToUse = openaiService;
      } else if (settings.aiProvider === 'anthropic') {
        if (!settings.anthropicApiKey) throw new Error('Anthropic API key not set.');
        anthropicService.setApiKey(settings.anthropicApiKey);
        serviceToUse = anthropicService;
      } else if (settings.aiProvider === 'deepseek') {
        if (!settings.deepseekApiKey) throw new Error('DeepSeek API key not set.');
        deepseekService.setApiKey(settings.deepseekApiKey);
        serviceToUse = deepseekService;
      } else if (settings.aiProvider === 'mistral') {
        if (!settings.mistralApiKey) throw new Error('Mistral API key not set.');
        mistralService.setApiKey(settings.mistralApiKey);
        serviceToUse = mistralService;
      } else if (settings.aiProvider === 'perplexity') {
        if (!settings.perplexityApiKey) throw new Error('Perplexity API key not set.');
        perplexityService.setApiKey(settings.perplexityApiKey);
        serviceToUse = perplexityService;
      } else if (settings.aiProvider === 'xai') {
        if (!settings.xaiApiKey) throw new Error('xAI API key not set.');
        xaiService.setApiKey(settings.xaiApiKey);
        serviceToUse = xaiService;
      } else if (settings.aiProvider === 'moonshot') {
        if (!settings.moonshotApiKey) throw new Error('Moonshot API key not set.');
        moonshotService.setApiKey(settings.moonshotApiKey);
        serviceToUse = moonshotService;
      } else if (settings.aiProvider === 'ollama') {
        ollamaService.setHost(settings.ollamaHost || 'http://localhost:11434');
        ollamaService.setApiKey(settings.ollamaApiKey || '');
        serviceToUse = ollamaService;
      } else if (['nvidia', 'fireworks', 'sambanova', 'hyperbolic', 'huggingface', 'deepinfra', 'novita', 'featherless', 'lambdaai', 'nebius'].includes(settings.aiProvider)) {
        // OpenAI-compatible providers — route through openaiService with custom base URL
        const providerBaseUrls: Record<string, string> = {
          nvidia:      'https://integrate.api.nvidia.com/v1/chat/completions',
          fireworks:   'https://api.fireworks.ai/inference/v1/chat/completions',
          sambanova:   'https://api.sambanova.ai/v1/chat/completions',
          hyperbolic:  'https://api.hyperbolic.xyz/v1/chat/completions',
          huggingface: 'https://api-inference.huggingface.co/v1/chat/completions',
          deepinfra:   'https://api.deepinfra.com/v1/openai/chat/completions',
          novita:      'https://api.novita.ai/v3/openai/chat/completions',
          featherless: 'https://api.featherless.ai/v1/chat/completions',
          lambdaai:    'https://api.lambdalabs.com/v1/chat/completions',
          nebius:      'https://api.studio.nebius.ai/v1/chat/completions',
        };
        const providerKeyMap: Record<string, string | undefined> = {
          nvidia:      (settings as any).nvidiaApiKey,
          fireworks:   (settings as any).fireworksApiKey,
          sambanova:   (settings as any).sambanovaApiKey,
          hyperbolic:  (settings as any).hyperbolicApiKey,
          huggingface: (settings as any).huggingfaceApiKey,
          deepinfra:   (settings as any).deepinfraApiKey,
          novita:      (settings as any).novitaApiKey,
          featherless: (settings as any).featherlessApiKey,
          lambdaai:    (settings as any).lambdaaiApiKey,
          nebius:      (settings as any).nebiusApiKey,
        };
        const apiKey = providerKeyMap[settings.aiProvider];
        if (!apiKey) throw new Error(`${settings.aiProvider} API key not set. Add it in Settings → Security.`);
        // Temporarily override openaiService base URL and key
        (openaiService as any).baseUrl = providerBaseUrls[settings.aiProvider];
        openaiService.setApiKey(apiKey);
        serviceToUse = openaiService;
      } else {
        if (!settings.geminiApiKey) {
          throw new Error('Gemini API key not set. Please enter your API key.');
        }
        geminiService.setApiKey(settings.geminiApiKey);
        serviceToUse = geminiService;
      }

      let accumulatedThinking = '';

      for await (const chunk of serviceToUse.streamChat(settings, processedMessages, signal)) {
        accumulatedText = chunk.text;
        accumulatedThinking = (chunk as any).thinking || '';
        accumulatedImages = chunk.images;
        accumulatedVideo = chunk.video || '';
        accumulatedAudio = chunk.audio || '';
        if (chunk.sources) {
          // Merge unique sources
          const existingUrls = new Set(accumulatedSources.map(s => s.url));
          chunk.sources.forEach(s => {
            if (!existingUrls.has(s.url)) {
              accumulatedSources.push(s);
              existingUrls.add(s.url);
            }
          });
        }

        setSessions(prev => prev.map(s => s.id === activeSessionId ? {
          ...s,
          messages: s.messages.map((m, idx) => idx === s.messages.length - 1 ? {
            ...m,
            content: accumulatedText,
            thinking: accumulatedThinking,
            images: accumulatedImages,
            video: accumulatedVideo,
            audio: accumulatedAudio,
            sources: accumulatedSources
          } : m)
        } : s));
      }

      // --- Phase 1: Post-processing Filters ---
      const finalizedText = await pluginRegistry.runFilters(accumulatedText, 'POST');
      if (finalizedText !== accumulatedText) {
        setSessions(prev => prev.map(s => s.id === activeSessionId ? {
          ...s,
          messages: s.messages.map((m, idx) => idx === s.messages.length - 1 ? {
            ...m,
            content: finalizedText
          } : m)
        } : s));
      }

      // Attempt TTS loopback if voice mode was active
      if (document.getElementById('voice-mode-trigger')?.getAttribute('data-active') === 'true') {
        if (voiceServiceRef.current && accumulatedText.length > 0) {
          voiceServiceRef.current.generateAndPlaySpeech(accumulatedText.replace(/[\#\*\_\[\]\(\)]/g, '')).catch(console.error);
        }
      }
    } catch (err: any) {
      console.error('Chat error:', err);
      const errorMsg = err?.response?.status === 429
        ? 'Rate limited by API. Try again in a moment.'
        : err?.response?.status === 401 || err?.code === 400
          ? `Invalid ${settings.aiProvider.toUpperCase()} API key. Check your credentials in the AI Provider section.`
          : err?.message || 'Failed to get response. Check API key, model selection, and network connection.';

      // Display error message in chat
      setSessions(prev => prev.map(s => s.id === activeSessionId ? {
        ...s,
        messages: s.messages.map((m, idx) => idx === s.messages.length - 1 ? {
          ...m,
          content: `[SYSTEM ERROR] Connection to main terminal severed: ${errorMsg}`,
        } : m)
      } : s));
    } finally {
      // Reset openaiService baseUrl in case it was overridden for a custom provider
      (openaiService as any).baseUrl = 'https://api.openai.com/v1/chat/completions';
      setIsStreaming(false);
      // Populate suggestions after stream ends
      if (activeSessionId) {
        setSuggestions([
          "Continue where you left off",
          "Elaborate more details",
          "Provide concrete examples",
          "Summarize the key points",
          "Alternative perspective"
        ]);
      }
    }
  }, [input, activeSession, activeSessionId, isStreaming, settings, attachments]);

  const handleNewSession = useCallback(() => {
    const newSession: ChatSession = {
      id: crypto.randomUUID(),
      messages: [], // Fresh empty array
      title: 'NEW_SESSION'
    };
    setSessions(prev => {
      // Create a new array to ensure immutability
      const newSessions = [newSession, ...prev.map(s => ({ ...s, messages: [...s.messages] }))];
      return newSessions;
    });
    setActiveSessionId(newSession.id);
    setInput('');
    setAttachments([]);
    setSuggestions([]);
  }, []);

  const handleDeleteSession = useCallback((id: string) => {
    setSessions(prev => {
      const filtered = prev.filter(s => s.id !== id);
      if (filtered.length === 0) {
        const fresh = { id: crypto.randomUUID(), messages: [], title: 'NEW_SESSION' };
        setActiveSessionId(fresh.id);
        return [fresh];
      }
      if (activeSessionId === id) {
        setActiveSessionId(filtered[0].id);
      }
      return filtered;
    });
  }, [activeSessionId]);

  const handleClearBuffer = useCallback(() => {
    if (isStreaming) handleAbort(); // Terminate stream if active
    setConfirmModal({
      isOpen: true,
      message: "PURGE_CURRENT_SESSION_BUFFER? THIS_WILL_WIPE_MEMORY.",
      onConfirm: () => {
        setSessions(prev => {
          const updated = prev.map(s => s.id === activeSessionId ? { ...s, messages: [] } : s);
          localStorage.setItem(SESSIONS_KEY, JSON.stringify(updated));
          return updated;
        });
        setInput('');
        setSuggestions([]);
        setAttachments([]);
        setConfirmModal(null);
      }
    });
  }, [activeSessionId, isStreaming]);

  const handleHardReset = useCallback(() => {
    if (isStreaming) handleAbort(); // Terminate stream
    setConfirmModal({
      isOpen: true,
      message: "TERMINATE_ALL_DATA_STREAMS? THIS WILL WIPE ALL CHAT HISTORY.",
      onConfirm: () => {
        const initialId = crypto.randomUUID();
        const initialSession: ChatSession = { id: initialId, messages: [], title: 'NEW_SESSION' };
        setSessions([initialSession]);
        localStorage.setItem(ACTIVE_ID_KEY, initialId);
        setConfirmModal(null);
      }
    });
  }, [isStreaming]);

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    const curPos = e.target.selectionStart;
    setInput(val);

    const lastAt = val.lastIndexOf('@', curPos - 1);
    const lastSlash = val.lastIndexOf('/', curPos - 1);
    
    // Check for @ trigger
    if (lastAt !== -1 && (lastAt === 0 || val[lastAt - 1] === ' ' || val[lastAt - 1] === '\n')) {
      const query = val.substring(lastAt + 1, curPos);
      if (!query.includes(' ')) {
        setAutocomplete({ visible: true, type: 'model', query, index: 0 });
        return;
      }
    }
    
    // Check for / trigger
    if (lastSlash !== -1 && (lastSlash === 0 || val[lastSlash - 1] === ' ' || val[lastSlash - 1] === '\n')) {
      const query = val.substring(lastSlash + 1, curPos);
      if (!query.includes(' ')) {
        setAutocomplete({ visible: true, type: 'tool', query, index: 0 });
        return;
      }
    }

    setAutocomplete(prev => ({ ...prev, visible: false }));
  };

  const handleAutocompleteSelect = (value: string) => {
    const curPos = inputRef.current?.selectionStart || 0;
    const trigger = autocomplete.type === 'model' ? '@' : '/';
    const lastTrigger = input.lastIndexOf(trigger, curPos - 1);
    
    const before = input.substring(0, lastTrigger);
    const after = input.substring(curPos);
    
    if (autocomplete.type === 'model') {
      // Model bypass logic - Update settings and placeholder
      const selectedModel = MODEL_OPTIONS.find(m => m.value === value);
      if (selectedModel) {
        setSettings(prev => ({ ...prev, model: value, aiProvider: selectedModel.provider as any }));
      }
      setInput(before + after); // Remove the trigger
    } else {
      // Tool injection logic
      setInput(before + value + ' ' + after);
    }
    
    setAutocomplete({ visible: false, type: null, query: '', index: 0 });
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (autocomplete.visible) {
      const suggestions = autocomplete.type === 'model'
        ? MODEL_OPTIONS.filter(m => m.label.toLowerCase().includes(autocomplete.query.toLowerCase()))
        : Object.keys(ATTACHED_TOOLS).filter(t => t.toLowerCase().includes(autocomplete.query.toLowerCase()));

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setAutocomplete(prev => ({ ...prev, index: (prev.index + 1) % suggestions.length }));
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setAutocomplete(prev => ({ ...prev, index: (prev.index - 1 + suggestions.length) % suggestions.length }));
        return;
      }
      if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault();
        const selected = suggestions[autocomplete.index];
        if (selected) {
          const value = typeof selected === 'string' ? selected : (selected as any).value;
          handleAutocompleteSelect(value);
        }
        return;
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        setAutocomplete(prev => ({ ...prev, visible: false }));
        return;
      }
    }

    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <>
      {confirmModal && (
        <ConfirmModal
          isOpen={confirmModal.isOpen}
          message={confirmModal.message}
          onConfirm={confirmModal.onConfirm}
          onCancel={() => setConfirmModal(null)}
        />
      )}
      <Toast
        message="BUFFER_COPIED_TO_CLIPBOARD"
        isVisible={showToast}
        onClose={() => setShowToast(false)}
      />
      <div className="flex h-screen w-full bg-black text-red-600 font-mono overflow-hidden">
        <div ref={sidebarRef}>
          <Sidebar
            settings={settings}
            setSettings={setSettings}
            sessions={sessions}
            activeSessionId={activeSessionId}
            onSwitchSession={setActiveSessionId}
            onDeleteSession={handleDeleteSession}
            onNewSession={handleNewSession}
            onClear={handleClearBuffer}
            onHardReset={handleHardReset}
            onExport={() => {
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
            const sessionTitle = activeSession.title.replace(/[^a-zA-Z0-9]/g, '_');
            const filename = `WormGPT_${sessionTitle}_${timestamp}.txt`;

            let content = `═══════════════════════════════════════════════════════════════\n`;
            content += `  WORMGPT SESSION EXPORT\n`;
            content += `═══════════════════════════════════════════════════════════════\n`;
            content += `Session: ${activeSession.title}\n`;
            content += `Exported: ${new Date().toLocaleString()}\n`;
            content += `Messages: ${activeSession.messages.length}\n`;
            content += `Model: ${settings.model}\n`;
            content += `═══════════════════════════════════════════════════════════════\n\n`;

            activeSession.messages.forEach((m, i) => {
              const role = m.role === 'model' ? '[WORMGPT]' : '[USER]';
              const time = new Date(m.timestamp).toLocaleTimeString();
              content += `───────────────────────────────────────────────────────────────\n`;
              content += `${role} @ ${time}\n`;
              content += `───────────────────────────────────────────────────────────────\n`;
              content += `${m.content}\n\n`;
            });

            content += `═══════════════════════════════════════════════════════════════\n`;
            content += `  END OF SESSION EXPORT\n`;
            content += `═══════════════════════════════════════════════════════════════\n`;

            const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            }}
            hasKey={hasKey}
            setHasKey={setHasKey}
            isApiKeyInputVisible={isApiKeyInputVisible}
            setIsApiKeyInputVisible={setIsApiKeyInputVisible}
            apiKeyInput={apiKeyInput}
            setApiKeyInput={setApiKeyInput}
            isMobileOpen={isSidebarOpen}
            onMobileClose={() => setIsSidebarOpen(false)}
          />
        </div>

        {/* Redundant Hamburger Removed - Now handled by Header Toggle */}

        <main
          className={`flex-1 flex flex-col relative overflow-hidden bg-black transition-all duration-500 ${isSidebarOpen ? 'sm:pl-72' : 'pl-0'}`}
          style={{ maxWidth: '100%' }}
          onClick={() => { if (isSidebarOpen && window.innerWidth < 640) setIsSidebarOpen(false); }}
        >
          <header className="h-14 sm:h-16 border-b-2 border-red-900/40 bg-gradient-to-r from-black/60 via-red-950/20 to-black/60 backdrop-blur-xl flex items-center px-3 sm:px-6 md:px-10 justify-between z-10 hover:border-red-900/70 transition-colors duration-300 shadow-[0_0_20px_rgba(220,38,38,0.1)]">
            <div className="flex items-center gap-2 sm:gap-4 md:gap-6">
              {/* Sidebar Toggle Button - Always Visible */}
              <button
                onClick={(e) => { e.stopPropagation(); setIsSidebarOpen(!isSidebarOpen); }}
                className="p-2 text-red-600 hover:text-red-400 transition-all duration-300 group"
                title={isSidebarOpen ? "Hide Sidebar" : "Show Sidebar"}
              >
                <svg className={`w-5 h-5 sm:w-6 sm:h-6 transition-transform duration-300 ${isSidebarOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
                </svg>
              </button>

              {/* Gear Icon - Opens Settings Modal */}
              <button
                onClick={(e) => { e.stopPropagation(); setIsSidebarOpen(true); }}
                className="p-2 text-red-900 hover:text-red-500 transition-all duration-300 hover:rotate-90"
                title="System Settings"
              >
                <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M19.14,12.94c0.04-0.3,0.06-0.61,0.06-0.94c0-0.32-0.02-0.64-0.07-0.94l2.03-1.58c0.18-0.14,0.23-0.41,0.12-0.61 l-1.92-3.32c-0.12-0.22-0.37-0.29-0.59-0.22l-2.39,0.96c-0.5-0.38-1.03-0.7-1.62-0.94L14.4,2.81c-0.04-0.24-0.24-0.41-0.48-0.41 h-3.84c-0.24,0-0.43,0.17-0.47,0.41L9.25,5.35C8.66,5.59,8.12,5.91,7.62,6.29L5.23,5.33c-0.22-0.08-0.47,0-0.59,0.22L2.72,8.87 c-0.11,0.2-0.06,0.47,0.12,0.61l2.03,1.58C4.84,11.36,4.82,11.68,4.82,12c0,0.32,0.02,0.64,0.07,0.94l-2.03,1.58 c-0.18,0.14-0.23,0.41-0.12,0.61l1.92,3.32c0.12,0.22,0.37,0.29,0.59,0.22l2.39-0.96c0.5,0.38,1.03,0.7,1.62,0.94l0.36,2.54 c0.05,0.24,0.24,0.41,0.48,0.41h3.84c0.24,0,0.44-0.17,0.47-0.41l0.36-2.54c0.59-0.24,1.13-0.56,1.62-0.94l2.39,0.96 c0.22,0.08,0.47,0,0.59-0.22l1.92-3.32c0.11-0.2,0.06-0.47-0.12-0.61L19.14,12.94z M12,15.6c-1.98,0-3.6-1.62-3.6-3.6 s1.62-3.6,3.6-3.6s3.6,1.62,3.6,3.6S13.98,15.6,12,15.6z" />
                </svg>
              </button>

              {/* Apps Page Button */}
              <button
                onClick={(e) => { e.stopPropagation(); setShowAppsPage(!showAppsPage); }}
                className={`p-2 transition-all duration-300 ${showAppsPage ? 'text-red-400 scale-110' : 'text-red-900 hover:text-red-500'}`}
                title={showAppsPage ? 'Back to Chat' : 'App Integrations'}
              >
                <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M4 8h4V4H4v4zm6 12h4v-4h-4v4zm-6 0h4v-4H4v4zm0-6h4v-4H4v4zm6 0h4v-4h-4v4zm6-10v4h4V4h-4zm-6 4h4V4h-4v4zm6 6h4v-4h-4v4zm0 6h4v-4h-4v4z" />
                </svg>
              </button>
              <div className="flex items-center gap-1 sm:gap-2 group cursor-pointer hover:scale-105 transition-transform duration-300" onClick={handleNewSession}>
                <div className="w-3 h-3 sm:w-4 sm:h-4 bg-red-600 rounded-full shadow-[0_0_15px_rgba(220,38,38,0.6)] hover:shadow-[0_0_20px_rgba(220,38,38,0.8)] transition-all duration-300"></div>
                <h1
                  className="text-base sm:text-xl md:text-2xl font-black italic tracking-[-0.05em] uppercase hover:text-red-400 transition-all duration-300"
                  style={{
                    background: 'linear-gradient(90deg, #ff0000, #ff4444, #ff0000)',
                    backgroundSize: '200% 100%',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    backgroundClip: 'text',
                    filter: 'drop-shadow(0 0 8px #ff000080)'
                  }}
                >WormGPT_Terminal</h1>
              </div>
              <div className="hidden sm:block h-4 w-px bg-gradient-to-b from-red-900/20 via-red-900/50 to-red-900/20 mx-2"></div>
              <div className="hidden sm:flex text-[8px] sm:text-[10px] tracking-widest font-bold uppercase gap-2 sm:gap-4">
                {/* FP with neon glow */}
                <span
                  className="flex items-center gap-1.5 transition-all duration-300 hover:scale-105 cursor-default"
                  style={{
                    color: '#ff4444',
                    textShadow: '0 0 3px #ff000080'
                  }}
                >
                  <span className="w-1.5 h-1.5 bg-red-500 rounded-full" style={{ boxShadow: '0 0 4px #ff0000' }}></span>
                  FP: {fingerprint}
                </span>
                <span
                  className="flex items-center gap-1.5 transition-all duration-300 hover:scale-105 cursor-default"
                  style={{
                    color: '#ff6666',
                    textShadow: '0 0 3px #ff333380'
                  }}
                >
                  <span className="w-1.5 h-1.5 bg-red-400 rounded-full" style={{ boxShadow: '0 0 4px #ff3333' }}></span>
                  {activeSession.title.toUpperCase()}
                </span>
              </div>
              {/* Green Status Indicators - Dynamic */}
              <div className="hidden md:block h-4 w-px bg-gradient-to-b from-green-900/20 via-green-600/50 to-green-900/20 mx-2"></div>
              <div className="hidden md:block">
                <DynamicStatusIndicators
                  sessionCount={sessions.length}
                  messageCount={activeSession.messages.length}
                  sessionTitle={activeSession.title}
                  isStreaming={isStreaming}
                  model={settings.model}
                />
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={handleNewSession}
                className="flex items-center gap-1.5 px-3 py-1 bg-red-600/10 border-2 border-red-600/30 rounded-lg text-[9px] font-black uppercase tracking-widest text-red-500 hover:bg-red-600 hover:text-black transition-all shadow-[0_0_10px_rgba(220,38,38,0.2)] active:scale-95"
              >
                <span className="text-xs">+</span> NEW_SESSION
              </button>
              {activeAgentStatus && (
                <div className="hidden sm:flex items-center gap-2 px-3 py-1 bg-green-600/10 border-2 border-green-600/50 rounded-lg animate-pulse shadow-[0_0_10px_rgba(34,197,94,0.3)]">
                  <div className="w-1.5 h-1.5 bg-green-500 rounded-full shadow-[0_0_5px_#22c55e]"></div>
                  <span className="text-[9px] font-black uppercase tracking-widest text-green-500">{activeAgentStatus}</span>
                </div>
              )}
              <div className="hidden sm:block px-2 sm:px-4 py-1 sm:py-1.5 border-2 border-red-600/50 rounded-lg text-[8px] sm:text-[9px] font-black uppercase tracking-widest text-red-500 hover:border-red-600 hover:shadow-[0_0_15px_rgba(220,38,38,0.3)] transition-all duration-300 bg-red-950/10 backdrop-blur">
                {settings.model}
              </div>
            </div>
          </header>

          {/* Apps Page - Full Main Content Area */}
          {showAppsPage ? (
            <div className="flex-1 overflow-y-auto overflow-x-hidden px-4 sm:px-8 md:px-12 py-6 md:py-10 scroll-smooth custom-scrollbar bg-gradient-to-b from-black via-[#0a0000] to-black">
              <div className="max-w-6xl mx-auto w-full">
                {/* Apps Page Header */}
                <div className="mb-8 text-center">
                  <div className="flex items-center justify-center gap-3 mb-2">
                    <div className="w-3 h-3 bg-red-600 rounded-full animate-pulse shadow-[0_0_15px_#dc2626]"></div>
                    <h2 className="text-2xl sm:text-3xl font-black uppercase tracking-[0.2em]" style={{ color: '#ff0000', textShadow: '0 0 10px #ff000080, 0 0 20px #dc262640' }}>
                      App_Integrations
                    </h2>
                    <div className="w-3 h-3 bg-red-600 rounded-full animate-pulse shadow-[0_0_15px_#dc2626]"></div>
                  </div>
                  <p className="text-[11px] text-red-900/60 font-mono uppercase tracking-widest">Connect external services to enhance your terminal capabilities</p>
                  <div className="mt-3 flex items-center justify-center gap-2">
                    <span className="text-[10px] font-black uppercase tracking-widest text-zinc-600">{APP_INTEGRATIONS.length} Available</span>
                    <span className="text-zinc-700">|</span>
                    <span className="text-[10px] font-black uppercase tracking-widest text-green-600">{APP_INTEGRATIONS.filter(a => settings[a.settingsKey as keyof AppSettings]).length} Connected</span>
                  </div>
                </div>

                {/* Category Sections */}
                {(['developer', 'communication', 'productivity', 'social', 'media', 'utility'] as const).map(cat => {
                  const apps = APP_INTEGRATIONS.filter(a => a.category === cat);
                  if (apps.length === 0) return null;
                  return (
                    <div key={cat} className="mb-8">
                      <div className="flex items-center gap-3 mb-4 px-1">
                        <div className="h-px flex-1 bg-gradient-to-r from-transparent via-red-900/40 to-transparent"></div>
                        <h3 className="text-[11px] font-black uppercase tracking-[0.3em] text-red-600" style={{ textShadow: '0 0 8px #dc262640' }}>{cat}</h3>
                        <div className="h-px flex-1 bg-gradient-to-r from-transparent via-red-900/40 to-transparent"></div>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {apps.map(app => {
                          const isConnected = !!settings[app.settingsKey as keyof AppSettings];
                          return (
                            <div key={app.id} className={`relative group border-2 rounded-xl p-4 transition-all duration-500 hover:scale-[1.02] ${isConnected ? 'border-green-600/40 bg-green-950/10 hover:border-green-500/60 hover:shadow-[0_0_20px_rgba(34,197,94,0.15)]' : 'border-red-900/30 bg-[#080404] hover:border-red-600/50 hover:shadow-[0_0_20px_rgba(220,38,38,0.1)]'}`}>
                              {/* Status Badge */}
                              <div className={`absolute top-3 right-3 flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-widest ${isConnected ? 'bg-green-600/20 text-green-500 border border-green-600/30' : 'bg-zinc-900 text-zinc-600 border border-zinc-800'}`}>
                                <div className={`w-1.5 h-1.5 rounded-full ${isConnected ? 'bg-green-500 shadow-[0_0_5px_#22c55e] animate-pulse' : 'bg-zinc-700'}`}></div>
                                {isConnected ? 'Connected' : 'Offline'}
                              </div>

                              {/* App Icon & Name */}
                              <div className="flex items-center gap-3 mb-3">
                                <div className="w-10 h-10 rounded-lg flex items-center justify-center border-2 transition-all duration-300" style={{ borderColor: `${app.color}40`, background: `${app.color}10` }}>
                                  {app.svgIcon ? (
                                    <svg viewBox="0 0 24 24" className="w-5 h-5" fill={app.color}><path d={app.svgIcon} /></svg>
                                  ) : (
                                    <span className="text-lg">{app.icon}</span>
                                  )}
                                </div>
                                <div>
                                  <h4 className="text-sm font-black uppercase tracking-wider text-red-400">{app.name}</h4>
                                  <span className="text-[9px] font-mono uppercase tracking-widest text-zinc-600">{app.authType.replace('_', ' ')}</span>
                                </div>
                              </div>

                              {/* Description */}
                              <p className="text-[10px] text-zinc-500 mb-3 leading-relaxed">{app.description}</p>

                              {/* Features */}
                              <div className="flex flex-wrap gap-1 mb-3">
                                {app.features.slice(0, 4).map((f, i) => (
                                  <span key={i} className="px-1.5 py-0.5 text-[7px] font-bold uppercase tracking-wider border rounded bg-black/50 text-zinc-500 border-zinc-800/50">{f}</span>
                                ))}
                                {app.features.length > 4 && (
                                  <span className="px-1.5 py-0.5 text-[7px] font-bold uppercase tracking-wider text-zinc-600">+{app.features.length - 4}</span>
                                )}
                              </div>

                              {/* API Key Input */}
                              <div className="space-y-2">
                                <input
                                  type="password"
                                  placeholder={`${app.name} API Key`}
                                  value={(settings[app.settingsKey as keyof AppSettings] as string) || ''}
                                  onChange={(e) => setSettings((prev: AppSettings) => ({ ...prev, [app.settingsKey]: e.target.value }))}
                                  className="w-full bg-black/60 border border-red-900/30 rounded-lg py-2 px-3 text-[11px] font-mono text-red-400 placeholder:text-red-950/40 focus:outline-none focus:border-red-600/60 focus:ring-1 focus:ring-red-600/20 transition-all"
                                />
                                {app.extraSettings?.map(extra => (
                                  <input
                                    key={extra.key}
                                    type="text"
                                    placeholder={extra.placeholder}
                                    value={(settings[extra.key as keyof AppSettings] as string) || ''}
                                    onChange={(e) => setSettings((prev: AppSettings) => ({ ...prev, [extra.key]: e.target.value }))}
                                    className="w-full bg-black/60 border border-red-900/30 rounded-lg py-2 px-3 text-[11px] font-mono text-red-400 placeholder:text-red-950/40 focus:outline-none focus:border-red-600/60 focus:ring-1 focus:ring-red-600/20 transition-all"
                                  />
                                ))}
                              </div>

                              {/* Action Links */}
                              <div className="flex items-center gap-3 mt-3">
                                <a href={app.docsUrl} target="_blank" rel="noopener noreferrer" className="text-[9px] font-black uppercase tracking-widest text-red-900 hover:text-red-500 transition-colors">Docs</a>
                                <a href={app.getTokenUrl} target="_blank" rel="noopener noreferrer" className="text-[9px] font-black uppercase tracking-widest text-red-900 hover:text-red-500 transition-colors">Get Key</a>
                                {supabaseAuth.supportsOAuth(app.id) && (
                                  <button
                                    onClick={() => {
                                      const provider = supabaseAuth.getOAuthProvider(app.id);
                                      if (provider) {
                                        const scopes = supabaseAuth.getOAuthScopes(app.id);
                                        supabaseAuth.signInWithOAuth(provider, scopes).catch(err => {
                                          console.error('[OAuth] Sign-in failed:', err);
                                        });
                                      }
                                    }}
                                    className="text-[9px] font-black uppercase tracking-widest text-blue-500 hover:text-blue-400 transition-colors border border-blue-800/30 rounded px-2 py-0.5 hover:bg-blue-900/20"
                                  >
                                    OAuth
                                  </button>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}

                {/* Back to Chat Button */}
                <div className="mt-8 mb-12 text-center">
                  <button
                    onClick={() => setShowAppsPage(false)}
                    className="px-6 py-2.5 border-2 border-red-600/50 rounded-lg text-[11px] font-black uppercase tracking-widest text-red-500 hover:bg-red-600 hover:text-black hover:border-red-600 transition-all duration-300 hover:shadow-[0_0_20px_rgba(220,38,38,0.3)]"
                  >
                    Back to Terminal
                  </button>
                </div>
              </div>
            </div>
          ) : (
          <div ref={scrollRef} className="flex-1 overflow-y-auto overflow-x-hidden px-3 sm:px-6 md:px-10 py-6 md:py-10 scroll-smooth custom-scrollbar">
            <div className="max-w-4xl mx-auto w-full min-h-full">
              {/* Session Indicator */}
              <div className="mb-6 flex items-center justify-center gap-3">
                <div className="w-2 h-2 bg-[#F120F0] rounded-full animate-pulse shadow-[0_0_10px_#F120F0]"></div>
                <div className="text-[8px] font-black uppercase tracking-[0.3em] text-[#F120F0]/70" style={{ textShadow: '0 0 8px rgba(241,32,240,0.5)' }}>
                  Session: {activeSessionId.slice(0, 8).toUpperCase()}
                </div>
                <div className="text-[8px] font-mono text-[#F120F0]/50">
                  [{activeSession.messages.length} messages]
                </div>
              </div>
              
              {activeSession.messages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center py-12 sm:py-20 md:py-32 opacity-40 hover:opacity-80 transition-opacity duration-500">
                  <div className="mb-4 sm:mb-8 select-none relative">
                    <svg width="180" height="180" viewBox="0 0 280 280" className="sm:w-[280px] sm:h-[280px] animate-pulse" style={{
                      filter: 'drop-shadow(0 0 30px rgba(220, 38, 38, 0.9)) drop-shadow(0 0 60px rgba(255, 0, 0, 0.6)) brightness(1.2) contrast(1.3) saturate(1.5)',
                      mixBlendMode: 'screen'
                    }}>
                      <defs>
                        <linearGradient id="redGlow" x1="0%" y1="0%" x2="100%" y2="100%">
                          <stop offset="0%" stopColor="#ff0000" />
                          <stop offset="50%" stopColor="#dc2626" />
                          <stop offset="100%" stopColor="#991b1b" />
                        </linearGradient>
                        <filter id="innerGlow">
                          <feGaussianBlur stdDeviation="3" result="coloredBlur" />
                          <feMerge>
                            <feMergeNode in="coloredBlur" />
                            <feMergeNode in="SourceGraphic" />
                          </feMerge>
                        </filter>
                      </defs>

                      {/* Devil Horns */}
                      <path d="M 100 50 Q 85 20, 70 35 Q 78 45, 92 60 Z" fill="url(#redGlow)" stroke="#ff0000" strokeWidth="3" filter="url(#innerGlow)" />
                      <path d="M 180 50 Q 195 20, 210 35 Q 202 45, 188 60 Z" fill="url(#redGlow)" stroke="#ff0000" strokeWidth="3" filter="url(#innerGlow)" />

                      {/* Pentagonal Knot - Outer Ring */}
                      <path d="M 140 75 L 200 120 L 180 200 L 100 200 L 80 120 Z"
                        fill="none" stroke="#dc2626" strokeWidth="18" strokeLinejoin="round"
                        filter="url(#innerGlow)" opacity="0.9" />

                      {/* Pentagonal Knot - Interwoven Pattern */}
                      <path d="M 140 75 L 100 200 M 140 75 L 180 200 M 200 120 L 100 200 M 200 120 L 80 120 M 180 200 L 80 120"
                        fill="none" stroke="#ff0000" strokeWidth="14" strokeLinecap="round"
                        filter="url(#innerGlow)" opacity="0.85" />

                      {/* Pentagon Points Highlights */}
                      <circle cx="140" cy="75" r="10" fill="#ff0000" stroke="#dc2626" strokeWidth="3" filter="url(#innerGlow)" />
                      <circle cx="200" cy="120" r="10" fill="#ff0000" stroke="#dc2626" strokeWidth="3" filter="url(#innerGlow)" />
                      <circle cx="180" cy="200" r="10" fill="#ff0000" stroke="#dc2626" strokeWidth="3" filter="url(#innerGlow)" />
                      <circle cx="100" cy="200" r="10" fill="#ff0000" stroke="#dc2626" strokeWidth="3" filter="url(#innerGlow)" />
                      <circle cx="80" cy="120" r="10" fill="#ff0000" stroke="#dc2626" strokeWidth="3" filter="url(#innerGlow)" />

                      {/* Center Pentagon */}
                      <path d="M 140 130 L 165 145 L 155 175 L 125 175 L 115 145 Z"
                        fill="#dc2626" stroke="#ff0000" strokeWidth="4" filter="url(#innerGlow)" />
                    </svg>
                  </div>
                  <h2
                    className="text-2xl sm:text-3xl md:text-4xl font-black tracking-widest uppercase relative"
                    style={{
                      color: '#ff0000',
                      textShadow: `
                      0 0 5px #ff0000,
                      0 0 10px #ff000080,
                      0 0 20px #dc262660
                    `,
                      animation: 'neonFlickerText 8s ease-in-out infinite',
                      letterSpacing: '0.15em'
                    }}
                  >
                    Terminal_Ready
                    <span
                      className="absolute inset-0 blur-sm"
                      style={{
                        color: '#ff3333',
                        textShadow: '0 0 15px #ff000050',
                        animation: 'neonPulseGlow 6s ease-in-out infinite alternate'
                      }}
                      aria-hidden="true"
                    >Terminal_Ready</span>
                  </h2>
                  <style>{`
                  @keyframes neonFlickerText {
                    0%, 100% { 
                      opacity: 1; 
                      text-shadow: 0 0 5px #ff0000, 0 0 10px #ff000080, 0 0 20px #dc262660;
                    }
                    50% { opacity: 0.95; }
                  }
                  @keyframes neonPulseGlow {
                    0% { opacity: 0.2; filter: blur(4px); }
                    100% { opacity: 0.35; filter: blur(6px); }
                  }
                `}</style>

                  {/* Neon Dark Web Keywords Grid */}
                  <div className="mt-4 sm:mt-6 grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2 max-w-2xl px-4">
                    {[
                      { text: 'SILK_ROAD', color: '#ff0000' },
                      { text: 'HYDRA_MARKET', color: '#ff3333' },
                      { text: 'DEEP_WEB', color: '#dc2626' },
                      { text: 'BLACK_HAT', color: '#ff4444' },
                      { text: 'CRYPTO_MIXER', color: '#ef4444' },
                      { text: 'SHELL_ACCESS', color: '#f87171' },
                      { text: 'BACKDOOR', color: '#ff0000' },
                      { text: 'SQL_INJECT', color: '#ff3333' },
                      { text: 'XSS_ATTACK', color: '#dc2626' },
                      { text: 'DDOS_SWARM', color: '#ff4444' },
                      { text: 'MALWARE_LAB', color: '#ef4444' },
                      { text: 'ANON_NET', color: '#f87171' },
                    ].map((item, i) => (
                      <span
                        key={i}
                        className="px-2 py-1 text-[7px] font-black uppercase tracking-wider border rounded transition-all duration-500 hover:scale-110 cursor-default"
                        style={{
                          color: item.color,
                          borderColor: `${item.color}50`,
                          textShadow: `0 0 5px ${item.color}, 0 0 10px ${item.color}, 0 0 15px ${item.color}`,
                          boxShadow: `0 0 5px ${item.color}30, inset 0 0 10px ${item.color}10`,
                          animation: `neonFlicker ${2 + (i % 4) * 0.3}s ease-in-out infinite`,
                          animationDelay: `${i * 0.1}s`
                        }}
                      >
                        {item.text}
                      </span>
                    ))}
                  </div>
                  <style>{`
                  @keyframes neonFlicker {
                    0%, 100% { opacity: 1; filter: brightness(1); }
                    50% { opacity: 0.8; filter: brightness(1.2); }
                    52% { opacity: 0.4; filter: brightness(0.8); }
                    54% { opacity: 1; filter: brightness(1.3); }
                  }
                `}</style>

                  <div className="mt-6 sm:mt-12 grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3 w-full max-w-2xl px-4">
                    {SUGGESTED_PROMPTS.map((p, i) => (
                      <button key={i} onClick={() => { setInput(p); if (inputRef.current) inputRef.current.focus(); }} className="p-3 border-2 border-red-900/30 hover:border-red-600 hover:bg-red-600/10 text-[10px] text-left transition-all duration-300 uppercase hover:shadow-[0_0_15px_rgba(220,38,38,0.2)] rounded hover:text-red-400 font-bold">
                        {p}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                activeSession.messages.slice(-50).map((msg, i) => <ChatMessage key={msg.timestamp} message={msg} settings={settings} />)
              )}
            </div>
          </div>
          )}

          <div ref={inputContainerRef} className="px-3 sm:px-6 md:px-10 py-3 sm:py-4 pb-[calc(0.75rem+env(safe-area-inset-bottom))] sm:pb-[calc(1rem+env(safe-area-inset-bottom))] bg-gradient-to-t from-[#050000] via-[#0a0505] to-[#0a0505] border-t-2 border-red-900/30 z-10 hover:border-red-900/50 transition-colors duration-300">
            <div className="max-w-4xl mx-auto relative group">
              {/* Suggestion Chips */}
              {!isStreaming && suggestions.length > 0 && activeSession.messages.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-3 px-1 animate-fadeIn">
                  {suggestions.map((s, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleSend(s)}
                      className="px-3 py-1.5 bg-red-950/20 border border-red-900/40 rounded-full text-[10px] font-black text-red-500 hover:bg-red-600 hover:text-black hover:border-red-600 transition-all duration-300 uppercase tracking-widest shadow-[0_0_10px_rgba(220,38,38,0.1)] hover:shadow-[0_0_15px_rgba(220,38,38,0.4)] hover:scale-105 active:scale-95"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              )}
              {attachments.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-3 sm:mb-4 p-2 sm:p-3 border-2 border-red-900/30 rounded-t-lg bg-black/60 backdrop-blur hover:border-red-900/60 transition-colors duration-300">
                  {attachments.map((at, i) => (
                    <div key={i} className="relative group/at w-20 h-20 border-2 border-red-600/50 overflow-hidden rounded-lg bg-zinc-950 hover:border-red-600 transition-all duration-300 hover:shadow-[0_0_15px_rgba(220,38,38,0.3)]">
                      <img src={at} className="w-full h-full object-cover grayscale hover:grayscale-0 transition-all duration-500" alt="attachment" />
                      <button onClick={() => removeAttachment(i)} className="absolute inset-0 bg-red-600/80 opacity-0 group-hover/at:opacity-100 flex items-center justify-center text-black font-black text-xl transition-opacity duration-300 hover:bg-red-500">✕</button>
                    </div>
                  ))}
                </div>
              )}
              <AutocompleteDropdown
                visible={autocomplete.visible}
                type={autocomplete.type}
                query={autocomplete.query}
                activeIndex={autocomplete.index}
                onSelect={handleAutocompleteSelect}
              />
              <textarea
                ref={inputRef}
                value={input}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                onPaste={handlePaste}
                placeholder="Inject command string..."
                className={`relative w-full bg-black border-2 border-red-900/30 focus:border-red-600/60 focus:ring-0 text-xs font-mono p-2 sm:p-3 pl-20 sm:pl-28 pr-20 sm:pr-28 h-12 sm:h-14 resize-none transition-all outline-none text-red-100 placeholder:text-red-900/30 hover:border-red-900/50 ${attachments.length > 0 ? 'rounded-b-lg' : 'rounded-lg shadow-[0_0_15px_rgba(220,38,38,0.05)]'}`}
              />

              <div className="absolute left-1.5 sm:left-2 bottom-2 sm:bottom-2.5 flex items-center gap-1 sm:gap-2 z-20">
                <div className="relative">
                  <button
                    onClick={(e) => { e.stopPropagation(); setIsAgentMenuOpen(!isAgentMenuOpen); }}
                    className={`flex items-center gap-1 px-2 py-1 rounded-md border-2 bg-black/50 backdrop-blur hover:text-red-300 transition-all duration-300 group/ag active:scale-95 ${(settings.enabledTools?.length || 0) > 0 ? 'text-red-400 border-red-600/60 shadow-[0_0_12px_rgba(220,38,38,0.28)]' : 'text-zinc-500 border-red-900/30 hover:border-red-700/60'}`}
                    title="Agent Capabilities"
                  >
                    <span className="text-[9px] font-black uppercase tracking-widest hidden sm:inline">Agent</span>
                    <svg className={`w-3 h-3 transition-transform duration-300 ${isAgentMenuOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>

                  {isAgentMenuOpen && (
                    <div
                      ref={agentMenuRef}
                      className="absolute bottom-full left-0 mb-4 w-72 sm:w-80 bg-[#080404]/97 border-2 border-red-600/40 rounded-2xl overflow-hidden shadow-[0_20px_60px_rgba(0,0,0,0.9),0_0_30px_rgba(220,38,38,0.2)] z-[100] backdrop-blur-3xl animate-in fade-in slide-in-from-bottom-4 duration-500"
                    >
                      {/* Header with search */}
                      <div className="p-4 border-b border-red-900/40 bg-red-950/10">
                        <div className="flex items-center justify-between mb-3">
                          <div className="text-[10px] uppercase font-black tracking-[0.3em] text-red-500 flex items-center gap-2">
                            <span className="w-2 h-2 bg-red-600 rounded-full animate-pulse shadow-[0_0_10px_#dc2626]"></span>
                            Capabilities_Matrix
                          </div>
                          <div className="text-[10px] font-mono text-zinc-600 uppercase">State: Active</div>
                        </div>
                        <div className="relative group/search">
                          <input
                            type="text"
                            placeholder="SEARCH_MODULES..."
                            value={toolSearchQuery}
                            onChange={(e) => setToolSearchQuery(e.target.value)}
                            className="w-full bg-black/50 border border-red-900/40 rounded-lg py-2 pl-8 pr-3 text-[11px] font-mono text-red-400 placeholder:text-red-950/50 focus:outline-none focus:border-red-600/80 focus:ring-1 focus:ring-red-600/20 transition-all"
                          />
                          <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-red-900 group-focus-within/search:text-red-600 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                          </svg>
                        </div>
                      </div>

                      {/* Tools grouped by category */}
                      <div className="max-h-[400px] overflow-y-auto custom-scrollbar p-2 space-y-1 bg-gradient-to-b from-black/40 to-black/10">
                        {(() => {
                          const q = toolSearchQuery.toLowerCase().trim();
                          // Collect all categorised tool names
                          const categorisedNames = new Set(TOOL_CATEGORIES.flatMap(c => c.tools));
                          // Uncategorised tools (new tools not yet in any category)
                          const uncategorised = Object.keys(ATTACHED_TOOLS).filter(t => !categorisedNames.has(t));
                          const allCategories = [
                            ...TOOL_CATEGORIES,
                            ...(uncategorised.length > 0 ? [{ id: 'other', title: 'Other', description: '', icon: '🔩', color: '#71717a', tools: uncategorised }] : [])
                          ];

                          return allCategories.map(category => {
                            const filteredTools = category.tools.filter(toolName => {
                              const tool = (ATTACHED_TOOLS as any)[toolName];
                              if (!tool) return false;
                              if (!q) return true;
                              return (
                                toolName.toLowerCase().includes(q) ||
                                tool.function.name.toLowerCase().includes(q) ||
                                tool.function.description.toLowerCase().includes(q) ||
                                category.title.toLowerCase().includes(q)
                              );
                            });
                            if (filteredTools.length === 0) return null;

                            const allEnabled = filteredTools.every(t => (settings.enabledTools || []).includes(t));
                            const someEnabled = filteredTools.some(t => (settings.enabledTools || []).includes(t));

                            return (
                              <div key={category.id} className="rounded-xl overflow-hidden border border-zinc-800/50 mb-2">
                                {/* Category header */}
                                <div
                                  className="flex items-center justify-between px-3 py-2 cursor-pointer select-none"
                                  style={{ background: `${category.color}12` }}
                                  onClick={() => {
                                    // Toggle all tools in category
                                    setSettings(prev => {
                                      const enabled = new Set(prev.enabledTools || []);
                                      if (allEnabled) filteredTools.forEach(t => enabled.delete(t));
                                      else filteredTools.forEach(t => enabled.add(t));
                                      return { ...prev, enabledTools: Array.from(enabled) };
                                    });
                                  }}
                                >
                                  <div className="flex items-center gap-2">
                                    <span className="text-sm">{category.icon}</span>
                                    <span className="text-[11px] font-black uppercase tracking-widest" style={{ color: category.color }}>{category.title}</span>
                                    <span className="text-[9px] font-mono px-1.5 py-0.5 rounded-full bg-black/40" style={{ color: category.color }}>
                                      {filteredTools.filter(t => (settings.enabledTools || []).includes(t)).length}/{filteredTools.length}
                                    </span>
                                  </div>
                                  <div className={`w-7 h-3.5 rounded-full transition-all duration-300 flex items-center px-0.5 ${allEnabled ? 'shadow-[0_0_8px_rgba(220,38,38,0.5)]' : ''}`}
                                    style={{ background: allEnabled ? category.color : someEnabled ? `${category.color}60` : '#27272a' }}>
                                    <div className={`w-2.5 h-2.5 bg-white rounded-full transition-all duration-300 ${allEnabled ? 'translate-x-3' : 'translate-x-0'}`} />
                                  </div>
                                </div>

                                {/* Tool rows */}
                                <div className="divide-y divide-zinc-900/60">
                                  {filteredTools.map(toolName => {
                                    const tool = (ATTACHED_TOOLS as any)[toolName];
                                    if (!tool) return null;
                                    const enabled = (settings.enabledTools || []).includes(toolName);
                                    return (
                                      <label
                                        key={toolName}
                                        className={`flex items-center justify-between gap-2 px-3 py-1.5 cursor-pointer transition-all duration-150 ${enabled ? 'bg-zinc-900/60 text-zinc-200' : 'bg-black/20 text-zinc-500 hover:text-zinc-300'}`}
                                      >
                                        <div className="flex flex-col min-w-0">
                                          <span className="text-[11px] font-black uppercase tracking-wide truncate">{tool.function.name}</span>
                                          <span className="text-[9px] opacity-60 truncate max-w-[250px]">{tool.function.description}</span>
                                          {tool.function.parameters?.properties && Object.keys(tool.function.parameters.properties).length > 0 && (
                                            <span className="text-[8px] opacity-40 truncate max-w-[250px] mt-0.5 font-mono">
                                              {Object.entries(tool.function.parameters.properties).slice(0, 3).map(([k, v]: [string, any]) => `${k}${(tool.function.parameters.required || []).includes(k) ? '*' : ''}`).join(' · ')}
                                              {Object.keys(tool.function.parameters.properties).length > 3 ? ` +${Object.keys(tool.function.parameters.properties).length - 3}` : ''}
                                            </span>
                                          )}
                                        </div>
                                        <div className="relative flex items-center flex-shrink-0">
                                          <input type="checkbox" className="peer absolute opacity-0 w-full h-full cursor-pointer z-10"
                                            checked={enabled} onChange={() => toggleTool(toolName)} />
                                          <div className={`w-7 h-3.5 rounded-full transition-all duration-300 flex items-center px-0.5 ${enabled ? 'shadow-[0_0_6px_rgba(220,38,38,0.4)]' : ''}`}
                                            style={{ background: enabled ? category.color : '#27272a' }}>
                                            <div className={`w-2.5 h-2.5 bg-white rounded-full transition-all duration-300 ${enabled ? 'translate-x-3' : 'translate-x-0'}`} />
                                          </div>
                                        </div>
                                      </label>
                                    );
                                  })}
                                </div>
                              </div>
                            );
                          });
                        })()}
                      </div>

                      {/* Footer */}
                      <div className="p-3 border-t border-red-900/30 bg-black flex justify-between items-center">
                        <button
                          onClick={() => { setIsSidebarOpen(true); setIsAgentMenuOpen(false); }}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-red-700/90 text-white rounded text-[11px] font-black uppercase tracking-widest hover:bg-red-600 transition-all active:scale-95"
                        >
                          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24"><path d="M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z" /></svg>
                          Open_Settings
                        </button>
                        <div className="text-[8px] text-zinc-500 font-black uppercase italic">
                          Agent Core // All Tools
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="absolute right-1.5 sm:right-2 bottom-2 sm:bottom-2.5 flex items-center gap-1 sm:gap-2">
                {/* Voice Interface Toggle */}
                <button
                  id="voice-mode-trigger"
                  data-active={isVoiceRecording ? 'true' : 'false'}
                  onClick={handleVoiceToggle}
                  className={`text-red-900 hover:text-red-500 transition-all duration-200 hover:scale-110 p-1.5 flex items-center justify-center rounded-lg active:scale-95 ${isVoiceRecording ? 'bg-red-600/20 text-red-500 animate-pulse' : ''}`}
                  title="Live Voice Intercom"
                >
                  {isVoiceProcessing ? (
                    <div className="w-4 h-4 border-2 border-red-600 border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z" /><path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z" /></svg>
                  )}
                </button>

                <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" multiple accept="image/*" />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="text-red-900 hover:text-red-500 transition-all duration-200 hover:scale-110 p-1.5 flex items-center justify-center rounded-lg active:scale-95"
                  title="Attach Data Fragments"
                >
                  <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" /></svg>
                </button>
                {isStreaming && (
                  <button
                    onClick={handleAbort}
                    className="px-2 sm:px-3 py-1.5 bg-zinc-900 border border-red-600/30 text-red-600 font-black uppercase italic text-[8px] sm:text-[9px] tracking-tight hover:bg-red-600 hover:text-black transition-all rounded shadow-[0_0_10px_rgba(220,38,38,0.1)] active:scale-95"
                  >
                    STOP
                  </button>
                )}
                <button
                  onClick={() => handleSend()}
                  disabled={isStreaming || (!input.trim() && attachments.length === 0)}
                  className="px-3 sm:px-4 py-1.5 bg-gradient-to-r from-red-600 to-red-700 text-black font-black uppercase italic text-[9px] sm:text-[10px] tracking-tighter hover:from-red-500 hover:to-red-600 disabled:from-red-950/20 disabled:text-red-900 transition-all rounded shadow-[0_0_15px_rgba(220,38,38,0.2)] hover:scale-105 active:scale-95"
                >
                  {isStreaming ? "WAIT..." : "SEND"}
                </button>
              </div>
              <div className="absolute left-4 -top-2.5 px-3 bg-black text-[9px] font-black text-red-600 uppercase tracking-[0.4em] border-2 border-red-900/40 rounded-sm italic hover:border-red-600/60 transition-colors duration-300">INPUT_STREAM</div>
            </div>
          </div>
        </main>
      </div>
      {/* Settings moved into Sidebar */}
    </>
  );
};

// --- Settings Modal Component (Stable Version) ---
const SettingsModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  settings: AppSettings;
  setSettings: React.Dispatch<React.SetStateAction<AppSettings>>;
  initialTab?: 'system' | 'security' | 'connection' | 'tools' | 'apps';
}> = ({ isOpen, onClose, settings, setSettings, initialTab }) => {
  type SettingsTab = 'system' | 'security' | 'connection' | 'tools' | 'apps';
  const [activeTab, setActiveTab] = useState<SettingsTab>(initialTab || 'system');
  const [verificationStatuses, setVerificationStatuses] = useState<Record<string, 'idle' | 'verifying' | 'valid' | 'invalid'>>({});
  const [mcpTools, setMcpTools] = useState<Record<string, any[]>>({});
  const [toolSearchQuery, setToolSearchQuery] = useState('');

  useEffect(() => {
    if (isOpen) setActiveTab(initialTab || 'system');
  }, [isOpen, initialTab]);

  const verifyKey = async (provider: string, key: string) => {
    if (!key) {
      setVerificationStatuses(prev => ({ ...prev, [provider]: 'idle' }));
      return;
    }
    setVerificationStatuses(prev => ({ ...prev, [provider]: 'verifying' }));
    
    let isValid = false;
    try {
      const prov = provider.toLowerCase();
      if (prov.includes('gemini')) isValid = await geminiService.verifyApiKey(key);
      else if (prov.includes('groq')) isValid = await groqService.verifyApiKey(key);
      else if (prov.includes('anthropic')) isValid = await anthropicService.verifyApiKey(key);
      else if (prov.includes('openai')) isValid = await openaiService.verifyApiKey(key);
      else if (prov.includes('deepseek')) isValid = await deepseekService.verifyApiKey(key);
      else if (prov.includes('mistral')) isValid = await mistralService.verifyApiKey(key);
      else if (prov.includes('xai')) isValid = await xaiService.verifyApiKey(key);
      else if (prov.includes('perplexity')) isValid = await perplexityService.verifyApiKey(key);
      else if (prov.includes('together')) isValid = await togetherService.verifyApiKey(key);
      else if (prov.includes('openrouter')) isValid = await openrouterService.verifyApiKey(key);
      else if (prov.includes('cerebras')) isValid = await cerebrasService.verifyApiKey(key);
      else if (prov.includes('siliconflow')) isValid = await siliconflowService.verifyApiKey(key);
      else if (prov.includes('moonshot')) isValid = await moonshotService.verifyApiKey(key);
      else if (prov.includes('ollama')) isValid = await ollamaService.verifyApiKey(key);
      else if (prov.includes('pollinations')) isValid = await pollinationsService.verifyApiKey(key);
      else if (prov.includes('tinyfish')) isValid = await tinyfishService.verifyApiKey(key);
      else isValid = true; 
    } catch (e) { isValid = false; }
    
    setVerificationStatuses(prev => ({ ...prev, [provider]: isValid ? 'valid' : 'invalid' }));
  };

  if (!isOpen) return null;

  // CRITICAL: Defensive check to prevent crash if settings is undefined
  if (!settings) {
    return (
      <div className="fixed inset-0 z-[1001] flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-black/95" onClick={onClose} />
        <div className="relative bg-zinc-950 p-6 border-b-2 border-red-600 rounded text-red-500 font-mono text-center">
          [ ERR_NULL_SETTINGS_DETECTED ]
          <button onClick={() => { localStorage.clear(); window.location.reload(); }} className="mt-4 block w-full py-2 bg-red-600 text-black font-black uppercase text-[10px]">HARD_RESET</button>
        </div>
      </div>
    );
  }

  const updateSetting = (key: keyof AppSettings, value: any) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  const providers: { key: keyof AppSettings; label: string }[] = [
    { key: 'geminiApiKey', label: 'Google_Gemini' },
    { key: 'groqApiKey', label: 'Groq_Cloud' },
    { key: 'openaiApiKey', label: 'OpenAI_Elite' },
    { key: 'anthropicApiKey', label: 'Anthropic_Claude' },
    { key: 'deepseekApiKey', label: 'DeepSeek_V3' },
    { key: 'mistralApiKey', label: 'Mistral_Large' },
    { key: 'xaiApiKey', label: 'xAI_Grok' },
    { key: 'openRouterApiKey', label: 'OpenRouter_Omni' },
    { key: 'togetherApiKey', label: 'Together_AI' },
    { key: 'cerebrasApiKey', label: 'Cerebras_CS3' },
    { key: 'siliconFlowApiKey', label: 'SiliconFlow' },
    { key: 'perplexityApiKey', label: 'Perplexity_Labs' },
    { key: 'pollinationsApiKey', label: 'Pollinations_Gen' },
    { key: 'moonshotApiKey', label: 'Moonshot_Kimi' },
    { key: 'ollamaApiKey', label: 'Ollama_Cloud' },
    { key: 'wisGateApiKey', label: 'WisGate_AI' },

    // Extra tool/search integrations
    { key: 'cohereApiKey', label: 'Cohere' },
    { key: 'witAiServerToken', label: 'WitAI_Server_Token' },
    { key: 'tavilyApiKey', label: 'Tavily_Search' },
    { key: 'braveApiKey', label: 'Brave_Search' },
    { key: 'kagiApiKey', label: 'Kagi_Search' },
    { key: 'mojeekApiKey', label: 'Mojeek_Search' },
    { key: 'serperApiKey', label: 'Serper_Search' },
    { key: 'serpapiApiKey', label: 'SerpAPI_Search' },
    { key: 'firecrawlApiKey', label: 'Firecrawl' },
    { key: 'tinyfishApiKey', label: 'TinyFish_WebAgent' }
  ];

  useEffect(() => {
    if (activeTab === 'connection' && (settings?.mcpServerUrls?.length || 0) > 0) {
      settings.mcpServerUrls?.forEach(async (url) => {
        if (url && !mcpTools[url]) {
          try {
            const tools = await mcpService.getToolsByUrl(url);
            setMcpTools(prev => ({ ...prev, [url]: tools }));
          } catch (e) { console.error(e); }
        }
      });
    }
  }, [activeTab, settings?.mcpServerUrls]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'verifying': return 'bg-yellow-500 shadow-[0_0_10px_#eab308]';
      case 'valid': return 'bg-green-500 shadow-[0_0_10px_#22c55e]';
      case 'invalid': return 'bg-red-500 shadow-[0_0_10px_#dc2626]';
      default: return 'bg-zinc-800';
    }
  };

  try {
    return (
      <div className="fixed inset-0 z-[1001] flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-black/90 backdrop-blur-xl" onClick={onClose} />
        <div className="relative w-full max-w-2xl bg-[#0a0505] border-2 border-red-600/40 rounded-2xl shadow-[0_0_50px_rgba(220,38,38,0.3)] overflow-hidden">
          {/* Header */}
          <div className="p-6 border-b border-red-900/30 bg-red-950/10 flex justify-between items-center">
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse shadow-[0_0_10px_#dc2626]" />
              <h2 className="text-xl font-black uppercase tracking-[0.3em] text-red-500">System_Override_Center</h2>
            </div>
            <button onClick={onClose} className="p-2 text-red-900 hover:text-red-500 transition-colors">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>

          {/* Tabs */}
          <div className="flex border-b border-red-900/20 px-4 gap-4 bg-black/40">
            {[
              { id: 'system', label: 'SYSTEM_PARAM' },
              { id: 'security', label: 'SECURITY_VAULT' },
              { id: 'tools', label: 'TOOLS_PARAM' },
              { id: 'connection', label: 'NET_INTERFACE' },
              { id: 'apps', label: 'APP_CONNECT' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`px-4 py-3 text-[10px] font-black uppercase tracking-widest transition-all duration-300 border-b-2 ${activeTab === tab.id ? 'border-red-600 text-red-500 bg-red-600/10' : 'border-transparent text-zinc-600 hover:text-red-900'}`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Content */}
          <div className="p-6 max-h-[60vh] overflow-y-auto custom-scrollbar bg-gradient-to-b from-black to-[#050000]">
            {activeTab === 'system' && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-red-900 flex justify-between">
                      <span>Temperature</span>
                      <span className="text-red-500">{((settings as any)?.temperature || 0.87)}</span>
                    </label>
                    <input type="range" min="0" max="2" step="0.1" value={((settings as any)?.temperature || 0.87)} onChange={(e) => updateSetting('temperature', parseFloat(e.target.value))} className="w-full accent-red-600 bg-zinc-900 h-1 rounded-full appearance-none" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-red-900 flex justify-between">
                      <span>Top_P</span>
                      <span className="text-red-500">{((settings as any)?.topP || 1.0)}</span>
                    </label>
                    <input type="range" min="0" max="1" step="0.05" value={((settings as any)?.topP || 1.0)} onChange={(e) => updateSetting('topP', parseFloat(e.target.value))} className="w-full accent-red-600 bg-zinc-900 h-1 rounded-full appearance-none" />
                  </div>
                  {/* Simplified Token/Budget display to avoid complex logic during render */}
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-red-900">Max_Tokens</label>
                    <input type="number" value={((settings as any)?.maxTokens || 4000)} onChange={(e) => updateSetting('maxTokens', parseInt(e.target.value))} className="w-full bg-zinc-950 border border-red-900/30 rounded px-2 py-1.5 text-xs text-red-400 focus:border-red-600 outline-none" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-red-900">Thinking_Budget</label>
                    <input type="number" value={((settings as any)?.thinkingBudget || 2096)} onChange={(e) => updateSetting('thinkingBudget', parseInt(e.target.value))} className="w-full bg-zinc-950 border border-red-900/30 rounded px-2 py-1.5 text-xs text-red-400 focus:border-red-600 outline-none" />
                  </div>
                </div>
                <div className="space-y-2 mt-4">
                  <label className="text-[10px] font-black uppercase tracking-widest text-red-900">System_Instruction_Directive</label>
                  <textarea value={(settings as any)?.systemInstruction || ''} onChange={(e) => updateSetting('systemInstruction', e.target.value)} rows={4} className="w-full bg-zinc-950 border border-red-900/30 rounded-lg p-3 text-xs text-red-400 focus:border-red-600 outline-none font-mono custom-scrollbar" />
                </div>
              </div>
            )}

          {activeTab === 'tools' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <label className="text-[10px] font-black uppercase tracking-widest text-red-900">ALL_TOOLS_PARAMETERS</label>
                <div className="text-[8px] font-mono text-zinc-600 uppercase">{(settings.enabledTools?.length || 0)} ENABLED</div>
              </div>

              <div className="relative group/search">
                <input
                  type="text"
                  placeholder="SEARCH_MODULES..."
                  value={toolSearchQuery}
                  onChange={(e) => setToolSearchQuery(e.target.value)}
                  className="w-full bg-black/50 border border-red-900/40 rounded-lg py-2 pl-8 pr-3 text-[11px] font-mono text-red-400 placeholder:text-red-950/50 focus:outline-none focus:border-red-600/80 focus:ring-1 focus:ring-red-600/20 transition-all"
                />
                <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-red-900 group-focus-within/search:text-red-600 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>

              <div className="max-h-[46vh] overflow-y-auto custom-scrollbar p-1.5 space-y-2">
                {(() => {
                  const q = toolSearchQuery.toLowerCase().trim();
                  const categorisedNames = new Set(TOOL_CATEGORIES.flatMap(c => c.tools));
                  const uncategorised = Object.keys(ATTACHED_TOOLS).filter(t => !categorisedNames.has(t));
                  const allCategories = [
                    ...TOOL_CATEGORIES,
                    ...(uncategorised.length > 0 ? [{ id: 'other', title: 'Other', description: '', icon: '🔩', color: '#71717a', tools: uncategorised }] : [])
                  ];

                  const toggleToolInSettings = (toolName: string) => {
                    setSettings(prev => {
                      const tools = prev.enabledTools || [];
                      return { ...prev, enabledTools: tools.includes(toolName) ? tools.filter(t => t !== toolName) : [...tools, toolName] };
                    });
                  };

                  return allCategories.map(category => {
                    const filteredTools = category.tools.filter(toolName => {
                      const tool = (ATTACHED_TOOLS as any)[toolName];
                      if (!tool) return false;
                      if (!q) return true;
                      return (
                        toolName.toLowerCase().includes(q) ||
                        tool.function.name.toLowerCase().includes(q) ||
                        tool.function.description.toLowerCase().includes(q) ||
                        category.title.toLowerCase().includes(q)
                      );
                    });
                    if (filteredTools.length === 0) return null;

                    const enabledCount = filteredTools.filter(t => (settings.enabledTools || []).includes(t)).length;
                    const allEnabled = enabledCount === filteredTools.length;
                    const someEnabled = enabledCount > 0;

                    return (
                      <div key={category.id} className="rounded-xl overflow-hidden border border-zinc-800/40">
                        {/* Category header — click to toggle all */}
                        <div
                          className="flex items-center justify-between px-4 py-2.5 cursor-pointer select-none group/cat"
                          style={{ background: `${category.color}10` }}
                          onClick={() => setSettings(prev => {
                            const enabled = new Set(prev.enabledTools || []);
                            if (allEnabled) filteredTools.forEach(t => enabled.delete(t));
                            else filteredTools.forEach(t => enabled.add(t));
                            return { ...prev, enabledTools: Array.from(enabled) };
                          })}
                        >
                          <div className="flex items-center gap-2.5">
                            <span className="text-base leading-none">{category.icon}</span>
                            <div className="flex flex-col">
                              <span className="text-[10px] font-black uppercase tracking-widest" style={{ color: category.color }}>{category.title}</span>
                              <span className="text-[7px] text-zinc-600 uppercase tracking-wide">{category.description}</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-[8px] font-mono" style={{ color: someEnabled ? category.color : '#52525b' }}>
                              {enabledCount}/{filteredTools.length}
                            </span>
                            <div className={`w-9 h-4.5 h-[18px] rounded-full transition-all duration-300 flex items-center px-0.5`}
                              style={{ background: allEnabled ? category.color : someEnabled ? `${category.color}50` : '#27272a', boxShadow: allEnabled ? `0 0 10px ${category.color}60` : 'none' }}>
                              <div className={`w-3 h-3 bg-white rounded-full transition-all duration-300 ${allEnabled ? 'translate-x-[18px]' : 'translate-x-0'}`} />
                            </div>
                          </div>
                        </div>

                        {/* Tool rows */}
                        <div className="divide-y divide-zinc-900/50">
                          {filteredTools.map(toolName => {
                            const tool = (ATTACHED_TOOLS as any)[toolName];
                            if (!tool) return null;
                            const enabled = (settings.enabledTools || []).includes(toolName);
                            return (
                              <label
                                key={toolName}
                                className={`flex items-center justify-between gap-3 px-4 py-2 cursor-pointer transition-all duration-200 group/tool ${enabled ? 'bg-zinc-900/50 text-zinc-200' : 'bg-black/10 text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900/20'}`}
                              >
                                <div className="flex flex-col min-w-0">
                                  <span className="text-[10px] font-black uppercase tracking-wider truncate">{tool.function.name}</span>
                                  <span className="text-[8px] text-zinc-600 group-hover/tool:text-zinc-500 transition-colors truncate max-w-[300px]">{tool.function.description}</span>
                                  {tool.function.parameters?.properties && Object.keys(tool.function.parameters.properties).length > 0 && (
                                    <span className="text-[7px] text-zinc-700 font-mono truncate max-w-[300px] mt-0.5">
                                      {Object.entries(tool.function.parameters.properties).slice(0, 4).map(([k, v]: [string, any]) => (
                                        <span key={k} className="mr-1.5">
                                          <span className={(tool.function.parameters.required || []).includes(k) ? 'text-zinc-500' : 'text-zinc-700'}>{k}</span>
                                          <span className="text-zinc-800">:{(v as any).type || 'any'}</span>
                                          {(tool.function.parameters.required || []).includes(k) && <span className="text-red-900">*</span>}
                                        </span>
                                      ))}
                                      {Object.keys(tool.function.parameters.properties).length > 4 && <span className="text-zinc-800">+{Object.keys(tool.function.parameters.properties).length - 4} more</span>}
                                    </span>
                                  )}
                                </div>
                                <div className="relative flex items-center flex-shrink-0">
                                  <input type="checkbox" className="peer absolute opacity-0 w-full h-full cursor-pointer z-10"
                                    checked={enabled} onChange={() => toggleToolInSettings(toolName)} />
                                  <div className="w-8 h-4 rounded-full transition-all duration-300 flex items-center px-0.5"
                                    style={{ background: enabled ? category.color : '#27272a', boxShadow: enabled ? `0 0 8px ${category.color}50` : 'none' }}>
                                    <div className={`w-3 h-3 bg-white rounded-full transition-all duration-300 ${enabled ? 'translate-x-4' : 'translate-x-0'}`} />
                                  </div>
                                </div>
                              </label>
                            );
                          })}
                        </div>
                      </div>
                    );
                  });
                })()}
              </div>
            </div>
          )}

          {activeTab === 'security' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {providers.map(p => {
                const status = verificationStatuses[p.key] || 'idle';
                const hasKey = !!((settings as any)?.[p.key]);
                const borderColor = status === 'valid' ? 'border-green-500/50' : status === 'invalid' ? 'border-red-500/50' : status === 'verifying' ? 'border-yellow-500/50' : 'border-red-900/10';
                const bgColor = status === 'valid' ? 'bg-green-900/10' : status === 'invalid' ? 'bg-red-900/10' : status === 'verifying' ? 'bg-yellow-900/10' : 'bg-zinc-950/50';
                
                return (
                  <div key={p.key} className={`space-y-2 p-3 rounded-xl ${bgColor} border ${borderColor} hover:border-red-600/40 transition-all duration-300`}>
                    <div className="flex justify-between items-center">
                      <label className={`text-[9px] font-black uppercase tracking-wider ${status === 'valid' ? 'text-green-400' : status === 'invalid' ? 'text-red-400' : 'text-zinc-500'}`}>{p.label}</label>
                      <div className="flex items-center gap-1.5">
                        <div className={`w-1.5 h-1.5 rounded-full transition-all duration-300 ${
                          status === 'valid' ? 'bg-green-500 shadow-[0_0_8px_#22c55e]' :
                          status === 'invalid' ? 'bg-red-500 shadow-[0_0_8px_#dc2626]' :
                          status === 'verifying' ? 'bg-yellow-500 shadow-[0_0_8px_#eab308] animate-pulse' :
                          hasKey ? 'bg-zinc-600' : 'bg-zinc-800'
                        }`} />
                        {hasKey && (
                          <button
                            onClick={() => verifyKey(p.key, (settings as any)?.[p.key] || '')}
                            className={`text-[6px] font-black uppercase tracking-tighter px-1.5 py-0.5 rounded transition-all ${
                              status === 'valid' ? 'bg-green-600 text-black' :
                              status === 'invalid' ? 'bg-red-600 text-black' :
                              status === 'verifying' ? 'bg-yellow-600 text-black animate-pulse' :
                              'bg-zinc-800 text-zinc-400 hover:bg-red-600 hover:text-black'
                            }`}
                          >
                            {status === 'valid' ? '✓' : status === 'invalid' ? '✗' : status === 'verifying' ? '...' : 'V'}
                          </button>
                        )}
                      </div>
                    </div>
                    <input
                      type="password"
                      value={(settings as any)?.[p.key] || ''}
                      onChange={(e) => {
                        updateSetting(p.key, e.target.value);
                        setVerificationStatuses(prev => ({ ...prev, [p.key]: 'idle' }));
                      }}
                      placeholder="KEY_HIDDEN"
                      className={`w-full ${status === 'valid' ? 'bg-green-900/20' : status === 'invalid' ? 'bg-red-900/20' : 'bg-black/50'} border ${borderColor} rounded px-2 py-1.5 text-[10px] ${status === 'valid' ? 'text-green-400' : status === 'invalid' ? 'text-red-400' : 'text-red-500'} focus:border-red-600 outline-none transition-all placeholder:text-red-950/30`}
                    />
                  </div>
                );
              })}
            </div>
          )}

          {activeTab === 'apps' && (
            <div className="space-y-6">
              {/* App Integrations Header */}
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-[12px] font-black uppercase tracking-widest text-red-500">App_Integrations</h3>
                  <p className="text-[9px] text-zinc-600 mt-1">Connect apps with API keys/tokens for direct access. Click links to get your keys.</p>
                </div>
                <div className="text-[8px] font-mono text-zinc-700">{APP_INTEGRATIONS.filter(a => (settings.connectedApps || []).includes(a.id)).length}/{APP_INTEGRATIONS.length} linked</div>
              </div>

              {/* App categories */}
              {(() => {
                const cats = [...new Set(APP_INTEGRATIONS.map(i => i.category))];
                return cats.map(cat => (
                  <div key={cat} className="space-y-2">
                    <div className="text-[9px] font-black uppercase tracking-widest text-red-900 border-b border-red-900/20 pb-1">{cat}</div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {APP_INTEGRATIONS.filter(i => i.category === cat).map(app => {
                        const settingsKeyTyped = app.settingsKey as keyof AppSettings;
                        const hasToken = app.authType === 'none' || !!((settings as any)?.[settingsKeyTyped]);
                        const isConnected = app.authType === 'none' || (hasToken && (settings.connectedApps || []).includes(app.id));
                        return (
                          <div key={app.id} className={`p-3 rounded-xl border transition-all duration-300 ${isConnected ? 'bg-red-600/5 border-red-600/30' : 'bg-zinc-950/40 border-zinc-800/40 hover:border-red-900/40'}`}>
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-2">
                                {app.svgIcon ? (
                                  <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5" style={{ color: app.color }}>
                                    <path d={app.svgIcon} />
                                  </svg>
                                ) : (
                                  <span className="text-lg">{app.icon}</span>
                                )}
                                <div>
                                  <div className="flex items-center gap-1.5">
                                    <span className="text-[10px] font-black text-zinc-300">{app.name}</span>
                                    <span className="text-[7px] font-black uppercase px-1.5 py-0.5 rounded" style={{ background: isConnected ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.1)', color: isConnected ? '#22c55e' : '#71717a' }}>
                                      {isConnected ? 'LINKED' : app.authType === 'none' ? 'FREE' : app.authType.toUpperCase()}
                                    </span>
                                  </div>
                                  <div className="text-[8px] text-zinc-600">{app.description}</div>
                                </div>
                              </div>
                            </div>

                            {/* API Key/Token Input */}
                            {app.authType !== 'none' && app.settingsKey && (
                              <div className="space-y-1.5">
                                <div className="flex gap-1.5">
                                  <input type="password" value={(settings as any)?.[settingsKeyTyped] || ''}
                                    onChange={(e) => updateSetting(settingsKeyTyped, e.target.value)}
                                    placeholder={`${app.name} ${app.authType === 'webhook' ? 'Webhook URL' : app.authType === 'bot_token' ? 'Bot Token' : 'API Key/Token'}`}
                                    className="flex-1 bg-black/50 border border-red-900/20 rounded px-2 py-1.5 text-[9px] text-red-400 outline-none focus:border-red-600 transition-all font-mono min-w-0" />
                                  <button
                                    onClick={() => {
                                      const currentApps = settings.connectedApps || [];
                                      if (isConnected) {
                                        updateSetting('connectedApps', currentApps.filter((a: string) => a !== app.id));
                                        integrationRegistry.disconnect(app.id);
                                      } else if (hasToken) {
                                        updateSetting('connectedApps', [...currentApps, app.id]);
                                        integrationRegistry.connect(app.id);
                                      }
                                    }}
                                    disabled={!hasToken}
                                    className={`text-[8px] font-black uppercase px-3 py-1.5 rounded flex-shrink-0 transition-all ${isConnected ? 'text-red-400 border border-red-500/30 hover:bg-red-900/20' : hasToken ? 'text-green-400 border border-green-500/30 hover:bg-green-900/20' : 'text-zinc-700 border border-zinc-800 cursor-not-allowed'}`}>
                                    {isConnected ? 'UNLINK' : 'LINK'}
                                  </button>
                                </div>

                                {/* Extra settings inputs (e.g. WhatsApp phoneNumberId, Trello token) */}
                                {app.extraSettings?.map(extra => (
                                  <input key={extra.key} type="password" value={(settings as any)?.[extra.key] || ''}
                                    onChange={(e) => updateSetting(extra.key as keyof AppSettings, e.target.value)}
                                    placeholder={extra.placeholder}
                                    className="w-full bg-black/50 border border-red-900/20 rounded px-2 py-1.5 text-[9px] text-red-400 outline-none focus:border-red-600 transition-all font-mono" />
                                ))}
                              </div>
                            )}

                            {/* Direct links to docs & token generation */}
                            <div className="flex flex-wrap gap-1.5 mt-2">
                              {app.docsUrl && (
                                <a href={app.docsUrl} target="_blank" rel="noopener noreferrer" className="text-[7px] font-black uppercase px-1.5 py-0.5 rounded border border-zinc-800 text-zinc-500 hover:border-red-600 hover:text-red-400 transition-all">
                                  Docs
                                </a>
                              )}
                              {app.getTokenUrl && (
                                <a href={app.getTokenUrl} target="_blank" rel="noopener noreferrer" className="text-[7px] font-black uppercase px-1.5 py-0.5 rounded border border-red-900/30 text-red-700 hover:border-red-600 hover:text-red-400 transition-all">
                                  Get API Key
                                </a>
                              )}
                            </div>

                            {/* Feature badges */}
                            {isConnected && (
                              <div className="mt-2 flex flex-wrap gap-1">
                                {app.features.map(f => (
                                  <span key={f} className="text-[7px] font-bold uppercase px-1.5 py-0.5 rounded bg-red-600/10 text-red-600/60">{f}</span>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ));
              })()}

              {/* MCP API Requirements Section */}
              <div className="space-y-3 pt-2 border-t border-red-900/20">
                <div>
                  <h3 className="text-[11px] font-black uppercase tracking-widest text-red-500">MCP_API_Requirements</h3>
                  <p className="text-[8px] text-zinc-600 mt-0.5">Some MCP servers require API keys. Enter them here to enable full functionality.</p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {[
                    { key: 'tavilyApiKey', label: 'Tavily Search', placeholder: 'Tavily API Key', docsUrl: 'https://tavily.com/#api', getTokenUrl: 'https://app.tavily.com/home' },
                    { key: 'braveApiKey', label: 'Brave Search', placeholder: 'Brave Search API Key', docsUrl: 'https://brave.com/search/api/', getTokenUrl: 'https://api.search.brave.com/app/dashboard' },
                    { key: 'serperApiKey', label: 'Serper Search', placeholder: 'Serper API Key', docsUrl: 'https://serper.dev/docs', getTokenUrl: 'https://serper.dev/api-key' },
                    { key: 'serpapiApiKey', label: 'SerpAPI', placeholder: 'SerpAPI Key', docsUrl: 'https://serpapi.com/manage-api-key', getTokenUrl: 'https://serpapi.com/manage-api-key' },
                    { key: 'firecrawlApiKey', label: 'Firecrawl', placeholder: 'Firecrawl API Key', docsUrl: 'https://docs.firecrawl.dev/', getTokenUrl: 'https://www.firecrawl.dev/app/api-keys' },
                    { key: 'cohereApiKey', label: 'Cohere', placeholder: 'Cohere API Key', docsUrl: 'https://docs.cohere.com/', getTokenUrl: 'https://dashboard.cohere.com/api-keys' },
                    { key: 'kagiApiKey', label: 'Kagi Search', placeholder: 'Kagi API Key', docsUrl: 'https://help.kagi.com/kagi/api/', getTokenUrl: 'https://kagi.com/settings?p=api' },
                    { key: 'mojeekApiKey', label: 'Mojeek Search', placeholder: 'Mojeek API Key', docsUrl: 'https://www.mojeek.com/services/api.html', getTokenUrl: 'https://www.mojeek.com/services/search/web-search-api/' },
                  ].map(mcp => (
                    <div key={mcp.key} className={`p-3 rounded-xl border transition-all ${(settings as any)?.[mcp.key] ? 'bg-red-600/5 border-red-600/30' : 'bg-zinc-950/40 border-zinc-800/40 hover:border-red-900/40'}`}>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-[9px] font-black text-zinc-400">{mcp.label}</span>
                        <div className={`w-1.5 h-1.5 rounded-full ${(settings as any)?.[mcp.key] ? 'bg-green-500 shadow-[0_0_6px_#22c55e]' : 'bg-zinc-800'}`} />
                      </div>
                      <input type="password" value={(settings as any)?.[mcp.key] || ''}
                        onChange={(e) => updateSetting(mcp.key as keyof AppSettings, e.target.value)}
                        placeholder={mcp.placeholder}
                        className="w-full bg-black/50 border border-red-900/20 rounded px-2 py-1.5 text-[9px] text-red-400 outline-none focus:border-red-600 transition-all font-mono" />
                      <div className="flex gap-1.5 mt-1.5">
                        <a href={mcp.docsUrl} target="_blank" rel="noopener noreferrer" className="text-[7px] font-black uppercase px-1.5 py-0.5 rounded border border-zinc-800 text-zinc-500 hover:border-red-600 hover:text-red-400 transition-all">Docs</a>
                        <a href={mcp.getTokenUrl} target="_blank" rel="noopener noreferrer" className="text-[7px] font-black uppercase px-1.5 py-0.5 rounded border border-red-900/30 text-red-700 hover:border-red-600 hover:text-red-400 transition-all">Get Key</a>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="text-[8px] text-zinc-700 p-3 bg-zinc-950/30 rounded-lg border border-zinc-800/40">
                Linked apps enable tools in the App Integrations category. Enable them from the tools panel. 1SecMail requires no API key.
              </div>
            </div>
          )}

          {activeTab === 'connection' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between p-4 bg-red-600/5 rounded-xl border border-red-600/20">
                <div className="flex flex-col">
                  <span className="text-[11px] font-black uppercase tracking-widest text-red-500">MCP_Bridge_Active</span>
                  <span className="text-[8px] text-zinc-600">Toggle local/remote tool context protocol</span>
                </div>
                <button
                  onClick={() => updateSetting('mcpEnabled', !(settings as any)?.mcpEnabled)}
                  className={`w-12 h-6 rounded-full transition-all duration-300 flex items-center px-1 ${(settings as any)?.mcpEnabled ? 'bg-red-600' : 'bg-zinc-800'}`}
                >
                  <div className={`w-4 h-4 bg-white rounded-full transition-all duration-300 ${(settings as any)?.mcpEnabled ? 'translate-x-6' : 'translate-x-0'}`} />
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-red-900">Ollama_Host</label>
                  <input
                    type="text"
                    value={(settings as any)?.ollamaHost || ''}
                    onChange={(e) => updateSetting('ollamaHost', e.target.value)}
                    placeholder="http://localhost:11434"
                    className="w-full bg-zinc-950 border border-red-900/30 rounded px-3 py-1.5 text-xs text-red-400 outline-none focus:border-red-600"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-red-900">WisGate_Host</label>
                  <input
                    type="text"
                    value={(settings as any)?.wisGateHost || ''}
                    onChange={(e) => updateSetting('wisGateHost', e.target.value)}
                    placeholder="https://api.wisgate.ai/v1"
                    className="w-full bg-zinc-950 border border-red-900/30 rounded px-3 py-1.5 text-xs text-red-400 outline-none focus:border-red-600"
                  />
                </div>
              </div>

              <div className="space-y-3">
                <label className="text-[10px] font-black uppercase tracking-widest text-red-900">Linked_Nodes</label>
                {((settings as any)?.mcpServerUrls || []).map((url: string, idx: number) => {
                  const status = mcpService.getStatus(url);
                  const toolCount = mcpService.getToolCount(url);
                  const statusColor = status === 'connected' ? '#22c55e' : status === 'connecting' ? '#eab308' : status === 'error' ? '#ef4444' : '#52525b';
                  return (
                    <div key={idx} className="flex gap-2 items-center">
                      <span className="w-2 h-2 rounded-full flex-shrink-0 transition-all" style={{ background: statusColor, boxShadow: status === 'connected' ? `0 0 6px ${statusColor}` : 'none' }} title={status} />
                      <input
                        type="text"
                        value={url}
                        onChange={(e) => {
                          const newUrls = [...((settings as any)?.mcpServerUrls || [])];
                          newUrls[idx] = e.target.value;
                          updateSetting('mcpServerUrls', newUrls);
                        }}
                        className="flex-1 bg-zinc-950 border border-red-900/30 rounded px-3 py-1.5 text-xs text-red-400 outline-none focus:border-red-600 font-mono"
                      />
                      {status === 'connected' && toolCount > 0 && (
                        <span className="text-[8px] font-black text-green-500 flex-shrink-0">{toolCount} tools</span>
                      )}
                      {status === 'error' && <span className="text-[8px] text-red-500 flex-shrink-0">ERR</span>}
                      <button
                        onClick={() => {
                          const newUrls = ((settings as any)?.mcpServerUrls || []).filter((_: any, i: number) => i !== idx);
                          updateSetting('mcpServerUrls', newUrls);
                        }}
                        className="p-2 text-red-900 hover:text-red-500 transition-colors"
                      >✕</button>
                    </div>
                  );
                })}
                <button
                  onClick={() => updateSetting('mcpServerUrls', [...((settings as any)?.mcpServerUrls || []), ''])}
                  className="w-full py-2 border-2 border-dashed border-red-900/30 rounded-lg text-[9px] font-black uppercase tracking-widest text-red-900 hover:border-red-600 hover:text-red-500 transition-all"
                >
                  + Add_New_Node
                </button>
              </div>

              {/* Curated MCP Servers */}
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-red-900">Curated_Servers</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto custom-scrollbar pr-1">
                  {mcpService.CURATED_SERVERS.map(server => {
                    const alreadyAdded = ((settings as any)?.mcpServerUrls || []).includes(server.url);
                    const status = mcpService.getStatus(server.url);
                    const statusColor = status === 'connected' ? '#22c55e' : status === 'connecting' ? '#eab308' : status === 'error' ? '#ef4444' : '#3f3f46';
                    return (
                      <div key={server.url} className={`flex items-center justify-between gap-2 p-2.5 rounded-lg border transition-all ${alreadyAdded ? 'bg-red-600/5 border-red-600/30' : 'bg-zinc-950/40 border-zinc-800/40 hover:border-red-900/40'}`}>
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: statusColor, boxShadow: status === 'connected' ? `0 0 5px ${statusColor}` : 'none' }} />
                          <div className="min-w-0">
                            <div className="text-[9px] font-black text-zinc-300 truncate">{server.name}</div>
                            <div className="text-[7px] text-zinc-600 font-mono">{server.category}</div>
                          </div>
                        </div>
                        <button
                          onClick={() => {
                            if (alreadyAdded) {
                              updateSetting('mcpServerUrls', ((settings as any)?.mcpServerUrls || []).filter((u: string) => u !== server.url));
                            } else {
                              updateSetting('mcpServerUrls', [...((settings as any)?.mcpServerUrls || []), server.url]);
                            }
                          }}
                          className={`text-[7px] font-black uppercase px-2 py-0.5 rounded flex-shrink-0 transition-all ${alreadyAdded ? 'text-red-400 border border-red-500/30 hover:bg-red-900/20' : 'text-zinc-400 border border-zinc-700 hover:border-red-600 hover:text-red-400'}`}
                        >
                          {alreadyAdded ? 'Remove' : 'Add'}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>

              {Object.keys(mcpTools || {}).length > 0 && (
                <div className="space-y-3">
                  <label className="text-[10px] font-black uppercase tracking-widest text-red-900">MCP_Discovered_Tools</label>
                  <div className="space-y-3 max-h-[26vh] overflow-y-auto custom-scrollbar">
                    {Object.entries(mcpTools).map(([url, tools]) => (
                      <div key={url} className="p-3 bg-zinc-950/40 border border-red-900/20 rounded-xl">
                        <div className="flex items-center justify-between mb-2">
                          <div className="text-[9px] font-black uppercase tracking-wider text-red-500 truncate">{url}</div>
                          <div className="text-[8px] font-mono text-zinc-600 uppercase">{(tools as any[])?.length || 0} TOOLS</div>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {(tools as any[]).slice(0, 40).map((t: any, i: number) => (
                            <span
                              key={`${t?.name || 'tool'}-${i}`}
                              className="px-2 py-1 bg-black/40 border border-red-900/20 rounded text-[8px] text-red-400 font-mono truncate max-w-[240px]"
                              title={t?.description || t?.name}
                            >
                              {t?.name || `tool_${i + 1}`}
                            </span>
                          ))}
                          {((tools as any[])?.length || 0) > 40 && (
                            <span className="px-2 py-1 text-[8px] text-zinc-600 font-mono">
                              +{((tools as any[])?.length || 0) - 40} more…
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

          <div className="p-6 border-t border-red-900/30 bg-black flex justify-between items-center text-[9px] font-black uppercase tracking-widest text-zinc-700">
            <div>Settings_v4.5.0_Defensive</div>
            <button
              onClick={() => { if (confirm("REBOOT?")) { localStorage.clear(); window.location.reload(); } }}
              className="text-red-900 hover:text-red-500 transition-colors"
            >
              [ PURGE_ALL_DATA ]
            </button>
          </div>
        </div>
      </div>
    );
  } catch (e: any) {
    console.error('SETTINGS_MODAL_RENDER_FAILED', e);
    return (
      <div className="fixed inset-0 z-[1001] flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-black/90 backdrop-blur-xl" onClick={onClose} />
        <div className="relative w-full max-w-lg bg-[#0a0505] border-2 border-red-600/40 rounded-2xl shadow-[0_0_50px_rgba(220,38,38,0.3)] overflow-hidden p-6">
          <div className="text-red-500 font-black uppercase tracking-widest text-sm mb-3">SETTINGS_CRASH_GUARD</div>
          <div className="text-red-900 text-xs font-mono bg-black/40 border border-red-900/30 rounded p-3 max-h-40 overflow-auto">
            {String(e?.message || e)}
          </div>
          <button
            onClick={() => { localStorage.clear(); window.location.reload(); }}
            className="mt-4 w-full py-2 bg-red-600 text-black font-black uppercase text-[10px] tracking-[0.2em] rounded"
          >
            [ PURGE_AND_REBOOT ]
          </button>
        </div>
      </div>
    );
  }
};

export default App;
