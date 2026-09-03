import React, { useState, useMemo } from 'react';
import { Search, X, Zap, Eye, Cpu, Brain, Code, Sparkles, Check, Layers } from 'lucide-react';
import { useWormGPT } from '../context/GlobalContext';
import { providerRegistry, ModelCapability, ModelTag } from '../services/providers/registry';
import { MODEL_OPTIONS } from '../constants';

export const ModelSelectorModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  targetMode?: 'text' | 'vision';
}> = ({ isOpen, onClose, targetMode = 'text' }) => {
  const { settings, setSettings } = useWormGPT();
  const [activeTab, setActiveTab] = useState<'text' | 'vision'>(targetMode);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTag, setSelectedTag] = useState<ModelTag | 'all'>('all');
  const [selectedProvider, setSelectedProvider] = useState<string>('all');
  const [customModelId, setCustomModelId] = useState('');
  const [customProvider, setCustomProvider] = useState<string>(settings.aiProvider || 'openai');

  // Load all registered models from provider registry, with fallback to MODEL_OPTIONS
  const registryModels = useMemo(() => {
    const reg = providerRegistry.getAllModels();
    if (reg.length > 0) return reg;

    // Fallback if needed from constants
    return MODEL_OPTIONS.map(m => ({
      id: m.value,
      label: m.label,
      provider: m.provider || 'pollinations',
      providerName: String(m.provider || 'Pollinations'),
      contextWindow: m.contextWindow || 32000,
      tags: (m.capabilities || ['fast']) as ModelTag[],
      isFree: m.isFree,
      description: `${m.label} via ${m.provider}`
    }));
  }, []);

  const allProvidersList = useMemo(() => {
    const providers = providerRegistry.getAllProviders();
    return providers;
  }, []);

  const filteredModels = useMemo(() => {
    return registryModels.filter(m => {
      const matchesSearch =
        m.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
        m.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        m.providerName.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesTag = selectedTag === 'all' || m.tags.includes(selectedTag);
      const matchesProvider = selectedProvider === 'all' || m.provider === selectedProvider;

      // In vision tab, highlight or default filter to vision if not searching
      if (activeTab === 'vision' && selectedTag === 'all' && !searchQuery && selectedProvider === 'all') {
        return m.tags.includes('vision');
      }

      return matchesSearch && matchesTag && matchesProvider;
    });
  }, [registryModels, searchQuery, selectedTag, selectedProvider, activeTab]);

  if (!isOpen) return null;

  const currentTextModel = settings.model;
  const currentVisionModel = settings.visionModel || 'gemini-2.5-flash';

  const handleSelectModel = (modelId: string, provider: any) => {
    if (activeTab === 'text') {
      setSettings(prev => ({
        ...prev,
        model: modelId,
        aiProvider: provider,
      }));
    } else {
      setSettings(prev => ({
        ...prev,
        visionModel: modelId,
        visionProvider: provider,
      }));
    }
    onClose();
  };

  const getTagBadge = (tag: ModelTag) => {
    switch (tag) {
      case 'vision':
        return (
          <span key={tag} className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-violet-500/15 text-violet-300 border border-violet-500/30">
            <Eye className="w-2.5 h-2.5" /> [Vision]
          </span>
        );
      case 'fast':
        return (
          <span key={tag} className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
            <Zap className="w-2.5 h-2.5" /> [Fast]
          </span>
        );
      case 'long-context':
        return (
          <span key={tag} className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-sky-500/15 text-sky-300 border border-sky-500/30">
            <Layers className="w-2.5 h-2.5" /> [Long Context]
          </span>
        );
      case 'code':
        return (
          <span key={tag} className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-indigo-500/15 text-indigo-300 border border-indigo-500/30">
            <Code className="w-2.5 h-2.5" /> [Code]
          </span>
        );
      case 'reasoning':
        return (
          <span key={tag} className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-amber-500/15 text-amber-300 border border-amber-500/30">
            <Brain className="w-2.5 h-2.5" /> [Reasoning]
          </span>
        );
      case 'free':
        return (
          <span key={tag} className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-teal-500/15 text-teal-300 border border-teal-500/30">
            <Sparkles className="w-2.5 h-2.5" /> [Free]
          </span>
        );
    }
  };

  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-3xl bg-[#0d1322] border border-indigo-500/30 rounded-2xl shadow-2xl shadow-indigo-950/60 flex flex-col max-h-[88vh] overflow-hidden text-slate-100">
        {/* Header */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
              <Cpu className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-semibold text-lg text-slate-100">Dynamic Model Router & Harness</h2>
              <p className="text-xs text-slate-400">Configure independent primary text and vision execution models</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab switchers: Text Model vs Vision Model */}
        <div className="px-5 pt-4 flex gap-3">
          <button
            onClick={() => setActiveTab('text')}
            className={`flex-1 py-2.5 px-4 rounded-xl border text-xs font-semibold flex items-center justify-center gap-2 transition-all ${
              activeTab === 'text'
                ? 'bg-indigo-600/20 border-indigo-500 text-indigo-200 shadow-md shadow-indigo-950/40'
                : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:text-slate-200'
            }`}
          >
            <Cpu className="w-4 h-4" />
            <span>Primary Text Model</span>
            <span className="ml-1 px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 text-[10px]">
              {settings.model}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('vision')}
            className={`flex-1 py-2.5 px-4 rounded-xl border text-xs font-semibold flex items-center justify-center gap-2 transition-all ${
              activeTab === 'vision'
                ? 'bg-violet-600/20 border-violet-500 text-violet-200 shadow-md shadow-violet-950/40'
                : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:text-slate-200'
            }`}
          >
            <Eye className="w-4 h-4" />
            <span>Dedicated Vision Model</span>
            <span className="ml-1 px-2 py-0.5 rounded-full bg-violet-500/20 text-violet-300 text-[10px]">
              {currentVisionModel}
            </span>
          </button>
        </div>

        {/* Search & Tag filter */}
        <div className="p-5 flex flex-col gap-3 border-b border-slate-800/80">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search by model name, provider, or capability..."
              className="w-full pl-10 pr-4 py-2.5 bg-slate-900/80 border border-slate-800 rounded-xl text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
            />
          </div>

          <div className="flex flex-wrap gap-2 items-center justify-between">
            <div className="flex flex-wrap gap-1.5 items-center">
              <span className="text-[11px] text-slate-400 mr-1">Filter Tags:</span>
              {(['all', 'vision', 'fast', 'long-context', 'code', 'reasoning', 'free'] as const).map(tag => (
                <button
                  key={tag}
                  onClick={() => setSelectedTag(tag)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-medium border transition-all ${
                    selectedTag === tag
                      ? 'bg-indigo-600 text-white border-indigo-500 shadow-sm'
                      : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                  }`}
                >
                  {tag === 'all' ? 'All Tags' : `[${tag.charAt(0).toUpperCase() + tag.slice(1)}]`}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              <span className="text-[11px] text-slate-400 font-mono">Provider:</span>
              <select
                value={selectedProvider}
                onChange={e => setSelectedProvider(e.target.value)}
                className="bg-slate-900/90 border border-slate-700 text-slate-200 text-xs rounded-lg px-2.5 py-1 font-mono focus:outline-none focus:border-indigo-500"
              >
                <option value="all">All Providers ({allProvidersList.length})</option>
                {allProvidersList.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Custom Model Input Row */}
          <div className="pt-2 border-t border-slate-800/80 flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
            <div className="flex items-center gap-1.5 shrink-0">
              <span className="text-[11px] font-mono text-indigo-300 font-semibold flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5 text-indigo-400" /> Custom Model:
              </span>
              <select
                value={customProvider}
                onChange={e => setCustomProvider(e.target.value)}
                className="bg-slate-900 border border-slate-700 text-slate-200 text-xs rounded-lg px-2 py-1.5 font-mono focus:outline-none focus:border-indigo-500"
              >
                {providerRegistry.getAllProviders().map(p => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.id})
                  </option>
                ))}
              </select>
            </div>

            <div className="flex-1 flex items-center gap-2">
              <input
                type="text"
                value={customModelId}
                onChange={e => setCustomModelId(e.target.value)}
                placeholder="Type custom model (e.g. claude-3.7-sonnet, deepseek-r1-distill-llama-70b)..."
                className="flex-1 px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs font-mono text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                onKeyDown={e => {
                  if (e.key === 'Enter' && customModelId.trim()) {
                    handleSelectModel(customModelId.trim(), customProvider);
                  }
                }}
              />
              <button
                type="button"
                onClick={() => {
                  if (customModelId.trim()) {
                    handleSelectModel(customModelId.trim(), customProvider);
                  }
                }}
                disabled={!customModelId.trim()}
                className="px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 disabled:text-slate-600 text-white text-xs font-medium transition-colors shrink-0 flex items-center gap-1"
              >
                <Check className="w-3.5 h-3.5" />
                Apply
              </button>
            </div>
          </div>
        </div>

        {/* Models list */}
        <div className="flex-1 overflow-y-auto p-5 space-y-2.5 custom-scrollbar">
          {filteredModels.length === 0 ? (
            <div className="text-center py-12 text-slate-500 text-xs">
              No models match current query and capability filters.
            </div>
          ) : (
            filteredModels.map(m => {
              const isSelected = activeTab === 'text'
                ? settings.model === m.id
                : currentVisionModel === m.id;

              return (
                <div
                  key={`${m.provider}-${m.id}`}
                  onClick={() => handleSelectModel(m.id, m.provider)}
                  className={`group p-3.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-4 ${
                    isSelected
                      ? activeTab === 'text'
                        ? 'bg-indigo-600/15 border-indigo-500/70 shadow-md shadow-indigo-950/30'
                        : 'bg-violet-600/15 border-violet-500/70 shadow-md shadow-violet-950/30'
                      : 'bg-slate-900/40 border-slate-800/80 hover:border-indigo-500/40 hover:bg-slate-900/70'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`p-2 rounded-lg shrink-0 ${isSelected ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-400 group-hover:text-indigo-400'}`}>
                      {m.tags.includes('vision') ? <Eye className="w-4 h-4" /> : <Cpu className="w-4 h-4" />}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-xs text-slate-100">{m.label}</span>
                        <span className="text-[10px] text-slate-400 font-mono px-1.5 py-0.5 rounded bg-slate-800/80">
                          {m.providerName}
                        </span>
                        {m.contextWindow && (
                          <span className="text-[10px] text-slate-400">
                            {(m.contextWindow / 1000).toFixed(0)}k context
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-400 truncate mt-0.5">
                        {m.description || m.id}
                      </p>
                      <div className="flex flex-wrap gap-1 mt-1.5">
                        {m.tags.map(t => getTagBadge(t))}
                      </div>
                    </div>
                  </div>

                  <div className="shrink-0 flex items-center">
                    {isSelected ? (
                      <div className="flex items-center gap-1.5 text-xs font-semibold text-indigo-400">
                        <Check className="w-4 h-4" />
                        <span>Active</span>
                      </div>
                    ) : (
                      <button className="px-3 py-1.5 rounded-lg text-xs font-medium text-slate-400 bg-slate-800/50 group-hover:bg-indigo-600 group-hover:text-white transition-all">
                        Select
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer info */}
        <div className="p-4 border-t border-slate-800/80 bg-slate-950/40 flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span>Multi-Model Orchestrator Active: Image queries route automatically to Vision Model</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
