import { listProviders } from '../../../src/providers/index.js';

export async function GET() {
  return Response.json({ providers: listProviders() });
}
