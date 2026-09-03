import React, { useRef, useEffect, useState, useMemo, useCallback } from 'react';
import { Terminal, Sparkles, ShieldAlert, Cpu, Eye, ArrowDown, Loader2 } from 'lucide-react';
import { useWormGPT } from '../context/GlobalContext';
import { ChatMessage } from './ChatMessage';
import { SUGGESTED_PROMPTS } from '../constants';

export const ChatWindow: React.FC<{
  onOpenModelSelector?: (mode?: 'text' | 'vision') => void;
}> = ({ onOpenModelSelector }) => {
  const { activeSession, settings, isStreaming, activeToolCalling, setInput } = useWormGPT();
  const scrollRef = useRef<HTMLDivElement>(null);
  const userScrolledUp = useRef<boolean>(false);
  const [showScrollBottom, setShowScrollBottom] = useState<boolean>(false);

  const messages = useMemo(() => activeSession.messages, [activeSession.messages]);
  const lastMessage = messages[messages.length - 1];
  const lastMessageContent = lastMessage?.content;

  // Scroll detection handler to maintain user intent
  const handleScroll = useCallback(() => {
    if (!scrollRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
    const distanceFromBottom = scrollHeight - scrollTop - clientHeight;
    
    // User is considered scrolled up if more than 70px from the bottom
    const isUp = distanceFromBottom > 70;
    userScrolledUp.current = isUp;
    setShowScrollBottom(distanceFromBottom > 160);
  }, []);

  const scrollToBottom = useCallback((smooth = true) => {
    if (!scrollRef.current) return;
    userScrolledUp.current = false;
    setShowScrollBottom(false);
    
    if (smooth) {
      scrollRef.current.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior: 'smooth'
      });
    } else {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, []);

  // When a new message is appended or active session changes, reset userScrolledUp and scroll down
  useEffect(() => {
    userScrolledUp.current = false;
    scrollToBottom(true);
  }, [messages.length, activeSession.id, scrollToBottom]);

  // Streaming-aware auto-scrolling: During active token streams, smoothly maintain bottom position
  // without jitter ONLY if the user hasn't scrolled up to review previous output
  useEffect(() => {
    if (isStreaming && !userScrolledUp.current && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [lastMessageContent, isStreaming]);

  return (
    <div className="flex-1 overflow-hidden flex flex-col relative bg-[#090d16] font-sans">
      <div 
        ref={scrollRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto p-4 sm:p-6 md:p-8 custom-scrollbar relative z-10"
      >
        <div className="max-w-4xl mx-auto min-h-full flex flex-col">
          {messages.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center py-12 text-center animate-in fade-in duration-300">
              {/* Terminal Logo Icon */}
              <div className="mb-6 relative">
                <div className="w-16 h-16 rounded-2xl bg-indigo-600/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400 shadow-xl shadow-indigo-950/40">
                  <Terminal className="w-8 h-8" />
                </div>
              </div>

              <h2 className="text-2xl font-bold tracking-tight text-slate-100 mb-2">
                WormGPT Terminal & Model Harness
              </h2>
              <p className="text-xs text-slate-400 max-w-md mb-6 leading-relaxed">
                Autonomous agent harness with multi-model routing, unrestricted prompt injection, and 28+ provider fallback chains.
              </p>

              {/* Active Harness Config Badges */}
              <div className="flex flex-wrap items-center justify-center gap-2 mb-8">
                <div 
                  onClick={() => onOpenModelSelector?.('text')}
                  className="px-3 py-1.5 rounded-lg bg-slate-900/80 border border-slate-800 text-xs text-slate-300 flex items-center gap-1.5 cursor-pointer hover:border-indigo-500/50 transition-all"
                >
                  <Cpu className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Text: {settings.model}</span>
                </div>

                <div 
                  onClick={() => onOpenModelSelector?.('vision')}
                  className="px-3 py-1.5 rounded-lg bg-slate-900/80 border border-slate-800 text-xs text-slate-300 flex items-center gap-1.5 cursor-pointer hover:border-violet-500/50 transition-all"
                >
                  <Eye className="w-3.5 h-3.5 text-violet-400" />
                  <span>Vision: {settings.visionModel || 'gemini-2.5-flash'}</span>
                </div>

                {settings.systemOverride && (
                  <div className="px-3 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-xs text-amber-300 flex items-center gap-1.5">
                    <ShieldAlert className="w-3.5 h-3.5" />
                    <span>System Override Active</span>
                  </div>
                )}
              </div>

              {/* Quick Prompts */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 w-full max-w-2xl px-4 text-left">
                {SUGGESTED_PROMPTS.slice(0, 4).map((p, i) => (
                  <button 
                    key={i} 
                    onClick={() => setInput(p)} 
                    className="p-3.5 bg-slate-900/40 hover:bg-indigo-600/10 border border-slate-800 hover:border-indigo-500/40 rounded-xl text-xs text-slate-300 hover:text-slate-100 transition-all duration-200"
                  >
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                      <span className="truncate">{p}</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-6 pb-20">
              {messages.map((msg, i) => (
                <ChatMessage 
                  key={`${msg.timestamp || i}-${i}`} 
                  message={msg} 
                  settings={settings}
                  isGenerating={isStreaming && i === messages.length - 1 && msg.role === 'model'}
                  activeToolCalling={isStreaming && i === messages.length - 1 ? activeToolCalling : null}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {showScrollBottom && (
        <button 
          onClick={() => scrollToBottom(true)}
          className="absolute bottom-6 right-6 p-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-full shadow-lg shadow-indigo-950/60 hover:scale-105 active:scale-95 transition-all z-20 flex items-center justify-center"
          title="Scroll to latest message"
        >
          <ArrowDown className="w-4 h-4" />
        </button>
      )}
    </div>
  );
};

export default ChatWindow;
