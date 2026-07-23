import https from 'node:https';

const UPSTREAM = { hostname: 'opencode.ai', path: '/zen/v1/chat/completions', method: 'POST' };

function upstream(body) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body);
    const headers = { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data), 'User-Agent': 'MiniProxy/1.0' };
    if (body.stream) headers['Accept'] = 'text/event-stream';
    const req = https.request({ ...UPSTREAM, headers }, (res) => {
      const chunks = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', () => resolve({
        status: res.statusCode,
        body: Buffer.concat(chunks).toString(),
        headers: res.headers,
      }));
    });
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

export async function POST(req) {
  try {
    const body = await req.json();
    const { provider: _, stream, ...apiBody } = body;

    const up = await upstream({ ...apiBody, stream });

    if (up.status < 200 || up.status >= 300) {
      return Response.json({ error: up.body.slice(0, 1000), status: up.status }, { status: up.status });
    }

    // For streaming: return as SSE response
    if (stream) {
      // Buffered fallback for now — pipe through text
      return new Response(up.body, {
        headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', 'Access-Control-Allow-Origin': '*' },
      });
    }

    return Response.json(JSON.parse(up.body));
  } catch (err) {
    return Response.json({ error: err.message, stack: err.stack }, { status: 502 });
  }
}

export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Provider',
    },
  });
}
