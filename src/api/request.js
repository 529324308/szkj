import { clearLogoutState } from '../utils/appStorage';

/**
 * 基础请求封装
 */

export const BASE_URL = 'https://www.zjshuzhi.cn:8090';

const ERROR_CODE_MESSAGES = {
  0: null,
  40001: '参数错误，请检查输入内容',
  40101: '未登录或登录已过期，请重新登录',
  40301: '您没有权限执行此操作',
  40401: '请求的数据不存在',
  40901: '数据冲突，请刷新后重试',
  50001: '服务端异常，请稍后重试',
};

function getErrorMessage(code, customMessage) {
  if (customMessage) return customMessage;
  const defaultMsg = ERROR_CODE_MESSAGES[code];
  return defaultMsg || `请求失败 (错误码: ${code})`;
}

function checkErrorCode(data) {
  if (!data || typeof data !== 'object') return null;

  if ('code' in data) {
    const code = Number(data.code);
    if (code !== 0) {
      return {
        code,
        message: getErrorMessage(code, data.message),
        data: data.data,
      };
    }
  }

  return null;
}

function isLoginRequest(url) {
  return url === '/api/auth/login';
}

function isRefreshTokenRequest(url) {
  return url === '/api/Auth/refresh-token' || url.includes('/api/Auth/refresh-token');
}

let isRefreshing = false;
let refreshPromise = null;

export async function refreshAccessToken() {
  const accessToken = localStorage.getItem('accessToken');
  const refreshToken = localStorage.getItem('refreshToken');

  if (!refreshToken) {
    const err = new Error('缺少刷新凭证');
    err.status = 401;
    throw err;
  }

  if (!isRefreshing) {
    isRefreshing = true;
    refreshPromise = (async () => {
      try {
        const res = await fetch(`${BASE_URL}/api/Auth/refresh-token`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            refreshToken,
            ...(accessToken ? { accessToken } : {}),
          }),
        });
        const newData = await parseResponseBody(res);
        if (!res.ok) {
          const err = new Error(newData?.message || '刷新 Token 失败');
          err.status = res.status;
          err.data = newData;
          throw err;
        }
        if (!newData?.accessToken) {
          const err = new Error('刷新 Token 失败');
          err.status = res.status;
          err.data = newData;
          throw err;
        }

        localStorage.setItem('accessToken', newData.accessToken);
        localStorage.setItem('refreshToken', newData.refreshToken || refreshToken);
        if (newData.expiresIn !== undefined && newData.expiresIn !== null) {
          localStorage.setItem('expiresIn', newData.expiresIn);
        }

        return newData.accessToken;
      } finally {
        isRefreshing = false;
        refreshPromise = null;
      }
    })();
  }

  return refreshPromise;
}

function debugAuthFailure({ message, data, cause, context = {} }) {
  try {
    const debugPayload = {
      stage: context.stage || 'unknown',
      url: context.url || '',
      requestUrl: context.requestUrl || '',
      requestMethod: context.method || 'GET',
      responseData: data,
      responseStatus: context.responseStatus ?? null,
      causeMessage: cause?.message || '',
      causeStatus: cause?.status ?? null,
      causeData: cause?.data ?? null,
      cause,
    };

    console.group('[auth-debug] About to logout');
    console.error(message || '登录已过期，请重新登录');
    console.log(debugPayload);
    console.groupEnd();

    debugger;
  } catch {
    // Ignore debug logging failures.
  }
}

async function logoutForAuthFailure(message, data, cause, context = {}) {
  debugAuthFailure({ message, data, cause, context });
  await clearLogoutState({ clearAll: true, clearCaches: true });
  window.location.reload();
  const err = new Error(message || '登录已过期，请重新登录');
  err.status = 401;
  err.data = data;
  err.cause = cause;
  throw err;
}

async function parseResponseBody(response) {
  const contentType = response.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    try {
      return await response.json();
    } catch {
      return null;
    }
  }

  try {
    const text = await response.text();
    if (!text) return null;
    const trimmed = text.trim();
    if ((trimmed.startsWith('{') && trimmed.endsWith('}')) || (trimmed.startsWith('[') && trimmed.endsWith(']'))) {
      try {
        return JSON.parse(trimmed);
      } catch {
        return text;
      }
    }
    return text;
  } catch {
    return null;
  }
}

function appendQueryParams(url, params) {
  if (!params || typeof params !== 'object') return url;

  const searchParams = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') return;

    if (Array.isArray(value)) {
      value.forEach((item) => {
        if (item === undefined || item === null || item === '') return;
        searchParams.append(key, String(item));
      });
      return;
    }

    searchParams.append(key, String(value));
  });

  const queryString = searchParams.toString();
  if (!queryString) return url;
  return `${url}${url.includes('?') ? '&' : '?'}${queryString}`;
}

export async function request(url, options = {}, authState = {}) {
  const { params, ...fetchOptions } = options;
  const requestUrl = appendQueryParams(url, params);
  const fullUrl = requestUrl.startsWith('http') ? requestUrl : `${BASE_URL}${requestUrl}`;
  const { hasRetriedAfter401 = false } = authState;

  if (!isLoginRequest(url) && !isRefreshTokenRequest(url)) {
    const accessToken = localStorage.getItem('accessToken');
    const refreshToken = localStorage.getItem('refreshToken');
    const expiresIn = localStorage.getItem('expiresIn');

    if (refreshToken) {
      const now = Math.floor(Date.now() / 1000);
      const shouldRefreshBeforeRequest =
        !accessToken ||
        !expiresIn ||
        Number.isNaN(Number(expiresIn)) ||
        now >= Number(expiresIn) - 30;

      if (shouldRefreshBeforeRequest) {
        try {
          await refreshAccessToken();
        } catch (e) {
          await logoutForAuthFailure('登录已过期，请重新登录', null, e, {
            stage: 'pre_request_refresh_failed',
            url,
            requestUrl: fullUrl,
            method: fetchOptions.method || 'GET',
          });
        }
      }
    }
  }

  const token = localStorage.getItem('accessToken');
  const headers = { ...fetchOptions.headers };

  if (fetchOptions.body instanceof FormData) {
    delete headers['Content-Type'];
  } else if (!headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  let response = null;
  try {
    response = await fetch(fullUrl, {
      ...fetchOptions,
      headers,
    });
  } catch (e) {
    const err = new Error('网络异常，请稍后重试');
    err.status = 0;
    err.cause = e;
    throw err;
  }

  const data = await parseResponseBody(response);

  if (response.status === 401) {
    if (isLoginRequest(url)) {
      const err = new Error((data && typeof data === 'object' ? data.message : '') || '用户名或密码错误');
      err.status = 401;
      err.data = data;
      throw err;
    }

    if (!isRefreshTokenRequest(url) && !hasRetriedAfter401) {
      try {
        await refreshAccessToken();
        return request(url, options, { hasRetriedAfter401: true });
      } catch (e) {
        await logoutForAuthFailure((data && typeof data === 'object' ? data.message : '') || '登录已过期，请重新登录', data, e, {
          stage: 'refresh_after_401_failed',
          url,
          requestUrl: fullUrl,
          method: fetchOptions.method || 'GET',
          responseStatus: response.status,
        });
      }
    }

    await logoutForAuthFailure((data && typeof data === 'object' ? data.message : '') || '登录已过期，请重新登录', data, null, {
      stage: 'request_still_401_after_retry',
      url,
      requestUrl: fullUrl,
      method: fetchOptions.method || 'GET',
      responseStatus: response.status,
    });
  }

  const errorInfo = checkErrorCode(data);
  if (errorInfo) {
    const bizError = new Error(errorInfo.message);
    bizError.status = response.status;
    bizError.code = errorInfo.code;
    bizError.data = errorInfo.data;
    bizError.isBusinessError = true;
    throw bizError;
  }

  if (!response.ok) {
    const error = new Error((data && typeof data === 'object' ? data.message : '') || '请求失败');
    error.status = response.status;
    error.data = data;
    throw error;
  }

  return data;
}
