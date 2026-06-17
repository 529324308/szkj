import Feature from 'ol/Feature';
import GeoJSON from 'ol/format/GeoJSON';
import KML from 'ol/format/KML';
import Point from 'ol/geom/Point';
import LineString from 'ol/geom/LineString';
import Polygon from 'ol/geom/Polygon';
import CircleGeom from 'ol/geom/Circle';
import { fromLonLat } from 'ol/proj';
import proj4 from 'proj4';
import { inflateRaw } from 'pako';

const IMPORT_SOURCE_KEY = 'imports';
const geoJsonFormat = new GeoJSON();
const kmlFormat = new KML({ extractStyles: false, showPointNames: true });

export function useOpenLayersImports(openLayersApi, callbacks = {}) {
  let order = 0;
  const items = [];
  const itemFeatures = new Map();
  let selectedItemKey = '';

  async function addShp(payload) {
    const name = String(payload?.name || '').trim() || `本地shapefile-${items.filter((item) => item.kind === 'shp').length + 1}`;
    const sourceFileName = String(payload?.sourceFileName || '').trim();
    const featureCollection = normalizeImportedGeoJson(payload?.geojson);
    if (!featureCollection.features.length) throw new Error('未解析到有效的 GeoJSON 要素');
    const itemKey = nextKey('shp');
    const metas = featureCollection.features.map((feature, index) => createImportedFeatureMeta(feature, itemKey, sourceFileName, name, index));
    const features = geoJsonFormat.readFeatures(featureCollection, {
      dataProjection: 'EPSG:4326',
      featureProjection: 'EPSG:3857',
    });
    features.forEach((feature, index) => markImportFeature(feature, {
      itemKey,
      kind: 'shp',
      name,
      sourceFileName,
      meta: metas[index],
      geometryType: featureCollection.features[index]?.geometry?.type,
    }));
    registerItem({ key: itemKey, kind: 'shp', name, sourceFileName, featureCount: features.length, order: ++order }, features);
    selectedItemKey = itemKey;
    fitFeatures(features);
    return { key: itemKey, count: features.length };
  }

  async function addKml(payload) {
    const file = payload?.file;
    if (!file) throw new Error('未检测到 KML/KMZ 文件');
    const rawName = String(payload?.name || '').trim();
    const sourceFileName = String(payload?.sourceFileName || file?.name || '').trim();
    const name = rawName || `本地KML-${items.filter((item) => item.kind === 'kml').length + 1}`;
    const itemKey = nextKey('kml');
    const kmlText = /\.kmz$/i.test(file.name || sourceFileName)
      ? await extractKmlTextFromKmz(file)
      : await file.text();
    const features = kmlFormat.readFeatures(kmlText, {
      dataProjection: 'EPSG:4326',
      featureProjection: 'EPSG:3857',
    });
    if (!features.length) throw new Error('KML/KMZ 中没有可显示要素');
    features.forEach((feature, index) => markImportFeature(feature, {
      itemKey,
      kind: 'kml',
      name,
      sourceFileName,
      meta: createImportedFeatureMeta({ properties: feature.getProperties(), geometry: { type: feature.getGeometry?.()?.getType?.() } }, itemKey, sourceFileName, name, index),
    }));
    registerItem({ key: itemKey, kind: 'kml', name, sourceFileName, order: ++order }, features);
    selectedItemKey = itemKey;
    fitFeatures(features);
    return { key: itemKey, count: features.length };
  }

  function addCad(payload) {
    const dxf = payload?.dxf;
    const entities = Array.isArray(dxf?.entities) ? dxf.entities : [];
    if (!entities.length) throw new Error('未检测到有效 DXF 实体');
    const spatialReference = payload?.spatialReference || null;
    const name = String(payload?.name || '').trim() || `本地CAD-${items.filter((item) => item.kind === 'cad').length + 1}`;
    const sourceFileName = String(payload?.sourceFileName || '').trim();
    const itemKey = nextKey('cad');
    const transform = createCadCoordinateTransform(openLayersApi.getMap?.(), dxf, spatialReference);
    const features = [];
    entities.forEach((entity) => {
      features.push(...cadEntityToFeatures(entity, transform, itemKey, name, sourceFileName));
    });
    if (!features.length) throw new Error('当前 DXF 中没有可显示的 CAD 实体');
    registerItem({
      key: itemKey,
      kind: 'cad',
      name,
      sourceFileName,
      coordinateSystemLabel: String(spatialReference?.coordinateSystemLabel || ''),
      sourceCount: entities.length,
      renderedCount: features.length,
      order: ++order,
    }, features);
    selectedItemKey = itemKey;
    fitFeatures(features);
    return { key: itemKey, count: features.length };
  }

  function registerItem(item, features) {
    const source = getSource();
    features.forEach((feature) => source?.addFeature(feature));
    items.push(item);
    itemFeatures.set(item.key, features);
    callbacks.onChange?.();
  }

  function getItems() {
    return items.slice()
      .sort((a, b) => (a.order || 0) - (b.order || 0))
      .map((item) => ({
        key: item.key,
        name: item.name,
        typeLabel: item.kind === 'shp' ? 'SHP' : (item.kind === 'kml' ? 'KML' : 'CAD'),
        checked: getFeatures(item.key).some((feature) => feature.get('visible') !== false),
        selected: selectedItemKey === item.key,
        kind: item.kind,
        sourceFileName: item.sourceFileName,
        subtitle: item.kind === 'shp'
          ? (item.sourceFileName || `共 ${item.featureCount} 个要素`)
          : (item.coordinateSystemLabel || item.sourceFileName || (item.kind === 'cad' ? `已绘制 ${item.renderedCount} / ${item.sourceCount} 个实体` : '')),
      }));
  }

  function getFeatures(itemKey) {
    return itemFeatures.get(itemKey) || [];
  }

  function setVisible(itemKey, visible) {
    getFeatures(itemKey).forEach((feature) => feature.set('visible', visible));
    if (!visible && selectedItemKey === itemKey) selectedItemKey = '';
    callbacks.onChange?.();
  }

  function selectItem(itemKey, options = {}) {
    clearSelection();
    selectedItemKey = itemKey || '';
    getFeatures(itemKey).forEach((feature) => feature.set('selected', true));
    if (options.locate !== false) fitFeatures(getFeatures(itemKey));
    callbacks.onChange?.();
  }

  function selectFeature(feature) {
    if (!feature?._syImportItemKey) return false;
    selectItem(feature._syImportItemKey, { locate: false });
    if (feature._syShpFeatureMeta) callbacks.onOpenFeaturePopup?.(feature._syShpFeatureMeta);
    return true;
  }

  function clearSelection() {
    if (selectedItemKey) getFeatures(selectedItemKey).forEach((feature) => feature.set('selected', false));
    selectedItemKey = '';
  }

  function deleteItem(itemKey) {
    const source = getSource();
    getFeatures(itemKey).forEach((feature) => source?.removeFeature(feature));
    itemFeatures.delete(itemKey);
    const index = items.findIndex((item) => item.key === itemKey);
    if (index >= 0) items.splice(index, 1);
    if (selectedItemKey === itemKey) selectedItemKey = '';
    callbacks.onChange?.();
  }

  function clearAll() {
    [...items].forEach((item) => deleteItem(item.key));
    clearSelection();
  }

  function fitItem(itemKey) {
    fitFeatures(getFeatures(itemKey));
  }

  return {
    addShp,
    addKml,
    addCad,
    getItems,
    getFeatures,
    setVisible,
    selectItem,
    selectFeature,
    clearSelection,
    deleteItem,
    clearAll,
    fitItem,
  };

  function getSource() {
    return openLayersApi.getSource?.(IMPORT_SOURCE_KEY);
  }

  function fitFeatures(features) {
    const extent = features.reduce((acc, feature) => {
      const featureExtent = feature.getGeometry?.()?.getExtent?.();
      if (!featureExtent) return acc;
      if (!acc) return featureExtent.slice();
      acc[0] = Math.min(acc[0], featureExtent[0]);
      acc[1] = Math.min(acc[1], featureExtent[1]);
      acc[2] = Math.max(acc[2], featureExtent[2]);
      acc[3] = Math.max(acc[3], featureExtent[3]);
      return acc;
    }, null);
    if (extent) openLayersApi.fitExtent?.(extent);
  }
}

function normalizeImportedGeoJson(rawGeoJson) {
  const sources = Array.isArray(rawGeoJson) ? rawGeoJson : [rawGeoJson];
  const features = [];
  sources.forEach((source) => {
    if (!source) return;
    if (source.type === 'FeatureCollection' && Array.isArray(source.features)) {
      features.push(...source.features);
    } else if (source.type === 'Feature') {
      features.push(source);
    } else if (source.type && source.coordinates) {
      features.push({ type: 'Feature', properties: {}, geometry: source });
    }
  });
  return {
    type: 'FeatureCollection',
    features: features.map((feature, index) => ({
      ...feature,
      properties: { ...(feature?.properties || {}), __syFeatureIndex: index },
    })),
  };
}

function createImportedFeatureMeta(feature, itemKey, sourceFileName, layerName, featureIndex) {
  const properties = cloneProperties(feature?.properties);
  const fallbackTitle = properties.name || properties.NAME || properties['名称'] || properties.title || properties.TITLE || `要素-${featureIndex + 1}`;
  return {
    itemKey,
    featureIndex,
    featureIndexDisplay: featureIndex + 1,
    title: String(fallbackTitle || `要素-${featureIndex + 1}`),
    subtitle: sourceFileName || '',
    layerName,
    sourceFileName,
    geometryType: String(feature?.geometry?.type || 'Unknown'),
    properties,
  };
}

function cloneProperties(properties) {
  if (!properties || typeof properties !== 'object') return {};
  const out = {};
  Object.entries(properties).forEach(([key, value]) => {
    if (key === 'geometry') return;
    if (value == null) out[key] = '';
    else if (typeof value === 'object') out[key] = JSON.stringify(value);
    else out[key] = value;
  });
  return out;
}

function markImportFeature(feature, meta) {
  const kind = meta.kind === 'cad' ? 'cad' : (meta.kind === 'kml' ? 'kml' : 'import');
  feature.setProperties({
    syKind: kind,
    layerKind: kind,
    name: meta.name,
    visible: true,
    selected: false,
    sourceFileName: meta.sourceFileName,
  });
  feature._syImportItemKey = meta.itemKey;
  if (meta.kind === 'shp') {
    feature._syShpItemKey = meta.itemKey;
    feature._syShpFeatureMeta = meta.meta;
  } else if (meta.kind === 'kml') {
    feature._syKmlItemKey = meta.itemKey;
  } else if (meta.kind === 'cad') {
    feature._syCadItemKey = meta.itemKey;
  }
}

async function extractKmlTextFromKmz(file) {
  const buffer = await file.arrayBuffer();
  const view = new DataView(buffer);
  let offset = 0;
  while (offset + 30 < view.byteLength) {
    const signature = view.getUint32(offset, true);
    if (signature !== 0x04034b50) break;
    const method = view.getUint16(offset + 8, true);
    const compressedSize = view.getUint32(offset + 18, true);
    const uncompressedSize = view.getUint32(offset + 22, true);
    const fileNameLength = view.getUint16(offset + 26, true);
    const extraLength = view.getUint16(offset + 28, true);
    const nameStart = offset + 30;
    const dataStart = nameStart + fileNameLength + extraLength;
    const fileName = new TextDecoder().decode(new Uint8Array(buffer, nameStart, fileNameLength));
    const data = new Uint8Array(buffer, dataStart, compressedSize);
    if (/\.kml$/i.test(fileName)) {
      if (method === 0) return new TextDecoder('utf-8').decode(data);
      if (method === 8) return new TextDecoder('utf-8').decode(inflateRaw(data, { to: 'uint8array', chunkSize: uncompressedSize || undefined }));
      throw new Error('KMZ 压缩格式暂不支持');
    }
    offset = dataStart + compressedSize;
  }
  throw new Error('KMZ 中未找到 KML 文件');
}

function nextKey(prefix) {
  return `${prefix}:${Date.now()}:${Math.random().toString(36).slice(2, 8)}`;
}

function cadColor(cadEntity) {
  const raw = Number(cadEntity?.color);
  if (!Number.isFinite(raw) || raw < 0) return '#39b8ff';
  const red = (raw >> 16) & 255;
  const green = (raw >> 8) & 255;
  const blue = raw & 255;
  return `rgb(${red}, ${green}, ${blue})`;
}

function createCadCoordinateTransform(map, dxf, spatialReference) {
  if (spatialReference?.coordinateSystem) {
    const definition = createCadProj4Definition(spatialReference);
    if (definition) return { mode: 'projected', definition, spatialReference };
  }
  const points = (Array.isArray(dxf?.entities) ? dxf.entities : [])
    .flatMap(cadCollectPointsFromEntity)
    .filter((point) => Number.isFinite(Number(point?.x)) && Number.isFinite(Number(point?.y)));
  const useDegrees = points.length > 0 && points.every((point) => Math.abs(Number(point.x)) <= 180 && Math.abs(Number(point.y)) <= 90);
  if (useDegrees) return { mode: 'degrees' };
  return { mode: 'local', origin: map?.getView?.()?.getCenter?.() || fromLonLat([119.48, 28.4585]) };
}

function createCadProj4Definition(spatialReference) {
  const centralMeridian = Number(spatialReference.centralMeridian);
  if (!Number.isFinite(centralMeridian)) return '';
  const ellipsoidMap = { WGS84: 'WGS84', XIAN80: 'intl', BEIJING54: 'krass' };
  const ellipsoid = ellipsoidMap[String(spatialReference.ellipsoid || '').toUpperCase()] || 'GRS80';
  return `+proj=tmerc +lat_0=0 +lon_0=${centralMeridian} +k=${Number(spatialReference.scaleFactor || 1)} +x_0=${Number(spatialReference.falseEasting || 0)} +y_0=${Number(spatialReference.falseNorthing || 0)} +ellps=${ellipsoid} +units=m +no_defs`;
}

function cadApplyTransformParams(point, spatialReference) {
  const x = Number(point?.x);
  const y = Number(point?.y);
  const z = Number(point?.z || 0);
  if (!Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(z)) return null;
  const transform = spatialReference?.transformation || {};
  if (!transform?.enabled) return { x, y, z };
  const dx = Number(transform.xTranslate || 0);
  const dy = Number(transform.yTranslate || 0);
  const rotation = Number(transform.rotation || 0);
  const factor = 1 + Number(transform.scale || 0);
  return {
    x: dx + factor * (x * Math.cos(rotation) - y * Math.sin(rotation)),
    y: dy + factor * (x * Math.sin(rotation) + y * Math.cos(rotation)),
    z,
  };
}

function cadPointToCoordinate(point, transform) {
  if (transform?.mode === 'projected') {
    const nextPoint = cadApplyTransformParams(point, transform.spatialReference);
    if (!nextPoint) return null;
    const lonLat = proj4(transform.definition, 'WGS84', [nextPoint.x, nextPoint.y]);
    return fromLonLat(lonLat);
  }
  const x = Number(point?.x);
  const y = Number(point?.y);
  if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
  if (transform?.mode === 'degrees') return fromLonLat([x, y]);
  return [Number(transform.origin?.[0] || 0) + x, Number(transform.origin?.[1] || 0) + y];
}

function cadCollectPointsFromEntity(entity) {
  if (!entity || typeof entity !== 'object') return [];
  if (entity.type === 'LINE' || entity.type === 'LWPOLYLINE' || entity.type === 'POLYLINE') return Array.isArray(entity.vertices) ? entity.vertices : [];
  if (entity.type === 'CIRCLE' || entity.type === 'ARC' || entity.type === 'ELLIPSE') return entity.center ? [entity.center] : [];
  if (entity.type === 'POINT') return entity.position ? [entity.position] : [];
  if (entity.type === 'TEXT') return entity.startPoint ? [entity.startPoint] : [];
  if (entity.type === 'MTEXT') return entity.position ? [entity.position] : [];
  if (entity.type === 'SPLINE') return Array.isArray(entity.controlPoints) ? entity.controlPoints : [];
  return [];
}

function cadEntityToFeatures(cadEntity, transform, itemKey, name, sourceFileName) {
  const color = cadColor(cadEntity);
  const baseProps = {
    syKind: 'cad',
    layerKind: 'cad',
    color,
    name: cadEntity.layer || cadEntity.type || name,
    visible: true,
    selected: false,
    sourceFileName,
  };
  const mark = (feature) => {
    feature.setProperties(baseProps);
    feature._syImportItemKey = itemKey;
    feature._syCadItemKey = itemKey;
    return feature;
  };
  if (cadEntity.type === 'LINE' || cadEntity.type === 'LWPOLYLINE' || cadEntity.type === 'POLYLINE') {
    const coords = (cadEntity.vertices || []).map((point) => cadPointToCoordinate(point, transform)).filter(Boolean);
    if (coords.length < 2) return [];
    const closed = Boolean(cadEntity.shape) || (coords.length > 2 && sameCoordinate(coords[0], coords[coords.length - 1]));
    if (closed && !sameCoordinate(coords[0], coords[coords.length - 1])) coords.push([...coords[0]]);
    const feature = mark(new Feature(closed && coords.length >= 4 ? new Polygon([coords]) : new LineString(coords)));
    return [feature];
  }
  if (cadEntity.type === 'CIRCLE') {
    const center = cadPointToCoordinate(cadEntity.center, transform);
    const radius = Number(cadEntity.radius);
    if (!center || !Number.isFinite(radius) || radius <= 0) return [];
    return [mark(new Feature(new CircleGeom(center, radius)))];
  }
  if (cadEntity.type === 'ARC') {
    const coords = sampleCadArc(cadEntity).map((point) => cadPointToCoordinate(point, transform)).filter(Boolean);
    return coords.length >= 2 ? [mark(new Feature(new LineString(coords)))] : [];
  }
  if (cadEntity.type === 'POINT' || cadEntity.type === 'TEXT' || cadEntity.type === 'MTEXT') {
    const point = cadEntity.type === 'POINT' ? cadEntity.position : (cadEntity.type === 'TEXT' ? cadEntity.startPoint : cadEntity.position);
    const coord = cadPointToCoordinate(point, transform);
    if (!coord) return [];
    const feature = mark(new Feature(new Point(coord)));
    if (cadEntity.type !== 'POINT') feature.set('label', normalizeCadText(cadEntity.text));
    return [feature];
  }
  return [];
}

function sampleCadArc(entity, segmentCount = 72) {
  const center = entity.center;
  const radius = Number(entity.radius);
  const start = Number(entity.startAngle);
  let end = Number(entity.endAngle);
  if (!center || !Number.isFinite(radius) || !Number.isFinite(start) || !Number.isFinite(end)) return [];
  if (end <= start) end += Math.PI * 2;
  const segments = Math.max(12, Math.ceil(segmentCount * ((end - start) / (Math.PI * 2))));
  const points = [];
  for (let i = 0; i <= segments; i += 1) {
    const angle = start + ((end - start) * i) / segments;
    points.push({ x: Number(center.x) + Math.cos(angle) * radius, y: Number(center.y) + Math.sin(angle) * radius, z: Number(center.z || 0) });
  }
  return points;
}

function sameCoordinate(a, b) {
  return Array.isArray(a) && Array.isArray(b) && Math.abs(a[0] - b[0]) < 1e-9 && Math.abs(a[1] - b[1]) < 1e-9;
}

function normalizeCadText(text) {
  return String(text || '')
    .replace(/\\P/gi, ' ')
    .replace(/\\X/gi, ' ')
    .replace(/\^I/g, ' ')
    .replace(/\{\\[^}]*;/g, '')
    .replace(/[{}]/g, '')
    .trim();
}
