/**
 * Vercel Edge Function — MCP Universal Proxy
 *
 * Handles ALL MCP transport types:
 *   - StreamableHTTP (POST /mcp, GET /mcp for SSE stream)
 *   - Legacy SSE (GET /sse for event stream)
 *   - DELETE /mcp (session termination)
 *   - OPTIONS (preflight)
 *
 * Usage: /api/mcp-proxy?url=<encoded_target_url>
 *
 * The browser MCP SDK makes fetch() calls to this proxy instead of
 * directly to the MCP server, bypassing CORS restrictions on Vercel.
 */

export const config = { runtime: 'edge' };

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': [
    'Content-Type',
    'Accept',
    'Authorization',
    'mcp-session-id',
    'mcp-protocol-version',
    'Last-Event-ID',
    'Cache-Control',
  ].join(', '),
  'Access-Control-Expose-Headers': 'mcp-session-id, mcp-protocol-version',
};

// Headers to forward from client → upstream
const FORWARD_REQUEST_HEADERS = new Set([
  'content-type',
  'accept',
  'authorization',
  'mcp-session-id',
  'mcp-protocol-version',
  'last-event-id',
  'cache-control',
]);

// Headers to forward from upstream → client
const FORWARD_RESPONSE_HEADERS = new Set([
  'content-type',
  'cache-control',
  'mcp-session-id',
  'mcp-protocol-version',
  'x-accel-buffering',
  'transfer-encoding',
]);

export default async function handler(req) {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }

  const { searchParams } = new URL(req.url);
  const targetUrl = searchParams.get('url');

  // Validate target URL
  if (!targetUrl) {
    return jsonError(400, 'Missing ?url= parameter');
  }

  let parsed;
  try {
    parsed = new URL(targetUrl);
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      return jsonError(400, 'Only http/https targets allowed');
    }
  } catch {
    return jsonError(400, 'Invalid target URL');
  }

  // Build forwarded headers
  const forwardHeaders = new Headers();
  for (const [key, value] of req.headers.entries()) {
    if (FORWARD_REQUEST_HEADERS.has(key.toLowerCase())) {
      forwardHeaders.set(key, value);
    }
  }

  // For SSE streams, ensure correct Accept header
  const accept = req.headers.get('accept') || '';
  if (!forwardHeaders.has('accept')) {
    forwardHeaders.set('Accept', 'text/event-stream, application/json');
  }

  try {
    const upstream = await fetch(targetUrl, {
      method: req.method,
      headers: forwardHeaders,
      body: req.method !== 'GET' && req.method !== 'HEAD' ? req.body : undefined,
      // Edge runtime: don't buffer — stream directly
      duplex: 'half',
    });

    // Build response headers
    const responseHeaders = new Headers(CORS_HEADERS);

    for (const [key, value] of upstream.headers.entries()) {
      if (FORWARD_RESPONSE_HEADERS.has(key.toLowerCase())) {
        responseHeaders.set(key, value);
      }
    }

    const contentType = upstream.headers.get('content-type') || '';

    // SSE stream — pipe directly without buffering
    if (contentType.includes('text/event-stream')) {
      responseHeaders.set('Content-Type', 'text/event-stream');
      responseHeaders.set('Cache-Control', 'no-cache, no-transform');
      responseHeaders.set('X-Accel-Buffering', 'no'); // Disable nginx buffering on Vercel

      return new Response(upstream.body, {
        status: upstream.status,
        headers: responseHeaders,
      });
    }

    // JSON / regular response — pass through as-is
    return new Response(upstream.body, {
      status: upstream.status,
      headers: responseHeaders,
    });

  } catch (err) {
    return jsonError(502, `Upstream error: ${err.message}`);
  }
}

function jsonError(status, message) {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  });
}
