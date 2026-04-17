# auth 模块

> 后台管理系统统一身份认证: 账号密码登录 / 注册 / 登出 / access·refresh token 静默续期 / 路由守卫 + 角色权限。

## 子目录结构

| 目录 | 说明 |
|------|------|
| api/ | 后端接口请求封装 (login / getCurrentUser / refreshToken / logout / register) |
| components/ | 模块专属 UI 组件 (LoginForm / RegisterForm) |
| hooks/ | 模块数据逻辑 hooks (useAuth) |
| utils/ | 模块工具函数 (tokenStorage) |

## 顶层文件

| 文件名 | 说明 | 依赖 | 最后更新 |
|--------|------|------|----------|
| constants.ts | 路由路径 / 角色枚举 / 错误码 / token storage key / 校验正则 | - | 2026-04-16 |

## 核心业务流程

用户在 LoginForm 输入 → 页面调 useAuth.login → authApi.login → 写 access/refresh token → fetchUserInfo (调 getCurrentUser) → 更新 `@@initialState.currentUser` → access.ts 派生 isLogin/canAdmin → 跳 redirect 或 `/`。后续业务请求由 `app.ts` 拦截器自动注入 Authorization, 40103 时静默 refresh 重发, 40104 时 clearTokens + 跳 `/login`; 路由 wrapper 持续读 currentUser 决定放行或重定向。

## 对外暴露

- `api/authApi`: `login` / `getCurrentUser` / `refreshToken` / `logout` / `register` 5 个请求函数
- `hooks/useAuth`: `{ login, logout, register, loading }`
- `components/LoginForm` / `components/RegisterForm`
- `constants`: `LOGIN_PATH` / `HOME_PATH` / `FORBIDDEN_PATH` / `ROLE` / `AUTH_ERROR_CODE` / `TOKEN_STORAGE_KEY`
- `utils/tokenStorage`: `getAccessToken` / `setAccessToken` / `getRefreshToken` / `setRefreshToken` / `clearTokens`
