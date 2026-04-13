import React, { useState, useRef } from 'react';
import { executeToolCall } from '../services/tools';
import { AppSettings } from '../types';

export const ExecutionTerminal: React.FC<{ output: string; error?: boolean; loading?: boolean }> = ({ output, error, loading }) => {
  if (!output && !loading) return null;
  return (
    <div className="mt-2 p-3 bg-[#0a0505] border-2 border-red-900/30 rounded-lg font-mono text-[10px] leading-tight shadow-inner animate-in fade-in slide-in-from-top-2 duration-300">
      <div className="flex items-center gap-2 mb-2 border-b border-red-900/20 pb-1">
        <div className="w-2 h-2 rounded-full bg-red-600 animate-pulse shadow-[0_0_8px_#dc2626]" />
        <span className="text-red-500 font-black tracking-widest uppercase">Execution_Output</span>
      </div>
      <div className={`whitespace-pre-wrap break-words ${error ? 'text-red-400' : 'text-green-400/80 font-bold'}`}>
        {loading ? (
          <span className="animate-pulse italic opacity-50">_INITIATING_COMPILER_INJECT...</span>
        ) : (
          output || "Done (no output)."
        )}
      </div>
    </div>
  );
};

export const CodeBlock: React.FC<{ className?: string; children?: React.ReactNode; settings?: AppSettings }> = ({ className, children, settings }) => {
  const [copied, setCopied] = useState(false);
  const [executing, setExecuting] = useState(false);
  const [output, setOutput] = useState<string | null>(null);
  const [hasError, setHasError] = useState(false);
  const codeRef = useRef<HTMLElement>(null);

  const language = className?.replace('language-', '') || 'code';
  const executableLanguages = ['python', 'javascript', 'js', 'bash', 'sh', 'typescript', 'ts', 'go', 'cpp', 'c', 'java', 'rust', 'ruby', 'php'];
  const canExecute = executableLanguages.includes(language.toLowerCase());

  const handleCopy = async () => {
    const code = codeRef.current?.textContent || '';
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const handleRun = async () => {
    if (!codeRef.current || executing) return;
    const code = codeRef.current.textContent || '';
    setExecuting(true);
    setHasError(false);
    setOutput(null);

    try {
      const result = await executeToolCall({
        id: crypto.randomUUID(),
        type: 'function',
        function: {
          name: 'CodeExecutor',
          arguments: JSON.stringify({ code, language })
        }
      });

      const textOutput = typeof result === 'string' ? result : JSON.stringify(result);
      setOutput(textOutput);
      if (textOutput.toLowerCase().includes('error') || textOutput.toLowerCase().includes('failed')) {
        setHasError(true);
      }
    } catch (err: any) {
      setHasError(true);
      setOutput(err.message || 'Execution bridge failure.');
    } finally {
      setExecuting(false);
    }
  };

  return (
    <div className="relative group my-3">
      <div className="flex items-center justify-between px-4 py-2 bg-zinc-900/90 border-b border-red-900/30 rounded-t-lg">
        <span className="text-[10px] uppercase font-black tracking-widest text-red-500/70">
          {language}
        </span>
        <div className="flex items-center gap-2">
          {canExecute && (
            <button
              onClick={handleRun}
              disabled={executing || !settings}
              className={`flex items-center gap-1.5 px-3 py-1 rounded text-[10px] uppercase font-black tracking-wider transition-all duration-300 ${executing
                ? 'bg-amber-600 text-black animate-pulse'
                : 'bg-zinc-800 text-amber-500 hover:bg-amber-600 hover:text-black hover:shadow-[0_0_15px_rgba(245,158,11,0.5)]'
                }`}
            >
              {executing ? 'EXECUTING...' : 'RUN'}
            </button>
          )}
          <button
            onClick={handleCopy}
            className={`flex items-center gap-1.5 px-3 py-1 rounded text-[10px] uppercase font-black tracking-wider transition-all duration-300 ${copied
              ? 'bg-green-600 text-black shadow-[0_0_15px_rgba(34,197,94,0.5)]'
              : 'bg-zinc-800 text-red-400 hover:bg-red-600 hover:text-black hover:shadow-[0_0_15px_rgba(220,38,38,0.5)]'
              }`}
          >
            {copied ? 'COPIED!' : 'COPY'}
          </button>
        </div>
      </div>
      <pre className="!mt-0 !rounded-t-none bg-black/80 border border-t-0 border-red-900/20 overflow-x-auto custom-scrollbar">
        <code ref={codeRef} className={className}>
          {children}
        </code>
      </pre>
      <ExecutionTerminal output={output || ''} error={hasError} loading={executing} />
    </div>
  );
};

export const InlineCode: React.FC<{ children?: React.ReactNode }> = ({ children }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    const code = String(children);
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  return (
    <code
      onClick={handleCopy}
      className={`px-1.5 py-0.5 rounded cursor-pointer transition-all duration-200 ${copied
        ? 'bg-green-600/30 text-green-400'
        : 'bg-red-900/30 text-red-300 hover:bg-red-700/40'
        }`}
      title="Click to copy"
    >
      {copied ? '✓ ' : ''}{children}
    </code>
  );
};

export default CodeBlock;
