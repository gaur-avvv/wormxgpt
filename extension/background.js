/**
 * background.js
 * Service Worker orchestrating AI LLM streams and MV3 Security constraints.
 */

// Global Configuration
const BLOCKLIST_REGEX = /bank|medical|health|gov|secure|auth/i;

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
    geminiMessages.unshift({ role: 'user', parts: [{ text: `SYSTEM INSTRUCTION:\n${systemInstruction}` }]});
    
    let geminiTools = toolDefinitions.map(t => ({
      name: t.name,
      description: t.description,
      parameters: t.input_schema
    }));

    body = { contents: geminiMessages, tools: [{ functionDeclarations: geminiTools }] };
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
  if (!response.ok) throw new Error(`${provider} API Request failed: ${response.status}`);
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

        const storage = await chrome.storage.local.get(['wgpt_ext_provider', 'wgpt_ext_model', 'wgpt_ext_apikey', 'wgpt_ext_prompt']);
        
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
          }
        ];

        // Send to LLM Provider
        const reply = await callLLMAPI(
           [{ role: 'user', content: request.userQuery }], 
           system, 
           tools,
           { provider: storage.wgpt_ext_provider, model: storage.wgpt_ext_model, apiKey: storage.wgpt_ext_apikey }
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
