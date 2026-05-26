/*
 * @Author: 喜闻乐见 529324308@qq.com
 * @Date: 2026-05-25 13:22:08
 * @LastEditors: 喜闻乐见 529324308@qq.com
 * @LastEditTime: 2026-05-25 14:27:46
 * @FilePath: /shuzhikongjian/src/api/request.js
 * @Description: 这是默认设置,请设置`customMade`, 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
 */
/**
 * 基础请求封装
 */

const BASE_URL = 'https://www.zjshuzhi.cn:8090';

let isRefreshing = false;
let refreshPromise = null;

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

/**
 * 统一请求函数
 * @param {string} url 相对路径
 * @param {object} options fetch 选项
 */
export async function request(url, options = {}) {
  const fullUrl = url.startsWith('http') ? url : `${BASE_URL}${url}`;

  // 1. 检查 Token 是否需要刷新 (排除登录和刷新接口本身)
  if (url !== '/api/auth/login' && url !== '/api/Auth/refresh-token' && !url.includes('/api/Auth/refresh-token')) {
    const accessToken = localStorage.getItem('accessToken');
    const refreshToken = localStorage.getItem('refreshToken');
    const expiresIn = localStorage.getItem('expiresIn');

    if (accessToken && expiresIn) {
      const now = Math.floor(Date.now() / 1000);
      // 如果已过期或即将过期 (提前 30 秒刷新)
      if (now >= Number(expiresIn) - 30) {
        if (!isRefreshing) {
          isRefreshing = true;
          refreshPromise = (async () => {
            try {
              const res = await fetch(`${BASE_URL}/api/Auth/refresh-token`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ accessToken, refreshToken }),
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
              localStorage.setItem('refreshToken', newData.refreshToken);
              localStorage.setItem('expiresIn', newData.expiresIn);
              return newData.accessToken;
            } finally {
              isRefreshing = false;
              refreshPromise = null;
            }
          })();
        }
        
        try {
          await refreshPromise;
        } catch (e) {
          localStorage.clear();
          window.location.reload();
          const err = new Error('登录已过期，请重新登录');
          err.cause = e;
          throw err;
        }
      }
    }
  }

  // 2. 构造请求头
  const token = localStorage.getItem('accessToken');
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  // 3. 发起请求
  let response = null;
  try {
    response = await fetch(fullUrl, {
      ...options,
      headers,
    });
  } catch (e) {
    const err = new Error('网络异常，请稍后重试');
    err.status = 0;
    err.cause = e;
    throw err;
  }

  // 处理 401 未授权
  if (response.status === 401) {
    localStorage.clear();
    window.location.reload();
    const err = new Error('未授权或登录已过期');
    err.status = 401;
    throw err;
  }

  const data = await parseResponseBody(response);

  if (!response.ok) {
    const error = new Error((data && typeof data === 'object' ? data.message : '') || '请求失败');
    error.status = response.status;
    error.data = data;
    throw error;
  }

  return data;
}

