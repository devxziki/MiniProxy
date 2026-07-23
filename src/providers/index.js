import opencode from './opencode.js';

const registry = { opencode };

export function getProvider(name) {
  return registry[name] || registry.opencode;
}

export function addProvider(id, provider) {
  registry[id] = provider;
}

export function listProviders() {
  return Object.entries(registry).map(([id, p]) => ({
    id,
    name: p.name || id,
    noAuth: !!p.noAuth,
    freeEndpoint: !!p.freeEndpoint,
  }));
}
