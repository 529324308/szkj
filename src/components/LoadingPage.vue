<template>
  <transition name="loading-fade">
    <div v-if="visible" class="loading-page" :class="{ 'is-leaving': isLeaving }">
      <picture class="loading-bg">
        <source :srcset="bgWide" media="(min-aspect-ratio: 16/9)" />
        <source :srcset="bgWide" media="(min-width: 1600px)" />
        <img :src="bgTall" alt="" class="loading-bg__image" />
      </picture>

      <div class="loading-overlay"></div>

      <header class="loading-topbar">
        <div class="loading-topbar__brand">
          <img class="loading-topbar__logo" :src="logoUrl" alt="平台标识" />
          <div>
            <div class="loading-topbar__title">浙江数治空间平台</div>
            <div class="loading-topbar__subtitle">Spatial Workbench</div>
          </div>
        </div>

        <div class="loading-topbar__state">
          <span class="loading-status-dot" :class="statusDotClass"></span>
          <strong>{{ statusText }}</strong>
          <span>{{ stageText }}</span>
        </div>

        <div class="loading-topbar__metrics" aria-label="加载摘要">
          <span v-for="item in topBarMetrics" :key="item.label" class="loading-topbar__metric">
            <em>{{ item.label }}</em>
            <strong>{{ item.value }}</strong>
          </span>
        </div>

        <div class="loading-topbar__actions">
          <details v-if="showEngineChoices && secondaryEngineOption" class="loading-engine-switch">
            <summary>备用入口</summary>
            <div class="loading-engine-switch__menu">
              <span>{{ secondaryEngineOption.title }}</span>
              <button
                type="button"
                :disabled="secondaryEngineOption.disabled || isLeaving"
                :title="secondaryEngineOption.disabledReason || secondaryEngineOption.title"
                @click="selectEngine(secondaryEngineOption.engine)"
              >
                进入系统
              </button>
            </div>
          </details>
          <button type="button" class="loading-topbar__retry" @click="runDetection(true)">重新预检</button>
        </div>
      </header>

      <main class="loading-main">
        <section class="loading-spiral" aria-label="加载动画">
          <SpiralAnimation :progress="progress" />
          <div class="loading-spiral__center" :class="{ 'is-enter-ready': canSelectPrimaryEngine }">
            <button
              v-if="showCenterEnterPrompt"
              class="loading-enter-button"
              type="button"
              :disabled="!canSelectPrimaryEngine"
              @click="handlePrimaryEnterClick"
            >
              <span class="loading-enter-button__label">{{ enterButtonText }}</span>
              进入系统
            </button>
          </div>
        </section>

        <div v-if="errorText" class="loading-error">
          <strong>{{ errorTitle }}</strong>
          <span>{{ errorText }}</span>
          <button type="button" @click="runDetection(true)">重新预检</button>
        </div>
      </main>
    </div>
  </transition>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import bgWide from '../assets/jz_bg.png';
import bgTall from '../assets/jz_bg2.png';
import logoUrl from '../assets/logo.png';
import { clearDeviceProfileCache, collectDeviceProfile, resolveRecommendedMapEngine } from '../utils/deviceProfile';
import SpiralAnimation from './ui/SpiralAnimation.vue';

const props = defineProps({
  visible: {
    type: Boolean,
    default: true,
  },
  mapReady: {
    type: Boolean,
    default: false,
  },
  selectedMapEngine: {
    type: String,
    default: '',
  },
  recommendedMapEngine: {
    type: String,
    default: '',
  },
  preferredMapEngine: {
    type: String,
    default: '',
  },
});

const emit = defineEmits(['profile-ready', 'enter-click', 'enter-engine']);

const progress = ref(0);
const stageText = ref('系统准备中');
const profile = ref(null);
const preset = ref(null);
const errorText = ref('');
const errorTitle = ref('预检失败');
const isRunning = ref(false);
const enterPromptReady = computed(() => {
  const primary = primaryEngineOption.value;
  if (!props.visible || !primary) return false;
  if (primary.engine === props.selectedMapEngine) return props.mapReady;
  if (primary.engine === 'cesium') return false;
  return !!profile.value;
});
const isLeaving = ref(false);
const profileSource = ref('实时预检');
let runId = 0;
let leaveTimer = null;
let autoEnterTimer = null;
let enterClickEmitted = false;
const AUTO_ENTER_DELAY_MS = 10000;

const browserFallback = computed(() => ({
  hardwareConcurrency: navigator.hardwareConcurrency || 0,
  deviceMemory: typeof navigator.deviceMemory === 'number' ? navigator.deviceMemory : null,
  devicePixelRatio: window.devicePixelRatio || 1,
  viewportWidth: window.innerWidth || 0,
  viewportHeight: window.innerHeight || 0,
}));
const scoreText = computed(() => {
  const score = profile.value?.benchmark?.totalScore;
  return typeof score === 'number' ? `${score.toFixed(1)}` : '--';
});
const tierText = computed(() => profile.value?.benchmark?.tierText || '评估中');
const effectiveRecommendedEngine = computed(() => (
  props.recommendedMapEngine || (profile.value ? resolveRecommendedMapEngine(profile.value) : '')
));
const recommendedEngineText = computed(() => formatEngineName(effectiveRecommendedEngine.value) || '评估中');
const statusText = computed(() => {
  if (props.mapReady) return '系统已就绪';
  if (props.selectedMapEngine) return `正在接入${formatEngineName(props.selectedMapEngine)}`;
  if (profile.value) return '版本待选';
  if (errorText.value) return '预检异常';
  return '系统准备中';
});
const statusDotClass = computed(() => ({
  'is-error': !!errorText.value,
  'is-ready': props.mapReady,
}));

const topBarMetrics = computed(() => {
  const browser = profile.value?.browser || browserFallback.value;
  const webgl = profile.value?.webgl || {};
  const viewport = browser.viewportWidth && browser.viewportHeight
    ? `${browser.viewportWidth} x ${browser.viewportHeight}`
    : `${window.innerWidth || '--'} x ${window.innerHeight || '--'}`;
  return [
    { label: '评分', value: scoreText.value },
    { label: '档位', value: tierText.value },
    { label: '推荐', value: recommendedEngineText.value },
    { label: '上次', value: formatEngineName(props.preferredMapEngine) || '暂无' },
    { label: '视口', value: viewport },
    { label: 'WebGL', value: webgl.supported ? webgl.version : progress.value >= 25 ? '校验中' : '待校验' },
    { label: '来源', value: profile.value ? profileSource.value : '实时预检' },
  ];
});
const showEngineChoices = computed(() => !!profile.value);
const showCenterEnterPrompt = computed(() => props.visible);
const canSelectPrimaryEngine = computed(() => (
  enterPromptReady.value && !isLeaving.value && !!primaryEngineOption.value && !primaryEngineOption.value.disabled
));
const enterButtonText = computed(() => (enterPromptReady.value ? '进入系统' : '系统准备中'));
const engineOptions = computed(() => {
  const recommended = effectiveRecommendedEngine.value;
  const preferred = props.preferredMapEngine;
  const cesiumDisabled = profile.value?.webgl?.supported === false;
  return [
    {
      engine: 'openlayers',
      title: 'OpenLayers 轻量版',
      desc: '适合低配设备和二维业务地图，启动更轻。',
      badge: recommended === 'openlayers' ? '系统推荐' : '二维优先',
      recommended: recommended === 'openlayers',
      preferred: preferred === 'openlayers',
      disabled: false,
      disabledReason: '',
    },
    {
      engine: 'cesium',
      title: 'Cesium 高性能版',
      desc: '适合三维地形、3D Tiles 和高性能场景。',
      badge: recommended === 'cesium' ? '系统推荐' : '三维能力',
      recommended: recommended === 'cesium',
      preferred: preferred === 'cesium',
      disabled: cesiumDisabled,
      disabledReason: cesiumDisabled ? '当前浏览器不支持 WebGL，无法进入 Cesium 高性能版' : '',
    },
  ];
});
const primaryEngineOption = computed(() => {
  const recommended = effectiveRecommendedEngine.value;
  return engineOptions.value.find((option) => option.engine === recommended && !option.disabled)
    || engineOptions.value.find((option) => !option.disabled)
    || null;
});
const secondaryEngineOption = computed(() => (
  engineOptions.value.find((option) => option.engine !== primaryEngineOption.value?.engine) || null
));

async function runDetection(force = false) {
  const currentRun = ++runId;
  clearAutoEnterTimer();
  isRunning.value = true;
  errorText.value = '';
  errorTitle.value = '预检失败';
  profile.value = null;
  preset.value = null;
  profileSource.value = force ? '重新预检' : '实时预检';
  progress.value = force ? 4 : 0;
  stageText.value = '系统准备中';
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
    profileSource.value = result.fromCache ? '缓存档案' : '实时预检';

    if (!result.profile?.webgl?.supported) {
      errorTitle.value = '安全校验未通过';
      errorText.value = '当前环境暂不满足 Cesium 高性能版要求，可先进入 OpenLayers 轻量版。';
      progress.value = 100;
      stageText.value = '安全校验完成，请选择进入版本';
      emitProfileReady(result);
      return;
    }

    progress.value = Math.max(progress.value, 90);
    stageText.value = result.fromCache ? '已读取设备档案，正在生成进入建议' : '系统准备完成，请选择进入版本';
    emitProfileReady(result);
  } catch (error) {
    if (currentRun !== runId) return;
    console.error('[LoadingPage] device profiling failed:', error);
    errorTitle.value = '设备预检异常';
    errorText.value = '当前设备暂未完成完整评估，仍可进入 OpenLayers 轻量版。';
    profile.value = createFailureProfile();
    preset.value = null;
    progress.value = 100;
    stageText.value = '预检异常，请选择进入版本';
    emitProfileReady({
      profile: profile.value,
      preset: null,
      fromCache: false,
    });
  } finally {
    if (currentRun === runId) isRunning.value = false;
  }
}

watch(() => props.mapReady, (ready) => {
  if (!ready) return;
  progress.value = 100;
  stageText.value = '工作台已就绪';
});

watch(() => props.visible, (visible) => {
  if (visible) {
    isLeaving.value = false;
    enterClickEmitted = false;
  } else {
    enterClickEmitted = false;
    clearLeaveTimer();
    clearAutoEnterTimer();
  }
  if (visible && !profile.value && !isRunning.value && !errorText.value) {
    runDetection(false);
  }
});

watch(() => props.selectedMapEngine, (engine) => {
  if (!engine || props.mapReady) return;
  stageText.value = `正在接入${formatEngineName(engine)}`;
  progress.value = Math.max(progress.value, 96);
});

watch(canSelectPrimaryEngine, (ready) => {
  if (ready) {
    startAutoEnterTimer();
  } else {
    clearAutoEnterTimer();
  }
}, { immediate: true });

onMounted(() => {
  if (props.visible) runDetection(false);
});

onBeforeUnmount(() => {
  runId += 1;
  clearLeaveTimer();
  clearAutoEnterTimer();
});

function selectEngine(engine) {
  clearAutoEnterTimer();
  emitEnterClick();
  emit('enter-engine', { engine });
  if (props.mapReady && props.selectedMapEngine === engine) {
    stageText.value = '工作台已就绪';
    progress.value = 100;
    return;
  }

  stageText.value = `正在接入${formatEngineName(engine)}`;
  progress.value = Math.max(progress.value, 96);
}

function handlePrimaryEnterClick() {
  if (!canSelectPrimaryEngine.value) return;
  clearAutoEnterTimer();
  triggerPrimaryEnter();
}

function triggerPrimaryEnter() {
  if (!canSelectPrimaryEngine.value) return;
  emitEnterClick();
  const engine = primaryEngineOption.value.engine;
  isLeaving.value = true;
  clearLeaveTimer();
  leaveTimer = window.setTimeout(() => {
    leaveTimer = null;
    selectEngine(engine);
  }, 700);
}

function startAutoEnterTimer() {
  clearAutoEnterTimer();
  autoEnterTimer = window.setTimeout(() => {
    autoEnterTimer = null;
    triggerPrimaryEnter();
  }, AUTO_ENTER_DELAY_MS);
}

function emitEnterClick() {
  if (enterClickEmitted) return;

  enterClickEmitted = true;
  emit('enter-click');
}

function clearLeaveTimer() {
  if (leaveTimer) {
    window.clearTimeout(leaveTimer);
    leaveTimer = null;
  }
}

function clearAutoEnterTimer() {
  if (autoEnterTimer) {
    window.clearTimeout(autoEnterTimer);
    autoEnterTimer = null;
  }
}

function emitProfileReady(result) {
  emit('profile-ready', {
    profile: result.profile,
    preset: result.preset,
    recommendedMapEngine: resolveRecommendedMapEngine(result.profile),
    fromCache: result.fromCache,
  });
}

function formatEngineName(engine) {
  if (engine === 'openlayers') return 'OpenLayers 轻量版';
  if (engine === 'cesium') return 'Cesium 高性能版';
  return '';
}

function createFailureProfile() {
  return {
    collectedAt: Date.now(),
    browser: browserFallback.value,
    webgl: {
      supported: false,
      version: '',
      renderer: '',
      vendor: '',
      gpuClass: 'unknown',
      discreteGpu: false,
      discreteGpuReason: 'Device profiling failed',
      maxTextureSize: 0,
      maxRenderbufferSize: 0,
      maxVertexTextureImageUnits: 0,
      antialias: false,
      softwareRenderer: false,
    },
    benchmark: {
      cpuScore: 0,
      gpuScore: 0,
      memoryScore: 0,
      browserScore: 0,
      totalScore: 0,
      tierKey: 'low',
      tierText: '低配',
      modeText: '低负载模式',
      estimatedFps: '0',
      cpu: null,
      gpu: null,
    },
  };
}
</script>

<style scoped lang="scss">
.loading-page {
  position: fixed;
  inset: 0;
  z-index: 9999;
  display: block;
  padding: 16px 24px;
  overflow: hidden;
  color: #fff;
  font-family: "PingFang SC", "Microsoft YaHei", sans-serif;
  background: #000;
}

.loading-bg,
.loading-overlay {
  display: none;
}

.loading-topbar,
.loading-main {
  position: absolute;
  z-index: 1;
}

.loading-topbar {
  top: 16px;
  left: 24px;
  right: 24px;
  min-height: 58px;
  display: grid;
  grid-template-columns: minmax(210px, auto) minmax(180px, 0.9fr) minmax(240px, 1.4fr) auto;
  gap: 14px;
  align-items: center;
  padding: 9px 12px;
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 8px;
  background: rgba(11, 17, 22, 0.78);
  box-shadow: 0 14px 42px rgba(0, 0, 0, 0.32);
  backdrop-filter: blur(18px) saturate(150%);
  -webkit-backdrop-filter: blur(18px) saturate(150%);
  transition: opacity 0.65s ease, transform 0.65s ease, filter 0.65s ease;
}

.loading-topbar__brand,
.loading-topbar__state,
.loading-topbar__metric,
.loading-topbar__actions,
.loading-engine-switch__menu {
  min-width: 0;
  display: flex;
  align-items: center;
}

.loading-topbar__brand {
  gap: 10px;
}

.loading-topbar__logo {
  width: 36px;
  height: 36px;
  flex: 0 0 auto;
  object-fit: contain;
}

.loading-topbar__title {
  overflow: hidden;
  font-size: 16px;
  font-weight: 700;
  line-height: 1.2;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.loading-topbar__subtitle {
  margin-top: 3px;
  overflow: hidden;
  color: rgba(210, 232, 240, 0.64);
  font-size: 11px;
  line-height: 1.1;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.loading-topbar__state {
  gap: 8px;
  overflow: hidden;
}

.loading-topbar__state strong {
  flex: 0 0 auto;
  font-size: 13px;
  font-weight: 700;
  white-space: nowrap;
}

.loading-topbar__state span:last-child {
  min-width: 0;
  overflow: hidden;
  color: rgba(226, 242, 247, 0.72);
  font-size: 12px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.loading-status-dot {
  width: 9px;
  height: 9px;
  flex: 0 0 auto;
  border-radius: 50%;
  background: #f5c443;
  box-shadow: 0 0 12px rgba(245, 196, 67, 0.8);
}

.loading-status-dot.is-ready {
  background: #2fe989;
  box-shadow: 0 0 12px rgba(47, 233, 137, 0.8);
}

.loading-status-dot.is-error {
  background: #f85149;
  box-shadow: 0 0 12px rgba(248, 81, 73, 0.8);
}

.loading-topbar__metrics {
  min-width: 0;
  display: flex;
  gap: 8px;
  overflow-x: auto;
  overflow-y: hidden;
  scrollbar-width: none;
}

.loading-topbar__metrics::-webkit-scrollbar {
  display: none;
}

.loading-topbar__metric {
  height: 36px;
  flex: 0 0 auto;
  gap: 6px;
  padding: 0 10px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.07);
}

.loading-topbar__metric em {
  color: rgba(214, 233, 240, 0.62);
  font-size: 11px;
  font-style: normal;
  white-space: nowrap;
}

.loading-topbar__metric strong {
  max-width: 136px;
  overflow: hidden;
  color: #fff;
  font-size: 12px;
  font-weight: 700;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.loading-topbar__actions {
  justify-content: flex-end;
  gap: 8px;
}

.loading-topbar__retry,
.loading-engine-switch summary,
.loading-engine-switch__menu button {
  height: 36px;
  padding: 0 12px;
  border: 1px solid rgba(69, 239, 255, 0.34);
  border-radius: 8px;
  color: #fff;
  background: rgba(69, 239, 255, 0.12);
  font-size: 13px;
  cursor: pointer;
}

.loading-engine-switch {
  position: relative;
}

.loading-engine-switch summary {
  display: flex;
  align-items: center;
  list-style: none;
  white-space: nowrap;
}

.loading-engine-switch summary::-webkit-details-marker {
  display: none;
}

.loading-engine-switch__menu {
  position: absolute;
  top: calc(100% + 8px);
  right: 0;
  width: 240px;
  justify-content: space-between;
  gap: 10px;
  padding: 10px;
  border: 1px solid rgba(255, 255, 255, 0.14);
  border-radius: 8px;
  background: rgba(11, 17, 22, 0.94);
  box-shadow: 0 16px 42px rgba(0, 0, 0, 0.36);
  backdrop-filter: blur(14px) saturate(150%);
  -webkit-backdrop-filter: blur(14px) saturate(150%);
}

.loading-engine-switch__menu span {
  min-width: 0;
  overflow: hidden;
  color: rgba(226, 242, 247, 0.78);
  font-size: 12px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.loading-engine-switch__menu button {
  flex: 0 0 auto;
}

.loading-topbar__retry:hover,
.loading-engine-switch summary:hover,
.loading-engine-switch__menu button:hover:not(:disabled) {
  border-color: rgba(69, 239, 255, 0.62);
  background: rgba(69, 239, 255, 0.18);
}

.loading-engine-switch__menu button:disabled,
.loading-enter-button:disabled {
  cursor: not-allowed;
  opacity: 0.52;
}

.loading-main {
  inset: 0;
  z-index: 0;
}

.loading-spiral {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  min-height: 100%;
  overflow: hidden;
  background: #000;
  transition: opacity 0.7s ease, transform 0.7s ease, filter 0.7s ease;
}

.loading-spiral::after {
  content: '';
  position: absolute;
  inset: 0;
  background:
    radial-gradient(circle at center, rgba(255, 255, 255, 0.26), rgba(255, 255, 255, 0.06) 28%, transparent 58%),
    radial-gradient(circle at center, rgba(255, 255, 255, 0.14), transparent 62%);
  opacity: 0;
  transition: opacity 0.35s ease;
  pointer-events: none;
}

.loading-spiral__center.is-enter-ready {
  animation: loadingEnterFloat 2.8s ease-in-out infinite;
}

.loading-spiral__center {
  position: absolute;
  inset: 0;
  z-index: 2;
  display: grid;
  place-items: center;
  pointer-events: none;
  transition: opacity 0.5s ease, transform 0.5s ease, filter 0.5s ease;
}

.loading-spiral__center.is-enter-ready .loading-enter-button {
  animation:
    loadingEnterPulse 2.8s ease-in-out infinite,
    loadingEnterScale 2.8s ease-in-out infinite;
}

.loading-spiral__center.is-enter-ready::before {
  content: '';
  position: absolute;
  inset: 50% auto auto 50%;
  width: min(44vw, 420px);
  height: min(44vw, 420px);
  transform: translate(-50%, -50%);
  border-radius: 50%;
  background: radial-gradient(circle, rgba(255, 255, 255, 0.34), rgba(255, 255, 255, 0.08) 38%, transparent 68%);
  filter: blur(6px);
  opacity: 0.9;
  animation: loadingGlowPulse 3.2s ease-in-out infinite;
}

.loading-page.is-leaving .loading-topbar {
  opacity: 0;
  transform: translateY(-12px);
  filter: blur(6px);
  pointer-events: none;
}

.loading-page.is-leaving .loading-spiral {
  opacity: 0;
  transform: scale(1.04);
  filter: blur(8px);
  pointer-events: none;
}

.loading-page.is-leaving .loading-spiral__center {
  animation: none;
  opacity: 0;
  transform: translateY(8px) scale(0.98);
  filter: blur(4px);
  pointer-events: none;
}

.loading-page.is-leaving .loading-enter-button {
  animation: none;
}

.loading-error {
  position: absolute;
  z-index: 3;
  right: 24px;
  bottom: 24px;
  width: min(480px, calc(100vw - 48px));
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 8px 14px;
  align-items: center;
  padding: 12px 14px;
  border: 1px solid rgba(248, 81, 73, 0.45);
  border-radius: 8px;
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

.loading-error button {
  grid-column: 2;
  grid-row: 1 / span 2;
  height: 34px;
  padding: 0 14px;
  border: 1px solid rgba(69, 239, 255, 0.36);
  border-radius: 8px;
  color: #fff;
  background: rgba(69, 239, 255, 0.12);
  cursor: pointer;
}

.loading-enter-button {
  pointer-events: auto;
  border: 0;
  color: #fff;
  background: transparent;
  font-size: 0;
  font-weight: 200;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  cursor: pointer;
  animation: loadingEnterPulse 3s ease-in-out infinite;
  transition: letter-spacing 0.7s ease, opacity 0.3s ease;
}

.loading-enter-button__label {
  font-size: 24px;
}

.loading-enter-button:hover:not(:disabled) {
  letter-spacing: 0.3em;
}

@keyframes loadingEnterPulse {
  0%,
  100% {
    opacity: 0.72;
  }

  50% {
    opacity: 1;
  }
}

@keyframes loadingEnterScale {
  0%,
  100% {
    transform: scale(1);
  }

  50% {
    transform: scale(1.08);
  }
}

@keyframes loadingGlowPulse {
  0%,
  100% {
    opacity: 0.45;
    transform: translate(-50%, -50%) scale(0.96);
  }

  50% {
    opacity: 1;
    transform: translate(-50%, -50%) scale(1.05);
  }
}

@keyframes loadingEnterFloat {
  0%,
  100% {
    transform: translateY(0);
  }

  50% {
    transform: translateY(-4px);
  }
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
    padding: 12px 14px;
  }

  .loading-topbar {
    top: 12px;
    left: 14px;
    right: 14px;
    grid-template-columns: minmax(180px, auto) minmax(160px, 1fr) auto;
  }

  .loading-topbar__metrics {
    grid-column: 1 / -1;
    order: 4;
  }
}

@media (max-width: 720px) {
  .loading-page {
    gap: 14px;
  }

  .loading-topbar {
    grid-template-columns: minmax(0, 1fr) auto;
    align-items: start;
  }

  .loading-topbar__state,
  .loading-topbar__metrics {
    grid-column: 1 / -1;
  }

  .loading-topbar__state {
    order: 3;
  }

  .loading-topbar__metrics {
    order: 4;
  }

  .loading-topbar__actions {
    align-self: center;
  }

  .loading-topbar__title {
    font-size: 15px;
  }

  .loading-engine-switch__menu {
    right: -58px;
    width: min(240px, calc(100vw - 28px));
  }

  .loading-enter-button {
    font-size: 20px;
  }
}
</style>
