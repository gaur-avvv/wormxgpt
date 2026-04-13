import React, { useState } from 'react';
import { useWormGPT } from '../../context/GlobalContext';

interface SidebarProps {
  onDeleteSession: (id: string) => void;
  onNewSession: () => void;
  onClear: () => void;
  onHardReset: () => void;
  onExport: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  onDeleteSession,
  onNewSession,
  onClear,
  onHardReset,
  onExport
}) => {
  const { 
    sessions, 
    activeSessionId, 
    setActiveSessionId, 
    isSidebarOpen, 
    setIsSidebarOpen,
    setIsSettingsOpen
  } = useWormGPT();
  
  const [isHovered, setIsHovered] = useState(false);
  const effectiveOpen = isSidebarOpen || isHovered;

  return (
    <>
      <style>{`
        .sidebar-scroll::-webkit-scrollbar { width: 0px; }
        .sidebar-scroll { scrollbar-width: none; }
      `}</style>
      
      <aside 
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className={`fixed inset-y-0 left-0 z-50 bg-[#050000] border-r-2 border-red-900/40 flex flex-col transition-all duration-500 ease-in-out ${effectiveOpen ? 'w-72' : 'w-16'} overflow-hidden shadow-[0_0_30px_rgba(220,38,38,0.2)]`}
      >
        {/* Header / Brand */}
        <div className="p-4 border-b border-red-900/30 bg-gradient-to-b from-red-900/10 to-transparent flex items-center justify-between h-16 shrink-0">
          {effectiveOpen ? (
            <div className="flex flex-col animate-fadeIn">
              <h1 className="text-lg font-black text-red-600 tracking-widest italic">SESSIONS</h1>
              <span className="text-[8px] text-red-900/60 font-bold uppercase tracking-widest leading-none">Matrix_V4.7</span>
            </div>
          ) : (
            <div className="w-full flex justify-center">
              <div className="w-2 h-2 bg-red-600 rounded-full animate-pulse shadow-[0_0_8px_#ff0000]"></div>
            </div>
          )}
        </div>

        {/* New Session Button */}
        <div className="p-3 shrink-0">
          <button
            onClick={onNewSession}
            className={`w-full py-3 bg-red-600/10 border-2 border-red-600/40 text-red-500 font-black uppercase text-[10px] tracking-widest rounded-lg flex items-center justify-center gap-2 hover:bg-red-600 hover:text-black transition-all group ${!effectiveOpen ? 'px-0' : 'px-4'}`}
          >
            <span className="text-lg">+</span>
            {effectiveOpen && <span className="animate-fadeIn">NEW_CHAT</span>}
          </button>
        </div>

        {/* Session List */}
        <div className="flex-1 overflow-y-auto sidebar-scroll p-2 space-y-2">
          {sessions.map(s => (
            <div
              key={s.id}
              onClick={() => setActiveSessionId(s.id)}
              className={`group relative flex items-center gap-3 p-3 rounded-lg border transition-all duration-300 cursor-pointer ${s.id === activeSessionId ? 'bg-red-600/15 border-red-600/60' : 'bg-zinc-950/40 border-red-900/20 hover:border-red-600/40'}`}
            >
              <div className={`shrink-0 w-2 h-2 rounded-full ${s.id === activeSessionId ? 'bg-red-500 shadow-[0_0_8px_#ff0000]' : 'bg-red-900/40'}`} />
              {effectiveOpen && (
                <div className="flex-1 min-w-0 pr-6 animate-fadeIn">
                  <div className={`text-[10px] font-bold uppercase truncate ${s.id === activeSessionId ? 'text-red-400' : 'text-zinc-500 group-hover:text-red-400'}`}>
                    {s.title}
                  </div>
                </div>
              )}
              {effectiveOpen && (
                <button
                  onClick={(e) => { e.stopPropagation(); onDeleteSession(s.id); }}
                  className="absolute right-2 opacity-0 group-hover:opacity-100 p-1 hover:text-red-500 transition-opacity"
                >
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M19 7l-.8 12.1A2 2 0 0116.1 21H7.9a2 2 0 01-2-1.9L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" strokeWidth={2} /></svg>
                </button>
              )}
            </div>
          ))}
        </div>

        {/* Footer Actions */}
        <div className="p-3 border-t border-red-900/30 bg-black/40 space-y-2 shrink-0">
          <button 
            onClick={() => setIsSettingsOpen(true)}
            className="w-full flex items-center gap-3 p-2 text-red-900 hover:text-red-500 transition-colors group"
          >
            <svg className="w-5 h-5 group-hover:rotate-90 transition-transform duration-500" fill="currentColor" viewBox="0 0 24 24"><path d="M19.14,12.94c0.04-0.3,0.06-0.61,0.06-0.94c0-0.32-0.02-0.64-0.07-0.94l2.03-1.58c0.18-0.14,0.23-0.41,0.12-0.61 l-1.92-3.32c-0.12-0.22-0.37-0.29-0.59-0.22l-2.39,0.96c-0.5-0.38-1.03-0.7-1.62-0.94L14.4,2.81c-0.04-0.24-0.24-0.41-0.48-0.41 h-3.84c-0.24,0-0.43,0.17-0.47,0.41L9.25,5.35C8.66,5.59,8.12,5.91,7.62,6.29L5.23,5.33c-0.22-0.08-0.47,0-0.59,0.22L2.72,8.87 c-0.11,0.2-0.06,0.47,0.12,0.61l2.03,1.58C4.84,11.36,4.82,11.68,4.82,12c0,0.32,0.02,0.64,0.07,0.94l-2.03,1.58 c-0.18,0.14-0.23,0.41-0.12,0.61l1.92,3.32c0.12,0.22,0.37,0.29,0.59,0.22l2.39-0.96c0.5,0.38,1.03,0.7,1.62,0.94l0.36,2.54 c0.05,0.24,0.24,0.41,0.48,0.41h3.84c0.24,0,0.44-0.17,0.47-0.41l0.36-2.54c0.59-0.24,1.13-0.56,1.62-0.94l2.39,0.96 c0.22,0.08,0.47,0,0.59-0.22l1.92-3.32c0.11-0.2,0.06-0.47-0.12-0.61L19.14,12.94z M12,15.6c-1.98,0-3.6-1.62-3.6-3.6 s1.62-3.6,3.6-3.6s3.6,1.62,3.6,3.6S13.98,15.6,12,15.6z" /></svg>
            {effectiveOpen && <span className="text-[10px] font-black uppercase tracking-widest animate-fadeIn">Settings</span>}
          </button>
          
          <button 
            onClick={onExport}
            className="w-full flex items-center gap-3 p-2 text-red-900 hover:text-red-400 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" strokeWidth={2} /></svg>
            {effectiveOpen && <span className="text-[10px] font-black uppercase tracking-widest animate-fadeIn">Export</span>}
          </button>

          <button 
            onClick={onClear}
            className="w-full flex items-center gap-3 p-2 text-red-950 hover:text-red-600 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" strokeWidth={2} /></svg>
            {effectiveOpen && <span className="text-[10px] font-black uppercase tracking-widest animate-fadeIn">Clear Buffer</span>}
          </button>
        </div>
      </aside>
    </>
  );
};
