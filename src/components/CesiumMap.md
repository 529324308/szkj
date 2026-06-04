# CesiumMap 组件功能说明文档

## 1. 组件概述

`CesiumMap.vue` 是项目的主地图壳组件，承载整个平台的顶层导航、Cesium 地球初始化、测绘工具、数治地价、智能分析、数据管理、个人中心以及底部地图辅助信息展示。它通过 `useCesium(containerId)` 统一管理 Cesium Viewer、图层、事件监听、地形、相机与基础交互，并把各业务模块以子组件形式挂载在同一个地图工作台上。

组件核心职责包括：

- 初始化和销毁 Cesium 场景
- 管理顶部模块切换与首页过渡动画
- 组织测绘、地价、智能分析、数据管理等业务模块联动
- 处理本地 SHP / KML / CAD 导入与要素高亮
- 处理地形网络服务、地价查询图层、底图切换、定位、比例尺与罗盘
- 在开发环境下展示地图性能监控面板，辅助评估 3D Tiles、地形、底图与数据导入的运行成本
- 承载顶部 AI 聊天入口与浮窗交互
- 在组件准备完成后向外抛出 `ready`，退出登录时抛出 `logout`

> 说明：该组件属于强耦合主容器，后续任何功能迭代或问题修复，都应先完整读取最新源码，再进行逻辑分析与修改，避免文档与实现脱节。

## 2. Props 参数说明

当前 `CesiumMap.vue` **未显式定义 props**，即外部不需要传入任何组件参数即可使用。

| 参数 | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| 无 | - | - | 组件内部自管理全部状态，外部无需传参 |

## 3. 事件列表

组件通过 `defineEmits(['logout', 'ready'])` 暴露两个事件：

| 事件名 | 触发时机 | 事件参数 | 说明 |
| --- | --- | --- | --- |
| `ready` | Cesium 场景与相关基础加载完成后触发，包含超时兜底逻辑 | 无 | 通知父级：地图工作台已可用 |
| `logout` | 用户在顶部点击退出并确认后触发 | 无 | 通知父级执行登出流程 |

## 4. 方法调用说明

下面按功能域梳理组件中对外可感知、以及内部关键方法的职责边界。

### 4.1 顶部导航与模块切换

- `selectTopTab(tab)`：点击顶部 tab 时调用，转发至 `requestTopTabChange(tab.key)`。
- `enterModule(tabKey)`：由首页子组件触发，按 key 切换到对应模块。
- `requestTopTabChange(nextKey)`：处理首页到非首页的过渡逻辑，包括首页侧边栏收起、相机飞行、模块出现动画和指示器刷新。
- `triggerModuleEnter(nextKey)`：为非首页模块设置短暂的“进入”状态，用于 CSS 动画。
- `updateIndicator()`：根据当前激活 tab 计算顶部指示条位置与宽度。

### 4.2 测绘与工具栏

- `startTool(type)`：启动地图工具。支持测量、标绘、点选及 AI 入口等工具类型。
- `resetDrawing()`：清理当前绘制状态。
- `clearAllMeasures()`：清空测绘结果与测量面板状态。
- `copyAll()` / `copyCoords()`：复制当前测绘信息或坐标信息。
- `deleteCurrentMeasure()`：删除当前测绘对象。
- `setGroupItems(groupKey, checked)`：批量切换地价模块中的分组勾选状态。
- `toggleTab2Folder(...)`：切换地价模块中树/文件夹类面板的展开状态。

### 4.3 地形与底图

- `openTerrainPanel()`：打开地形输入面板，并从本地恢复上次输入。
- `cancelTerrainPanel()`：取消地形面板编辑。
- `confirmTerrain()`：确认并应用地形配置。
- `closeTerrain()`：关闭或移除当前地形状态。
- `setBaseLayer(layerName)`：在全球影像、天地图、矢量图、注记图之间切换底图；默认启用纯天地图影像，矢量图使用白底矢量路网与标注，注记图使用天地图影像叠加地名标注。
- `toggleLayerPanel()`：显示或隐藏底图面板。

### 4.4 智能分析 / AI 聊天

- `toggleAiAssistantFromHeader()`：顶部 AI 按钮总入口，按当前状态决定打开或关闭。
- `openAiAssistantFromHeader()`：调用 `toggleAiAssistantFromHeader()` 的封装入口。
- `animateAiChatOpenFromHeader()` / `animateAiChatCloseToHeader()`：负责 AI 聊天窗与顶部按钮之间的收缩/展开动画。
- `sendAiMessage()`：发送聊天消息并生成模拟回复。
- `closeAiChat()`：关闭聊天窗口。
- `toggleAiChatSize()`：切换聊天窗大/小尺寸。
- `onAiDragStart(...)`：开始拖拽 AI 聊天窗。

### 4.5 数治地价数据与要素联动

- `onDjcxNodeFeaturesChange(payload)`：根据节点勾选状态增删地价节点要素。
- `djcxAddNodeFeatures(nodeId, records)`：将节点记录转为 GeoJSON 并加入 Cesium 数据源。
- `djcxRemoveNodeFeatures(nodeId)`：移除节点相关数据源与高亮。
- `djcxSetHighlights(entities)` / `djcxClearHighlights()`：控制地价要素高亮。
- `djcxNormalizeRecordsToFeatureCollection(records)`：将后端记录归一化为 GeoJSON FeatureCollection。
- `djcxBuildQueryResultProperties(entity, matchCount)`：整理查询结果属性面板展示数据。

### 4.6 SHP / KML / CAD 导入与要素面板

- `confirmShpImport()`：确认导入本地 SHP。
- `confirmKmlImport()`：确认导入本地 KML。
- `confirmCadImport()`：确认导入本地 CAD / DXF。
- `createImportedShpFeatureMeta(...)`：构造 SHP 要素元信息。
- `closeShpFeaturePopup()`：关闭要素详情浮层。
- `minimizeShpFeaturePopup()`：最小化要素详情浮层为悬浮图标。
- `onShpFeatureHeaderPointerDown(...)` / `onShpFeatureFloatPointerDown(...)`：处理拖拽。

### 4.7 组件生命周期与初始化

- `watchGlobeReady()`：持续检测 Cesium 地球与图层是否准备完成，并触发 `ready`。
- `onMounted(...)`：初始化 Cesium、进入首页场景、注册监听和窗口事件。
- `onBeforeUnmount(...)`：清理监听、动画和 Cesium 实例。

### 4.8 开发环境性能监控

- `subscribePerformanceStats(listener)`：订阅 `useCesium(containerId)` 输出的性能采样数据。
- `getPerformanceStats()`：读取最近一次性能采样快照，用于开发环境面板初始化。
- 开发环境浮窗默认展示：FPS、3D Tiles 数量、数据源数量、相机移动状态、影像图层数量、地形模式、累计渲染请求数、每秒渲染请求数。
- 该面板仅用于开发排查，不参与生产业务逻辑与用户操作流。

## 5. 依赖配置

### 5.1 外部依赖

该组件依赖以下核心第三方库：

- `vue`：响应式状态、生命周期、计算属性、监听器
- `cesium`：3D 地球、图层、实体、地形、地理数据源
- `gsap`：AI 聊天窗/界面动画
- `@turf/turf`：GeoJSON 几何辅助计算，尤其是质心、面要素定位
- `proj4`：CAD / 投影坐标转换
- `element-plus`：消息提示与确认框

### 5.2 内部组合式依赖

- `useCesium(containerId)`：组件最重要的地图能力来源，负责 Cesium 实例管理、图层增删、事件绑定、底图与地形切换、首页相机动画等。
- `useCesium(containerId)` 同时负责开发环境下的性能采样与监控订阅能力输出。

### 5.3 本地资源依赖

组件通过 `new URL(..., import.meta.url).href` 方式引用本地图标资源，包括：

- 顶部工具栏图标
- 测绘工具图标
- AI 聊天、侧边栏、地形、底图、导入类型等图标

### 5.4 关键状态存储

组件使用本地存储持久化部分配置：

- `terrainInputUrl`
- `terrainInputName`
- `userName`

## 6. 使用示例

### 6.1 基本使用

```vue
<template>
  <CesiumMap @ready="handleReady" @logout="handleLogout" />
</template>

<script setup>
import CesiumMap from '@/components/CesiumMap.vue';

function handleReady() {
  console.log('地图工作台已就绪');
}

function handleLogout() {
  console.log('用户请求退出登录');
}
</script>
```

### 6.2 父级登录态控制示例

```vue
<template>
  <Login v-if="!loggedIn" @success="onLoginSuccess" />
  <CesiumMap v-else @logout="loggedIn = false" />
</template>

<script setup>
import { ref } from 'vue';
import Login from '@/components/Login.vue';
import CesiumMap from '@/components/CesiumMap.vue';

const loggedIn = ref(false);

function onLoginSuccess() {
  loggedIn.value = true;
}
</script>
```

### 6.3 事件联动建议

- `ready` 适合用于：隐藏全局 loading、进入平台首页、初始化外部业务状态
- `logout` 适合用于：清空 token、返回登录页、关闭全局缓存

## 7. 常见问题排查

### 7.1 地图没有加载出来

排查顺序建议：

1. 确认 `useCesium(containerId)` 是否正常初始化
2. 检查 `#cesiumContainer` 是否存在且高度为 `100vh`
3. 查看浏览器控制台是否存在 Cesium 静态资源或 token 配置错误
4. 观察 `ready` 是否被触发；若未触发，检查图层准备是否阻塞

### 7.2 顶部模块切换无响应

可能原因：

- `activeTopTab` 状态未更新
- `requestTopTabChange` 被重复点击打断
- 首页收起动画尚未结束，导致模块尚未进入展示状态

### 7.3 AI 聊天窗无法打开或关闭

可能原因：

- `aiChatAnimating` 仍处于动画锁定状态
- `toggleAiAssistantFromHeader()` 触发时存在未完成动画
- `headerAiButtonRef` 或聊天窗定位元素未正确渲染

### 7.4 SHP / KML / CAD 导入后没有显示

建议检查：

- 文件格式是否符合当前解析器预期
- 是否成功生成 `GeoJSON` / `DataSource`
- 是否触发了对应的 `confirmShpImport` / `confirmKmlImport` / `confirmCadImport`
- 是否因为坐标系、投影或几何无效导致未能绘制

### 7.5 地形服务未生效

建议检查：

- 输入的地形 URL 是否可访问
- 是否多个 URL 被遗漏分隔符导致解析失败
- `terrainInputName` 是否与实际服务名匹配
- 本地存储是否保留了旧配置

### 7.6 `ready` 事件触发过早或过晚

该组件存在 10 秒超时兜底，因此：

- 若业务上依赖“完全加载后再进入”，建议结合外层资源加载状态一起判断
- 若场景复杂、图层较多，超时兜底可能先于全部资源完毕触发，需要在父组件自行补充状态校验

### 7.7 开发环境性能监控面板没有显示

建议检查：

- 当前是否运行在 `import.meta.env.DEV === true` 的开发环境
- `useCesium(containerId)` 是否正常初始化并启动采样
- 浏览器控制台是否存在 Cesium 静态资源错误，导致场景未进入稳定渲染

## 8. 维护规范

- 每次修改 `CesiumMap.vue` 源码后，都要同步更新本文档。
- 每次针对该组件进行排查或迭代前，必须先完整读取最新源码，再开展搜索、分析或修改。
- 若新增 props、emit、子模块、图层能力或外部依赖，请同步补充到“组件概述 / props / 事件 / 方法 / 依赖配置 / 常见问题”对应章节。
