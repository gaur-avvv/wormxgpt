import express from 'express';
import { chromeBridge } from '../services/chrome_mcp_integration';
import { mcpService } from '../services/mcp';

const app = express();
const PORT = 8888;
const TEST_URL = `http://localhost:${PORT}/test.html`;

// ── Dummy Test Page ──────────────────────────────────────────────────────────
const HTML = `
<!DOCTYPE html>
<html>
<head><title>Test Page</title></head>
<body>
  <nav id="nav">This is navigation, should be stripped.</nav>
  <main id="content">
    <h1>Integration Test</h1>
    <p id="target-text">Visible text block.</p>
    <a href="/link1">Link 1</a>
    <a href="/link2">Link 2</a>
    
    <label for="username">User</label>
    <input type="text" id="username" name="user" />
    <button id="submit-btn" onclick="document.getElementById('target-text').innerText = 'Clicked!'">Submit</button>

    <div id="dynamic" style="display:none;">Appeared!</div>
    <script>
      setTimeout(() => { document.getElementById('dynamic').style.display = 'block'; }, 1000);
    </script>
  </main>
  <aside>Ad block to be stripped</aside>
  <footer>Footer to be stripped</footer>
</body>
</html>
`;

app.get('/test.html', (req, res) => res.send(HTML));

// ── Test Runner ──────────────────────────────────────────────────────────────

async function assert<T>(name: string, p: Promise<T>, check: (res: T) => boolean) {
  const start = Date.now();
  let status = "❌ FAIL";
  let latencyMs = 0;
  try {
    const res = await p;
    latencyMs = Date.now() - start;
    if (check(res) && latencyMs < 3000) status = "✅ PASS"; // Ensure <3s latency constraint
    else if (latencyMs >= 3000) status = "⚠️ SLOW (>3s)";
  } catch (e: any) {
    console.error(`Error in ${name}:`, e.message);
  }
  console.log(`${status} | ${name} (${latencyMs}ms)`);
  return status === "✅ PASS";
}

async function runIntegrationSuite() {
  console.log("🚀 Starting Local Test Server...");
  const server = app.listen(PORT, () => console.log(`Server listening on ${PORT}`));

  try {
    console.log("\\n🔌 Connecting to local MCP Bridge (Ensure mcp-server.ts is running)...");
    
    // Connect to local proxy which hosts the chrome stdio bridge
    process.env.TESTING_ENV = "true";
    await mcpService.connect("http://localhost:3002/sse");
    
    // Give it a moment to fetch tools
    await new Promise(r => setTimeout(r, 2000));
    chromeBridge.onTurnStart(); // Reset rate limit

    console.log("\\n🧪 Running Tests...");

    await assert("1. page_navigate", 
      chromeBridge.page_navigate(TEST_URL, 500), 
      res => true // Navigate just needs to not throw
    );

    await assert("2. page_extract_text (Heuristic Nav/Footer Stripping)", 
      chromeBridge.page_extract_text(), 
      res => res.includes("Visible text block") && !res.includes("Footer to be stripped") && !res.includes("navigation, should be")
    );

    await assert("3. page_extract_links", 
      chromeBridge.page_extract_links(), 
      res => {
        try { const arr = JSON.parse(res); return arr.length > 0 && arr[0].href.includes('/link1'); } catch { return false; }
      }
    );

    await assert("4. page_fill", 
      chromeBridge.page_fill("#username", "TestUser123"), 
      res => true
    );

    await assert("5. page_click & dynamic execution", 
      chromeBridge.page_click("#submit-btn").then(() => chromeBridge.page_extract_text()), 
      res => res.includes("Clicked!")
    );

    await assert("6. page_wait_for (Async timeout element)", 
      chromeBridge.page_wait_for("#dynamic", 2000), 
      res => true
    );

    await assert("7. page_execute_js (Sandbox Test)", 
      chromeBridge.page_execute_js("return fetch('http://localhost:8888').then(r=>r.text());"), 
      res => res.includes("fetch is disabled in sandbox")
    );

    console.log("\\n📊 Audit Log:");
    console.table(chromeBridge.contextManager.getAuditLog());

  } catch (error: any) {
    console.error("Test Suite Error:", error);
  } finally {
    server.close();
    process.exit(0);
  }
}

runIntegrationSuite();
