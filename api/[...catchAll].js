import { handleRequest } from '../src/proxy.js';

// Vercel rewrites preserve the original URL, so /v1/chat/completions
// arrives as-is — just pass it straight to the handler.
export default async function handler(req, res) {
  await handleRequest(req, res);
}
