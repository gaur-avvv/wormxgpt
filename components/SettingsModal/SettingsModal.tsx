import React, { useState, useEffect } from 'react';
import { AppSettings } from '../../types';
import { useWormGPT } from '../../context/GlobalContext';
import { 
  geminiService, groqService, anthropicService, openaiService,
  deepseekService, mistralService, xaiService, perplexityService,
  togetherService, openrouterService, cerebrasService, siliconflowService,
  moonshotService, ollamaService, pollinationsService, tinyfishService,
  mcpService, integrationRegistry 
} from '../../services';
import { ATTACHED_TOOLS, TOOL_CATEGORIES, APP_INTEGRATIONS } from '../../services';

type SettingsTab = 'system' | 'security' | 'connection' | 'tools' | 'apps';

export const SettingsModal: React.FC<{ 
  initialTab?: SettingsTab; 
}> = ({ initialTab }) => {
  const { isSettingsOpen, setIsSettingsOpen, settings, setSettings } = useWormGPT();
  const [activeTab, setActiveTab] = useState<SettingsTab>(initialTab || 'system');
  const [verificationStatuses, setVerificationStatuses] = useState<Record<string, 'idle' | 'verifying' | 'valid' | 'invalid'>>({});
  const [mcpTools, setMcpTools] = useState<Record<string, any[]>>({});
  const [toolSearchQuery, setToolSearchQuery] = useState('');

  useEffect(() => {
    if (isSettingsOpen) setActiveTab(initialTab || 'system');
  }, [isSettingsOpen, initialTab]);

  if (!isSettingsOpen) return null;

  const updateSetting = (key: keyof AppSettings, value: any) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  const verifyKey = async (provider: string, key: string) => {
    if (!key) return setVerificationStatuses(prev => ({ ...prev, [provider]: 'idle' }));
    setVerificationStatuses(prev => ({ ...prev, [provider]: 'verifying' }));
    let isValid = false;
    try {
      const p = provider.toLowerCase();
      if (p.includes('gemini')) isValid = await geminiService.verifyApiKey(key);
      else if (p.includes('groq')) isValid = await groqService.verifyApiKey(key);
      else if (p.includes('anthropic')) isValid = await anthropicService.verifyApiKey(key);
      else if (p.includes('openai')) isValid = await openaiService.verifyApiKey(key);
      else if (p.includes('deepseek')) isValid = await deepseekService.verifyApiKey(key);
      else if (p.includes('mistral')) isValid = await mistralService.verifyApiKey(key);
      else if (p.includes('xai')) isValid = await xaiService.verifyApiKey(key);
      else if (p.includes('perplexity')) isValid = await perplexityService.verifyApiKey(key);
      else if (p.includes('together')) isValid = await togetherService.verifyApiKey(key);
      else if (p.includes('openrouter')) isValid = await openrouterService.verifyApiKey(key);
      else if (p.includes('cerebras')) isValid = await cerebrasService.verifyApiKey(key);
      else if (p.includes('siliconflow')) isValid = await siliconflowService.verifyApiKey(key);
      else if (p.includes('moonshot')) isValid = await moonshotService.verifyApiKey(key);
      else if (p.includes('ollama')) isValid = await ollamaService.verifyApiKey(key);
      else if (p.includes('pollinations')) isValid = await pollinationsService.verifyApiKey(key);
      else if (p.includes('tinyfish')) isValid = await tinyfishService.verifyApiKey(key);
      else isValid = true;
    } catch { isValid = false; }
    setVerificationStatuses(prev => ({ ...prev, [provider]: isValid ? 'valid' : 'invalid' }));
  };

  return (
    <div className="fixed inset-0 z-[1001] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/90 backdrop-blur-xl" onClick={() => setIsSettingsOpen(false)} />
      <div className="relative w-full max-w-2xl bg-[#0a0505] border-2 border-red-600/40 rounded-2xl shadow-[0_0_50px_rgba(220,38,38,0.3)] overflow-hidden animate-slideUp">
        {/* Header */}
        <div className="p-6 border-b border-red-900/30 bg-red-950/10 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse shadow-[0_0_10px_#dc2626]" />
            <h2 className="text-xl font-black uppercase tracking-[0.3em] text-red-500">System_Override_Center</h2>
          </div>
          <button onClick={() => setIsSettingsOpen(false)} className="p-2 text-red-900 hover:text-red-500 transition-colors">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M6 18L18 6M6 6l12 12" strokeWidth={2.5} /></svg>
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-red-900/20 px-4 gap-4 bg-black/40">
          {[
            { id: 'system', label: 'SYSTEM_PARAM' },
            { id: 'security', label: 'SECURITY_VAULT' },
            { id: 'tools', label: 'TOOLS_PARAM' },
            { id: 'connection', label: 'NET_INTERFACE' },
            { id: 'apps', label: 'APP_CONNECT' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-4 py-3 text-[10px] font-black uppercase tracking-widest transition-all duration-300 border-b-2 ${activeTab === tab.id ? 'border-red-600 text-red-500 bg-red-600/10' : 'border-transparent text-zinc-600 hover:text-red-900'}`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="p-6 max-h-[60vh] overflow-y-auto custom-scrollbar bg-gradient-to-b from-black to-[#050000]">
          {activeTab === 'system' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-red-900 flex justify-between">
                    <span>Temperature</span>
                    <span className="text-red-500">{settings.temperature}</span>
                  </label>
                  <input type="range" min="0" max="2" step="0.1" value={settings.temperature} onChange={(e) => updateSetting('temperature', parseFloat(e.target.value))} className="w-full accent-red-600 bg-zinc-900 h-1 rounded-full appearance-none" />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-red-900 flex justify-between">
                    <span>Top_P</span>
                    <span className="text-red-500">{settings.topP}</span>
                  </label>
                  <input type="range" min="0" max="1" step="0.05" value={settings.topP} onChange={(e) => updateSetting('topP', parseFloat(e.target.value))} className="w-full accent-red-600 bg-zinc-900 h-1 rounded-full appearance-none" />
                </div>
              </div>
              <div className="space-y-2 mt-4">
                <label className="text-[10px] font-black uppercase tracking-widest text-red-900">System_Instruction_Directive</label>
                <textarea value={settings.systemInstruction} onChange={(e) => updateSetting('systemInstruction', e.target.value)} rows={4} className="w-full bg-zinc-950 border border-red-900/30 rounded-lg p-3 text-xs text-red-400 focus:border-red-600 outline-none font-mono custom-scrollbar" />
              </div>
            </div>
          )}
          {/* ... Add other tabs logic here ... */}
        </div>

        <div className="p-6 border-t border-red-900/30 bg-black flex justify-between items-center text-[9px] font-black uppercase tracking-widest text-zinc-700">
          <div>Settings_v4.7.0 // IDB+CTX_Compress</div>
          <button
            onClick={() => { if (confirm('PURGE ALL DATA?')) { localStorage.clear(); window.location.reload(); } }}
            className="text-red-900 hover:text-red-500 transition-colors"
          >
            [ PURGE_ALL_DATA ]
          </button>
        </div>
      </div>
    </div>
  );
};
