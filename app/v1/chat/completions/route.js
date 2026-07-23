import { getProvider } from '../../../../src/providers/index.js';

export async function POST(req) {
  const body = await req.json();
  const providerId = body.provider || req.headers.get('x-provider') || 'opencode';
  const provider = getProvider(providerId);
  const { provider: _, ...apiBody } = body;

  try {
    const upstream = await provider.chatCompletion(apiBody, Object.fromEntries(req.headers));

    if (!upstream.ok) {
      const text = await upstream.text();
      let err;
      try { err = JSON.parse(text); } catch { err = { error: text }; }
      return Response.json(err, { status: upstream.status });
    }

    if (apiBody.stream) {
      return new Response(upstream.body, {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Access-Control-Allow-Origin': '*',
        },
      });
    }

    const data = await upstream.json();
    return Response.json(data);
  } catch (err) {
    return Response.json({ error: `Upstream request failed: ${err.message}` }, { status: 502 });
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
