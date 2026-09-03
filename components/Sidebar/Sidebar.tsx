import React, { useState, useMemo } from 'react';
import { 
  Plus, Settings, Download, Trash2, ChevronLeft, ChevronRight, 
  MessageSquare, Search, Terminal, ShieldAlert
} from 'lucide-react';
import { useWormGPT } from '../../context/GlobalContext';

export interface SidebarProps {
  sessions?: Array<{ id: string; title: string; updatedAt?: number; messages?: any[] }>;
  activeSessionId?: string;
  onSelectSession?: (id: string) => void;
  onNewSession?: () => void;
  onDeleteSession?: (id: string) => void;
  onClear?: () => void;
  onHardReset?: () => void;
  onExport?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  sessions: propSessions,
  activeSessionId: propActiveSessionId,
  onSelectSession,
  onNewSession: propOnNewSession,
  onDeleteSession,
  onClear,
  onExport
}) => {
  const { 
    sessions: ctxSessions, 
    activeSessionId: ctxActiveSessionId, 
    setActiveSessionId: ctxSetActiveSessionId, 
    isSidebarOpen, 
    setIsSidebarOpen,
    setIsSettingsOpen,
    settings
  } = useWormGPT();
  
  const rawSessions = propSessions || ctxSessions;
  const currentActiveId = propActiveSessionId || ctxActiveSessionId;
  const handleSelect = onSelectSession || ctxSetActiveSessionId;

  const [searchTerm, setSearchTerm] = useState('');

  // Normalize sessions with valid updatedAt
  const normalizedSessions = useMemo(() => {
    return rawSessions.map(s => {
      let ts = s.updatedAt;
      if (!ts && s.messages && s.messages.length > 0) {
        ts = s.messages[s.messages.length - 1].timestamp;
      }
      return {
        ...s,
        updatedAt: ts || Date.now()
      };
    });
  }, [rawSessions]);

  // Filter sessions by title keywords or creation/update timestamp
  const filteredSessions = useMemo(() => {
    if (!searchTerm.trim()) return normalizedSessions;
    const query = searchTerm.toLowerCase();
    return normalizedSessions.filter((s) => {
      const titleMatch = (s.title || '').toLowerCase().includes(query);
      const dateStr = new Date(s.updatedAt).toLocaleDateString().toLowerCase();
      const dateMatch = dateStr.includes(query);
      return titleMatch || dateMatch;
    });
  }, [normalizedSessions, searchTerm]);

  const handleNew = () => {
    if (propOnNewSession) {
      propOnNewSession();
    }
  };

  return (
    <aside 
      className={`fixed inset-y-0 left-0 z-50 bg-[#0d1322]/95 backdrop-blur-xl border-r border-indigo-950/40 flex flex-col transition-all duration-300 ease-in-out ${
        isSidebarOpen ? 'w-64 sm:w-72' : 'w-16'
      } shadow-2xl shadow-black/60 font-sans select-none`}
    >
      {/* Brand Header */}
      <div className="p-3.5 border-b border-indigo-950/50 flex items-center justify-between h-16 shrink-0 bg-[#090d16]/80">
        {isSidebarOpen ? (
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-indigo-600/20 border border-indigo-500/40 flex items-center justify-center text-indigo-400 shrink-0">
              <Terminal className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <h1 className="text-xs font-mono font-bold tracking-tight text-slate-100 truncate">WormGPT Terminal</h1>
              <div className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                <span className="text-[10px] text-slate-400 font-mono">v4.7 HARNESS</span>
              </div>
            </div>
          </div>
        ) : (
          <div className="w-full flex justify-center">
            <div className="w-8 h-8 rounded-lg bg-indigo-600/20 border border-indigo-500/40 flex items-center justify-center text-indigo-400">
              <Terminal className="w-4 h-4" />
            </div>
          </div>
        )}

        {/* Toggle Collapse Button */}
        {isSidebarOpen && (
          <button
            onClick={() => setIsSidebarOpen(false)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 transition-colors"
            title="Collapse Sidebar"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Action Header: + NEW SESSION & Search Filter */}
      <div className="p-3 border-b border-indigo-950/40 space-y-2 shrink-0">
        <button
          onClick={handleNew}
          className={`w-full py-2 px-3 text-xs font-mono font-semibold rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white transition-all shadow-md shadow-indigo-900/30 flex items-center justify-center gap-2 ${
            !isSidebarOpen ? 'px-0' : ''
          }`}
          title="New Session"
        >
          <Plus className="w-4 h-4 shrink-0" />
          {isSidebarOpen && <span>+ NEW SESSION</span>}
        </button>

        {isSidebarOpen && (
          <div className="relative">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search sessions or date..."
              className="w-full bg-[#070b12] border border-indigo-950/60 rounded-md px-2.5 py-1.5 text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-indigo-500 font-mono"
            />
            {searchTerm ? (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-2 top-1.5 text-zinc-500 hover:text-zinc-300 text-xs font-mono px-1"
                title="Clear filter"
              >
                ×
              </button>
            ) : (
              <Search className="w-3 h-3 text-zinc-600 absolute right-2.5 top-2.5 pointer-events-none" />
            )}
          </div>
        )}
      </div>

      {/* System Override status indicator in sidebar */}
      {isSidebarOpen && settings.systemOverride && (
        <div className="mx-3 my-1.5 p-2 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center gap-2 text-amber-300 text-[11px] font-medium shrink-0">
          <ShieldAlert className="w-3.5 h-3.5 shrink-0" />
          <span className="truncate">System Override Active</span>
        </div>
      )}

      {/* Sessions List */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1 custom-scrollbar">
        {filteredSessions.length === 0 ? (
          isSidebarOpen ? (
            <p className="text-[11px] font-mono text-zinc-500 text-center py-6">
              No matching sessions found
            </p>
          ) : null
        ) : (
          filteredSessions.map((session) => {
            const isActive = session.id === currentActiveId;
            return (
              <div
                key={session.id}
                onClick={() => handleSelect(session.id)}
                className={`group relative w-full text-left p-2 rounded-md transition-all text-xs font-mono flex items-center gap-2 cursor-pointer ${
                  isActive
                    ? 'bg-indigo-950/50 text-indigo-200 border border-indigo-800/40 shadow-sm'
                    : 'text-zinc-400 hover:bg-[#070b12] hover:text-zinc-200 border border-transparent'
                }`}
                title={session.title}
              >
                <MessageSquare className={`w-3.5 h-3.5 shrink-0 ${isActive ? 'text-indigo-400' : 'text-zinc-600'}`} />

                {isSidebarOpen && (
                  <div className="flex-1 min-w-0 flex flex-col gap-0.5">
                    <span className="truncate font-medium text-xs">
                      {session.title || 'Untitled Session'}
                    </span>
                    <span className="text-[10px] text-zinc-500">
                      {new Date(session.updatedAt).toLocaleDateString(undefined, {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                )}

                {isSidebarOpen && onDeleteSession && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteSession(session.id);
                    }}
                    className="opacity-0 group-hover:opacity-100 p-1 text-zinc-500 hover:text-rose-400 rounded transition-all shrink-0"
                    title="Delete Session"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Footer Controls */}
      <div className="p-3 border-t border-indigo-950/40 bg-slate-950/40 space-y-1 shrink-0 font-mono text-xs">
        {!isSidebarOpen && (
          <button
            onClick={() => setIsSidebarOpen(true)}
            className="w-full flex justify-center p-2 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-900 transition-colors"
            title="Expand Sidebar"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        )}

        {onExport && (
          <button
            onClick={onExport}
            className={`w-full flex items-center gap-2 p-2 rounded-md text-zinc-400 hover:text-zinc-200 hover:bg-[#070b12] transition-colors ${
              !isSidebarOpen ? 'justify-center' : ''
            }`}
            title="Export Conversation Logs"
          >
            <Download className="w-3.5 h-3.5 shrink-0" />
            {isSidebarOpen && <span>Export Logs</span>}
          </button>
        )}

        {onClear && (
          <button
            onClick={onClear}
            className={`w-full flex items-center gap-2 p-2 rounded-md text-zinc-400 hover:text-zinc-200 hover:bg-[#070b12] transition-colors ${
              !isSidebarOpen ? 'justify-center' : ''
            }`}
            title="Clear Current Chat"
          >
            <Trash2 className="w-3.5 h-3.5 shrink-0 text-rose-400/70" />
            {isSidebarOpen && <span>Clear Chat</span>}
          </button>
        )}

        <button
          onClick={() => setIsSettingsOpen(true)}
          className={`w-full flex items-center gap-2 p-2 rounded-md text-zinc-400 hover:text-indigo-400 hover:bg-[#070b12] transition-colors ${
            !isSidebarOpen ? 'justify-center' : ''
          }`}
          title="Console & System Settings"
        >
          <Settings className="w-3.5 h-3.5 shrink-0" />
          {isSidebarOpen && <span>Settings & Harness</span>}
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
