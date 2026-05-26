<template>
	<div class="cesium-box">
		<!-- 顶部 标题栏、Tab 切换、登出 -->
		<div class="bt">
			<i class="icon"></i>
			<div class="bt1">浙江数治空间平台</div>
			<div class="banben">0.0.1</div>
			<!-- 顶部 Tab 切换 -->
			<div class="top-tabs" ref="topTabsEl">
				<div class="top-tab-indicator" :style="indicatorStyle"></div>
				<div v-for="tab in topTabs" :key="tab.key" class="top-tab" :class="{ active: activeTopTab === tab.key }"
					:ref="el => setTabRef(tab.key, el)" @click="selectTopTab(tab)">
					{{ tab.label }}
				</div>
			</div>
			<div class="acction">{{ currentUserName }}</div>
			<div class="dianyuan" @click="confirmLogout"></div>
		</div>

		<!-- 1. 首页模块 -->
		<Home 
			:active="activeTopTab === 'sy'"
			:active-tool="activeTool"
			:icons="icons"
			:measure-panel-visible="measurePanelVisible"
			v-model:measure-active-tab="measureActiveTab"
			:measure-form="measureForm"
			:last-measure="lastMeasure"
			@start-tool="startTool"
			@clear-all="clearAllMeasures"
			@update:measurePanelVisible="measurePanelVisible = $event"
			@copy-all="copyAll"
			@copy-coords="copyCoords"
			@delete-current="deleteCurrentMeasure"
		/>

		<!-- 2. 地价查询模块 -->
		<LandPriceQuery 
			:active="activeTopTab === 'djcx'"
			:icons="icons"
			:active-tool="activeTool"
			:djcx-gongneng="djcxGongneng"
			v-model:djcx-active-tab="djcxActiveTab"
			:djcx-tab1="djcxTab1"
			:djcx-tab2="djcxTab2"
			:djcx-tab3="djcxTab3"
			:list="list"
			:list-item="listItem"
			:child-item="childItem"
			:show-info-panel="showInfoPanel"
			:click-info="clickInfo"
			@toggle-gongneng="djcxGongneng = !djcxGongneng"
			@start-tool="startTool"
			@reset-drawing="resetDrawing"
			@set-group-items="setGroupItems"
			@toggle-folder="toggleTab2Folder"
			@node-features-change="onDjcxNodeFeaturesChange"
			@click-child-item="clickChildItem"
			@close-info="closeInfoPanel"
		/>

		<!-- 3. 智能分析模块 -->
		<SmartAnalysis 
			ref="smartAnalysisRef"
			:active="activeTopTab === 'znfx'"
			:icons="icons"
			:active-tool="activeTool"
			:ai-chat-visible="aiChatVisible"
			:ai-chat-maximized="aiChatMaximized"
			:ai-chat-dragging="aiChatDragging"
			:ai-chat-top="aiChatTop"
			:ai-chat-left="aiChatLeft"
			:ai-chat-messages="aiChatMessages"
			v-model:ai-chat-input="aiChatInput"
			@start-tool="startTool"
			@drag-start="onAiDragStart"
			@toggle-size="toggleAiChatSize"
			@close-chat="closeAiChat"
			@send-message="sendAiMessage"
		/>

		<!-- 4. 数据管理模块 -->
		<DataManagement :active="activeTopTab === 'sjgl'" />

		<!-- 5. 个人中心模块 -->
		<PersonalCenter :active="activeTopTab === 'grzx'" />

		<!-- 底部显示经纬度 -->
		<div class="dibu">
			<span style="margin-left: 20px; font-size: 12px;">经度: {{ mouseCoords.longitude !== null ?
				mouseCoords.longitude.toFixed(6) + '°' : '--' }}</span>
			<span style="margin-left: 20px; font-size: 12px;">纬度: {{ mouseCoords.latitude !== null ?
				mouseCoords.latitude.toFixed(6) + '°' : '--' }}</span>
		</div>

		<!-- 比例尺与层级显示 -->
		<div class="bilichi">
			<div style="padding:8px 12px; color:#fff; font-size:12px;">
				<div style="display:flex; align-items:center;">
					<div
						style="width: 180px; height: 8px; background:#0f838d; border:1px solid #45efff; position:relative;">
						<div
							:style="{ width: Math.max(10, Math.min(180, Math.round(scaleBar.widthPx))) + 'px', height: '100%', background: '#45efff' }">
						</div>
					</div>
					<span style="margin-left:8px;">{{ scaleBar.label }}</span>
					<div style="margin-left:6px;">层级: {{ scaleBar.zoom }}</div>
				</div>
			</div>
		</div>

		<!-- 底部工具按钮 -->
		<div class="dibu_tool">
			<div class="dibu_tool_btn dingwei" @click="locateToMe"></div>
			<div class="dibu_tool_btn tuceng" ref="layerBtnRef" @click="toggleLayerPanel"></div>
			<div class="dibu_tool_btn zhinanzhen" :style="{ transform: 'rotate(' + compassRotation + 'deg)' }"></div>
		</div>

		<!-- 图层选择悬浮面板 -->
		<div v-if="layerPanelVisible" ref="layerPanelRef" class="layer-panel" @click.stop>
			<div class="layer-grid">
				<div class="layer-card" :class="{ active: baseLayerActive === '卫星图' }" @click="setBaseLayer('卫星图')">
					<div class="thumb thumb-satellite"></div>
					<div class="label">卫星图</div>
				</div>
				<div class="layer-card" :class="{ active: baseLayerActive === '矢量图' }" @click="setBaseLayer('矢量图')">
					<div class="thumb thumb-vector"></div>
					<div class="label">矢量图</div>
				</div>
				<div class="layer-card" :class="{ active: baseLayerActive === '注记图' }" @click="setBaseLayer('注记图')">
					<div class="thumb thumb-road"></div>
					<div class="label">注记图</div>
				</div>
			</div>
		</div>

		<!-- 地图容器 -->
		<div id="cesiumContainer" style="width: 100%; height: 100vh;"></div>
	</div>
</template>

<script setup>
import { onMounted, onBeforeUnmount, ref, reactive, watch, toRaw, computed, nextTick } from 'vue';
import * as Cesium from 'cesium';
import { useCesium } from '../composables/useCesium';
import { ElMessageBox } from 'element-plus';
// import { getLandPriceLayers } from '../api/map';

// 导入子组件
import Home from './map/Home.vue';
import LandPriceQuery from './map/LandPriceQuery.vue';
import SmartAnalysis from './map/SmartAnalysis.vue';
import DataManagement from './map/DataManagement.vue';
import PersonalCenter from './map/PersonalCenter.vue';

const emit = defineEmits(['logout']);

// 工具栏图标
const icons = {
	drawLine: new URL('../assets/画线.png', import.meta.url).href,
	drawPolygon: new URL('../assets/画多边形.png', import.meta.url).href,
	drawCircle: new URL('../assets/画圆.png', import.meta.url).href,
	drawRect: new URL('../assets/画矩形.png', import.meta.url).href,
	measureDistance: new URL('../assets/测距.png', import.meta.url).href,
	measureArea: new URL('../assets/测面积.png', import.meta.url).href,
	measureVolume: new URL('../assets/测方量.png', import.meta.url).href,
	measureAzimuth: new URL('../assets/测方位角.png', import.meta.url).href,
	measureAngle: new URL('../assets/测夹角.png', import.meta.url).href,
	measure: new URL('../assets/九宫格.png', import.meta.url).href,
	clear: new URL('../assets/垃圾桶.png', import.meta.url).href,
	gongneng: new URL('../assets/九宫格.png', import.meta.url).href,
	dianxuan: new URL('../assets/点选.png', import.meta.url).href,
	dianPolygon: new URL('../assets/点击选多边形.png', import.meta.url).href,
	dianCircle: new URL('../assets/点击选圆.png', import.meta.url).href,
	dianRect: new URL('../assets/点击选矩形.png', import.meta.url).href,
	currentLocation: new URL('../assets/当前位置.png', import.meta.url).href,
	ai: new URL('../assets/ai机器人.png', import.meta.url).href,
	me: new URL('../assets/我的.png', import.meta.url).href,
	maximize: new URL('../assets/放大.png', import.meta.url).href,
	minimize: new URL('../assets/缩小.png', import.meta.url).href,
	close: new URL('../assets/关闭.png', import.meta.url).href,
};

const containerId = 'cesiumContainer';
const {
	initCesium,
	getViewer,
	destroyCesium,
	add3DTileset,
	remove3DTileset,
	addClickHandler,
	removeClickHandler,
	addMouseMoveHandler,
	removeMouseMoveHandler,
	addHeadingUpdateHandler,
	removeHeadingUpdateHandler,
	addScaleUpdateHandler,
	removeScaleUpdateHandler,
	addVecLayer,
	addCvaLayer,
	removeVecLayer,
	removeCvaLayer,
} = useCesium(containerId);

// 状态管理
const topTabs = [
	{ key: 'sy', label: '首页' },
	{ key: 'djcx', label: '地价查询' },
	{ key: 'znfx', label: '智能分析' },
	{ key: 'sjgl', label: '数据管理' },
	{ key: 'grzx', label: '个人中心' }
];
const activeTopTab = ref(topTabs[0].key);
const activeTool = ref(null);

const currentUserName = ref(localStorage.getItem('userName') || '未知用户');

// 地价查询数据
const list = ref([]);
const listItem = ref(0);
const childItem = ref(0);
const djcxGongneng = ref(true);
const djcxActiveTab = ref('tab1');
const djcxTab1 = reactive({
	zongdi: { checked: true },
	shichang: { items: { '商业出租': true, '商业买卖': true, '商业商品房': true, '住宅出租': true, '住宅买卖': true, '住宅商品房': true, '出让': true, '其它': true } },
	jiance: { items: { '商业': true, '住宅': true, '工业': true } },
	layers: { checked: true, items: { '村庄': { value: true, disabled: true }, '道路': { value: false, disabled: true }, '河流': { value: false, disabled: true } } }
});
const djcxTab2 = reactive({ expanded: { linan: false, towns: true }, towns: ['临安市区_住宅', '临安市区_商业', '临安市区_工业', '太湖源镇', '於潜镇', '横畈镇', '西天目中心集镇', '横路乡', '岛石镇', '大峡谷镇', '河桥镇', '湍口镇', '新桥乡', '太阳镇', '龙岗镇', '清凉峰镇', '昌化镇', '浪溪镇', '板桥乡', '高虹镇', '三口镇', '青山工业园区', '玲珑工业园区'] });
const djcxTab3 = reactive({ id: '', town: '临安市区', sampleType: '其它', landUnit: '', landLocation: '', price: null, floorPrice: null, landLevel: null, streetDepth: null, streetWidth: null, landArea: null, buildArea: null, plotRatio: null, baseDate: '', buildNewness: null, houseType: '', houseStructure: '', usage: '其它', floors: null, floorLevel: null, remark: '' });

// 测绘数据
const measurePanelVisible = ref(false);
const measureActiveTab = ref('info');
const measureForm = reactive({ name: '', unit: 'auto', path: '测绘/默认', desc: '', lengthMeters: 0, areaSqMeters: 0, heightMeters: 0, volumeCubicMeters: 0 });
const lastMeasure = reactive({ points: [], segmentsMeters: [], cumulativeMeters: [] });

// AI 对话数据
const aiChatVisible = ref(false);
const aiChatInput = ref('');
const aiChatMessages = ref([{ role: 'assistant', text: '你好，我是AI助手，有什么需要帮助？' }]);
const aiChatMaximized = ref(true);
const aiChatDragging = ref(false);
const aiChatTop = ref(null);
const aiChatLeft = ref(null);
const smartAnalysisRef = ref(null);

// 地图状态
const mouseCoords = ref({ longitude: null, latitude: null, height: null });
const headingDeg = ref(0);
const scaleBar = reactive({ metersPerPixel: 0, widthPx: 100, label: '100 m', zoom: 0 });
const compassRotation = computed(() => headingDeg.value - 90);
const layerPanelVisible = ref(false);
const baseLayerActive = ref('卫星图');
const showInfoPanel = ref(false);
const clickInfo = ref({ coordinates: null, properties: {}, feature: null });

const djcxNodeDataSources = new Map();
const djcxHighlightedEntities = new Set();
const djcxStyle = {
	NORMAL: {
		FILL: Cesium.Color.WHITE.withAlpha(0.08),
		OUTLINE: Cesium.Color.WHITE.withAlpha(0.9),
	},
	HIGHLIGHT: {
		FILL: Cesium.Color.fromCssColorString('#45efff').withAlpha(0.75),
		OUTLINE: Cesium.Color.fromCssColorString('#45efff'),
	},
};

function djcxToRoman(num) {
	const n = Number(num);
	if (!Number.isFinite(n) || n <= 0) return '';
	const table = [
		[1000, 'M'],
		[900, 'CM'],
		[500, 'D'],
		[400, 'CD'],
		[100, 'C'],
		[90, 'XC'],
		[50, 'L'],
		[40, 'XL'],
		[10, 'X'],
		[9, 'IX'],
		[5, 'V'],
		[4, 'IV'],
		[1, 'I'],
	];
	let x = Math.floor(n);
	let out = '';
	for (const [v, sym] of table) {
		while (x >= v) {
			out += sym;
			x -= v;
		}
	}
	return out;
}

function djcxColorForIndex(index, total) {
	const i = Math.max(1, Number(index || 1));
	const t = Math.max(1, Number(total || 1));
	const hue = ((i - 1) * (360 / t)) % 360;
	return Cesium.Color.fromHsl(hue / 360, 0.85, 0.55, 1);
}

function djcxParseJsonObject(input) {
	if (input == null) return null;
	if (typeof input === 'object') return input;
	if (typeof input !== 'string') return null;
	const s = input.trim();
	if (!s) return null;
	if (!(s.startsWith('{') && s.endsWith('}')) && !(s.startsWith('[') && s.endsWith(']'))) return null;
	try { return JSON.parse(s); } catch { return null; }
}

function djcxApplyEntityStyle(entity, highlight) {
	if (!entity) return;
	const base = entity._djcxBaseStyle || { FILL: djcxStyle.NORMAL.FILL, OUTLINE: djcxStyle.NORMAL.OUTLINE };
	const theme = highlight ? djcxStyle.HIGHLIGHT : base;
	if (entity.polygon) {
		entity.polygon.material = theme.FILL;
		entity.polygon.outline = true;
		entity.polygon.outlineColor = theme.OUTLINE;
		entity.polygon.outlineWidth = 2;
	}
	if (entity.polyline) {
		entity.polyline.material = theme.OUTLINE;
	}
}

function djcxClearHighlights() {
	for (const ent of djcxHighlightedEntities) djcxApplyEntityStyle(ent, false);
	djcxHighlightedEntities.clear();
}

function djcxSetHighlights(entities) {
	djcxClearHighlights();
	(entities || []).forEach((ent) => {
		djcxApplyEntityStyle(ent, true);
		djcxHighlightedEntities.add(ent);
	});
}

function djcxNormalizeRecordsToFeatureCollection(records) {
	const items = Array.isArray(records) ? records : [];
	const features = [];
	items.forEach((it, idx) => {
		if (!it) return;
		const raw = djcxParseJsonObject(it.geojsonRaw);
		if (!raw || raw.type !== 'Feature' || !raw.geometry) return;
		const propsFromField = djcxParseJsonObject(it.properties) || {};
		const props = { ...(raw.properties || {}), ...propsFromField, id: it.id, fid: it.fid, geomType: it.geomType, __djcxIndex: idx + 1, __djcxTotal: items.length };
		features.push({ type: 'Feature', geometry: raw.geometry, properties: props });
	});
	return { type: 'FeatureCollection', features };
}

async function djcxAddNodeFeatures(nodeId, records) {
	const viewer = getViewer();
	if (!viewer) return;
	djcxRemoveNodeFeatures(nodeId);
	const featureCollection = djcxNormalizeRecordsToFeatureCollection(records);
	if (!featureCollection.features.length) return;
	const ds = await Cesium.GeoJsonDataSource.load(featureCollection, { clampToGround: true });
	ds.name = `djcx-node-${String(nodeId)}`;
	await viewer.dataSources.add(ds);
	const now = Cesium.JulianDate.now();
	const baseEntities = [...ds.entities.values].filter((ent) => ent && (ent.polygon || ent.polyline));
	const total = (Array.isArray(records) && records.length) ? records.length : 1;

	for (const ent of baseEntities) {
		ent._djcxFeature = true;
		ent._djcxNodeId = String(nodeId);
		ent._djcxProperties = ent.properties ? ent.properties.getValue(now) : {};
		ent._djcxCentroid = null;
		ent._djcxGeojsonGeometry = null;
		const hierarchy = ent.polygon?.hierarchy?.getValue(now);
		const pts = hierarchy?.positions || [];
		if (Array.isArray(pts) && pts.length >= 3) {
			const ring = pts.map((p) => {
				const c = Cesium.Cartographic.fromCartesian(p);
				return [Cesium.Math.toDegrees(c.longitude), Cesium.Math.toDegrees(c.latitude)];
			});
			const first = ring[0];
			const last = ring[ring.length - 1];
			if (first && last && (first[0] !== last[0] || first[1] !== last[1])) ring.push([...first]);
			ent._djcxGeojsonGeometry = { type: 'Polygon', coordinates: [ring] };
		}

		const rawIndex = Number(ent._djcxProperties?.__djcxIndex);
		const order = Number.isFinite(rawIndex) && rawIndex > 0 ? Math.min(total, Math.max(1, rawIndex)) : 1;
		ent._djcxOrder = order;
		ent._djcxRoman = djcxToRoman(order);
		const baseColor = djcxColorForIndex(order, total);
		ent._djcxBaseStyle = {
			FILL: baseColor.withAlpha(0.18),
			OUTLINE: baseColor.withAlpha(0.95),
		};
		djcxApplyEntityStyle(ent, false);
	}

	const labeled = new Set();
	for (const ent of baseEntities) {
		if (labeled.has(ent._djcxOrder)) continue;
		const centroid = djcxEntityCentroidLonLat(ent);
		if (!centroid) continue;
		labeled.add(ent._djcxOrder);
		const baseColor = djcxColorForIndex(ent._djcxOrder, total);
		const labelEntity = ds.entities.add({
			position: Cesium.Cartesian3.fromDegrees(centroid.longitude, centroid.latitude, 0),
			label: {
				text: ent._djcxRoman || '',
				font: 'bold 18px Microsoft YaHei',
				fillColor: baseColor,
				outlineColor: Cesium.Color.BLACK,
				outlineWidth: 3,
				style: Cesium.LabelStyle.FILL_AND_OUTLINE,
				disableDepthTestDistance: Number.POSITIVE_INFINITY,
				showBackground: true,
				backgroundColor: new Cesium.Color(0.05, 0.06, 0.08, 0.55),
				pixelOffset: new Cesium.Cartesian2(0, -10),
				heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
			}
		});
		labelEntity._djcxFeatureLabel = true;
		labelEntity._djcxNodeId = String(nodeId);
		labelEntity._djcxForEntityId = ent.id;
	}
	djcxNodeDataSources.set(String(nodeId), ds);
}

function djcxRemoveNodeFeatures(nodeId) {
	const viewer = getViewer();
	if (!viewer) return;
	djcxClearHighlights();
	const key = String(nodeId);
	const ds = djcxNodeDataSources.get(key);
	if (!ds) return;
	try { viewer.dataSources.remove(ds, true); } catch { /* ignore */ }
	djcxNodeDataSources.delete(key);
}

function djcxPointInRing(point, ring) {
	let inside = false;
	for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
		const xi = ring[i][0], yi = ring[i][1];
		const xj = ring[j][0], yj = ring[j][1];
		const intersect = ((yi > point[1]) !== (yj > point[1])) && (point[0] < ((xj - xi) * (point[1] - yi)) / (yj - yi + 0.0) + xi);
		if (intersect) inside = !inside;
	}
	return inside;
}

function djcxPointInPolygon(point, coords) {
	if (!Array.isArray(coords) || !coords.length) return false;
	const outer = coords[0];
	if (!Array.isArray(outer) || outer.length < 3) return false;
	if (!djcxPointInRing(point, outer)) return false;
	for (let h = 1; h < coords.length; h++) {
		const hole = coords[h];
		if (Array.isArray(hole) && hole.length >= 3 && djcxPointInRing(point, hole)) return false;
	}
	return true;
}

function djcxEntityCentroidLonLat(entity) {
	if (entity?._djcxCentroid) return entity._djcxCentroid;
	const geom = entity?._djcxGeojsonGeometry;
	const coords = geom?.type === 'Polygon' ? geom.coordinates?.[0] : (geom?.type === 'MultiPolygon' ? geom.coordinates?.[0]?.[0] : null);
	if (!Array.isArray(coords) || !coords.length) return null;
	let sumLon = 0, sumLat = 0, n = 0;
	for (const p of coords) {
		if (!Array.isArray(p) || p.length < 2) continue;
		sumLon += Number(p[0]);
		sumLat += Number(p[1]);
		n += 1;
	}
	if (!n) return null;
	entity._djcxCentroid = { longitude: sumLon / n, latitude: sumLat / n, height: 0 };
	return entity._djcxCentroid;
}

function djcxGetAllFeatureEntities() {
	const out = [];
	for (const ds of djcxNodeDataSources.values()) {
		for (const ent of ds.entities.values) {
			if (ent?._djcxFeature && !ent?._djcxFeatureLabel) out.push(ent);
		}
	}
	return out;
}

function djcxBuildQueryResultProperties(entity, matchCount) {
	const props = entity?._djcxProperties || {};
	const base = entity?._djcxRoman ? { 序号: entity._djcxRoman, ...props } : props;
	return matchCount != null ? { ...base, 匹配数量: matchCount } : base;
}

function djcxShowFeatureInPanel(entity, matchCount) {
	const centroid = djcxEntityCentroidLonLat(entity);
	clickInfo.value = {
		coordinates: centroid,
		properties: djcxBuildQueryResultProperties(entity, matchCount),
		feature: null,
	};
	showInfoPanel.value = true;
	measurePanelVisible.value = false;
}

function djcxQueryPoint(lon, lat) {
	const pt = [lon, lat];
	const results = [];
	const entities = djcxGetAllFeatureEntities();
	for (const ent of entities) {
		const geom = ent?._djcxGeojsonGeometry;
		if (!geom) continue;
		if (geom.type === 'Polygon') {
			if (djcxPointInPolygon(pt, geom.coordinates)) results.push(ent);
		} else if (geom.type === 'MultiPolygon') {
			const polys = Array.isArray(geom.coordinates) ? geom.coordinates : [];
			if (polys.some(p => djcxPointInPolygon(pt, p))) results.push(ent);
		}
	}
	return results;
}

function djcxQueryRect(lonMin, latMin, lonMax, latMax) {
	const entities = djcxGetAllFeatureEntities();
	return entities.filter((ent) => {
		const c = djcxEntityCentroidLonLat(ent);
		if (!c) return false;
		return c.longitude >= lonMin && c.longitude <= lonMax && c.latitude >= latMin && c.latitude <= latMax;
	});
}

function djcxQueryCircle(centerLon, centerLat, radiusMeters) {
	const CesiumLib = Cesium;
	const center = CesiumLib.Cartographic.fromDegrees(centerLon, centerLat);
	const entities = djcxGetAllFeatureEntities();
	return entities.filter((ent) => {
		const c = djcxEntityCentroidLonLat(ent);
		if (!c) return false;
		const cur = CesiumLib.Cartographic.fromDegrees(c.longitude, c.latitude);
		const dist = new CesiumLib.EllipsoidGeodesic(center, cur).surfaceDistance;
		return dist <= radiusMeters;
	});
}

function djcxQueryPolygon(queryRingLonLat) {
	const ring = Array.isArray(queryRingLonLat) ? queryRingLonLat : [];
	if (ring.length < 3) return [];
	const coords = [ring];
	const entities = djcxGetAllFeatureEntities();
	return entities.filter((ent) => {
		const c = djcxEntityCentroidLonLat(ent);
		if (!c) return false;
		return djcxPointInPolygon([c.longitude, c.latitude], coords);
	});
}

async function onDjcxNodeFeaturesChange(payload) {
	const nodeId = String(payload?.id ?? '');
	if (!nodeId) return;
	if (payload?.checked) {
		await djcxAddNodeFeatures(nodeId, payload?.records || []);
	} else {
		djcxRemoveNodeFeatures(nodeId);
	}
}

// 顶部 Tab 逻辑
const topTabsEl = ref(null);
const indicatorStyle = ref({ left: '0px', width: '0px' });
const tabRefs = new Map();
const setTabRef = (key, el) => { if (el) tabRefs.set(key, el); };
const updateIndicator = () => {
	const container = topTabsEl.value;
	const activeEl = tabRefs.get(activeTopTab.value);
	if (!container || !activeEl) return;
	const cRect = container.getBoundingClientRect();
	const tRect = activeEl.getBoundingClientRect();
	indicatorStyle.value = { left: `${tRect.left - cRect.left}px`, width: `${tRect.width}px` };
};
const selectTopTab = (tab) => { activeTopTab.value = tab.key; };

watch(activeTopTab, async (newVal) => {
	const viewer = getViewer();
	if (newVal === 'djcx') {
		djcxGongneng.value = true;
	} else {
		listItem.value = -1;
		djcxGongneng.value = false;
	}

	// 切换页面时，如果不是首页，则关闭测量工具并隐藏已有的测量实体
	if (newVal !== 'sy') {
		if (currentMeasureEntity) {
			setEntityHighlight(currentMeasureEntity, false);
			currentMeasureEntity = null;
		}
		resetDrawing();
		measurePanelVisible.value = false;
		if (viewer) {
			[...viewer.entities.values].forEach(ent => {
				if (ent._measureData || ent._drawn || ent.name === 'measure-label') {
					ent.show = false;
					if (ent._measurePoints) ent._measurePoints.forEach(p => p.show = false);
					if (ent._measureLabel) ent._measureLabel.show = false;
				}
			});
		}
	} else {
		// 切回首页，显示所有测量实体
		if (viewer) {
			[...viewer.entities.values].forEach(ent => {
				if (ent._measureData || ent._drawn || ent.name === 'measure-label') {
					ent.show = true;
					if (ent._measurePoints) ent._measurePoints.forEach(p => p.show = true);
					if (ent._measureLabel) ent._measureLabel.show = true;
				}
			});
		}
	}

	await nextTick();
	updateIndicator();
});

async function clickChildItem(item, index) {
	childItem.value = index;
	await add3DTileset(item.url, { alpha: 0.7 });
}
watch(() => listItem.value, (newVal, oldVal) => {
	if (oldVal === -1 || newVal === oldVal) return;
	const oldUrl = list.value[oldVal].childList.length === 0 ? list.value[oldVal].url : list.value[oldVal].childList[childItem.value].url;
	remove3DTileset(oldUrl);
});
watch(() => childItem.value, (newVal, oldVal) => {
	if (newVal !== oldVal) remove3DTileset(list.value[listItem.value].childList[oldVal].url);
});
function setGroupItems(groupKey, checked) {
	const group = djcxTab1[groupKey];
	if (!group || !group.items) return;
	Object.keys(group.items).forEach(k => {
		if (typeof group.items[k] === 'object') { if (!group.items[k].disabled) group.items[k].value = checked; }
		else group.items[k] = checked;
	});
}
function toggleTab2Folder(key) { djcxTab2.expanded[key] = !djcxTab2.expanded[key]; }

// 测绘逻辑 (保留在 Shell 中，因为它高度依赖 Viewer 实例)
let drawHandler = null;
let tempEntity = null;
let tempSolidEntity = null;
let tempEdgeEntity = null;
let tempDistanceLabel = null;
let tempAreaLabel = null;
let tempRadiusEntity = null;
let resultLabel = null;
let tooltipEntity = null;
let crosshairX = null; // 新增：经度引导线
let crosshairY = null; // 新增：纬度引导线
let hoverCartesian = null; // 实时鼠标位置
let currentMeasureEntity = null;
let currentMeasurePoints = [];
const positions = [];
const nameCounters = reactive({ distance: 0, polygon: 0, rect: 0, circle: 0, volume: 0, azimuth: 0, angle: 0 });

// 响应式提示文字
const drawingHint = ref('');

// 颜色配置
const COLORS = {
	NORMAL: {
		LINE: Cesium.Color.WHITE,
		FILL: Cesium.Color.BLACK.withAlpha(0.3),
		OUTLINE: Cesium.Color.WHITE,
		POINT: Cesium.Color.WHITE,
		POINT_OUTLINE: Cesium.Color.BLACK
	},
	HIGHLIGHT: {
		LINE: Cesium.Color.fromCssColorString('#45efff'),
		FILL: Cesium.Color.fromCssColorString('#45efff').withAlpha(0.3),
		OUTLINE: Cesium.Color.fromCssColorString('#45efff'),
		POINT: Cesium.Color.fromCssColorString('#45efff'),
		POINT_OUTLINE: Cesium.Color.WHITE
	}
};

// 设置实体高亮状态
function setEntityHighlight(entity, isHighlight) {
	if (!entity) return;
	const theme = isHighlight ? COLORS.HIGHLIGHT : COLORS.NORMAL;
	
	// 处理线
	if (entity.polyline) {
		entity.polyline.material = theme.LINE;
		if (entity.polyline.depthFailMaterial) {
			entity.polyline.depthFailMaterial = theme.LINE.withAlpha(0.5);
		}
	}
	// 处理面
	if (entity.polygon) {
		entity.polygon.material = theme.FILL;
		entity.polygon.outlineColor = theme.OUTLINE;
	}
	// 处理矩形
	if (entity.rectangle) {
		entity.rectangle.material = theme.FILL;
		entity.rectangle.outlineColor = theme.OUTLINE;
	}
	// 处理圆
	if (entity.ellipse) {
		entity.ellipse.material = theme.FILL;
		entity.ellipse.outlineColor = theme.OUTLINE;
	}
	// 处理点
	if (entity._measurePoints) {
		entity._measurePoints.forEach(pt => {
			if (pt.point) {
				pt.point.color = theme.POINT;
				pt.point.outlineColor = theme.POINT_OUTLINE;
			}
			// 处理夹角/方位角的辅助线
			if (pt.polyline) {
				pt.polyline.material = theme.LINE;
			}
		});
	}
}

function autoName(kind) {
	const labels = { distance: '线', polygon: '面', rect: '矩形', circle: '圆', volume: '方量', azimuth: '方位角', angle: '夹角' };
	nameCounters[kind] = (nameCounters[kind] || 0) + 1;
	return `${labels[kind] || '图形'}-${nameCounters[kind]}`;
}

function resetDrawing() {
	const viewer = getViewer();
	if (!viewer) return;
	
	djcxClearHighlights();
	const djcxQueries = [...viewer.entities.values].filter(e => e && e._djcxQuery);
	djcxQueries.forEach(e => viewer.entities.remove(e));

	// 清除所有临时实体
	[tempEntity, tempSolidEntity, tempEdgeEntity, tempDistanceLabel, tempAreaLabel, tempRadiusEntity, resultLabel, tooltipEntity, crosshairX, crosshairY].forEach(ent => {
		if (ent) viewer.entities.remove(ent);
	});
	
	if (drawHandler) {
		drawHandler.destroy();
		drawHandler = null;
	}
	
	tempEntity = tempSolidEntity = tempEdgeEntity = tempDistanceLabel = tempAreaLabel = tempRadiusEntity = resultLabel = tooltipEntity = crosshairX = crosshairY = null;
	positions.length = 0;
	activeTool.value = null;
	currentMeasurePoints = [];
	drawingHint.value = '';
}

function startTool(type) {
	if (type === 'ai') {
		if (activeTool.value === 'ai') {
			aiChatVisible.value = false;
			activeTool.value = null;
		} else {
			aiChatVisible.value = true;
			aiChatMaximized.value = true;
			activeTool.value = 'ai';
			nextTick(() => scrollAiBottom());
		}
		return;
	}

	const viewer = getViewer();
	if (!viewer) return;

	// 如果有当前选中的实体，先取消高亮
	if (currentMeasureEntity) {
		setEntityHighlight(currentMeasureEntity, false);
		currentMeasureEntity = null;
	}

	// 如果点击的是当前已激活的工具，则取消选中并重置
	if (activeTool.value === type) {
		resetDrawing();
		return;
	}

	resetDrawing();
	if (!measurePanelVisible.value) {
		measureForm.lengthMeters = 0;
		measureForm.areaSqMeters = 0;
	}
	activeTool.value = type;
	if (type === 'dianxuan') {
		drawHandler = new Cesium.ScreenSpaceEventHandler(viewer.scene.canvas);
		drawHandler.setInputAction((click) => {
			const cartesian = viewer.camera.pickEllipsoid(click.position, viewer.scene.globe.ellipsoid);
			if (!cartesian) return;
			const carto = Cesium.Cartographic.fromCartesian(cartesian);
			const lon = Cesium.Math.toDegrees(carto.longitude);
			const lat = Cesium.Math.toDegrees(carto.latitude);
			const results = djcxQueryPoint(lon, lat);
			djcxSetHighlights(results);
			if (results.length) djcxShowFeatureInPanel(results[0], results.length);
			else showInfoPanel.value = false;
		}, Cesium.ScreenSpaceEventType.LEFT_CLICK);
		return;
	}
	
	// 初始化提示和面板 Tab
	updateDrawingHint(type, 0);
	measureActiveTab.value = 'info';
	
	drawHandler = new Cesium.ScreenSpaceEventHandler(viewer.scene.canvas);
	hoverCartesian = null;
	
	const pickCartesian = (pos) => {
		const scene = viewer.scene;
		let c = scene.pickPosition(pos);
		if (!Cesium.defined(c)) {
			c = viewer.camera.pickEllipsoid(pos, scene.globe.ellipsoid);
		}
		return c;
	};

	// 创建跟随鼠标的提示标签
	tooltipEntity = viewer.entities.add({
		label: {
			text: new Cesium.CallbackProperty(() => drawingHint.value, false),
			font: '12px Microsoft YaHei',
			style: Cesium.LabelStyle.FILL_AND_OUTLINE,
			fillColor: Cesium.Color.WHITE,
			outlineColor: Cesium.Color.BLACK,
			outlineWidth: 2,
			horizontalOrigin: Cesium.HorizontalOrigin.LEFT,
			verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
			pixelOffset: new Cesium.Cartesian2(15, -15),
			disableDepthTestDistance: Number.POSITIVE_INFINITY,
			showBackground: true,
			backgroundColor: new Cesium.Color(0.16, 0.22, 0.21, 0.8)
		}
	});

	// 创建十字交叉引导线
	const dashMaterial = new Cesium.PolylineDashMaterialProperty({
		color: Cesium.Color.fromCssColorString('#45efff').withAlpha(0.5),
		dashLength: 8
	});

	crosshairX = viewer.entities.add({
		polyline: {
			positions: new Cesium.CallbackProperty(() => {
				if (!hoverCartesian) return [];
				const carto = Cesium.Cartographic.fromCartesian(hoverCartesian);
				return Cesium.Cartesian3.fromDegreesArray([
					Cesium.Math.toDegrees(carto.longitude), -85,
					Cesium.Math.toDegrees(carto.longitude), 85
				]);
			}, false),
			width: 1,
			material: dashMaterial,
			arcType: Cesium.ArcType.NONE,
			zIndex: -1
		}
	});

	crosshairY = viewer.entities.add({
		polyline: {
			positions: new Cesium.CallbackProperty(() => {
				if (!hoverCartesian) return [];
				const carto = Cesium.Cartographic.fromCartesian(hoverCartesian);
				return Cesium.Cartesian3.fromDegreesArray([
					-180, Cesium.Math.toDegrees(carto.latitude),
					180, Cesium.Math.toDegrees(carto.latitude)
				]);
			}, false),
			width: 1,
			material: dashMaterial,
			arcType: Cesium.ArcType.NONE,
			zIndex: -1
		}
	});

	drawHandler.setInputAction((movement) => {
		hoverCartesian = pickCartesian(movement.endPosition);
		if (!hoverCartesian) return;
		
		// 更新提示框位置
		if (tooltipEntity) tooltipEntity.position = hoverCartesian;
		
		if (positions.length > 0) {
			if (!tempEntity) createTempEntity(viewer, type);
			updateTempEntity(type, hoverCartesian);
		}
	}, Cesium.ScreenSpaceEventType.MOUSE_MOVE);

	drawHandler.setInputAction((click) => {
		const cart = pickCartesian(click.position);
		if (cart) {
			positions.push(cart);
			const pt = viewer.entities.add({
				position: cart,
				point: {
					pixelSize: 8,
					color: COLORS.HIGHLIGHT.POINT,
					outlineColor: COLORS.HIGHLIGHT.POINT_OUTLINE,
					outlineWidth: 2,
					disableDepthTestDistance: Number.POSITIVE_INFINITY
				}
			});
			currentMeasurePoints.push(pt);
			
			// 更新提示文字
			updateDrawingHint(type, positions.length);
			
			// 对于线段，增加已确认部分的实体
			if (['drawLine', 'measureDistance'].includes(type) && positions.length >= 2) {
				if (!tempSolidEntity) {
					tempSolidEntity = viewer.entities.add({
						polyline: {
							positions: new Cesium.CallbackProperty(() => positions, false),
							width: 3,
							material: Cesium.Color.fromCssColorString('#45efff'),
							depthFailMaterial: Cesium.Color.fromCssColorString('#45efff').withAlpha(0.5)
						}
					});
				}
			}
			
			// 矩形和圆点击两次即完成，方位角2次，夹角3次
			if (['drawRect', 'drawCircle', 'measureAzimuth'].includes(type) && positions.length >= 2) {
				finalizeDrawing();
			} else if (type === 'measureAngle' && positions.length >= 3) {
				finalizeDrawing();
			}
		}
	}, Cesium.ScreenSpaceEventType.LEFT_CLICK);

	drawHandler.setInputAction(() => {
		if (positions.length >= 2) finalizeDrawing();
	}, Cesium.ScreenSpaceEventType.RIGHT_CLICK);
}

function updateDrawingHint(type, pointCount) {
	const hints = {
		dianxuan: ['点击地图查询要素', '点击地图查询要素'],
		dianPolygon: ['点击地图开始框选查询', '点击增加点，右键结束查询'],
		dianCircle: ['点击选择圆心', '移动鼠标调整半径，再次点击查询'],
		dianRect: ['点击选择起点', '移动鼠标调整范围，再次点击查询'],
		drawLine: ['点击地图开始画线', '点击增加点，右键结束'],
		drawPolygon: ['点击地图开始画多边形', '点击增加点，右键结束'],
		drawCircle: ['点击选择圆心', '移动鼠标调整半径，再次点击完成'],
		drawRect: ['点击选择起点', '移动鼠标调整范围，再次点击完成'],
		measureDistance: ['点击地图开始测距', '点击增加点，右键结束'],
		measureArea: ['点击地图开始测面积', '点击增加点，右键结束'],
		measureVolume: ['点击地图选择范围', '点击增加点，右键结束'],
		measureAzimuth: ['点击起点', '点击终点查看方位角'],
		measureAngle: ['点击第一个点', '点击顶点', '点击第三个点完成']
	};
	
	const hintList = hints[type] || ['点击开始绘制', '绘制中...'];
	drawingHint.value = pointCount === 0 ? hintList[0] : (hintList[1] || hintList[0]);
}

// 辅助计算函数: 计算多边形投影面积
const polygonArea = (pts) => {
	const CesiumLib = Cesium;
	const R = 6378137.0;
	const m = pts.map(p => {
		const c = CesiumLib.Cartographic.fromCartesian(p);
		const lon = CesiumLib.Math.toDegrees(c.longitude);
		const lat = CesiumLib.Math.toDegrees(c.latitude);
		return {
			x: CesiumLib.Math.toRadians(lon) * R,
			y: R * Math.log(Math.tan(Math.PI / 4 + CesiumLib.Math.toRadians(lat) / 2))
		};
	});
	let area = 0;
	for (let i = 0, j = m.length - 1; i < m.length; j = i++) {
		area += (m[j].x + m[i].x) * (m[j].y - m[i].y);
	}
	return Math.abs(area);
};

const toCarto = (c) => Cesium.Cartographic.fromCartesian(c);
const toLonLat = (carto) => ({ lon: Cesium.Math.toDegrees(carto.longitude), lat: Cesium.Math.toDegrees(carto.latitude) });

const bearing = (a, b) => {
	const A = toLonLat(toCarto(a)), B = toLonLat(toCarto(b));
	const φ1 = Cesium.Math.toRadians(A.lat), φ2 = Cesium.Math.toRadians(B.lat);
	const λ1 = Cesium.Math.toRadians(A.lon), λ2 = Cesium.Math.toRadians(B.lon);
	const y = Math.sin(λ2 - λ1) * Math.cos(φ2);
	const x = Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(λ2 - λ1);
	return (Cesium.Math.toDegrees(Math.atan2(y, x)) + 360) % 360;
};

const angleDeg = (a, b, c) => {
	const v1 = Cesium.Cartesian3.subtract(a, b, new Cesium.Cartesian3());
	const v2 = Cesium.Cartesian3.subtract(c, b, new Cesium.Cartesian3());
	return Cesium.Math.toDegrees(Math.acos(Cesium.Cartesian3.dot(v1, v2) / (Cesium.Cartesian3.magnitude(v1) * Cesium.Cartesian3.magnitude(v2))));
};

function createTempEntity(viewer, type) {
	const CesiumLib = Cesium;
	const cyanColor = CesiumLib.Color.fromCssColorString('#45efff');
	
	switch (type) {
		case 'drawLine':
		case 'measureDistance':
			tempEntity = viewer.entities.add({
				polyline: {
					positions: new CesiumLib.CallbackProperty(() => {
						if (!hoverCartesian || positions.length === 0) return [];
						return [positions[positions.length - 1], hoverCartesian];
					}, false),
					width: 2,
					material: new CesiumLib.PolylineDashMaterialProperty({ color: cyanColor, dashLength: 16 }),
				}
			});
			tempDistanceLabel = viewer.entities.add({
				position: new CesiumLib.CallbackProperty(() => {
					if (!hoverCartesian || positions.length === 0) return positions[0] || CesiumLib.Cartesian3.ZERO;
					return CesiumLib.Cartesian3.midpoint(positions[positions.length - 1], hoverCartesian, new CesiumLib.Cartesian3());
				}, false),
				label: {
					text: new CesiumLib.CallbackProperty(() => {
						if (!hoverCartesian || positions.length === 0) return '';
						const m = new CesiumLib.EllipsoidGeodesic(CesiumLib.Cartographic.fromCartesian(positions[positions.length - 1]), CesiumLib.Cartographic.fromCartesian(hoverCartesian)).surfaceDistance;
						return m >= 1000 ? `${(m / 1000).toFixed(2)} km` : `${m.toFixed(2)} m`;
					}, false),
					font: '14px sans-serif',
					fillColor: CesiumLib.Color.WHITE,
					showBackground: true,
					backgroundColor: new CesiumLib.Color(0.1, 0.1, 0.1, 0.7),
					pixelOffset: new CesiumLib.Cartesian2(0, -20),
					disableDepthTestDistance: Number.POSITIVE_INFINITY
				}
			});
			break;
			
		case 'drawPolygon':
		case 'dianPolygon':
		case 'measureArea':
		case 'measureVolume':
			tempEntity = viewer.entities.add({
				polygon: {
					hierarchy: new CesiumLib.CallbackProperty(() => {
						if (!hoverCartesian) return new CesiumLib.PolygonHierarchy(positions);
						return new CesiumLib.PolygonHierarchy([...positions, hoverCartesian]);
					}, false),
					material: cyanColor.withAlpha(0.3),
					outline: true,
					outlineColor: cyanColor,
					outlineWidth: 2
				}
			});
			tempEdgeEntity = viewer.entities.add({
				polyline: {
					positions: new CesiumLib.CallbackProperty(() => {
						if (!hoverCartesian || positions.length === 0) return [];
						return [positions[positions.length - 1], hoverCartesian, positions[0]];
					}, false),
					width: 2,
					material: new CesiumLib.PolylineDashMaterialProperty({ color: cyanColor, dashLength: 16 })
				}
			});
			tempAreaLabel = viewer.entities.add({
				position: new CesiumLib.CallbackProperty(() => {
					const pts = hoverCartesian ? [...positions, hoverCartesian] : positions;
					if (pts.length === 0) return CesiumLib.Cartesian3.ZERO;
					let sumLon = 0, sumLat = 0;
					pts.forEach(p => {
						const c = CesiumLib.Cartographic.fromCartesian(p);
						sumLon += CesiumLib.Math.toDegrees(c.longitude);
						sumLat += CesiumLib.Math.toDegrees(c.latitude);
					});
					return CesiumLib.Cartesian3.fromDegrees(sumLon / pts.length, sumLat / pts.length);
				}, false),
				label: {
					text: new CesiumLib.CallbackProperty(() => {
						const pts = hoverCartesian ? [...positions, hoverCartesian] : positions;
						if (pts.length < 3) return '';
						const a = polygonArea(pts);
						return a >= 1e6 ? `${(a / 1e6).toFixed(2)} km²` : `${a.toFixed(2)} m²`;
					}, false),
					font: '14px sans-serif',
					fillColor: CesiumLib.Color.WHITE,
					showBackground: true,
					backgroundColor: new CesiumLib.Color(0.1, 0.1, 0.1, 0.7),
					disableDepthTestDistance: Number.POSITIVE_INFINITY
				}
			});
			break;
			
		case 'drawRect':
		case 'dianRect':
			tempEntity = viewer.entities.add({
				rectangle: {
					coordinates: new CesiumLib.CallbackProperty(() => {
						if (!hoverCartesian || positions.length === 0) return CesiumLib.Rectangle.MAX_VALUE;
						const c1 = CesiumLib.Cartographic.fromCartesian(positions[0]);
						const c2 = CesiumLib.Cartographic.fromCartesian(hoverCartesian);
						return CesiumLib.Rectangle.fromRadians(
							Math.min(c1.longitude, c2.longitude),
							Math.min(c1.latitude, c2.latitude),
							Math.max(c1.longitude, c2.longitude),
							Math.max(c1.latitude, c2.latitude)
						);
					}, false),
					material: cyanColor.withAlpha(0.3),
					outline: true,
					outlineColor: cyanColor,
					outlineWidth: 2
				}
			});
			break;
			
		case 'drawCircle':
		case 'dianCircle':
			tempEntity = viewer.entities.add({
				position: new CesiumLib.CallbackProperty(() => positions[0] || CesiumLib.Cartesian3.ZERO, false),
				ellipse: {
					semiMajorAxis: new CesiumLib.CallbackProperty(() => {
						if (!hoverCartesian || positions.length === 0) return 0.1;
						return Math.max(0.1, CesiumLib.Cartesian3.distance(positions[0], hoverCartesian));
					}, false),
					semiMinorAxis: new CesiumLib.CallbackProperty(() => {
						if (!hoverCartesian || positions.length === 0) return 0.1;
						return Math.max(0.1, CesiumLib.Cartesian3.distance(positions[0], hoverCartesian));
					}, false),
					material: cyanColor.withAlpha(0.3),
					outline: true,
					outlineColor: cyanColor,
					outlineWidth: 2
				}
			});
			tempRadiusEntity = viewer.entities.add({
				polyline: {
					positions: new CesiumLib.CallbackProperty(() => {
						if (!hoverCartesian || positions.length === 0) return [];
						return [positions[0], hoverCartesian];
					}, false),
					width: 2,
					material: new CesiumLib.PolylineDashMaterialProperty({ color: cyanColor, dashLength: 16 })
				}
			});
			break;
			
		case 'measureAzimuth':
			tempEntity = viewer.entities.add({
				polyline: {
					positions: new CesiumLib.CallbackProperty(() => {
						if (!hoverCartesian || positions.length === 0) return [];
						return [positions[0], hoverCartesian];
					}, false),
					width: 2,
					material: new CesiumLib.PolylineDashMaterialProperty({ color: CesiumLib.Color.YELLOW, dashLength: 16 }),
				}
			});
			tempDistanceLabel = viewer.entities.add({
				position: new CesiumLib.CallbackProperty(() => {
					if (!hoverCartesian || positions.length === 0) return positions[0] || CesiumLib.Cartesian3.ZERO;
					return hoverCartesian;
				}, false),
				label: {
					text: new CesiumLib.CallbackProperty(() => {
						if (!hoverCartesian || positions.length === 0) return '';
						return bearing(positions[0], hoverCartesian).toFixed(2) + '°';
					}, false),
					font: '14px sans-serif',
					fillColor: CesiumLib.Color.WHITE,
					showBackground: true,
					backgroundColor: new CesiumLib.Color(0.1, 0.1, 0.1, 0.7),
					pixelOffset: new CesiumLib.Cartesian2(0, -20),
					disableDepthTestDistance: Number.POSITIVE_INFINITY
				}
			});
			break;
			
		case 'measureAngle':
			tempEntity = viewer.entities.add({
				polyline: {
					positions: new CesiumLib.CallbackProperty(() => {
						if (!hoverCartesian || positions.length === 0) return [];
						if (positions.length === 1) return [positions[0], hoverCartesian];
						return [positions[0], positions[1], hoverCartesian];
					}, false),
					width: 2,
					material: new CesiumLib.PolylineDashMaterialProperty({ color: CesiumLib.Color.ORANGE, dashLength: 16 }),
				}
			});
			tempDistanceLabel = viewer.entities.add({
				position: new CesiumLib.CallbackProperty(() => {
					if (!hoverCartesian || positions.length < 2) return positions[0] || CesiumLib.Cartesian3.ZERO;
					return positions[1];
				}, false),
				label: {
					text: new CesiumLib.CallbackProperty(() => {
						if (!hoverCartesian || positions.length < 2) return '';
						return angleDeg(positions[0], positions[1], hoverCartesian).toFixed(2) + '°';
					}, false),
					font: '14px sans-serif',
					fillColor: CesiumLib.Color.WHITE,
					showBackground: true,
					backgroundColor: new CesiumLib.Color(0.1, 0.1, 0.1, 0.7),
					pixelOffset: new CesiumLib.Cartesian2(0, -20),
					disableDepthTestDistance: Number.POSITIVE_INFINITY
				}
			});
			break;
	}
}

function updateTempEntity(type, hoverCartesian) {
	// 逻辑主要通过 CallbackProperty 自动处理
}

function finalizeDrawing() {
	const viewer = getViewer();
	const CesiumLib = Cesium;
	if (!viewer || !activeTool.value || positions.length === 0) { resetDrawing(); return; }

	// 如果有旧的选中实体，先取消高亮
	if (currentMeasureEntity) {
		setEntityHighlight(currentMeasureEntity, false);
	}

	const toCarto = (c) => CesiumLib.Cartographic.fromCartesian(c);
	const toLonLat = (carto) => ({ lon: CesiumLib.Math.toDegrees(carto.longitude), lat: CesiumLib.Math.toDegrees(carto.latitude) });

	const distanceMeters = (pts) => {
		let sum = 0;
		for (let i = 1; i < pts.length; i++) {
			sum += new CesiumLib.EllipsoidGeodesic(toCarto(pts[i - 1]), toCarto(pts[i])).surfaceDistance;
		}
		return sum;
	};

	const bearing = (a, b) => {
		const A = toLonLat(toCarto(a)), B = toLonLat(toCarto(b));
		const φ1 = CesiumLib.Math.toRadians(A.lat), φ2 = CesiumLib.Math.toRadians(B.lat);
		const λ1 = CesiumLib.Math.toRadians(A.lon), λ2 = CesiumLib.Math.toRadians(B.lon);
		const y = Math.sin(λ2 - λ1) * Math.cos(φ2);
		const x = Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(λ2 - λ1);
		return (CesiumLib.Math.toDegrees(Math.atan2(y, x)) + 360) % 360;
	};

	const angleDeg = (a, b, c) => {
		const v1 = CesiumLib.Cartesian3.subtract(a, b, new CesiumLib.Cartesian3());
		const v2 = CesiumLib.Cartesian3.subtract(c, b, new CesiumLib.Cartesian3());
		return CesiumLib.Math.toDegrees(Math.acos(CesiumLib.Cartesian3.dot(v1, v2) / (CesiumLib.Cartesian3.magnitude(v1) * CesiumLib.Cartesian3.magnitude(v2))));
	};

	let text = '';
	let labelPos = positions[positions.length - 1];
	let finalAreaMeters = null;
	let finalLengthMeters = null;

	switch (activeTool.value) {
		case 'dianPolygon': {
			if (positions.length >= 3) {
				const polyEntity = viewer.entities.add({
					polygon: {
						hierarchy: new CesiumLib.PolygonHierarchy([...positions]),
						material: CesiumLib.Color.fromCssColorString('#45efff').withAlpha(0.12),
						outline: true,
						outlineColor: CesiumLib.Color.fromCssColorString('#45efff'),
						outlineWidth: 2
					}
				});
				polyEntity._djcxQuery = true;
				const ring = positions.map(p => {
					const c = toCarto(p);
					return [CesiumLib.Math.toDegrees(c.longitude), CesiumLib.Math.toDegrees(c.latitude)];
				});
				const first = ring[0];
				const last = ring[ring.length - 1];
				if (first && last && (first[0] !== last[0] || first[1] !== last[1])) ring.push([...first]);
				const results = djcxQueryPolygon(ring);
				djcxSetHighlights(results);
				if (results.length) djcxShowFeatureInPanel(results[0], results.length);
				else showInfoPanel.value = false;
			}
			break;
		}
		case 'dianRect': {
			if (positions.length >= 2) {
				const c1 = toCarto(positions[0]), c2 = toCarto(positions[positions.length - 1]);
				const rect = CesiumLib.Rectangle.fromRadians(Math.min(c1.longitude, c2.longitude), Math.min(c1.latitude, c2.latitude), Math.max(c1.longitude, c2.longitude), Math.max(c1.latitude, c2.latitude));
				const rectEntity = viewer.entities.add({
					rectangle: {
						coordinates: rect,
						material: CesiumLib.Color.fromCssColorString('#45efff').withAlpha(0.12),
						outline: true,
						outlineColor: CesiumLib.Color.fromCssColorString('#45efff'),
						outlineWidth: 2
					}
				});
				rectEntity._djcxQuery = true;
				const lonMin = CesiumLib.Math.toDegrees(rect.west), lonMax = CesiumLib.Math.toDegrees(rect.east);
				const latMin = CesiumLib.Math.toDegrees(rect.south), latMax = CesiumLib.Math.toDegrees(rect.north);
				const results = djcxQueryRect(lonMin, latMin, lonMax, latMax);
				djcxSetHighlights(results);
				if (results.length) djcxShowFeatureInPanel(results[0], results.length);
				else showInfoPanel.value = false;
			}
			break;
		}
		case 'dianCircle': {
			if (positions.length >= 2) {
				const rMeters = new CesiumLib.EllipsoidGeodesic(toCarto(positions[0]), toCarto(positions[positions.length - 1])).surfaceDistance;
				const circleEntity = viewer.entities.add({
					position: positions[0],
					ellipse: {
						semiMajorAxis: CesiumLib.Cartesian3.distance(positions[0], positions[positions.length - 1]),
						semiMinorAxis: CesiumLib.Cartesian3.distance(positions[0], positions[positions.length - 1]),
						material: CesiumLib.Color.fromCssColorString('#45efff').withAlpha(0.12),
						outline: true,
						outlineColor: CesiumLib.Color.fromCssColorString('#45efff'),
						outlineWidth: 2
					}
				});
				circleEntity._djcxQuery = true;
				const centerCarto = toCarto(positions[0]);
				const results = djcxQueryCircle(CesiumLib.Math.toDegrees(centerCarto.longitude), CesiumLib.Math.toDegrees(centerCarto.latitude), rMeters);
				djcxSetHighlights(results);
				if (results.length) djcxShowFeatureInPanel(results[0], results.length);
				else showInfoPanel.value = false;
			}
			break;
		}
		case 'drawLine':
		case 'measureDistance': {
			const lineEntity = viewer.entities.add({
				polyline: { 
					positions: [...positions], 
					width: 3, 
					material: COLORS.NORMAL.LINE,
					depthFailMaterial: COLORS.NORMAL.LINE.withAlpha(0.5)
				}
			});
			currentMeasureEntity = lineEntity;
			lineEntity._drawn = true;
			const d = distanceMeters(positions);
			text = d >= 1000 ? `${(d / 1000).toFixed(2)} km` : `${d.toFixed(2)} m`;
			const defaultName = autoName('distance');
			measureForm.name = defaultName;
			measureForm.lengthMeters = d;
			measureForm.areaSqMeters = 0;
			finalLengthMeters = d;
			measurePanelVisible.value = true;
			showInfoPanel.value = false;
			lastMeasure.points = positions.map(p => {
				const c = toCarto(p);
				return { lon: CesiumLib.Math.toDegrees(c.longitude), lat: CesiumLib.Math.toDegrees(c.latitude) };
			});
			lastMeasure.segmentsMeters = [];
			lastMeasure.cumulativeMeters = [];
			let acc = 0;
			for (let i = 0; i < positions.length; i++) {
				let seg = i > 0 ? new CesiumLib.EllipsoidGeodesic(toCarto(positions[i - 1]), toCarto(positions[i])).surfaceDistance : 0;
				acc += seg;
				lastMeasure.segmentsMeters.push(seg);
				lastMeasure.cumulativeMeters.push(acc);
			}
			if (lineEntity) {
				lineEntity._measureData = { points: [...lastMeasure.points], segmentsMeters: [...lastMeasure.segmentsMeters], cumulativeMeters: [...lastMeasure.cumulativeMeters], lengthMeters: d, kind: 'distance', name: defaultName, unit: measureForm.unit || 'auto', desc: measureForm.desc || '' };
				lineEntity.name = 'measure-distance';
				lineEntity._measurePoints = [...currentMeasurePoints];
			}
			break;
		}
		case 'drawPolygon':
		case 'measureArea':
		case 'measureVolume': {
			const polyEntity = viewer.entities.add({
				polygon: { 
					hierarchy: new CesiumLib.PolygonHierarchy([...positions]), 
					material: COLORS.NORMAL.FILL, 
					outline: true, 
					outlineColor: COLORS.NORMAL.OUTLINE,
					outlineWidth: 2
				}
			});
			currentMeasureEntity = polyEntity;
			polyEntity._drawn = true;
			if (positions.length >= 3) {
				const a = polygonArea(positions);
				text = a >= 1e6 ? `${(a / 1e6).toFixed(2)} km²` : `${a.toFixed(2)} m²`;
				measureForm.areaSqMeters = a;
				finalAreaMeters = a;
				const peri = (pts) => {
					let sum = 0;
					for (let i = 1; i < pts.length; i++) sum += new CesiumLib.EllipsoidGeodesic(toCarto(pts[i - 1]), toCarto(pts[i])).surfaceDistance;
					sum += new CesiumLib.EllipsoidGeodesic(toCarto(pts[pts.length - 1]), toCarto(pts[0])).surfaceDistance;
					return sum;
				};
				measureForm.lengthMeters = peri(positions);
				finalLengthMeters = measureForm.lengthMeters;
				measurePanelVisible.value = true;
				showInfoPanel.value = false;

				// 更新 lastMeasure
				lastMeasure.points = positions.map(p => {
					const c = toCarto(p);
					return { lon: CesiumLib.Math.toDegrees(c.longitude), lat: CesiumLib.Math.toDegrees(c.latitude) };
				});
				lastMeasure.segmentsMeters = [];
				lastMeasure.cumulativeMeters = [];
				let acc = 0;
				for (let i = 0; i < positions.length; i++) {
					let seg = i > 0 ? new CesiumLib.EllipsoidGeodesic(toCarto(positions[i - 1]), toCarto(positions[i])).surfaceDistance : 0;
					acc += seg;
					lastMeasure.segmentsMeters.push(seg);
					lastMeasure.cumulativeMeters.push(acc);
				}

				let sumLon = 0, sumLat = 0;
				positions.forEach(p => { const c = toCarto(p); sumLon += CesiumLib.Math.toDegrees(c.longitude); sumLat += CesiumLib.Math.toDegrees(c.latitude); });
				labelPos = CesiumLib.Cartesian3.fromDegrees(sumLon / positions.length, sumLat / positions.length);
				const defaultName = autoName(activeTool.value === 'measureVolume' ? 'volume' : 'polygon');
				measureForm.name = defaultName;
				if (polyEntity) {
					polyEntity._measureData = { 
						points: [...lastMeasure.points],
						segmentsMeters: [...lastMeasure.segmentsMeters],
						cumulativeMeters: [...lastMeasure.cumulativeMeters],
						areaSqMeters: a, 
						lengthMeters: measureForm.lengthMeters, 
						kind: activeTool.value === 'measureVolume' ? 'volume' : 'area', 
						name: defaultName, 
						unit: measureForm.unit || 'auto', 
						desc: measureForm.desc || '', 
						heightMeters: measureForm.heightMeters || 0, 
						volumeCubicMeters: (measureForm.heightMeters || 0) * a 
					};
					polyEntity.name = 'measure-polygon';
					polyEntity._measurePoints = [...currentMeasurePoints];
				}
			}
			break;
		}
		case 'drawRect': {
			if (positions.length >= 2) {
				const c1 = toCarto(positions[0]), c2 = toCarto(positions[positions.length - 1]);
				const rect = CesiumLib.Rectangle.fromRadians(Math.min(c1.longitude, c2.longitude), Math.min(c1.latitude, c2.latitude), Math.max(c1.longitude, c2.longitude), Math.max(c1.latitude, c2.latitude));
				const rectEntity = viewer.entities.add({ rectangle: { coordinates: rect, material: COLORS.NORMAL.FILL, outline: true, outlineColor: COLORS.NORMAL.OUTLINE, outlineWidth: 2 } });
				currentMeasureEntity = rectEntity;
				rectEntity._drawn = true;
				const defaultName = autoName('rect');
				measureForm.name = defaultName;
				const lonMin = CesiumLib.Math.toDegrees(rect.west), lonMax = CesiumLib.Math.toDegrees(rect.east), latMin = CesiumLib.Math.toDegrees(rect.south), latMax = CesiumLib.Math.toDegrees(rect.north);
				const rectPts = [
					CesiumLib.Cartesian3.fromDegrees(lonMin, latMin), 
					CesiumLib.Cartesian3.fromDegrees(lonMax, latMin), 
					CesiumLib.Cartesian3.fromDegrees(lonMax, latMax), 
					CesiumLib.Cartesian3.fromDegrees(lonMin, latMax)
				];
				const aRect = polygonArea(rectPts);
				measureForm.areaSqMeters = aRect;
				finalAreaMeters = aRect;
				const sideLen = (a, b) => new CesiumLib.EllipsoidGeodesic(toCarto(a), toCarto(b)).surfaceDistance;
				measureForm.lengthMeters = sideLen(rectPts[0], rectPts[1]) + sideLen(rectPts[1], rectPts[2]) + sideLen(rectPts[2], rectPts[3]) + sideLen(rectPts[3], rectPts[0]);
				finalLengthMeters = measureForm.lengthMeters;
				measurePanelVisible.value = true;
				showInfoPanel.value = false;

				// 更新 lastMeasure
				lastMeasure.points = rectPts.map(p => {
					const c = toCarto(p);
					return { lon: CesiumLib.Math.toDegrees(c.longitude), lat: CesiumLib.Math.toDegrees(c.latitude) };
				});
				lastMeasure.segmentsMeters = [];
				lastMeasure.cumulativeMeters = [];
				let acc = 0;
				for (let i = 0; i < rectPts.length; i++) {
					let seg = i > 0 ? sideLen(rectPts[i - 1], rectPts[i]) : 0;
					acc += seg;
					lastMeasure.segmentsMeters.push(seg);
					lastMeasure.cumulativeMeters.push(acc);
				}

				if (rectEntity) {
					rectEntity._measureData = { 
						points: [...lastMeasure.points],
						segmentsMeters: [...lastMeasure.segmentsMeters],
						cumulativeMeters: [...lastMeasure.cumulativeMeters],
						areaSqMeters: aRect, 
						lengthMeters: measureForm.lengthMeters, 
						kind: 'area', 
						name: defaultName, 
						unit: measureForm.unit || 'auto', 
						desc: measureForm.desc || '' 
					};
					rectEntity.name = 'measure-rect';
					rectEntity._measurePoints = [...currentMeasurePoints];
				}
			}
			break;
		}
		case 'drawCircle': {
			if (positions.length >= 2) {
				const r = CesiumLib.Cartesian3.distance(positions[0], positions[positions.length - 1]);
				const circleEntity = viewer.entities.add({ position: positions[0], ellipse: { semiMajorAxis: r, semiMinorAxis: r, material: COLORS.NORMAL.FILL, outline: true, outlineColor: COLORS.NORMAL.OUTLINE, outlineWidth: 2 } });
				currentMeasureEntity = circleEntity;
				circleEntity._drawn = true;
				const defaultName = autoName('circle');
				measureForm.name = defaultName;
				measureForm.areaSqMeters = Math.PI * r * r;
				measureForm.lengthMeters = 2 * Math.PI * r;
				finalAreaMeters = measureForm.areaSqMeters;
				finalLengthMeters = measureForm.lengthMeters;
				measurePanelVisible.value = true;
				showInfoPanel.value = false;
				text = `R=${r.toFixed(2)} m`;

				// 更新 lastMeasure (圆心和边缘点)
				lastMeasure.points = positions.map(p => {
					const c = toCarto(p);
					return { lon: CesiumLib.Math.toDegrees(c.longitude), lat: CesiumLib.Math.toDegrees(c.latitude) };
				});
				lastMeasure.segmentsMeters = [0, r];
				lastMeasure.cumulativeMeters = [0, r];

				if (circleEntity) {
					circleEntity._measureData = { 
						points: [...lastMeasure.points],
						segmentsMeters: [...lastMeasure.segmentsMeters],
						cumulativeMeters: [...lastMeasure.cumulativeMeters],
						areaSqMeters: measureForm.areaSqMeters, 
						lengthMeters: measureForm.lengthMeters, 
						kind: 'area', 
						name: defaultName, 
						unit: measureForm.unit || 'auto', 
						desc: measureForm.desc || '' 
					};
					circleEntity.name = 'measure-circle';
					circleEntity._measurePoints = [...currentMeasurePoints];
				}
			}
			break;
		}
		case 'measureAzimuth': {
			if (positions.length >= 2) {
				const azEntity = viewer.entities.add({ 
					polyline: { 
						positions: [...positions], 
						width: 3, 
						material: COLORS.NORMAL.LINE,
						depthFailMaterial: COLORS.NORMAL.LINE.withAlpha(0.5)
					} 
				});
				azEntity._drawn = true;
				azEntity._measurePoints = [...currentMeasurePoints];
				const b = bearing(positions[0], positions[positions.length - 1]);
				text = `${b.toFixed(2)}°`;
				
				// 填充 measureData
				azEntity._measureData = {
					kind: 'azimuth',
					name: autoName('azimuth'),
					lengthMeters: new CesiumLib.EllipsoidGeodesic(toCarto(positions[0]), toCarto(positions[1])).surfaceDistance,
					areaSqMeters: 0,
					points: positions.map(p => {
						const c = toCarto(p);
						return { lon: CesiumLib.Math.toDegrees(c.longitude), lat: CesiumLib.Math.toDegrees(c.latitude) };
					})
				};
			}
			break;
		}
		case 'measureAngle': {
			if (positions.length >= 3) {
				const angEntity = viewer.entities.add({ 
					polyline: { 
						positions: [...positions], 
						width: 3, 
						material: COLORS.NORMAL.LINE,
						depthFailMaterial: COLORS.NORMAL.LINE.withAlpha(0.5)
					} 
				});
				angEntity._drawn = true;
				angEntity._measurePoints = [...currentMeasurePoints];
				const a = angleDeg(positions[0], positions[1], positions[2]);
				text = `${a.toFixed(2)}°`;

				// 填充 measureData
				angEntity._measureData = {
					kind: 'angle',
					name: autoName('angle'),
					lengthMeters: 0,
					areaSqMeters: 0,
					points: positions.map(p => {
						const c = toCarto(p);
						return { lon: CesiumLib.Math.toDegrees(c.longitude), lat: CesiumLib.Math.toDegrees(c.latitude) };
					})
				};
			}
			break;
		}
	}

	if (text) {
		resultLabel = viewer.entities.add({ 
			position: labelPos, 
			label: { 
				text, 
				font: 'bold 14px Microsoft YaHei', 
				fillColor: CesiumLib.Color.WHITE, 
				showBackground: true, 
				backgroundColor: new CesiumLib.Color(0.1, 0.1, 0.1, 0.8), 
				pixelOffset: new CesiumLib.Cartesian2(0, -25), 
				disableDepthTestDistance: Number.POSITIVE_INFINITY
			} 
		});
		if (resultLabel) {
			resultLabel._measureData = { areaSqMeters: finalAreaMeters, lengthMeters: finalLengthMeters };
			resultLabel.name = 'measure-label';
			if (currentMeasureEntity) currentMeasureEntity._measureLabel = resultLabel;
		}
	}
	
	// 确保面板显示在信息模块
	measureActiveTab.value = 'info';
	
	// 高亮显示新创建的实体
	if (currentMeasureEntity) {
		handleMapClick({ entity: currentMeasureEntity });
	}

	// 移除临时辅助实体
	[tempEntity, tempSolidEntity, tempEdgeEntity, tempDistanceLabel, tempAreaLabel, tempRadiusEntity, tooltipEntity, crosshairX, crosshairY].forEach(ent => {
		if (ent) viewer.entities.remove(ent);
	});
	
	if (drawHandler) drawHandler.destroy();
	drawHandler = null; 
	activeTool.value = null;
	drawingHint.value = '';
}

// 其他逻辑：定位、图层、AI
async function locateToMe() {
	const viewer = getViewer();
	if (!viewer) return;
	navigator.geolocation.getCurrentPosition(pos => {
		const { latitude: lat, longitude: lon } = pos.coords;
		viewer.camera.flyTo({ destination: Cesium.Cartesian3.fromDegrees(lon, lat, 1500), duration: 1.5 });
		viewer.entities.add({ position: Cesium.Cartesian3.fromDegrees(lon, lat), point: { pixelSize: 8, color: Cesium.Color.YELLOW } });
	});
}
function setBaseLayer(name) {
	baseLayerActive.value = name;
	if (name === '卫星图') { removeVecLayer(); removeCvaLayer(); }
	else if (name === '矢量图') { addVecLayer(); addCvaLayer(); }
	else { removeVecLayer(); addCvaLayer(); }
}
function toggleLayerPanel() { layerPanelVisible.value = !layerPanelVisible.value; }
function closeInfoPanel() { showInfoPanel.value = false; }

// AI 相关
function closeAiChat() { aiChatVisible.value = false; }
function scrollAiBottom() { nextTick(() => { const el = smartAnalysisRef.value?.aiChatBodyRef; if (el) el.scrollTop = el.scrollHeight; }); }
function toggleAiChatSize() { aiChatMaximized.value = !aiChatMaximized.value; scrollAiBottom(); }
function onAiDragStart(e) {
	if (aiChatMaximized.value) return;
	const el = smartAnalysisRef.value?.aiChatPanelRef;
	if (!el) return;
	const point = e.touches ? e.touches[0] : e;
	const rect = el.getBoundingClientRect();
	aiChatDragging.value = true;
	aiDragStart.value = { clientX: point.clientX, clientY: point.clientY, originTop: rect.top, originLeft: rect.left };
	window.addEventListener('mousemove', onAiDragging); window.addEventListener('mouseup', onAiDragEnd);
}
function onAiDragging(e) {
	if (!aiChatDragging.value) return;
	const point = e.touches ? e.touches[0] : e;
	aiChatTop.value = aiDragStart.value.originTop + (point.clientY - aiDragStart.value.clientY);
	aiChatLeft.value = aiDragStart.value.originLeft + (point.clientX - aiDragStart.value.clientX);
}
function onAiDragEnd() { aiChatDragging.value = false; window.removeEventListener('mousemove', onAiDragging); window.removeEventListener('mouseup', onAiDragEnd); }
async function sendAiMessage() {
	if (!aiChatInput.value.trim()) return;
	aiChatMessages.value.push({ role: 'user', text: aiChatInput.value });
	const input = aiChatInput.value; aiChatInput.value = ''; scrollAiBottom();
	setTimeout(() => { aiChatMessages.value.push({ role: 'assistant', text: `这是模拟回答：${input}` }); scrollAiBottom(); }, 500);
}

const aiDragStart = ref({});

onMounted(async () => {
	// 加载地价查询图层
	// list.value = await getLandPriceLayers();

	initCesium();
	addClickHandler(handleMapClick);
	addMouseMoveHandler(coords => mouseCoords.value = coords);
	addHeadingUpdateHandler(deg => headingDeg.value = deg);
	addScaleUpdateHandler(info => { if (info) Object.assign(scaleBar, info); });
	document.addEventListener('click', e => {
		if (layerPanelVisible.value && !layerPanelRef.value?.contains(e.target) && !layerBtnRef.value?.contains(e.target)) layerPanelVisible.value = false;
	});
	updateIndicator();
	window.addEventListener('resize', updateIndicator);
});

onBeforeUnmount(() => {
	removeClickHandler(); removeMouseMoveHandler(); removeHeadingUpdateHandler(); removeScaleUpdateHandler();
	destroyCesium();
});

function confirmLogout() {
	ElMessageBox.confirm(
		'确定要退出登录吗？',
		'提示',
		{
			confirmButtonText: '确定',
			cancelButtonText: '取消',
			type: 'warning',
		}
	)
		.then(() => {
			emit('logout');
		})
		.catch(() => {
			// 取消退出
		});
}

// 处理地图点击
function handleMapClick(info) {
	// 如果点击的是测量实体
	if (info?.entity?._measureData) {
		// 取消之前选中的高亮
		if (currentMeasureEntity && currentMeasureEntity !== info.entity) {
			setEntityHighlight(currentMeasureEntity, false);
		}
		
		const data = info.entity._measureData;
		currentMeasureEntity = info.entity;
		currentMeasurePoints = info.entity._measurePoints || [];
		
		// 设置当前选中的高亮
		setEntityHighlight(currentMeasureEntity, true);
		
		measurePanelVisible.value = true;
		
		// 关键：将实体中的数据还原到响应式状态
		Object.assign(measureForm, data);
		if (data.points) lastMeasure.points = [...data.points];
		if (data.segmentsMeters) lastMeasure.segmentsMeters = [...data.segmentsMeters];
		if (data.cumulativeMeters) lastMeasure.cumulativeMeters = [...data.cumulativeMeters];
		
		// 自动切换到信息模块
		measureActiveTab.value = 'info';
		
		// 切换到测量所在的 Tab（首页）
		activeTopTab.value = 'sy';
		return;
	}
	
	// 点击空白处取消选中
	if (currentMeasureEntity) {
		setEntityHighlight(currentMeasureEntity, false);
		currentMeasureEntity = null;
		measurePanelVisible.value = false;
	}

	if (activeTopTab.value === 'djcx') {
		if (info?.entity?._djcxFeature) {
			djcxSetHighlights([info.entity]);
			djcxShowFeatureInPanel(info.entity);
			return;
		}

		if (activeTool.value === 'dianxuan' && info?.coordinates) {
			const results = djcxQueryPoint(info.coordinates.longitude, info.coordinates.latitude);
			djcxSetHighlights(results);
			if (results.length) djcxShowFeatureInPanel(results[0], results.length);
			else showInfoPanel.value = false;
			return;
		}
	}
	
	// 如果点击的是 3D Tileset 要素
	if (info?.properties && Object.keys(info.properties).length) {
		clickInfo.value = info; 
		showInfoPanel.value = true;
	}
}

// 数据复制与删除 (保留在 Shell 中)
function copyCoords() { navigator.clipboard.writeText(lastMeasure.points.map((p, i) => `${i}\t${p.lon}\t${p.lat}`).join('\n')); }
function copyAll() { navigator.clipboard.writeText(lastMeasure.points.map((p, i) => `${i}\t${p.lon}\t${p.lat}\t${lastMeasure.segmentsMeters[i]}\t${lastMeasure.cumulativeMeters[i]}`).join('\n')); }
async function deleteCurrentMeasure() {
	if (currentMeasureEntity) {
		getViewer().entities.remove(currentMeasureEntity);
		if (currentMeasureEntity._measureLabel) getViewer().entities.remove(currentMeasureEntity._measureLabel);
		currentMeasurePoints.forEach(p => getViewer().entities.remove(p));
		measurePanelVisible.value = false;
	}
}
async function clearAllMeasures() {
	resetDrawing();
	const viewer = getViewer();
	[...viewer.entities.values].forEach(ent => {
		if (ent._measureData || ent._drawn || ent.name === 'measure-label') {
			if (ent._measureLabel) viewer.entities.remove(ent._measureLabel);
			if (ent._measurePoints) ent._measurePoints.forEach(p => viewer.entities.remove(p));
			viewer.entities.remove(ent);
		}
	});
	currentMeasureEntity = null;
	measurePanelVisible.value = false;
}
</script>

<style scoped>
.cesium-box {
	position: absolute;
	top: 0; left: 0; right: 0; bottom: 0;
	overflow: hidden;
}

.bt {
	background-color: rgb(21, 21, 21);
	width: 100%; height: 50px;
	position: absolute; top: 0; left: 0;
	color: #fff; z-index: 1;
}

.bt .icon {
	width: 20px; height: 20px;
	background: url('../assets/九宫格2.png') center/100% no-repeat;
	position: absolute; top: 15px; left: 20px;
}

.bt1 {
	font-size: 18px; line-height: 50px; margin-left: 50px;
	font-weight: 600; font-style: italic;
}

.acction {
	position: absolute;
	right: 60px;
	top: 0;
	line-height: 50px;
	font-size: 14px;
	color: #fff;
}

.dianyuan {
	position: absolute;
	right: 20px;
	top: 10px;
	width: 30px;
	height: 30px;
	background: #f56c6c url('../assets/电源.png') center/60% no-repeat;
	cursor: pointer;
	border-radius: 4px;
	transition: background 0.3s;
}

.dianyuan:hover {
	background-color: #f78989;
}

.top-tabs {
	position: absolute; left: 50%; top: 8px; transform: translateX(-50%);
	display: flex; background: rgba(0, 0, 0, 0.7);
	border-radius: 4px; padding: 4px; z-index: 1;
}

.top-tab {
	padding: 4px 16px; width: 60px; text-align: center;
	color: #cfd3d7; cursor: pointer; font-size: 13px; z-index: 1;
}

.top-tab.active { color: #fff; }

.top-tab-indicator {
	position: absolute; top: 4px; height: calc(100% - 8px);
	background: #0a65ff; border-radius: 4px;
	transition: left .25s ease, width .25s ease;
}

.dibu {
	position: absolute; bottom: 0; left: 0; width: 100%; height: 20px;
	background: rgba(25, 35, 32); color: #fff; z-index: 1;
	line-height: 20px; font-size: 10px;
}

.bilichi {
	width: 320px; height: 35px; position: absolute; bottom: 30px; left: 10px;
	background: rgba(25, 35, 32, 0.6); border-radius: 5px; z-index: 1;
}

.dibu_tool {
	width: 150px; height: 35px; position: absolute; bottom: 30px; right: 10px;
	display: flex; justify-content: center; align-items: center; gap: 10px; z-index: 1;
}

.dibu_tool_btn {
	width: 30px; height: 30px; border-radius: 50%; cursor: pointer;
	background: rgba(0, 0, 0, 0.4) center/70% no-repeat;
}

.dingwei { background-image: url('../assets/当前位置.png'); }
.tuceng { background-image: url('../assets/地球.png'); }
.zhinanzhen { background-image: url('../assets/指南针.png'); background-size: 100% 70%; transition: transform 0.2s linear; }

.layer-panel {
	position: absolute; bottom: 70px; right: 10px; width: 220px;
	background: rgba(25, 35, 32, 0.9); border: 1px solid #3a4a46;
	border-radius: 6px; z-index: 10;
}

.layer-grid { display: flex; gap: 10px; padding: 10px; justify-content: space-between; }
.layer-card {
	width: 110px; height: 90px; background: #25322f;
	border: 1px solid #3a4a46; border-radius: 6px;
	cursor: pointer; display: flex; flex-direction: column; align-items: center; justify-content: flex-end;
}

.layer-card .thumb { width: 100%; height: 65px; background-size: cover; background-position: center; }
.layer-card .label { width: 100%; color: #fff; text-align: center; font-size: 14px; line-height: 28px; }
.layer-card.active { border-color: #45efff; }
.layer-card.active .label { background: #1f8cf0; }

.thumb-satellite { background-image: url('../assets/卫星图.png'); }
.thumb-vector { background-image: url('../assets/矢量图.png'); }
.thumb-road { background-image: url('../assets/注记图.png'); }
</style>
