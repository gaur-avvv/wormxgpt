import { mcpService } from "./mcp";

// ── Security Constraints ───────────────────────────────────────────────────

export const ALLOWED_DOMAINS = ["*"]; // default allow all, unless explicitly denied
export const DENIED_DOMAINS = [
  "localhost", 
  "127.0.0.1", 
  "169.254.169.254", // AWS metadata
  "::1",
  "internal.domain",
  "bank.com" // Example sensitive domain
];

/** Check if a URL is permitted under the current security policy */
function isUrlAllowed(urlStr: string): boolean {
  try {
    const parsed = new URL(urlStr);
    const hostname = parsed.hostname.toLowerCase();
    
    // Explicit deny
    if (DENIED_DOMAINS.some(d => hostname === d || hostname.endsWith(`.${d}`))) {
      // We allow localhost EXPLICITLY during automated tests, so we need a backdoor if testing mode is on.
      if (hostname === "localhost" && process.env.TESTING_ENV === "true") return true;
      return false;
    }
    
    // In strict mode, you might check ALLOWED_DOMAINS here, 
    // but default configuration acts as an open browser proxy minus blocklist.
    return true;
  } catch {
    return false; // Malformed URLs are blocked
  }
}

// ── Rate Limiter ────────────────────────────────────────────────────────────

class TurnRateLimiter {
  private callCount = 0;
  private maxPerTurn: number;

  constructor(maxPerTurn: number = 10) {
    this.maxPerTurn = maxPerTurn;
  }

  recordCall() {
    this.callCount++;
    if (this.callCount > this.maxPerTurn) {
      throw new Error(`[Security] Browser rate limit exceeded. Max ${this.maxPerTurn} actions per turn.`);
    }
  }

  reset() {
    this.callCount = 0;
  }
}

// ── Context Manager ─────────────────────────────────────────────────────────

class PageContextManager {
  private executionLog: Array<{ timestamp: number; action: string; url?: string; durationMs?: number }> = [];

  logAction(action: string, url?: string, durationMs?: number) {
    this.executionLog.push({ timestamp: Date.now(), action, url, durationMs });
    console.log(`[Chrome MCP 🌐] ${action} ${url ? `-> ${url}` : ''} ${durationMs ? `(${durationMs}ms)` : ''}`);
  }

  getAuditLog() {
    return [...this.executionLog];
  }

  /**
   * Applies heuristic DOM cleaning to extract core content.
   * Removing <nav>, <footer>, <aside>, <script>, <style> nodes via JS executed on the page.
   * This is generally injected via `page_execute_js` prior to text extraction.
   */
  getReadabilityHeuristicScript(): string {
    return `
      (() => {
        const killList = ['nav', 'footer', 'aside', 'script', 'style', 'noscript', 'iframe', 'header', '.ad', '#ads', '[role="navigation"]', '[role="banner"]', '.sidebar'];
        killList.forEach(selector => {
          document.querySelectorAll(selector).forEach(el => el.remove());
        });
        return document.body.innerText;
      })();
    `;
  }
}

// ── Chrome Integration Facade ───────────────────────────────────────────────

export class ChromeBrowserIntegration {
  public limiter = new TurnRateLimiter(10);
  public contextManager = new PageContextManager();

  // Reset the turn counter before each orchestration loop
  onTurnStart() {
    this.limiter.reset();
  }

  // 1. Navigate
  async page_navigate(url: string, wait_time: number = 2000): Promise<string> {
    this.limiter.recordCall();
    if (!isUrlAllowed(url)) throw new Error(`[Security] Navigation to ${url} is blocked by policy.`);
    
    const start = Date.now();
    try {
      const res = await mcpService.executeTool("chrome_navigate", { url });
      
      // Wait for page to settle
      if (wait_time > 0) {
        await new Promise(r => setTimeout(r, wait_time));
      }

      this.contextManager.logAction("navigate", url, Date.now() - start);
      return res;
    } catch (e: any) {
      this.contextManager.logAction("navigate_failed", url, Date.now() - start);
      throw e;
    }
  }

  // 2. Screenshot -> Base64
  async page_screenshot(targetSelector?: string): Promise<string> {
    this.limiter.recordCall();
    const start = Date.now();
    const res = await mcpService.executeTool("chrome_screenshot", { selector: targetSelector });
    this.contextManager.logAction("screenshot", undefined, Date.now() - start);
    return res; 
  }

  // 3. Extract visible text (heuristically cleaned)
  async page_extract_text(): Promise<string> {
    this.limiter.recordCall();
    const start = Date.now();
    
    // Instead of raw chrome_get_web_content, we use inject_script to run our stripper
    const script = this.contextManager.getReadabilityHeuristicScript();
    const res = await this.page_execute_js(script);
    
    this.contextManager.logAction("extract_text", undefined, Date.now() - start);
    return res;
  }

  // 4. Extract links
  async page_extract_links(): Promise<string> {
    this.limiter.recordCall();
    const start = Date.now();
    const script = `
      (() => {
        const links = Array.from(document.querySelectorAll('a[href]'));
        return JSON.stringify(links.map(a => ({ text: a.innerText.trim(), href: a.href })).filter(a => a.text && a.href));
      })();
    `;
    const res = await this.page_execute_js(script);
    this.contextManager.logAction("extract_links", undefined, Date.now() - start);
    return res;
  }

  // 5. Click
  async page_click(selector: string): Promise<string> {
    this.limiter.recordCall();
    const start = Date.now();
    const res = await mcpService.executeTool("chrome_click_element", { selector });
    // short settle
    await new Promise(r => setTimeout(r, 500));
    this.contextManager.logAction("click", selector, Date.now() - start);
    return res;
  }

  // 6. Fill input
  async page_fill(selector: string, value: string): Promise<string> {
    this.limiter.recordCall();
    const start = Date.now();
    const res = await mcpService.executeTool("chrome_fill_or_select", { selector, value });
    this.contextManager.logAction("fill", selector, Date.now() - start);
    return res;
  }

  // 7. Wait For element
  async page_wait_for(selector: string, timeoutMs: number = 5000): Promise<string> {
    this.limiter.recordCall();
    const start = Date.now();
    
    // Poll the DOM
    const script = `
      (async () => {
        return new Promise((resolve, reject) => {
          if (document.querySelector('${selector}')) return resolve(true);
          const observer = new MutationObserver(() => {
            if (document.querySelector('${selector}')) {
              observer.disconnect();
              resolve(true);
            }
          });
          observer.observe(document.body, { childList: true, subtree: true });
          setTimeout(() => { observer.disconnect(); reject(new Error("Timeout waiting for element")); }, ${timeoutMs});
        });
      })();
    `;
    
    const res = await mcpService.executeTool("chrome_inject_script", { script });
    this.contextManager.logAction("wait_for", selector, Date.now() - start);
    return res;
  }

  // 8. Execute JS (Sandboxed)
  async page_execute_js(script: string): Promise<string> {
    this.limiter.recordCall();
    const start = Date.now();
    
    // Sandboxing wrapper:
    // We override global fetch and XHR to prevent the injected script from making lateral requests 
    // (SSRF via browser) or exfiltrating data, forcing the script to only operate on the DOM.
    const sandboxedScript = `
      (() => {
        const fetch = function() { throw new Error('Security: fetch is disabled in sandbox'); };
        const XMLHttpRequest = function() { throw new Error('Security: XHR is disabled in sandbox'); };
        const navigator = new Proxy(window.navigator, { get: (t, p) => p === 'sendBeacon' ? function() { throw new Error('sendBeacon disabled'); } : t[p as keyof Navigator] });
        
        try {
          // Wrapped anonymous function to contain scope
          return (function() {
            ${script}
          })();
        } catch (e) {
          return "Script Error: " + e.message;
        }
      })();
    `;

    const res = await mcpService.executeTool("chrome_inject_script", { script: sandboxedScript });
    this.contextManager.logAction("execute_js", undefined, Date.now() - start);
    return res;
  }
}

export const chromeBridge = new ChromeBrowserIntegration();
