document.addEventListener('DOMContentLoaded', () => {
  const providerSelect = document.getElementById('provider');
  const modelSelect = document.getElementById('modelSelect');
  const modelIdOverride = document.getElementById('modelIdOverride');
  const apiKeyInput = document.getElementById('apiKey');
  const promptInjectionInput = document.getElementById('promptInjection');
  
  const saveBtn = document.getElementById('saveBtn');
  const status = document.getElementById('status');
  const openSidebar = document.getElementById('openSidebar');

  const defaultModels = {
    anthropic: ['claude-3-7-sonnet-20250219', 'claude-3-5-sonnet-20241022', 'claude-3-opus-latest'],
    openai: ['gpt-4o', 'gpt-4o-mini', 'o3-mini', 'o1'],
    gemini: ['gemini-2.5-flash', 'gemini-2.5-pro', 'gemini-2.5-flash-lite'],
    groq: ['llama-3.3-70b-versatile', 'llama-3.1-8b-instant', 'deepseek-r1-distill-qwen-32b'],
    openrouter: ['google/gemini-2.5-flash', 'anthropic/claude-3.5-sonnet', 'deepseek/deepseek-r1', 'x-ai/grok-4'],
    deepseek: ['deepseek-chat', 'deepseek-reasoner'],
    together: ['meta-llama/Llama-3.3-70B-Instruct-Turbo', 'deepseek-ai/DeepSeek-R1', 'mistralai/mistral-small-24b-instruct'],
    xai: ['grok-4.20', 'grok-4.1', 'grok-4'],
    mistral: ['mistral-large-latest', 'mistral-small-latest', 'pixtral-large-latest'],
    perplexity: ['sonar-pro', 'sonar-reasoning', 'sonar'],
    ollama: ['llama3', 'llama3.3:70b', 'deepseek-r1:14b', 'deepseek-r1:32b', 'qwen2.5:32b', 'mistral-nemo']
  };

  function updateModelSelect(prov) {
    modelSelect.innerHTML = '';
    const models = defaultModels[prov] || [];
    models.forEach(m => {
       const opt = document.createElement('option');
       opt.value = m;
       opt.text = m;
       modelSelect.appendChild(opt);
    });
  }

  // Load existing
  chrome.storage.local.get(['wgpt_ext_provider', 'wgpt_ext_model', 'wgpt_ext_model_override', 'wgpt_ext_apikey', 'wgpt_ext_prompt'], (res) => {
    if (res.wgpt_ext_provider) providerSelect.value = res.wgpt_ext_provider;
    updateModelSelect(providerSelect.value);
    
    if (res.wgpt_ext_model && Array.from(modelSelect.options).some(o => o.value === res.wgpt_ext_model)) {
       modelSelect.value = res.wgpt_ext_model;
    }
    if (res.wgpt_ext_model_override) modelIdOverride.value = res.wgpt_ext_model_override;
    if (res.wgpt_ext_apikey) apiKeyInput.value = res.wgpt_ext_apikey;
    if (res.wgpt_ext_prompt) promptInjectionInput.value = res.wgpt_ext_prompt;
  });

  providerSelect.addEventListener('change', () => {
    updateModelSelect(providerSelect.value);
  });

  saveBtn.addEventListener('click', () => {
    const provider = providerSelect.value;
    const model = modelSelect.value;
    const override = modelIdOverride.value.trim();
    const apiKey = apiKeyInput.value.trim();
    const promptInjection = promptInjectionInput.value.trim();

    chrome.storage.local.set({
      wgpt_ext_provider: provider,
      wgpt_ext_model: model,
      wgpt_ext_model_override: override,
      wgpt_ext_apikey: apiKey,
      wgpt_ext_prompt: promptInjection
    }, () => {
      status.innerText = "Config updated!";
      setTimeout(() => status.innerText = "", 2000);
    });
  });

  openSidebar.addEventListener('click', () => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const activeTab = tabs[0];
      if (activeTab) {
        chrome.sidePanel.open({ windowId: activeTab.windowId });
        window.close();
      }
    });
  });
});
