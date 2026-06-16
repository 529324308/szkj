import { reactive, ref } from 'vue';
import * as Cesium from 'cesium';

export function useLandPriceLayers({ getViewer, measurePanelVisible = null }) {
	const list = ref([]);
	const listItem = ref(0);
	const childItem = ref(0);
	const djcxGongneng = ref(true);
	const djcxActiveTab = ref('tab1');
	const djcxTab1 = reactive({
		zongdi: { checked: true },
		shichang: { items: { '商业出租': true, '商业买卖': true, '商业商品房': true, '住宅出租': true, '住宅买卖': true, '住宅商品房': true, '出让': true, '其它': true } },
		jiance: { items: { '商业': true, '住宅': true, '工业': true } },
		layers: { checked: true, items: { '村庄': { value: true, disabled: true }, '道路': { value: false, disabled: true }, '河流': { value: false, disabled: true } } },
	});
	const djcxTab2 = reactive({ expanded: { linan: false, towns: true }, towns: ['临安市区_住宅', '临安市区_商业', '临安市区_工业', '太湖源镇', '於潜镇', '横畈镇', '西天目中心集镇', '横路乡', '岛石镇', '大峡谷镇', '河桥镇', '湍口镇', '新桥乡', '太阳镇', '龙岗镇', '清凉峰镇', '昌化镇', '浪溪镇', '板桥乡', '高虹镇', '三口镇', '青山工业园区', '玲珑工业园区'] });
	const djcxTab3 = reactive({ id: '', town: '临安市区', sampleType: '其它', landUnit: '', landLocation: '', price: null, floorPrice: null, landLevel: null, streetDepth: null, streetWidth: null, landArea: null, buildArea: null, plotRatio: null, baseDate: '', buildNewness: null, houseType: '', houseStructure: '', usage: '其它', floors: null, floorLevel: null, remark: '' });
	const showInfoPanel = ref(false);
	const clickInfo = ref({ coordinates: null, properties: {}, feature: null });
	const djcxLoading = ref(false);

	const djcxNodeDataSources = new Map();
	const djcxHighlightedEntities = new Set();
	let djcxLoadingTimer = null;
	let djcxLoadingToken = 0;
	let djcxMultiSelectedKeys = [];

	const djcxNodeFillAlpha = 0.45;
	const djcxOutlineAlpha = 0.95;
	const djcxOutlineColor = Cesium.Color.WHITE.withAlpha(1);
	const djcxOutlineWidth = 1;
	const djcxOutlineHighlightColor = Cesium.Color.fromCssColorString('#45efff').withAlpha(1);
	const djcxOutlineHighlightWidth = 3;
	const djcxLabelMinAreaDeg2 = 1e-7;
	const djcxStyle = {
		fillBaseHueStart: 18,
		fillBaseHueEnd: 200,
		fillSat: 0.82,
		fillLight: 0.54,
	};

	function setGroupItems(groupKey, checked) {
		const group = djcxTab1[groupKey];
		if (!group || !group.items) return;
		Object.keys(group.items).forEach((key) => {
			if (typeof group.items[key] === 'object') {
				if (!group.items[key].disabled) group.items[key].value = checked;
			} else {
				group.items[key] = checked;
			}
		});
	}

	function toggleTab2Folder(key) {
		djcxTab2.expanded[key] = !djcxTab2.expanded[key];
	}

	function clearLoadingState() {
		if (djcxLoadingTimer) {
			clearTimeout(djcxLoadingTimer);
			djcxLoadingTimer = null;
		}
		djcxLoadingToken += 1;
		djcxLoading.value = false;
	}

	function closeInfoPanel() {
		showInfoPanel.value = false;
		clearLoadingState();
		if (measurePanelVisible) measurePanelVisible.value = false;
	}

	function resetTransientQueryState(viewer) {
		clearLoadingState();
		djcxMultiSelectedKeys = [];
		djcxClearHighlights();
		if (!viewer) return;
		const djcxQueries = [...viewer.entities.values].filter((entity) => entity && entity._djcxQuery);
		djcxQueries.forEach((entity) => viewer.entities.remove(entity));
	}

	function getMultiSelectedKeys() {
		return djcxMultiSelectedKeys;
	}

	function setMultiSelectedKeys(nextKeys) {
		djcxMultiSelectedKeys = Array.isArray(nextKeys) ? [...nextKeys] : [];
	}

	function djcxToRoman(num) {
		const value = Number(num);
		if (!Number.isFinite(value) || value <= 0) return '';
		const table = [
			['M', 1000], ['CM', 900], ['D', 500], ['CD', 400],
			['C', 100], ['XC', 90], ['L', 50], ['XL', 40],
			['X', 10], ['IX', 9], ['V', 5], ['IV', 4], ['I', 1],
		];
		let remain = Math.floor(value);
		let result = '';
		table.forEach(([roman, n]) => {
			while (remain >= n) {
				result += roman;
				remain -= n;
			}
		});
		return result;
	}

	function djcxParseChineseLevelNumber(value) {
		const raw = String(value ?? '').trim();
		if (!raw) return null;
		if (/^\d+$/.test(raw)) return Number(raw);
		const map = { 一: 1, 二: 2, 三: 3, 四: 4, 五: 5, 六: 6, 七: 7, 八: 8, 九: 9, 十: 10 };
		const normalized = raw.replace(/级|類|类|等/g, '');
		if (map[normalized] != null) return map[normalized];
		if (normalized.startsWith('十')) return 10 + (map[normalized[1]] || 0);
		const tenIndex = normalized.indexOf('十');
		if (tenIndex > 0) {
			const left = map[normalized[tenIndex - 1]] || 0;
			const right = map[normalized[tenIndex + 1]] || 0;
			return left * 10 + right;
		}
		return null;
	}

	function djcxResolveLevelRoman(props, fallbackOrder) {
		const raw = djcxGetProp(props, ['土地级别', 'TDJB', 'tdjb', '级别', 'LEVEL', 'level']);
		const parsed = djcxParseChineseLevelNumber(raw);
		return parsed ? djcxToRoman(parsed) : djcxToRoman(fallbackOrder);
	}

	function djcxColorForIndex(index, total) {
		const count = Math.max(1, Number(total) || 1);
		const ratio = count <= 1 ? 0 : (Math.max(1, Number(index) || 1) - 1) / (count - 1);
		const hue = djcxStyle.fillBaseHueStart + (djcxStyle.fillBaseHueEnd - djcxStyle.fillBaseHueStart) * ratio;
		return Cesium.Color.fromHsl(hue / 360, djcxStyle.fillSat, djcxStyle.fillLight);
	}

	// 根据土地级别返回对应颜色
	// 一级红色、二级黄色、三级绿色、四级蓝色、五级青色、六级紫色
	function djcxColorForLevel(level) {
		// 支持传入罗马数字、阿拉伯数字或中文数字
		let levelNum = null;
		if (typeof level === 'string') {
			const upper = level.toUpperCase().trim();
			// 解析罗马数字
			const romanToNum = { 'I': 1, 'II': 2, 'III': 3, 'IV': 4, 'V': 5, 'VI': 6 };
			if (romanToNum[upper]) {
				levelNum = romanToNum[upper];
			} else {
				// 解析阿拉伯数字或中文数字
				levelNum = djcxParseChineseLevelNumber(level);
			}
		} else if (typeof level === 'number') {
			levelNum = level;
		}
		if (!levelNum || levelNum < 1 || levelNum > 6) return null;
		const levelColors = {
			1: Cesium.Color.RED,       // 一级：红色
			2: Cesium.Color.YELLOW,   // 二级：黄色
			3: Cesium.Color.GREEN,    // 三级：绿色
			4: Cesium.Color.BLUE,     // 四级：蓝色
			5: Cesium.Color.CYAN,     // 五级：青色
			6: Cesium.Color.MAGENTA,  // 六级：紫色
		};
		return levelColors[levelNum];
	}

	// 根据罗马数字获取级别颜色
	function djcxColorForRoman(roman) {
		if (!roman) return null;
		return djcxColorForLevel(roman);
	}

	function djcxParseJsonObject(input) {
		if (typeof input !== 'string') return null;
		const text = input.trim();
		if (!text || (!text.startsWith('{') && !text.startsWith('['))) return null;
		try {
			return JSON.parse(text);
		} catch {
			return null;
		}
	}

	function djcxApplyEntityStyle(entity, highlight) {
		if (!entity) return;
		const fillColor = highlight
			? Cesium.Color.fromCssColorString('#45efff').withAlpha(djcxNodeFillAlpha)
			: entity._djcxBaseStyle?.FILL || Cesium.Color.WHITE.withAlpha(djcxNodeFillAlpha);
		const outlineColor = highlight ? djcxOutlineHighlightColor : (entity._djcxBaseStyle?.OUTLINE || djcxOutlineColor);
		const outlineWidth = highlight ? djcxOutlineHighlightWidth : djcxOutlineWidth;
		if (entity.polygon) {
			entity.polygon.material = fillColor;
			entity.polygon.outline = false;
		}
		if (entity.polyline) {
			entity.polyline.material = outlineColor.withAlpha(djcxOutlineAlpha);
			entity.polyline.width = outlineWidth;
		}
	}

	function djcxSetOutlineHighlightForEntity(entity, enabled) {
		if (!entity) return;
		for (const dataSource of djcxNodeDataSources.values()) {
			for (const candidate of dataSource.entities.values) {
				if (!candidate?._djcxFeatureOutline) continue;
				if (candidate._djcxForEntityId !== entity.id) continue;
				if (!candidate.polyline) continue;
				candidate.polyline.material = enabled ? djcxOutlineHighlightColor : djcxOutlineColor;
				candidate.polyline.width = enabled ? djcxOutlineHighlightWidth : djcxOutlineWidth;
			}
		}
	}

	function djcxClearHighlights() {
		djcxHighlightedEntities.forEach((entity) => {
			djcxApplyEntityStyle(entity, false);
			djcxSetOutlineHighlightForEntity(entity, false);
		});
		djcxHighlightedEntities.clear();
	}

	function djcxSetHighlights(entities) {
		djcxClearHighlights();
		(Array.isArray(entities) ? entities : []).forEach((entity) => {
			if (!entity) return;
			djcxHighlightedEntities.add(entity);
			djcxApplyEntityStyle(entity, true);
			djcxSetOutlineHighlightForEntity(entity, true);
		});
	}

	function djcxNormalizeRecordsToFeatureCollection(records) {
		const list = Array.isArray(records) ? records : [];
		return {
			type: 'FeatureCollection',
			features: list.map((record, index) => {
				const parsedGeo = djcxParseJsonObject(record?.geoJson || record?.geometry || record?.GEOMETRY);
				return {
					type: 'Feature',
					properties: { ...(record || {}), __djcxIndex: index + 1 },
					geometry: parsedGeo?.type ? parsedGeo : null,
				};
			}).filter((feature) => feature.geometry),
		};
	}

	function djcxRingSignedArea(ring) {
		if (!Array.isArray(ring) || ring.length < 3) return 0;
		let area = 0;
		for (let i = 0; i < ring.length - 1; i += 1) {
			const [x1, y1] = ring[i];
			const [x2, y2] = ring[i + 1];
			area += (x1 * y2) - (x2 * y1);
		}
		return area / 2;
	}

	function djcxRingBbox(ring) {
		if (!Array.isArray(ring) || !ring.length) return null;
		let minX = Infinity;
		let maxX = -Infinity;
		let minY = Infinity;
		let maxY = -Infinity;
		ring.forEach((point) => {
			if (!Array.isArray(point) || point.length < 2) return;
			minX = Math.min(minX, Number(point[0]));
			maxX = Math.max(maxX, Number(point[0]));
			minY = Math.min(minY, Number(point[1]));
			maxY = Math.max(maxY, Number(point[1]));
		});
		if (!Number.isFinite(minX) || !Number.isFinite(maxX) || !Number.isFinite(minY) || !Number.isFinite(maxY)) return null;
		return { minX, maxX, minY, maxY };
	}

	function djcxRingAreaCentroid(ring) {
		if (!Array.isArray(ring) || ring.length < 4) return null;
		let twiceArea = 0;
		let cx = 0;
		let cy = 0;
		for (let i = 0; i < ring.length - 1; i += 1) {
			const [x1, y1] = ring[i];
			const [x2, y2] = ring[i + 1];
			const cross = x1 * y2 - x2 * y1;
			twiceArea += cross;
			cx += (x1 + x2) * cross;
			cy += (y1 + y2) * cross;
		}
		if (Math.abs(twiceArea) < 1e-12) return null;
		return {
			longitude: cx / (3 * twiceArea),
			latitude: cy / (3 * twiceArea),
			height: 0,
		};
	}

	function djcxPointToSegmentDist2(point, a, b) {
		const px = point[0];
		const py = point[1];
		const ax = a[0];
		const ay = a[1];
		const bx = b[0];
		const by = b[1];
		const dx = bx - ax;
		const dy = by - ay;
		if (dx === 0 && dy === 0) return (px - ax) ** 2 + (py - ay) ** 2;
		const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy)));
		const cx = ax + t * dx;
		const cy = ay + t * dy;
		return (px - cx) ** 2 + (py - cy) ** 2;
	}

	function djcxMinDistToRing2(point, ring) {
		if (!Array.isArray(ring) || ring.length < 2) return Infinity;
		let minDist2 = Infinity;
		for (let i = 1; i < ring.length; i += 1) {
			minDist2 = Math.min(minDist2, djcxPointToSegmentDist2(point, ring[i - 1], ring[i]));
		}
		return minDist2;
	}

	function djcxPointInRing(point, ring) {
		let inside = false;
		for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
			const xi = ring[i][0];
			const yi = ring[i][1];
			const xj = ring[j][0];
			const yj = ring[j][1];
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
		for (let i = 1; i < coords.length; i += 1) {
			const hole = coords[i];
			if (Array.isArray(hole) && hole.length >= 3 && djcxPointInRing(point, hole)) return false;
		}
		return true;
	}

	function djcxPointInGeometry(point, geometry) {
		if (!geometry) return false;
		if (geometry.type === 'Polygon') return djcxPointInPolygon(point, geometry.coordinates);
		if (geometry.type === 'MultiPolygon') {
			const polygons = Array.isArray(geometry.coordinates) ? geometry.coordinates : [];
			return polygons.some((polygon) => djcxPointInPolygon(point, polygon));
		}
		return false;
	}

	function djcxPickLabelLonLatForPolygon(polygonCoords, avoidGeometries) {
		const outer = polygonCoords?.[0];
		if (!Array.isArray(outer) || outer.length < 4) return null;
		const bbox = djcxRingBbox(outer);
		if (!bbox) return null;
		const centroid = djcxRingAreaCentroid(outer);
		const avoidList = Array.isArray(avoidGeometries) ? avoidGeometries.filter(Boolean) : [];
		const candidates = [];
		if (centroid) candidates.push([centroid.longitude, centroid.latitude]);
		candidates.push(
			[(bbox.minX + bbox.maxX) / 2, (bbox.minY + bbox.maxY) / 2],
			[(bbox.minX * 3 + bbox.maxX) / 4, (bbox.minY + bbox.maxY) / 2],
			[(bbox.minX + bbox.maxX * 3) / 4, (bbox.minY + bbox.maxY) / 2],
			[(bbox.minX + bbox.maxX) / 2, (bbox.minY * 3 + bbox.maxY) / 4],
			[(bbox.minX + bbox.maxX) / 2, (bbox.minY + bbox.maxY * 3) / 4],
		);
		const ranked = candidates
			.filter((candidate, index, array) => array.findIndex((item) => item[0] === candidate[0] && item[1] === candidate[1]) === index)
			.map((candidate) => ({
				candidate,
				inside: djcxPointInPolygon(candidate, polygonCoords),
				dist2: djcxMinDistToRing2(candidate, outer),
				avoidHit: avoidList.some((geometry) => djcxPointInGeometry(candidate, geometry)),
			}))
			.filter((item) => item.inside)
			.sort((a, b) => Number(a.avoidHit) - Number(b.avoidHit) || b.dist2 - a.dist2);
		if (!ranked.length) return null;
		return {
			longitude: ranked[0].candidate[0],
			latitude: ranked[0].candidate[1],
			height: 0,
		};
	}

	function djcxPickLabelLonLat(entity, allEntities) {
		const centroid = djcxEntityCentroidLonLat(entity);
		if (centroid) return centroid;
		const entities = Array.isArray(allEntities) ? allEntities.filter(Boolean) : [];
		const index = entities.findIndex((item) => item === entity);
		if (index < 0) return null;
		const ring = entity?._djcxGeojsonGeometry?.coordinates?.[0];
		const bbox = djcxRingBbox(ring);
		if (!bbox) return null;
		const rows = Math.ceil(Math.sqrt(entities.length));
		const cols = Math.max(1, rows);
		const row = Math.floor(index / cols);
		const col = index % cols;
		return {
			longitude: bbox.minX + ((col + 0.5) / cols) * (bbox.maxX - bbox.minX),
			latitude: bbox.maxY - ((row + 0.5) / rows) * (bbox.maxY - bbox.minY),
			height: 0,
		};
	}

	async function djcxAddNodeFeatures(nodeId, records) {
		const viewer = getViewer();
		if (!viewer) return;
		djcxRemoveNodeFeatures(nodeId);
		const featureCollection = djcxNormalizeRecordsToFeatureCollection(records);
		if (!featureCollection.features.length) return;
		const dataSource = await Cesium.GeoJsonDataSource.load(featureCollection, { clampToGround: true });
		dataSource.name = `djcx-node-${String(nodeId)}`;
		await viewer.dataSources.add(dataSource);
		const now = Cesium.JulianDate.now();
		const baseEntities = [...dataSource.entities.values].filter((entity) => entity && (entity.polygon || entity.polyline));
		const total = (Array.isArray(records) && records.length) ? records.length : 1;

		for (const entity of baseEntities) {
			entity._djcxFeature = true;
			entity._djcxNodeId = String(nodeId);
			entity._djcxProperties = entity.properties ? entity.properties.getValue(now) : {};
			entity._djcxCentroid = null;
			entity._djcxGeojsonGeometry = null;
			const rawIndex = Number(entity._djcxProperties?.__djcxIndex);
			const featureGeometry = Number.isFinite(rawIndex) && rawIndex > 0 ? featureCollection.features?.[rawIndex - 1]?.geometry : null;
			if (featureGeometry && (featureGeometry.type === 'Polygon' || featureGeometry.type === 'MultiPolygon')) {
				entity._djcxGeojsonGeometry = featureGeometry;
			} else {
				const hierarchy = entity.polygon?.hierarchy?.getValue(now);
				const points = hierarchy?.positions || [];
				if (Array.isArray(points) && points.length >= 3) {
					const ring = points.map((point) => {
						const cartographic = Cesium.Cartographic.fromCartesian(point);
						return [Cesium.Math.toDegrees(cartographic.longitude), Cesium.Math.toDegrees(cartographic.latitude)];
					});
					const first = ring[0];
					const last = ring[ring.length - 1];
					if (first && last && (first[0] !== last[0] || first[1] !== last[1])) ring.push([...first]);
					entity._djcxGeojsonGeometry = { type: 'Polygon', coordinates: [ring] };
				}
			}

			const order = Number.isFinite(rawIndex) && rawIndex > 0 ? Math.min(total, Math.max(1, rawIndex)) : 1;
			entity._djcxOrder = order;
			entity._djcxRoman = djcxToRoman(order);
			entity._djcxLevelRoman = djcxResolveLevelRoman(entity._djcxProperties, order);

			// 根据土地级别获取颜色：优先使用已解析的罗马数字，其次尝试从属性获取
			const levelColor = djcxColorForRoman(entity._djcxLevelRoman) ||
				djcxColorForLevel(djcxGetProp(entity._djcxProperties, ['土地级别', 'TDJB', 'tdjb', '级别', 'LEVEL', 'level']));
			const baseColor = levelColor || djcxColorForIndex(order, total);

			entity._djcxBaseStyle = {
				FILL: baseColor.withAlpha(djcxNodeFillAlpha),
				OUTLINE: djcxOutlineColor,
			};
			djcxApplyEntityStyle(entity, false);

			if (entity.polygon) {
				const hierarchy = entity.polygon?.hierarchy?.getValue(now);
				const points = hierarchy?.positions || [];
				if (Array.isArray(points) && points.length >= 2) {
					const outlinePositions = points.slice();
					outlinePositions.push(points[0]);
					const outlineEntity = dataSource.entities.add({
						polyline: {
							positions: outlinePositions,
							clampToGround: true,
							width: djcxOutlineWidth,
							material: djcxOutlineColor,
							zIndex: 10,
							disableDepthTestDistance: Number.POSITIVE_INFINITY,
						},
					});
					outlineEntity._djcxFeatureOutline = true;
					outlineEntity._djcxNodeId = String(nodeId);
					outlineEntity._djcxForEntityId = entity.id;
				}
			}
		}

		const skipRomanLabel = ['26', '27'].includes(String(nodeId));
		if (skipRomanLabel) {
			djcxNodeDataSources.set(String(nodeId), dataSource);
			return;
		}

		for (const entity of baseEntities) {
			if (!entity?.polygon) continue;
			const geometry = entity?._djcxGeojsonGeometry;
			const polygons = geometry?.type === 'Polygon' ? [geometry.coordinates] : (geometry?.type === 'MultiPolygon' ? geometry.coordinates : []);
			if (!Array.isArray(polygons) || !polygons.length) continue;

			const avoidGeometries = baseEntities
				.filter((candidate) => candidate && candidate !== entity && String(candidate?._djcxOrder) !== String(entity?._djcxOrder))
				.map((candidate) => candidate?._djcxGeojsonGeometry)
				.filter(Boolean);

			for (let i = 0; i < polygons.length; i += 1) {
				const polygonCoords = polygons[i];
				const areaDeg2 = Math.abs(djcxRingSignedArea(polygonCoords?.[0] || []));
				if (!Number.isFinite(areaDeg2) || areaDeg2 < djcxLabelMinAreaDeg2) continue;
				const labelPos = djcxPickLabelLonLatForPolygon(polygonCoords, avoidGeometries) || djcxPickLabelLonLat(entity, baseEntities);
				if (!labelPos) continue;
				const labelEntity = dataSource.entities.add({
					position: Cesium.Cartesian3.fromDegrees(labelPos.longitude, labelPos.latitude, 0),
					label: {
						text: entity._djcxLevelRoman || entity._djcxRoman || '',
						font: 'bold 18px Microsoft YaHei',
						fillColor: Cesium.Color.WHITE,
						outlineColor: Cesium.Color.BLACK,
						outlineWidth: 2,
						style: Cesium.LabelStyle.FILL_AND_OUTLINE,
						disableDepthTestDistance: Number.POSITIVE_INFINITY,
						showBackground: false,
						pixelOffset: new Cesium.Cartesian2(0, -10),
						heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
					},
				});
				labelEntity._djcxFeatureLabel = true;
				labelEntity._djcxNodeId = String(nodeId);
				labelEntity._djcxForEntityId = entity.id;
				labelEntity._djcxForPolygonIndex = i;
			}
		}
		djcxNodeDataSources.set(String(nodeId), dataSource);
	}

	function djcxRemoveNodeFeatures(nodeId) {
		const viewer = getViewer();
		if (!viewer) return;
		djcxClearHighlights();
		const key = String(nodeId);
		const dataSource = djcxNodeDataSources.get(key);
		if (!dataSource) return;
		try {
			viewer.dataSources.remove(dataSource, true);
		} catch {
			// ignore
		}
		djcxNodeDataSources.delete(key);
		if (Array.isArray(djcxMultiSelectedKeys) && djcxMultiSelectedKeys.length) {
			const all = djcxGetAllFeatureEntities();
			const removedKeys = new Set(all.filter((entity) => String(entity?._djcxNodeId) === key).map(djcxFeatureKey));
			djcxMultiSelectedKeys = djcxMultiSelectedKeys.filter((item) => !removedKeys.has(String(item)));
		}
	}

	function djcxEntityCentroidLonLat(entity) {
		if (entity?._djcxCentroid) return entity._djcxCentroid;
		const geometry = entity?._djcxGeojsonGeometry;
		const coords = geometry?.type === 'Polygon' ? geometry.coordinates?.[0] : (geometry?.type === 'MultiPolygon' ? geometry.coordinates?.[0]?.[0] : null);
		if (!Array.isArray(coords) || !coords.length) return null;
		let sumLon = 0;
		let sumLat = 0;
		let count = 0;
		for (const point of coords) {
			if (!Array.isArray(point) || point.length < 2) continue;
			sumLon += Number(point[0]);
			sumLat += Number(point[1]);
			count += 1;
		}
		if (!count) return null;
		entity._djcxCentroid = { longitude: sumLon / count, latitude: sumLat / count, height: 0 };
		return entity._djcxCentroid;
	}

	function djcxGetAllFeatureEntities() {
		const entities = [];
		for (const dataSource of djcxNodeDataSources.values()) {
			for (const entity of dataSource.entities.values) {
				if (entity?._djcxFeature && !entity?._djcxFeatureLabel) entities.push(entity);
			}
		}
		return entities;
	}

	function djcxFeatureKey(entity) {
		const props = entity?._djcxProperties || {};
		const key = props.id ?? props.fid ?? props.DKBH ?? props.OBJECTID ?? entity?.id;
		return String(key ?? '');
	}

	function djcxGroupEntitiesByFeatureKey(entities) {
		const list = Array.isArray(entities) ? entities.filter(Boolean) : [];
		const map = new Map();
		list.forEach((entity) => {
			const key = djcxFeatureKey(entity);
			if (!key) return;
			const current = map.get(key);
			if (current) current.entities.push(entity);
			else map.set(key, { key, entities: [entity], rep: entity });
		});
		return map;
	}

	function djcxGetProp(props, keys) {
		const source = props && typeof props === 'object' ? props : {};
		const lower = {};
		Object.keys(source).forEach((key) => {
			if (typeof key !== 'string') return;
			lower[key.toLowerCase()] = source[key];
		});
		const list = Array.isArray(keys) ? keys : [keys];
		for (const key of list) {
			if (key == null) continue;
			if (typeof key === 'string') {
				if (source[key] != null && source[key] !== '') return source[key];
				const value = lower[key.toLowerCase()];
				if (value != null && value !== '') return value;
			}
		}
		return undefined;
	}

	function djcxFormatPercent(value) {
		if (value == null || value === '') return value;
		if (typeof value === 'string') {
			const text = value.trim();
			if (!text) return value;
			if (text.includes('%')) return text;
			const number = Number(text);
			if (!Number.isFinite(number)) return text;
			if (number <= 1) return `${(number * 100).toFixed(0)}%`;
			if (number <= 100) return `${number}%`;
			return text;
		}
		const number = Number(value);
		if (!Number.isFinite(number)) return value;
		if (number <= 1) return `${(number * 100).toFixed(0)}%`;
		if (number <= 100) return `${number}%`;
		return value;
	}

	function djcxFormatYears(value) {
		if (value == null || value === '') return value;
		if (typeof value === 'string') {
			const text = value.trim();
			if (!text) return value;
			return text.includes('年') ? text : `${text}年`;
		}
		const number = Number(value);
		if (!Number.isFinite(number)) return value;
		return `${number}年`;
	}

	function djcxFormatDate(value) {
		if (value == null || value === '') return value;
		if (typeof value === 'string') {
			const text = value.trim();
			if (!text) return value;
			if (/^\d{4}-\d{1,2}-\d{1,2}$/.test(text)) return text;
			const match = text.match(/^(\d{4}-\d{2}-\d{2})/);
			if (match) return match[1];
			const date = new Date(text);
			if (!Number.isNaN(date.getTime())) return date.toISOString().slice(0, 10);
			return text;
		}
		const date = new Date(value);
		if (!Number.isNaN(date.getTime())) return date.toISOString().slice(0, 10);
		return value;
	}

	function djcxBuildQueryResultProperties(entity, matchCount) {
		const props = entity?._djcxProperties || {};
		const out = {};
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
				{ label: '估价期日', keys: ['估价期日', 'GJQR', 'gjqr', 'GJQD', 'gjqd', 'DATE', 'date', '估价日期'] },
			];

		let hit = false;
		for (const field of fields) {
			let value = djcxGetProp(props, field.keys);
			if (value == null || value === '') continue;
			if (field.label === '建筑密度') value = djcxFormatPercent(value);
			if (field.label === '土地使用年限' || field.label === '出让年限') value = djcxFormatYears(value);
			if (field.label === '用地批准时间' || field.label === '合同取得日期' || field.label === '评估时间' || field.label === '估价期日') {
				value = djcxFormatDate(value);
			}
			out[field.label] = value;
			hit = true;
		}

		if (matchCount != null) out.匹配数量 = matchCount;
		if (hit || matchCount != null) return out;
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
		if (measurePanelVisible) measurePanelVisible.value = false;
	}

	function djcxShowFeaturesInTable(entities, options = {}) {
		const list = Array.isArray(entities) ? entities.filter(Boolean) : [];
		if (!list.length) return;
		const items = list.map((entity) => ({ entity, props: djcxBuildQueryResultProperties(entity) || {} }));
		const rawNames = items.map((item, index) => {
			const props = item.props || {};
			return String(props.地块编号 || props.项目名称 || `要素${index + 1}`);
		});
		const nameCount = new Map();
		const colNames = rawNames.map((name) => {
			const key = String(name || '要素');
			const count = (nameCount.get(key) || 0) + 1;
			nameCount.set(key, count);
			return count === 1 ? key : `${key}-${count}`;
		});

		const fieldKeys = [];
		const seenKeys = new Set();
		items.forEach((item) => {
			const props = item.props || {};
			Object.keys(props).forEach((key) => {
				if (!key || key === '匹配数量' || seenKeys.has(key)) return;
				seenKeys.add(key);
				fieldKeys.push(key);
			});
		});

		const cols = ['字段', ...colNames];
		const rows = fieldKeys.map((key) => {
			const row = { 字段: key };
			items.forEach((item, index) => {
				row[colNames[index]] = item.props?.[key];
			});
			return row;
		});
		const withLoading = options?.withLoading !== false;
		if (!withLoading) {
			clearLoadingState();
			clickInfo.value = {
				coordinates: null,
				properties: {},
				table: { columns: cols, rows },
				feature: null,
			};
			showInfoPanel.value = true;
			if (measurePanelVisible) measurePanelVisible.value = false;
			return;
		}

		clearLoadingState();
		const token = djcxLoadingToken;
		showInfoPanel.value = false;
		djcxLoading.value = true;
		if (measurePanelVisible) measurePanelVisible.value = false;
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
		const point = [lon, lat];
		const result = [];
		const entities = djcxGetAllFeatureEntities();
		for (const entity of entities) {
			const geometry = entity?._djcxGeojsonGeometry;
			if (!geometry) continue;
			if (geometry.type === 'Polygon') {
				if (djcxPointInPolygon(point, geometry.coordinates)) result.push(entity);
			} else if (geometry.type === 'MultiPolygon') {
				const polygons = Array.isArray(geometry.coordinates) ? geometry.coordinates : [];
				if (polygons.some((polygon) => djcxPointInPolygon(point, polygon))) result.push(entity);
			}
		}
		return result;
	}

	function djcxQueryRect(lonMin, latMin, lonMax, latMax) {
		const entities = djcxGetAllFeatureEntities();
		return entities.filter((entity) => {
			const centroid = djcxEntityCentroidLonLat(entity);
			if (!centroid) return false;
			return centroid.longitude >= lonMin && centroid.longitude <= lonMax && centroid.latitude >= latMin && centroid.latitude <= latMax;
		});
	}

	function djcxQueryCircle(centerLon, centerLat, radiusMeters) {
		const center = Cesium.Cartographic.fromDegrees(centerLon, centerLat);
		const entities = djcxGetAllFeatureEntities();
		return entities.filter((entity) => {
			const centroid = djcxEntityCentroidLonLat(entity);
			if (!centroid) return false;
			const current = Cesium.Cartographic.fromDegrees(centroid.longitude, centroid.latitude);
			const dist = new Cesium.EllipsoidGeodesic(center, current).surfaceDistance;
			return dist <= radiusMeters;
		});
	}

	function djcxQueryPolygon(queryRingLonLat) {
		const ring = Array.isArray(queryRingLonLat) ? queryRingLonLat : [];
		if (ring.length < 3) return [];
		const coords = [ring];
		const entities = djcxGetAllFeatureEntities();
		return entities.filter((entity) => {
			const centroid = djcxEntityCentroidLonLat(entity);
			if (!centroid) return false;
			return djcxPointInPolygon([centroid.longitude, centroid.latitude], coords);
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

	return {
		list,
		listItem,
		childItem,
		djcxGongneng,
		djcxActiveTab,
		djcxTab1,
		djcxTab2,
		djcxTab3,
		showInfoPanel,
		clickInfo,
		djcxLoading,
		djcxNodeDataSources,
		setGroupItems,
		toggleTab2Folder,
		closeInfoPanel,
		resetTransientQueryState,
		getMultiSelectedKeys,
		setMultiSelectedKeys,
		djcxAddNodeFeatures,
		djcxRemoveNodeFeatures,
		djcxClearHighlights,
		djcxSetHighlights,
		djcxGroupEntitiesByFeatureKey,
		djcxFeatureKey,
		djcxGetAllFeatureEntities,
		djcxEntityCentroidLonLat,
		djcxBuildQueryResultProperties,
		djcxShowFeatureInPanel,
		djcxShowFeaturesInTable,
		djcxQueryPoint,
		djcxQueryRect,
		djcxQueryCircle,
		djcxQueryPolygon,
		onDjcxNodeFeaturesChange,
	};
}
