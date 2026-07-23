import https from 'node:https';
import { URL } from 'node:url';

export async function GET() {
  return Response.json({ status: 'alive', version: 3 });
}

function httpsPost(url, data, stream) {
  const u = new URL(url);
  const body = JSON.stringify(data);
  return new Promise((resolve, reject) => {
    const headers = {
      'Content-Type': 'application/json',
      'User-Agent': 'MiniProxy/1.0',
      'Content-Length': Buffer.byteLength(body),
    };
    if (stream) headers['Accept'] = 'text/event-stream';
    const req = https.request(
      { hostname: u.hostname, path: u.pathname, method: 'POST', headers },
      (res) => {
        const chunks = [];
        res.on('data', (c) => chunks.push(c));
        res.on('end', () => resolve({ status: res.statusCode, body: Buffer.concat(chunks).toString() }));
      }
    );
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

export async function POST(req) {
  try {
    const body = await req.json();
    const { provider: _, stream, ...apiBody } = body;
    const up = await httpsPost('https://opencode.ai/zen/v1/chat/completions', { ...apiBody, stream }, stream);

    if (up.status < 200 || up.status >= 300) {
      return Response.json({ error: up.body.slice(0, 1000), status: up.status }, { status: up.status });
    }

    if (stream) {
      return new Response(up.body, {
        headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', 'Access-Control-Allow-Origin': '*' },
      });
    }

    const codes = [...up.body.slice(0, 20)].map(c => c.charCodeAt(0));
    return Response.json({ raw: up.body.slice(0, 300), codes, len: up.body.length });
  } catch (err) {
    return Response.json({ error: `[v3] ${err.message}`, stack: err.stack }, { status: 502 });
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
