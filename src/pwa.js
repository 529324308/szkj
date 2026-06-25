const APP_BASE = import.meta.env.BASE_URL || '/';
const SERVICE_WORKER_URL = `${APP_BASE}sw.js`;

export function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) return;

  window.addEventListener('load', () => {
    navigator.serviceWorker.register(SERVICE_WORKER_URL, { scope: APP_BASE }).catch((error) => {
      console.warn('Service worker registration failed:', error);
    });
  });
}
