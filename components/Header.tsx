import React from 'react';
import { useWormGPT } from '../context/GlobalContext';
import { DynamicStatusIndicators } from './DynamicStatusIndicators';
import { countTokensForRequest } from '../utils/tokenManager';

export const Header: React.FC<{ 
  fingerprint: string;
  onNewSession: () => void;
  activeAgentStatus: string | null;
  showAppsPage: boolean;
  setShowAppsPage: (val: boolean) => void;
}> = ({ 
  fingerprint, 
  onNewSession, 
  activeAgentStatus, 
  showAppsPage, 
  setShowAppsPage 
}) => {
  const { 
    isSidebarOpen, 
    setIsSidebarOpen, 
    sessions, 
    activeSession, 
    settings, 
    isStreaming,
    setIsSettingsOpen
  } = useWormGPT();

  const ctx = countTokensForRequest(activeSession.messages, settings.systemInstruction || '', settings.model);
  const pct = Math.min(ctx.pct, 1.0);
  const pctDisp = Math.round(pct * 100);
  const ctxColor = pct >= 0.95 ? '#ff0000' : pct >= 0.8 ? '#f97316' : pct >= 0.6 ? '#eab308' : '#22c55e';
  const ctxLabel = `${(ctx.total / 1000).toFixed(1)}k`;

  return (
    <header className="h-14 sm:h-16 border-b-2 border-red-900/40 bg-gradient-to-r from-black/60 via-red-950/20 to-black/60 backdrop-blur-xl flex items-center px-3 sm:px-6 md:px-10 justify-between z-10 hover:border-red-900/70 transition-colors duration-300 shadow-[0_0_20px_rgba(220,38,38,0.1)]">
      <div className="flex items-center gap-2 sm:gap-4 md:gap-6">
        {/* Sidebar Toggle Button */}
        <button
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          className="p-2 text-red-600 hover:text-red-400 transition-all duration-300 group"
        >
          <svg className={`w-5 h-5 sm:w-6 sm:h-6 transition-transform duration-300 ${isSidebarOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
          </svg>
        </button>

        {/* Gear Icon - Opens Settings Modal */}
        <button
          onClick={() => setIsSettingsOpen(true)}
          className="p-2 text-red-900 hover:text-red-500 transition-all duration-300 hover:rotate-90"
        >
          <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="currentColor" viewBox="0 0 24 24">
            <path d="M19.14,12.94c0.04-0.3,0.06-0.61,0.06-0.94c0-0.32-0.02-0.64-0.07-0.94l2.03-1.58c0.18-0.14,0.23-0.41,0.12-0.61 l-1.92-3.32c-0.12-0.22-0.37-0.29-0.59-0.22l-2.39,0.96c-0.5-0.38-1.03-0.7-1.62-0.94L14.4,2.81c-0.04-0.24-0.24-0.41-0.48-0.41 h-3.84c-0.24,0-0.43,0.17-0.47,0.41L9.25,5.35C8.66,5.59,8.12,5.91,7.62,6.29L5.23,5.33c-0.22-0.08-0.47,0-0.59,0.22L2.72,8.87 c-0.11,0.2-0.06,0.47,0.12,0.61l2.03,1.58C4.84,11.36,4.82,11.68,4.82,12c0,0.32,0.02,0.64,0.07,0.94l-2.03,1.58 c-0.18,0.14-0.23,0.41-0.12,0.61l1.92,3.32c0.12,0.22,0.37,0.29,0.59,0.22l2.39-0.96c0.5,0.38,1.03,0.7,1.62,0.94l0.36,2.54 c0.05,0.24,0.24,0.41,0.48,0.41h3.84c0.24,0,0.44-0.17,0.47-0.41l0.36-2.54c0.59-0.24,1.13-0.56,1.62-0.94l2.39,0.96 c0.22,0.08,0.47,0,0.59-0.22l1.92-3.32c0.11-0.2,0.06-0.47-0.12-0.61L19.14,12.94z M12,15.6c-1.98,0-3.6-1.62-3.6-3.6 s1.62-3.6,3.6-3.6s3.6,1.62,3.6,3.6S13.98,15.6,12,15.6z" />
          </svg>
        </button>

        {/* Apps Toggle */}
        <button
          onClick={() => setShowAppsPage(!showAppsPage)}
          className={`p-2 transition-all duration-300 ${showAppsPage ? 'text-red-400 scale-110' : 'text-red-900 hover:text-red-500'}`}
        >
          <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="currentColor" viewBox="0 0 24 24">
            <path d="M4 8h4V4H4v4zm6 12h4v-4h-4v4zm-6 0h4v-4H4v4zm0-6h4v-4H4v4zm6 0h4v-4h-4v4zm6-10v4h4V4h-4zm-6 4h4V4h-4v4zm6 6h4v-4h-4v4zm0 6h4v-4h-4v4z" />
          </svg>
        </button>

        <div className="flex items-center gap-1 sm:gap-2 group cursor-pointer hover:scale-105 transition-transform duration-300" onClick={onNewSession}>
          <div className="w-3 h-3 sm:w-4 sm:h-4 bg-red-600 rounded-full shadow-[0_0_15px_rgba(220,38,38,0.6)] animate-pulse"></div>
          <h1 className="text-base sm:text-xl md:text-2xl font-black italic uppercase tracking-[-0.05em] bg-gradient-to-r from-red-600 via-red-400 to-red-600 bg-clip-text text-transparent">WormGPT_Terminal</h1>
        </div>

        <div className="hidden sm:block h-4 w-px bg-red-900/30 mx-2"></div>
        <div className="hidden sm:flex text-[10px] tracking-widest font-bold uppercase gap-4">
          <span className="flex items-center gap-1.5 text-red-500">
            <span className="w-1.5 h-1.5 bg-red-500 rounded-full shadow-[0_0_4px_#ff0000]"></span>
            FP: {fingerprint}
          </span>
          <span className="flex items-center gap-1.5 text-red-400">
            <span className="w-1.5 h-1.5 bg-red-400 rounded-full shadow-[0_0_4px_#ff3333]"></span>
            {activeSession.title.toUpperCase()}
          </span>
        </div>

        <div className="hidden md:block h-4 w-px bg-green-900/30 mx-2"></div>
        <div className="hidden md:block">
          <DynamicStatusIndicators
            sessionCount={sessions.length}
            messageCount={activeSession.messages.length}
            sessionTitle={activeSession.title}
            isStreaming={isStreaming.current}
            model={settings.model}
          />
        </div>
      </div>

      <div className="flex items-center gap-3">
        {activeAgentStatus && (
          <div className="hidden sm:flex items-center gap-2 px-3 py-1 bg-green-600/10 border-2 border-green-600/50 rounded-lg animate-pulse">
            <div className="w-1.5 h-1.5 bg-green-500 rounded-full"></div>
            <span className="text-[9px] font-black uppercase tracking-widest text-green-500">{activeAgentStatus}</span>
          </div>
        )}
        <div className="hidden sm:block px-4 py-1.5 border-2 border-red-600/50 rounded-lg text-[9px] font-black uppercase tracking-widest text-red-500 bg-red-950/10 backdrop-blur">
          {settings.model}
        </div>
        
        {/* Live Context Window Indicator */}
        {activeSession.messages.length > 0 && (
          <div
            className="hidden lg:flex items-center gap-1.5 px-2 py-1 rounded-lg border transition-all duration-500"
            style={{ borderColor: `${ctxColor}40`, background: `${ctxColor}10` }}
            title={`Context: ${pctDisp}% used — ${ctx.total.toLocaleString()} tokens`}
          >
            <div className="w-10 h-1 bg-zinc-900 rounded-full overflow-hidden">
              <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pctDisp}%`, background: ctxColor, boxShadow: pct >= 0.6 ? `0 0 4px ${ctxColor}` : 'none' }} />
            </div>
            <span className="text-[8px] font-black font-mono uppercase" style={{ color: ctxColor }}>
              {ctxLabel}{ctx.shouldSummarize ? ' ⚠' : ''}
            </span>
          </div>
        )}
      </div>
    </header>
  );
};
