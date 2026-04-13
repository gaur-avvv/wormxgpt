import React, { useState, Suspense, lazy } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import { Message, AppSettings } from '../types';
import { InlineCode } from './CodeBlock';

const CodeBlock = lazy(() => import('./CodeBlock'));

interface ChatMessageProps {
  message: Message;
  settings: AppSettings;
}

export const ChatMessage: React.FC<ChatMessageProps> = React.memo(({ message, settings }) => {
  const isModel = message.role === 'model';
  const [isHovered, setIsHovered] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleCopyMessage = async () => {
    try {
      await navigator.clipboard.writeText(message.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) { console.error('Failed to copy:', err); }
  };

  return (
    <div className={`mb-8 flex flex-col ${isModel ? 'items-start' : 'items-end'}`} onMouseEnter={() => setIsHovered(true)} onMouseLeave={() => setIsHovered(false)}>
      <div className={`text-[10px] uppercase font-black mb-1.5 tracking-widest flex items-center gap-2 ${isModel ? 'text-red-600' : 'text-zinc-600'}`}>
        {isModel ? <><span className="w-1.5 h-1.5 bg-red-600 animate-pulse rounded-sm"></span>[WormGPT]</> : <>[USER]<span className="w-1.5 h-1.5 bg-zinc-600 rounded-sm"></span></>}
      </div>
      <div className={`max-w-[90%] p-4 sm:p-6 rounded relative border-l-4 backdrop-blur-sm transition-all duration-300 ${isModel ? 'bg-[#0a0505]/80 border-red-600 text-red-100' : 'bg-[#0a0a0a]/80 border-zinc-800 text-zinc-300'}`}>
        {/* Copy Button */}
        <button onClick={handleCopyMessage} className={`absolute top-2 right-2 p-1.5 rounded transition-all ${isHovered ? 'opacity-100' : 'opacity-0'} ${copied ? 'bg-green-600 text-black' : 'bg-red-900/80 text-red-400 hover:bg-red-600 hover:text-black'}`}>
          {copied ? '✓' : <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" strokeWidth={2} /></svg>}
        </button>

        {message.thinking && (
          <div className="mb-4 p-4 bg-zinc-900/40 border-l-2 border-amber-600/30 rounded-r-xl text-[11px] font-mono text-zinc-400">
            <div className="text-amber-500/80 font-black mb-2 flex items-center gap-2 tracking-widest text-[9px]">
              <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
              NEURAL_REASONING_TRACE
            </div>
            <div className="opacity-80 whitespace-pre-wrap">{message.thinking}</div>
          </div>
        )}

        <div className="markdown-content selection:bg-red-600 selection:text-black">
          <ReactMarkdown
            remarkPlugins={[remarkGfm, remarkMath]}
            rehypePlugins={[rehypeKatex]}
            components={{
              code({ node, className, children, ...props }: any) {
                if (className?.includes('language-math')) return <code className={className} {...props}>{children}</code>;
                const inline = (props as any).inline;
                const isInline = inline || (!className && !String(children).includes('\n'));
                if (isInline) return <InlineCode>{children}</InlineCode>;
                return <Suspense fallback={<div className="p-4 bg-black animate-pulse text-red-900">_LOADING_COMPILER...</div>}><CodeBlock className={className} settings={settings}>{children}</CodeBlock></Suspense>;
              },
              pre({ children }) { return <>{children}</>; }
            }}
          >
            {message.content}
          </ReactMarkdown>
        </div>
      </div>
    </div>
  );
});
