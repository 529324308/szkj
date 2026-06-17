import GeoJSON from 'ol/format/GeoJSON';
import Polygon from 'ol/geom/Polygon';
import CircleGeom from 'ol/geom/Circle';
import { getDistance } from 'ol/sphere';
import { toLonLat } from 'ol/proj';

const LAND_PRICE_SOURCE_KEY = 'landPrice';
const LAND_PRICE_LEVEL_COLORS = {
  I: '#ef4444',
  II: '#facc15',
  III: '#22c55e',
  IV: '#3b82f6',
  V: '#06b6d4',
  VI: '#a855f7',
};
const LAND_PRICE_FALLBACK_COLORS = [
  '#f97316',
  '#14b8a6',
  '#8b5cf6',
  '#ec4899',
  '#84cc16',
  '#0ea5e9',
  '#eab308',
  '#f43f5e',
  '#10b981',
  '#6366f1',
  '#d946ef',
  '#64748b',
];
const geoJsonFormat = new GeoJSON();

export function useOpenLayersLandPrice(openLayersApi, callbacks = {}) {
  const nodeFeatures = new Map();
  const highlightedFeatures = new Set();

  function addNodeFeatures(nodeId, records, options = {}) {
    const key = String(nodeId ?? '');
    if (!key) return { count: 0 };
    removeNodeFeatures(key);
    const featureCollection = normalizeRecordsToFeatureCollection(records);
    if (!featureCollection.features.length) return { count: 0 };
    const features = geoJsonFormat.readFeatures(featureCollection, {
      dataProjection: 'EPSG:4326',
      featureProjection: 'EPSG:3857',
    });
    const total = featureCollection.features.length;
    features.forEach((feature, index) => {
      const sourceFeature = featureCollection.features[index] || {};
      markLandPriceFeature(feature, sourceFeature, key, index, total, options.visible !== false);
    });
    const source = getSource();
    features.forEach((feature) => source?.addFeature(feature));
    nodeFeatures.set(key, features);
    callbacks.onChange?.();
    return { count: features.length };
  }

  function removeNodeFeatures(nodeId) {
    const key = String(nodeId ?? '');
    if (!key) return;
    const source = getSource();
    const features = nodeFeatures.get(key) || [];
    features.forEach((feature) => {
      highlightedFeatures.delete(feature);
      source?.removeFeature(feature);
    });
    nodeFeatures.delete(key);
    callbacks.onChange?.();
  }

  function setVisible(visible) {
    getAllFeatures().forEach((feature) => {
      feature.set('visible', visible);
    });
    callbacks.onChange?.();
  }

  function clearHighlights() {
    highlightedFeatures.forEach((feature) => {
      feature.set('selected', false);
    });
    highlightedFeatures.clear();
  }

  function setHighlights(features = []) {
    clearHighlights();
    features.filter(Boolean).forEach((feature) => {
      feature.set('selected', true);
      highlightedFeatures.add(feature);
    });
  }

  function queryPoint(lon, lat) {
    const point = [Number(lon), Number(lat)];
    if (!isValidLonLat(point)) return [];
    return getQueryableFeatures().filter((feature) => pointInFeature(point, feature));
  }

  function queryRect(lonMin, latMin, lonMax, latMax) {
    const minLon = Math.min(Number(lonMin), Number(lonMax));
    const maxLon = Math.max(Number(lonMin), Number(lonMax));
    const minLat = Math.min(Number(latMin), Number(latMax));
    const maxLat = Math.max(Number(latMin), Number(latMax));
    if (![minLon, minLat, maxLon, maxLat].every(Number.isFinite)) return [];
    return getQueryableFeatures().filter((feature) => {
      const centroid = featureCentroidLonLat(feature);
      if (!centroid) return false;
      return centroid.longitude >= minLon && centroid.longitude <= maxLon && centroid.latitude >= minLat && centroid.latitude <= maxLat;
    });
  }

  function queryCircle(centerLon, centerLat, radiusMeters) {
    const center = [Number(centerLon), Number(centerLat)];
    const radius = Number(radiusMeters);
    if (!isValidLonLat(center) || !Number.isFinite(radius) || radius <= 0) return [];
    return getQueryableFeatures().filter((feature) => {
      const centroid = featureCentroidLonLat(feature);
      if (!centroid) return false;
      return getDistance(center, [centroid.longitude, centroid.latitude]) <= radius;
    });
  }

  function queryPolygon(ringLonLat) {
    const ring = closeRing((Array.isArray(ringLonLat) ? ringLonLat : []).filter(isValidLonLat));
    if (ring.length < 4) return [];
    return getQueryableFeatures().filter((feature) => {
      const centroid = featureCentroidLonLat(feature);
      return centroid ? pointInPolygon([centroid.longitude, centroid.latitude], [ring]) : false;
    });
  }

  function queryGeometry(toolType, geometry) {
    if (!geometry) return [];
    if (toolType === 'dianCircle' && geometry instanceof CircleGeom) {
      const center = geometry.getCenter();
      const radius = Number(geometry.getRadius() || 0);
      const centerLonLat = toLonLat(center);
      const edgeLonLat = toLonLat([center[0] + radius, center[1]]);
      return queryCircle(centerLonLat[0], centerLonLat[1], getDistance(centerLonLat, edgeLonLat));
    }
    const ring = geometryToLonLatRing(geometry);
    if (toolType === 'dianRect' && ring.length) {
      const lons = ring.map((point) => point[0]);
      const lats = ring.map((point) => point[1]);
      return queryRect(Math.min(...lons), Math.min(...lats), Math.max(...lons), Math.max(...lats));
    }
    if (toolType === 'dianPolygon' && ring.length) return queryPolygon(ring);
    return [];
  }

  function groupFeaturesByKey(features) {
    const map = new Map();
    (Array.isArray(features) ? features : []).filter(Boolean).forEach((feature) => {
      const key = featureKey(feature);
      if (!key) return;
      const group = map.get(key);
      if (group) group.entities.push(feature);
      else map.set(key, { key, entities: [feature], rep: feature });
    });
    return map;
  }

  function getAllFeatures() {
    return [...nodeFeatures.values()].flat();
  }

  function getQueryableFeatures() {
    return getAllFeatures().filter((feature) => feature?.get?.('visible') !== false);
  }

  function clearAll() {
    [...nodeFeatures.keys()].forEach(removeNodeFeatures);
    clearHighlights();
  }

  return {
    addNodeFeatures,
    removeNodeFeatures,
    setVisible,
    clearHighlights,
    setHighlights,
    queryPoint,
    queryRect,
    queryCircle,
    queryPolygon,
    queryGeometry,
    groupFeaturesByKey,
    getAllFeatures,
    clearAll,
  };

  function getSource() {
    return openLayersApi.getSource?.(LAND_PRICE_SOURCE_KEY);
  }
}

function normalizeRecordsToFeatureCollection(records) {
  const features = [];
  (Array.isArray(records) ? records : []).forEach((record, index) => {
    const raw = parseJsonObject(record?.geojsonRaw);
    if (!raw || raw.type !== 'Feature' || !raw.geometry) return;
    const extraProperties = parseJsonObject(record?.properties) || {};
    features.push({
      type: 'Feature',
      geometry: raw.geometry,
      properties: {
        ...(raw.properties || {}),
        ...extraProperties,
        id: record?.id,
        fid: record?.fid,
        geomType: record?.geomType,
        __djcxIndex: index + 1,
        __djcxTotal: records.length,
      },
    });
  });
  return { type: 'FeatureCollection', features };
}

function markLandPriceFeature(feature, sourceFeature, nodeId, index, total, visible) {
  const properties = { ...(sourceFeature?.properties || {}) };
  const order = Number(properties.__djcxIndex);
  const levelRoman = resolveLevelRoman(properties);
  const featureId = properties.id ?? properties.fid ?? properties.DKBH ?? properties.OBJECTID ?? `${nodeId}-${index + 1}`;
  const lineColor = colorForLevelRoman(levelRoman) || colorForStableKey(`${nodeId}:${featureId}:${index + 1}`);
  feature.setId(`djcx:${nodeId}:${featureId}`);
  feature.id = feature.getId();
  feature.setProperties({
    syKind: 'landPrice',
    layerKind: 'landPrice',
    visible,
    selected: false,
    name: properties.name || properties.NAME || properties.DKBH || `地价要素-${index + 1}`,
    label: shouldShowLevelLabel(nodeId, levelRoman) ? levelRoman : '',
    landPriceLevel: levelRoman,
    color: lineColor,
    fillColor: hexToRgba(lineColor, 0.7),
  });
  feature._djcxFeature = true;
  feature._djcxNodeId = String(nodeId);
  feature._djcxProperties = properties;
  feature._djcxGeojsonGeometry = sourceFeature?.geometry || null;
  feature._djcxOrder = Number.isFinite(order) ? Math.min(total || order, Math.max(1, order)) : index + 1;
  feature._djcxRoman = toRoman(feature._djcxOrder);
  feature._djcxLevelRoman = levelRoman;
  feature._djcxCentroid = null;
}

function parseJsonObject(value) {
  if (!value) return null;
  if (typeof value === 'object') return value;
  try {
    return JSON.parse(String(value));
  } catch {
    return null;
  }
}

function pointInFeature(point, feature) {
  const geometry = feature?._djcxGeojsonGeometry;
  if (!geometry) return false;
  if (geometry.type === 'Polygon') return pointInPolygon(point, geometry.coordinates);
  if (geometry.type === 'MultiPolygon') {
    return (Array.isArray(geometry.coordinates) ? geometry.coordinates : []).some((polygon) => pointInPolygon(point, polygon));
  }
  return false;
}

function featureCentroidLonLat(feature) {
  if (feature?._djcxCentroid) return feature._djcxCentroid;
  const geometry = feature?._djcxGeojsonGeometry;
  const ring = geometry?.type === 'Polygon'
    ? geometry.coordinates?.[0]
    : geometry?.type === 'MultiPolygon'
      ? geometry.coordinates?.[0]?.[0]
      : null;
  if (!Array.isArray(ring) || !ring.length) return null;
  let lonSum = 0;
  let latSum = 0;
  let count = 0;
  ring.forEach((point) => {
    if (!isValidLonLat(point)) return;
    lonSum += Number(point[0]);
    latSum += Number(point[1]);
    count += 1;
  });
  if (!count) return null;
  feature._djcxCentroid = { longitude: lonSum / count, latitude: latSum / count, height: 0 };
  return feature._djcxCentroid;
}

function pointInPolygon(point, coordinates) {
  const outer = coordinates?.[0];
  if (!Array.isArray(outer) || outer.length < 3) return false;
  if (!pointInRing(point, outer)) return false;
  for (let index = 1; index < coordinates.length; index += 1) {
    const hole = coordinates[index];
    if (Array.isArray(hole) && hole.length >= 3 && pointInRing(point, hole)) return false;
  }
  return true;
}

function pointInRing(point, ring) {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i, i += 1) {
    const xi = Number(ring[i]?.[0]);
    const yi = Number(ring[i]?.[1]);
    const xj = Number(ring[j]?.[0]);
    const yj = Number(ring[j]?.[1]);
    if (![xi, yi, xj, yj].every(Number.isFinite)) continue;
    const intersect = ((yi > point[1]) !== (yj > point[1])) && (point[0] < ((xj - xi) * (point[1] - yi)) / ((yj - yi) || 1e-12) + xi);
    if (intersect) inside = !inside;
  }
  return inside;
}

function geometryToLonLatRing(geometry) {
  if (!geometry) return [];
  if (geometry instanceof Polygon) {
    return closeRing((geometry.getCoordinates()?.[0] || []).map((coordinate) => toLonLat(coordinate)).filter(isValidLonLat));
  }
  return [];
}

function closeRing(ring) {
  const points = Array.isArray(ring) ? ring.slice() : [];
  if (!points.length) return points;
  const first = points[0];
  const last = points[points.length - 1];
  if (first?.[0] !== last?.[0] || first?.[1] !== last?.[1]) points.push([...first]);
  return points;
}

function isValidLonLat(point) {
  return Array.isArray(point) && Number.isFinite(Number(point[0])) && Number.isFinite(Number(point[1]));
}

function featureKey(feature) {
  const properties = feature?._djcxProperties || {};
  return String(properties.id ?? properties.fid ?? properties.DKBH ?? properties.OBJECTID ?? feature?.id ?? feature?.getId?.() ?? '');
}

function resolveLevelRoman(properties = {}) {
  const direct = properties._djcxLevelRoman || properties.levelRoman || properties.roman;
  if (direct) return String(direct);
  const raw = getProp(properties, ['土地级别', 'TDJB', 'tdjb', '级别', 'LEVEL', 'level']);
  const numeric = parseLevelNumber(raw);
  return Number.isFinite(numeric) ? toRoman(numeric) : '';
}

function getProp(properties, keys) {
  const lower = {};
  Object.keys(properties || {}).forEach((key) => {
    lower[String(key).toLowerCase()] = properties[key];
  });
  for (const key of Array.isArray(keys) ? keys : [keys]) {
    if (properties[key] != null && properties[key] !== '') return properties[key];
    const value = lower[String(key).toLowerCase()];
    if (value != null && value !== '') return value;
  }
  return undefined;
}

function parseLevelNumber(value) {
  const text = String(value ?? '').trim();
  if (!text) return NaN;
  const roman = romanToNumber(text);
  if (Number.isFinite(roman)) return roman;
  const direct = Number(text.replace(/[^\d.]/g, ''));
  if (Number.isFinite(direct) && direct > 0) return direct;
  const map = { 一: 1, 二: 2, 三: 3, 四: 4, 五: 5, 六: 6, 七: 7, 八: 8, 九: 9, 十: 10 };
  for (const [char, number] of Object.entries(map)) {
    if (text.includes(char)) return number;
  }
  return NaN;
}

function romanToNumber(value) {
  const text = String(value ?? '').trim().toUpperCase();
  const exact = { I: 1, II: 2, III: 3, IV: 4, V: 5, VI: 6 };
  if (exact[text]) return exact[text];
  return NaN;
}

function colorForLevelRoman(levelRoman) {
  return LAND_PRICE_LEVEL_COLORS[String(levelRoman || '').trim().toUpperCase()] || '';
}

function colorForStableKey(value) {
  const text = String(value ?? '');
  let hash = 0;
  for (let index = 0; index < text.length; index += 1) {
    hash = ((hash << 5) - hash + text.charCodeAt(index)) | 0;
  }
  const colorIndex = Math.abs(hash) % LAND_PRICE_FALLBACK_COLORS.length;
  return LAND_PRICE_FALLBACK_COLORS[colorIndex];
}

function hexToRgba(hex, alpha = 1) {
  const text = String(hex || '').replace('#', '').trim();
  if (!/^[\da-f]{6}$/i.test(text)) return hex;
  const red = parseInt(text.slice(0, 2), 16);
  const green = parseInt(text.slice(2, 4), 16);
  const blue = parseInt(text.slice(4, 6), 16);
  return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
}

function toRoman(num) {
  const n = Math.floor(Number(num));
  if (!Number.isFinite(n) || n <= 0) return '';
  const table = [
    [1000, 'M'], [900, 'CM'], [500, 'D'], [400, 'CD'],
    [100, 'C'], [90, 'XC'], [50, 'L'], [40, 'XL'],
    [10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I'],
  ];
  let rest = n;
  let out = '';
  table.forEach(([value, symbol]) => {
    while (rest >= value) {
      out += symbol;
      rest -= value;
    }
  });
  return out;
}

function shouldShowLevelLabel(nodeId, levelRoman) {
  return Boolean(levelRoman) && !['26', '27'].includes(String(nodeId));
}
