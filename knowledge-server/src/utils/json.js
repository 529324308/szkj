export function safeParseJson(text, fallback = null) {
  try {
    return JSON.parse(text);
  } catch {
    return fallback;
  }
}

export function extractJsonObject(text) {
  const source = String(text || '').trim();
  if (!source) return null;

  const direct = safeParseJson(source, null);
  if (direct && typeof direct === 'object') {
    return direct;
  }

  const match = source.match(/\{[\s\S]*\}/);
  if (!match) {
    return null;
  }

  const embedded = safeParseJson(match[0], null);
  return embedded && typeof embedded === 'object' ? embedded : null;
}
