import React, { useEffect, useState, useRef, useMemo } from 'react';
import Prism from 'prismjs';
import 'prismjs/components/prism-python';
import 'prismjs/components/prism-bash';
import 'prismjs/components/prism-javascript';
import 'prismjs/components/prism-typescript';
import 'prismjs/components/prism-json';
import 'prismjs/components/prism-yaml';
import 'prismjs/components/prism-markdown';
import 'prismjs/components/prism-sql';
import 'prismjs/components/prism-css';
import { executeToolCall } from '../services/tools';
import { AppSettings } from '../types';

export const ExecutionTerminal: React.FC<{ output: string; error?: boolean; loading?: boolean }> = ({ output, error, loading }) => {
  if (!output && !loading) return null;
  return (
    <div className="mt-2 p-3 bg-[#070b12] border border-indigo-950/60 rounded-lg font-mono text-[11px] leading-relaxed shadow-inner">
      <div className="flex items-center gap-2 mb-2 border-b border-indigo-950/40 pb-1">
        <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_#10b981]" />
        <span className="text-indigo-400 font-semibold tracking-wider text-[10px] uppercase">Execution Output</span>
      </div>
      <div className={`whitespace-pre-wrap break-words ${error ? 'text-rose-400' : 'text-emerald-400 font-medium'}`}>
        {loading ? (
          <span className="animate-pulse text-indigo-300">Initiating execution runtime...</span>
        ) : (
          output || 'Execution completed with no return output.'
        )}
      </div>
    </div>
  );
};

interface CodeBlockProps {
  code?: string;
  language?: string;
  className?: string;
  children?: React.ReactNode;
  settings?: AppSettings;
  showLineNumbers?: boolean;
}

export const CodeBlock: React.FC<CodeBlockProps> = ({ 
  code: rawCodeProp, 
  language: langProp, 
  className, 
  children, 
  settings,
  showLineNumbers = true
}) => {
  const [copied, setCopied] = useState(false);
  const [executing, setExecuting] = useState(false);
  const [output, setOutput] = useState<string | null>(null);
  const [hasError, setHasError] = useState(false);
  const codeRef = useRef<HTMLElement>(null);

  // Extract raw code string
  const rawCode = useMemo(() => {
    if (typeof rawCodeProp === 'string') return rawCodeProp;
    if (typeof children === 'string') return children;
    if (Array.isArray(children)) return children.join('');
    return codeRef.current?.textContent || '';
  }, [rawCodeProp, children]);

  // Extract language
  const detectedLang = useMemo(() => {
    if (langProp) return langProp.toLowerCase();
    const classLang = className?.replace('language-', '').toLowerCase();
    if (classLang) return classLang;
    return 'bash';
  }, [langProp, className]);

  // Executable check
  const executableLanguages = ['python', 'javascript', 'js', 'bash', 'sh', 'typescript', 'ts', 'go', 'cpp', 'c', 'rust'];
  const canExecute = executableLanguages.includes(detectedLang);

  useEffect(() => {
    if (codeRef.current) {
      Prism.highlightElement(codeRef.current);
    }
  }, [rawCode, detectedLang]);

  const handleCopy = async () => {
    const textToCopy = rawCode || codeRef.current?.textContent || '';
    try {
      await navigator.clipboard.writeText(textToCopy);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy code:', err);
    }
  };

  const handleRun = async () => {
    const textToRun = rawCode || codeRef.current?.textContent || '';
    if (!textToRun || executing) return;
    setExecuting(true);
    setHasError(false);
    setOutput(null);

    try {
      const result = await executeToolCall({
        id: crypto.randomUUID(),
        type: 'function',
        function: {
          name: 'CodeExecutor',
          arguments: JSON.stringify({ code: textToRun, language: detectedLang })
        }
      });

      const textOutput = typeof result === 'string' ? result : JSON.stringify(result, null, 2);
      setOutput(textOutput);
      if (textOutput.toLowerCase().includes('error') || textOutput.toLowerCase().includes('failed')) {
        setHasError(true);
      }
    } catch (err: any) {
      setHasError(true);
      setOutput(err?.message || 'Execution failed.');
    } finally {
      setExecuting(false);
    }
  };

  const lines = useMemo(() => {
    const trimmed = rawCode.trimEnd();
    return trimmed.split('\n');
  }, [rawCode]);

  return (
    <div className="my-3 rounded-lg border border-indigo-950/60 bg-[#070b12] overflow-hidden shadow-2xl">
      {/* Quick-copy command banner */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-[#0d1322] border-b border-indigo-950/40 text-xs font-mono text-zinc-400">
        <span className="flex items-center gap-1.5 text-indigo-400 font-semibold tracking-wider text-[11px]">
          <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
          {detectedLang.toUpperCase()}
        </span>

        <div className="flex items-center gap-2">
          {canExecute && settings && (
            <button
              onClick={handleRun}
              disabled={executing}
              className={`px-2 py-0.5 rounded text-[11px] font-mono transition-colors ${
                executing
                  ? 'bg-amber-600/30 text-amber-300 animate-pulse'
                  : 'text-amber-400 hover:bg-amber-950/40 hover:text-amber-300'
              }`}
              title="Run code block"
            >
              {executing ? 'RUNNING...' : 'RUN'}
            </button>
          )}

          <button
            onClick={handleCopy}
            className="px-2 py-0.5 rounded text-[11px] font-mono transition-colors hover:bg-indigo-900/30 hover:text-indigo-200"
            title="Copy snippet"
          >
            {copied ? '✓ COPIED' : 'COPY'}
          </button>
        </div>
      </div>

      {/* Code Body with Line Numbers */}
      <div className="flex overflow-x-auto custom-scrollbar p-3 text-xs font-mono leading-relaxed selection:bg-indigo-900/50">
        {showLineNumbers && lines.length > 1 && (
          <div className="select-none pr-3 mr-3 border-r border-slate-800 text-slate-600 text-right min-w-[2.2rem] font-mono text-[11px] py-0.5">
            {lines.map((_, idx) => (
              <div key={idx}>{idx + 1}</div>
            ))}
          </div>
        )}

        <pre className="overflow-visible flex-1 m-0 p-0 bg-transparent">
          <code 
            ref={codeRef} 
            className={`language-${detectedLang} font-mono`}
          >
            {rawCode.trimEnd()}
          </code>
        </pre>
      </div>

      {/* Execution Terminal Output */}
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
      className={`px-1.5 py-0.5 rounded cursor-pointer font-mono text-[11px] transition-all duration-200 ${
        copied
          ? 'bg-emerald-600/30 text-emerald-300 border border-emerald-500/40'
          : 'bg-indigo-950/50 text-indigo-300 border border-indigo-800/40 hover:bg-indigo-900/40 hover:text-indigo-200'
      }`}
      title="Click to copy inline code"
    >
      {copied ? '✓ ' : ''}{children}
    </code>
  );
};

export default CodeBlock;
