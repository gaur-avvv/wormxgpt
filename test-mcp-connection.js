// Test MCP Connection Script
// Run this in your browser console or as a standalone test

import { mcpService } from './services/mcp.ts';

async function testMCPConnection() {
  console.log('🧪 Testing MCP Connection...\n');

  // Test 1: Connect to Echo server (always available)
  console.log('1️⃣ Testing Echo server...');
  const echoUrl = 'https://echo.mcp.inevitable.fyi/mcp';
  const connected = await mcpService.connect(echoUrl);
  
  if (connected) {
    console.log('✅ Echo server connected successfully');
    
    // Test 2: List available tools
    console.log('\n2️⃣ Listing available tools...');
    const tools = await mcpService.getToolsByUrl(echoUrl);
    console.log(`✅ Found ${tools.length} tools:`, tools.map(t => t.name));
    
    // Test 3: Execute a tool
    if (tools.length > 0) {
      console.log('\n3️⃣ Testing tool execution...');
      try {
        const result = await mcpService.executeTool(tools[0].name, { 
          message: 'Test from WormGPT' 
        });
        console.log('✅ Tool executed successfully:', result);
      } catch (error) {
        console.error('❌ Tool execution failed:', error.message);
      }
    }
    
    // Test 4: Check status
    console.log('\n4️⃣ Connection status:');
    console.log('- Is Connected:', mcpService.isConnected);
    console.log('- Connected URLs:', mcpService.connectedUrls);
    console.log('- Tool Count:', mcpService.getToolCount(echoUrl));
    console.log('- Status:', mcpService.getStatus(echoUrl));
    
  } else {
    console.error('❌ Failed to connect to Echo server');
    console.log('Status:', mcpService.getStatus(echoUrl));
  }
  
  console.log('\n✨ Test complete!');
}

// Run the test
testMCPConnection().catch(console.error);
