// Simple script to test the MCP server connectivity via SSE
// Native fetch is used (Node 18+)

async function testMCP() {
    console.log("Connecting to MCP Server at http://localhost:3002/sse...");
    try {
        const response = await fetch('http://localhost:3002/sse');
        if (response.ok) {
            console.log("✅ SSE Connection successful!");
        } else {
            console.log("❌ SSE Connection failed: " + response.statusText);
        }

        // Test list_tools simulator (this wouldn't work via simple GET, but verifies server is up)
        console.log("Checking server info...");
        // In a real test, we would use @modelcontextprotocol/sdk client to speak SSE
        console.log("Manual test tip: Run 'npm run mcp' and then use the MCP Inspector.");
    } catch (e) {
        console.log("❌ Error: Is the server running? Run 'npm run mcp' first.");
    }
}

testMCP();
