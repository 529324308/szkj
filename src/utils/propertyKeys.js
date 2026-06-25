import { getPropertyKeys } from '../api/map';

const propertyKeyMap = new Map();
let loaded = false;
let loadingPromise = null;

export async function ensurePropertyKeyMapLoaded() {
  if (loaded) return propertyKeyMap;
  if (loadingPromise) return loadingPromise;

  loadingPromise = (async () => {
    const response = await getPropertyKeys();
    const list = Array.isArray(response) ? response : (response?.data || response?.list || []);
    propertyKeyMap.clear();

    (Array.isArray(list) ? list : []).forEach((item) => {
      if (!item || item.isValid === false) return;
      const oldKey = normalizeKey(item.propertyOldKey);
      const newKey = String(item.propertyNewKey ?? '').trim();
      if (!oldKey || !newKey) return;
      propertyKeyMap.set(oldKey, newKey);
    });

    loaded = true;
    return propertyKeyMap;
  })().finally(() => {
    loadingPromise = null;
  });

  return loadingPromise;
}

export function resolvePropertyName(key) {
  const rawKey = String(key ?? '');
  const mapped = propertyKeyMap.get(normalizeKey(rawKey));
  return mapped || rawKey;
}

export function mapPropertyNames(properties, options = {}) {
  const source = properties && typeof properties === 'object' ? properties : {};
  const includeUnmapped = options.includeUnmapped !== false;
  const skipKeys = new Set(options.skipKeys || []);
  const out = {};

  Object.entries(source).forEach(([key, value]) => {
    if (!key || skipKeys.has(key)) return;
    if (value == null || value === '') return;
    const mappedKey = resolvePropertyName(key);
    if (!includeUnmapped && mappedKey === key) return;
    setUniqueProperty(out, mappedKey, value);
  });

  return out;
}

export function isPropertyKeyMapLoaded() {
  return loaded;
}

function normalizeKey(key) {
  return String(key ?? '').trim().toLowerCase();
}

function setUniqueProperty(target, key, value) {
  if (!Object.prototype.hasOwnProperty.call(target, key)) {
    target[key] = value;
    return;
  }

  let index = 2;
  let nextKey = `${key}-${index}`;
  while (Object.prototype.hasOwnProperty.call(target, nextKey)) {
    index += 1;
    nextKey = `${key}-${index}`;
  }
  target[nextKey] = value;
}
