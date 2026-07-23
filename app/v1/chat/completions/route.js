export async function GET() {
  return Response.json({ status: 'alive', version: 2 });
}

export async function POST(req) {
  try {
    const body = await req.json();
    const { provider: _, stream, ...apiBody } = body;

    const headers = { 'Content-Type': 'application/json', 'User-Agent': 'MiniProxy/1.0' };
    if (stream) headers['Accept'] = 'text/event-stream';

    const res = await fetch('https://opencode.ai/zen/v1/chat/completions', {
      method: 'POST',
      headers,
      body: JSON.stringify({ ...apiBody, stream }),
    });

    if (!res.ok) {
      return Response.json({ error: await res.text(), status: res.status }, { status: res.status });
    }

    if (stream) {
      return new Response(res.body, {
        headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', 'Access-Control-Allow-Origin': '*' },
      });
    }

    return Response.json(await res.json());
  } catch (err) {
    return Response.json({ error: `[v2] ${err.message}`, stack: err.stack }, { status: 502 });
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
