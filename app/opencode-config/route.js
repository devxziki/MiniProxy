import { getProvider } from '../../src/providers/index.js';

const CONTEXT_LENGTHS = {
  'deepseek-v4-flash-free': 200000,
  'mimo-v2.5-free': 200000,
  'nemotron-3-ultra-free': 200000,
  'north-mini-code-free': 200000,
  'laguna-s-2.1-free': 200000,
};

const CAPABILITIES = {
  'deepseek-v4-flash-free': { reasoning: true, temperature: true, tool_call: true },
  'mimo-v2.5-free': { temperature: true, tool_call: true },
  'nemotron-3-ultra-free': { temperature: true, tool_call: true },
  'north-mini-code-free': { temperature: true, tool_call: true },
  'laguna-s-2.1-free': { temperature: true, tool_call: true },
};

function buildModels(raw, labels) {
  const models = {};
  const rows = raw?.data || raw?.models || [];
  for (const m of rows) {
    const id = m.id;
    if (!id) continue;
    const caps = CAPABILITIES[id] || { temperature: true, tool_call: true };
    const entry = { name: labels[id] || id };
    if (caps.reasoning) entry.reasoning = true;
    if (caps.temperature) entry.temperature = true;
    if (caps.tool_call) entry.tool_call = true;
    entry.limit = { context: CONTEXT_LENGTHS[id] || 200000 };
    models[id] = entry;
  }
  return models;
}

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const host = req.headers.get('x-forwarded-host') || req.headers.get('host') || 'localhost:3000';
  const protocol = req.headers.get('x-forwarded-proto') || 'http';
  const baseURL = `${protocol}://${host}`;

  const provider = getProvider('opencode');
  const raw = await provider.listModels({ freeOnly: true });
  const models = buildModels(raw, {
    'deepseek-v4-flash-free': 'DeepSeek V4 Flash Free',
    'mimo-v2.5-free': 'MiMo V2.5 Free',
    'nemotron-3-ultra-free': 'Nemotron 3 Ultra Free',
    'north-mini-code-free': 'North Mini Code Free',
    'laguna-s-2.1-free': 'Laguna S 2.1 Free',
  });

  const modelIds = Object.keys(models);
  const defaultModel = modelIds.includes('deepseek-v4-flash-free') ? 'deepseek-v4-flash-free' : (modelIds[0] || '');
  const smallModel = modelIds.includes('mimo-v2.5-free') ? 'mimo-v2.5-free' : (defaultModel || '');

  const config = {
    $schema: 'https://opencode.ai/config.json',
    provider: {
      miniproxy: {
        npm: '@ai-sdk/openai-compatible',
        name: 'MiniProxy',
        options: {
          baseURL: `${baseURL}/v1`,
          apiKey: '',
        },
        models,
      },
    },
  };

  if (defaultModel) config.model = `miniproxy/${defaultModel}`;
  if (smallModel && smallModel !== defaultModel) config.small_model = `miniproxy/${smallModel}`;

  return Response.json(config, {
    headers: {
      'Content-Type': 'application/json',
      'Content-Disposition': 'attachment; filename="opencode.json"',
    },
  });
}
