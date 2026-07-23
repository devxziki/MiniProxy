const BASE_URL = 'https://opencode.ai/zen/v1';

export default {
  id: 'opencode',
  name: 'OpenCode Free',
  website: 'https://opencode.ai',
  baseUrl: BASE_URL,
  noAuth: true,
  freeEndpoint: true,

  async chatCompletion(body, headers) {
    const reqHeaders = { 'Content-Type': 'application/json' };
    if (body.stream) reqHeaders['Accept'] = 'text/event-stream';

    const auth = headers?.authorization || headers?.Authorization;
    if (auth) reqHeaders['Authorization'] = auth;

    return fetch(`${BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: reqHeaders,
      body: JSON.stringify(body),
    });
  },

  async listModels(opts = {}) {
    const res = await fetch(`${BASE_URL}/models`);
    const json = await res.json();
    if (opts.freeOnly && json.data) {
      json.data = json.data.filter(m => m.id.includes('-free'));
    }
    return json;
  },
};
