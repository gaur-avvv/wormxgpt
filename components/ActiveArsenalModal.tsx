import React, { useState, useMemo } from 'react';
import { 
  Wrench, Sparkles, Search, Check, Server, Zap, Globe, Shield, 
  Database, MessageSquare, Cloud, Lock, Briefcase, DollarSign, 
  ExternalLink, Play, ChevronRight, X, Layers, Cpu, Terminal
} from 'lucide-react';
import { useWormGPT } from '../context/GlobalContext';
import { MCP_CATEGORIES, McpCategory } from '../services/mcpDirectory';
import { SelectableArsenalTool } from '../services/mcp/registry';

interface ActiveArsenalModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  all: <Layers className="w-3.5 h-3.5" />,
  zero_auth: <Sparkles className="w-3.5 h-3.5 text-amber-300" />,
  developer_docs: <Terminal className="w-3.5 h-3.5 text-indigo-400" />,
  search_crawlers: <Globe className="w-3.5 h-3.5 text-sky-400" />,
  databases: <Database className="w-3.5 h-3.5 text-emerald-400" />,
  social_comm: <MessageSquare className="w-3.5 h-3.5 text-purple-400" />,
  cloud_devops: <Cloud className="w-3.5 h-3.5 text-blue-400" />,
  security_osint: <Shield className="w-3.5 h-3.5 text-rose-400" />,
  productivity_office: <Briefcase className="w-3.5 h-3.5 text-amber-400" />,
  finance_commerce: <DollarSign className="w-3.5 h-3.5 text-teal-400" />,
  templates_registries: <Cpu className="w-3.5 h-3.5 text-pink-400" />,
};

export const ActiveArsenalModal: React.FC<ActiveArsenalModalProps> = ({ isOpen, onClose }) => {
  const { 
    arsenalTools, 
    activeArsenalToolIds, 
    toggleArsenalTool, 
    enableAllZeroAuthTools,
    executeArsenalTool 
  } = useWormGPT();

  const [selectedCategory, setSelectedCategory] = useState<McpCategory | 'all' | 'zero_auth'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [testTool, setTestTool] = useState<SelectableArsenalTool | null>(null);
  const [testArgs, setTestArgs] = useState('{\n  "query": "latest documentation"\n}');
  const [testRunning, setTestRunning] = useState(false);
  const [testOutput, setTestOutput] = useState<{ result: any; latencyMs: number } | null>(null);

  const filteredTools = useMemo(() => {
    return arsenalTools.filter(t => {
      if (selectedCategory === 'zero_auth' && !t.isZeroAuth) return false;
      if (selectedCategory !== 'all' && selectedCategory !== 'zero_auth' && t.category !== selectedCategory) return false;

      if (!searchQuery) return true;
      const q = searchQuery.toLowerCase();
      return (
        t.name.toLowerCase().includes(q) ||
        t.toolName.toLowerCase().includes(q) ||
        t.serverName.toLowerCase().includes(q) ||
        t.description.toLowerCase().includes(q) ||
        t.categoryLabel.toLowerCase().includes(q)
      );
    });
  }, [arsenalTools, selectedCategory, searchQuery]);

  const activeCount = activeArsenalToolIds.length;
  const zeroAuthCount = useMemo(() => arsenalTools.filter(t => t.isZeroAuth).length, [arsenalTools]);

  const handleRunTest = async (tool: SelectableArsenalTool) => {
    setTestRunning(true);
    setTestOutput(null);
    try {
      let parsedArgs = {};
      try {
        parsedArgs = JSON.parse(testArgs);
      } catch {
        parsedArgs = { query: testArgs };
      }
      const res = await executeArsenalTool(tool.id, parsedArgs);
      setTestOutput(res);
    } catch (e: any) {
      setTestOutput({
        result: { error: e.message || 'Execution error' },
        latencyMs: 50
      });
    } finally {
      setTestRunning(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div 
        className="w-full max-w-5xl h-[90vh] max-h-[850px] bg-[#0d1322] border border-slate-800 rounded-2xl shadow-2xl flex flex-col overflow-hidden text-slate-200 font-sans"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-[#0a0f1d] shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-center text-indigo-400 shadow-inner">
              <Wrench className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-slate-100 tracking-wide">
                  Active Arsenal — 100 Remote HTTPS MCP Server Catalog
                </h2>
                <span className="px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 font-mono text-[11px] font-semibold border border-indigo-500/30">
                  {activeCount} Armed
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Armed tools are automatically exposed to models for real-time live execution and reasoning
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={enableAllZeroAuthTools}
              className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-sm"
              title="Arm all public zero-auth MCP tools with 1 click"
            >
              <Zap className="w-3.5 h-3.5 text-amber-300" />
              <span>Arm All Zero-Auth ({zeroAuthCount})</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Toolbar: Search + Category Pills */}
        <div className="p-4 border-b border-slate-800/80 bg-[#0c1220] space-y-3 shrink-0">
          {/* Search Bar */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search across 100 remote MCP tools (e.g. DeepWiki, Parallel Search, Wolfram, GitHub, CVE, CoinGecko)..."
              className="w-full pl-10 pr-4 py-2 bg-slate-900/80 border border-slate-700/80 rounded-xl text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 font-mono"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-500 hover:text-slate-300"
              >
                Clear
              </button>
            )}
          </div>

          {/* Category Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto custom-scrollbar pb-1 text-xs font-medium">
            {MCP_CATEGORIES.map((cat) => {
              const isActive = selectedCategory === cat.id;
              const count = cat.id === 'all' 
                ? arsenalTools.length 
                : cat.id === 'zero_auth'
                ? zeroAuthCount
                : arsenalTools.filter(t => t.category === cat.id).length;

              return (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id as any)}
                  className={`px-3 py-1.5 rounded-lg border whitespace-nowrap flex items-center gap-1.5 transition-all text-xs ${
                    isActive
                      ? 'bg-indigo-600 border-indigo-500 text-white font-semibold shadow-sm'
                      : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                  }`}
                >
                  {CATEGORY_ICONS[cat.id] || <Wrench className="w-3 h-3" />}
                  <span>{cat.label}</span>
                  <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${isActive ? 'bg-indigo-700 text-white' : 'bg-slate-800 text-slate-400'}`}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 flex overflow-hidden">
          {/* Tool Cards Grid */}
          <div className="flex-1 p-4 overflow-y-auto custom-scrollbar space-y-2.5">
            <div className="flex items-center justify-between text-xs text-slate-400 px-1 pb-1">
              <span>Showing <strong className="text-slate-200">{filteredTools.length}</strong> available tools</span>
              <span>{activeCount} of {arsenalTools.length} armed</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {filteredTools.map((tool) => {
                const isArmed = activeArsenalToolIds.includes(tool.id) || activeArsenalToolIds.includes(tool.toolName);

                return (
                  <div
                    key={tool.id}
                    className={`p-3.5 rounded-xl border transition-all flex flex-col justify-between ${
                      isArmed
                        ? 'bg-indigo-950/20 border-indigo-500/60 shadow-md shadow-indigo-950/30'
                        : 'bg-slate-900/40 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div>
                      {/* Card Header */}
                      <div className="flex items-start justify-between gap-2 mb-1.5">
                        <div className="flex items-center gap-2 min-w-0">
                          <div className={`p-1.5 rounded-lg shrink-0 ${isArmed ? 'bg-indigo-500/20 text-indigo-300' : 'bg-slate-800 text-slate-400'}`}>
                            {tool.isZeroAuth ? <Sparkles className="w-3.5 h-3.5 text-emerald-400" /> : <Server className="w-3.5 h-3.5" />}
                          </div>
                          <div className="min-w-0">
                            <h4 className="text-xs font-bold text-slate-100 truncate" title={tool.name}>
                              {tool.name}
                            </h4>
                            <p className="text-[10px] text-slate-400 font-mono truncate">
                              {tool.serverName} • <span className="text-indigo-400">{tool.transport.toUpperCase()}</span>
                            </p>
                          </div>
                        </div>

                        {/* Arm Toggle Button */}
                        <button
                          onClick={() => toggleArsenalTool(tool.id)}
                          className={`px-3 py-1 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all shrink-0 ${
                            isArmed
                              ? 'bg-indigo-600 hover:bg-indigo-500 text-white'
                              : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700'
                          }`}
                        >
                          {isArmed ? (
                            <>
                              <Check className="w-3 h-3 text-emerald-300" />
                              <span>Armed</span>
                            </>
                          ) : (
                            <span>Arm Tool</span>
                          )}
                        </button>
                      </div>

                      {/* Description */}
                      <p className="text-xs text-slate-300 leading-relaxed line-clamp-2 mb-2">
                        {tool.description}
                      </p>
                    </div>

                    {/* Card Footer Badges */}
                    <div className="flex items-center justify-between pt-2 border-t border-slate-800/60 text-[10px] text-slate-400">
                      <div className="flex items-center gap-1.5">
                        {tool.isZeroAuth ? (
                          <span className="px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-300 font-semibold border border-emerald-500/30">
                            Zero-Auth
                          </span>
                        ) : (
                          <span className="px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-300 font-semibold border border-amber-500/30">
                            {tool.authType.toUpperCase()}
                          </span>
                        )}
                        <span className="text-slate-500">•</span>
                        <span>{tool.categoryLabel}</span>
                      </div>

                      <button
                        onClick={() => {
                          setTestTool(tool);
                          setTestOutput(null);
                        }}
                        className="text-indigo-400 hover:text-indigo-300 font-mono text-[11px] flex items-center gap-1 hover:underline"
                      >
                        <Play className="w-3 h-3" />
                        <span>Inspect & Test</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Test & Live Execution Panel (Right Drawer) */}
          {testTool && (
            <div className="w-96 border-l border-slate-800 bg-[#090d18] p-4 flex flex-col justify-between overflow-y-auto custom-scrollbar shrink-0">
              <div className="space-y-4">
                <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                  <div className="flex items-center gap-2">
                    <Terminal className="w-4 h-4 text-indigo-400" />
                    <h3 className="text-xs font-bold text-slate-100 font-mono">Live Tool Execution</h3>
                  </div>
                  <button
                    onClick={() => setTestTool(null)}
                    className="p-1 rounded text-slate-400 hover:text-slate-200"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Target Tool Info */}
                <div className="p-3 bg-slate-900/80 rounded-xl border border-slate-800 space-y-1">
                  <div className="text-xs font-bold text-slate-200">{testTool.name}</div>
                  <div className="text-[10px] text-slate-400 font-mono break-all">{testTool.url}</div>
                  <div className="text-xs text-slate-300 pt-1">{testTool.description}</div>
                </div>

                {/* Parameters Editor */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-semibold text-slate-400 font-mono">
                    Execution Arguments (JSON):
                  </label>
                  <textarea
                    value={testArgs}
                    onChange={(e) => setTestArgs(e.target.value)}
                    rows={4}
                    className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-lg font-mono text-xs text-indigo-300 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <button
                  onClick={() => handleRunTest(testTool)}
                  disabled={testRunning}
                  className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-lg font-semibold text-xs flex items-center justify-center gap-2 transition-colors shadow-sm"
                >
                  <Play className="w-3.5 h-3.5" />
                  <span>{testRunning ? 'Invoking Remote Tool...' : 'Execute Test Invocation'}</span>
                </button>

                {/* Execution Output Box */}
                {testOutput && (
                  <div className="space-y-1.5 animate-in fade-in duration-150">
                    <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono">
                      <span className="text-emerald-400 font-semibold flex items-center gap-1">
                        <Check className="w-3.5 h-3.5" /> Response Received
                      </span>
                      <span>{testOutput.latencyMs}ms</span>
                    </div>
                    <pre className="p-3 bg-slate-950 border border-slate-800 rounded-lg font-mono text-[11px] text-slate-200 overflow-x-auto max-h-56 custom-scrollbar whitespace-pre-wrap">
                      {typeof testOutput.result === 'string' 
                        ? testOutput.result 
                        : JSON.stringify(testOutput.result, null, 2)}
                    </pre>
                  </div>
                )}
              </div>

              <div className="pt-4 text-[10px] text-slate-500 font-mono border-t border-slate-800">
                Responses are returned directly into model context as tool execution tokens.
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-800 bg-[#0a0f1d] flex items-center justify-between text-xs text-slate-400 shrink-0 font-mono">
          <span>Active Arsenal: {activeCount} tools armed for model invocation</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-semibold transition-colors shadow-sm"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
