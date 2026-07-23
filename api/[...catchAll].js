import { handleRequest } from '../src/proxy.js';

export default async function handler(req, res) {
  // Vercel strips the /api prefix — restore it so paths like /v1/... resolve correctly
  if (!req.url.startsWith('/api')) {
    req.url = '/api' + req.url;
  }
  await handleRequest(req, res);
}
