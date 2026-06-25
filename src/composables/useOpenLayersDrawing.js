import Feature from 'ol/Feature';
import Draw, { createBox } from 'ol/interaction/Draw';
import Point from 'ol/geom/Point';
import LineString from 'ol/geom/LineString';
import Polygon from 'ol/geom/Polygon';
import CircleGeom from 'ol/geom/Circle';
import { fromLonLat, toLonLat } from 'ol/proj';
import {
  angleDegrees,
  bearingDegrees,
  calculateTriangulatedEarthwork,
  circleToPolygon,
  formatMeasureArea,
  formatMeasureLength,
  geometryToPointRows,
  getAreaSqMeters,
  getLengthMeters,
  segmentStatsFromRows,
  triangulatePointRows,
} from '../utils/mapGeometry';

const DRAW_SOURCE_KEY = 'measure';
const QUERY_SOURCE_KEY = 'query';
const DEFAULT_MEASURE_FORM = {
  name: '',
  unit: 'auto',
  path: '测绘/默认',
  desc: '',
  lengthMeters: 0,
  areaSqMeters: 0,
  heightMeters: 0,
  volumeCubicMeters: 0,
  longitude: null,
  latitude: null,
  elevationMeters: null,
  kind: '',
};

export function useOpenLayersDrawing(openLayersApi, callbacks = {}) {
  let drawInteraction = null;
  let order = 0;
  let idCounter = 0;
  let selectedFeature = null;

  const autoCounters = {
    distance: 0,
    polygon: 0,
    rect: 0,
    circle: 0,
    volume: 0,
    azimuth: 0,
    angle: 0,
    markPoint: 0,
  };

  function startTool(type) {
    stopInteraction();
    if (!type) return false;
    if (type === 'markPoint') return startDraw(type, 'Point');
    if (type === 'drawLine' || type === 'measureDistance' || type === 'measureAzimuth') return startDraw(type, 'LineString');
    if (type === 'drawPolygon' || type === 'measureArea' || type === 'measureVolume' || type === 'measureAngle' || type === 'dianPolygon') return startDraw(type, 'Polygon', { sourceKey: type === 'dianPolygon' ? QUERY_SOURCE_KEY : DRAW_SOURCE_KEY });
    if (type === 'drawCircle' || type === 'dianCircle') return startDraw(type, 'Circle', { sourceKey: type === 'dianCircle' ? QUERY_SOURCE_KEY : DRAW_SOURCE_KEY });
    if (type === 'drawRect' || type === 'dianRect') return startDraw(type, 'Circle', {
      geometryFunction: createBox(),
      sourceKey: type === 'dianRect' ? QUERY_SOURCE_KEY : DRAW_SOURCE_KEY,
    });
    return false;
  }

  function startDraw(toolType, drawType, options = {}) {
    const map = openLayersApi.getMap?.();
    const source = openLayersApi.getSource?.(options.sourceKey || DRAW_SOURCE_KEY);
    if (!map || !source) return false;
    if (toolType.startsWith('dian')) source.clear();
    drawInteraction = new Draw({
      source,
      type: drawType,
      geometryFunction: options.geometryFunction,
    });
    drawInteraction.on('drawstart', () => {
      callbacks.onHint?.(resolveHint(toolType, true));
    });
    drawInteraction.on('drawend', (event) => {
      const feature = event.feature;
      window.setTimeout(() => finalizeFeature(toolType, feature, options.sourceKey || DRAW_SOURCE_KEY), 0);
    });
    map.addInteraction(drawInteraction);
    callbacks.onHint?.(resolveHint(toolType, false));
    return true;
  }

  function finalizeFeature(toolType, feature, sourceKey) {
    stopInteraction();
    if (!feature) return;
    if (toolType.startsWith('dian')) {
      markQueryFeature(feature, toolType);
      callbacks.onQueryComplete?.({ toolType, feature, geometry: feature.getGeometry?.() });
      callbacks.onFinished?.(toolType);
      return;
    }
    if (toolType === 'markPoint') {
      finalizeMarkPoint(feature);
    } else {
      finalizeMeasure(toolType, feature);
    }
    selectFeature(feature);
    callbacks.onFinished?.(toolType);
  }

  function finalizeMarkPoint(feature) {
    const geometry = feature.getGeometry();
    const [longitude, latitude] = toLonLat(geometry.getCoordinates());
    const name = autoName('markPoint');
    feature.setId(nextId('markPoint'));
    feature.setProperties({
      syKind: 'markPoint',
      layerKind: 'markPoint',
      name,
      label: name,
      selected: false,
      visible: true,
    });
    feature._syMarkPointData = { name, desc: '', longitude, latitude, elevationMeters: 0, kind: 'markPoint' };
    feature._syUserVisible = true;
    feature._syListOrder = ++order;
    callbacks.onCreate?.({ kind: 'markPoint', feature, data: feature._syMarkPointData });
  }

  function finalizeMeasure(toolType, feature) {
    const geometry = feature.getGeometry();
    const kind = resolveMeasureKind(toolType);
    const name = autoName(resolveNameKind(toolType));
    const points = normalizeRowsForTool(toolType, geometry);
    const stats = segmentStatsFromRows(points);
    const lengthMeters = resolveLength(toolType, geometry, points);
    const areaSqMeters = resolveArea(toolType, geometry);
    const extra = resolveExtra(toolType, points);
    const earthwork = toolType === 'measureVolume' ? calculateTriangulatedEarthwork(points) : null;
    const data = {
      ...DEFAULT_MEASURE_FORM,
      ...extra,
      points,
      segmentsMeters: stats.segmentsMeters,
      cumulativeMeters: stats.cumulativeMeters,
      lengthMeters,
      areaSqMeters: earthwork?.areaSqMeters || areaSqMeters,
      kind,
      name,
      unit: 'auto',
      desc: '',
      heightMeters: earthwork?.averageHeightMeters || 0,
      volumeCubicMeters: earthwork?.volumeCubicMeters || 0,
      volumeTriangles: earthwork?.triangles || [],
    };
    feature.setId(nextId('measure'));
    feature.setProperties({
      syKind: kind,
      layerKind: 'measure',
      name,
      label: name,
      selected: false,
      visible: true,
      measureLabel: buildMeasureLabel(data, geometry),
    });
    feature._measureData = data;
    if (toolType === 'measureVolume') attachTriangleGrid(feature, points);
    feature._syUserVisible = true;
    feature._syListOrder = ++order;
    callbacks.onCreate?.({ kind: 'measure', feature, data });
  }

  function handlePickedFeature(feature) {
    if (!feature) return false;
    if (feature._measureData || feature._syMarkPointData) {
      selectFeature(feature);
      callbacks.onSelect?.(feature);
      return true;
    }
    return false;
  }

  function selectFeature(feature) {
    if (selectedFeature && selectedFeature !== feature) selectedFeature.set('selected', false);
    selectedFeature = feature || null;
    if (selectedFeature) selectedFeature.set('selected', true);
  }

  function clearSelection() {
    if (selectedFeature) selectedFeature.set('selected', false);
    selectedFeature = null;
  }

  function setFeatureVisible(feature, visible) {
    if (!feature) return;
    feature._syUserVisible = visible;
    feature.set('visible', visible);
    feature._volumeGridFeatures?.forEach((gridFeature) => gridFeature.set('visible', visible));
    if (!visible && selectedFeature === feature) clearSelection();
  }

  function deleteFeature(feature) {
    if (!feature) return;
    if (selectedFeature === feature) clearSelection();
    removeTriangleGrid(feature);
    getDrawSource()?.removeFeature(feature);
  }

  function clearAll() {
    stopInteraction();
    clearSelection();
    getDrawSource()?.clear();
    getQuerySource()?.clear();
  }

  function clearQueries() {
    getQuerySource()?.clear();
  }

  function getItems() {
    return getDrawSource()?.getFeatures()
      .filter((feature) => feature?._measureData || feature?._syMarkPointData)
      .sort((a, b) => (a._syListOrder || 0) - (b._syListOrder || 0))
      .map((feature) => {
        if (feature._syMarkPointData) {
          return {
            key: `markPoint:${feature.getId()}`,
            name: feature._syMarkPointData.name || feature.get('name') || '标点',
            typeLabel: '标点',
            checked: feature._syUserVisible !== false,
            selected: selectedFeature === feature,
            kind: 'markPoint',
            entity: feature,
            feature,
            subtitle: feature._syMarkPointData.desc || '',
          };
        }
        return {
          key: `measure:${feature.getId()}`,
          name: feature._measureData?.name || inferMeasureItemType(feature),
          typeLabel: inferMeasureItemType(feature),
          checked: feature._syUserVisible !== false,
          selected: selectedFeature === feature,
          kind: 'measure',
          entity: feature,
          feature,
          subtitle: feature._measureData?.desc || '',
        };
      }) || [];
  }

  function fitFeature(feature) {
    if (feature) openLayersApi.fitFeature?.(feature);
  }

  function updateFeatureDataFromPanel(feature, panelData = {}) {
    if (!feature) return;
    if (feature._syMarkPointData) {
      Object.assign(feature._syMarkPointData, panelData);
      feature.set('name', feature._syMarkPointData.name || '标点');
      feature.set('label', feature._syMarkPointData.name || '标点');
      const longitude = Number(feature._syMarkPointData.longitude);
      const latitude = Number(feature._syMarkPointData.latitude);
      if (Number.isFinite(longitude) && Number.isFinite(latitude)) {
        feature.setGeometry(new Point(fromLonLat([longitude, latitude])));
      }
      return;
    }
    if (feature._measureData) {
      const next = {
        ...feature._measureData,
        ...panelData,
      };
      if (next.kind === 'volume' && Array.isArray(next.volumeTriangles) && next.volumeTriangles.length) {
        next.volumeCubicMeters = next.volumeTriangles.reduce((sum, triangle) => sum + (Number(triangle.volumeCubicMeters) || 0), 0);
        next.heightMeters = next.areaSqMeters > 0 ? next.volumeCubicMeters / next.areaSqMeters : 0;
      } else {
        next.volumeCubicMeters = (Number(next.areaSqMeters) || 0) * (Number(next.heightMeters) || 0);
      }
      feature._measureData = next;
      feature.set('name', next.name || feature.get('name'));
      feature.set('label', next.name || feature.get('label'));
      feature.set('measureLabel', buildMeasureLabel(next, feature.getGeometry?.()));
    }
  }

  function stopInteraction() {
    const map = openLayersApi.getMap?.();
    if (map && drawInteraction) map.removeInteraction(drawInteraction);
    drawInteraction = null;
    callbacks.onHint?.('');
  }

  function destroy() {
    stopInteraction();
    clearSelection();
  }

  return {
    startTool,
    stopInteraction,
    handlePickedFeature,
    selectFeature,
    clearSelection,
    setFeatureVisible,
    deleteFeature,
    clearAll,
    clearQueries,
    getItems,
    fitFeature,
    updateFeatureDataFromPanel,
    destroy,
  };

  function getDrawSource() {
    return openLayersApi.getSource?.(DRAW_SOURCE_KEY);
  }

  function getQuerySource() {
    return openLayersApi.getSource?.(QUERY_SOURCE_KEY);
  }

  function attachTriangleGrid(feature, rows) {
    removeTriangleGrid(feature);
    const source = getDrawSource();
    if (!source || !feature) return;
    const triangles = triangulatePointRows(rows);
    feature._volumeGridFeatures = triangles.map((triangle) => {
      const ring = triangle.points.map((point) => fromLonLat([point.lon, point.lat]));
      ring.push([...ring[0]]);
      const gridFeature = new Feature(new Polygon([ring]));
      gridFeature.setId(nextId('volume-grid'));
      gridFeature.setProperties({
        syKind: 'volumeGrid',
        layerKind: 'measure',
        visible: feature._syUserVisible !== false,
        parentMeasureId: feature.getId?.(),
        selectable: false,
      });
      gridFeature._volumeGridFor = feature;
      source.addFeature(gridFeature);
      return gridFeature;
    });
  }

  function removeTriangleGrid(feature) {
    const source = getDrawSource();
    feature?._volumeGridFeatures?.forEach((gridFeature) => source?.removeFeature(gridFeature));
    if (feature) feature._volumeGridFeatures = [];
  }

  function nextId(prefix) {
    idCounter += 1;
    return `ol-${prefix}-${Date.now()}-${idCounter}`;
  }

  function autoName(kind) {
    const labels = { distance: '线', polygon: '面', rect: '矩形', circle: '圆', volume: '方量', azimuth: '方位角', angle: '夹角', markPoint: '标点' };
    autoCounters[kind] = (autoCounters[kind] || 0) + 1;
    return `${labels[kind] || '图形'}-${autoCounters[kind]}`;
  }
}

export function createFeatureFromLonLat(lonLat, properties = {}) {
  const feature = new Feature(new Point(fromLonLat(lonLat)));
  feature.setProperties(properties);
  return feature;
}

function resolveMeasureKind(toolType) {
  if (toolType === 'measureDistance' || toolType === 'drawLine') return 'distance';
  if (toolType === 'measureVolume') return 'volume';
  if (toolType === 'measureAzimuth') return 'azimuth';
  if (toolType === 'measureAngle') return 'angle';
  return 'area';
}

function resolveNameKind(toolType) {
  if (toolType === 'measureDistance' || toolType === 'drawLine') return 'distance';
  if (toolType === 'measureVolume') return 'volume';
  if (toolType === 'drawRect') return 'rect';
  if (toolType === 'drawCircle') return 'circle';
  if (toolType === 'measureAzimuth') return 'azimuth';
  if (toolType === 'measureAngle') return 'angle';
  return 'polygon';
}

function normalizeRowsForTool(toolType, geometry) {
  if (toolType === 'measureAzimuth') return geometryToPointRows(new LineString(geometry.getCoordinates().slice(0, 2)));
  if (toolType === 'measureAngle') return geometryToPointRows(new LineString(geometry.getCoordinates()[0]?.slice(0, 3) || []));
  return geometryToPointRows(geometry);
}

function resolveLength(toolType, geometry, points) {
  if (toolType === 'measureAngle') return 0;
  if (toolType === 'measureAzimuth') {
    const coords = points.map((point) => fromLonLat([point.lon, point.lat]));
    return coords.length >= 2 ? getLengthMeters(new LineString(coords.slice(0, 2))) : 0;
  }
  return getLengthMeters(geometry);
}

function resolveArea(toolType, geometry) {
  if (['drawPolygon', 'measureArea', 'measureVolume', 'drawRect', 'drawCircle'].includes(toolType)) return getAreaSqMeters(geometry);
  return 0;
}

function resolveExtra(toolType, points) {
  if (toolType === 'measureAzimuth' && points.length >= 2) {
    return { azimuthDegrees: bearingDegrees([points[0].lon, points[0].lat], [points[1].lon, points[1].lat]) };
  }
  if (toolType === 'measureAngle' && points.length >= 3) {
    return { angleDegrees: angleDegrees([points[0].lon, points[0].lat], [points[1].lon, points[1].lat], [points[2].lon, points[2].lat]) };
  }
  return {};
}

function buildMeasureLabel(data, geometry) {
  if (data.kind === 'distance') return formatMeasureLength(geometry);
  if (data.kind === 'azimuth') return `${(data.azimuthDegrees || 0).toFixed(2)}°`;
  if (data.kind === 'angle') return `${(data.angleDegrees || 0).toFixed(2)}°`;
  if (data.areaSqMeters > 0) return formatMeasureArea(geometry);
  return '';
}

function markQueryFeature(feature, toolType) {
  feature.setProperties({
    syKind: 'query',
    layerKind: 'query',
    queryTool: toolType,
    visible: true,
  });
}

function inferMeasureItemType(feature) {
  const kind = feature?._measureData?.kind;
  if (kind === 'distance') return '线';
  if (kind === 'volume') return '方量';
  if (kind === 'azimuth') return '方位角';
  if (kind === 'angle') return '夹角';
  const geometry = feature?.getGeometry?.();
  if (geometry instanceof CircleGeom) return '圆';
  if (geometry instanceof Polygon) {
    const ring = geometry.getCoordinates()?.[0] || [];
    if (ring.length === 5 && looksLikeAxisAlignedRectangle(ring)) return '矩形';
    return '面';
  }
  return '图形';
}

function looksLikeAxisAlignedRectangle(ring) {
  if (!Array.isArray(ring) || ring.length !== 5) return false;
  const first = ring[0];
  const last = ring[4];
  if (!sameCoordinate(first, last)) return false;
  const xs = [...new Set(ring.slice(0, 4).map((point) => roundCoord(point?.[0])))];
  const ys = [...new Set(ring.slice(0, 4).map((point) => roundCoord(point?.[1])))];
  return xs.length === 2 && ys.length === 2;
}

function sameCoordinate(a, b) {
  return Array.isArray(a) && Array.isArray(b) && Math.abs(Number(a[0]) - Number(b[0])) < 1e-6 && Math.abs(Number(a[1]) - Number(b[1])) < 1e-6;
}

function roundCoord(value) {
  return Math.round(Number(value) * 1e6) / 1e6;
}

function resolveHint(type, drawing) {
  const hints = {
    markPoint: drawing ? '点击地图添加标点' : '点击地图添加标点',
    drawLine: drawing ? '点击增加点，双击结束' : '点击地图开始画线',
    drawPolygon: drawing ? '点击增加点，双击结束' : '点击地图开始画多边形',
    drawCircle: drawing ? '移动鼠标调整半径，再次点击完成' : '点击选择圆心',
    drawRect: drawing ? '移动鼠标调整范围，再次点击完成' : '点击选择起点',
    measureDistance: drawing ? '点击增加点，双击结束' : '点击地图开始测距',
    measureArea: drawing ? '点击增加点，双击结束' : '点击地图开始测面积',
    measureVolume: drawing ? '点击增加点，双击结束' : '点击地图选择范围',
    measureAzimuth: drawing ? '点击终点查看方位角' : '点击起点',
    measureAngle: drawing ? '点击顶点和第三点完成' : '点击第一个点',
    dianPolygon: drawing ? '点击增加点，双击结束查询' : '点击地图开始框选查询',
    dianCircle: drawing ? '移动鼠标调整半径，再次点击查询' : '点击选择圆心',
    dianRect: drawing ? '移动鼠标调整范围，再次点击查询' : '点击选择起点',
  };
  return hints[type] || '';
}
