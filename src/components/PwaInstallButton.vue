<template>
  <button
    v-if="installAvailable"
    class="pwa-install-button"
    type="button"
    aria-label="安装到桌面"
    @click="installApp"
  >
    <span class="pwa-install-button__icon" aria-hidden="true">↓</span>
    <span>安装到桌面</span>
  </button>
</template>

<script setup>
import { usePwaInstall } from '../composables/usePwaInstall';

const { canPromptInstall, promptInstall } = usePwaInstall();

async function installApp() {
  await promptInstall();
}
</script>

<style scoped>
.pwa-install-button {
  position: fixed;
  right: max(18px, env(safe-area-inset-right));
  bottom: max(18px, env(safe-area-inset-bottom));
  z-index: 10020;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  min-width: 132px;
  height: 42px;
  padding: 0 14px;
  border: 1px solid rgba(255, 255, 255, 0.36);
  border-radius: 8px;
  color: #ffffff;
  background: linear-gradient(135deg, #0f766e, #2563eb);
  box-shadow: 0 14px 30px rgba(15, 23, 42, 0.22);
  font-size: 14px;
  font-weight: 600;
  letter-spacing: 0;
  line-height: 1;
  cursor: pointer;
  user-select: none;
  transition:
    transform 160ms ease,
    box-shadow 160ms ease,
    opacity 160ms ease;
}

.pwa-install-button:hover {
  box-shadow: 0 16px 34px rgba(15, 23, 42, 0.28);
  transform: translateY(-1px);
}

.pwa-install-button:active {
  box-shadow: 0 10px 24px rgba(15, 23, 42, 0.2);
  transform: translateY(0);
}

.pwa-install-button:focus-visible {
  outline: 3px solid rgba(37, 99, 235, 0.28);
  outline-offset: 3px;
}

.pwa-install-button__icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 18px;
  height: 18px;
  border-radius: 999px;
  color: #0f766e;
  background: #ffffff;
  font-size: 15px;
  line-height: 1;
}

@media (max-width: 640px) {
  .pwa-install-button {
    right: max(12px, env(safe-area-inset-right));
    bottom: max(12px, env(safe-area-inset-bottom));
    min-width: 118px;
    height: 38px;
    padding: 0 12px;
    font-size: 13px;
  }
}
</style>
