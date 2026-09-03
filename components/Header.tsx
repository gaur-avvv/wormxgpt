import React, { useState } from 'react';
import { 
  Menu, Settings, Plus, Cpu, Eye, ShieldAlert, Sparkles, 
  ChevronDown, Layers, Zap, Wrench, ShieldCheck
} from 'lucide-react';
import { useWormGPT } from '../context/GlobalContext';
import { countTokensForRequest } from '../utils/tokenManager';

export const Header: React.FC<{ 
  fingerprint?: string;
  onNewSession: () => void;
  activeAgentStatus: string | null;
  onOpenModelSelector: (mode?: 'text' | 'vision') => void;
}> = ({ 
  onNewSession, 
  onOpenModelSelector 
}) => {
  const { 
    isSidebarOpen, 
    setIsSidebarOpen, 
    activeSession, 
    settings, 
    setIsSettingsOpen,
    deviceDisplayId,
    deviceSpecs,
    activeArsenalToolIds,
    setIsArsenalOpen
  } = useWormGPT();

  const ctx = countTokensForRequest(activeSession.messages, settings.systemInstruction || '', settings.model);
  const pct = Math.min(ctx.pct, 1.0);
  const pctDisp = Math.round(pct * 100);

  const currentVisionModel = settings.visionModel || 'gemini-2.5-flash';
  const armedToolsCount = activeArsenalToolIds.length;

  return (
    <header className="h-14 sm:h-16 border-b border-indigo-500/15 bg-[#0d1322]/80 backdrop-blur-xl flex items-center px-4 sm:px-6 justify-between z-20 shrink-0 font-sans">
      <div className="flex items-center gap-3 min-w-0">
        {/* Toggle Sidebar */}
        <button
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          className="p-2 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 transition-colors"
          title={isSidebarOpen ? "Collapse Sidebar" : "Expand Sidebar"}
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Model Router Bar */}
        <div className="flex items-center gap-2 overflow-x-auto custom-scrollbar py-1">
          {/* Primary Text Model Selector */}
          <button
            onClick={() => onOpenModelSelector('text')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900/80 hover:bg-indigo-600/20 border border-slate-800 hover:border-indigo-500/50 text-xs text-slate-200 transition-all shrink-0"
            title="Configure Primary Text Generation Model"
          >
            <Cpu className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
            <span className="font-semibold text-slate-100">{settings.model}</span>
            <span className="text-[10px] text-slate-400 uppercase font-mono">({settings.aiProvider || 'auto'})</span>
            <ChevronDown className="w-3 h-3 text-slate-500 ml-0.5" />
          </button>

          {/* Dedicated Vision Model Selector */}
          <button
            onClick={() => onOpenModelSelector('vision')}
            className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900/80 hover:bg-violet-600/20 border border-slate-800 hover:border-violet-500/50 text-xs text-slate-200 transition-all shrink-0"
            title="Configure Dedicated Vision Model for Image Inputs"
          >
            <Eye className="w-3.5 h-3.5 text-violet-400 shrink-0" />
            <span className="text-[11px] text-slate-400">Vision:</span>
            <span className="font-semibold text-slate-100">{currentVisionModel}</span>
            <ChevronDown className="w-3 h-3 text-slate-500 ml-0.5" />
          </button>

          {/* Active Arsenal Quick Trigger */}
          <button
            onClick={() => setIsArsenalOpen(true)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-indigo-950/40 hover:bg-indigo-900/50 border border-indigo-500/30 text-xs text-indigo-300 transition-all shrink-0 font-mono shadow-sm"
            title="Open 100 Remote HTTPS MCP Arsenal Catalog"
          >
            <Wrench className="w-3.5 h-3.5 text-indigo-400" />
            <span className="hidden md:inline font-semibold">Active Arsenal</span>
            <span className="px-1.5 py-0.2 rounded-full bg-indigo-600/40 text-[10px] text-indigo-200 font-bold border border-indigo-500/40">
              {armedToolsCount}
            </span>
          </button>

          {/* System Override Status Indicator */}
          {settings.systemOverride && (
            <div 
              onClick={() => setIsSettingsOpen(true)}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-500/15 border border-amber-500/40 text-amber-300 text-[11px] font-semibold cursor-pointer hover:bg-amber-500/25 transition-all shrink-0"
              title="System Override Active: Default conversational guardrails bypassed"
            >
              <ShieldAlert className="w-3.5 h-3.5" />
              <span className="hidden md:inline">SYSTEM OVERRIDE ACTIVE</span>
              <span className="md:hidden">OVERRIDE</span>
            </div>
          )}
        </div>
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-2.5 shrink-0">
        {/* Device Fingerprint Hardware Isolation Badge */}
        <div 
          className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#070b16] border border-slate-800 text-[10px] text-slate-400 font-mono cursor-default"
          title={`Hardware Device Fingerprint: ${deviceSpecs?.fingerprint || 'Active'}\nPlatform: ${deviceSpecs?.platform || 'WebGL/GPU'}\nLocal History & API Keys Cryptographically Keyed to Device`}
        >
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
          <span className="text-slate-300 font-semibold">{deviceDisplayId}</span>
        </div>

        {/* Context Window Capacity Badge */}
        <div className="hidden lg:flex items-center gap-2 px-2.5 py-1 rounded-lg bg-slate-900/60 border border-slate-800 text-[11px] text-slate-400">
          <span>Context:</span>
          <div className="w-16 h-1.5 bg-slate-800 rounded-full overflow-hidden">
            <div 
              className={`h-full rounded-full transition-all duration-300 ${
                pct >= 0.8 ? 'bg-rose-500' : pct >= 0.5 ? 'bg-amber-400' : 'bg-emerald-400'
              }`}
              style={{ width: `${Math.max(5, pctDisp)}%` }}
            />
          </div>
          <span className="font-mono">{pctDisp}%</span>
        </div>

        {/* New Session Button */}
        <button
          onClick={onNewSession}
          className="p-2 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 transition-colors"
          title="New Chat Session"
        >
          <Plus className="w-4 h-4" />
        </button>

        {/* Settings Button */}
        <button
          onClick={() => setIsSettingsOpen(true)}
          className="p-2 rounded-lg text-slate-400 hover:text-indigo-400 hover:bg-slate-800/60 transition-colors"
          title="Open Settings"
        >
          <Settings className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
};
