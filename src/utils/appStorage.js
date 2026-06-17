const AUTH_STORAGE_KEYS = [
  'accessToken',
  'refreshToken',
  'expiresIn',
  'userName',
];

export function clearAuthStorage() {
  try {
    AUTH_STORAGE_KEYS.forEach((key) => localStorage.removeItem(key));
  } catch {
    // Ignore storage access failures.
  }
}

export function clearAppStorage() {
  try {
    localStorage.clear();
  } catch {
    // Ignore storage access failures.
  }

  try {
    sessionStorage.clear();
  } catch {
    // Ignore storage access failures.
  }
}

export async function clearBrowserCaches() {
  if (typeof window === 'undefined') return;

  const tasks = [];

  if (window.caches?.keys) {
    tasks.push(
      window.caches
        .keys()
        .then((keys) => Promise.all(keys.map((key) => window.caches.delete(key)))),
    );
  }

  if (navigator.serviceWorker?.getRegistrations) {
    tasks.push(
      navigator.serviceWorker
        .getRegistrations()
        .then((registrations) => Promise.all(registrations.map((registration) => registration.unregister()))),
    );
  }

  await Promise.allSettled(tasks);
}

export async function clearLogoutState({ clearAll = false, clearCaches = false } = {}) {
  if (clearAll) {
    clearAppStorage();
  } else {
    clearAuthStorage();
  }

  if (clearCaches) {
    await clearBrowserCaches();
  }
}

export function forceFreshReload() {
  if (typeof window === 'undefined') return;

  const url = new URL(window.location.href);
  url.searchParams.set('_logoutRefresh', String(Date.now()));
  window.location.replace(url.toString());
}
