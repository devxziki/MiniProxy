import { getProvider } from '../../../../src/providers/index.js';

const UPSTREAM = 'https://opencode.ai/zen/v1/chat/completions';

export async function POST(req) {
  try {
    const body = await req.json();
    const { provider: _, stream, ...apiBody } = body;

    const res = await fetch(UPSTREAM, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'MiniProxy/1.0',
        Accept: 'text/event-stream',
      },
      body: JSON.stringify({ ...apiBody, stream }),
    });

    if (!res.ok) {
      const text = await res.text();
      return Response.json({ error: text, status: res.status }, { status: res.status });
    }

    if (stream) {
      return new Response(res.body, {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Access-Control-Allow-Origin': '*',
        },
      });
    }

    const data = await res.json();
    return Response.json(data);
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
