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
  <CesiumMap v-else @logout="onLogout" />
  
</template>

<script setup>
import { ref, onMounted } from 'vue';
import CesiumMap from './components/CesiumMap.vue';
import Login from './components/Login.vue';
import { isTokenValid, logout } from './api/auth';

const loggedIn = ref(false);

onMounted(() => {
  // 检查是否已有 token 且未过期
  if (isTokenValid()) {
    loggedIn.value = true;
  } else {
    onLogout();
  }
});

function onLoginSuccess(payload){
  loggedIn.value = true;
}

function onLogout() {
  logout();
  loggedIn.value = false;
}
</script>

<style scoped>
</style>