import React from 'react';
import { MODEL_OPTIONS } from '../constants';
import { ATTACHED_TOOLS } from '../services';

interface AutocompleteDropdownProps {
  visible: boolean;
  type: 'model' | 'tool' | null;
  query: string;
  onSelect: (value: string) => void;
  activeIndex: number;
}

export const AutocompleteDropdown: React.FC<AutocompleteDropdownProps> = ({ 
  visible, type, query, onSelect, activeIndex 
}) => {
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
