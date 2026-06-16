<template>
  <transition name="loading-fade">
    <div v-if="visible" class="loading-page">
      <picture class="loading-bg">
        <source :srcset="bgWide" media="(min-aspect-ratio: 16/9)" />
        <source :srcset="bgWide" media="(min-width: 1600px)" />
        <img :src="bgTall" alt="" class="loading-bg__image" />
      </picture>

      <div class="loading-overlay"></div>

      <aside class="loading-brand">
        <div class="loading-brand__head">
          <img class="loading-brand__logo" :src="logoUrl" alt="平台标识" />
          <div>
            <div class="loading-brand__title">浙江数治空间平台</div>
            <div class="loading-brand__subtitle">Spatial Workbench</div>
          </div>
        </div>
        <div class="loading-brand__metrics">
          <article v-for="item in brandMetrics" :key="item.label" class="loading-brand__metric">
            <span>{{ item.label }}</span>
            <strong>{{ item.value }}</strong>
          </article>
        </div>

        <div class="loading-brand__timeline">
          <div class="loading-brand__section-title">启动流程</div>
          <div
            v-for="item in stageItems"
            :key="item.key"
            class="loading-brand__stage"
            :class="`is-${item.state}`"
          >
            <span class="loading-brand__stage-dot"></span>
            <div class="loading-brand__stage-main">
              <strong>{{ item.label }}</strong>
              <span>{{ item.desc }}</span>
            </div>
          </div>
        </div>

        <div class="loading-brand__policy">
          <div class="loading-brand__section-title">首屏策略</div>
          <div class="loading-brand__policy-row">
            <span>{{ brandPolicy.primary.label }}</span>
            <strong>{{ brandPolicy.primary.value }}</strong>
          </div>
          <div class="loading-brand__policy-row">
            <span>{{ brandPolicy.secondary.label }}</span>
            <strong>{{ brandPolicy.secondary.value }}</strong>
          </div>
        </div>

        <div class="loading-brand__status">
          <span class="loading-brand__status-dot" :class="statusDotClass"></span>
          <span>{{ statusText }}</span>
        </div>
      </aside>

      <main class="loading-main">
        <section class="loading-progress">
          <div class="loading-progress__ring" :style="ringStyle">
            <div class="loading-progress__inner">
              <strong>{{ Math.round(progress) }}</strong>
              <span>%</span>
            </div>
          </div>

          <div class="loading-progress__copy">
            <div class="loading-progress__eyebrow">DEVICE PROFILING</div>
            <h1>正在为当前设备匹配三维地图性能参数</h1>
            <p>{{ stageText }}</p>
          </div>

          <div class="loading-progress__bar" aria-hidden="true">
            <span :style="{ width: `${progress}%` }"></span>
          </div>
        </section>

        <section class="loading-summary">
          <article class="loading-summary__item">
            <span>综合评分</span>
            <strong>{{ scoreText }}</strong>
          </article>
          <article class="loading-summary__item">
            <span>性能档位</span>
            <strong>{{ tierText }}</strong>
          </article>
          <article class="loading-summary__item">
            <span>预估 FPS</span>
            <strong>{{ estimatedFpsText }}</strong>
          </article>
        </section>

        <div v-if="errorText" class="loading-error">
          <strong>{{ errorTitle }}</strong>
          <span>{{ errorText }}</span>
          <button type="button" @click="runDetection(true)">重新检测</button>
        </div>

        <button
          v-if="showBasicModeButton && !errorText"
          class="loading-basic-btn"
          type="button"
          @click="emit('enter-basic')"
        >
          进入基础模式
        </button>

        <button
          v-if="showEnterSystemButton"
          class="loading-enter-btn"
          type="button"
          @click="emit('enter-system')"
        >
          进入系统
        </button>
      </main>

      <aside class="loading-detail">
        <div class="loading-detail__head">
          <div>
            <div class="loading-detail__title">检测结果</div>
            <div class="loading-detail__subtitle">当前客户端实时采集</div>
          </div>
          <button type="button" @click="runDetection(true)">重测</button>
        </div>

        <div class="loading-detail__grid">
          <article v-for="item in detailItems" :key="item.label" class="loading-detail__card">
            <span>{{ item.label }}</span>
            <strong>{{ item.value }}</strong>
          </article>
        </div>

        <div class="loading-strategy">
          <div class="loading-strategy__title">地图策略</div>
          <div class="loading-strategy__row">
            <span>DPR 上限</span>
            <strong>{{ strategyText.pixelRatio }}</strong>
          </div>
          <div class="loading-strategy__row">
            <span>地形</span>
            <strong>{{ strategyText.terrain }}</strong>
          </div>
          <div class="loading-strategy__row">
            <span>阴影/HDR</span>
            <strong>{{ strategyText.effects }}</strong>
          </div>
          <div class="loading-strategy__row">
            <span>Tileset 细节</span>
            <strong>{{ strategyText.tileset }}</strong>
          </div>
        </div>
      </aside>
    </div>
  </transition>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import bgWide from '../assets/jz_bg.png';
import bgTall from '../assets/jz_bg2.png';
import logoUrl from '../assets/logo.png';
import { clearDeviceProfileCache, collectDeviceProfile } from '../utils/deviceProfile';

const props = defineProps({
  visible: {
    type: Boolean,
    default: true,
  },
  mapReady: {
    type: Boolean,
    default: false,
  },
});

const emit = defineEmits(['profile-ready', 'enter-basic', 'enter-system']);

const progress = ref(0);
const stageText = ref('正在初始化加载环境');
const profile = ref(null);
const preset = ref(null);
const errorText = ref('');
const errorTitle = ref('检测失败');
const isRunning = ref(false);
const timedOut = ref(false);
const profileSource = ref('实时检测');
const detectionStartedAt = ref(0);
const detectionFinishedAt = ref(0);
let runId = 0;
let timeoutTimer = null;

const browserFallback = computed(() => ({
  hardwareConcurrency: navigator.hardwareConcurrency || 0,
  deviceMemory: typeof navigator.deviceMemory === 'number' ? navigator.deviceMemory : null,
  devicePixelRatio: window.devicePixelRatio || 1,
  viewportWidth: window.innerWidth || 0,
  viewportHeight: window.innerHeight || 0,
}));
const elapsedSeconds = computed(() => {
  const start = detectionStartedAt.value;
  if (!start) return '--';
  const end = detectionFinishedAt.value || Date.now();
  return `${Math.max(0, ((end - start) / 1000)).toFixed(1)}s`;
});
const scoreText = computed(() => {
  const score = profile.value?.benchmark?.totalScore;
  return typeof score === 'number' ? `${score.toFixed(1)}` : '--';
});
const tierText = computed(() => profile.value?.benchmark?.tierText || '检测中');
const estimatedFpsText = computed(() => {
  const fps = profile.value?.benchmark?.estimatedFps;
  return fps ? `${fps} FPS` : '--';
});
const statusText = computed(() => {
  if (errorText.value) return '检测异常';
  if (props.mapReady) return '地图已就绪';
  if (profile.value) return '等待地图资源';
  return '正在检测';
});
const statusDotClass = computed(() => ({
  'is-error': !!errorText.value,
  'is-ready': props.mapReady,
}));
const ringStyle = computed(() => ({
  background: `conic-gradient(#45efff ${progress.value * 3.6}deg, rgba(255, 255, 255, 0.12) 0deg)`,
}));

const brandMetrics = computed(() => {
  const browser = profile.value?.browser || browserFallback.value;
  const webgl = profile.value?.webgl || {};
  const viewport = browser.viewportWidth && browser.viewportHeight
    ? `${browser.viewportWidth} x ${browser.viewportHeight}`
    : `${window.innerWidth || '--'} x ${window.innerHeight || '--'}`;
  return [
    {
      label: '检测来源',
      value: profile.value ? profileSource.value : '实时检测',
    },
    {
      label: '屏幕视口',
      value: viewport,
    },
    {
      label: '线程 / 内存',
      value: `${browser.hardwareConcurrency || '--'} / ${typeof browser.deviceMemory === 'number' ? `${browser.deviceMemory}GB` : '未知'}`,
    },
    {
      label: 'WebGL',
      value: webgl.supported ? webgl.version : progress.value >= 25 ? '检测中' : '待检测',
    },
  ];
});

const stageItems = computed(() => {
  const items = [
    { key: 'browser', label: '环境识别', threshold: 24 },
    { key: 'webgl', label: '图形检测', threshold: 42 },
    { key: 'benchmark', label: '性能跑分', threshold: 76 },
    { key: 'preset', label: '策略生成', threshold: 90 },
    { key: 'map', label: '地图就绪', threshold: 100 },
  ];
  return items.map((item) => {
    let state = 'pending';
    if (props.mapReady && item.key === 'map') state = 'done';
    else if (progress.value >= item.threshold) state = 'done';
    else if (progress.value >= item.threshold - 18) state = 'active';
    const descMap = {
      pending: '等待执行',
      active: item.key === 'map' ? '等待 Cesium ready' : '正在执行',
      done: '已完成',
    };
    return {
      ...item,
      state,
      desc: descMap[state],
    };
  });
});

const brandPolicy = computed(() => ({
  primary: {
    label: '性能模式',
    value: preset.value?.modeText || profile.value?.benchmark?.modeText || '检测中',
  },
  secondary: {
    label: '本次耗时',
    value: elapsedSeconds.value,
  },
}));

const detailItems = computed(() => {
  const browser = profile.value?.browser || {};
  const webgl = profile.value?.webgl || {};
  const benchmark = profile.value?.benchmark || {};
  return [
    { label: 'CPU 线程', value: browser.hardwareConcurrency ? `${browser.hardwareConcurrency}` : '--' },
    { label: '内存', value: typeof browser.deviceMemory === 'number' ? `${browser.deviceMemory} GB` : '浏览器未开放' },
    { label: 'DPR', value: browser.devicePixelRatio ? browser.devicePixelRatio.toFixed(2) : '--' },
    { label: 'WebGL', value: webgl.supported ? webgl.version : '不可用' },
    { label: 'GPU', value: webgl.renderer || '浏览器未开放' },
    { label: '最大纹理', value: webgl.maxTextureSize ? `${webgl.maxTextureSize}px` : '--' },
    { label: 'CPU 分', value: typeof benchmark.cpuScore === 'number' ? benchmark.cpuScore.toFixed(1) : '--' },
    { label: 'GPU 分', value: typeof benchmark.gpuScore === 'number' ? benchmark.gpuScore.toFixed(1) : '--' },
  ];
});

const strategyText = computed(() => {
  const data = preset.value || {};
  return {
    pixelRatio: data.pixelRatioLimit ? `<= ${data.pixelRatioLimit}` : '--',
    terrain: data.enableTerrainOnStart ? '首屏开启' : '延迟/手动',
    effects: data.enableShadows || data.enableHighDynamicRange ? '开启' : '关闭',
    tileset: data.tilesetMaximumScreenSpaceError ? `SSE ${data.tilesetMaximumScreenSpaceError}` : '--',
  };
});
const showBasicModeButton = computed(() => timedOut.value && profile.value?.webgl?.supported && !props.mapReady);
const showEnterSystemButton = computed(() => props.mapReady && !errorText.value);

function startReadyTimeout() {
  if (timeoutTimer) window.clearTimeout(timeoutTimer);
  timedOut.value = false;
  timeoutTimer = window.setTimeout(() => {
    if (!props.mapReady && profile.value?.webgl?.supported) {
      timedOut.value = true;
      stageText.value = '地图资源响应较慢，可继续等待或进入基础模式';
      progress.value = Math.max(progress.value, 96);
    }
  }, 15000);
}

async function runDetection(force = false) {
  const currentRun = ++runId;
  isRunning.value = true;
  errorText.value = '';
  errorTitle.value = '检测失败';
  profile.value = null;
  preset.value = null;
  profileSource.value = force ? '重新检测' : '实时检测';
  detectionStartedAt.value = Date.now();
  detectionFinishedAt.value = 0;
  progress.value = force ? 4 : 0;
  stageText.value = '正在初始化加载环境';
  timedOut.value = false;
  if (force) clearDeviceProfileCache();

  try {
    const result = await collectDeviceProfile({
      force,
      onProgress: ({ progress: nextProgress, stage }) => {
        if (currentRun !== runId) return;
        if (typeof nextProgress === 'number') progress.value = Math.max(progress.value, nextProgress);
        if (stage) stageText.value = stage;
      },
    });
    if (currentRun !== runId) return;

    profile.value = result.profile;
    preset.value = result.preset;
    profileSource.value = result.fromCache ? '缓存档案' : '实时检测';
    detectionFinishedAt.value = Date.now();

    if (!result.profile?.webgl?.supported) {
      errorTitle.value = '当前浏览器不支持 WebGL';
      errorText.value = '请开启浏览器硬件加速，或更换支持 WebGL 的浏览器后重试。';
      progress.value = 100;
      return;
    }

    progress.value = Math.max(progress.value, 90);
    stageText.value = result.fromCache ? '已读取设备档案，正在进入三维场景' : '检测完成，正在进入三维场景';
    emit('profile-ready', {
      profile: result.profile,
      preset: result.preset,
      fromCache: result.fromCache,
    });
    startReadyTimeout();
  } catch (error) {
    if (currentRun !== runId) return;
    detectionFinishedAt.value = Date.now();
    console.error('[LoadingPage] device profiling failed:', error);
    errorTitle.value = '设备检测异常';
    errorText.value = '已无法完成当前设备跑分，请点击重新检测。';
    progress.value = Math.max(progress.value, 82);
  } finally {
    if (currentRun === runId) isRunning.value = false;
  }
}

watch(() => props.mapReady, (ready) => {
  if (!ready) return;
  progress.value = 100;
  stageText.value = '地图已就绪，请点击进入系统';
  if (timeoutTimer) {
    window.clearTimeout(timeoutTimer);
    timeoutTimer = null;
  }
});

watch(() => props.visible, (visible) => {
  if (visible && !profile.value && !isRunning.value && !errorText.value) {
    runDetection(false);
  }
});

onMounted(() => {
  if (props.visible) runDetection(false);
});

onBeforeUnmount(() => {
  runId += 1;
  if (timeoutTimer) window.clearTimeout(timeoutTimer);
});
</script>

<style scoped lang="scss">
.loading-page {
  position: fixed;
  inset: 0;
  z-index: 9999;
  display: grid;
  grid-template-columns: minmax(220px, 320px) minmax(360px, 1fr) minmax(260px, 380px);
  gap: 22px;
  align-items: center;
  padding: 34px;
  overflow: hidden;
  color: #fff;
  font-family: "PingFang SC", "Microsoft YaHei", sans-serif;
  background: #111315;
}

.loading-bg,
.loading-overlay {
  position: absolute;
  inset: 0;
}

.loading-bg {
  overflow: hidden;
}

.loading-bg__image {
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: center bottom;
}

.loading-overlay {
  background:
    linear-gradient(90deg, rgba(8, 12, 15, 0.84) 0%, rgba(8, 12, 15, 0.48) 48%, rgba(8, 12, 15, 0.78) 100%),
    radial-gradient(760px 360px at 50% 48%, rgba(69, 239, 255, 0.16), rgba(69, 239, 255, 0) 68%);
}

.loading-brand,
.loading-main,
.loading-detail {
  position: relative;
  z-index: 1;
}

.loading-brand,
.loading-detail {
  height: min(680px, calc(100vh - 68px));
  min-height: 560px;
  max-height: 720px;
  padding: 22px;
  overflow: hidden;
  border: 1px solid rgba(255, 255, 255, 0.16);
  border-radius: 12px;
  background: rgba(13, 18, 24, 0.72);
  box-shadow: 0 20px 58px rgba(0, 0, 0, 0.32);
  backdrop-filter: blur(18px) saturate(150%);
  -webkit-backdrop-filter: blur(18px) saturate(150%);
}

.loading-brand {
  display: flex;
  flex-direction: column;
  gap: 14px;
  justify-content: flex-start;
}

.loading-brand__head {
  display: flex;
  gap: 12px;
  align-items: center;
}

.loading-brand__logo {
  width: 44px;
  height: 44px;
  object-fit: contain;
}

.loading-brand__title,
.loading-detail__title {
  font-size: 18px;
  font-weight: 700;
}

.loading-brand__subtitle,
.loading-detail__subtitle {
  margin-top: 4px;
  color: rgba(210, 232, 240, 0.68);
  font-size: 12px;
}

.loading-brand__status {
  display: grid;
  gap: 8px;
  color: rgba(226, 242, 247, 0.72);
  font-size: 13px;
}

.loading-brand__metrics {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}

.loading-brand__metric {
  min-width: 0;
  padding: 12px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.07);
}

.loading-brand__metric span,
.loading-brand__policy-row span {
  color: rgba(214, 233, 240, 0.64);
  font-size: 11px;
}

.loading-brand__metric strong,
.loading-brand__policy-row strong {
  display: block;
  margin-top: 6px;
  overflow: hidden;
  color: #fff;
  font-size: 13px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.loading-brand__section-title {
  color: #45efff;
  font-size: 12px;
  font-weight: 700;
}

.loading-brand__timeline,
.loading-brand__policy {
  display: grid;
  gap: 10px;
  padding: 12px;
  border: 1px solid rgba(69, 239, 255, 0.13);
  border-radius: 10px;
  background: rgba(69, 239, 255, 0.06);
}

.loading-brand__timeline {
  min-height: 0;
  overflow: auto;
  scrollbar-width: thin;
  scrollbar-color: rgba(69, 239, 255, 0.38) transparent;
}

.loading-brand__timeline::-webkit-scrollbar {
  width: 6px;
}

.loading-brand__timeline::-webkit-scrollbar-track {
  background: transparent;
}

.loading-brand__timeline::-webkit-scrollbar-thumb {
  border-radius: 999px;
  background: rgba(69, 239, 255, 0.22);
}

.loading-brand__timeline::-webkit-scrollbar-thumb:hover {
  background: rgba(69, 239, 255, 0.42);
}

.loading-brand__stage {
  display: grid;
  grid-template-columns: 14px 1fr;
  gap: 9px;
  align-items: start;
}

.loading-brand__stage-dot {
  width: 9px;
  height: 9px;
  margin-top: 4px;
  border-radius: 50%;
  background: rgba(148, 163, 184, 0.7);
  box-shadow: 0 0 0 3px rgba(148, 163, 184, 0.08);
}

.loading-brand__stage.is-active .loading-brand__stage-dot {
  background: #f5c443;
  box-shadow: 0 0 0 3px rgba(245, 196, 67, 0.12), 0 0 14px rgba(245, 196, 67, 0.65);
}

.loading-brand__stage.is-done .loading-brand__stage-dot {
  background: #2fe989;
  box-shadow: 0 0 0 3px rgba(47, 233, 137, 0.12), 0 0 14px rgba(47, 233, 137, 0.55);
}

.loading-brand__stage-main {
  display: grid;
  gap: 3px;
}

.loading-brand__stage-main strong {
  color: rgba(255, 255, 255, 0.92);
  font-size: 13px;
}

.loading-brand__stage-main span {
  color: rgba(214, 233, 240, 0.58);
  font-size: 11px;
}

.loading-brand__policy-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.loading-brand__policy-row strong {
  margin-top: 0;
  max-width: 150px;
  text-align: right;
}

.loading-brand__status {
  display: flex;
  align-items: center;
  margin-top: auto;
}

.loading-brand__status-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: #f5c443;
  box-shadow: 0 0 12px rgba(245, 196, 67, 0.8);
}

.loading-brand__status-dot.is-ready {
  background: #2fe989;
  box-shadow: 0 0 12px rgba(47, 233, 137, 0.8);
}

.loading-brand__status-dot.is-error {
  background: #f85149;
  box-shadow: 0 0 12px rgba(248, 81, 73, 0.8);
}

.loading-main {
  display: grid;
  justify-items: center;
  gap: 22px;
}

.loading-progress {
  width: min(640px, 100%);
  display: grid;
  justify-items: center;
  gap: 22px;
  padding: 34px;
  border: 1px solid rgba(69, 239, 255, 0.18);
  border-radius: 12px;
  background: rgba(6, 14, 20, 0.58);
  backdrop-filter: blur(12px) saturate(140%);
  -webkit-backdrop-filter: blur(12px) saturate(140%);
}

.loading-progress__ring {
  width: 154px;
  height: 154px;
  display: grid;
  place-items: center;
  border-radius: 50%;
  box-shadow: 0 0 34px rgba(69, 239, 255, 0.18);
}

.loading-progress__inner {
  width: 122px;
  height: 122px;
  display: flex;
  align-items: baseline;
  justify-content: center;
  gap: 2px;
  border-radius: 50%;
  background: rgba(10, 15, 20, 0.92);
  border: 1px solid rgba(255, 255, 255, 0.12);
}

.loading-progress__inner strong {
  margin-top: 38px;
  font-size: 38px;
  line-height: 1;
}

.loading-progress__inner span {
  color: rgba(202, 233, 241, 0.7);
  font-size: 14px;
}

.loading-progress__copy {
  text-align: center;
}

.loading-progress__eyebrow {
  color: #45efff;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.18em;
}

.loading-progress__copy h1 {
  margin-top: 10px;
  font-size: 24px;
  line-height: 1.35;
}

.loading-progress__copy p {
  margin-top: 8px;
  color: rgba(226, 242, 247, 0.76);
  font-size: 14px;
}

.loading-progress__bar {
  width: 100%;
  height: 8px;
  overflow: hidden;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.11);
}

.loading-progress__bar span {
  display: block;
  height: 100%;
  border-radius: inherit;
  background: linear-gradient(90deg, #0d9487, #06b6d4, #45efff);
  transition: width 0.28s ease;
}

.loading-summary {
  width: min(640px, 100%);
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
}

.loading-summary__item,
.loading-detail__card {
  min-width: 0;
  padding: 14px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.08);
}

.loading-summary__item span,
.loading-detail__card span,
.loading-strategy__row span {
  color: rgba(214, 233, 240, 0.68);
  font-size: 12px;
}

.loading-summary__item strong,
.loading-detail__card strong,
.loading-strategy__row strong {
  display: block;
  margin-top: 6px;
  overflow: hidden;
  color: #fff;
  font-size: 18px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.loading-error {
  width: min(640px, 100%);
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 8px 14px;
  align-items: center;
  padding: 14px 16px;
  border: 1px solid rgba(248, 81, 73, 0.45);
  border-radius: 10px;
  background: rgba(97, 20, 20, 0.72);
}

.loading-error strong,
.loading-error span {
  grid-column: 1;
}

.loading-error span {
  color: rgba(255, 232, 232, 0.78);
  font-size: 13px;
}

.loading-error button,
.loading-detail__head button,
.loading-basic-btn,
.loading-enter-btn {
  height: 34px;
  padding: 0 14px;
  border: 1px solid rgba(69, 239, 255, 0.36);
  border-radius: 8px;
  color: #fff;
  background: rgba(69, 239, 255, 0.12);
  cursor: pointer;
}

.loading-error button {
  grid-column: 2;
  grid-row: 1 / span 2;
}

.loading-basic-btn {
  width: min(220px, 100%);
  background: linear-gradient(90deg, #0d9487, #06b6d4);
  border-color: transparent;
  font-weight: 700;
}

.loading-enter-btn {
  width: min(260px, 100%);
  height: 44px;
  border-color: transparent;
  background: linear-gradient(90deg, #0d9487 0%, #06b6d4 60%, #45efff 100%);
  box-shadow: 0 14px 32px rgba(6, 182, 212, 0.25);
  font-size: 16px;
  font-weight: 800;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.loading-enter-btn:hover {
  transform: translateY(-1px);
  box-shadow: 0 18px 38px rgba(6, 182, 212, 0.34);
}

.loading-detail {
  display: flex;
  flex-direction: column;
  gap: 14px;
  justify-content: flex-start;
}

.loading-detail__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.loading-detail__grid {
  min-height: 0;
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  align-content: start;
  gap: 10px;
  overflow: auto;
  scrollbar-width: thin;
  scrollbar-color: rgba(69, 239, 255, 0.38) transparent;
}

.loading-detail__grid::-webkit-scrollbar {
  width: 6px;
}

.loading-detail__grid::-webkit-scrollbar-track {
  background: transparent;
}

.loading-detail__grid::-webkit-scrollbar-thumb {
  border-radius: 999px;
  background: rgba(69, 239, 255, 0.22);
}

.loading-detail__grid::-webkit-scrollbar-thumb:hover {
  background: rgba(69, 239, 255, 0.42);
}

.loading-detail__card strong {
  font-size: 14px;
}

.loading-strategy {
  display: grid;
  gap: 10px;
  margin-top: auto;
  padding: 12px;
  border-radius: 10px;
  background: rgba(69, 239, 255, 0.08);
  border: 1px solid rgba(69, 239, 255, 0.14);
}

.loading-strategy__title {
  font-size: 14px;
  font-weight: 700;
}

.loading-strategy__row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.loading-strategy__row strong {
  margin-top: 0;
  font-size: 13px;
}

.loading-fade-enter-active,
.loading-fade-leave-active {
  transition: opacity 0.6s ease;
}

.loading-fade-enter-from,
.loading-fade-leave-to {
  opacity: 0;
}

@media (max-width: 1180px) {
  .loading-page {
    grid-template-columns: 1fr;
    align-content: center;
    padding: 22px;
    overflow-y: auto;
  }

  .loading-brand,
  .loading-detail {
    height: auto;
    min-height: auto;
    max-height: none;
    overflow: visible;
  }

  .loading-brand__timeline,
  .loading-detail__grid {
    overflow: visible;
  }
}

@media (max-width: 720px) {
  .loading-summary,
  .loading-detail__grid {
    grid-template-columns: 1fr;
  }

  .loading-progress {
    padding: 24px 18px;
  }

  .loading-progress__copy h1 {
    font-size: 20px;
  }
}
</style>
