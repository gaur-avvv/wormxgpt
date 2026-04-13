document.addEventListener('DOMContentLoaded', () => {
  const chatArea = document.getElementById('chatArea');
  const userInput = document.getElementById('userInput');
  const sendBtn = document.getElementById('sendBtn');
  const modeSelect = document.getElementById('modeSelect');

  function appendMessage(text, isUser = false) {
    const div = document.createElement('div');
    div.className = `message ${isUser ? 'user' : 'agent'}`;
    div.innerText = text;
    chatArea.appendChild(div);
    chatArea.scrollTop = chatArea.scrollHeight;
  }

  // Set mode on tab
  modeSelect.addEventListener('change', async () => {
    const mode = modeSelect.value;
    chrome.storage.local.set({ extension_mode: mode });
    
    // Broadcast to current tab
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab) {
      try {
         chrome.tabs.sendMessage(tab.id, { action: 'SET_MODE', mode }, () => {
            const err = chrome.runtime.lastError; // Accessing it suppresses unhandled rejection
         });
      } catch(e) {}
    }
  });

  sendBtn.addEventListener('click', handleSend);
  userInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') handleSend();
  });

  async function handleSend() {
    const text = userInput.value.trim();
    if (!text) return;
    
    appendMessage(text, true);
    userInput.value = '';

    appendMessage('...', false);
    const loadingDiv = chatArea.lastElementChild;

    chrome.runtime.sendMessage({
      action: 'RUN_AGENT',
      userQuery: text,
      mode: modeSelect.value
    }, (response) => {
      if (chrome.runtime.lastError) {
        loadingDiv.innerText = '[System Error] ' + chrome.runtime.lastError.message;
        return;
      }
      
      if (response && response.error) {
        loadingDiv.innerText = '[Error] ' + response.error;
      } else {
        loadingDiv.innerText = response.text;
        
        if (response.toolsUsed && response.toolsUsed.length > 0) {
          const sys = document.createElement('div');
          sys.style.marginTop = '8px';
          sys.style.fontSize = '10px';
          sys.style.color = 'gray';
          sys.innerText = "Tools Executed:\n" + response.toolsUsed.join('\n');
          loadingDiv.appendChild(sys);
        }
      }
      chatArea.scrollTop = chatArea.scrollHeight;
    });
  }

  // Restore state
  chrome.storage.local.get(['extension_mode'], (res) => {
    if (res.extension_mode) modeSelect.value = res.extension_mode;
  });
});
