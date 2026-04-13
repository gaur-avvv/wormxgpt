/**
 * content_script.js
 * Injected into all pages. Responsible for extraction and overlay rendering.
 */

// Global state
let currentAgentMode = 'OBSERVE'; // OBSERVE, ASSIST, AUTOPILOT
let actionMap = {};

// 1. Watermark Indicator
function injectWatermark() {
  const existing = document.getElementById('wormgpt-watermark-overlay');
  if (existing) return;

  const watermark = document.createElement('div');
  watermark.id = 'wormgpt-watermark-overlay';
  watermark.style.position = 'fixed';
  watermark.style.bottom = '20px';
  watermark.style.right = '20px';
  watermark.style.background = 'rgba(10, 5, 5, 0.9)';
  watermark.style.border = '1px solid rgba(220, 38, 38, 0.5)';
  watermark.style.color = '#ef4444';
  watermark.style.padding = '8px 12px';
  watermark.style.borderRadius = '8px';
  watermark.style.fontFamily = 'monospace';
  watermark.style.fontSize = '12px';
  watermark.style.fontWeight = 'bold';
  watermark.style.zIndex = '2147483647';
  watermark.style.pointerEvents = 'none';
  watermark.style.boxShadow = '0 0 10px rgba(220, 38, 38, 0.3)';
  watermark.innerText = '👁 Agent Watching';
  document.documentElement.appendChild(watermark);
}

// 2. Structured Page Content Extraction
function extractPageContext() {
  const baseDocument = document.cloneNode(true);
  let mainText = "[Readability.js Failed]";

  try {
    // Readability constructor is available from lib/readability.js payload via manifest
    const reader = new Readability(baseDocument);
    const parsed = reader.parse();
    if (parsed && parsed.textContent) {
      // Condense text length 
      mainText = parsed.textContent.replace(/\s+/g, ' ').slice(0, 15000); 
    }
  } catch (e) {
    console.error('WormGPT: Body parsing error', e);
  }

  // Generate Interactive Action Map
  actionMap = {};
  const interactables = Array.from(document.querySelectorAll('button, a, input, select, textarea, [role="button"]'));
  
  interactables.forEach((el, index) => {
    // Ensure element is visible
    const rect = el.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0 || rect.top < 0 || rect.top > window.innerHeight) return;

    const actionId = `act_${index}`;
    // Store reference securely without modifying underlying page logic
    actionMap[actionId] = el;

    el.setAttribute('data-wgpt-action-id', actionId);
    
    // In ASSIST mode, we could draw small IDs on the element
    if (currentAgentMode === 'ASSIST') {
      const tag = document.createElement('div');
      tag.className = 'wgpt-assist-tag';
      tag.style.position = 'absolute';
      tag.style.top = `${rect.top + window.scrollY}px`;
      tag.style.left = `${rect.left + window.scrollX}px`;
      tag.style.background = 'yellow';
      tag.style.color = 'black';
      tag.style.fontSize = '10px';
      tag.style.zIndex = '2147483646';
      tag.innerText = actionId;
      document.body.appendChild(tag);
    }
  });

  const structuredMap = Object.keys(actionMap).map(id => {
    const e = actionMap[id];
    return {
      id,
      tag: e.tagName,
      type: e.type || null,
      name: e.getAttribute('name') || null,
      text: e.innerText?.trim().slice(0,50) || e.value || null,
      href: e.getAttribute('href') || null
    };
  });

  return {
    title: document.title,
    url: window.location.href,
    meta_description: document.querySelector('meta[name="description"]')?.getAttribute('content') || null,
    scroll_position: window.scrollY,
    viewport: { width: window.innerWidth, height: window.innerHeight },
    content_text: mainText,
    action_map: structuredMap.slice(0, 50) // Send top 50 interactables to save tokens
  };
}

// Ensure execution triggers upon messaging
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'GET_PAGE_CONTEXT') {
    sendResponse(extractPageContext());
  }

  else if (request.action === 'HIGHLIGHT') {
    const el = document.querySelector(request.selector) || actionMap[request.selector];
    if (el) {
      const origOutline = el.style.outline;
      el.style.outline = `3px solid ${request.color || '#ef4444'}`;
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      
      setTimeout(() => el.style.outline = origOutline, 4000);
      sendResponse({ status: 'success' });
    } else {
      sendResponse({ status: 'element_not_found' });
    }
  }
  
  else if (request.action === 'ACTION') {
    // Intercepted interaction
    let el = document.querySelector(request.selector) || actionMap[request.selector];
    
    // Fallback: If it's an ID from actionMap, ensure it works.
    if (!el && request.selector && request.selector.startsWith('act_')) {
       el = actionMap[request.selector];
    }
    
    if (!el) {
      sendResponse({ status: 'element_not_found' });
      return;
    }

    if (request.type === 'click') {
      try { el.click(); } catch(e) {}
    } else if (request.type === 'fill') {
      el.value = request.value;
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
    }
    
    sendResponse({ status: 'action_completed' });
  }

  else if (request.action === 'SET_MODE') {
    currentAgentMode = request.mode;
    document.querySelectorAll('.wgpt-assist-tag').forEach(t => t.remove());
    if (currentAgentMode === 'OBSERVE') injectWatermark();
    
    sendResponse({ status: 'mode_activated', mode: currentAgentMode });
  }
});

// Auto-inject on boot
if (document.readyState === 'complete') {
  injectWatermark();
} else {
  window.addEventListener('load', injectWatermark);
}

// Send background context hash continuously when URL hash pushes (for SPA)
let lastUrl = location.href; 
new MutationObserver(() => {
  const url = location.href;
  if (url !== lastUrl) {
    lastUrl = url;
    chrome.runtime.sendMessage({ action: 'URL_CHANGED', url: url });
  }
}).observe(document, {subtree: true, childList: true});
