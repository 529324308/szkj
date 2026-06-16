<template>
  <Login v-if="!loggedIn" @success="onLoginSuccess" />
  <template v-else>
    <CesiumMap
      v-if="mapShouldMount"
      :device-profile="deviceProfile"
      :render-preset="renderPreset"
      @ready="onMapReady"
      @logout="onLogout"
    />
    <LoadingPage
      :visible="loadingVisible"
      :map-ready="mapReady"
      @profile-ready="onProfileReady"
      @enter-basic="enterBasicMode"
      @enter-system="enterSystem"
    />
  </template>
</template>

<script setup>
import { nextTick, onMounted, ref } from 'vue';
import CesiumMap from './components/CesiumMap.vue';
import LoadingPage from './components/LoadingPage.vue';
import Login from './components/Login.vue';
import { isTokenValid, logout } from './api/auth';
import { buildConservativeRenderPreset } from './utils/deviceProfile';

const loggedIn = ref(false);
const loadingVisible = ref(false);
const mapReady = ref(false);
const mapShouldMount = ref(false);
const deviceProfile = ref(null);
const renderPreset = ref(null);

onMounted(() => {
  if (isTokenValid()) {
    loggedIn.value = true;
    startLoadingFlow();
  } else {
    onLogout();
  }
});

function startLoadingFlow() {
  mapReady.value = false;
  mapShouldMount.value = false;
  deviceProfile.value = null;
  renderPreset.value = null;
  loadingVisible.value = true;
}

function onLoginSuccess() {
  loggedIn.value = true;
  startLoadingFlow();
}

async function onProfileReady(payload = {}) {
  deviceProfile.value = payload.profile || null;
  renderPreset.value = payload.preset || buildConservativeRenderPreset();
  await nextTick();
  mapShouldMount.value = true;
}

function onMapReady() {
  mapReady.value = true;
}

function enterBasicMode() {
  if (!renderPreset.value) {
    renderPreset.value = buildConservativeRenderPreset();
  }
  mapShouldMount.value = true;
  loadingVisible.value = false;
}

function enterSystem() {
  if (!mapReady.value) return;
  loadingVisible.value = false;
}

function onLogout() {
  logout();
  loggedIn.value = false;
  loadingVisible.value = false;
  mapReady.value = false;
  mapShouldMount.value = false;
  deviceProfile.value = null;
  renderPreset.value = null;
}
</script>

<style scoped>
</style>
