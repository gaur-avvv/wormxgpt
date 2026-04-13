document.addEventListener('DOMContentLoaded', () => {
  const providerSelect = document.getElementById('provider');
  const modelInput = document.getElementById('modelId');
  const apiKeyInput = document.getElementById('apiKey');
  const promptInjectionInput = document.getElementById('promptInjection');
  
  const saveBtn = document.getElementById('saveBtn');
  const status = document.getElementById('status');
  const openSidebar = document.getElementById('openSidebar');

  const defaultModels = {
    anthropic: 'claude-3-7-sonnet-20250219',
    openai: 'gpt-4o',
    gemini: 'gemini-2.5-flash',
    groq: 'llama-3.3-70b-versatile',
    openrouter: 'google/gemini-2.5-flash',
    deepseek: 'deepseek-chat',
    together: 'meta-llama/Llama-3-70b-chat-hf',
    xai: 'grok-beta',
    mistral: 'mistral-large-latest',
    perplexity: 'sonar-pro',
    ollama: 'llama3'
  };

  // Load existing
  chrome.storage.local.get(['wgpt_ext_provider', 'wgpt_ext_model', 'wgpt_ext_apikey', 'wgpt_ext_prompt'], (res) => {
    if (res.wgpt_ext_provider) providerSelect.value = res.wgpt_ext_provider;
    if (res.wgpt_ext_model) modelInput.value = res.wgpt_ext_model;
    if (res.wgpt_ext_apikey) apiKeyInput.value = res.wgpt_ext_apikey;
    if (res.wgpt_ext_prompt) promptInjectionInput.value = res.wgpt_ext_prompt;
  });

  providerSelect.addEventListener('change', () => {
    const prov = providerSelect.value;
    modelInput.placeholder = `e.g. ${defaultModels[prov]}`;
    if (!modelInput.value || Object.values(defaultModels).includes(modelInput.value)) {
      modelInput.value = defaultModels[prov];
    }
  });

  saveBtn.addEventListener('click', () => {
    const provider = providerSelect.value;
    const model = modelInput.value.trim() || defaultModels[provider];
    const apiKey = apiKeyInput.value.trim();
    const promptInjection = promptInjectionInput.value.trim();

    chrome.storage.local.set({
      wgpt_ext_provider: provider,
      wgpt_ext_model: model,
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
