import { getProvider } from '../../../../src/providers/index.js';

const UPSTREAM = 'https://opencode.ai/zen/v1/chat/completions';

async function readBody(stream) {
  const reader = stream.getReader();
  const decoder = new TextDecoder();
  let text = '';
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    text += decoder.decode(value, { stream: !done });
  }
  return text;
}

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
      const text = await readBody(upstream.body);
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

    const raw = await readBody(upstream.body);
    try {
      const data = JSON.parse(raw);
      return Response.json(data);
    } catch {
      return Response.json({
        error: 'Upstream returned non-JSON response',
        preview: raw.slice(0, 500),
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
