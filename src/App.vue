<template>
  <PwaInstallButton />
  <PwaInstallGuideOverlay
    :visible="installGuideVisible"
    @close="installGuideVisible = false"
    @installed="installGuideVisible = false"
  />
  <Login v-if="!loggedIn" @success="onLoginSuccess" />
  <template v-else>
    <CesiumMap
      v-if="mapShouldMount && selectedMapEngine === 'cesium'"
      :device-profile="deviceProfile"
      :render-preset="renderPreset"
      :home-active="!loadingVisible && enterRequested"
      @ready="onMapReady"
      @logout="onLogout"
    />
    <OpenLayersMap
      v-if="mapShouldMount && selectedMapEngine === 'openlayers'"
      :device-profile="deviceProfile"
      :home-active="!loadingVisible && enterRequested"
      @ready="onMapReady"
      @logout="onLogout"
    />
    <LoadingPage
      :visible="loadingVisible"
      :map-ready="mapReady"
      :selected-map-engine="selectedMapEngine"
      :recommended-map-engine="recommendedMapEngine"
      :preferred-map-engine="preferredMapEngine"
      @profile-ready="onProfileReady"
      @enter-click="onEnterClick"
      @enter-engine="enterMapEngine"
    />
    <WelcomeShaderOverlay
      v-if="welcomeVisible"
      title="欢迎来到  浙江数治GeoAgent"
      @complete="onWelcomeComplete"
    />
  </template>
</template>

<script setup>
import { nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { ElNotification } from 'element-plus';
import CesiumMap from './components/CesiumMap.vue';
import OpenLayersMap from './components/OpenLayersMap.vue';
import LoadingPage from './components/LoadingPage.vue';
import WelcomeShaderOverlay from './components/ui/WelcomeShaderOverlay.vue';
import Login from './components/Login.vue';
import PwaInstallButton from './components/PwaInstallButton.vue';
import PwaInstallGuideOverlay from './components/PwaInstallGuideOverlay.vue';
import { usePwaInstall } from './composables/usePwaInstall';
import { connectChatSocket, disconnectChatSocket, useChatWebSocket } from './composables/useChatWebSocket';
import { isTokenValid, logout } from './api/auth';
import { forceFreshReload } from './utils/appStorage';
import { buildConservativeRenderPreset, resolveRecommendedMapEngine } from './utils/deviceProfile';

const PREFERRED_MAP_ENGINE_KEY = 'szkj:preferred-map-engine';
const WELCOME_DELAY_MS = 500;
const MAP_ENGINES = new Set(['openlayers', 'cesium']);

const loggedIn = ref(false);
const loadingVisible = ref(false);
const mapReady = ref(false);
const mapShouldMount = ref(false);
const deviceProfile = ref(null);
const renderPreset = ref(null);
const selectedMapEngine = ref('');
const recommendedMapEngine = ref('');
const preferredMapEngine = ref('');
const enterRequested = ref(false);
const welcomeVisible = ref(false);
const welcomeCompleted = ref(false);
const installGuideVisible = ref(false);
const hasShownInstallGuideForEntry = ref(false);
const lastNotifiedReminderKey = ref('');
let welcomeDelayTimer = null;
const { isStandaloneApp } = usePwaInstall();
const { latestReportReminder } = useChatWebSocket();

onMounted(() => {
  if (isTokenValid()) {
    loggedIn.value = true;
    resumeAuthenticatedSession();
  } else {
    resetAuthenticatedState();
    logout();
  }
});

onBeforeUnmount(() => {
  clearWelcomeDelayTimer();
  disconnectChatSocket();
});

function startLoadingFlow() {
  resetWelcomeFlow();
  mapReady.value = false;
  mapShouldMount.value = false;
  selectedMapEngine.value = '';
  recommendedMapEngine.value = '';
  preferredMapEngine.value = readPreferredMapEngine();
  enterRequested.value = false;
  deviceProfile.value = null;
  renderPreset.value = null;
  loadingVisible.value = true;
}

function onLoginSuccess() {
  loggedIn.value = true;
  startLoadingFlow();
}

async function resumeAuthenticatedSession() {
  resetWelcomeFlow();
  const engine = readPreferredMapEngine() || 'openlayers';

  mapReady.value = false;
  mapShouldMount.value = false;
  selectedMapEngine.value = engine;
  recommendedMapEngine.value = engine;
  preferredMapEngine.value = engine;
  enterRequested.value = true;
  deviceProfile.value = null;
  renderPreset.value = buildConservativeRenderPreset();
  loadingVisible.value = false;

  await nextTick();
  mapShouldMount.value = true;
}

async function onProfileReady(payload = {}) {
  deviceProfile.value = payload.profile || null;
  renderPreset.value = payload.preset || buildConservativeRenderPreset();
  const recommended = payload.recommendedMapEngine || resolveRecommendedMapEngine(deviceProfile.value);
  recommendedMapEngine.value = recommended;
  await nextTick();
  if (!enterRequested.value && recommended === 'cesium') {
    await preloadMapEngine('cesium');
  } else if (!enterRequested.value && selectedMapEngine.value === 'cesium') {
    await unloadMapEngine();
  }
}

function onMapReady() {
  mapReady.value = true;
  finishLoadingIfReady();
}

async function enterMapEngine(payload = {}) {
  const engine = MAP_ENGINES.has(payload.engine) ? payload.engine : recommendedMapEngine.value || 'openlayers';
  startWelcomeDelay();
  enterRequested.value = true;
  if (!renderPreset.value) {
    renderPreset.value = buildConservativeRenderPreset();
  }
  writePreferredMapEngine(engine);
  preferredMapEngine.value = engine;

  if (selectedMapEngine.value === engine && mapShouldMount.value) {
    if (mapReady.value) {
      finishLoadingIfReady();
    }
    return;
  }

  if (mapShouldMount.value && selectedMapEngine.value && selectedMapEngine.value !== engine) {
    await unloadMapEngine();
  }

  selectedMapEngine.value = engine;
  mapReady.value = false;
  await nextTick();
  mapShouldMount.value = true;
}

async function preloadMapEngine(engine) {
  if (!MAP_ENGINES.has(engine)) return;
  if (!renderPreset.value) {
    renderPreset.value = buildConservativeRenderPreset();
  }
  if (selectedMapEngine.value === engine && mapShouldMount.value) return;

  selectedMapEngine.value = engine;
  mapReady.value = false;
  await nextTick();
  mapShouldMount.value = true;
}

async function unloadMapEngine() {
  mapReady.value = false;
  mapShouldMount.value = false;
  await nextTick();
  selectedMapEngine.value = '';
}

async function onLogout(options = {}) {
  const { reload = true } = options;
  mapShouldMount.value = false;
  await nextTick();
  await logout({ clearAll: true, clearCaches: true });
  resetAuthenticatedState();
  if (reload) {
    forceFreshReload();
  }
}

function resetAuthenticatedState() {
  resetWelcomeFlow();
  loggedIn.value = false;
  loadingVisible.value = false;
  mapReady.value = false;
  mapShouldMount.value = false;
  selectedMapEngine.value = '';
  recommendedMapEngine.value = '';
  preferredMapEngine.value = '';
  enterRequested.value = false;
  deviceProfile.value = null;
  renderPreset.value = null;
  installGuideVisible.value = false;
  hasShownInstallGuideForEntry.value = false;
}

function onEnterClick() {
  startWelcomeDelay();
}

function onWelcomeComplete() {
  welcomeCompleted.value = true;
  finishLoadingIfReady();
}

function startWelcomeDelay() {
  if (welcomeVisible.value || welcomeCompleted.value || welcomeDelayTimer) return;

  welcomeDelayTimer = window.setTimeout(() => {
    welcomeDelayTimer = null;
    welcomeVisible.value = true;
  }, WELCOME_DELAY_MS);
}

function finishLoadingIfReady() {
  if (!enterRequested.value || !mapReady.value || !welcomeCompleted.value) return;

  welcomeVisible.value = false;
  loadingVisible.value = false;
}

function resetWelcomeFlow() {
  clearWelcomeDelayTimer();
  welcomeVisible.value = false;
  welcomeCompleted.value = false;
}

function clearWelcomeDelayTimer() {
  if (!welcomeDelayTimer) return;

  window.clearTimeout(welcomeDelayTimer);
  welcomeDelayTimer = null;
}

function readPreferredMapEngine() {
  try {
    const value = localStorage.getItem(PREFERRED_MAP_ENGINE_KEY);
    return MAP_ENGINES.has(value) ? value : '';
  } catch {
    return '';
  }
}

function writePreferredMapEngine(engine) {
  try {
    localStorage.setItem(PREFERRED_MAP_ENGINE_KEY, engine);
  } catch {
    // Ignore private-mode or quota failures.
  }
}

watch(
  () => loggedIn.value && !loadingVisible.value && mapReady.value,
  (enteredHome) => {
    if (!enteredHome) {
      installGuideVisible.value = false;
      hasShownInstallGuideForEntry.value = false;
      return;
    }

    if (!hasShownInstallGuideForEntry.value && !isStandaloneApp.value) {
      installGuideVisible.value = true;
      hasShownInstallGuideForEntry.value = true;
    }
  },
  { immediate: true },
);

watch(isStandaloneApp, (standalone) => {
  if (standalone) {
    installGuideVisible.value = false;
  }
});

watch(loggedIn, (nextLoggedIn) => {
  if (nextLoggedIn) {
    connectChatSocket().catch(() => {});
    return;
  }

  lastNotifiedReminderKey.value = '';
  disconnectChatSocket({ clearMessages: true });
}, { immediate: true });

watch(
  () => latestReportReminder.value?.__key || '',
  (nextKey) => {
    if (!loggedIn.value || !nextKey || nextKey === lastNotifiedReminderKey.value) return;

    const reminder = latestReportReminder.value;
    lastNotifiedReminderKey.value = nextKey;
    if (!reminder || reminder.IsRead) return;

    ElNotification({
      title: '日报未提交提醒',
      message: reminder.Message || '您有新的管理中心通知，请及时处理。',
      type: 'warning',
      duration: 5000,
    });
  },
);
</script>

<style scoped>
</style>
