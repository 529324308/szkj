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

const TDT_TERRAIN_TOKEN = '96746f26024715426c81adb75118da38';
const TDT_TERRAIN_URL = 'https://t{s}.tianditu.gov.cn/';
const TDT_SUBDOMAINS = ['0', '1', '2', '3', '4', '5', '6', '7'];

export function useCesium(containerId) {
	let viewer = null;

	Cesium.Ion.defaultAccessToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiIwYTFjN2Y4Mi00ODRlLTQ0ZTQtYTgyOC05OTQ0ZmE2NTg1ZGQiLCJpZCI6MzM1MDUsImlhdCI6MTczNDMzMzQ0NX0.VljS3bQxdRzPM_XUcKsIbEx6B-xTpACL9Z2bWNKpMjc';

	let vecLayer;
	let cvaLayer;
	// 保存 addImageryProvider 返回的 ImageryLayer 引用，便于移除
	let vecImageryLayer = null;
	let cvaImageryLayer = null;
	let tdtTerrainProvider = null;
	let debugRuntimeRenderHandler = null;
	// #region debug-point A:tileset-runtime-helpers
	const DEBUG_SERVER_URL = 'http://127.0.0.1:7778/event';
	const DEBUG_SESSION_ID = 'tileset-camera-stutter';
	const DEBUG_RUN_ID = 'post-fix';
	const debugTilesetRuntime = {
		lastFrameTs: 0,
		lastReportTs: 0,
		frameCount: 0,
		slowFrameCount: 0,
		lastCameraSnapshot: null,
		progressReportByUrl: {},
	};
	const reportTilesetDebug = (hypothesisId, location, msg, data = {}) => {
		fetch(DEBUG_SERVER_URL, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				sessionId: DEBUG_SESSION_ID,
				runId: DEBUG_RUN_ID,
				hypothesisId,
				location,
				msg: `[DEBUG] ${msg}`,
				data,
				ts: Date.now(),
			}),
		}).catch(() => {});
	};
	const getCameraSnapshot = () => {
		if (!viewer?.camera) return null;
		const position = viewer.camera.positionCartographic;
		return {
			longitude: Cesium.Math.toDegrees(position.longitude),
			latitude: Cesium.Math.toDegrees(position.latitude),
			height: position.height,
			heading: viewer.camera.heading,
			pitch: viewer.camera.pitch,
			roll: viewer.camera.roll,
		};
	};
	const getCameraMoveDelta = (current, previous) => {
		if (!current || !previous) return null;
		return {
			longitudeDelta: Math.abs((current.longitude || 0) - (previous.longitude || 0)),
			latitudeDelta: Math.abs((current.latitude || 0) - (previous.latitude || 0)),
			heightDelta: Math.abs((current.height || 0) - (previous.height || 0)),
			headingDelta: Math.abs((current.heading || 0) - (previous.heading || 0)),
			pitchDelta: Math.abs((current.pitch || 0) - (previous.pitch || 0)),
			rollDelta: Math.abs((current.roll || 0) - (previous.roll || 0)),
		};
	};
	const getTilesetDebugStats = (tileset) => {
		if (!tileset) return {};
		return {
			show: tileset.show,
			maximumScreenSpaceError: tileset.maximumScreenSpaceError,
			memoryAdjustedScreenSpaceError: tileset.memoryAdjustedScreenSpaceError,
			totalMemoryUsageInBytes: tileset.totalMemoryUsageInBytes,
			cacheBytes: tileset.cacheBytes,
			maximumCacheOverflowBytes: tileset.maximumCacheOverflowBytes,
			numberOfLoadedTilesTotal: tileset._statistics?.numberOfLoadedTilesTotal,
			numberOfTilesWithContentReady: tileset._statistics?.numberOfTilesWithContentReady,
			numberOfTilesVisited: tileset._statistics?.numberOfTilesVisited,
			numberOfCommands: tileset._statistics?.numberOfCommands,
			selectedTiles: tileset._selectedTiles?.length,
		};
	};
	// #endregion

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

	function getTdtTerrainProvider() {
		if (!tdtTerrainProvider) {
			tdtTerrainProvider = createTdtTerrainProvider(TDT_TERRAIN_URL, TDT_SUBDOMAINS, TDT_TERRAIN_TOKEN);
		}
		return tdtTerrainProvider;
	}

	function enableNetworkTerrain() {
		if (!viewer) return;
		viewer.terrainProvider = getTdtTerrainProvider();
	}

	function disableTerrain() {
		if (!viewer) return;
		viewer.terrainProvider = new Cesium.EllipsoidTerrainProvider();
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
		// #region debug-point E:scene-init
		reportTilesetDebug('E', 'useCesium.js:initCesium', 'viewer initialized', {
			requestRenderMode: viewer.scene.requestRenderMode,
			maximumRenderTimeChange: viewer.scene.maximumRenderTimeChange,
			useBrowserRecommendedResolution: viewer.useBrowserRecommendedResolution,
			msaaSamples: viewer.scene.msaaSamples,
		});
		debugRuntimeRenderHandler = function() {
			const now = performance.now();
			if (debugTilesetRuntime.lastFrameTs) {
				const frameMs = now - debugTilesetRuntime.lastFrameTs;
				debugTilesetRuntime.frameCount += 1;
				if (frameMs > 20) debugTilesetRuntime.slowFrameCount += 1;
			}
			debugTilesetRuntime.lastFrameTs = now;
			if (now - debugTilesetRuntime.lastReportTs < 1000) return;
			const currentCameraSnapshot = getCameraSnapshot();
			const cameraDelta = getCameraMoveDelta(currentCameraSnapshot, debugTilesetRuntime.lastCameraSnapshot);
			const cameraMoving = !!cameraDelta && (
				cameraDelta.longitudeDelta > 1e-7 ||
				cameraDelta.latitudeDelta > 1e-7 ||
				cameraDelta.heightDelta > 0.5 ||
				cameraDelta.headingDelta > 1e-4 ||
				cameraDelta.pitchDelta > 1e-4 ||
				cameraDelta.rollDelta > 1e-4
			);
			const frameCount = Math.max(debugTilesetRuntime.frameCount, 1);
			reportTilesetDebug(cameraMoving ? 'A' : 'D', 'useCesium.js:initCesium:postRender', 'scene runtime sample', {
				fpsApprox: Number((1000 / ((now - (debugTilesetRuntime.lastReportTs || now - 1000)) / frameCount)).toFixed(2)),
				slowFrameRatio: Number((debugTilesetRuntime.slowFrameCount / frameCount).toFixed(3)),
				cameraMoving,
				camera: currentCameraSnapshot,
				cameraDelta,
				primitivesLength: viewer.scene.primitives.length,
				dataSourceLength: viewer.dataSources.length,
				requestRenderMode: viewer.scene.requestRenderMode,
			});
			debugTilesetRuntime.lastReportTs = now;
			debugTilesetRuntime.frameCount = 0;
			debugTilesetRuntime.slowFrameCount = 0;
			debugTilesetRuntime.lastCameraSnapshot = currentCameraSnapshot;
		};
		viewer.scene.postRender.addEventListener(debugRuntimeRenderHandler);
		// #endregion
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

		// 矢量底图（路网）
		vecLayer = new Cesium.WebMapTileServiceImageryProvider({
		    url: 'http://t0.tianditu.gov.cn/vec_w/wmts?tk=' + TDT_TERRAIN_TOKEN,
		    layer: 'vec',
		    style: 'default',
		    format: 'tiles',
		    tileMatrixSetID: 'w',
		    maximumLevel: 18
		});

		// 矢量注记（中文标注）
		cvaLayer = new Cesium.WebMapTileServiceImageryProvider({
			url: 'http://t0.tianditu.gov.cn/cva_w/wmts?tk=' + TDT_TERRAIN_TOKEN,
			layer: 'cva',
			style: 'default',
			format: 'tiles',
			tileMatrixSetID: 'w',
			maximumLevel: 18
		});

		// 默认关闭地形，按需切换到网络地形
		disableTerrain();

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
			if (debugRuntimeRenderHandler) {
				viewer.scene.postRender.removeEventListener(debugRuntimeRenderHandler);
				debugRuntimeRenderHandler = null;
			}
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
			const tilesetLoadOptions = {
				// 控制模型清晰度与加载压力的平衡，数值越小越清晰，但请求和渲染压力越大
				maximumScreenSpaceError: options.maximumScreenSpaceError ?? 16,
				// 显式限制缓存目标大小（字节），避免近景时缓存无限膨胀导致显存抖动
				cacheBytes: options.cacheBytes ?? 536870912,
				// 限制缓存超量上浮空间，减少总内存占用飙升到 1GB 以上
				maximumCacheOverflowBytes: options.maximumCacheOverflowBytes ?? 134217728,
				// 兼容旧版本 Cesium 仍可能读取的内存上限配置（MB）
				maximumMemoryUsage: options.maximumMemoryUsage ?? 512,
				// 开启层级跳跃加载，优先快速显示可见结果
				skipLevelOfDetail: options.skipLevelOfDetail ?? true,
				// 达到该屏幕误差后允许跳过中间层级
				baseScreenSpaceError: options.baseScreenSpaceError ?? 1024,
				// 跳层时使用的误差倍数，越大越激进
				skipScreenSpaceErrorFactor: options.skipScreenSpaceErrorFactor ?? 16,
				// 至少跳过多少层级，减少中间层请求
				skipLevels: options.skipLevels ?? 1,
				// 是否只加载最终目标层级；这里关闭以避免远处长时间空白
				immediatelyLoadDesiredLevelOfDetail: options.immediatelyLoadDesiredLevelOfDetail ?? false,
				// 是否同时加载兄弟节点；关闭可减少无效请求
				loadSiblings: options.loadSiblings ?? false,
				// 使用子节点联合包围盒做裁剪，减少不可见瓦片渲染
				cullWithChildrenBounds: options.cullWithChildrenBounds ?? true,
				// 相机移动时裁剪掉大概率不会用到的请求
				cullRequestsWhileMoving: options.cullRequestsWhileMoving ?? true,
				// 相机移动请求裁剪的激进程度，越大裁剪越明显
				cullRequestsWhileMovingMultiplier: options.cullRequestsWhileMovingMultiplier ?? 120.0,
				// 关闭飞行目标预加载，避免镜头近景调整时额外请求未来视角瓦片
				preloadFlightDestinations: options.preloadFlightDestinations ?? false,
				// 关闭叶子节点优先，减少近景移动时直接抢占大量高精细瓦片
				preferLeaves: options.preferLeaves ?? false,
				// 小模型近景查看时关闭动态屏幕误差，避免额外的 LOD 波动
				dynamicScreenSpaceError: options.dynamicScreenSpaceError ?? false,
				// 动态屏幕误差密度，类似雾化密度，影响远处降精度强度
				dynamicScreenSpaceErrorDensity: options.dynamicScreenSpaceErrorDensity ?? 2.0e-4,
				// 动态屏幕误差因子，值越大远处优化越明显
				dynamicScreenSpaceErrorFactor: options.dynamicScreenSpaceErrorFactor ?? 24.0,
				// 动态屏幕误差的高度衰减比例
				dynamicScreenSpaceErrorHeightFalloff: options.dynamicScreenSpaceErrorHeightFalloff ?? 0.25,
				// 先按较低分辨率快速铺一层，再逐步细化
				progressiveResolutionHeightFraction: options.progressiveResolutionHeightFraction ?? 0.0,
				// 优先保证屏幕中心区域清晰，边缘区域可延后加载
				foveatedScreenSpaceError: options.foveatedScreenSpaceError ?? true,
				// 屏幕中心优先的锥体范围，越大优先范围越广
				foveatedConeSize: options.foveatedConeSize ?? 0.1,
				// 模型隐藏时不预加载，避免额外资源浪费
				preloadWhenHidden: options.preloadWhenHidden ?? false,
			};
			// #region debug-point B:tileset-load-start
			reportTilesetDebug('B', 'useCesium.js:add3DTileset:start', 'tileset load requested', {
				url,
				options: tilesetLoadOptions,
			});
			// #endregion

			let tileset = await Cesium.Cesium3DTileset.fromUrl(url, {
				...tilesetLoadOptions,
			});
			viewer.scene.primitives.add(tileset);
			// 开启背面裁剪，减少不可见面片参与渲染
			tileset.backFaceCulling = options.backFaceCulling ?? true;
			// 显式确保模型加载后处于显示状态
			tileset.show = true;
			const idleMaximumScreenSpaceError = options.idleMaximumScreenSpaceError ?? tileset.maximumScreenSpaceError;
			const movingMaximumScreenSpaceError = options.movingMaximumScreenSpaceError ?? Math.max(idleMaximumScreenSpaceError, 28);
			const restoreDetailDelayMs = options.restoreDetailDelayMs ?? 180;
			let restoreDetailTimer = null;
			const applyMovingDetailStrategy = () => {
				if (restoreDetailTimer) {
					clearTimeout(restoreDetailTimer);
					restoreDetailTimer = null;
				}
				tileset.maximumScreenSpaceError = movingMaximumScreenSpaceError;
				viewer.scene.requestRender();
			};
			const applyIdleDetailStrategy = () => {
				if (restoreDetailTimer) clearTimeout(restoreDetailTimer);
				restoreDetailTimer = setTimeout(() => {
					tileset.maximumScreenSpaceError = idleMaximumScreenSpaceError;
					viewer.scene.requestRender();
				}, restoreDetailDelayMs);
			};
			const removeMoveStartListener = viewer.camera.moveStart.addEventListener(() => {
				applyMovingDetailStrategy();
				reportTilesetDebug('B', 'useCesium.js:add3DTileset:moveStart', 'camera move start, relax tileset detail', {
					url,
					maximumScreenSpaceError: movingMaximumScreenSpaceError,
				});
			});
			const removeMoveEndListener = viewer.camera.moveEnd.addEventListener(() => {
				applyIdleDetailStrategy();
				reportTilesetDebug('B', 'useCesium.js:add3DTileset:moveEnd', 'camera move end, restore tileset detail', {
					url,
					maximumScreenSpaceError: idleMaximumScreenSpaceError,
					restoreDetailDelayMs,
				});
			});
			tileset._cameraAdaptiveCleanup = () => {
				if (restoreDetailTimer) {
					clearTimeout(restoreDetailTimer);
					restoreDetailTimer = null;
				}
				if (typeof removeMoveStartListener === 'function') removeMoveStartListener();
				if (typeof removeMoveEndListener === 'function') removeMoveEndListener();
			};
			applyIdleDetailStrategy();
			// #region debug-point C:tileset-runtime-events
			reportTilesetDebug('C', 'useCesium.js:add3DTileset:ready', 'tileset added to scene', {
				url,
				backFaceCulling: tileset.backFaceCulling,
				stats: getTilesetDebugStats(tileset),
			});
			tileset.loadProgress?.addEventListener((numberOfPendingRequests, numberOfTilesProcessing) => {
				const now = Date.now();
				const lastTs = debugTilesetRuntime.progressReportByUrl[url] || 0;
				if (now - lastTs < 800) return;
				debugTilesetRuntime.progressReportByUrl[url] = now;
				reportTilesetDebug('C', 'useCesium.js:add3DTileset:loadProgress', 'tileset load progress', {
					url,
					numberOfPendingRequests,
					numberOfTilesProcessing,
					stats: getTilesetDebugStats(tileset),
					camera: getCameraSnapshot(),
				});
			});
			tileset.allTilesLoaded?.addEventListener(() => {
				reportTilesetDebug('C', 'useCesium.js:add3DTileset:allTilesLoaded', 'tileset all tiles loaded', {
					url,
					stats: getTilesetDebugStats(tileset),
					camera: getCameraSnapshot(),
				});
			});
			// #endregion

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
			currentTilesetList[url]?._cameraAdaptiveCleanup?.();
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
		enableNetworkTerrain,
		disableTerrain,
	};
}
