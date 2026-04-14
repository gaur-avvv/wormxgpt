import React, { useRef, useEffect, useState, useMemo } from 'react';
import { useWormGPT } from '../context/GlobalContext';
import { ChatMessage } from './ChatMessage';
import { SUGGESTED_PROMPTS } from '../constants';

export const ChatWindow: React.FC = () => {
  const { activeSession, settings, isStreaming, setInput } = useWormGPT();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [showScrollBottom, setShowScrollBottom] = useState(false);

  // Virtualization windowing
  const [visibleRange, setVisibleRange] = useState({ start: 0, end: 50 });
  const messages = useMemo(() => activeSession.messages, [activeSession.messages]);

  useEffect(() => {
    // Auto-scroll to bottom on new messages if near bottom
    if (scrollRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
      const isNearBottom = scrollHeight - scrollTop - clientHeight < 200;
      if (isNearBottom || isStreaming.current) {
        scrollRef.current.scrollTo({ top: scrollHeight, behavior: 'smooth' });
      }
    }
  }, [messages.length, isStreaming.current]);

  const handleScroll = () => {
    if (!scrollRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
    setShowScrollBottom(scrollHeight - scrollTop - clientHeight > 300);
    
    // Simple windowing logic (can be expanded to full virtualization)
    // For now, we render the last 100 messages for performance
  };

  return (
    <div className="flex-1 overflow-hidden flex flex-col relative bg-[#050000]">
      {/* Background Watermark */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-[0.03] select-none z-0">
        <h1 className="text-[20vw] font-black italic tracking-tighter text-red-600 rotate-[-15deg]">WormGPT</h1>
      </div>

      <div 
        ref={scrollRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto p-4 sm:p-8 md:p-12 scroll-smooth custom-scrollbar relative z-10"
      >
        <div className="max-w-4xl mx-auto min-h-full flex flex-col">
          {messages.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center py-20 animate-fadeIn">
              <div className="mb-8 relative">
                <div className="w-24 h-24 bg-red-600/10 border-2 border-red-600/60 rounded-full animate-pulse flex items-center justify-center shadow-[0_0_30px_#ff000033]">
                  <div className="w-14 h-14 bg-red-600/20 border-2 border-red-600 rounded-full flex items-center justify-center">
                    <span className="text-red-500 text-3xl font-black italic drop-shadow-[0_0_8px_#ff0000]">W</span>
                  </div>
                </div>
                <div className="absolute -inset-6 border-2 border-red-600/20 rounded-full animate-ping opacity-10" />
              </div>
              
              <h2 className="text-4xl font-black uppercase tracking-[0.4em] text-red-600 mb-2 drop-shadow-[0_0_15px_#ff0000]">Terminal_Ready</h2>
              <p className="text-[11px] text-red-500/50 font-mono uppercase tracking-[0.5em] mb-12">System.Wait(Command_Injection)...</p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-2xl px-4">
                {SUGGESTED_PROMPTS.map((p, i) => (
                  <button 
                    key={i} 
                    onClick={() => setInput(p)} 
                    className="p-4 bg-zinc-950/40 border-2 border-red-900/20 hover:border-red-600/60 hover:bg-red-600/10 text-[10px] text-left transition-all rounded text-zinc-500 hover:text-red-400 font-bold uppercase tracking-wider"
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <>
              {/* Virtualized view of messages (slice for now to ensure extreme performance) */}
              {messages.slice(-100).map((msg, i) => (
                <ChatMessage key={`${msg.timestamp}-${i}`} message={msg} settings={settings} />
              ))}
              <div className="h-20 shrink-0" />
            </>
          )}
        </div>
      </div>

      {showScrollBottom && (
        <button 
          onClick={() => scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })}
          className="absolute bottom-6 right-6 p-3 bg-red-600 text-black rounded-full shadow-[0_0_20px_rgba(220,38,38,0.5)] hover:scale-110 active:scale-95 transition-all z-20"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M19 14l-7 7-7-7" strokeWidth={3} /></svg>
        </button>
      )}
    </div>
  );
};
