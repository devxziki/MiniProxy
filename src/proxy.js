import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { getProvider, listProviders } from './providers/index.js';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Provider',
};

function html(res, content, status = 200) {
  for (const [k, v] of Object.entries(CORS)) res.setHeader(k, v);
  res.writeHead(status, { 'Content-Type': 'text/html; charset=utf-8' });
  res.end(content);
}

function json(res, status, data) {
  for (const [k, v] of Object.entries(CORS)) res.setHeader(k, v);
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(data));
}

const __dirname = dirname(fileURLToPath(import.meta.url));
let DASHBOARD_HTML = '';
try {
  DASHBOARD_HTML = readFileSync(join(__dirname, 'dashboard.html'), 'utf-8');
} catch {
  // dashboard file not found — will fall back to JSON
}

export async function handleRequest(req, res) {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const { pathname } = url;

  if (req.method === 'OPTIONS') {
    for (const [k, v] of Object.entries(CORS)) res.setHeader(k, v);
    res.writeHead(204);
    res.end();
    return;
  }

  if (pathname === '/dashboard' && DASHBOARD_HTML) {
    return html(res, DASHBOARD_HTML);
  }

  if (pathname === '/health') {
    return json(res, 200, {
      service: 'MiniProxy',
      version: '1.0.0',
      providers: listProviders(),
    });
  }

  if (pathname === '/' || pathname === '/index.html') {
    if (DASHBOARD_HTML) return html(res, DASHBOARD_HTML);
    return json(res, 200, {
      service: 'MiniProxy',
      version: '1.0.0',
      providers: listProviders(),
    });
  }

  if (pathname === '/v1/providers') {
    return json(res, 200, { providers: listProviders() });
  }

  if (pathname === '/v1/models') {
    const provider = getProvider(url.searchParams.get('provider') || 'opencode');
    const freeOnly = url.searchParams.get('freeOnly') === 'true';
    try {
      const data = await provider.listModels({ freeOnly });
      return json(res, 200, data);
    } catch (err) {
      return json(res, 502, { error: `Failed to fetch models: ${err.message}` });
    }
  }

  if (pathname === '/v1/chat/completions' && req.method === 'POST') {
    let raw = '';
    for await (const chunk of req) raw += chunk;

    let body;
    try { body = JSON.parse(raw); } catch (err) {
      return json(res, 400, { error: `Invalid JSON: ${err.message}` });
    }

    const provider = getProvider(body.provider || req.headers['x-provider'] || 'opencode');
    const { provider: _, ...apiBody } = body;

    try {
      const upstream = await provider.chatCompletion(apiBody, req.headers);

      if (!upstream.ok) {
        const text = await upstream.text();
        let err;
        try { err = JSON.parse(text); } catch { err = { error: text }; }
        return json(res, upstream.status, err);
      }

      if (apiBody.stream) {
        for (const [k, v] of Object.entries(CORS)) res.setHeader(k, v);
        res.writeHead(200, {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          Connection: 'keep-alive',
        });

        const reader = upstream.body.getReader();
        const decoder = new TextDecoder();
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) { res.end(); break; }
            res.write(decoder.decode(value, { stream: !done }));
          }
        } catch {
          if (!res.writableEnded) res.end();
        }
      } else {
        const data = await upstream.json();
        return json(res, 200, data);
      }
    } catch (err) {
      return json(res, 502, { error: `Upstream request failed: ${err.message}` });
    }
    return;
  }

  json(res, 404, { error: 'Not found' });
}
