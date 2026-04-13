import React, { useState, useEffect, useMemo } from 'react';
import { AppSettings } from '../../types';
import { useWormGPT } from '../../context/GlobalContext';
import { 
  geminiService, groqService, anthropicService, openaiService,
  deepseekService, mistralService, xaiService, perplexityService,
  togetherService, openrouterService, cerebrasService, siliconflowService,
  moonshotService, ollamaService, pollinationsService, tinyfishService,
  mcpService, integrationRegistry, promptCacheService, a2aService, supabaseAuth
} from '../../services';
import { ATTACHED_TOOLS, TOOL_CATEGORIES, APP_INTEGRATIONS } from '../../services';
import { DEFAULT_SYSTEM_INSTRUCTION, MODEL_OPTIONS } from '../../constants';

type SettingsTab = 'system' | 'security' | 'connection' | 'apps' | 'tools';

export const SettingsModal: React.FC<{ 
  initialTab?: SettingsTab; 
}> = ({ initialTab }) => {
  const { isSettingsOpen, setIsSettingsOpen, settings, setSettings } = useWormGPT();
  const [activeTab, setActiveTab] = useState<SettingsTab>(initialTab || 'system');
  const [verificationStatuses, setVerificationStatuses] = useState<Record<string, 'idle' | 'verifying' | 'valid' | 'invalid'>>({});
  
  useEffect(() => {
    if (isSettingsOpen) setActiveTab(initialTab || 'system');
  }, [isSettingsOpen, initialTab]);

  const providers: { key: keyof AppSettings; label: string }[] = [
    { key: 'geminiApiKey', label: 'Google_Gemini' },
    { key: 'groqApiKey', label: 'Groq_Cloud' },
    { key: 'openaiApiKey', label: 'OpenAI_Elite' },
    { key: 'anthropicApiKey', label: 'Anthropic_Claude' },
    { key: 'deepseekApiKey', label: 'DeepSeek_V3' },
    { key: 'mistralApiKey', label: 'Mistral_Large' },
    { key: 'xaiApiKey', label: 'xAI_Grok' },
    { key: 'openRouterApiKey', label: 'OpenRouter_Omni' },
    { key: 'togetherApiKey', label: 'Together_AI' },
    { key: 'cerebrasApiKey', label: 'Cerebras_CS3' },
    { key: 'siliconFlowApiKey', label: 'SiliconFlow' },
    { key: 'perplexityApiKey', label: 'Perplexity_Labs' },
    { key: 'pollinationsApiKey', label: 'Pollinations_Gen' },
    { key: 'moonshotApiKey', label: 'Moonshot_Kimi' },
    { key: 'ollamaApiKey', label: 'Ollama_Cloud' },
    { key: 'wisGateApiKey', label: 'WisGate_AI' },
    { key: 'cohereApiKey', label: 'Cohere' },
    { key: 'witAiServerToken', label: 'WitAI_Server_Token' },
    { key: 'tavilyApiKey', label: 'Tavily_Search' },
    { key: 'braveApiKey', label: 'Brave_Search' },
    { key: 'kagiApiKey', label: 'Kagi_Search' },
    { key: 'mojeekApiKey', label: 'Mojeek_Search' },
    { key: 'serperApiKey', label: 'Serper_Search' },
    { key: 'serpapiApiKey', label: 'SerpAPI_Search' },
    { key: 'firecrawlApiKey', label: 'Firecrawl' },
    { key: 'tinyfishApiKey', label: 'TinyFish_WebAgent' },
    { key: 'nvidiaApiKey', label: 'NVIDIA_NIM' },
    { key: 'fireworksApiKey', label: 'Fireworks_AI' },
    { key: 'sambanovaApiKey', label: 'SambaNova' },
    { key: 'hyperbolicApiKey', label: 'Hyperbolic' },
    { key: 'huggingfaceApiKey', label: 'HuggingFace' },
    { key: 'deepinfraApiKey', label: 'DeepInfra' },
    { key: 'novitaApiKey', label: 'Novita_AI' },
    { key: 'featherlessApiKey', label: 'Featherless_AI' },
    { key: 'lambdaaiApiKey', label: 'Lambda_AI' },
    { key: 'nebiusApiKey', label: 'Nebius_Studio' },
  ];

  const providerOptions = useMemo(
    () => Array.from(new Set(MODEL_OPTIONS.map(m => m.provider))),
    []
  );
  const currentModelOption = MODEL_OPTIONS.find(m => m.value === settings.model);
  const effectiveProvider = (settings.aiProvider || currentModelOption?.provider || providerOptions[0]) as any;
  const modelsForProvider = MODEL_OPTIONS.filter(m => m.provider === effectiveProvider);
  const selectedModelValue = modelsForProvider.some(m => m.value === settings.model)
    ? settings.model
    : (modelsForProvider[0]?.value || '');

  useEffect(() => {
    const nextProvider = (settings.aiProvider || currentModelOption?.provider || providerOptions[0]) as any;
    const safeModelsForProvider = MODEL_OPTIONS.filter(m => m.provider === nextProvider);
    const firstModelValue = safeModelsForProvider[0]?.value;
    if (!firstModelValue) return;

    const isModelValid = safeModelsForProvider.some(m => m.value === settings.model);
    const needsProviderUpdate = !!settings.aiProvider && settings.aiProvider !== nextProvider;
    const needsModelUpdate = !isModelValid || !settings.model;

    if (needsProviderUpdate || needsModelUpdate) {
      setSettings(prev => ({
        ...prev,
        aiProvider: nextProvider,
        model: isModelValid ? prev.model : firstModelValue
      }));
    }
  }, [settings.aiProvider, settings.model, setSettings, providerOptions, currentModelOption]);

  useEffect(() => {
    const verifyKey = async (providerKey: keyof AppSettings) => {
      const key = (settings as any)?.[providerKey] || '';
      if (!key) {
        setVerificationStatuses(prev => ({ ...prev, [providerKey]: 'idle' }));
        return;
      }
      setVerificationStatuses(prev => ({ ...prev, [providerKey]: 'verifying' }));
      let isValid = false;
      try {
        const keyStr = String(providerKey).toLowerCase();
        if (keyStr.includes('gemini')) isValid = await geminiService.verifyApiKey(key);
        else if (keyStr.includes('groq')) isValid = await groqService.verifyApiKey(key);
        else if (keyStr.includes('anthropic')) isValid = await anthropicService.verifyApiKey(key);
        else if (keyStr.includes('openai')) isValid = await openaiService.verifyApiKey(key);
        else if (keyStr.includes('deepseek')) isValid = await deepseekService.verifyApiKey(key);
        else if (keyStr.includes('mistral')) isValid = await mistralService.verifyApiKey(key);
        else if (keyStr.includes('xai')) isValid = await xaiService.verifyApiKey(key);
        else if (keyStr.includes('perplexity')) isValid = await perplexityService.verifyApiKey(key);
        else if (keyStr.includes('together')) isValid = await togetherService.verifyApiKey(key);
        else if (keyStr.includes('openrouter')) isValid = await openrouterService.verifyApiKey(key);
        else if (keyStr.includes('cerebras')) isValid = await cerebrasService.verifyApiKey(key);
        else if (keyStr.includes('siliconflow')) isValid = await siliconflowService.verifyApiKey(key);
        else if (keyStr.includes('moonshot')) isValid = await moonshotService.verifyApiKey(key);
        else if (keyStr.includes('ollama')) isValid = await ollamaService.verifyApiKey(key);
        else if (keyStr.includes('pollinations')) isValid = await pollinationsService.verifyApiKey(key);
        else if (keyStr.includes('tinyfish')) isValid = await tinyfishService.verifyApiKey(key);
        else isValid = true;
      } catch (e) { isValid = false; }
      setVerificationStatuses(prev => ({ ...prev, [providerKey]: isValid ? 'valid' : 'invalid' }));
    };

    const timeoutId = setTimeout(() => {
      providers.forEach(p => {
        const currentKey = (settings as any)?.[p.key] || '';
        const currentStatus = verificationStatuses[p.key] || 'idle';
        if (currentKey && currentStatus === 'idle') {
          verifyKey(p.key);
        }
      });
    }, 800);

    return () => clearTimeout(timeoutId);
  }, [settings, providers, verificationStatuses]);

  if (!isSettingsOpen) return null;

  return (
    <div className="fixed inset-0 z-[1001] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/90 backdrop-blur-xl" onClick={() => setIsSettingsOpen(false)} />
      <div className="relative w-full max-w-2xl bg-[#0a0505] border-2 border-[#F120F0]/40 rounded-2xl shadow-[0_0_50px_rgba(241,32,240,0.3)] overflow-hidden animate-slideUp">
        {/* Header */}
        <div className="p-6 border-b border-[#F120F0]/30 bg-[#F120F0]/10 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-2 h-2 rounded-full bg-[#F120F0] animate-pulse shadow-[0_0_10px_#F120F0]" />
            <h2 className="text-xl font-black uppercase tracking-[0.3em] text-[#F120F0]">System_Override_Center</h2>
          </div>
          <button onClick={() => setIsSettingsOpen(false)} className="p-2 text-[#F120F0]/50 hover:text-[#F120F0] transition-colors">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M6 18L18 6M6 6l12 12" strokeWidth={2.5} /></svg>
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-[#F120F0]/20 px-4 gap-4 bg-black/40 overflow-x-auto custom-scrollbar">
          {[
            { id: 'system', label: 'SYSTEM_PARAM' },
            { id: 'security', label: 'SECURITY_VAULT' },
            { id: 'tools', label: 'AGENT_TOOLS' },
            { id: 'connection', label: 'NET_INTERFACE' },
            { id: 'apps', label: 'APP_CONNECT' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-4 py-3 text-[10px] font-black uppercase tracking-widest transition-all duration-300 border-b-2 ${activeTab === tab.id ? 'border-[#F120F0] text-[#F120F0] bg-[#F120F0]/10' : 'border-transparent text-zinc-600 hover:text-[#F120F0]/50'}`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="p-6 max-h-[60vh] overflow-y-auto custom-scrollbar bg-gradient-to-b from-black to-[#050000]">
          {activeTab === 'system' && (
            <div className="space-y-6">
              
              {/* Provider & Model Selection inside System Params */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 bg-black/60 p-4 border border-[#F120F0]/30 rounded-lg">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-[#F120F0]/80">AI Provider</label>
                  <select
                    value={effectiveProvider}
                    onChange={(e) => setSettings(prev => {
                      const newProvider = e.target.value as any;
                      const newModels = MODEL_OPTIONS.filter(m => m.provider === newProvider);
                      return { ...prev, aiProvider: newProvider, model: newModels[0]?.value || prev.model };
                    })}
                    className="w-full bg-black/80 border-2 border-[#F120F0]/50 rounded-lg px-3 py-2 text-[11px] text-[#F120F0] outline-none focus:border-[#F120F0] focus:shadow-[0_0_12px_rgba(241,32,240,0.4)] font-bold uppercase tracking-wider transition-all"
                  >
                    {providerOptions.map(p => (
                      <option key={p} value={p} className="bg-black">{p}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-[#F120F0]/80">Active Model</label>
                  <select
                    value={selectedModelValue}
                    onChange={(e) => setSettings(prev => ({ ...prev, model: e.target.value }))}
                    className="w-full bg-black/80 border-2 border-[#F120F0]/50 rounded-lg px-3 py-2 text-[11px] text-[#F120F0] outline-none focus:border-[#F120F0] focus:shadow-[0_0_12px_rgba(241,32,240,0.4)] font-bold transition-all"
                  >
                    {modelsForProvider.map(m => (
                      <option key={m.value} value={m.value} className="bg-black">{m.label || m.value}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Param Presets */}
              <div className="grid grid-cols-4 gap-2 mb-4">
                {[
                  { label: 'PRECISE', color: '#60a5fa', values: { temperature: 0.2, topP: 0.3, presencePenalty: 0, frequencyPenalty: 0 } },
                  { label: 'BALANCED', color: '#4ade80', values: { temperature: 0.7, topP: 0.9, presencePenalty: 0.1, frequencyPenalty: 0.1 } },
                  { label: 'CREATIVE', color: '#F120F0', values: { temperature: 1.0, topP: 0.95, presencePenalty: 0.3, frequencyPenalty: 0.2 } },
                  { label: 'CHAOTIC', color: '#f97316', values: { temperature: 1.3, topP: 1.0, presencePenalty: 0.5, frequencyPenalty: 0.5 } },
                ].map(preset => (
                  <button
                    key={preset.label}
                    onClick={() => setSettings(prev => ({ ...prev, ...preset.values }))}
                    className="py-1.5 text-[8px] sm:text-[10px] font-black uppercase tracking-wider rounded border-2 transition-all hover:scale-105 hover:shadow-[0_0_10px_rgba(255,255,255,0.2)] active:scale-95"
                    style={{ borderColor: preset.color + '80', color: preset.color, background: preset.color + '15' }}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="space-y-1">
                  <div className="flex justify-between"><label className="text-[10px] font-black uppercase tracking-widest text-[#F120F0]">Temperature</label><span className="text-[10px] text-[#F120F0] font-mono">{((settings as any)?.temperature || 0.87).toFixed(1)}</span></div>
                  <input type="range" min="0" max="2" step="0.1" value={(settings as any)?.temperature || 0.87} onChange={(e) => setSettings(prev => ({ ...prev, temperature: parseFloat(e.target.value) }))} className="w-full accent-[#F120F0] bg-zinc-900 h-1 rounded-full appearance-none" />
                </div>
                <div className="space-y-1">
                  <div className="flex justify-between"><label className="text-[10px] font-black uppercase tracking-widest text-[#F120F0]">Top_P</label><span className="text-[10px] text-[#F120F0] font-mono">{((settings as any)?.topP || 1.0).toFixed(2)}</span></div>
                  <input type="range" min="0" max="1" step="0.05" value={(settings as any)?.topP || 1.0} onChange={(e) => setSettings(prev => ({ ...prev, topP: parseFloat(e.target.value) }))} className="w-full accent-[#F120F0] bg-zinc-900 h-1 rounded-full appearance-none" />
                </div>
                <div className="space-y-1">
                  <div className="flex justify-between"><label className="text-[10px] font-black uppercase tracking-widest text-[#F120F0]">Max Tokens</label><span className="text-[10px] text-[#F120F0] font-mono">{(settings as any)?.maxTokens || 4000}</span></div>
                  <input type="range" min="100" max="8192" step="100" value={(settings as any)?.maxTokens || 4000} onChange={(e) => setSettings(prev => ({ ...prev, maxTokens: parseInt(e.target.value) }))} className="w-full accent-[#F120F0] bg-zinc-900 h-1 rounded-full appearance-none" />
                </div>
                <div className="space-y-1">
                  <div className="flex justify-between"><label className="text-[10px] font-black uppercase tracking-widest text-[#F120F0]">Presence</label><span className="text-[10px] text-[#F120F0] font-mono">{((settings as any)?.presencePenalty || 0.0).toFixed(1)}</span></div>
                  <input type="range" min="0" max="2" step="0.1" value={(settings as any)?.presencePenalty || 0.0} onChange={(e) => setSettings(prev => ({ ...prev, presencePenalty: parseFloat(e.target.value) }))} className="w-full accent-[#F120F0] bg-zinc-900 h-1 rounded-full appearance-none" />
                </div>
                <div className="space-y-1">
                  <div className="flex justify-between"><label className="text-[10px] font-black uppercase tracking-widest text-[#F120F0]">Frequency</label><span className="text-[10px] text-[#F120F0] font-mono">{((settings as any)?.frequencyPenalty || 0.0).toFixed(1)}</span></div>
                  <input type="range" min="0" max="2" step="0.1" value={(settings as any)?.frequencyPenalty || 0.0} onChange={(e) => setSettings(prev => ({ ...prev, frequencyPenalty: parseFloat(e.target.value) }))} className="w-full accent-[#F120F0] bg-zinc-900 h-1 rounded-full appearance-none" />
                </div>
              </div>

              <div className="space-y-4 pt-4 border-t border-[#F120F0]/20">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] font-black uppercase tracking-widest text-[#F120F0]">Core Directive</label>
                  <button onClick={() => setSettings(prev => ({ ...prev, customPromptPrefix: DEFAULT_SYSTEM_INSTRUCTION }))} className="text-[9px] font-black uppercase text-[#F120F0]/50 hover:text-[#F120F0] px-2 py-0.5 border border-[#F120F0]/30 rounded hover:bg-[#F120F0]/20 transition-all">Load Default</button>
                </div>
                <textarea value={(settings as any)?.customPromptPrefix || ''} onChange={(e) => setSettings(prev => ({ ...prev, customPromptPrefix: e.target.value }))} rows={3} placeholder="Inject directive before each message..." className="w-full bg-zinc-950 border border-[#F120F0]/30 rounded-lg p-3 text-xs text-[#F120F0] outline-none focus:border-[#F120F0] font-mono custom-scrollbar" />
                
                <div className="flex gap-2">
                  <button onClick={() => setSettings(prev => ({ ...prev, promptInjectionEnabled: !prev.promptInjectionEnabled }))} className={`flex-1 py-1.5 text-[9px] font-black uppercase border-2 rounded transition-all ${(settings as any)?.promptInjectionEnabled ? 'bg-[#F120F0]/20 border-[#F120F0] text-[#F120F0]' : 'border-[#F120F0]/30 text-[#F120F0]/50'}`}>Prompt Injection: ${(settings as any)?.promptInjectionEnabled ? 'ON' : 'OFF'}</button>
                  <select value={(settings as any)?.promptInjectionMode || 'always'} onChange={(e) => setSettings(prev => ({ ...prev, promptInjectionMode: e.target.value as any }))} disabled={!(settings as any)?.promptInjectionEnabled} className="flex-1 bg-black/80 border-2 border-[#F120F0]/40 rounded px-2 text-[9px] text-[#F120F0] outline-none font-bold uppercase">
                    <option value="always" className="bg-black">Always</option>
                    <option value="once" className="bg-black">Once</option>
                    <option value="manual" className="bg-black">Manual</option>
                  </select>
                </div>
              </div>

              {/* Token Opt & Prompt Cache */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-4 border-t border-[#F120F0]/20">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] font-black uppercase tracking-widest text-[#F120F0]">Token Opt</label>
                    <button onClick={() => setSettings(prev => ({ ...prev, useTokenOptimization: !prev.useTokenOptimization }))} className={`text-[9px] font-black uppercase px-2 py-0.5 border rounded transition-all ${(settings as any)?.useTokenOptimization ? 'bg-[#F120F0]/20 border-[#F120F0] text-[#F120F0]' : 'border-[#F120F0]/30 text-[#F120F0]/50'}`}>{(settings as any)?.useTokenOptimization ? 'ON' : 'OFF'}</button>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between"><label className="text-[9px] font-black uppercase text-[#F120F0]/80">Max Context</label><span className="text-[9px] text-[#F120F0] font-mono">{((settings as any)?.maxContextTokens || 8192) / 1024}K</span></div>
                    <input type="range" min="1024" max="32768" step="1024" value={(settings as any)?.maxContextTokens || 8192} onChange={(e) => setSettings(prev => ({ ...prev, maxContextTokens: parseInt(e.target.value) }))} className="w-full accent-[#F120F0] bg-zinc-900 h-1 rounded-full appearance-none" disabled={!(settings as any)?.useTokenOptimization} />
                    <div className="flex justify-between mt-2"><label className="text-[9px] font-black uppercase text-[#F120F0]/80">Compress At</label><span className="text-[9px] text-[#F120F0] font-mono">{(settings as any)?.compressionThreshold || 75}%</span></div>
                    <input type="range" min="50" max="95" step="5" value={(settings as any)?.compressionThreshold || 75} onChange={(e) => setSettings(prev => ({ ...prev, compressionThreshold: parseInt(e.target.value) }))} className="w-full accent-[#F120F0] bg-zinc-900 h-1 rounded-full appearance-none" disabled={!(settings as any)?.useTokenOptimization} />
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] font-black uppercase tracking-widest text-[#F120F0]">Prompt Cache</label>
                    <button onClick={() => { const next = !(settings as any)?.promptCachingEnabled; setSettings(prev => ({ ...prev, promptCachingEnabled: next })); promptCacheService.enabled = next; }} className={`text-[9px] font-black uppercase px-2 py-0.5 border rounded transition-all ${(settings as any)?.promptCachingEnabled ? 'bg-[#F120F0]/20 border-[#F120F0] text-[#F120F0]' : 'border-[#F120F0]/30 text-[#F120F0]/50'}`}>{(settings as any)?.promptCachingEnabled ? 'ON' : 'OFF'}</button>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between"><label className="text-[9px] font-black uppercase text-[#F120F0]/80">Cache TTL</label><span className="text-[9px] text-[#F120F0] font-mono">{Math.round(((settings as any)?.promptCacheTTL || 3600) / 60)}m</span></div>
                    <input type="range" min="300" max="86400" step="300" value={(settings as any)?.promptCacheTTL || 3600} onChange={(e) => { const val = parseInt(e.target.value); setSettings(prev => ({ ...prev, promptCacheTTL: val })); promptCacheService.ttl = val; }} className="w-full accent-[#F120F0] bg-zinc-900 h-1 rounded-full appearance-none" disabled={!(settings as any)?.promptCachingEnabled} />
                  </div>
                </div>
              </div>

               {/* A2A Protocol */}
               <div className="pt-4 border-t border-[#F120F0]/20 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-[#F120F0] block">A2A Protocol (Agent-to-Agent)</label>
                    <span className="text-[8px] text-[#F120F0]/40 font-mono">Protocol v0.3.0</span>
                  </div>
                  <button onClick={() => { const next = !(settings as any)?.a2aEnabled; setSettings(prev => ({ ...prev, a2aEnabled: next })); a2aService.enabled = next; }} className={`text-[9px] font-black uppercase px-2 py-0.5 border rounded transition-all ${(settings as any)?.a2aEnabled ? 'bg-[#F120F0]/20 border-[#F120F0] text-[#F120F0]' : 'border-[#F120F0]/30 text-[#F120F0]/50'}`}>{(settings as any)?.a2aEnabled ? 'ON' : 'OFF'}</button>
                </div>
                {(settings as any)?.a2aEnabled && (
                  <div className="space-y-2 bg-black/40 p-3 rounded border border-[#F120F0]/20">
                    <textarea value={((settings as any)?.a2aAgentUrls || []).join('\n')} onChange={(e) => { const urls = e.target.value.split('\n').filter((u: string) => u.trim()); setSettings(prev => ({ ...prev, a2aAgentUrls: urls })); }} rows={2} placeholder="https://agent.example.com" className="w-full bg-black/80 border-2 border-[#F120F0]/40 rounded px-2 py-1.5 text-[10px] text-[#F120F0] outline-none focus:border-[#F120F0] transition-all font-bold resize-none" style={{ scrollbarWidth: 'none' }} />
                    <button onClick={async () => { const urls = (settings as any)?.a2aAgentUrls || []; for (const url of urls) { if (url.trim()) await a2aService.discoverAgent(url.trim()); } }} className="w-full py-1.5 text-[9px] font-black uppercase text-[#F120F0] border-2 border-[#F120F0]/40 rounded hover:bg-[#F120F0]/20 hover:border-[#F120F0] transition-all">Discover Agents</button>
                    {a2aService.listAgents().length > 0 && (
                      <div className="space-y-1 mt-2">
                        {a2aService.listAgents().map(agent => (
                          <div key={agent.url} className="flex items-center justify-between bg-black/40 rounded px-2 py-1.5 border border-[#F120F0]/10">
                            <span className="text-[8px] text-[#F120F0] font-mono truncate flex-1">{agent.name}</span>
                            <span className={`text-[7px] font-black uppercase ml-2 px-1 rounded bg-black/80 ${agent.status === 'connected' ? 'text-green-400' : agent.status === 'error' ? 'text-red-400' : 'text-yellow-400'}`}>{agent.status}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'security' && (
            <div className="space-y-4">
              {providers.map((p) => {
                const status = verificationStatuses[p.key] || 'idle';
                const hasKeyVal = !!((settings as any)?.[p.key]);
                const borderColor = status === 'valid' ? 'border-green-500' : status === 'invalid' ? 'border-red-500' : status === 'verifying' ? 'border-yellow-500' : 'border-[#F120F0]/30';
                const bgColor = status === 'valid' ? 'bg-green-900/10' : status === 'invalid' ? 'bg-red-900/10' : 'bg-black/60';
                const textColor = status === 'valid' ? 'text-green-300' : status === 'invalid' ? 'text-red-300' : 'text-[#F120F0]';
                
                return (
                  <div key={String(p.key)} className="relative group">
                    <input 
                      type="password" 
                      value={(settings as any)?.[p.key] || ''}
                      onChange={(e) => { 
                        setSettings(prev => ({ ...prev, [p.key]: e.target.value })); 
                        setVerificationStatuses(prev => ({ ...prev, [p.key]: 'idle' })); 
                      }}
                      placeholder={p.label}
                      className={`${bgColor} border-2 ${borderColor} rounded-lg px-4 py-3 text-xs md:text-sm ${textColor} outline-none transition-all font-bold w-full focus:border-[#F120F0] focus:shadow-[0_0_15px_rgba(241,32,240,0.3)] placeholder-[#F120F0]/30`}
                    />
                    {hasKeyVal && (
                      <div className={`absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-black uppercase px-2 py-1 rounded transition-all ${status === 'valid' ? 'bg-green-600/20 text-green-400' : status === 'invalid' ? 'bg-red-600/20 text-red-400' : status === 'verifying' ? 'bg-yellow-600/20 text-yellow-400 animate-pulse' : 'bg-[#F120F0]/10 text-[#F120F0]/80'}`}>
                        {status === 'valid' ? 'VERIFIED' : status === 'invalid' ? 'INVALID' : status === 'verifying' ? 'VERIFYING...' : 'STORED'}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {activeTab === 'connection' && (
            <div className="space-y-6">
              {/* Master toggle */}
              <button 
                onClick={() => setSettings(prev => ({ ...prev, mcpEnabled: !prev.mcpEnabled }))}
                className={`w-full py-4 rounded-lg text-sm font-black uppercase tracking-[0.3em] transition-all flex items-center justify-center gap-3 ${settings.mcpEnabled ? 'bg-[#F120F0] text-black shadow-[0_0_30px_rgba(241,32,240,0.5)]' : 'bg-black text-[#F120F0] border-2 border-[#F120F0]/40 hover:border-[#F120F0]/80'}`}
              >
                <span className={`w-2 h-2 rounded-full ${settings.mcpEnabled ? 'bg-black animate-pulse' : 'bg-[#F120F0]/40'}`} />
                {settings.mcpEnabled ? 'MCP PROTOCOL: ONLINE' : 'MCP PROTOCOL: OFFLINE'}
              </button>

              {/* Active server URLs */}
              <div className="space-y-3">
                <div className="text-xs font-black uppercase tracking-widest text-[#F120F0]/50 border-b border-[#F120F0]/20 pb-2">Active Server Nodes</div>
                {((settings as any)?.mcpServerUrls || []).length === 0 && (
                  <div className="text-[10px] text-zinc-500 italic p-4 text-center border border-dashed border-zinc-800 rounded-lg">No active MCP nodes connected. Add a URL or select from the curated list below.</div>
                )}
                {((settings as any)?.mcpServerUrls || []).map((url: string, idx: number) => {
                  const status = mcpService.getStatus(url);
                  const toolCount = mcpService.getToolCount(url);
                  const statusColor = status === 'connected' ? '#22c55e' : status === 'connecting' ? '#eab308' : status === 'error' ? '#ef4444' : '#52525b';
                  return (
                    <div key={idx} className="flex items-center gap-3 bg-black/60 border border-[#F120F0]/20 rounded-lg p-2 transition-all hover:border-[#F120F0]/50">
                      <span className="w-2 h-2 rounded-full flex-shrink-0 transition-all ml-2" style={{ background: statusColor, boxShadow: status === 'connected' ? `0 0 8px ${statusColor}` : 'none' }} />
                      <input 
                        type="text" 
                        value={url}
                        onChange={(e) => { const next = [...((settings as any)?.mcpServerUrls || [])]; next[idx] = e.target.value; setSettings(prev => ({ ...prev, mcpServerUrls: next })); }}
                        className="flex-1 bg-transparent text-xs text-[#F120F0] outline-none font-mono placeholder-zinc-700 w-full"
                        placeholder="https://..." 
                      />
                      {status === 'connected' && toolCount > 0 && (
                        <span className="text-[10px] font-black text-green-500 bg-green-950 px-2 py-0.5 rounded flex-shrink-0 border border-green-900">{toolCount} TOOLS</span>
                      )}
                      <button 
                        onClick={() => { const next = ((settings as any)?.mcpServerUrls || []).filter((_: string, i: number) => i !== idx); setSettings(prev => ({ ...prev, mcpServerUrls: next })); }}
                        className="text-[#F120F0]/30 hover:text-red-400 hover:bg-red-950/30 p-1.5 rounded transition-all flex-shrink-0"
                      >✕</button>
                    </div>
                  );
                })}
                <button 
                  onClick={() => setSettings(prev => ({ ...prev, mcpServerUrls: [...(prev.mcpServerUrls || []), ''] }))}
                  className="w-full py-3 text-[10px] font-black uppercase tracking-[0.2em] text-[#F120F0]/60 border-2 border-dashed border-[#F120F0]/20 rounded-lg hover:border-[#F120F0]/60 hover:text-[#F120F0] hover:bg-[#F120F0]/5 transition-all"
                >
                  + Add Custom Server Addr
                </button>
              </div>

              {/* Curated servers */}
              <div className="space-y-4 pt-4 border-t border-[#F120F0]/20">
                <div className="text-xs font-black uppercase tracking-widest text-[#F120F0]/50">Verified Server Index</div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {(() => {
                    const cats = [...new Set(mcpService.CURATED_SERVERS.map((s: any) => s.category))];
                    return cats.map(cat => (
                      <div key={cat as string} className="space-y-2">
                        <div className="text-[10px] font-black uppercase tracking-widest text-[#F120F0]/30 border-b border-[#F120F0]/10 pb-1">{cat as string}</div>
                        {mcpService.CURATED_SERVERS.filter((s: any) => s.category === cat).map((server: any) => {
                          const alreadyAdded = ((settings as any)?.mcpServerUrls || []).includes(server.url);
                          const status = mcpService.getStatus(server.url);
                          const toolCount = mcpService.getToolCount(server.url);
                          const statusColor = status === 'connected' ? '#22c55e' : status === 'connecting' ? '#eab308' : status === 'error' ? '#ef4444' : '#3f3f46';
                          const authColor = server.auth === 'none' ? '#22c55e' : server.auth === 'bearer' ? '#eab308' : '#6366f1';
                          
                          return (
                            <div key={server.url} className={`p-3 rounded-lg border transition-all ${alreadyAdded ? 'bg-[#F120F0]/10 border-[#F120F0]/40' : 'bg-black/60 border-zinc-800/50 hover:border-[#F120F0]/30'}`}>
                              <div className="flex items-start justify-between gap-3 mb-2">
                                <div className="flex items-center gap-2 min-w-0">
                                  <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: statusColor, boxShadow: status === 'connected' ? `0 0 8px ${statusColor}` : 'none' }} />
                                  <div className="font-black text-[11px] text-[#F120F0] truncate">{server.name}</div>
                                  <span className="text-[8px] font-black uppercase px-1.5 py-0.5 rounded" style={{ background: `${authColor}20`, color: authColor }}>
                                    {server.auth === 'none' ? 'FREE' : server.auth === 'bearer' ? 'KEY' : 'OAUTH'}
                                  </span>
                                </div>
                                <button
                                  onClick={() => {
                                    if (alreadyAdded) {
                                      setSettings(prev => ({ ...prev, mcpServerUrls: (prev.mcpServerUrls || []).filter(u => u !== server.url) }));
                                    } else {
                                      setSettings(prev => ({ ...prev, mcpServerUrls: [...(prev.mcpServerUrls || []), server.url] }));
                                    }
                                  }}
                                  className={`text-[9px] font-black px-2 py-1 rounded transition-all ${alreadyAdded ? 'bg-red-900/30 text-red-400 border border-red-500/30 hover:bg-red-600 hover:text-black' : 'bg-[#F120F0]/10 text-[#F120F0] border border-[#F120F0]/30 hover:bg-[#F120F0] hover:text-black'}`}>
                                  {alreadyAdded ? 'REMOVE' : 'CONNECT'}
                                </button>
                              </div>
                              <div className="text-[10px] text-zinc-500 leading-tight mb-2">{server.description}</div>
                              {status === 'connected' && toolCount > 0 && <div className="text-[9px] font-mono text-green-500">{toolCount} Available Tools</div>}
                            </div>
                          );
                        })}
                      </div>
                    ));
                  })()}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'tools' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between pb-2 border-b border-[#F120F0]/20">
                <div className="text-xs font-black uppercase tracking-[0.2em] text-[#F120F0]">Module Arsenal</div>
                <div className="text-[10px] font-mono text-[#F120F0]/50 px-2 py-1 bg-black rounded-lg border border-[#F120F0]/20">
                  {settings.enabledTools?.length || 0} ACTIVE
                </div>
              </div>

              <div className="space-y-6">
                <div className="text-[10px] text-yellow-500/80 p-3 bg-yellow-950/20 rounded-lg border border-yellow-900/30">
                  AGENTIC_NOTE: Select which built-in tools should be provided to the AI. Some tools may require API keys configured in the SECURITY_VAULT.
                </div>
                {TOOL_CATEGORIES.map(category => (
                  <div key={category.id} className="space-y-3">
                    <div className="flex items-center gap-2 border-b border-zinc-800 pb-1">
                      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: category.color, boxShadow: `0 0 8px ${category.color}` }} />
                      <h3 className="text-[11px] font-black uppercase tracking-widest text-[#F120F0]">
                        {category.title}
                      </h3>
                      <span className="text-[9px] text-zinc-500 ml-2 normal-case tracking-normal">{category.description}</span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                      {category.tools.map(toolName => {
                        const isEnabled = (settings.enabledTools || []).includes(toolName);
                        return (
                          <div 
                            key={toolName}
                            onClick={() => {
                              const current = settings.enabledTools || [];
                              setSettings(prev => ({
                                ...prev,
                                enabledTools: isEnabled 
                                  ? current.filter(t => t !== toolName)
                                  : [...current, toolName]
                              }));
                            }}
                            className={`p-2 rounded-lg border cursor-pointer transition-all duration-300 flex items-center justify-between group ${
                              isEnabled 
                                ? 'bg-[#F120F0]/10 border-[#F120F0]/50 shadow-[0_0_10px_rgba(241,32,240,0.1)]' 
                                : 'bg-black/60 border-zinc-800 hover:border-[#F120F0]/30'
                            }`}
                          >
                            <span className={`text-[10px] font-mono truncate mr-2 ${isEnabled ? 'text-[#F120F0]' : 'text-zinc-400 group-hover:text-zinc-300'}`}>
                              {toolName}
                            </span>
                            <div className={`w-3 h-3 rounded border flex items-center justify-center flex-shrink-0 transition-colors ${
                              isEnabled ? 'bg-[#F120F0] border-[#F120F0]' : 'border-zinc-700 bg-transparent group-hover:border-[#F120F0]/50'
                            }`}>
                              {isEnabled && <svg className="w-2 h-2 text-black" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'apps' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between pb-2 border-b border-[#F120F0]/20">
                <div className="text-xs font-black uppercase tracking-[0.2em] text-[#F120F0]">Module Integrations</div>
                <div className="text-[10px] font-mono text-[#F120F0]/50 px-2 py-1 bg-black rounded-lg border border-[#F120F0]/20">
                  {APP_INTEGRATIONS.filter(a => (settings.connectedApps || []).includes(a.id)).length} / {APP_INTEGRATIONS.length} ACTIVE
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {(() => {
                  const cats = [...new Set(APP_INTEGRATIONS.map(i => i.category))];
                  return cats.map(cat => (
                    <div key={cat} className="space-y-3">
                      <div className="text-[10px] font-black uppercase tracking-widest text-[#F120F0]/40">{cat}</div>
                      {APP_INTEGRATIONS.filter(i => i.category === cat).map(app => {
                        const settingsKeyTyped = app.settingsKey as keyof AppSettings;
                        const hasToken = app.authType === 'none' || !!((settings as any)?.[settingsKeyTyped]);
                        const isConnected = app.authType === 'none' || (hasToken && (settings.connectedApps || []).includes(app.id));
                        
                        return (
                          <div key={app.id} className={`p-4 rounded-xl border-2 transition-all duration-300 ${isConnected ? 'bg-[#F120F0]/5 border-[#F120F0]/40 shadow-[0_0_15px_rgba(241,32,240,0.1)]' : 'bg-black/60 border-zinc-800 hover:border-[#F120F0]/30'}`}>
                            <div className="flex items-start justify-between mb-3">
                              <div className="flex gap-3">
                                {app.svgIcon ? (
                                  <svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6 flex-shrink-0" style={{ color: app.color }}>
                                    <path d={app.svgIcon} />
                                  </svg>
                                ) : (
                                  <span className="text-xl">{app.icon}</span>
                                )}
                                <div>
                                  <div className="flex items-center gap-2 mb-1">
                                    <span className="text-[11px] font-black text-[#F120F0]">{app.name}</span>
                                    <span className="text-[8px] font-black uppercase px-1.5 py-0.5 rounded" style={{ background: isConnected ? 'rgba(34,197,94,0.15)' : 'rgba(241,32,240,0.1)', color: isConnected ? '#22c55e' : '#71717a' }}>
                                      {isConnected ? 'LINKED' : app.authType === 'none' ? 'FREE' : app.authType.toUpperCase()}
                                    </span>
                                  </div>
                                  <div className="text-[10px] text-zinc-500 leading-tight">{app.description}</div>
                                </div>
                              </div>
                            </div>

                            {app.authType !== 'none' && app.settingsKey && (
                              <div className="space-y-2 mt-3 mb-3">
                                <div className="flex gap-2">
                                  <input 
                                    type="password" 
                                    value={(settings as any)?.[settingsKeyTyped] || ''}
                                    onChange={(e) => setSettings(prev => ({ ...prev, [settingsKeyTyped]: e.target.value }))}
                                    placeholder={`${app.name} ${app.authType === 'webhook' ? 'Webhook URL' : app.authType === 'bot_token' ? 'Bot Token' : 'API Key'}`}
                                    className="flex-1 bg-black border border-[#F120F0]/30 rounded-lg px-3 py-2 text-xs text-[#F120F0] outline-none focus:border-[#F120F0] transition-all font-mono placeholder-zinc-700" 
                                  />
                                  <button
                                    onClick={() => {
                                      const currentApps = settings.connectedApps || [];
                                      if (isConnected) {
                                        setSettings(prev => ({ ...prev, connectedApps: currentApps.filter((a: string) => a !== app.id) }));
                                        integrationRegistry.disconnect(app.id);
                                      } else if (hasToken) {
                                        setSettings(prev => ({ ...prev, connectedApps: [...currentApps, app.id] }));
                                        integrationRegistry.connect(app.id);
                                      }
                                    }}
                                    disabled={!hasToken}
                                    className={`text-[9px] font-black uppercase px-3 py-2 rounded-lg transition-all ${isConnected ? 'bg-red-900/20 text-red-400 border border-red-500/30 hover:bg-red-600 hover:text-black' : hasToken ? 'bg-green-900/20 text-green-400 border border-green-500/30 hover:bg-green-600 hover:text-black' : 'bg-black text-zinc-600 border border-zinc-800 cursor-not-allowed'}`}
                                  >
                                    {isConnected ? 'UNLINK' : 'LINK'}
                                  </button>
                                </div>
                                {app.extraSettings?.map(extra => (
                                  <input 
                                    key={extra.key} 
                                    type="password" 
                                    value={(settings as any)?.[extra.key] || ''}
                                    onChange={(e) => setSettings(prev => ({ ...prev, [extra.key]: e.target.value }))}
                                    placeholder={extra.placeholder}
                                    className="w-full bg-black border border-[#F120F0]/30 rounded-lg px-3 py-2 text-xs text-[#F120F0] outline-none focus:border-[#F120F0] transition-all font-mono placeholder-zinc-700" 
                                  />
                                ))}
                              </div>
                            )}

                            <div className="flex flex-wrap items-center gap-2 mt-2 pt-2 border-t border-zinc-800/50">
                              {supabaseAuth.supportsOAuth(app.id) && (
                                <button onClick={() => {
                                  const provider = supabaseAuth.getOAuthProvider(app.id);
                                  if (provider) {
                                    const scopes = supabaseAuth.getOAuthScopes(app.id);
                                    supabaseAuth.signInWithOAuth(provider, scopes).catch(err => {
                                      console.error('OAuth failed:', err);
                                    });
                                  }
                                }} className="text-[9px] font-black uppercase px-2 py-1 rounded bg-green-900/10 border border-green-500/30 text-green-400 hover:border-green-400 transition-all">Authenticate Request</button>
                              )}
                              {app.docsUrl && (
                                <a href={app.docsUrl} target="_blank" rel="noopener noreferrer" className="text-[9px] font-black uppercase px-2 py-1 rounded border border-zinc-800 text-zinc-400 hover:border-[#F120F0] hover:text-[#F120F0] transition-all bg-black/60">Documentation</a>
                              )}
                              {app.getTokenUrl && (
                                <a href={app.getTokenUrl} target="_blank" rel="noopener noreferrer" className="text-[9px] font-black uppercase px-2 py-1 rounded border border-[#F120F0]/20 text-[#F120F0]/70 hover:border-[#F120F0] hover:text-[#F120F0] hover:bg-[#F120F0]/10 transition-all bg-black/60">Obtain Tokens</a>
                              )}
                            </div>

                            {isConnected && (
                              <div className="mt-3 flex flex-wrap gap-1.5">
                                {app.features.map(f => (
                                  <span key={f} className="text-[8px] font-bold uppercase px-1.5 py-0.5 rounded bg-[#F120F0]/10 border border-[#F120F0]/20 text-[#F120F0] shadow-[0_0_5px_rgba(241,32,240,0.1)]">{f}</span>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  ));
                })()}
              </div>

              <div className="text-[10px] text-yellow-500/80 p-3 bg-yellow-950/20 rounded-lg border border-yellow-900/30">
                ACTIVE_INTEGRATIONS_NOTE: Linked applications authorize the Agent Engine to utilize their respective tools autonomously across all active sessions. Unlink to revoke access.
              </div>
            </div>
          )}
        </div>

        <div className="p-6 border-t border-[#F120F0]/30 bg-[#050000] flex justify-between items-center text-[9px] font-black uppercase tracking-widest text-[#F120F0]/50">
          <div>Settings_v4.8.0 // TERMINAL_GUI_MODULARIZED</div>
          <button
            onClick={() => { if (confirm('SYSTEM CRITICAL: Purging all stored data. Proceed?')) { localStorage.clear(); window.location.reload(); } }}
            className="text-red-900 hover:text-red-500 transition-colors bg-red-950/10 px-3 py-1.5 rounded-lg border border-red-900/30"
          >
            [ INITIATE_DATA_PURGE ]
          </button>
        </div>
      </div>
    </div>
  );
};
