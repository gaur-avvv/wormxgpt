/**
 * background.js
 * Service Worker orchestrating AI LLM streams, MV3 Security constraints,
 * and the Chrome MCP Relay — handles tool calls dispatched from the MCP server.
 */

// Global Configuration
const BLOCKLIST_REGEX = /bank|medical|health|gov|secure|auth/i;
const MCP_SERVER = 'http://localhost:3002';

// ─── Chrome MCP Relay Listener ────────────────────────────────────────────────
// Listens to the MCP server's SSE stream and executes chrome tool calls,
// posting results back to /chrome-relay so they resolve in the AI's pipeline.
let relayEventSource = null;

function startChromeRelay() {
  if (relayEventSource) relayEventSource.close();
  
  try {
    relayEventSource = new EventSource(`${MCP_SERVER}/sse`);
    
    relayEventSource.onmessage = async (event) => {
      let msg;
      try { msg = JSON.parse(event.data); } catch { return; }
      if (msg.type !== 'CHROME_TOOL_CALL') return;
      
      const { requestId, toolName, args } = msg;
      let result = null;
      let error = null;
      
      try {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        
        switch (toolName) {
          case 'chrome_navigate': {
            await chrome.tabs.update(tab?.id, { url: args.url });
            await new Promise(r => setTimeout(r, args.wait_time || 2000));
            result = `Navigated to ${args.url}`;
            break;
          }
          case 'chrome_screenshot': {
            const dataUrl = await chrome.tabs.captureVisibleTab(null, { format: 'png' });
            result = dataUrl;
            break;
          }
          case 'chrome_extract_text': {
            const [inj] = await chrome.scripting.executeScript({
              target: { tabId: tab.id },
              func: () => {
                ['nav','footer','aside','script','style','noscript','iframe','header'].forEach(s =>
                  document.querySelectorAll(s).forEach(el => el.remove())
                );
                return document.body?.innerText?.substring(0, 50000) || '';
              }
            });
            result = inj?.result || '';
            break;
          }
          case 'chrome_extract_links': {
            const [inj] = await chrome.scripting.executeScript({
              target: { tabId: tab.id },
              func: () => JSON.stringify(
                Array.from(document.querySelectorAll('a[href]'))
                  .map(a => ({ text: a.innerText.trim(), href: a.href }))
                  .filter(a => a.text && a.href)
                  .slice(0, 200)
              )
            });
            result = inj?.result || '[]';
            break;
          }
          case 'chrome_click': {
            await chrome.scripting.executeScript({
              target: { tabId: tab.id },
              func: (sel) => document.querySelector(sel)?.click(),
              args: [args.selector]
            });
            await new Promise(r => setTimeout(r, 500));
            result = `Clicked: ${args.selector}`;
            break;
          }
          case 'chrome_fill': {
            await chrome.scripting.executeScript({
              target: { tabId: tab.id },
              func: (sel, val) => {
                const el = document.querySelector(sel);
                if (el) { el.value = val; el.dispatchEvent(new Event('input', {bubbles:true})); }
              },
              args: [args.selector, args.value]
            });
            result = `Filled ${args.selector} with value`;
            break;
          }
          case 'chrome_execute_js': {
            const [inj] = await chrome.scripting.executeScript({
              target: { tabId: tab.id },
              func: (code) => { try { return String(eval(code)); } catch(e) { return 'Error: ' + e.message; } },
              args: [args.script]
            });
            result = inj?.result ?? '';
            break;
          }
          case 'get_windows_and_tabs': {
            const windows = await chrome.windows.getAll({ populate: true });
            result = JSON.stringify(windows.map(w => ({
              windowId: w.id, focused: w.focused,
              tabs: (w.tabs || []).map(t => ({ tabId: t.id, title: t.title, url: t.url, active: t.active }))
            })));
            break;
          }
          case 'chrome_switch_tab': {
            await chrome.tabs.update(args.tabId, { active: true });
            result = `Switched to tab ${args.tabId}`;
            break;
          }
          case 'chrome_close_tabs': {
            await chrome.tabs.remove(args.tabIds);
            result = `Closed tabs: ${args.tabIds}`;
            break;
          }
          case 'chrome_history': {
            const items = await chrome.history.search({ text: args.text, maxResults: args.maxResults || 20 });
            result = JSON.stringify(items.map(i => ({ url: i.url, title: i.title, visitCount: i.visitCount })));
            break;
          }
          case 'chrome_bookmark_search': {
            const items = await chrome.bookmarks.search(args.query);
            result = JSON.stringify(items.map(i => ({ title: i.title, url: i.url })));
            break;
          }
          default:
            error = `Unknown chrome tool: ${toolName}`;
        }
      } catch (e) {
        error = e.message;
      }
      
      // POST result back to MCP server relay
      fetch(`${MCP_SERVER}/chrome-relay`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requestId, result, error })
      }).catch(console.error);
    };
    
    relayEventSource.onerror = () => {
      // Retry connection after 5s if MCP server is not running yet
      setTimeout(startChromeRelay, 5000);
    };
    
    console.log('[WormGPT Extension] Chrome MCP relay connected');
  } catch (e) {
    console.warn('[WormGPT Extension] Chrome relay failed to start:', e.message);
    setTimeout(startChromeRelay, 5000);
  }
}

// Start relay when service worker starts
startChromeRelay();



// Audit Logging
async function auditLog(actionType, targetUrl, details) {
  const logEntry = {
    timestamp: Date.now(),
    actionType,
    targetUrl,
    details
  };
  
  chrome.storage.local.get(['wgpt_audit_logs'], (data) => {
    let logs = data.wgpt_audit_logs || [];
    logs.push(logEntry);
    if (logs.length > 500) logs.shift(); // Keep last 500
    chrome.storage.local.set({ wgpt_audit_logs: logs });
  });
}

// Ensure the domain is safe to act upon
function isSafeDomain(url) {
  try {
    const hostname = new URL(url).hostname;
    return !BLOCKLIST_REGEX.test(hostname);
  } catch(e) {
    return false;
  }
}

// LLM Multi-Provider Proxy Protocol
const API_ENDPOINTS = {
  openai: 'https://api.openai.com/v1/chat/completions',
  groq: 'https://api.groq.com/openai/v1/chat/completions',
  openrouter: 'https://openrouter.ai/api/v1/chat/completions',
  deepseek: 'https://api.deepseek.com/v1/chat/completions',
  together: 'https://api.together.xyz/v1/chat/completions',
  xai: 'https://api.x.ai/v1/chat/completions',
  mistral: 'https://api.mistral.ai/v1/chat/completions',
  perplexity: 'https://api.perplexity.ai/chat/completions',
  ollama: 'http://localhost:11434/v1/chat/completions',
  anthropic: 'https://api.anthropic.com/v1/messages',
  gemini: 'https://generativelanguage.googleapis.com/v1beta/models/{MODEL}:generateContent?key={KEY}'
};

async function callLLMAPI(messages, systemInstruction, toolDefinitions, config) {
  const { provider, model, apiKey } = config;
  if (!apiKey && provider !== 'ollama') throw new Error(`${(provider || '').toUpperCase()}_KEY_MISSING`);

  const endpoint = API_ENDPOINTS[provider || 'anthropic'];
  if (!endpoint) throw new Error("UNSUPPORTED_PROVIDER");

  let url = endpoint;
  let headers = { 'Content-Type': 'application/json' };
  let body = {};

  if (provider === 'anthropic' || !provider) {
    headers['x-api-key'] = apiKey;
    headers['anthropic-version'] = '2023-06-01';
    headers['anthropic-dangerous-direct-browser-access'] = 'true';
    body = {
      model: model || "claude-3-7-sonnet-20250219",
      max_tokens: 4000,
      system: systemInstruction,
      messages: messages,
      tools: toolDefinitions 
    };
  } else if (provider === 'gemini') {
    url = url.replace('{MODEL}', model || 'gemini-2.5-flash').replace('{KEY}', apiKey);
    let geminiMessages = messages.map(m => ({ role: m.role === 'user' ? 'user' : 'model', parts: [{ text: m.content }] }));
    
    // Convert JSON schemas to Gemini OpenAPI strict format
    let geminiTools = toolDefinitions.map(t => {
      // Create deep clone
      let parameters = JSON.parse(JSON.stringify(t.input_schema));
      // Gemini REST parser requires type to be uppercase string for some older regions, but lowercase is valid in v1beta.
      // E.g., type: "OBJECT"
      if (parameters.type) parameters.type = parameters.type.toUpperCase();
      if (parameters.properties) {
         for (let key in parameters.properties) {
            if (parameters.properties[key].type) {
               parameters.properties[key].type = parameters.properties[key].type.toUpperCase();
            }
         }
      }
      return {
         name: t.name,
         description: t.description,
         parameters: parameters
      };
    });

    const agenticPrompt = systemInstruction + `\n\nCRITICAL INSTRUCTION: You must act as an autonomous browser agent. Use your Tools to accomplish the user's objective. YOU MUST output a step-by-step 'Chain of Thought' reasoning as plain text first before executing any function call!`;

    body = { 
      systemInstruction: { parts: [{ text: agenticPrompt }] },
      contents: geminiMessages, 
      tools: [{ functionDeclarations: geminiTools }] 
    };
  } else {
    // Standard OpenAI compatible generic interface
    headers['Authorization'] = `Bearer ${apiKey}`;
    if (provider === 'openrouter') {
      headers['HTTP-Referer'] = 'https://wormgpt.app';
      headers['X-Title'] = 'WormGPT Extension';
    }
    
    let openaiTools = toolDefinitions.map(t => ({
      type: "function",
      function: { name: t.name, description: t.description, parameters: t.input_schema }
    }));

    body = {
      model: model || "gpt-4o",
      messages: [{ role: "system", content: systemInstruction }, ...messages],
      tools: openaiTools,
      tool_choice: "auto"
    };
  }

  const response = await fetch(url, { method: 'POST', headers, body: JSON.stringify(body) });
  if (!response.ok) {
    const errorRaw = await response.text();
    let errorSummary = errorRaw;
    try {
      const parsed = JSON.parse(errorRaw);
      errorSummary = parsed.error?.message || errorRaw;
    } catch(e) {}
    throw new Error(`${provider} API Request failed: ${response.status} - ${errorSummary}`);
  }
  
  const data = await response.json();

  // Normalize generic response parser
  let text = "";
  let tools = [];
  let stop_reason = "stop";

  if (provider === 'anthropic' || !provider) {
    stop_reason = data.stop_reason;
    for (let c of data.content) {
      if (c.type === 'text') text = c.text;
      if (c.type === 'tool_use') tools.push({ name: c.name, input: c.input });
    }
  } else if (provider === 'gemini') {
    const candidate = data.candidates?.[0];
    if (candidate) {
      stop_reason = candidate.content.parts.some(p => p.functionCall) ? 'tool_use' : 'stop';
      for (let p of candidate.content.parts) {
        if (p.text) text += p.text;
        if (p.functionCall) tools.push({ name: p.functionCall.name, input: p.functionCall.args });
      }
    }
  } else {
    const choice = data.choices?.[0];
    if (choice) {
       stop_reason = choice.finish_reason === 'tool_calls' ? 'tool_use' : 'stop';
       text = choice.message.content || "";
       if (choice.message.tool_calls) {
          for (let call of choice.message.tool_calls) {
             tools.push({ name: call.function.name, input: JSON.parse(call.function.arguments || '{}') });
          }
       }
    }
  }

  return { stop_reason, text, tools };
}

// Central Request Interceptor
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'RUN_AGENT') {
    (async () => {
      try {
        // Run active tab context gather
        const [targetTab] = await chrome.tabs.query({ active: true, currentWindow: true });
        
        if (!targetTab || !targetTab.url) {
          sendResponse({ error: "No valid active tab detected. Ensure you are viewing a standard webpage." });
          return;
        }

        if (!isSafeDomain(targetTab.url)) {
          sendResponse({ error: "Domain blocked by WormGPT security heuristics." });
          return;
        }

        let pageContextResponse = await new Promise(res => {
          chrome.tabs.sendMessage(targetTab.id, { action: 'GET_PAGE_CONTEXT' }, (response) => {
            if (chrome.runtime.lastError) {
               // Usually means content script isn't injected on restricted pages
               res(null);
            } else {
               res(response);
            }
          });
        });

        if (!pageContextResponse) {
          // Provide fallback context if content script fails
          pageContextResponse = {
             url: targetTab.url,
             title: targetTab.title,
             content_text: "[Content Script Injection Blocked - Cannot observe underlying page DOM. This may be due to browser restrictive policies e.g., on chrome:// URLs.]",
             action_map: {}
          };
        }

        await auditLog('AGENT_START', targetTab.url, { mode: request.mode });

        const storage = await chrome.storage.local.get(['wgpt_ext_provider', 'wgpt_ext_model', 'wgpt_ext_model_override', 'wgpt_ext_apikey', 'wgpt_ext_prompt']);
        
        let customPrompt = storage.wgpt_ext_prompt ? `\n[CUSTOM DIRECTIVE: ${storage.wgpt_ext_prompt}]\n` : '';

        // Build the system prompt
        const system = `You are the WormGPT browser extension agent operating in Mode: ${request.mode}.${customPrompt}
You have direct line-of-sight into the user's active browser tab.
Current URL: ${pageContextResponse.url}
Page Title: ${pageContextResponse.title}

DOM Context:
${pageContextResponse.content_text.substring(0, 10000)}

Available Interactables (IDs):
${JSON.stringify(pageContextResponse.action_map)}

Using the tools provided, analyze or interact with the page as requested. If using Autopilot, prefer 'browser_action'. If generating insights, 'browser_annotate'.`;

        const tools = [
          {
            name: "browser_highlight",
            description: "Highlights a specific element on the webpage. Use the interactable ID or a CSS selector.",
            input_schema: {
              type: "object",
              properties: { selector: { type: "string" }, color: { type: "string" } },
              required: ["selector"]
            }
          },
          {
             name: "browser_action",
             description: "Perform an action (click, fill) on the page. Only permitted in Autopilot Mode.",
             input_schema: {
               type: "object",
               properties: { selector: { type: "string" }, type: { type: "string", enum: ["click", "fill"] }, value: { type: "string" } },
               required: ["selector", "type"]
             }
          },
          {
             name: "browser_navigate",
             description: "Navigate the current active tab to a new URL.",
             input_schema: {
               type: "object",
               properties: { url: { type: "string" } },
               required: ["url"]
             }
          },
          {
             name: "get_windows_and_tabs",
             description: "List all currently open browser windows and tabs.",
             input_schema: { type: "object", properties: {} }
          },
          {
             name: "chrome_close_tabs",
             description: "Close specific tabs.",
             input_schema: { type: "object", properties: { tabIds: { type: "array", items: { type: "number" } } } }
          },
          {
             name: "chrome_switch_tab",
             description: "Switch to a specific browser tab.",
             input_schema: { type: "object", properties: { tabId: { type: "number" } }, required: ["tabId"] }
          },
          {
             name: "chrome_history",
             description: "Search browser history.",
             input_schema: { type: "object", properties: { text: { type: "string" }, maxResults: { type: "number" } }, required: ["text"] }
          },
          {
             name: "chrome_bookmark_search",
             description: "Search bookmarks.",
             input_schema: { type: "object", properties: { query: { type: "string" } }, required: ["query"] }
          },
          {
             name: "chrome_screenshot",
             description: "Take a screenshot of the active tab (returns base64).",
             input_schema: { type: "object", properties: {} }
          }
        ];

        // Send to LLM Provider
        const resolvedModel = storage.wgpt_ext_model_override || storage.wgpt_ext_model;
        const reply = await callLLMAPI(
           [{ role: 'user', content: request.userQuery }], 
           system, 
           tools,
           { provider: storage.wgpt_ext_provider, model: resolvedModel, apiKey: storage.wgpt_ext_apikey }
        );
        
        let toolExecutions = [];

        // Parse tool use (normalized across APIs)
        if (reply.stop_reason === 'tool_use' || reply.tools.length > 0) {
          for (let tool of reply.tools) {
             await auditLog('TOOL_CALL', targetTab.url, tool);
             
             // Proxy execution to Content Script
             if (tool.name === 'browser_highlight') {
                chrome.tabs.sendMessage(targetTab.id, { action: 'HIGHLIGHT', selector: tool.input.selector, color: tool.input.color });
                toolExecutions.push(`Tool 'highlight' dispatched.`);
             } else if (tool.name === 'browser_action' && request.mode === 'AUTOPILOT') {
                // Execute natively through MV3 bridge 
                chrome.tabs.sendMessage(targetTab.id, { action: 'ACTION', selector: tool.input.selector, type: tool.input.type, value: tool.input.value });
                toolExecutions.push(`Tool 'action' (${tool.input.type}) dispatched.`);
             } else if (tool.name === 'browser_navigate') {
                if (isSafeDomain(tool.input.url)) {
                   chrome.tabs.update(targetTab.id, { url: tool.input.url });
                   toolExecutions.push(`Tool 'navigate' to (${tool.input.url}) dispatched.`);
                } else {
                   toolExecutions.push(`Tool 'navigate' blocked.`);
                }
             } else if (tool.name === 'get_windows_and_tabs') {
                const windows = await chrome.windows.getAll({ populate: true });
                toolExecutions.push(`Found ${windows.length} windows.`);
             } else if (tool.name === 'chrome_switch_tab') {
                await chrome.tabs.update(tool.input.tabId, { active: true });
                toolExecutions.push(`Switched to tab ${tool.input.tabId}.`);
             } else if (tool.name === 'chrome_close_tabs') {
                await chrome.tabs.remove(tool.input.tabIds);
                toolExecutions.push(`Closed tabs: ${tool.input.tabIds}`);
             } else if (tool.name === 'chrome_history') {
                const results = await chrome.history.search({ text: tool.input.text, maxResults: tool.input.maxResults || 20 });
                toolExecutions.push(`Searched history: found ${results.length} matches.`);
             } else if (tool.name === 'chrome_bookmark_search') {
                const results = await chrome.bookmarks.search(tool.input.query);
                toolExecutions.push(`Searched bookmarks: found ${results.length} matches.`);
             } else if (tool.name === 'chrome_screenshot') {
                const dataUrl = await chrome.tabs.captureVisibleTab(targetTab.windowId, { format: 'png' });
                toolExecutions.push(`Captured screenshot base64 (${dataUrl.length} bytes).`);
             }
          }
        }

        const textOutput = reply.text || "Executed tool directives successfully.";
        sendResponse({ success: true, text: textOutput, toolsUsed: toolExecutions });
        
      } catch (err) {
        console.error("Agent Error:", err);
        sendResponse({ error: err.message });
      }
    })();
    return true; // Keep message channel open for async response
  }
});
