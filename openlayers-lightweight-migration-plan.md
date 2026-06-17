# OpenLayers 轻量版并存迁移方案

## 迁移工作记录

> 本文档既是迁移方案，也是后续执行阶段的工作记录。每次开始执行某个阶段、修改文件、新增能力、完成验证或发现遗留问题，都必须在本节追加记录。

### 2026-06-16 方案修正

当前策略：

1. 保留 Cesium 高性能版，不删除 `cesium`、`vite-plugin-cesium`、`tdt-terrain-cesium-plugin`，不移除 Vite Cesium 插件配置。
2. 新增 OpenLayers 轻量版，与 Cesium 高性能版并存；运行时由登录后的加载页检测本机硬件并给出推荐。
3. 加载页提供两个入口按钮：`OpenLayers 轻量版` 和 `Cesium 高性能版`。系统只高亮推荐项，不强制自动进入。
4. 分流默认规则：`balanced`、`high`、`flagship` 推荐 Cesium；`conservative`、`low` 推荐 OpenLayers。
5. 用户手动选择版本后，将选择记录到本机 `localStorage`，推荐 key 为 `szkj:preferred-map-engine`，值为 `openlayers` 或 `cesium`。
6. 所有 UI 布局保持现状；轻量版只替换调用 Cesium 方法的地方。三维专属能力在轻量版中按钮置灰不可点，并给出轻量版不支持提示。
7. 首页地球旋转统一使用 `src/components/homeMap.vue` 组件，轻量版不初始化 Cesium 首页地球。

已完成：

| 时间 | 阶段 | 当前修改 | 新增/调整 | 完成功能 | 验证 | 遗留问题 |
|---|---|---|---|---|---|---|
| 2026-06-16 | 阶段一：方案修正 | 修正 `openlayers-lightweight-migration-plan.md` 的迁移目标、依赖边界、加载页分流策略、页面方法评估和阶段任务 | 文档明确 Cesium/OpenLayers 双版本并存；明确本机选择记忆；明确三维能力置灰规则 | 已完成并存迁移方案修正 | 已检查，无“删除 Cesium 依赖/Vite 插件”的执行建议残留 | 后续阶段尚未执行代码实现 |
| 2026-06-16 | 阶段二：轻量版入口与加载页 | `src/App.vue` 改为按用户选择挂载 `CesiumMap` / `OpenLayersMap`；`src/components/LoadingPage.vue` 改为检测后展示双版本入口卡片并记忆本机选择；`src/utils/deviceProfile.js` 新增推荐引擎解析；新增 `src/components/OpenLayersMap.vue` 作为轻量版入口壳 | 支持检测后手动进入两个版本；`balanced/high/flagship` 推荐 Cesium，`conservative/low` 推荐 OpenLayers；WebGL 不可用时仍可进入轻量版 | 阶段二核心入口链路已落地 | `npm.cmd run build` 成功 | 轻量版地图壳目前仅完成初始化与 ready 回调，后续阶段继续补全业务能力 |
| 2026-06-16 | 阶段四：二维地图操作迁移 | 按“抽共享壳”策略新增 `MapWorkspaceShell.vue` 边界；`CesiumMap.vue` 在轻量版下改为委派 OpenLayers 绘测、导入、地价控制器，保留现有 UI 壳和 Cesium 原逻辑 | 新增 `useOpenLayersDrawing.js`、`useOpenLayersImports.js`、`useOpenLayersLandPrice.js`；扩展 `mapGeometry.js` 的 OpenLayers KML 导出；扩展 `mapFeatureStyle.js` 的测绘/导入/地价/查询样式 | 轻量版支持标点、线/面/圆/矩形、测距/测面/方量/方位角/夹角，支持 SHP/KML/KMZ/CAD 导入显隐选中定位删除，支持地价节点加载、点选/多选/矩形/圆形/多边形查询和高亮 | `npm.cmd run build` 成功；dev server 在 `127.0.0.1:5173` 受权限限制，`127.0.0.1:5188` 可启动但 in-app browser 本地访问被拦截 | 仍需用真实业务数据在浏览器中手工验收 SHP/KMZ/DXF 解析、地价结果字段和 Cesium 高性能版回归 |

执行阶段记录模板：

| 时间 | 阶段 | 当前正在修改 | 新增文件 | 修改文件 | 完成功能 | 验证结果 | 遗留问题 |
|---|---|---|---|---|---|---|---|
| 待填写 | 待填写 | 待填写 | 待填写 | 待填写 | 待填写 | 待填写 | 待填写 |

## 1. 目标与边界

本方案目标不是把项目整体从 Cesium 替换成 OpenLayers，也不是移除 Cesium 依赖和 Vite 插件。目标是在同一套平台 UI 下并存两个地图运行版本：

| 版本 | 地图引擎 | 使用场景 | 处理原则 |
|---|---|---|---|
| Cesium 高性能版 | Cesium | 硬件配置足够、需要三维地形、3D Tiles、真实高程、三维视角时使用 | 保留现有 `CesiumMap.vue` 和 `useCesium.js` 能力 |
| OpenLayers 轻量版 | OpenLayers | 低配电脑、WebGL 压力大、需要更快进入二维业务地图时使用 | 新增轻量版地图壳，只替换地图方法调用，UI 保持一致 |

轻量版必须支持的能力：

| 能力类型 | 轻量版要求 |
|---|---|
| 二维底图 | 支持影像、矢量、注记等底图切换 |
| 二维交互 | 支持缩放、平移、坐标显示、比例尺、定位 |
| 二维绘制 | 支持标点、画线、画面、画圆、画矩形 |
| 二维量测 | 支持测距、测面、方位角、夹角；方量仅按二维面积乘输入高度估算 |
| 文件导入 | 支持 SHP、KML/KMZ、CAD/DXF 解析后的二维展示、定位、显隐、删除 |
| 地价查询 | 支持点选、矩形、圆形、多边形等二维 Feature 查询 |
| 巡检业务 | 支持路线、问题点、轨迹、回放进度点二维渲染 |
| 首页地球 | 使用 `homeMap.vue` 视觉动效组件，不依赖 Cesium |

轻量版不支持或降级的能力：

| 三维能力 | 轻量版处理 |
|---|---|
| Cesium 地球自转 | 使用 `homeMap.vue` 替代 |
| 三维地形 | 按钮置灰不可点，提示“轻量版不支持三维地形” |
| `tileset.json` / 3D Tiles 倾斜模型 | 按钮置灰不可点；如后续有二维轮廓服务，可作为二维图层加载 |
| 三维真实高程拾取 | 高程显示为 `--` 或 `0`，不承诺真实高程 |
| HDR、阴影、光照、大气 | 轻量版不展示相关配置 |
| 相机 pitch/roll、三维俯仰 | OpenLayers 保持二维俯视，仅支持 view rotation |
| 三维对象拾取 | 仅支持二维 Feature 拾取 |

## 2. 依赖与并存策略

依赖处理原则：

| 文件/依赖 | 当前职责 | 并存迁移处理 |
|---|---|---|
| `package.json` 中的 `cesium` | Cesium 高性能版地图引擎 | 保留 |
| `package.json` 中的 `vite-plugin-cesium` | Cesium Vite 构建支持 | 保留 |
| `package.json` 中的 `tdt-terrain-cesium-plugin` | 天地图三维地形支持 | 保留 |
| `package.json` 中的 `ol` | OpenLayers 轻量版地图引擎 | 保留或新增 |
| `vite.config.js` | Cesium 插件、构建配置、base 配置 | 保留 Cesium 插件配置，不做删除 |
| `src/main.js` | 全局样式入口 | 同时保留 `ol/ol.css` 与 `cesium/Source/Widgets/widgets.css` |
| `src/components/CesiumMap.vue` | 高性能版主地图壳 | 保留，后续只在必要时补充与入口选择相关的 props/事件 |
| `src/composables/useCesium.js` | Cesium Viewer、地形、Tileset、相机、性能监控 | 保留 |
| `src/components/OpenLayersMap.vue` | 轻量版主地图壳 | 新增，与 `CesiumMap.vue` 并行 |
| `src/composables/useOpenLayers.js` | OpenLayers 地图封装 | 新增或补齐 |

禁止事项：

1. 不删除 Cesium 依赖。
2. 不删除 Vite Cesium 插件。
3. 不把 `CesiumMap.vue` 改造成 OpenLayers 组件。
4. 不改变现有业务 UI 的布局、图标、弹窗和面板结构。
5. 不用隐藏按钮代替降级；三维不可用按钮应置灰不可点，并给出提示。

## 3. 运行时分流与加载页方案

### 3.1 入口状态

建议在 `App.vue` 增加以下运行态：

| 状态 | 类型 | 说明 |
|---|---|---|
| `selectedMapEngine` | `ref('')` | 当前实际进入的地图版本：`openlayers` 或 `cesium` |
| `recommendedMapEngine` | `ref('')` | 硬件检测后推荐版本 |
| `preferredMapEngine` | `ref('')` | 本机 `localStorage` 记录的上次手动选择 |
| `mapShouldMount` | `ref(false)` | 用户选择版本后才挂载地图组件 |
| `deviceProfile` | `ref(null)` | 设备检测结果，供加载页展示和 Cesium 渲染档位使用 |
| `renderPreset` | `ref(null)` | Cesium 渲染预设；轻量版可忽略或读取轻量策略 |

`App.vue` 挂载规则：

```vue
<CesiumMap
  v-if="mapShouldMount && selectedMapEngine === 'cesium'"
  :device-profile="deviceProfile"
  :render-preset="renderPreset"
  @ready="onMapReady"
  @logout="onLogout"
/>

<OpenLayersMap
  v-if="mapShouldMount && selectedMapEngine === 'openlayers'"
  :device-profile="deviceProfile"
  @ready="onMapReady"
  @logout="onLogout"
/>
```

### 3.2 硬件推荐规则

继续复用 `src/utils/deviceProfile.js` 的硬件检测能力，但输出结果用于推荐版本，而不是强制进入。

| `benchmark.tierKey` | 推荐版本 |
|---|---|
| `flagship` | Cesium 高性能版 |
| `high` | Cesium 高性能版 |
| `balanced` | Cesium 高性能版 |
| `conservative` | OpenLayers 轻量版 |
| `low` | OpenLayers 轻量版 |
| WebGL 不可用或检测异常 | OpenLayers 轻量版 |

推荐函数建议：

```js
function resolveRecommendedMapEngine(profile) {
  const tier = profile?.benchmark?.tierKey;
  return ['balanced', 'high', 'flagship'].includes(tier) ? 'cesium' : 'openlayers';
}
```

### 3.3 本机选择记忆

| 配置 | 建议值 |
|---|---|
| localStorage key | `szkj:preferred-map-engine` |
| 可选值 | `openlayers`、`cesium` |
| 写入时机 | 用户点击加载页版本入口后 |
| 读取时机 | 加载页展示按钮时 |
| 使用方式 | 有本机偏好时可标注“上次选择”，但仍展示硬件推荐 |

选择优先级：

1. 用户当前点击的版本最高优先级。
2. 加载页展示时，高亮硬件推荐项，同时显示本机上次选择标识。
3. 不自动进入任何版本，必须由用户点击 `OpenLayers 轻量版` 或 `Cesium 高性能版`。

### 3.4 加载页 UI 行为

`LoadingPage.vue` 保持现有视觉风格，在检测完成后展示两个主按钮：

| 按钮 | 行为 | 推荐态 | 禁用规则 |
|---|---|---|---|
| `OpenLayers 轻量版` | emit `enter-engine`，payload 为 `{ engine: 'openlayers' }` | 低配或 WebGL 异常时高亮推荐 | 不禁用 |
| `Cesium 高性能版` | emit `enter-engine`，payload 为 `{ engine: 'cesium' }` | `balanced/high/flagship` 时高亮推荐 | WebGL 不可用时可置灰，并提示需要 WebGL |
| `重新检测` | 清除检测缓存后重新跑分 | 无 | 不禁用 |

加载文案调整：

| 当前文案含义 | 并存方案文案 |
|---|---|
| 正在为当前设备匹配三维地图性能参数 | 正在为当前设备匹配地图版本 |
| 正在预热 Cesium 资源 | 正在生成地图版本推荐 |
| 正在进入三维场景 | 请选择进入的地图版本 |
| 等待 Cesium ready | 等待所选地图版本就绪 |

## 4. 首页地球旋转方案

首页视觉地球统一使用 `src/components/homeMap.vue`：

| 场景 | Cesium 高性能版 | OpenLayers 轻量版 |
|---|---|---|
| 平台首页显示 | 可继续使用现有 Cesium 首页场景，也可统一切换为 `homeMap.vue` | 必须使用 `homeMap.vue` |
| 地球自转 | Cesium 相机旋转或 `homeMap.vue` | `homeMap.vue` CSS 动效 |
| 进入业务模块 | Cesium `flyToOnLeaveHome` | OpenLayers `view.animate` |
| 返回首页 | Cesium `enterHomeScene` 或首页 UI 状态 | 显示 `homeMap.vue`，地图交互隐藏或保持后台 |

轻量版要求：

1. 不调用 `enterHomeScene`、`startHomeEarthRotation`、`restoreInitialHomeCameraView` 等 Cesium 首页方法。
2. `PortalHome.vue` 的指标、快捷入口、右侧图表 UI 保持不变。
3. 在 `PortalHome.vue` 中挂载或透传 `homeMap.vue`，确保首页地球转动可见。

## 5. 地图引擎方法总评估

| Cesium 方法/能力 | 当前用途 | OpenLayers 替代方案 | 轻量版结论 | UI 处理 |
|---|---|---|---|---|
| `initCesium` | 初始化 Cesium Viewer | `initOpenLayers` 创建 `ol/Map` | 可替代 | 无 UI 改动 |
| `destroyCesium` | 销毁 Viewer、事件、资源 | `destroyOpenLayers` + `map.setTarget(null)` | 可替代 | 无 UI 改动 |
| `getViewer` | 获取 Viewer | `getMap` | 可替代 | 无 UI 改动 |
| `setRenderPreset` | DPR、阴影、HDR、Tileset 细节 | 轻量版仅保留像素比、最大 Feature 数、聚合阈值等策略 | 降级 | 性能面板改文案 |
| `subscribePerformanceStats` | FPS、相机、地形、Primitive、Tileset | 统计 FPS、图层数、Feature 数、交互状态 | 降级 | 三维指标隐藏或显示 `--` |
| `addVecLayer` / `addCvaLayer` | 天地图矢量与注记 | `TileLayer + XYZ/WMTS` | 可替代 | 无 UI 改动 |
| `addImgLayer` / `addCiaLayer` | 天地图影像与注记 | `TileLayer + XYZ/WMTS` | 可替代 | 无 UI 改动 |
| `remove*Layer` | 移除底图图层 | `map.removeLayer` 或 `layer.setVisible(false)` | 可替代 | 无 UI 改动 |
| `showGlobalImageryLayer` | 显示 Cesium 默认影像 | 显示 OpenLayers 默认底图组 | 可替代 | 文案改为“影像底图” |
| `hideGlobalImageryLayer` | 隐藏 Cesium 默认影像 | 隐藏对应 TileLayer | 可替代 | 无 UI 改动 |
| `enableNetworkTerrain` | 开启三维地形 | 不支持 | 不可用 | 按钮置灰 |
| `disableTerrain` | 关闭三维地形 | 轻量版无真实地形 | 不可用/降级 | 三维地形项置灰 |
| `add3DTileset` | 加载倾斜模型 | 不支持 3D Tiles；仅可加载服务端二维轮廓 | 不可用 | 上传/确认按钮置灰 |
| `remove3DTileset` | 删除倾斜模型 | 删除列表记录或二维轮廓图层 | 降级 | 删除记录可用 |
| `set3DTilesetStyle` | 3D Tiles 样式 | 二维 Feature style | 仅二维替代 | 3D 样式入口置灰 |
| `addClickHandler` | Cesium 拾取 Entity/Tileset | `map.forEachFeatureAtPixel` | 二维可替代 | 无 UI 改动 |
| `removeClickHandler` | 移除点击事件 | `unByKey` | 可替代 | 无 UI 改动 |
| `addMouseMoveHandler` | 鼠标经纬度/高程 | `toLonLat(map.getCoordinateFromPixel())` | 可替代，高程降级 | 高程显示 `--` |
| `addHeadingUpdateHandler` | 相机 heading | `view.getRotation()` | 二维旋转可替代 | 指南针保留 |
| `addScaleUpdateHandler` | 比例尺/层级 | `view.getResolution()` | 可替代 | 无 UI 改动 |
| `enterHomeScene` | 首页三维地球视角 | 显示 `homeMap.vue` | 替换 | 无 UI 改动 |
| `stopHomeEarthRotation` | 停止 Cesium 地球旋转 | 停止或隐藏 CSS 动效 | 替换 | 无 UI 改动 |
| `flyToOnLeaveHome` | 从首页飞行业务区 | `view.animate({ center, zoom })` | 二维可替代 | 无 UI 改动 |
| `zoomToTargetPreservePitch` | 定位对象并保持 pitch | `view.fit(extent, padding)` | 可替代，pitch 移除 | 无 UI 改动 |

## 6. 页面级评估

### 6.1 登录页与加载页

| 页面/方法 | 当前行为 | 轻量版并存方案 | 结论 | UI 处理 |
|---|---|---|---|---|
| `Login.vue` 登录成功 | emit success，进入加载页 | 保持不变 | 无地图改动 | UI 不变 |
| `App.vue startLoadingFlow` | 重置状态并显示加载页 | 额外重置 `selectedMapEngine`、`recommendedMapEngine` | 需要调整 | UI 不变 |
| `App.vue onProfileReady` | profile ready 后挂载 CesiumMap | 只保存检测结果和推荐版本，不立即挂载地图 | 需要调整 | UI 不变 |
| `App.vue enterSystem` | Cesium ready 后关闭加载页 | 改为所选地图 ready 后关闭加载页 | 需要调整 | UI 不变 |
| `LoadingPage.vue runDetection` | 检测 WebGL、CPU、GPU 并输出 Cesium preset | 保留检测，输出推荐版本和两个入口 | 需要调整 | 增加双按钮 |
| `LoadingPage.vue enter-basic` | 超时后进入基础模式 | 改为进入 OpenLayers 轻量版 | 需要调整 | 文案改为轻量版 |
| `deviceProfile.js buildRenderPreset` | 生成 Cesium 渲染档位 | 保留给 Cesium；新增推荐地图版本函数或在 LoadingPage 内计算 | 需要调整 | 无 UI 改动 |

### 6.2 平台首页 `PortalHome.vue`

| 操作/方法 | 当前行为 | OpenLayers 轻量版方案 | 结论 | UI 处理 |
|---|---|---|---|---|
| 首页展示 | Cesium 地球作为视觉背景，叠加首页 UI | 使用 `homeMap.vue` 作为地球旋转视觉组件 | 可替代 | UI 不变 |
| `enter-module` | 触发 `enterModule`，Cesium 飞行到业务区 | 触发 OpenLayers `view.animate` 到业务中心 | 可替代 | UI 不变 |
| 快捷入口按钮 | 切换顶部模块 | 保持 Vue 状态切换 | 可保留 | UI 不变 |
| 首页性能检测胶囊 | 显示性能检测已开启 | 轻量版显示 OpenLayers 图层/Feature/FPS 概览 | 降级 | 文案可改 |
| 首页图表与指标 | Vue 静态/业务数据展示 | 与地图引擎无关 | 可保留 | UI 不变 |

### 6.3 数治测绘 `Home.vue`

#### 绘制工具

| 工具/方法 | 当前 Cesium 行为 | OpenLayers 替代 | 结论 | UI 处理 |
|---|---|---|---|---|
| `startTool('markPoint')` | 点击地球添加点 Entity | `Draw({ type: 'Point' })` 或 click 添加 Feature | 可替代 | UI 不变 |
| `startTool('drawLine')` | 创建 Polyline Entity | `Draw({ type: 'LineString' })` | 可替代 | UI 不变 |
| `startTool('drawPolygon')` | 创建 Polygon Entity | `Draw({ type: 'Polygon' })` | 可替代 | UI 不变 |
| `startTool('drawCircle')` | 创建 Ellipse/Circle Entity | `Draw({ type: 'Circle' })`，导出时转 Polygon | 可替代 | UI 不变 |
| `startTool('drawRect')` | 用 Cesium Rectangle 绘制 | `Draw` geometryFunction 或拖拽生成 Polygon | 可替代 | UI 不变 |
| `resetDrawing` | 清除临时 Entity 和 Cesium handler | 移除当前 interaction，清理 sketch Feature | 可替代 | UI 不变 |
| `createTempEntity` | 创建动态 Cesium Entity | 创建 sketch Feature 和临时样式 | 可替代 | UI 不变 |
| `updateTempEntity` | 鼠标移动更新动态 Entity | Draw interaction 自动维护或 pointermove 更新 Feature | 可替代 | UI 不变 |
| `finalizeDrawing` | 固化 Entity，写入测绘列表 | 固化 Feature，写入测绘列表 | 可替代 | UI 不变 |

#### 量测工具

| 工具/方法 | 当前 Cesium 行为 | OpenLayers 替代 | 结论 | UI 处理 |
|---|---|---|---|---|
| `measureDistance` | EllipsoidGeodesic 测距 | `ol/sphere.getLength` | 可替代 | UI 不变 |
| `measureArea` | PolygonHierarchy + 面积计算 | `ol/sphere.getArea` 或 Turf | 可替代 | UI 不变 |
| `measureVolume` | 面积 * 输入高度估算方量 | OpenLayers 面积 * 输入高度 | 可替代，但非真实三维方量 | 保留按钮和说明 |
| `measureAzimuth` | 两点方位角 | 经纬度公式计算 | 可替代 | UI 不变 |
| `measureAngle` | 三点夹角 | 平面向量夹角或地理计算 | 可替代 | UI 不变 |
| `copyCoords` | 复制点坐标和高程 | 复制经纬度，高程为 `--` 或 `0` | 降级 | UI 不变 |
| `exportCurrentKml` | Entity 转 KML | Feature/Geometry 转 KML | 可替代 | UI 不变 |
| `deleteCurrentMeasure` | 删除 Entity | 删除 Feature | 可替代 | UI 不变 |
| `clearAllMeasures` | 删除所有测绘 Entity | 清空测绘 VectorSource | 可替代 | UI 不变 |

#### 测绘对象管理

| 方法 | 当前行为 | OpenLayers 替代 | 结论 | UI 处理 |
|---|---|---|---|---|
| `registerMeasureEntity` | Entity 写入测绘列表 | Feature 写入测绘列表 | 可替代 | UI 不变 |
| `registerMarkPointEntity` | 点 Entity 写入列表 | 点 Feature 写入列表 | 可替代 | UI 不变 |
| `setMeasureEntityVisible` | Entity show 开关 | Feature `visible` 属性或分组 source 控制 | 可替代 | UI 不变 |
| `setEntityHighlight` | 修改 Entity 材质/颜色 | Feature selected style 或 highlight layer | 可替代 | UI 不变 |
| `selectSyInfoItem` | 定位并选中对象 | `view.fit` 或 `animateTo` + selected style | 可替代 | UI 不变 |
| `deleteSyInfoItem` | 删除 Entity/DataSource/Tileset | 删除 Feature/Layer/记录 | 可替代，三维记录降级 | 三维记录置灰或仅删除记录 |

#### 地形和模型入口

| 操作/方法 | 当前 Cesium 行为 | OpenLayers 轻量版方案 | 结论 | UI 处理 |
|---|---|---|---|---|
| `openTerrainPanel` | 打开地形/tileset 输入面板 | 轻量版不支持三维地形/3D Tiles | 不可用 | 按钮置灰不可点 |
| `confirmTerrain` | 开启网络地形或加载 3D Tiles | 不执行地图加载 | 不可用 | 面板入口置灰 |
| `closeTerrain` | 关闭地形和模型 | 轻量版无三维模型 | 不可用 | 置灰 |
| `toggleSyInfoItem(kind='terrain-network')` | 开关网络地形 | 不显示或置灰该项 | 不可用 | 置灰 |
| `deleteTerrainModelItem` | 删除 3D Tileset | 删除已保存记录即可 | 降级 | 删除记录可用 |

#### 文件导入

| 导入/方法 | 当前 Cesium 行为 | OpenLayers 替代 | 结论 | UI 处理 |
|---|---|---|---|---|
| `confirmShpImport` | `shpjs` 转 GeoJSON，加载 Cesium DataSource | `shpjs` 转 GeoJSON，`ol/format/GeoJSON` 转 Feature | 可替代 | UI 不变 |
| `styleImportedShpDataSource` | 设置 Cesium Entity 样式 | 设置 VectorLayer style | 可替代 | UI 不变 |
| `openShpFeaturePopup` | 展示 SHP 属性浮窗 | 保留 Vue 浮窗，数据来自 Feature properties | 可替代 | UI 不变 |
| `confirmKmlImport` | KML/KMZ 加载到 Cesium | `ol/format/KML` 读取 Feature | 可替代 | UI 不变 |
| `confirmCadImport` | DXF 解析后生成 Entity | DXF 解析后生成 Feature | 可替代 | UI 不变 |
| `cadApplyTransformParams` | CAD 坐标转换 | 继续使用 `proj4`，输出 OpenLayers 坐标 | 可替代 | UI 不变 |
| `deleteShpImportItem` | 移除 DataSource | 移除 Layer 或清空 Source | 可替代 | UI 不变 |
| `deleteKmlImportItem` | 移除 DataSource | 移除 Layer 或清空 Source | 可替代 | UI 不变 |
| `deleteCadImportItem` | 移除 DataSource | 移除 Layer 或清空 Source | 可替代 | UI 不变 |

### 6.4 数治地价 `LandPriceQuery.vue`

#### 图层树与数据加载

| 方法/操作 | 当前 Cesium 行为 | OpenLayers 替代 | 结论 | UI 处理 |
|---|---|---|---|---|
| `toggle-gongneng` | 展开/收起地价面板 | 与地图引擎无关 | 可保留 | UI 不变 |
| `setGroupItems` | 批量勾选节点 | 批量设置 Feature 分组 visible | 可替代 | UI 不变 |
| `toggleTab2Folder` | 展开/收起节点 | 与地图引擎无关 | 可保留 | UI 不变 |
| `node-features-change` | 请求并加载节点 Feature | 加载到 `landPrice` VectorSource | 可替代 | UI 不变 |
| `djcxAddNodeFeatures` | GeoJSONDataSource.load 到 Cesium | GeoJSON format 读取 Feature | 可替代 | UI 不变 |
| `djcxRemoveNodeFeatures` | 移除 Cesium DataSource | 从 source 删除 nodeId Feature | 可替代 | UI 不变 |
| `setDjcxDataSourcesVisible` | DataSource show 开关 | Feature/Layer visible 开关 | 可替代 | UI 不变 |

#### 查询工具

| 工具/方法 | 当前 Cesium 行为 | OpenLayers 替代 | 结论 | UI 处理 |
|---|---|---|---|---|
| `startTool('dianxuan')` | Cesium click pick 点选 | `forEachFeatureAtPixel` 点选 | 可替代 | UI 不变 |
| `startTool('duodian')` | 多点选择/查询 | 维护多选 Feature 集合 | 可替代 | UI 不变 |
| `startTool('dianPolygon')` | 绘制多边形查询 | `Draw Polygon` + Turf/geometry intersects | 可替代 | UI 不变 |
| `startTool('dianCircle')` | 绘制圆形查询 | `Draw Circle` + 半径过滤 | 可替代 | UI 不变 |
| `startTool('dianRect')` | 绘制矩形查询 | 拖拽 extent 或矩形 Polygon | 可替代 | UI 不变 |
| `djcxQueryPoint` | 判断点是否落入 Entity geometry | `feature.getGeometry().intersectsCoordinate` 或 Turf | 可替代 | UI 不变 |
| `djcxQueryRect` | 矩形范围查询 | `geometry.intersectsExtent` | 可替代 | UI 不变 |
| `djcxQueryCircle` | 中心点半径查询 | 距离过滤 + geometry 相交 | 可替代 | UI 不变 |
| `djcxQueryPolygon` | 多边形查询 | Turf booleanIntersects/within | 可替代 | UI 不变 |
| `djcxShowFeatureInPanel` | Cesium Entity 属性入面板 | Feature properties 入面板 | 可替代 | UI 不变 |
| `djcxShowFeaturesInTable` | 多结果表格 | Feature properties 表格 | 可替代 | UI 不变 |

#### 样式与标签

| 方法 | 当前 Cesium 行为 | OpenLayers 替代 | 结论 | UI 处理 |
|---|---|---|---|---|
| `djcxApplyEntityStyle` | Polygon material/outline/label | Feature style function | 可替代 | UI 不变 |
| `djcxSetOutlineHighlightForEntity` | 修改 outline 高亮 | selected style 或 highlight layer | 可替代 | UI 不变 |
| `djcxPickLabelLonLat` | 计算标签点 | 继续使用几何中心/避让计算，输出 Feature label | 可替代 | UI 不变 |
| `djcxColorForLevel` | 等级颜色 | 继续复用颜色逻辑，输出 CSS color | 可替代 | UI 不变 |

### 6.5 智能分析 `SmartAnalysis.vue`

| 操作/方法 | 当前行为 | OpenLayers 轻量版方案 | 结论 | UI 处理 |
|---|---|---|---|---|
| 顶部 AI 按钮 | 打开 AI 对话 | 与地图引擎无关 | 可保留 | UI 不变 |
| `startTool('ai')` | 激活 AI 工具状态 | 保留状态；如需要圈选区域，接入 OpenLayers Draw | 可替代 | UI 不变 |
| `sendAiMessage` | 发送消息 | 与地图引擎无关 | 可保留 | UI 不变 |
| AI 对话拖拽/缩放 | Vue + GSAP 动画 | 与地图引擎无关 | 可保留 | UI 不变 |
| 地图分析结果定位 | Cesium flyTo/Entity 高亮 | OpenLayers `fit/animateTo` + Feature 高亮 | 可替代 | UI 不变 |

### 6.6 数据管理 `DataManagement.vue` 与巡检

#### 数据管理页

| 操作/方法 | 当前行为 | OpenLayers 轻量版方案 | 结论 | UI 处理 |
|---|---|---|---|---|
| `openInspectionTasks` | 打开巡检任务面板 | 与地图引擎无关 | 可保留 | UI 不变 |
| `handleInspectionTaskSelected` | 主地图渲染巡检路线 | VectorLayer 渲染路线 | 可替代 | UI 不变 |
| `handleInspectionTaskCleared` | 清除巡检叠加 | 清空 inspection source | 可替代 | UI 不变 |
| `handleInspectionRouteLocate` | 定位巡检路线 | `view.fit(route extent)` | 可替代 | UI 不变 |
| `handleInspectionRouteIssues` | 展示问题点 | Point Feature + label | 可替代 | UI 不变 |
| `handleInspectionTrackShow` | 显示轨迹 | LineString Feature + 当前点 Feature | 可替代 | UI 不变 |
| `handleInspectionTrackProgress` | 更新回放进度 | 更新进度 LineString 和 marker | 可替代 | UI 不变 |
| `handleInspectionTrackHide` | 隐藏轨迹 | 清除回放 Feature | 可替代 | UI 不变 |

#### 巡检地图叠加方法

| 方法 | 当前 Cesium 行为 | OpenLayers 替代 | 结论 | UI 处理 |
|---|---|---|---|---|
| `ensureInspectionDataSource` | 创建 Cesium CustomDataSource | 创建或获取 VectorSource/VectorLayer | 可替代 | UI 不变 |
| `toInspectionPositions` | 转 Cartesian3 | 转 `fromLonLat` 坐标数组 | 可替代 | UI 不变 |
| `createInspectionRouteEntity` | 创建 Polyline/Label Entity | 创建 LineString Feature + label 属性 | 可替代 | UI 不变 |
| `renderInspectionTaskRoutes` | 渲染任务线路 | 添加路线 Feature | 可替代 | UI 不变 |
| `highlightInspectionRoute` | 高亮路线 Entity | 设置 selected 属性或高亮图层 | 可替代 | UI 不变 |
| `focusInspectionTarget` | `zoomToTargetPreservePitch` | `view.fit` | 可替代 | UI 不变 |
| `renderInspectionIssues` | 添加问题点 Entity | 添加 Point Feature | 可替代 | UI 不变 |
| `renderInspectionPlayback` | 添加轨迹、进度、marker Entity | 添加/更新 LineString 和 Point Feature | 可替代 | UI 不变 |

#### 独立轨迹回放窗口

| 组件/方法 | 当前行为 | OpenLayers 替代 | 结论 | UI 处理 |
|---|---|---|---|---|
| `InspectionPlaybackWindow.vue` | 内部初始化 Cesium Viewer | 内部初始化 OpenLayers Map | 需要改造 | 弹窗 UI 不变 |
| `renderPlayback` | 绘制路线、轨迹、进度、问题点 | VectorLayer 多 Feature 渲染 | 可替代 | UI 不变 |
| `viewer.flyTo` | 自动定位路线 | `view.fit(source extent)` | 可替代 | UI 不变 |
| `destroy viewer` | 销毁 Cesium Viewer | `map.setTarget(null)` | 可替代 | UI 不变 |

### 6.7 个人中心 `PersonalCenter.vue`

| 操作 | 当前行为 | OpenLayers 轻量版方案 | 结论 | UI 处理 |
|---|---|---|---|---|
| 页面展示 | 用户中心 UI | 与地图引擎无关 | 可保留 | UI 不变 |
| 顶部 Tab 切换 | 切换 activeTopTab | 与地图引擎无关 | 可保留 | UI 不变 |
| 返回其他地图模块 | Cesium 可飞行 | OpenLayers `animateTo` | 可替代 | UI 不变 |

## 7. OpenLayers 轻量版架构

### 7.1 新增/补齐文件建议

| 文件 | 职责 |
|---|---|
| `src/components/OpenLayersMap.vue` | 轻量版主地图壳，复用现有页面组件和 UI 状态，只替换地图引擎调用 |
| `src/composables/useOpenLayers.js` | OpenLayers 初始化、底图、事件、比例尺、定位、图层管理 |
| `src/composables/useOpenLayersDrawing.js` | 绘制、量测、查询绘制 interaction |
| `src/composables/useOpenLayersImports.js` | SHP/KML/CAD Feature 加载、样式、显隐、删除 |
| `src/composables/useOpenLayersLandPrice.js` | 地价图层、查询、高亮、结果面板数据适配 |
| `src/composables/useOpenLayersInspection.js` | 巡检路线、问题点、轨迹、回放进度渲染 |
| `src/utils/mapGeometry.js` | 距离、面积、方位角、夹角、圆转面、KML 导出等纯计算 |
| `src/utils/mapFeatureStyle.js` | 轻量版点线面、导入、地价、巡检、选中样式 |

### 7.2 轻量版主组件职责

`OpenLayersMap.vue` 应复用 `CesiumMap.vue` 的页面组织方式：

1. 顶部标题栏、Tab、用户信息、退出按钮保持一致。
2. `PortalHome`、`Home`、`LandPriceQuery`、`SmartAnalysis`、`DataManagement`、`PersonalCenter` 继续作为子组件使用。
3. 地图容器从 `#cesiumContainer` 改为 `#openlayersContainer`。
4. 底部经纬度、比例尺、图层面板、定位按钮、指南针继续保留。
5. 三维功能按钮保留视觉位置，但置灰不可点。
6. 通过 `emit('ready')` 通知加载页轻量版已可进入。

### 7.3 数据模型映射

| Cesium 数据对象 | OpenLayers 数据对象 | 迁移说明 |
|---|---|---|
| `Entity` | `Feature` | 测绘、导入、地价、巡检对象统一 Feature 化 |
| `CustomDataSource` | `VectorSource + VectorLayer` | 按业务分组建 source/layer |
| `Cartesian3` | `EPSG:3857 coordinate` | UI 展示前用 `toLonLat` 转经纬度 |
| `Cartographic` | `{ lon, lat, height }` | height 在轻量版为 `0` 或 `null` |
| `Color` | CSS color string | 样式统一交给 `Style` |
| `PolylineGraphics` | `LineString` | 绘制线、路线、轨迹 |
| `PolygonGraphics` | `Polygon` | 地价面、测绘面、查询面 |
| `LabelGraphics` | `Text style` 或 Vue 浮层 | 简单标签用 style，复杂弹窗保留 Vue |
| `HeadingPitchRange` | `fit options` | pitch 不迁移 |

## 8. 三维能力置灰规则

轻量版不可用按钮必须满足：

1. 保留原位置和视觉层级，避免 UI 结构变化。
2. 增加 `disabled`、置灰样式和 `cursor: not-allowed`。
3. 点击不触发原 Cesium 方法。
4. 悬浮或点击提示：“轻量版不支持三维能力，请在加载页选择 Cesium 高性能版。”

置灰清单：

| 页面 | 按钮/入口 | 原能力 | 轻量版处理 |
|---|---|---|---|
| 数治测绘 | 添加地形 | 网络三维地形、3D Tiles | 置灰不可点 |
| 数治测绘 | 地形面板确定 | 加载 terrain/tileset | 置灰不可点 |
| 图层/对象列表 | 网络地形项 | 显隐地形 | 置灰或不显示 |
| 图层/对象列表 | 倾斜模型项 | 定位/显隐 3D Tiles | 置灰，删除记录可保留 |
| 性能面板 | 地形/Tileset/HDR/阴影指标 | Cesium 渲染指标 | 显示 `--` 或替换为 OpenLayers 指标 |
| 首页 | Cesium 地球自转控制 | 相机旋转 | 不显示，使用 `homeMap.vue` |

## 9. 阶段任务

### 阶段一：修正文档目标与架构

目标：

1. 修正本文档为双版本并存方案。
2. 明确保留 Cesium 依赖、Vite 插件和高性能版。
3. 明确加载页推荐 + 手动选择 + 本机记忆。
4. 明确页面级方法评估、三维置灰规则、验收清单。

交付物：

| 文件 | 动作 |
|---|---|
| `openlayers-lightweight-migration-plan.md` | 重写并存迁移方案 |

完成标准：

1. 文档不再出现“移除 Cesium 依赖/Vite 插件”的执行建议。
2. 文档包含按页面罗列的方法评估。
3. 文档包含阶段任务和工作记录模板。

### 阶段二：轻量版入口与加载页

目标：

1. `App.vue` 支持 `CesiumMap` 与 `OpenLayersMap` 双挂载分支。
2. `LoadingPage.vue` 检测完成后展示两个版本入口按钮。
3. 本机版本选择写入 `localStorage`。
4. `balanced/high/flagship` 推荐 Cesium，`conservative/low` 推荐 OpenLayers。

计划修改：

| 文件 | 动作 |
|---|---|
| `src/App.vue` | 增加 `selectedMapEngine`、`recommendedMapEngine`、选择版本后的挂载逻辑 |
| `src/components/LoadingPage.vue` | 增加双入口按钮、推荐态、本机上次选择提示 |
| `src/utils/deviceProfile.js` | 保留 Cesium preset，补充地图版本推荐输出或工具函数 |

验收：

1. 登录后不自动进入地图，检测完成后显示两个入口。
2. 推荐项符合档位规则。
3. 点击轻量版挂载 `OpenLayersMap`。
4. 点击高性能版挂载 `CesiumMap`。
5. 刷新后能读取本机上次选择。

### 阶段三：OpenLayers 地图壳

目标：

1. 新增 `OpenLayersMap.vue`。
2. 复用现有 UI 子组件。
3. 初始化 OpenLayers 地图、底图、坐标、比例尺、图层切换、定位。
4. 首页使用 `homeMap.vue`。

计划修改：

| 文件 | 动作 |
|---|---|
| `src/components/OpenLayersMap.vue` | 新增轻量版地图主壳 |
| `src/composables/useOpenLayers.js` | 补齐底图、事件、比例尺、定位、fit、图层管理 |
| `src/components/map/PortalHome.vue` | 挂载或预留 `homeMap.vue` |

验收：

1. 轻量版进入后顶部导航、首页、底部坐标、比例尺、图层按钮可见。
2. 鼠标移动显示经纬度。
3. 底图切换生效。
4. 定位按钮可用。
5. 退出登录可用。

### 阶段四：二维地图操作迁移

目标：

1. 测绘工具全部迁移到 OpenLayers Feature。
2. SHP/KML/CAD 二维导入、显隐、定位、删除可用。
3. 地价 Feature 加载、查询、高亮、结果面板可用。

计划修改：

| 文件 | 动作 |
|---|---|
| `src/components/OpenLayersMap.vue` | 接入测绘、导入、地价事件 |
| `src/composables/useOpenLayersDrawing.js` | 新增绘制和量测逻辑 |
| `src/composables/useOpenLayersImports.js` | 新增导入图层逻辑 |
| `src/composables/useOpenLayersLandPrice.js` | 新增地价图层和查询逻辑 |
| `src/utils/mapGeometry.js` | 补齐 KML 导出、矩形、圆转面、方位角、夹角 |
| `src/utils/mapFeatureStyle.js` | 补齐测绘、导入、地价、查询、高亮样式 |

验收：

1. 标点、画线、画面、画圆、画矩形可用。
2. 测距、测面、方位角、夹角可用。
3. 方量按二维面积和输入高度估算。
4. SHP/KML/CAD 导入后可显示、选中、弹窗、删除。
5. 地价点选、矩形、圆形、多边形查询可用。

### 阶段五：巡检叠加与回放

目标：

1. 巡检任务路线在轻量版地图展示。
2. 问题点、轨迹、回放进度可展示。
3. 独立回放窗口改为 OpenLayers 小地图。

计划修改：

| 文件 | 动作 |
|---|---|
| `src/composables/useOpenLayersInspection.js` | 新增巡检渲染逻辑 |
| `src/components/OpenLayersMap.vue` | 接入 DataManagement emit 的巡检事件 |
| `src/components/map/InspectionPlaybackWindow.vue` | 内部地图从 Cesium 改为 OpenLayers |

验收：

1. 选择巡检任务后路线显示。
2. 定位路线时地图 fit 到路线范围。
3. 查看问题时问题点显示。
4. 轨迹回放时进度线和当前位置点更新。
5. 独立回放窗口不再依赖 Cesium。

### 阶段六：三维能力降级与验收

目标：

1. 轻量版所有三维按钮置灰不可点。
2. 补齐提示文案和样式。
3. 完成构建和场景验收。

计划修改：

| 文件 | 动作 |
|---|---|
| `src/components/map/Home.vue` | 支持传入轻量版能力开关，地形按钮置灰 |
| `src/components/OpenLayersMap.vue` | 传入 light capability flags |
| `src/components/LoadingPage.vue` | 提示可切换到 Cesium 高性能版 |
| `openlayers-lightweight-migration-plan.md` | 追加阶段执行记录和验收结果 |

验收：

1. 轻量版地形/3D Tiles 相关入口不可点。
2. 不可用按钮有明确提示。
3. Cesium 高性能版原三维能力可继续使用。
4. `npm run build` 成功。
5. 文档工作记录更新完整。

## 10. 验收清单

| 验收项 | 标准 |
|---|---|
| 依赖并存 | `cesium`、`vite-plugin-cesium`、`tdt-terrain-cesium-plugin`、`ol` 同时保留 |
| 构建配置 | Vite Cesium 插件保留，OpenLayers 正常打包 |
| 加载页选择 | 检测完成后显示两个版本入口，由用户点击进入 |
| 推荐规则 | `balanced/high/flagship` 推荐 Cesium；`conservative/low` 推荐 OpenLayers |
| 本机记忆 | 用户选择写入 `szkj:preferred-map-engine` |
| Cesium 版本 | 进入高性能版后现有三维功能不回退 |
| OpenLayers 版本 | 进入轻量版后不初始化 Cesium Viewer |
| UI 一致 | 顶栏、Tab、首页、工具栏、面板、弹窗布局保持一致 |
| 二维能力 | 底图、定位、坐标、比例尺、绘制、量测、导入、查询、巡检可用 |
| 三维降级 | 地形、3D Tiles、真实高程、HDR/阴影、pitch/roll 置灰或显示不可用 |
| 首页地球 | 轻量版首页使用 `homeMap.vue` |
| 构建验证 | `npm run build` 成功 |

## 11. 风险与处理

| 风险 | 影响 | 处理 |
|---|---|---|
| `CesiumMap.vue` 业务逻辑过大，直接复制成本高 | 轻量版实现容易遗漏状态 | 分阶段抽取通用状态，优先保留 UI 子组件和事件协议 |
| 轻量版与高性能版状态不一致 | 两套版本体验不一致 | 明确 Feature 数据模型，保持页面 props/emits 一致 |
| 地形和 3D Tiles 用户误解为可用 | 低配版点击失败 | 按钮置灰、提示切换 Cesium 高性能版 |
| 文件导入坐标系复杂 | CAD/SHP 显示位置偏移 | 继续复用 `proj4` 和现有坐标系表单，增加导入后 fit/预览 |
| 地价查询几何判断差异 | 查询结果与 Cesium 版略有差异 | 使用 Turf 做相交/包含判断，并记录差异 |
| 本机记忆覆盖硬件推荐 | 用户可能一直进入不适合版本 | 同时显示“硬件推荐”和“上次选择”，由用户最终点击 |

## 12. 整体总结

本次迁移采用“并存分流”而不是“替换删除”：

1. Cesium 高性能版继续承载三维地形、3D Tiles、真实高程和高性能三维场景。
2. OpenLayers 轻量版承载低配电脑下的二维业务能力，确保进入更快、资源占用更低。
3. 登录后的加载页负责硬件检测、推荐版本、手动选择和本机选择记忆。
4. 页面 UI 保持一致，只替换地图引擎调用；三维能力在轻量版中置灰不可点。
5. 后续每个执行阶段都必须在本文档顶部追加工作记录，写清楚当前修改、新增内容、完成功能、验证结果和遗留问题。
