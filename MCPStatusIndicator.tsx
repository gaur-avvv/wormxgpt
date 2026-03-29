import React, { useEffect, useState } from 'react';
import { mcpService } from './services/mcp';

export function MCPStatusIndicator() {
  const [status, setStatus] = useState({
    isConnected: false,
    connectedUrls: [] as string[],
    toolCount: 0
  });

  useEffect(() => {
    const checkStatus = async () => {
      const tools = await mcpService.getTools();
      setStatus({
        isConnected: mcpService.isConnected,
        connectedUrls: mcpService.connectedUrls,
        toolCount: tools.length
      });
    };

    checkStatus();
    const interval = setInterval(checkStatus, 5000); // Check every 5 seconds
    return () => clearInterval(interval);
  }, []);

  return (
    <div style={{
      position: 'fixed',
      bottom: 10,
      right: 10,
      padding: '8px 12px',
      background: status.isConnected ? '#10b981' : '#ef4444',
      color: 'white',
      borderRadius: 6,
      fontSize: 12,
      fontFamily: 'monospace',
      zIndex: 9999
    }}>
      <div>
        {status.isConnected ? '🟢' : '🔴'} MCP: {status.isConnected ? 'Connected' : 'Disconnected'}
      </div>
      {status.isConnected && (
        <>
          <div>Servers: {status.connectedUrls.length}</div>
          <div>Tools: {status.toolCount}</div>
        </>
      )}
    </div>
  );
}
