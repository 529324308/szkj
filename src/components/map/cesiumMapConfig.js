export const TERRAIN_INPUT_STORAGE_KEY = 'terrainInputUrl';
export const TERRAIN_NAME_STORAGE_KEY = 'terrainInputName';
export const MESSAGE_OFFSET_TOP = 200;

export const topTabs = [
	{ key: 'home', label: '首页' },
	{ key: 'sy', label: '数治测绘' },
	{ key: 'djcx', label: '数治地价' },
	{ key: 'znfx', label: '智能分析' },
	{ key: 'sjgl', label: '数据管理' },
	{ key: 'grzx', label: '管理中心' },
];

export const DEFAULT_MEASURE_FORM = {
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
	kind: '',
};

export function createCesiumMapIcons(importMetaUrl) {
	return {
		markPoint: new URL('../../assets/标点.png', importMetaUrl).href,
		drawLine: new URL('../../assets/画线.png', importMetaUrl).href,
		drawPolygon: new URL('../../assets/画多边形.png', importMetaUrl).href,
		drawCircle: new URL('../../assets/画圆.png', importMetaUrl).href,
		drawRect: new URL('../../assets/画矩形.png', importMetaUrl).href,
		measureDistance: new URL('../../assets/测距.png', importMetaUrl).href,
		measureArea: new URL('../../assets/测面积.png', importMetaUrl).href,
		measureVolume: new URL('../../assets/测方量.png', importMetaUrl).href,
		measureAzimuth: new URL('../../assets/测方位角.png', importMetaUrl).href,
		measureAngle: new URL('../../assets/测夹角.png', importMetaUrl).href,
		measure: new URL('../../assets/九宫格.png', importMetaUrl).href,
		clear: new URL('../../assets/垃圾桶.png', importMetaUrl).href,
		gongneng: new URL('../../assets/九宫格.png', importMetaUrl).href,
		dianxuan: new URL('../../assets/点选.png', importMetaUrl).href,
		dianPolygon: new URL('../../assets/点击选多边形.png', importMetaUrl).href,
		dianCircle: new URL('../../assets/点击选圆.png', importMetaUrl).href,
		dianRect: new URL('../../assets/点击选矩形.png', importMetaUrl).href,
		currentLocation: new URL('../../assets/当前位置.png', importMetaUrl).href,
		ai: new URL('../../assets/AI机器人1.png', importMetaUrl).href,
		me: new URL('../../assets/我的.png', importMetaUrl).href,
		maximize: new URL('../../assets/放大.png', importMetaUrl).href,
		minimize: new URL('../../assets/缩小.png', importMetaUrl).href,
		close: new URL('../../assets/关闭.png', importMetaUrl).href,
		duodian: new URL('../../assets/光标+.png', importMetaUrl).href,
		dixing: new URL('../../assets/地形.png', importMetaUrl).href,
		tuceng: new URL('../../assets/图层管理.png', importMetaUrl).href,
		shangchuan: new URL('../../assets/上传云端.png', importMetaUrl).href,
		daoru: new URL('../../assets/导入本地.png', importMetaUrl).href,
		shp: new URL('../../assets/shp.png', importMetaUrl).href,
		kml: new URL('../../assets/_KML.png', importMetaUrl).href,
		cad: new URL('../../assets/CAD.png', importMetaUrl).href,
		add: new URL('../../assets/AI机器人1.png', importMetaUrl).href,
		chat: new URL('../../assets/AI机器人1.png', importMetaUrl).href,
		delete: new URL('../../assets/垃圾桶.png', importMetaUrl).href,
		menu: new URL('../../assets/九宫格.png', importMetaUrl).href,
		sidebarOpen: new URL('../../assets/打开边栏.png', importMetaUrl).href,
		sidebarClose: new URL('../../assets/关闭边栏.png', importMetaUrl).href,
		newChat: new URL('../../assets/发起新对话.png', importMetaUrl).href,
		searchChat: new URL('../../assets/搜索对话内容.png', importMetaUrl).href,
	};
}

function normalizeTerrainUrl(url) {
	return String(url || '').trim();
}

export function parseTerrainUrls(input) {
	return String(input || '')
		.split(/[;；\n]/)
		.map(normalizeTerrainUrl)
		.filter(Boolean);
}

export function parseTerrainNames(input) {
	return String(input || '')
		.split(/[;；\n]/)
		.map((name) => String(name || '').trim());
}

export function hasMultipleTerrainLinksWithoutSeparator(input) {
	const text = String(input || '').trim();
	if (!text || /[;；\n]/.test(text)) return false;
	const protocolCount = (text.match(/https?:\/\//gi) || []).length;
	return protocolCount > 1;
}

export function getDuplicateTerrainUrls(urls) {
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

export function getDefaultTerrainName(index) {
	return `地形模型-${index + 1}`;
}

export function resolveTerrainName({ customName, index, existingName }) {
	const name = String(customName || '').trim();
	if (name) return name;
	if (String(existingName || '').trim()) return existingName;
	return getDefaultTerrainName(index);
}
