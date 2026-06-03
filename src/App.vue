<!--
 * @Author: 喜闻乐见 529324308@qq.com
 * @Date: 2024-12-16 11:27:51
 * @LastEditors: 喜闻乐见 529324308@qq.com
 * @LastEditTime: 2024-12-16 11:40:02
 * @FilePath: /donglicun/src/App.vue
 * @Description: 这是默认设置,请设置`customMade`, 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
-->
<template>
  <Login v-if="!loggedIn" @success="onLoginSuccess" />
  <template v-else>
    <LoadingPage :visible="showLoading" :bg-image="loadingBgImage" />
    <CesiumMap v-show="!showLoading" @logout="onLogout" @ready="onCesiumReady" />
  </template>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue';
import CesiumMap from './components/CesiumMap.vue';
import Login from './components/Login.vue';
import LoadingPage from './components/LoadingPage.vue';
import { isTokenValid, logout } from './api/auth';

const loggedIn = ref(false);
const showLoading = ref(false);
const cesiumReady = ref(false);
const loadingBgImage = computed(() => {
  return new URL('./assets/jz_bg.png', import.meta.url).href;
});

onMounted(() => {
  if (isTokenValid()) {
    loggedIn.value = true;
  } else {
    onLogout();
  }
});

function onLoginSuccess() {
  loggedIn.value = true;
  showLoading.value = true;
  cesiumReady.value = false;
}

function onCesiumReady() {
  cesiumReady.value = true;
  showLoading.value = false;
}

function onLogout() {
  logout();
  loggedIn.value = false;
  showLoading.value = false;
  cesiumReady.value = false;
}
</script>

<style scoped>
</style>
