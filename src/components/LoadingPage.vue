<!--
 * @Author: 喜闻乐见 529324308@qq.com
 * @Date: 2026-06-02
 * @LastEditors: 喜闻乐见 529324308@qq.com
 * @LastEditTime: 2026-06-02
 * @FilePath: /shuzhikongjian/src/components/LoadingPage.vue
 * @Description: 加载过渡页面组件 - 用于在地球资源加载完成前显示加载状态
-->
<template>
  <transition name="loading-fade">
    <div v-if="visible" class="loading-page">
      <picture class="loading-bg">
        <source :srcset="bgImageLarge" media="(min-width: 1600px)" />
        <source :srcset="bgImageMedium" media="(min-width: 960px)" />
        <img :src="bgImageSmall" alt="loading background" class="bg-image" />
      </picture>
      <div class="loading-content">
        <div class="loading-spinner">
          <div class="spinner-ring"></div>
          <div class="spinner-ring"></div>
          <div class="spinner-ring"></div>
        </div>
        <div class="loading-text">正在加载地球资源...</div>
      </div>
    </div>
  </transition>
</template>

<script setup>
defineProps({
  visible: {
    type: Boolean,
    default: true
  },
  bgImageSmall: {
    type: String,
    default: ''
  },
  bgImageMedium: {
    type: String,
    default: ''
  },
  bgImageLarge: {
    type: String,
    default: ''
  }
});
</script>

<style scoped lang="scss">
.loading-page {
  position: fixed;
  inset: 0;
  z-index: 9999;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}

.loading-bg {
  position: absolute;
  inset: 0;
  overflow: hidden;
}

.bg-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: right bottom;
}

.loading-content {
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 24px;
}

.loading-spinner {
  position: relative;
  width: 60px;
  height: 60px;
}

.spinner-ring {
  position: absolute;
  inset: 0;
  border: 3px solid transparent;
  border-top-color: #06B6D4;
  border-radius: 50%;
  animation: spin 1.2s cubic-bezier(0.5, 0, 0.5, 1) infinite;

  &:nth-child(1) {
    animation-delay: -0.45s;
    inset: 0;
  }

  &:nth-child(2) {
    animation-delay: -0.3s;
    inset: 8px;
    border-top-color: #0D9488;
  }

  &:nth-child(3) {
    animation-delay: -0.15s;
    inset: 16px;
    border-top-color: #0891B2;
    border-width: 2px;
  }
}

@keyframes spin {
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
}

.loading-text {
  color: rgba(255, 255, 255, 0.85);
  font-size: 14px;
  font-weight: 500;
  text-shadow: 0 2px 8px rgba(0, 0, 0, 0.5);
  letter-spacing: 2px;
}

.loading-fade-enter-active,
.loading-fade-leave-active {
  transition: opacity 0.6s ease;
}

.loading-fade-enter-from,
.loading-fade-leave-to {
  opacity: 0;
}
</style>

