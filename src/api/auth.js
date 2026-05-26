import { request } from './request';

/**
 * 认证相关接口
 */

/**
 * 登录接口
 * @param {string} userName 用户名
 * @param {string} password 密码
 */
export function login(userName, password) {
  return request('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ userName, password }),
  });
}

/**
 * 登出逻辑 (通常只是前端清理)
 */
export function logout() {
  localStorage.removeItem('accessToken');
  localStorage.removeItem('refreshToken');
  localStorage.removeItem('expiresIn');
  localStorage.removeItem('userName');
}

/**
 * 检查是否应该视为“已登录”状态
 * 只要有 token 且存在 refreshToken 就认为可能有效
 * 具体的过期刷新逻辑在 request.js 中处理
 */
export function isTokenValid() {
  const token = localStorage.getItem('accessToken');
  const refreshToken = localStorage.getItem('refreshToken');
  const expiresIn = localStorage.getItem('expiresIn');
  
  if (!token || !refreshToken || !expiresIn) return false;

  const now = Math.floor(Date.now() / 1000);
  // 如果 token 没过期，或者有 refreshToken 可以尝试刷新，就返回 true
  return Number(expiresIn) > now || !!refreshToken;
}

