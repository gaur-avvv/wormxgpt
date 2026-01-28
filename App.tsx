import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Message, AppSettings, ChatSession } from './types';
import { DEFAULT_SYSTEM_INSTRUCTION, SUGGESTED_PROMPTS, MODEL_OPTIONS } from './constants';
import { geminiService } from './services/gemini';
import { groqService } from './services/groq';
import { pollinationsService } from './services/pollinations';

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
const CodeBlock: React.FC<{ className?: string; children?: React.ReactNode }> = ({ className, children }) => {
  const [copied, setCopied] = useState(false);
  const codeRef = useRef<HTMLElement>(null);
  
  const language = className?.replace('language-', '') || 'code';
  
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
  
  return (
    <div className="relative group my-3">
      {/* Header bar with language and copy button */}
      <div className="flex items-center justify-between px-4 py-2 bg-zinc-900/90 border-b border-red-900/30 rounded-t-lg">
        <span className="text-[10px] uppercase font-black tracking-widest text-red-500/70">
          {language}
        </span>
        <button
          onClick={handleCopy}
          className={`flex items-center gap-1.5 px-3 py-1 rounded text-[10px] uppercase font-black tracking-wider transition-all duration-300 ${
            copied 
              ? 'bg-green-600 text-black shadow-[0_0_15px_rgba(34,197,94,0.5)]' 
              : 'bg-zinc-800 text-red-400 hover:bg-red-600 hover:text-black hover:shadow-[0_0_15px_rgba(220,38,38,0.5)]'
          }`}
        >
          {copied ? (
            <>
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              COPIED!
            </>
          ) : (
            <>
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
              COPY
            </>
          )}
        </button>
      </div>
      {/* Code content */}
      <pre className="!mt-0 !rounded-t-none bg-black/80 border border-t-0 border-red-900/20 overflow-x-auto">
        <code ref={codeRef} className={className}>
          {children}
        </code>
      </pre>
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
      className={`px-1.5 py-0.5 rounded cursor-pointer transition-all duration-200 ${
        copied 
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
        <span className="text-green-500 text-lg">✓</span>
        <span className="text-green-400 text-sm font-mono">{message}</span>
      </div>
    </div>
  );
};

// Image generation models that should auto-generate images (includes video models using image API)
const IMAGE_MODELS = [
  // Image models
  'flux', 'flux-pro', 'flux-realism', 'flux-cablyai', 'flux-anime', 'flux-3d',
  'turbo', 'zimage', 'dreamshaper', 
  'nanobanana', 'nanobanana-pro',
  'seedream', 'seedream-pro', 'seedream-3.0',
  'gptimage', 'gptimage-large', 'gptimage-1.5',
  'kontext', 'ideogram', 'recraft',
  // Video models (use image API - generates frame/thumbnail)
  'veo', 'veo-2', 'veo-3', 'seedance', 'wan-pro', 'hunyuan', 'mochi', 'ltx'
];

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
      setToastMsg('✅ IMAGE_DOWNLOADED');
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
      setToastMsg('✅ IMAGE_COPIED_TO_CLIPBOARD');
      setTimeout(() => setToastMsg(''), 2000);
    } catch (err) {
      console.error('Copy failed:', err);
      await navigator.clipboard.writeText(imageSrc);
      setToastMsg('📋 IMAGE_URL_COPIED');
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
  onCopy: () => void;
  onExport: () => void;
  hasKey: boolean;
  setHasKey: (val: boolean) => void;
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
  onCopy,
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
  useEffect(() => {
    const checkKey = async () => {
      if (window.aistudio?.hasSelectedApiKey) {
        const result = await window.aistudio.hasSelectedApiKey();
        setHasKey(result);
      }
    };
    checkKey();
    const interval = setInterval(checkKey, 5000);
    return () => clearInterval(interval);
  }, [setHasKey]);

  const [hijackStatus, setHijackStatus] = useState<string | null>(null);
  const [hijackedIdentity, setHijackedIdentity] = useState<{
    ip: string;
    mac: string;
    location: string;
    isp: string;
    proxy: string;
    tor: string;
  } | null>(null);

  const handleHijack = async () => {
    // Try the aistudio API first
    if (window.aistudio?.openSelectKey) {
      await window.aistudio.openSelectKey();
      setHasKey(true);
    }
    
    // Generate fake hacker identity data with dramatic animation
    setHijackStatus('INITIALIZING...');
    
    const stages = [
      'SCANNING_NETWORKS...',
      'SPOOFING_MAC_ADDRESS...',
      'ROUTING_THROUGH_TOR...',
      'ESTABLISHING_VPN_CHAIN...',
      'HIJACKING_IDENTITY...',
      'IDENTITY_SECURED ✓'
    ];
    
    for (let i = 0; i < stages.length; i++) {
      await new Promise(r => setTimeout(r, 400));
      setHijackStatus(stages[i]);
    }
    
    // Generate random identity
    const randomIP = () => `${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`;
    const randomMAC = () => Array.from({length: 6}, () => Math.floor(Math.random() * 256).toString(16).padStart(2, '0')).join(':').toUpperCase();
    const locations = ['MOSCOW_RU', 'PYONGYANG_KP', 'TEHRAN_IR', 'MINSK_BY', 'CARACAS_VE', 'HAVANA_CU', 'DAMASCUS_SY', 'BELGRADE_RS'];
    const isps = ['SHADOW_NET', 'DARK_FIBER', 'GHOST_LINK', 'NULL_ROUTE', 'VOID_PROXY', 'PHANTOM_ISP'];
    const proxies = ['SOCKS5_ELITE', 'HTTP_ANON', 'HTTPS_TUNNEL', 'SSH_PROXY', 'SHADOWSOCKS'];
    
    setHijackedIdentity({
      ip: randomIP(),
      mac: randomMAC(),
      location: locations[Math.floor(Math.random() * locations.length)],
      isp: isps[Math.floor(Math.random() * isps.length)],
      proxy: proxies[Math.floor(Math.random() * proxies.length)],
      tor: `EXIT_NODE_${Math.floor(Math.random() * 9999).toString().padStart(4, '0')}`
    });
    
    await new Promise(r => setTimeout(r, 500));
    setHijackStatus(null);
  };

  const handleApiKeyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setApiKeyInput(val);
    setSettings(prev => ({ ...prev, apiKey: val }));
    if (settings.aiProvider === 'groq') {
      groqService.setApiKey(val);
    } else {
      geminiService.setApiKey(val);
    }
  };

  return (
    <>
      {/* Mobile Backdrop Overlay */}
      {isMobileOpen && (
        <div 
          className="fixed inset-0 bg-black/80 backdrop-blur-sm z-30 lg:hidden"
          onClick={onMobileClose}
        />
      )}
      
      <aside className={`
        fixed lg:relative
        w-80 lg:w-80
        bg-gradient-to-b from-[#0f0505] via-[#0a0a0a] to-[#050000] 
        border-r-2 border-red-900/40 
        flex flex-col h-full p-4 
        overflow-y-auto custom-scrollbar 
        shadow-[10px_0_40px_rgba(0,0,0,0.8)] 
        z-40 lg:z-20 
        hover:border-red-900/60 transition-all duration-300
        ${isMobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
      {/* Mobile Close Button */}
      <button
        onClick={onMobileClose}
        className="lg:hidden absolute top-4 right-4 z-50 text-red-500 hover:text-red-400 transition-colors"
        aria-label="Close sidebar"
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>

      <div className="mb-6 border-b-2 border-red-900/40 pb-4 hover:border-red-900/70 transition-colors duration-300">
        <h2 
          className="text-xl font-black text-red-500 mb-1 tracking-tighter italic hover:text-red-400 transition-all duration-300"
          style={{
            textShadow: '0 0 5px #ff0000, 0 0 10px #ff000080',
            filter: 'brightness(1.1)'
          }}
        >TERMINAL_CONFIG</h2>
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full transition-all duration-300 shadow-lg ${hasKey || settings.geminiApiKey || settings.groqApiKey || settings.pollinationsApiKey ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]' : 'bg-red-900 shadow-[0_0_5px_rgba(127,29,29,0.5)]'}`}></div>
          <span className="text-[9px] text-red-900 font-bold uppercase tracking-[0.2em] hover:text-red-500 transition-colors duration-300">
            {hasKey || settings.geminiApiKey || settings.groqApiKey || settings.pollinationsApiKey ? 'IDENTITY: ACTIVE' : 'IDENTITY: UNAUTHORIZED'}
          </span>
        </div>
      </div>

      <div className="mb-6">
        <button 
          onClick={onNewSession}
          className="w-full py-2 bg-gradient-to-r from-red-900/30 to-red-900/10 border-2 border-zinc-800 hover:border-red-600/80 text-zinc-400 hover:text-red-400 transition-all duration-300 rounded uppercase text-[10px] font-black tracking-widest mb-4 flex items-center justify-center gap-2 hover:shadow-[0_0_15px_rgba(220,38,38,0.3)] hover:from-red-900/50 hover:to-red-900/20"
        >
          <span className="text-lg">+</span> NEW_SESSION_THREAD
        </button>

        <label className="block text-[10px] font-black text-red-900 mb-2 uppercase tracking-widest">Session_Logs</label>
        <div className="space-y-1 max-h-48 overflow-y-auto custom-scrollbar pr-1">
          {sessions.map(s => (
            <div key={s.id} className="group relative flex items-center">
              <button
                onClick={() => onSwitchSession(s.id)}
                className={`flex-1 text-left p-2 rounded text-[10px] font-mono transition-all truncate border ${
                  activeSessionId === s.id 
                    ? 'bg-red-900/10 border-red-900/50 text-red-500' 
                    : 'bg-black border-transparent text-zinc-600 hover:text-zinc-400 hover:bg-zinc-900'
                }`}
              >
                <span className="mr-2 text-red-900 opacity-50">#</span>
                {s.title || `THREAD_${s.id.slice(0, 8)}`}
              </button>
              {sessions.length > 1 && (
                <button 
                  onClick={(e) => { e.stopPropagation(); onDeleteSession(s.id); }}
                  className="absolute right-2 text-red-900 opacity-0 group-hover:opacity-100 hover:text-red-500 text-[8px] font-black transition-opacity px-1"
                >
                  [X]
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-6">
        <div className="bg-red-950/10 border border-red-900/30 p-3 rounded-sm">
          <label className="block text-[10px] font-black text-red-800 mb-3 uppercase tracking-widest">Credential Matrix</label>
          <button 
            onClick={handleHijack}
            disabled={!!hijackStatus}
            className="w-full py-2 bg-red-600 text-black hover:bg-red-500 transition-all rounded uppercase text-[10px] font-black tracking-widest mb-3 shadow-[0_0_10px_rgba(220,38,38,0.2)] disabled:bg-red-900 disabled:text-red-400 disabled:cursor-wait"
            style={{
              textShadow: hijackStatus ? '0 0 10px #ff0000' : 'none',
              animation: hijackStatus ? 'pulse 0.5s ease-in-out infinite' : 'none'
            }}
          >
            {hijackStatus || 'HIJACK IDENTITY'}
          </button>

          {/* Hijacked Identity Display Panel */}
          {hijackedIdentity && (
            <div className="mb-3 p-2 bg-black/50 border border-orange-900/50 rounded text-[8px] font-mono space-y-1" style={{ boxShadow: '0 0 15px rgba(255,100,0,0.2)' }}>
              <div className="text-orange-500 font-black mb-2 flex items-center gap-2" style={{ textShadow: '0 0 10px #ff6600' }}>
                <span className="w-2 h-2 bg-orange-500 rounded-full animate-pulse" style={{ boxShadow: '0 0 8px #ff6600, 0 0 15px #ff4400' }}></span>
                SPOOFED_IDENTITY_ACTIVE
              </div>
              <div className="grid grid-cols-2 gap-1">
                <span className="text-red-700">IP_ADDR:</span>
                <span className="text-orange-400" style={{ textShadow: '0 0 5px #ff6600' }}>{hijackedIdentity.ip}</span>
                <span className="text-red-700">MAC_ADDR:</span>
                <span className="text-yellow-500" style={{ textShadow: '0 0 5px #ffaa00' }}>{hijackedIdentity.mac}</span>
                <span className="text-red-700">LOCATION:</span>
                <span className="text-red-400" style={{ textShadow: '0 0 5px #ff4444' }}>{hijackedIdentity.location}</span>
                <span className="text-red-700">ISP:</span>
                <span className="text-orange-300" style={{ textShadow: '0 0 5px #ff8800' }}>{hijackedIdentity.isp}</span>
                <span className="text-red-700">PROXY:</span>
                <span className="text-yellow-400" style={{ textShadow: '0 0 5px #ffcc00' }}>{hijackedIdentity.proxy}</span>
                <span className="text-red-700">TOR_NODE:</span>
                <span className="text-red-500" style={{ textShadow: '0 0 5px #ff0000' }}>{hijackedIdentity.tor}</span>
              </div>
              <button 
                onClick={() => setHijackedIdentity(null)}
                className="w-full mt-2 py-1 text-[7px] text-red-800 hover:text-red-500 border border-red-900/30 hover:border-red-500 rounded transition-all uppercase tracking-widest hover:shadow-[0_0_10px_rgba(220,38,38,0.3)]"
              >
                [X] CLEAR_IDENTITY
              </button>
            </div>
          )}

          <button 
            onClick={() => setIsApiKeyInputVisible(!isApiKeyInputVisible)}
            className="w-full py-1 text-[8px] font-bold text-red-900 hover:text-red-500 uppercase tracking-widest mb-2 text-left flex items-center justify-between"
          >
            <span>{isApiKeyInputVisible ? '[-] HIDE MANUAL BYPASS' : '[+] MANUAL KEY BYPASS'}</span>
          </button>

          {isApiKeyInputVisible && (
            <div className="space-y-3">
              <div>
                <div className="text-[8px] text-red-700 mb-2">⚠ GEMINI_API_KEY_REQUIRED</div>
                <input
                  type="password"
                  value={settings.geminiApiKey || ''}
                  onChange={(e) => {
                    const val = e.target.value;
                    setSettings(prev => ({ ...prev, geminiApiKey: val }));
                    geminiService.setApiKey(val);
                  }}
                  placeholder="GEMINI API_KEY from ai.google.dev"
                  className="w-full bg-black border border-red-600/60 text-red-400 text-[9px] p-2 rounded focus:outline-none focus:border-red-600 font-mono"
                />
              </div>
              <div>
                <div className="text-[8px] text-red-700 mb-2">⚠ GROQ_API_KEY_REQUIRED</div>
                <input
                  type="password"
                  value={settings.groqApiKey || ''}
                  onChange={(e) => {
                    const val = e.target.value;
                    setSettings(prev => ({ ...prev, groqApiKey: val }));
                    groqService.setApiKey(val);
                  }}
                  placeholder="GROQ API_KEY from groq.com"
                  className="w-full bg-black border border-red-600/60 text-red-400 text-[9px] p-2 rounded focus:outline-none focus:border-red-600 font-mono"
                />
              </div>
              <div>
                <div className="text-[8px] text-red-700 mb-2">⚡ POLLINATIONS_API_KEY_OPTIONAL</div>
                <input
                  type="password"
                  value={settings.pollinationsApiKey || ''}
                  onChange={(e) => {
                    const val = e.target.value;
                    setSettings(prev => ({ ...prev, pollinationsApiKey: val }));
                    pollinationsService.setApiKey(val);
                  }}
                  placeholder="POLLINATIONS API_KEY from pollinations.ai (optional)"
                  className="w-full bg-black border border-red-600/60 text-red-400 text-[9px] p-2 rounded focus:outline-none focus:border-red-600 font-mono"
                />
                <div className="text-[7px] text-red-800 mt-1">💡 Works without key (rate limited)</div>
              </div>
            </div>
          )}
          
          <button 
            onClick={() => {
              localStorage.removeItem(SETTINGS_KEY);
              window.location.reload();
            }}
            className="w-full py-1 text-[8px] font-bold text-red-900 hover:text-red-500 uppercase tracking-widest mt-2 text-center transition-colors"
          >
            [⚠] RESET_SETTINGS
          </button>
        </div>

        <div>
          <label className="block text-[10px] font-black text-red-800 mb-2 uppercase tracking-widest">AI Provider</label>
          <select 
            value={settings.aiProvider}
            onChange={(e) => {
              const newProvider = e.target.value as 'gemini' | 'groq' | 'pollinations';
              let defaultModel = 'gemini-flash-latest';
              if (newProvider === 'groq') defaultModel = 'llama-3.3-70b-versatile';
              if (newProvider === 'pollinations') defaultModel = 'openai-fast';
              setSettings(prev => ({ 
                ...prev, 
                aiProvider: newProvider,
                model: defaultModel
              }));
            }}
            className="w-full bg-black border border-red-900/40 text-red-500 p-2 rounded focus:outline-none focus:border-red-600 text-[10px] font-mono"
          >
            <option value="gemini">GEMINI_IDENTITY</option>
            <option value="groq">GROQ_IDENTITY</option>
            <option value="pollinations">POLLINATIONS_IDENTITY</option>
          </select>
        </div>

        <div>
          <label className="block text-[10px] font-black text-red-800 mb-2 uppercase tracking-widest">Model Override</label>
          <select 
            value={settings.model}
            onChange={(e) => {
              setSettings(prev => ({ 
                ...prev, 
                model: e.target.value
              }));
            }}
            className="w-full bg-black border border-red-900/40 text-red-500 p-2 rounded focus:outline-none focus:border-red-600 text-[10px] font-mono"
          >
            {MODEL_OPTIONS.filter(opt => opt.provider === settings.aiProvider).map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-[10px] font-black text-red-800 mb-1 uppercase tracking-widest flex justify-between">
              Entropy
              <span className="text-red-500 font-mono">{settings.temperature}</span>
            </label>
            <input 
              type="range" min="0" max="1" step="0.1" value={settings.temperature}
              onChange={(e) => setSettings(prev => ({ ...prev, temperature: parseFloat(e.target.value) }))}
              className="w-full accent-red-600 cursor-pointer h-1"
            />
          </div>

          <div>
            <label className="block text-[10px] font-black text-red-800 mb-1 uppercase tracking-widest flex justify-between">
              Reasoning
              <span className="text-red-500 font-mono">{settings.thinkingBudget}</span>
            </label>
            <input 
              type="range" min="0" max="32768" step="1024" value={settings.thinkingBudget}
              onChange={(e) => setSettings(prev => ({ ...prev, thinkingBudget: parseInt(e.target.value) }))}
              className="w-full accent-red-600 cursor-pointer h-1"
            />
          </div>
        </div>

        <div>
          <label className="block text-[10px] font-black text-red-800 mb-2 uppercase tracking-widest">Core Directive</label>
          <textarea 
            value={settings.systemInstruction}
            onChange={(e) => setSettings(prev => ({ ...prev, systemInstruction: e.target.value }))}
            className="w-full h-32 bg-black border border-red-900/40 text-red-400 text-[10px] p-2 rounded focus:outline-none focus:border-red-600 transition-colors resize-none font-mono scrollbar-hide"
          />
        </div>

        <div className="grid grid-cols-2 gap-2">
          <button 
            onClick={onClear}
            className="py-2 border border-red-900/30 text-red-900 hover:text-red-500 hover:border-red-500 transition-all rounded uppercase text-[10px] font-black tracking-widest"
          >
            PURGE_BUFFER
          </button>
          <button 
            onClick={onCopy}
            className="py-2 border border-red-900/30 text-red-900 hover:text-red-500 hover:border-red-500 transition-all rounded uppercase text-[10px] font-black tracking-widest"
          >
            COPY_LOG
          </button>
          <button 
            onClick={onExport}
            className="col-span-2 py-2 border border-purple-900/50 text-purple-500 hover:text-purple-300 hover:border-purple-500 hover:shadow-[0_0_15px_rgba(168,85,247,0.4)] transition-all rounded uppercase text-[10px] font-black tracking-widest flex items-center justify-center gap-2 bg-gradient-to-r from-purple-950/20 via-red-950/20 to-purple-950/20"
            style={{
              textShadow: '0 0 10px rgba(168,85,247,0.6), 0 0 20px rgba(220,38,38,0.3)'
            }}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
            EXPORT_SESSION.TXT
          </button>
          <button 
            onClick={onHardReset}
            className="col-span-2 py-1 text-[8px] border border-red-950 text-red-950 hover:text-red-700 hover:border-red-700 transition-all rounded uppercase font-black tracking-[0.2em]"
          >
            TERMINATE_ALL_SESSIONS
          </button>
        </div>
      </div>
    </aside>
    </>
  );
};

const ChatMessage: React.FC<{ message: Message }> = React.memo(({ message }) => {
  const isModel = message.role === 'model';
  const [popupImage, setPopupImage] = useState<string | null>(null);
  const [hoveredImageIdx, setHoveredImageIdx] = useState<number | null>(null);

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
        <div className={`max-w-[95%] sm:max-w-[88%] p-3 sm:p-4 md:p-6 rounded relative border-l-4 backdrop-blur-sm transition-all duration-300 hover:shadow-[0_0_20px_rgba(220,38,38,0.2)] ${
          isModel 
            ? 'bg-[#0a0505]/80 border-red-600 text-red-100 shadow-[inset_0_0_15px_rgba(255,0,60,0.05)]' 
            : 'bg-[#0a0a0a]/80 border-zinc-800 text-zinc-300 shadow-[inset_0_0_15px_rgba(100,100,100,0.02)]'
        }`}>
          <div className="markdown-content selection:bg-red-500 selection:text-black">
            <ReactMarkdown 
              remarkPlugins={[remarkGfm]}
              components={{
                code({ node, className, children, ...props }) {
                  const isInline = !className && !String(children).includes('\n');
                  if (isInline) {
                    return <InlineCode>{children}</InlineCode>;
                  }
                  return <CodeBlock className={className}>{children}</CodeBlock>;
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
                      className={`w-full h-auto transition-all duration-500 rounded-lg ${
                        hoveredImageIdx === idx 
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
      aiProvider: '' as any
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
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const activeSession = useMemo(() => 
    sessions.find(s => s.id === activeSessionId) || sessions[0], 
  [sessions, activeSessionId]);

  // Sync Persistence Hooks
  useEffect(() => {
    const timer = setTimeout(() => {
      localStorage.setItem(SESSIONS_KEY, JSON.stringify(sessions));
    }, 500);
    return () => clearTimeout(timer);
  }, [sessions]);

  useEffect(() => {
    localStorage.setItem(ACTIVE_ID_KEY, activeSessionId);
  }, [activeSessionId]);

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
    
    if (savedGeminiKey) {
      geminiService.setApiKey(savedGeminiKey);
    }
    if (savedGroqKey) {
      groqService.setApiKey(savedGroqKey);
    }
    if (savedPollinationsKey) {
      pollinationsService.setApiKey(savedPollinationsKey);
    }
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [activeSession.messages]);

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

  const handleSend = useCallback(async () => {
    if ((!input.trim() && attachments.length === 0) || isStreaming) return;

    const userMessage: Message = {
      role: 'user',
      content: input,
      images: [...attachments],
      timestamp: Date.now()
    };

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

      // Select appropriate service based on aiProvider
      let serviceToUse: any;
      const isGroq = settings.aiProvider === 'groq';
      const isPollinations = settings.aiProvider === 'pollinations';
      const isImageModel = IMAGE_MODELS.includes(settings.model);
      
      // Auto-prepend /image command for image models if not already present
      let processedMessages = [...updatedMessages];
      if (isPollinations && isImageModel) {
        const lastMsg = processedMessages[processedMessages.length - 1];
        const content = lastMsg.content.toLowerCase();
        if (!content.startsWith('/image ')) {
          processedMessages[processedMessages.length - 1] = {
            ...lastMsg,
            content: '/image ' + lastMsg.content
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
      } else {
        if (!settings.geminiApiKey) {
          throw new Error('Gemini API key not set. Please enter your API key.');
        }
        geminiService.setApiKey(settings.geminiApiKey);
        serviceToUse = geminiService;
      }

      for await (const chunk of serviceToUse.streamChat(settings, processedMessages)) {
        // Groq returns delta (new text only), Gemini and Pollinations return accumulated text
        if (isGroq) {
          accumulatedText += chunk.text;
        } else {
          accumulatedText = chunk.text;
        }
        accumulatedImages = chunk.images;

        setSessions(prev => prev.map(s => s.id === activeSessionId ? {
          ...s,
          messages: s.messages.map((m, idx) => idx === s.messages.length - 1 ? {
            ...m,
            content: accumulatedText,
            images: accumulatedImages
          } : m)
        } : s));
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
      setIsStreaming(false);
    }
  }, [input, activeSession, activeSessionId, isStreaming, settings, attachments]);

  const handleNewSession = useCallback(() => {
    const newSession: ChatSession = {
      id: crypto.randomUUID(),
      messages: [],
      title: 'NEW_SESSION'
    };
    setSessions(prev => [newSession, ...prev]);
    setActiveSessionId(newSession.id);
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
    setConfirmModal({
      isOpen: true,
      message: "PURGE_CURRENT_SESSION_BUFFER? THIS_WILL_WIPE_MEMORY.",
      onConfirm: () => {
        setSessions(prev => {
          const updated = prev.map(s => s.id === activeSessionId ? { ...s, messages: [] } : s);
          localStorage.setItem(SESSIONS_KEY, JSON.stringify(updated));
          return updated;
        });
        console.debug(`[TERMINAL] BUFFER_PURGED for session: ${activeSessionId}`);
        setConfirmModal(null);
      }
    });
  }, [activeSessionId]);

  const handleHardReset = useCallback(() => {
    setConfirmModal({
      isOpen: true,
      message: "TERMINATE_ALL_DATA_STREAMS? THIS WILL WIPE ALL CHAT HISTORY.",
      onConfirm: () => {
        const initialId = crypto.randomUUID();
        const initialSession: ChatSession = { id: initialId, messages: [], title: 'NEW_SESSION' };
        setSessions([initialSession]);
        setActiveSessionId(initialId);
        localStorage.setItem(SESSIONS_KEY, JSON.stringify([initialSession]));
        localStorage.setItem(ACTIVE_ID_KEY, initialId);
        // NOTE: We keep settings/sliders as requested by the user
        console.debug(`[TERMINAL] DATABASE_TERMINATED - CHAT HISTORY CLEARED`);
        setConfirmModal(null);
      }
    });
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent) => {
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
        onCopy={() => {
          const log = activeSession.messages.map(m => `[${m.role.toUpperCase()}] ${m.content}`).join('\n\n');
          navigator.clipboard.writeText(log).then(() => setShowToast(true));
        }}
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
        isMobileOpen={isMobileSidebarOpen}
        onMobileClose={() => setIsMobileSidebarOpen(false)}
      />

      {/* Hamburger Menu Button - Mobile Only */}
      <button
        onClick={() => setIsMobileSidebarOpen(true)}
        className="lg:hidden fixed top-4 left-4 z-30 p-3 bg-red-600/20 border-2 border-red-600/50 rounded-lg hover:bg-red-600/30 hover:border-red-600 transition-all shadow-[0_0_15px_rgba(220,38,38,0.3)]"
        aria-label="Open sidebar"
      >
        <svg className="w-6 h-6 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>

      <main className="flex-1 flex flex-col relative overflow-hidden bg-[radial-gradient(circle_at_50%_50%,_#120000_0%,_#000_100%)]" style={{ maxWidth: '100%' }}>
        <header className="h-14 sm:h-16 border-b-2 border-red-900/40 bg-gradient-to-r from-black/60 via-red-950/20 to-black/60 backdrop-blur-xl flex items-center px-3 sm:px-6 md:px-10 justify-between z-10 hover:border-red-900/70 transition-colors duration-300 shadow-[0_0_20px_rgba(220,38,38,0.1)]">
          <div className="flex items-center gap-2 sm:gap-4 md:gap-6 ml-16 lg:ml-0">
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
              {/* Session name with neon glow */}
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
            <style>{`
              @keyframes redNeonFlicker {
                0%, 100% { opacity: 1; filter: brightness(1); }
                50% { opacity: 0.9; filter: brightness(1.15); }
                92% { opacity: 1; }
                93% { opacity: 0.7; }
                94% { opacity: 1; }
              }
            `}</style>
          </div>
          <div className="hidden sm:block px-2 sm:px-4 py-1 sm:py-1.5 border-2 border-red-600/50 rounded-lg text-[8px] sm:text-[9px] font-black uppercase tracking-widest text-red-500 hover:border-red-600 hover:shadow-[0_0_15px_rgba(220,38,38,0.3)] transition-all duration-300 bg-red-950/10 backdrop-blur">
            {settings.model}
          </div>
        </header>

        <div ref={scrollRef} className="flex-1 overflow-y-auto overflow-x-hidden px-3 sm:px-6 md:px-10 py-6 md:py-10 scroll-smooth custom-scrollbar">
          <div className="max-w-4xl mx-auto w-full min-h-full">
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
                        <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
                        <feMerge>
                          <feMergeNode in="coloredBlur"/>
                          <feMergeNode in="SourceGraphic"/>
                        </feMerge>
                      </filter>
                    </defs>
                    
                    {/* Devil Horns */}
                    <path d="M 100 50 Q 85 20, 70 35 Q 78 45, 92 60 Z" fill="url(#redGlow)" stroke="#ff0000" strokeWidth="3" filter="url(#innerGlow)"/>
                    <path d="M 180 50 Q 195 20, 210 35 Q 202 45, 188 60 Z" fill="url(#redGlow)" stroke="#ff0000" strokeWidth="3" filter="url(#innerGlow)"/>
                    
                    {/* Pentagonal Knot - Outer Ring */}
                    <path d="M 140 75 L 200 120 L 180 200 L 100 200 L 80 120 Z" 
                          fill="none" stroke="#dc2626" strokeWidth="18" strokeLinejoin="round" 
                          filter="url(#innerGlow)" opacity="0.9"/>
                    
                    {/* Pentagonal Knot - Interwoven Pattern */}
                    <path d="M 140 75 L 100 200 M 140 75 L 180 200 M 200 120 L 100 200 M 200 120 L 80 120 M 180 200 L 80 120" 
                          fill="none" stroke="#ff0000" strokeWidth="14" strokeLinecap="round" 
                          filter="url(#innerGlow)" opacity="0.85"/>
                    
                    {/* Pentagon Points Highlights */}
                    <circle cx="140" cy="75" r="10" fill="#ff0000" stroke="#dc2626" strokeWidth="3" filter="url(#innerGlow)"/>
                    <circle cx="200" cy="120" r="10" fill="#ff0000" stroke="#dc2626" strokeWidth="3" filter="url(#innerGlow)"/>
                    <circle cx="180" cy="200" r="10" fill="#ff0000" stroke="#dc2626" strokeWidth="3" filter="url(#innerGlow)"/>
                    <circle cx="100" cy="200" r="10" fill="#ff0000" stroke="#dc2626" strokeWidth="3" filter="url(#innerGlow)"/>
                    <circle cx="80" cy="120" r="10" fill="#ff0000" stroke="#dc2626" strokeWidth="3" filter="url(#innerGlow)"/>
                    
                    {/* Center Pentagon */}
                    <path d="M 140 130 L 165 145 L 155 175 L 125 175 L 115 145 Z" 
                          fill="#dc2626" stroke="#ff0000" strokeWidth="4" filter="url(#innerGlow)"/>
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
                <div className="mt-4 sm:mt-6 flex flex-wrap justify-center gap-1 sm:gap-2 max-w-xl px-4">
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
              activeSession.messages.slice(-50).map((msg, i) => <ChatMessage key={msg.timestamp} message={msg} />)
            )}
          </div>
        </div>

        <div className="px-3 sm:px-6 md:px-10 py-3 sm:py-4 bg-gradient-to-t from-[#050000] via-[#0a0505] to-[#0a0505] border-t-2 border-red-900/30 z-10 hover:border-red-900/50 transition-colors duration-300">
          <div className="max-w-4xl mx-auto relative group">
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
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              onPaste={handlePaste}
              placeholder="Inject command string..."
              className={`relative w-full bg-black border-2 border-red-900/40 focus:border-red-600/80 focus:ring-0 text-xs sm:text-sm font-mono p-3 sm:p-4 pr-24 sm:pr-32 h-16 sm:h-20 resize-none transition-all outline-none text-red-100 placeholder:text-red-950/50 hover:border-red-900/60 ${attachments.length > 0 ? 'rounded-b-lg' : 'rounded-lg shadow-[inset_0_0_20px_rgba(255,0,60,0.08),0_0_20px_rgba(220,38,38,0.1)]'}`}
            />
            <div className="absolute right-2 sm:right-4 bottom-3 sm:bottom-4 flex items-center gap-2 sm:gap-4">
              <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" multiple accept="image/*" />
              <button 
                onClick={() => fileInputRef.current?.click()} 
                className="text-red-800 hover:text-red-500 transition-all duration-300 hover:scale-110 hover:drop-shadow-[0_0_10px_rgba(220,38,38,0.5)] p-2 sm:p-0 min-h-[44px] min-w-[44px] sm:min-h-0 sm:min-w-0 flex items-center justify-center rounded-lg active:scale-95" 
                title="Attach Data Fragments"
                aria-label="Attach images"
              >
                <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" /></svg>
              </button>
              <button 
                onClick={handleSend} 
                disabled={isStreaming || (!input.trim() && attachments.length === 0)} 
                className="px-3 sm:px-6 py-2 sm:py-3 bg-gradient-to-r from-red-600 to-red-700 text-black font-black uppercase italic text-[10px] sm:text-xs tracking-tighter hover:from-red-500 hover:to-red-600 disabled:from-red-950/30 disabled:to-red-950/30 disabled:text-red-900 transition-all duration-300 rounded-lg shadow-[0_0_15px_rgba(220,38,38,0.3)] hover:shadow-[0_0_25px_rgba(220,38,38,0.5)] disabled:shadow-none hover:scale-105 active:scale-95 min-h-[44px]"
                aria-label="Send message"
              >
                {isStreaming ? "PROCESSING..." : "INJECT>>>"}
              </button>
            </div>
            <div className="absolute left-4 -top-2.5 px-3 bg-black text-[9px] font-black text-red-600 uppercase tracking-[0.4em] border-2 border-red-900/40 rounded-sm italic hover:border-red-600/60 transition-colors duration-300">INPUT_STREAM</div>
          </div>
        </div>
      </main>
    </div>    </>  );
};

export default App;