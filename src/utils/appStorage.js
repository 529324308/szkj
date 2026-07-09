const AUTH_STORAGE_KEYS = [
  'accessToken',
  'refreshToken',
  'expiresIn',
  'userName',
];
const REMEMBERED_LOGIN_KEY = 'szkj:remembered-login';

export function getRememberedLogin() {
  try {
    const raw = window.localStorage.getItem(REMEMBERED_LOGIN_KEY);
    if (!raw) return null;

    const data = JSON.parse(raw);
    if (!data || typeof data !== 'object') return null;
    const userName = String(data.userName || '');
    const password = String(data.password || '');
    if (!userName || !password) return null;

    return { userName, password };
  } catch {
    return null;
  }
}

export function saveRememberedLogin(userName, password) {
  try {
    window.localStorage.setItem(
      REMEMBERED_LOGIN_KEY,
      JSON.stringify({
        userName: String(userName || ''),
        password: String(password || ''),
      }),
    );
  } catch {
    // Ignore storage access failures.
  }
}

export function clearRememberedLogin() {
  try {
    window.localStorage.removeItem(REMEMBERED_LOGIN_KEY);
  } catch {
    // Ignore storage access failures.
  }
}

export function clearAuthStorage() {
  try {
    AUTH_STORAGE_KEYS.forEach((key) => localStorage.removeItem(key));
  } catch {
    // Ignore storage access failures.
  }

  try {
    AUTH_STORAGE_KEYS.forEach((key) => sessionStorage.removeItem(key));
  } catch {
    // Ignore storage access failures.
  }
}

export function clearAppStorage() {
  const rememberedLogin = getRememberedLogin();

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

  if (rememberedLogin) {
    saveRememberedLogin(rememberedLogin.userName, rememberedLogin.password);
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
