# 轻量版 OpenLayers 迁移方案

## 1. 目标与边界

本方案用于将当前 Cesium 地图主程序迁移为轻量版地图能力：不再使用 Cesium，不再引入 `vite-plugin-cesium`、`cesium`、`tdt-terrain-cesium-plugin`，地图引擎统一改为 OpenLayers。

迁移目标：

1. 所有二维地图操作在 OpenLayers 中正常可用，包括底图切换、定位、坐标显示、比例尺、点线面绘制、量测、地价要素查询、SHP/KML/CAD 导入展示、巡检路线与轨迹回放。
2. 所有三维专属操作从轻量版中剥离或降级展示，包括 Cesium 地球自转、真实三维地形、3D Tiles 倾斜模型、三维光照、相机俯仰、三维拾取、三维高程拾取。
3. 首页不再依赖 Cesium 地球自转，改用独立 CSS/HTML 动效组件实现，来源为 Uiverse 示例：<https://uiverse.io/Lakshay-art/soft-dingo-98>。
4. 页面业务结构尽量保持不变，优先替换地图引擎层和地图对象模型，避免重写业务 UI。

轻量版定义：

| 能力类型 | 轻量版处理 |
|---|---|
| 二维底图、二维矢量、二维绘制、二维量测 | 必须支持 |
| 文件导入后的二维展示 | 必须支持 |
| 巡检路线、问题点、轨迹回放 | 必须支持 |
| 地形、三维 Tileset、光照、真实高程、三维视角 | 不支持或降级 |
| 首页视觉地球 | 使用独立 Uiverse 动效，不使用地图引擎 |

## 2. 当前 Cesium 依赖清单

当前地图依赖主要集中在以下文件：

| 文件 | 当前职责 | 迁移处理 |
|---|---|---|
| `src/components/CesiumMap.vue` | 地图主壳、页面切换、绘制量测、导入、查询、巡检叠加 | 拆分为 `OpenLayersMap.vue` 或 `MapShell.vue`，保留业务 UI，替换地图调用 |
| `src/composables/useCesium.js` | Cesium Viewer 初始化、底图、地形、3D Tiles、事件、性能、首页地球 | 新建 `src/composables/useOpenLayers.js`，只保留二维地图能力 |
| `src/components/map/Home.vue` | 数治测绘工具栏与上传弹窗 | UI 可保留，事件接入 OpenLayers |
| `src/components/map/LandPriceQuery.vue` | 地价图层树、查询工具栏、结果面板 | UI 可保留，矢量查询改为 OpenLayers Feature 查询 |
| `src/components/map/SmartAnalysis.vue` | AI 对话、分析报告入口 | 与地图弱耦合，仅绘制入口接入 OpenLayers |
| `src/components/map/DataManagement.vue` | 数据管理、巡检任务、轨迹回放入口 | 业务 UI 可保留，地图叠加改为 OpenLayers |
| `src/components/map/InspectionPlaybackWindow.vue` | 独立 Cesium 轨迹回放窗口 | 改为 OpenLayers 小地图窗口 |
| `src/App.vue`、`src/components/LoadingPage.vue`、`src/utils/deviceProfile.js` | Cesium 加载、WebGL 预热、渲染档位 | 改为轻量版加载检测，去掉 Cesium 预热和 3D 档位 |
| `vite.config.js`、`src/main.js`、`package.json` | Cesium 插件、Cesium 样式、Cesium 依赖 | 移除 Cesium，新增 OpenLayers |

建议新增：

| 文件 | 职责 |
|---|---|
| `src/composables/useOpenLayers.js` | OpenLayers 地图引擎封装 |
| `src/utils/mapGeometry.js` | 距离、面积、方位角、夹角、圆、多边形、KML 导出等纯计算 |
| `src/utils/mapFeatureStyle.js` | 点线面、选中、高亮、查询、巡检样式 |
| `src/components/OpenLayersMap.vue` | 轻量版主地图组件 |
| `src/components/homeMap.vue` | 已新建的首页地球转动组件，承载 Uiverse 动效 |

## 3. 技术选型

| 类别 | 方案 |
|---|---|
| 地图引擎 | `ol` |
| 默认投影 | 地图视图使用 `EPSG:3857`，业务经纬度使用 `EPSG:4326` |
| 坐标转换 | `fromLonLat`、`toLonLat`、`transform` |
| 底图 | OpenLayers `TileLayer` + `XYZ` 或 `WMTS` |
| 矢量数据 | `VectorSource` + `VectorLayer` + `Feature` |
| GeoJSON | `ol/format/GeoJSON` |
| KML | `ol/format/KML`，KMZ 先解压后读 KML |
| SHP | 继续使用现有 `shpjs` 转 GeoJSON，再进 OpenLayers |
| CAD/DXF | 继续使用现有 `dxf-parser` + `proj4`，转换为 OpenLayers Feature |
| 绘制交互 | `ol/interaction/Draw`、`Modify`、`Snap`、`Select` |
| 弹窗 | `ol/Overlay` 或保留 Vue 浮层面板 |
| 距离面积 | `ol/sphere`、Turf，复杂几何继续用 Turf |
| 巡检回放 | VectorLayer 分层渲染路线、轨迹、进度线、当前位置点 |

依赖调整：

```bash
npm install ol
```

安装后由 npm 写入当前稳定版本，方案文档不写死具体版本号。

保留：`@turf/turf`、`proj4`、`dxf-parser`、`shpjs`、`pako`、`element-plus`、`gsap`。

移除：`cesium`、`vite-plugin-cesium`、`tdt-terrain-cesium-plugin`。

`src/main.js` 改为：

```js
import 'ol/ol.css';
```

`vite.config.js` 移除 Cesium 插件和 `sourcePrefix` 相关配置。

## 4. 地图引擎接口迁移

建议用 `useOpenLayers` 替代 `useCesium`，对上层暴露相近方法，降低页面改造量。

| 当前方法 | Cesium 现状 | OpenLayers 轻量版实现 | 评估 |
|---|---|---|---|
| `initCesium` | 初始化 `Cesium.Viewer` | `new Map({ target, layers, view })` | 可完全替代，方法改名为 `initOpenLayers` |
| `getViewer` | 返回 Cesium Viewer | 返回 OpenLayers `Map` 实例 | 可替代，建议改名 `getMap` |
| `destroyCesium` | 销毁 Viewer 和事件 | `map.setTarget(null)`，清理交互和图层 | 可完全替代 |
| `setRenderPreset` | DPR、HDR、阴影、Tileset 参数 | 仅保留轻量版性能参数，如矢量点数量上限、聚合阈值 | 降级 |
| `subscribePerformanceStats` | 统计 FPS、Tileset、Primitive、影像层 | 统计图层数、Feature 数、交互状态、粗略 FPS | 可降级 |
| `addVecLayer` | 添加天地图矢量 | 添加 `XYZ/WMTS TileLayer` | 可完全替代 |
| `addCvaLayer` | 添加天地图矢量注记 | 添加注记 TileLayer | 可完全替代 |
| `addImgLayer` | 添加天地图影像 | 添加影像 TileLayer | 可完全替代 |
| `addCiaLayer` | 添加天地图影像注记 | 添加影像注记 TileLayer | 可完全替代 |
| `removeVecLayer` 等 | 移除影像图层 | `map.removeLayer(layer)` | 可完全替代 |
| `showGlobalImageryLayer` | 显示 Cesium 默认全球影像 | 轻量版无 Cesium 默认影像，改为“影像底图”或 OSM/天地图兜底 | 需替换语义 |
| `hideGlobalImageryLayer` | 隐藏 Cesium 默认全球影像 | 切换底图 layer visible | 可替代 |
| `enableNetworkTerrain` | 天地图三维地形 | OpenLayers 不支持真实三维地形 | 三维操作，轻量版不支持 |
| `disableTerrain` | 回到椭球地形 | 无地形概念，改为关闭“地形/模型”列表状态 | 三维操作，降级 |
| `add3DTileset` | 加载 `tileset.json` 倾斜模型 | OpenLayers 不能渲染 3D Tiles；仅记录条目、提示轻量版不支持，或要求后端提供二维轮廓 GeoJSON | 三维操作，不支持原能力 |
| `remove3DTileset` | 移除 3D Tiles | 删除列表项或二维轮廓图层 | 降级 |
| `set3DTilesetStyle` | 设置 3D Tiles 样式 | 不适用；二维轮廓可用 Feature Style | 三维操作，降级 |
| `addClickHandler` | `scene.pick`、实体/3D Tiles 拾取 | `map.forEachFeatureAtPixel` + 坐标回传 | 二维实体可完全替代，3D Tiles 属性拾取不支持 |
| `removeClickHandler` | 移除 Cesium click input | `unByKey(clickKey)` | 可完全替代 |
| `addMouseMoveHandler` | 椭球拾取经纬度 | `toLonLat(map.getCoordinateFromPixel(pixel))` | 可完全替代，高程降级为 0 或 DEM 服务 |
| `addHeadingUpdateHandler` | 相机 heading | `view.getRotation()` | 可替代，只有二维旋转角 |
| `addScaleUpdateHandler` | 根据相机计算比例尺和 zoom | `view.getResolution()` + projection metersPerUnit | 可完全替代 |
| `enterHomeScene` | 进入首页时恢复三维地球视角并自转 | 不再使用地图；显示 `homeMap.vue` | 三维操作，替换为 CSS 动效 |
| `stopHomeEarthRotation` | 停止 Cesium 相机绕地球旋转 | 停止/隐藏 CSS 地球动画 | 替换 |
| `flyToOnLeaveHome` | Cesium 相机飞到业务区 | OpenLayers `view.animate({ center, zoom })` | 可二维替代 |

## 5. 首页地球转动方案

首页轻量版不再启动 Cesium 地球。原 `enterHomeScene`、`startHomeEarthRotation`、`restoreInitialHomeCameraView` 这类三维相机逻辑全部移除。

实现方案：

1. 复用已新建的 `src/components/homeMap.vue`。
2. 该组件承载 Uiverse 示例 <https://uiverse.io/Lakshay-art/soft-dingo-98> 中的 HTML/CSS 地球转动动效。
3. 在 `PortalHome.vue` 中引入 `homeMap.vue`，作为首页视觉背景或主视觉元素使用。
4. 组件内部只负责 CSS 动画，不依赖 OpenLayers，也不访问地图实例。
5. 首页进入业务模块时，继续走 `enterModule`，轻量版地图执行 `view.animate` 到业务区域。

建议组件职责：

| 模块 | 职责 |
|---|---|
| `src/components/homeMap.vue` | 承载 Uiverse 地球动效代码 |
| `PortalHome.vue` | 保留首页指标、入口、图表 UI，引入地球动效组件 |
| `OpenLayersMap.vue` | 业务地图，首页时可保持初始化但隐藏交互，也可延迟到进入模块后初始化 |

注意事项：

- Uiverse 动效代码应作为独立样式命名空间，避免污染现有 `.portal-home` 样式。
- 需要在代码注释中保留来源链接，便于后续维护。
- 若该动效包含外部图片或字体，应下载到 `src/assets` 或改为纯 CSS，避免运行时额外网络依赖。
- 该方案只替代首页视觉地球，不提供地图交互和地理坐标能力。

## 6. 通用地图壳操作评估

| 页面/区域 | 操作或方法 | 当前行为 | OpenLayers 迁移方案 | 评估 |
|---|---|---|---|---|
| 顶部 Tab | `selectTopTab` | 切换首页、测绘、地价、智能分析、数据管理、个人中心 | 保持现有 Vue 状态，进入非首页时调用 `view.animate` 到默认业务区 | 可保留 |
| 顶部 Tab | `enterModule` | 从首页进入模块，触发 Cesium 飞行 | 改为 OpenLayers 动画缩放和平移 | 可替代 |
| 首页状态 | `homeUiVisible`、`homeSidebarCollapsing` | 配合 Cesium 地球动画 | 保留 UI 动画，地图飞行动画独立处理 | 可保留 |
| 地图容器 | `#cesiumContainer` | Cesium Viewer 容器 | 改为 `#openlayersContainer` 或 `ref` 容器 | 必改 |
| 底部坐标 | `mouseCoords` | 鼠标移动拾取经纬度高程 | OpenLayers 鼠标坐标转经纬度，高程显示 `--` 或 DEM 服务值 | 可替代，高程降级 |
| 比例尺 | `scaleBar` | Cesium 相机估算比例尺 | OpenLayers `ScaleLine` 或自定义 `resolution` 计算 | 可完全替代 |
| 指南针 | `headingDeg`、`compassRotation` | Cesium camera heading | 使用 `view.getRotation()`；默认不旋转地图时固定北向 | 可替代 |
| 图层面板 | `toggleLayerPanel` | 打开底图选择浮层 | 保留 UI，切换 OpenLayers 底图 layer visible | 可完全替代 |
| 底图切换 | `setBaseLayer` | 全球影像、天地图、矢量图、注记图 | 使用天地图影像、天地图影像+注记、天地图矢量+注记等图层组合 | 可替代 |
| 定位 | `locateToMe` | 浏览器定位后 Cesium `camera.flyTo`，添加点 | `navigator.geolocation` + `view.animate` + marker Feature | 可完全替代 |
| 性能监控 | `performanceMonitor` | FPS、Tileset、Primitive、地形模式 | 改为图层数、Feature 数、交互状态、粗略 FPS，删除 Tileset/Primitive/地形项 | 降级可用 |
| 点击空白 | `handleMapClick` | 取消选中、关闭面板 | `singleclick` 未命中 Feature 时执行同样逻辑 | 可完全替代 |
| Feature 高亮 | `setEntityHighlight` | 修改 Cesium Entity 样式 | 给 Feature 设置选中 Style 或放入高亮层 | 可完全替代 |
| 定位对象 | `zoomToTargetPreservePitch` | Cesium `zoomTo` 保持 pitch | `view.fit(featureExtent, padding)` | 可替代，pitch 移除 |

## 7. 登录页与加载页评估

| 页面 | 操作或方法 | 当前行为 | OpenLayers 迁移方案 | 评估 |
|---|---|---|---|---|
| `Login.vue` | 登录成功 | 进入加载页，之后挂载 CesiumMap | 保持不变，后续挂载 OpenLayersMap | 无地图改动 |
| `App.vue` | `mapShouldMount` | 控制 CesiumMap 挂载 | 改为控制 OpenLayersMap 挂载 | 可替代 |
| `App.vue` | `onMapReady` | 等待 Cesium ready | 等待 OpenLayers 初始底图和基础图层 ready | 可替代 |
| `LoadingPage.vue` | 设备检测 | 检测 WebGL、GPU、Cesium 预热 | 改为检测浏览器、网络、DPR、Canvas、内存，删除 Cesium 预热 | 降级 |
| `LoadingPage.vue` | `enter-basic` | 进入 Cesium 基础模式 | 进入轻量版基础底图模式 | 可替代 |
| `deviceProfile.js` | `renderPreset` | 输出 Cesium 渲染档位、地形、Tileset 参数 | 输出 OpenLayers 矢量渲染策略，例如聚合阈值、最大可见 Feature 数、默认 zoom | 必改 |

加载页文案需要同步替换：

| 当前文案含义 | 轻量版文案 |
|---|---|
| 正在预热 Cesium 资源 | 正在加载轻量地图资源 |
| 正在进入三维场景 | 正在进入二维地图 |
| 三维地图性能参数 | 轻量地图性能参数 |
| 地形、阴影、Tileset | 底图、矢量图层、交互性能 |

## 8. 平台首页 `PortalHome.vue` 操作评估

| 操作或方法 | 当前行为 | OpenLayers 迁移方案 | 评估 |
|---|---|---|---|
| 首页地球自转 | Cesium 相机绕地球旋转 | 使用 Uiverse `soft-dingo-98` 动效组件 | 替换，不使用地图 |
| 首页指标卡片 | 静态/业务概览 UI | 保持原组件逻辑 | 无地图改动 |
| 首页左侧快捷入口 | `emit('enter-module', key)` | 保持事件，进入模块时触发二维地图动画 | 可保留 |
| 首页展开指标 | `statsExpanded` | 保持 UI | 无地图改动 |
| 首页图表 | SVG 图表 | 保持 UI | 无地图改动 |
| 进入数治测绘 | Cesium 飞到业务区 | `view.animate({ center: fromLonLat([119.48, 28.4585]), zoom })` | 可替代 |
| 进入数治地价 | Cesium 飞到业务区 | 同上，必要时按地价数据范围 `fit` | 可替代 |
| 进入数据管理 | Cesium 飞到业务区 | 同上，任务选中后按路线范围 `fit` | 可替代 |

## 9. 数治测绘 `Home.vue` 操作评估

### 9.1 绘制工具

| 工具/方法 | 当前 Cesium 行为 | OpenLayers 迁移方案 | 评估 |
|---|---|---|---|
| `startTool('markPoint')` | 点击地图添加 Cesium point + label | `Draw({ type: 'Point' })` 或单击创建 Point Feature + Text Style | 可完全替代 |
| `startTool('drawLine')` | 绘制 Polyline | `Draw({ type: 'LineString' })` | 可完全替代 |
| `startTool('drawPolygon')` | 绘制 Polygon | `Draw({ type: 'Polygon' })` | 可完全替代 |
| `startTool('drawCircle')` | 绘制 Cesium ellipse | `Draw({ type: 'Circle' })`，保存时转 Polygon 或保留 Circle geometry | 可完全替代 |
| `startTool('drawRect')` | 两点生成 Rectangle | `Draw.createBox()` 或自定义 two-click box | 可完全替代 |
| `createTempEntity` | 鼠标移动时创建临时 Entity、虚线、标签 | OpenLayers Draw 自带草图层；动态标签用 Overlay 或 sketch style | 可替代 |
| `updateTempEntity` | 依赖 CallbackProperty 自动更新 | OpenLayers 通过 `drawstart/drawend`、`geometry.on('change')` 更新 | 可替代 |
| `finalizeDrawing` | 完成绘制，注册实体、生成 label 和量测面板 | `drawend` 后写入 Feature 属性，添加结果标签 Feature/Overlay | 可完全替代 |
| `resetDrawing` | 删除临时 Entity 和 handler | 移除当前 Interaction，清理 sketch/result layer | 可完全替代 |
| 十字引导线 | 经线/纬线动态 Entity | OpenLayers 自定义 VectorLayer 动态画水平/垂直线 | 可替代，可选 |
| 绘制提示标签 | Cesium Label 跟随鼠标 | Vue 浮层或 `Overlay` 跟随鼠标像素位置 | 可完全替代 |

### 9.2 测量工具

| 工具/方法 | 当前 Cesium 行为 | OpenLayers 迁移方案 | 评估 |
|---|---|---|---|
| `measureDistance` | 多点测距，使用 `EllipsoidGeodesic` | `ol/sphere.getLength` 或 Turf length | 可完全替代 |
| `measureArea` | 多边形面积，当前通过 Turf/ENU 平面计算 | `ol/sphere.getArea` 或继续 Turf | 可完全替代 |
| `measureVolume` | 当前本质为面积 * 输入高度 | OpenLayers 保留同样算法；若要求真实挖填方量则不支持 | 当前能力可替代，真实三维方量不支持 |
| `measureAzimuth` | 两点方位角 | 继续使用经纬度球面方位角公式 | 可完全替代 |
| `measureAngle` | 三点夹角，当前用三维向量 | 改为二维平面向量或球面近似 | 可替代 |
| `polygonArea` | Cesium Cartesian + Turf 计算 | 改为直接使用经纬度/投影坐标 + Turf/OpenLayers | 可替代 |
| `bearing` | Cesium 弧度转换 | 纯 JS 经纬度公式 | 可替代 |
| `angleDeg` | Cesium Cartesian3 向量 | 二维坐标向量公式 | 可替代 |
| `copyCoords` | 复制点位/测量点 | 保持业务逻辑，数据来自 Feature 属性 | 可完全替代 |
| `copyAll` | 复制全部点、分段、累计距离 | 保持业务逻辑 | 可完全替代 |
| `exportCurrentKml` | 从 Cesium Entity 导出 KML | 从 OpenLayers Feature geometry 导出 KML | 可完全替代 |

### 9.3 测绘对象管理

| 操作或方法 | 当前 Cesium 行为 | OpenLayers 迁移方案 | 评估 |
|---|---|---|---|
| `registerMeasureEntity` | 注册测量 Entity 到列表 | 注册 Feature 到测量图层和列表 | 可完全替代 |
| `registerMarkPointEntity` | 注册标点 Entity | 注册 Point Feature | 可完全替代 |
| `setMeasureEntityVisible` | Entity show | Feature 设置隐藏属性并刷新 style，或移入隐藏集合 | 可替代 |
| `setMarkPointEntityVisible` | Entity show | 同上 | 可替代 |
| `selectSyInfoItem` | 选中列表项并 `zoomTo` | 设置高亮 Style，`view.fit` 到 geometry extent | 可完全替代 |
| `deleteMeasureEntity` | 删除 Entity、点、标签 | 从 VectorSource 删除 Feature 和关联标签 Feature | 可完全替代 |
| `deleteMarkPointEntity` | 删除标点 | 从 VectorSource 删除 Feature | 可完全替代 |
| `clearAllMeasures` | 清除所有测绘对象 | 清空测量图层、标点图层、状态 | 可完全替代 |

### 9.4 地形和模型入口

| 操作或方法 | 当前 Cesium 行为 | OpenLayers 迁移方案 | 评估 |
|---|---|---|---|
| `openTerrainPanel` | 打开地形/模型 URL 面板 | 可保留面板，但轻量版改名为“模型链接管理”或隐藏 | 三维操作，建议隐藏 |
| `confirmTerrain` | 加载天地图地形和多个 `tileset.json` | OpenLayers 不渲染 3D Tiles；仅支持后端提供二维 GeoJSON/瓦片轮廓时展示 | 三维操作，不支持原能力 |
| `closeTerrain` | 关闭地形和模型 | 清空三维模型列表状态或二维轮廓图层 | 降级 |
| `toggleSyInfoItem(kind='terrain-network')` | 开关网络地形 | 轻量版不显示该项 | 三维操作，移除 |
| `toggleSyInfoItem(kind='terrain-model')` | 开关 3D Tiles | 轻量版不显示，或仅开关二维轮廓 | 三维操作，降级 |
| `deleteTerrainModelItem` | 移除 3D Tileset | 删除模型链接记录 | 降级 |

建议：轻量版默认隐藏“添加地形”按钮。如果必须保留入口，应在面板内明确提示“轻量版不支持三维地形/倾斜模型，请上传二维 SHP/KML/CAD 或由服务端发布二维图层”。

### 9.5 文件导入

| 操作或方法 | 当前 Cesium 行为 | OpenLayers 迁移方案 | 评估 |
|---|---|---|---|
| `confirmShpImport` | `shpjs` 解析 zip，`GeoJsonDataSource` 加载 | `GeoJSON.readFeatures` 加入 VectorSource | 可完全替代 |
| `styleImportedShpDataSource` | 设置 Cesium Entity 样式、轮廓、元数据 | 设置 Feature Style，元数据写入 Feature properties | 可完全替代 |
| `openShpFeaturePopup` | 点击 SHP Entity 显示属性面板 | `forEachFeatureAtPixel` 读取 Feature properties | 可完全替代 |
| `deleteShpImportItem` | 移除 dataSource | 移除 VectorLayer/清空 Source | 可完全替代 |
| `confirmKmlImport` | `KmlDataSource.load` 加载 KML/KMZ | KML 用 `ol/format/KML`；KMZ 用 `pako`/解压后读取 KML | 可替代 |
| `deleteKmlImportItem` | 移除 KML dataSource | 移除 KML VectorLayer | 可完全替代 |
| `confirmCadImport` | `dxf-parser` 解析后添加 Cesium Entity | 保留解析与坐标转换，输出 Point/LineString/Polygon Feature | 可替代 |
| `cadAppendEntityToDataSource` | DXF 实体转 Cesium Entity | 改为 DXF 实体转 OpenLayers Feature | 必改 |
| `deleteCadImportItem` | 移除 CAD dataSource | 移除 CAD VectorLayer | 可完全替代 |
| 导入图层显隐 | `dataSource.show` | `layer.setVisible(checked)` | 可完全替代 |
| 导入图层定位 | `viewer.zoomTo(dataSource)` | `view.fit(vectorSource.getExtent())` | 可完全替代 |

CAD 注意事项：

- `TEXT/MTEXT` 可转成 Point Feature + Text Style。
- `LINE/LWPOLYLINE/POLYLINE` 转 LineString 或 Polygon。
- `CIRCLE/ARC` 采样为 LineString 或 Polygon。
- `HATCH/SOLID/复杂块参照` 若当前解析不完整，轻量版保持“尽力展示”策略。

## 10. 数治地价 `LandPriceQuery.vue` 操作评估

### 10.1 图层树与数据加载

| 操作或方法 | 当前 Cesium 行为 | OpenLayers 迁移方案 | 评估 |
|---|---|---|---|
| `getMenuTreeList` | 获取地价菜单树 | 保持接口 | 无地图改动 |
| `onCheckNode` | 勾选节点后拉取要素 | 保持接口，返回 records 后转 GeoJSON Feature | 可保留 |
| `onDjcxNodeFeaturesChange` | 调用 `djcxAddNodeFeatures` 或移除 | 改为添加/移除 VectorLayer 或按 nodeId 分组的 Feature | 可替代 |
| `djcxAddNodeFeatures` | `GeoJsonDataSource.load` 加载面数据、添加标签和轮廓 Entity | `GeoJSON.readFeatures` 加入 VectorSource，样式函数生成填充、描边、文字 | 可完全替代 |
| `djcxRemoveNodeFeatures` | 移除 Cesium DataSource | 从 source 删除 nodeId 对应 Feature 或移除 layer | 可完全替代 |
| `setDjcxDataSourcesVisible` | 控制 dataSource show | 控制 layer visible | 可完全替代 |
| `djcxGetAllFeatureEntities` | 获取全部 Entity | 获取全部 Feature | 可完全替代 |
| `djcxApplyEntityStyle` | 改 Cesium polygon material | Feature Style 函数根据 `highlight` 属性返回样式 | 可完全替代 |
| `djcxSetOutlineHighlightForEntity` | 额外 outline Entity 高亮 | 使用高亮描边 Style 或单独高亮层 | 可完全替代 |
| `djcxClearHighlights` | 清除 Entity 高亮 | 清空高亮集合/重置属性 | 可完全替代 |
| `djcxSetHighlights` | 批量高亮 | 设置高亮 Feature 集合 | 可完全替代 |

### 10.2 查询工具

| 工具/方法 | 当前 Cesium 行为 | OpenLayers 迁移方案 | 评估 |
|---|---|---|---|
| `startTool('dianxuan')` | 点击经纬度，点查地价面 | `singleclick` 坐标 + Turf/geometry intersects | 可完全替代 |
| `startTool('duodian')` | 多点选择/取消多个要素 | `singleclick` 命中 Feature 后切换选中集合 | 可完全替代 |
| `startTool('dianPolygon')` | 绘制多边形查询范围 | `Draw({ type: 'Polygon' })` 后空间查询 | 可完全替代 |
| `startTool('dianCircle')` | 绘制圆形查询范围 | `Draw({ type: 'Circle' })`，转 Polygon 后查询 | 可完全替代 |
| `startTool('dianRect')` | 绘制矩形查询范围 | `Draw.createBox()` 后查询 | 可完全替代 |
| `djcxQueryPoint` | 判断点落在哪些 Entity 几何内 | Turf `booleanPointInPolygon` 或 OpenLayers geometry intersectsCoordinate | 可完全替代 |
| `djcxQueryRect` | 矩形范围查询 | 用 extent 与 Feature extent 预筛，再 Turf 精筛 | 可完全替代 |
| `djcxQueryCircle` | 半径范围查询 | Turf circle + intersects，或按距离预筛 | 可完全替代 |
| `djcxQueryPolygon` | 多边形范围查询 | Turf intersects/within | 可完全替代 |
| 查询范围绘制结果 | Cesium 临时 Entity | 查询图层 Feature + 标签 | 可完全替代 |
| `djcxShowFeatureInPanel` | 单要素属性面板 | 保持 Vue 面板，数据来自 Feature properties | 可完全替代 |
| `djcxShowFeaturesInTable` | 多要素表格 | 保持 Vue 表格，数据来自 Feature properties | 可完全替代 |

### 10.3 地价标签与样式

| 方法 | 当前 Cesium 行为 | OpenLayers 迁移方案 | 评估 |
|---|---|---|---|
| `djcxColorForLevel`、`djcxColorForRoman` | Cesium Color | 改为 CSS color string / `ol/color` | 可替代 |
| `djcxPickLabelLonLat` | 计算多边形标签点 | 保留算法，输出经纬度后转投影 | 可替代 |
| `djcxEntityCentroidLonLat` | Entity 中心点 | Feature geometry 内点/extent center/Turf centroid | 可替代 |
| `djcxBuildQueryResultProperties` | 构建结果属性 | 保持纯业务逻辑 | 可保留 |

## 11. 智能分析 `SmartAnalysis.vue` 操作评估

| 操作或方法 | 当前行为 | OpenLayers 迁移方案 | 评估 |
|---|---|---|---|
| `startTool('ai')` | 打开 AI 对话面板 | 保持不变 | 无地图改动 |
| AI 面板拖拽、缩放、关闭 | Vue + GSAP | 保持不变 | 无地图改动 |
| `sendAiMessage` | 发送对话 | 保持不变 | 无地图改动 |
| 分析报告按钮 | 当前触发 `drawPolygon` | 接入 OpenLayers `drawPolygon`，绘制分析范围 | 可替代 |
| 未来 AI 地图指令 | 可通过 Cesium 操作地图 | 通过统一 `mapCommandBus` 调用 `view.fit`、开关图层、选中 Feature | 可扩展 |

建议：智能分析不要直接依赖 OpenLayers 实例，统一通过上层提供的地图操作接口调用，避免再次和地图引擎强耦合。

## 12. 数据管理 `DataManagement.vue` 与巡检操作评估

### 12.1 数据管理页

| 操作或方法 | 当前行为 | OpenLayers 迁移方案 | 评估 |
|---|---|---|---|
| 图层管理 | 当前是占位卡片 | 后续可接入 OpenLayers 图层注册表 | 可扩展 |
| 上传云端 | 业务占位/上传 | 与地图无强耦合 | 保持 |
| 本地查看 | 业务占位/预览 | 可复用 SHP/KML/CAD 导入图层能力 | 可扩展 |
| 巡检任务列表 | Element 表格和抽屉 | 保持不变 | 无地图改动 |
| 下发任务 | 上传 zip、调用接口 | 保持不变 | 无地图改动 |
| 任务详情 | 路线卡片、问题、审核 | 保持不变 | 无地图改动 |

### 12.2 巡检地图叠加

| 操作或方法 | 当前 Cesium 行为 | OpenLayers 迁移方案 | 评估 |
|---|---|---|---|
| `ensureInspectionDataSource` | 创建 Cesium CustomDataSource | 创建巡检 VectorLayer 分组：路线层、问题点层、轨迹层、进度层 | 可替代 |
| `renderInspectionTaskRoutes` | 绘制任务线路 polyline + label | LineString Feature + Text Style | 可完全替代 |
| `highlightInspectionRoute` | 改路线 Entity 样式 | 修改 Feature selected 属性或高亮层 | 可完全替代 |
| `focusInspectionTarget` | Cesium `zoomTo` | `view.fit(targetExtent, padding)` | 可完全替代 |
| `renderInspectionIssues` | 问题点 point + label | Point Feature + Icon/Text Style | 可完全替代 |
| `renderInspectionPlayback` | 路线、轨迹、进度线、当前位置点 | 多个 VectorLayer 渲染 LineString/Point | 可完全替代 |
| `handleInspectionTaskSelected` | 任务选择后绘制路线 | 保持事件，调用 OpenLayers 渲染函数 | 可替代 |
| `handleInspectionTaskCleared` | 清除巡检覆盖物 | 清空巡检 VectorSource | 可完全替代 |
| `handleInspectionRouteLocate` | 定位路线 | `view.fit(routeFeature.getGeometry().getExtent())` | 可完全替代 |
| `handleInspectionRouteIssues` | 显示问题点 | 添加问题点 Feature | 可完全替代 |
| `handleInspectionTrackShow` | 显示轨迹 | 添加轨迹 Feature，并显示回放面板 | 可完全替代 |
| `handleInspectionTrackProgress` | 更新轨迹进度 | 更新进度 LineString 和当前位置 Point | 可完全替代 |
| `handleInspectionTrackHide` | 隐藏回放 | 清空轨迹层 | 可完全替代 |

### 12.3 独立轨迹回放窗口

| 操作或方法 | 当前 Cesium 行为 | OpenLayers 迁移方案 | 评估 |
|---|---|---|---|
| `InspectionPlaybackWindow.vue` `ensureViewer` | 弹窗内初始化 Cesium Viewer | 初始化 OpenLayers Map | 必改 |
| `toPositions` | 经纬度转 Cartesian3 | 经纬度转 `fromLonLat` 坐标 | 可替代 |
| `renderTrack` | Cesium Entity 绘制路线、轨迹、进度、问题 | VectorSource 添加 Feature，进度变化时更新 geometry | 可完全替代 |
| `viewer.zoomTo` | 定位 dataSource | `view.fit(source.getExtent())` | 可完全替代 |
| 弹窗销毁 | `viewer.destroy()` | `map.setTarget(null)` | 可完全替代 |

## 13. 个人中心 `PersonalCenter.vue` 操作评估

| 操作或方法 | 当前行为 | OpenLayers 迁移方案 | 评估 |
|---|---|---|---|
| 页面显示 | 覆盖地图的个人中心占位页 | 保持不变 | 无地图改动 |
| 地图交互 | 无 | 无 | 无需迁移 |

## 14. 数据模型迁移

当前 Cesium Entity/DataSource/Primitive 模型建议统一迁移为 OpenLayers Feature/Layer 模型。

| 当前模型 | 轻量版模型 |
|---|---|
| `viewer.entities` | `VectorSource` |
| `CustomDataSource` | `VectorLayer + VectorSource` |
| `GeoJsonDataSource` | `GeoJSON.readFeatures` |
| `KmlDataSource` | `KML.readFeatures` |
| `Entity.point` | `Feature(Point)` + Style image/circle |
| `Entity.polyline` | `Feature(LineString)` |
| `Entity.polygon` | `Feature(Polygon)` |
| `Entity.rectangle` | `Feature(Polygon fromExtent)` |
| `Entity.ellipse` | `Feature(Circle)` 或采样 Polygon |
| `Entity.label` | Text Style 或 Overlay |
| Entity 私有字段 `_measureData` 等 | Feature properties |
| `dataSource.show` | `layer.setVisible()` |
| `viewer.zoomTo(entity)` | `view.fit(feature.getGeometry().getExtent())` |

建议保留当前私有字段语义，但迁移为 Feature 属性：

```js
feature.setProperties({
  syKind: 'measure',
  syMeasureData: {},
  syMarkPointData: {},
  syShpItemKey: '',
  syKmlItemKey: '',
  syCadItemKey: '',
  djcxNodeId: '',
  djcxFeatureKey: '',
  inspectionType: 'route'
});
```

## 15. 图层分组建议

轻量版应建立统一图层注册表，避免散落 `map.addLayer`。

| 图层组 | 内容 | 层级 |
|---|---|---:|
| `base` | 天地图影像/矢量/注记 | 0 |
| `landPrice` | 地价 GeoJSON 面、标签 | 10 |
| `imports` | SHP、KML、CAD 导入 | 20 |
| `measure` | 测绘点线面和标签 | 30 |
| `query` | 地价查询范围临时图形 | 40 |
| `inspection` | 巡检路线、问题点、轨迹 | 50 |
| `highlight` | 当前选中、高亮对象 | 80 |
| `interaction` | 绘制草图、鼠标辅助线 | 90 |

图层注册表结构示例：

```js
const layerRegistry = new Map();

layerRegistry.set('measure', {
  layer,
  source,
  type: 'vector',
  visible: true,
  featureCount: 0
});
```

## 16. 三维能力降级规则

| Cesium 能力 | 轻量版处理 | 用户可见表现 |
|---|---|---|
| 首页三维地球自转 | Uiverse CSS 地球动效 | 首页仍有地球转动视觉 |
| 三维地形 | 移除 | 不显示“添加地形”或提示轻量版不支持 |
| `tileset.json` 倾斜模型 | 移除原渲染能力 | 提示上传二维数据或等待服务端二维化 |
| 三维模型属性拾取 | 不支持 | 不展示 3D Tiles 属性面板 |
| 相机 pitch/roll | 移除 | 地图保持二维俯视 |
| HDR、阴影、光照、大气 | 移除 | 加载更快，视觉变为普通二维地图 |
| 真实地形高程 | 降级为 `--` 或 DEM 服务 | 标点高程不再由地图引擎直接提供 |
| 三维方量/挖填分析 | 不支持 | 当前面积 * 高度的简易方量可保留 |

## 17. 迁移步骤

### 阶段一：依赖与地图壳替换

1. 安装 `ol`。
2. 移除 Cesium 相关依赖和 Vite 插件。
3. 新建 `useOpenLayers.js`。
4. 新建 `OpenLayersMap.vue`，先完成底图、坐标、比例尺、定位、点击、鼠标移动。
5. `App.vue` 从 `CesiumMap` 切换到 `OpenLayersMap`。

验收：

- 登录后能进入轻量版地图。
- 默认天地图影像可显示。
- 坐标、比例尺、定位、底图切换正常。

### 阶段二：首页替换

1. 使用已新建的 `src/components/homeMap.vue`。
2. 确认 Uiverse 示例已经封装在该组件内。
3. `PortalHome.vue` 引入 `homeMap.vue`。
4. 删除首页 Cesium 地球自转调用。

验收：

- 首页无需 Cesium 即可显示转动地球动效。
- 从首页进入各模块时地图能平滑进入业务区域。

### 阶段三：测绘工具迁移

1. 接入 OpenLayers Draw/Select。
2. 迁移标点、画线、画面、画圆、画矩形。
3. 迁移测距、测面积、简易方量、方位角、夹角。
4. 迁移对象列表、显隐、定位、删除、复制、导出 KML。

验收：

- 所有非三维测绘工具可完成绘制并出结果。
- 结果列表、属性面板、KML 导出正常。

### 阶段四：导入与地价查询迁移

1. SHP 转 GeoJSON 后进入 VectorLayer。
2. KML/KMZ 解析后进入 VectorLayer。
3. CAD/DXF 解析后转换 Feature。
4. 地价菜单树加载要素后转 Feature。
5. 点查、多点、框选、圆选、多边形查询全部改为二维空间计算。

验收：

- 勾选地价节点后要素可显示、可高亮、可查询。
- SHP/KML/CAD 可显示、可定位、可选中、可删除。

### 阶段五：巡检叠加与回放

1. 迁移任务路线渲染。
2. 迁移路线定位、高亮。
3. 迁移问题点展示。
4. 迁移主地图轨迹回放。
5. 迁移独立回放窗口为 OpenLayers。

验收：

- 选择任务后路线显示正常。
- 查看问题、轨迹回放、进度拖动正常。
- 弹窗小地图不再加载 Cesium。

### 阶段六：清理与验收

1. 清理全部 `import * as Cesium from 'cesium'`。
2. 清理全部 `Cesium.*` 调用。
3. 清理 `vite-plugin-cesium` 配置。
4. 清理 Cesium 样式导入。
5. 更新加载页文案。
6. 构建并回归主要业务流程。

验收命令：

```bash
npm run build
```

## 18. 验收清单

| 页面 | 验收项 |
|---|---|
| 登录/加载 | 登录后进入轻量版加载流程，无 Cesium 预热文案 |
| 首页 | Uiverse 地球动效正常转动，首页入口可进入各模块 |
| 通用地图 | 底图切换、定位、坐标、比例尺、指南针可用 |
| 数治测绘 | 标点、线、面、圆、矩形绘制可用 |
| 数治测绘 | 测距、测面积、简易方量、方位角、夹角可用 |
| 数治测绘 | 测绘对象列表显隐、定位、删除、复制、KML 导出可用 |
| 数治测绘 | SHP、KML/KMZ、CAD 导入展示、定位、删除可用 |
| 数治地价 | 菜单树勾选加载数据，点查、多选、框选、圆选、多边形查询可用 |
| 智能分析 | AI 面板可用，分析范围绘制可用 |
| 数据管理 | 巡检任务路线、问题点、轨迹回放可用 |
| 个人中心 | 页面正常覆盖地图，不受地图引擎影响 |
| 三维能力 | 地形、3D Tiles、光照、三维相机能力不出现在轻量版主流程 |

## 19. 风险与处理

| 风险 | 影响 | 处理 |
|---|---|---|
| 业务代码大量直接操作 Cesium Entity | 改造面较大 | 先做 `useOpenLayers` 适配层，再逐步替换 Entity 为 Feature |
| 3D Tiles 数据没有二维替代 | 地形模型无法显示 | 要求服务端提供 GeoJSON/MVT/WMS/WMTS 二维成果，或轻量版隐藏入口 |
| CAD 坐标系复杂 | 位置偏移 | 继续保留现有 `proj4` 坐标配置表单，导入后提供定位校验 |
| 大量 GeoJSON 面导致卡顿 | 低配设备性能下降 | 分层加载、按视野显示、样式缓存、必要时服务端切片为 MVT |
| KMZ 内含图片样式 | 样式还原不完整 | 轻量版优先还原几何与基础属性，复杂图标样式降级 |
| 高程字段缺失 | 标点高程无法显示 | 显示 `--`，或接入 DEM/高程服务作为增强能力 |

## 20. 整体总结

轻量版迁移的核心不是把 Cesium API 一对一改成 OpenLayers API，而是把当前混在 `CesiumMap.vue` 里的地图引擎能力抽成二维 Feature/Layer/Interaction 模型。

OpenLayers 可以完整承接本项目绝大多数业务操作：底图、坐标、比例尺、定位、绘制、量测、地价查询、文件导入、巡检路线、轨迹回放都能正常实现。需要明确剥离的是三维能力：地形、3D Tiles、三维光照、相机俯仰和三维拾取。

首页原本依赖 Cesium 的地球自转，在轻量版中改为 Uiverse 动效组件：<https://uiverse.io/Lakshay-art/soft-dingo-98>。这样首页仍保留“地球转动”的视觉记忆，但业务地图从三维场景切换为轻量二维地图，整体启动更快、依赖更少、低配设备更稳定。
