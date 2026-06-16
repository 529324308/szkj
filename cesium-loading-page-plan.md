# 登录后 Cesium 加载页完整方案

## 1. 方案目标

登录成功后先进入加载页，不直接显示 Cesium 主界面。加载页需要完成：

1. 动态检测当前客户端硬件、浏览器和 WebGL 能力。
2. 执行 2 到 5 秒的轻量跑分。
3. 预估 Cesium 首屏帧率和适配档位。
4. 预加载 Cesium 相关资源，并等待地图初始化完成。
5. 按设备性能把初始化参数传给地图，保证不同电脑都有合适体验。

注意：方案中不能写死任何一台电脑的硬件信息。页面展示的 CPU、GPU、内存、帧率、性能档位必须来自当前客户端运行时检测。

## 2. 当前项目基础

当前项目已有这些基础：

- `src/App.vue`：登录成功后切换主界面。
- `src/components/Login.vue`：登录页，整体风格为深色背景、玻璃质感面板、青绿到青蓝渐变。
- `src/components/LoadingPage.vue`：已有基础加载页组件，但目前只展示背景图、旋转加载动画和固定文案。
- `src/components/CesiumMap.vue`：已有 `ready` 事件，可作为地图完成初始化的信号。
- `src/composables/useCesium.js`：已有 FPS、渲染请求数、图层数量、地形模式等性能监控能力。
- 背景资源：
  - `src/assets/jz_bg.png`：2039 x 771，适合宽屏、横屏、大屏。
  - `src/assets/jz_bg2.png`：1324 x 1188，适合常规桌面、竖向比例、窄屏。

建议把现有 `LoadingPage.vue` 升级成“检测 + 跑分 + 预加载 + 过渡”组件，而不是新增重复页面。

## 3. 页面流程

```mermaid
flowchart LR
  A[登录成功] --> B[显示 LoadingPage]
  B --> C[检测浏览器与屏幕]
  C --> D[检测 CPU/内存/GPU/WebGL]
  D --> E[执行短时跑分]
  E --> F[计算性能评分与档位]
  F --> G[预估 Cesium FPS]
  G --> H[生成地图初始化策略]
  H --> I[挂载 CesiumMap]
  I --> J[等待 CesiumMap ready]
  J --> K[淡出加载页进入首页]
```

## 4. App 状态设计

`App.vue` 建议从两态改为三态：

| 状态 | 展示组件 | 说明 |
|---|---|---|
| 未登录 | `Login` | 用户输入账号密码 |
| 已登录，加载中 | `LoadingPage` + 可隐藏挂载 `CesiumMap` | 检测、跑分、预加载 |
| 已登录，加载完成 | `CesiumMap` | 正式进入平台 |

建议状态字段：

```js
const loggedIn = ref(false);
const loadingVisible = ref(false);
const mapReady = ref(false);
const deviceProfile = ref(null);
const renderPreset = ref(null);
```

登录成功后：

```js
loggedIn.value = true;
loadingVisible.value = true;
mapReady.value = false;
```

加载页完成跑分后：

```js
deviceProfile.value = profile;
renderPreset.value = preset;
```

`CesiumMap` 发出 `ready` 后：

```js
mapReady.value = true;
loadingVisible.value = false;
```

## 5. 动态检测项

浏览器环境限制较多，硬件检测要分为“可稳定读取”和“可推断读取”两类。拿不到的字段显示“浏览器未开放”，不能写死。

### 5.1 基础设备信息

| 字段 | 来源 | 说明 |
|---|---|---|
| CPU 线程数 | `navigator.hardwareConcurrency` | 逻辑线程数，不等于真实核心数 |
| 内存容量 | `navigator.deviceMemory` | Chromium 支持，通常为近似值 |
| 浏览器 UA | `navigator.userAgent` | 用于判断浏览器与系统 |
| 屏幕分辨率 | `window.screen.width/height` | 物理屏幕 CSS 像素 |
| 当前视口 | `window.innerWidth/innerHeight` | 用于背景图切换和布局 |
| DPR | `window.devicePixelRatio` | 用于估算渲染压力 |
| 网络状态 | `navigator.connection` | 支持时读取 downlink/effectiveType |

### 5.2 GPU 与 WebGL 能力

| 字段 | 来源 | 说明 |
|---|---|---|
| WebGL2 支持 | `canvas.getContext('webgl2')` | Cesium 优先能力 |
| WebGL1 支持 | `canvas.getContext('webgl')` | WebGL2 不可用时兜底 |
| GPU Renderer | `WEBGL_debug_renderer_info` | 能拿到时显示真实或浏览器暴露的 GPU |
| 最大纹理尺寸 | `gl.MAX_TEXTURE_SIZE` | 判断贴图和大纹理能力 |
| 最大渲染缓冲 | `gl.MAX_RENDERBUFFER_SIZE` | 判断离屏渲染能力 |
| 顶点纹理单元 | `gl.MAX_VERTEX_TEXTURE_IMAGE_UNITS` | 辅助评估复杂渲染能力 |
| 抗锯齿 | `gl.getContextAttributes().antialias` | 判断当前上下文质量 |

### 5.3 兜底策略

如果 GPU 名称无法获取：

- 显示“浏览器未开放显卡名称”。
- 仍然根据 WebGL2、纹理尺寸、DPR、跑分 FPS 来判断档位。
- 不阻塞进入地图。

如果 WebGL 不可用：

- 页面展示“不支持 3D 地图渲染”。
- 不进入 Cesium 主场景。
- 提示开启浏览器硬件加速或更换浏览器。

## 6. 跑分设计

跑分要轻量，不能让登录后的等待变成长时间卡顿。

### 6.1 跑分阶段

| 阶段 | 耗时 | 内容 |
|---|---:|---|
| 环境检测 | 200 - 500ms | 收集浏览器、屏幕、WebGL 能力 |
| CPU 计算 | 500 - 800ms | 短循环、矩阵/三角函数计算、JSON 构造解析 |
| GPU 绘制 | 800 - 1500ms | WebGL 画三角面、纹理填充、`requestAnimationFrame` 采样 |
| Cesium 预热 | 1000 - 2000ms | 预加载 Cesium chunk、样式、基础资源 |
| 汇总过渡 | 300 - 600ms | 计算档位、展示结果、进入地图 |

总耗时建议控制在 3 秒左右，弱设备最多不超过 5 秒。

### 6.2 CPU 分

建议采样：

- 固定迭代次数计算耗时。
- `navigator.hardwareConcurrency` 加权。
- 大数组排序和 JSON 序列化作为业务侧参考。

示例指标：

```js
cpuScore = clamp(100 - cpuCostMs / 12 + threadCount * 2, 0, 100)
```

### 6.3 GPU 分

建议采样：

- WebGL2 可用加分。
- `MAX_TEXTURE_SIZE` 越高分越高。
- 隐藏 canvas 执行 60 到 120 帧绘制采样。
- 如果 Renderer 包含 `SwiftShader`、`Microsoft Basic Render` 等软件渲染关键词，强制降级。

示例指标：

```js
gpuScore = webgl2Bonus + textureScore + rafFpsScore - softwareRendererPenalty
```

### 6.4 内存分

建议采样：

- `navigator.deviceMemory >= 16`：高分
- `8 <= deviceMemory < 16`：均衡
- `4 <= deviceMemory < 8`：保守
- `< 4`：低配

如果浏览器不支持 `deviceMemory`，内存分不直接给低分，按“未知”处理，由 GPU 和实际帧率决定。

### 6.5 综合分

```text
综合分 = CPU 25% + GPU 45% + 内存 15% + 浏览器/WebGL能力 15%
```

## 7. 档位与 Cesium FPS 预估

| 综合分 | 档位 | 预估 Cesium FPS | 页面文案 |
|---:|---|---|---|
| 90 - 100 | 旗舰 | 55 - 60 FPS | 高性能模式 |
| 75 - 89 | 高性能 | 45 - 60 FPS | 高质量模式 |
| 60 - 74 | 均衡 | 30 - 45 FPS | 均衡模式 |
| 40 - 59 | 保守 | 20 - 30 FPS | 流畅优先 |
| 0 - 39 | 低配 | 15 - 25 FPS | 低负载模式 |

预估 FPS 不是最终值。进入 `CesiumMap` 后应继续用现有 `subscribePerformanceStats` 采集真实 FPS，并在 10 秒内修正策略。

## 8. Cesium 初始化策略

加载页跑分结果生成 `renderPreset`，传给 `CesiumMap` 或写入 `sessionStorage`。

### 8.1 旗舰 / 高性能

- 默认 WebGL2。
- 允许较高 DPR，但上限建议不超过 2。
- 可开启 HDR、光照、大气效果。
- Tileset `maximumScreenSpaceError` 建议 12 - 16。
- 允许首屏加载基础影像、地形和核心 Tileset。

### 8.2 均衡

- DPR 上限建议 1.5。
- 首屏先加载地球和基础影像。
- 地形延迟 1 到 2 秒加载。
- Tileset `maximumScreenSpaceError` 建议 16 - 24。
- 阴影默认关闭。

### 8.3 保守 / 低配

- DPR 上限建议 1。
- 默认椭球地形，地形由用户手动开启。
- Tileset `maximumScreenSpaceError` 建议 24 - 32。
- 关闭阴影、HDR、高开销光照。
- 图层分批加载，优先保证交互响应。

## 9. 加载页视觉风格

加载页需要和登录页、首页保持一致：

- 深色科技底色。
- 青绿到青蓝作为主强调色：`#0D9487`、`#06B6D4`、`#45efff`。
- 面板使用半透明玻璃质感。
- 边框使用低透明白色或青色描边。
- 字体沿用 `"PingFang SC", "Microsoft YaHei", sans-serif`。
- 卡片圆角建议 8 到 12px，和地图面板保持克制。
- 动效要轻，不要喧宾夺主。

## 10. 背景图切换规则

背景只使用：

- `jz_bg.png`
- `jz_bg2.png`

推荐规则：

```vue
<picture class="loading-bg">
  <source srcset="../assets/jz_bg.png" media="(min-aspect-ratio: 16/9)" />
  <source srcset="../assets/jz_bg.png" media="(min-width: 1600px)" />
  <img src="../assets/jz_bg2.png" alt="" class="loading-bg__image" />
</picture>
```

实际判断逻辑：

| 屏幕 / 视口 | 背景图 |
|---|---|
| 宽屏、横屏、超宽屏 | `jz_bg.png` |
| 小屏、窄屏、接近竖屏 | `jz_bg2.png` |
| 默认兜底 | `jz_bg2.png` |

CSS 建议：

```scss
.loading-bg__image {
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: center bottom;
}

@media (min-aspect-ratio: 16 / 9) {
  .loading-bg__image {
    object-position: center center;
  }
}
```

## 11. 页面布局

建议采用“一主两辅”的布局。

### 11.1 左侧品牌区

内容：

- 平台 Logo
- `浙江数治空间平台`
- `Spatial Workbench`
- 当前登录用户

风格：

- 与 `PortalHome` 左侧栏一致。
- 使用半透明深色玻璃面板。
- 保留青色细描边。

### 11.2 中心加载区

内容：

- 主进度环或进度条。
- 当前阶段文案：
  - 正在检测浏览器能力
  - 正在检测 WebGL 渲染能力
  - 正在执行性能跑分
  - 正在预热 Cesium 资源
  - 正在进入三维场景
- 综合分和档位。
- 预估 FPS。

建议中心区域文案：

```text
正在为当前设备匹配三维地图性能参数
```

### 11.3 右侧检测结果区

内容建议：

| 卡片 | 展示字段 |
|---|---|
| 设备 | CPU 线程数、内存、DPR |
| 图形 | GPU Renderer、WebGL 版本、最大纹理 |
| 性能 | 综合分、预估 FPS、档位 |
| 策略 | 地形、阴影、Tileset 细节、DPR 上限 |

不要显示太多原始字段。高级信息可以折叠。

## 12. 进度与阶段权重

加载页进度不要只按时间假跑，建议结合实际任务更新。

| 阶段 | 进度范围 |
|---|---:|
| 初始化页面 | 0 - 10 |
| 环境检测 | 10 - 25 |
| WebGL 检测 | 25 - 45 |
| CPU/GPU 跑分 | 45 - 70 |
| Cesium 资源预热 | 70 - 90 |
| 等待地图 ready | 90 - 100 |

如果地图超过 8 秒仍未 ready：

- 进度停在 96%。
- 显示“正在等待地图资源响应”。
- 15 秒后允许“进入基础模式”按钮。

## 13. 数据结构

建议加载页输出统一对象：

```js
const deviceProfile = {
  collectedAt: Date.now(),
  browser: {
    userAgent: '',
    hardwareConcurrency: 0,
    deviceMemory: null,
    devicePixelRatio: 1,
    viewportWidth: 0,
    viewportHeight: 0,
    screenWidth: 0,
    screenHeight: 0,
  },
  webgl: {
    supported: false,
    version: '',
    renderer: '',
    vendor: '',
    maxTextureSize: 0,
    maxRenderbufferSize: 0,
    antialias: false,
    softwareRenderer: false,
  },
  benchmark: {
    cpuScore: 0,
    gpuScore: 0,
    memoryScore: 0,
    browserScore: 0,
    totalScore: 0,
    estimatedFps: '',
    tier: '',
  },
};
```

初始化策略：

```js
const renderPreset = {
  tier: 'balanced',
  pixelRatioLimit: 1.5,
  enableTerrainOnStart: false,
  enableShadows: false,
  enableHighDynamicRange: false,
  tilesetMaximumScreenSpaceError: 20,
  lazyLoadTerrain: true,
  lazyLoadTilesets: true,
};
```

## 14. 本地缓存

跑分结果可以缓存到 `localStorage` 或 `sessionStorage`，减少重复登录等待。

建议缓存 key：

```text
szkj:device-profile:v1
```

缓存有效期：

- 同一浏览器同一设备：24 小时。
- 如果 `userAgent`、`hardwareConcurrency`、`deviceMemory`、`renderer`、`DPR` 任一关键字段变化，重新跑分。
- 用户点击“重新检测”时强制刷新。

## 15. 异常处理

| 异常 | 页面处理 |
|---|---|
| WebGL 不可用 | 展示错误态，不进入 3D 地图 |
| GPU 名称不可读取 | 显示未知，继续跑分 |
| 跑分失败 | 使用保守档进入 |
| Cesium 资源加载慢 | 进度停在 96%，提示等待 |
| 地图 ready 超时 | 允许进入基础模式 |
| 浏览器硬件加速关闭 | 提示开启硬件加速，策略降级 |

## 16. 验收标准

1. 登录后必须先显示加载页。
2. 加载页背景按分辨率自动选择 `jz_bg.png` 或 `jz_bg2.png`。
3. 页面不得写死任何电脑硬件信息。
4. 每台电脑展示的 CPU 线程、内存、GPU/WebGL 信息来自运行时检测。
5. 3 秒内展示初步设备档位，弱设备不超过 5 秒。
6. 能给出 Cesium 预估 FPS。
7. 能生成并传递地图初始化策略。
8. `CesiumMap ready` 后加载页平滑淡出。
9. WebGL 不可用时有明确错误态。
10. 页面风格与登录页、首页一致。

## 17. 实施步骤

1. 升级 `src/components/LoadingPage.vue`。
2. 新增设备检测工具，例如 `src/utils/deviceProfile.js`。
3. 新增轻量跑分工具，例如 `src/utils/deviceBenchmark.js`。
4. 在 `App.vue` 增加加载状态和 `deviceProfile/renderPreset`。
5. 让 `CesiumMap` 接收 `renderPreset`，或从 `sessionStorage` 读取。
6. 在 `useCesium.js` 中根据档位应用 DPR、地形、阴影、Tileset 细节。
7. 用不同窗口尺寸验证背景图切换。
8. 用 Chrome 硬件加速开启/关闭两种情况验证降级。

## 18. 推荐落地优先级

第一阶段：

- 背景图响应式切换。
- 动态检测 CPU 线程、内存、WebGL、GPU Renderer。
- 显示综合分、档位、预估 FPS。
- 加载页等待 `CesiumMap ready` 后淡出。

第二阶段：

- 跑分结果缓存。
- 按档位调整 Cesium 初始化参数。
- 地图运行 10 秒后用真实 FPS 修正策略。

第三阶段：

- 增加“重新检测”。
- 增加“进入基础模式”。
- 增加高级检测详情折叠面板。

