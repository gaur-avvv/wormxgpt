import React, { useState, Suspense, lazy } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import { Copy, Check, Terminal, Brain, User, Sparkles, Wrench, ChevronDown, ChevronRight, CheckCircle2, AlertCircle, Clock, Loader2 } from 'lucide-react';
import { Message, AppSettings, ToolInvocation } from '../types';
import { InlineCode } from './CodeBlock';

const CodeBlock = lazy(() => import('./CodeBlock'));

interface ChatMessageProps {
  message: Message;
  settings: AppSettings;
  isGenerating?: boolean;
  activeToolCalling?: string | null;
}

const ToolInvocationCard: React.FC<{ invocation: ToolInvocation }> = ({ invocation }) => {
  const [isOpen, setIsOpen] = useState(true);
  const [copiedRes, setCopiedRes] = useState(false);

  const handleCopyResult = async () => {
    try {
      const resStr = typeof invocation.result === 'string' 
        ? invocation.result 
        : JSON.stringify(invocation.result, null, 2);
      await navigator.clipboard.writeText(resStr);
      setCopiedRes(true);
      setTimeout(() => setCopiedRes(false), 2000);
    } catch {}
  };

  const isSuccess = invocation.state === 'result' && !invocation.result?.error;
  const isError = invocation.state === 'result' && invocation.result?.error;

  return (
    <div className="my-2.5 rounded-xl border border-indigo-500/30 bg-[#090e1a] overflow-hidden text-xs font-mono shadow-sm">
      {/* Tool Header */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-3 py-2 bg-indigo-950/40 hover:bg-indigo-950/60 border-b border-indigo-500/20 flex items-center justify-between transition-colors text-left"
      >
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-5 h-5 rounded-md bg-indigo-500/20 border border-indigo-500/40 flex items-center justify-center text-indigo-300 shrink-0">
            <Wrench className="w-3 h-3" />
          </div>
          <span className="font-semibold text-indigo-200 truncate">
            Tool Call: <strong className="text-indigo-400">{invocation.toolName}</strong>
          </span>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {invocation.state === 'call' ? (
            <span className="px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/30 text-[10px] flex items-center gap-1 animate-pulse">
              <Clock className="w-3 h-3" /> Executing...
            </span>
          ) : isError ? (
            <span className="px-2 py-0.5 rounded-full bg-rose-500/15 text-rose-300 border border-rose-500/30 text-[10px] flex items-center gap-1">
              <AlertCircle className="w-3 h-3" /> Failed
            </span>
          ) : (
            <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 text-[10px] flex items-center gap-1 font-semibold">
              <CheckCircle2 className="w-3 h-3 text-emerald-400" /> Response Received
            </span>
          )}
          {isOpen ? <ChevronDown className="w-3.5 h-3.5 text-slate-400" /> : <ChevronRight className="w-3.5 h-3.5 text-slate-400" />}
        </div>
      </button>

      {/* Tool Body */}
      {isOpen && (
        <div className="p-3 space-y-2.5 bg-[#070b16]/90">
          {/* Arguments */}
          {invocation.args && Object.keys(invocation.args).length > 0 && (
            <div>
              <div className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider mb-1">
                Input Arguments:
              </div>
              <pre className="p-2 rounded-lg bg-slate-950 border border-slate-800 text-[11px] text-slate-300 overflow-x-auto custom-scrollbar">
                {JSON.stringify(invocation.args, null, 2)}
              </pre>
            </div>
          )}

          {/* Response / Output */}
          {invocation.state === 'result' && (
            <div>
              <div className="flex items-center justify-between text-[10px] text-slate-400 font-semibold uppercase tracking-wider mb-1">
                <span>Output Response:</span>
                <button
                  type="button"
                  onClick={handleCopyResult}
                  className="text-indigo-400 hover:text-indigo-300 lowercase text-[10px] flex items-center gap-1"
                >
                  {copiedRes ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                  <span>{copiedRes ? 'copied' : 'copy output'}</span>
                </button>
              </div>
              <pre className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 text-[11px] text-emerald-300/90 overflow-x-auto max-h-56 custom-scrollbar whitespace-pre-wrap">
                {typeof invocation.result === 'string'
                  ? invocation.result
                  : JSON.stringify(invocation.result, null, 2)}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export const ChatMessage: React.FC<ChatMessageProps> = React.memo(({ message, settings, isGenerating, activeToolCalling }) => {
  const isModel = message.role === 'model';
  const [isHovered, setIsHovered] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showThinking, setShowThinking] = useState(true);

  const handleCopyMessage = async () => {
    try {
      await navigator.clipboard.writeText(message.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  return (
    <div 
      className={`flex flex-col ${isModel ? 'items-start' : 'items-end'} font-sans animate-in fade-in duration-200`}
      onMouseEnter={() => setIsHovered(true)} 
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Sender Header */}
      <div className={`text-[11px] font-medium mb-1.5 flex items-center gap-1.5 ${isModel ? 'text-indigo-400' : 'text-slate-400'}`}>
        {isModel ? (
          <>
            <div className="w-5 h-5 rounded-md bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
              <Terminal className="w-3 h-3" />
            </div>
            <span className="font-semibold text-slate-200">WormGPT</span>
            <span className="text-[10px] text-slate-500 font-mono">[{settings.model}]</span>
          </>
        ) : (
          <>
            <span className="font-medium text-slate-400">User</span>
            <div className="w-5 h-5 rounded-md bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-300">
              <User className="w-3 h-3" />
            </div>
          </>
        )}
      </div>

      {/* Message Bubble */}
      <div 
        className={`max-w-[92%] sm:max-w-[85%] p-4 sm:p-5 rounded-2xl relative transition-all duration-200 ${
          isModel 
            ? 'bg-[#0d1322]/90 border border-slate-800/80 shadow-md shadow-black/40 text-slate-200' 
            : 'bg-[#151e33] border border-indigo-500/30 text-slate-100 shadow-sm'
        }`}
      >
        {/* Copy Button */}
        <button 
          onClick={handleCopyMessage} 
          className={`absolute top-3 right-3 p-1.5 rounded-lg transition-all ${
            isHovered ? 'opacity-100' : 'opacity-0'
          } ${
            copied 
              ? 'bg-emerald-600 text-white' 
              : 'bg-slate-800/80 text-slate-400 hover:text-slate-200 hover:bg-slate-700'
          }`}
          title="Copy message"
        >
          {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
        </button>

        {/* Attached Images */}
        {message.images && message.images.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-3">
            {message.images.map((img, idx) => (
              <img 
                key={idx} 
                src={img} 
                alt="Attachment" 
                className="max-h-48 max-w-full rounded-lg object-contain border border-slate-700/60"
              />
            ))}
          </div>
        )}

        {/* Reasoning / Thinking Trace */}
        {message.thinking && (
          <div className="mb-4 rounded-xl bg-slate-950/60 border border-amber-500/20 text-xs text-slate-300 overflow-hidden">
            <button
              onClick={() => setShowThinking(!showThinking)}
              className="w-full px-3.5 py-2 bg-amber-500/10 border-b border-amber-500/20 text-amber-300 font-semibold flex items-center justify-between text-[11px]"
            >
              <div className="flex items-center gap-2">
                <Brain className="w-3.5 h-3.5" />
                <span>Neural Reasoning & Chain of Thought</span>
              </div>
              <span className="text-[10px] text-amber-400/80 font-mono">
                {showThinking ? 'Hide Trace' : 'Show Trace'}
              </span>
            </button>
            {showThinking && (
              <div className="p-3 font-mono text-[11px] text-slate-300 leading-relaxed whitespace-pre-wrap max-h-60 overflow-y-auto custom-scrollbar">
                {message.thinking}
              </div>
            )}
          </div>
        )}

        {/* Live Model Tool Invocations & Responses */}
        {message.toolInvocations && message.toolInvocations.length > 0 && (
          <div className="mb-3 space-y-2">
            {message.toolInvocations.map((inv, idx) => (
              <ToolInvocationCard key={inv.toolCallId || idx} invocation={inv} />
            ))}
          </div>
        )}

        {/* Active Tool Calling Status Indicator */}
        {isModel && isGenerating && activeToolCalling && (
          <div className="mb-3 px-3 py-2 rounded-xl bg-indigo-950/80 border border-indigo-500/40 text-indigo-200 text-xs font-mono flex items-center justify-between shadow-sm animate-pulse">
            <div className="flex items-center gap-2 min-w-0">
              <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-400 shrink-0" />
              <span className="truncate">
                Calling tool: <strong className="text-indigo-300 font-semibold">{activeToolCalling}</strong>...
              </span>
            </div>
            <span className="px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 text-[10px] font-mono shrink-0">
              ACTIVE_CALL
            </span>
          </div>
        )}

        {/* Markdown Content or Generating Indicator */}
        {isModel && isGenerating && !message.content ? (
          <div className="flex items-center gap-2.5 text-xs font-mono text-indigo-400 py-1">
            <Loader2 className="w-4 h-4 animate-spin text-indigo-400 shrink-0" />
            <span className="font-semibold tracking-wide animate-pulse">Generating...</span>
          </div>
        ) : (
          <div className="markdown-content text-sm leading-relaxed selection:bg-indigo-600 selection:text-white">
            <ReactMarkdown
              remarkPlugins={[remarkGfm, remarkMath]}
              rehypePlugins={[rehypeKatex]}
              components={{
                code({ node, className, children, ...props }: any) {
                  if (className?.includes('language-math')) {
                    return <code className={className} {...props}>{children}</code>;
                  }
                  const inline = (props as any).inline;
                  const isInline = inline || (!className && !String(children).includes('\n'));
                  if (isInline) {
                    return <InlineCode>{children}</InlineCode>;
                  }
                  return (
                    <Suspense fallback={<div className="p-3 bg-slate-950 text-slate-400 font-mono text-xs animate-pulse">Loading syntax highlighter...</div>}>
                      <CodeBlock className={className} settings={settings}>{children}</CodeBlock>
                    </Suspense>
                  );
                },
                pre({ children }) { 
                  return <>{children}</>; 
                }
              }}
            >
              {message.content}
            </ReactMarkdown>

            {/* In-progress indicator during active stream generation */}
            {isModel && isGenerating && (
              <div className="mt-3 pt-2 border-t border-slate-800/60 flex items-center gap-2 text-xs font-mono text-indigo-400 animate-pulse">
                <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-400 shrink-0" />
                <span className="font-medium">Generating...</span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
});
