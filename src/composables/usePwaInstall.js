import { computed, ref } from 'vue';

const installAvailable = ref(false);
const lastPromptOutcome = ref('');
const isStandaloneApp = ref(false);

let installPromptEvent = null;
let initialized = false;

const canPromptInstall = computed(() => installAvailable.value && !isStandaloneApp.value);
const requiresInstallGuide = computed(() => !isStandaloneApp.value);
const installHintMode = computed(() => (canPromptInstall.value ? 'prompt' : 'manual'));

export function usePwaInstall() {
  initializePwaInstall();

  return {
    canPromptInstall,
    installAvailable,
    installHintMode,
    isStandaloneApp,
    lastPromptOutcome,
    promptInstall,
    requiresInstallGuide,
  };
}

function initializePwaInstall() {
  if (initialized || typeof window === 'undefined') return;

  initialized = true;
  syncStandaloneState();

  window.addEventListener('beforeinstallprompt', onBeforeInstallPrompt);
  window.addEventListener('appinstalled', onAppInstalled);

  const displayModeQuery = window.matchMedia?.('(display-mode: standalone)');
  if (displayModeQuery?.addEventListener) {
    displayModeQuery.addEventListener('change', syncStandaloneState);
  } else if (displayModeQuery?.addListener) {
    displayModeQuery.addListener(syncStandaloneState);
  }
}

function onBeforeInstallPrompt(event) {
  event.preventDefault();
  installPromptEvent = event;
  installAvailable.value = true;
  lastPromptOutcome.value = '';
  syncStandaloneState();
}

function onAppInstalled() {
  installPromptEvent = null;
  installAvailable.value = false;
  lastPromptOutcome.value = 'accepted';
  syncStandaloneState();
}

async function promptInstall() {
  syncStandaloneState();
  if (isStandaloneApp.value || !installPromptEvent) return false;

  const promptEvent = installPromptEvent;
  installPromptEvent = null;
  installAvailable.value = false;

  try {
    await promptEvent.prompt();
    const result = await promptEvent.userChoice.catch(() => null);
    lastPromptOutcome.value = result?.outcome || '';
    syncStandaloneState();
    return result?.outcome === 'accepted' || isStandaloneApp.value;
  } catch {
    syncStandaloneState();
    return false;
  }
}

function syncStandaloneState() {
  if (typeof window === 'undefined') return;

  isStandaloneApp.value = !!(
    window.matchMedia?.('(display-mode: standalone)').matches
    || window.navigator.standalone === true
  );

  if (isStandaloneApp.value) {
    installPromptEvent = null;
    installAvailable.value = false;
  }
}
