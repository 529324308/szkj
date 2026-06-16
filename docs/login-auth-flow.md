# 登录与 Token 验证机制说明文档

## 1. 概述

本系统采用 JWT Token 的方式进行用户身份认证，使用双 Token 机制（Access Token + Refresh Token）实现安全的登录和续期流程。

## 2. 相关文件

| 文件路径 | 说明 |
|---------|------|
| `src/components/Login.vue` | 登录页面组件 |
| `src/api/auth.js` | 认证相关 API 接口封装 |
| `src/api/request.js` | HTTP 请求封装（含 Token 刷新逻辑） |

## 3. API 接口

### 3.1 登录接口

**请求地址**: `POST /api/auth/login`

**请求体**:
```json
{
  "userName": "用户名",
  "password": "密码"
}
```

**响应数据**:
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "expiresIn": 1718000000
}
```

### 3.2 刷新 Token 接口

**请求地址**: `POST /api/Auth/refresh-token`

**请求体**:
```json
{
  "accessToken": "当前过期的 accessToken",
  "refreshToken": "刷新用的 refreshToken"
}
```

**响应数据**:
```json
{
  "accessToken": "新的 accessToken",
  "refreshToken": "新的 refreshToken",
  "expiresIn": 新的过期时间戳
}
```

### 3.3 接口封装 (auth.js)

```javascript
// 登录
export function login(userName, password) {
  return request('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ userName, password }),
  });
}

// 登出 - 清除本地存储
export function logout() {
  localStorage.removeItem('accessToken');
  localStorage.removeItem('refreshToken');
  localStorage.removeItem('expiresIn');
  localStorage.removeItem('userName');
}

// 检查 Token 是否有效
export function isTokenValid() {
  const token = localStorage.getItem('accessToken');
  const refreshToken = localStorage.getItem('refreshToken');
  const expiresIn = localStorage.getItem('expiresIn');

  if (!token || !refreshToken || !expiresIn) return false;

  const now = Math.floor(Date.now() / 1000);
  return Number(expiresIn) > now || !!refreshToken;
}
```

## 4. Token 存储

登录成功后，用户信息存储在 `localStorage` 中：

| Key | 说明 |
|-----|------|
| `accessToken` | 访问令牌，用于 API 请求认证 |
| `refreshToken` | 刷新令牌，用于获取新的 accessToken |
| `expiresIn` | Token 过期时间戳（Unix 时间戳，秒级） |
| `userName` | 当前登录用户名 |

## 5. 请求流程 (request.js)

### 5.1 统一请求函数

```javascript
const BASE_URL = 'https://www.zjshuzhi.cn:8090';

export async function request(url, options = {}) {
  const fullUrl = url.startsWith('http') ? url : `${BASE_URL}${url}`;
  // ... 请求逻辑
}
```

### 5.2 Token 自动刷新机制

#### 刷新条件判断

```javascript
// 排除登录和刷新接口本身
if (url !== '/api/auth/login' && url !== '/api/Auth/refresh-token' && !url.includes('/api/Auth/refresh-token')) {
  const accessToken = localStorage.getItem('accessToken');
  const refreshToken = localStorage.getItem('refreshToken');
  const expiresIn = localStorage.getItem('expiresIn');

  if (accessToken && expiresIn) {
    const now = Math.floor(Date.now() / 1000);
    // 如果已过期或即将过期（提前 30 秒刷新）
    if (now >= Number(expiresIn) - 30) {
      // 执行刷新逻辑
    }
  }
}
```

#### 刷新逻辑（防止并发刷新）

```javascript
let isRefreshing = false;
let refreshPromise = null;

// 刷新 Token
refreshPromise = (async () => {
  try {
    const res = await fetch(`${BASE_URL}/api/Auth/refresh-token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ accessToken, refreshToken }),
    });
    const newData = await parseResponseBody(res);

    if (!res.ok || !newData?.accessToken) {
      throw new Error('刷新 Token 失败');
    }

    // 更新本地存储
    localStorage.setItem('accessToken', newData.accessToken);
    localStorage.setItem('refreshToken', newData.refreshToken);
    localStorage.setItem('expiresIn', newData.expiresIn);

    return newData.accessToken;
  } finally {
    isRefreshing = false;
    refreshPromise = null;
  }
})();

// 等待刷新完成
await refreshPromise;
```

### 5.3 请求头构造

```javascript
const token = localStorage.getItem('accessToken');
const headers = {
  'Content-Type': 'application/json',
  ...options.headers,
};

if (token) {
  headers['Authorization'] = `Bearer ${token}`;
}
```

### 5.4 错误处理

#### 401 未授权处理

```javascript
if (response.status === 401) {
  localStorage.clear();
  window.location.reload();  // 刷新页面让用户重新登录
  const err = new Error('未授权或登录已过期');
  throw err;
}
```

#### 刷新失败处理

```javascript
} catch (e) {
  localStorage.clear();
  window.location.reload();
  throw new Error('登录已过期，请重新登录');
}
```

## 6. 完整流程图

```
┌─────────────────────────────────────────────────────────────────┐
│                          用户登录                                │
└─────────────────────────────────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────┐
│  Login.vue 调用 login(userName, password)                       │
│  ─────────────────────────────────────────────────────────────  │
│  POST /api/auth/login                                           │
└─────────────────────────────────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────┐
│  登录成功，存储 Token 到 localStorage                           │
│  ─────────────────────────────────────────────────────────────  │
│  accessToken  → Authorization: Bearer xxx                       │
│  refreshToken → 用于刷新                                        │
│  expiresIn    → 过期时间戳                                      │
│  userName     → 用户名                                          │
└─────────────────────────────────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────┐
│                          后续 API 请求                           │
└─────────────────────────────────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────┐
│  request.js 发起请求前检查 Token 状态                            │
│  ─────────────────────────────────────────────────────────────  │
│  1. 排除登录/刷新接口本身                                        │
│  2. 检查 expiresIn 是否即将过期（提前 30 秒）                    │
│  3. 如需刷新，调用 /api/Auth/refresh-token                      │
│  4. 刷新成功后更新 localStorage                                  │
│  5. 失败则清除存储并跳转登录                                     │
└─────────────────────────────────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────┐
│  添加 Authorization 请求头                                       │
│  ─────────────────────────────────────────────────────────────  │
│  headers['Authorization'] = `Bearer ${accessToken}`            │
└─────────────────────────────────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────┐
│  发起实际请求                                                    │
│  ─────────────────────────────────────────────────────────────  │
│  GET/POST /api/xxx                                              │
│  Authorization: Bearer xxx                                      │
└─────────────────────────────────────────────────────────────────┘
                                 │
                    ┌────────────┴────────────┐
                    │                         │
                    ▼                         ▼
          ┌─────────────────┐       ┌─────────────────┐
          │   响应成功      │       │   401 未授权    │
          │   return data  │       │   清除 Token    │
          └─────────────────┘       │   跳转登录      │
                                   └─────────────────┘
```

## 7. 关键设计点

### 7.1 双 Token 机制

- **Access Token**: 短期令牌，用于 API 请求认证
- **Refresh Token**: 长期令牌，用于获取新的 Access Token
- **好处**: Access Token 泄露风险较低，即使泄露也会快速过期

### 7.2 提前刷新策略

- 在 Token 过期前 **30 秒** 主动刷新
- 避免用户请求时遇到 Token 过期的情况

### 7.3 防并发刷新

- 使用 `isRefreshing` 标志位和 `refreshPromise` 缓存
- 多个请求同时触发刷新时，只有第一个会真正发起刷新请求
- 其他请求等待刷新完成后继续

### 7.4 刷新失败处理

- 刷新失败时清除所有存储
- 刷新页面让用户重新登录
- 确保安全性

## 8. 使用示例

### 8.1 登录流程

```javascript
import { login } from '@/api/auth';

async function handleLogin() {
  try {
    const data = await login('username', 'password');

    // 登录成功，Token 已由 request.js 内部处理
    localStorage.setItem('accessToken', data.accessToken);
    localStorage.setItem('refreshToken', data.refreshToken);
    localStorage.setItem('expiresIn', data.expiresIn);
    localStorage.setItem('userName', 'username');

    // 跳转首页
    router.push('/home');
  } catch (error) {
    console.error('登录失败:', error.message);
  }
}
```

### 8.2 调用需要认证的接口

```javascript
import { request } from '@/api/request';

// 直接使用 request 函数，会自动处理 Token
const data = await request('/api/user/info');

// 或通过 auth.js 中的其他接口
import { logout, isTokenValid } from '@/api/auth';

// 检查登录状态
if (!isTokenValid()) {
  // Token 无效，跳转登录
}
```

## 9. 注意事项

1. **Token 存储在 localStorage** - 存在 XSS 攻击风险，如需更高安全性可考虑使用 HttpOnly Cookie
2. **Base URL 配置** - 当前配置为 `https://www.zjshuzhi.cn:8090`，可在 `request.js` 中修改
3. **刷新时间窗口** - 30 秒的提前刷新时间可根据业务需求调整
4. **401 处理** - 收到 401 后会刷新页面，需确保登录页面在根路径或通过路由守卫判断
