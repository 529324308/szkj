const DEFAULT_ADAPTER_TYPE = 'cheerio-list-detail';

export function normalizePolicySourceInput(input = {}) {
  return {
    name: String(input.name || '').trim(),
    baseUrl: String(input.baseUrl || '').trim(),
    adapterType: String(input.adapterType || DEFAULT_ADAPTER_TYPE).trim(),
    enabled: input.enabled !== false,
    description: String(input.description || '').trim(),
    tags: Array.isArray(input.tags)
      ? input.tags.map((item) => String(item || '').trim()).filter(Boolean)
      : [],
    config: input.config && typeof input.config === 'object' && !Array.isArray(input.config)
      ? input.config
      : {}
  };
}

export function validatePolicySourceInput(input = {}) {
  const errors = [];

  if (!input.name) {
    errors.push('name is required.');
  }

  if (!input.baseUrl) {
    errors.push('baseUrl is required.');
  } else {
    try {
      new URL(input.baseUrl);
    } catch {
      errors.push('baseUrl must be a valid URL.');
    }
  }

  if (!input.adapterType) {
    errors.push('adapterType is required.');
  }

  return errors;
}

export function createPolicySourceRecord(input = {}) {
  const normalized = normalizePolicySourceInput(input);
  const now = new Date().toISOString();
  const id = input.id || buildPolicySourceId(normalized.name);

  return {
    id,
    ...normalized,
    createdAt: input.createdAt || now,
    updatedAt: now
  };
}

function buildPolicySourceId(name) {
  const base = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  const suffix = Math.random().toString(36).slice(2, 8);
  return `source-${base || 'policy'}-${suffix}`;
}
