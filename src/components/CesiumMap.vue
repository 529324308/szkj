<template>
	<div class="cesium-box">
		<!-- 顶部 标题栏、Tab 切换、登出 -->
		<div class="bt">
			<i class="icon"></i>
			<div class="bt1">浙江数治空间平台</div>
			<div class="banben">v 0.0.1</div>
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

		<!-- 1. 平台首页 -->
		<PortalHome
			:active="homeUiVisible"
			:collapsing="homeSidebarCollapsing"
			:entering="homeSidebarEntering"
			:user-name="currentUserName"
			:icons="icons"
			:active-nav-key="activeTopTab"
			@enter-module="enterModule"
		/>

		<!-- 2. 数治测绘模块 -->
		<Home 
			:class="{ 'module-appear': moduleEnterKey === 'sy' }"
			:active="activeTopTab === 'sy'"
			:active-tool="activeTool"
			:icons="icons"
			:measure-panel-visible="measurePanelVisible"
			:terrain-active="terrainActive"
			:terrain-panel-visible="terrainPanelVisible"
			v-model:terrain-url="terrainInputUrl"
			v-model:terrain-name="terrainInputName"
			v-model:measure-active-tab="measureActiveTab"
			:measure-form="measureForm"
			:last-measure="lastMeasure"
			:sy-info-items="syInfoItems"
			@start-tool="startTool"
			@clear-all="clearAllMeasures"
			@open-terrain-panel="openTerrainPanel"
			@close-terrain="closeTerrain"
			@confirm-terrain="confirmTerrain"
			@cancel-terrain="cancelTerrainPanel"
			@update:measurePanelVisible="measurePanelVisible = $event"
			@copy-all="copyAll"
			@copy-coords="copyCoords"
			@delete-current="deleteCurrentMeasure"
			@toggle-sy-info-item="toggleSyInfoItem"
			@select-sy-info-item="selectSyInfoItem"
			@delete-sy-info-item="deleteSyInfoItem"
			@confirm-shp-import="confirmShpImport"
			@confirm-kml-import="confirmKmlImport"
			@confirm-cad-import="confirmCadImport"
		/>

		<!-- 3. 数治地价 -->
		<LandPriceQuery 
			:class="{ 'module-appear': moduleEnterKey === 'djcx' }"
			:active="activeTopTab === 'djcx'"
			:icons="icons"
			:active-tool="activeTool"
			:djcx-gongneng="djcxGongneng"
			:djcx-loading="djcxLoading"
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
			@close-info="closeInfoPanel"
		/>

		<!-- 4. 智能分析模块 -->
		<SmartAnalysis 
			ref="smartAnalysisRef"
			:class="{ 'module-appear': moduleEnterKey === 'znfx' }"
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

		<!-- 5. 数据管理模块 -->
		<DataManagement 
			ref="dataManagementRef"
			:class="{ 'module-appear': moduleEnterKey === 'sjgl' }"
			:active="activeTopTab === 'sjgl'" 
			:icons="icons"
		/>

		<!-- 6. 个人中心模块 -->
		<PersonalCenter :class="{ 'module-appear': moduleEnterKey === 'grzx' }" :active="activeTopTab === 'grzx'" />

		<!-- 底部显示经纬度 -->
		<div v-if="activeTopTab !== 'home'" class="dibu">
			<span style="margin-left: 20px; font-size: 12px;">经度: {{ mouseCoords.longitude !== null ?
				mouseCoords.longitude.toFixed(6) + '°' : '--' }}</span>
			<span style="margin-left: 20px; font-size: 12px;">纬度: {{ mouseCoords.latitude !== null ?
				mouseCoords.latitude.toFixed(6) + '°' : '--' }}</span>
		</div>

		<!-- 比例尺与层级显示 -->
		<div v-if="activeTopTab !== 'home'" class="bilichi">
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
		<div v-if="activeTopTab !== 'home'" class="dibu_tool">
			<div class="dibu_tool_btn dingwei" @click="locateToMe"></div>
			<div class="dibu_tool_btn tuceng" ref="layerBtnRef" @click="toggleLayerPanel"></div>
			<div class="dibu_tool_btn zhinanzhen" :style="{ transform: 'rotate(' + compassRotation + 'deg)' }"></div>
		</div>

		<!-- 图层选择悬浮面板 -->
		<div v-if="activeTopTab !== 'home' && layerPanelVisible" ref="layerPanelRef" class="layer-panel" @click.stop>
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

		<div v-if="shpFeaturePopupVisible">
			<transition name="shp-info-panel-pop">
				<div
					v-if="!shpFeaturePopupMinimized"
					class="shp-feature-panel"
					:style="shpFeaturePanelStyle"
				>
					<div class="shp-feature-header" @pointerdown.prevent="onShpFeatureHeaderPointerDown">
						<div class="shp-feature-header-main">
							<div class="shp-feature-title">{{ shpFeaturePopup.title }}</div>
							<div class="shp-feature-subtitle">{{ shpFeaturePopup.subtitle }}</div>
						</div>
						<div class="shp-feature-actions">
							<button
								type="button"
								class="shp-feature-action"
								@pointerdown.stop.prevent
								@click.stop="minimizeShpFeaturePopup"
							>—</button>
							<button
								type="button"
								class="shp-feature-action close"
								@pointerdown.stop.prevent
								@click.stop="closeShpFeaturePopup"
							>×</button>
						</div>
					</div>
					<div class="shp-feature-body">
						<div class="shp-feature-section">
							<div class="shp-feature-section-title">基础信息</div>
							<div class="shp-feature-meta-item">
								<span class="shp-feature-meta-key">图层名称</span>
								<span class="shp-feature-meta-value">{{ shpFeaturePopup.layerName || '-' }}</span>
							</div>
							<div class="shp-feature-meta-item">
								<span class="shp-feature-meta-key">要素名称</span>
								<span class="shp-feature-meta-value">{{ shpFeaturePopup.title || '-' }}</span>
							</div>
							<div class="shp-feature-meta-item">
								<span class="shp-feature-meta-key">几何类型</span>
								<span class="shp-feature-meta-value">{{ shpFeaturePopup.geometryType || '-' }}</span>
							</div>
							<div class="shp-feature-meta-item">
								<span class="shp-feature-meta-key">要素序号</span>
								<span class="shp-feature-meta-value">{{ shpFeaturePopup.featureIndexDisplay }}</span>
							</div>
							<div class="shp-feature-meta-item">
								<span class="shp-feature-meta-key">来源文件</span>
								<span class="shp-feature-meta-value">{{ shpFeaturePopup.sourceFileName || '-' }}</span>
							</div>
						</div>

						<div class="shp-feature-section">
							<div class="shp-feature-section-title">属性信息</div>
							<div v-if="shpFeaturePopupEntries.length" class="shp-feature-properties">
								<div v-for="item in shpFeaturePopupEntries" :key="item.key" class="shp-feature-property">
									<div class="shp-feature-property-key">{{ item.key }}</div>
									<div class="shp-feature-property-value">{{ item.value }}</div>
								</div>
							</div>
							<div v-else class="shp-feature-empty">该要素暂无属性信息</div>
						</div>
					</div>
				</div>
			</transition>

			<transition name="shp-info-float-pop">
				<div
					v-if="shpFeaturePopupMinimized"
					class="shp-feature-float"
					:class="[shpFeatureFloatDock.side, { dragging: shpFeatureFloatDrag.active, snapped: shpFeatureFloatSnapped }]"
					:style="shpFeatureFloatStyle"
					@pointerdown.prevent="onShpFeatureFloatPointerDown"
				>
					<img class="shp-feature-float-icon" :src="icons.shp" alt="SHP要素" draggable="false" />
				</div>
			</transition>
		</div>

		<!-- 地图容器 -->
		<div id="cesiumContainer" style="width: 100%; height: 100vh;"></div>
	</div>
</template>

<script setup>
import { onMounted, onBeforeUnmount, ref, reactive, watch, toRaw, computed, nextTick } from 'vue';
import * as Cesium from 'cesium';
import { centroid as turfCentroid, polygon as turfPolygon } from '@turf/turf';
import proj4 from 'proj4';
import { useCesium } from '../composables/useCesium';
import { ElMessage, ElMessageBox } from 'element-plus';
// import { getLandPriceLayers } from '../api/map';

// 导入子组件
import PortalHome from './map/PortalHome.vue';
import Home from './map/Home.vue';
import LandPriceQuery from './map/LandPriceQuery.vue';
import SmartAnalysis from './map/SmartAnalysis.vue';
import DataManagement from './map/DataManagement.vue';
import PersonalCenter from './map/PersonalCenter.vue';

const emit = defineEmits(['logout']);
const TERRAIN_INPUT_STORAGE_KEY = 'terrainInputUrl';
const TERRAIN_NAME_STORAGE_KEY = 'terrainInputName';
const MESSAGE_OFFSET_TOP = 200;

// 工具栏图标
const icons = {
	markPoint: new URL('../assets/标点.png', import.meta.url).href,
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
	duodian: new URL('../assets/光标+.png', import.meta.url).href,
	dixing: new URL('../assets/地形.png', import.meta.url).href,
	tuceng: new URL('../assets/图层管理.png', import.meta.url).href,
	shangchuan: new URL('../assets/上传云端.png', import.meta.url).href,
	daoru: new URL('../assets/导入本地.png', import.meta.url).href,
	shp: new URL('../assets/shp.png', import.meta.url).href,
	kml: new URL('../assets/_KML.png', import.meta.url).href,
	cad: new URL('../assets/CAD.png', import.meta.url).href,
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
	enableNetworkTerrain,
	disableTerrain,
	enterHomeScene,
	stopHomeEarthRotation,
	flyToOnLeaveHome,
} = useCesium(containerId);

// 状态管理
const topTabs = [
	{ key: 'home', label: '首页' },
	{ key: 'sy', label: '数治测绘' },
	{ key: 'djcx', label: '数治地价' },
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
const DEFAULT_MEASURE_FORM = { name: '', unit: 'auto', path: '测绘/默认', desc: '', lengthMeters: 0, areaSqMeters: 0, heightMeters: 0, volumeCubicMeters: 0, longitude: null, latitude: null, kind: '' };
const measureForm = reactive({ ...DEFAULT_MEASURE_FORM });
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
const djcxLoading = ref(false);
const terrainActive = ref(false);
const terrainPanelVisible = ref(false);
const terrainInputUrl = ref(localStorage.getItem(TERRAIN_INPUT_STORAGE_KEY) || '');
const terrainInputName = ref(localStorage.getItem(TERRAIN_NAME_STORAGE_KEY) || '');
const terrainModelItems = ref([]);
const terrainNetworkVisible = ref(false);
const selectedTerrainItemKey = ref('');
const shpImportItems = ref([]);
const selectedShpItemKey = ref('');
const kmlImportItems = ref([]);
const selectedKmlItemKey = ref('');
const cadImportItems = ref([]);
const selectedCadItemKey = ref('');
const selectedMarkPointEntityId = ref('');

// 统一高亮状态管理 - 使用单一标识符
let selectedSyInfoKey = '';
const selectedSyInfoKeyRef = ref('');

// 要素级别选中状态跟踪（支持同一文件中不同要素的选择）
const selectedShpFeatureEntityId = ref('');
const selectedKmlFeatureEntityId = ref('');
const selectedCadFeatureEntityId = ref('');

function getSelectedSyInfoKey() {
	return selectedSyInfoKey;
}

function setSelectedSyInfoKey(key) {
	selectedSyInfoKey = key;
	selectedSyInfoKeyRef.value = key;
}

function clearAllSySelection() {
	// 清空所有选中状态
	const viewer = getViewer();

	// 清除标点高亮
	if (selectedMarkPointEntityId.value) {
		const prevMarkPoint = viewer?.entities.getById(selectedMarkPointEntityId.value);
		if (prevMarkPoint) setEntityHighlight(prevMarkPoint, false);
		selectedMarkPointEntityId.value = '';
	}

	// 清除测绘实体高亮
	if (currentMeasureEntity) {
		setEntityHighlight(currentMeasureEntity, false);
		currentMeasureEntity = null;
		currentMeasurePoints = [];
		measurePanelVisible.value = false;
	}

	// 清空其他选中状态
	selectedTerrainItemKey.value = '';
	selectedShpItemKey.value = '';
	selectedKmlItemKey.value = '';
	selectedCadItemKey.value = '';

	// 更新统一状态
	setSelectedSyInfoKey('');

	// 关闭可能打开的面板
	closeShpFeaturePopup();
}
const shpFeaturePopupVisible = ref(false);
const shpFeaturePopupMinimized = ref(false);
const shpFeaturePopup = reactive({
	itemKey: '',
	featureIndex: null,
	featureIndexDisplay: '-',
	title: '',
	subtitle: '',
	layerName: '',
	sourceFileName: '',
	geometryType: '',
	properties: {},
});
const shpFeaturePanelPosition = reactive({ left: 0, top: 120 });
const shpFeaturePanelSize = reactive({ width: 420, height: 520 });
const shpFeatureHeaderDrag = reactive({ active: false, pointerId: null, startX: 0, startY: 0, startLeft: 0, startTop: 0 });
const shpFeatureFloatDock = reactive({ side: 'right', top: 120 });
const shpFeatureFloatOrigin = reactive({ side: 'right', top: 120 });
const shpFeatureFloat = reactive({ x: 0, y: 120 });
const shpFeatureFloatSnapped = ref(true);
const shpFeatureFloatDrag = reactive({ active: false, pointerId: null, startX: 0, startY: 0, startLeft: 0, startTop: 0, moved: false });
const shpFeatureFloatSize = 46;
const shpFeatureFloatDockWidth = 76;
const shpFeatureFloatMargin = 0;
const shpFeatureFloatTopMin = 60;
const syInfoListVersion = ref(0);
const terrainTilesetMap = new Map();
const shpDataSourceMap = new Map();
const kmlDataSourceMap = new Map();
const kmlObjectUrlMap = new Map();
const cadDataSourceMap = new Map();
let djcxLoadingTimer = null;
let djcxLoadingToken = 0;
let djcxMultiSelectedKeys = [];

function normalizeTerrainUrl(url) {
	return String(url || '').trim();
}

function parseTerrainUrls(input) {
	return String(input || '')
		.split(/[;；]/)
		.map(normalizeTerrainUrl)
		.filter(Boolean);
}

function parseTerrainNames(input) {
	return String(input || '')
		.split(/[;；]/)
		.map((name) => String(name || '').trim());
}

function hasMultipleTerrainLinksWithoutSeparator(input) {
	const text = String(input || '').trim();
	if (!text || /[;；]/.test(text)) return false;
	const protocolCount = (text.match(/https?:\/\//gi) || []).length;
	return protocolCount > 1;
}

function getDuplicateTerrainUrls(urls) {
	const seen = new Set();
	const duplicates = [];
	for (const url of Array.isArray(urls) ? urls : []) {
		if (!url) continue;
		if (seen.has(url)) {
			if (!duplicates.includes(url)) duplicates.push(url);
			continue;
		}
		seen.add(url);
	}
	return duplicates;
}

function getDefaultTerrainName(index) {
	return `地形模型-${index + 1}`;
}

function resolveTerrainName({ customName, index, existingName }) {
	const name = String(customName || '').trim();
	if (name) return name;
	if (String(existingName || '').trim()) return existingName;
	return getDefaultTerrainName(index);
}

const djcxNodeDataSources = new Map();
const djcxHighlightedEntities = new Set();
const djcxNodeFillAlpha = 0.45;  // 修改透明度
const djcxNodeOutlineAlpha = 0.95;
const djcxOutlineColor = Cesium.Color.WHITE.withAlpha(1);
const djcxOutlineWidth = 1;
const djcxOutlineHighlightColor = Cesium.Color.fromCssColorString('#45efff').withAlpha(1);
const djcxOutlineHighlightWidth = 3;
const djcxLabelMinAreaDeg2 = 1e-7;
const djcxStyle = {
	NORMAL: {
		FILL: Cesium.Color.WHITE.withAlpha(0.08),
		OUTLINE: djcxOutlineColor,
	},
	HIGHLIGHT: {
		FILL: Cesium.Color.fromCssColorString('#45efff').withAlpha(0.75),
		OUTLINE: djcxOutlineColor,
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
		entity.polygon.material = base.FILL;
		entity.polygon.outline = true;
		entity.polygon.outlineColor = theme.OUTLINE;
		entity.polygon.outlineWidth = djcxOutlineWidth;
	}
	if (entity.polyline) {
		entity.polyline.material = theme.OUTLINE;
		entity.polyline.width = djcxOutlineWidth;
	}
}

function djcxSetOutlineHighlightForEntity(entity, enabled) {
	const nodeId = String(entity?._djcxNodeId ?? '');
	if (!nodeId) return;
	const ds = djcxNodeDataSources.get(nodeId);
	if (!ds) return;
	const targetId = entity?.id;
	if (!targetId) return;
	for (const e of ds.entities.values) {
		if (!e?._djcxFeatureOutline) continue;
		if (e?._djcxForEntityId !== targetId) continue;
		if (!e.polyline) continue;
		e.polyline.material = enabled ? djcxOutlineHighlightColor : djcxOutlineColor;
		e.polyline.width = enabled ? djcxOutlineHighlightWidth : djcxOutlineWidth;
	}
}

function djcxClearHighlights() {
	for (const ent of djcxHighlightedEntities) {
		djcxSetOutlineHighlightForEntity(ent, false);
		djcxApplyEntityStyle(ent, false);
	}
	djcxHighlightedEntities.clear();
}

function djcxSetHighlights(entities) {
	djcxClearHighlights();
	(entities || []).forEach((ent) => {
		djcxApplyEntityStyle(ent, false);
		djcxSetOutlineHighlightForEntity(ent, true);
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

function djcxRingSignedArea(ring) {
	const pts = Array.isArray(ring) ? ring : [];
	if (pts.length < 3) return 0;
	let sum = 0;
	for (let i = 0; i < pts.length - 1; i++) {
		const a = pts[i];
		const b = pts[i + 1];
		if (!a || !b) continue;
		sum += Number(a[0]) * Number(b[1]) - Number(b[0]) * Number(a[1]);
	}
	return sum / 2;
}

function djcxRingBbox(ring) {
	const pts = Array.isArray(ring) ? ring : [];
	let minLon = Infinity, minLat = Infinity, maxLon = -Infinity, maxLat = -Infinity;
	for (const p of pts) {
		if (!Array.isArray(p) || p.length < 2) continue;
		const lon = Number(p[0]);
		const lat = Number(p[1]);
		if (!Number.isFinite(lon) || !Number.isFinite(lat)) continue;
		if (lon < minLon) minLon = lon;
		if (lon > maxLon) maxLon = lon;
		if (lat < minLat) minLat = lat;
		if (lat > maxLat) maxLat = lat;
	}
	if (!Number.isFinite(minLon) || !Number.isFinite(minLat) || !Number.isFinite(maxLon) || !Number.isFinite(maxLat)) return null;
	return { minLon, minLat, maxLon, maxLat };
}

function djcxRingAreaCentroid(ring) {
	const pts = Array.isArray(ring) ? ring : [];
	if (pts.length < 3) return null;
	let cx = 0, cy = 0;
	let a2 = 0;
	for (let i = 0; i < pts.length - 1; i++) {
		const p0 = pts[i];
		const p1 = pts[i + 1];
		if (!Array.isArray(p0) || !Array.isArray(p1) || p0.length < 2 || p1.length < 2) continue;
		const x0 = Number(p0[0]), y0 = Number(p0[1]);
		const x1 = Number(p1[0]), y1 = Number(p1[1]);
		if (!Number.isFinite(x0) || !Number.isFinite(y0) || !Number.isFinite(x1) || !Number.isFinite(y1)) continue;
		const cross = x0 * y1 - x1 * y0;
		a2 += cross;
		cx += (x0 + x1) * cross;
		cy += (y0 + y1) * cross;
	}
	if (!Number.isFinite(a2) || Math.abs(a2) < 1e-12) return null;
	const area6 = a2 * 3;
	return { longitude: cx / area6, latitude: cy / area6, height: 0 };
}

function djcxPointToSegmentDist2(point, a, b) {
	const px = Number(point[0]), py = Number(point[1]);
	const ax = Number(a[0]), ay = Number(a[1]);
	const bx = Number(b[0]), by = Number(b[1]);
	const abx = bx - ax;
	const aby = by - ay;
	const apx = px - ax;
	const apy = py - ay;
	const denom = abx * abx + aby * aby;
	let t = denom > 0 ? (apx * abx + apy * aby) / denom : 0;
	if (t < 0) t = 0;
	else if (t > 1) t = 1;
	const x = ax + t * abx;
	const y = ay + t * aby;
	const dx = px - x;
	const dy = py - y;
	return dx * dx + dy * dy;
}

function djcxMinDistToRing2(point, ring) {
	const pts = Array.isArray(ring) ? ring : [];
	if (pts.length < 2) return 0;
	let best = Infinity;
	for (let i = 0; i < pts.length - 1; i++) {
		const a = pts[i];
		const b = pts[i + 1];
		if (!Array.isArray(a) || !Array.isArray(b) || a.length < 2 || b.length < 2) continue;
		const d2 = djcxPointToSegmentDist2(point, a, b);
		if (d2 < best) best = d2;
	}
	return Number.isFinite(best) ? best : 0;
}

function djcxPointInGeometry(point, geometry) {
	const geom = geometry;
	if (!geom || !Array.isArray(point) || point.length < 2) return false;
	if (geom.type === 'Polygon') return djcxPointInPolygon(point, geom.coordinates);
	if (geom.type === 'MultiPolygon') {
		const polys = Array.isArray(geom.coordinates) ? geom.coordinates : [];
		return polys.some(coords => djcxPointInPolygon(point, coords));
	}
	return false;
}

function djcxPickLabelLonLatForPolygon(polygonCoords, avoidGeometries) {
	const coords = Array.isArray(polygonCoords) ? polygonCoords : null;
	const ring = coords?.[0];
	if (!Array.isArray(ring) || ring.length < 3) return null;
	const bbox = djcxRingBbox(ring);
	if (!bbox) return null;

	const avoid = Array.isArray(avoidGeometries) ? avoidGeometries : [];
	const candidates = [];
	const areaCentroid = djcxRingAreaCentroid(ring);
	if (areaCentroid) candidates.push([areaCentroid.longitude, areaCentroid.latitude]);
	candidates.push([(bbox.minLon + bbox.maxLon) / 2, (bbox.minLat + bbox.maxLat) / 2]);
	const gxCount = 6;
	const gyCount = 6;
	const dx = (bbox.maxLon - bbox.minLon) / gxCount;
	const dy = (bbox.maxLat - bbox.minLat) / gyCount;
	for (let gy = 0; gy < gyCount; gy++) {
		for (let gx = 0; gx < gxCount; gx++) {
			candidates.push([bbox.minLon + (gx + 0.5) * dx, bbox.minLat + (gy + 0.5) * dy]);
		}
	}

	const insideSelf = (pt) => djcxPointInPolygon(pt, coords);
	const insideAvoid = (pt) => avoid.some(g => djcxPointInGeometry(pt, g));

	let best = null;
	let bestScore = -Infinity;

	for (const pt of candidates) {
		if (!insideSelf(pt)) continue;
		if (insideAvoid(pt)) continue;
		const score = djcxMinDistToRing2(pt, ring);
		if (score > bestScore) { bestScore = score; best = pt; }
	}

	if (!best) {
		for (const pt of candidates) {
			if (!insideSelf(pt)) continue;
			const score = djcxMinDistToRing2(pt, ring);
			if (score > bestScore) { bestScore = score; best = pt; }
		}
	}

	return best ? { longitude: best[0], latitude: best[1], height: 0 } : null;
}

function djcxPickLabelLonLat(entity, allEntities) {
	const geom = entity?._djcxGeojsonGeometry;
	const coords = geom?.type === 'Polygon' ? geom.coordinates : (geom?.type === 'MultiPolygon' ? geom.coordinates?.[0] : null);
	const avoid = (Array.isArray(allEntities) ? allEntities : []).filter((e) => {
		if (!e || e === entity) return false;
		if (e._djcxOrder == null || entity?._djcxOrder == null) return true;
		return String(e._djcxOrder) !== String(entity._djcxOrder);
	});
	const avoidGeoms = avoid.map(e => e?._djcxGeojsonGeometry).filter(Boolean);
	const picked = coords ? djcxPickLabelLonLatForPolygon(coords, avoidGeoms) : null;
	return picked || djcxEntityCentroidLonLat(entity);
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
		const rawIndex = Number(ent._djcxProperties?.__djcxIndex);
		const featureGeom = Number.isFinite(rawIndex) && rawIndex > 0 ? featureCollection.features?.[rawIndex - 1]?.geometry : null;
		if (featureGeom && (featureGeom.type === 'Polygon' || featureGeom.type === 'MultiPolygon')) {
			ent._djcxGeojsonGeometry = featureGeom;
		} else {
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
		}

		const order = Number.isFinite(rawIndex) && rawIndex > 0 ? Math.min(total, Math.max(1, rawIndex)) : 1;
		ent._djcxOrder = order;
		ent._djcxRoman = djcxToRoman(order);
		const baseColor = djcxColorForIndex(order, total);
		ent._djcxBaseStyle = {
			FILL: baseColor.withAlpha(djcxNodeFillAlpha),
			OUTLINE: djcxOutlineColor,
		};
		djcxApplyEntityStyle(ent, false);

		if (ent.polygon) {
			const hierarchy = ent.polygon?.hierarchy?.getValue(now);
			const pts = hierarchy?.positions || [];
			if (Array.isArray(pts) && pts.length >= 2) {
				const outlinePositions = pts.slice();
				outlinePositions.push(pts[0]);
				const outlineEntity = ds.entities.add({
					polyline: {
						positions: outlinePositions,
						clampToGround: true,
						width: djcxOutlineWidth,
						material: djcxOutlineColor,
						zIndex: 10,
						disableDepthTestDistance: Number.POSITIVE_INFINITY,
					}
				});
				outlineEntity._djcxFeatureOutline = true;
				outlineEntity._djcxNodeId = String(nodeId);
				outlineEntity._djcxForEntityId = ent.id;
			}
		}
	}

	const skipRomanLabel = ['26', '27'].includes(String(nodeId));
	if (skipRomanLabel) {
		djcxNodeDataSources.set(String(nodeId), ds);
		return;
	}

	for (const ent of baseEntities) {
		if (!ent?.polygon) continue;
		const geom = ent?._djcxGeojsonGeometry;
		const polygons = geom?.type === 'Polygon' ? [geom.coordinates] : (geom?.type === 'MultiPolygon' ? geom.coordinates : []);
		if (!Array.isArray(polygons) || !polygons.length) continue;

		const avoidGeoms = baseEntities
			.filter(e => e && e !== ent && String(e?._djcxOrder) !== String(ent?._djcxOrder))
			.map(e => e?._djcxGeojsonGeometry)
			.filter(Boolean);

		for (let i = 0; i < polygons.length; i++) {
			const polyCoords = polygons[i];
			const areaDeg2 = Math.abs(djcxRingSignedArea(polyCoords?.[0] || []));
			if (!Number.isFinite(areaDeg2) || areaDeg2 < djcxLabelMinAreaDeg2) continue;
			const labelPos = djcxPickLabelLonLatForPolygon(polyCoords, avoidGeoms) || djcxPickLabelLonLat(ent, baseEntities);
			if (!labelPos) continue;
			const baseColor = djcxColorForIndex(ent._djcxOrder, total);
			const labelEntity = ds.entities.add({
				position: Cesium.Cartesian3.fromDegrees(labelPos.longitude, labelPos.latitude, 0),
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
			labelEntity._djcxForPolygonIndex = i;
		}
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
	if (Array.isArray(djcxMultiSelectedKeys) && djcxMultiSelectedKeys.length) {
		const all = djcxGetAllFeatureEntities();
		const removedKeys = new Set(all.filter(e => String(e?._djcxNodeId) === key).map(djcxFeatureKey));
		djcxMultiSelectedKeys = djcxMultiSelectedKeys.filter(k => !removedKeys.has(String(k)));
	}
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

function djcxFeatureKey(entity) {
	const p = entity?._djcxProperties || {};
	const key = p.id ?? p.fid ?? p.DKBH ?? p.OBJECTID ?? entity?.id;
	return String(key ?? '');
}

function djcxGroupEntitiesByFeatureKey(entities) {
	const list = Array.isArray(entities) ? entities.filter(Boolean) : [];
	const map = new Map();
	list.forEach((ent) => {
		const k = djcxFeatureKey(ent);
		if (!k) return;
		const g = map.get(k);
		if (g) g.entities.push(ent);
		else map.set(k, { key: k, entities: [ent], rep: ent });
	});
	return map;
}

function djcxGetProp(props, keys) {
	const p = props && typeof props === 'object' ? props : {};
	const lower = {};
	Object.keys(p).forEach((k) => {
		if (typeof k !== 'string') return;
		lower[k.toLowerCase()] = p[k];
	});
	const list = Array.isArray(keys) ? keys : [keys];
	for (const k of list) {
		if (k == null) continue;
		if (typeof k === 'string') {
			if (p[k] != null && p[k] !== '') return p[k];
			const v = lower[k.toLowerCase()];
			if (v != null && v !== '') return v;
		}
	}
	return undefined;
}

function djcxFormatPercent(value) {
	if (value == null || value === '') return value;
	if (typeof value === 'string') {
		const s = value.trim();
		if (!s) return value;
		if (s.includes('%')) return s;
		const n = Number(s);
		if (!Number.isFinite(n)) return s;
		if (n <= 1) return `${(n * 100).toFixed(0)}%`;
		if (n <= 100) return `${n}%`;
		return s;
	}
	const n = Number(value);
	if (!Number.isFinite(n)) return value;
	if (n <= 1) return `${(n * 100).toFixed(0)}%`;
	if (n <= 100) return `${n}%`;
	return value;
}

function djcxFormatYears(value) {
	if (value == null || value === '') return value;
	if (typeof value === 'string') {
		const s = value.trim();
		if (!s) return value;
		return s.includes('年') ? s : `${s}年`;
	}
	const n = Number(value);
	if (!Number.isFinite(n)) return value;
	return `${n}年`;
}

function djcxFormatDate(value) {
	if (value == null || value === '') return value;
	if (typeof value === 'string') {
		const s = value.trim();
		if (!s) return value;
		if (/^\d{4}-\d{1,2}-\d{1,2}$/.test(s)) return s;
		const m = s.match(/^(\d{4}-\d{2}-\d{2})/);
		if (m) return m[1];
		const d = new Date(s);
		if (!Number.isNaN(d.getTime())) return d.toISOString().slice(0, 10);
		return s;
	}
	const d = new Date(value);
	if (!Number.isNaN(d.getTime())) return d.toISOString().slice(0, 10);
	return value;
}

function djcxBuildQueryResultProperties(entity, matchCount) {
	const props = entity?._djcxProperties || {};
	const out = {};
	if (entity?._djcxRoman) out.序号 = entity._djcxRoman;

	const nodeId = String(entity?._djcxNodeId ?? '');
	const isNode26Or27 = nodeId === '26' || nodeId === '27';
	const fields = isNode26Or27
		? [
			{ label: '地块编号', keys: ['地块编号', 'DKBH', 'dkbh'] },
			{ label: '项目名称', keys: ['项目名称', 'XMMC', 'xmmc'] },
			{ label: '年份', keys: ['年份', 'NF', 'nf', 'YEAR', 'year', 'ND', 'nd', '年度'] },
			{ label: '土地坐落', keys: ['土地坐落', 'TDZL', 'tdzl', 'ZL', 'zl'] },
			{ label: '供应方式', keys: ['供应方式', 'GYFS', 'gyfs'] },
			{ label: '用地批准时间', keys: ['用地批准时间', 'YDPZRQ', 'ydpzrq', 'PZRQ', 'pzrq'] },
			{ label: '批准文号', keys: ['批准文号', 'PZWH', 'pzwh'] },
			{ label: '合同取得日期', keys: ['合同取得日期', 'HTQDRQ', 'htqdrq', 'HTRQ', 'htrq'] },
			{ label: '行业分类', keys: ['行业分类', 'HYFL', 'hyfl'] },
			{ label: '土地用途', keys: ['土地用途', 'TDYT', 'tdyt', '用途'] },
			{ label: '供应总面积(平方千米)', keys: ['供应总面积', 'GDZMJ', 'gdzmj', 'ZMJ', 'zmj', 'Shape_Area', 'shape_area'] },
			{ label: '使用权人', keys: ['使用权人', 'SYQR', 'syqr'] },
			{ label: '单位面积地价(元/平方米)', keys: ['单位面积地价', 'DWMJDJ', 'dwmjdj'] },
			{ label: '楼面价(元/平方米)', keys: ['楼面价', 'LMJ', 'lmj', '楼面地价', 'LMDJ', 'lmdj'] },
			{ label: '成交价(万元)', keys: ['成交价', 'CJJ', 'cjj', 'CJJE', 'cjje'] },
			{ label: '评估报告编号', keys: ['评估报告编号', 'PGBBH', 'pgbbh', 'PGBH', 'pgbh'] },
			{ label: '评估时间', keys: ['评估时间', 'PGSJ', 'pgsj'] },
			{ label: '出让年限', keys: ['出让年限', 'CRNX', 'crnx', 'SYNX', 'synx'] },
			{ label: '容积率', keys: ['容积率', 'RJL', 'rjl', 'FAR', 'far'] },
			{ label: '最大容积率', keys: ['最大容积率', 'ZDRJL', 'zdrjl', 'MAXRJL', 'maxrjl'] },
			{ label: '建筑密度', keys: ['建筑密度', 'JZMD', 'jzmd', 'BUILD_DENS', 'build_dens', 'BUILDING_DENSITY'] },
		]
		: [
			{ label: '行政区代码', keys: ['行政区代码', 'XZQDM', 'xzqdm', 'ADCODE', 'adcode', '行政区划代码', 'XZQ_CODE', 'xzq_code'] },
			{ label: '行政区名称', keys: ['行政区名称', 'XZQMC', 'xzqmc', 'NAME', 'name', '行政区划名称', 'XZQ_NAME', 'xzq_name'] },
			{ label: '年份', keys: ['年份', 'YEAR', 'year', 'ND', 'nd', '年度'] },
			{ label: '地价体系', keys: ['地价体系', 'DJTX', 'djtx', 'PRICE_SYSTEM', 'price_system'] },
			{ label: '土地用途', keys: ['土地用途', 'TDYT', 'tdyt', 'LAND_USE', 'land_use', '用途'] },
			{ label: '土地级别', keys: ['土地级别', 'TDJB', 'tdjb', 'LEVEL', 'level', '级别'] },
			{ label: '级别价(元/平方米)', keys: ['级别价', 'JBJ', 'jbj', 'LEVEL_PRICE', 'level_price', 'JIBIEJIA'] },
			{ label: '楼面地价(元/平方米)', keys: ['楼面地价', 'LMDJ', 'lmdj', 'FLOOR_PRICE', 'floor_price'] },
			{ label: '亩地均价(元/亩)', keys: ['亩地均价', 'MDJJ', 'mdjj', 'MU_AVG_PRICE', 'mu_avg_price'] },
			{ label: '容积率', keys: ['容积率', 'RJL', 'rjl', 'FAR', 'far'] },
			{ label: '建筑密度', keys: ['建筑密度', 'JZMD', 'jzmd', 'BUILD_DENS', 'build_dens', 'BUILDING_DENSITY'] },
			{ label: '土地使用年限', keys: ['土地使用年限', 'TDNX', 'tdnx', 'SYNX', 'synx', 'USE_YEARS', 'use_years'] },
			{ label: '土地开发程度', keys: ['土地开发程度', 'TDKFCD', 'tdkfcd', 'DEVELOP_LEVEL', 'develop_level'] },
			{ label: '估计期日', keys: ['估计期日', 'GJQR', 'gjqr', 'GJQD', 'gjqd', 'DATE', 'date', '估价期日'] },
		];

	let hit = false;
	for (const f of fields) {
		let v = djcxGetProp(props, f.keys);
		if (v == null || v === '') continue;
		if (f.label === '建筑密度') v = djcxFormatPercent(v);
		if (f.label === '土地使用年限' || f.label === '出让年限') v = djcxFormatYears(v);
		if (f.label === '用地批准时间' || f.label === '合同取得日期' || f.label === '评估时间' || f.label === '估计期日') v = djcxFormatDate(v);
		out[f.label] = v;
		hit = true;
	}

	if (matchCount != null) out.匹配数量 = matchCount;

	if (hit || out.序号 || matchCount != null) return out;
	return props;
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

function djcxShowFeaturesInTable(entities, options = {}) {
	const list = Array.isArray(entities) ? entities.filter(Boolean) : [];
	if (!list.length) return;
	const items = list.map((ent) => ({ ent, props: djcxBuildQueryResultProperties(ent) || {} }));
	const rawNames = items.map((it, idx) => {
		const p = it.props || {};
		return String(p.地块编号 || p.序号 || p.项目名称 || `要素${idx + 1}`);
	});
	const nameCount = new Map();
	const colNames = rawNames.map((n) => {
		const k = String(n || '要素');
		const c = (nameCount.get(k) || 0) + 1;
		nameCount.set(k, c);
		return c === 1 ? k : `${k}-${c}`;
	});

	const fieldKeys = [];
	const seenKeys = new Set();
	items.forEach((it) => {
		const p = it.props || {};
		Object.keys(p).forEach((k) => {
			if (!k || k === '匹配数量' || seenKeys.has(k)) return;
			seenKeys.add(k);
			fieldKeys.push(k);
		});
	});

	const cols = ['字段', ...colNames];
	const rows = fieldKeys.map((k) => {
		const row = { 字段: k };
		items.forEach((it, idx) => { row[colNames[idx]] = it.props?.[k]; });
		return row;
	});
	const withLoading = options?.withLoading !== false;
	if (!withLoading) {
		if (djcxLoadingTimer) { clearTimeout(djcxLoadingTimer); djcxLoadingTimer = null; }
		djcxLoadingToken += 1;
		djcxLoading.value = false;
		clickInfo.value = {
			coordinates: null,
			properties: {},
			table: { columns: cols, rows },
			feature: null,
		};
		showInfoPanel.value = true;
		measurePanelVisible.value = false;
		return;
	}

	if (djcxLoadingTimer) { clearTimeout(djcxLoadingTimer); djcxLoadingTimer = null; }
	djcxLoadingToken += 1;
	const token = djcxLoadingToken;
	showInfoPanel.value = false;
	djcxLoading.value = true;
	measurePanelVisible.value = false;
	djcxLoadingTimer = setTimeout(() => {
		if (token !== djcxLoadingToken) return;
		djcxLoading.value = false;
		clickInfo.value = {
			coordinates: null,
			properties: {},
			table: { columns: cols, rows },
			feature: null,
		};
		showInfoPanel.value = true;
		djcxLoadingTimer = null;
	}, 1500);
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

// 首页 -> 非首页：侧边栏收起动画时长（需与 PortalHome.vue 中的 transition 保持一致）
const HOME_SIDEBAR_COLLAPSE_MS = 360;
const HOME_ENTER_CAMERA_SECONDS = 1.6;
const MODULE_APPEAR_MS = 360;
const homeSidebarCollapsing = ref(false);
const homeSidebarEntering = ref(false);
const homeUiVisible = ref(true);
const moduleEnterKey = ref(null);
let moduleEnterTimer = null;
let tabSwitchToken = 0;
const waitMs = (ms) => new Promise((resolve) => window.setTimeout(resolve, ms));

function triggerModuleEnter(nextKey) {
	if (!nextKey || nextKey === 'home') return;
	moduleEnterKey.value = nextKey;
	if (moduleEnterTimer) window.clearTimeout(moduleEnterTimer);
	moduleEnterTimer = window.setTimeout(() => {
		if (moduleEnterKey.value === nextKey) moduleEnterKey.value = null;
	}, MODULE_APPEAR_MS);
}

async function requestTopTabChange(nextKey) {
	if (!nextKey || nextKey === activeTopTab.value) return;

	// 从首页切换到任何非首页：同步触发相机飞行 + 侧边栏收起，等待收起结束后再展示新页面
	if (activeTopTab.value === 'home' && nextKey !== 'home') {
		const token = ++tabSwitchToken;
		homeSidebarCollapsing.value = true;
		flyToOnLeaveHome();
		await waitMs(HOME_SIDEBAR_COLLAPSE_MS);
		if (token !== tabSwitchToken) return;
		homeSidebarCollapsing.value = false;
		homeUiVisible.value = false;
		activeTopTab.value = nextKey;
		triggerModuleEnter(nextKey);
		return;
	}

	// 从非首页进入首页：先进入首页场景并恢复初始高度，待相机恢复后左右两侧栏同时展开
	if (activeTopTab.value !== 'home' && nextKey === 'home') {
		const token = ++tabSwitchToken;
		activeTopTab.value = 'home';
		homeUiVisible.value = true;
		homeSidebarCollapsing.value = false;
		homeSidebarEntering.value = true;
		await waitMs(0);
		await enterHomeScene({ duration: HOME_ENTER_CAMERA_SECONDS });
		if (token !== tabSwitchToken) return;
		window.requestAnimationFrame(() => {
			if (token !== tabSwitchToken) return;
			homeSidebarEntering.value = false;
		});
		return;
	}

	activeTopTab.value = nextKey;
	triggerModuleEnter(nextKey);
}

const selectTopTab = (tab) => { requestTopTabChange(tab.key); };
const enterModule = (tabKey) => {
	if (topTabs.some((tab) => tab.key === tabKey)) {
		requestTopTabChange(tabKey);
	}
};

watch(activeTopTab, async (newVal) => {
	const viewer = getViewer();
	if (newVal !== 'home') {
		stopHomeEarthRotation();
	}
	if (newVal === 'djcx') {
		djcxGongneng.value = true;
	} else {
		// listItem.value = -1;
		djcxGongneng.value = false;
	}

	// 切换页面时，如果不是首页，则关闭测量工具并隐藏已有的测量实体
	if (newVal !== 'sy') {
		if (currentMeasureEntity) {
			setEntityHighlight(currentMeasureEntity, false);
			currentMeasureEntity = null;
		}
		if (viewer && selectedMarkPointEntityId.value) {
			const selected = viewer.entities.getById(selectedMarkPointEntityId.value);
			if (selected) setEntityHighlight(selected, false);
			selectedMarkPointEntityId.value = '';
		}
		selectedTerrainItemKey.value = '';
		resetDrawing();
		measurePanelVisible.value = false;
		if (viewer) {
			[...viewer.entities.values].forEach(ent => {
				if (ent._measureData || ent._drawn || ent.name === 'measure-label') {
					applyMeasureEntityVisibility(ent, false);
				}
				if (ent._syMarkPointData) {
					applyMarkPointEntityVisibility(ent, false);
				}
			});
		}
	} else {
		// 切回首页，显示所有测量实体
		if (viewer) {
			[...viewer.entities.values].forEach(ent => {
				if (ent._measureData || ent._drawn || ent.name === 'measure-label') {
					applyMeasureEntityVisibility(ent, ent._syUserVisible !== false);
				}
				if (ent._syMarkPointData) {
					applyMarkPointEntityVisibility(ent, ent._syUserVisible !== false);
				}
			});
		}
	}

	if (newVal === 'djcx') {
		startTool('dianxuan');
	}

	await nextTick();
	updateIndicator();
});

watch(
	() => [measureForm.name, measureForm.unit, measureForm.desc, measureForm.heightMeters, measureForm.longitude, measureForm.latitude, measureForm.kind],
	() => {
		if (measureForm.kind === 'markPoint') {
			const viewer = getViewer();
			const id = selectedMarkPointEntityId.value;
			if (!viewer || !id) return;
			const entity = viewer.entities.getById(id);
			if (!entity?._syMarkPointData) return;
			const name = String(measureForm.name || '').trim() || entity._syMarkPointData.name || '标点';
			const desc = String(measureForm.desc || '');
			const longitude = Number(measureForm.longitude);
			const latitude = Number(measureForm.latitude);
			entity._syMarkPointData = {
				...entity._syMarkPointData,
				name,
				desc,
				longitude: Number.isFinite(longitude) ? longitude : entity._syMarkPointData.longitude,
				latitude: Number.isFinite(latitude) ? latitude : entity._syMarkPointData.latitude,
			};
			if (entity.label) entity.label.text = name;
			bumpSyInfoListVersion();
			return;
		}
		if (!currentMeasureEntity?._measureData) return;
		const areaSqMeters = Number(measureForm.areaSqMeters) || 0;
		const heightMeters = Number(measureForm.heightMeters) || 0;
		const volumeCubicMeters = areaSqMeters > 0 && heightMeters > 0 ? areaSqMeters * heightMeters : 0;
		measureForm.volumeCubicMeters = volumeCubicMeters;
		Object.assign(currentMeasureEntity._measureData, {
			...currentMeasureEntity._measureData,
			name: measureForm.name || currentMeasureEntity._measureData.name,
			unit: measureForm.unit || 'auto',
			desc: measureForm.desc || '',
			heightMeters,
			volumeCubicMeters,
			points: [...lastMeasure.points],
			segmentsMeters: [...lastMeasure.segmentsMeters],
			cumulativeMeters: [...lastMeasure.cumulativeMeters],
		});
		bumpSyInfoListVersion();
	},
	{ flush: 'post' }
);

// async function clickChildItem(item, index) {
// 	childItem.value = index;
// 	await add3DTileset(item.url, { alpha: 0.7 });
// }
// watch(() => listItem.value, (newVal, oldVal) => {
// 	if (oldVal === -1 || newVal === oldVal) return;
// 	// const oldUrl = list.value[oldVal].childList.length === 0 ? list.value[oldVal].url : list.value[oldVal].childList[childItem.value].url;
// 	remove3DTileset(oldUrl);
// });
// watch(() => childItem.value, (newVal, oldVal) => {
// 	if (newVal !== oldVal) remove3DTileset(list.value[listItem.value].childList[oldVal].url);
// });
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
let syInfoOrder = 0;
const positions = [];
const nameCounters = reactive({ distance: 0, polygon: 0, rect: 0, circle: 0, volume: 0, azimuth: 0, angle: 0, markPoint: 0 });

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
	if (entity.point) {
		entity.point.color = theme.POINT;
		entity.point.outlineColor = theme.POINT_OUTLINE;
	}
}

function autoName(kind) {
	const labels = { distance: '线', polygon: '面', rect: '矩形', circle: '圆', volume: '方量', azimuth: '方位角', angle: '夹角', markPoint: '标点' };
	nameCounters[kind] = (nameCounters[kind] || 0) + 1;
	return `${labels[kind] || '图形'}-${nameCounters[kind]}`;
}

function bumpSyInfoListVersion() {
	syInfoListVersion.value += 1;
}

function applyMeasureEntityVisibility(entity, visible) {
	if (!entity) return;
	entity.show = visible;
	if (entity._measurePoints) entity._measurePoints.forEach((point) => { point.show = visible; });
	if (entity._measureLabel) entity._measureLabel.show = visible;
}

function setMeasureEntityVisible(entity, visible) {
	if (!entity) return;
	entity._syUserVisible = visible;
	applyMeasureEntityVisibility(entity, activeTopTab.value === 'sy' ? visible : false);
	if (!visible && currentMeasureEntity === entity) {
		setEntityHighlight(entity, false);
		currentMeasureEntity = null;
		currentMeasurePoints = [];
		measurePanelVisible.value = false;
	}
	bumpSyInfoListVersion();
}

function registerMeasureEntity(entity) {
	if (!entity) return;
	if (!entity._syListOrder) entity._syListOrder = ++syInfoOrder;
	if (entity._syUserVisible == null) entity._syUserVisible = true;
	bumpSyInfoListVersion();
}

function applyMarkPointEntityVisibility(entity, visible) {
	if (!entity) return;
	entity.show = visible;
}

function setMarkPointEntityVisible(entity, visible) {
	if (!entity) return;
	entity._syUserVisible = visible;
	applyMarkPointEntityVisibility(entity, activeTopTab.value === 'sy' ? visible : false);
	if (!visible && selectedMarkPointEntityId.value === entity.id) {
		setEntityHighlight(entity, false);
		selectedMarkPointEntityId.value = '';
		if (measureForm.kind === 'markPoint') {
			measurePanelVisible.value = false;
			Object.assign(measureForm, { ...DEFAULT_MEASURE_FORM });
		}
	}
	bumpSyInfoListVersion();
}

function registerMarkPointEntity(entity) {
	if (!entity) return;
	if (!entity._syListOrder) entity._syListOrder = ++syInfoOrder;
	if (entity._syUserVisible == null) entity._syUserVisible = true;
	bumpSyInfoListVersion();
}

function deleteMarkPointEntity(entity) {
	if (!entity) return;
	const viewer = getViewer();
	if (!viewer) return;
	if (selectedMarkPointEntityId.value === entity.id) {
		setEntityHighlight(entity, false);
		selectedMarkPointEntityId.value = '';
		if (measureForm.kind === 'markPoint') {
			measurePanelVisible.value = false;
			Object.assign(measureForm, { ...DEFAULT_MEASURE_FORM });
		}
	}
	viewer.entities.remove(entity);
	bumpSyInfoListVersion();
}

function applyMeasureDataToPanel(data = {}) {
	Object.assign(measureForm, { ...DEFAULT_MEASURE_FORM, ...data });
	lastMeasure.points = [...(data.points || [])];
	lastMeasure.segmentsMeters = [...(data.segmentsMeters || [])];
	lastMeasure.cumulativeMeters = [...(data.cumulativeMeters || [])];
}

function applyMarkPointDataToPanel(data = {}) {
	Object.assign(measureForm, { ...DEFAULT_MEASURE_FORM, kind: 'markPoint', ...data });
	measureForm.lengthMeters = 0;
	measureForm.areaSqMeters = 0;
	measureForm.heightMeters = 0;
	measureForm.volumeCubicMeters = 0;
}

function inferMeasureItemType(entity) {
	const kind = entity?._measureData?.kind;
	if (kind === 'distance') return '线';
	if (kind === 'volume') return '方量';
	if (kind === 'azimuth') return '方位角';
	if (kind === 'angle') return '夹角';
	if (entity?.rectangle) return '矩形';
	if (entity?.ellipse) return '圆';
	if (entity?.polygon) return '面';
	return '图形';
}

function getTerrainItemName(url, index) {
	try {
		const parsed = new URL(url);
		const segments = parsed.pathname.split('/').filter(Boolean);
		if (!segments.length) return `地形模型-${index + 1}`;
		const last = decodeURIComponent(segments[segments.length - 1]);
		if (last.toLowerCase() === 'tileset.json' && segments.length > 1) {
			return decodeURIComponent(segments[segments.length - 2]);
		}
		return last;
	} catch {
		return `地形模型-${index + 1}`;
	}
}

function updateTerrainActiveState() {
	const hasVisibleTileset = terrainModelItems.value.some((item) => terrainTilesetMap.get(item.url)?.show !== false);
	terrainActive.value = terrainNetworkVisible.value || hasVisibleTileset;
}

function syncTerrainInputStorage() {
	terrainInputUrl.value = terrainModelItems.value.map((item) => item.url).join(';');
	terrainInputName.value = terrainModelItems.value.map((item) => item.name).join(';');
	localStorage.setItem(TERRAIN_INPUT_STORAGE_KEY, terrainInputUrl.value);
	localStorage.setItem(TERRAIN_NAME_STORAGE_KEY, terrainInputName.value);
}

function normalizeImportedGeoJson(rawGeoJson) {
	const sources = Array.isArray(rawGeoJson) ? rawGeoJson : [rawGeoJson];
	const features = [];
	sources.forEach((source) => {
		if (!source) return;
		if (source.type === 'FeatureCollection' && Array.isArray(source.features)) {
			features.push(...source.features);
			return;
		}
		if (source.type === 'Feature') {
			features.push(source);
			return;
		}
		if (source.type && source.coordinates) {
			features.push({
				type: 'Feature',
				properties: {},
				geometry: source,
			});
		}
	});
	return { type: 'FeatureCollection', features };
}

const IMPORTED_SHP_FILL_COLOR = Cesium.Color.fromCssColorString('#ff6a3d').withAlpha(0.5);
const IMPORTED_SHP_OUTLINE_COLOR = Cesium.Color.fromCssColorString('#ff3b30');
const CAD_DEFAULT_COLOR = Cesium.Color.fromCssColorString('#39b8ff');
const CAD_FILL_COLOR = Cesium.Color.fromCssColorString('#39b8ff').withAlpha(0.2);
const CAD_LABEL_COLOR = Cesium.Color.fromCssColorString('#ffd166');

function cadColorFromEntity(entity, alpha = 1) {
	const raw = Number(entity?.color);
	if (Number.isFinite(raw) && raw >= 0) {
		const red = (raw >> 16) & 255;
		const green = (raw >> 8) & 255;
		const blue = raw & 255;
		return Cesium.Color.fromBytes(red, green, blue, Math.round(Math.max(0, Math.min(1, alpha)) * 255));
	}
	return CAD_DEFAULT_COLOR.withAlpha(alpha);
}

function cadNormalizeText(text) {
	return String(text || '')
		.replace(/\\P/gi, ' ')
		.replace(/\\X/gi, ' ')
		.replace(/\^I/g, ' ')
		.replace(/\{\\[^}]*;/g, '')
		.replace(/[{}]/g, '')
		.trim();
}

function cadCollectPointsFromEntity(entity) {
	if (!entity || typeof entity !== 'object') return [];
	if (entity.type === 'LINE' || entity.type === 'LWPOLYLINE') return Array.isArray(entity.vertices) ? entity.vertices : [];
	if (entity.type === 'POLYLINE') return Array.isArray(entity.vertices) ? entity.vertices : [];
	if (entity.type === 'CIRCLE' || entity.type === 'ARC' || entity.type === 'ELLIPSE') return entity.center ? [entity.center] : [];
	if (entity.type === 'POINT') return entity.position ? [entity.position] : [];
	if (entity.type === 'TEXT') return entity.startPoint ? [entity.startPoint] : [];
	if (entity.type === 'MTEXT') return entity.position ? [entity.position] : [];
	if (entity.type === 'SPLINE') return Array.isArray(entity.controlPoints) ? entity.controlPoints : [];
	return [];
}

function getCadEllipsoidName(ellipsoid) {
	const value = String(ellipsoid || '').toUpperCase();
	if (value === 'WGS84') return 'WGS84';
	if (value === 'XIAN80') return 'intl';
	if (value === 'BEIJING54') return 'krass';
	return 'GRS80';
}

function cadApplyTransformParams(point, spatialReference) {
	const x = Number(point?.x);
	const y = Number(point?.y);
	const z = Number(point?.z || 0);
	if (!Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(z)) return null;
	const transform = spatialReference?.transformation || {};
	if (!transform?.enabled) {
		return { x, y, z };
	}
	const dx = Number(transform.xTranslate || 0);
	const dy = Number(transform.yTranslate || 0);
	const rotation = Number(transform.rotation || 0);
	const scale = Number(transform.scale || 0);
	const factor = 1 + scale;
	const cosValue = Math.cos(rotation);
	const sinValue = Math.sin(rotation);
	return {
		x: dx + factor * (x * cosValue - y * sinValue),
		y: dy + factor * (x * sinValue + y * cosValue),
		z,
	};
}

function createCadProj4Definition(spatialReference) {
	if (!spatialReference) return '';
	const centralMeridian = Number(spatialReference.centralMeridian);
	const falseEasting = Number(spatialReference.falseEasting || 0);
	const falseNorthing = Number(spatialReference.falseNorthing || 0);
	const scaleFactor = Number(spatialReference.scaleFactor || 1);
	const ellipsoid = getCadEllipsoidName(spatialReference.ellipsoid);
	if (!Number.isFinite(centralMeridian)) return '';
	return `+proj=tmerc +lat_0=0 +lon_0=${centralMeridian} +k=${scaleFactor} +x_0=${falseEasting} +y_0=${falseNorthing} +ellps=${ellipsoid} +units=m +no_defs`;
}

function cadCreateCoordinateTransform(dxf, spatialReference) {
	if (spatialReference?.coordinateSystem) {
		const definition = createCadProj4Definition(spatialReference);
		if (definition) {
			return {
				mode: 'projected',
				proj4Definition: definition,
				spatialReference,
			};
		}
	}
	const entities = Array.isArray(dxf?.entities) ? dxf.entities : [];
	const points = entities.flatMap((entity) => cadCollectPointsFromEntity(entity)).filter((point) => (
		Number.isFinite(Number(point?.x)) && Number.isFinite(Number(point?.y))
	));
	const useDegrees = points.length > 0 && points.every((point) => {
		const x = Number(point.x);
		const y = Number(point.y);
		return Math.abs(x) <= 180 && Math.abs(y) <= 90;
	});
	if (useDegrees) {
		return { mode: 'degrees' };
	}
	const viewer = getViewer();
	const cartographic = viewer?.camera?.positionCartographic;
	const longitude = Cesium.Math.toDegrees(cartographic?.longitude || 0);
	const latitude = Cesium.Math.toDegrees(cartographic?.latitude || 0);
	const origin = Cesium.Cartesian3.fromDegrees(longitude, latitude, 0);
	return {
		mode: 'enu',
		transform: Cesium.Transforms.eastNorthUpToFixedFrame(origin),
	};
}

function cadPointToCartesian(point, coordinateTransform) {
	if (coordinateTransform?.mode === 'projected') {
		const nextPoint = cadApplyTransformParams(point, coordinateTransform.spatialReference);
		if (!nextPoint) return null;
		try {
			const result = proj4(coordinateTransform.proj4Definition, 'WGS84', [nextPoint.x, nextPoint.y]);
			const longitude = Number(result?.[0]);
			const latitude = Number(result?.[1]);
			const height = nextPoint.z + Number(coordinateTransform.spatialReference?.elevation || 0);
			if (!Number.isFinite(longitude) || !Number.isFinite(latitude)) return null;
			return Cesium.Cartesian3.fromDegrees(longitude, latitude, height);
		} catch (error) {
			console.error('Failed to project CAD coordinate:', error);
			return null;
		}
	}
	const x = Number(point?.x);
	const y = Number(point?.y);
	const z = Number(point?.z || 0);
	if (!Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(z)) return null;
	if (coordinateTransform?.mode === 'degrees') {
		return Cesium.Cartesian3.fromDegrees(x, y, z);
	}
	const local = new Cesium.Cartesian3(x, y, z);
	return Cesium.Matrix4.multiplyByPoint(coordinateTransform.transform, local, new Cesium.Cartesian3());
}

function cadBuildPositions(points, coordinateTransform, close = false) {
	const positions = (Array.isArray(points) ? points : [])
		.map((point) => cadPointToCartesian(point, coordinateTransform))
		.filter(Boolean);
	if (close && positions.length >= 3) {
		positions.push(Cesium.Cartesian3.clone(positions[0]));
	}
	return positions;
}

function cadSampleArcPoints(center, radius, startAngle, endAngle, segmentCount = 72) {
	const r = Number(radius);
	const start = Number(startAngle);
	const end = Number(endAngle);
	if (!center || !Number.isFinite(r) || r <= 0 || !Number.isFinite(start) || !Number.isFinite(end)) return [];
	let delta = end - start;
	if (delta <= 0) delta += Math.PI * 2;
	const segments = Math.max(24, Math.ceil(segmentCount * (delta / (Math.PI * 2))));
	const points = [];
	for (let i = 0; i <= segments; i += 1) {
		const angle = start + (delta * i) / segments;
		points.push({
			x: Number(center.x) + Math.cos(angle) * r,
			y: Number(center.y) + Math.sin(angle) * r,
			z: Number(center.z || 0),
		});
	}
	return points;
}

function cadMarkCesiumEntity(entity, itemKey) {
	if (!entity) return entity;
	entity._syCadItemKey = itemKey;
	entity._syListOrder = entity._syListOrder || ++syInfoOrder;
	return entity;
}

function cadAppendEntityToDataSource(dataSource, cadEntity, coordinateTransform, itemKey) {
	if (!dataSource || !cadEntity) return 0;
	const color = cadColorFromEntity(cadEntity, 1);
	const fillColor = cadColorFromEntity(cadEntity, 0.18);
	const baseName = String(cadEntity.layer || cadEntity.type || 'CAD');
	if (cadEntity.type === 'LINE') {
		const positions = cadBuildPositions(cadEntity.vertices, coordinateTransform, false);
		if (positions.length < 2) return 0;
		cadMarkCesiumEntity(dataSource.entities.add({
			name: baseName,
			polyline: { positions, width: 2, material: color, clampToGround: true },
		}), itemKey);
		return 1;
	}
	if (cadEntity.type === 'LWPOLYLINE' || cadEntity.type === 'POLYLINE') {
		const vertices = Array.isArray(cadEntity.vertices) ? cadEntity.vertices : [];
		const isClosed = Boolean(cadEntity.shape) || (vertices.length > 2 && vertices[0]?.x === vertices[vertices.length - 1]?.x && vertices[0]?.y === vertices[vertices.length - 1]?.y);
		const outlinePositions = cadBuildPositions(vertices, coordinateTransform, isClosed);
		if (outlinePositions.length < 2) return 0;
		cadMarkCesiumEntity(dataSource.entities.add({
			name: baseName,
			polyline: { positions: outlinePositions, width: 2, material: color, clampToGround: true },
			...(isClosed && outlinePositions.length >= 4 ? {
				polygon: {
					hierarchy: outlinePositions.slice(0, -1),
					material: fillColor,
					outline: false,
				},
			} : {}),
		}), itemKey);
		return 1;
	}
	if (cadEntity.type === 'CIRCLE') {
		const points = cadSampleArcPoints(cadEntity.center, cadEntity.radius, 0, Math.PI * 2, 96);
		const positions = cadBuildPositions(points, coordinateTransform, true);
		if (positions.length < 4) return 0;
		cadMarkCesiumEntity(dataSource.entities.add({
			name: baseName,
			polyline: { positions, width: 2, material: color, clampToGround: true },
			polygon: {
				hierarchy: positions.slice(0, -1),
				material: fillColor,
				outline: false,
			},
		}), itemKey);
		return 1;
	}
	if (cadEntity.type === 'ARC') {
		const points = cadSampleArcPoints(cadEntity.center, cadEntity.radius, cadEntity.startAngle, cadEntity.endAngle, 72);
		const positions = cadBuildPositions(points, coordinateTransform, false);
		if (positions.length < 2) return 0;
		cadMarkCesiumEntity(dataSource.entities.add({
			name: baseName,
			polyline: { positions, width: 2, material: color, clampToGround: true },
		}), itemKey);
		return 1;
	}
	if (cadEntity.type === 'POINT') {
		const position = cadPointToCartesian(cadEntity.position, coordinateTransform);
		if (!position) return 0;
		cadMarkCesiumEntity(dataSource.entities.add({
			name: baseName,
			position,
			point: {
				pixelSize: 8,
				color,
				outlineColor: Cesium.Color.WHITE,
				outlineWidth: 1,
				heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
				disableDepthTestDistance: Number.POSITIVE_INFINITY,
			},
		}), itemKey);
		return 1;
	}
	if (cadEntity.type === 'TEXT' || cadEntity.type === 'MTEXT') {
		const rawText = cadEntity.type === 'TEXT' ? cadEntity.text : cadEntity.text;
		const text = cadNormalizeText(rawText);
		const point = cadEntity.type === 'TEXT' ? cadEntity.startPoint : cadEntity.position;
		const position = cadPointToCartesian(point, coordinateTransform);
		if (!position || !text) return 0;
		cadMarkCesiumEntity(dataSource.entities.add({
			name: baseName,
			position,
			label: {
				text,
				font: '14px Microsoft YaHei',
				style: Cesium.LabelStyle.FILL_AND_OUTLINE,
				fillColor: CAD_LABEL_COLOR,
				outlineColor: Cesium.Color.BLACK,
				outlineWidth: 2,
				disableDepthTestDistance: Number.POSITIVE_INFINITY,
				verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
				pixelOffset: new Cesium.Cartesian2(0, -10),
			},
		}), itemKey);
		return 1;
	}
	return 0;
}

const shpFeaturePanelStyle = computed(() => ({
	left: `${shpFeaturePanelPosition.left}px`,
	top: `${shpFeaturePanelPosition.top}px`,
	width: `${shpFeaturePanelSize.width}px`,
	height: `${shpFeaturePanelSize.height}px`,
}));

const shpFeatureFloatStyle = computed(() => ({
	left: `${shpFeatureFloat.x}px`,
	top: `${shpFeatureFloat.y}px`,
}));

const shpFeaturePopupEntries = computed(() => {
	const properties = shpFeaturePopup.properties || {};
	return Object.entries(properties).map(([key, value]) => ({
		key,
		value: formatShpFeaturePropertyValue(value),
	}));
});

function cloneShpFeatureProperties(rawProperties) {
	if (!rawProperties || typeof rawProperties !== 'object' || Array.isArray(rawProperties)) return {};
	const next = {};
	Object.entries(rawProperties).forEach(([key, value]) => {
		if (key === '__syFeatureIndex') return;
		next[key] = value;
	});
	return next;
}

function createImportedShpFeatureMeta(feature, itemKey, sourceFileName, layerName, featureIndex) {
	const properties = cloneShpFeatureProperties(feature?.properties);
	const fallbackTitle = properties.name || properties.NAME || properties.名称 || properties.title || properties.TITLE || `要素-${featureIndex + 1}`;
	return {
		itemKey,
		featureIndex,
		featureIndexDisplay: featureIndex + 1,
		title: String(fallbackTitle || `要素-${featureIndex + 1}`),
		subtitle: String(sourceFileName || layerName || '本地SHP要素'),
		layerName: String(layerName || ''),
		sourceFileName: String(sourceFileName || ''),
		geometryType: String(feature?.geometry?.type || 'Unknown'),
		properties,
	};
}

function formatShpFeaturePropertyValue(value) {
	if (value == null || value === '') return '-';
	if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') return String(value);
	try {
		return JSON.stringify(value);
	} catch {
		return String(value);
	}
}

function clampShpFeaturePopupTop(top) {
	const maxTop = Math.max(shpFeatureFloatTopMin, (window.innerHeight || 0) - shpFeaturePanelSize.height - 20);
	return Math.min(maxTop, Math.max(shpFeatureFloatTopMin, top));
}

function clampShpFeaturePopupLeft(left) {
	const maxLeft = Math.max(20, (window.innerWidth || 0) - shpFeaturePanelSize.width - 20);
	return Math.min(maxLeft, Math.max(20, left));
}

function syncShpFeatureFloatToDock() {
	const w = window.innerWidth || 0;
	const h = window.innerHeight || 0;
	const floatW = shpFeatureFloatSnapped.value ? shpFeatureFloatDockWidth : shpFeatureFloatSize;
	const x = shpFeatureFloatDock.side === 'left' ? shpFeatureFloatMargin : Math.max(shpFeatureFloatMargin, w - floatW - shpFeatureFloatMargin);
	const y = Math.min(Math.max(shpFeatureFloatDock.top, shpFeatureFloatTopMin), Math.max(shpFeatureFloatTopMin, h - shpFeatureFloatSize - shpFeatureFloatMargin));
	shpFeatureFloat.x = x;
	shpFeatureFloat.y = y;
}

function setShpFeaturePanelDefaultPosition() {
	shpFeaturePanelPosition.left = clampShpFeaturePopupLeft((window.innerWidth || 1280) - shpFeaturePanelSize.width - 24);
	shpFeaturePanelPosition.top = clampShpFeaturePopupTop(120);
	shpFeatureFloatDock.side = 'right';
	shpFeatureFloatDock.top = shpFeaturePanelPosition.top;
	shpFeatureFloatOrigin.side = shpFeatureFloatDock.side;
	shpFeatureFloatOrigin.top = shpFeatureFloatDock.top;
	syncShpFeatureFloatToDock();
}

function closeShpFeaturePopup() {
	shpFeaturePopupVisible.value = false;
	shpFeaturePopupMinimized.value = false;
	shpFeaturePopup.itemKey = '';
	shpFeaturePopup.featureIndex = null;
	shpFeaturePopup.featureIndexDisplay = '-';
	shpFeaturePopup.title = '';
	shpFeaturePopup.subtitle = '';
	shpFeaturePopup.layerName = '';
	shpFeaturePopup.sourceFileName = '';
	shpFeaturePopup.geometryType = '';
	shpFeaturePopup.properties = {};
}

function openShpFeaturePopup(meta) {
	if (!meta) return;
	shpFeaturePopup.itemKey = meta.itemKey || '';
	shpFeaturePopup.featureIndex = meta.featureIndex ?? null;
	shpFeaturePopup.featureIndexDisplay = meta.featureIndexDisplay ?? (Number.isFinite(meta.featureIndex) ? meta.featureIndex + 1 : '-');
	shpFeaturePopup.title = meta.title || 'SHP要素';
	shpFeaturePopup.subtitle = meta.subtitle || '';
	shpFeaturePopup.layerName = meta.layerName || '';
	shpFeaturePopup.sourceFileName = meta.sourceFileName || '';
	shpFeaturePopup.geometryType = meta.geometryType || 'Unknown';
	shpFeaturePopup.properties = cloneShpFeatureProperties(meta.properties);
	if (!shpFeaturePopupVisible.value) setShpFeaturePanelDefaultPosition();
	shpFeaturePopupVisible.value = true;
	shpFeaturePopupMinimized.value = false;
}

function minimizeShpFeaturePopup() {
	shpFeatureFloatOrigin.side = shpFeatureFloatDock.side;
	shpFeatureFloatOrigin.top = shpFeatureFloatDock.top;
	shpFeaturePopupMinimized.value = true;
	shpFeatureFloatSnapped.value = true;
	syncShpFeatureFloatToDock();
}

function restoreShpFeaturePopup() {
	shpFeatureFloatDock.side = shpFeatureFloatOrigin.side;
	shpFeatureFloatDock.top = shpFeatureFloatOrigin.top;
	shpFeaturePopupMinimized.value = false;
}

function onShpFeatureHeaderPointerMove(e) {
	if (!shpFeatureHeaderDrag.active) return;
	if (shpFeatureHeaderDrag.pointerId != null && e.pointerId !== shpFeatureHeaderDrag.pointerId) return;
	const nextLeft = shpFeatureHeaderDrag.startLeft + (e.clientX - shpFeatureHeaderDrag.startX);
	const nextTop = shpFeatureHeaderDrag.startTop + (e.clientY - shpFeatureHeaderDrag.startY);
	shpFeaturePanelPosition.left = clampShpFeaturePopupLeft(nextLeft);
	shpFeaturePanelPosition.top = clampShpFeaturePopupTop(nextTop);
	shpFeatureFloatDock.side = shpFeaturePanelPosition.left + shpFeaturePanelSize.width / 2 < (window.innerWidth || 0) / 2 ? 'left' : 'right';
	shpFeatureFloatDock.top = shpFeaturePanelPosition.top;
	shpFeatureFloatOrigin.side = shpFeatureFloatDock.side;
	shpFeatureFloatOrigin.top = shpFeatureFloatDock.top;
}

function onShpFeatureHeaderPointerUp(e) {
	if (!shpFeatureHeaderDrag.active) return;
	if (shpFeatureHeaderDrag.pointerId != null && e.pointerId !== shpFeatureHeaderDrag.pointerId) return;
	shpFeatureHeaderDrag.active = false;
	shpFeatureHeaderDrag.pointerId = null;
	window.removeEventListener('pointermove', onShpFeatureHeaderPointerMove);
	window.removeEventListener('pointerup', onShpFeatureHeaderPointerUp);
}

function onShpFeatureHeaderPointerDown(e) {
	if (shpFeaturePopupMinimized.value) return;
	if (e.target?.closest?.('.shp-feature-actions')) return;
	const target = e.currentTarget;
	try { target.setPointerCapture(e.pointerId); } catch {}
	shpFeatureHeaderDrag.active = true;
	shpFeatureHeaderDrag.pointerId = e.pointerId;
	shpFeatureHeaderDrag.startX = e.clientX;
	shpFeatureHeaderDrag.startY = e.clientY;
	shpFeatureHeaderDrag.startLeft = shpFeaturePanelPosition.left;
	shpFeatureHeaderDrag.startTop = shpFeaturePanelPosition.top;
	window.addEventListener('pointermove', onShpFeatureHeaderPointerMove, { passive: true });
	window.addEventListener('pointerup', onShpFeatureHeaderPointerUp, { passive: true });
}

function onShpFeatureFloatPointerMove(e) {
	if (!shpFeatureFloatDrag.active) return;
	if (shpFeatureFloatDrag.pointerId != null && e.pointerId !== shpFeatureFloatDrag.pointerId) return;
	const w = window.innerWidth || 0;
	const h = window.innerHeight || 0;
	const nextLeft = shpFeatureFloatDrag.startLeft + (e.clientX - shpFeatureFloatDrag.startX);
	const nextTop = shpFeatureFloatDrag.startTop + (e.clientY - shpFeatureFloatDrag.startY);
	shpFeatureFloat.x = Math.min(Math.max(nextLeft, shpFeatureFloatMargin), Math.max(shpFeatureFloatMargin, w - shpFeatureFloatSize - shpFeatureFloatMargin));
	shpFeatureFloat.y = Math.min(Math.max(nextTop, shpFeatureFloatTopMin), Math.max(shpFeatureFloatTopMin, h - shpFeatureFloatSize - shpFeatureFloatMargin));
	if (!shpFeatureFloatDrag.moved) {
		const dx = Math.abs(e.clientX - shpFeatureFloatDrag.startX);
		const dy = Math.abs(e.clientY - shpFeatureFloatDrag.startY);
		if (dx + dy >= 4) shpFeatureFloatDrag.moved = true;
	}
}

function onShpFeatureFloatPointerUp(e) {
	if (!shpFeatureFloatDrag.active) return;
	if (shpFeatureFloatDrag.pointerId != null && e.pointerId !== shpFeatureFloatDrag.pointerId) return;
	shpFeatureFloatDrag.active = false;
	shpFeatureFloatDrag.pointerId = null;
	window.removeEventListener('pointermove', onShpFeatureFloatPointerMove);
	window.removeEventListener('pointerup', onShpFeatureFloatPointerUp);
	const w = window.innerWidth || 0;
	const snapLeft = shpFeatureFloat.x + shpFeatureFloatSize / 2 < w / 2;
	shpFeatureFloatDock.side = snapLeft ? 'left' : 'right';
	shpFeatureFloatDock.top = shpFeatureFloat.y;
	shpFeatureFloatOrigin.side = shpFeatureFloatDock.side;
	shpFeatureFloatOrigin.top = shpFeatureFloatDock.top;
	shpFeatureFloatSnapped.value = true;
	syncShpFeatureFloatToDock();
	if (!shpFeatureFloatDrag.moved) restoreShpFeaturePopup();
}

function onShpFeatureFloatPointerDown(e) {
	if (!shpFeaturePopupMinimized.value) return;
	const target = e.currentTarget;
	try { target.setPointerCapture(e.pointerId); } catch {}
	shpFeatureFloatDrag.active = true;
	shpFeatureFloatDrag.pointerId = e.pointerId;
	shpFeatureFloatDrag.startX = e.clientX;
	shpFeatureFloatDrag.startY = e.clientY;
	shpFeatureFloatDrag.startLeft = shpFeatureFloat.x;
	shpFeatureFloatDrag.startTop = shpFeatureFloat.y;
	shpFeatureFloatDrag.moved = false;
	window.addEventListener('pointermove', onShpFeatureFloatPointerMove, { passive: true });
	window.addEventListener('pointerup', onShpFeatureFloatPointerUp, { passive: true });
}

function onShpFeaturePopupResize() {
	if (shpFeaturePopupMinimized.value) {
		syncShpFeatureFloatToDock();
		return;
	}
	shpFeaturePanelPosition.left = clampShpFeaturePopupLeft(shpFeaturePanelPosition.left);
	shpFeaturePanelPosition.top = clampShpFeaturePopupTop(shpFeaturePanelPosition.top);
}

function toDegreesArrayFromRing(ring) {
	if (!Array.isArray(ring) || ring.length < 2) return [];
	const normalizedRing = ring.map((coord) => [Number(coord?.[0]), Number(coord?.[1])]).filter((coord) => Number.isFinite(coord[0]) && Number.isFinite(coord[1]));
	if (normalizedRing.length < 2) return [];
	const first = normalizedRing[0];
	const last = normalizedRing[normalizedRing.length - 1];
	if (first[0] !== last[0] || first[1] !== last[1]) normalizedRing.push([...first]);
	return normalizedRing.flat();
}

function buildOutlineRingsFromGeometry(geometry) {
	if (!geometry) return [];
	if (geometry.type === 'Polygon') return Array.isArray(geometry.coordinates) ? geometry.coordinates : [];
	if (geometry.type === 'MultiPolygon') {
		return (Array.isArray(geometry.coordinates) ? geometry.coordinates : []).flatMap((polygon) => Array.isArray(polygon) ? polygon : []);
	}
	return [];
}

function addImportedShpOutlineEntities(dataSource, itemKey, featureCollection, featureMetas = []) {
	if (!dataSource?.entities || !Array.isArray(featureCollection?.features)) return;
	featureCollection.features.forEach((feature, featureIndex) => {
		const rings = buildOutlineRingsFromGeometry(feature?.geometry);
		rings.forEach((ring, ringIndex) => {
			const degreesArray = toDegreesArrayFromRing(ring);
			if (degreesArray.length < 4) return;
			const featureMeta = featureMetas[featureIndex] || null;
			const outlineEntity = dataSource.entities.add({
				id: `${itemKey}-outline-${featureIndex}-${ringIndex}`,
				polyline: {
					positions: Cesium.Cartesian3.fromDegreesArray(degreesArray),
					width: 3,
					material: IMPORTED_SHP_OUTLINE_COLOR,
					clampToGround: true,
				},
			});
			outlineEntity._syShpItemKey = itemKey;
			outlineEntity._syShpDerivedOutline = true;
			outlineEntity._syShpFeatureMeta = featureMeta;
			outlineEntity._syListOrder = ++syInfoOrder;
		});
	});
}

function styleImportedShpDataSource(dataSource, itemKey, featureMetas = []) {
	const entities = dataSource?.entities?.values || [];
	const now = Cesium.JulianDate.now();
	entities.forEach((entity) => {
		entity._syShpItemKey = itemKey;
		entity._syListOrder = entity._syListOrder || ++syInfoOrder;
		const rawProperties = entity.properties?.getValue?.(now) || entity.properties || {};
		const rawFeatureIndex = Number(rawProperties?.__syFeatureIndex);
		const featureMeta = Number.isFinite(rawFeatureIndex) ? featureMetas[rawFeatureIndex] || null : null;
		entity._syShpFeatureMeta = featureMeta;
		if (entity.polygon) {
			entity.polygon.material = IMPORTED_SHP_FILL_COLOR;
			entity.polygon.outline = false;
		}
		if (entity.polyline) {
			entity.polyline.width = Math.max(3, Number(entity.polyline.width?.getValue?.() || entity.polyline.width || 3));
			entity.polyline.material = IMPORTED_SHP_OUTLINE_COLOR;
			entity.polyline.clampToGround = true;
		}
		if (entity.point) {
			entity.point.pixelSize = 10;
			entity.point.color = IMPORTED_SHP_FILL_COLOR;
			entity.point.outlineColor = IMPORTED_SHP_OUTLINE_COLOR;
			entity.point.outlineWidth = 2;
		}
		if (entity.billboard) {
			entity.billboard.color = Cesium.Color.WHITE;
		}
	});
}

async function confirmShpImport(payload) {
	const viewer = getViewer();
	if (!viewer) return;
	const name = String(payload?.name || '').trim() || `本地shapefile-${shpImportItems.value.length + 1}`;
	const sourceFileName = String(payload?.sourceFileName || '').trim();
	const normalizedFeatureCollection = normalizeImportedGeoJson(payload?.geojson);
	const featureCollection = {
		type: 'FeatureCollection',
		features: normalizedFeatureCollection.features.map((feature, index) => ({
			...feature,
			properties: {
				...(feature?.properties || {}),
				__syFeatureIndex: index,
			},
		})),
	};
	if (!featureCollection.features.length) {
		ElMessage.error({ message: '未解析到有效的 GeoJSON 要素，无法添加到地图', offset: MESSAGE_OFFSET_TOP });
		return;
	}
	try {
		const itemKey = `shp:${Date.now()}:${Math.random().toString(36).slice(2, 8)}`;
		const featureMetas = featureCollection.features.map((feature, index) => createImportedShpFeatureMeta(feature, itemKey, sourceFileName, name, index));
		const dataSource = await Cesium.GeoJsonDataSource.load(featureCollection, {
			clampToGround: true,
			stroke: IMPORTED_SHP_OUTLINE_COLOR,
			fill: IMPORTED_SHP_FILL_COLOR,
			strokeWidth: 3,
			markerColor: IMPORTED_SHP_FILL_COLOR,
			markerSize: 12,
		});
		dataSource.name = name;
		dataSource._syShpItemKey = itemKey;
		dataSource.show = true;
		await viewer.dataSources.add(dataSource);
		styleImportedShpDataSource(dataSource, itemKey, featureMetas);
		addImportedShpOutlineEntities(dataSource, itemKey, featureCollection, featureMetas);
		shpDataSourceMap.set(itemKey, dataSource);
		shpImportItems.value.push({
			key: itemKey,
			name,
			sourceFileName,
			featureCount: featureCollection.features.length,
			order: ++syInfoOrder,
		});
		if (currentMeasureEntity) {
			setEntityHighlight(currentMeasureEntity, false);
			currentMeasureEntity = null;
			currentMeasurePoints = [];
			measurePanelVisible.value = false;
		}
		selectedTerrainItemKey.value = '';
		selectedKmlItemKey.value = '';
		selectedCadItemKey.value = '';
		selectedShpItemKey.value = itemKey;
		activeTopTab.value = 'sy';
		zoomToTargetPreservePitch(dataSource);
		bumpSyInfoListVersion();
		ElMessage.success({ message: `SHP 已添加到地图，共 ${featureCollection.features.length} 个要素`, offset: MESSAGE_OFFSET_TOP });
	} catch (error) {
		console.error('Failed to add local SHP GeoJSON to Cesium:', error);
		ElMessage.error({ message: 'SHP 添加到地图失败，请检查解析结果', offset: MESSAGE_OFFSET_TOP });
	}
}

async function confirmKmlImport(payload) {
	const viewer = getViewer();
	if (!viewer) return;
	const file = payload?.file;
	if (!file) {
		ElMessage.error({ message: '未检测到 KML/KMZ 文件，无法添加到地图', offset: MESSAGE_OFFSET_TOP });
		return;
	}
	const rawName = String(payload?.name || '').trim();
	const sourceFileName = String(payload?.sourceFileName || file?.name || '').trim();
	const name = rawName || `本地KML-${kmlImportItems.value.length + 1}`;
	const itemKey = `kml:${Date.now()}:${Math.random().toString(36).slice(2, 8)}`;
	let objectUrl = '';
	try {
		objectUrl = URL.createObjectURL(file);
		const dataSource = await Cesium.KmlDataSource.load(objectUrl, {
			camera: viewer.scene.camera,
			canvas: viewer.scene.canvas,
			clampToGround: true,
		});
		dataSource.name = name;
		dataSource._syKmlItemKey = itemKey;
		dataSource.show = true;
		await viewer.dataSources.add(dataSource);
		dataSource.entities.values.forEach((entity) => {
			entity._syKmlItemKey = itemKey;
			entity._syListOrder = entity._syListOrder || ++syInfoOrder;
		});
		kmlDataSourceMap.set(itemKey, dataSource);
		kmlObjectUrlMap.set(itemKey, objectUrl);
		kmlImportItems.value.push({
			key: itemKey,
			name,
			sourceFileName,
			order: ++syInfoOrder,
		});
		if (currentMeasureEntity) {
			setEntityHighlight(currentMeasureEntity, false);
			currentMeasureEntity = null;
			currentMeasurePoints = [];
			measurePanelVisible.value = false;
		}
		selectedTerrainItemKey.value = '';
		selectedShpItemKey.value = '';
		selectedCadItemKey.value = '';
		closeShpFeaturePopup();
		selectedKmlItemKey.value = itemKey;
		activeTopTab.value = 'sy';
		zoomToTargetPreservePitch(dataSource);
		bumpSyInfoListVersion();
		ElMessage.success({ message: 'KML/KMZ 已添加到地图', offset: MESSAGE_OFFSET_TOP });
	} catch (error) {
		console.error('Failed to add local KML/KMZ to Cesium:', error);
		ElMessage.error({ message: 'KML/KMZ 添加到地图失败，请检查文件是否有效', offset: MESSAGE_OFFSET_TOP });
		if (objectUrl) {
			try { URL.revokeObjectURL(objectUrl); } catch { /* ignore */ }
		}
	}
}

async function confirmCadImport(payload) {
	const viewer = getViewer();
	if (!viewer) return;
	const dxf = payload?.dxf;
	const spatialReference = payload?.spatialReference || null;
	const entities = Array.isArray(dxf?.entities) ? dxf.entities : [];
	if (!entities.length) {
		ElMessage.error({ message: '未检测到有效 DXF 实体，无法添加到地图', offset: MESSAGE_OFFSET_TOP });
		return;
	}
	const rawName = String(payload?.name || '').trim();
	const sourceFileName = String(payload?.sourceFileName || '').trim();
	const name = rawName || `本地CAD-${cadImportItems.value.length + 1}`;
	const itemKey = `cad:${Date.now()}:${Math.random().toString(36).slice(2, 8)}`;
	try {
		const dataSource = new Cesium.CustomDataSource(name);
		dataSource.name = name;
		dataSource._syCadItemKey = itemKey;
		dataSource._syCadSpatialReference = spatialReference;
		dataSource.show = true;
		const coordinateTransform = cadCreateCoordinateTransform(dxf, spatialReference);
		let renderedCount = 0;
		entities.forEach((entity) => {
			renderedCount += cadAppendEntityToDataSource(dataSource, entity, coordinateTransform, itemKey);
		});
		if (!renderedCount) {
			throw new Error('当前 DXF 中没有可显示的 CAD 实体');
		}
		await viewer.dataSources.add(dataSource);
		cadDataSourceMap.set(itemKey, dataSource);
		cadImportItems.value.push({
			key: itemKey,
			name,
			sourceFileName,
			coordinateSystemLabel: String(spatialReference?.coordinateSystemLabel || ''),
			sourceCount: entities.length,
			renderedCount,
			order: ++syInfoOrder,
		});
		if (currentMeasureEntity) {
			setEntityHighlight(currentMeasureEntity, false);
			currentMeasureEntity = null;
			currentMeasurePoints = [];
			measurePanelVisible.value = false;
		}
		selectedTerrainItemKey.value = '';
		selectedShpItemKey.value = '';
		selectedKmlItemKey.value = '';
		closeShpFeaturePopup();
		selectedCadItemKey.value = itemKey;
		activeTopTab.value = 'sy';
		zoomToTargetPreservePitch(dataSource);
		bumpSyInfoListVersion();
		ElMessage.success({ message: `CAD 已添加到地图，已绘制 ${renderedCount} 个实体`, offset: MESSAGE_OFFSET_TOP });
	} catch (error) {
		console.error('Failed to add DXF to Cesium:', error);
		ElMessage.error({ message: 'CAD 添加到地图失败，请检查 DXF 文件内容', offset: MESSAGE_OFFSET_TOP });
	}
}

const syInfoItems = computed(() => {
	syInfoListVersion.value;
	const viewer = getViewer();
	const terrainItems = [];
	if (terrainNetworkVisible.value || terrainModelItems.value.length) {
		terrainItems.push({
			key: 'terrain-network',
			name: '网络地形',
			typeLabel: '地形',
			checked: terrainNetworkVisible.value,
			selected: selectedSyInfoKey === 'terrain-network',
			kind: 'terrain-network',
			subtitle: '天地图地形'
		});
	}
	terrainModelItems.value.forEach((item, index) => {
		const { url, name } = item;
		const tileset = terrainTilesetMap.get(url);
		terrainItems.push({
			key: `terrain-model:${url}`,
			name: name || getDefaultTerrainName(index),
			typeLabel: '模型',
			checked: tileset?.show !== false,
			selected: selectedSyInfoKey === `terrain-model:${url}`,
			kind: 'terrain-model',
			url,
			subtitle: url
		});
	});
	const markPointItems = viewer
		? [...viewer.entities.values]
			.filter((entity) => entity?._syMarkPointData)
			.sort((a, b) => (a._syListOrder || 0) - (b._syListOrder || 0))
			.map((entity) => ({
				key: `markPoint:${entity.id}`,
				name: entity._syMarkPointData?.name || entity.name || '标点',
				typeLabel: '标点',
				checked: entity._syUserVisible !== false,
				selected: selectedSyInfoKey === `markPoint:${entity.id}`,
				kind: 'markPoint',
				entity,
				subtitle: entity._syMarkPointData?.desc || ''
			}))
		: [];
	const measureItems = viewer
		? [...viewer.entities.values]
			.filter((entity) => entity?._measureData && entity.name !== 'measure-label')
			.sort((a, b) => (a._syListOrder || 0) - (b._syListOrder || 0))
			.map((entity) => ({
				key: `measure:${entity.id}`,
				name: entity._measureData?.name || inferMeasureItemType(entity),
				typeLabel: inferMeasureItemType(entity),
				checked: entity._syUserVisible !== false,
				selected: selectedSyInfoKey === `measure:${entity.id}`,
				kind: 'measure',
				entity,
				subtitle: entity._measureData?.desc || ''
			}))
		: [];
	const shpItems = shpImportItems.value
		.slice()
		.sort((a, b) => (a.order || 0) - (b.order || 0))
		.map((item) => {
			const dataSource = shpDataSourceMap.get(item.key);
			return {
				key: item.key,
				name: item.name,
				typeLabel: 'SHP',
				checked: dataSource?.show !== false,
				selected: selectedSyInfoKey === `shp:${item.key}`,
				kind: 'shp',
				sourceFileName: item.sourceFileName,
				subtitle: item.sourceFileName || `共 ${item.featureCount} 个要素`
			};
		});
	const kmlItems = kmlImportItems.value
		.slice()
		.sort((a, b) => (a.order || 0) - (b.order || 0))
		.map((item) => {
			const dataSource = kmlDataSourceMap.get(item.key);
			return {
				key: item.key,
				name: item.name,
				typeLabel: 'KML',
				checked: dataSource?.show !== false,
				selected: selectedSyInfoKey === `kml:${item.key}`,
				kind: 'kml',
				sourceFileName: item.sourceFileName,
				subtitle: item.sourceFileName || ''
			};
		});
	const cadItems = cadImportItems.value
		.slice()
		.sort((a, b) => (a.order || 0) - (b.order || 0))
		.map((item) => {
			const dataSource = cadDataSourceMap.get(item.key);
			return {
				key: item.key,
				name: item.name,
				typeLabel: 'CAD',
				checked: dataSource?.show !== false,
				selected: selectedSyInfoKey === `cad:${item.key}`,
				kind: 'cad',
				sourceFileName: item.sourceFileName,
				subtitle: item.coordinateSystemLabel || item.sourceFileName || `已绘制 ${item.renderedCount} / ${item.sourceCount} 个实体`,
			};
		});
	return [...terrainItems, ...markPointItems, ...measureItems, ...shpItems, ...kmlItems, ...cadItems];
});

function resetDrawing() {
	const viewer = getViewer();
	if (!viewer) return;
	
	if (djcxLoadingTimer) { clearTimeout(djcxLoadingTimer); djcxLoadingTimer = null; }
	djcxLoadingToken += 1;
	djcxLoading.value = false;
	djcxMultiSelectedKeys = [];

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
			const grouped = djcxGroupEntitiesByFeatureKey(results);
			const keys = [...grouped.keys()];
			const allEntities = keys.flatMap(k => grouped.get(k)?.entities || []);
			const reps = keys.map(k => grouped.get(k)?.rep).filter(Boolean);
			djcxSetHighlights(allEntities);
			if (keys.length === 1) djcxShowFeatureInPanel(reps[0], 1);
			else if (keys.length > 1) djcxShowFeaturesInTable(reps, { withLoading: false });
			else showInfoPanel.value = false;
		}, Cesium.ScreenSpaceEventType.LEFT_CLICK);
		return;
	}
	if (type === 'duodian') {
		djcxMultiSelectedKeys = [];
		drawHandler = new Cesium.ScreenSpaceEventHandler(viewer.scene.canvas);
		drawHandler.setInputAction((click) => {
			const cartesian = viewer.camera.pickEllipsoid(click.position, viewer.scene.globe.ellipsoid);
			if (!cartesian) return;
			const carto = Cesium.Cartographic.fromCartesian(cartesian);
			const lon = Cesium.Math.toDegrees(carto.longitude);
			const lat = Cesium.Math.toDegrees(carto.latitude);
			const results = djcxQueryPoint(lon, lat);
			if (!results.length) return;
			const pickKey = djcxFeatureKey(results[0]);
			if (!pickKey) return;
			const idx = djcxMultiSelectedKeys.findIndex(k => String(k) === pickKey);
			if (idx >= 0) djcxMultiSelectedKeys.splice(idx, 1);
			else djcxMultiSelectedKeys.push(pickKey);

			const all = djcxGetAllFeatureEntities();
			const selectedEntities = [];
			const reps = [];
			djcxMultiSelectedKeys.forEach((k) => {
				const ents = all.filter(e => djcxFeatureKey(e) === String(k));
				if (!ents.length) return;
				selectedEntities.push(...ents);
				reps.push(ents[0]);
			});

			djcxSetHighlights(selectedEntities);
			if (reps.length === 1) djcxShowFeatureInPanel(reps[0], 1);
			else if (reps.length > 1) djcxShowFeaturesInTable(reps, { withLoading: false });
			else showInfoPanel.value = false;
		}, Cesium.ScreenSpaceEventType.LEFT_CLICK);
		return;
	}
	if (type === 'markPoint') {
		measurePanelVisible.value = false;
		drawHandler = new Cesium.ScreenSpaceEventHandler(viewer.scene.canvas);
		const pickCartesian = (pos) => {
			const scene = viewer.scene;
			let c = scene.pickPosition(pos);
			if (!Cesium.defined(c)) {
				c = viewer.camera.pickEllipsoid(pos, scene.globe.ellipsoid);
			}
			return c;
		};
		drawHandler.setInputAction((click) => {
			const cartesian = pickCartesian(click.position);
			if (!cartesian) return;
			const name = autoName('markPoint');
			const carto = Cesium.Cartographic.fromCartesian(cartesian);
			const longitude = Cesium.Math.toDegrees(carto.longitude);
			const latitude = Cesium.Math.toDegrees(carto.latitude);
			const entity = viewer.entities.add({
				position: cartesian,
				point: {
					pixelSize: 10,
					color: COLORS.NORMAL.POINT,
					outlineColor: COLORS.NORMAL.POINT_OUTLINE,
					outlineWidth: 2,
					heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
					disableDepthTestDistance: Number.POSITIVE_INFINITY
				},
				label: {
					text: name,
					font: '14px Microsoft YaHei',
					style: Cesium.LabelStyle.FILL_AND_OUTLINE,
					fillColor: Cesium.Color.WHITE,
					outlineColor: Cesium.Color.BLACK,
					outlineWidth: 2,
					verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
					pixelOffset: new Cesium.Cartesian2(0, -18),
					heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
					disableDepthTestDistance: Number.POSITIVE_INFINITY,
					showBackground: true,
					backgroundColor: new Cesium.Color(0.16, 0.22, 0.21, 0.8)
				}
			});
			entity._syMarkPointData = { name, desc: '', longitude, latitude };
			registerMarkPointEntity(entity);
			selectedTerrainItemKey.value = '';
			selectedShpItemKey.value = '';
			selectedKmlItemKey.value = '';
			closeShpFeaturePopup();
			if (selectedMarkPointEntityId.value) {
				const prev = viewer.entities.getById(selectedMarkPointEntityId.value);
				if (prev && prev !== entity) setEntityHighlight(prev, false);
			}
			selectedMarkPointEntityId.value = entity.id;
			setEntityHighlight(entity, true);
			activeTopTab.value = 'sy';
			measureActiveTab.value = 'info';
			measurePanelVisible.value = true;
			applyMarkPointDataToPanel(entity._syMarkPointData);
			bumpSyInfoListVersion();
			viewer.scene.requestRender();
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
			if (['dianPolygon', 'dianRect', 'dianCircle'].includes(type)) pt._djcxQuery = true;
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
			if (['drawRect', 'drawCircle', 'dianRect', 'dianCircle', 'measureAzimuth'].includes(type) && positions.length >= 2) {
				finalizeDrawing();
			} else if (type === 'measureAngle' && positions.length >= 3) {
				finalizeDrawing();
			}
		}
	}, Cesium.ScreenSpaceEventType.LEFT_CLICK);

	drawHandler.setInputAction(() => {
		if (['drawLine', 'measureDistance'].includes(type) && positions.length >= 2) {
			finalizeDrawing();
			return;
		}
		if (['drawPolygon', 'measureArea', 'measureVolume', 'dianPolygon'].includes(type) && positions.length >= 3) {
			finalizeDrawing();
		}
	}, Cesium.ScreenSpaceEventType.RIGHT_CLICK);
}

function updateDrawingHint(type, pointCount) {
	const hints = {
		dianxuan: ['点击地图查询要素', '点击地图查询要素'],
		duodian: ['点击地图选择多个要素', '继续点击选择/取消选择'],
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

const cartesianToLngLat = (point) => {
	const cartographic = Cesium.Cartographic.fromCartesian(point);
	return [
		Cesium.Math.toDegrees(cartographic.longitude),
		Cesium.Math.toDegrees(cartographic.latitude)
	];
};

const closeRing = (ring) => {
	if (ring.length === 0) return ring;
	const [firstX, firstY] = ring[0];
	const [lastX, lastY] = ring[ring.length - 1];
	return firstX === lastX && firstY === lastY ? ring : [...ring, ring[0]];
};

const closeCartesianRing = (ring) => {
	if (ring.length === 0) return ring;
	const first = ring[0];
	const last = ring[ring.length - 1];
	return Cesium.Cartesian3.equalsEpsilon(first, last, Cesium.Math.EPSILON8) ? ring : [...ring, first];
};

const planarRingArea = (ring) => {
	let area = 0;
	for (let i = 0; i < ring.length - 1; i++) {
		const [x1, y1] = ring[i];
		const [x2, y2] = ring[i + 1];
		area += (x1 * y2) - (x2 * y1);
	}
	return Math.abs(area) / 2;
};

const buildCircleBoundaryPoints = (center, radius, segments = 128) => {
	if (!center || !Number.isFinite(radius) || radius <= 0) return [];
	const transform = Cesium.Transforms.eastNorthUpToFixedFrame(center);
	const pts = [];
	for (let i = 0; i <= segments; i++) {
		const ang = (i / segments) * Cesium.Math.TWO_PI;
		const local = new Cesium.Cartesian3(Math.cos(ang) * radius, Math.sin(ang) * radius, 0);
		const world = Cesium.Matrix4.multiplyByPoint(transform, local, new Cesium.Cartesian3());
		pts.push(world);
	}
	return pts;
};

// 辅助计算函数: 基于 Turf 中心点和局部 ENU 平面计算面积
const polygonArea = (pts) => {
	if (!Array.isArray(pts) || pts.length < 3) return 0;
	try {
		const cartesianRing = closeCartesianRing(pts);
		const ring = closeRing(cartesianRing.map(cartesianToLngLat));
		if (ring.length < 4) return 0;
		const polygon = turfPolygon([ring]);
		const center = turfCentroid(polygon)?.geometry?.coordinates;
		if (!Array.isArray(center) || center.length < 2) return 0;
		const origin = Cesium.Cartesian3.fromDegrees(center[0], center[1]);
		const worldToLocal = Cesium.Matrix4.inverseTransformation(
			Cesium.Transforms.eastNorthUpToFixedFrame(origin),
			new Cesium.Matrix4()
		);
		const localRing = cartesianRing.map((point) => {
			const localPoint = Cesium.Matrix4.multiplyByPoint(worldToLocal, point, new Cesium.Cartesian3());
			return [localPoint.x, localPoint.y];
		});
		return planarRingArea(localRing);
	} catch (error) {
		console.warn('Failed to calculate planar area with Turf.js:', error);
		return 0;
	}
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
	const queryMainColor = CesiumLib.Color.fromCssColorString('#334155');
	const queryDashColor = CesiumLib.Color.BLACK.withAlpha(1);
	const isQueryTool = type === 'dianPolygon' || type === 'dianRect' || type === 'dianCircle';
	const mainColor = isQueryTool ? queryMainColor : cyanColor;
	const fillAlpha = isQueryTool ? 0.5 : 0.3;
	const dashColor = isQueryTool ? queryDashColor : cyanColor;
	
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
					material: new CesiumLib.PolylineDashMaterialProperty({ color: dashColor, dashLength: 16 }),
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
					material: mainColor.withAlpha(fillAlpha),
					outline: true,
					outlineColor: mainColor,
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
					material: new CesiumLib.PolylineDashMaterialProperty({ color: dashColor, dashLength: 16 })
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
					material: mainColor.withAlpha(fillAlpha),
					outline: true,
					outlineColor: mainColor,
					outlineWidth: 2
				}
			});
			if (type === 'dianRect') {
				tempEdgeEntity = viewer.entities.add({
					polyline: {
						positions: new CesiumLib.CallbackProperty(() => {
							if (!hoverCartesian || positions.length === 0) return [];
							const c1 = CesiumLib.Cartographic.fromCartesian(positions[0]);
							const c2 = CesiumLib.Cartographic.fromCartesian(hoverCartesian);
							const west = Math.min(c1.longitude, c2.longitude);
							const east = Math.max(c1.longitude, c2.longitude);
							const south = Math.min(c1.latitude, c2.latitude);
							const north = Math.max(c1.latitude, c2.latitude);
							const p1 = CesiumLib.Cartesian3.fromRadians(west, south);
							const p2 = CesiumLib.Cartesian3.fromRadians(east, south);
							const p3 = CesiumLib.Cartesian3.fromRadians(east, north);
							const p4 = CesiumLib.Cartesian3.fromRadians(west, north);
							return [p1, p2, p3, p4, p1];
						}, false),
						clampToGround: true,
						width: 2,
						material: new CesiumLib.PolylineDashMaterialProperty({ color: dashColor, dashLength: 16 }),
						disableDepthTestDistance: Number.POSITIVE_INFINITY,
					}
				});
			}
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
					material: mainColor.withAlpha(fillAlpha),
					outline: true,
					outlineColor: mainColor,
					outlineWidth: 2
				}
			});
			if (type === 'dianCircle') {
				tempEdgeEntity = viewer.entities.add({
					polyline: {
						positions: new CesiumLib.CallbackProperty(() => {
							if (!hoverCartesian || positions.length === 0) return [];
							const center = positions[0];
							if (!center) return [];
							const radius = Math.max(0.1, CesiumLib.Cartesian3.distance(center, hoverCartesian));
							return buildCircleBoundaryPoints(center, radius, 64);
						}, false),
						clampToGround: true,
						width: 2,
						material: new CesiumLib.PolylineDashMaterialProperty({ color: dashColor, dashLength: 16 }),
						disableDepthTestDistance: Number.POSITIVE_INFINITY,
					}
				});
			}
			tempRadiusEntity = viewer.entities.add({
				polyline: {
					positions: new CesiumLib.CallbackProperty(() => {
						if (!hoverCartesian || positions.length === 0) return [];
						return [positions[0], hoverCartesian];
					}, false),
					width: 2,
					material: new CesiumLib.PolylineDashMaterialProperty({ color: dashColor, dashLength: 16 })
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
				const queryMainColor = CesiumLib.Color.fromCssColorString('#334155');
				const polyEntity = viewer.entities.add({
					polygon: {
						hierarchy: new CesiumLib.PolygonHierarchy([...positions]),
						material: queryMainColor.withAlpha(0.5),
						outline: true,
						outlineColor: queryMainColor,
						outlineWidth: 2
					}
				});
				polyEntity._djcxQuery = true;
				const dashEntity = viewer.entities.add({
					polyline: {
						positions: [...positions, positions[0]],
						clampToGround: true,
						width: 2,
						material: new CesiumLib.PolylineDashMaterialProperty({ color: CesiumLib.Color.BLACK.withAlpha(1), dashLength: 16 }),
						disableDepthTestDistance: Number.POSITIVE_INFINITY,
					}
				});
				dashEntity._djcxQuery = true;
				const a = polygonArea(positions);
				if (Number.isFinite(a) && a > 0) {
					let sumLon = 0, sumLat = 0;
					positions.forEach(p => { const c = toCarto(p); sumLon += CesiumLib.Math.toDegrees(c.longitude); sumLat += CesiumLib.Math.toDegrees(c.latitude); });
					const labelPos = CesiumLib.Cartesian3.fromDegrees(sumLon / positions.length, sumLat / positions.length);
					const areaText = a >= 1e6 ? `${(a / 1e6).toFixed(2)} km²` : `${a.toFixed(2)} m²`;
					const queryLabel = viewer.entities.add({
						position: labelPos,
						label: {
							text: areaText,
							font: 'bold 14px Microsoft YaHei',
							fillColor: CesiumLib.Color.WHITE,
							showBackground: true,
							backgroundColor: new CesiumLib.Color(0.1, 0.1, 0.1, 0.8),
							pixelOffset: new CesiumLib.Cartesian2(0, -25),
							disableDepthTestDistance: Number.POSITIVE_INFINITY
						}
					});
					queryLabel._djcxQuery = true;
				}
				const ring = positions.map(p => {
					const c = toCarto(p);
					return [CesiumLib.Math.toDegrees(c.longitude), CesiumLib.Math.toDegrees(c.latitude)];
				});
				const first = ring[0];
				const last = ring[ring.length - 1];
				if (first && last && (first[0] !== last[0] || first[1] !== last[1])) ring.push([...first]);
				const results = djcxQueryPolygon(ring);
				const grouped = djcxGroupEntitiesByFeatureKey(results);
				const keys = [...grouped.keys()];
				const allEntities = keys.flatMap(k => grouped.get(k)?.entities || []);
				const reps = keys.map(k => grouped.get(k)?.rep).filter(Boolean);
				djcxSetHighlights(allEntities);
				if (keys.length === 1) djcxShowFeatureInPanel(reps[0], 1);
				else if (keys.length > 1) djcxShowFeaturesInTable(reps);
				else showInfoPanel.value = false;
			}
			break;
		}
		case 'dianRect': {
			if (positions.length >= 2) {
				const queryMainColor = CesiumLib.Color.fromCssColorString('#334155');
				const c1 = toCarto(positions[0]), c2 = toCarto(positions[positions.length - 1]);
				const rect = CesiumLib.Rectangle.fromRadians(Math.min(c1.longitude, c2.longitude), Math.min(c1.latitude, c2.latitude), Math.max(c1.longitude, c2.longitude), Math.max(c1.latitude, c2.latitude));
				const rectEntity = viewer.entities.add({
					rectangle: {
						coordinates: rect,
						material: queryMainColor.withAlpha(0.5),
						outline: true,
						outlineColor: queryMainColor,
						outlineWidth: 2
					}
				});
				rectEntity._djcxQuery = true;
				const dashRectEntity = viewer.entities.add({
					polyline: {
						positions: (() => {
							const west = rect.west;
							const east = rect.east;
							const south = rect.south;
							const north = rect.north;
							const p1 = CesiumLib.Cartesian3.fromRadians(west, south);
							const p2 = CesiumLib.Cartesian3.fromRadians(east, south);
							const p3 = CesiumLib.Cartesian3.fromRadians(east, north);
							const p4 = CesiumLib.Cartesian3.fromRadians(west, north);
							return [p1, p2, p3, p4, p1];
						})(),
						clampToGround: true,
						width: 2,
						material: new CesiumLib.PolylineDashMaterialProperty({ color: CesiumLib.Color.BLACK.withAlpha(1), dashLength: 16 }),
						disableDepthTestDistance: Number.POSITIVE_INFINITY,
					}
				});
				dashRectEntity._djcxQuery = true;
				const lonMin = CesiumLib.Math.toDegrees(rect.west), lonMax = CesiumLib.Math.toDegrees(rect.east);
				const latMin = CesiumLib.Math.toDegrees(rect.south), latMax = CesiumLib.Math.toDegrees(rect.north);
				const rectPts = [
					CesiumLib.Cartesian3.fromDegrees(lonMin, latMin),
					CesiumLib.Cartesian3.fromDegrees(lonMax, latMin),
					CesiumLib.Cartesian3.fromDegrees(lonMax, latMax),
					CesiumLib.Cartesian3.fromDegrees(lonMin, latMax)
				];
				const aRect = polygonArea(rectPts);
				if (Number.isFinite(aRect) && aRect > 0) {
					const labelPos = CesiumLib.Cartesian3.fromDegrees((lonMin + lonMax) / 2, (latMin + latMax) / 2);
					const areaText = aRect >= 1e6 ? `${(aRect / 1e6).toFixed(2)} km²` : `${aRect.toFixed(2)} m²`;
					const queryLabel = viewer.entities.add({
						position: labelPos,
						label: {
							text: areaText,
							font: 'bold 14px Microsoft YaHei',
							fillColor: CesiumLib.Color.WHITE,
							showBackground: true,
							backgroundColor: new CesiumLib.Color(0.1, 0.1, 0.1, 0.8),
							pixelOffset: new CesiumLib.Cartesian2(0, -25),
							disableDepthTestDistance: Number.POSITIVE_INFINITY
						}
					});
					queryLabel._djcxQuery = true;
				}
				const results = djcxQueryRect(lonMin, latMin, lonMax, latMax);
				const grouped = djcxGroupEntitiesByFeatureKey(results);
				const keys = [...grouped.keys()];
				const allEntities = keys.flatMap(k => grouped.get(k)?.entities || []);
				const reps = keys.map(k => grouped.get(k)?.rep).filter(Boolean);
				djcxSetHighlights(allEntities);
				if (keys.length === 1) djcxShowFeatureInPanel(reps[0], 1);
				else if (keys.length > 1) djcxShowFeaturesInTable(reps);
				else showInfoPanel.value = false;
			}
			break;
		}
		case 'dianCircle': {
			if (positions.length >= 2) {
				const queryMainColor = CesiumLib.Color.fromCssColorString('#334155');
				const rMeters = new CesiumLib.EllipsoidGeodesic(toCarto(positions[0]), toCarto(positions[positions.length - 1])).surfaceDistance;
				const radius = CesiumLib.Cartesian3.distance(positions[0], positions[positions.length - 1]);
				const circleEntity = viewer.entities.add({
					position: positions[0],
					ellipse: {
						semiMajorAxis: radius,
						semiMinorAxis: radius,
						material: queryMainColor.withAlpha(0.5),
						outline: true,
						outlineColor: queryMainColor,
						outlineWidth: 2
					}
				});
				circleEntity._djcxQuery = true;
				const dashCircleEntity = viewer.entities.add({
					polyline: {
						positions: (() => {
							const center = positions[0];
							if (!center) return [];
							return buildCircleBoundaryPoints(center, radius, 64);
						})(),
						clampToGround: true,
						width: 2,
						material: new CesiumLib.PolylineDashMaterialProperty({ color: CesiumLib.Color.BLACK.withAlpha(1), dashLength: 16 }),
						disableDepthTestDistance: Number.POSITIVE_INFINITY,
					}
				});
				dashCircleEntity._djcxQuery = true;
				if (Number.isFinite(rMeters) && rMeters > 0) {
					const aCircle = Math.PI * rMeters * rMeters;
					const labelPos = positions[0];
					const areaText = aCircle >= 1e6 ? `${(aCircle / 1e6).toFixed(2)} km²` : `${aCircle.toFixed(2)} m²`;
					const queryLabel = viewer.entities.add({
						position: labelPos,
						label: {
							text: areaText,
							font: 'bold 14px Microsoft YaHei',
							fillColor: CesiumLib.Color.WHITE,
							showBackground: true,
							backgroundColor: new CesiumLib.Color(0.1, 0.1, 0.1, 0.8),
							pixelOffset: new CesiumLib.Cartesian2(0, -25),
							disableDepthTestDistance: Number.POSITIVE_INFINITY
						}
					});
					queryLabel._djcxQuery = true;
				}
				const centerCarto = toCarto(positions[0]);
				const results = djcxQueryCircle(CesiumLib.Math.toDegrees(centerCarto.longitude), CesiumLib.Math.toDegrees(centerCarto.latitude), rMeters);
				const grouped = djcxGroupEntitiesByFeatureKey(results);
				const keys = [...grouped.keys()];
				const allEntities = keys.flatMap(k => grouped.get(k)?.entities || []);
				const reps = keys.map(k => grouped.get(k)?.rep).filter(Boolean);
				djcxSetHighlights(allEntities);
				if (keys.length === 1) djcxShowFeatureInPanel(reps[0], 1);
				else if (keys.length > 1) djcxShowFeaturesInTable(reps);
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
				const circlePts = buildCircleBoundaryPoints(positions[0], r);
				const circleEntity = viewer.entities.add({ position: positions[0], ellipse: { semiMajorAxis: r, semiMinorAxis: r, material: COLORS.NORMAL.FILL, outline: true, outlineColor: COLORS.NORMAL.OUTLINE, outlineWidth: 2 } });
				currentMeasureEntity = circleEntity;
				circleEntity._drawn = true;
				const defaultName = autoName('circle');
				measureForm.name = defaultName;
				measureForm.areaSqMeters = polygonArea(circlePts);
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
	
	if (currentMeasureEntity?._measureData) {
		registerMeasureEntity(currentMeasureEntity);
	}
	
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
function closeInfoPanel() {
	showInfoPanel.value = false;
	if (djcxLoadingTimer) { clearTimeout(djcxLoadingTimer); djcxLoadingTimer = null; }
	djcxLoadingToken += 1;
	djcxLoading.value = false;
}

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
	homeUiVisible.value = true;
	homeSidebarEntering.value = false;
	await enterHomeScene({ duration: 0 });
	addClickHandler(handleMapClick, {
		shouldHandle: (payload) => {
			if (payload?.type === 'entity' && payload?.entity?._measureData) return true;
			if (payload?.type === 'entity' && payload?.entity?._syShpItemKey) {
				return activeTopTab.value === 'sy' && !['drawLine', 'drawPolygon', 'drawCircle', 'drawRect', 'measureDistance', 'measureArea', 'measureVolume', 'measureAzimuth', 'measureAngle'].includes(activeTool.value);
			}
			if (payload?.type === 'entity' && payload?.entity?._syCadItemKey) {
				return activeTopTab.value === 'sy' && !['drawLine', 'drawPolygon', 'drawCircle', 'drawRect', 'measureDistance', 'measureArea', 'measureVolume', 'measureAzimuth', 'measureAngle'].includes(activeTool.value);
			}
			return activeTool.value === 'dianxuan';
		}
	});
	addMouseMoveHandler(coords => mouseCoords.value = coords);
	addHeadingUpdateHandler(deg => headingDeg.value = deg);
	addScaleUpdateHandler(info => { if (info) Object.assign(scaleBar, info); });
	document.addEventListener('click', e => {
		if (layerPanelVisible.value && !layerPanelRef.value?.contains(e.target) && !layerBtnRef.value?.contains(e.target)) layerPanelVisible.value = false;
	});
	updateIndicator();
	window.addEventListener('resize', updateIndicator);
	setShpFeaturePanelDefaultPosition();
	window.addEventListener('resize', onShpFeaturePopupResize, { passive: true });
});

onBeforeUnmount(() => {
	removeClickHandler(); removeMouseMoveHandler(); removeHeadingUpdateHandler(); removeScaleUpdateHandler();
	window.removeEventListener('resize', onShpFeaturePopupResize);
	window.removeEventListener('pointermove', onShpFeatureHeaderPointerMove);
	window.removeEventListener('pointerup', onShpFeatureHeaderPointerUp);
	window.removeEventListener('pointermove', onShpFeatureFloatPointerMove);
	window.removeEventListener('pointerup', onShpFeatureFloatPointerUp);
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

function openTerrainPanel() {
	terrainInputUrl.value = localStorage.getItem(TERRAIN_INPUT_STORAGE_KEY) || terrainInputUrl.value;
	terrainInputName.value = localStorage.getItem(TERRAIN_NAME_STORAGE_KEY) || terrainInputName.value;
	terrainPanelVisible.value = true;
}

function cancelTerrainPanel() {
	terrainPanelVisible.value = false;
}

async function confirmTerrain() {
	const input = terrainInputUrl.value.trim();
	const previousTerrainModelList = [...terrainModelItems.value];
	const previousTerrainNameMap = new Map(previousTerrainModelList.map((item) => [item.url, item.name]));

	if (hasMultipleTerrainLinksWithoutSeparator(input)) {
		ElMessage.warning({ message: '检测到多个链接，请使用分号分隔，中英文分号都可以', offset: MESSAGE_OFFSET_TOP });
		return;
	}

	const nextTerrainUrls = parseTerrainUrls(input);
	const duplicateUrls = getDuplicateTerrainUrls(nextTerrainUrls);
	if (duplicateUrls.length) {
		ElMessage.warning({ message: `检测到重复链接，请修改后再加载：${duplicateUrls.join('；')}`, offset: MESSAGE_OFFSET_TOP });
		return;
	}
	if (nextTerrainUrls.some((url) => !url.toLowerCase().includes('tileset.json'))) {
		ElMessage.warning({ message: '请输入有效的 tileset.json 模型地址，多个链接请用分号分隔', offset: MESSAGE_OFFSET_TOP });
		return;
	}
	const terrainNameEntries = parseTerrainNames(terrainInputName.value);
	const nextTerrainModelList = nextTerrainUrls.map((url, index) => ({
		url,
		name: resolveTerrainName({
			customName: terrainNameEntries[index],
			index,
			existingName: previousTerrainNameMap.get(url),
		}),
	}));

	enableNetworkTerrain();
	terrainNetworkVisible.value = true;


	if (!nextTerrainModelList.length) {
		if (previousTerrainModelList.length) {
			previousTerrainModelList.forEach((item) => {
				remove3DTileset(item.url);
				terrainTilesetMap.delete(item.url);
			});
			terrainModelItems.value = [];
		}
		updateTerrainActiveState();
		terrainPanelVisible.value = false;
		localStorage.setItem(TERRAIN_INPUT_STORAGE_KEY, '');
		localStorage.setItem(TERRAIN_NAME_STORAGE_KEY, '');
		terrainInputUrl.value = '';
		terrainInputName.value = '';
		bumpSyInfoListVersion();
		ElMessage.success({ message: '网络地形加载成功', offset: MESSAGE_OFFSET_TOP });
		return;
	}

	const previousTerrainSet = new Set(previousTerrainModelList.map((item) => item.url));
	const nextTerrainSet = new Set(nextTerrainModelList.map((item) => item.url));
	const urlsToAdd = nextTerrainModelList.filter((item) => !previousTerrainSet.has(item.url)).map((item) => item.url);
	const urlsToRemove = previousTerrainModelList.filter((item) => !nextTerrainSet.has(item.url)).map((item) => item.url);
	if (!urlsToAdd.length && !urlsToRemove.length && previousTerrainModelList.length === nextTerrainModelList.length) {
		terrainModelItems.value = [...nextTerrainModelList];
		terrainInputName.value = nextTerrainModelList.map((item) => item.name).join(';');
		localStorage.setItem(TERRAIN_NAME_STORAGE_KEY, terrainInputName.value);
		updateTerrainActiveState();
		terrainPanelVisible.value = false;
		bumpSyInfoListVersion();
		ElMessage.success({ message: '模型已加载成功', offset: MESSAGE_OFFSET_TOP });
		return;
	}

	const addedUrls = [];
	for (const url of urlsToAdd) {
		const tileset = await add3DTileset(url, { alpha: 1 });
		if (!tileset) {
			addedUrls.forEach((loadedUrl) => {
				remove3DTileset(loadedUrl);
				terrainTilesetMap.delete(loadedUrl);
			});
			ElMessage.error({ message: `模型加载失败，请检查链接是否可访问：${url}`, offset: MESSAGE_OFFSET_TOP });
			return;
		}
		tileset.show = true;
		terrainTilesetMap.set(url, tileset);
		addedUrls.push(url);
	}

	urlsToRemove.forEach((url) => {
		remove3DTileset(url);
		terrainTilesetMap.delete(url);
	});
	terrainModelItems.value = [...nextTerrainModelList];
	updateTerrainActiveState();
	terrainPanelVisible.value = false;
	syncTerrainInputStorage();
	bumpSyInfoListVersion();
	ElMessage.success({ message: `地形和模型加载成功，共加载 ${nextTerrainModelList.length} 个链接`, offset: MESSAGE_OFFSET_TOP });
}

function closeTerrain() {
	disableTerrain();
	terrainNetworkVisible.value = false;
	selectedTerrainItemKey.value = '';
	if (terrainModelItems.value.length) {
		terrainModelItems.value.forEach((item) => {
			remove3DTileset(item.url);
			terrainTilesetMap.delete(item.url);
		});
		terrainModelItems.value = [];
	}
	updateTerrainActiveState();
	terrainPanelVisible.value = false;
	bumpSyInfoListVersion();
}

// 处理地图点击
function handleMapClick(info) {
	const currentKey = getSelectedSyInfoKey();

	// 如果点击的是测量实体
	if (info?.entity?._measureData) {
		const newKey = `measure:${info.entity.id}`;
		if (currentKey === newKey) {
			// 点击当前已选中的测量实体，取消选中
			clearAllSySelection();
		} else {
			selectSyInfoItem({ kind: 'measure', entity: info.entity, key: newKey }, { locate: false });
		}
		closeShpFeaturePopup();
		return;
	}

	if (info?.entity?._syMarkPointData) {
		const newKey = `markPoint:${info.entity.id}`;
		if (currentKey === newKey) {
			// 点击当前已选中的标点，取消选中
			clearAllSySelection();
		} else {
			clearAllSySelection();
			if (info.entity._syUserVisible === false) setMarkPointEntityVisible(info.entity, true);
			selectedMarkPointEntityId.value = info.entity.id;
			setEntityHighlight(info.entity, true);
			activeTopTab.value = 'sy';
			measureActiveTab.value = 'info';
			measurePanelVisible.value = true;
			applyMarkPointDataToPanel(info.entity._syMarkPointData);
			setSelectedSyInfoKey(newKey);
		}
		bumpSyInfoListVersion();
		const viewer = getViewer();
		if (viewer) viewer.scene.requestRender();
		return;
	}

	if (info?.entity?._syShpItemKey) {
		const newKey = `shp:${info.entity._syShpItemKey}`;
		if (currentKey === newKey) {
			clearAllSySelection();
		} else {
			clearAllSySelection();
			selectedShpItemKey.value = info.entity._syShpItemKey;
			activeTopTab.value = 'sy';
			openShpFeaturePopup(info.entity._syShpFeatureMeta);
			setSelectedSyInfoKey(newKey);
		}
		bumpSyInfoListVersion();
		return;
	}

	if (info?.entity?._syKmlItemKey) {
		const newKey = `kml:${info.entity._syKmlItemKey}`;
		if (currentKey === newKey) {
			clearAllSySelection();
		} else {
			clearAllSySelection();
			selectedKmlItemKey.value = info.entity._syKmlItemKey;
			activeTopTab.value = 'sy';
			setSelectedSyInfoKey(newKey);
		}
		bumpSyInfoListVersion();
		return;
	}

	if (info?.entity?._syCadItemKey) {
		const newKey = `cad:${info.entity._syCadItemKey}`;
		if (currentKey === newKey) {
			clearAllSySelection();
		} else {
			clearAllSySelection();
			selectedCadItemKey.value = info.entity._syCadItemKey;
			activeTopTab.value = 'sy';
			setSelectedSyInfoKey(newKey);
		}
		bumpSyInfoListVersion();
		return;
	}
	
	// 点击空白处取消选中
	clearAllSySelection();
	bumpSyInfoListVersion();

	if (activeTopTab.value === 'djcx') {
		if (activeTool.value === 'dianxuan' && info?.coordinates) {
			const results = djcxQueryPoint(info.coordinates.longitude, info.coordinates.latitude);
			const grouped = djcxGroupEntitiesByFeatureKey(results);
			const keys = [...grouped.keys()];
			const allEntities = keys.flatMap(k => grouped.get(k)?.entities || []);
			const reps = keys.map(k => grouped.get(k)?.rep).filter(Boolean);
			djcxSetHighlights(allEntities);
			if (keys.length === 1) djcxShowFeatureInPanel(reps[0], 1);
			else if (keys.length > 1) djcxShowFeaturesInTable(reps, { withLoading: false });
			else showInfoPanel.value = false;
			return;
		}
	}
	
	// 如果点击的是 3D Tileset 要素
	if (activeTool.value === 'dianxuan' && activeTopTab.value !== 'djcx' && info?.properties && Object.keys(info.properties).length) {
		clickInfo.value = info; 
		showInfoPanel.value = true;
	}
}

// 数据复制与删除 (保留在 Shell 中)
function copyCoords() {
	if (measureForm.kind === 'markPoint') {
		const lon = Number(measureForm.longitude);
		const lat = Number(measureForm.latitude);
		const text = `${Number.isFinite(lon) ? lon.toFixed(12) : ''}\t${Number.isFinite(lat) ? lat.toFixed(12) : ''}`.trim();
		if (text) navigator.clipboard.writeText(text);
		return;
	}
	navigator.clipboard.writeText(lastMeasure.points.map((p, i) => `${i}\t${p.lon}\t${p.lat}`).join('\n'));
}
function copyAll() { navigator.clipboard.writeText(lastMeasure.points.map((p, i) => `${i}\t${p.lon}\t${p.lat}\t${lastMeasure.segmentsMeters[i]}\t${lastMeasure.cumulativeMeters[i]}`).join('\n')); }

function toggleSyInfoItem({ item, checked }) {
	if (!item) return;
	const viewer = getViewer();
	if (item.kind === 'measure') {
		closeShpFeaturePopup();
		setMeasureEntityVisible(item.entity, checked);
		if (viewer) viewer.scene.requestRender();
		return;
	}
	if (item.kind === 'markPoint') {
		setMarkPointEntityVisible(item.entity, checked);
		if (viewer) viewer.scene.requestRender();
		return;
	}
	if (item.kind === 'terrain-network') {
		terrainNetworkVisible.value = checked;
		if (!checked && selectedSyInfoKey === 'terrain-network') {
			clearAllSySelection();
		}
		if (checked) enableNetworkTerrain();
		else disableTerrain();
		updateTerrainActiveState();
		bumpSyInfoListVersion();
		if (viewer) viewer.scene.requestRender();
		return;
	}
	if (item.kind === 'shp') {
		const dataSource = shpDataSourceMap.get(item.key);
		if (!dataSource) return;
		dataSource.show = checked;
		if (!checked && selectedSyInfoKey === `shp:${item.key}`) {
			clearAllSySelection();
		}
		bumpSyInfoListVersion();
		if (viewer) viewer.scene.requestRender();
		return;
	}
	if (item.kind === 'kml') {
		const dataSource = kmlDataSourceMap.get(item.key);
		if (!dataSource) return;
		dataSource.show = checked;
		if (!checked && selectedSyInfoKey === `kml:${item.key}`) {
			clearAllSySelection();
		}
		bumpSyInfoListVersion();
		if (viewer) viewer.scene.requestRender();
		return;
	}
	if (item.kind === 'cad') {
		const dataSource = cadDataSourceMap.get(item.key);
		if (!dataSource) return;
		dataSource.show = checked;
		if (!checked && selectedSyInfoKey === `cad:${item.key}`) {
			clearAllSySelection();
		}
		bumpSyInfoListVersion();
		if (viewer) viewer.scene.requestRender();
		return;
	}
	if (item.kind === 'terrain-model') {
		const tileset = terrainTilesetMap.get(item.url);
		if (!tileset) return;
		tileset.show = checked;
		if (!checked && selectedSyInfoKey === `terrain-model:${item.url}`) {
			clearAllSySelection();
		}
		updateTerrainActiveState();
		bumpSyInfoListVersion();
		if (viewer) viewer.scene.requestRender();
	}
}

function zoomToTargetPreservePitch(target) {
	const viewer = getViewer();
	if (!viewer || !target) return;
	const { heading, pitch, roll } = viewer.camera;
	const offset = new Cesium.HeadingPitchRange(heading, pitch, 0);
	viewer.zoomTo(target, offset).then(() => {
		try {
			// Keep roll stable for users using oblique view
			if (Math.abs(roll) > 1e-6) {
				viewer.camera.setView({
					orientation: { heading: viewer.camera.heading, pitch: viewer.camera.pitch, roll }
				});
			}
		} catch {
			// ignore camera orientation restore errors
		}
	}).catch(() => {
		// ignore zoom errors
	});
}

function selectSyInfoItem(item, options = {}) {
	if (!item) return;
	const viewer = getViewer();
	const { locate = true, preservePitch = true } = options;

	// 使用统一的选择状态管理
	const currentKey = getSelectedSyInfoKey();
	const newKey = item.key;

	// 如果点击的是当前已选中的项目，则取消选中
	if (currentKey === newKey) {
		clearAllSySelection();
		bumpSyInfoListVersion();
		return;
	}

	// 首先清除所有现有的高亮状态
	clearAllSySelection();

	// 然后设置新的选中状态
	if (item.kind === 'measure' && item.entity?._measureData) {
		if (item.entity._syUserVisible === false) setMeasureEntityVisible(item.entity, true);
		currentMeasureEntity = item.entity;
		currentMeasurePoints = item.entity._measurePoints || [];
		setEntityHighlight(currentMeasureEntity, true);
		measurePanelVisible.value = true;
		applyMeasureDataToPanel(item.entity._measureData);
		measureActiveTab.value = 'info';
		activeTopTab.value = 'sy';
		setSelectedSyInfoKey(item.key);
		if (viewer && locate) {
			if (preservePitch) zoomToTargetPreservePitch(item.entity);
			else viewer.zoomTo(item.entity);
		}
		bumpSyInfoListVersion();
		return;
	}

	if (item.kind === 'markPoint' && viewer) {
		if (item.entity?._syUserVisible === false) setMarkPointEntityVisible(item.entity, true);
		selectedMarkPointEntityId.value = item.entity.id;
		setEntityHighlight(item.entity, true);
		activeTopTab.value = 'sy';
		measureActiveTab.value = 'info';
		measurePanelVisible.value = true;
		applyMarkPointDataToPanel(item.entity?._syMarkPointData || {});
		setSelectedSyInfoKey(item.key);
		if (locate) {
			if (preservePitch) zoomToTargetPreservePitch(item.entity);
			else viewer.zoomTo(item.entity);
		}
		bumpSyInfoListVersion();
		return;
	}

	if (item.kind === 'terrain-network') {
		selectedTerrainItemKey.value = 'terrain-network';
		activeTopTab.value = 'sy';
		setSelectedSyInfoKey(item.key);
		bumpSyInfoListVersion();
		return;
	}

	if (item.kind === 'shp' && viewer) {
		selectedShpItemKey.value = item.key;
		const dataSource = shpDataSourceMap.get(item.key);
		if (dataSource) {
			if (dataSource.show === false) dataSource.show = true;
			viewer.zoomTo(dataSource);
			const previewEntity = dataSource.entities.values.find((entity) => entity?._syShpFeatureMeta && !entity._syShpDerivedOutline);
			if (previewEntity?._syShpFeatureMeta) openShpFeaturePopup(previewEntity._syShpFeatureMeta);
		}
		activeTopTab.value = 'sy';
		setSelectedSyInfoKey(item.key);
		bumpSyInfoListVersion();
		return;
	}

	if (item.kind === 'kml' && viewer) {
		selectedKmlItemKey.value = item.key;
		const dataSource = kmlDataSourceMap.get(item.key);
		if (dataSource) {
			if (dataSource.show === false) dataSource.show = true;
			if (locate) {
				if (preservePitch) zoomToTargetPreservePitch(dataSource);
				else viewer.zoomTo(dataSource);
			}
		}
		activeTopTab.value = 'sy';
		setSelectedSyInfoKey(item.key);
		bumpSyInfoListVersion();
		return;
	}

	if (item.kind === 'cad' && viewer) {
		selectedCadItemKey.value = item.key;
		const dataSource = cadDataSourceMap.get(item.key);
		if (dataSource) {
			if (dataSource.show === false) dataSource.show = true;
			if (locate) {
				if (preservePitch) zoomToTargetPreservePitch(dataSource);
				else viewer.zoomTo(dataSource);
			}
		}
		activeTopTab.value = 'sy';
		setSelectedSyInfoKey(item.key);
		bumpSyInfoListVersion();
		return;
	}

	if (item.kind === 'terrain-model' && viewer) {
		selectedTerrainItemKey.value = `terrain-model:${item.url}`;
		const tileset = terrainTilesetMap.get(item.url);
		if (tileset) viewer.zoomTo(tileset);
		activeTopTab.value = 'sy';
		setSelectedSyInfoKey(item.key);
		bumpSyInfoListVersion();
	}
}

function deleteMeasureEntity(entity) {
	if (!entity) return;
	const viewer = getViewer();
	if (!viewer) return;
	if (currentMeasureEntity === entity) {
		setEntityHighlight(entity, false);
		currentMeasureEntity = null;
		currentMeasurePoints = [];
		measurePanelVisible.value = false;
	}
	if (entity._measureLabel) viewer.entities.remove(entity._measureLabel);
	if (entity._measurePoints) entity._measurePoints.forEach((point) => viewer.entities.remove(point));
	viewer.entities.remove(entity);
	bumpSyInfoListVersion();
}

function deleteTerrainModelItem(url, options = {}) {
	if (!url) return;
	const keepStorage = options?.keepStorage === true;
	const itemKey = `terrain-model:${url}`;
	if (selectedSyInfoKey === itemKey) {
		clearAllSySelection();
	}
	remove3DTileset(url);
	terrainTilesetMap.delete(url);
	terrainModelItems.value = terrainModelItems.value.filter((item) => item.url !== url);
	if (!keepStorage) syncTerrainInputStorage();
	updateTerrainActiveState();
	bumpSyInfoListVersion();
}

function deleteShpImportItem(key) {
	if (!key) return;
	const viewer = getViewer();
	const dataSource = shpDataSourceMap.get(key);
	const itemKey = `shp:${key}`;
	if (selectedSyInfoKey === itemKey) {
		clearAllSySelection();
	}
	if (viewer && dataSource) {
		try { viewer.dataSources.remove(dataSource, true); } catch { /* ignore */ }
	}
	shpDataSourceMap.delete(key);
	shpImportItems.value = shpImportItems.value.filter((item) => item.key !== key);
	bumpSyInfoListVersion();
}

function deleteKmlImportItem(key) {
	if (!key) return;
	const viewer = getViewer();
	const dataSource = kmlDataSourceMap.get(key);
	const itemKey = `kml:${key}`;
	if (selectedSyInfoKey === itemKey) {
		clearAllSySelection();
	}
	if (viewer && dataSource) {
		try { viewer.dataSources.remove(dataSource, true); } catch { /* ignore */ }
	}
	kmlDataSourceMap.delete(key);
	const objectUrl = kmlObjectUrlMap.get(key);
	if (objectUrl) {
		try { URL.revokeObjectURL(objectUrl); } catch { /* ignore */ }
	}
	kmlObjectUrlMap.delete(key);
	kmlImportItems.value = kmlImportItems.value.filter((item) => item.key !== key);
	bumpSyInfoListVersion();
}

function deleteCadImportItem(key) {
	if (!key) return;
	const viewer = getViewer();
	const dataSource = cadDataSourceMap.get(key);
	const itemKey = `cad:${key}`;
	if (selectedSyInfoKey === itemKey) {
		clearAllSySelection();
	}
	if (viewer && dataSource) {
		try { viewer.dataSources.remove(dataSource, true); } catch { /* ignore */ }
	}
	cadDataSourceMap.delete(key);
	cadImportItems.value = cadImportItems.value.filter((item) => item.key !== key);
	bumpSyInfoListVersion();
}

function deleteSyInfoItem(item) {
	if (!item) return;
	if (item.kind === 'measure') {
		deleteMeasureEntity(item.entity);
		return;
	}
	if (item.kind === 'markPoint') {
		deleteMarkPointEntity(item.entity);
		return;
	}
	if (item.kind === 'terrain-model') {
		deleteTerrainModelItem(item.url, { keepStorage: true });
		return;
	}
	if (item.kind === 'shp') {
		deleteShpImportItem(item.key);
		return;
	}
	if (item.kind === 'kml') {
		deleteKmlImportItem(item.key);
		return;
	}
	if (item.kind === 'cad') {
		deleteCadImportItem(item.key);
		return;
	}
	if (item.kind === 'terrain-network') {
		terrainNetworkVisible.value = false;
		if (selectedSyInfoKey === 'terrain-network') {
			clearAllSySelection();
		}
		disableTerrain();
		updateTerrainActiveState();
		bumpSyInfoListVersion();
	}
}

async function deleteCurrentMeasure() {
	if (measureForm.kind === 'markPoint' && selectedMarkPointEntityId.value) {
		const viewer = getViewer();
		const entity = viewer?.entities.getById(selectedMarkPointEntityId.value);
		if (entity?._syMarkPointData) deleteMarkPointEntity(entity);
		return;
	}
	if (currentMeasureEntity) {
		deleteMeasureEntity(currentMeasureEntity);
	}
}
async function clearAllMeasures() {
	resetDrawing();
	const viewer = getViewer();
	clearAllSySelection();
	[...viewer.entities.values].forEach(ent => {
		if (ent._measureData || ent._drawn || ent.name === 'measure-label') {
			if (ent._measureLabel) viewer.entities.remove(ent._measureLabel);
			if (ent._measurePoints) ent._measurePoints.forEach(p => viewer.entities.remove(p));
			viewer.entities.remove(ent);
		}
		if (ent._syMarkPointData) {
			viewer.entities.remove(ent);
		}
	});
	Object.assign(measureForm, { ...DEFAULT_MEASURE_FORM });
	[...shpImportItems.value].forEach((item) => deleteShpImportItem(item.key));
	[...kmlImportItems.value].forEach((item) => deleteKmlImportItem(item.key));
	[...cadImportItems.value].forEach((item) => deleteCadImportItem(item.key));
	bumpSyInfoListVersion();
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
.banben{
	position: absolute;
	top: 23px;
	left: 200px;
	font-size: 11px;
	font-style: italic;
	color: #a3a3a3;
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

.module-appear {
	animation: module-appear 360ms ease both;
}

@keyframes module-appear {
	from {
		opacity: 0;
		transform: translateY(10px);
	}
	to {
		opacity: 1;
		transform: translateY(0);
	}
}

.thumb-satellite { background-image: url('../assets/卫星图.png'); }
.thumb-vector { background-image: url('../assets/矢量图.png'); }
.thumb-road { background-image: url('../assets/注记图.png'); }

.shp-feature-panel {
	position: fixed;
	z-index: 9998;
	background: rgba(255, 255, 255, 0.98);
	border: 1px solid #e2e8f0;
	border-radius: 12px;
	box-shadow: 0 18px 40px rgba(15, 23, 42, 0.22);
	overflow: hidden;
	display: flex;
	flex-direction: column;
	backdrop-filter: blur(6px);
}

.shp-feature-header {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 12px;
	padding: 12px 14px;
	background: linear-gradient(90deg, #ff6a3d 0%, #ff855f 100%);
	color: #fff;
	cursor: move;
	user-select: none;
}

.shp-feature-header-main {
	min-width: 0;
}

.shp-feature-title {
	font-size: 15px;
	font-weight: 700;
	line-height: 1.4;
	white-space: nowrap;
	overflow: hidden;
	text-overflow: ellipsis;
}

.shp-feature-subtitle {
	margin-top: 2px;
	font-size: 12px;
	opacity: 0.88;
	white-space: nowrap;
	overflow: hidden;
	text-overflow: ellipsis;
}

.shp-feature-actions {
	display: flex;
	align-items: center;
	gap: 8px;
	flex-shrink: 0;
}

.shp-feature-action {
	width: 26px;
	height: 26px;
	border: 0;
	border-radius: 6px;
	background: rgba(255, 255, 255, 0.2);
	color: #fff;
	font-size: 16px;
	cursor: pointer;
	transition: background 0.2s ease;
}

.shp-feature-action:hover {
	background: rgba(255, 255, 255, 0.3);
}

.shp-feature-action.close:hover {
	background: rgba(220, 38, 38, 0.9);
}

.shp-feature-body {
	flex: 1;
	overflow: auto;
	padding: 14px;
	background: #fffaf8;
}

.shp-feature-section + .shp-feature-section {
	margin-top: 16px;
}

.shp-feature-section-title {
	margin-bottom: 10px;
	font-size: 13px;
	font-weight: 700;
	color: #c2410c;
}

.shp-feature-meta-item,
.shp-feature-property {
	display: grid;
	grid-template-columns: 88px minmax(0, 1fr);
	gap: 12px;
	padding: 9px 10px;
	border-radius: 8px;
	background: #fff;
	border: 1px solid #fde6de;
}

.shp-feature-meta-item + .shp-feature-meta-item,
.shp-feature-property + .shp-feature-property {
	margin-top: 8px;
}

.shp-feature-meta-key,
.shp-feature-property-key {
	font-size: 12px;
	font-weight: 700;
	color: #9a3412;
	word-break: break-all;
}

.shp-feature-meta-value,
.shp-feature-property-value {
	font-size: 12px;
	line-height: 1.6;
	color: #374151;
	word-break: break-all;
	white-space: pre-wrap;
}

.shp-feature-empty {
	padding: 18px 12px;
	border-radius: 8px;
	background: #fff;
	border: 1px dashed #fdba74;
	font-size: 12px;
	color: #92400e;
	text-align: center;
}

.shp-feature-float {
	position: fixed;
	width: 46px;
	height: 46px;
	display: flex;
	align-items: center;
	justify-content: center;
	background: linear-gradient(135deg, #ff6a3d 0%, #ff855f 100%);
	border: 1px solid rgba(255, 255, 255, 0.5);
	box-shadow: 0 14px 28px rgba(249, 115, 22, 0.35);
	backdrop-filter: blur(6px);
	cursor: grab;
	z-index: 9999;
	user-select: none;
	transition: left 0.22s ease, top 0.22s ease, width 0.22s ease, border-radius 0.22s ease;
}

.shp-feature-float.dragging {
	transition: none;
}

.shp-feature-float.snapped {
	width: 76px;
}

.shp-feature-float.left.snapped {
	border-radius: 0 999px 999px 0;
}

.shp-feature-float.right.snapped {
	border-radius: 999px 0 0 999px;
}

.shp-feature-float-icon {
	width: 26px;
	height: 26px;
	object-fit: contain;
}

.shp-info-panel-pop-enter-active,
.shp-info-panel-pop-leave-active {
	transition: opacity 0.22s ease, transform 0.22s ease;
}

.shp-info-panel-pop-enter-from,
.shp-info-panel-pop-leave-to {
	opacity: 0;
	transform: scale(0.98);
}

.shp-info-panel-pop-enter-to,
.shp-info-panel-pop-leave-from {
	opacity: 1;
	transform: scale(1);
}

.shp-info-float-pop-enter-active,
.shp-info-float-pop-leave-active {
	transition: opacity 0.18s ease, transform 0.18s ease;
}

.shp-info-float-pop-enter-from,
.shp-info-float-pop-leave-to {
	opacity: 0;
	transform: scale(0.9);
}

.shp-info-float-pop-enter-to,
.shp-info-float-pop-leave-from {
	opacity: 1;
	transform: scale(1);
}
</style>
