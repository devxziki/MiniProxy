import { getProvider } from '../../../../src/providers/index.js';

const UPSTREAM = 'https://opencode.ai/zen/v1/chat/completions';

export async function POST(req) {
  try {
    const body = await req.json();
    const { provider: _, stream, ...apiBody } = body;

    const headers = { 'Content-Type': 'application/json' };
    if (stream) headers['Accept'] = 'text/event-stream';

    const upstream = await fetch(UPSTREAM, {
      method: 'POST',
      headers,
      body: JSON.stringify({ ...apiBody, stream }),
    });

    if (!upstream.ok) {
      const text = await upstream.text();
      return Response.json({ error: text, status: upstream.status }, { status: upstream.status });
    }

    if (stream) {
      return new Response(upstream.body, {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Access-Control-Allow-Origin': '*',
        },
      });
    }

    const raw = await upstream.text();
    try {
      const data = JSON.parse(raw);
      return Response.json(data);
    } catch {
      return Response.json({
        error: 'Upstream returned non-JSON response',
        body: raw.slice(0, 500),
        status: upstream.status,
      }, { status: 502 });
    }
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
