import { listProviders } from '../../src/providers/index.js';

export async function GET() {
  return Response.json({
    service: 'MiniProxy',
    version: '1.0.0',
    providers: listProviders(),
  });
}
