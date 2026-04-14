import React, { useRef, useState, useEffect } from 'react';
import { useWormGPT } from '../context/GlobalContext';
import { AutocompleteDropdown } from './AutocompleteDropdown';
import { ATTACHED_TOOLS, TOOL_CATEGORIES } from '../services';
import { MODEL_OPTIONS } from '../constants';

export const InputBar: React.FC<{
  onFileSelect: () => void;
  suggestions: string[];
}> = ({ onFileSelect, suggestions }) => {
  const {
    input, setInput,
    attachments, removeAttachment,
    isStreaming,
    activeSession,
    handleSend,
    handleAbort,
    autocomplete, setAutocomplete,
    settings, setSettings
  } = useWormGPT();

  const [isAgentMenuOpen, setIsAgentMenuOpen] = useState(false);
  const [toolSearchQuery, setToolSearchQuery] = useState('');
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const agentMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.style.height = 'auto';
      inputRef.current.style.height = `${Math.min(inputRef.current.scrollHeight, 200)}px`;
    }
  }, [input]);

  const handleAutocompleteSelect = (value: string) => {
    const lastAtPos = input.lastIndexOf('@');
    const lastSlashPos = input.lastIndexOf('/');
    const pos = autocomplete.type === 'model' ? lastAtPos : lastSlashPos;

    if (pos !== -1) {
      const before = input.slice(0, pos + 1);
      const after = input.slice(pos + 1 + autocomplete.query.length);
      setInput(before + value + ' ' + after);
    }
    
    setAutocomplete({ visible: false, type: null, query: '', index: 0 });
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (autocomplete.visible) {
      const filtered = autocomplete.type === 'model'
        ? MODEL_OPTIONS.filter(m => m.label.toLowerCase().includes(autocomplete.query.toLowerCase()))
        : Object.keys(ATTACHED_TOOLS).filter(t => t.toLowerCase().includes(autocomplete.query.toLowerCase()));

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setAutocomplete(prev => ({ ...prev, index: (prev.index + 1) % filtered.length }));
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setAutocomplete(prev => ({ ...prev, index: (prev.index - 1 + filtered.length) % filtered.length }));
        return;
      }
      if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault();
        const selected = filtered[autocomplete.index];
        if (selected) {
          handleAutocompleteSelect(typeof selected === 'string' ? selected : (selected as any).value);
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
    <div className="px-3 sm:px-10 py-4 bg-gradient-to-t from-black via-[#0a0505] to-[#0a0505] border-t-2 border-red-900/30">
      <div className="max-w-4xl mx-auto relative group">
        {/* Suggestion Chips */}
        {!isStreaming.current && activeSession.messages.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-3">
            {/* Default 'Continue' suggestion */}
            <button 
              onClick={() => handleSend("Continue where you left")} 
              className="px-3 py-1 bg-red-600/20 border border-red-600/50 rounded-full text-[9px] font-black text-red-400 hover:bg-red-600 hover:text-black transition-all duration-300 uppercase tracking-widest shadow-[0_0_10px_rgba(220,38,38,0.2)]"
            >
              Continue where you left
            </button>
            
            {suggestions.map((s, i) => (
              <button key={i} onClick={() => handleSend(s)} className="px-3 py-1 bg-red-950/20 border border-red-900/40 rounded-full text-[10px] font-black text-red-500 hover:bg-red-600 hover:text-black transition-all duration-300 uppercase tracking-widest">{s}</button>
            ))}
          </div>
        )}

        {attachments.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-3 p-3 border-2 border-red-900/30 rounded-t-lg bg-black/60">
            {attachments.map((at, i) => (
              <div key={i} className="relative w-20 h-20 border-2 border-red-600/50 rounded-lg overflow-hidden group">
                <img src={at} className="w-full h-full object-cover grayscale" alt="attachment" />
                <button onClick={() => removeAttachment(i)} className="absolute inset-0 bg-red-600/80 opacity-0 group-hover:opacity-100 flex items-center justify-center text-black font-black">✕</button>
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
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Inject command string..."
          className={`w-full bg-black border-2 border-red-900/30 focus:border-red-600/60 text-xs font-mono p-3 pl-28 pr-28 resize-none outline-none text-red-100 placeholder:text-red-900/30 transition-all ${attachments.length > 0 ? 'rounded-b-lg' : 'rounded-lg'}`}
          rows={1}
        />

        <div className="absolute left-2 bottom-2.5 flex items-center gap-2">
          <button
            onClick={() => setIsAgentMenuOpen(!isAgentMenuOpen)}
            className={`flex items-center gap-1 px-2 py-1 rounded-md border-2 bg-black/50 hover:text-red-300 transition-all duration-300 ${(settings.enabledTools?.length || 0) > 0 ? 'text-red-400 border-red-600/60 shadow-[0_0_12px_rgba(220,38,38,0.28)]' : 'text-zinc-500 border-red-900/30'}`}
          >
            <span className="text-[9px] font-black uppercase tracking-widest hidden sm:inline">Agent</span>
            <svg className={`w-3 h-3 transition-transform ${isAgentMenuOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M19 9l-7 7-7-7" strokeWidth={3} /></svg>
          </button>
        </div>

        <button
          onClick={() => isStreaming.current ? handleAbort() : handleSend()}
          className={`absolute right-2 bottom-2 px-5 py-2 font-black uppercase text-[10px] tracking-widest rounded transition-all active:scale-95 flex items-center gap-2 ${
            isStreaming.current 
              ? 'bg-red-950 text-red-500 border-2 border-red-500 shadow-[0_0_25px_#ff0000] animate-pulse cursor-pointer' 
              : 'neon-button !bg-red-600/10 hover:!bg-red-600'
          }`}
        >
          {isStreaming.current ? 'STOP_GEN' : (
            <>
              INJECT
              <span className="text-[8px] opacity-60 border border-current px-1 rounded">ENTER</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
};
