import Map from 'ol/Map';
import View from 'ol/View';
import TileLayer from 'ol/layer/Tile';
import VectorLayer from 'ol/layer/Vector';
import VectorSource from 'ol/source/Vector';
import XYZ from 'ol/source/XYZ';
import OSM from 'ol/source/OSM';
import { defaults as defaultControls } from 'ol/control';
import { fromLonLat, toLonLat } from 'ol/proj';
import { unByKey } from 'ol/Observable';
import { createVectorStyle } from '../utils/mapFeatureStyle';

const TDT_TOKEN = '539153113b6e29d0d974db407e831022';
const TDT_SUBDOMAINS = ['0', '1', '2', '3', '4', '5', '6', '7'];
const DEFAULT_CENTER = [119.48, 28.4585];
const DEFAULT_ZOOM = 12;

export function useOpenLayers(containerId, options = {}) {
	let map = null;
	let clickKey = null;
	let pointerMoveKey = null;
	let headingKey = null;
	let scaleKeys = [];
	const baseLayers = {};
	const vectorSources = {};
	const vectorLayers = {};

	function initOpenLayers() {
		if (map) return map;
		const target = typeof containerId === 'string' ? containerId : containerId?.value;
		createBaseLayers();
		createVectorLayers();
		map = new Map({
			target,
			controls: defaultControls({ attribution: false, zoom: false, rotate: false }),
			layers: [
				baseLayers.osm,
				baseLayers.img,
				baseLayers.cia,
				baseLayers.vec,
				baseLayers.cva,
				vectorLayers.landPrice,
				vectorLayers.imports,
				vectorLayers.measure,
				vectorLayers.query,
				vectorLayers.inspection,
				vectorLayers.highlight,
			],
			view: new View({
				center: fromLonLat(options.center || DEFAULT_CENTER),
				zoom: options.zoom || DEFAULT_ZOOM,
				minZoom: 3,
				maxZoom: 20,
				rotation: 0,
			}),
		});
		setBaseLayer(options.baseLayer || 'tdt-img');
		return map;
	}

	function createBaseLayers() {
		baseLayers.osm = new TileLayer({
			source: new OSM({ crossOrigin: 'anonymous' }),
			visible: false,
			zIndex: 0,
		});
		baseLayers.img = new TileLayer({
			source: createTdtSource('img'),
			visible: true,
			zIndex: 1,
		});
		baseLayers.cia = new TileLayer({
			source: createTdtSource('cia'),
			visible: false,
			zIndex: 2,
		});
		baseLayers.vec = new TileLayer({
			source: createTdtSource('vec'),
			visible: false,
			zIndex: 1,
		});
		baseLayers.cva = new TileLayer({
			source: createTdtSource('cva'),
			visible: false,
			zIndex: 2,
		});
	}

	function createVectorLayers() {
		['landPrice', 'imports', 'measure', 'query', 'inspection', 'highlight'].forEach((key, index) => {
			vectorSources[key] = new VectorSource();
			vectorLayers[key] = new VectorLayer({
				source: vectorSources[key],
				style: createVectorStyle,
				zIndex: 10 + index * 10,
			});
		});
	}

	function createTdtSource(type) {
		return new XYZ({
			urls: TDT_SUBDOMAINS.map((subdomain) => `https://t${subdomain}.tianditu.gov.cn/DataServer?T=${type}_w&x={x}&y={y}&l={z}&tk=${TDT_TOKEN}`),
			crossOrigin: 'anonymous',
			maxZoom: 18,
		});
	}

	function setBaseLayer(name) {
		if (!Object.keys(baseLayers).length) return;
		Object.values(baseLayers).forEach((layer) => layer.setVisible(false));
		if (name === 'osm') {
			baseLayers.osm.setVisible(true);
		} else if (name === 'tdt-vector') {
			baseLayers.vec.setVisible(true);
			baseLayers.cva.setVisible(true);
		} else if (name === 'tdt-img-label') {
			baseLayers.img.setVisible(true);
			baseLayers.cia.setVisible(true);
		} else {
			baseLayers.img.setVisible(true);
		}
	}

	function getMap() {
		return map;
	}

	function getLayer(key) {
		return vectorLayers[key] || null;
	}

	function getSource(key) {
		return vectorSources[key] || null;
	}

	function destroyOpenLayers() {
		removeClickHandler();
		removeMouseMoveHandler();
		removeHeadingUpdateHandler();
		removeScaleUpdateHandler();
		if (map) map.setTarget(null);
		map = null;
	}

	function addClickHandler(callback, options = {}) {
		if (!map) return;
		removeClickHandler();
		clickKey = map.on('singleclick', (event) => {
			let pickedFeature = null;
			let pickedLayer = null;
			map.forEachFeatureAtPixel(event.pixel, (feature, layer) => {
				pickedFeature = feature;
				pickedLayer = layer;
				return true;
			}, {
				hitTolerance: options.hitTolerance ?? 5,
			});
			const [longitude, latitude] = toLonLat(event.coordinate);
			const properties = pickedFeature?.getProperties?.() || {};
			callback?.({
				type: pickedFeature ? 'entity' : 'empty',
				entity: pickedFeature,
				feature: pickedFeature,
				layer: pickedLayer,
				properties,
				coordinate: event.coordinate,
				coordinates: { longitude, latitude, height: 0 },
				originalEvent: event,
			});
		});
	}

	function removeClickHandler() {
		if (clickKey) unByKey(clickKey);
		clickKey = null;
	}

	function addMouseMoveHandler(callback) {
		if (!map) return;
		removeMouseMoveHandler();
		pointerMoveKey = map.on('pointermove', (event) => {
			if (event.dragging) return;
			const [longitude, latitude] = toLonLat(event.coordinate);
			callback?.({ longitude, latitude, height: 0 });
		});
	}

	function removeMouseMoveHandler() {
		if (pointerMoveKey) unByKey(pointerMoveKey);
		pointerMoveKey = null;
	}

	function addHeadingUpdateHandler(callback) {
		if (!map) return;
		removeHeadingUpdateHandler();
		const view = map.getView();
		const emit = () => callback?.((view.getRotation() * 180) / Math.PI);
		headingKey = view.on('change:rotation', emit);
		emit();
	}

	function removeHeadingUpdateHandler() {
		if (headingKey) unByKey(headingKey);
		headingKey = null;
	}

	function addScaleUpdateHandler(callback) {
		if (!map) return;
		removeScaleUpdateHandler();
		const view = map.getView();
		const emit = () => {
			const resolution = view.getResolution() || 1;
			const center = toLonLat(view.getCenter() || fromLonLat(DEFAULT_CENTER));
			const metersPerPixel = resolution * Math.cos((center[1] * Math.PI) / 180);
			const targetMeters = metersPerPixel * 120;
			const niceMeters = pickNiceDistance(targetMeters);
			callback?.({
				metersPerPixel,
				widthPx: niceMeters / metersPerPixel,
				label: niceMeters >= 1000 ? `${Math.round(niceMeters / 1000)} km` : `${Math.round(niceMeters)} m`,
				zoom: Math.round(view.getZoom() || 0),
			});
		};
		scaleKeys = [
			view.on('change:resolution', emit),
			view.on('change:center', emit),
		];
		emit();
	}

	function removeScaleUpdateHandler() {
		scaleKeys.forEach((key) => unByKey(key));
		scaleKeys = [];
	}

	function animateTo(lonLat = DEFAULT_CENTER, zoom = DEFAULT_ZOOM, duration = 900) {
		if (!map) return;
		map.getView().animate({
			center: fromLonLat(lonLat),
			zoom,
			duration,
		});
	}

	function fitExtent(extent, options = {}) {
		if (!map || !extent || extent.some((value) => !Number.isFinite(value))) return;
		map.getView().fit(extent, {
			padding: options.padding || [90, 90, 90, 90],
			duration: options.duration ?? 700,
			maxZoom: options.maxZoom ?? 17,
		});
	}

	function fitFeature(feature, options = {}) {
		const extent = feature?.getGeometry?.()?.getExtent?.();
		if (extent) fitExtent(extent, options);
	}

	function fitSource(source, options = {}) {
		const extent = source?.getExtent?.();
		if (extent) fitExtent(extent, options);
	}

	return {
		initOpenLayers,
		getMap,
		getLayer,
		getSource,
		destroyOpenLayers,
		addClickHandler,
		removeClickHandler,
		addMouseMoveHandler,
		removeMouseMoveHandler,
		addHeadingUpdateHandler,
		removeHeadingUpdateHandler,
		addScaleUpdateHandler,
		removeScaleUpdateHandler,
		setBaseLayer,
		animateTo,
		fitExtent,
		fitFeature,
		fitSource,
	};
}

function pickNiceDistance(targetMeters) {
	const safeTarget = Math.max(1, Number(targetMeters) || 1);
	const pow10 = Math.pow(10, Math.floor(Math.log10(safeTarget)));
	const candidates = [1, 2, 5, 10].map((value) => value * pow10);
	return candidates.find((value) => value >= safeTarget) || candidates[candidates.length - 1];
}
