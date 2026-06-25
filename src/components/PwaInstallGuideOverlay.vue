<template>
  <transition name="install-guide-fade">
    <div v-if="visible && requiresInstallGuide" class="install-guide-overlay" role="dialog" aria-modal="true">
      <div class="install-guide-overlay__backdrop"></div>
      <div class="install-guide-overlay__panel">
        <div class="install-guide-overlay__eyebrow">桌面应用引导</div>
        <h2 class="install-guide-overlay__title">建议先安装桌面应用再进入系统</h2>
        <p class="install-guide-overlay__copy">
          安装到桌面后，打开更快、入口更稳定，也更接近原生工作台体验。
        </p>

        <div class="install-guide-overlay__steps">
          <div class="install-guide-overlay__step">
            <span class="install-guide-overlay__index">1</span>
            <span>点击下方安装按钮，触发浏览器安装窗口。</span>
          </div>
          <div class="install-guide-overlay__step">
            <span class="install-guide-overlay__index">2</span>
            <span>确认安装后，系统会把应用加入桌面和开始菜单。</span>
          </div>
          <div class="install-guide-overlay__step" v-if="installHintMode === 'manual'">
            <span class="install-guide-overlay__index">3</span>
            <span>如果没看到弹窗，请使用地址栏右侧安装图标，或浏览器菜单里的“安装应用”。</span>
          </div>
        </div>

        <div class="install-guide-overlay__actions">
          <button
            type="button"
            class="install-guide-overlay__primary"
            :disabled="isInstalling || installHintMode !== 'prompt'"
            @click="handleInstall"
          >
            {{ installHintMode === 'prompt' ? (isInstalling ? '正在打开安装窗口...' : '安装桌面应用') : '等待浏览器提供安装入口' }}
          </button>
          <button type="button" class="install-guide-overlay__secondary" @click="$emit('close')">
            继续网页访问
          </button>
        </div>

        <p v-if="lastPromptOutcome === 'dismissed'" class="install-guide-overlay__tip">
          这次安装窗口已被关闭。若要再次安装，请刷新页面或使用浏览器地址栏中的安装入口。
        </p>
      </div>
    </div>
  </transition>
</template>

<script setup>
import { ref } from 'vue';
import { usePwaInstall } from '../composables/usePwaInstall';

defineProps({
  visible: {
    type: Boolean,
    default: false,
  },
});

const emit = defineEmits(['close', 'installed']);
const isInstalling = ref(false);
const {
  installHintMode,
  lastPromptOutcome,
  promptInstall,
  requiresInstallGuide,
} = usePwaInstall();

async function handleInstall() {
  if (installHintMode.value !== 'prompt' || isInstalling.value) return;

  isInstalling.value = true;
  try {
    const installed = await promptInstall();
    if (installed) emit('installed');
  } finally {
    isInstalling.value = false;
  }
}
</script>

<style scoped>
.install-guide-overlay {
  position: fixed;
  inset: 0;
  z-index: 10040;
  display: grid;
  place-items: center;
  padding: 24px;
}

.install-guide-overlay__backdrop {
  position: absolute;
  inset: 0;
  background:
    radial-gradient(circle at top, rgba(15, 118, 110, 0.22), transparent 38%),
    linear-gradient(180deg, rgba(2, 6, 23, 0.82), rgba(2, 6, 23, 0.92));
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
}

.install-guide-overlay__panel {
  position: relative;
  z-index: 1;
  width: min(560px, calc(100vw - 32px));
  padding: 28px;
  border: 1px solid rgba(148, 163, 184, 0.28);
  border-radius: 8px;
  color: #f8fafc;
  background:
    linear-gradient(145deg, rgba(15, 23, 42, 0.96), rgba(15, 118, 110, 0.2)),
    rgba(15, 23, 42, 0.94);
  box-shadow: 0 32px 80px rgba(15, 23, 42, 0.46);
}

.install-guide-overlay__eyebrow {
  color: rgba(125, 211, 252, 0.88);
  font-size: 12px;
  font-weight: 600;
  line-height: 1.2;
  text-transform: uppercase;
}

.install-guide-overlay__title {
  margin-top: 10px;
  font-size: 30px;
  line-height: 1.15;
}

.install-guide-overlay__copy {
  margin-top: 14px;
  color: rgba(226, 232, 240, 0.82);
  font-size: 15px;
  line-height: 1.7;
}

.install-guide-overlay__steps {
  display: grid;
  gap: 12px;
  margin-top: 22px;
}

.install-guide-overlay__step {
  display: grid;
  grid-template-columns: 28px minmax(0, 1fr);
  gap: 12px;
  align-items: start;
  color: rgba(241, 245, 249, 0.9);
  font-size: 14px;
  line-height: 1.65;
}

.install-guide-overlay__index {
  display: inline-grid;
  place-items: center;
  width: 28px;
  height: 28px;
  border-radius: 999px;
  color: #0f172a;
  background: #5eead4;
  font-weight: 700;
}

.install-guide-overlay__actions {
  display: flex;
  gap: 12px;
  margin-top: 26px;
}

.install-guide-overlay__primary,
.install-guide-overlay__secondary {
  height: 46px;
  padding: 0 18px;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 600;
  letter-spacing: 0;
  cursor: pointer;
  transition:
    transform 160ms ease,
    box-shadow 160ms ease,
    border-color 160ms ease,
    opacity 160ms ease;
}

.install-guide-overlay__primary {
  flex: 1;
  border: 1px solid rgba(94, 234, 212, 0.4);
  color: #042f2e;
  background: linear-gradient(135deg, #99f6e4, #60a5fa);
  box-shadow: 0 18px 34px rgba(8, 47, 73, 0.24);
}

.install-guide-overlay__primary:hover:not(:disabled),
.install-guide-overlay__secondary:hover {
  transform: translateY(-1px);
}

.install-guide-overlay__primary:disabled {
  cursor: not-allowed;
  opacity: 0.56;
}

.install-guide-overlay__secondary {
  flex: 0 0 auto;
  border: 1px solid rgba(148, 163, 184, 0.3);
  color: #e2e8f0;
  background: rgba(15, 23, 42, 0.56);
}

.install-guide-overlay__tip {
  margin-top: 14px;
  color: rgba(251, 191, 36, 0.96);
  font-size: 13px;
  line-height: 1.6;
}

.install-guide-fade-enter-active,
.install-guide-fade-leave-active {
  transition: opacity 220ms ease;
}

.install-guide-fade-enter-from,
.install-guide-fade-leave-to {
  opacity: 0;
}

@media (max-width: 640px) {
  .install-guide-overlay {
    padding: 14px;
  }

  .install-guide-overlay__panel {
    padding: 22px 18px;
  }

  .install-guide-overlay__title {
    font-size: 24px;
  }

  .install-guide-overlay__actions {
    flex-direction: column;
  }

  .install-guide-overlay__primary,
  .install-guide-overlay__secondary {
    width: 100%;
  }
}
</style>
