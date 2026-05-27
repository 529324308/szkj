/*
 * @Author: 喜闻乐见 529324308@qq.com
 * @Date: 2024-12-16 11:42:34
 * @LastEditors: 喜闻乐见 529324308@qq.com
 * @LastEditTime: 2026-05-25 11:08:21
 * @FilePath: /donglicun/src/composables/useCesium.js
 * @Description: 这是默认设置,请设置`customMade`, 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
 */
import * as Cesium from 'cesium';
import Tdt3dPlug from 'tdt-terrain-cesium-plugin';

export function useCesium(containerId) {
	let viewer = null;

	Cesium.Ion.defaultAccessToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiIwYTFjN2Y4Mi00ODRlLTQ0ZTQtYTgyOC05OTQ0ZmE2NTg1ZGQiLCJpZCI6MzM1MDUsImlhdCI6MTczNDMzMzQ0NX0.VljS3bQxdRzPM_XUcKsIbEx6B-xTpACL9Z2bWNKpMjc';

	let vecLayer;
	let cvaLayer;
	// 保存 addImageryProvider 返回的 ImageryLayer 引用，便于移除
	let vecImageryLayer = null;
	let cvaImageryLayer = null;

	function createFallbackTerrainData(provider, x, y, level) {
		const width = provider?._width || 64;
		const height = provider?._height || 64;
		const buffer = typeof provider?._getVHeightBuffer === 'function'
			? provider._getVHeightBuffer()
			: new Uint8Array(width * height * 4);
		const childTileMask = typeof provider?._getChildTileMask === 'function'
			? provider._getChildTileMask(x, y, level)
			: 0;

		return new Cesium.HeightmapTerrainData({
			buffer,
			width,
			height,
			childTileMask,
			structure: provider?._terrainDataStructure,
		});
	}

	function wrapTdtTerrainProvider(provider) {
		if (!provider || typeof provider.requestTileGeometry !== 'function') return provider;

		const originalRequestTileGeometry = provider.requestTileGeometry.bind(provider);
		provider.requestTileGeometry = function(x, y, level, request) {
			const result = originalRequestTileGeometry(x, y, level, request);
			if (!result || typeof result.then !== 'function') return result;

			return result.catch((error) => {
				const message = typeof error === 'string' ? error : error?.message || '';
				if (message.includes('无效数据')) {
					return createFallbackTerrainData(provider, x, y, level);
				}
				throw error;
			});
		};

		return provider;
	}

	function createTdtTerrainProvider(tdtUrl, subdomains, token) {
		if (!Tdt3dPlug?.GeoTerrainProvider) {
			console.warn('未检测到天地图地形插件 GeoTerrainProvider，已回退为椭球地形');
			return new Cesium.EllipsoidTerrainProvider();
		}

		try {
			const provider = new Tdt3dPlug.GeoTerrainProvider({
				url: `${tdtUrl}mapservice/swdx?T=elv_c&x={x}&y={y}&l={z}&tk={token}`,
				subdomains,
				token,
			});
			return wrapTdtTerrainProvider(provider);
		} catch (error) {
			console.error('初始化天地图地形服务失败，已回退为椭球地形:', error);
			return new Cesium.EllipsoidTerrainProvider();
		}
	}

	// 初始化 Cesium Viewer
	function initCesium() {
		viewer = new Cesium.Viewer(containerId, {
			animation:false, //是否打开创建动画小控件，即左下角的仪表
			baseLayerPicker:false,//是否显示图层选择器
			fullscreenButton:false,//是否显示全屏按钮
			geocoder:false,//是否显示Geocoder(右上角的查询按钮)
			homeButton:false,//是否显示Home按钮
			infoBox: false,//是否显示信息框
			sceneModePicker:false,//是否显示三维地球/二维地图选择器
			selectionIndicator:false,//是否显示选取指示器
			timeline: false, //是否关闭时间线
			navigationHelpButton: false, // 帮助提示
		});
		// 隐藏版权信息
		viewer._cesiumWidget._creditContainer.style.display = 'none';
		// 调整地图对比度
		const imageryLayer = viewer.imageryLayers.get(0); // 获取第一个图层
		// imageryLayer.brightness = 0.3; // 设置亮度，值越小颜色越暗

		// 1. 初始化 Viewer 并指定默认地形
		setTimeout(() => {
			viewer.camera.flyTo({
				destination: Cesium.Cartesian3.fromDegrees(119.48, 28.4585, 10000),
				orientation: {
					heading: Cesium.Math.toRadians(0),
					pitch: Cesium.Math.toRadians(-90),
					roll: 0.0
				}
			});
		}, 500);

		// 如果配置了天地图token（矢量标注）
		const tiandituToken = '96746f26024715426c81adb75118da38';
		// 服务域名
    	var tdtUrl = 'https://t{s}.tianditu.gov.cn/';
		// 服务负载子域
		var subdomains=['0','1','2','3','4','5','6','7'];

		// 矢量底图（路网）
		vecLayer = new Cesium.WebMapTileServiceImageryProvider({
		    url: 'http://t0.tianditu.gov.cn/vec_w/wmts?tk=' + tiandituToken,
		    layer: 'vec',
		    style: 'default',
		    format: 'tiles',
		    tileMatrixSetID: 'w',
		    maximumLevel: 18
		});

		// 矢量注记（中文标注）
		cvaLayer = new Cesium.WebMapTileServiceImageryProvider({
			url: 'http://t0.tianditu.gov.cn/cva_w/wmts?tk=' + tiandituToken,
			layer: 'cva',
			style: 'default',
			format: 'tiles',
			tileMatrixSetID: 'w',
			maximumLevel: 18
		});

		// 天地图地形依赖外部插件的 GeoTerrainProvider，不是 Cesium 原生 API
		viewer.terrainProvider = createTdtTerrainProvider(tdtUrl, subdomains, tiandituToken);

		// viewer.extend(Cesium.viewerCesiumInspectorMixin);
		
		return viewer;
	}

	// 添加矢量底图
	function addVecLayer(){
		if (!viewer) return;
		if (!vecImageryLayer) {
			vecImageryLayer = viewer.imageryLayers.addImageryProvider(vecLayer);
		}
	}
	// 添加矢量注记
	function addCvaLayer(){
		if (!viewer) return;
		if (!cvaImageryLayer) {
			cvaImageryLayer = viewer.imageryLayers.addImageryProvider(cvaLayer);
		}
	}

	// 删除矢量底图
	function removeVecLayer(){
		if (!viewer) return;
		if (vecImageryLayer) {
			viewer.imageryLayers.remove(vecImageryLayer, true);
			vecImageryLayer = null;
		}
	}
	// 删除矢量注记
	function removeCvaLayer(){
		if (!viewer) return;
		if (cvaImageryLayer) {
			viewer.imageryLayers.remove(cvaImageryLayer, true);
			cvaImageryLayer = null;
		}
	}



	// 暴露 viewer 实例用于组件内绘制与测量
	function getViewer() {
		return viewer;
	}

	// 销毁 Cesium Viewer
	function destroyCesium() {
		if (viewer) {
			viewer.destroy();
		}
	}


	let currentTilesetList = {};

	// 添加三维倾斜模型
	async function add3DTileset(url, options = {}) {
		if (!viewer) {
			console.error('Viewer未初始化');
			return null;
		}
		if (currentTilesetList[url]) {
			console.error('模型已存在');
			return null;
		}

		try {
			let tileset = await Cesium.Cesium3DTileset.fromUrl(url, {
				loadSiblings: true,
			});
			viewer.scene.primitives.add(tileset);

			// 设置样式（颜色和透明度）
			if (options.color || options.alpha !== undefined) {
				tileset.style = new Cesium.Cesium3DTileStyle({
					color: {
						conditions: [
							["${file} === '农用地级别'", `color('red' ,${options.alpha !== undefined ? options.alpha : 1.0})`],
							["${file} === '集体工业级别'", `color('blue',${options.alpha !== undefined ? options.alpha : 1.0})`],
							['true', `color('${options.color || 'white'}', ${options.alpha !== undefined ? options.alpha : 1.0})`]
						]
					}
				});
			}

			// 定位到模型
			viewer.zoomTo(
				tileset,
				new Cesium.HeadingPitchRange(
					0.0,
					-0.8,
					tileset.boundingSphere.radius * 2.5 // 模型的包围球半径的2倍
				)
			)
			// 存储模型对象
			currentTilesetList[url] = tileset;
			return tileset; // 返回模型对象
		} catch (error) {
			console.error('加载3D Tileset失败:', error);
			return null;
		}
	}
	// 移除三维倾斜模型
	function remove3DTileset(url) {
		if (!viewer) {
			console.error('Viewer未初始化');
			return;
		}

		if (url) {
			viewer.scene.primitives.remove(currentTilesetList[url]);
			// 从当前模型列表中移除
			delete currentTilesetList[url];
		}
	}

	// 设置3D Tileset样式
	function set3DTilesetStyle(tileset, options = {}) {
		if (!tileset) {
			console.error('Tileset对象不存在');
			return;
		}

		tileset.style = new Cesium.Cesium3DTileStyle({
			color: {
				conditions: [
					['true', `color('${options.color || 'white'}', ${options.alpha !== undefined ? options.alpha : 1.0})`]
				]
			}
		});
	}

	let selectedFeature;
	let selectedFeatureColor;

	// 添加点击事件监听器
	function addClickHandler(callback, options = {}) {
		if (!viewer) {
			console.error('Viewer未初始化');
			return;
		}

		viewer.cesiumWidget.screenSpaceEventHandler.setInputAction(function(event) {
			const pickedObject = viewer.scene.pick(event.position);

			if (Cesium.defined(pickedObject)) {
				// 获取点击位置的世界坐标
				const cartesian = viewer.camera.pickEllipsoid(event.position, viewer.scene.globe.ellipsoid);
				let coordinates = null;
				if (cartesian) {
					const cartographic = Cesium.Cartographic.fromCartesian(cartesian);
					coordinates = {
						longitude: Cesium.Math.toDegrees(cartographic.longitude),
						latitude: Cesium.Math.toDegrees(cartographic.latitude),
						height: cartographic.height
					};
				}

				// 实体（Entity）点击
				if (pickedObject.id) {
					const payload = {
						type: 'entity',
						entity: pickedObject.id,
						coordinates,
						pickedObject
					};
					const shouldHandle = typeof options?.shouldHandle === 'function' ? options.shouldHandle(payload) !== false : true;
					if (!shouldHandle) return;

					if (selectedFeature) {
						try {
							if (selectedFeatureColor) {
								selectedFeature.color = selectedFeatureColor;
							}
						} catch (error) {
							console.warn('恢复高亮颜色失败:', error);
						}
						selectedFeature = null;
						selectedFeatureColor = null;
					}

					try {
						if (pickedObject.color !== undefined) {
							selectedFeature = pickedObject;
							selectedFeatureColor = pickedObject.color.clone();
							pickedObject.color = Cesium.Color.fromCssColorString('rgba(1, 1, 1, 0.76)');
						}
					} catch (error) {
						console.warn('设置高亮颜色失败:', error);
					}

					if (callback && typeof callback === 'function') {
						callback(payload);
					}
					return;
				}

				// 3D Tileset 点击
				if (pickedObject.primitive instanceof Cesium.Cesium3DTileset) {
					const shouldHandle = typeof options?.shouldHandle === 'function'
						? options.shouldHandle({ type: 'tileset', coordinates, pickedObject }) !== false
						: true;
					if (!shouldHandle) return;

					if (selectedFeature) {
						try {
							if (selectedFeatureColor) {
								selectedFeature.color = selectedFeatureColor;
							}
						} catch (error) {
							console.warn('恢复高亮颜色失败:', error);
						}
						selectedFeature = null;
						selectedFeatureColor = null;
					}

					try {
						if (pickedObject.color !== undefined) {
							selectedFeature = pickedObject;
							selectedFeatureColor = pickedObject.color.clone();
							pickedObject.color = Cesium.Color.fromCssColorString('rgba(1, 1, 1, 0.76)');
						}
					} catch (error) {
						console.warn('设置高亮颜色失败:', error);
					}

					const feature = pickedObject.detail;
					
					// 获取要素的属性信息
					const properties = {};
					
					// 检测并解析JSON格式数据的方法
					function parseJsonValue(value) {
						if (typeof value === 'string') {
							// 检查字符串是否看起来像JSON格式
							const trimmedValue = value.trim();
							if ((trimmedValue.startsWith('{') && trimmedValue.endsWith('}')) || 
								(trimmedValue.startsWith('[') && trimmedValue.endsWith(']'))) {
								try {
									return JSON.parse(trimmedValue);
								} catch (error) {
									// 如果解析失败，返回null，表示不是有效的JSON
									return null;
								}
							}
						}
						return null;
					}
					
					if (Object.keys(properties).length === 0 && pickedObject.getPropertyIds) {
						const propertyIds = pickedObject.getPropertyIds();
						propertyIds.forEach(propertyName => {
							const value = pickedObject.getProperty(propertyName);
							
							// 检查是否为JSON格式数据
							const parsedJsonData = parseJsonValue(value);
							if (parsedJsonData && typeof parsedJsonData === 'object') {
								// 如果是JSON格式，展开其中的属性
								console.log('检测到JSON格式数据，属性名: ' + propertyName);
								Object.keys(parsedJsonData).forEach(key => {
									properties[key] = parsedJsonData[key];
								});
							} else {
								properties[propertyName] = value;
							}
						});
					}
					
					// 调用回调函数，传递点击信息
					if (callback && typeof callback === 'function') {
						callback({
							type: 'tileset',
							feature: feature,
							properties: properties,
							coordinates: coordinates,
							pickedObject: pickedObject
						});
					}
					return;
				}

				const shouldHandle = typeof options?.shouldHandle === 'function'
					? options.shouldHandle({ type: 'unknown', coordinates, pickedObject }) !== false
					: true;
				if (!shouldHandle) return;

				if (selectedFeature) {
					try {
						if (selectedFeatureColor) {
							selectedFeature.color = selectedFeatureColor;
						}
					} catch (error) {
						console.warn('恢复高亮颜色失败:', error);
					}
					selectedFeature = null;
					selectedFeatureColor = null;
				}

				try {
					if (pickedObject.color !== undefined) {
						selectedFeature = pickedObject;
						selectedFeatureColor = pickedObject.color.clone();
						pickedObject.color = Cesium.Color.fromCssColorString('rgba(1, 1, 1, 0.76)');
					}
				} catch (error) {
					console.warn('设置高亮颜色失败:', error);
				}
			}
			
		}, Cesium.ScreenSpaceEventType.LEFT_CLICK);
	}

	// 移除点击事件监听器
	function removeClickHandler() {
		if (!viewer) {
			console.error('Viewer未初始化');
			return;
		}
		
		viewer.cesiumWidget.screenSpaceEventHandler.removeInputAction(Cesium.ScreenSpaceEventType.LEFT_CLICK);
	}

	// 鼠标移动坐标回调
	function addMouseMoveHandler(callback) {
		if (!viewer) {
			console.error('Viewer未初始化');
			return;
		}
		viewer.cesiumWidget.screenSpaceEventHandler.setInputAction(function (movement) {
			const position = movement.endPosition;
			const cartesian = viewer.camera.pickEllipsoid(position, viewer.scene.globe.ellipsoid);
			if (cartesian) {
				const cartographic = Cesium.Cartographic.fromCartesian(cartesian);
				const coordinates = {
					longitude: Cesium.Math.toDegrees(cartographic.longitude),
					latitude: Cesium.Math.toDegrees(cartographic.latitude),
					height: cartographic.height
				};
				if (typeof callback === 'function') callback(coordinates);
			}
		}, Cesium.ScreenSpaceEventType.MOUSE_MOVE);
	}

	function removeMouseMoveHandler() {
		if (!viewer) {
			console.error('Viewer未初始化');
			return;
		}
		viewer.cesiumWidget.screenSpaceEventHandler.removeInputAction(Cesium.ScreenSpaceEventType.MOUSE_MOVE);
	}

	// 航向更新（相机朝向角，单位度）
	let postRenderHandler = null;
	function addHeadingUpdateHandler(callback) {
		if (!viewer) {
			console.error('Viewer未初始化');
			return;
		}
		postRenderHandler = function () {
			const headingRad = viewer.camera.heading;
			const headingDeg = Cesium.Math.toDegrees(headingRad);
			if (typeof callback === 'function') callback(headingDeg);
		};
		viewer.scene.postRender.addEventListener(postRenderHandler);
	}

	function removeHeadingUpdateHandler() {
		if (!viewer || !postRenderHandler) return;
		viewer.scene.postRender.removeEventListener(postRenderHandler);
		postRenderHandler = null;
	}

	// 比例尺与层级（缩放级别）更新
	let postRenderScaleHandler = null;
	function addScaleUpdateHandler(callback) {
		if (!viewer) {
			console.error('Viewer未初始化');
			return;
		}
		postRenderScaleHandler = function () {
			const scene = viewer.scene;
			const canvas = scene.canvas;
			const ellipsoid = scene.globe.ellipsoid;
			const center = new Cesium.Cartesian2(canvas.clientWidth / 2, canvas.clientHeight / 2);
			const right = new Cesium.Cartesian2(center.x + 100, center.y);
			const c1 = viewer.camera.pickEllipsoid(center, ellipsoid);
			const c2 = viewer.camera.pickEllipsoid(right, ellipsoid);
			if (!c1 || !c2) return;
			const g1 = Cesium.Cartographic.fromCartesian(c1);
			const g2 = Cesium.Cartographic.fromCartesian(c2);
			const geodesic = new Cesium.EllipsoidGeodesic(g1, g2);
			const distance = geodesic.surfaceDistance; // 米
			const metersPerPixel = distance / 100.0;
			const lat = Cesium.Math.toDegrees(g1.latitude);
			const mercatorMppEquator = 156543.03392; // WebMercator 基准
			const zoomFloat = Math.log2((mercatorMppEquator * Math.cos(Cesium.Math.toRadians(lat))) / metersPerPixel);
			let zoom = Math.round(zoomFloat);
			zoom = Math.min(Math.max(zoom, 0), 20);

			// 选择友好刻度：1/2/5 * 10^n
			const targetPx = 120; // 目标像素宽度
			const targetMeters = metersPerPixel * targetPx;
			const pow10 = Math.pow(10, Math.floor(Math.log10(targetMeters)));
			const candidates = [1, 2, 5].map(x => x * pow10);
			let niceMeters = candidates[0];
			for (const c of candidates) {
				if (c >= targetMeters) { niceMeters = c; break; }
			}
			const widthPx = niceMeters / metersPerPixel;
			const label = niceMeters >= 1000 ? `${(niceMeters/1000).toFixed(0)} km` : `${niceMeters.toFixed(0)} m`;

			if (typeof callback === 'function') {
				callback({ metersPerPixel, widthPx, label, zoom });
			}
		};
		viewer.scene.postRender.addEventListener(postRenderScaleHandler);
	}

	function removeScaleUpdateHandler() {
		if (!viewer || !postRenderScaleHandler) return;
		viewer.scene.postRender.removeEventListener(postRenderScaleHandler);
		postRenderScaleHandler = null;
	}


	return {
		Cesium,
		initCesium,
		getViewer,
		destroyCesium,
		add3DTileset,
		set3DTilesetStyle,
		addClickHandler,
		removeClickHandler,
		remove3DTileset,
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
	};
}
