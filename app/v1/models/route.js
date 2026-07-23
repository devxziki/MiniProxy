import { getProvider } from '../../../src/providers/index.js';

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const providerId = searchParams.get('provider') || 'opencode';
  const freeOnly = searchParams.get('freeOnly') === 'true';

  const provider = getProvider(providerId);
  try {
    const data = await provider.listModels({ freeOnly });
    return Response.json(data);
  } catch (err) {
    return Response.json({ error: `Failed to fetch models: ${err.message}` }, { status: 502 });
  }
}
