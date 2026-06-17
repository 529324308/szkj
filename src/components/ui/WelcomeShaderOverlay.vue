<template>
  <div class="welcome-shader-overlay" role="status" :aria-label="title">
    <div class="welcome-shader-overlay__stage">
      <ShaderAnimation play-once @complete="emit('complete')" />
      <span class="welcome-shader-overlay__title">{{ title }}</span>
    </div>
  </div>
</template>

<script setup>
import ShaderAnimation from './ShaderAnimation.vue';

defineProps({
  title: {
    type: String,
    default: '欢迎来到  浙江数治GeoAgent',
  },
});

const emit = defineEmits(['complete']);
</script>

<style scoped>
.welcome-shader-overlay {
  position: fixed;
  inset: 0;
  z-index: 10000;
  overflow: hidden;
  color: #fff;
  background: #000;
}

.welcome-shader-overlay__stage {
  position: relative;
  display: flex;
  width: 100%;
  height: 100vh;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  background: #1d4ed8;
}

.welcome-shader-overlay__title {
  position: absolute;
  z-index: 10;
  max-width: calc(100% - 48px);
  padding: 0 24px;
  color: #fff;
  font-size: 72px;
  font-weight: 600;
  line-height: 1;
  letter-spacing: 0;
  text-align: center;
  white-space: pre-wrap;
  pointer-events: none;
  animation: welcomeTitleReveal 900ms cubic-bezier(0.22, 1, 0.36, 1) 180ms both;
}

@keyframes welcomeTitleReveal {
  from {
    opacity: 0;
    transform: translateY(18px) scale(0.96);
    filter: blur(12px);
  }

  to {
    opacity: 1;
    transform: translateY(0) scale(1);
    filter: blur(0);
  }
}

@media (max-width: 720px) {
  .welcome-shader-overlay__title {
    max-width: calc(100% - 32px);
    padding: 0 16px;
    font-size: 44px;
  }
}

@media (max-width: 420px) {
  .welcome-shader-overlay__title {
    font-size: 32px;
  }
}
</style>
